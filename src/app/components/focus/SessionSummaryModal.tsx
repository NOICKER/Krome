import { SessionSummary } from "../../types";
import { Modal } from "../ui/Modal";

interface SessionSummaryModalProps {
  summary: SessionSummary | null;
  onClose: () => void;
  onLogMistakeFromSession?: () => void;
}

function formatMinutes(durationMs: number) {
  return Math.round(durationMs / 60000);
}

export function SessionSummaryModal({ summary, onClose, onLogMistakeFromSession }: SessionSummaryModalProps) {
  if (!summary) {
    return null;
  }

  return (
    <Modal isOpen={Boolean(summary)} onClose={onClose} title="Session Summary">
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Subject</p>
          <p className="text-lg font-semibold text-slate-100 mt-1">{summary.subject || "Universal Focus"}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-800 bg-[#080C18]/70 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Focus</p>
            <p className="text-2xl font-semibold text-slate-100 mt-2">{formatMinutes(summary.actualFocusDurationMs)}m</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#080C18]/70 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Interrupt</p>
            <p className="text-2xl font-semibold text-slate-100 mt-2">{formatMinutes(summary.interruptDurationMs)}m</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-[#080C18]/70 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Protection</p>
            <p className="text-2xl font-semibold text-slate-100 mt-2">{Math.round(summary.protectionRatio * 100)}%</p>
          </div>
        </div>

        {summary.plannedDurationMs ? (
          <p className="text-sm text-slate-400">
            Planned duration: {formatMinutes(summary.plannedDurationMs)}m
          </p>
        ) : null}

        {onLogMistakeFromSession ? (
          <button
            type="button"
            onClick={onLogMistakeFromSession}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: 'var(--nt-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            Log a mistake from this session →
          </button>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-kromeAccent px-4 py-2 text-sm font-semibold text-white hover:bg-kromeAccent/85"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
