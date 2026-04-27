import { useMemo, useState } from "react";
import { format } from "date-fns";
import { DashboardHeader } from "./DashboardHeader";
import { SubjectCard } from "./SubjectCard";
import { GoalProgressBars } from "./GoalProgressBars";
import { InsightCard } from "./InsightCard";
import { DailySummary } from "./DailySummary";
import { Heatmap } from "./Heatmap";
import { ObservationPanel } from "./ObservationPanel";
import { MilestoneWidget } from "./MilestoneWidget";
import { TaskPanel } from "./TaskPanel";
import { SubjectManager } from "./SubjectManager";
import { WeeklyPlanModal } from "./WeeklyPlanModal";

import { useKromeStore } from "../../hooks/useKrome";
import { getTodaySummary, getHeatmapData, getAdvancedObservations } from "../../services/analyticsService";
import { resolveSettings } from "../../services/subjectService";
import { getGoalMetricValue, getGoalUnitLabel, normalizeGoalProgress } from "../../utils/goalUtils";

export function DashboardLayout() {
    const { state, actions } = useKromeStore();
    const { streak, day, week, settings, session, history, subjects, insightFlashcards, notifications, weeklyPlan } = state;
    const visibleSubjects = subjects.filter((subject) => !subject.archived);
    const todayISO = format(new Date(), "yyyy-MM-dd");
    const dateStr = format(new Date(), "EEEE, MMMM do");
    const [isWeeklyPlanOpen, setIsWeeklyPlanOpen] = useState(false);
    const unreadNotifications = notifications.filter((entry) => !entry.read).slice(0, 3);
    const weekUnitLabel = getGoalUnitLabel(week.goalProgress.type);
    const summary = useMemo(() => getTodaySummary(todayISO), [todayISO, history]);
    const heatmap = useMemo(
        () => getHeatmapData(new Date().getFullYear(), new Date().getMonth()),
        [history]
    );
    const observations = useMemo(() => getAdvancedObservations(), [history]);

    return (
        <div className="w-full min-h-full flex flex-col">
            {/* Header sits outside the scrolling container so it never scrolls away */}
            <div className="sticky top-0 z-10 hidden flex-shrink-0 bg-[#080C18]/95 px-8 pb-4 pt-8 backdrop-blur-md md:block">
                <DashboardHeader
                    date={dateStr}
                    streak={streak.current}
                    potValue={day.potValue || 0}
                    strictMode={settings.strictMode || false}
                    isActive={session.isActive}
                />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-hidden p-4 md:px-8 md:pb-8">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-7xl mx-auto">
                    <div className="md:col-span-12 space-y-6">
                        <GoalProgressBars day={day} week={week} />

                        {insightFlashcards.length > 0 ? (
                            <section className="space-y-3">
                                <div>
                                    <h3 className="text-slate-300 font-display font-bold uppercase tracking-widest text-sm">Insight Engine</h3>
                                    <p className="text-slate-500 text-xs mt-1">Deterministic pattern detection with rendered guidance.</p>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {insightFlashcards.map((card) => (
                                        <InsightCard
                                            key={card.id}
                                            card={card}
                                            subject={card.relevantSubjectId ? visibleSubjects.find((subject) => subject.id === card.relevantSubjectId) : undefined}
                                        />
                                    ))}
                                </div>
                            </section>
                        ) : null}
                    </div>

                    {/* Left: Subjects */}
                    <div className="md:col-span-3 flex flex-col space-y-4">
                        <h3 className="text-slate-300 font-display font-bold uppercase tracking-widest text-sm mb-2">Subjects</h3>
                        {visibleSubjects.length === 0 ? (
                            <p className="text-slate-500 text-sm">Create a subject to begin organizing sessions.</p>
                        ) : (
                            visibleSubjects.map(sub => {
                                const subHistory = history.filter(entry => (
                                    entry.dateISO === todayISO &&
                                    (entry.subjectId === sub.id || (!entry.subjectId && entry.subject === sub.name))
                                ));
                                const allSubjectHistory = history.filter(entry => (
                                    entry.subjectId === sub.id || (!entry.subjectId && entry.subject === sub.name)
                                ));
                                const blocks = subHistory.filter(h => h.completed).length;
                                const mins = subHistory.reduce((acc, h) => acc + (h.durationMs / 60000), 0);
                                const last = allSubjectHistory.length > 0 ? format(allSubjectHistory[0].startedAt, "HH:mm") : null;
                                const goalProgress = normalizeGoalProgress(sub.settings?.dailyGoal, settings.dailyGoalProgress);
                                const goalCurrent = getGoalMetricValue(goalProgress, { blocks, minutes: Math.floor(mins) });
                                const subjectResolvedSettings = resolveSettings(settings, sub.id, visibleSubjects);

                                return <SubjectCard
                                    key={sub.id}
                                    subject={sub as any}
                                    blocksToday={blocks}
                                    minutesToday={Math.floor(mins)}
                                    lastSessionTime={last}
                                    goalProgress={goalProgress}
                                    goalCurrent={goalCurrent}
                                    sessionMinutes={subjectResolvedSettings.sessionMinutes}
                                    strictMode={subjectResolvedSettings.strictMode}
                                    startDisabled={session.isActive}
                                    onOpenDetails={(subject) => actions.setSubjectView(subject.id)}
                                    onStart={(subject) => actions.startSession({ id: subject.id, name: subject.name }, { lockSubject: true })}
                                    onDelete={actions.deleteSubjectDeep}
                                />;
                            })
                        )}

                        <div className="pt-4 border-t border-slate-800/50">
                            <SubjectManager />
                        </div>
                    </div>

                    {/* Center: Main Analytics */}
                    <div className="md:col-span-5 flex flex-col space-y-6">
                        <DailySummary summary={summary} />
                        <Heatmap data={heatmap} />
                    </div>

                    {/* Right: Observations, Milestones & Tasks */}
                    <div className="md:col-span-4 flex flex-col space-y-6">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-slate-300 font-display font-bold uppercase tracking-widest text-sm">Weekly Plan</h3>
                                    <p className="text-xs text-slate-500 mt-1">Allocate this week before it drifts.</p>
                                </div>
                                <button
                                    onClick={() => setIsWeeklyPlanOpen(true)}
                                    className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-300 hover:border-kromeAccent/40 hover:text-kromeAccent"
                                >
                                    {weeklyPlan ? "Edit Plan" : "Create Plan"}
                                </button>
                            </div>
                            {weeklyPlan ? (
                                <div className="space-y-2">
                                    {visibleSubjects
                                        .filter((subject) => (weeklyPlan.allocations[subject.id] ?? 0) > 0)
                                        .map((subject) => (
                                            <div key={subject.id} className="flex items-center justify-between text-sm text-slate-300">
                                                <span>{subject.name}</span>
                                                <span className="text-slate-500">
                                                    {weeklyPlan.allocations[subject.id]} {weekUnitLabel}
                                                </span>
                                            </div>
                                        ))}
                                    {weeklyPlan.strategyNotes ? (
                                        <p className="text-sm text-slate-400 border-t border-slate-800/70 pt-3">{weeklyPlan.strategyNotes}</p>
                                    ) : null}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">No weekly plan saved for this week yet.</p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-slate-300 font-display font-bold uppercase tracking-widest text-sm">Notifications</h3>
                                    <p className="text-xs text-slate-500 mt-1">Planning and protection reminders.</p>
                                </div>
                                {unreadNotifications.length > 0 ? (
                                    <button
                                        onClick={() => actions.markNotificationsRead()}
                                        className="text-xs uppercase tracking-widest text-kromeAccent hover:text-kromeAccent/80"
                                    >
                                        Mark Read
                                    </button>
                                ) : null}
                            </div>
                            {notifications.length > 0 ? (
                                <div className="space-y-2">
                                    {notifications.slice(0, 4).map((entry) => (
                                        <div
                                            key={entry.id}
                                            className={`rounded-xl border px-3 py-3 text-sm ${entry.read ? "border-slate-800 bg-[#080C18]/60 text-slate-500" : "border-slate-700 bg-slate-900 text-slate-300"}`}
                                        >
                                            {entry.message}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">No active reminders.</p>
                            )}
                        </div>
                        <ObservationPanel observations={observations} />
                        <MilestoneWidget />
                        <TaskPanel />
                    </div>

                </div>
            </div>

            <WeeklyPlanModal
                isOpen={isWeeklyPlanOpen}
                onClose={() => setIsWeeklyPlanOpen(false)}
                subjects={visibleSubjects}
                weekStartDate={week.weekStartDate}
                unitLabel={weekUnitLabel}
                existingPlan={weeklyPlan}
                onSave={actions.saveWeeklyPlan}
            />
        </div>
    );
}
