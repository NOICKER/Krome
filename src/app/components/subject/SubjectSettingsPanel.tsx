import { useMemo } from "react";
import Play from "lucide-react/dist/esm/icons/play";
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
  onStart: () => void;
}

export function SubjectSettingsPanel({ subject, settings, onUpdate, onStart }: SubjectSettingsPanelProps) {
  const subjectSettings = subject.settings ?? {};
  const resolvedSettings = useMemo(
    () => ({
      ...subjectSettings,
      sessionMinutes: subjectSettings.sessionMinutes ?? settings.sessionMinutes,
      plipMinutes: subjectSettings.plipMinutes ?? settings.plipMinutes,
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
      settings.sessionMinutes,
      settings.plipMinutes,
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
          sessionMinutes: mergedSettings.sessionMinutes,
          plipMinutes: mergedSettings.plipMinutes,
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
          value={resolvedSettings.sessionMinutes}
          min={1}
          max={180}
          onValueChange={(value) => updateResolvedSettings({ sessionMinutes: value })}
        />
        <KromeSlider
          label="Plip Interval"
          value={resolvedSettings.plipMinutes}
          min={1}
          max={60}
          onValueChange={(value) => updateResolvedSettings({ plipMinutes: value })}
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
        <div className="space-y-3 border-t border-slate-800/70 pt-4">
          <button
            type="button"
            onClick={onStart}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-kromeAccent px-5 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_18px_rgba(111,120,181,0.25)] transition-all duration-200 hover:bg-kromeAccent/85 hover:translate-y-[-1px]"
          >
            <Play size={18} fill="currentColor" />
            <span>Start Block ({resolvedSettings.sessionMinutes}m)</span>
          </button>
          <p className="text-center text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {subject.name} settings: {resolvedSettings.sessionMinutes}m block, {resolvedSettings.plipMinutes}m plip
          </p>
        </div>
      </div>
    </AnalyticsCard>
  );
}
