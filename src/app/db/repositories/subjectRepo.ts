import type { KromeSubject } from "../../types";
import { db, type LocalSubjectRecord } from "../db";
import { applyRemoteRecords, listActiveRecords, persistCollection } from "./shared";

function normalizeSubjectRecord(subject: KromeSubject, previous: KromeSubject | undefined, timestamp: number): LocalSubjectRecord {
  return {
    ...previous,
    ...subject,
    createdAt: subject.createdAt ?? previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function getStoredSubjects() {
  return listActiveRecords(db.subjects);
}

export async function replaceStoredSubjects(nextSubjects: KromeSubject[], previousSubjects: KromeSubject[]) {
  await persistCollection({
    table: db.subjects,
    tableName: "subjects",
    nextRecords: nextSubjects,
    previousRecords: previousSubjects,
    normalizeRecord: normalizeSubjectRecord,
  });
}

export async function applyRemoteSubjects(records: LocalSubjectRecord[]) {
  await applyRemoteRecords(db.subjects, records);
}
