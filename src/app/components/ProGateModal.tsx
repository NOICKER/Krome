import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import posthog from "posthog-js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Palette from "lucide-react/dist/esm/icons/palette";
import Library from "lucide-react/dist/esm/icons/library";
import Network from "lucide-react/dist/esm/icons/network";
import Check from "lucide-react/dist/esm/icons/check";
import { Modal } from "./ui/Modal";

interface ProGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSection?: ProSection;
}

export type ProSection = "canvas" | "library" | "graph";

type ProSectionCopy = {
  label: string;
  icon: typeof Palette;
  summary?: string;
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
};

const WAITLIST_STORAGE_KEY = "krome_pro_waitlist";

const SECTION_COPY: Record<ProSection, ProSectionCopy> = {
  canvas: {
    label: "Canvas",
    icon: Palette,
    features: [
      {
        icon: "\u{1F5C2}",
        title: "Mistake Canvas",
        description:
          "Paste a screenshot the moment you get it wrong. Tag the error type. Build a personal map of exactly where your preparation is breaking down.",
      },
      {
        icon: "\u{1F517}",
        title: "Session Link",
        description:
          "Every mistake card is stamped with the focus session it came from. See if your worst mistakes happen when your protection ratio drops.",
      },
      {
        icon: "\u25C9",
        title: "Pattern Diagnosis",
        description:
          "Your error type matrix shows which topics correlate with which failure modes. AI reads the pattern in plain language.",
      },
    ],
  },
  library: {
    label: "Library",
    icon: Library,
    summary: "Keep every weak card in one repair loop instead of letting mistakes disappear after the session ends.",
    features: [
      {
        icon: "\u{1F5C2}",
        title: "Weak Stack",
        description:
          "Wrong, shaky, and due cards live in one place so you can review the exact material that still leaks marks.",
      },
      {
        icon: "\u{1F517}",
        title: "Context Filters",
        description:
          "Sort by topic, status, and mistake type when you need a precise repair pass instead of random review.",
      },
      {
        icon: "\u25C9",
        title: "Open Back To Canvas",
        description:
          "Jump from the library to the full canvas context when a card needs the surrounding pattern, not just the thumbnail.",
      },
    ],
  },
  graph: {
    label: "Graph",
    icon: Network,
    summary: "See the connections between repeated misses before they keep showing up as separate surprises.",
    features: [
      {
        icon: "\u{1F5C2}",
        title: "Topic Clusters",
        description:
          "Watch related cards pull together around the same weak areas so the recurring trouble spots become obvious.",
      },
      {
        icon: "\u{1F517}",
        title: "Failure Chains",
        description:
          "Track which error types keep co-occurring across subjects, sessions, and review outcomes.",
      },
      {
        icon: "\u25C9",
        title: "Readable Insights",
        description:
          "AI summarizes the pattern in plain language so you can act on it without decoding the graph yourself.",
      },
    ],
  },
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readWaitlistEmails() {
  try {
    const raw = window.localStorage.getItem(WAITLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
  } catch {
    return [];
  }
}

function saveWaitlistEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const nextEmails = Array.from(new Set([...readWaitlistEmails(), normalized]));
  window.localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(nextEmails));
}

export function ProGateModal({
  isOpen,
  onClose,
  defaultSection = "canvas",
}: ProGateModalProps) {
  const [activeSection, setActiveSection] = useState<ProSection>(defaultSection);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setActiveSection(defaultSection);
    setShowForm(false);
    setEmail("");
    setIsSubmitting(false);
    setIsSubmitted(false);
    setErrorMessage("");
  }, [defaultSection, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    posthog.capture("pro_gate_viewed", {
      timestamp: new Date().toISOString(),
    });
  }, [isOpen]);

  const activeCopy = useMemo(() => SECTION_COPY[activeSection], [activeSection]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    saveWaitlistEmail(normalizedEmail);
    posthog.capture("pro_waitlist_signup", {
      email: normalizedEmail,
      plan_viewed: "yearly",
      timestamp: new Date().toISOString(),
    });
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  const handleDismiss = () => {
    posthog.capture("pro_gate_dismissed", {
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="KROME PRO"
      panelClassName="max-w-4xl"
      bodyClassName="p-0"
    >
      <div className="bg-[#080C18]">
        <div className="border-b border-slate-800 bg-slate-950/70 px-6 py-5">
          <div className="flex items-center gap-2 text-kromeAccent">
            <Sparkles size={14} />
            <span className="text-[11px] font-bold uppercase tracking-[0.28em]">Canvas Layer</span>
          </div>
          <h3 className="mt-4 max-w-3xl text-2xl font-display font-bold leading-tight text-slate-100">
            You know your focus data. Now find out why you keep getting the same questions wrong.
          </h3>
        </div>

        <div className="grid gap-8 px-6 py-6 lg:grid-cols-[minmax(0,1.4fr)_320px]">
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {(Object.entries(SECTION_COPY) as [ProSection, ProSectionCopy][]).map(([sectionKey, section]) => {
                const Icon = section.icon;
                const isActive = activeSection === sectionKey;

                return (
                  <button
                    key={sectionKey}
                    type="button"
                    onClick={() => setActiveSection(sectionKey)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-kromeAccent/45 bg-kromeAccent/12 text-kromeAccent shadow-[0_0_18px_rgba(111,120,181,0.18)]"
                        : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/55 p-5 sm:p-6">
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-kromeAccent">
                  {activeCopy.label}
                </p>
                {activeCopy.summary ? (
                  <p className="mt-3 text-sm leading-6 text-slate-400">{activeCopy.summary}</p>
                ) : null}
              </div>

              <div className="space-y-3">
                {activeCopy.features.map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-slate-800 bg-[#080C18]/80 px-4 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-lg leading-none">{feature.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{feature.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-kromeAccent/20 bg-slate-950/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-kromeAccent">Pricing</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Monthly</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">Rs 149/month</p>
              </div>

              <div className="rounded-2xl border border-kromeAccent/40 bg-kromeAccent/10 px-4 py-3 shadow-[0_0_20px_rgba(111,120,181,0.18)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-kromeAccent">Yearly</p>
                  <span className="rounded-full border border-kromeAccent/35 bg-[#080C18]/80 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-kromeAccent">
                    Most Popular
                  </span>
                </div>
                <p className="mt-2 text-lg font-semibold text-slate-100">Rs 999/year</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Lifetime</p>
                <p className="mt-2 text-lg font-semibold text-slate-100">Rs 2499 lifetime</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-800 bg-[#080C18]/90 p-4">
              {!showForm && !isSubmitted ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-kromeAccent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-kromeAccent/85"
                >
                  Get Early Access {"\u2192"}
                </button>
              ) : null}

              {showForm && !isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <label htmlFor="krome-pro-email" className="block text-sm font-medium text-slate-100">
                    Enter your email to join the waitlist
                  </label>
                  <input
                    id="krome-pro-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-kromeAccent/60"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-kromeAccent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-kromeAccent/85 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                  {errorMessage ? (
                    <p className="text-xs leading-5 text-amber-300">{errorMessage}</p>
                  ) : null}
                </form>
              ) : null}

              {isSubmitted ? (
                <div className="rounded-2xl border border-kromeAccent/30 bg-kromeAccent/10 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-full bg-kromeAccent/20 p-1 text-kromeAccent">
                      <Check size={14} />
                    </span>
                    <p className="text-sm font-medium text-slate-100">
                      You're on the list. We'll reach out within 48 hours.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="mt-4 w-full rounded-xl border border-slate-800 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
            >
              Maybe later
            </button>
          </aside>
        </div>
      </div>
    </Modal>
  );
}
