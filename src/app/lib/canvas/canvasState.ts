export const CARD_W = 240;
export const CARD_H = 160;
export const CARD_TITLE_H = 28;
export const STICKY_W = 140;
export const STICKY_H = 140;

function createRect(x: number, y: number, width: number, height: number) {
  return { x, y, width, height };
}

export function createUnsavedCard({ base64Image, dims, scale, stagePos, now = Date.now() }: any) {
  const centeredX = (-stagePos.x + dims.w / 2) / scale - CARD_W / 2;
  const centeredY = (-stagePos.y + dims.h / 2) / scale - CARD_H / 2;

  return {
    id: `unsaved_${now}`,
    _unsaved: true,
    _base64: base64Image,
    canvasPos: { x: centeredX, y: centeredY },
    w: CARD_W,
    h: CARD_H,
    tags: [],
    errorType: '',
    status: 'unseen',
    note: '',
    whyWrong: '',
    annotations: [],
    masks: [],
    ocrText: '',
    canvasId: 'main',
  };
}

export function getCardRect(card: any) {
  return createRect(
    card.canvasPos?.x || 0,
    card.canvasPos?.y || 0,
    card.w || CARD_W,
    (card.h || CARD_H) + CARD_TITLE_H,
  );
}

export function getStickyRect(sticky: any) {
  return createRect(
    sticky.x || 0,
    sticky.y || 0,
    sticky.w || STICKY_W,
    sticky.h || STICKY_H,
  );
}

function rectsIntersect(a: any, b: any) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function getVisibleCardIds(cards: any[], viewport: any) {
  return cards
    .filter((card) => rectsIntersect(getCardRect(card), viewport))
    .map((card) => card.id);
}

export function getVisibleStickyIds(stickies: any[], viewport: any) {
  return stickies
    .filter((sticky) => rectsIntersect(getStickyRect(sticky), viewport))
    .map((sticky) => sticky.id);
}

export function getWorldViewport({ dims, scale, stagePos }: any) {
  return {
    x: -stagePos.x / scale,
    y: -stagePos.y / scale,
    width: dims.w / scale,
    height: dims.h / scale,
  };
}

export function getContentBounds(cards: any[] = [], stickies: any[] = []) {
  const rects = [...cards.map(getCardRect), ...stickies.map(getStickyRect)];
  if (rects.length === 0) {
    return null;
  }

  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));

  return createRect(left, top, right - left, bottom - top);
}

export function getZoomToFitTransform({
  cards = [],
  stickies = [],
  dims,
  padding = 80,
  minScale = 0.1,
  maxScale = 4,
}: any) {
  const bounds = getContentBounds(cards, stickies);
  if (!bounds) {
    return { scale: 1, stagePos: { x: 0, y: 0 } };
  }

  const safeWidth = Math.max(bounds.width + padding * 2, 1);
  const safeHeight = Math.max(bounds.height + padding * 2, 1);
  const nextScale = Math.max(minScale, Math.min(maxScale, Math.min(dims.w / safeWidth, dims.h / safeHeight)));
  const contentCenterX = bounds.x + bounds.width / 2;
  const contentCenterY = bounds.y + bounds.height / 2;

  return {
    scale: nextScale,
    stagePos: {
      x: dims.w / 2 - contentCenterX * nextScale,
      y: dims.h / 2 - contentCenterY * nextScale,
    },
  };
}

export function getZoom100Transform({ dims, scale, stagePos }: any) {
  const centerX = (-stagePos.x + dims.w / 2) / scale;
  const centerY = (-stagePos.y + dims.h / 2) / scale;

  return {
    scale: 1,
    stagePos: {
      x: dims.w / 2 - centerX,
      y: dims.h / 2 - centerY,
    },
  };
}

export function getCardFocusTransform({ card, dims, scale = 1 }: any) {
  const rect = getCardRect(card);

  return {
    scale,
    stagePos: {
      x: dims.w / 2 - (rect.x + rect.width / 2) * scale,
      y: dims.h / 2 - (rect.y + rect.height / 2) * scale,
    },
  };
}

export function getNextCanvasCardPosition({
  existingCardCount,
  startX = 120,
  startY = 120,
  gapX = 280,
  gapY = 220,
  columns = 4,
}: any) {
  const column = existingCardCount % columns;
  const row = Math.floor(existingCardCount / columns);

  return {
    x: startX + column * gapX,
    y: startY + row * gapY,
  };
}

export function duplicateCards({
  cards,
  annotations = [],
  selectedCardIds = [],
  offset = 24,
  idFactory = () => `copy_${Date.now()}_${Math.random().toString(36).slice(2)}`,
}: any) {
  const cardCopies: any[] = [];
  const annotationCopies: any[] = [];
  const nextSelectedIds: string[] = [];

  for (const sourceId of selectedCardIds) {
    const sourceCard = cards.find((card: any) => card.id === sourceId);
    if (!sourceCard) continue;

    const nextCardId = idFactory();
    nextSelectedIds.push(nextCardId);
    cardCopies.push({
      ...sourceCard,
      id: nextCardId,
      _unsaved: true,
      sourceCardId: sourceCard.id,
      canvasPos: {
        x: (sourceCard.canvasPos?.x || 0) + offset,
        y: (sourceCard.canvasPos?.y || 0) + offset,
      },
    });

    const sourceAnnotations = annotations.filter((annotation: any) => annotation.cardId === sourceId);
    for (const annotation of sourceAnnotations) {
      annotationCopies.push({
        ...annotation,
        id: idFactory(),
        cardId: nextCardId,
      });
    }
  }

  return {
    cards: cardCopies,
    annotations: annotationCopies,
    selectedCardIds: nextSelectedIds,
  };
}

export function duplicateStickies({
  stickies,
  selectedStickyIds = [],
  offset = 24,
  idFactory = () => `sticky_${Date.now()}_${Math.random().toString(36).slice(2)}`,
}: any) {
  const copies: any[] = [];
  const nextSelectedIds: string[] = [];

  for (const stickyId of selectedStickyIds) {
    const sourceSticky = stickies.find((sticky: any) => sticky.id === stickyId);
    if (!sourceSticky) continue;

    const nextStickyId = idFactory();
    nextSelectedIds.push(nextStickyId);
    copies.push({
      ...sourceSticky,
      id: nextStickyId,
      x: (sourceSticky.x || 0) + offset,
      y: (sourceSticky.y || 0) + offset,
    });
  }

  return { stickies: copies, selectedStickyIds: nextSelectedIds };
}

export function getCardAnnotations(annotations: any[], cardId: string) {
  return annotations.filter((annotation) => annotation.cardId === cardId);
}

export function buildCardPayload(card: any, annotations: any[]) {
  return {
    ...card,
    annotations: getCardAnnotations(annotations, card.id),
    masks: card.masks || [],
    ocrText: card.ocrText || '',
    canvasId: card.canvasId || 'main',
  };
}

export function moveCards(cards: any[], selectedCardIds: string[], dx: number, dy: number) {
  return cards.map((card) => (
    selectedCardIds.includes(card.id)
      ? {
          ...card,
          canvasPos: {
            x: (card.canvasPos?.x || 0) + dx,
            y: (card.canvasPos?.y || 0) + dy,
          },
        }
      : card
  ));
}

export function moveStickies(stickies: any[], selectedStickyIds: string[], dx: number, dy: number) {
  return stickies.map((sticky) => (
    selectedStickyIds.includes(sticky.id)
      ? { ...sticky, x: (sticky.x || 0) + dx, y: (sticky.y || 0) + dy }
      : sticky
  ));
}
