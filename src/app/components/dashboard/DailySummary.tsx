import { DailySummary as IDailySummary } from "../../services/analyticsService";

interface DailySummaryProps {
    summary: IDailySummary;
}

export function DailySummary({ summary }: DailySummaryProps) {
    return (
        <div className="bg-slate-900 border border-slate-800/50 p-6 rounded-2xl w-full shadow-lg shadow-black/30">
            <h2 className="text-lg font-display font-bold text-slate-100 mb-6 tracking-tight">Today's Focus</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mb-1">Claimed</span>
                    <span className="text-2xl sm:text-3xl font-bold font-mono text-kromeAccent">{summary.totalClaimedTime}m</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mb-1">Blocks</span>
                    <span className="text-2xl sm:text-3xl font-bold text-slate-200">{summary.blocksCompleted}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider mb-1">Abandoned</span>
                    <span className="text-2xl sm:text-3xl font-bold text-amber-500">{summary.abandonedSessions}</span>
                </div>
            </div>
        </div>
    );
}
