import { getCardRect } from './canvasState';

export const CONNECTION_COLORS: Record<string, string> = {
  tag: 'rgba(232,131,74,0.3)',
  errorType: 'rgba(232,96,96,0.3)',
  keyword: 'rgba(91,158,240,0.3)',
};
export const MANUAL_CONNECTION_COLOR = '#E8834A';

const REASON_CURVE_OFFSETS: Record<string, number> = {
  tag: -54,
  errorType: 0,
  keyword: 54,
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have',
  'how', 'into', 'is', 'it', 'its', 'not', 'of', 'on', 'or', 'that', 'the',
  'their', 'them', 'then', 'there', 'these', 'they', 'this', 'to', 'was', 'were',
  'what', 'when', 'where', 'which', 'with', 'your',
]);

export function normalizeTag(tag: string) {
  return String(tag || '').trim().toLowerCase();
}

function getSharedTags(leftTags: string[], rightTags: string[]) {
  const rightSet = new Set((rightTags || []).map(normalizeTag).filter(Boolean));
  return (leftTags || [])
    .map(normalizeTag)
    .filter((tag) => tag && rightSet.has(tag));
}

function getSignificantWords(text: string) {
  return new Set(
    String(text || '')
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((word) => word.length >= 4 && !STOP_WORDS.has(word)) || [],
  );
}

function getKeywordOverlapCount(leftText: string, rightText: string) {
  const leftWords = getSignificantWords(leftText);
  const rightWords = getSignificantWords(rightText);
  let overlapCount = 0;

  for (const word of leftWords) {
    if (rightWords.has(word)) {
      overlapCount += 1;
    }
  }

  return overlapCount;
}

function buildConnection(fromCard: any, toCard: any, reason: string) {
  return {
    from: fromCard.id,
    to: toCard.id,
    reason,
    type: 'auto',
    color: CONNECTION_COLORS[reason],
  };
}

function getCardCenter(card: any) {
  const rect = getCardRect(card);
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

function getEdgePoint(card: any, targetPoint: any) {
  const rect = getCardRect(card);
  const center = getCardCenter(card);
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  const dx = targetPoint.x - center.x;
  const dy = targetPoint.y - center.y;
  const scale = 1 / Math.max(Math.abs(dx) / halfWidth || 0, Math.abs(dy) / halfHeight || 0, 1);

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}

export function deriveAutoConnections(cards: any[] = []) {
  const nextConnections: any[] = [];

  for (let leftIndex = 0; leftIndex < cards.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cards.length; rightIndex += 1) {
      const leftCard = cards[leftIndex];
      const rightCard = cards[rightIndex];

      if (getSharedTags(leftCard.tags, rightCard.tags).length > 0) {
        nextConnections.push(buildConnection(leftCard, rightCard, 'tag'));
      }

      if (
        leftCard.errorType &&
        rightCard.errorType &&
        normalizeTag(leftCard.errorType) === normalizeTag(rightCard.errorType)
      ) {
        nextConnections.push(buildConnection(leftCard, rightCard, 'errorType'));
      }

      if (getKeywordOverlapCount(leftCard.ocrText, rightCard.ocrText) > 2) {
        nextConnections.push(buildConnection(leftCard, rightCard, 'keyword'));
      }
    }
  }

  return nextConnections;
}

export function getConnectionBezierPoints(fromCard: any, toCard: any, reason = 'tag') {
  const fromCenter = getCardCenter(fromCard);
  const toCenter = getCardCenter(toCard);
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const distance = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const curveOffset = REASON_CURVE_OFFSETS[reason] ?? 0;

  const controlPoint1 = {
    x: fromCenter.x + dx / 3 + normalX * curveOffset,
    y: fromCenter.y + dy / 3 + normalY * curveOffset,
  };
  const controlPoint2 = {
    x: fromCenter.x + (dx * 2) / 3 + normalX * curveOffset,
    y: fromCenter.y + (dy * 2) / 3 + normalY * curveOffset,
  };

  return [
    fromCenter.x,
    fromCenter.y,
    controlPoint1.x,
    controlPoint1.y,
    controlPoint2.x,
    controlPoint2.y,
    toCenter.x,
    toCenter.y,
  ];
}

export function getManualConnectionPoints(fromCard: any, toCard: any) {
  const fromCenter = getCardCenter(fromCard);
  const toCenter = getCardCenter(toCard);
  const start = getEdgePoint(fromCard, toCenter);
  const end = getEdgePoint(toCard, fromCenter);

  return [start.x, start.y, end.x, end.y];
}

export function getConnectionMidpoint(points: number[] = []) {
  if (points.length >= 4 && points.length < 8) {
    return {
      x: (points[0] + points[2]) / 2,
      y: (points[1] + points[3]) / 2,
    };
  }

  if (points.length >= 8) {
    return {
      x: (points[0] + 3 * points[2] + 3 * points[4] + points[6]) / 8,
      y: (points[1] + 3 * points[3] + 3 * points[5] + points[7]) / 8,
    };
  }

  return { x: 0, y: 0 };
}

export function mergeCanvasConnections(autoConnections: any[] = [], existingConnections: any[] = []) {
  const manualConnections = (existingConnections || []).filter((connection) => connection.type === 'manual');
  return [...manualConnections, ...autoConnections];
}
