export type SessionStatus = 'idle' | 'running' | 'abandoned' | 'completed';

export type SessionType = 'standard' | 'helper' | 'claimed';

export interface KromeSession {
  isActive: boolean;
  startTime: number | null; // Epoch MS
  totalDurationMinutes: number;
  intervalMinutes: number; // For brick filling
  totalBlocks: number;
  type: SessionType;
  status: SessionStatus;
  subject: string;
  intent: string;
  notes?: string;
  claimedEndTime?: number; // Epoch MS, if manually claimed
  lastCategorySwitchTime?: number; // For strict mode
  abandonReason?: string;
  abandonNote?: string;
  subjectId?: string;
  taskId?: string;
  potResult?: 'retained' | 'spilled' | null;
}

export interface KromeSettings {
  blockMinutes: number;
  intervalMinutes: number;
  soundEnabled: boolean;
  wrapperEnabled: boolean;
  goal: number;
  strictMode: boolean;
  blindMode: boolean;
  reducedMotion: boolean;
  autoSuggestBreaks: boolean;
  progressiveEscalation: boolean;
  countHelperBlocks: boolean;
  notifications: boolean;
  densityMode: 'comfortable' | 'compact';
  volume: number;
}

export interface KromeDay {
  date: string; // YYYY-MM-DD
  blocksCompleted: number;
  goal: number;
  isDaySecured: boolean;
  locked: boolean;
  potValue: number;
  potSpilled: boolean;
}

export interface HistoryEntry {
  id: string;
  dateISO: string;
  startedAt: number;
  durationMs: number;
  subject: string;
  intent: string;
  sessionType: SessionType;
  completed: boolean;
  potSpilled: boolean;
  subjectId?: string;
  taskId?: string;
  potResult?: 'retained' | 'spilled' | null;
}

export interface KromeStreak {
  current: number;
  lastCompletedDate: string | null;
}

export interface KromeSubject {
  id: string;
  name: string;
}

export type ViewState = 'focus' | 'dashboard' | 'review' | 'analytics' | 'settings';

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
  createdAt?: number;
}
