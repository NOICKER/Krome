import { useEffect, useMemo, useState } from "react";
import SlidersHorizontal from "lucide-react/dist/esm/icons/sliders-horizontal";
import { KromeSettings, KromeSubject } from "../../types";
import { AnalyticsCard } from "../analytics/AnalyticsCard";
import { KromeSlider } from "../ui/KromeSlider";

interface SubjectSettingsPanelProps {
  subject: KromeSubject;
  settings: KromeSettings;
  onUpdate: (settings: KromeSubject["settings"]) => void;
}

export function SubjectSettingsPanel({ subject, settings, onUpdate }: SubjectSettingsPanelProps) {
  const subjectSettings = subject.settings ?? {};
  const resolvedSettings = useMemo(
    () => ({
      ...subjectSettings,
      sessionDuration: subjectSettings.sessionDuration ?? subjectSettings.blockMinutes ?? settings.blockMinutes,
      blockMinutes: subjectSettings.blockMinutes ?? subjectSettings.sessionDuration ?? settings.blockMinutes,
      plipInterval: subjectSettings.plipInterval ?? subjectSettings.intervalMinutes ?? settings.intervalMinutes,
      intervalMinutes: subjectSettings.intervalMinutes ?? subjectSettings.plipInterval ?? settings.intervalMinutes,
      dailyGoal:
        typeof subjectSettings.dailyGoal === "number"
          ? subjectSettings.dailyGoal
          : settings.dailyGoalProgress.target,
      weeklyGoal:
        typeof subjectSettings.weeklyGoal === "number"
          ? subjectSettings.weeklyGoal
          : settings.weeklyGoalProgress.target,
    }),
    [subjectSettings, settings.blockMinutes, settings.intervalMinutes, settings.dailyGoalProgress.target, settings.weeklyGoalProgress.target]
  );
  const [draftSettings, setDraftSettings] = useState(resolvedSettings);
  const resolvedSettingsKey = JSON.stringify(resolvedSettings);
  const draftSettingsKey = JSON.stringify(draftSettings);

  useEffect(() => {
    setDraftSettings(resolvedSettings);
  }, [resolvedSettingsKey]);

  useEffect(() => {
    if (draftSettingsKey === resolvedSettingsKey) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onUpdate(draftSettings);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [draftSettings, draftSettingsKey, onUpdate, resolvedSettingsKey]);

  return (
    <AnalyticsCard title="Subject Settings" icon={SlidersHorizontal}>
      <div className="space-y-5">
        <KromeSlider
          label="Session Duration"
          value={draftSettings.sessionDuration ?? settings.blockMinutes}
          min={1}
          max={180}
          onValueChange={(value) =>
            setDraftSettings((prev) => ({ ...prev, sessionDuration: value, blockMinutes: value }))
          }
        />
        <KromeSlider
          label="Plip Interval"
          value={draftSettings.plipInterval ?? settings.intervalMinutes}
          min={1}
          max={60}
          onValueChange={(value) =>
            setDraftSettings((prev) => ({ ...prev, plipInterval: value, intervalMinutes: value }))
          }
        />
        <KromeSlider
          label="Daily Goal"
          value={typeof draftSettings.dailyGoal === "number" ? draftSettings.dailyGoal : settings.dailyGoalProgress.target}
          min={1}
          max={100}
          onValueChange={(value) => setDraftSettings((prev) => ({ ...prev, dailyGoal: value }))}
        />
        <KromeSlider
          label="Weekly Goal"
          value={typeof draftSettings.weeklyGoal === "number" ? draftSettings.weeklyGoal : settings.weeklyGoalProgress.target}
          min={1}
          max={500}
          onValueChange={(value) => setDraftSettings((prev) => ({ ...prev, weeklyGoal: value }))}
        />
      </div>
    </AnalyticsCard>
  );
}
