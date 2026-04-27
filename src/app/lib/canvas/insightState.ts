const ERROR_TYPES = ['conceptual', 'calculation', 'misread', 'careless'];
const INSIGHT_INTERVAL_MS = 60 * 60 * 1000;
const GEMINI_MODEL = 'gemini-2.5-flash';

function normalizeText(value: any) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCardInsight(card: any) {
  return {
    tags: card.tags || [],
    errorType: card.errorType || null,
    whyWrong: card.whyWrong || '',
    note: card.note || '',
  };
}

export function buildInsightSummary(cards: any[] = []) {
  const weakCards = cards.filter((card) => ['wrong', 'shaky'].includes(card.status));
  const wrongCards = weakCards
    .filter((card) => card.status === 'wrong')
    .map(normalizeCardInsight);
  const shakyCards = weakCards
    .filter((card) => card.status === 'shaky')
    .map(normalizeCardInsight);
  const errorTypeCounts = Object.fromEntries(ERROR_TYPES.map((type) => [type, 0]));
  const weakTagCounts = new Map();

  weakCards.forEach((card) => {
    if (errorTypeCounts[card.errorType] !== undefined) {
      errorTypeCounts[card.errorType] += 1;
    }

    (card.tags || []).forEach((tag: string) => {
      const normalizedTag = normalizeText(tag);
      if (!normalizedTag) return;
      weakTagCounts.set(normalizedTag, (weakTagCounts.get(normalizedTag) || 0) + 1);
    });
  });

  const topWeakTags = [...weakTagCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([tag]) => tag);

  return {
    totalCards: cards.length,
    wrongCards,
    shakyCards,
    errorTypeCounts,
    topWeakTags,
  };
}

export function shouldRunInsights(config: any = {}, totalCards = 0, now: any = new Date(), force = false) {
  if (force) return true;
  if (!config.lastInsightRun) return true;

  const lastRunTime = new Date(config.lastInsightRun).getTime();
  if (Number.isNaN(lastRunTime)) return true;

  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (Number.isNaN(nowTime)) return true;

  const hourElapsed = nowTime - lastRunTime >= INSIGHT_INTERVAL_MS;
  if (!hourElapsed) return false;

  const lastCount = Number(config.lastInsightCardCount || 0);
  return totalCards >= lastCount || totalCards - lastCount >= 5;
}

export function normalizeInsightList(text: string) {
  const rawText = String(text || '').trim();
  if (!rawText) return [];

  try {
    const parsed = JSON.parse(rawText);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .slice(0, 3);
    }
  } catch (error) {
    // Fall through to line parsing.
  }

  return rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\-\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function extractGeminiText(responseJson: any) {
  return responseJson?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('\n') || '';
}

export async function testGeminiConnection(apiKey: string, fetchImpl = globalThis.fetch) {
  const normalizedKey = String(apiKey || '').trim();

  if (!normalizedKey) {
    return {
      valid: false,
      code: 'missing_key',
      message: 'Enter a Gemini API key first.',
    };
  }

  if (typeof fetchImpl !== 'function') {
    return {
      valid: false,
      code: 'fetch_unavailable',
      message: 'Unable to run network check in this environment.',
    };
  }

  try {
    const response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${normalizedKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with exactly: OK' }] }],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          code: 'auth_failed',
          message: 'Key rejected by Gemini (401/403). Check the key and API access.',
        };
      }

      if (response.status === 429) {
        return {
          valid: false,
          code: 'rate_limited',
          message: 'Gemini rate limit reached. Try again in a minute.',
        };
      }

      return {
        valid: false,
        code: 'unreachable',
        message: 'Could not reach Gemini. Check internet connection and API availability.',
      };
    }

    return {
      valid: true,
      code: 'connected',
      message: `Connected to Gemini (${GEMINI_MODEL}).`,
    };
  } catch (error) {
    return {
      valid: false,
      code: 'unreachable',
      message: 'Could not reach Gemini. Check internet connection and API availability.',
    };
  }
}

export function buildNotesPatternFallback(notesText: string, insights: string[] = []) {
  const normalizedNotes = normalizeText(notesText);
  const matchingInsights = insights.filter((insight) => {
    const words = normalizeText(insight).split(/\s+/).filter((word) => word.length >= 4);
    return words.some((word) => normalizedNotes.includes(word));
  });

  return matchingInsights[0] || '';
}
