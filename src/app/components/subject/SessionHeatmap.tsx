import Grid2x2 from "lucide-react/dist/esm/icons/grid-2x2";
import { AnalyticsCard } from "../analytics/AnalyticsCard";

interface SessionHeatmapProps {
  data: { date: string; completedCount: number; averageProtection: number }[];
}

export function SessionHeatmap({ data }: SessionHeatmapProps) {
  return (
    <AnalyticsCard title="Session Heatmap" icon={Grid2x2} isEmpty={data.length === 0}>
      <div className="flex flex-wrap gap-2">
        {data.map((entry) => {
          const intensity =
            entry.completedCount === 0
              ? "bg-slate-800"
              : entry.averageProtection >= 80
                ? "bg-kromeAccent/80"
                : entry.averageProtection >= 60
                  ? "bg-blue-500/80"
                  : "bg-amber-500/80";

          return (
            <div key={entry.date} className={`group relative h-6 w-6 rounded-sm ${intensity}`}>
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-40 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900 p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-[11px] font-bold text-slate-200">{entry.date}</p>
                <p className="text-[10px] text-slate-500">{entry.completedCount} completed</p>
                <p className="text-[10px] text-slate-500">{entry.averageProtection}% protection</p>
              </div>
            </div>
          );
        })}
      </div>
    </AnalyticsCard>
  );
}
