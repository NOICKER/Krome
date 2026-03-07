import { useEffect, useState } from "react";
import { KromeSubject, WeeklyPlan } from "../../types";
import { Modal } from "../ui/Modal";

interface WeeklyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: KromeSubject[];
  weekStartDate: string;
  unitLabel: string;
  existingPlan: WeeklyPlan | null;
  onSave: (plan: Omit<WeeklyPlan, "id"> & { id?: string }) => void;
}

export function WeeklyPlanModal({
  isOpen,
  onClose,
  subjects,
  weekStartDate,
  unitLabel,
  existingPlan,
  onSave,
}: WeeklyPlanModalProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [strategyNotes, setStrategyNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const nextAllocations = subjects.reduce<Record<string, number>>((acc, subject) => {
      acc[subject.id] = existingPlan?.allocations[subject.id] ?? 0;
      return acc;
    }, {});

    setAllocations(nextAllocations);
    setStrategyNotes(existingPlan?.strategyNotes ?? "");
  }, [existingPlan, isOpen, subjects]);

  const handleSave = () => {
    onSave({
      id: existingPlan?.id,
      weekStartDate,
      allocations,
      strategyNotes: strategyNotes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Weekly Plan">
      <div className="space-y-5">
        <p className="text-sm text-slate-400">
          Set a deliberate weekly allocation for each subject. Units follow your current weekly goal mode.
        </p>

        <div className="space-y-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100">{subject.name}</p>
              </div>
              <input
                type="number"
                min={0}
                value={allocations[subject.id] ?? 0}
                onChange={(event) =>
                  setAllocations((prev) => ({
                    ...prev,
                    [subject.id]: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
                className="w-24 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-kromeAccent/50"
              />
              <span className="text-xs uppercase tracking-widest text-slate-500">{unitLabel}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest text-slate-500">Strategy Notes</label>
          <textarea
            rows={4}
            value={strategyNotes}
            onChange={(event) => setStrategyNotes(event.target.value)}
            placeholder="What needs protection this week?"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-kromeAccent/50 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-200">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-kromeAccent px-4 py-2 text-sm font-semibold text-white hover:bg-kromeAccent/85"
          >
            Save Plan
          </button>
        </div>
      </div>
    </Modal>
  );
}
