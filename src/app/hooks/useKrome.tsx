import React, { createContext, startTransition, useContext, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { toast } from "sonner";
import { playEndSound, scheduleSessionPlips, warmUpAudio } from "../utils/sound";
import { assignSubjectColor } from "../utils/subjectUtils";
import { migrateHistoryEntry } from "../utils/migrationUtils";
import { getTasks, updateTask } from "../services/taskService";
import {
  STORAGE_KEYS,
  getHistory,
  getItem,
  initializeStorage,
  setItem,
  subscribeToKey,
  type StorageInitializationStep,
} from "../services/storageService";
import { getSubjects, normalizeSubjectSettings, resolveSettings } from "../services/subjectService";
import { renderInsightText } from "../services/aiService";
import { generateInsightFlashcards, type DeterministicInsightCard } from "../services/insightService";
import { emitNotification, evaluateNotifications } from "../services/notificationService";
import { saveObservation } from "../services/observationService";
import { getCurrentWeekPlan, saveWeeklyPlan as persistWeeklyPlan } from "../services/planningService";
import { recordDiagnosticsEvent } from "../services/diagnosticsService";
import { getCurrentWeekDailyCounts, getCurrentWeekProgress } from "../utils/dateUtils";
import { getGoalMetricValue, normalizeGoalProgress, withGoalCurrent } from "../utils/goalUtils";
import { getTimeOfDay } from "../utils/timeUtils";
import { createVisualGapMonitor } from "../utils/visualGapMonitor";
import {
  computeFuturePlipOffsetsSec,
  createNewSession,
  evaluateBlockCompletion,
  getTotalBlocks,
} from "../core/sessionEngine";
import { validateStreak, incrementStreak } from "../core/streakEngine";
import { evaluatePotResult } from "../core/potEngine";
import {
  GoalProgress,
  HistoryEntry,
  InsightFlashcard,
  InterruptEntry,
  KromeDay,
  KromeSession,
  KromeSettings,
  KromeStreak,
  KromeSubject,
  KromeWeek,
  NotificationEntry,
  SessionSummary,
  ViewState,
  WeeklyPlan,
} from "../types";

const DEFAULT_DAILY_GOAL_PROGRESS: GoalProgress = {
  type: "blocks",
  target: 4,
  current: 0,
};

const DEFAULT_WEEKLY_GOAL_PROGRESS: GoalProgress = {
  type: "blocks",
  target: 20,
  current: 0,
};

const DEFAULT_SETTINGS: KromeSettings = {
  sessionMinutes: 25,
  plipMinutes: 5,
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
  diagnosticsMode: false,
  densityMode: "comfortable",
  volume: 0.5,
  weeklyGoal: 20,
  dailyGoalProgress: DEFAULT_DAILY_GOAL_PROGRESS,
  weeklyGoalProgress: DEFAULT_WEEKLY_GOAL_PROGRESS,
};

const DEFAULT_SESSION: KromeSession = {
  isActive: false,
  startTime: null,
  sessionMinutes: 25,
  plipMinutes: 5,
  soundEnabled: true,
  volume: 0.5,
  totalBlocks: 5,
  type: "standard",
  status: "idle",
  subject: "",
  intent: "",
  abandonReason: undefined,
  abandonNote: undefined,
  subjectId: undefined,
  taskId: undefined,
  potResult: null,
  subjectLocked: false,
  interrupts: [],
  activeInterruptStartTime: undefined,
  activeInterruptReason: undefined,
  activeInterruptType: undefined,
  activeInterruptNotes: undefined,
  interruptCount: 0,
  isInterrupted: false,
  interruptDuration: 0,
};

const getTodayDate = () => format(new Date(), "yyyy-MM-dd");

type LegacyStoredSettings = Partial<KromeSettings> & {
  muteFillSound?: boolean;
  soundVolume?: number;
};

function normalizeStoredVolume(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeSession(session: Partial<KromeSession> | null): KromeSession {
  return {
    ...DEFAULT_SESSION,
    ...session,
    interrupts: session?.interrupts ?? [],
    interruptCount: session?.interruptCount ?? session?.interrupts?.length ?? 0,
    subjectLocked: session?.subjectLocked ?? false,
    isInterrupted: session?.isInterrupted ?? false,
    interruptDuration: session?.interruptDuration ?? 0,
  };
}

function getSessionSubjectSelection(session: Pick<KromeSession, "subject" | "subjectId">): SubjectSelection | undefined {
  return session.subjectId && session.subject
    ? { id: session.subjectId, name: session.subject }
    : undefined;
}

function buildIdleSessionPreview(
  globalSettings: KromeSettings,
  subjects: KromeSubject[],
  subject?: SubjectSelection
): KromeSession {
  const previewSettings = subject ? resolveSettings(globalSettings, subject.id, subjects) : globalSettings;

  return {
    ...DEFAULT_SESSION,
    sessionMinutes: previewSettings.sessionMinutes,
    plipMinutes: previewSettings.plipMinutes,
    soundEnabled: previewSettings.soundEnabled,
    volume: previewSettings.volume,
    totalBlocks: getTotalBlocks(previewSettings.sessionMinutes, previewSettings.plipMinutes),
    subject: subject?.name ?? "",
    subjectId: subject?.id,
    subjectLocked: false,
    status: "idle",
  };
}

function getSubjectRuntimeSettings(
  subject: KromeSubject | undefined,
  session: Pick<KromeSession, "sessionMinutes" | "plipMinutes" | "soundEnabled" | "volume">
) {
  const subjectSettings = subject?.settings ?? {};

  return {
    sessionMinutes: subjectSettings.sessionMinutes ?? session.sessionMinutes,
    plipMinutes: subjectSettings.plipMinutes ?? session.plipMinutes,
    soundEnabled: subjectSettings.soundEnabled ?? session.soundEnabled,
    volume: subjectSettings.volume ?? session.volume,
  };
}

function getPotDelta(entry: Pick<HistoryEntry, "potResult" | "potSpilled">): number {
  if (entry.potResult === "retained") return 10;
  if (entry.potResult === "spilled" || entry.potSpilled) return -20;
  return 0;
}

function recalculateDailyPot(day: KromeDay, entries: HistoryEntry[]): KromeDay {
  let total = 0;

  for (const entry of entries) {
    if (entry.dateISO !== day.date) continue;
    total += getPotDelta(entry);
  }

  return day.potValue === total ? day : { ...day, potValue: total };
}

function syncGlobalGoalProgress(settings: KromeSettings): KromeSettings {
  const dailyGoalProgress = normalizeGoalProgress(settings.dailyGoalProgress, { ...DEFAULT_DAILY_GOAL_PROGRESS, target: settings.goal });
  const weeklyGoalProgress = normalizeGoalProgress(settings.weeklyGoalProgress, { ...DEFAULT_WEEKLY_GOAL_PROGRESS, target: settings.weeklyGoal });

  return {
    ...settings,
    goal: dailyGoalProgress.type === "blocks" ? dailyGoalProgress.target : settings.goal,
    weeklyGoal: weeklyGoalProgress.type === "blocks" ? weeklyGoalProgress.target : settings.weeklyGoal,
    dailyGoalProgress,
    weeklyGoalProgress,
  };
}

function computeSeverityImpact(completed: boolean, protectionRatio: number, interruptDurationMs: number) {
  if (!completed) return 4;
  if (protectionRatio < 0.5 || interruptDurationMs >= 60 * 60 * 1000) return 3;
  if (protectionRatio < 0.8 || interruptDurationMs >= 30 * 60 * 1000) return 2;
  if (interruptDurationMs > 0) return 1;
  return 0;
}

function recalculateDayState(day: KromeDay, entries: HistoryEntry[], goalProgress: GoalProgress): KromeDay {
  const todaysEntries = entries.filter((entry) => entry.dateISO === day.date);
  const blocksCompleted = todaysEntries.filter((entry) => entry.completed).length;
  const minutesFocused = Math.round(todaysEntries.reduce((total, entry) => total + (entry.actualFocusDurationMs ?? entry.durationMs), 0) / 60000);
  const resolvedGoalProgress = withGoalCurrent(goalProgress, getGoalMetricValue(goalProgress, { blocks: blocksCompleted, minutes: minutesFocused }), goalProgress);
  const isDaySecured = resolvedGoalProgress.target > 0 && resolvedGoalProgress.current >= resolvedGoalProgress.target;
  const potApplied = recalculateDailyPot(day, entries);

  return {
    ...potApplied,
    blocksCompleted,
    minutesFocused,
    goal: goalProgress.target,
    goalProgress: resolvedGoalProgress,
    isDaySecured,
  };
}

type SubjectSelection = Pick<KromeSubject, "id" | "name">;
type SubjectInput = string | { name: string; color?: string; settings?: KromeSubject["settings"] };
type SubjectUpdates = Partial<Pick<KromeSubject, "name" | "color" | "settings" | "archived">>;
type StartSessionOptions = {
  lockSubject?: boolean;
  type?: KromeSession["type"];
  sessionMinutes?: number;
  plipMinutes?: number;
};

interface KromeStoreStructure {
  state: {
    view: ViewState;
    settings: KromeSettings;
    resolvedSettings: KromeSettings;
    currentSubject: KromeSubject | null;
    activeSubjectViewId: string | null;
    activeSubjectView: KromeSubject | null;
    day: KromeDay;
    week: KromeWeek;
    weekDailyProgress: { date: string; label: string; blocksCompleted: number; minutesFocused: number; current: number }[];
    session: KromeSession;
    streak: KromeStreak;
    history: HistoryEntry[];
    subjects: KromeSubject[];
    elapsed: number;
    isSessionActive: boolean;
    insightFlashcards: InsightFlashcard[];
    weeklyPlan: WeeklyPlan | null;
    notifications: NotificationEntry[];
    latestSessionSummary: SessionSummary | null;
  };
  actions: {
    setView: (view: ViewState) => void;
    setSettings: (settings: KromeSettings) => void;
    setIsSessionActive: (isActive: boolean) => void;
    setSubjectView: (subjectId: string) => void;
    startSession: (subject?: SubjectSelection, options?: StartSessionOptions) => void;
    requestAbandon: (reason?: string, note?: string) => void;
    undoAbandon: () => void;
    updateSubject: (subject?: SubjectSelection) => void;
    updateIntent: (val: string) => void;
    updateTaskId: (val: string | undefined) => void;
    addSubject: (subject: SubjectInput) => string;
    editSubject: (id: string, updates: SubjectUpdates) => void;
    deleteSubject: (id: string) => void;
    deleteSubjectDeep: (id: string, name: string) => void;
    refreshSubjects: () => void;
    updateSubjectSettings: (id: string, settings: KromeSubject["settings"]) => void;
    pauseForInterrupt: (reason: string, type: InterruptEntry["type"], notes?: string) => void;
    resumeFromInterrupt: () => void;
    saveWeeklyPlan: (plan: Omit<WeeklyPlan, "id"> & { id?: string }) => void;
    markNotificationsRead: (notificationId?: string) => void;
    clearSessionSummary: () => void;
    exportHistory: () => void;
  };
}

const KromeContext = createContext<KromeStoreStructure | null>(null);

export function useKromeStore() {
  const ctx = useContext(KromeContext);
  if (!ctx) throw new Error("useKromeStore must be used within KromeProvider");
  return ctx;
}

export function useKromeLogic() {
  const [view, setView] = useState<ViewState>(() => {
    const storedSession = normalizeSession(getItem<KromeSession | null>(STORAGE_KEYS.SESSION, null));
    if (storedSession.isActive) return "focus";
    return "dashboard";
  });

  const [settings, setSettings] = useState<KromeSettings>(() => {
    const stored = getItem<LegacyStoredSettings>(STORAGE_KEYS.SETTINGS, {});
    const {
      muteFillSound,
      soundVolume,
      ...storedSettings
    } = stored;

    return syncGlobalGoalProgress({
      ...DEFAULT_SETTINGS,
      ...storedSettings,
      goal: typeof storedSettings.goal === "number" ? storedSettings.goal : DEFAULT_SETTINGS.goal,
      weeklyGoal: typeof storedSettings.weeklyGoal === "number" ? storedSettings.weeklyGoal : DEFAULT_SETTINGS.weeklyGoal,
      soundEnabled:
        typeof storedSettings.soundEnabled === "boolean"
          ? storedSettings.soundEnabled
          : muteFillSound !== undefined
            ? !muteFillSound
            : DEFAULT_SETTINGS.soundEnabled,
      volume: normalizeStoredVolume(
        storedSettings.volume ?? soundVolume,
        DEFAULT_SETTINGS.volume
      ),
    } as KromeSettings);
  });

  const [day, setDay] = useState<KromeDay>(() => {
    const stored = getItem<KromeDay | null>(STORAGE_KEYS.DAY, null);
    const today = getTodayDate();
    if (stored && stored.date === today) {
      return {
        ...stored,
        minutesFocused: stored.minutesFocused ?? 0,
        goalProgress: withGoalCurrent(stored.goalProgress ?? settings.dailyGoalProgress, stored.goalProgress?.current ?? 0, settings.dailyGoalProgress),
      };
    }
    return {
      date: today,
      blocksCompleted: 0,
      goal: DEFAULT_SETTINGS.goal,
      minutesFocused: 0,
      goalProgress: DEFAULT_DAILY_GOAL_PROGRESS,
      isDaySecured: false,
      locked: false,
      potValue: 0,
      potSpilled: false,
    };
  });

  const [session, setSession] = useState<KromeSession>(() => normalizeSession(getItem<KromeSession | null>(STORAGE_KEYS.SESSION, null)));
  const [streak, setStreak] = useState<KromeStreak>(() => validateStreak(getItem(STORAGE_KEYS.STREAK, { current: 0, lastCompletedDate: null }), getTodayDate()));
  const [history, setHistory] = useState<HistoryEntry[]>(() => getHistory());
  const [subjects, setSubjects] = useState<KromeSubject[]>(() => getSubjects() as KromeSubject[]);
  const [activeSubjectViewId, setActiveSubjectViewId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(() => getCurrentWeekPlan());
  const [notifications, setNotifications] = useState<NotificationEntry[]>(() =>
    getItem<NotificationEntry[]>(STORAGE_KEYS.NOTIFICATIONS, [])
  );
  const [latestSessionSummary, setLatestSessionSummary] = useState<SessionSummary | null>(null);
  const [insightFlashcards, setInsightFlashcards] = useState<InsightFlashcard[]>([]);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationCheckRef = useRef<string>("");
  const visualLoopRef = useRef<number | null>(null);
  const cancelScheduledPlipsRef = useRef<() => void>(() => {});
  const visualGapMonitorRef = useRef(createVisualGapMonitor(1200));
  const scheduledPlipCountRef = useRef(0);
  const settingsRef = useRef(settings);
  const subjectsRef = useRef(subjects);
  const sessionRef = useRef(session);

  const stopVisualLoop = (reason: string, sessionId?: string) => {
    if (visualLoopRef.current !== null) {
      window.cancelAnimationFrame(visualLoopRef.current);
      visualLoopRef.current = null;
      recordDiagnosticsEvent({
        type: "visual_loop_stopped",
        timestamp: Date.now(),
        sessionId,
        reason,
      });
    }
    visualGapMonitorRef.current.reset();
  };

  const cancelScheduledPlips = (reason: string, isSessionRunning: boolean, sessionId?: string) => {
    if (scheduledPlipCountRef.current > 0) {
      cancelScheduledPlipsRef.current();
      recordDiagnosticsEvent({
        type: "plips_cancelled",
        timestamp: Date.now(),
        sessionId,
        reason,
        isSessionRunning,
      });
    }
    cancelScheduledPlipsRef.current = () => {};
    scheduledPlipCountRef.current = 0;
  };

  const getSessionElapsedFromEpoch = (activeSession: Pick<KromeSession, "startTime">) => {
    if (activeSession.startTime === null) {
      return 0;
    }

    return Math.max(0, Date.now() - activeSession.startTime);
  };

  const currentSubject = useMemo(() => {
    if (session.subjectId) {
      return subjects.find((subject) => subject.id === session.subjectId) ?? null;
    }
    if (session.subject) {
      return subjects.find((subject) => subject.name === session.subject) ?? null;
    }
    return null;
  }, [session.subject, session.subjectId, subjects]);

  const resolvedSettings = useMemo(
    () => resolveSettings(settings, currentSubject?.id, subjects),
    [settings, currentSubject?.id, subjects]
  );
  const activeSubjectView = useMemo(
    () => subjects.find((subject) => subject.id === activeSubjectViewId) ?? null,
    [activeSubjectViewId, subjects]
  );

  const week = useMemo(() => getCurrentWeekProgress(history, settings.weeklyGoalProgress), [history, settings.weeklyGoalProgress]);
  const weekDailyProgress = useMemo(() => getCurrentWeekDailyCounts(history, settings.weeklyGoalProgress.type), [history, settings.weeklyGoalProgress.type]);
  const insightPatterns = useMemo(
    () => generateInsightFlashcards(history, subjects, settings.weeklyGoalProgress, weeklyPlan),
    [history, settings.weeklyGoalProgress, subjects, weeklyPlan]
  );

  const commitSettings = (nextSettings: KromeSettings) => {
    const normalizedSettings = syncGlobalGoalProgress(nextSettings);
    settingsRef.current = normalizedSettings;
    setSettings(normalizedSettings);
    setItem(STORAGE_KEYS.SETTINGS, normalizedSettings);
  };

  const commitSubjects = (
    nextSubjects:
      | KromeSubject[]
      | ((previousSubjects: KromeSubject[]) => KromeSubject[])
  ) => {
    setSubjects((previousSubjects) => {
      const resolvedSubjects =
        typeof nextSubjects === "function"
          ? nextSubjects(previousSubjects)
          : nextSubjects;

      subjectsRef.current = resolvedSubjects;
      setItem(STORAGE_KEYS.SUBJECTS, resolvedSubjects);
      return resolvedSubjects;
    });
  };

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const resetVisualGapMonitor = () => {
      visualGapMonitorRef.current.reset();
    };

    const handleVisibilityChange = () => {
      visualGapMonitorRef.current.noteVisibilityChange(document.visibilityState);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", resetVisualGapMonitor);
    window.addEventListener("focus", resetVisualGapMonitor);
    window.addEventListener("pagehide", resetVisualGapMonitor);
    window.addEventListener("pageshow", resetVisualGapMonitor);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", resetVisualGapMonitor);
      window.removeEventListener("focus", resetVisualGapMonitor);
      window.removeEventListener("pagehide", resetVisualGapMonitor);
      window.removeEventListener("pageshow", resetVisualGapMonitor);
    };
  }, []);

  useEffect(() => {
    subjectsRef.current = subjects;
  }, [subjects]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    const unsubscribeHistory = subscribeToKey<HistoryEntry[]>(STORAGE_KEYS.HISTORY, (nextHistory) => {
      startTransition(() => {
        setHistory((nextHistory ?? []).map((entry) => migrateHistoryEntry(entry)));
      });
    });
    const unsubscribeSubjects = subscribeToKey<KromeSubject[]>(STORAGE_KEYS.SUBJECTS, (nextSubjects) => {
      startTransition(() => {
        setSubjects((nextSubjects ?? []) as KromeSubject[]);
      });
    });

    return () => {
      unsubscribeHistory();
      unsubscribeSubjects();
    };
  }, []);

  useEffect(() => setItem(STORAGE_KEYS.DAY, day), [day]);
  useEffect(() => setItem(STORAGE_KEYS.SESSION, session), [session]);
  useEffect(() => setItem(STORAGE_KEYS.STREAK, streak), [streak]);
  useEffect(() => setItem(STORAGE_KEYS.HISTORY, history), [history]);
  useEffect(() => setItem(STORAGE_KEYS.NOTIFICATIONS, notifications), [notifications]);

  useEffect(() => {
    setDay((prev) => recalculateDayState(prev, history, settings.dailyGoalProgress));
  }, [history, day.date, settings.dailyGoalProgress]);

  useEffect(() => {
    if (session.isActive && !isSessionActive) {
      setIsSessionActive(true);
    }
    if (!session.isActive && isSessionActive) {
      setIsSessionActive(false);
    }
  }, [session.isActive, isSessionActive]);

  useEffect(() => {
    if (!session.subject || session.subjectId) return;
    const matchedSubject = subjects.find((subject) => subject.name === session.subject);
    if (!matchedSubject) return;

    setSession((prev) => (prev.subjectId ? prev : { ...prev, subjectId: matchedSubject.id }));
  }, [session.subject, session.subjectId, subjects]);

  useEffect(() => {
    if (session.isActive) {
      return;
    }

    const selectedSubject = getSessionSubjectSelection(session);
    const previewSettings = selectedSubject ? resolveSettings(settings, selectedSubject.id, subjects) : settings;
    const nextSessionMinutes = previewSettings.sessionMinutes;
    const nextPlipMinutes = previewSettings.plipMinutes;
    const nextSoundEnabled = previewSettings.soundEnabled;
    const nextVolume = previewSettings.volume;
    const nextTotalBlocks = getTotalBlocks(nextSessionMinutes, nextPlipMinutes);

    if (
      session.sessionMinutes === nextSessionMinutes &&
      session.plipMinutes === nextPlipMinutes &&
      session.soundEnabled === nextSoundEnabled &&
      session.volume === nextVolume &&
      session.totalBlocks === nextTotalBlocks
    ) {
      return;
    }

    setSession((prev) =>
      prev.isActive
        ? prev
        : {
            ...prev,
            sessionMinutes: nextSessionMinutes,
            plipMinutes: nextPlipMinutes,
            soundEnabled: nextSoundEnabled,
            volume: nextVolume,
            totalBlocks: nextTotalBlocks,
          }
    );
  }, [
    session,
    settings,
    subjects,
  ]);

  useEffect(() => {
    setWeeklyPlan(getCurrentWeekPlan());
  }, [week.weekStartDate]);

  useEffect(() => {
    let isCancelled = false;

    const hydrateInsights = async () => {
      const nextCards = await Promise.all(
        insightPatterns.map(async (pattern: DeterministicInsightCard) => {
          const aiCopy = await renderInsightText(pattern.payload);
          return {
            id: pattern.id,
            title: aiCopy.title,
            description: pattern.description,
            metric: pattern.metric,
            dataMirror: pattern.dataMirror,
            guidance: aiCopy.guidance,
            severityLevel: pattern.severityLevel,
            dateGenerated: pattern.dateGenerated,
            relevantSubjectId: pattern.relevantSubjectId,
          };
        })
      );

      if (!isCancelled) {
        setInsightFlashcards(nextCards);
      }
    };

    hydrateInsights();

    return () => {
      isCancelled = true;
    };
  }, [insightPatterns]);

  useEffect(() => {
    const today = getTodayDate();
    if (day.date !== today) {
      setDay({
        date: today,
        blocksCompleted: 0,
        goal: settings.dailyGoalProgress.target,
        minutesFocused: 0,
        goalProgress: withGoalCurrent(settings.dailyGoalProgress, 0, settings.dailyGoalProgress),
        isDaySecured: false,
        locked: false,
        potValue: 0,
        potSpilled: false,
      });

      setStreak((current) => validateStreak(current, today));
    }
  }, [day.date, settings.dailyGoalProgress]);

  useEffect(() => {
    if (!session.isActive || session.startTime === null) {
      stopVisualLoop("session-inactive");
      cancelScheduledPlips("session-inactive", false);
      setElapsed(0);
      return;
    }

    const sessionId = String(session.startTime);

    if (session.status !== "running" || session.activeInterruptStartTime) {
      stopVisualLoop("session-paused", sessionId);
      cancelScheduledPlips("session-paused", false, sessionId);
      return;
    }

    const initialElapsed = getSessionElapsedFromEpoch(session);
    setElapsed(initialElapsed);
    stopVisualLoop("visual-loop-restart", sessionId);
    cancelScheduledPlips("scheduler-resubscribe", false, sessionId);

    if (session.soundEnabled) {
      const futureOffsetsSeconds = computeFuturePlipOffsetsSec(initialElapsed, session);
      if (futureOffsetsSeconds.length > 0) {
        cancelScheduledPlipsRef.current = scheduleSessionPlips(futureOffsetsSeconds, session.volume ?? 0.5);
        scheduledPlipCountRef.current = futureOffsetsSeconds.length;
        recordDiagnosticsEvent({
          type: "plips_scheduled",
          timestamp: Date.now(),
          sessionId,
          count: futureOffsetsSeconds.length,
          startLeadSeconds: 0.1,
        });
      }
    }

    recordDiagnosticsEvent({
      type: "visual_loop_started",
      timestamp: Date.now(),
      sessionId,
    });

    const loop = () => {
      const now = Date.now();
      const newElapsed = Math.max(0, now - session.startTime);

      if (typeof document !== "undefined") {
        const gapAlert = visualGapMonitorRef.current.observeFrame(
          now,
          document.visibilityState,
          typeof document.hasFocus === "function" ? document.hasFocus() : true
        );
        if (gapAlert) {
          recordDiagnosticsEvent({
            type: "visual_tick_gap_detected",
            timestamp: now,
            ...gapAlert,
          });
        }
      }

      setElapsed(newElapsed);

      if (evaluateBlockCompletion(session, newElapsed, now)) {
        stopVisualLoop("session-complete", sessionId);
        cancelScheduledPlips("session-complete", false, sessionId);
        handleSessionComplete();
        return;
      }

      visualLoopRef.current = window.requestAnimationFrame(loop);
    };

    visualLoopRef.current = window.requestAnimationFrame(loop);

    return () => {
      stopVisualLoop("effect-cleanup", sessionId);
      cancelScheduledPlips("effect-cleanup", false, sessionId);
    };
  }, [
    session.isActive,
    session.startTime,
    session.status,
    session.activeInterruptStartTime,
    session.plipMinutes,
    session.soundEnabled,
    session.volume,
    session.sessionMinutes,
    session.claimedEndTime,
  ]);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const shouldEvaluate =
      hour >= 20 || (dayOfWeek === 1 && hour < 12) || (!weeklyPlan && dayOfWeek >= 1 && dayOfWeek <= 3 && hour >= 9);

    if (!shouldEvaluate) {
      return;
    }

    const notificationWindowKey = `${day.date}:${week.weekStartDate}:${weeklyPlan ? "planned" : "unplanned"}:${hour}`;
    if (lastNotificationCheckRef.current === notificationWindowKey) {
      return;
    }
    lastNotificationCheckRef.current = notificationWindowKey;

    setNotifications((prev) => {
      const nextEntries = evaluateNotifications({
        day,
        week,
        weeklyPlan,
        existing: prev,
      });

      if (nextEntries.length === 0) {
        return prev;
      }

      nextEntries.forEach((entry) => emitNotification(entry, settings.notifications));
      return [...nextEntries, ...prev];
    });
  }, [day.date, day.goalProgress.current, week.weekStartDate, weeklyPlan, settings.notifications]);

  const startSession = (subject?: SubjectSelection, options?: StartSessionOptions) => {
    const latestSession = sessionRef.current;
    const latestSettings = settingsRef.current;
    const latestSubjects = subjectsRef.current;

    if (latestSession.isActive) return;

    void warmUpAudio();
    const selectedSubject = subject ?? getSessionSubjectSelection(latestSession);
    const sessionSettings = selectedSubject ? resolveSettings(latestSettings, selectedSubject.id, latestSubjects) : latestSettings;
    const nextSession = createNewSession(sessionSettings);
    const plipMinutes = options?.plipMinutes ?? nextSession.plipMinutes;
    const sessionMinutes = options?.sessionMinutes ?? nextSession.sessionMinutes;
    const totalBlocks = getTotalBlocks(sessionMinutes, plipMinutes);

    setIsSessionActive(true);
    setLatestSessionSummary(null);
    setView("focus");

    const startTime = Date.now();
    setElapsed(0);
    recordDiagnosticsEvent({
      type: "session_started",
      timestamp: startTime,
      sessionId: String(startTime),
      soundEnabled: nextSession.soundEnabled,
      plipMinutes,
    });
    setSession({
      ...nextSession,
      startTime,
      type: options?.type ?? nextSession.type,
      sessionMinutes,
      plipMinutes,
      totalBlocks,
      subject: selectedSubject?.name ?? latestSession.subject,
      subjectId: selectedSubject?.id ?? latestSession.subjectId,
      intent: latestSession.intent,
      taskId: latestSession.taskId,
      subjectLocked: options?.lockSubject ?? false,
      interrupts: [],
      interruptCount: 0,
      isInterrupted: false,
      interruptDuration: 0,
    });

    if (!day.locked) {
      setDay((prev) => ({ ...prev, locked: true }));
    }
  };

  const requestAbandon = (reason?: string, note?: string) => {
    setSession((prev) => ({
      ...prev,
      status: "abandoned",
      abandonReason: reason,
      abandonNote: note,
    }));

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
    setSession((prev) => ({ ...prev, status: "running" }));
  };

  const pauseForInterrupt = (reason: string, type: InterruptEntry["type"], notes?: string) => {
    if (!session.isActive || session.activeInterruptStartTime) return;

    recordDiagnosticsEvent({
      type: "session_paused",
      timestamp: Date.now(),
      sessionId: String(session.startTime ?? Date.now()),
      reason,
    });
    setSession((prev) => ({
      ...prev,
      activeInterruptStartTime: Date.now(),
      activeInterruptReason: reason,
      activeInterruptType: type,
      activeInterruptNotes: notes,
      isInterrupted: true,
    }));
  };

  const resumeFromInterrupt = () => {
    if (!session.activeInterruptStartTime || !session.startTime) return;

    const durationMs = Date.now() - session.activeInterruptStartTime;
    const nextInterrupt: InterruptEntry = {
      id: uuidv4(),
      sessionId: String(session.startTime),
      timestamp: session.activeInterruptStartTime,
      durationMs,
      reason: session.activeInterruptReason ?? "Interrupt",
      type: session.activeInterruptType ?? "external",
      notes: session.activeInterruptNotes,
    };

    const nextStartTime = (session.startTime ?? Date.now()) + durationMs;
    const nextSession = {
      ...session,
      startTime: nextStartTime,
      claimedEndTime: session.claimedEndTime ? session.claimedEndTime + durationMs : undefined,
      activeInterruptStartTime: undefined,
      activeInterruptReason: undefined,
      activeInterruptType: undefined,
      activeInterruptNotes: undefined,
      interrupts: [...(session.interrupts ?? []), nextInterrupt],
      interruptCount: (session.interruptCount ?? 0) + 1,
      isInterrupted: false,
      interruptDuration: (session.interruptDuration ?? 0) + durationMs,
    };

    recordDiagnosticsEvent({
      type: "session_resumed",
      timestamp: Date.now(),
      sessionId: String(nextStartTime),
    });
    setSession(nextSession);
  };

  const commitAbandon = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    handleSessionEnd(false);
  };

  const handleSessionComplete = () => {
    handleSessionEnd(true);
  };

  const handleSessionEnd = (completed: boolean) => {
    const activeSessionSettings = resolveSettings(settings, session.subjectId, subjects);
    const sessionEndTime = Date.now();
    const activeInterruptDuration = session.activeInterruptStartTime
      ? sessionEndTime - session.activeInterruptStartTime
      : 0;
    const finalizedInterrupts = session.activeInterruptStartTime
      ? [
          ...(session.interrupts ?? []),
          {
            id: uuidv4(),
            sessionId: String(session.startTime ?? sessionEndTime),
            timestamp: session.activeInterruptStartTime,
            durationMs: activeInterruptDuration,
            reason: session.activeInterruptReason ?? "Interrupt",
            type: session.activeInterruptType ?? "external",
            notes: session.activeInterruptNotes,
          },
        ]
      : session.interrupts ?? [];
    const interruptDurationMs = finalizedInterrupts.reduce((total, interrupt) => total + interrupt.durationMs, 0);
    // startTime is intentionally shifted forward on each resume so interrupted time is excluded here.
    const actualFocusDurationMs = Math.max(0, sessionEndTime - (session.startTime || sessionEndTime) - activeInterruptDuration);
    const protectionRatio = actualFocusDurationMs + interruptDurationMs > 0
      ? actualFocusDurationMs / (actualFocusDurationMs + interruptDurationMs)
      : 1;
    const severityImpact = computeSeverityImpact(completed, protectionRatio, interruptDurationMs);
    const potResult = evaluatePotResult(activeSessionSettings.strictMode !== undefined ? activeSessionSettings.strictMode : false, !completed);

    if (completed && session.taskId) {
      const tasks = getTasks();
      const taskIndex = tasks.findIndex((task) => task.id === session.taskId);
      if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        if (!task.completed) {
          const nextCompletedBlocks = (task.completedBlocks || 0) + 1;
          const updatedTask = {
            ...task,
            completedBlocks: nextCompletedBlocks,
            completed: task.estimatedBlocks ? nextCompletedBlocks >= task.estimatedBlocks : task.completed,
          };

          if (updatedTask.completed && !task.completed) {
            toast("Task auto-completed (target reached).", {
              duration: 4000,
              className: "bg-slate-900 border-slate-800 text-slate-400 text-xs text-center",
            });
          }
          updateTask(updatedTask);
        }
      }
    }

    const entry: HistoryEntry = {
      id: uuidv4(),
      dateISO: getTodayDate(),
      startedAt: session.startTime || sessionEndTime,
      durationMs: actualFocusDurationMs,
      subject: session.subject,
      intent: session.intent,
      sessionType: session.type,
      completed,
      potSpilled: day.potSpilled,
      subjectId: session.subjectId,
      taskId: session.taskId,
      potResult,
      interrupts: finalizedInterrupts,
      plannedDurationMs: Number.isFinite(session.sessionMinutes) ? session.sessionMinutes * 60 * 1000 : undefined,
      actualFocusDurationMs,
      interruptDurationMs,
      protectionRatio,
      completionStatus: completed ? "completed" : "abandoned",
      abandonReason: session.abandonReason,
      timeOfDay: getTimeOfDay(session.startTime || sessionEndTime),
      severityImpact,
    };

    if (session.abandonNote?.trim()) {
      saveObservation({
        id: uuidv4(),
        content: session.abandonNote.trim(),
        sessionId: entry.id,
        createdAt: sessionEndTime,
      });
    }

    stopVisualLoop(completed ? "session-ended" : "session-abandoned", String(session.startTime ?? sessionEndTime));
    cancelScheduledPlips(completed ? "session-complete" : "session-abandoned", false, String(session.startTime ?? sessionEndTime));

    const nextHistory = [migrateHistoryEntry(entry), ...history].slice(0, 500);
    const nextDay = recalculateDayState(day, nextHistory, settings.dailyGoalProgress);

    setHistory(nextHistory);
    setDay(nextDay);

    if (completed && nextDay.isDaySecured && !day.isDaySecured) {
      setStreak((prev) => incrementStreak(prev, getTodayDate()));
    }

    if (completed) {
      setLatestSessionSummary({
        id: entry.id,
        subject: entry.subject,
        completed,
        actualFocusDurationMs,
        interruptDurationMs,
        protectionRatio,
        plannedDurationMs: entry.plannedDurationMs,
      });
    }

    setSession(buildIdleSessionPreview(settings, subjects, getSessionSubjectSelection(session)));
    setIsSessionActive(false);
    recordDiagnosticsEvent({
      type: completed ? "session_completed" : "session_abandoned",
      timestamp: sessionEndTime,
      sessionId: String(session.startTime ?? sessionEndTime),
    });

    if (completed) {
      if (session.soundEnabled) void playEndSound(session.volume ?? 0.5);
      if (activeSessionSettings.notifications && "Notification" in window && Notification.permission === "granted") {
        new Notification("Block Complete", {
          body: "Focus session recorded.",
          icon: "/favicon.ico",
        });
      }

      toast.success("Block Complete", {
        description: "Focus session recorded.",
        duration: 5000,
        position: "top-center",
        className: "bg-kromeAccent/20 border-kromeAccent/30 text-slate-100",
      });
    } else {
      toast("Session Abandoned", {
        description: "Logged to history.",
        position: "top-center",
        className: "bg-slate-900 border-slate-800 text-slate-400",
      });
    }
  };

  const updateSubject = (subject?: SubjectSelection) =>
    setSession((prev) => {
      const previewSettings = subject ? resolveSettings(settings, subject.id, subjects) : settings;
      const nextSession = {
        ...prev,
        subject: subject?.name ?? "",
        subjectId: subject?.id,
        subjectLocked: false,
        sessionMinutes: previewSettings.sessionMinutes,
        plipMinutes: previewSettings.plipMinutes,
        soundEnabled: previewSettings.soundEnabled,
        volume: previewSettings.volume,
        totalBlocks: getTotalBlocks(previewSettings.sessionMinutes, previewSettings.plipMinutes),
      };

      sessionRef.current = nextSession;
      return nextSession;
    });

  const updateIntent = (val: string) => setSession((prev) => {
    const nextSession = { ...prev, intent: val };
    sessionRef.current = nextSession;
    return nextSession;
  });
  const updateTaskId = (val: string | undefined) => setSession((prev) => {
    const nextSession = { ...prev, taskId: val };
    sessionRef.current = nextSession;
    return nextSession;
  });

  const addSubject = (subjectInput: SubjectInput) => {
    const nextName = typeof subjectInput === "string" ? subjectInput.trim() : subjectInput.name.trim();
    const requestedColor = typeof subjectInput === "string" ? undefined : subjectInput.color;
    const requestedSettings = typeof subjectInput === "string" ? undefined : subjectInput.settings;

    if (!nextName) return "";

    const existingColors = subjects.map((subject) => subject.color).filter(Boolean) as string[];
    const newSubject: KromeSubject = {
      id: uuidv4(),
      name: nextName,
      createdAt: Date.now(),
      color: requestedColor ?? assignSubjectColor(existingColors),
      settings: normalizeSubjectSettings(requestedSettings ?? {}),
      archived: false,
    };

    commitSubjects((prev) => [...prev, newSubject]);
    return newSubject.id;
  };

  const refreshSubjects = () => {
    const nextSubjects = getSubjects() as KromeSubject[];
    subjectsRef.current = nextSubjects;
    setSubjects(nextSubjects);
  };

  const updateSubjectSettings = (id: string, nextSettings: KromeSubject["settings"]) => {
    commitSubjects((prev) =>
      prev.map((subject) =>
        subject.id === id
          ? {
              ...subject,
              settings: normalizeSubjectSettings({
                ...(subject.settings ?? {}),
                ...(nextSettings ?? {}),
              }),
            }
          : subject
      )
    );
  };

  const saveWeeklyPlan = (plan: Omit<WeeklyPlan, "id"> & { id?: string }) => {
    const nextPlan = persistWeeklyPlan(plan);
    setWeeklyPlan(nextPlan);
  };

  const markNotificationsRead = (notificationId?: string) => {
    setNotifications((prev) =>
      prev.map((entry) =>
        !notificationId || entry.id === notificationId ? { ...entry, read: true } : entry
      )
    );
  };

  const editSubject = (id: string, updates: SubjectUpdates) => {
    commitSubjects((prev) =>
      prev.map((subject) =>
        subject.id === id
          ? {
              ...subject,
              ...updates,
              settings: normalizeSubjectSettings({
                ...(subject.settings ?? {}),
                ...(updates.settings ?? {}),
              }),
            }
          : subject
      )
    );

    setSession((prev) => {
      if (prev.subjectId !== id) return prev;
      return {
        ...prev,
        subject: updates.name ?? prev.subject,
      };
    });
  };

  const deleteSubject = (id: string) => {
    commitSubjects((prev) => prev.filter((subject) => subject.id !== id));
    setActiveSubjectViewId((prev) => (prev === id ? null : prev));
    setSession((prev) =>
      prev.subjectId === id
        ? { ...prev, subject: "", subjectId: undefined, subjectLocked: false }
        : prev
    );
  };

  const deleteSubjectDeep = (id: string, name: string) => {
    commitSubjects((prev) => prev.filter((subject) => subject.id !== id));
    setActiveSubjectViewId((prev) => (prev === id ? null : prev));
    setSession((prev) =>
      prev.subjectId === id
        ? { ...prev, subject: "", subjectId: undefined, subjectLocked: false }
        : prev
    );
    setHistory((prev) => prev.filter((entry) => entry.subjectId !== id && entry.subject !== name));
  };

  return {
    state: {
      view,
      settings,
      resolvedSettings,
      currentSubject,
      activeSubjectViewId,
      activeSubjectView,
      day,
      week,
      weekDailyProgress,
      session,
      streak,
      history,
      subjects,
      elapsed,
      isSessionActive,
      insightFlashcards,
      weeklyPlan,
      notifications,
      latestSessionSummary,
    },
    actions: {
      setView,
      setSettings: commitSettings,
      setIsSessionActive,
      setSubjectView: (subjectId: string) => {
        setActiveSubjectViewId(subjectId);
        setView("subjectDetail");
      },
      startSession,
      requestAbandon,
      undoAbandon,
      updateSubject,
      updateIntent,
      updateTaskId,
      addSubject,
      editSubject,
      deleteSubject,
      deleteSubjectDeep,
      refreshSubjects,
      updateSubjectSettings,
      pauseForInterrupt,
      resumeFromInterrupt,
      saveWeeklyPlan,
      markNotificationsRead,
      clearSessionSummary: () => setLatestSessionSummary(null),
      exportHistory: () => console.log("Exporting...", history),
    },
  };
}

function KromeProviderInner({ children }: { children: React.ReactNode }) {
  const store = useKromeLogic();

  return <KromeContext.Provider value={store}>{children}</KromeContext.Provider>;
}

const STORAGE_INIT_SLOW_THRESHOLD_MS = 4000;
const DEFAULT_STORAGE_INIT_STEP: StorageInitializationStep = "opening_database";
const STORAGE_INIT_STATUS_COPY: Record<StorageInitializationStep, string> = {
  opening_database: "Opening your browser workspace.",
  hydrating_indexeddb: "Loading your saved sessions, history, and settings.",
  migrating_legacy_storage: "Checking older browser data and migrating anything still needed.",
  reconciling_reload_journal: "Replaying the latest local changes after reload.",
  seeding_defaults: "Finalizing local defaults.",
};

function getStorageInitErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Browser storage failed to initialize.";
}

export function KromeProvider({ children }: { children: React.ReactNode }) {
  const [initState, setInitState] = useState<"loading" | "ready" | "error">("loading");
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initStep, setInitStep] = useState<StorageInitializationStep>(DEFAULT_STORAGE_INIT_STEP);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    const slowTimer = window.setTimeout(() => {
      if (isCancelled) return;
      setShowSlowMessage(true);
      console.warn(
        "[storage] Initialization is taking longer than expected. This usually points to browser storage startup, not Vercel hosting."
      );
    }, STORAGE_INIT_SLOW_THRESHOLD_MS);

    setInitState("loading");
    setInitError(null);
    setInitStep(DEFAULT_STORAGE_INIT_STEP);
    setShowSlowMessage(false);

    void initializeStorage((step) => {
      if (!isCancelled) {
        setInitStep(step);
      }
    })
      .then(() => {
        if (!isCancelled) {
          setInitState("ready");
        }
      })
      .catch((error) => {
        console.error("[storage] Failed to initialize local storage.", error);
        if (!isCancelled) {
          setInitError(getStorageInitErrorMessage(error));
          setInitState("error");
        }
      })
      .finally(() => {
        window.clearTimeout(slowTimer);
      });

    return () => {
      isCancelled = true;
      window.clearTimeout(slowTimer);
    };
  }, [retryKey]);

  if (initState === "error") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#080C18] px-6 text-slate-200">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center shadow-2xl">
          <h1 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-200">Krome</h1>
          <p className="mt-4 text-sm text-slate-300">Local workspace startup failed.</p>
          <p className="mt-2 text-xs text-slate-500">{initError}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
              className="rounded-xl bg-kromeAccent px-4 py-2 text-sm font-semibold text-white hover:bg-kromeAccent/85"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (initState !== "ready") {
    const initStatusCopy = STORAGE_INIT_STATUS_COPY[initStep] ?? STORAGE_INIT_STATUS_COPY[DEFAULT_STORAGE_INIT_STEP];

    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#080C18] px-6 text-slate-200">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center shadow-2xl">
          <h1 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-200">Krome</h1>
          <p className="mt-4 text-sm text-slate-300">Preparing your local workspace…</p>
          <p className="mt-2 text-xs text-slate-500">
            {showSlowMessage
              ? `${initStatusCopy} This is taking longer than expected, which usually means browser storage startup is slow rather than Vercel hosting.`
              : initStatusCopy}
          </p>
          {showSlowMessage ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100"
            >
              Reload App
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return <KromeProviderInner>{children}</KromeProviderInner>;
}
