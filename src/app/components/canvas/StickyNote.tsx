import React from 'react';
import { Group, Line, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

const DEFAULT_SIZE = 140;

interface StickyNoteProps {
  note: {
    id: string;
    x: number;
    y: number;
    w?: number;
    h?: number;
    text?: string;
  };
  isSelected?: boolean;
  onSelect?: (id: string, event: KonvaEventObject<MouseEvent>) => void;
  onDoubleClick?: (id: string, event: KonvaEventObject<MouseEvent>) => void;
  onDragStart?: (id: string, x: number, y: number, event: KonvaEventObject<DragEvent>) => void;
  onDragMove?: (id: string, x: number, y: number, event: KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (id: string, x: number, y: number, event: KonvaEventObject<DragEvent>) => void;
  onContextMenu?: (id: string, event: KonvaEventObject<PointerEvent>) => void;
  registerNodeRef?: (id: string, node: any) => void;
  draggable?: boolean;
}

export default function StickyNote({
  note,
  isSelected,
  onSelect,
  onDoubleClick,
  onDragStart,
  onDragMove,
  onDragEnd,
  onContextMenu,
  registerNodeRef,
  draggable = true,
}: StickyNoteProps) {
  const width = note.w || DEFAULT_SIZE;
  const height = note.h || DEFAULT_SIZE;

  return (
    <Group
      ref={(node: any) => registerNodeRef?.(note.id, node)}
      x={note.x}
      y={note.y}
      draggable={draggable}
      onMouseDown={(event: any) => {
        if (event.evt.button !== 0) return;
        event.cancelBubble = true;
        onSelect?.(note.id, event);
      }}
      onDblClick={(event: any) => {
        event.cancelBubble = true;
        onDoubleClick?.(note.id, event);
      }}
      onDragStart={(event: any) => onDragStart?.(note.id, event.target.x(), event.target.y(), event)}
      onDragMove={(event: any) => onDragMove?.(note.id, event.target.x(), event.target.y(), event)}
      onDragEnd={(event: any) => onDragEnd?.(note.id, event.target.x(), event.target.y(), event)}
      onContextMenu={(event: any) => {
        event.evt.preventDefault();
        event.cancelBubble = true;
        onContextMenu?.(note.id, event);
      }}
    >
      <Rect width={width} height={height} fill="#F8E795" shadowColor="#000" shadowBlur={12} shadowOpacity={0.18} />
      <Rect width={width} height={height} fillLinearGradientStartPoint={{ x: 0, y: 0 }} fillLinearGradientEndPoint={{ x: width, y: height }} fillLinearGradientColorStops={[0, '#FFF4AE', 1, '#F3DB7B']} opacity={0.9} />
      <Line points={[width - 26, 0, width, 0, width, 26]} closed fill="#E7CA63" opacity={0.75} />
      <Text
        text={note.text || 'Double-click to edit'}
        padding={12}
        width={width}
        height={height}
        fill="#2F2616"
        fontSize={14}
        lineHeight={1.3}
        fontFamily="'Instrument Sans', sans-serif"
      />
      {isSelected && <Rect width={width} height={height} stroke="#E8834A" strokeWidth={2} listening={false} />}
    </Group>
  );
}
