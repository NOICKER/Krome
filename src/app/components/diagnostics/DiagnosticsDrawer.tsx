import { useMemo } from "react";
import Copy from "lucide-react/dist/esm/icons/copy";
import X from "lucide-react/dist/esm/icons/x";
import { AnimatePresence, motion } from "motion/react";
import type { DiagnosticsIssue } from "../../types/diagnostics";
import { cn } from "../ui/utils";

interface DiagnosticsDrawerProps {
  issue: DiagnosticsIssue | null;
  issues: DiagnosticsIssue[];
  onDismissIssue: (issueId: string) => void;
  onOpenChange: (open: boolean) => void;
  onSelectIssue: (issueId: string) => void;
  open: boolean;
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildIssueSnapshot(issue: DiagnosticsIssue) {
  return [
    `Title: ${issue.title}`,
    `Severity: ${issue.severity}`,
    `Summary: ${issue.summary}`,
    `Expected: ${issue.expected}`,
    `Observed: ${issue.observed}`,
    `Probable Cause: ${issue.probableCause}`,
    "Evidence:",
    ...issue.evidence.map((entry) => `- ${formatTimestamp(entry.timestamp)} ${entry.label}${entry.detail ? ` — ${entry.detail}` : ""}`),
  ].join("\n");
}

export function DiagnosticsDrawer({
  issue,
  issues,
  onDismissIssue,
  onOpenChange,
  onSelectIssue,
  open,
}: DiagnosticsDrawerProps) {
  const visibleIssues = useMemo(() => issues.filter((entry) => !entry.dismissedAt), [issues]);

  const handleCopyIssue = async () => {
    if (!issue || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(buildIssueSnapshot(issue));
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[75] bg-[#080C18]/55 backdrop-blur-sm"
            aria-label="Close diagnostics panel"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed right-0 top-0 z-[80] flex h-screen w-[min(100vw,30rem)] flex-col border-l border-slate-800 bg-[#050915] text-slate-100 shadow-2xl"
          >
            <div className="border-b border-slate-800 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-100">{issue?.title ?? "Diagnostics"}</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {issue?.summary ?? "Select an issue chip to inspect runtime evidence."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded-full border border-slate-700 p-2 text-slate-400 transition hover:border-slate-600 hover:text-slate-100"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {visibleIssues.length > 1 ? (
                <section className="mb-6">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Active Issues</p>
                  <div className="space-y-2">
                    {visibleIssues.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => onSelectIssue(entry.id)}
                        className={cn(
                          "w-full rounded-2xl border px-3 py-3 text-left transition",
                          issue?.id === entry.id
                            ? "border-kromeAccent/40 bg-kromeAccent/10"
                            : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                        )}
                      >
                        <p className="text-sm font-medium text-slate-100">{entry.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{entry.summary}</p>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {issue ? (
                <div className="space-y-6">
                  <section>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Expected Behavior</p>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                      {issue.expected}
                    </div>
                  </section>

                  <section>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Observed Behavior</p>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                      {issue.observed}
                    </div>
                  </section>

                  <section>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Why This Is Likely Breaking</p>
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
                      {issue.probableCause}
                    </div>
                  </section>

                  <section>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Evidence Timeline</p>
                      <button
                        type="button"
                        onClick={() => onDismissIssue(issue.id)}
                        className="rounded-full border border-slate-700 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300 transition hover:border-slate-600 hover:text-slate-100"
                      >
                        Dismiss Chip
                      </button>
                    </div>
                    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      {issue.evidence.map((entry, index) => (
                        <div key={`${entry.timestamp}-${index}`} className="border-l border-slate-700 pl-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{formatTimestamp(entry.timestamp)}</p>
                          <p className="mt-1 text-sm text-slate-100">{entry.label}</p>
                          {entry.detail ? <p className="mt-1 text-sm text-slate-400">{entry.detail}</p> : null}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                  Diagnostics mode is on, but there are no active issues right now.
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 px-5 py-4">
              <button
                type="button"
                onClick={() => void handleCopyIssue()}
                disabled={!issue}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy size={14} />
                Copy Snapshot
              </button>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
