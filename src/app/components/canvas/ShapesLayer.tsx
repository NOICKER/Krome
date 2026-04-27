import React, { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Ellipse, Group, Line, Path, Rect, Text, Transformer } from 'react-konva';
import rough from 'roughjs/bin/rough';
import { getStroke } from 'perfect-freehand';
import type Konva from 'konva';

// ─── roughjs generator (singleton) ──────────────────────────────────────────
const gen = rough.generator();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newShapeId() {
  return `shape_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function roughOptions(shape: any) {
  return {
    seed: shape.seed || 1,
    roughness: shape.roughness ?? 1,
    strokeWidth: shape.strokeWidth ?? 2,
    stroke: shape.strokeColor ?? 'var(--nt-accent)',
    fill: shape.backgroundColor === 'transparent' || !shape.backgroundColor
      ? undefined
      : shape.backgroundColor,
    fillStyle: shape.fillStyle === 'none' ? undefined : (shape.fillStyle ?? 'hachure'),
  };
}

function drawableToPaths(drawable: any, shape: any) {
  const sets = drawable.sets || [];
  const paths: any[] = [];
  sets.forEach((set: any) => {
    let d = '';
    set.ops.forEach((item: any) => {
      const data = item.data;
      switch (item.op) {
        case 'move':
          d += `M${data[0]} ${data[1]} `;
          break;
        case 'bcurveTo':
          d += `C${data[0]} ${data[1]}, ${data[2]} ${data[3]}, ${data[4]} ${data[5]} `;
          break;
        case 'lineTo':
          d += `L${data[0]} ${data[1]} `;
          break;
        default:
          break;
      }
    });

    let stroke = shape.strokeColor ?? 'var(--nt-accent)';
    let strokeWidth = shape.strokeWidth ?? 2;
    let fill = undefined;

    if (set.type === 'fillSketch') {
      stroke = shape.backgroundColor && shape.backgroundColor !== 'transparent' ? shape.backgroundColor : 'transparent';
      strokeWidth = 1.5;
    } else if (set.type === 'fillPath') {
      stroke = 'transparent';
      fill = shape.backgroundColor !== 'transparent' ? shape.backgroundColor : undefined;
    }

    if (d.trim()) {
      paths.push({
        d: d.trim(),
        type: set.type,
        stroke,
        strokeWidth,
        fill,
      });
    }
  });
  return paths;
}

function buildRoughPaths(shape: any) {
  const opts = roughOptions(shape);
  switch (shape.type) {
    case 'rectangle': {
      const d = gen.rectangle(0, 0, shape.width, shape.height, opts);
      return drawableToPaths(d, shape);
    }
    case 'ellipse': {
      const d = gen.ellipse(shape.width / 2, shape.height / 2, shape.width, shape.height, opts);
      return drawableToPaths(d, shape);
    }
    case 'diamond': {
      const { width: w, height: h } = shape;
      const d = gen.polygon(
        [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]],
        opts,
      );
      return drawableToPaths(d, shape);
    }
    case 'line': {
      const pts = shape.points || [];
      if (pts.length < 2) return [];
      const d = gen.line(pts[0].x, pts[0].y, pts[pts.length - 1].x, pts[pts.length - 1].y, opts);
      return drawableToPaths(d, shape);
    }
    case 'arrow': {
      const pts = shape.points || [];
      if (pts.length < 2) return [];
      const x1 = pts[0].x; const y1 = pts[0].y;
      const x2 = pts[pts.length - 1].x; const y2 = pts[pts.length - 1].y;
      const d = gen.line(x1, y1, x2, y2, opts);
      const paths = drawableToPaths(d, shape);
      // arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const hs = 14; // head size
      const hx1 = x2 - hs * Math.cos(angle - Math.PI / 7);
      const hy1 = y2 - hs * Math.sin(angle - Math.PI / 7);
      const hx2 = x2 - hs * Math.cos(angle + Math.PI / 7);
      const hy2 = y2 - hs * Math.sin(angle + Math.PI / 7);
      const head = gen.polygon([[x2, y2], [hx1, hy1], [hx2, hy2]], {
        ...opts,
        fill: opts.stroke,
        fillStyle: 'solid',
        roughness: 0.4,
      });
      return [...paths, ...drawableToPaths(head, shape)];
    }
    default:
      return [];
  }
}

function freedrawToPoints(points: any[], strokeWidth: number) {
  const stroke = getStroke(points.map((p) => [p.x, p.y, p.pressure ?? 0.5]), {
    size: strokeWidth * 6,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
  });
  return stroke.flatMap(([x, y]) => [x, y]);
}

// ─── Individual shape renderers ───────────────────────────────────────────────

function RoughShape({ shape, isSelected, onSelect, onContextMenu, registerRef, draggable, onDragEnd, onTransformEnd }: any) {
  const ops = useMemo(() => buildRoughPaths(shape), [
    shape.type,
    shape.x,
    shape.y,
    shape.width,
    shape.height,
    shape.seed,
    shape.roughness,
    shape.strokeWidth,
    shape.strokeColor,
    shape.backgroundColor,
    shape.fillStyle,
    shape.points,
  ]);
  const opacity = (shape.opacity ?? 100) / 100;

  return (
    <Group
      ref={registerRef}
      x={shape.x}
      y={shape.y}
      scaleX={shape.scaleX ?? 1}
      scaleY={shape.scaleY ?? 1}
      rotation={shape.rotation ?? 0}
      opacity={opacity}
      draggable={draggable}
      listening={draggable || isSelected}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      onClick={(e: any) => { e.cancelBubble = true; onSelect(shape.id); }}
      onTap={(e: any) => { e.cancelBubble = true; onSelect(shape.id); }}
      onContextMenu={(e: any) => { e.cancelBubble = true; onContextMenu(shape.id, e); }}
      onMouseEnter={(e: any) => { if (draggable) e.target.getStage().container().style.cursor = 'move'; }}
      onMouseLeave={(e: any) => { if (draggable) e.target.getStage().container().style.cursor = 'default'; }}
    >
      {ops.map((op, i) => (
        <Path
          key={i}
          data={op.d}
          stroke={op.stroke || (shape.strokeColor ?? 'var(--nt-accent)')}
          strokeWidth={op.strokeWidth || (shape.strokeWidth ?? 2)}
          fill={
            op.type === 'fillPath' || (shape.backgroundColor && shape.backgroundColor !== 'transparent' && shape.fillStyle === 'solid')
              ? (op.fill || shape.backgroundColor)
              : undefined
          }
          perfectDrawEnabled={false}
          shadowForStrokeEnabled={false}
          hitStrokeWidth={12}
        />
      ))}
      <Rect
        x={0}
        y={0}
        width={shape.width || 1}
        height={shape.height || 1}
        fill="transparent"
        stroke="transparent"
        strokeWidth={0}
      />
    </Group>
  );
}

function FreedrawShape({ shape, isSelected, onSelect, onContextMenu, registerRef, draggable, onDragEnd, onTransformEnd }: any) {
  const pts = useMemo(() => freedrawToPoints(shape.points || [], shape.strokeWidth ?? 2), [
    shape.points,
    shape.strokeWidth,
  ]);
  const opacity = (shape.opacity ?? 100) / 100;
  if (pts.length < 4) return null;

  return (
    <Line
      ref={registerRef}
      x={shape.x}
      y={shape.y}
      scaleX={shape.scaleX ?? 1}
      scaleY={shape.scaleY ?? 1}
      rotation={shape.rotation ?? 0}
      points={pts}
      fill={shape.strokeColor ?? 'var(--nt-accent)'}
      stroke={shape.strokeColor ?? 'var(--nt-accent)'}
      strokeWidth={0}
      closed
      opacity={opacity}
      draggable={draggable}
      listening={draggable || isSelected}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
      hitStrokeWidth={12}
      onClick={(e: any) => { e.cancelBubble = true; onSelect(shape.id); }}
      onTap={(e: any) => { e.cancelBubble = true; onSelect(shape.id); }}
      onContextMenu={(e: any) => { e.cancelBubble = true; onContextMenu(shape.id, e); }}
      onMouseEnter={(e: any) => { if (draggable) e.target.getStage().container().style.cursor = 'move'; }}
      onMouseLeave={(e: any) => { if (draggable) e.target.getStage().container().style.cursor = 'default'; }}
    />
  );
}

function TextShape({ shape, isSelected, onSelect, onContextMenu, registerRef, draggable, onDragEnd, onTransformEnd }: any) {
  const opacity = (shape.opacity ?? 100) / 100;
  return (
    <Text
      ref={registerRef}
      x={shape.x}
      y={shape.y}
      scaleX={shape.scaleX ?? 1}
      scaleY={shape.scaleY ?? 1}
      rotation={shape.rotation ?? 0}
      text={shape.text || ''}
      fontSize={shape.fontSize ?? 18}
      fontFamily="'Instrument Sans', sans-serif"
      fill={shape.strokeColor ?? 'var(--nt-text)'}
      opacity={opacity}
      width={shape.width || 200}
      wrap="word"
      draggable={draggable}
      listening={draggable || isSelected}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      perfectDrawEnabled={false}
      onClick={(e: any) => { e.cancelBubble = true; onSelect(shape.id); }}
      onTap={(e: any) => { e.cancelBubble = true; onSelect(shape.id); }}
      onContextMenu={(e: any) => { e.cancelBubble = true; onContextMenu(shape.id, e); }}
      onMouseEnter={(e: any) => { if (draggable) e.target.getStage().container().style.cursor = 'move'; }}
      onMouseLeave={(e: any) => { if (draggable) e.target.getStage().container().style.cursor = 'default'; }}
    />
  );
}

// ─── Main ShapesLayer ─────────────────────────────────────────────────────────

export const SHAPE_TOOLS = [
  'shape-rect', 'shape-diamond', 'shape-ellipse',
  'shape-arrow', 'shape-line', 'shape-text',
];

export interface ShapesLayerHandlers {
  onMouseDown: (event: any) => void;
  onMouseMove: (event: any) => void;
  onMouseUp: (event: any) => void;
  onClick: (event: any) => void;
}

const ShapesLayer = forwardRef(function ShapesLayer({
  shapes,
  activeTool,
  stageRef,
  scale,
  stagePos,
  selectedShapeId,
  onShapeAdd,
  onShapeUpdate,
  onShapeSelect,
  onShapeContextMenu,
  defaultProps,
}: any, ref: React.Ref<ShapesLayerHandlers>) {
  const isShapeTool = SHAPE_TOOLS.includes(activeTool);

  const draftRef = useRef<any>(null);
  const [draft, setDraft] = useState<any>(null);

  const transformerRef = useRef<any>(null);
  const shapeNodeRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    if (!selectedShapeId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }
    const node = shapeNodeRefs.current[selectedShapeId];
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedShapeId, shapes]);

  function getWorldPointer() {
    const stage = stageRef.current;
    if (!stage) return null;
    const ptr = stage.getPointerPosition();
    if (!ptr) return null;
    return {
      x: (ptr.x - stage.x()) / stage.scaleX(),
      y: (ptr.y - stage.y()) / stage.scaleY(),
    };
  }

  const handleStageMouseDown = useCallback((event: any) => {
    if (!isShapeTool) return;
    if (event.target !== stageRef.current) return;
    if (event.evt.button !== 0) return;

    const wp = getWorldPointer();
    if (!wp) return;

    event.cancelBubble = true;

    const shapeType = activeTool.replace('shape-', '');

    if (shapeType === 'text') return;

    const newDraft = {
      id: newShapeId(),
      type: shapeType,
      x: wp.x,
      y: wp.y,
      width: 0,
      height: 0,
      points: [{ x: 0, y: 0, pressure: 0.5 }],
      seed: Math.floor(Math.random() * 2 ** 31),
      ...defaultProps,
    };
    draftRef.current = { draft: newDraft, originX: wp.x, originY: wp.y };
    setDraft(newDraft);
  }, [isShapeTool, activeTool, defaultProps]);

  const handleStageMouseMove = useCallback((event: any) => {
    if (!draftRef.current || !isShapeTool) return;
    const wp = getWorldPointer();
    if (!wp) return;

    const { draft: d, originX, originY } = draftRef.current;
    const shapeType = d.type;

    if (shapeType === 'freedraw') {
      const dx = wp.x - d.x;
      const dy = wp.y - d.y;
      const updated = {
        ...d,
        points: [...d.points, { x: dx, y: dy, pressure: 0.5 }],
      };
      draftRef.current.draft = updated;
      setDraft({ ...updated });
      return;
    }

    const x = Math.min(wp.x, originX);
    const y = Math.min(wp.y, originY);
    const width = Math.abs(wp.x - originX);
    const height = Math.abs(wp.y - originY);

    const updated = {
      ...d,
      x,
      y,
      width,
      height,
      points: [{ x: 0, y: 0 }, { x: wp.x - originX, y: wp.y - originY }],
    };

    if (shapeType === 'arrow' || shapeType === 'line') {
      updated.x = originX;
      updated.y = originY;
      updated.width = wp.x - originX;
      updated.height = wp.y - originY;
      updated.points = [{ x: 0, y: 0 }, { x: wp.x - originX, y: wp.y - originY }];
    }

    draftRef.current.draft = updated;
    setDraft({ ...updated });
  }, [isShapeTool]);

  const handleStageMouseUp = useCallback((event: any) => {
    if (!draftRef.current) return;
    const d = draftRef.current.draft;
    draftRef.current = null;
    setDraft(null);

    if (!d) return;
    const needsSize = ['rectangle', 'ellipse', 'diamond'].includes(d.type);
    if (needsSize && Math.abs(d.width) < 4 && Math.abs(d.height) < 4) return;
    if (['arrow', 'line'].includes(d.type)) {
      const len = Math.sqrt(d.width ** 2 + d.height ** 2);
      if (len < 4) return;
    }
    if (d.type === 'freedraw' && d.points.length < 3) return;

    onShapeAdd(d);
  }, [onShapeAdd]);

  const handleStageClick = useCallback((event: any) => {
    if (activeTool !== 'shape-text') return;
    if (event.target !== stageRef.current) return;
    const wp = getWorldPointer();
    if (!wp) return;

    const newShape = {
      id: newShapeId(),
      type: 'text',
      x: wp.x,
      y: wp.y,
      width: 200,
      height: 40,
      text: '',
      seed: Math.floor(Math.random() * 2 ** 31),
      ...defaultProps,
    };
    onShapeAdd(newShape, { editText: true });
  }, [activeTool, defaultProps, onShapeAdd]);

  useImperativeHandle(ref, () => ({
    onMouseDown: handleStageMouseDown,
    onMouseMove: handleStageMouseMove,
    onMouseUp: handleStageMouseUp,
    onClick: handleStageClick,
  }));

  function renderShape(shape: any) {
    const isSelected = shape.id === selectedShapeId;
    const canSelect = activeTool === 'select';

    function registerRef(node: any) {
      if (node) shapeNodeRefs.current[shape.id] = node;
      else delete shapeNodeRefs.current[shape.id];
    }

    const commonProps = {
      shape,
      isSelected,
      onSelect: onShapeSelect,
      onContextMenu: onShapeContextMenu,
      registerRef,
      draggable: canSelect,
      onDragEnd: (e: any) => onShapeUpdate(shape.id, { x: e.target.x(), y: e.target.y() }),
      onTransformEnd: (e: any) => {
        const node = e.target;
        onShapeUpdate(shape.id, {
          x: node.x(),
          y: node.y(),
          scaleX: node.scaleX(),
          scaleY: node.scaleY(),
          rotation: node.rotation(),
        });
      },
    };

    if (shape.type === 'freedraw') {
      return <FreedrawShape key={shape.id} {...commonProps} />;
    }
    if (shape.type === 'text') {
      return <TextShape key={shape.id} {...commonProps} />;
    }
    return <RoughShape key={shape.id} {...commonProps} />;
  }

  return (
    <>
      {shapes.map(renderShape)}

      {draft && draft.type !== 'text' && (() => {
        if (draft.type === 'freedraw') {
          const pts = freedrawToPoints(draft.points, draft.strokeWidth ?? 2);
          if (pts.length < 4) return null;
          return (
            <Line
              key="draft"
              x={draft.x}
              y={draft.y}
              points={pts}
              fill={draft.strokeColor ?? 'var(--nt-accent)'}
              stroke={draft.strokeColor ?? 'var(--nt-accent)'}
              strokeWidth={0}
              closed
              opacity={(draft.opacity ?? 100) / 100}
              listening={false}
              perfectDrawEnabled={false}
            />
          );
        }
        const ops = buildRoughPaths(draft);
        return (
          <Group key="draft" x={draft.x} y={draft.y} listening={false}>
            {ops.map((op, i) => (
              <Path
                key={i}
                data={op.d}
                stroke={op.stroke || (draft.strokeColor ?? 'var(--nt-accent)')}
                strokeWidth={op.strokeWidth || (draft.strokeWidth ?? 2)}
                fill={
                  op.type === 'fillPath' || (draft.backgroundColor && draft.backgroundColor !== 'transparent' && draft.fillStyle === 'solid')
                    ? (op.fill || draft.backgroundColor)
                    : undefined
                }
                perfectDrawEnabled={false}
                listening={false}
              />
            ))}
          </Group>
        );
      })()}

      <Transformer
        ref={transformerRef}
        boundBoxFunc={(oldBox, newBox) => {
          if (newBox.width < 5 || newBox.height < 5) return oldBox;
          return newBox;
        }}
        keepRatio={false}
        centeredScaling={false}
        rotateEnabled={true}
        enabledAnchors={[
          'top-left', 'top-right', 'bottom-left', 'bottom-right',
          'top-center', 'bottom-center', 'middle-left', 'middle-right',
        ]}
        borderStroke="var(--nt-accent)"
        borderStrokeWidth={1.5}
        anchorFill="var(--nt-accent)"
        anchorStroke="var(--nt-accent)"
        anchorSize={8}
        anchorCornerRadius={2}
        padding={4}
      />
    </>
  );
});

export default ShapesLayer;
