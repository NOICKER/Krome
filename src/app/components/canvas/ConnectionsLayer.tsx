import React from 'react';
import { Arrow, Circle, Group, Line, Text } from 'react-konva';

import {
  CONNECTION_COLORS,
  getConnectionBezierPoints,
  getConnectionMidpoint,
  getManualConnectionPoints,
  MANUAL_CONNECTION_COLOR,
} from '../../lib/canvas/connectionState';

export default function ConnectionsLayer({
  cards,
  connections,
  showAutoConnections = true,
  selectedConnectionId = null,
  onSelectConnection,
  onDeleteConnection,
  onEditConnection,
}: any) {
  const cardMap = new Map(cards.map((card: any) => [card.id, card]));

  return (
    <Group>
      {connections.map((connection: any) => {
        const fromCard = cardMap.get(connection.from);
        const toCard = cardMap.get(connection.to);
        if (!fromCard || !toCard) return null;

        const isManual = connection.type === 'manual';
        if (!isManual && !showAutoConnections) {
          return null;
        }

        const points = isManual
          ? getManualConnectionPoints(fromCard, toCard)
          : getConnectionBezierPoints(fromCard, toCard, connection.reason);
        const midpoint = getConnectionMidpoint(points);
        const isSelected = selectedConnectionId === connection.id;

        if (isManual) {
          return (
            <React.Fragment key={connection.id}>
              <Arrow
                points={points}
                stroke={MANUAL_CONNECTION_COLOR}
                fill={MANUAL_CONNECTION_COLOR}
                strokeWidth={1.5}
                pointerLength={8}
                pointerWidth={6}
                lineCap="round"
                lineJoin="round"
                onClick={(event: any) => {
                  event.cancelBubble = true;
                  onSelectConnection?.(connection.id);
                }}
                onDblClick={(event: any) => {
                  event.cancelBubble = true;
                  onEditConnection?.(connection, midpoint);
                }}
              />
              {connection.label ? (
                <Text
                  x={midpoint.x - 60}
                  y={midpoint.y - 24}
                  width={120}
                  align="center"
                  text={connection.label}
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  fill="#F0EDE8"
                  listening={false}
                />
              ) : null}
              {isSelected ? (
                <>
                  <Circle x={midpoint.x} y={midpoint.y} radius={12} fill="rgba(232,131,74,0.15)" stroke={MANUAL_CONNECTION_COLOR} strokeWidth={1} />
                  <Text
                    x={midpoint.x - 4}
                    y={midpoint.y - 8}
                    text="x"
                    fontSize={14}
                    fontFamily="'JetBrains Mono', monospace"
                    fill={MANUAL_CONNECTION_COLOR}
                    onClick={(event: any) => {
                      event.cancelBubble = true;
                      onDeleteConnection?.(connection.id);
                    }}
                  />
                </>
              ) : null}
            </React.Fragment>
          );
        }

        return (
          <Line
            key={`${connection.from}-${connection.to}-${connection.reason}`}
            points={points}
            stroke={connection.color || CONNECTION_COLORS[connection.reason] || CONNECTION_COLORS.tag}
            strokeWidth={1.5}
            bezier
            lineCap="round"
            lineJoin="round"
            opacity={1}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}
    </Group>
  );
}
