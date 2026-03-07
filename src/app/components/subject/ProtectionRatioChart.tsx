import Shield from "lucide-react/dist/esm/icons/shield";
import { ResponsiveContainer, CartesianGrid, Tooltip, XAxis, YAxis, LineChart, Line } from "recharts";
import { AnalyticsCard } from "../analytics/AnalyticsCard";

interface ProtectionRatioChartProps {
  data: { label: string; ratio: number }[];
}

export function ProtectionRatioChart({ data }: ProtectionRatioChartProps) {
  return (
    <AnalyticsCard title="Protection Ratio" icon={Shield} isEmpty={data.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 12 }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Line type="monotone" dataKey="ratio" stroke="#62699D" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </AnalyticsCard>
  );
}
