const STATUS_WEAKNESS: Record<string, number> = {
  wrong: 0,
  shaky: 1,
  unseen: 2,
  correct: 3,
};

const STATUS_FILTERS = new Set(['wrong', 'shaky', 'unseen', 'correct']);

function normalizeText(value: any) {
  return String(value || '').trim().toLowerCase();
}

function getTime(value: any) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getTopic(card: any) {
  return normalizeText(card.tags?.[0] || '~');
}

function getWeaknessRank(status: string) {
  return STATUS_WEAKNESS[status] ?? STATUS_WEAKNESS.unseen;
}

function getErrorSignalScore(card: any) {
  const baseScore: Record<string, number> = {
    wrong: 30,
    shaky: 20,
    unseen: 10,
    correct: 0,
  };
  const score = baseScore[card.status] ?? 10;

  return (
    score +
    (card.annotations?.length || 0) * 2 +
    (card.masks?.length || 0) * 3 +
    (card.tags?.length || 0)
  );
}

export function matchesLibraryQuery(card: any, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return true;

  const haystack = [
    card.note,
    card.whyWrong,
    card.errorType,
    card.ocrText,
    ...(card.tags || []),
  ]
    .map(normalizeText)
    .join(' ');

  return haystack.includes(normalizedQuery);
}

export function isCardDueForReview(card: any, today = new Date()) {
  if (!card?.next_review) return false;
  return getTime(card.next_review) <= today.getTime();
}

export function cardMatchesLibraryFilters(card: any, filters: string[] = [], today = new Date()) {
  if (!filters.length || filters.includes('all')) return true;

  const selectedStatuses = filters.filter((filterId) => STATUS_FILTERS.has(filterId));
  if (selectedStatuses.length && !selectedStatuses.includes(card.status || 'unseen')) {
    return false;
  }

  if (filters.includes('has-mask') && !(card.masks?.length > 0)) {
    return false;
  }

  if (filters.includes('due-review') && !isCardDueForReview(card, today)) {
    return false;
  }

  return true;
}

export function sortLibraryCards(cards: any[], sortBy = 'newest') {
  const nextCards = [...cards];

  nextCards.sort((leftCard, rightCard) => {
    if (sortBy === 'oldest') {
      return getTime(leftCard.createdAt) - getTime(rightCard.createdAt);
    }

    if (sortBy === 'weakest') {
      const weaknessDiff =
        getWeaknessRank(leftCard.status || 'unseen') - getWeaknessRank(rightCard.status || 'unseen');
      if (weaknessDiff !== 0) return weaknessDiff;
      return getTime(rightCard.updatedAt || rightCard.createdAt) - getTime(leftCard.updatedAt || leftCard.createdAt);
    }

    if (sortBy === 'most-errors') {
      const signalDiff = getErrorSignalScore(rightCard) - getErrorSignalScore(leftCard);
      if (signalDiff !== 0) return signalDiff;
      return getWeaknessRank(leftCard.status || 'unseen') - getWeaknessRank(rightCard.status || 'unseen');
    }

    if (sortBy === 'topic') {
      const topicDiff = getTopic(leftCard).localeCompare(getTopic(rightCard));
      if (topicDiff !== 0) return topicDiff;
      return getTime(rightCard.createdAt) - getTime(leftCard.createdAt);
    }

    return getTime(rightCard.createdAt) - getTime(leftCard.createdAt);
  });

  return nextCards;
}
