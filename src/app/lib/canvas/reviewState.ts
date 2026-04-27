import { isCardDueForReview } from './libraryState';

function addDays(date: Date | string | number, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
}

export function filterExamCards(cards: any[] = [], mode = 'wrong-shaky', today = new Date()) {
  if (mode === 'due') {
    return cards.filter((card) => isCardDueForReview(card, today));
  }
  if (mode === 'wrong-only') {
    return cards.filter((card) => card.status === 'wrong');
  }
  if (mode === 'all-weak') {
    return cards.filter((card) => card.status !== 'correct');
  }

  return cards.filter((card) => ['wrong', 'shaky'].includes(card.status));
}

export function shuffleCards(cards: any[] = [], random = Math.random) {
  const nextCards = [...cards];
  for (let index = nextCards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [nextCards[index], nextCards[swapIndex]] = [nextCards[swapIndex], nextCards[index]];
  }
  return nextCards;
}

export function getExamTimerMs(timerMode: string, customMinutes = 0) {
  if (timerMode === '45:00') return 45 * 60 * 1000;
  if (timerMode === 'custom') return Math.max(1, Number(customMinutes || 0)) * 60 * 1000;
  return null;
}

export function getNextReviewForResponse(response: string, today = new Date()) {
  if (response === 'got-it') return addDays(today, 4);
  if (response === 'shaky') return addDays(today, 1);
  return addDays(today, 1);
}

export function applyExamResponse(card: any, response: string, today = new Date()) {
  const nextStatus =
    response === 'got-it'
      ? 'correct'
      : response === 'shaky'
        ? 'shaky'
        : 'wrong';

  return {
    ...card,
    status: nextStatus,
    next_review: getNextReviewForResponse(response, today),
  };
}

export function buildExamResults(cards: any[] = [], responses: any[] = []) {
  const responseMap = new Map(responses.map((response) => [response.cardId, response.result]));
  const gotIt = responses.filter((response) => response.result === 'got-it').length;
  const shaky = responses.filter((response) => response.result === 'shaky').length;
  const missed = responses.filter((response) => response.result === 'missed-it').length;
  const score = responses.length ? Math.round((gotIt / responses.length) * 100) : 0;
  const weakTopics = [...new Set(
    cards
      .filter((card) => responseMap.get(card.id) === 'missed-it')
      .flatMap((card) => card.tags || [])
      .map((tag: string) => String(tag || '').trim().toLowerCase())
      .filter(Boolean),
  )];

  return {
    gotIt,
    shaky,
    missed,
    score,
    weakTopics,
  };
}
