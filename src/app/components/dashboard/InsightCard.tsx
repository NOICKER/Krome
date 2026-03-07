import { InsightFlashcard, KromeSubject, SeverityLevel } from "../../types";

const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  [SeverityLevel.Neutral]: "border-slate-700 bg-slate-900/80 text-slate-300",
  [SeverityLevel.Advisory]: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  [SeverityLevel.Concern]: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  [SeverityLevel.Direct]: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  [SeverityLevel.Accountability]: "border-red-500/20 bg-red-500/10 text-red-300",
};

interface InsightCardProps {
  card: InsightFlashcard;
  subject?: KromeSubject;
}

export function InsightCard({ card, subject }: InsightCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-display font-bold uppercase tracking-widest text-slate-200">
            {card.title}
          </p>
          {card.dataMirror || card.metric ? (
            <p className="text-xs text-slate-500 mt-1">{card.dataMirror ?? card.metric}</p>
          ) : null}
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${SEVERITY_STYLES[card.severityLevel]}`}
        >
          S{card.severityLevel}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-slate-400">{card.description}</p>
        {card.guidance ? <p className="text-sm text-slate-200">{card.guidance}</p> : null}
      </div>

      {subject ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-[#080C18]/80 px-3 py-1 text-[11px] uppercase tracking-widest text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color ?? "#62699D" }} />
          {subject.name}
        </div>
      ) : null}
    </article>
  );
}
