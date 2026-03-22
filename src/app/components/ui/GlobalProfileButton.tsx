import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { AnimatePresence, motion } from "motion/react";
import X from "lucide-react/dist/esm/icons/x";
import User from "lucide-react/dist/esm/icons/user";
import { useAuth } from "../../context/AuthContext";
import { useKromeStore } from "../../hooks/useKrome";
import { supabase } from "../../services/supabaseClient";
import { AuthModal } from "../auth/AuthModal";
import { KromeSlider } from "./KromeSlider";
import { KromeToggle } from "./KromeToggle";

type GlobalProfileButtonProps = {
  variant?: "desktop" | "mobile";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function deriveDisplayName(email: string | undefined, metadata: Record<string, unknown> | undefined) {
  const rawName =
    typeof metadata?.full_name === "string"
      ? metadata.full_name
      : typeof metadata?.name === "string"
        ? metadata.name
        : typeof metadata?.preferred_username === "string"
          ? metadata.preferred_username
          : typeof metadata?.user_name === "string"
            ? metadata.user_name
            : undefined;

  if (rawName && rawName.trim().length > 0) {
    return rawName.trim();
  }

  if (!email) {
    return "Profile";
  }

  return email.split("@")[0] || email;
}

function deriveInitials(displayName: string, email: string | undefined) {
  const parts = displayName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }

  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (email?.slice(0, 2) ?? "KR").toUpperCase();
}

function formatTrackingSinceLabel(historyStart: number | null, accountCreatedAt: string | undefined) {
  const timestamps: number[] = [];

  if (historyStart !== null) {
    timestamps.push(historyStart);
  }

  if (accountCreatedAt) {
    const accountTimestamp = new Date(accountCreatedAt).getTime();
    if (!Number.isNaN(accountTimestamp)) {
      timestamps.push(accountTimestamp);
    }
  }

  if (timestamps.length === 0) {
    return "Tracking since unavailable";
  }

  return `Tracking since ${format(new Date(Math.min(...timestamps)), "MMMM yyyy")}`;
}

function formatHours(totalFocusMs: number) {
  const hours = totalFocusMs / (60 * 60 * 1000);
  return `${hours.toFixed(hours >= 100 ? 0 : 1)} h`;
}

function SectionLabel({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{children}</p>;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#0F1528] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-base font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export function GlobalProfileButton({ variant = "desktop" }: GlobalProfileButtonProps) {
  const { user } = useAuth();
  const { state, actions } = useKromeStore();
  const { history, settings, subjects } = state;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const hasAccount = typeof window !== "undefined" && localStorage.getItem("krome_has_account") === "true";

  useEffect(() => {
    if (user && isAuthModalOpen) {
      setIsAuthModalOpen(false);
    }
    if (!user && isProfileOpen) {
      setIsProfileOpen(false);
    }
  }, [user, isAuthModalOpen, isProfileOpen]);

  useEffect(() => {
    if (!isProfileOpen) {
      return;
    }

    document.body.classList.add("krome-modal-open");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("krome-modal-open");
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  const displayName = deriveDisplayName(user?.email, user?.user_metadata as Record<string, unknown> | undefined);
  const initials = deriveInitials(displayName, user?.email);
  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined;

  let totalBlocksCompleted = 0;
  let totalFocusMs = 0;
  let measuredMs = 0;
  let historyStart: number | null = history.length > 0 ? history[0].startedAt : null;
  const subjectDurations = new Map<string, number>();
  const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));

  for (const entry of history) {
    if (entry.completed) {
      totalBlocksCompleted += 1;
    }

    const focusMs = entry.actualFocusDurationMs ?? entry.durationMs;
    const interruptMs = entry.interruptDurationMs ?? 0;

    totalFocusMs += focusMs;
    measuredMs += focusMs + interruptMs;
    historyStart = historyStart === null ? entry.startedAt : Math.min(historyStart, entry.startedAt);

    if (focusMs <= 0) {
      continue;
    }

    const subjectName =
      (entry.subjectId ? subjectNameById.get(entry.subjectId) : undefined) ??
      entry.subject?.trim() ??
      "Universal";
    const normalizedSubjectName = subjectName.length > 0 ? subjectName : "Universal";

    subjectDurations.set(normalizedSubjectName, (subjectDurations.get(normalizedSubjectName) ?? 0) + focusMs);
  }

  let mostFocusedSubject = "None";
  let longestSubjectDuration = 0;
  subjectDurations.forEach((duration, subjectName) => {
    if (duration > longestSubjectDuration) {
      longestSubjectDuration = duration;
      mostFocusedSubject = subjectName;
    }
  });

  const protectionRatio = measuredMs > 0 ? `${((totalFocusMs / measuredMs) * 100).toFixed(1)}%` : "--";
  const trackingSinceLabel = formatTrackingSinceLabel(historyStart, user?.created_at);

  const triggerButton = user ? (
    variant === "mobile" ? (
      <button
        type="button"
        aria-label="Open profile"
        onClick={() => setIsProfileOpen(true)}
        className="h-7 w-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-bold text-kromeAccent uppercase transition-colors hover:bg-slate-800"
      >
        {initials.slice(0, 1)}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setIsProfileOpen(true)}
        className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-sm transition-colors hover:border-slate-700 hover:bg-slate-800/70"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-kromeAccent/20 text-xs font-bold uppercase text-kromeAccent">
          {initials.slice(0, 2)}
        </div>
        <span className="hidden max-w-[140px] truncate text-xs font-medium text-slate-300 md:block">
          {user.email}
        </span>
      </button>
    )
  ) : (
    <button
      type="button"
      onClick={() => setIsAuthModalOpen(true)}
      className={
        variant === "mobile"
          ? "h-7 w-7 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center transition-colors hover:bg-slate-800"
          : "flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-300 transition-colors hover:bg-slate-800/70"
      }
    >
      <User size={variant === "mobile" ? 12 : 13} className="text-slate-400" />
      {variant === "mobile" ? null : <span>{hasAccount ? "Sign In" : "Sign Up"}</span>}
    </button>
  );

  return (
    <>
      {triggerButton}

      {user && typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {isProfileOpen ? (
                <div data-krome-overlay="true" className="fixed inset-0 z-[9999] overflow-hidden">
                  <motion.button
                    type="button"
                    aria-label="Close profile"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#080C18]/78 backdrop-blur-[2px]"
                    onClick={() => setIsProfileOpen(false)}
                  />

                  <motion.aside
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.95 }}
                    className="absolute inset-y-0 right-0 flex h-full w-full max-w-[420px] flex-col border-l border-slate-800 bg-[#0B1020]/95 text-slate-200 shadow-[0_0_32px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="krome-profile-title"
                    aria-describedby="krome-profile-description"
                  >
                    <div className="flex h-full flex-col">
                      <div className="border-b border-slate-800/80 px-6 py-5 pr-14">
                        <button
                          type="button"
                          aria-label="Close profile"
                          onClick={() => setIsProfileOpen(false)}
                          className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                        >
                          <X size={18} />
                        </button>
                        <h2
                          id="krome-profile-title"
                          className="text-base font-semibold uppercase tracking-[0.18em] text-slate-100"
                        >
                          Profile
                        </h2>
                        <p id="krome-profile-description" className="mt-1 text-sm text-slate-500">
                          Identity, discipline summary, and defaults.
                        </p>
                      </div>

                      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
                        <section className="space-y-3">
                          <SectionLabel>Identity</SectionLabel>
                          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                            <div className="flex items-center gap-4">
                              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-slate-700/80 bg-slate-950">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="bg-kromeAccent/15 text-sm font-semibold uppercase text-kromeAccent">
                                    {initials}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-lg font-semibold text-slate-100">{displayName}</p>
                                <p className="truncate text-sm text-slate-400">{user.email}</p>
                                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                                  {trackingSinceLabel}
                                </p>
                              </div>
                            </div>
                          </div>
                        </section>

                        <section className="space-y-3">
                          <SectionLabel>Discipline Summary</SectionLabel>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <SummaryCard
                              label="Total blocks completed"
                              value={totalBlocksCompleted.toLocaleString()}
                            />
                            <SummaryCard label="Protection ratio" value={protectionRatio} />
                            <SummaryCard label="Most-focused subject" value={mostFocusedSubject} />
                            <SummaryCard label="Focus hours logged" value={formatHours(totalFocusMs)} />
                          </div>
                        </section>

                        <section className="space-y-3">
                          <SectionLabel>Preferences</SectionLabel>
                          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
                            <div className="space-y-6">
                              <KromeSlider
                                label="Default block length (min)"
                                value={settings.blockMinutes}
                                min={1}
                                max={180}
                                onValueChange={(value) =>
                                  actions.setSettings({
                                    ...settings,
                                    blockMinutes: clamp(value, 1, 180),
                                  })
                                }
                              />
                              <KromeSlider
                                label="Default plip interval (min)"
                                value={settings.intervalMinutes}
                                min={1}
                                max={60}
                                onValueChange={(value) =>
                                  actions.setSettings({
                                    ...settings,
                                    intervalMinutes: clamp(value, 1, 60),
                                  })
                                }
                              />
                              <KromeToggle
                                label="Notifications"
                                description="Browser notifications on block events."
                                checked={settings.notifications}
                                onCheckedChange={(value) =>
                                  actions.setSettings({
                                    ...settings,
                                    notifications: value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        </section>
                      </div>

                      <div className="border-t border-slate-800/80 px-6 py-4">
                        <SectionLabel>Account Actions</SectionLabel>
                        <button
                          type="button"
                          onClick={async () => {
                            setIsProfileOpen(false);
                            await supabase.auth.signOut();
                          }}
                          className="mt-3 w-full rounded-2xl border border-slate-800 bg-transparent px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-red-500/30 hover:bg-red-500/5 hover:text-slate-100"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </motion.aside>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}
