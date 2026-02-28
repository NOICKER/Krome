import { useState, useEffect, useMemo } from "react";
import { BrickDisplay } from "./BrickDisplay";
import { MirrorFrame } from "./MirrorFrame";
import { SessionControls } from "./SessionControls";
import { KromeSession, KromeSettings, KromeDay, KromeStreak, KromeSubject, ViewState } from "../types";
import { FocusHeader } from "./focus/FocusHeader";
import { MicroInsight } from "./focus/MicroInsight";
import { WeeklyStrip } from "./focus/WeeklyStrip";
import { getAdvancedObservations } from "../services/analyticsService";
import { buildSubjectMap, getSubjectColor } from "../utils/subjectUtils";
import { warmUpAudio } from "../utils/sound";

interface FocusViewProps {
  session: KromeSession;
  settings: KromeSettings;
  day: KromeDay;
  streak: KromeStreak;
  subjects: KromeSubject[];
  elapsed: number;
  actions: {
    startSession: () => void;
    requestAbandon: (reason?: string, note?: string) => void;
    undoAbandon: () => void;
    updateSubject: (val: string) => void;
    updateIntent: (val: string) => void;
    updateTaskId: (val: string | undefined) => void;
    addSubject: (val: string) => void;
    setView?: (view: ViewState) => void;
  }
}

export function FocusView({
  session,
  settings,
  day,
  streak,
  subjects,
  elapsed,
  actions
}: FocusViewProps) {
  const [insights, setInsights] = useState<string[]>([]);

  // Memoize subject map for O(1) color lookup
  const subjectMap = useMemo(() => buildSubjectMap(subjects as any), [subjects]);
  const activeSubjectColor = getSubjectColor(subjectMap, session.subjectId);

  useEffect(() => {
    setInsights(getAdvancedObservations());
  }, [day.blocksCompleted]);

  const handleStart = () => {
    warmUpAudio();
    actions.startSession();
  };

  return (
    <div className="flex flex-col h-full relative p-4 md:p-8 overflow-y-auto overflow-x-hidden pb-32">
      {/* 1. Header (Time + Pot) */}
      <FocusHeader potValue={day.potValue} />

      {/* 2. Central Mirror Frame - Only show when running */}
      {session.isActive && (
        <div className="w-full max-w-[980px] mx-auto flex flex-col justify-start items-center">
          <MirrorFrame>
            <BrickDisplay
              totalDurationMinutes={session.totalDurationMinutes}
              intervalMinutes={session.intervalMinutes}
              elapsedMs={elapsed}
              isActive={session.isActive}
              blindMode={settings.blindMode}
              subjectColor={activeSubjectColor}
            />
          </MirrorFrame>
        </div>
      )}

      {/* 4. Micro Insight Whisper */}
      <MicroInsight insights={insights} />

      {/* 5. Weekly Strip */}
      <WeeklyStrip onSetView={actions.setView} />

      {/* 6. Control Panel */}
      <div className="w-full max-w-[980px] mx-auto flex flex-col justify-start pt-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-[20px] p-7 shadow-sm">
          <SessionControls
            session={session}
            settings={settings}
            subjects={subjects}
            onStart={handleStart}
            onAbandon={actions.requestAbandon}
            onUndoAbandon={actions.undoAbandon}
            onUpdateSubject={actions.updateSubject}
            onUpdateIntent={actions.updateIntent}
            onUpdateTaskId={actions.updateTaskId}
            onAddSubject={actions.addSubject}
          />
        </div>
      </div>
    </div>
  );
}
