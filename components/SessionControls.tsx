import React, { useState, useEffect } from 'react';
import { Play, LogOut, Plus } from 'lucide-react';
import { getSubjects, saveSubjects } from '../utils/storage';
import { Subject } from '../types';

interface SessionControlsProps {
    isActive: boolean;
    blockMinutes: number;
    sessionType?: 'standard' | 'temporary' | 'claimed';
    sessionStatus?: 'running' | 'abandoned';
    wrapperEnabled: boolean;
    defaultSubject: string | null;
    onStart: (subject?: string | null, intent?: string | null) => void;
    onAbandon: () => void;
}

export function SessionControls({
    isActive,
    blockMinutes,
    sessionType,
    sessionStatus,
    wrapperEnabled,
    defaultSubject,
    onStart,
    onAbandon
}: SessionControlsProps) {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>(defaultSubject || 'general');
    const [intent, setIntent] = useState<string>('');
    const [isAddingSubject, setIsAddingSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState('');

    useEffect(() => {
        setSubjects(getSubjects());
    }, []);

    const handleAddSubject = () => {
        if (newSubjectName.trim()) {
            const newSub: Subject = { id: newSubjectName.trim().toLowerCase().replace(/\s+/g, '-'), name: newSubjectName.trim(), createdAt: Date.now() };
            const updated = [...subjects, newSub];
            saveSubjects(updated);
            setSubjects(updated);
            setSelectedSubject(newSub.id);
            setIsAddingSubject(false);
            setNewSubjectName('');
        }
    };

    if (isActive) {
        return (
            <div className="w-full max-w-xs space-y-4">
                <div className="text-center text-xs text-slate-400 uppercase tracking-widest animate-pulse">
                    {sessionType === 'temporary' ? 'Quick Fix In Progress' : 'Block in Progress'}
                </div>
                <button
                    onClick={onAbandon}
                    disabled={sessionStatus === 'abandoned'}
                    className="w-full h-12 border-2 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                    <LogOut size={18} />
                    <span>Abandon Session</span>
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xs space-y-4">
            {wrapperEnabled && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mb-6">
                    {!isAddingSubject ? (
                        <div className="relative w-full sm:w-1/3">
                            <select
                                value={selectedSubject}
                                onChange={(e) => {
                                    if (e.target.value === '_add_new_') setIsAddingSubject(true);
                                    else setSelectedSubject(e.target.value);
                                }}
                                className="w-full bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-kromeAccent text-slate-500 text-sm py-1 outline-none text-center sm:text-left cursor-pointer transition-colors appearance-none font-semibold uppercase tracking-widest"
                            >
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                <option value="_add_new_" className="font-semibold text-kromeAccent">+ Add new subject</option>
                            </select>
                        </div>
                    ) : (
                        <div className="flex gap-2 w-full sm:w-1/3">
                            <input
                                type="text"
                                autoFocus
                                placeholder="new subject"
                                value={newSubjectName}
                                onChange={e => setNewSubjectName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAddSubject(); if (e.key === 'Escape') setIsAddingSubject(false); }}
                                className="w-full bg-transparent border-b border-kromeAccent text-slate-700 dark:text-slate-300 text-sm py-1 outline-none text-center font-semibold uppercase tracking-widest"
                            />
                        </div>
                    )}

                    <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">•</span>

                    <div className="w-full sm:w-2/3">
                        <input
                            type="text"
                            placeholder="Intent (Optional)"
                            maxLength={140}
                            value={intent}
                            onChange={e => setIntent(e.target.value)}
                            className="w-full bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-kromeAccent text-slate-600 dark:text-slate-300 text-sm py-1 outline-none text-center sm:text-left transition-colors placeholder:text-slate-400 placeholder:italic"
                        />
                    </div>
                </div>
            )}

            <button
                onClick={() => onStart(wrapperEnabled ? selectedSubject : null, wrapperEnabled ? intent : null)}
                className="w-full py-4 text-base font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
                <Play size={18} fill="currentColor" />
                <span>Start Block ({blockMinutes}m) - do it anyway</span>
            </button>
        </div>
    );
}
