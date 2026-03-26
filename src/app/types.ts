export type SessionStatus = 'idle' | 'running' | 'abandoned' | 'completed';

export type SessionType = 'standard' | 'helper' | 'claimed';

export interface GoalProgress {
  type: 'blocks' | 'minutes';
  target: number;
  current: number;
}

export interface SubjectSettings {
  plipInterval?: number;
  sessionDuration?: number;
  blockMinutes?: number;
  intervalMinutes?: number;
  soundEnabled?: boolean;
  volume?: number;
  dailyGoal?: GoalProgress | number;
  weeklyGoal?: GoalProgress | number;
  strictMode?: boolean;
}

export enum SeverityLevel {
  Neutral = 0,
  Advisory = 1,
  Concern = 2,
  Direct = 3,
  Accountability = 4,
}

export interface InterruptEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  durationMs: number;
  reason: string;
  type: 'external' | 'internal';
  notes?: string;
}

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
  subjectLocked?: boolean;
  interrupts?: InterruptEntry[];
  activeInterruptStartTime?: number;
  activeInterruptReason?: string;
  activeInterruptType?: 'external' | 'internal';
  activeInterruptNotes?: string;
  interruptCount?: number;
  isInterrupted?: boolean;
  interruptDuration?: number;
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
  weeklyGoal: number;
  dailyGoalProgress: GoalProgress;
  weeklyGoalProgress: GoalProgress;
}

export interface KromeDay {
  date: string; // YYYY-MM-DD
  blocksCompleted: number;
  goal: number;
  minutesFocused: number;
  goalProgress: GoalProgress;
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
  interrupts?: InterruptEntry[];
  plannedDurationMs?: number;
  actualFocusDurationMs?: number;
  interruptDurationMs?: number;
  protectionRatio?: number;
  completionStatus?: 'completed' | 'abandoned';
  abandonReason?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  severityImpact?: number;
}

export interface KromeStreak {
  current: number;
  lastCompletedDate: string | null;
}

export interface KromeSubject {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
  settings?: SubjectSettings;
  archived?: boolean;
}

export interface KromeWeek {
  weekStartDate: string; // YYYY-MM-DD
  blocksCompleted: number;
  goal: number;
  minutesFocused: number;
  goalProgress: GoalProgress;
}

export interface WeeklyPlan {
  id: string;
  weekStartDate: string;
  allocations: Record<string, number>;
  strategyNotes?: string;
}

export interface NotificationEntry {
  id: string;
  message: string;
  type: 'reminder' | 'reflection' | 'warning';
  timestamp: number;
  read: boolean;
}

export type ViewState = 'focus' | 'dashboard' | 'review' | 'analytics' | 'settings' | 'subjectDetail';

export interface Subject {
  id: string;
  name: string;
  createdAt: number;
  color?: string;
  settings?: SubjectSettings;
  archived?: boolean;
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

export interface Observation {
  id: string;
  content: string;
  sessionId?: string;
  createdAt: number;
}

export interface InsightFlashcard {
  id: string;
  title: string;
  description: string;
  metric?: string;
  dataMirror?: string;
  guidance?: string;
  severityLevel: SeverityLevel;
  dateGenerated: number;
  relevantSubjectId?: string;
}

export interface SessionSummary {
  id: string;
  subject?: string;
  completed: boolean;
  actualFocusDurationMs: number;
  interruptDurationMs: number;
  protectionRatio: number;
  plannedDurationMs?: number;
}
