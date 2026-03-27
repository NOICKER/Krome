import { useEffect, useMemo, useState } from "react";
import { useKromeStore } from "../../hooks/useKrome";
import { renderInsightText } from "../../services/aiService";
import {
  getGoalProgressData,
  getProtectionRatioData,
  getSessionHeatmapData,
  getSubjectHistory,
  getSubjectInsightCards,
  getTimeDistributionData,
} from "../../services/dashboardAnalyticsService";
import { InsightFlashcard } from "../../types";
import { SubjectDetailHeader } from "./SubjectDetailHeader";
import { InsightFlashCards } from "./InsightFlashCards";
import { TimeDistributionChart } from "./TimeDistributionChart";
import { ProtectionRatioChart } from "./ProtectionRatioChart";
import { SessionHeatmap } from "./SessionHeatmap";
import { GoalProgressPanel } from "./GoalProgressPanel";
import { SessionHistoryPanel } from "./SessionHistoryPanel";
import { SubjectSettingsPanel } from "./SubjectSettingsPanel";

export function SubjectDetailView() {
  const { state, actions } = useKromeStore();
  const { activeSubjectViewId, subjects, history, settings } = state;
  const [insights, setInsights] = useState<InsightFlashcard[]>([]);

  const activeSubjectView =
    activeSubjectViewId ? subjects.find((subject) => subject.id === activeSubjectViewId) ?? null : null;
  const subjectSettingsKey = JSON.stringify(activeSubjectView?.settings ?? {});
  const subjectIdentityKey = `${activeSubjectView?.id ?? ""}:${activeSubjectView?.name ?? ""}:${subjectSettingsKey}`;

  const subjectHistory = useMemo(() => {
    if (!activeSubjectView) {
      return [];
    }

    return getSubjectHistory(history, activeSubjectView);
  }, [history, activeSubjectViewId, activeSubjectView?.name]);

  const goalProgress = useMemo(
    () => (activeSubjectView ? getGoalProgressData(subjectHistory, activeSubjectView, settings) : null),
    [subjectHistory, settings, subjectIdentityKey]
  );
  const timeDistribution = useMemo(() => getTimeDistributionData(subjectHistory), [subjectHistory]);
  const protectionRatios = useMemo(() => getProtectionRatioData(subjectHistory), [subjectHistory]);
  const heatmap = useMemo(() => getSessionHeatmapData(subjectHistory), [subjectHistory]);
  const insightPatterns = useMemo(
    () => (activeSubjectView ? getSubjectInsightCards(subjectHistory, activeSubjectView, settings) : []),
    [subjectHistory, settings, subjectIdentityKey]
  );

  useEffect(() => {
    let isCancelled = false;

    if (!activeSubjectView || insightPatterns.length === 0) {
      setInsights([]);
      return () => {
        isCancelled = true;
      };
    }

    const hydrateInsights = async () => {
      const nextInsights = await Promise.all(
        insightPatterns.map(async (pattern) => {
          const aiCopy = await renderInsightText({
            ...pattern.payload,
            subjectName: activeSubjectView.name,
          });

          return {
            id: pattern.id,
            title: aiCopy.title,
            description: pattern.description,
            metric: pattern.metric,
            dataMirror: pattern.dataMirror,
            guidance: aiCopy.guidance,
            severityLevel: pattern.severityLevel,
            dateGenerated: pattern.dateGenerated,
            relevantSubjectId: pattern.relevantSubjectId,
          } satisfies InsightFlashcard;
        })
      );

      if (!isCancelled) {
        setInsights(nextInsights);
      }
    };

    hydrateInsights();

    return () => {
      isCancelled = true;
    };
  }, [activeSubjectView?.name, insightPatterns]);

  if (!activeSubjectView || !goalProgress) {
    return null;
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <SubjectDetailHeader
        subject={activeSubjectView}
        onBack={() => actions.setView("dashboard")}
        onStart={() => actions.startSession({ id: activeSubjectView.id, name: activeSubjectView.name }, { lockSubject: true })}
      />

      <InsightFlashCards cards={insights} subject={activeSubjectView} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TimeDistributionChart data={timeDistribution} />
        <ProtectionRatioChart data={protectionRatios} />
        <SessionHeatmap data={heatmap} />
        <GoalProgressPanel daily={goalProgress.daily} weekly={goalProgress.weekly} />
        <SessionHistoryPanel entries={subjectHistory} />
        <SubjectSettingsPanel
          subject={activeSubjectView}
          settings={settings}
          onUpdate={(nextSettings) => actions.updateSubjectSettings(activeSubjectView.id, nextSettings)}
          onStart={() => actions.startSession({ id: activeSubjectView.id, name: activeSubjectView.name }, { lockSubject: true })}
        />
      </div>
    </div>
  );
}
