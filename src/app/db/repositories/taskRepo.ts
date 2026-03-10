import type { Task } from "../../types";
import { db, type LocalTaskRecord } from "../db";
import { applyRemoteRecords, listActiveRecords, persistCollection } from "./shared";

function normalizeTaskRecord(task: Task, previous: Task | undefined, timestamp: number): LocalTaskRecord {
  return {
    ...previous,
    ...task,
    createdAt: task.createdAt ?? previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function getStoredTasks() {
  return listActiveRecords(db.tasks);
}

export async function replaceStoredTasks(nextTasks: Task[], previousTasks: Task[]) {
  await persistCollection({
    table: db.tasks,
    tableName: "tasks",
    nextRecords: nextTasks,
    previousRecords: previousTasks,
    normalizeRecord: normalizeTaskRecord,
  });
}

export async function applyRemoteTasks(records: LocalTaskRecord[]) {
  await applyRemoteRecords(db.tasks, records);
}
