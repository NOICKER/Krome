import { KromeDay, KromeWeek } from "../../types";
import { getGoalProgressPercent, getGoalUnitLabel } from "../../utils/goalUtils";

interface GoalProgressBarsProps {
  day: KromeDay;
  week: KromeWeek;
}

function ProgressBar({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
}) {
  const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-100">
            {current}/{target}
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{unit}</p>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-kromeAccent transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function GoalProgressBars({ day, week }: GoalProgressBarsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ProgressBar
        label="Daily Goal"
        current={day.goalProgress.current}
        target={day.goalProgress.target}
        unit={getGoalUnitLabel(day.goalProgress.type)}
      />
      <ProgressBar
        label="Weekly Goal"
        current={week.goalProgress.current}
        target={week.goalProgress.target}
        unit={getGoalUnitLabel(week.goalProgress.type)}
      />
    </div>
  );
}
