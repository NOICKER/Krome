import React from 'react';
import { Coffee, X } from 'lucide-react';

interface BreakSuggesterProps {
    onStartBreak: () => void;
    onDismiss: () => void;
}

export function BreakSuggester({ onStartBreak, onDismiss }: BreakSuggesterProps) {
    return (
        <div className="w-full max-w-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                    <Coffee size={18} />
                </div>
                <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Short reset: 5 min</p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <button
                    onClick={onStartBreak}
                    className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-md hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
                >
                    Start
                </button>
                <button
                    onClick={onDismiss}
                    className="p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
