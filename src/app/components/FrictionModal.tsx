import { useState } from "react";
import { Button } from "./ui/button";

interface FrictionModalProps {
    isEscalated: boolean; // Progressive escalation active
    totalBlocks: number;
    currentFilledBricks: number;
    onConfirm: (reason: string, note: string) => void;
    onCancel: () => void;
}

export const FRICTION_REASONS = [
    "Boredom / Restless",
    "Anxiety / Overwhelmed",
    "Distracted (Internal)",
    "Distracted (External/Interruption)",
    "Confused / Stuck",
    "Fatigue",
    "Completed early",
    "Other"
];

export function FrictionModal({ isEscalated, totalBlocks, currentFilledBricks, onConfirm, onCancel }: FrictionModalProps) {
    const [selectedReason, setSelectedReason] = useState("");
    const [customNote, setCustomNote] = useState("");

    // Escalation adds extra delays
    const [escalationStep, setEscalationStep] = useState(isEscalated ? 1 : 0);

    const handleConfirm = () => {
        if (isEscalated && escalationStep === 1) {
            setEscalationStep(2);
            return;
        }
        onConfirm(selectedReason || "Other", customNote);
    };

    return (
        <div className="space-y-6">
            {/* Brick visualization */}
            <div className="p-4 bg-slate-950 rounded-xl flex justify-center opacity-60 grayscale">
                <div className="flex gap-1 h-8 w-3/4">
                    {Array.from({ length: totalBlocks }).map((_, i) => (
                        <div key={i} className={`flex-1 rounded border ${i < currentFilledBricks ? 'bg-slate-400 border-slate-400' : 'bg-transparent border-slate-700'}`}></div>
                    ))}
                </div>
            </div>

            <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-slate-200">
                    You will lose these bricks.
                </p>
                <p className="text-xs text-slate-500 font-mono">
                    {currentFilledBricks} completed. {totalBlocks - currentFilledBricks} remaining.
                </p>
            </div>

            {escalationStep === 0 || escalationStep === 2 ? (
                <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Reason for abandoning:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {FRICTION_REASONS.map(reason => (
                            <button
                                key={reason}
                                onClick={() => setSelectedReason(reason)}
                                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors border ${selectedReason === reason
                                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                {reason}
                            </button>
                        ))}
                    </div>

                    <div className="pt-2">
                        <input
                            type="text"
                            placeholder="Additional note (optional)..."
                            value={customNote}
                            onChange={(e) => setCustomNote(e.target.value)}
                            maxLength={140}
                            className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-3 focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" className="flex-1" onClick={onCancel}>
                            Resume
                        </Button>
                        <Button variant="destructive" className="flex-1" onClick={handleConfirm} disabled={!selectedReason}>
                            Confirm Abandon
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 text-center py-4">
                    <p className="text-amber-500 font-medium">Progressive Escalation triggered.</p>
                    <p className="text-slate-300 text-sm">
                        You've been abandoning frequently. Take a breath. Are you sure you want to stop?
                    </p>
                    <div className="flex gap-3 pt-4">
                        <Button variant="default" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onCancel}>
                            Resume Session
                        </Button>
                        <Button variant="destructive" className="flex-1" onClick={handleConfirm}>
                            Yes, I'm sure
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
