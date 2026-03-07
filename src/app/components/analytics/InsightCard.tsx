import { InsightFlashcard, KromeSubject, SeverityLevel } from "../../types";

interface InsightCardProps {
  card: InsightFlashcard;
  subject?: KromeSubject;
}

const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  [SeverityLevel.Neutral]: "border-slate-700 bg-slate-900/80 text-slate-200",
  [SeverityLevel.Advisory]: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  [SeverityLevel.Concern]: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  [SeverityLevel.Direct]: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  [SeverityLevel.Accountability]: "border-red-500/20 bg-red-500/10 text-red-300",
};

export function InsightCard({ card, subject }: InsightCardProps) {
  return (
    <article
      className="min-w-[280px] max-w-[340px] snap-start rounded-2xl border px-5 py-4 flex-shrink-0 bg-slate-900/90"
      style={{ borderColor: subject?.color ?? undefined }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${SEVERITY_STYLES[card.severityLevel]}`}>
            Severity {card.severityLevel}
          </p>
          <h4 className="text-base font-semibold text-slate-100 mt-3">{card.title}</h4>
        </div>
        {card.metric ? <span className="text-sm font-mono text-kromeAccent">{card.metric}</span> : null}
      </div>
      <p className="text-sm text-slate-400 mt-3 leading-6">{card.description}</p>
      {subject ? <p className="text-xs text-slate-500 mt-4">Relevant subject: {subject.name}</p> : null}
    </article>
  );
}
