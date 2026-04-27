export type SessionStatus = 'idle' | 'running' | 'abandoned' | 'completed';

export type SessionType = 'standard' | 'helper' | 'claimed';

export interface GoalProgress {
  type: 'blocks' | 'minutes';
  target: number;
  current: number;
}

export interface SubjectSettings {
  plipMinutes?: number;
  sessionMinutes?: number;
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
  sessionMinutes: number;
  plipMinutes: number; // For brick filling
  soundEnabled: boolean;
  volume: number;
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
  sessionMinutes: number;
  plipMinutes: number;
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
  diagnosticsMode: boolean;
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

export type ViewState = 'focus' | 'dashboard' | 'review' | 'analytics' | 'settings' | 'subjectDetail' | 'canvas' | 'library' | 'canvasDashboard' | 'graph' | 'examSim';

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

// ---------------------------------------------------------------------------
// Neutrawn — canvas / card types
// ---------------------------------------------------------------------------

export interface LocalCardRecord {
  id: string;
  user_id: string;
  session_id: string | null;
  subject: string;
  tags: string[];
  error_type: 'conceptual' | 'calculation' | 'misread' | 'careless' | '';
  status: 'unseen' | 'wrong' | 'shaky' | 'correct';
  note: string;
  why_wrong: string;
  ocr_text: string;
  screenshot_url: string;
  next_review: string | null;
  w: number;
  h: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface LocalCardConnectionRecord {
  id: string;
  user_id: string;
  card_from: string;
  card_to: string;
  reason: 'tag' | 'errorType' | 'keyword' | 'manual';
  type: 'auto' | 'manual';
  label: string;
  color: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface LocalCanvasPositionRecord {
  id: string;
  user_id: string;
  card_id: string;
  canvas_id: string;
  x: number;
  y: number;
  updated_at: number;
}

export interface LocalCanvasShapeRecord {
  id: string;
  user_id: string;
  canvas_id: string;
  shape_data: object;
  updated_at: number;
  deleted_at: number | null;
}

export interface LocalCanvasStickyRecord {
  id: string;
  user_id: string;
  canvas_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  updated_at: number;
  deleted_at: number | null;
}
