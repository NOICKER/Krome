import type { HistoryEntry } from "../../types";
import { db, type LocalFocusSessionRecord } from "../db";
import { applyRemoteRecords, listActiveRecords, persistCollection } from "./shared";

function normalizeFocusSessionRecord(entry: HistoryEntry, previous: HistoryEntry | undefined, timestamp: number): LocalFocusSessionRecord {
  return {
    ...previous,
    ...entry,
    createdAt: (previous as LocalFocusSessionRecord | undefined)?.createdAt ?? entry.startedAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function getStoredFocusSessions() {
  return listActiveRecords(db.focusSessions);
}

export async function replaceStoredFocusSessions(nextEntries: HistoryEntry[], previousEntries: HistoryEntry[]) {
  await persistCollection({
    table: db.focusSessions,
    tableName: "focus_sessions",
    nextRecords: nextEntries,
    previousRecords: previousEntries,
    normalizeRecord: normalizeFocusSessionRecord,
  });
}

export async function applyRemoteFocusSessions(records: LocalFocusSessionRecord[]) {
  await applyRemoteRecords(db.focusSessions, records);
}
