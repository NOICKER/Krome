import React from 'react';
import { HistoryList } from './HistoryList';
import { CalendarView } from './CalendarView';
import { DailySummary } from './DailySummary';
import { KromeHistoryEntry, AppState } from '../types';

interface ReviewViewProps {
    state: AppState;
    historyData: KromeHistoryEntry[];
    selectedDate: string;
    onSelectDate: (date: string) => void;
}

export const ReviewView: React.FC<ReviewViewProps> = ({ state, historyData, selectedDate, onSelectDate }) => {

    // Filter history for the selected date
    const dayHistory = historyData.filter(e => e.dateISO === selectedDate);

    // Calculate stats just for this day to show in DailySummary
    const completedBlocks = dayHistory.filter(e => e.completed && e.sessionType === 'standard').length;

    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center pb-32 animate-in fade-in duration-300 p-4 sm:p-6 space-y-8">
            <div className="w-full text-left space-y-1">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Review</h1>
                <p className="text-sm text-slate-500">A factual log of your past sessions.</p>
            </div>

            <div className="w-full">
                <CalendarView
                    history={historyData}
                    selectedDate={selectedDate}
                    onSelectDate={onSelectDate}
                />
            </div>

            <DailySummary
                entries={dayHistory}
                blocksCompleted={completedBlocks}
            />

            <div className="w-full pt-4">
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 px-2 uppercase tracking-wide">
                    {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}
                </h2>
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <HistoryList entries={dayHistory} />
                </div>
            </div>
        </div>
    );
};
