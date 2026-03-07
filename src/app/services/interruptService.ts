import { HistoryEntry, InterruptEntry } from "../types";

export function getInterruptEntries(history: HistoryEntry[]): InterruptEntry[] {
    return history.flatMap((entry) => entry.interrupts ?? []);
}

export function getTotalInterruptDuration(history: HistoryEntry[]) {
    return getInterruptEntries(history).reduce((total, entry) => total + entry.durationMs, 0);
}

export function getMostFrequentInterruptReason(history: HistoryEntry[]) {
    const reasonCounts = new Map<string, number>();

    for (const interrupt of getInterruptEntries(history)) {
        reasonCounts.set(interrupt.reason, (reasonCounts.get(interrupt.reason) ?? 0) + 1);
    }

    let topReason: string | null = null;
    let topCount = 0;

    for (const [reason, count] of reasonCounts.entries()) {
        if (count > topCount) {
            topReason = reason;
            topCount = count;
        }
    }

    return {
        reason: topReason,
        count: topCount,
    };
}
