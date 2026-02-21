import { AppState, Settings, DayState, StreakState, SessionState, FrictionEntry, KromeHistoryEntry, Subject, Task, Milestone } from '../types';

const KEYS = {
  SETTINGS: 'krome_settings',
  DAY: 'krome_day',
  STREAK: 'krome_streak',
  FRICTION: 'krome_friction',
  SESSION: 'krome_session',
  SUBJECTS: 'krome_subjects',
  HISTORY: 'krome_history',
  TASKS: 'krome_tasks',
  MILESTONES: 'krome_milestones',
  DASHBOARD_LAYOUT: 'krome_dashboard_layout',
};

const DEFAULT_SETTINGS: Settings = {
  blockMinutes: 10,
  intervalMinutes: 2, // Default to 2m (10m / 2m = 5 blocks)
  blocksPerDayGoal: 2,
  muteFillSound: false, // Legacy
  theme: 'dark',
  reducedMotion: false,
  boxColor: 'blue',
  compactWidget: false,
  // New Defaults
  notifyOnFill: false,
  notifyOnBlockEnd: true,
  soundEnabled: true,
  soundVolume: 0.5,
  ringDurationMs: 2000,
  ringRepeats: 0,
  vibrateOnFill: false,
  vibrateOnBlockEnd: true,
  countHelperBlocks: false,

  // Phase 2: Strict Mode
  strictMode: false,
  blindMode: false,

  // Productivity Wrapper
  wrapperEnabled: true,
  autoSuggestBreaks: true,
  progressiveEscalation: false,
  showCalendar: true,
  defaultSubject: null
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getYesterdayDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

export const loadState = (): AppState => {
  const settingsRaw = localStorage.getItem(KEYS.SETTINGS);
  const dayRaw = localStorage.getItem(KEYS.DAY);
  const streakRaw = localStorage.getItem(KEYS.STREAK);
  const frictionRaw = localStorage.getItem(KEYS.FRICTION);
  const sessionRaw = localStorage.getItem(KEYS.SESSION);

  // Merge with default settings to handle new keys like compactWidget, soundVolume
  const parsedSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
  const settings: Settings = { ...DEFAULT_SETTINGS, ...parsedSettings };

  // Migration: Map legacy muteFillSound if soundEnabled not set in persisted
  if (parsedSettings.muteFillSound !== undefined && parsedSettings.soundEnabled === undefined) {
    settings.soundEnabled = !parsedSettings.muteFillSound;
  }

  // Safety check for intervalMinutes (migration)
  if (!settings.intervalMinutes || settings.intervalMinutes <= 0) {
    settings.intervalMinutes = 2;
  }

  let day: DayState = dayRaw ? JSON.parse(dayRaw) : {
    date: getTodayDate(),
    blocksCompleted: 0,
    goal: settings.blocksPerDayGoal,
    isDaySecured: false,
    locked: false
  };

  // Migrate pre-locked-flag persisted data
  if (day.locked === undefined) {
    day.locked = day.blocksCompleted > 0;
  }

  // Reset day if date changed
  if (day.date !== getTodayDate()) {
    day = {
      date: getTodayDate(),
      blocksCompleted: 0,
      goal: settings.blocksPerDayGoal,
      isDaySecured: false,
      locked: false
    };
  }

  let streak: StreakState = streakRaw ? JSON.parse(streakRaw) : {
    current: 0,
    lastCompletedDate: null
  };

  // Streak validation: break the streak if a day was missed
  if (streak.lastCompletedDate !== null) {
    const today = getTodayDate();
    const yesterday = getYesterdayDate();
    if (streak.lastCompletedDate !== today && streak.lastCompletedDate !== yesterday) {
      streak = { ...streak, current: 0 };
    }
  }

  const frictionLog: FrictionEntry[] = frictionRaw ? JSON.parse(frictionRaw) : [];

  const session: SessionState = sessionRaw ? JSON.parse(sessionRaw) : {
    isActive: false,
    startTime: null,
    totalDurationMinutes: settings.blockMinutes,
    intervalMinutes: settings.intervalMinutes,
    totalBlocks: Math.max(1, Math.floor(settings.blockMinutes / settings.intervalMinutes)),
    type: 'standard',
    status: 'running'
  };

  // Ensure session has type/status/interval if migrating from old state
  if (session.isActive) {
    if (!session.type) session.type = 'standard';
    if (!session.status) session.status = 'running';
    if (!session.intervalMinutes) {
      // Best guess migration
      session.intervalMinutes = (session.totalDurationMinutes || 10) / (session.totalBlocks || 6);
    }
  }

  return { settings, day, streak, frictionLog, session };
};

export const saveState = (state: AppState) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(state.settings));
  localStorage.setItem(KEYS.DAY, JSON.stringify(state.day));
  localStorage.setItem(KEYS.STREAK, JSON.stringify(state.streak));
  localStorage.setItem(KEYS.FRICTION, JSON.stringify(state.frictionLog));
  localStorage.setItem(KEYS.SESSION, JSON.stringify(state.session));
};

export const clearSession = () => {
  localStorage.removeItem(KEYS.SESSION);
};

// Productivity Wrapper Helpers

export const getSubjects = (): Subject[] => {
  try {
    const raw = localStorage.getItem(KEYS.SUBJECTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse subjects', e);
  }
  return [];
};

export const saveSubject = (subject: Subject) => {
  const subjects = getSubjects();
  const existingIndex = subjects.findIndex(s => s.id === subject.id);
  if (existingIndex >= 0) {
    subjects[existingIndex] = subject;
  } else {
    subjects.push(subject);
  }
  localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(subjects));
};

export const saveSubjects = (subjects: Subject[]) => {
  localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(subjects));
};

export const getTasks = (): Task[] => {
  try {
    const raw = localStorage.getItem(KEYS.TASKS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse tasks', e);
  }
  return [];
};

export const saveTask = (task: Task) => {
  const tasks = getTasks();
  tasks.push(task);
  localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
};

export const updateTask = (task: Task) => {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === task.id);
  if (index !== -1) {
    tasks[index] = task;
    localStorage.setItem(KEYS.TASKS, JSON.stringify(tasks));
  }
};

export const getMilestones = (): Milestone[] => {
  try {
    const raw = localStorage.getItem(KEYS.MILESTONES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse milestones', e);
  }
  return [];
};

export const saveMilestone = (milestone: Milestone) => {
  const milestones = getMilestones();
  milestones.push(milestone);
  localStorage.setItem(KEYS.MILESTONES, JSON.stringify(milestones));
};

export const getHistory = (): KromeHistoryEntry[] => {
  const raw = localStorage.getItem(KEYS.HISTORY);
  return raw ? JSON.parse(raw) : [];
};

export const getHistoryForDate = (dateISO: string): KromeHistoryEntry[] => {
  const history = getHistory();
  return history.filter(entry => entry.dateISO === dateISO);
};

export const saveHistoryEntry = (entry: KromeHistoryEntry) => {
  const history = getHistory();
  history.push(entry);

  // Safeguard 3: History Size Cap (max 500 entries)
  if (history.length > 500) {
    history.splice(0, history.length - 500); // Remove oldest entries
  }

  localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
};

export const updateHistoryEntryNote = (id: string, note: string) => {
  const history = getHistory();
  const index = history.findIndex(e => e.id === id);
  if (index !== -1) {
    history[index].notes = note;
    localStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
  }
};