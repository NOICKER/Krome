import React from 'react';
import { Volume2, Bell, Zap } from 'lucide-react';
import { AppState, Settings } from '../types';

interface SettingsPanelProps {
    state: AppState;
    updateSettings: (newSettings: Partial<Settings>) => void;
    isGoalLocked: boolean;
}

export function SettingsPanel({ state, updateSettings, isGoalLocked }: SettingsPanelProps) {
    return (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center pb-32 animate-in fade-in duration-300 p-4 sm:p-6 space-y-8">
            <div className="w-full text-left space-y-1">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
                <p className="text-sm text-slate-500">Configure Krome's behavior and constraints.</p>
            </div>

            <div className="w-full space-y-8">
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Wrapper Features</h4>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">Enable Wrapper</span>
                            <span className="text-xs text-slate-500">Subject, intent, and history</span>
                        </div>
                        <button
                            onClick={() => updateSettings({ wrapperEnabled: !state.settings.wrapperEnabled })}
                            className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${state.settings.wrapperEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${state.settings.wrapperEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {state.settings.wrapperEnabled && (
                        <div className="space-y-2 pl-2 border-l-2 border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between py-1">
                                <span className="text-sm text-slate-700 dark:text-slate-300">Show Calendar</span>
                                <button
                                    onClick={() => updateSettings({ showCalendar: !state.settings.showCalendar })}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${state.settings.showCalendar ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full transition-transform ${state.settings.showCalendar ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <span className="text-sm text-slate-700 dark:text-slate-300">Auto-suggest Breaks</span>
                                <button
                                    onClick={() => updateSettings({ autoSuggestBreaks: !state.settings.autoSuggestBreaks })}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${state.settings.autoSuggestBreaks ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full transition-transform ${state.settings.autoSuggestBreaks ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between py-1">
                                <span className="text-sm text-slate-700 dark:text-slate-300">Progressive Escalation</span>
                                <button
                                    onClick={() => updateSettings({ progressiveEscalation: !state.settings.progressiveEscalation })}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${state.settings.progressiveEscalation ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full transition-transform ${state.settings.progressiveEscalation ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Strict Mode Options */}
                <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">Strict Mode</h4>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">Strict Mode</span>
                            <span className="text-xs text-slate-500">Track categories and pot value</span>
                        </div>
                        <button
                            onClick={() => updateSettings({ strictMode: !state.settings.strictMode })}
                            className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${state.settings.strictMode ? 'bg-kromeAccent' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${state.settings.strictMode ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">Blind Mode</span>
                            <span className="text-xs text-slate-500">Hide visual progress during blocks</span>
                        </div>
                        <button
                            onClick={() => updateSettings({ blindMode: !state.settings.blindMode })}
                            className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${state.settings.blindMode ? 'bg-kromeAccent' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${state.settings.blindMode ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-2">Core Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Total Duration (min)</label>
                            <input
                                type="number" min="1" max="180"
                                disabled={state.session.isActive}
                                value={state.settings.blockMinutes}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    updateSettings({ blockMinutes: Math.max(1, Math.min(180, val)) });
                                }}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Brick Interval (min)</label>
                            <input
                                type="number" min="1" max="180"
                                disabled={state.session.isActive}
                                value={state.settings.intervalMinutes}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    updateSettings({ intervalMinutes: Math.max(1, Math.min(180, val)) });
                                }}
                                className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            />
                        </div>
                    </div>
                    <div className="text-xs text-center text-slate-500">
                        Calculated bricks: {Math.max(1, Math.floor(state.settings.blockMinutes / state.settings.intervalMinutes))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Daily Goal (Blocks)</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={state.settings.blocksPerDayGoal}
                            disabled={isGoalLocked}
                            onChange={(e) => updateSettings({ blocksPerDayGoal: parseInt(e.target.value) })}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="font-bold w-8 text-center">{state.settings.blocksPerDayGoal}</span>
                    </div>
                    {isGoalLocked && <p className="text-xs text-amber-500">Locked for today</p>}
                </div>

                {/* Sound & Notifications */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Volume2 size={16} className="text-slate-500" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Sound Enabled</span>
                        </div>
                        <button
                            onClick={() => updateSettings({ soundEnabled: !state.settings.soundEnabled })}
                            className={`w-10 h-6 rounded-full transition-colors relative ${state.settings.soundEnabled ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full transition-transform ${state.settings.soundEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    {state.settings.soundEnabled && (
                        <div className="space-y-2 pl-6">
                            <label className="text-xs text-slate-500">Volume</label>
                            <input
                                type="range" min="0" max="100"
                                value={state.settings.soundVolume * 100}
                                onChange={(e) => updateSettings({ soundVolume: parseInt(e.target.value) / 100 })}
                                className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Bell size={16} className="text-slate-500" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Notifications</span>
                        </div>
                        <div className="flex space-x-1">
                            <button
                                onClick={() => updateSettings({ notifyOnFill: !state.settings.notifyOnFill })}
                                className={`px-2 py-1 text-xs rounded border ${state.settings.notifyOnFill ? 'bg-slate-200 dark:bg-slate-700' : 'border-transparent text-slate-400'}`}>
                                Fill
                            </button>
                            <button
                                onClick={() => updateSettings({ notifyOnBlockEnd: !state.settings.notifyOnBlockEnd })}
                                className={`px-2 py-1 text-xs rounded border ${state.settings.notifyOnBlockEnd ? 'bg-slate-200 dark:bg-slate-700' : 'border-transparent text-slate-400'}`}>
                                End
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Zap size={16} className="text-slate-500" />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Vibrate</span>
                        </div>
                        <div className="flex space-x-1">
                            <button
                                onClick={() => updateSettings({ vibrateOnFill: !state.settings.vibrateOnFill })}
                                className={`px-2 py-1 text-xs rounded border ${state.settings.vibrateOnFill ? 'bg-slate-200 dark:bg-slate-700' : 'border-transparent text-slate-400'}`}>
                                Fill
                            </button>
                            <button
                                onClick={() => updateSettings({ vibrateOnBlockEnd: !state.settings.vibrateOnBlockEnd })}
                                className={`px-2 py-1 text-xs rounded border ${state.settings.vibrateOnBlockEnd ? 'bg-slate-200 dark:bg-slate-700' : 'border-transparent text-slate-400'}`}>
                                End
                            </button>
                        </div>
                    </div>
                </div>

                {/* Visuals & Logic */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">Reduced Motion</span>
                        <button
                            onClick={() => updateSettings({ reducedMotion: !state.settings.reducedMotion })}
                            className={`w-10 h-6 rounded-full transition-colors relative ${state.settings.reducedMotion ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full transition-transform ${state.settings.reducedMotion ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">Count Helper Blocks</span>
                        <button
                            onClick={() => updateSettings({ countHelperBlocks: !state.settings.countHelperBlocks })}
                            className={`w-10 h-6 rounded-full transition-colors relative ${state.settings.countHelperBlocks ? 'bg-slate-900 dark:bg-slate-100' : 'bg-slate-200 dark:bg-slate-700'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full transition-transform ${state.settings.countHelperBlocks ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Compact Widget</span>
                        <button
                            onClick={() => updateSettings({ compactWidget: !state.settings.compactWidget })}
                            className={`w-10 h-6 rounded-full transition-colors relative ${state.settings.compactWidget ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${state.settings.compactWidget ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Brick Color */}
                <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Brick Color</label>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                            onClick={() => updateSettings({ boxColor: 'blue' })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${state.settings.boxColor === 'blue' ? 'bg-white shadow text-blue-600' : 'text-slate-500'
                                }`}
                        >
                            Blue
                        </button>
                        <button
                            onClick={() => updateSettings({ boxColor: 'teal' })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${state.settings.boxColor === 'teal' ? 'bg-white shadow text-kromeAccent' : 'text-slate-500'
                                }`}
                        >
                            Teal
                        </button>
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Theme</label>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <button
                            onClick={() => updateSettings({ theme: 'light' })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${state.settings.theme === 'light' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                                }`}
                        >
                            Light
                        </button>
                        <button
                            onClick={() => updateSettings({ theme: 'dark' })}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${state.settings.theme === 'dark' ? 'bg-slate-700 shadow text-white' : 'text-slate-500'
                                }`}
                        >
                            Dark
                        </button>
                    </div>
                </div>

                <div className="pt-4 mt-8 flex justify-center">
                    <p className="text-xs text-center text-slate-400">
                        Krome v2.0 • Mirror Interface
                    </p>
                </div>
            </div>
        </div>
    );
}
