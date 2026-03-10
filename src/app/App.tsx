import { useState, useEffect } from "react";
import { useKromeStore } from "./hooks/useKrome";
import { FocusView } from "./components/FocusView";
import { ReviewView } from "./components/ReviewView";
import { SettingsView } from "./components/SettingsView";
import { BreakSuggester } from "./components/BreakSuggester";
import { OnboardingModal } from "./components/ui/OnboardingModal";
import { AuthModal } from "./components/auth/AuthModal";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { SubjectDetailView } from "./components/subject/SubjectDetailView";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { MobileHeader } from "./components/MobileHeader";
import Settings from "lucide-react/dist/esm/icons/settings";
import CheckSquare from "lucide-react/dist/esm/icons/check-square";
import Target from "lucide-react/dist/esm/icons/target";
import Undo from "lucide-react/dist/esm/icons/undo";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import Menu from "lucide-react/dist/esm/icons/menu";
import X from "lucide-react/dist/esm/icons/x";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "sonner";
import { cn } from "./components/ui/utils";
import { useAuth } from "./context/AuthContext";
import { Modal } from "./components/ui/Modal";
import { FrictionModal } from "./components/FrictionModal";
import { startSyncService } from "./services/syncService";

export default function App() {
  const { state, actions } = useKromeStore();
  const { view, settings, resolvedSettings, currentSubject, activeSubjectView, day, session, streak, history, subjects, elapsed, isSessionActive, latestSessionSummary } = state;
  const [showBreakSuggester, setShowBreakSuggester] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const { loading: authLoading, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const focusHeaderTitle = session.subjectLocked && currentSubject ? currentSubject.name : "UNIVERSAL FOCUS";
  const currentFilledBricks = Math.floor(elapsed / (session.intervalMinutes * 60 * 1000));
  const frictionTotalBlocks = Number.isFinite(session.totalBlocks)
    ? session.totalBlocks
    : Math.max(currentFilledBricks + 4, 8);

  // Show break suggester when a standard block completes
  useEffect(() => {
    if (session.status === 'idle' && history.length > 0) {
      const lastSession = history[0];
      // If we just finished a standard block, suggest a break
      if (lastSession && lastSession.completed && lastSession.sessionType === 'standard' && settings.autoSuggestBreaks) {
        // Only show if the completion was very recent (within last 5 seconds to avoid showing on reload)
        if (Date.now() - lastSession.startedAt - lastSession.durationMs < 5000) {
          setShowBreakSuggester(true);
        }
      }
    } else if (session.isActive) {
      setShowBreakSuggester(false);
    }
  }, [session.status, session.isActive, history, settings.autoSuggestBreaks]);

  const handleConfirmQuit = (reason: string, note: string) => {
    setShowQuitModal(false);
    actions.requestAbandon(reason, note);
  };

  const handleAbandonTrigger = () => {
    if (settings.wrapperEnabled) {
      setShowQuitModal(true);
    } else {
      actions.requestAbandon();
    }
  };

  // Global background style
  useEffect(() => {
    document.body.classList.add("bg-[#080C18]", "text-slate-200", "antialiased", "w-full", "max-w-full", "overflow-x-hidden");

    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.getElementsByClassName("spotlight-card");
      // Batch all reads first to avoid layout thrashing (Rule 7.1)
      const rects: { el: HTMLElement; x: number; y: number }[] = [];
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        rects.push({
          el: card as HTMLElement,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
      // Then batch all writes
      for (const { el, x, y } of rects) {
        el.style.setProperty("--mouse-x", `${x}px`);
        el.style.setProperty("--mouse-y", `${y}px`);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    return startSyncService(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;

    const params = new URLSearchParams(window.location.search);
    const isSignupRequest = params.get('auth') === 'signup';

    if (!user) {
      if (isSignupRequest) {
        setShowAuthModal(true);
      } else if (window.location.pathname !== '/krome-landing.html') {
        window.location.href = '/krome-landing.html';
      }
    }
  }, [user, authLoading]);

  const navItems = [
    { id: "focus", label: "Focus", icon: Target },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "review", label: "Review", icon: CheckSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  if (authLoading) {
    return (
      <div className="flex h-screen w-full bg-[#080C18] items-center justify-center">
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          Krome <br /><span className="mt-2 block text-xs tracking-wider opacity-60">Checking identity...</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#080C18] overflow-hidden">
      <OnboardingModal />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        forceSignup={new URLSearchParams(window.location.search).get('auth') === 'signup'}
      />
      <Toaster theme="dark" position="top-center" />

      {!user ? (
        <div className="flex-1 flex items-center justify-center bg-[#080C18]">
          <div className="absolute inset-0 bg-[#080C18] z-0" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-500 text-sm font-medium tracking-widest uppercase z-10"
          >
            Krome
          </motion.div>
        </div>
      ) : (
        <>


          {/* Undo Snackbar Overlay */}
          <AnimatePresence>
            {session.status === 'abandoned' ? (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center bg-slate-900 border border-slate-700 text-white px-6 py-3 rounded-full shadow-2xl"
              >
                <span className="mr-4 text-sm font-medium">Session abandoned.</span>
                <button
                  onClick={actions.undoAbandon}
                  className="flex items-center text-sm font-bold text-kromeAccent hover:text-kromeAccent/80 transition-colors hover:underline"
                >
                  <Undo size={16} className="mr-1" /> Undo
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Break Suggester Overlay */}
          {showBreakSuggester && settings.wrapperEnabled ? (
            <BreakSuggester
              onStartBreak={() => {
                setShowBreakSuggester(false);
                actions.startSession(undefined, { type: "helper", totalDurationMinutes: 5, intervalMinutes: 5 });
              }}
              onDismiss={() => setShowBreakSuggester(false)}
            />
          ) : null}

          {/* Mobile Top Header removed as per new architecture (headers handled per-page) */}

          {/* Desktop Side Navigation — hidden on mobile */}
          <nav className="hidden md:flex flex-col w-20 lg:w-56 h-full border-r border-slate-800 bg-[#080C18]/80 backdrop-blur-md py-8 px-2 lg:px-4 flex-shrink-0">
            <div className="mb-10 px-2 flex items-center justify-center lg:justify-start">
              <img src="/krome-logo.png" alt="Krome Logo" className="h-11 w-auto object-contain ml-9" />
            </div>

            <div className="flex flex-col space-y-4 flex-1 mt-4">
              {navItems.map((item) => {
                const isActive = view === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => actions.setView(item.id)}
                    className={cn(
                      "relative flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-150 group",
                      isActive
                        ? "bg-slate-800/80 text-kromeAccent border-l-[3px] border-kromeAccent"
                        : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/70 border-l-[3px] border-transparent"
                    )}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span className={cn(
                      "text-sm font-semibold tracking-wide hidden lg:block",
                      isActive ? "text-kromeAccent" : "text-slate-400 group-hover:text-slate-200"
                    )}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Streak badge on sidebar */}
            <div className="mt-auto flex items-center justify-center lg:justify-start space-x-2 px-3 py-2">
              <div className="w-2 h-2 bg-kromeAccent rounded-full shadow-[0_0_8px_rgba(98,105,157,0.8)]" />
              <span className="text-slate-300 font-mono text-sm font-bold">{streak.current}</span>
              <span className="text-slate-600 text-xs hidden lg:inline">streak</span>
            </div>
          </nav>

          {/* Mobile Top Header */}
          {view === "focus" ? <MobileHeader title={focusHeaderTitle} potValue={day.potValue} /> : null}
          {view === "dashboard" ? <MobileHeader title="Dashboard" potValue={day.potValue} /> : null}
          {view === "subjectDetail" ? <MobileHeader title={activeSubjectView?.name ?? "Subject"} potValue={day.potValue} /> : null}
          {view === "analytics" ? <MobileHeader title="Analytics" /> : null}
          {view === "review" ? <MobileHeader title="Review" /> : null}
          {view === "settings" ? <MobileHeader title="Settings" /> : null}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent pt-14 pb-[88px] md:pt-0 md:pb-0">
              <AnimatePresence mode="wait">
                {view === "focus" && (
                  <motion.div
                    key="focus"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <FocusView
                      session={session}
                      settings={resolvedSettings}
                      currentSubject={currentSubject}
                      day={day}
                      streak={streak}
                      subjects={subjects}
                      elapsed={elapsed}
                      isSessionActive={isSessionActive}
                      latestSessionSummary={latestSessionSummary}
                      onAbandonRequest={handleAbandonTrigger}
                      actions={{
                        startSession: actions.startSession,
                        undoAbandon: actions.undoAbandon,
                        updateSubject: actions.updateSubject,
                        updateIntent: actions.updateIntent,
                        updateTaskId: actions.updateTaskId,
                        addSubject: actions.addSubject,
                        pauseForInterrupt: actions.pauseForInterrupt,
                        resumeFromInterrupt: actions.resumeFromInterrupt,
                        clearSessionSummary: actions.clearSessionSummary,
                        setView: actions.setView,
                      }}
                    />
                  </motion.div>
                )}

                {view === "dashboard" && (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <DashboardLayout />
                  </motion.div>
                )}

                {view === "subjectDetail" && (
                  <motion.div
                    key="subjectDetail"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <SubjectDetailView />
                  </motion.div>
                )}

                {view === "analytics" && (
                  <motion.div
                    key="analytics"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <AnalyticsView />
                  </motion.div>
                )}

                {view === "review" && (
                  <motion.div
                    key="review"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 md:p-8 h-full"
                  >
                    <ReviewView day={day} history={history} />
                  </motion.div>
                )}

                {view === "settings" && (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 md:p-8 h-full"
                  >
                    <div className="mb-6 min-w-0 max-w-full">
                      <h2 className="text-2xl font-display font-bold tracking-tight text-slate-100 mb-2 truncate">Settings</h2>
                      <p className="text-slate-500 text-sm truncate">Configure Krome's behavior and constraints.</p>
                    </div>
                    <SettingsView settings={settings} onUpdateSettings={actions.setSettings} />
                  </motion.div>
                )}
              </AnimatePresence>
            </main>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav navItems={navItems as any} view={view} setView={actions.setView} />
          </div>
        </>
      )}

      {/* Decorative Background Elements — very subtle noise/radial texture */}

      {/* Decorative Background Elements — very subtle noise/radial texture */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-kromeAccent/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/8 rounded-full blur-[100px]" />
        {/* 2% opacity noise layer — barely noticeable structural depth */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      </div>

      <Modal
        isOpen={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        title="Abandon Session?"
      >
        <FrictionModal
          isEscalated={settings.progressiveEscalation && streak.current >= 3}
          totalBlocks={frictionTotalBlocks}
          currentFilledBricks={Math.min(currentFilledBricks, frictionTotalBlocks)}
          isInfiniteSession={!Number.isFinite(session.totalBlocks)}
          onConfirm={handleConfirmQuit}
          onCancel={() => setShowQuitModal(false)}
        />
      </Modal>
    </div >
  );
}
