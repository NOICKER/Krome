import Dexie, { type Table } from "dexie";
import type {
  HistoryEntry,
  KromeSubject,
  Milestone,
  Observation,
  Task,
  LocalCardRecord,
  LocalCardConnectionRecord,
  LocalCanvasPositionRecord,
  LocalCanvasShapeRecord,
  LocalCanvasStickyRecord,
} from "../types";

export type SyncTableName =
  | "subjects"
  | "tasks"
  | "focus_sessions"
  | "observations"
  | "milestones"
  | "cards"
  | "card_connections"
  | "canvas_positions"
  | "canvas_shapes"
  | "canvas_stickies";
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

  // Neutrawn tables
  cards!: Table<LocalCardRecord, string>;
  cardConnections!: Table<LocalCardConnectionRecord, string>;
  canvasPositions!: Table<LocalCanvasPositionRecord, string>;
  canvasShapes!: Table<LocalCanvasShapeRecord, string>;
  canvasStickies!: Table<LocalCanvasStickyRecord, string>;

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

    this.version(2).stores({
      cards: "&id, user_id, session_id, subject, created_at, updated_at, deleted_at",
      cardConnections: "&id, user_id, card_from, card_to, updated_at, deleted_at",
      canvasPositions: "&id, user_id, card_id, canvas_id, updated_at",
      canvasShapes: "&id, user_id, canvas_id, updated_at, deleted_at",
      canvasStickies: "&id, user_id, canvas_id, updated_at, deleted_at",
    });
  }
}

export const db = new KromeDexie();
