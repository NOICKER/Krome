import React from 'react';
import { Shield } from 'lucide-react';
import { AppState } from '../types';
import { BrickDisplay } from './BrickDisplay';
import { SessionControls } from './SessionControls';

interface FocusViewProps {
    state: AppState;
    onStartSession: (subject?: string | null, intent?: string | null) => void;
    onAbandonSession: () => void;
    onCompleteSession: () => void;
    onFillFeedback: () => void;
    isPaused: boolean;
    onCategorySwitch?: (category: 'study' | 'reset' | 'distraction' | 'away') => void;
}

export const FocusView: React.FC<FocusViewProps> = ({
    state,
    onStartSession,
    onAbandonSession,
    onCompleteSession,
    onFillFeedback,
    isPaused,
    onCategorySwitch
}) => {

    // Derived values
    const isRunning = state.session.isActive && state.session.status === 'running';

    return (
        <div className="w-full flex flex-col items-center justify-center min-h-[60vh] max-w-3xl mx-auto p-4 sm:p-6 animate-in fade-in duration-300">

            {/* Header Area */}
            <div className="w-full flex items-center justify-between mb-8 sm:mb-12">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Krome</h1>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase tracking-widest hidden sm:inline-block">
                        Neutral Mode
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        <Shield size={12} className={state.streak.current > 0 ? "text-kromeAccent" : "text-slate-400"} />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{state.streak.current}</span>
                    </div>
                </div>
            </div>

            {/* Main Center Area: The Bricks & Meta */}
            <div className="w-full flex-1 flex flex-col items-center justify-center space-y-6 sm:space-y-8">

                {/* Brick Hero */}
                {state.settings.blindMode && isRunning ? (
                    <div className="text-center py-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 w-full">
                        <p className="text-lg font-medium text-slate-600 dark:text-slate-400">Period in progress.</p>
                    </div>
                ) : (
                    <div className="w-full max-w-xl">
                        <BrickDisplay
                            totalDurationMs={state.session.totalDurationMinutes * 60 * 1000}
                            intervalMs={state.session.intervalMinutes * 60 * 1000}
                            startTime={state.session.isActive ? state.session.startTime : null}
                            settings={state.settings}
                            onComplete={onCompleteSession}
                            onFill={onFillFeedback}
                            totalBlocks={state.session.totalBlocks}
                            isPaused={isPaused}
                            isAbandoned={state.session.status === 'abandoned'}
                            claimedEndTime={state.session.claimedEndTime}
                        />
                    </div>
                )}

                {/* Metadata Row (Subject/Intent) - Only show when running if Wrapper is enabled */}
                {state.settings.wrapperEnabled && isRunning && (state.session.subject || state.session.intent) && (
                    <div className="flex flex-col items-center text-center space-y-1 mt-2 mb-4">
                        {state.session.subject && (
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {state.session.subject}
                            </span>
                        )}
                        {state.session.intent && (
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {state.session.intent}
                            </span>
                        )}
                    </div>
                )}

                {/* Strict Mode Category Row (Mockup via prompt constraint) */}
                {state.settings.strictMode && isRunning && state.session.type === 'standard' && (
                    <div className="flex justify-center gap-2 mt-2 w-full max-w-xs" role="group" aria-label="Strict Mode Categories">
                        {(['study', 'reset', 'distraction', 'away'] as const).map(cat => (
                            <button
                                key={cat}
                                onClick={() => onCategorySwitch && onCategorySwitch(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${state.session.currentCategory === cat
                                    ? 'bg-slate-800 dark:bg-kromeAccent/20 border-slate-900 dark:border-kromeAccent/40 text-white dark:text-slate-100'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                aria-pressed={state.session.currentCategory === cat}
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        ))}
                    </div>
                )}

                {/* Lower Controls */}
                <div className="w-full max-w-xs pt-4">
                    <SessionControls
                        isActive={state.session.isActive}
                        blockMinutes={state.settings.blockMinutes}
                        sessionType={state.session.type}
                        sessionStatus={state.session.status}
                        wrapperEnabled={state.settings.wrapperEnabled}
                        defaultSubject={state.settings.defaultSubject}
                        onStart={(subject, intent) => onStartSession(subject, intent)}
                        onAbandon={onAbandonSession}
                    />
                </div>

            </div>

            {/* Keyboard hint (hidden on mobile, only visible when not running) */}
            {!state.session.isActive && (
                <div className="hidden sm:block absolute bottom-24 text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                    Press Space to Start
                </div>
            )}
        </div>
    );
};
