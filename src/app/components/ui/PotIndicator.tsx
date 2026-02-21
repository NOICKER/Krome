import { useEffect, useState } from "react";
import { format } from "date-fns";
import { KromeDay, HistoryEntry } from "../../types";
import { cn } from "../ui/utils";

interface PotIndicatorProps {
    day: KromeDay;
    history: HistoryEntry[];
}

export function PotIndicator({ day, history }: PotIndicatorProps) {
    const [flash, setFlash] = useState(false);
    const [prevSpillCount, setPrevSpillCount] = useState(0);

    const todayISO = format(new Date(), "yyyy-MM-dd");
    const todayHistory = history.filter(h => h.dateISO === todayISO);

    let retainedCount = 0;
    let spilledCount = 0;

    todayHistory.forEach(h => {
        if (h.potResult === 'retained') retainedCount++;
        else if (h.potResult === 'spilled' || h.potSpilled) spilledCount++;
    });

    useEffect(() => {
        if (spilledCount > prevSpillCount) {
            setFlash(true);
            const timer = setTimeout(() => setFlash(false), 150);
            return () => clearTimeout(timer);
        }
        setPrevSpillCount(spilledCount);
    }, [spilledCount, prevSpillCount]);

    let valueColor = "text-amber-500";
    let borderColor = "border-slate-700";

    if (day.potValue > 0) {
        valueColor = "text-emerald-500";
        borderColor = "border-emerald-500/20";
    } else if (day.potValue < 0) {
        valueColor = "text-red-400";
        borderColor = "border-red-500/20";
    }

    return (
        <div className="fixed top-3 right-3 md:top-4 md:right-4 z-50 group outline-none">
            <div
                className={cn(
                    "relative bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border transition-all duration-300 shadow-lg cursor-help flex items-center space-x-2",
                    borderColor,
                    flash ? "border-amber-500 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : ""
                )}
            >
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Pot</span>
                <span className={cn("text-sm font-bold", valueColor)}>
                    {day.potValue > 0 ? `+${day.potValue}` : day.potValue}
                </span>

                {/* Tooltip on Hover */}
                <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 border border-slate-700 p-3 rounded-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 shadow-2xl origin-top-right z-50">
                    <p className="text-slate-300 text-xs leading-relaxed mb-2">
                        Retained sessions add <span className="text-emerald-400 font-bold">+10</span>. Abandoned sessions spill <span className="text-amber-500 font-bold">-20</span>.
                    </p>
                    <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-widest font-bold border-t border-slate-700 pt-2">
                        <span>{retainedCount} Retained</span>
                        <span>{spilledCount} Spilled</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
