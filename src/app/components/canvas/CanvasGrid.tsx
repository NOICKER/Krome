import React from 'react';
import { Shape } from 'react-konva';
import type Konva from 'konva';

const DOT_SPACING = 28;
const DOT_RADIUS = 1.5;
const DOT_COLOR = 'rgba(255,255,255,0.06)';
const TWO_PI = Math.PI * 2;

interface CanvasGridProps {
  width: number;
  height: number;
  stageRef: React.RefObject<Konva.Stage>;
}

const CanvasGrid = React.memo(function CanvasGrid({ width, height, stageRef }: CanvasGridProps) {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx: any) => {
        const stage = stageRef.current;
        if (!stage) return;

        const stageX = stage.x();
        const stageY = stage.y();
        const scale = stage.scaleX();

        // Calculate visible viewport in world coordinates, with 1-cell padding on each side
        const startX = (Math.floor(-stageX / scale / DOT_SPACING) - 1) * DOT_SPACING;
        const endX   = (Math.floor((width  - stageX) / scale / DOT_SPACING) + 1) * DOT_SPACING;
        const startY = (Math.floor(-stageY / scale / DOT_SPACING) - 1) * DOT_SPACING;
        const endY   = (Math.floor((height - stageY) / scale / DOT_SPACING) + 1) * DOT_SPACING;

        const raw = ctx._context;
        raw.fillStyle = DOT_COLOR;
        raw.beginPath();

        for (let cx = startX; cx <= endX; cx += DOT_SPACING) {
          for (let cy = startY; cy <= endY; cy += DOT_SPACING) {
            raw.moveTo(cx + DOT_RADIUS, cy);
            raw.arc(cx, cy, DOT_RADIUS, 0, TWO_PI);
          }
        }

        raw.fill();
      }}
    />
  );
});

export default CanvasGrid;
