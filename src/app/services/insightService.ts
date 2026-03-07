import { GoalProgress, HistoryEntry, SeverityLevel, Subject, WeeklyPlan } from "../types";
import { InsightPatternPayload } from "./aiService";
import { isHistoryEntryInWeek } from "../utils/dateUtils";
import { getGoalMetricValue, getGoalUnitLabel } from "../utils/goalUtils";
import { getMostFrequentInterruptReason, getTotalInterruptDuration } from "./interruptService";

export interface DeterministicInsightCard {
  id: string;
  description: string;
  metric?: string;
  dataMirror?: string;
  severityLevel: SeverityLevel;
  dateGenerated: number;
  relevantSubjectId?: string;
  payload: InsightPatternPayload;
}

function createInsightCard(
  payload: InsightPatternPayload,
  description: string,
  metric?: string,
  relevantSubjectId?: string
): DeterministicInsightCard {
  return {
    id: `${payload.kind}-${relevantSubjectId ?? "global"}-${payload.dataMirror}`,
    description,
    metric,
    dataMirror: payload.dataMirror,
    severityLevel: payload.severityLevel,
    dateGenerated: Date.now(),
    relevantSubjectId,
    payload,
  };
}

function getExecutionMetric(entry: HistoryEntry, goal: GoalProgress) {
  return getGoalMetricValue(goal, {
    blocks: entry.completed ? 1 : 0,
    minutes: Math.round((entry.actualFocusDurationMs ?? entry.durationMs) / 60000),
  });
}

export function generateInsightFlashcards(
  history: HistoryEntry[],
  subjects: Subject[],
  weeklyGoal: GoalProgress,
  weeklyPlan: WeeklyPlan | null = null,
  subjectId?: string
): DeterministicInsightCard[] {
  const scopedHistory = subjectId
    ? history.filter((entry) => entry.subjectId === subjectId)
    : history;
  const scopedSubjects = subjectId
    ? subjects.filter((subject) => subject.id === subjectId)
    : subjects;

  if (scopedHistory.length === 0) {
    return [];
  }

  const cards: DeterministicInsightCard[] = [];
  const recent = scopedHistory.slice(0, 12);
  const weeklyEntries = scopedHistory.filter((entry) => isHistoryEntryInWeek(entry));
  const weeklyCurrent = weeklyEntries.reduce((total, entry) => total + getExecutionMetric(entry, weeklyGoal), 0);
  const weeklyPercent = weeklyGoal.target > 0 ? weeklyCurrent / weeklyGoal.target : 0;
  const weeklyUnit = getGoalUnitLabel(weeklyGoal.type);

  if (weeklyGoal.target > 0) {
    const severityLevel =
      weeklyPercent >= 1
        ? SeverityLevel.Neutral
        : weeklyPercent < 0.4
          ? SeverityLevel.Direct
          : weeklyPercent < 0.7
            ? SeverityLevel.Concern
            : SeverityLevel.Advisory;

    cards.push(
      createInsightCard(
        {
          kind: "weekly_momentum",
          severityLevel,
          dataMirror: `${weeklyCurrent}/${weeklyGoal.target} ${weeklyUnit}`,
        },
        weeklyPercent >= 1
          ? "The weekly line is covered so far."
          : "The week is still below its intended line.",
        `${weeklyCurrent}/${weeklyGoal.target} ${weeklyUnit}`
      )
    );
  }

  if (weeklyPlan) {
    const subjectProgress = new Map<string, number>();
    for (const entry of weeklyEntries) {
      if (!entry.subjectId) continue;
      subjectProgress.set(
        entry.subjectId,
        (subjectProgress.get(entry.subjectId) ?? 0) + getExecutionMetric(entry, weeklyGoal)
      );
    }

    let biggestGap:
      | {
          subjectId: string;
          target: number;
          actual: number;
        }
      | undefined;

    for (const [subjectId, target] of Object.entries(weeklyPlan.allocations)) {
      const actual = subjectProgress.get(subjectId) ?? 0;
      if (actual >= target) continue;
      if (!biggestGap || target - actual > biggestGap.target - biggestGap.actual) {
        biggestGap = { subjectId, target, actual };
      }
    }

    if (biggestGap) {
      const subject = scopedSubjects.find((entry) => entry.id === biggestGap.subjectId);
      const gapRatio = biggestGap.target > 0 ? biggestGap.actual / biggestGap.target : 1;
      const severityLevel =
        gapRatio < 0.3
          ? SeverityLevel.Accountability
          : gapRatio < 0.55
            ? SeverityLevel.Direct
            : SeverityLevel.Concern;

      cards.push(
        createInsightCard(
          {
            kind: "execution_gap",
            severityLevel,
            subjectName: subject?.name,
            dataMirror: `Planned ${biggestGap.target} / Executed ${biggestGap.actual}`,
          },
          `${subject?.name ?? "This subject"} is behind its weekly allocation.`,
          `${biggestGap.actual}/${biggestGap.target} ${weeklyUnit}`,
          biggestGap.subjectId
        )
      );
    }
  }

  const abandonCount = recent.filter((entry) => !entry.completed).length;
  if (abandonCount >= 2) {
    const severityLevel =
      abandonCount >= 4 ? SeverityLevel.Accountability : abandonCount >= 3 ? SeverityLevel.Direct : SeverityLevel.Concern;
    cards.push(
      createInsightCard(
        {
          kind: "abandonment",
          severityLevel,
          dataMirror: `${abandonCount}/${recent.length} recent sessions abandoned`,
        },
        "Abandonments are recurring in recent history.",
        `${abandonCount}/${recent.length}`
      )
    );
  }

  const recentProtection = recent
    .filter((entry) => typeof entry.protectionRatio === "number")
    .slice(0, 3);

  if (recentProtection.length >= 2) {
    const averageProtection =
      recentProtection.reduce((total, entry) => total + (entry.protectionRatio ?? 1), 0) / recentProtection.length;

    if (averageProtection < 0.85) {
      const severityLevel =
        averageProtection < 0.5
          ? SeverityLevel.Accountability
          : averageProtection < 0.65
            ? SeverityLevel.Direct
            : averageProtection < 0.75
              ? SeverityLevel.Concern
              : SeverityLevel.Advisory;

      cards.push(
        createInsightCard(
          {
            kind: "protection_ratio",
            severityLevel,
            dataMirror: `${Math.round(averageProtection * 100)}% across ${recentProtection.length} sessions`,
          },
          "Recent sessions are losing time to interruptions.",
          `${Math.round(averageProtection * 100)}%`
        )
      );
    }
  }

  const interruptMinutes = Math.round(getTotalInterruptDuration(weeklyEntries) / 60000);
  if (interruptMinutes > 0) {
    const topInterrupt = getMostFrequentInterruptReason(weeklyEntries);
    const severityLevel =
      interruptMinutes >= 90
        ? SeverityLevel.Direct
        : interruptMinutes >= 45
          ? SeverityLevel.Concern
          : SeverityLevel.Advisory;

    cards.push(
      createInsightCard(
        {
          kind: "interrupt_cost",
          severityLevel,
          dataMirror: `${interruptMinutes} interrupted minutes this week`,
        },
        topInterrupt.reason
          ? `${topInterrupt.reason} is the most common interruption cause.`
          : "Interruptions are consuming measurable time this week.",
        `${interruptMinutes} min`
      )
    );
  }

  const knownSubjectIds = new Set(scopedSubjects.map((subject) => subject.id));
  return cards
    .filter((card) => !card.relevantSubjectId || knownSubjectIds.has(card.relevantSubjectId))
    .sort((a, b) => b.severityLevel - a.severityLevel || b.dateGenerated - a.dateGenerated)
    .slice(0, 3);
}
