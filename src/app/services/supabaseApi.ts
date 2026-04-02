import { format } from "date-fns";
import type {
  LocalFocusSessionRecord,
  LocalMilestoneRecord,
  LocalObservationRecord,
  LocalSubjectRecord,
  LocalTaskRecord,
  SyncTableName,
} from "../db/db";
import type { KromeSubject } from "../types";
import { STORAGE_KEYS, getItem } from "./storageService";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

export const SYNC_TABLES: SyncTableName[] = [
  "subjects",
  "tasks",
  "focus_sessions",
  "observations",
  "milestones",
];
const REMOTE_PULL_PAGE_SIZE = 1000;

function getSupabaseErrorText(error: unknown) {
  if (!error || typeof error !== "object") {
    return String(error ?? "");
  }

  const maybeError = error as Record<string, unknown>;
  return [
    maybeError.code,
    maybeError.message,
    maybeError.details,
    maybeError.hint,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");
}

export function describeSupabaseError(error: unknown) {
  const description = getSupabaseErrorText(error).trim();
  return description.length > 0 ? description : "Unknown Supabase error";
}

export function isRemoteSchemaError(error: unknown) {
  const text = getSupabaseErrorText(error).toLowerCase();
  if (!text) return false;

  return [
    "pgrst204",
    "pgrst205",
    "42p01",
    "42703",
    "schema cache",
    "could not find the table",
    "could not find the '",
    "does not exist",
  ].some((token) => text.includes(token));
}

export function isLegacyCompositeKeyConflict(tableName: SyncTableName, error: unknown) {
  const text = getSupabaseErrorText(error).toLowerCase();
  if (!text.includes("23505") && !text.includes("duplicate key value violates unique constraint")) {
    return false;
  }

  return [
    `${tableName}_pkey`,
    `${tableName}_id_key`,
    "key (id)=",
  ].some((token) => text.includes(token));
}

function toIso(timestamp?: number | null) {
  if (!timestamp) return null;
  return new Date(timestamp).toISOString();
}

function fromIso(value?: string | null) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function buildSubjectNameMap() {
  const subjects = getItem<KromeSubject[]>(STORAGE_KEYS.SUBJECTS, []);
  return new Map(subjects.map((subject) => [subject.id, subject.name]));
}

function mapSubjectRecordToRemote(userId: string, record: LocalSubjectRecord) {
  return {
    id: record.id,
    user_id: userId,
    name: record.name,
    color: record.color ?? null,
    settings: record.settings ?? {},
    archived: record.archived ?? false,
    created_at: toIso(record.createdAt),
    updated_at: toIso(record.updatedAt) ?? new Date().toISOString(),
    deleted_at: toIso(record.deletedAt),
  };
}

function mapTaskRecordToRemote(userId: string, record: LocalTaskRecord) {
  return {
    id: record.id,
    user_id: userId,
    title: record.title,
    subject_id: record.subjectId ?? null,
    estimated_blocks: record.estimatedBlocks ?? null,
    completed_blocks: record.completedBlocks ?? 0,
    completed: record.completed ?? false,
    created_at: toIso(record.createdAt),
    updated_at: toIso(record.updatedAt) ?? new Date().toISOString(),
    deleted_at: toIso(record.deletedAt),
  };
}

function buildSessionEndTimestamp(record: LocalFocusSessionRecord) {
  const actualFocusDurationMs = record.actualFocusDurationMs ?? record.durationMs;
  const interruptDurationMs = record.interruptDurationMs ?? 0;
  return record.startedAt + actualFocusDurationMs + interruptDurationMs;
}

function mapFocusSessionRecordToRemote(userId: string, record: LocalFocusSessionRecord) {
  return {
    id: record.id,
    user_id: userId,
    subject_id: record.subjectId ?? null,
    task_id: record.taskId ?? null,
    duration_ms: record.durationMs,
    completed: record.completed,
    abandoned: record.completionStatus === "abandoned" || !record.completed,
    intent: record.intent,
    started_at: record.startedAt,
    ended_at: buildSessionEndTimestamp(record),
    session_type: record.sessionType,
    pot_spilled: record.potSpilled,
    pot_result: record.potResult ?? null,
    interrupts: record.interrupts ?? [],
    planned_duration_ms: record.plannedDurationMs ?? null,
    actual_focus_duration_ms: record.actualFocusDurationMs ?? record.durationMs,
    interrupt_duration_ms: record.interruptDurationMs ?? 0,
    protection_ratio: record.protectionRatio ?? 1,
    time_of_day: record.timeOfDay ?? null,
    severity_impact: record.severityImpact ?? 0,
    abandon_reason: record.abandonReason ?? null,
    created_at: toIso(record.createdAt ?? record.startedAt),
    updated_at: toIso(record.updatedAt) ?? new Date().toISOString(),
    deleted_at: toIso(record.deletedAt),
  };
}

function mapObservationRecordToRemote(userId: string, record: LocalObservationRecord) {
  return {
    id: record.id,
    user_id: userId,
    content: record.content,
    session_id: record.sessionId ?? null,
    created_at: toIso(record.createdAt),
    updated_at: toIso(record.updatedAt) ?? new Date().toISOString(),
    deleted_at: toIso(record.deletedAt),
  };
}

function mapMilestoneRecordToRemote(userId: string, record: LocalMilestoneRecord) {
  return {
    id: record.id,
    user_id: userId,
    title: record.title,
    target_date: record.targetDate,
    created_at: toIso(record.createdAt),
    updated_at: toIso(record.updatedAt) ?? new Date().toISOString(),
    deleted_at: toIso(record.deletedAt),
  };
}

function mapRecordToRemote(tableName: SyncTableName, userId: string, record: Record<string, unknown>) {
  switch (tableName) {
    case "subjects":
      return mapSubjectRecordToRemote(userId, record as unknown as LocalSubjectRecord);
    case "tasks":
      return mapTaskRecordToRemote(userId, record as unknown as LocalTaskRecord);
    case "focus_sessions":
      return mapFocusSessionRecordToRemote(userId, record as unknown as LocalFocusSessionRecord);
    case "observations":
      return mapObservationRecordToRemote(userId, record as unknown as LocalObservationRecord);
    case "milestones":
      return mapMilestoneRecordToRemote(userId, record as unknown as LocalMilestoneRecord);
  }
}

function mapRemoteSubjectRecord(record: any): LocalSubjectRecord {
  return {
    id: record.id,
    name: record.name,
    color: record.color ?? undefined,
    settings: record.settings ?? {},
    archived: record.archived ?? false,
    createdAt: fromIso(record.created_at) ?? Date.now(),
    updatedAt: fromIso(record.updated_at) ?? Date.now(),
    deletedAt: fromIso(record.deleted_at),
  };
}

function mapRemoteTaskRecord(record: any): LocalTaskRecord {
  return {
    id: record.id,
    title: record.title,
    subjectId: record.subject_id ?? undefined,
    estimatedBlocks: record.estimated_blocks ?? undefined,
    completedBlocks: record.completed_blocks ?? 0,
    completed: record.completed ?? false,
    createdAt: fromIso(record.created_at) ?? Date.now(),
    updatedAt: fromIso(record.updated_at) ?? Date.now(),
    deletedAt: fromIso(record.deleted_at),
  };
}

function mapRemoteFocusSessionRecord(record: any): LocalFocusSessionRecord {
  const subjectNameMap = buildSubjectNameMap();
  const startedAt = Number(record.started_at ?? Date.now());

  return {
    id: record.id,
    dateISO: format(startedAt, "yyyy-MM-dd"),
    startedAt,
    durationMs: Number(record.duration_ms ?? 0),
    subject: record.subject_id ? subjectNameMap.get(record.subject_id) ?? "" : "",
    intent: record.intent ?? "",
    sessionType: record.session_type ?? "standard",
    completed: record.completed ?? false,
    potSpilled: record.pot_spilled ?? false,
    subjectId: record.subject_id ?? undefined,
    taskId: record.task_id ?? undefined,
    potResult: record.pot_result ?? null,
    interrupts: Array.isArray(record.interrupts) ? record.interrupts : [],
    plannedDurationMs: record.planned_duration_ms ?? undefined,
    actualFocusDurationMs: record.actual_focus_duration_ms ?? Number(record.duration_ms ?? 0),
    interruptDurationMs: record.interrupt_duration_ms ?? 0,
    protectionRatio: record.protection_ratio ?? 1,
    completionStatus: record.abandoned ? "abandoned" : "completed",
    abandonReason: record.abandon_reason ?? undefined,
    timeOfDay: record.time_of_day ?? undefined,
    severityImpact: record.severity_impact ?? undefined,
    createdAt: fromIso(record.created_at) ?? startedAt,
    updatedAt: fromIso(record.updated_at) ?? Date.now(),
    deletedAt: fromIso(record.deleted_at),
  };
}

function mapRemoteObservationRecord(record: any): LocalObservationRecord {
  return {
    id: record.id,
    content: record.content,
    sessionId: record.session_id ?? undefined,
    createdAt: fromIso(record.created_at) ?? Date.now(),
    updatedAt: fromIso(record.updated_at) ?? Date.now(),
    deletedAt: fromIso(record.deleted_at),
  };
}

function mapRemoteMilestoneRecord(record: any): LocalMilestoneRecord {
  return {
    id: record.id,
    title: record.title,
    targetDate: Number(record.target_date ?? Date.now()),
    createdAt: fromIso(record.created_at) ?? Date.now(),
    updatedAt: fromIso(record.updated_at) ?? Date.now(),
    deletedAt: fromIso(record.deleted_at),
  };
}

export async function upsertRemoteRecords(tableName: SyncTableName, userId: string, records: Record<string, unknown>[]) {
  if (!isSupabaseConfigured || records.length === 0) return;

  const { error } = await supabase
    .from(tableName)
    .upsert(records.map((record) => mapRecordToRemote(tableName, userId, record)), {
      onConflict: "user_id,id",
    });

  if (error) {
    throw error;
  }
}

export async function fetchRemoteChanges(tableName: SyncTableName, userId: string, since?: string | null) {
  if (!isSupabaseConfigured) {
    return [];
  }

  const rows: any[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from(tableName)
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + REMOTE_PULL_PAGE_SIZE - 1);

    if (since) {
      query = query.gt("updated_at", since);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const page = data ?? [];
    rows.push(...page);

    if (page.length < REMOTE_PULL_PAGE_SIZE) {
      break;
    }

    offset += REMOTE_PULL_PAGE_SIZE;
  }

  switch (tableName) {
    case "subjects":
      return rows.map((record) => mapRemoteSubjectRecord(record));
    case "tasks":
      return rows.map((record) => mapRemoteTaskRecord(record));
    case "focus_sessions":
      return rows.map((record) => mapRemoteFocusSessionRecord(record));
    case "observations":
      return rows.map((record) => mapRemoteObservationRecord(record));
    case "milestones":
      return rows.map((record) => mapRemoteMilestoneRecord(record));
  }
}
