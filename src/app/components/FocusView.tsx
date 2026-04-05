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
import { cn } from "./ui/utils";
import { getTotalBlocks } from "../core/sessionEngine";
import { UNIVERSAL_BRICK_ACCENT } from "./brickDisplayTheme";

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
      options?: { lockSubject?: boolean; type?: KromeSession["type"]; sessionMinutes?: number; plipMinutes?: number }
    ) => void;
    undoAbandon: () => void;
    updateSubject: (subject?: Pick<KromeSubject, "id" | "name">) => void;
    updateIntent: (val: string) => void;
    updateTaskId: (val: string | undefined) => void;
    addSubject: (subject: string | { name: string; color?: string; settings?: KromeSubject["settings"] }) => string;
    pauseForInterrupt: (reason: string, type: "external" | "internal", notes?: string) => void;
    resumeFromInterrupt: () => void;
    clearSessionSummary: () => void;
    setView?: (view: ViewState) => void;
    setSubjectView?: (subjectId: string) => void;
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
  const activeSubjectColor = currentSubject?.color ?? UNIVERSAL_BRICK_ACCENT;
  const focusTitle = currentSubject ? currentSubject.name : "UNIVERSAL FOCUS";
  const sessionBlockCount = Number.isFinite(session.sessionMinutes)
    ? getTotalBlocks(session.sessionMinutes, Math.max(session.plipMinutes, 1))
    : 10;
  const estimatedMobileBrickRows = Math.ceil(sessionBlockCount / 2);
  const shouldLiftActiveRailOnMobile = isSessionActive && !settings.blindMode && estimatedMobileBrickRows >= 7;

  useEffect(() => {
    setInsights(getAdvancedObservations());
  }, [day.blocksCompleted]);

  const handleStart = () => {
    actions.startSession();
  };

  return (
    <div className="flex flex-col h-full relative p-4 md:p-8 overflow-y-auto overflow-x-hidden pb-32">
      <FocusHeader potValue={day.potValue} title={focusTitle} />

      <div className="flex flex-col">
        {isSessionActive && (
          <div
            className={cn(
              "w-full max-w-[980px] mx-auto flex flex-col justify-start items-center",
              shouldLiftActiveRailOnMobile ? "order-2 md:order-1 mt-6 md:mt-0" : "order-1"
            )}
          >
            <MirrorFrame>
              <BrickDisplay
                sessionMinutes={session.sessionMinutes}
                plipMinutes={session.plipMinutes}
                elapsedMs={elapsed}
                isActive={session.isActive}
                blindMode={settings.blindMode}
                subjectColor={activeSubjectColor}
              />
            </MirrorFrame>
          </div>
        )}

        <div
          className={cn(
            "w-full",
            isSessionActive
              ? shouldLiftActiveRailOnMobile
                ? "order-1 md:order-2"
                : "order-2"
              : "order-1"
          )}
        >
          <MicroInsight insights={insights} />
          <WeeklyStrip onSetView={actions.setView} />

          <div className={cn("w-full max-w-[980px] mx-auto flex flex-col justify-start", isSessionActive ? "pt-6 md:pt-8" : "pt-8")}>
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
                onOpenSubject={actions.setSubjectView}
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
        </div>
      </div>

      <SessionSummaryModal summary={latestSessionSummary} onClose={actions.clearSessionSummary} />
    </div>
  );
}
