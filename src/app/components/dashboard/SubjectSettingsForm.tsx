import { GoalProgress, KromeSettings, SubjectSettings } from "../../types";
import { KromeSlider } from "../ui/KromeSlider";
import { KromeToggle } from "../ui/KromeToggle";
import { getGoalUnitLabel } from "../../utils/goalUtils";

interface SubjectSettingsFormProps {
  settings: {
    blockMinutes: number;
    intervalMinutes: number;
    soundEnabled: boolean;
    volume: number;
    dailyGoal: GoalProgress;
    weeklyGoal: GoalProgress;
    strictMode: boolean;
  };
  defaults: KromeSettings;
  onChange: (settings: {
    blockMinutes: number;
    intervalMinutes: number;
    soundEnabled: boolean;
    volume: number;
    dailyGoal: GoalProgress;
    weeklyGoal: GoalProgress;
    strictMode: boolean;
  }) => void;
}

export function SubjectSettingsForm({ settings, defaults, onChange }: SubjectSettingsFormProps) {
  const update = (key: keyof typeof settings, value: number | boolean | GoalProgress) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  const updateGoal = (key: "dailyGoal" | "weeklyGoal", nextGoal: Partial<GoalProgress>) => {
    update(key, {
      ...settings[key],
      ...nextGoal,
    });
  };

  return (
    <div className="space-y-4 border-t border-slate-800 pt-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500">Subject Overrides</p>
        <p className="text-xs text-slate-600 mt-1">Values matching global settings stay inherited.</p>
      </div>

      <KromeSlider
        label={`Block Minutes (${defaults.blockMinutes} global)`}
        value={settings.blockMinutes}
        min={1}
        max={180}
        onValueChange={(value) => update("blockMinutes", value)}
      />

      <KromeSlider
        label={`Brick Interval (${defaults.intervalMinutes} global)`}
        value={settings.intervalMinutes}
        min={1}
        max={60}
        onValueChange={(value) => update("intervalMinutes", value)}
      />

      <KromeToggle
        label="Sound Feedback Override"
        description={`Global default is ${defaults.soundEnabled ? "on" : "off"}.`}
        checked={settings.soundEnabled}
        onCheckedChange={(value) => update("soundEnabled", value)}
      />

      {settings.soundEnabled ? (
        <KromeSlider
          label={`Plip Volume (${Math.round(defaults.volume * 100)}% global)`}
          value={Math.round(settings.volume * 100)}
          min={1}
          max={100}
          onValueChange={(value) => update("volume", value / 100)}
        />
      ) : null}

      <KromeSlider
        label={`Daily Goal (${defaults.dailyGoalProgress.target} ${getGoalUnitLabel(defaults.dailyGoalProgress.type)} global)`}
        value={settings.dailyGoal.target}
        min={1}
        max={settings.dailyGoal.type === "minutes" ? 480 : 20}
        onValueChange={(value) => updateGoal("dailyGoal", { target: value })}
      />

      <div className="flex gap-2">
        {(["blocks", "minutes"] as const).map((goalType) => (
          <button
            key={goalType}
            type="button"
            onClick={() => updateGoal("dailyGoal", { type: goalType })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border ${
              settings.dailyGoal.type === goalType
                ? "border-kromeAccent bg-kromeAccent/10 text-kromeAccent"
                : "border-slate-800 text-slate-500 hover:text-slate-200"
            }`}
          >
            Daily {goalType}
          </button>
        ))}
      </div>

      <KromeSlider
        label={`Weekly Goal (${defaults.weeklyGoalProgress.target} ${getGoalUnitLabel(defaults.weeklyGoalProgress.type)} global)`}
        value={settings.weeklyGoal.target}
        min={1}
        max={settings.weeklyGoal.type === "minutes" ? 2400 : 100}
        onValueChange={(value) => updateGoal("weeklyGoal", { target: value })}
      />

      <div className="flex gap-2">
        {(["blocks", "minutes"] as const).map((goalType) => (
          <button
            key={goalType}
            type="button"
            onClick={() => updateGoal("weeklyGoal", { type: goalType })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border ${
              settings.weeklyGoal.type === goalType
                ? "border-kromeAccent bg-kromeAccent/10 text-kromeAccent"
                : "border-slate-800 text-slate-500 hover:text-slate-200"
            }`}
          >
            Weekly {goalType}
          </button>
        ))}
      </div>

      <KromeToggle
        label="Strict Mode Override"
        description={`Global default is ${defaults.strictMode ? "on" : "off"}.`}
        checked={settings.strictMode}
        onCheckedChange={(value) => update("strictMode", value)}
      />
    </div>
  );
}
