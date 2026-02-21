import React, { useMemo } from 'react';
import { KromeHistoryEntry } from '../types';

interface DailySummaryProps {
    entries: KromeHistoryEntry[];
    blocksCompleted: number;
}

export function DailySummary({ entries, blocksCompleted }: DailySummaryProps) {
    const { totalTime, subjectsMap } = useMemo(() => {
        let totalMs = 0;
        const map = new Map<string, number>();

        entries.forEach(entry => {
            if (entry.completed && entry.sessionType !== 'helper') {
                totalMs += entry.durationMs;
                const subj = entry.subject || 'general';
                map.set(subj, (map.get(subj) || 0) + entry.durationMs);
            }
        });

        return { totalTime: totalMs, subjectsMap: map };
    }, [entries]);

    if (entries.length === 0 && blocksCompleted === 0) return null;

    const totalMin = Math.round(totalTime / 60000);
    const subjectsArray = Array.from(subjectsMap.entries()).map(([subj, ms]) => {
        return `${subj} (${Math.round(ms / 60000)}m)`;
    });

    return (
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Daily Summary</h3>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <p>Total time claimed: {totalMin} min</p>
                <p>Blocks completed: {blocksCompleted}</p>
                {subjectsArray.length > 0 && <p>Subjects: {subjectsArray.join(', ')}</p>}
            </div>
        </div>
    );
}
