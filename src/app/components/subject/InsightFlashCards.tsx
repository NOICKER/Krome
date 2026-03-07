import { InsightFlashcard, KromeSubject } from "../../types";
import { InsightCard } from "../dashboard/InsightCard";

interface InsightFlashCardsProps {
  cards: InsightFlashcard[];
  subject: KromeSubject;
}

export function InsightFlashCards({ cards, subject }: InsightFlashCardsProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-display font-bold uppercase tracking-widest text-slate-300">Insight Flashcards</h3>
        <p className="mt-1 text-xs text-slate-500">Deterministic flags for this subject.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {cards.map((card) => (
          <InsightCard key={card.id} card={card} subject={subject} />
        ))}
      </div>
    </section>
  );
}
