import { useEffect, useState } from "react";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import Play from "lucide-react/dist/esm/icons/play";
import PauseCircle from "lucide-react/dist/esm/icons/pause-circle";
import { Button } from "../ui/button";
import { Modal } from "../ui/Modal";
import { KromeSession } from "../../types";

interface InterruptTrackerProps {
  isOpen: boolean;
  session: KromeSession;
  onOpen: () => void;
  onClose: () => void;
  onPauseForInterrupt: (reason: string, type: "external" | "internal", notes?: string) => void;
  onResumeFromInterrupt: () => void;
}

const DEFAULT_REASON = "Unexpected interruption";

export function InterruptTracker({
  isOpen,
  session,
  onOpen,
  onClose,
  onPauseForInterrupt,
  onResumeFromInterrupt,
}: InterruptTrackerProps) {
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [type, setType] = useState<"external" | "internal">("external");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setReason(DEFAULT_REASON);
      setType("external");
      setNotes("");
    }
  }, [isOpen]);

  if (!session.isActive || (session.status !== "running" && !session.isInterrupted && !session.activeInterruptStartTime)) {
    return null;
  }

  const handleSubmit = () => {
    const nextReason = reason.trim();
    if (!nextReason) {
      return;
    }

    onPauseForInterrupt(nextReason, type, notes.trim() || undefined);
    onClose();
  };

  if (session.isInterrupted || session.activeInterruptStartTime) {
    return (
      <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em] text-amber-400">Interruption Logged</p>
          <p className="text-sm font-semibold text-slate-100">{session.activeInterruptReason ?? DEFAULT_REASON}</p>
          <p className="text-xs text-slate-400 mt-1">
            {session.activeInterruptType === "internal" ? "Internal" : "External"} interruption paused the timer.
          </p>
          <p className="text-xs text-slate-500 mt-1">Interrupted: {Math.round((session.interruptDuration ?? 0) / 60000)}m total</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onResumeFromInterrupt}
          className="bg-slate-800 text-slate-100 hover:bg-slate-700"
        >
          <Play size={16} />
          Resume Session
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 flex justify-center">
        <Button
          type="button"
          variant="ghost"
          onClick={onOpen}
          className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
        >
          <PauseCircle size={16} />
          Pause for Interrupt
        </Button>
      </div>

      <Modal isOpen={isOpen} onClose={onClose} title="Log Interruption">
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-[#080C18]/70 px-4 py-3 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-400 mt-0.5" />
            <p className="text-sm text-slate-400">
              Logging an interruption pauses the timer until you explicitly resume the session.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-slate-500">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="What interrupted this block?"
              className="w-full h-11 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-200 focus:outline-none focus:border-kromeAccent/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-slate-500">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(["external", "internal"] as const).map((entryType) => (
                <button
                  key={entryType}
                  type="button"
                  onClick={() => setType(entryType)}
                  className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
                    type === entryType
                      ? "border-kromeAccent bg-kromeAccent/10 text-kromeAccent"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {entryType === "external" ? "External" : "Internal"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-slate-500">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional context"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-kromeAccent/50 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200">
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} className="bg-kromeAccent text-white hover:bg-kromeAccent/85">
              Pause Session
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
