import React from 'react';
import { Group, Rect } from 'react-konva';

interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function normalizeRect(selectionRect: SelectionRect) {
  const width = Math.abs(selectionRect.width);
  const height = Math.abs(selectionRect.height);

  return {
    x: selectionRect.width < 0 ? selectionRect.x + selectionRect.width : selectionRect.x,
    y: selectionRect.height < 0 ? selectionRect.y + selectionRect.height : selectionRect.y,
    width,
    height,
  };
}

interface SelectionLayerProps {
  selectionRect: SelectionRect | null;
}

export default function SelectionLayer({ selectionRect }: SelectionLayerProps) {
  if (!selectionRect) {
    return null;
  }

  const rect = normalizeRect(selectionRect);

  return (
    <Group listening={false}>
      <Rect
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        fill="rgba(91,158,240,0.12)"
        stroke="rgba(91,158,240,0.7)"
        strokeWidth={1}
        dash={[8, 5]}
      />
    </Group>
  );
}
