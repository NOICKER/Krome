import { useState, useEffect } from "react";
import { useKromeStore } from "./hooks/useKrome";
import { FocusView } from "./components/FocusView";
import { ReviewView } from "./components/ReviewView";
import { SettingsView } from "./components/SettingsView";
import { BreakSuggester } from "./components/BreakSuggester";
import { OnboardingModal } from "./components/ui/OnboardingModal";
import { DashboardLayout } from "./components/dashboard/DashboardLayout";
import { AnalyticsView } from "./components/analytics/AnalyticsView";
import { PotIndicator } from "./components/ui/PotIndicator";
import { Settings, CheckSquare, Target, Undo, LayoutDashboard, BarChart3, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "sonner";
import { cn } from "./components/ui/utils";
import { useAuth } from "./context/AuthContext";
import { Modal } from "./components/ui/Modal";
import { FrictionModal } from "./components/FrictionModal";

export default function App() {
  const { state, actions } = useKromeStore();
  const { view, settings, day, session, streak, history, subjects, elapsed } = state;
  const [showBreakSuggester, setShowBreakSuggester] = useState(false);
  const [showQuitModal, setShowQuitModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { loading: authLoading } = useAuth();

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
    document.body.className = "bg-slate-950 text-slate-200 antialiased selection:bg-emerald-500/30";

    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.getElementsByClassName("spotlight-card");
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        (card as HTMLElement).style.setProperty("--mouse-x", `${x}px`);
        (card as HTMLElement).style.setProperty("--mouse-y", `${y}px`);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const navItems = [
    { id: "focus", label: "Focus", icon: Target },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "review", label: "Review", icon: CheckSquare },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  if (authLoading) {
    return (
      <div className="flex h-screen w-full bg-slate-950 items-center justify-center">
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          Krome <br /><span className="mt-2 block text-xs tracking-wider opacity-60">Checking identity...</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden">
      <OnboardingModal />
      <Toaster theme="dark" position="top-center" />

      <PotIndicator day={day} history={history} />

      {/* Undo Snackbar Overlay */}
      <AnimatePresence>
        {session.status === 'abandoned' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center bg-slate-900 border border-slate-700 text-white px-6 py-3 rounded-full shadow-2xl"
          >
            <span className="mr-4 text-sm font-medium">Session abandoned.</span>
            <button
              onClick={actions.undoAbandon}
              className="flex items-center text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors hover:underline"
            >
              <Undo size={16} className="mr-1" /> Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Break Suggester Overlay */}
      {showBreakSuggester && settings.wrapperEnabled && (
        <BreakSuggester
          onStartBreak={() => {
            setShowBreakSuggester(false);
            // Starting a temporary 5-min session
            actions.startSession(); // The real app passes args, our hook simplifies starts for now
          }}
          onDismiss={() => setShowBreakSuggester(false)}
        />
      )}

      {/* Mobile Hamburger Header Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Krome" className="w-7 h-7 rounded-lg border border-slate-800" />
          <span className="text-sm font-bold text-slate-100 tracking-tight">Krome</span>
        </div>
        <div className="w-9" />{/* Spacer for symmetry */}
      </div>

      {/* Mobile Slide-Over Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            {/* Drawer Panel */}
            <motion.nav
              key="sidebar-drawer"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-slate-950 border-r border-slate-800 py-6 px-4"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-8 px-1">
                <div className="flex items-center space-x-3">
                  <img src="/logo.png" alt="Krome Logo" className="w-8 h-8 rounded-lg border border-slate-800" />
                  <div>
                    <h1 className="text-base font-bold tracking-tight text-slate-100">Krome</h1>
                    <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Mirror Interface</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Nav Items */}
              <div className="flex flex-col space-y-2 flex-1">
                {navItems.map((item) => {
                  const isActive = view === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { actions.setView(item.id); setIsSidebarOpen(false); }}
                      className={cn(
                        "flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-150",
                        isActive
                          ? "bg-slate-800/80 text-emerald-400 border-l-[3px] border-emerald-500"
                          : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/70 border-l-[3px] border-transparent"
                      )}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Streak Badge */}
              <div className="flex items-center space-x-2 px-3 py-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-slate-300 font-mono text-sm font-bold">{streak.current}</span>
                <span className="text-slate-600 text-xs">streak</span>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Side Navigation — hidden on mobile */}
      <nav className="hidden md:flex flex-col w-20 lg:w-56 h-full border-r border-slate-800 bg-slate-950/80 backdrop-blur-md py-8 px-2 lg:px-4 flex-shrink-0">
        <div className="mb-10 px-2 flex items-center space-x-3">
          <img src="/logo.png" alt="Krome Logo" className="w-8 h-8 rounded-lg border border-slate-800 shadow-sm" />
          <div className="hidden lg:block">
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-slate-100">Krome</h1>
            <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase mt-0.5">Mirror Interface</p>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-100 lg:hidden text-center flex-1">K</h1>
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
                    ? "bg-slate-800/80 text-emerald-500 border-l-[3px] border-emerald-500"
                    : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/70 border-l-[3px] border-transparent"
                )}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(
                  "text-sm font-semibold tracking-wide hidden lg:block",
                  isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Streak badge on sidebar */}
        <div className="mt-auto flex items-center justify-center lg:justify-start space-x-2 px-3 py-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-slate-300 font-mono text-sm font-bold">{streak.current}</span>
          <span className="text-slate-600 text-xs hidden lg:inline">streak</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent pt-14 md:pt-0">
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
                  settings={settings}
                  day={day}
                  streak={streak}
                  subjects={subjects}
                  elapsed={elapsed}
                  actions={{
                    startSession: actions.startSession,
                    requestAbandon: handleAbandonTrigger,
                    undoAbandon: actions.undoAbandon,
                    updateSubject: actions.updateSubject,
                    updateIntent: actions.updateIntent,
                    updateTaskId: actions.updateTaskId,
                    addSubject: actions.addSubject,
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
                <h2 className="text-2xl font-bold tracking-tight text-slate-100 mb-2">Settings</h2>
                <p className="text-slate-500 text-sm mb-6">Configure Krome's behavior and constraints.</p>
                <SettingsView settings={settings} onUpdateSettings={actions.setSettings} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Navigation — hidden on desktop */}
        <nav className="md:hidden h-16 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md flex justify-around items-center px-6 z-50 flex-shrink-0">
          {navItems.map((item) => {
            const isActive = view === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => actions.setView(item.id)}
                className="relative flex flex-col items-center justify-center space-y-1 w-16 group"
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-300",
                  isActive ? "bg-emerald-500/10 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "text-slate-500 group-hover:text-slate-300"
                )}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] uppercase font-bold tracking-widest transition-colors",
                  isActive ? "text-emerald-500" : "text-slate-600"
                )}>
                  {item.label}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-2 w-1 h-1 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Decorative Background Elements — very subtle noise/radial texture */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/8 rounded-full blur-[140px]" />
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
          totalBlocks={session.totalBlocks}
          currentFilledBricks={Math.floor(elapsed / (session.intervalMinutes * 60 * 1000))}
          onConfirm={handleConfirmQuit}
          onCancel={() => setShowQuitModal(false)}
        />
      </Modal>
    </div >
  );
}
