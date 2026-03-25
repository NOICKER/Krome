import { useEffect, useState } from "react";
import { BrickDisplay } from "./BrickDisplay";
import { MirrorFrame } from "./MirrorFrame";
import { SessionControls } from "./SessionControls";
import { KromeDay, KromeSession, KromeSettings, KromeStreak, KromeSubject, ViewState } from "../types";
import { FocusHeader } from "./focus/FocusHeader";
import { InterruptTracker } from "./focus/InterruptTracker";
import { MicroInsight } from "./focus/MicroInsight";
import { SessionSummaryModal } from "./focus/SessionSummaryModal";
import { WeeklyStrip } from "./focus/WeeklyStrip";
import { getAdvancedObservations } from "../services/analyticsService";

interface FocusViewProps {
  session: KromeSession;
  settings: KromeSettings;
  currentSubject: KromeSubject | null;
  day: KromeDay;
  streak: KromeStreak;
  subjects: KromeSubject[];
  elapsed: number;
  isSessionActive: boolean;
  latestSessionSummary: {
    id: string;
    subject?: string;
    completed: boolean;
    actualFocusDurationMs: number;
    interruptDurationMs: number;
    protectionRatio: number;
    plannedDurationMs?: number;
  } | null;
  onAbandonRequest: () => void;
  actions: {
    startSession: (
      subject?: Pick<KromeSubject, "id" | "name">,
      options?: { lockSubject?: boolean; type?: KromeSession["type"]; totalDurationMinutes?: number; intervalMinutes?: number }
    ) => void;
    undoAbandon: () => void;
    updateSubject: (subject: Pick<KromeSubject, "id" | "name">) => void;
    updateIntent: (val: string) => void;
    updateTaskId: (val: string | undefined) => void;
    addSubject: (subject: string | { name: string; color?: string; settings?: KromeSubject["settings"] }) => string;
    pauseForInterrupt: (reason: string, type: "external" | "internal", notes?: string) => void;
    resumeFromInterrupt: () => void;
    clearSessionSummary: () => void;
    setView?: (view: ViewState) => void;
  };
}

export function FocusView({
  session,
  settings,
  currentSubject,
  day,
  streak,
  subjects,
  elapsed,
  isSessionActive,
  latestSessionSummary,
  onAbandonRequest,
  actions,
}: FocusViewProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [isInterruptTrackerOpen, setIsInterruptTrackerOpen] = useState(false);
  const activeSubjectColor = currentSubject?.color ?? "#64748b";
  const focusTitle = session.subjectLocked && currentSubject ? currentSubject.name : "UNIVERSAL FOCUS";

  useEffect(() => {
    setInsights(getAdvancedObservations());
  }, [day.blocksCompleted]);

  const handleStart = () => {
    actions.startSession();
  };

  return (
    <div className="flex flex-col h-full relative p-4 md:p-8 overflow-y-auto overflow-x-hidden pb-32">
      <FocusHeader potValue={day.potValue} title={focusTitle} />

      {isSessionActive && (
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

      <MicroInsight insights={insights} />
      <WeeklyStrip onSetView={actions.setView} />

      <div className="w-full max-w-[980px] mx-auto flex flex-col justify-start pt-8">
        <div className="bg-slate-900/60 border border-slate-800 rounded-[20px] p-7 shadow-sm">
          <SessionControls
            session={session}
            settings={settings}
            subjects={subjects}
            isSessionActive={isSessionActive}
            onStart={handleStart}
            onAbandon={onAbandonRequest}
            onUndoAbandon={actions.undoAbandon}
            onUpdateSubject={actions.updateSubject}
            onUpdateIntent={actions.updateIntent}
            onUpdateTaskId={actions.updateTaskId}
            onAddSubject={actions.addSubject}
          />
        </div>
        <InterruptTracker
          isOpen={isInterruptTrackerOpen}
          session={session}
          onOpen={() => setIsInterruptTrackerOpen(true)}
          onClose={() => setIsInterruptTrackerOpen(false)}
          onPauseForInterrupt={actions.pauseForInterrupt}
          onResumeFromInterrupt={actions.resumeFromInterrupt}
        />
      </div>

      <SessionSummaryModal summary={latestSessionSummary} onClose={actions.clearSessionSummary} />
    </div>
  );
}
