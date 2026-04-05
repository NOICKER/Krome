export type DiagnosticsSeverity = "info" | "warning" | "error";

export interface DiagnosticsEvidenceEntry {
  timestamp: number;
  label: string;
  detail?: string;
}

export interface DiagnosticsIssue {
  id: string;
  dedupeKey: string;
  severity: DiagnosticsSeverity;
  title: string;
  summary: string;
  expected: string;
  observed: string;
  probableCause: string;
  evidence: DiagnosticsEvidenceEntry[];
  firstSeenAt: number;
  lastSeenAt: number;
  dismissedAt?: number;
}

export type DiagnosticsRuntimeEvent =
  | { type: "session_started"; timestamp: number; sessionId: string; soundEnabled: boolean; plipMinutes: number }
  | { type: "session_paused"; timestamp: number; sessionId: string; reason: string }
  | { type: "session_resumed"; timestamp: number; sessionId: string }
  | { type: "session_completed"; timestamp: number; sessionId: string }
  | { type: "session_abandoned"; timestamp: number; sessionId: string }
  | { type: "visibility_hidden"; timestamp: number }
  | { type: "visibility_visible"; timestamp: number }
  | { type: "audio_context_created"; timestamp: number; state: AudioContextState }
  | { type: "audio_resume_requested"; timestamp: number; contextLabel: string; state: AudioContextState }
  | { type: "audio_resume_succeeded"; timestamp: number; contextLabel: string; state: AudioContextState }
  | { type: "audio_resume_failed"; timestamp: number; contextLabel: string; message: string }
  | { type: "plips_scheduled"; timestamp: number; sessionId: string; count: number; startLeadSeconds: number }
  | { type: "plips_cancelled"; timestamp: number; sessionId?: string; reason: string; isSessionRunning?: boolean }
  | { type: "unexpected_plip_after_cancel"; timestamp: number; sessionId?: string; reason: string }
  | { type: "visual_loop_started"; timestamp: number; sessionId: string }
  | { type: "visual_loop_stopped"; timestamp: number; sessionId?: string; reason: string }
  | { type: "visual_tick_gap_detected"; timestamp: number; gapMs: number; expectedMaxGapMs: number; visibilityState: DocumentVisibilityState }
  | { type: "runtime_error"; timestamp: number; message: string; source?: string }
  | { type: "unhandled_rejection"; timestamp: number; message: string }
  | {
      type: "contract_violation";
      timestamp: number;
      dedupeKey: string;
      severity: DiagnosticsSeverity;
      title: string;
      summary: string;
      expected: string;
      observed: string;
      probableCause: string;
      evidenceLabel: string;
      evidenceDetail?: string;
    };

export interface DiagnosticsStoreState {
  enabled: boolean;
  events: DiagnosticsRuntimeEvent[];
  issues: DiagnosticsIssue[];
}
