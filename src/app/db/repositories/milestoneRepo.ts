import type { Milestone } from "../../types";
import { db, type LocalMilestoneRecord } from "../db";
import { applyRemoteRecords, listActiveRecords, persistCollection } from "./shared";

function normalizeMilestoneRecord(milestone: Milestone, previous: Milestone | undefined, timestamp: number): LocalMilestoneRecord {
  return {
    ...previous,
    ...milestone,
    createdAt: milestone.createdAt ?? previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function getStoredMilestones() {
  return listActiveRecords(db.milestones);
}

export async function replaceStoredMilestones(nextMilestones: Milestone[], previousMilestones: Milestone[]) {
  await persistCollection({
    table: db.milestones,
    tableName: "milestones",
    nextRecords: nextMilestones,
    previousRecords: previousMilestones,
    normalizeRecord: normalizeMilestoneRecord,
  });
}

export async function applyRemoteMilestones(records: LocalMilestoneRecord[]) {
  await applyRemoteRecords(db.milestones, records);
}
