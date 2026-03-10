import Dexie, { type Table } from "dexie";
import type { HistoryEntry, KromeSubject, Milestone, Observation, Task } from "../types";

export type SyncTableName = "subjects" | "tasks" | "focus_sessions" | "observations" | "milestones";
export type SyncOperation = "INSERT" | "UPDATE" | "DELETE";
export type SyncStatus = "pending" | "failed";

export interface SyncMetadata {
  createdAt?: number;
  updatedAt: number;
  deletedAt?: number | null;
}

export interface KeyValueEntry {
  key: string;
  value: unknown;
  updatedAt: number;
}

export type LocalSubjectRecord = KromeSubject & SyncMetadata;
export type LocalTaskRecord = Task & SyncMetadata;
export type LocalFocusSessionRecord = HistoryEntry & SyncMetadata;
export type LocalObservationRecord = Observation & SyncMetadata;
export type LocalMilestoneRecord = Milestone & SyncMetadata;

export interface SyncQueueEntry {
  id?: number;
  tableName: SyncTableName;
  recordId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  status: SyncStatus;
  retryCount: number;
  createdAt: number;
  lastAttemptAt?: number;
  error?: string;
}

class KromeDexie extends Dexie {
  kv!: Table<KeyValueEntry, string>;
  subjects!: Table<LocalSubjectRecord, string>;
  tasks!: Table<LocalTaskRecord, string>;
  focusSessions!: Table<LocalFocusSessionRecord, string>;
  observations!: Table<LocalObservationRecord, string>;
  milestones!: Table<LocalMilestoneRecord, string>;
  syncQueue!: Table<SyncQueueEntry, number>;

  constructor() {
    super("krome");

    this.version(1).stores({
      kv: "key, updatedAt",
      subjects: "id, updatedAt, deletedAt, archived",
      tasks: "id, updatedAt, deletedAt, subjectId, completed",
      focusSessions: "id, updatedAt, deletedAt, startedAt, subjectId, taskId",
      observations: "id, updatedAt, deletedAt, sessionId",
      milestones: "id, updatedAt, deletedAt, targetDate",
      syncQueue: "++id, status, tableName, recordId, createdAt, retryCount",
    });
  }
}

export const db = new KromeDexie();
