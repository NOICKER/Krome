import type { Table } from "dexie";
import { db, type SyncMetadata, type SyncQueueEntry, type SyncTableName } from "../db";
import { dispatchSyncRequest } from "../../services/syncEvents";

type SyncableRecord = {
  id: string;
  createdAt?: number;
  updatedAt?: number;
  deletedAt?: number | null;
};

type NormalizeRecord<T extends SyncableRecord> = (record: T, previous: T | undefined, timestamp: number) => T & SyncMetadata;

interface PersistCollectionOptions<T extends SyncableRecord> {
  table: Table<T & SyncMetadata, string>;
  tableName: SyncTableName;
  nextRecords: T[];
  previousRecords: T[];
  normalizeRecord?: NormalizeRecord<T>;
}

function areRecordsEqual<T>(left: T, right: T) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function defaultNormalizeRecord<T extends SyncableRecord>(record: T, previous: T | undefined, timestamp: number): T & SyncMetadata {
  const createdAt = record.createdAt ?? previous?.createdAt ?? timestamp;

  return {
    ...record,
    createdAt,
    updatedAt: timestamp,
    deletedAt: null,
  };
}

export async function listActiveRecords<T extends SyncableRecord>(table: Table<T & SyncMetadata, string>): Promise<T[]> {
  const records = await table.toArray();
  return records.filter((record) => !record.deletedAt);
}

export async function applyRemoteRecords<T extends SyncableRecord>(
  table: Table<T & SyncMetadata, string>,
  records: Array<T & SyncMetadata>
) {
  if (records.length === 0) return;
  await table.bulkPut(records);
}

export async function persistCollection<T extends SyncableRecord>({
  table,
  tableName,
  nextRecords,
  previousRecords,
  normalizeRecord = defaultNormalizeRecord,
}: PersistCollectionOptions<T>) {
  const timestamp = Date.now();
  const previousById = new Map(previousRecords.map((record) => [record.id, record]));
  const nextById = new Map(nextRecords.map((record) => [record.id, record]));
  const recordsToPersist: Array<T & SyncMetadata> = [];
  const queueEntries: SyncQueueEntry[] = [];

  for (const record of nextRecords) {
    const previous = previousById.get(record.id);
    if (previous && areRecordsEqual(previous, record)) continue;

    recordsToPersist.push(normalizeRecord(record, previous, timestamp));
    queueEntries.push({
      tableName,
      recordId: record.id,
      operation: previous ? "UPDATE" : "INSERT",
      payload: normalizeRecord(record, previous, timestamp),
      status: "pending",
      retryCount: 0,
      createdAt: timestamp,
    });
  }

  for (const previous of previousRecords) {
    if (nextById.has(previous.id)) continue;

    const deletedRecord = normalizeRecord(
      {
        ...previous,
        deletedAt: timestamp,
      } as T,
      previous,
      timestamp
    );

    recordsToPersist.push({
      ...deletedRecord,
      deletedAt: timestamp,
      updatedAt: timestamp,
    });
    queueEntries.push({
      tableName,
      recordId: previous.id,
      operation: "DELETE",
      payload: {
        ...deletedRecord,
        deletedAt: timestamp,
        updatedAt: timestamp,
      },
      status: "pending",
      retryCount: 0,
      createdAt: timestamp,
    });
  }

  if (recordsToPersist.length === 0 && queueEntries.length === 0) return;

  await db.transaction("rw", table, db.syncQueue, async () => {
    if (recordsToPersist.length > 0) {
      await table.bulkPut(recordsToPersist);
    }

    if (queueEntries.length > 0) {
      await db.syncQueue.bulkAdd(queueEntries);
    }
  });

  if (queueEntries.length > 0) {
    dispatchSyncRequest();
  }
}
