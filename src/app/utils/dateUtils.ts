import { endOfWeek, eachDayOfInterval, format, isWithinInterval, parseISO, startOfWeek } from "date-fns";
import { GoalProgress, HistoryEntry, KromeWeek } from "../types";
import { getGoalMetricValue, withGoalCurrent } from "./goalUtils";

export function getCurrentWeekBounds(date = new Date()) {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });

    return { start, end };
}

export function isHistoryEntryInWeek(entry: HistoryEntry, date = new Date()) {
    const { start, end } = getCurrentWeekBounds(date);
    const entryDate = parseISO(entry.dateISO);
    return isWithinInterval(entryDate, { start, end });
}

export function getCurrentWeekProgress(history: HistoryEntry[], goal: GoalProgress, date = new Date()): KromeWeek {
    const { start } = getCurrentWeekBounds(date);
    const weekEntries = history.filter((entry) => isHistoryEntryInWeek(entry, date));
    const blocksCompleted = weekEntries.filter((entry) => entry.completed).length;
    const minutesFocused = Math.round(
        weekEntries.reduce((total, entry) => total + (entry.actualFocusDurationMs ?? entry.durationMs), 0) / 60000
    );
    const goalProgress = withGoalCurrent(goal, getGoalMetricValue(goal, { blocks: blocksCompleted, minutes: minutesFocused }), goal);

    return {
        weekStartDate: format(start, "yyyy-MM-dd"),
        blocksCompleted,
        goal: goalProgress.target,
        minutesFocused,
        goalProgress,
    };
}

export function getCurrentWeekDailyCounts(history: HistoryEntry[], goalType: GoalProgress["type"], date = new Date()) {
    const { start, end } = getCurrentWeekBounds(date);

    return eachDayOfInterval({ start, end }).map((day) => {
        const dayISO = format(day, "yyyy-MM-dd");
        const blocksCompleted = history.filter((entry) => entry.dateISO === dayISO && entry.completed).length;
        const minutesFocused = Math.round(
            history
                .filter((entry) => entry.dateISO === dayISO)
                .reduce((total, entry) => total + (entry.actualFocusDurationMs ?? entry.durationMs), 0) / 60000
        );
        return {
            date: dayISO,
            label: format(day, "EEE"),
            blocksCompleted,
            minutesFocused,
            current: goalType === "minutes" ? minutesFocused : blocksCompleted,
        };
    });
}
