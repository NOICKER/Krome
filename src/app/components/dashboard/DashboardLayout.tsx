import { useEffect, useState } from "react";
import { format } from "date-fns";
import { DashboardHeader } from "./DashboardHeader";
import { SubjectCard } from "./SubjectCard";
import { DailySummary } from "./DailySummary";
import { Heatmap } from "./Heatmap";
import { ObservationPanel } from "./ObservationPanel";
import { MilestoneWidget } from "./MilestoneWidget";
import { TaskPanel } from "./TaskPanel";
import { SubjectManager } from "./SubjectManager";

import { useKrome } from "../../hooks/useKrome";
import { getSubjects } from "../../services/subjectService";
import { getTodaySummary, getHeatmapData, getAdvancedObservations } from "../../services/analyticsService";

export function DashboardLayout() {
    const { state } = useKrome();
    const { streak, day, settings, session, history } = state;
    const todayISO = format(new Date(), "yyyy-MM-dd");
    const dateStr = format(new Date(), "EEEE, MMMM do");

    const [subjects, setSubjects] = useState(getSubjects());
    const [summary, setSummary] = useState(getTodaySummary(todayISO));
    const [heatmap, setHeatmap] = useState(getHeatmapData(new Date().getFullYear(), new Date().getMonth()));
    const [observations, setObservations] = useState(getAdvancedObservations());

    const refreshData = () => {
        setSubjects(getSubjects());
        setSummary(getTodaySummary(todayISO));
        setHeatmap(getHeatmapData(new Date().getFullYear(), new Date().getMonth()));
        setObservations(getAdvancedObservations());
    };

    useEffect(() => {
        refreshData();
    }, [history]);

    return (
        <div className="w-full h-full flex flex-col p-4 md:p-8 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800">
            <DashboardHeader
                date={dateStr}
                streak={streak.current}
                potValue={day.potValue || 0}
                strictMode={settings.strictMode || false}
                isActive={session.isActive}
            />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-7xl mx-auto">

                {/* Left: Subjects */}
                <div className="md:col-span-3 flex flex-col space-y-4">
                    <h3 className="text-slate-300 font-bold uppercase tracking-widest text-sm mb-2">Subjects</h3>
                    {subjects.length === 0 ? (
                        <p className="text-slate-500 text-sm">Create a subject to begin organizing sessions.</p>
                    ) : (
                        subjects.map(sub => {
                            const subHistory = history.filter(h => h.dateISO === todayISO && h.subject === sub.name);
                            const blocks = subHistory.filter(h => h.completed).length;
                            const mins = subHistory.reduce((acc, h) => acc + (h.durationMs / 60000), 0);
                            const last = subHistory.length > 0 ? format(subHistory[0].startedAt, "HH:mm") : null;

                            return <SubjectCard
                                key={sub.id}
                                subject={sub}
                                blocksToday={blocks}
                                minutesToday={Math.floor(mins)}
                                lastSessionTime={last}
                            />;
                        })
                    )}

                    <div className="pt-4 border-t border-slate-800/50">
                        <SubjectManager onSubjectsChange={refreshData} />
                    </div>
                </div>

                {/* Center: Main Analytics */}
                <div className="md:col-span-5 flex flex-col space-y-6">
                    <DailySummary summary={summary} />
                    <Heatmap data={heatmap} />
                </div>

                {/* Right: Observations, Milestones & Tasks */}
                <div className="md:col-span-4 flex flex-col space-y-6">
                    <ObservationPanel observations={observations} />
                    <MilestoneWidget />
                    <TaskPanel />
                </div>

            </div>
        </div>
    );
}
