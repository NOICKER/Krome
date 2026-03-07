import { InsightFlashcard, KromeSubject } from "../../types";
import { InsightCard } from "./InsightCard";

interface InsightFlashcardCarouselProps {
  cards: InsightFlashcard[];
  subjects: KromeSubject[];
}

export function InsightFlashcardCarousel({ cards, subjects }: InsightFlashcardCarouselProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-display font-bold uppercase tracking-widest text-slate-300">Insights</h3>
        <p className="text-xs text-slate-500 mt-1">Recent signals generated from your session history.</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {cards.map((card) => {
          const subject = card.relevantSubjectId
            ? subjects.find((entry) => entry.id === card.relevantSubjectId)
            : undefined;

          return <InsightCard key={card.id} card={card} subject={subject} />;
        })}
      </div>
    </section>
  );
}
