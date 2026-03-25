import { db } from "../db/db";
import { getStoredFocusSessions, replaceStoredFocusSessions } from "../db/repositories/focusSessionRepo";
import { getAllKeyValues, putKeyValue } from "../db/repositories/keyValueRepo";
import { getStoredMilestones, replaceStoredMilestones } from "../db/repositories/milestoneRepo";
import { getStoredObservations, replaceStoredObservations } from "../db/repositories/observationRepo";
import { getStoredSubjects, replaceStoredSubjects } from "../db/repositories/subjectRepo";
import { getStoredTasks, replaceStoredTasks } from "../db/repositories/taskRepo";
import type { HistoryEntry, Milestone, Observation, Task } from "../types";
import { migrateHistoryEntry } from "../utils/migrationUtils";

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

const storageCache = new Map<string, unknown>();
const storageListeners = new Map<string, Set<(value: unknown) => void>>();
const writeQueue = new Map<string, Promise<void>>();
let initializationPromise: Promise<void> | null = null;
const storageBroadcastChannel =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel(STORAGE_BROADCAST_CHANNEL_NAME)
    : null;

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

export function getDatasetOwnerId() {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(DATASET_OWNER_KEY);
  } catch (error) {
    console.warn("Failed to read dataset owner key", error);
    return null;
  }
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

function applyCacheValue<T>(key: string, value: T, notify = true) {
  storageCache.set(key, value);
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
    storageCache.set(entry.key, entry.value);
  });

  storageCache.set(STORAGE_KEYS.SUBJECTS, subjects);
  storageCache.set(STORAGE_KEYS.TASKS, tasks);
  storageCache.set(
    STORAGE_KEYS.HISTORY,
    focusSessions.map((entry) => migrateHistoryEntry(entry))
  );
  storageCache.set(STORAGE_KEYS.OBSERVATIONS, observations);
  storageCache.set(STORAGE_KEYS.MILESTONES, milestones);
}

async function migrateLegacyKeyValue(key: string) {
  if (storageCache.has(key)) return;

  const raw = readLegacyLocalStorage(key);
  if (raw === null) return;

  try {
    const parsed = JSON.parse(raw);
    applyCacheValue(key, parsed, false);
    await putKeyValue(key, parsed);
    removeLegacyLocalStorageKey(key);
  } catch (error) {
    console.warn(`Failed to migrate legacy key ${key}`, error);
  }
}

async function migrateLegacyCollection<T>(
  key: string,
  currentValue: T[],
  parser: (raw: unknown) => T[],
  persist: (records: T[], previousRecords: T[]) => Promise<void>
) {
  if (currentValue.length > 0) return;

  const raw = readLegacyLocalStorage(key);
  if (raw === null) return;

  try {
    const parsed = parser(JSON.parse(raw));
    applyCacheValue(key, parsed, false);
    await persist(parsed, []);
    removeLegacyLocalStorageKey(key);
  } catch (error) {
    console.warn(`Failed to migrate legacy collection ${key}`, error);
  }
}

async function migrateLegacyLocalStorage() {
  await Promise.all(LEGACY_KEY_VALUE_KEYS.map((key) => migrateLegacyKeyValue(key)));

  await migrateLegacyCollection(
    STORAGE_KEYS.HISTORY,
    (storageCache.get(STORAGE_KEYS.HISTORY) as HistoryEntry[] | undefined) ?? [],
    (raw) => ((raw as HistoryEntry[]) ?? []).map((entry) => migrateHistoryEntry(entry)),
    replaceStoredFocusSessions
  );
  await migrateLegacyCollection(
    STORAGE_KEYS.SUBJECTS,
    (storageCache.get(STORAGE_KEYS.SUBJECTS) as any[] | undefined) ?? [],
    (raw) => (raw as any[]) ?? [],
    replaceStoredSubjects
  );
  await migrateLegacyCollection(
    STORAGE_KEYS.TASKS,
    (storageCache.get(STORAGE_KEYS.TASKS) as Task[] | undefined) ?? [],
    (raw) => (raw as Task[]) ?? [],
    replaceStoredTasks
  );
  await migrateLegacyCollection(
    STORAGE_KEYS.OBSERVATIONS,
    (storageCache.get(STORAGE_KEYS.OBSERVATIONS) as Observation[] | undefined) ?? [],
    (raw) => (raw as Observation[]) ?? [],
    replaceStoredObservations
  );
  await migrateLegacyCollection(
    STORAGE_KEYS.MILESTONES,
    (storageCache.get(STORAGE_KEYS.MILESTONES) as Milestone[] | undefined) ?? [],
    (raw) => (raw as Milestone[]) ?? [],
    replaceStoredMilestones
  );

  await hydrateCacheFromIndexedDb();
}

export async function initializeStorage() {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    await db.open();
    await hydrateCacheFromIndexedDb();
    await migrateLegacyLocalStorage();

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
  initializationPromise = null;
  storageBroadcastChannel?.postMessage({ type: "reset" });

  if (typeof window !== "undefined") {
    ALL_LOCAL_STORAGE_KEYS.forEach((key) => removeLegacyLocalStorageKey(key));
  }

  db.close();
  await db.delete();
  await db.open();
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
  applyCacheValue(key, value);
  enqueueWrite(key, () => persistCollection(key, previousValue, value));
}

export async function refreshStorageKey(key: string) {
  switch (key) {
    case STORAGE_KEYS.HISTORY:
      applyCacheValue(
        key,
        (await getStoredFocusSessions()).map((entry) => migrateHistoryEntry(entry))
      );
      return;
    case STORAGE_KEYS.SUBJECTS:
      applyCacheValue(key, await getStoredSubjects());
      return;
    case STORAGE_KEYS.TASKS:
      applyCacheValue(key, await getStoredTasks());
      return;
    case STORAGE_KEYS.OBSERVATIONS:
      applyCacheValue(key, await getStoredObservations());
      return;
    case STORAGE_KEYS.MILESTONES:
      applyCacheValue(key, await getStoredMilestones());
      return;
    default: {
      const entry = await db.kv.get(key);
      if (entry) {
        applyCacheValue(key, entry.value);
      }
    }
  }
}

export const getHistory = (): HistoryEntry[] => {
  const storedHistory = getItem<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
  const migratedHistory = storedHistory.map(migrateHistoryEntry);

  if (JSON.stringify(storedHistory) !== JSON.stringify(migratedHistory)) {
    setItem(STORAGE_KEYS.HISTORY, migratedHistory);
  }

  return migratedHistory;
};
