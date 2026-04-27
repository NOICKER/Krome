import React, { useRef, useCallback } from 'react';
import { Group, Line, Rect } from 'react-konva';
import { getAnnotationCaptureRect, getRectShapeFromPoints } from '../../lib/canvas/annotationState';
import type Konva from 'konva';

const TOOL_SIZES: Record<string, number> = { s: 2, m: 4, l: 8 };
const HIGHLIGHTER_SIZES: Record<string, number> = { s: 8, m: 16, l: 28 };
const ERASER_SIZES: Record<string, number> = { s: 10, m: 20, l: 36 };

const ANNOTATION_TOOLS = ['pen', 'marker', 'highlighter', 'eraser', 'rect', 'shape-freedraw'];

function isSafeNum(n: any) {
  return typeof n === 'number' && isFinite(n) && !isNaN(n);
}

function safePoint(x: any, y: any) {
  if (!isSafeNum(x) || !isSafeNum(y)) return null;
  return { x, y };
}

function safePoints(pts: any[]) {
  const out = [];
  for (let i = 0; i + 1 < pts.length; i += 2) {
    const x = pts[i];
    const y = pts[i + 1];
    if (isSafeNum(x) && isSafeNum(y)) {
      out.push(x, y);
    }
  }
  return out;
}

export default function AnnotationLayer({
  stageRef,
  dims,
  scale,
  stagePos,
  cards,
  selectedCardId,
  activeTool,
  activeColor,
  activeSize,
  annotations,
  setAnnotations,
  onStrokeCommit,
  onBeforeStroke,
}: any) {
  const isDrawing = useRef(false);
  const currentStroke = useRef<any>(null);
  const livePointsRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  const getCardUnderPointer = useCallback((worldX: number, worldY: number) => {
    for (let i = cards.length - 1; i >= 0; i--) {
      const c = cards[i];
      const cx = c.canvasPos?.x ?? 0;
      const cy = c.canvasPos?.y ?? 0;
      const cw = c.w ?? 240;
      const ch = (c.h ?? 160) + 28;
      if (worldX >= cx && worldX <= cx + cw && worldY >= cy && worldY <= cy + ch) {
        return c;
      }
    }
    return null;
  }, [cards]);

  const getWorldPointer = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const ptr = stage.getPointerPosition();
    if (!ptr) return null;
    const sc = stage.scaleX();
    if (!isSafeNum(sc) || sc === 0) return null;
    const sx = stage.x();
    const sy = stage.y();
    return safePoint((ptr.x - sx) / sc, (ptr.y - sy) / sc);
  }, [stageRef]);

  const worldToLocal = (worldX: number, worldY: number, card: any) => {
    const cx = card?.canvasPos?.x ?? 0;
    const cy = card?.canvasPos?.y ?? 0;
    return safePoint(worldX - cx, worldY - cy);
  };

  const flushStroke = useCallback(() => {
    rafRef.current = null;
    if (!currentStroke.current) return;
    const { id } = currentStroke.current;
    const snappedPoints = [...livePointsRef.current];

    setAnnotations((prev: any[]) => {
      const idx = prev.findIndex((a) => a.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], points: snappedPoints };
      return next;
    });
  }, [setAnnotations]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(flushStroke);
  }, [flushStroke]);

  const handleMouseDown = useCallback(() => {
    if (!ANNOTATION_TOOLS.includes(activeTool)) return;

    const world = getWorldPointer();
    if (!world) return;

    const resolvedCard = selectedCardId
      ? cards.find((c: any) => c.id === selectedCardId) ?? null
      : getCardUnderPointer(world.x, world.y);

    const local = resolvedCard
      ? worldToLocal(world.x, world.y, resolvedCard)
      : { x: world.x, y: world.y };

    if (!local) return;

    onBeforeStroke?.();

    isDrawing.current = true;
    const strokeId = `stroke_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const isFreedraw = activeTool === 'shape-freedraw';

    const size =
      activeTool === 'highlighter' ? (HIGHLIGHTER_SIZES[activeSize] ?? 16)
      : activeTool === 'eraser'    ? (ERASER_SIZES[activeSize] ?? 20)
      : isFreedraw                 ? (TOOL_SIZES[activeSize] ?? 4) * 1.5
      :                              (TOOL_SIZES[activeSize] ?? 4);

    const isRect = activeTool === 'rect';
    const initialPoints = isRect
      ? [local.x, local.y, local.x, local.y]
      : [local.x, local.y];

    currentStroke.current = {
      id: strokeId,
      cardId: resolvedCard ? resolvedCard.id : null,
      tool: activeTool,
      color: activeTool === 'eraser' ? null : activeColor,
      size,
      isRect,
    };
    livePointsRef.current = initialPoints;

    setAnnotations((prev: any[]) => [
      ...prev,
      {
        id: strokeId,
        cardId: resolvedCard ? resolvedCard.id : null,
        tool: activeTool,
        color: activeTool === 'eraser' ? null : activeColor,
        size,
        points: initialPoints,
      },
    ]);
  }, [activeTool, activeColor, activeSize, cards, selectedCardId, getWorldPointer, getCardUnderPointer, onBeforeStroke, setAnnotations]);

  const handleMouseMove = useCallback(() => {
    if (!isDrawing.current || !currentStroke.current) return;

    const world = getWorldPointer();
    if (!world) return;

    const resolvedCard = currentStroke.current.cardId
      ? cards.find((c: any) => c.id === currentStroke.current.cardId) ?? null
      : null;

    const local = resolvedCard
      ? worldToLocal(world.x, world.y, resolvedCard)
      : { x: world.x, y: world.y };

    if (!local) return;

    if (currentStroke.current.isRect) {
      const origin = livePointsRef.current;
      livePointsRef.current = [origin[0], origin[1], local.x, local.y];
    } else {
      livePointsRef.current = [...livePointsRef.current, local.x, local.y];
    }

    scheduleFlush();
  }, [cards, getWorldPointer, scheduleFlush]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    isDrawing.current = false;

    if (!currentStroke.current) return;

    const { id } = currentStroke.current;
    const finalPoints = safePoints([...livePointsRef.current]);

    setAnnotations((prev: any[]) => {
      const idx = prev.findIndex((a) => a.id === id);
      if (idx === -1) return prev;
      if (finalPoints.length < 4) {
        const next = [...prev];
        next.splice(idx, 1);
        return next;
      }
      const next = [...prev];
      next[idx] = { ...next[idx], points: finalPoints };
      return next;
    });

    if (onStrokeCommit) {
      onStrokeCommit({
        ...currentStroke.current,
        points: finalPoints,
      });
    }

    currentStroke.current = null;
    livePointsRef.current = [];
  }, [setAnnotations, onStrokeCommit]);

  const renderAnnotations = () => annotations.map((ann: any) => {
    if (!ann || !Array.isArray(ann.points) || ann.points.length < 2) return null;

    const card = ann.cardId ? cards.find((c: any) => c.id === ann.cardId) : null;
    if (ann.cardId && !card) return null;

    const cardX = card?.canvasPos?.x ?? 0;
    const cardY = card?.canvasPos?.y ?? 0;

    const worldPoints = [];
    for (let i = 0; i + 1 < ann.points.length; i += 2) {
      const wx = ann.points[i] + cardX;
      const wy = ann.points[i + 1] + cardY;
      if (isSafeNum(wx) && isSafeNum(wy)) {
        worldPoints.push(wx, wy);
      }
    }

    if (worldPoints.length < 4) return null;

    if (ann.tool === 'eraser') {
      return (
        <Line
          key={ann.id}
          points={worldPoints}
          stroke="var(--nt-bg)"
          strokeWidth={ann.size ?? 20}
          tension={0.4}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation="destination-out"
        />
      );
    }

    if (ann.tool === 'rect') {
      const rectShape = getRectShapeFromPoints(ann.points);
      if (!isSafeNum(rectShape.x) || !isSafeNum(rectShape.y) ||
          !isSafeNum(rectShape.width) || !isSafeNum(rectShape.height)) return null;
      return (
        <Rect
          key={ann.id}
          x={rectShape.x + cardX}
          y={rectShape.y + cardY}
          width={rectShape.width}
          height={rectShape.height}
          stroke={ann.color ?? 'var(--nt-accent)'}
          strokeWidth={ann.size ?? 2}
          fillEnabled={false}
          listening={false}
        />
      );
    }

    const isSmooth = ann.tool === 'pen' || ann.tool === 'shape-freedraw';

    return (
      <Line
        key={ann.id}
        points={worldPoints}
        stroke={ann.color ?? 'var(--nt-accent)'}
        strokeWidth={ann.size ?? 4}
        tension={isSmooth ? 0.4 : 0}
        lineCap="round"
        lineJoin="round"
        opacity={ann.tool === 'highlighter' ? 0.4 : 1}
        globalCompositeOperation={ann.tool === 'highlighter' ? 'multiply' : 'source-over'}
        listening={false}
      />
    );
  });

  const isActiveDrawTool = ANNOTATION_TOOLS.includes(activeTool);
  const captureRect = getAnnotationCaptureRect({ dims, scale, stagePos });

  return (
    <Group
      onMouseDown={isActiveDrawTool ? handleMouseDown : undefined}
      onMouseMove={isActiveDrawTool ? handleMouseMove : undefined}
      onMouseUp={isActiveDrawTool ? handleMouseUp : undefined}
      onMouseLeave={isActiveDrawTool ? handleMouseUp : undefined}
    >
      {isActiveDrawTool && (
        <Rect
          x={captureRect.x}
          y={captureRect.y}
          width={captureRect.width}
          height={captureRect.height}
          fill="rgba(0,0,0,0.001)"
        />
      )}
      {renderAnnotations()}
    </Group>
  );
}
