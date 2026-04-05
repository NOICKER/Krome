import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import Bug from "lucide-react/dist/esm/icons/bug";
import CircleAlert from "lucide-react/dist/esm/icons/circle-alert";
import X from "lucide-react/dist/esm/icons/x";
import type { DiagnosticsIssue } from "../../types/diagnostics";
import { cn } from "../ui/utils";

interface DiagnosticsChipProps {
  issue: DiagnosticsIssue;
  onDismiss: () => void;
  onOpen: () => void;
}

function formatIssueAge(lastSeenAt: number) {
  const deltaSeconds = Math.max(0, Math.round((Date.now() - lastSeenAt) / 1000));
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }

  const minutes = Math.floor(deltaSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function DiagnosticsChip({ issue, onDismiss, onOpen }: DiagnosticsChipProps) {
  const Icon = issue.severity === "error" ? CircleAlert : issue.severity === "warning" ? AlertTriangle : Bug;
  const severityClasses =
    issue.severity === "error"
      ? "border-rose-500/30 bg-rose-950/90 text-rose-100"
      : issue.severity === "warning"
        ? "border-amber-500/30 bg-amber-950/90 text-amber-100"
        : "border-sky-500/30 bg-sky-950/90 text-sky-100";

  return (
    <div className={cn("pointer-events-auto overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md", severityClasses)}>
      <div className="flex items-start gap-3 p-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className="mt-0.5 rounded-xl bg-black/20 p-2">
            <Icon size={16} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{issue.title}</span>
            <span className="mt-1 block text-xs opacity-90">{issue.summary}</span>
            <span className="mt-2 block text-[11px] uppercase tracking-[0.18em] opacity-60">
              {formatIssueAge(issue.lastSeenAt)}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1 opacity-70 transition hover:bg-black/20 hover:opacity-100"
          aria-label={`Dismiss ${issue.title}`}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
