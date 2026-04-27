import { isCardDueForReview } from './libraryState';

const ERROR_TYPES = ['conceptual', 'calculation', 'misread', 'careless'];

function normalizeTag(tag: string) {
  return String(tag || '').trim().toLowerCase();
}

export function buildDashboardStats(cards: any[] = [], config: any = {}, today = new Date()) {
  const weakCards = cards.filter((card) => ['wrong', 'shaky'].includes(card.status));
  const weakTags = new Set(
    weakCards.flatMap((card) => (card.tags || []).map(normalizeTag).filter(Boolean)),
  );

  return {
    totalCards: cards.length,
    dueCount: cards.filter((card) => isCardDueForReview(card, today)).length,
    weakAreaCount: weakTags.size,
    lastSessionScore: Number(config.lastSessionScore || 0),
  };
}

export function buildErrorMatrix(cards: any[] = []) {
  const rows = new Map();

  cards
    .filter((card) => ['wrong', 'shaky'].includes(card.status))
    .forEach((card) => {
      (card.tags || []).forEach((tag: string) => {
        const normalizedTag = normalizeTag(tag);
        if (!normalizedTag) return;

        if (!rows.has(normalizedTag)) {
          rows.set(normalizedTag, {
            tag: normalizedTag,
            conceptual: 0,
            calculation: 0,
            misread: 0,
            careless: 0,
            total: 0,
          });
        }

        const row = rows.get(normalizedTag);
        if (ERROR_TYPES.includes(card.errorType)) {
          row[card.errorType] += 1;
        }
        row.total += 1;
      });
    });

  return [...rows.values()].sort((left, right) => right.total - left.total || left.tag.localeCompare(right.tag));
}

export function getMatrixCellTone(count: number) {
  if (count <= 0) return '#1A1A1D';
  if (count <= 2) return 'rgba(232,131,74,0.3)';
  if (count <= 4) return 'rgba(232,131,74,0.6)';
  return '#E8834A';
}
