import { db, type KeyValueEntry } from "../db";

export async function getAllKeyValues() {
  return db.kv.toArray();
}

export async function putKeyValue(key: string, value: unknown) {
  await db.kv.put({
    key,
    value,
    updatedAt: Date.now(),
  });
}

export async function bulkPutKeyValues(entries: KeyValueEntry[]) {
  if (entries.length === 0) return;
  await db.kv.bulkPut(entries);
}

export async function clearKeyValues() {
  await db.kv.clear();
}
