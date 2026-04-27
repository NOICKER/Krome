function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCardImageSize(card: any) {
  return {
    width: Math.max(card?.w || 240, 1),
    height: Math.max(card?.h || 160, 1),
  };
}

export function createMaskFromLocalPoints({
  card,
  start,
  end,
  idFactory = () => `mask_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  minPixelSize = 4,
}: any) {
  const { width, height } = getCardImageSize(card);
  const x1 = clamp(start?.x || 0, 0, width);
  const y1 = clamp(start?.y || 0, 0, height);
  const x2 = clamp(end?.x || x1, 0, width);
  const y2 = clamp(end?.y || y1, 0, height);

  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const rectWidth = Math.abs(x2 - x1);
  const rectHeight = Math.abs(y2 - y1);

  if (rectWidth < minPixelSize || rectHeight < minPixelSize) {
    return null;
  }

  return {
    id: idFactory(),
    x: left / width,
    y: top / height,
    w: rectWidth / width,
    h: rectHeight / height,
    visible: true,
  };
}

export function getMaskRect(mask: any, card: any) {
  const { width, height } = getCardImageSize(card);
  return {
    x: (mask?.x || 0) * width,
    y: (mask?.y || 0) * height,
    width: (mask?.w || 0) * width,
    height: (mask?.h || 0) * height,
  };
}

export function toggleMaskVisibility(masks: any[] = [], maskId: string) {
  return masks.map((mask) => (
    mask.id === maskId ? { ...mask, visible: !mask.visible } : mask
  ));
}
