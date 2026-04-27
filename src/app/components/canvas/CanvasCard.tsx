import React, { useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Circle, Group, Image as KonvaImage, Line, Rect, Text } from 'react-konva';

import { getMaskRect } from '../../lib/canvas/maskState';

const CARD_W = 240;
const CARD_H = 160;
const STATUS_COLORS: Record<string, string> = { wrong: 'var(--nt-red)', shaky: 'var(--nt-accent)', correct: 'var(--nt-green)', unseen: 'var(--nt-text3)' };

const globalImageCache = new Map<string, HTMLImageElement>();

function CanvasCard({
  card,
  imgSrc,
  isSelected,
  showResizeHandles = false,
  onSelect,
  onPrimaryPointerDown,
  onPrimaryPointerUp,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDblClick,
  onResize,
  onResizeEnd,
  onContextMenu,
  onMaskToggle,
  onPointerEnter,
  onPointerLeave,
  draggable = true,
  registerNodeRef,
  isDue = false,
  showArrowTarget = false,
}: any) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const dueRingRef = useRef<any>(null);

  useEffect(() => {
    if (!imgSrc) return;
    if (globalImageCache.has(imgSrc)) {
      setImg(globalImageCache.get(imgSrc) || null);
      return;
    }

    const image = new window.Image();
    image.crossOrigin = 'Anonymous';
    image.src = imgSrc;
    image.onload = () => {
      globalImageCache.set(imgSrc, image);
      setImg(image);
    };
  }, [imgSrc]);

  useEffect(() => {
    if (!isDue || !dueRingRef.current) return undefined;

    const tween = new Konva.Tween({
      node: dueRingRef.current,
      opacity: 1,
      duration: 0.75,
      yoyo: true,
      repeat: Infinity,
      easing: Konva.Easings.EaseInOut,
    });
    dueRingRef.current.opacity(0.4);
    tween.play();

    return () => {
      tween.destroy();
    };
  }, [isDue]);

  const w = card.w || CARD_W;
  const h = card.h || CARD_H;
  const titleH = 28;
  const statusColor = STATUS_COLORS[card.status] || STATUS_COLORS.unseen;
  const firstTag = card.tags?.[0] || 'untitled';
  const tagWidth = useMemo(() => Math.max(64, Math.min(120, firstTag.length * 7 + 18)), [firstTag]);

  const corners = [
    { anchor: 'tl', x: 0, y: 0, cursor: 'nwse-resize' },
    { anchor: 'tr', x: w, y: 0, cursor: 'nesw-resize' },
    { anchor: 'bl', x: 0, y: h + titleH, cursor: 'nesw-resize' },
    { anchor: 'br', x: w, y: h + titleH, cursor: 'nwse-resize' },
  ];

  return (
    <Group
      ref={(node: any) => registerNodeRef?.(card.id, node)}
      x={card.canvasPos?.x || 100}
      y={card.canvasPos?.y || 100}
      draggable={draggable}
      perfectDrawEnabled={false}
      onMouseDown={(event: any) => {
        if (event.evt.button !== 0) return;
        event.cancelBubble = true;
        if (onPrimaryPointerDown?.(card.id, event) === false) {
          return;
        }
        onSelect?.(card.id, event);
      }}
      onMouseUp={(event: any) => {
        if (event.evt.button !== 0) return;
        onPrimaryPointerUp?.(card.id, event);
      }}
      onMouseEnter={(event: any) => {
        setIsHovered(true);
        onPointerEnter?.(card.id, event);
      }}
      onMouseLeave={(event: any) => {
        setIsHovered(false);
        onPointerLeave?.(card.id, event);
      }}
      onDblClick={() => onDblClick?.(card)}
      onDragStart={(event: any) => onDragStart?.(card.id, event.target.x(), event.target.y(), event)}
      onDragMove={(event: any) => onDragMove?.(card.id, event.target.x(), event.target.y(), event)}
      onDragEnd={(event: any) => onDragEnd?.(card.id, event.target.x(), event.target.y(), event)}
      onContextMenu={(event: any) => {
        event.evt.preventDefault();
        event.cancelBubble = true;
        onContextMenu?.(card.id, event);
      }}
    >
      <Rect width={w} height={h + titleH} cornerRadius={10} fill="#000" opacity={0.25} x={4} y={4} perfectDrawEnabled={false} />
      {img ? (
        <KonvaImage image={img} width={w} height={h} cornerRadius={[10, 10, 0, 0]} perfectDrawEnabled={false} />
      ) : (
        <Rect width={w} height={h} fill="var(--nt-bg3)" cornerRadius={[10, 10, 0, 0]} perfectDrawEnabled={false} />
      )}
      {(card.masks || []).map((mask: any) => {
        const maskRect = getMaskRect(mask, card);
        const showIcon = maskRect.width >= 18 && maskRect.height >= 18;

        return (
          <Group key={mask.id}>
            <Rect
              x={maskRect.x}
              y={maskRect.y}
              width={maskRect.width}
              height={maskRect.height}
              fill="var(--nt-bg3)"
              opacity={mask.visible ? 0.92 : 0.3}
              perfectDrawEnabled={false}
              onClick={(event: any) => {
                event.cancelBubble = true;
                onMaskToggle?.(card.id, mask.id);
              }}
            />
            {showIcon && (
              <Group x={maskRect.x + 6} y={maskRect.y + 6} listening={false}>
                <Line
                  points={[2, 6, 2, 4, 4, 2, 8, 2, 10, 4, 10, 6]}
                  stroke="var(--nt-accent)"
                  strokeWidth={1.2}
                  lineCap="round"
                  lineJoin="round"
                  perfectDrawEnabled={false}
                />
                <Rect x={2} y={6} width={8} height={6} fill="var(--nt-accent)" cornerRadius={1} perfectDrawEnabled={false} />
                <Rect x={5} y={8} width={2} height={2} fill="var(--nt-bg3)" cornerRadius={1} perfectDrawEnabled={false} />
              </Group>
            )}
          </Group>
        );
      })}
      <Rect y={h} width={w} height={titleH} fill="var(--nt-bg2)" cornerRadius={[0, 0, 10, 10]} perfectDrawEnabled={false} />
      <Group x={10} y={h + 6} listening={false}>
        <Rect width={tagWidth} height={16} fill="rgba(255,255,255,0.08)" cornerRadius={999} perfectDrawEnabled={false} />
        <Text text={`#${firstTag}`} x={8} y={3} fontSize={10} fontFamily="'JetBrains Mono', monospace" fill="var(--nt-text2)" />
      </Group>
      {card.id && !card._unsaved && (
        <>
          {isDue ? (
            <Circle
              ref={dueRingRef}
              x={w - 12}
              y={12}
              radius={10}
              stroke="var(--nt-accent)"
              strokeWidth={2}
              opacity={0.4}
              listening={false}
            />
          ) : null}
          <Circle x={w - 12} y={12} radius={6} fill={statusColor} stroke="var(--nt-bg2)" strokeWidth={2} />
        </>
      )}
      {(isSelected || showArrowTarget || isHovered) && (
        <Rect
          width={w}
          height={h + titleH}
          stroke={isSelected || showArrowTarget ? 'var(--nt-accent)' : 'rgba(255,255,255,0.2)'}
          strokeWidth={isSelected || showArrowTarget ? 1.8 : 1}
          cornerRadius={10}
          fill="transparent"
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
      {showResizeHandles &&
        corners.map((corner) => (
          <Rect
            key={corner.anchor}
            x={corner.x - 6}
            y={corner.y - 6}
            width={12}
            height={12}
            fill="var(--nt-accent)"
            cornerRadius={2}
            draggable
            perfectDrawEnabled={false}
            onMouseDown={(event: any) => {
              event.cancelBubble = true;
            }}
            onMouseEnter={(event: any) => {
              event.target.getStage().container().style.cursor = corner.cursor;
            }}
            onMouseLeave={(event: any) => {
              event.target.getStage().container().style.cursor = 'default';
            }}
            onDragMove={(event: any) => {
              event.cancelBubble = true;

              const dx = event.target.x() + 6 - corner.x;
              const dy = event.target.y() + 6 - corner.y;
              let newW = w;
              let newH = h;
              let newX = card.canvasPos?.x || 0;
              let newY = card.canvasPos?.y || 0;

              if (corner.anchor === 'br') {
                newW = Math.max(80, w + dx);
                newH = Math.max(60, h + dy);
              }
              if (corner.anchor === 'bl') {
                newW = Math.max(80, w - dx);
                newH = Math.max(60, h + dy);
                newX += dx;
              }
              if (corner.anchor === 'tr') {
                newW = Math.max(80, w + dx);
                newH = Math.max(60, h - dy);
                newY += dy;
              }
              if (corner.anchor === 'tl') {
                newW = Math.max(80, w - dx);
                newH = Math.max(60, h - dy);
                newX += dx;
                newY += dy;
              }

              onResize?.(card.id, newW, newH, newX, newY);
              event.target.position({ x: corner.x - 6, y: corner.y - 6 });
            }}
            onDragEnd={(event: any) => {
              event.cancelBubble = true;
              onResizeEnd?.(card.id);
            }}
          />
        ))}
    </Group>
  );
}

export default React.memo(CanvasCard, (prev: any, next: any) => {
  return (
    prev.card === next.card &&
    prev.imgSrc === next.imgSrc &&
    prev.isSelected === next.isSelected &&
    prev.showResizeHandles === next.showResizeHandles &&
    prev.isDue === next.isDue &&
    prev.showArrowTarget === next.showArrowTarget &&
    prev.draggable === next.draggable
  );
});
