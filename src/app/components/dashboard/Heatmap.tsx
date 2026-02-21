import { cn } from "../ui/utils";

export interface HeatmapDay {
    date: string;
    status: 'none' | 'retained' | 'spilled' | 'mixed' | 'observed';
    sessionCount: number;
    blocks: number;
    abandonedCount: number;
    potResult: string;
}

interface HeatmapProps {
    data: HeatmapDay[];
}

export function Heatmap({ data }: HeatmapProps) {
    if (data.length === 0) return null;
    const firstDate = new Date(data[0].date);
    const monthName = firstDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="bg-slate-900 border border-slate-800/50 p-6 rounded-2xl w-full flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-100 tracking-tight">Activity Heatmap</h2>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{monthName}</span>
            </div>

            <div className="flex flex-wrap gap-2 flex-1 content-start">
                {data.map((day) => {
                    let bgColor = "bg-slate-800";
                    if (day.status === 'retained') bgColor = "bg-emerald-500/80";
                    if (day.status === 'spilled') bgColor = "bg-amber-500/80 hover:bg-amber-400"; // Changed to Amber per prompt
                    if (day.status === 'mixed') bgColor = "bg-gradient-to-br from-emerald-500/80 to-amber-500/80"; // Mixed visual
                    if (day.status === 'observed') bgColor = "bg-blue-500/80";

                    return (
                        <div
                            key={day.date}
                            className={cn("w-6 h-6 rounded-sm transition-colors relative group cursor-help", bgColor)}
                        >
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 border border-slate-700 p-3 rounded-xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 shadow-2xl z-50">
                                <p className="text-slate-200 text-xs font-bold mb-1 border-b border-slate-700 pb-1">{day.date}</p>
                                <div className="space-y-1 mt-2">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest flex justify-between">
                                        <span>Blocks:</span> <span className="text-slate-200 font-bold">{day.blocks}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest flex justify-between">
                                        <span>Abandoned:</span> <span className="text-slate-200 font-bold">{day.abandonedCount}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest flex justify-between">
                                        <span>Pot Result:</span>
                                        <span className={cn(
                                            "font-bold",
                                            day.status === 'retained' ? "text-emerald-400" : day.status === 'spilled' ? "text-amber-500" : "text-slate-300"
                                        )}>
                                            {day.potResult}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="mt-6 border-t border-slate-800/50 pt-4 flex flex-wrap gap-x-4 gap-y-2">
                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-slate-800" /><span className="text-[10px] text-slate-500 uppercase font-bold">No session</span></div>
                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" /><span className="text-[10px] text-slate-500 uppercase font-bold">Retained</span></div>
                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-500/80" /><span className="text-[10px] text-slate-500 uppercase font-bold">Spilled</span></div>
                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500/80" /><span className="text-[10px] text-slate-500 uppercase font-bold">Observed</span></div>
                <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-br from-emerald-500/80 to-amber-500/80" /><span className="text-[10px] text-slate-500 uppercase font-bold">Mixed</span></div>
            </div>
        </div>
    );
}
