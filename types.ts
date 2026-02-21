export interface Settings {
  blockMinutes: number;
  intervalMinutes: number; // New setting for brick fill rate
  blocksPerDayGoal: number;
  muteFillSound: boolean; // Keep for backward compat/migration
  theme: 'light' | 'dark';
  reducedMotion: boolean;
  boxColor: 'blue' | 'teal';
  compactWidget: boolean;
  // New settings
  notifyOnFill: boolean;
  notifyOnBlockEnd: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  ringDurationMs: number;
  ringRepeats: number;
  vibrateOnFill: boolean;
  vibrateOnBlockEnd: boolean;
  countHelperBlocks: boolean;

  // Phase 2: Strict Mode
  strictMode: boolean;
  blindMode: boolean;

  // Productivity Wrapper
  wrapperEnabled: boolean;
  autoSuggestBreaks: boolean;
  progressiveEscalation: boolean;
  showCalendar: boolean;
  defaultSubject: string | null;
  lastEscalationPromptDate?: string;
}

export interface FrictionEntry {
  id: string;
  date: string; // ISO string
  reason: string;
  note?: string;
  bricksLost?: string; // e.g. "3/6"
}

export interface Subject {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
}

export interface Task {
  id: string;
  title: string;
  subjectId?: string;
  estimatedBlocks?: number;
  completedBlocks: number;
  completed: boolean;
  createdAt: number;
}

export interface Milestone {
  id: string;
  title: string;
  targetDate: number;
}

export interface KromeHistoryEntry {
  id: string;
  dateISO: string; // e.g. '2026-02-19'
  startedAt: number;
  durationMs: number;
  subject?: string | null;
  intent?: string | null;
  notes?: string | null;
  sessionType: 'standard' | 'helper' | 'claimed';
  completed: boolean;
  categoryLog?: { study: number; reset: number; distraction: number; away: number } | null;
  potSpilled?: boolean;
}

export interface SessionState {
  isActive: boolean;
  startTime: number | null; // Timestamp
  totalDurationMinutes: number;
  intervalMinutes: number; // Lock interval for the session
  totalBlocks: number;
  type: 'standard' | 'temporary';
  status: 'running' | 'abandoned'; // Add status to handle undo state visuals

  // Phase 1: Claimed Period
  claimedEndTime?: number; // If set, block ends at this epoch ms

  // Phase 2: Strict Mode
  mode?: 'exam' | 'build';
  currentCategory?: 'study' | 'reset' | 'distraction' | 'away';
  lastCategorySwitchTime?: number;
  categoryLog?: {
    study: number;
    reset: number;
    distraction: number;
    away: number;
  };
  observedSession?: boolean;
  ideaSink?: string | null;

  // Productivity Wrapper
  subject?: string | null;
  intent?: string | null;
  notes?: string | null;
  historyId?: string | null;

  // Phase 1 Expansion
  subjectId?: string;
  taskId?: string;
  potResult?: 'retained' | 'spilled' | null;
}

export interface DayState {
  date: string; // YYYY-MM-DD
  blocksCompleted: number;
  goal: number;
  isDaySecured: boolean;
  locked: boolean; // true once first standard block starts — goal is frozen

  // Phase 2: Strict Mode
  potValue?: number;
  potSpilled?: boolean;
  lastReflectionDate?: string;
}

export interface StreakState {
  current: number;
  lastCompletedDate: string | null;
}

export interface AppState {
  settings: Settings;
  day: DayState;
  streak: StreakState;
  frictionLog: FrictionEntry[];
  session: SessionState;
}

export const FRICTION_REASONS = [
  "Confused / Stuck",
  "Tired / Low energy",
  "Distracted",
  "Bored",
  "Anxiety / Fear",
  "Just didn't want to",
  "Other"
];