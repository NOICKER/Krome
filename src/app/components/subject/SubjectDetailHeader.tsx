import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Play from "lucide-react/dist/esm/icons/play";
import { KromeSubject } from "../../types";

interface SubjectDetailHeaderProps {
  subject: KromeSubject;
  onBack: () => void;
  onStart: () => void;
}

export function SubjectDetailHeader({ subject, onBack, onStart }: SubjectDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 hover:text-slate-300">
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color ?? "#62699D" }} />
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-display font-bold tracking-tight text-slate-100">{subject.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Subject intelligence dashboard</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-kromeAccent px-4 text-sm font-semibold text-white hover:bg-kromeAccent/85"
      >
        <Play size={16} fill="currentColor" />
        Start Focus
      </button>
    </div>
  );
}
