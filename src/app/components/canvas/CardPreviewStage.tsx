import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Rect } from 'react-konva';

import { CARD_H, CARD_W } from '../../lib/canvas/canvasState';
import { getMaskRect } from '../../lib/canvas/maskState';

const imageCache = new Map<string, HTMLImageElement>();

function getRectShape(points: number[] = []) {
  const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = points;
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

export default function CardPreviewStage({
  card,
  imageSrc,
  interactiveMasks = false,
  revealedMaskIds = [],
  onToggleMask,
}: any) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 960, height: 640 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageSrc) {
      setImage(null);
      return;
    }
    if (imageCache.has(imageSrc)) {
      setImage(imageCache.get(imageSrc) || null);
      return;
    }

    const nextImage = new window.Image();
    nextImage.crossOrigin = 'Anonymous';
    nextImage.src = imageSrc;
    nextImage.onload = () => {
      imageCache.set(imageSrc, nextImage);
      setImage(nextImage);
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const cardWidth = card?.w || CARD_W;
  const cardHeight = card?.h || CARD_H;
  const scale = useMemo(() => {
    const safeWidth = Math.max(containerSize.width - 24, 1);
    const safeHeight = Math.max(containerSize.height - 24, 1);
    return Math.max(0.5, Math.min(safeWidth / cardWidth, safeHeight / cardHeight, 4));
  }, [cardHeight, cardWidth, containerSize.height, containerSize.width]);

  const stageWidth = cardWidth * scale;
  const stageHeight = cardHeight * scale;

  return (
    <div className="card-preview-stage" ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Stage width={stageWidth} height={stageHeight} scaleX={scale} scaleY={scale}>
        <Layer>
          {image ? (
            <KonvaImage image={image} width={cardWidth} height={cardHeight} cornerRadius={18} />
          ) : (
            <Rect width={cardWidth} height={cardHeight} fill="var(--nt-bg3)" cornerRadius={18} />
          )}

          {(card?.masks || []).map((mask: any) => {
            const maskRect = getMaskRect(mask, card);
            const isHidden = interactiveMasks ? !revealedMaskIds.includes(mask.id) : mask.visible !== false;

            return (
              <Rect
                key={mask.id}
                x={maskRect.x}
                y={maskRect.y}
                width={maskRect.width}
                height={maskRect.height}
                fill="var(--nt-bg3)"
                opacity={isHidden ? 0.92 : 0.3}
                cornerRadius={6}
                onClick={() => interactiveMasks && onToggleMask?.(mask.id)}
              />
            );
          })}

          {(card?.annotations || []).map((annotation: any) => {
            if (annotation.tool === 'rect') {
              const rectShape = getRectShape(annotation.points);
              return (
                <Rect
                  key={annotation.id}
                  x={rectShape.x}
                  y={rectShape.y}
                  width={rectShape.width}
                  height={rectShape.height}
                  stroke={annotation.color}
                  strokeWidth={annotation.size}
                  fillEnabled={false}
                />
              );
            }

            return (
              <Line
                key={annotation.id}
                points={annotation.points}
                stroke={annotation.tool === 'eraser' ? '#0C0C0D' : annotation.color}
                strokeWidth={annotation.size}
                lineCap="round"
                lineJoin="round"
                tension={annotation.tool === 'pen' ? 0.4 : 0}
                opacity={annotation.tool === 'highlighter' ? 0.4 : 1}
                globalCompositeOperation={
                  annotation.tool === 'eraser'
                    ? 'destination-out'
                    : annotation.tool === 'highlighter'
                      ? 'multiply'
                      : 'source-over'
                }
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
