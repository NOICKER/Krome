import React from 'react';
import { Target, ListChecks, Settings } from 'lucide-react';

export type ViewMode = 'focus' | 'review' | 'settings';

interface BottomNavProps {
    currentView: ViewMode;
    setCurrentView: (view: ViewMode) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setCurrentView }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe pt-2 px-6 flex justify-around items-center z-50">
            <button
                onClick={() => setCurrentView('focus')}
                className={`flex flex-col items-center justify-center p-2 min-w-[64px] rounded-xl transition-colors ${currentView === 'focus'
                        ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
            >
                <Target size={24} strokeWidth={currentView === 'focus' ? 2.5 : 2} />
                <span className="text-[10px] font-medium mt-1">Focus</span>
            </button>
            <button
                onClick={() => setCurrentView('review')}
                className={`flex flex-col items-center justify-center p-2 min-w-[64px] rounded-xl transition-colors ${currentView === 'review'
                        ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
            >
                <ListChecks size={24} strokeWidth={currentView === 'review' ? 2.5 : 2} />
                <span className="text-[10px] font-medium mt-1">Review</span>
            </button>
            <button
                onClick={() => setCurrentView('settings')}
                className={`flex flex-col items-center justify-center p-2 min-w-[64px] rounded-xl transition-colors ${currentView === 'settings'
                        ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
            >
                <Settings size={24} strokeWidth={currentView === 'settings' ? 2.5 : 2} />
                <span className="text-[10px] font-medium mt-1">Settings</span>
            </button>
        </div>
    );
};
