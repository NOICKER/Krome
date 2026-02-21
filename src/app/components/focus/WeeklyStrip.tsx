import { format, subDays } from 'date-fns';
import { getHeatmapData } from '../../services/analyticsService';
import { ViewState } from '../../types';

interface WeeklyStripProps {
    onSetView?: (view: ViewState) => void;
}

export function WeeklyStrip({ onSetView }: WeeklyStripProps) {
    // Get data for current month (and previous if near start of month)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Basic approach: fetch heatmap data for current month (and prev if day < 7)
    let heatmapData = getHeatmapData(year, month);
    if (now.getDate() < 7) {
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        heatmapData = [...getHeatmapData(prevYear, prevMonth), ...heatmapData];
    }

    // Get last 7 days including today, chronological left to right
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(now, 6 - i));
    const daysData = last7Days.map(day => {
        const iso = format(day, 'yyyy-MM-dd');
        const data = heatmapData.find(d => d.date === iso);
        return {
            date: day,
            label: format(day, 'E'), // Sun, Mon, etc.
            status: data ? data.status : 'none'
        };
    });

    return (
        <div className="w-full max-w-[980px] mx-auto mt-2 flex justify-center">
            <div className="flex space-x-2 sm:space-x-3 md:space-x-4">
                {daysData.map((day, i) => {
                    // Color mapping
                    let bgClass = "bg-slate-800/50 border-slate-700"; // none or observed
                    if (day.status === 'retained') {
                        bgClass = "bg-emerald-500/20 border-emerald-500/50";
                    } else if (day.status === 'spilled') {
                        bgClass = "bg-amber-500/20 border-amber-500/50";
                    } else if (day.status === 'mixed') {
                        bgClass = "bg-gradient-to-br from-emerald-500/30 to-amber-500/30 border-slate-600";
                    }

                    return (
                        <button
                            key={i}
                            onClick={() => onSetView && onSetView('review')} // Routing to Review on click
                            className={`flex flex-col items-center justify-center w-10 h-10 sm:w-12 sm:h-12 border rounded-xl transition-colors hover:border-slate-500 ${bgClass}`}
                            title={format(day.date, 'MMM do')}
                        >
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {day.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
