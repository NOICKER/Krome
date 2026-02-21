import React from 'react';
import { Download, AlertTriangle } from 'lucide-react';
import { KromeHistoryEntry } from '../types';

interface HistoryListProps {
    entries: KromeHistoryEntry[];
}

export function HistoryList({ entries }: HistoryListProps) {
    const handleExport = () => {
        const text = entries.map(e => {
            const start = new Date(e.startedAt).toLocaleTimeString();
            const end = new Date(e.startedAt + e.durationMs).toLocaleTimeString();
            const duration = Math.round(e.durationMs / 60000);
            return `[${e.dateISO} ${start} - ${end}] ${e.subject || 'general'} (${duration}m) — ${e.intent || 'No intent'} — ${e.completed ? 'Completed' : 'Abandoned'}${e.notes ? ` — Note: ${e.notes}` : ''}${e.potSpilled ? ' (Pot Spilled)' : ''}`;
        }).join('\n');
        navigator.clipboard.writeText(text);
    };

    const sorted = [...entries].sort((a, b) => b.startedAt - a.startedAt);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Session History</h3>
                {entries.length > 0 && (
                    <button
                        onClick={handleExport}
                        className="text-xs flex items-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        <Download size={14} className="mr-1" />
                        Export
                    </button>
                )}
            </div>

            <div className="space-y-3">
                {sorted.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No sessions yet.</p>
                ) : (
                    sorted.map(entry => {
                        const startDate = new Date(entry.startedAt);
                        const endDate = new Date(entry.startedAt + entry.durationMs);
                        const durationMins = Math.round(entry.durationMs / 60000);
                        return (
                            <div key={entry.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-medium text-sm text-slate-900 dark:text-white">
                                            {entry.subject || 'general'}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            {durationMins} min
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                {entry.intent && (
                                    <div className="text-sm text-slate-600 dark:text-slate-300 italic mb-1">"{entry.intent}"</div>
                                )}

                                {entry.notes && (
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Note: {entry.notes}</div>
                                )}

                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${entry.completed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {entry.completed ? 'Completed' : 'Abandoned'}
                                    </span>

                                    {entry.potSpilled && (
                                        <span className="text-[10px] flex items-center uppercase font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                            <AlertTriangle size={10} className="mr-1" /> Pot Spilled
                                        </span>
                                    )}

                                    {entry.sessionType === 'helper' && (
                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            Helper
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
