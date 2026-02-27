import { motion } from "motion/react";
import Play from "lucide-react/dist/esm/icons/play";
import Pause from "lucide-react/dist/esm/icons/pause";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { KromeSession, KromeSubject, KromeSettings, Task } from "../types";
import { cn } from "./ui/utils";
import { useEffect, useState } from "react";
import { getTasks } from "../services/taskService";

interface SessionControlsProps {
  session: KromeSession;
  settings: KromeSettings;
  subjects: KromeSubject[];
  onStart: () => void;
  onAbandon: () => void;
  onUndoAbandon: () => void;
  onUpdateSubject: (val: string) => void;
  onUpdateIntent: (val: string) => void;
  onUpdateTaskId: (val: string | undefined) => void;
  onAddSubject: (val: string) => void;
}

export function SessionControls({
  session,
  settings,
  subjects,
  onStart,
  onAbandon,
  onUndoAbandon,
  onUpdateSubject,
  onUpdateIntent,
  onUpdateTaskId,
  onAddSubject,
}: SessionControlsProps) {

  const [activeTasks, setActiveTasks] = useState<Task[]>([]);

  useEffect(() => {
    setActiveTasks(getTasks().filter(t => !t.completed));
  }, []);

  // Handle Space key for start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !session.isActive && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session.isActive, onStart]);

  const isAbandoned = session.status === 'abandoned';

  if (session.isActive) {
    if (isAbandoned) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-lg text-sm font-medium animate-pulse">
            Session Abandoned - Undo available for 3s
          </div>
          <Button variant="secondary" onClick={onUndoAbandon} className="space-x-2">
            <RotateCcw size={16} />
            <span>Undo Abandon</span>
          </Button>
        </motion.div>
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onAbandon}
          className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <XCircle size={16} className="mr-2" />
          Cancel Session
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full space-y-6"
    >
      {settings.wrapperEnabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">

            <div className="space-y-1.5">
              <label className="text-slate-500 text-xs uppercase tracking-wide px-1">Subject</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map(sub => {
                  const isSelected = session.subject === sub.name;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => onUpdateSubject(sub.name)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border",
                        isSelected
                          ? "bg-slate-800 text-kromeAccent border-kromeAccent shadow-[0_0_10px_rgba(111,120,181,0.18)] translate-y-[-1px]"
                          : "bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200"
                      )}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 text-xs uppercase tracking-wide px-1">Task</label>
              <div className="relative">
                <select
                  value={session.taskId || "none"}
                  onChange={(e) => onUpdateTaskId(e.target.value === "none" ? undefined : e.target.value)}
                  disabled={activeTasks.length === 0}
                  className="w-full h-12 bg-slate-900/30 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 appearance-none focus:outline-none focus:ring-1 focus:ring-kromeAccent/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="none" disabled={activeTasks.length === 0}>
                    {activeTasks.length === 0 ? "No active tasks" : "Attach Task (Optional)"}
                  </option>
                  {activeTasks.map(task => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-500 text-xs uppercase tracking-wide px-1">Intent</label>
              <Input
                placeholder="Optional"
                value={session.intent}
                onChange={(e) => onUpdateIntent(e.target.value)}
                maxLength={140}
                className="h-12 border-slate-800"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center space-y-4 pt-6">
        <Button
          variant="default"
          size="lg"
          onClick={onStart}
          className="w-full h-12 text-sm font-bold tracking-widest uppercase rounded-2xl bg-kromeAccent hover:bg-kromeAccent/85 text-white shadow-[0_0_18px_rgba(111,120,181,0.25)] hover:translate-y-[-1px] active:scale-98 transition-all duration-200"
        >
          <Play fill="currentColor" size={18} className="mr-3" />
          Start Block ({settings.blockMinutes}m)
        </Button>

        <p className="text-xs text-slate-600 font-mono tracking-widest uppercase animate-pulse">
          Press Space to Start
        </p>
      </div>
    </motion.div>
  );
}
