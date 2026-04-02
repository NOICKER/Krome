import { HistoryEntry } from "../types";
import { getTimeOfDay } from "./timeUtils";

export function sortHistoryEntries<T extends Pick<HistoryEntry, "startedAt" | "id">>(entries: T[]): T[] {
  return [...entries].sort((left, right) => right.startedAt - left.startedAt || right.id.localeCompare(left.id));
}

export function migrateHistoryEntry(entry: HistoryEntry): HistoryEntry {
  const interrupts = entry.interrupts ?? [];
  const interruptDurationMs =
    entry.interruptDurationMs ??
    interrupts.reduce((total, interrupt) => total + interrupt.durationMs, 0);
  const actualFocusDurationMs = entry.actualFocusDurationMs ?? entry.durationMs;
  const trackedDuration = actualFocusDurationMs + interruptDurationMs;

  return {
    ...entry,
    interrupts,
    plannedDurationMs: entry.plannedDurationMs,
    actualFocusDurationMs,
    interruptDurationMs,
    protectionRatio:
      entry.protectionRatio ?? (trackedDuration > 0 ? actualFocusDurationMs / trackedDuration : 1),
    completionStatus: entry.completionStatus ?? (entry.completed ? "completed" : "abandoned"),
    abandonReason: entry.abandonReason,
    timeOfDay: entry.timeOfDay ?? getTimeOfDay(entry.startedAt),
    severityImpact: entry.severityImpact ?? (entry.completed ? 0 : 3),
  };
}
export function migrateGenericSettings(settings: any) {
  if (!settings || typeof settings !== 'object') return settings;
  const migrated = { ...settings };

  if ('blockMinutes' in migrated && !('sessionMinutes' in migrated)) {
    migrated.sessionMinutes = migrated.blockMinutes;
  }
  if ('sessionDuration' in migrated && !('sessionMinutes' in migrated)) {
    migrated.sessionMinutes = migrated.sessionDuration;
  }
  if ('intervalMinutes' in migrated && !('plipMinutes' in migrated)) {
    migrated.plipMinutes = migrated.intervalMinutes;
  }
  if ('plipInterval' in migrated && !('plipMinutes' in migrated)) {
    migrated.plipMinutes = migrated.plipInterval;
  }

  // Cleanup old keys if migrated
  delete migrated.blockMinutes;
  delete migrated.sessionDuration;
  delete migrated.intervalMinutes;
  delete migrated.plipInterval;

  return migrated;
}
