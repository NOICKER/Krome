import { useEffect, useMemo, useState } from "react";
import type { DiagnosticsIssue, DiagnosticsStoreState } from "../../types/diagnostics";
import {
  dismissDiagnosticsIssue,
  getDiagnosticsState,
  recordDiagnosticsEvent,
  setDiagnosticsEnabled,
  subscribeToDiagnostics,
} from "../../services/diagnosticsService";
import { setSoundDiagnosticsReporter } from "../../utils/sound";
import { DiagnosticsChip } from "./DiagnosticsChip";
import { DiagnosticsDrawer } from "./DiagnosticsDrawer";

interface DiagnosticsHostProps {
  enabled: boolean;
}

function normalizeErrorMessage(reason: unknown) {
  if (reason instanceof Error) {
    return reason.message;
  }
  if (typeof reason === "string") {
    return reason;
  }
  try {
    return JSON.stringify(reason);
  } catch {
    return "Unknown rejection";
  }
}

export function DiagnosticsHost({ enabled }: DiagnosticsHostProps) {
  const [state, setState] = useState<DiagnosticsStoreState>(() => getDiagnosticsState());
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => subscribeToDiagnostics(setState), []);

  useEffect(() => {
    setDiagnosticsEnabled(enabled);
    if (!enabled) {
      setDrawerOpen(false);
      setSelectedIssueId(null);
    }
  }, [enabled]);

  useEffect(() => {
    setSoundDiagnosticsReporter(
      enabled
        ? (event) => {
            recordDiagnosticsEvent(event as any);
          }
        : null
    );
    return () => {
      setSoundDiagnosticsReporter(null);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    const handleRuntimeError = (event: ErrorEvent) => {
      recordDiagnosticsEvent({
        type: "runtime_error",
        timestamp: Date.now(),
        message: event.message || "Unknown runtime error",
        source: event.filename,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      recordDiagnosticsEvent({
        type: "unhandled_rejection",
        timestamp: Date.now(),
        message: normalizeErrorMessage(event.reason),
      });
    };

    const handleVisibilityChange = () => {
      recordDiagnosticsEvent({
        type: document.visibilityState === "hidden" ? "visibility_hidden" : "visibility_visible",
        timestamp: Date.now(),
      });
    };

    window.addEventListener("error", handleRuntimeError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("error", handleRuntimeError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled]);

  const visibleIssues = useMemo(
    () => state.issues.filter((issue) => !issue.dismissedAt).slice(0, 3),
    [state.issues]
  );

  const selectedIssue = useMemo<DiagnosticsIssue | null>(() => {
    if (!selectedIssueId) {
      return visibleIssues[0] ?? state.issues[0] ?? null;
    }
    return state.issues.find((issue) => issue.id === selectedIssueId) ?? visibleIssues[0] ?? state.issues[0] ?? null;
  }, [selectedIssueId, state.issues, visibleIssues]);

  useEffect(() => {
    if (!drawerOpen && visibleIssues.length > 0 && !selectedIssueId) {
      setSelectedIssueId(visibleIssues[0].id);
    }
  }, [drawerOpen, selectedIssueId, visibleIssues]);

  if (!enabled || (visibleIssues.length === 0 && !drawerOpen)) {
    return null;
  }

  return (
    <>
      {visibleIssues.length > 0 ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3">
          {visibleIssues.map((issue) => (
            <DiagnosticsChip
              key={issue.id}
              issue={issue}
              onDismiss={() => dismissDiagnosticsIssue(issue.id)}
              onOpen={() => {
                setSelectedIssueId(issue.id);
                setDrawerOpen(true);
              }}
            />
          ))}
        </div>
      ) : null}

      <DiagnosticsDrawer
        issue={selectedIssue}
        issues={state.issues}
        onDismissIssue={dismissDiagnosticsIssue}
        onOpenChange={setDrawerOpen}
        onSelectIssue={setSelectedIssueId}
        open={drawerOpen && !!selectedIssue}
      />
    </>
  );
}
