import { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, ReferenceDot
} from "recharts";
import {
    getSubjectDistribution, getCategoryDistribution, getPotTrend,
    getStreakTrend, getSessionDurationDistribution, getAbandonFrequency
} from "../../services/analyticsService";
import { useKromeStore } from "../../hooks/useKrome";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";

// Colors requested in Phase 3
const COLORS = {
    emerald: "#62699D", // Study / Main accent
    slate: "#64748b",   // Reset / Neutral line
    amber: "#f59e0b",   // Distraction
    red: "#ef4444"      // Away / Spilled pot dot
};

function ChartCard({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full h-[300px] flex flex-col shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
            <h3 className="text-slate-300 font-display font-bold uppercase tracking-widest text-sm mb-4">{title}</h3>
            <div className="flex-1 w-full relative">
                {children}
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-60">
            <BarChart3 size={24} className="text-slate-500 mb-2" />
            <p className="text-slate-400 text-sm">Not enough data yet.</p>
        </div>
    );
}

// Custom minimal tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#080C18] border border-slate-800 p-3 rounded-lg shadow-xl">
                <p className="text-slate-300 text-xs font-bold mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-xs" style={{ color: entry.color }}>
                        {entry.name}: {entry.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function AnalyticsView() {
    const { state } = useKromeStore();
    const { history, settings } = state;

    // A) Time per Subject (Bar Chart)
    const [subjectData, setSubjectData] = useState<{ subject: string, minutes: number }[]>([]);

    // B) Category Distribution
    const [categoryData, setCategoryData] = useState<any[]>([]);

    // C) Pot Trend
    const [potData, setPotData] = useState<{ date: string, potValue: number, spilled: boolean }[]>([]);

    // D) Streak Trend
    const [streakData, setStreakData] = useState<{ date: string, streak: number }[]>([]);

    // E) Session Duration Histogram
    const [durationData, setDurationData] = useState<{ name: string, count: number }[]>([]);

    // F) Abandon Frequency
    const [abandonData, setAbandonData] = useState<{ date: string, completed: number, abandoned: number }[]>([]);

    useEffect(() => {
        // Fetch data
        setSubjectData(getSubjectDistribution());

        const cat = getCategoryDistribution();
        setCategoryData([
            { name: 'Study', value: cat.study, color: COLORS.emerald },
            { name: 'Reset', value: cat.reset, color: COLORS.slate },
            { name: 'Distraction', value: cat.distraction, color: COLORS.amber },
            { name: 'Away', value: cat.away, color: COLORS.red }
        ].filter(d => d.value > 0));

        setPotData(getPotTrend());
        setStreakData(getStreakTrend());
        setDurationData(getSessionDurationDistribution());
        setAbandonData(getAbandonFrequency());
    }, [history]); // Re-run when history changes

    const hasData = history.length > 0;

    return (
        <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-8">
            <div className="mb-2 min-w-0 max-w-full">
                <h2 className="text-2xl font-display font-bold tracking-tight text-slate-100 mb-2 truncate">Analytics</h2>
                <p className="text-slate-500 text-sm truncate">Review your historical patterns and distributions.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">

                {/* A) Time per Subject */}
                <ChartCard title="Time per Subject (Last 30 Days)">
                    {!hasData || subjectData.length === 0 ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={subjectData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="subject" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                                <Bar dataKey="minutes" fill={COLORS.emerald} radius={[4, 4, 0, 0]} name="Minutes" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* B) Category Distribution */}
                <ChartCard title="Category Distribution">
                    {!settings.strictMode ? (
                        <div className="flex justify-center items-center h-full text-center opacity-60">
                            <p className="text-slate-500 text-sm">Requires Strict Mode.</p>
                        </div>
                    ) : !hasData || categoryData.length === 0 ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* C) Pot Trend */}
                <ChartCard title="Pot Trend (14 Days)">
                    {!hasData ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={potData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="potValue" stroke={COLORS.emerald} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: COLORS.emerald, stroke: 'none' }} name="Pot Value" />
                                {potData.map((entry, index) =>
                                    entry.spilled ? (
                                        <ReferenceDot key={`dot-${index}`} x={entry.date} y={entry.potValue} r={4} fill={COLORS.red} stroke="none" />
                                    ) : null
                                )}
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* D) Streak Trend */}
                <ChartCard title="Streak Trend (14 Days)">
                    {!hasData ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={streakData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="stepAfter" dataKey="streak" stroke={COLORS.slate} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: COLORS.slate, stroke: 'none' }} name="Absolute Streak" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* E) Session Duration Histogram */}
                <ChartCard title="Session Duration Distribution">
                    {!hasData || durationData.every(d => d.count === 0) ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={durationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                                <Bar dataKey="count" fill={COLORS.slate} radius={[4, 4, 0, 0]} name="Sessions" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

                {/* F) Abandon Frequency */}
                <ChartCard title="Abandon Frequency (Last 7 Days)">
                    {!hasData ? <EmptyState /> : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={abandonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                                <Bar dataKey="completed" stackId="a" fill={COLORS.slate} name="Completed" />
                                <Bar dataKey="abandoned" stackId="a" fill={COLORS.amber} radius={[4, 4, 0, 0]} name="Abandoned" />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>

            </div>
        </div>
    );
}
