import React, { useState, useEffect } from "react";
import Plus from "lucide-react/dist/esm/icons/plus";
import Check from "lucide-react/dist/esm/icons/check";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Hash from "lucide-react/dist/esm/icons/hash";
import { useMemo } from "react";
import { Task, Subject } from "../../types";
import { getTasks, saveTask, updateTask } from "../../services/taskService";
import { getSubjects } from "../../services/subjectService";
import { v4 as uuidv4 } from "uuid";
import { cn } from "../ui/utils";

export function TaskPanel() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [showCompleted, setShowCompleted] = useState(false);

    // New task inputs
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [newTaskSubjectId, setNewTaskSubjectId] = useState<string>("none");
    const [newTaskEstimates, setNewTaskEstimates] = useState("");

    useEffect(() => {
        setTasks(getTasks());
        setSubjects(getSubjects());
    }, []);

    const activeTasks = tasks.filter((t) => !t.completed);
    const completedTasks = tasks.filter((t) => t.completed);

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim()) return;

        const est = parseInt(newTaskEstimates);

        const newTask: Task = {
            id: uuidv4(),
            title: newTaskTitle.trim(),
            subjectId: newTaskSubjectId === "none" ? undefined : newTaskSubjectId,
            estimatedBlocks: isNaN(est) || est <= 0 ? undefined : est,
            completedBlocks: 0,
            completed: false,
            createdAt: Date.now(),
        };

        saveTask(newTask);
        setTasks(getTasks());

        // Reset form
        setNewTaskTitle("");
        setNewTaskEstimates("");
    };

    const toggleTaskCompletion = (task: Task) => {
        updateTask({ ...task, completed: !task.completed });
        setTasks(getTasks());
    };

    const deleteTask = (taskId: string) => {
        // We update tasks locally and rewrite to storage - need a delete operation
        // taskService.ts doesn't have deleteTask expose. Since it's quick:
        const updated = tasks.filter((t) => t.id !== taskId);
        localStorage.setItem('krome_tasks', JSON.stringify(updated)); // Fallback, we'll implement later or just use this
        setTasks(updated);
    };

    // Build a Map for O(1) lookups during render
    const subjectMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const s of subjects) {
            map.set(s.id, s.name);
        }
        return map;
    }, [subjects]);

    const getSubjectName = (subjectId?: string) => {
        if (!subjectId) return null;
        return subjectMap.get(subjectId) || "Unknown Subject";
    };

    return (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl w-full flex flex-col shadow-lg shadow-black/30">
            <h3 className="text-slate-300 font-bold uppercase tracking-widest text-sm mb-4">Tasks</h3>

            {/* Internal Form */}
            <form onSubmit={handleAddTask} className="flex flex-col space-y-2 mb-6">
                <input
                    type="text"
                    placeholder="New task..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="bg-[#080C18] border border-slate-800 flex-1 px-3 py-2 text-sm rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-kromeAccent/50"
                />
                <div className="flex space-x-2">
                    <select
                        value={newTaskSubjectId}
                        onChange={(e) => setNewTaskSubjectId(e.target.value)}
                        className="flex-1 bg-[#080C18] border border-slate-800 px-3 py-1.5 text-xs rounded-lg text-slate-400 focus:outline-none focus:border-kromeAccent/50"
                    >
                        <option value="none">No Subject</option>
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="Est. blocks"
                        value={newTaskEstimates}
                        onChange={(e) => setNewTaskEstimates(e.target.value)}
                        className="w-24 bg-[#080C18] border border-slate-800 px-3 py-1.5 text-xs rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-kromeAccent/50"
                        min="1"
                    />
                    <button
                        type="submit"
                        disabled={!newTaskTitle.trim()}
                        className="bg-kromeAccent/20 text-kromeAccent p-1.5 rounded-lg border border-kromeAccent/30 hover:bg-kromeAccent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </div>
            </form>

            {/* Active Tasks list */}
            <div className="flex flex-col space-y-2">
                {activeTasks.length === 0 ? (
                    <p className="text-slate-500 text-xs italic">No tasks yet. Attach blocks to measurable work.</p>
                ) : (
                    activeTasks.map(task => {
                        const subjectName = getSubjectName(task.subjectId);
                        const progressRatio = task.estimatedBlocks
                            ? Math.min(task.completedBlocks / task.estimatedBlocks, 1)
                            : 0;

                        return (
                            <div key={task.id} className="group flex flex-col bg-[#080C18]/50 border border-slate-800/50 rounded-lg p-3 hover:border-slate-700 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-3">
                                        <button
                                            onClick={() => toggleTaskCompletion(task)}
                                            className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-slate-600 flex items-center justify-center hover:border-kromeAccent/50 hover:bg-kromeAccent/10 transition-colors"
                                        >
                                            {/* tick appears on hover, handled by CSS in parent */}
                                            <Check size={10} strokeWidth={3} className="text-kromeAccent opacity-0 hover:opacity-100" />
                                        </button>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-slate-200 leading-tight">{task.title}</span>
                                            <div className="flex items-center space-x-2 mt-1">
                                                {subjectName && (
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">{subjectName}</span>
                                                )}
                                                <span className="text-[10px] font-mono text-slate-600 flex items-center">
                                                    <Hash size={10} className="mr-0.5 flex-shrink-0" />
                                                    {task.completedBlocks} {task.estimatedBlocks ? `/ ${task.estimatedBlocks}` : 'blocks'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteTask(task.id)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {/* Subtle Progress Bar */}
                                {task.estimatedBlocks && task.estimatedBlocks > 0 && (
                                    <div className="w-full h-1 bg-slate-900 rounded-full mt-3 overflow-hidden">
                                        <div
                                            className="h-full bg-slate-600"
                                            style={{ width: `${progressRatio * 100}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Collapsible Completed Section */}
            {completedTasks.length > 0 && (
                <div className="mt-6 border-t border-slate-800/50 pt-4">
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-400 transition-colors w-full"
                    >
                        {showCompleted ? <ChevronDown size={14} className="mr-1" /> : <ChevronRight size={14} className="mr-1" />}
                        Completed ({completedTasks.length})
                    </button>

                    {showCompleted && (
                        <div className="flex flex-col space-y-2 mt-3">
                            {completedTasks.slice(0, 10).map(task => (
                                <div key={task.id} className="flex items-center justify-between bg-[#080C18]/30 rounded-lg p-2 border border-slate-800/30">
                                    <div className="flex items-center space-x-3 opacity-50">
                                        <button
                                            onClick={() => toggleTaskCompletion(task)}
                                            className="w-4 h-4 rounded border border-kromeAccent/50 bg-kromeAccent/20 flex items-center justify-center text-kromeAccent"
                                        >
                                            <Check size={10} strokeWidth={3} />
                                        </button>
                                        <span className="text-xs line-through text-slate-400">{task.title}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-slate-600">{task.completedBlocks} blk</span>
                                </div>
                            ))}
                            {completedTasks.length > 10 && (
                                <p className="text-[10px] text-center text-slate-600 italic">Showing 10 most recent</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
