import { db } from "../db/db";
import { getStoredFocusSessions, replaceStoredFocusSessions } from "../db/repositories/focusSessionRepo";
import { getAllKeyValues, putKeyValue } from "../db/repositories/keyValueRepo";
import { getStoredMilestones, replaceStoredMilestones } from "../db/repositories/milestoneRepo";
import { getStoredObservations, replaceStoredObservations } from "../db/repositories/observationRepo";
import { getStoredSubjects, replaceStoredSubjects } from "../db/repositories/subjectRepo";
import { getStoredTasks, replaceStoredTasks } from "../db/repositories/taskRepo";
import type { HistoryEntry, Milestone, Observation, Task } from "../types";
import { migrateHistoryEntry, sortHistoryEntries } from "../utils/migrationUtils";

export const STORAGE_KEYS = {
  SETTINGS: "krome_settings",
  DAY: "krome_day",
  SESSION: "krome_session",
  STREAK: "krome_streak",
  HISTORY: "krome_history",
  SUBJECTS: "krome_subjects",
  TASKS: "krome_tasks",
  OBSERVATIONS: "krome_observations",
  MILESTONES: "krome_milestones",
  WEEKLY_PLANS: "krome_weekly_plans",
  NOTIFICATIONS: "krome_notifications",
};
const DATASET_OWNER_KEY = "krome_dataset_owner";

type StorageListener<T> = (value: T) => void;

const LEGACY_KEY_VALUE_KEYS = [
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.DAY,
  STORAGE_KEYS.SESSION,
  STORAGE_KEYS.STREAK,
  STORAGE_KEYS.WEEKLY_PLANS,
  STORAGE_KEYS.NOTIFICATIONS,
  "krome_intro_v3_seen",
];
const STORAGE_BROADCAST_CHANNEL_NAME = "krome_sync";
const ALL_LOCAL_STORAGE_KEYS = [
  ...LEGACY_KEY_VALUE_KEYS,
  DATASET_OWNER_KEY,
  STORAGE_KEYS.HISTORY,
  STORAGE_KEYS.SUBJECTS,
  STORAGE_KEYS.TASKS,
  STORAGE_KEYS.OBSERVATIONS,
  STORAGE_KEYS.MILESTONES,
];
const STORAGE_FALLBACK_PERSIST_KEYS = [
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.DAY,
  STORAGE_KEYS.SESSION,
  STORAGE_KEYS.STREAK,
  STORAGE_KEYS.HISTORY,
  STORAGE_KEYS.SUBJECTS,
  STORAGE_KEYS.TASKS,
  STORAGE_KEYS.OBSERVATIONS,
  STORAGE_KEYS.MILESTONES,
  STORAGE_KEYS.WEEKLY_PLANS,
  STORAGE_KEYS.NOTIFICATIONS,
];
const DEFAULT_RELOAD_JOURNAL_KEYS = new Set<string>([
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.SUBJECTS,
]);
const STORAGE_OPEN_TIMEOUT_MS = 6000;

const storageCache = new Map<string, unknown>();
const storageUpdatedAt = new Map<string, number>();
const storageListeners = new Map<string, Set<(value: unknown) => void>>();
const writeQueue = new Map<string, Promise<void>>();
let initializationPromise: Promise<void> | null = null;
let activeStorageBackend: "indexeddb" | "localStorage" = "indexeddb";
const STORAGE_RELOAD_JOURNAL_PREFIX = "krome_reload_journal_";
const STORAGE_RELOAD_JOURNAL_KEYS = new Set<string>(STORAGE_FALLBACK_PERSIST_KEYS);
export type StorageInitializationStep =
  | "opening_database"
  | "hydrating_indexeddb"
  | "migrating_legacy_storage"
  | "reconciling_reload_journal"
  | "seeding_defaults";
const storageBroadcastChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel(STORAGE_BROADCAST_CHANNEL_NAME)
    : null;

type StorageReloadJournalEntry<T> = {
  updatedAt: number;
  value: T;
};

function shouldWriteReloadJournal(key: string) {
  return activeStorageBackend === "localStorage" || DEFAULT_RELOAD_JOURNAL_KEYS.has(key);
}

function broadcastStorageChange(key: string) {
  storageBroadcastChannel?.postMessage({ type: "refresh", key });
}

if (storageBroadcastChannel) {
  storageBroadcastChannel.onmessage = (event) => {
    if (event.data?.type === "refresh" && typeof event.data.key === "string") {
      void refreshStorageKey(event.data.key);
      return;
    }

    if (event.data?.type === "reset") {
      storageCache.clear();
      storageUpdatedAt.clear();
      initializationPromise = null;
    }
  };
}

function readLegacyLocalStorage(key: string) {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to read legacy localStorage key ${key}`, error);
    return null;
  }
}

function removeLegacyLocalStorageKey(key: string) {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to clear legacy localStorage key ${key}`, error);
  }
}

function getReloadJournalKey(key: string) {
  return `${STORAGE_RELOAD_JOURNAL_PREFIX}${key}`;
}

function readReloadJournal<T>(key: string): StorageReloadJournalEntry<T> | null {
  if (typeof window === "undefined" || !STORAGE_RELOAD_JOURNAL_KEYS.has(key)) {
    return null;
  }

  try {
    const raw = localStorage.getItem(getReloadJournalKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StorageReloadJournalEntry<T>>;
    if (typeof parsed.updatedAt !== "number") {
      return null;
    }

    return {
      updatedAt: parsed.updatedAt,
      value: parsed.value as T,
    };
  } catch (error) {
    console.warn(`Failed to read reload journal for ${key}`, error);
    return null;
  }
}

function writeReloadJournal<T>(key: string, value: T, updatedAt: number) {
  if (typeof window === "undefined" || !shouldWriteReloadJournal(key)) {
    return;
  }

  try {
    localStorage.setItem(
      getReloadJournalKey(key),
      JSON.stringify({
        updatedAt,
        value,
      } satisfies StorageReloadJournalEntry<T>)
    );
  } catch (error) {
    console.warn(`Failed to persist reload journal for ${key}`, error);
  }
}

function clearReloadJournal(key: string) {
  if (typeof window === "undefined" || !STORAGE_RELOAD_JOURNAL_KEYS.has(key)) {
    return;
  }

  removeLegacyLocalStorageKey(getReloadJournalKey(key));
}

function getCollectionUpdatedAt(records: unknown[]): number {
  return records.reduce((latestTimestamp, record) => {
    if (!record || typeof record !== "object") {
      return latestTimestamp;
    }

    const nextTimestamp =
      (record as { updatedAt?: number }).updatedAt ??
      (record as { createdAt?: number }).createdAt ??
      0;

    return Math.max(latestTimestamp, nextTimestamp);
  }, 0);
}

export function getDatasetOwnerId() {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(DATASET_OWNER_KEY);
  } catch (error) {
    console.warn("Failed to read dataset owner key", error);
    return null;
  }
}

function parseLegacyStorageValue<T>(key: string, fallback: T): T {
  const raw = readLegacyLocalStorage(key);
  if (raw === null) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to parse legacy localStorage key ${key}`, error);
    return fallback;
  }
}

function hydrateCacheFromLegacyLocalStorage() {
  LEGACY_KEY_VALUE_KEYS.forEach((key) => {
    const raw = readLegacyLocalStorage(key);
    if (raw === null) return;

    try {
      applyCacheValue(key, JSON.parse(raw), false);
    } catch (error) {
      console.warn(`Failed to parse legacy key ${key}`, error);
    }
  });

  applyCacheValue(
    STORAGE_KEYS.HISTORY,
    (parseLegacyStorageValue<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []) ?? []).map((entry) => migrateHistoryEntry(entry)),
    false
  );
  applyCacheValue(STORAGE_KEYS.SUBJECTS, parseLegacyStorageValue(STORAGE_KEYS.SUBJECTS, []), false);
  applyCacheValue(STORAGE_KEYS.TASKS, parseLegacyStorageValue(STORAGE_KEYS.TASKS, []), false);
  applyCacheValue(STORAGE_KEYS.OBSERVATIONS, parseLegacyStorageValue(STORAGE_KEYS.OBSERVATIONS, []), false);
  applyCacheValue(STORAGE_KEYS.MILESTONES, parseLegacyStorageValue(STORAGE_KEYS.MILESTONES, []), false);
}

function persistCollectionToLegacyLocalStorage(key: string, value: unknown) {
  if (typeof window === "undefined" || !STORAGE_FALLBACK_PERSIST_KEYS.includes(key)) {
    return;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist ${key} to fallback localStorage`, error);
  }
}

function getStorageOpenTimeoutMs() {
  const override = (globalThis as { __KROME_STORAGE_OPEN_TIMEOUT_MS__?: number }).__KROME_STORAGE_OPEN_TIMEOUT_MS__;
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return override;
  }

  return STORAGE_OPEN_TIMEOUT_MS;
}

async function openIndexedDbWithTimeout() {
  if (typeof window === "undefined") {
    await db.open();
    return;
  }

  let timeoutId: number | undefined;
  const timeoutMs = getStorageOpenTimeoutMs();

  try {
    await Promise.race([
      db.open(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error("IndexedDB open timed out."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export function isIndexedDbStorageEnabled() {
  return activeStorageBackend === "indexeddb";
}

export function setDatasetOwnerId(userId: string) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(DATASET_OWNER_KEY, userId);
  } catch (error) {
    console.warn("Failed to persist dataset owner key", error);
  }
}

export function clearDatasetOwnerId() {
  removeLegacyLocalStorageKey(DATASET_OWNER_KEY);
}

function notifyListeners(key: string) {
  const listeners = storageListeners.get(key);
  if (!listeners || listeners.size === 0) return;

  const value = storageCache.get(key);
  listeners.forEach((listener) => listener(value));
}

function applyCacheValue<T>(key: string, value: T, notify = true, updatedAt?: number) {
  storageCache.set(key, value);
  if (typeof updatedAt === "number") {
    storageUpdatedAt.set(key, updatedAt);
  }
  if (notify) {
    notifyListeners(key);
  }
}

function enqueueWrite(key: string, task: () => Promise<void>) {
  const previous = writeQueue.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(task)
    .then(() => {
      broadcastStorageChange(key);
    })
    .catch((error) => {
      console.error(`Failed to persist ${key}`, error);
    })
    .finally(() => {
      if (writeQueue.get(key) === next) {
        writeQueue.delete(key);
      }
    });

  writeQueue.set(key, next);
}

async function persistCollection(key: string, previousValue: unknown, nextValue: unknown) {
  if (activeStorageBackend === "localStorage") {
    persistCollectionToLegacyLocalStorage(key, nextValue);
    return;
  }

  switch (key) {
    case STORAGE_KEYS.HISTORY:
      await replaceStoredFocusSessions(
        nextValue as HistoryEntry[],
        (previousValue as HistoryEntry[] | undefined) ?? []
      );
      return;
    case STORAGE_KEYS.SUBJECTS:
      await replaceStoredSubjects(nextValue as any[], (previousValue as any[] | undefined) ?? []);
      return;
    case STORAGE_KEYS.TASKS:
      await replaceStoredTasks(nextValue as Task[], (previousValue as Task[] | undefined) ?? []);
      return;
    case STORAGE_KEYS.OBSERVATIONS:
      await replaceStoredObservations(
        nextValue as Observation[],
        (previousValue as Observation[] | undefined) ?? []
      );
      return;
    case STORAGE_KEYS.MILESTONES:
      await replaceStoredMilestones(
        nextValue as Milestone[],
        (previousValue as Milestone[] | undefined) ?? []
      );
      return;
    default:
      await putKeyValue(key, nextValue);
  }
}

async function hydrateCacheFromIndexedDb() {
  const [keyValues, subjects, tasks, focusSessions, observations, milestones] = await Promise.all([
    getAllKeyValues(),
    getStoredSubjects(),
    getStoredTasks(),
    getStoredFocusSessions(),
    getStoredObservations(),
    getStoredMilestones(),
  ]);

  keyValues.forEach((entry) => {
    applyCacheValue(entry.key, entry.value, false, entry.updatedAt);
  });

  applyCacheValue(STORAGE_KEYS.SUBJECTS, subjects, false, getCollectionUpdatedAt(subjects));
  applyCacheValue(STORAGE_KEYS.TASKS, tasks, false, getCollectionUpdatedAt(tasks));
  applyCacheValue(
    STORAGE_KEYS.HISTORY,
    focusSessions.map((entry) => migrateHistoryEntry(entry)),
    false,
    getCollectionUpdatedAt(focusSessions)
  );
  applyCacheValue(STORAGE_KEYS.OBSERVATIONS, observations, false, getCollectionUpdatedAt(observations));
  applyCacheValue(STORAGE_KEYS.MILESTONES, milestones, false, getCollectionUpdatedAt(milestones));
}

async function migrateLegacyKeyValue(key: string) {
  if (storageCache.has(key)) return false;

  const raw = readLegacyLocalStorage(key);
  if (raw === null) return false;

  try {
    const parsed = JSON.parse(raw);
    applyCacheValue(key, parsed, false);
    await putKeyValue(key, parsed);
    removeLegacyLocalStorageKey(key);
    return true;
  } catch (error) {
    console.warn(`Failed to migrate legacy key ${key}`, error);
    return false;
  }
}

async function migrateLegacyCollection<T>(
  key: string,
  currentValue: T[],
  parser: (raw: unknown) => T[],
  persist: (records: T[], previousRecords: T[]) => Promise<void>
) {
  if (currentValue.length > 0) return false;

  const raw = readLegacyLocalStorage(key);
  if (raw === null) return false;

  try {
    const parsed = parser(JSON.parse(raw));
    applyCacheValue(key, parsed, false);
    await persist(parsed, []);
    removeLegacyLocalStorageKey(key);
    return true;
  } catch (error) {
    console.warn(`Failed to migrate legacy collection ${key}`, error);
    return false;
  }
}

async function migrateLegacyLocalStorage() {
  const migratedKeyValues = await Promise.all(LEGACY_KEY_VALUE_KEYS.map((key) => migrateLegacyKeyValue(key)));

  const migratedCollections = await Promise.all([
    migrateLegacyCollection(
    STORAGE_KEYS.HISTORY,
    (storageCache.get(STORAGE_KEYS.HISTORY) as HistoryEntry[] | undefined) ?? [],
    (raw) => ((raw as HistoryEntry[]) ?? []).map((entry) => migrateHistoryEntry(entry)),
    replaceStoredFocusSessions
    ),
    migrateLegacyCollection(
    STORAGE_KEYS.SUBJECTS,
    (storageCache.get(STORAGE_KEYS.SUBJECTS) as any[] | undefined) ?? [],
    (raw) => (raw as any[]) ?? [],
    replaceStoredSubjects
    ),
    migrateLegacyCollection(
    STORAGE_KEYS.TASKS,
    (storageCache.get(STORAGE_KEYS.TASKS) as Task[] | undefined) ?? [],
    (raw) => (raw as Task[]) ?? [],
    replaceStoredTasks
    ),
    migrateLegacyCollection(
    STORAGE_KEYS.OBSERVATIONS,
    (storageCache.get(STORAGE_KEYS.OBSERVATIONS) as Observation[] | undefined) ?? [],
    (raw) => (raw as Observation[]) ?? [],
    replaceStoredObservations
    ),
    migrateLegacyCollection(
    STORAGE_KEYS.MILESTONES,
    (storageCache.get(STORAGE_KEYS.MILESTONES) as Milestone[] | undefined) ?? [],
    (raw) => (raw as Milestone[]) ?? [],
    replaceStoredMilestones
    ),
  ]);

  if ([...migratedKeyValues, ...migratedCollections].some(Boolean)) {
    await hydrateCacheFromIndexedDb();
    return true;
  }

  return false;
}

async function reconcileReloadJournalEntry(key: string) {
  const journalEntry = readReloadJournal<unknown>(key);
  if (!journalEntry) {
    return;
  }

  const currentUpdatedAt = storageUpdatedAt.get(key) ?? 0;
  if (journalEntry.updatedAt <= currentUpdatedAt) {
    return;
  }

  const previousValue = storageCache.get(key);
  applyCacheValue(key, journalEntry.value, false, journalEntry.updatedAt);
  await persistCollection(key, previousValue, journalEntry.value);
}

async function reconcileReloadJournal() {
  await Promise.all(
    Array.from(STORAGE_RELOAD_JOURNAL_KEYS).map((key) => reconcileReloadJournalEntry(key))
  );
}

export async function initializeStorage(onProgress?: (step: StorageInitializationStep) => void) {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    onProgress?.("opening_database");
    activeStorageBackend = "indexeddb";

    try {
      await openIndexedDbWithTimeout();

      onProgress?.("hydrating_indexeddb");
      await hydrateCacheFromIndexedDb();

      onProgress?.("migrating_legacy_storage");
      await migrateLegacyLocalStorage();
    } catch (error) {
      console.warn(
        "[storage] IndexedDB startup failed or stalled. Falling back to localStorage-backed startup for this session.",
        error
      );
      activeStorageBackend = "localStorage";

      onProgress?.("hydrating_indexeddb");
      hydrateCacheFromLegacyLocalStorage();
    }

    onProgress?.("reconciling_reload_journal");
    await reconcileReloadJournal();

    onProgress?.("seeding_defaults");
    if (!storageCache.has(STORAGE_KEYS.SUBJECTS)) applyCacheValue(STORAGE_KEYS.SUBJECTS, [], false);
    if (!storageCache.has(STORAGE_KEYS.TASKS)) applyCacheValue(STORAGE_KEYS.TASKS, [], false);
    if (!storageCache.has(STORAGE_KEYS.HISTORY)) applyCacheValue(STORAGE_KEYS.HISTORY, [], false);
    if (!storageCache.has(STORAGE_KEYS.OBSERVATIONS)) applyCacheValue(STORAGE_KEYS.OBSERVATIONS, [], false);
    if (!storageCache.has(STORAGE_KEYS.MILESTONES)) applyCacheValue(STORAGE_KEYS.MILESTONES, [], false);
  })();

  try {
    await initializationPromise;
    return initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

export async function clearLocalPersistence() {
  storageCache.clear();
  storageUpdatedAt.clear();
  initializationPromise = null;
  storageBroadcastChannel?.postMessage({ type: "reset" });

  if (typeof window !== "undefined") {
    ALL_LOCAL_STORAGE_KEYS.forEach((key) => removeLegacyLocalStorageKey(key));
    Array.from(STORAGE_RELOAD_JOURNAL_KEYS).forEach((key) => clearReloadJournal(key));
  }

  if (activeStorageBackend === "indexeddb") {
    db.close();
    await db.delete();
    await db.open();
  }
}

export function subscribeToKey<T>(key: string, listener: StorageListener<T>) {
  const listeners = storageListeners.get(key) ?? new Set<(value: unknown) => void>();
  listeners.add(listener as (value: unknown) => void);
  storageListeners.set(key, listeners);

  return () => {
    const currentListeners = storageListeners.get(key);
    if (!currentListeners) return;

    currentListeners.delete(listener as (value: unknown) => void);
    if (currentListeners.size === 0) {
      storageListeners.delete(key);
    }
  };
}

export function getItem<T>(key: string, fallback: T): T {
  if (!storageCache.has(key)) {
    return fallback;
  }

  return storageCache.get(key) as T;
}

export function setItem<T>(key: string, value: T): void {
  const previousValue = storageCache.get(key);
  const updatedAt = Date.now();
  applyCacheValue(key, value, true, updatedAt);
  writeReloadJournal(key, value, updatedAt);
  enqueueWrite(key, () => persistCollection(key, previousValue, value));
}

export async function refreshStorageKey(key: string) {
  if (activeStorageBackend === "localStorage") {
    switch (key) {
      case STORAGE_KEYS.HISTORY:
        applyCacheValue(
          key,
          (parseLegacyStorageValue<HistoryEntry[]>(key, []) ?? []).map((entry) => migrateHistoryEntry(entry))
        );
        return;
      case STORAGE_KEYS.SUBJECTS:
      case STORAGE_KEYS.TASKS:
      case STORAGE_KEYS.OBSERVATIONS:
      case STORAGE_KEYS.MILESTONES:
      case STORAGE_KEYS.SETTINGS:
      case STORAGE_KEYS.DAY:
      case STORAGE_KEYS.SESSION:
      case STORAGE_KEYS.STREAK:
      case STORAGE_KEYS.WEEKLY_PLANS:
      case STORAGE_KEYS.NOTIFICATIONS:
        applyCacheValue(key, parseLegacyStorageValue(key, undefined), true);
        return;
      default:
        return;
    }
  }

  switch (key) {
    case STORAGE_KEYS.HISTORY:
      applyCacheValue(
        key,
        (await getStoredFocusSessions()).map((entry) => migrateHistoryEntry(entry))
      );
      return;
    case STORAGE_KEYS.SUBJECTS:
      {
        const subjects = await getStoredSubjects();
        applyCacheValue(key, subjects, true, getCollectionUpdatedAt(subjects));
      }
      return;
    case STORAGE_KEYS.TASKS:
      {
        const tasks = await getStoredTasks();
        applyCacheValue(key, tasks, true, getCollectionUpdatedAt(tasks));
      }
      return;
    case STORAGE_KEYS.OBSERVATIONS:
      {
        const observations = await getStoredObservations();
        applyCacheValue(key, observations, true, getCollectionUpdatedAt(observations));
      }
      return;
    case STORAGE_KEYS.MILESTONES:
      {
        const milestones = await getStoredMilestones();
        applyCacheValue(key, milestones, true, getCollectionUpdatedAt(milestones));
      }
      return;
    default: {
      const entry = await db.kv.get(key);
      if (entry) {
        applyCacheValue(key, entry.value, true, entry.updatedAt);
      }
    }
  }
}

export const getHistory = (): HistoryEntry[] => {
  const storedHistory = getItem<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
  const migratedHistory = sortHistoryEntries(storedHistory.map(migrateHistoryEntry));

  if (JSON.stringify(storedHistory) !== JSON.stringify(migratedHistory)) {
    setItem(STORAGE_KEYS.HISTORY, migratedHistory);
  }

  return migratedHistory;
};
