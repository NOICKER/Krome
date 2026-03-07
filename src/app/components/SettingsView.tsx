import { motion } from "motion/react";
import { GoalProgress, KromeSettings } from "../types";
import { KromeToggle } from "./ui/KromeToggle";
import { KromeSlider } from "./ui/KromeSlider";
import { Card } from "./ui/card";

interface SettingsViewProps {
  settings: KromeSettings;
  onUpdateSettings: (newSettings: KromeSettings) => void;
}

export function SettingsView({ settings, onUpdateSettings }: SettingsViewProps) {

  const update = (key: keyof KromeSettings, val: any) => {
    onUpdateSettings({ ...settings, [key]: val });
  };

  const updateGoalProgress = (key: "dailyGoalProgress" | "weeklyGoalProgress", nextGoal: Partial<GoalProgress>) => {
    onUpdateSettings({
      ...settings,
      [key]: {
        ...settings[key],
        ...nextGoal,
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-24"
    >
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Wrapper Features</h3>
        <Card className="p-4">
          <KromeToggle
            label="Enable Wrapper"
            description="Subject, intent, and history tracking."
            checked={settings.wrapperEnabled}
            onCheckedChange={(v) => update('wrapperEnabled', v)}
          />
          <KromeToggle
            label="Auto-suggest Breaks"
            description="Prompt for breaks after standard blocks."
            checked={settings.autoSuggestBreaks}
            onCheckedChange={(v) => update('autoSuggestBreaks', v)}
          />
          <KromeToggle
            label="Progressive Escalation"
            description="Increase friction for abandoning sessions."
            checked={settings.progressiveEscalation}
            onCheckedChange={(v) => update('progressiveEscalation', v)}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Strict Mode</h3>
        <Card className="p-4">
          <KromeToggle
            label="Strict Mode"
            description="Track categories and pot value."
            checked={settings.strictMode}
            onCheckedChange={(v) => update('strictMode', v)}
          />
          <KromeToggle
            label="Blind Mode"
            description="Hide visual progress during blocks."
            checked={settings.blindMode}
            onCheckedChange={(v) => update('blindMode', v)}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Universal Focus Defaults</h3>
        <Card className="p-4 space-y-6">
          <KromeSlider
            label="Universal Duration (min)"
            value={settings.blockMinutes}
            min={1}
            max={180}
            onValueChange={(v) => update('blockMinutes', v)}
          />
          <KromeSlider
            label="Universal Brick Interval (min)"
            value={settings.intervalMinutes}
            min={1}
            max={60}
            onValueChange={(v) => update('intervalMinutes', v)}
          />
          <KromeSlider
            label={`Daily Goal (${settings.dailyGoalProgress.type})`}
            value={settings.dailyGoalProgress.target}
            min={1}
            max={settings.dailyGoalProgress.type === "minutes" ? 480 : 20}
            onValueChange={(v) => updateGoalProgress('dailyGoalProgress', { target: v })}
          />
          <div className="flex gap-2">
            {(["blocks", "minutes"] as const).map((goalType) => (
              <button
                key={goalType}
                onClick={() => updateGoalProgress("dailyGoalProgress", { type: goalType })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-widest border transition-all ${settings.dailyGoalProgress.type === goalType
                  ? 'border-kromeAccent/50 bg-kromeAccent/10 text-kromeAccent'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
              >
                Daily {goalType}
              </button>
            ))}
          </div>
          <KromeSlider
            label={`Weekly Goal (${settings.weeklyGoalProgress.type})`}
            value={settings.weeklyGoalProgress.target}
            min={1}
            max={settings.weeklyGoalProgress.type === "minutes" ? 2400 : 100}
            onValueChange={(v) => updateGoalProgress('weeklyGoalProgress', { target: v })}
          />
          <div className="flex gap-2">
            {(["blocks", "minutes"] as const).map((goalType) => (
              <button
                key={goalType}
                onClick={() => updateGoalProgress("weeklyGoalProgress", { type: goalType })}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-widest border transition-all ${settings.weeklyGoalProgress.type === goalType
                  ? 'border-kromeAccent/50 bg-kromeAccent/10 text-kromeAccent'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
              >
                Weekly {goalType}
              </button>
            ))}
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Visuals & Feedback</h3>
        <Card className="p-4">
          <KromeToggle
            label="Reduced Motion"
            description="Disable complex animations."
            checked={settings.reducedMotion}
            onCheckedChange={(v) => update('reducedMotion', v)}
          />
          <KromeToggle
            label="Sound"
            description="Play sounds on brick fill and block end."
            checked={settings.soundEnabled}
            onCheckedChange={(v) => update('soundEnabled', v)}
          />
          {settings.soundEnabled && (
            <KromeSlider
              label="Volume (%)"
              value={Math.round((settings.volume ?? 0.5) * 100)}
              min={1}
              max={100}
              onValueChange={(v) => update('volume', v / 100)}
            />
          )}
          <KromeToggle
            label="Notifications"
            description="Browser notifications on block events."
            checked={settings.notifications}
            onCheckedChange={(v) => update('notifications', v)}
          />
          <KromeToggle
            label="Count Helper Blocks"
            description="Count temporary sessions toward daily goal."
            checked={settings.countHelperBlocks}
            onCheckedChange={(v) => update('countHelperBlocks', v)}
          />
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Layout Density</h3>
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-200">Display Mode</p>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Compact reduces panel padding by ~20%.</p>
            </div>
            <div className="flex space-x-2 flex-shrink-0">
              <button
                onClick={() => update('densityMode', 'comfortable')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-widest border transition-all flex-1 sm:flex-none ${(settings.densityMode || 'comfortable') === 'comfortable'
                  ? 'border-kromeAccent/50 bg-kromeAccent/10 text-kromeAccent'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
              >
                Comfortable
              </button>
              <button
                onClick={() => update('densityMode', 'compact')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg uppercase tracking-widest border transition-all flex-1 sm:flex-none ${settings.densityMode === 'compact'
                  ? 'border-kromeAccent/50 bg-kromeAccent/10 text-kromeAccent'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
              >
                Compact
              </button>
            </div>
          </div>
        </Card>
      </section>

      <div className="flex justify-center pt-4">
        <p className="text-xs text-slate-600 tracking-widest uppercase">Krome v2.0 • Mirror Interface</p>
      </div>
    </motion.div>
  );
}
