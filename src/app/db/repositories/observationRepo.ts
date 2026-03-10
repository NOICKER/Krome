import type { Observation } from "../../types";
import { db, type LocalObservationRecord } from "../db";
import { applyRemoteRecords, listActiveRecords, persistCollection } from "./shared";

function normalizeObservationRecord(observation: Observation, previous: Observation | undefined, timestamp: number): LocalObservationRecord {
  return {
    ...previous,
    ...observation,
    createdAt: observation.createdAt ?? previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function getStoredObservations() {
  return listActiveRecords(db.observations);
}

export async function replaceStoredObservations(nextObservations: Observation[], previousObservations: Observation[]) {
  await persistCollection({
    table: db.observations,
    tableName: "observations",
    nextRecords: nextObservations,
    previousRecords: previousObservations,
    normalizeRecord: normalizeObservationRecord,
  });
}

export async function applyRemoteObservations(records: LocalObservationRecord[]) {
  await applyRemoteRecords(db.observations, records);
}
