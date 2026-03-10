import { db, type SyncQueueEntry, type SyncTableName } from "../db/db";
import { applyRemoteFocusSessions } from "../db/repositories/focusSessionRepo";
import { applyRemoteMilestones } from "../db/repositories/milestoneRepo";
import { applyRemoteObservations } from "../db/repositories/observationRepo";
import { applyRemoteSubjects } from "../db/repositories/subjectRepo";
import { applyRemoteTasks } from "../db/repositories/taskRepo";
import { fetchRemoteChanges, SYNC_TABLES, upsertRemoteRecords } from "./supabaseApi";
import { STORAGE_KEYS, getItem, refreshStorageKey, setItem } from "./storageService";
import { SYNC_REQUEST_EVENT } from "./syncEvents";
import { isSupabaseConfigured } from "./supabaseClient";

const RETRY_INTERVAL_MS = 60_000;
const PULL_ORDER: SyncTableName[] = [
  "subjects",
  "tasks",
  "milestones",
  "observations",
  "focus_sessions",
];

let syncTimer: number | null = null;
let queueRunInFlight = false;
let pullRunInFlight = false;
let activeUserId: string | null = null;

function getSyncCursorKey(tableName: SyncTableName) {
  return `krome_sync_cursor_${tableName}`;
}

function getStorageKeyForTable(tableName: SyncTableName) {
  switch (tableName) {
    case "subjects":
      return STORAGE_KEYS.SUBJECTS;
    case "tasks":
      return STORAGE_KEYS.TASKS;
    case "focus_sessions":
      return STORAGE_KEYS.HISTORY;
    case "observations":
      return STORAGE_KEYS.OBSERVATIONS;
    case "milestones":
      return STORAGE_KEYS.MILESTONES;
  }
}

async function getPendingQueueItems(limit = 250) {
  const entries = await db.syncQueue.toArray();
  return entries
    .filter((entry) => entry.status === "pending" || entry.status === "failed")
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(0, limit);
}

function collapseQueueEntries(entries: SyncQueueEntry[]) {
  const grouped = new Map<SyncTableName, Map<string, { latest: SyncQueueEntry; queueIds: number[] }>>();

  for (const entry of entries) {
    const tableEntries = grouped.get(entry.tableName) ?? new Map<string, { latest: SyncQueueEntry; queueIds: number[] }>();
    const queueId = entry.id ?? 0;
    const existing = tableEntries.get(entry.recordId);

    if (!existing || entry.createdAt >= existing.latest.createdAt) {
      const queueIds = existing ? [...existing.queueIds, queueId] : [queueId];
      tableEntries.set(entry.recordId, { latest: entry, queueIds });
    } else {
      existing.queueIds.push(queueId);
      tableEntries.set(entry.recordId, existing);
    }

    grouped.set(entry.tableName, tableEntries);
  }

  return grouped;
}

async function markQueueEntriesFailed(queueIds: number[], entries: SyncQueueEntry[], error: unknown) {
  if (queueIds.length === 0) return;

  const failedIds = new Set(queueIds);
  const nextEntries = entries
    .filter((entry) => entry.id !== undefined && failedIds.has(entry.id))
    .map((entry) => ({
      ...entry,
      status: "failed" as const,
      retryCount: (entry.retryCount ?? 0) + 1,
      lastAttemptAt: Date.now(),
      error: error instanceof Error ? error.message : String(error),
    }));

  if (nextEntries.length === 0) return;
  await db.syncQueue.bulkPut(nextEntries);
}

async function applyRemoteRecords(tableName: SyncTableName, records: any[]) {
  switch (tableName) {
    case "subjects":
      await applyRemoteSubjects(records);
      return;
    case "tasks":
      await applyRemoteTasks(records);
      return;
    case "focus_sessions":
      await applyRemoteFocusSessions(records);
      return;
    case "observations":
      await applyRemoteObservations(records);
      return;
    case "milestones":
      await applyRemoteMilestones(records);
  }
}

async function getQueuedRecordIds(tableName: SyncTableName) {
  const entries = await db.syncQueue.toArray();
  return new Set(
    entries
      .filter((entry) => entry.tableName === tableName && (entry.status === "pending" || entry.status === "failed"))
      .map((entry) => entry.recordId)
  );
}

export async function processQueue(userId = activeUserId) {
  if (!userId || !isSupabaseConfigured || queueRunInFlight) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  queueRunInFlight = true;

  try {
    const entries = await getPendingQueueItems();
    if (entries.length === 0) return;

    const groupedEntries = collapseQueueEntries(entries);

    for (const tableName of SYNC_TABLES) {
      const recordEntries = groupedEntries.get(tableName);
      if (!recordEntries || recordEntries.size === 0) continue;

      const payloads = Array.from(recordEntries.values()).map((entry) => entry.latest.payload);
      const queueIds = Array.from(recordEntries.values()).flatMap((entry) => entry.queueIds.filter(Boolean));

      try {
        await upsertRemoteRecords(tableName, userId, payloads);
        await db.syncQueue.bulkDelete(queueIds);
      } catch (error) {
        await markQueueEntriesFailed(queueIds, entries, error);
      }
    }
  } finally {
    queueRunInFlight = false;
  }
}

export async function pullChanges(userId = activeUserId) {
  if (!userId || !isSupabaseConfigured || pullRunInFlight) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  pullRunInFlight = true;

  try {
    for (const tableName of PULL_ORDER) {
      const since = getItem<string | null>(getSyncCursorKey(tableName), null);
      const queuedRecordIds = await getQueuedRecordIds(tableName);
      const remoteRecords = await fetchRemoteChanges(tableName, userId, since);

      if (remoteRecords.length > 0) {
        const filteredRecords = remoteRecords.filter((record) => !queuedRecordIds.has(record.id));
        if (filteredRecords.length > 0) {
          await applyRemoteRecords(tableName, filteredRecords);
          await refreshStorageKey(getStorageKeyForTable(tableName));
        }

        const latestRecord = remoteRecords[remoteRecords.length - 1];
        if (latestRecord?.updatedAt) {
          setItem(getSyncCursorKey(tableName), new Date(latestRecord.updatedAt).toISOString());
        }
      }
    }
  } finally {
    pullRunInFlight = false;
  }
}

export async function runBackgroundSync(userId = activeUserId) {
  await processQueue(userId);
  await pullChanges(userId);
}

export function startSyncService(userId: string | null) {
  activeUserId = userId;

  if (syncTimer !== null) {
    window.clearInterval(syncTimer);
    syncTimer = null;
  }

  if (typeof window === "undefined" || !userId || !isSupabaseConfigured) {
    return () => undefined;
  }

  const run = () => {
    void runBackgroundSync(userId);
  };

  window.addEventListener(SYNC_REQUEST_EVENT, run);
  window.addEventListener("online", run);
  syncTimer = window.setInterval(run, RETRY_INTERVAL_MS);
  run();

  return () => {
    window.removeEventListener(SYNC_REQUEST_EVENT, run);
    window.removeEventListener("online", run);

    if (syncTimer !== null) {
      window.clearInterval(syncTimer);
      syncTimer = null;
    }
  };
}
