import { useMemo } from "react";
import SlidersHorizontal from "lucide-react/dist/esm/icons/sliders-horizontal";
import { KromeSettings, KromeSubject } from "../../types";
import { buildSubjectSettingsOverrides } from "../../services/subjectService";
import { AnalyticsCard } from "../analytics/AnalyticsCard";
import { KromeSlider } from "../ui/KromeSlider";
import { KromeToggle } from "../ui/KromeToggle";

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
      soundEnabled: subjectSettings.soundEnabled ?? settings.soundEnabled,
      volume: subjectSettings.volume ?? settings.volume,
      dailyGoal:
        typeof subjectSettings.dailyGoal === "number"
          ? subjectSettings.dailyGoal
          : settings.dailyGoalProgress.target,
      weeklyGoal:
        typeof subjectSettings.weeklyGoal === "number"
          ? subjectSettings.weeklyGoal
          : settings.weeklyGoalProgress.target,
    }),
    [
      subjectSettings,
      settings.blockMinutes,
      settings.intervalMinutes,
      settings.soundEnabled,
      settings.volume,
      settings.dailyGoalProgress.target,
      settings.weeklyGoalProgress.target,
    ]
  );

  const updateResolvedSettings = (nextSettings: Partial<typeof resolvedSettings>) => {
    const mergedSettings = {
      ...resolvedSettings,
      ...nextSettings,
    };

    onUpdate(
      buildSubjectSettingsOverrides(
        {
          blockMinutes: mergedSettings.sessionDuration ?? mergedSettings.blockMinutes,
          intervalMinutes: mergedSettings.plipInterval ?? mergedSettings.intervalMinutes,
          soundEnabled: mergedSettings.soundEnabled,
          volume: mergedSettings.volume,
          dailyGoal: mergedSettings.dailyGoal,
          weeklyGoal: mergedSettings.weeklyGoal,
        },
        settings
      )
    );
  };

  return (
    <AnalyticsCard title="Subject Settings" icon={SlidersHorizontal}>
      <div className="space-y-5">
        <KromeSlider
          label="Session Duration"
          value={resolvedSettings.sessionDuration ?? settings.blockMinutes}
          min={1}
          max={180}
          onValueChange={(value) => updateResolvedSettings({ sessionDuration: value, blockMinutes: value })}
        />
        <KromeSlider
          label="Plip Interval"
          value={resolvedSettings.plipInterval ?? settings.intervalMinutes}
          min={1}
          max={60}
          onValueChange={(value) => updateResolvedSettings({ plipInterval: value, intervalMinutes: value })}
        />
        <KromeToggle
          label="Sound Feedback"
          description={`Global default is ${settings.soundEnabled ? "on" : "off"}.`}
          checked={resolvedSettings.soundEnabled ?? settings.soundEnabled}
          onCheckedChange={(value) => updateResolvedSettings({ soundEnabled: value })}
        />
        {(resolvedSettings.soundEnabled ?? settings.soundEnabled) ? (
          <KromeSlider
            label="Plip Volume"
            value={Math.round((resolvedSettings.volume ?? settings.volume) * 100)}
            min={1}
            max={100}
            onValueChange={(value) => updateResolvedSettings({ volume: value / 100 })}
          />
        ) : null}
        <KromeSlider
          label="Daily Goal"
          value={typeof resolvedSettings.dailyGoal === "number" ? resolvedSettings.dailyGoal : settings.dailyGoalProgress.target}
          min={1}
          max={100}
          onValueChange={(value) => updateResolvedSettings({ dailyGoal: value })}
        />
        <KromeSlider
          label="Weekly Goal"
          value={typeof resolvedSettings.weeklyGoal === "number" ? resolvedSettings.weeklyGoal : settings.weeklyGoalProgress.target}
          min={1}
          max={500}
          onValueChange={(value) => updateResolvedSettings({ weeklyGoal: value })}
        />
      </div>
    </AnalyticsCard>
  );
}
