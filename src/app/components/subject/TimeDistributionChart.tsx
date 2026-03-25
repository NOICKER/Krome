import { ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis, BarChart, Bar } from "recharts";
import Clock3 from "lucide-react/dist/esm/icons/clock-3";
import { AnalyticsCard } from "../analytics/AnalyticsCard";

interface TimeDistributionChartProps {
  data: { label: string; focusMinutes: number; interruptMinutes: number }[];
}

export function TimeDistributionChart({ data }: TimeDistributionChartProps) {
  return (
    <AnalyticsCard title="Time Distribution" icon={Clock3} isEmpty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Bar dataKey="focusMinutes" stackId="a" fill="#62699D" radius={[4, 4, 0, 0]} />
          <Bar dataKey="interruptMinutes" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}
