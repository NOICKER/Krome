import type {
  DiagnosticsIssue,
  DiagnosticsRuntimeEvent,
  DiagnosticsStoreState,
} from "../types/diagnostics";

const MAX_STORED_EVENTS = 120;
const MAX_STORED_ISSUES = 20;

type DiagnosticsListener = (state: DiagnosticsStoreState) => void;

function createIssueFromEvent(event: DiagnosticsRuntimeEvent): DiagnosticsIssue | null {
  switch (event.type) {
    case "contract_violation":
      return {
        id: event.dedupeKey,
        dedupeKey: event.dedupeKey,
        severity: event.severity,
        title: event.title,
        summary: event.summary,
        expected: event.expected,
        observed: event.observed,
        probableCause: event.probableCause,
        evidence: [
          {
            timestamp: event.timestamp,
            label: event.evidenceLabel,
            detail: event.evidenceDetail,
          },
        ],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
      };
    case "audio_resume_failed":
      return {
        id: `audio_resume_failed:${event.contextLabel}`,
        dedupeKey: `audio_resume_failed:${event.contextLabel}`,
        severity: "error",
        title: "Audio context failed to resume",
        summary: `The app could not resume audio during ${event.contextLabel}.`,
        expected: "The audio context should resume before immediate or scheduled sounds are played.",
        observed: event.message,
        probableCause: "The browser, OS, or output device blocked audio resume at the moment playback was requested.",
        evidence: [
          {
            timestamp: event.timestamp,
            label: "Audio resume failed.",
            detail: event.message,
          },
        ],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
      };
    case "visual_tick_gap_detected":
      return {
        id: "visual_tick_gap_detected",
        dedupeKey: "visual_tick_gap_detected",
        severity: "warning",
        title: "Visual session updates stalled",
        summary: "The visible session UI stopped repainting for longer than expected.",
        expected: `Visible session updates should continue within ${event.expectedMaxGapMs}ms.`,
        observed: `Observed a ${Math.round(event.gapMs)}ms gap while the page was ${event.visibilityState}.`,
        probableCause: "The browser delayed rendering work, or the app was too busy to keep the visual clock current.",
        evidence: [
          {
            timestamp: event.timestamp,
            label: "Large visible-frame gap detected.",
            detail: `${Math.round(event.gapMs)}ms gap`,
          },
        ],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
      };
    case "plips_cancelled":
      if (!event.isSessionRunning) {
        return null;
      }

      return {
        id: "plip_scheduler_cancelled_while_running",
        dedupeKey: "plip_scheduler_cancelled_while_running",
        severity: "error",
        title: "Plip scheduler cancelled unexpectedly",
        summary: "Future plips disappeared during an active running session.",
        expected: "Running sessions with sound enabled should retain future scheduled plips.",
        observed: `The scheduler was cancelled while the session was still running. Reason: ${event.reason}.`,
        probableCause: "A lifecycle cleanup or re-subscribe path cancelled the scheduler too early.",
        evidence: [
          {
            timestamp: event.timestamp,
            label: "Scheduler cancelled while session remained active.",
            detail: event.reason,
          },
        ],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
      };
    case "unexpected_plip_after_cancel":
      return {
        id: "unexpected_plip_after_cancel",
        dedupeKey: "unexpected_plip_after_cancel",
        severity: "error",
        title: "Plip fired after cancellation",
        summary: "Audio playback continued after the session scheduler was cancelled.",
        expected: "Cancelling future plips should silence any unsounded session plips immediately.",
        observed: event.reason,
        probableCause: "A deferred scheduler callback or resume path outlived the session cancellation boundary.",
        evidence: [
          {
            timestamp: event.timestamp,
            label: "Unexpected post-cancel plip detected.",
            detail: event.reason,
          },
        ],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
      };
    case "runtime_error":
      return {
        id: `runtime_error:${event.message}`,
        dedupeKey: `runtime_error:${event.message}`,
        severity: "error",
        title: "Unhandled runtime error",
        summary: event.message,
        expected: "The app should not throw uncaught runtime errors during normal use.",
        observed: event.source ? `${event.message} (${event.source})` : event.message,
        probableCause: "An uncaught exception reached the global window error handler.",
        evidence: [
          {
            timestamp: event.timestamp,
            label: "Global runtime error captured.",
            detail: event.source,
          },
        ],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
      };
    case "unhandled_rejection":
      return {
        id: `unhandled_rejection:${event.message}`,
        dedupeKey: `unhandled_rejection:${event.message}`,
        severity: "error",
        title: "Unhandled promise rejection",
        summary: event.message,
        expected: "Promise failures should be handled or surfaced intentionally.",
        observed: event.message,
        probableCause: "An async code path rejected without a local handler.",
        evidence: [
          {
            timestamp: event.timestamp,
            label: "Unhandled rejection captured.",
          },
        ],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
      };
    default:
      return null;
  }
}

function upsertIssue(issues: DiagnosticsIssue[], issue: DiagnosticsIssue) {
  const existingIndex = issues.findIndex((entry) => entry.dedupeKey === issue.dedupeKey);
  if (existingIndex === -1) {
    return [issue, ...issues].slice(0, MAX_STORED_ISSUES);
  }

  const existing = issues[existingIndex];
  const nextIssue: DiagnosticsIssue = {
    ...existing,
    severity: issue.severity,
    title: issue.title,
    summary: issue.summary,
    expected: issue.expected,
    observed: issue.observed,
    probableCause: issue.probableCause,
    lastSeenAt: issue.lastSeenAt,
    evidence: [...existing.evidence, ...issue.evidence].slice(-10),
  };

  if (existing.dismissedAt) {
    nextIssue.dismissedAt = undefined;
  }

  const nextIssues = issues.slice();
  nextIssues.splice(existingIndex, 1);
  return [nextIssue, ...nextIssues];
}

export function createDiagnosticsStore() {
  let state: DiagnosticsStoreState = {
    enabled: false,
    events: [],
    issues: [],
  };
  const listeners = new Set<DiagnosticsListener>();

  const emit = () => {
    const snapshot = {
      enabled: state.enabled,
      events: [...state.events],
      issues: state.issues.map((issue) => ({
        ...issue,
        evidence: [...issue.evidence],
      })),
    };
    listeners.forEach((listener) => listener(snapshot));
  };

  return {
    getState() {
      return {
        enabled: state.enabled,
        events: [...state.events],
        issues: state.issues.map((issue) => ({
          ...issue,
          evidence: [...issue.evidence],
        })),
      };
    },
    setEnabled(enabled: boolean) {
      state = enabled
        ? {
            enabled: true,
            events: [],
            issues: [],
          }
        : {
            enabled: false,
            events: [],
            issues: [],
          };
      emit();
    },
    record(event: DiagnosticsRuntimeEvent) {
      if (!state.enabled) {
        return;
      }

      state = {
        ...state,
        events: [...state.events, event].slice(-MAX_STORED_EVENTS),
      };

      const issue = createIssueFromEvent(event);
      if (issue) {
        state = {
          ...state,
          issues: upsertIssue(state.issues, issue),
        };
      }

      emit();
    },
    dismissIssue(issueId: string) {
      if (!state.enabled) {
        return;
      }

      state = {
        ...state,
        issues: state.issues.map((issue) =>
          issue.id === issueId ? { ...issue, dismissedAt: Date.now() } : issue
        ),
      };
      emit();
    },
    getIssues() {
      return state.issues.map((issue) => ({
        ...issue,
        evidence: [...issue.evidence],
      }));
    },
    getVisibleIssues() {
      return state.issues
        .filter((issue) => !issue.dismissedAt)
        .map((issue) => ({
          ...issue,
          evidence: [...issue.evidence],
        }));
    },
    subscribe(listener: DiagnosticsListener) {
      listeners.add(listener);
      listener(this.getState());

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

const diagnosticsStore = createDiagnosticsStore();

export function setDiagnosticsEnabled(enabled: boolean) {
  diagnosticsStore.setEnabled(enabled);
}

export function recordDiagnosticsEvent(event: DiagnosticsRuntimeEvent) {
  diagnosticsStore.record(event);
}

export function dismissDiagnosticsIssue(issueId: string) {
  diagnosticsStore.dismissIssue(issueId);
}

export function getDiagnosticsState() {
  return diagnosticsStore.getState();
}

export function getVisibleDiagnosticsIssues() {
  return diagnosticsStore.getVisibleIssues();
}

export function subscribeToDiagnostics(listener: DiagnosticsListener) {
  return diagnosticsStore.subscribe(listener);
}
