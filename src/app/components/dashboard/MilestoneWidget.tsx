import React, { useState, useEffect } from "react";
import { Flag, Trash2, Edit2, Plus, X, Check } from "lucide-react";
import { Milestone } from "../../types";
import { getMilestones, saveMilestone, updateMilestone, deleteMilestone } from "../../services/milestoneService";
import { getDaysRemaining } from "../../services/analyticsService";
import { v4 as uuidv4 } from "uuid";
import { format, formatISO, parseISO, startOfDay } from "date-fns";

export function MilestoneWidget() {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [dateStr, setDateStr] = useState("");

    const todayStr = format(new Date(), "yyyy-MM-dd");

    useEffect(() => {
        setMilestones(getMilestones());
    }, []);

    const activeMilestone = milestones.length > 0
        ? [...milestones].sort((a, b) => a.targetDate - b.targetDate).find(m => getDaysRemaining(m.targetDate) >= 0) || milestones[0]
        : null;

    const handleSave = () => {
        if (!title.trim() || !dateStr) return;

        // Parse local date
        const targetDate = startOfDay(parseISO(dateStr)).getTime();

        if (editingId) {
            const existing = milestones.find(m => m.id === editingId);
            if (existing) {
                updateMilestone({ ...existing, title: title.trim(), targetDate });
            }
        } else {
            saveMilestone({
                id: uuidv4(),
                title: title.trim(),
                targetDate,
                createdAt: Date.now()
            });
        }

        setMilestones(getMilestones());
        resetForm();
    };

    const handleDelete = (id: string) => {
        deleteMilestone(id);
        setMilestones(getMilestones());
        if (editingId === id) resetForm();
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setTitle("");
        setDateStr("");
    };

    const openEdit = (m: Milestone) => {
        setEditingId(m.id);
        setTitle(m.title);
        setDateStr(format(new Date(m.targetDate), "yyyy-MM-dd"));
        setIsAdding(true);
    };

    if (isAdding) {
        return (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-slate-300 font-bold uppercase tracking-widest text-sm">
                        {editingId ? "Edit Milestone" : "New Milestone"}
                    </h3>
                    <button onClick={resetForm} className="text-slate-500 hover:text-slate-300">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest block mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-[#080C18] border border-slate-800 px-3 py-2 text-sm rounded-lg text-slate-200 focus:outline-none focus:border-kromeAccent/50"
                            placeholder="E.g. Final Exams"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase text-slate-500 font-bold tracking-widest block mb-1">Target Date</label>
                        <input
                            type="date"
                            min={todayStr}
                            value={dateStr}
                            onChange={(e) => setDateStr(e.target.value)}
                            className="w-full bg-[#080C18] border border-slate-800 px-3 py-2 text-sm rounded-lg text-slate-200 focus:outline-none focus:border-kromeAccent/50"
                        />
                    </div>

                    <div>
                        <button
                            onClick={handleSave}
                            disabled={!title.trim() || !dateStr}
                            className="w-full h-12 bg-kromeAccent hover:bg-kromeAccent/85 text-white font-medium rounded-2xl flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Check size={18} />
                            <span>Save Milestone</span>
                        </button>
                        {(!title.trim() || !dateStr) && (
                            <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest mt-2 font-bold">Requires Title and Target Date</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full flex flex-col items-center justify-center relative min-h-[160px] group">
            {!activeMilestone ? (
                <div className="flex flex-col items-center text-center space-y-3">
                    <Flag size={24} className="text-slate-600 mb-1" />
                    <p className="text-slate-500 text-sm">Set a target date to anchor your progress.</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="text-xs font-bold uppercase tracking-widest text-kromeAccent hover:text-kromeAccent border border-kromeAccent/30 hover:border-kromeAccent/50 bg-kromeAccent/10 px-4 py-2 rounded-lg transition-all"
                    >
                        Add Milestone
                    </button>
                </div>
            ) : (
                <div className="w-full flex justify-between items-center group">
                    <div className="flex flex-col">
                        <h3 className="text-slate-300 font-bold uppercase tracking-widest text-sm flex items-center mb-1">
                            <Flag size={14} className="mr-2 text-kromeAccent" />
                            {activeMilestone.title}
                        </h3>
                        <p className="text-slate-500 text-xs">Target: {format(new Date(activeMilestone.targetDate), "MMM do, yyyy")}</p>
                    </div>

                    <div className="flex items-center space-x-6">
                        <div className="flex flex-col items-end">
                            {getDaysRemaining(activeMilestone.targetDate) < 0 ? (
                                <span className="text-kromeAccent font-bold uppercase tracking-widest text-sm">Milestone Reached</span>
                            ) : (
                                <>
                                    <span className="text-3xl font-mono text-slate-200 leading-none">
                                        {getDaysRemaining(activeMilestone.targetDate)}
                                    </span>
                                    <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest mt-1">Days Left</span>
                                </>
                            )}
                        </div>

                        {/* Controls revealed on hover */}
                        <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity pl-4 border-l border-slate-800">
                            <button onClick={() => openEdit(activeMilestone)} className="text-slate-500 hover:text-slate-300">
                                <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(activeMilestone.id)} className="text-slate-500 hover:text-red-400">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
