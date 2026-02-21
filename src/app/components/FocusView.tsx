import { useState, useEffect } from "react";
import { BrickDisplay } from "./BrickDisplay";
import { MirrorFrame } from "./MirrorFrame";
import { SessionControls } from "./SessionControls";
import { KromeSession, KromeSettings, KromeDay, KromeStreak, KromeSubject, ViewState } from "../types";
import { Modal } from "./ui/Modal";
import { FrictionModal } from "./FrictionModal";
import { FocusHeader } from "./focus/FocusHeader";
import { MicroInsight } from "./focus/MicroInsight";
import { WeeklyStrip } from "./focus/WeeklyStrip";
import { getAdvancedObservations } from "../services/analyticsService";

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
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [mode, setMode] = useState<'focus' | 'reset'>('focus');
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    setInsights(getAdvancedObservations());
  }, [day.blocksCompleted]);

  const handleAbandonRequest = () => {
    if (settings.wrapperEnabled) {
      setShowQuitModal(true);
    } else {
      actions.requestAbandon();
    }
  };

  const handleConfirmQuit = (reason: string, note: string) => {
    setShowQuitModal(false);
    actions.requestAbandon(reason, note);
  };

  const handleStart = () => {
    if (mode === 'reset') {
      actions.updateSubject('reset');
      actions.updateTaskId(undefined);
    }
    actions.startSession();
  };

  return (
    <div className="flex flex-col h-full relative p-4 md:p-8 overflow-y-auto overflow-x-hidden pb-32">
      {/* 1. Header (Time + Pot + Mode) */}
      <FocusHeader potValue={day.potValue} mode={mode} onModeChange={setMode} />

      {/* 2. Central Mirror Frame */}
      <div className="w-full max-w-[980px] mx-auto flex flex-col justify-start items-center">
        <MirrorFrame>
          <BrickDisplay
            totalDurationMinutes={session.totalDurationMinutes}
            intervalMinutes={session.intervalMinutes}
            elapsedMs={elapsed}
            isActive={session.isActive}
            blindMode={settings.blindMode}
          />
        </MirrorFrame>
      </div>

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
            mode={mode}
            onStart={handleStart}
            onAbandon={handleAbandonRequest}
            onUndoAbandon={actions.undoAbandon}
            onUpdateSubject={actions.updateSubject}
            onUpdateIntent={actions.updateIntent}
            onUpdateTaskId={actions.updateTaskId}
            onAddSubject={actions.addSubject}
          />
        </div>
      </div>

      <Modal
        isOpen={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        title="Abandon Session?"
      >
        <FrictionModal
          isEscalated={settings.progressiveEscalation && streak.current >= 3}
          totalBlocks={session.totalBlocks}
          currentFilledBricks={Math.floor(elapsed / (session.intervalMinutes * 60 * 1000))}
          onConfirm={handleConfirmQuit}
          onCancel={() => setShowQuitModal(false)}
        />
      </Modal>
    </div>
  );
}
