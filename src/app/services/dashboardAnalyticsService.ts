import { subDays, format } from "date-fns";
import { generateInsightFlashcards, type DeterministicInsightCard } from "./insightService";
import { getCurrentWeekBounds, isHistoryEntryInWeek } from "../utils/dateUtils";
import { getGoalMetricValue } from "../utils/goalUtils";
import { sortHistoryEntries } from "../utils/migrationUtils";
import { GoalProgress, HistoryEntry, KromeSettings, KromeSubject } from "../types";

function matchesSubject(entry: HistoryEntry, subject: KromeSubject) {
  return entry.subjectId === subject.id || (!entry.subjectId && entry.subject === subject.name);
}

function buildSubjectGoal(goal: number | GoalProgress | undefined, fallback: GoalProgress): GoalProgress {
  if (typeof goal === "number") {
    return {
      type: fallback.type,
      target: goal,
      current: 0,
    };
  }

  return goal ?? fallback;
}

export function getSubjectHistory(history: HistoryEntry[], subject: KromeSubject) {
  return sortHistoryEntries(history.filter((entry) => matchesSubject(entry, subject)));
}

export function getTimeDistributionData(entries: HistoryEntry[]) {
  return entries
    .slice(0, 7)
    .reverse()
    .map((entry) => ({
      label: format(entry.startedAt, "MMM d"),
      focusMinutes: Math.round((entry.actualFocusDurationMs ?? entry.durationMs) / 60000),
      interruptMinutes: Math.round((entry.interruptDurationMs ?? 0) / 60000),
    }));
}

export function getProtectionRatioData(entries: HistoryEntry[]) {
  return entries
    .filter((entry) => typeof entry.protectionRatio === "number")
    .slice(0, 10)
    .reverse()
    .map((entry) => ({
      label: format(entry.startedAt, "MMM d"),
      ratio: Math.round((entry.protectionRatio ?? 0) * 100),
    }));
}

export function getSessionHeatmapData(entries: HistoryEntry[]) {
  const entriesByDate = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const dayEntries = entriesByDate.get(entry.dateISO);
    if (dayEntries) {
      dayEntries.push(entry);
    } else {
      entriesByDate.set(entry.dateISO, [entry]);
    }
  }

  return Array.from({ length: 28 }).map((_, index) => {
    const date = subDays(new Date(), 27 - index);
    const dateISO = format(date, "yyyy-MM-dd");
    const dayEntries = entriesByDate.get(dateISO) ?? [];
    const completedCount = dayEntries.filter((entry) => entry.completed).length;
    const averageProtection =
      dayEntries.length > 0
        ? dayEntries.reduce((total, entry) => total + (entry.protectionRatio ?? 1), 0) / dayEntries.length
        : 0;

    return {
      date: dateISO,
      completedCount,
      averageProtection: Math.round(averageProtection * 100),
    };
  });
}

export function getGoalProgressData(entries: HistoryEntry[], subject: KromeSubject, settings: KromeSettings) {
  const todayISO = format(new Date(), "yyyy-MM-dd");
  const todayEntries = entries.filter((entry) => entry.dateISO === todayISO);
  const weekEntries = entries.filter((entry) => isHistoryEntryInWeek(entry));

  const dailyGoal = buildSubjectGoal(subject.settings?.dailyGoal, settings.dailyGoalProgress);
  const weeklyGoal = buildSubjectGoal(subject.settings?.weeklyGoal, settings.weeklyGoalProgress);

  const dailyCurrent = getGoalMetricValue(dailyGoal, {
    blocks: todayEntries.filter((entry) => entry.completed).length,
    minutes: Math.round(todayEntries.reduce((total, entry) => total + (entry.actualFocusDurationMs ?? entry.durationMs), 0) / 60000),
  });
  const weeklyCurrent = getGoalMetricValue(weeklyGoal, {
    blocks: weekEntries.filter((entry) => entry.completed).length,
    minutes: Math.round(weekEntries.reduce((total, entry) => total + (entry.actualFocusDurationMs ?? entry.durationMs), 0) / 60000),
  });

  return {
    daily: { ...dailyGoal, current: dailyCurrent },
    weekly: { ...weeklyGoal, current: weeklyCurrent },
  };
}

export function getSubjectInsightCards(
  history: HistoryEntry[],
  subject: KromeSubject,
  settings: KromeSettings
): DeterministicInsightCard[] {
  return generateInsightFlashcards(history, [subject], settings.weeklyGoalProgress, null, subject.id);
}
