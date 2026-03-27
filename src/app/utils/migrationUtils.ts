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
