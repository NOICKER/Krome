import { Modal } from "./ui/Modal";

interface ProGateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRO_FEATURES = [
  "Unlimited mistake cards",
  "Session-mistake correlation",
  "Pattern insights",
  "Knowledge graph",
  "Full session history",
];

export function ProGateModal({ isOpen, onClose }: ProGateModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="KROME Pro">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-100">Mistake logging is a Pro workflow.</p>
          <p className="text-sm leading-6 text-slate-400">
            Free keeps your focus blocks running. Pro unlocks the canvas layer that connects mistakes back to your sessions.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-[#080C18]/70 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Free</p>
            <p className="mt-3 text-sm text-slate-300">Focus blocks, read-only canvas, and 7-day session history.</p>
          </section>

          <section className="rounded-2xl border border-kromeAccent/40 bg-kromeAccent/10 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-kromeAccent">Pro</p>
            <p className="mt-3 text-sm text-slate-200">Rs 149/month, Rs 999/year, or Rs 2499 lifetime.</p>
          </section>
        </div>

        <ul className="space-y-2">
          {PRO_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-kromeAccent" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-700 hover:text-slate-100">
            Maybe later
          </button>
          <a
            href="mailto:am6201493@gmail.com?subject=KROME Pro Upgrade"
            className="rounded-xl bg-kromeAccent px-4 py-2 text-center text-sm font-semibold text-white hover:bg-kromeAccent/85"
          >
            Upgrade to Pro
          </a>
        </div>
      </div>
    </Modal>
  );
}
