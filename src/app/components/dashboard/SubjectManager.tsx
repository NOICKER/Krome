import { useState } from "react";
import { Subject } from "../../types";
import { getHistory } from "../../services/storageService";
import { getTasks } from "../../services/taskService";
import { useKromeStore } from "../../hooks/useKrome";
import Folder from "lucide-react/dist/esm/icons/folder";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Edit2 from "lucide-react/dist/esm/icons/edit-2";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import X from "lucide-react/dist/esm/icons/x";
import Check from "lucide-react/dist/esm/icons/check";
import { v4 as uuidv4 } from "uuid";

const COLORS = ["emerald", "blue", "amber", "red", "purple", "slate"];

export function SubjectManager() {
    const { state, actions } = useKromeStore();
    const subjects = state.subjects as unknown as Subject[];
    const { addSubject, editSubject, deleteSubject } = actions;

    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newColor, setNewColor] = useState("emerald");
    const [error, setError] = useState("");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");

    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleAdd = () => {
        const trimmed = newName.trim();
        if (!trimmed) return;

        if (subjects.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
            setError("Subject name already exists.");
            return;
        }

        const subj: Subject = {
            id: uuidv4(),
            name: trimmed,
            color: newColor as any,
            createdAt: Date.now()
        };

        addSubject(trimmed);
        setIsAdding(false);
        setNewName("");
        setError("");
    };

    const handleSaveEdit = (id: string) => {
        const trimmed = editName.trim();
        if (!trimmed) return;

        // Check duplicates excluding self
        if (subjects.some(s => s.id !== id && s.name.toLowerCase() === trimmed.toLowerCase())) {
            setError("Subject name already exists.");
            return;
        }

        const subj = subjects.find(s => s.id === id);
        if (subj) {
            editSubject(id, trimmed, editColor);
        }

        setEditingId(null);
        setError("");
    };

    const initiateDelete = (id: string, name: string) => {
        setDeletingId(id);
    };

    const confirmDelete = (id: string) => {
        deleteSubject(id);
        setDeletingId(null);
    };

    // Calculate usage
    const getUsageStats = (id: string, name: string) => {
        const history = getHistory();
        const tasks = getTasks();
        const historyCount = history.filter(h => h.subject === name).length; // Or subjectId if migrated
        const linkedTasks = tasks.filter(t => t.subjectId === id && !t.completed).length;
        return { historyCount, linkedTasks };
    };

    return (
        <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-300 font-bold uppercase tracking-widest text-sm flex items-center">
                    <Folder size={16} className="mr-2 text-slate-500" />
                    Manage Subjects
                </h3>
                <button
                    onClick={() => { setIsAdding(true); setError(""); }}
                    className="p-1.5 text-slate-400 hover:text-kromeAccent hover:bg-kromeAccent/10 rounded-lg transition-colors"
                    title="Add Subject"
                >
                    <Plus size={18} />
                </button>
            </div>

            {error ? <p className="text-red-400 text-xs mb-4">{error}</p> : null}

            {isAdding && (
                <div className="mb-4 bg-[#080C18]/50 p-4 rounded-xl border border-slate-800 space-y-3">
                    <input
                        type="text"
                        placeholder="Subject Name"
                        value={newName}
                        onChange={(e) => { setNewName(e.target.value); setError(""); }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-kromeAccent/50"
                        autoFocus
                    />
                    <div className="flex flex-col space-y-4">
                        <div className="flex space-x-3 mt-1">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setNewColor(c)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? 'border-slate-200 scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c === 'emerald' ? '#62699D' : c === 'blue' ? '#3b82f6' : c === 'amber' ? '#f59e0b' : c === 'red' ? '#ef4444' : c === 'purple' ? '#a855f7' : '#64748b' }}
                                />
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            {(!newName.trim()) ? (
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Requires Name</span>
                            ) : (
                                <span />
                            )}
                            <div className="flex space-x-2">
                                <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 uppercase tracking-widest font-bold transition-colors">Cancel</button>
                                <button disabled={!newName.trim()} onClick={handleAdd} className="px-5 py-1.5 text-xs bg-kromeAccent hover:bg-kromeAccent/85 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold tracking-widest uppercase transition-colors">Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {subjects.map(sub => {
                    const isEditing = editingId === sub.id;
                    const isDeleting = deletingId === sub.id;
                    const stats = getUsageStats(sub.id, sub.name);

                    if (isDeleting) {
                        return (
                            <div key={sub.id} className="bg-amber-950/30 border border-amber-900/50 p-4 rounded-xl space-y-3">
                                <div className="flex items-start text-amber-500">
                                    <AlertTriangle size={16} className="mr-2 mt-0.5 shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-bold">Delete "{sub.name}"?</p>
                                        <p className="text-amber-500/70 text-xs mt-1">
                                            {stats.historyCount > 0 ? `${stats.historyCount} history items will keep this name as text. ` : null}
                                            {stats.linkedTasks > 0 ? `${stats.linkedTasks} active tasks will lose their subject link.` : null}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-3">
                                    <button onClick={() => setDeletingId(null)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
                                    <button onClick={() => confirmDelete(sub.id)} className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/30 font-bold uppercase tracking-widest">Confirm Delete</button>
                                </div>
                            </div>
                        );
                    }

                    if (isEditing) {
                        return (
                            <div key={sub.id} className="bg-[#080C18]/50 p-4 rounded-xl border border-slate-700 space-y-3">
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => { setEditName(e.target.value); setError(""); }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-kromeAccent/50"
                                    autoFocus
                                />
                                <div className="flex items-center justify-between">
                                    <div className="flex space-x-2">
                                        {COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setEditColor(c)}
                                                className={`w-5 h-5 rounded-full border-2 ${editColor === c ? 'border-slate-200' : 'border-transparent'}`}
                                                style={{ backgroundColor: c === 'emerald' ? '#62699D' : c === 'blue' ? '#3b82f6' : c === 'amber' ? '#f59e0b' : c === 'red' ? '#ef4444' : c === 'purple' ? '#a855f7' : '#64748b' }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex space-x-2">
                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg"><X size={16} /></button>
                                        <button onClick={() => handleSaveEdit(sub.id)} className="p-1.5 bg-kromeAccent/20 text-kromeAccent hover:bg-kromeAccent/30 rounded-lg"><Check size={16} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-800/50 border border-transparent hover:border-slate-800 transition-colors group">
                            <div className="flex items-center space-x-3">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color === 'blue' ? '#3b82f6' : sub.color === 'amber' ? '#f59e0b' : sub.color === 'red' ? '#ef4444' : sub.color === 'purple' ? '#a855f7' : sub.color === 'slate' ? '#64748b' : '#62699D' }} />
                                <span className="text-sm font-medium text-slate-300">{sub.name}</span>
                            </div>
                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => { setEditingId(sub.id); setEditName(sub.name); setEditColor(sub.color || 'emerald'); setError(""); }}
                                    className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg transition-colors"
                                >
                                    <Edit2 size={14} />
                                </button>
                                <button
                                    onClick={() => initiateDelete(sub.id, sub.name)}
                                    // Use tooltip internally or globally
                                    title={stats.historyCount > 0 ? "Subject has linked history" : "Delete Subject"}
                                    className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {subjects.length === 0 && (
                    <p className="text-xs text-slate-500 italic p-2 text-center">Create your first subject to begin tracking.</p>
                )}
            </div>
        </div>
    );
}
