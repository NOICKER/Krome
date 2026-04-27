import React, { useCallback, useRef, useState } from 'react';
import { Group, Rect } from 'react-konva';
import type Konva from 'konva';

import { getAnnotationCaptureRect } from '../../lib/canvas/annotationState';
import { createMaskFromLocalPoints, getMaskRect } from '../../lib/canvas/maskState';

function getWorldPointer(stage: Konva.Stage | null) {
  if (!stage) return null;
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;

  return {
    x: (pointer.x - stage.x()) / stage.scaleX(),
    y: (pointer.y - stage.y()) / stage.scaleY(),
  };
}

function cardContainsPoint(card: any, point: { x: number; y: number }) {
  const cardX = card.canvasPos?.x || 0;
  const cardY = card.canvasPos?.y || 0;
  const cardW = card.w || 240;
  const cardH = card.h || 160;

  return (
    point.x >= cardX &&
    point.x <= cardX + cardW &&
    point.y >= cardY &&
    point.y <= cardY + cardH
  );
}

interface MaskLayerProps {
  stageRef: React.RefObject<Konva.Stage>;
  dims: { w: number; h: number };
  scale: number;
  stagePos: { x: number; y: number };
  cards: any[];
  selectedCardId?: string | null;
  activeTool: string;
  onCreateMask?: (cardId: string, mask: any) => void;
}

export default function MaskLayer({
  stageRef,
  dims,
  scale,
  stagePos,
  cards,
  selectedCardId,
  activeTool,
  onCreateMask,
}: MaskLayerProps) {
  const isDrawing = useRef(false);
  const activeCardRef = useRef<any>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const [draftMask, setDraftMask] = useState<{ cardId: string; mask: any } | null>(null);

  const getCardAtWorldPoint = useCallback((worldPoint: { x: number; y: number }) => {
    const selectedCard = selectedCardId ? cards.find((card) => card.id === selectedCardId) : null;
    if (selectedCard && cardContainsPoint(selectedCard, worldPoint)) {
      return selectedCard;
    }

    for (let index = cards.length - 1; index >= 0; index -= 1) {
      if (cardContainsPoint(cards[index], worldPoint)) {
        return cards[index];
      }
    }
    return null;
  }, [cards, selectedCardId]);

  const worldToLocal = useCallback((worldPoint: { x: number; y: number }, card: any) => ({
    x: worldPoint.x - (card.canvasPos?.x || 0),
    y: worldPoint.y - (card.canvasPos?.y || 0),
  }), []);

  const clearDraft = useCallback(() => {
    isDrawing.current = false;
    activeCardRef.current = null;
    startPointRef.current = null;
    setDraftMask(null);
  }, []);

  const handleMouseDown = useCallback(() => {
    if (activeTool !== 'mask') return;

    const worldPoint = getWorldPointer(stageRef.current);
    if (!worldPoint) return;

    const card = getCardAtWorldPoint(worldPoint);
    if (!card) return;

    isDrawing.current = true;
    activeCardRef.current = card;
    startPointRef.current = worldToLocal(worldPoint, card);
  }, [activeTool, getCardAtWorldPoint, stageRef, worldToLocal]);

  const handleMouseMove = useCallback(() => {
    if (!isDrawing.current || !activeCardRef.current || !startPointRef.current) return;

    const worldPoint = getWorldPointer(stageRef.current);
    if (!worldPoint) return;

    const card = activeCardRef.current;
    const nextMask = createMaskFromLocalPoints({
      card,
      start: startPointRef.current,
      end: worldToLocal(worldPoint, card),
      idFactory: () => 'draft-mask',
      minPixelSize: 0,
    });

    if (!nextMask) return;

    setDraftMask({
      cardId: card.id,
      mask: nextMask,
    });
  }, [stageRef, worldToLocal]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !activeCardRef.current || !startPointRef.current) {
      clearDraft();
      return;
    }

    const worldPoint = getWorldPointer(stageRef.current);
    const card = activeCardRef.current;
    const nextMask = worldPoint
      ? createMaskFromLocalPoints({
          card,
          start: startPointRef.current,
          end: worldToLocal(worldPoint, card),
        })
      : null;

    if (nextMask) {
      onCreateMask?.(card.id, nextMask);
    }

    clearDraft();
  }, [clearDraft, onCreateMask, stageRef, worldToLocal]);

  if (activeTool !== 'mask') {
    return null;
  }

  const captureRect = getAnnotationCaptureRect({ dims, scale, stagePos });
  const previewCard = draftMask ? cards.find((card) => card.id === draftMask.cardId) : null;
  const previewRect = previewCard && draftMask ? getMaskRect(draftMask.mask, previewCard) : null;

  return (
    <Group
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <Rect
        x={captureRect.x}
        y={captureRect.y}
        width={captureRect.width}
        height={captureRect.height}
        fill="rgba(0,0,0,0.001)"
      />

      {previewCard && previewRect && (
        <Rect
          x={(previewCard.canvasPos?.x || 0) + previewRect.x}
          y={(previewCard.canvasPos?.y || 0) + previewRect.y}
          width={previewRect.width}
          height={previewRect.height}
          fill="#1A1A1D"
          opacity={0.7}
          stroke="#E8834A"
          dash={[6, 4]}
        />
      )}
    </Group>
  );
}
