import type { User } from "@supabase/supabase-js";
import { db, type SyncQueueEntry } from "../db/db";
import type {
  LocalCardRecord,
  LocalCardConnectionRecord,
  LocalCanvasPositionRecord,
  LocalCanvasShapeRecord,
  LocalCanvasStickyRecord,
} from "../types";
import { dispatchSyncRequest } from "./syncEvents";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { requirePro } from "../utils/proGate";

const SCREENSHOTS_BUCKET = "card-screenshots";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function enqueueSync(
  tableName: SyncQueueEntry["tableName"],
  recordId: string,
  operation: SyncQueueEntry["operation"],
  payload: Record<string, unknown>,
) {
  const entry: SyncQueueEntry = {
    tableName,
    recordId,
    operation,
    payload,
    status: "pending",
    retryCount: 0,
    createdAt: Date.now(),
  };

  await db.syncQueue.add(entry);
  dispatchSyncRequest();
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export async function getAllCards(userId: string): Promise<LocalCardRecord[]> {
  const records = await db.cards.where("user_id").equals(userId).toArray();
  return records.filter((record) => !record.deleted_at);
}

export async function saveCard(user: User | null, card: LocalCardRecord): Promise<void> {
  requirePro(user);

  const now = Date.now();
  const record: LocalCardRecord = {
    ...card,
    created_at: card.created_at ?? now,
    updated_at: now,
    deleted_at: null,
  };

  await db.cards.put(record);
  await enqueueSync("cards", record.id, "INSERT", record as unknown as Record<string, unknown>);
}

export async function updateCard(user: User | null, id: string, fields: Partial<LocalCardRecord>): Promise<void> {
  requirePro(user);

  const existing = await db.cards.get(id);
  if (!existing) return;

  const updated: LocalCardRecord = {
    ...existing,
    ...fields,
    id: existing.id,
    user_id: existing.user_id,
    updated_at: Date.now(),
  };

  await db.cards.put(updated);
  await enqueueSync("cards", updated.id, "UPDATE", updated as unknown as Record<string, unknown>);
}

export async function deleteCard(user: User | null, id: string, userId: string): Promise<void> {
  requirePro(user);

  const existing = await db.cards.get(id);
  if (!existing || existing.user_id !== userId) return;

  const now = Date.now();
  const deleted: LocalCardRecord = {
    ...existing,
    deleted_at: now,
    updated_at: now,
  };

  await db.cards.put(deleted);
  await enqueueSync("cards", deleted.id, "DELETE", deleted as unknown as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Card screenshots (Supabase Storage)
// ---------------------------------------------------------------------------

export async function saveImage(user: User | null, filename: string, base64: string, userId: string): Promise<string> {
  requirePro(user);

  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  const byteString = atob(base64);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i);
  }

  const path = `${userId}/${filename}`;
  const { error } = await supabase.storage.from(SCREENSHOTS_BUCKET).upload(path, bytes, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) {
    throw error;
  }

  return getImageUrl(filename, userId);
}

export function getImageUrl(filename: string, userId: string): string {
  if (!isSupabaseConfigured) return "";
  const { data } = supabase.storage.from(SCREENSHOTS_BUCKET).getPublicUrl(`${userId}/${filename}`);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Canvas positions
// ---------------------------------------------------------------------------

export async function saveCanvasPositions(user: User | null, positions: LocalCanvasPositionRecord[]): Promise<void> {
  requirePro(user);
  if (positions.length === 0) return;

  const now = Date.now();
  const records = positions.map((position) => ({
    ...position,
    updated_at: now,
  }));

  await db.canvasPositions.bulkPut(records);

  for (const record of records) {
    await enqueueSync("canvas_positions", record.id, "UPDATE", record as unknown as Record<string, unknown>);
  }
}

export async function getCanvasPositions(userId: string, canvasId: string): Promise<LocalCanvasPositionRecord[]> {
  return db.canvasPositions
    .where("[user_id+canvas_id]")
    .equals([userId, canvasId])
    .toArray()
    .catch(() => {
      // Fallback: compound index may not exist; filter in JS.
      return db.canvasPositions
        .where("user_id")
        .equals(userId)
        .filter((record) => record.canvas_id === canvasId)
        .toArray();
    });
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export async function saveConnections(user: User | null, connections: LocalCardConnectionRecord[]): Promise<void> {
  requirePro(user);
  if (connections.length === 0) return;

  const now = Date.now();
  const records = connections.map((connection) => ({
    ...connection,
    created_at: connection.created_at ?? now,
    updated_at: now,
    deleted_at: null as number | null,
  }));

  await db.cardConnections.bulkPut(records);

  for (const record of records) {
    await enqueueSync("card_connections", record.id, "INSERT", record as unknown as Record<string, unknown>);
  }
}

export async function getConnections(userId: string): Promise<LocalCardConnectionRecord[]> {
  const records = await db.cardConnections.where("user_id").equals(userId).toArray();
  return records.filter((record) => !record.deleted_at);
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export async function saveShapes(user: User | null, shapes: LocalCanvasShapeRecord[]): Promise<void> {
  requirePro(user);
  if (shapes.length === 0) return;

  const now = Date.now();
  const records = shapes.map((shape) => ({
    ...shape,
    updated_at: now,
    deleted_at: null as number | null,
  }));

  await db.canvasShapes.bulkPut(records);

  for (const record of records) {
    await enqueueSync("canvas_shapes", record.id, "INSERT", record as unknown as Record<string, unknown>);
  }
}

export async function getShapes(userId: string, canvasId: string): Promise<LocalCanvasShapeRecord[]> {
  const records = await db.canvasShapes.where("user_id").equals(userId).toArray();
  return records.filter((record) => record.canvas_id === canvasId && !record.deleted_at);
}

// ---------------------------------------------------------------------------
// Stickies
// ---------------------------------------------------------------------------

export async function saveStickies(user: User | null, stickies: LocalCanvasStickyRecord[]): Promise<void> {
  requirePro(user);
  if (stickies.length === 0) return;

  const now = Date.now();
  const records = stickies.map((sticky) => ({
    ...sticky,
    updated_at: now,
    deleted_at: null as number | null,
  }));

  await db.canvasStickies.bulkPut(records);

  for (const record of records) {
    await enqueueSync("canvas_stickies", record.id, "INSERT", record as unknown as Record<string, unknown>);
  }
}

export async function getStickies(userId: string, canvasId: string): Promise<LocalCanvasStickyRecord[]> {
  const records = await db.canvasStickies.where("user_id").equals(userId).toArray();
  return records.filter((record) => record.canvas_id === canvasId && !record.deleted_at);
}
