import { KromeWeek } from "../../types";
import { getGoalProgressPercent, getGoalUnitLabel } from "../../utils/goalUtils";

interface WeeklyProgressMapProps {
  week: KromeWeek;
  dailyProgress: { date: string; label: string; blocksCompleted: number; minutesFocused: number; current: number }[];
}

export function WeeklyProgressMap({ week, dailyProgress }: WeeklyProgressMapProps) {
  const progress = getGoalProgressPercent(week.goalProgress);
  const unitLabel = getGoalUnitLabel(week.goalProgress.type);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-display font-bold uppercase tracking-widest text-slate-300">Weekly Progress</p>
          <p className="text-xs text-slate-500 mt-1">Week of {week.weekStartDate}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-slate-100">{week.goalProgress.current}/{week.goalProgress.target}</p>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{unitLabel}</p>
        </div>
      </div>

      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-kromeAccent transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dailyProgress.map((entry) => {
          const height = Math.max(16, Math.min(64, entry.current * 14));
          return (
            <div key={entry.date} className="rounded-xl border border-slate-800 bg-[#080C18]/70 px-2 py-3 text-center">
              <div className="h-16 flex items-end justify-center">
                <div className="w-6 rounded-full bg-kromeAccent/80" style={{ height }} />
              </div>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 mt-3">{entry.label}</p>
              <p className="text-sm font-semibold text-slate-100 mt-1">{entry.current}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
