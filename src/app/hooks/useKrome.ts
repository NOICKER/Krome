import { useState, useEffect, useCallback, useRef } from 'react';
import { playEndSound, playFillSound } from '../utils/sound';
import { getTasks, updateTask } from '../services/taskService';
import { STORAGE_KEYS, getItem, setItem } from '../services/storageService';
import { getSubjects } from '../services/subjectService';
import { createNewSession, evaluateBlockCompletion } from '../core/sessionEngine';
import { validateStreak, incrementStreak } from '../core/streakEngine';
import { evaluatePotResult } from '../core/potEngine';
import { v4 as uuidv4 } from 'uuid';
import {
  KromeSession,
  KromeSettings,
  KromeDay,
  HistoryEntry,
  KromeStreak,
  KromeSubject,
  ViewState
} from '../types';
import { format, isSameDay, subDays, parseISO } from 'date-fns';


const DEFAULT_SETTINGS: KromeSettings = {
  blockMinutes: 25,
  intervalMinutes: 5,
  soundEnabled: true,
  wrapperEnabled: true,
  goal: 4,
  strictMode: false,
  blindMode: false,
  reducedMotion: false,
  autoSuggestBreaks: false,
  progressiveEscalation: false,
  countHelperBlocks: false,
  notifications: true,
  densityMode: 'comfortable',
  volume: 0.5,
};

const DEFAULT_SESSION: KromeSession = {
  isActive: false,
  startTime: null,
  totalDurationMinutes: 25,
  intervalMinutes: 5,
  totalBlocks: 5,
  type: 'standard',
  status: 'idle',
  subject: '',
  intent: '',
  abandonReason: undefined,
  abandonNote: undefined,
  subjectId: undefined,
  taskId: undefined,
  potResult: null,
};

const getTodayDate = () => format(new Date(), 'yyyy-MM-dd');

import { toast } from "sonner";

interface KromeStoreStructure {
  state: {
    view: ViewState;
    settings: KromeSettings;
    day: KromeDay;
    session: KromeSession;
    streak: KromeStreak;
    history: HistoryEntry[];
    subjects: KromeSubject[];
    elapsed: number;
  };
  actions: {
    setView: (view: ViewState) => void;
    setSettings: (settings: KromeSettings) => void;
    startSession: () => void;
    requestAbandon: (reason?: string, note?: string) => void;
    undoAbandon: () => void;
    updateSubject: (val: string) => void;
    updateIntent: (val: string) => void;
    updateTaskId: (val: string | undefined) => void;
    addSubject: (name: string) => string;
    editSubject: (id: string, name: string, color: string) => void;
    deleteSubject: (id: string) => void;
    refreshSubjects: () => void;
    exportHistory: () => void;
  };
}

import React, { createContext, useContext } from 'react';

const KromeContext = createContext<KromeStoreStructure | null>(null);

export function useKromeStore() {
  const ctx = useContext(KromeContext);
  if (!ctx) throw new Error("useKromeStore must be used within KromeProvider");
  return ctx;
}

export function useKromeLogic() {
  // --- State ---
  const [view, setView] = useState<ViewState>(() => {
    const session = getItem<KromeSession | null>(STORAGE_KEYS.SESSION, null);
    if (session && session.isActive) return 'focus';
    return 'dashboard';
  });

  const [settings, setSettings] = useState<KromeSettings>(() => {
    return getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  });

  const [day, setDay] = useState<KromeDay>(() => {
    const stored = getItem<KromeDay | null>(STORAGE_KEYS.DAY, null);
    const today = getTodayDate();
    if (stored && stored.date === today) return stored;
    return {
      date: today,
      blocksCompleted: 0,
      goal: 4,
      isDaySecured: false,
      locked: false,
      potValue: 0,
      potSpilled: false,
    };
  });

  const [session, setSession] = useState<KromeSession>(() => {
    return getItem(STORAGE_KEYS.SESSION, DEFAULT_SESSION);
  });

  const [streak, setStreak] = useState<KromeStreak>(() => {
    return validateStreak(getItem(STORAGE_KEYS.STREAK, { current: 0, lastCompletedDate: null }), getTodayDate());
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    return getItem(STORAGE_KEYS.HISTORY, []);
  });

  const [subjects, setSubjects] = useState<KromeSubject[]>(() => {
    return getItem(STORAGE_KEYS.SUBJECTS, [{ id: 'default', name: 'General' }]);
  });

  const [elapsed, setElapsed] = useState(0);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Persistence Effects ---
  useEffect(() => setItem(STORAGE_KEYS.SETTINGS, settings), [settings]);
  useEffect(() => setItem(STORAGE_KEYS.DAY, day), [day]);
  useEffect(() => setItem(STORAGE_KEYS.SESSION, session), [session]);
  useEffect(() => setItem(STORAGE_KEYS.STREAK, streak), [streak]);
  useEffect(() => setItem(STORAGE_KEYS.HISTORY, history), [history]);
  useEffect(() => setItem(STORAGE_KEYS.SUBJECTS, subjects), [subjects]);

  // --- Day Reset Logic ---
  useEffect(() => {
    const today = getTodayDate();
    if (day.date !== today) {
      setDay({
        date: today,
        blocksCompleted: 0,
        goal: settings.goal,
        isDaySecured: false,
        locked: false,
        potValue: 0,
        potSpilled: false,
      });

      // Streak Reset Logic
      setStreak(s => validateStreak(s, today));
    }
  }, [day.date, settings.goal]);


  // --- Timer Loop ---
  useEffect(() => {
    if (!session.isActive || session.startTime === null) {
      setElapsed(0);
      return;
    }

    let lastFilled = Math.floor((Date.now() - session.startTime) / (session.intervalMinutes * 60 * 1000));

    const tick = () => {
      const now = Date.now();
      const newElapsed = now - session.startTime!;

      const newFilled = Math.floor(newElapsed / (session.intervalMinutes * 60 * 1000));
      if (newFilled > lastFilled && newFilled < session.totalBlocks) {
        if (settings.soundEnabled) playFillSound(settings.volume ?? 0.5);
        lastFilled = newFilled;
      }

      setElapsed(newElapsed);

      // Check for completion
      if (evaluateBlockCompletion(session, newElapsed, now)) {
        handleSessionComplete();
      }
    };

    const interval = setInterval(tick, 200); // 5fps update for UI is enough, logic is robust
    tick(); // Immediate tick

    return () => clearInterval(interval);
  }, [session.isActive, session.startTime, session.totalDurationMinutes, session.claimedEndTime]);


  // --- Actions ---

  const startSession = () => {
    if (session.isActive) return;

    setSession(createNewSession(settings));

    // Lock day on first start
    if (!day.locked) {
      setDay(prev => ({ ...prev, locked: true }));
    }
  };

  const requestAbandon = (reason?: string, note?: string) => {
    setSession(prev => ({
      ...prev,
      status: 'abandoned',
      abandonReason: reason,
      abandonNote: note
    }));

    // Start 3s undo timer
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      commitAbandon();
    }, 3000);
  };

  const undoAbandon = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setSession(prev => ({ ...prev, status: 'running' }));
  };

  const commitAbandon = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    handleSessionEnd(false);
  };

  const handleSessionComplete = () => {
    // Only count if standard or helper enabled
    const shouldCount = session.type === 'standard' || (session.type === 'helper' && settings.countHelperBlocks);

    let newBlocksCompleted = day.blocksCompleted;
    let newIsDaySecured = day.isDaySecured;

    if (shouldCount) {
      newBlocksCompleted += 1;
      if (newBlocksCompleted >= day.goal) {
        newIsDaySecured = true;
      }

      setDay(prev => ({
        ...prev,
        blocksCompleted: newBlocksCompleted,
        isDaySecured: newIsDaySecured
      }));

      // Streak update
      if (newIsDaySecured && !day.isDaySecured) {
        setStreak(prev => incrementStreak(prev, getTodayDate()));
      }
    }

    handleSessionEnd(true);
  };

  const handleSessionEnd = (completed: boolean) => {
    // Phase 1/2: Determine potResult
    const potResult = evaluatePotResult(settings.strictMode !== undefined ? settings.strictMode : false, day.potSpilled !== undefined ? day.potSpilled : false);

    // Phase 1: Task Progress Hook (Infrastructure Only)
    if (completed && session.taskId) {
      const tasks = getTasks();
      const taskIndex = tasks.findIndex(t => t.id === session.taskId);
      if (taskIndex !== -1) {
        let task = tasks[taskIndex];
        if (!task.completed) {
          task.completedBlocks = (task.completedBlocks || 0) + 1;
          if (task.estimatedBlocks && task.completedBlocks >= task.estimatedBlocks) {
            task.completed = true;
            toast("Task auto-completed (target reached).", {
              duration: 4000,
              className: "bg-slate-900 border-slate-800 text-slate-400 text-xs text-center"
            });
          }
          updateTask(task);
        }
      }
    }

    // Save to history
    const entry: HistoryEntry = {
      id: uuidv4(),
      dateISO: getTodayDate(),
      startedAt: session.startTime || Date.now(),
      durationMs: Date.now() - (session.startTime || Date.now()),
      subject: session.subject,
      intent: session.intent,
      sessionType: session.type,
      completed,
      potSpilled: day.potSpilled,
      subjectId: session.subjectId,
      taskId: session.taskId,
      potResult,
    };

    setHistory(prev => {
      const newHistory = [entry, ...prev];
      if (newHistory.length > 500) newHistory.pop(); // Cap at 500
      return newHistory;
    });

    // Save friction log if abandoned
    if (!completed && session.abandonReason) {
      const frictionEntry = {
        id: uuidv4(),
        date: new Date().toISOString(),
        reason: session.abandonReason,
        note: session.abandonNote || '',
        bricksLost: `${Math.floor((Date.now() - (session.startTime || Date.now())) / (session.intervalMinutes * 60 * 1000))} / ${session.totalBlocks}`
      };
      // We don't have a friction log state array in this new useKrome yet, let's just log it or add it to local storage.
      // For now, Krome v2 stores it in a generic frictionlog key if needed, but history handles most of it.
    }

    // Deterministic Pot Update (Only for strict mode & standard blocks)
    if (settings.strictMode && session.type === 'standard') {
      const delta = completed ? 10 : -20;
      setDay(prev => ({
        ...prev,
        potValue: Math.max(0, (prev.potValue || 0) + delta)
      }));
    }

    // Reset session
    setSession({
      ...DEFAULT_SESSION,
      totalDurationMinutes: settings.blockMinutes, // Persist settings
      intervalMinutes: settings.intervalMinutes,
      status: 'idle', // or completed if we want a modal state? Spec says "Show CompleteModal" then reset.
      // We'll reset to idle but maybe trigger a toast/modal via state in UI
    });

    // Trigger sound/vibrate if enabled
    if (completed) {
      if (settings.soundEnabled) playEndSound(settings.volume ?? 0.5, 1000, 1);
      if (settings.notifications && "Notification" in window && Notification.permission === "granted") {
        new Notification("Block Complete", {
          body: "Focus session recorded.",
          icon: "/favicon.ico"
        });
      }

      toast.success("Block Complete", {
        description: "Focus session recorded.",
        duration: 5000,
        position: "top-center",
        className: "bg-emerald-900 border-emerald-800 text-emerald-100",
      });
    } else {
      toast("Session Abandoned", {
        description: "Logged to history.",
        position: "top-center",
        className: "bg-slate-900 border-slate-800 text-slate-400",
      });
    }
  };

  const updateSubject = (val: string) => setSession(prev => ({ ...prev, subject: val }));
  const updateIntent = (val: string) => setSession(prev => ({ ...prev, intent: val }));
  const updateTaskId = (val: string | undefined) => setSession(prev => ({ ...prev, taskId: val }));

  const addSubject = (name: string) => {
    const newSub = { id: uuidv4(), name };
    setSubjects(prev => [...prev, newSub]);
    return newSub.id;
  };

  // Reads the latest subjects from storage and syncs React state.
  // Call this after any direct storage mutation (e.g. SubjectManager add/edit/delete).
  const refreshSubjects = () => {
    setSubjects(getSubjects() as any);
  };

  const editSubject = (id: string, name: string, color: string) => {
    setSubjects(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, name, color } : s);
      setItem(STORAGE_KEYS.SUBJECTS, updated);
      return updated;
    });
  };

  const deleteSubject = (id: string) => {
    setSubjects(prev => {
      const filtered = prev.filter(s => s.id !== id);
      setItem(STORAGE_KEYS.SUBJECTS, filtered);
      return filtered;
    });
  };

  return {
    state: {
      view,
      settings,
      day,
      session,
      streak,
      history,
      subjects,
      elapsed,
    },
    actions: {
      setView,
      setSettings,
      startSession,
      requestAbandon,
      undoAbandon,
      updateSubject,
      updateIntent,
      updateTaskId,
      addSubject,
      refreshSubjects,
      editSubject,
      deleteSubject,
      exportHistory: () => console.log('Exporting...', history),
    }
  };
}

export function KromeProvider({ children }: { children: React.ReactNode }) {
  const store = useKromeLogic();
  return React.createElement(KromeContext.Provider, { value: store }, children);
}
