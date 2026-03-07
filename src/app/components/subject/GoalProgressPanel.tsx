import Target from "lucide-react/dist/esm/icons/target";
import { GoalProgress } from "../../types";
import { AnalyticsCard } from "../analytics/AnalyticsCard";
import { getGoalUnitLabel } from "../../utils/goalUtils";

interface GoalProgressPanelProps {
  daily: GoalProgress;
  weekly: GoalProgress;
}

function ProgressRow({ label, progress }: { label: string; progress: GoalProgress }) {
  const percent = progress.target > 0 ? Math.min(100, Math.round((progress.current / progress.target) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
          <p className="text-lg font-semibold text-slate-100">
            {progress.current}/{progress.target}
          </p>
        </div>
        <p className="text-[11px] uppercase tracking-widest text-slate-500">{getGoalUnitLabel(progress.type)}</p>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-kromeAccent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function GoalProgressPanel({ daily, weekly }: GoalProgressPanelProps) {
  return (
    <AnalyticsCard title="Goal Progress" icon={Target}>
      <div className="space-y-5">
        <ProgressRow label="Daily" progress={daily} />
        <ProgressRow label="Weekly" progress={weekly} />
      </div>
    </AnalyticsCard>
  );
}
