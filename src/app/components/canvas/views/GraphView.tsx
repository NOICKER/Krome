import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Circle, Layer, Line, Stage, Text } from 'react-konva';

import LibraryDrawer from '../LibraryDrawer';
import { getNextCanvasCardPosition } from '../../../lib/canvas/canvasState';
import { CONNECTION_COLORS, deriveAutoConnections } from '../../../lib/canvas/connectionState';
import { useCanvasStorage } from '../../../hooks/useCanvasStorage';
import { useAuth } from '../../../context/AuthContext';
import { useKromeStore } from '../../../hooks/useKrome';

function buildGraphNodes(cards: any[], width: number, height: number) {
  return (cards || []).map((card, index) => {
    if (!card) return null;
    const errorWeight =
      (card.status === 'wrong' ? 2 : card.status === 'shaky' ? 1 : 0) +
      (card.masks?.length || 0) +
      (card.annotations?.length || 0);
    const radius = Math.max(20, Math.min(50, 20 + errorWeight * 4));
    const angle = (Math.PI * 2 * index) / Math.max(cards.length || 1, 1);
    return {
      ...card,
      radius,
      x: width / 2 + Math.cos(angle) * Math.min(width, height) * 0.22,
      y: height / 2 + Math.sin(angle) * Math.min(width, height) * 0.22,
      label: card.tags?.[0] || 'untagged',
    };
  }).filter(Boolean);
}

function buildGraphEdges(cards: any[]) {
  const rawConnections = deriveAutoConnections((cards || []).filter(Boolean));
  const grouped = new Map();

  rawConnections.forEach((connection: any) => {
    const key = [connection.from, connection.to].sort().join(':');
    const existing = grouped.get(key) || {
      ...connection,
      reasons: [],
      strength: 0,
    };
    existing.reasons.push(connection.reason);
    existing.strength = existing.reasons.length;
    existing.color = (CONNECTION_COLORS as any)[existing.reasons[0]] || connection.color;
    grouped.set(key, existing);
  });

  return [...grouped.values()];
}

function getNodeColor(status: string) {
  if (status === 'wrong') return 'var(--nt-red)';
  if (status === 'shaky') return 'var(--nt-accent)';
  if (status === 'correct') return 'var(--nt-green)';
  return 'var(--nt-text3)';
}

class GraphErrorBoundary extends React.Component<any, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Graph Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', color: 'var(--nt-red)', fontFamily: 'sans-serif' }}>
          <h2>Graph failed to load</h2>
          <p>{this.state.error?.message || "An unexpected error occurred in the Graph component."}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function stepForceLayout(nodes: any[], edges: any[], width: number, height: number) {
  const nextNodes = nodes.map((node) => ({ ...node, vx: node.vx || 0, vy: node.vy || 0 }));
  const edgeMap = new Map(nextNodes.map((node) => [node.id, node]));

  // REPULSION_STRENGTH = 4000
  for (let i = 0; i < nextNodes.length; i += 1) {
    for (let j = i + 1; j < nextNodes.length; j += 1) {
      const left = nextNodes[i];
      const right = nextNodes[j];
      const dx = right.x - left.x;
      const dy = right.y - left.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const force = 4000 / (distance * distance);
      const nx = dx / distance;
      const ny = dy / distance;
      left.vx -= nx * force;
      left.vy -= ny * force;
      right.vx += nx * force;
      right.vy += ny * force;
    }
  }

  // REST_LENGTH = 220
  edges.forEach((edge) => {
    const fromNode = edgeMap.get(edge.from);
    const toNode = edgeMap.get(edge.to);
    if (!fromNode || !toNode) return;
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const target = 220;
    const pull = (distance - target) * 0.01;
    const nx = dx / distance;
    const ny = dy / distance;
    fromNode.vx += nx * pull;
    fromNode.vy += ny * pull;
    toNode.vx -= nx * pull;
    toNode.vy -= ny * pull;
  });

  // MINIMUM DISTANCE CHECK = 40px
  for (let i = 0; i < nextNodes.length; i += 1) {
    for (let j = i + 1; j < nextNodes.length; j += 1) {
      const left = nextNodes[i];
      const right = nextNodes[j];
      const dx = right.x - left.x;
      const dy = right.y - left.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      if (distance < 40) {
        const nx = dx / distance;
        const ny = dy / distance;
        const push = (40 - distance) * 0.5;
        left.vx -= nx * push;
        left.vy -= ny * push;
        right.vx += nx * push;
        right.vy += ny * push;
      }
    }
  }

  // DAMPING = 0.88
  return nextNodes.map((node) => {
    node.vx *= 0.88;
    node.vy *= 0.88;
    return {
      ...node,
      x: Math.max(node.radius + 24, Math.min(width - node.radius - 24, node.x + node.vx)),
      y: Math.max(node.radius + 24, Math.min(height - node.radius - 24, node.y + node.vy)),
    };
  });
}

function InnerGraphView() {
  const { user } = useAuth();
  const canvasStorage = useCanvasStorage();
  const { actions } = useKromeStore();

  const dims = useMemo(() => ({ width: window.innerWidth - 52, height: window.innerHeight - 48 }), []);
  const frameRef = useRef<number | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState('all');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGraph() {
      try {
        const nextCards = await canvasStorage.getAllCards();
        if (cancelled) return;

        const storedPositions = await canvasStorage.getCanvasPositions('main');
        const hydratedCards = nextCards.map((card) => {
          const pos = storedPositions.find((p) => p.card_id === card.id);
          return {
            ...card,
            canvasPos: pos ? { x: pos.x, y: pos.y } : undefined,
          };
        });

        setCards(hydratedCards);
        setNodes(buildGraphNodes(hydratedCards, dims.width, dims.height));
        setEdges(buildGraphEdges(hydratedCards));

        const imageEntries = hydratedCards
          .map((card) => (card.screenshot_url ? [card.id, card.screenshot_url] : null))
          .filter(Boolean);
        setImages(Object.fromEntries(imageEntries as any));
      } catch (error) {
        console.error('Failed to load graph', error);
      }
    }

    loadGraph();

    return () => {
      cancelled = true;
    };
  }, [dims.height, dims.width, canvasStorage]);

  useEffect(() => {
    if (!nodes.length || !edges.length) return undefined;

    let iterations = 0;
    const tick = () => {
      setNodes((previousNodes) => stepForceLayout(previousNodes, edges, dims.width, dims.height));
      iterations += 1;
      if (iterations < 300) {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };
    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [dims.height, dims.width, edges.length, nodes.length]);

  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set();
    const linkedIds = new Set([hoveredNodeId]);
    edges.forEach((edge) => {
      if (edge.from === hoveredNodeId) linkedIds.add(edge.to);
      if (edge.to === hoveredNodeId) linkedIds.add(edge.from);
    });
    return linkedIds;
  }, [edges, hoveredNodeId]);

  const tags = useMemo(
    () => [
      'all',
      ...new Set(
        cards
          .flatMap((card) => card?.tags || [])
          .map((tag) => String(tag || '').replace(/^#+/, '').trim().toLowerCase())
          .filter(Boolean),
      ),
    ],
    [cards],
  );
  const activeCard = selectedCardId ? cardMap.get(selectedCardId) : null;

  const ensureCardOnCanvas = useCallback(async (card: any) => {
    if (card.canvasPos) {
      return card;
    }

    const existingCardCount = cards.filter((candidate) => candidate.canvasPos).length;
    const nextCanvasPos = getNextCanvasCardPosition({ existingCardCount });
    
    await canvasStorage.saveCanvasPositions([{
      id: `pos_${card.id}`,
      user_id: user?.id || '',
      canvas_id: 'main',
      card_id: card.id,
      x: nextCanvasPos.x,
      y: nextCanvasPos.y,
      updated_at: Date.now()
    }]);

    const nextCard = { ...card, canvasPos: nextCanvasPos };
    setCards((previousCards) =>
      previousCards.map((candidate) => (candidate.id === nextCard.id ? nextCard : candidate)),
    );
    return nextCard;
  }, [cards, canvasStorage, user]);

  const openCardOnCanvas = useCallback(async (card: any, { openDetails = false } = {}) => {
    const placedCard = await ensureCardOnCanvas(card);
    if (!placedCard) return;

    // TODO: Wire up KROME routing / intent passing here
    // actions.setView('canvas')
  }, [ensureCardOnCanvas]);

  return (
    <div className="graph-screen" style={{ background: 'var(--nt-bg)', width: '100%', minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      {confirmState && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ position: 'fixed' }}>
          <div className="bg-[#121212] border border-[#333] rounded-lg p-6 max-w-sm w-full shadow-2xl" style={{ background: 'var(--nt-bg)', borderColor: 'var(--nt-border)' }}>
            <h3 className="text-white text-lg font-bold mb-4" style={{ color: 'var(--nt-text1)' }}>Confirm Deletion</h3>
            <p className="text-gray-400 mb-6" style={{ color: 'var(--nt-text2)' }}>{confirmState.message}</p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 rounded transition-colors"
                style={{ color: 'var(--nt-text2)' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmState.onConfirm}
                className="px-4 py-2 rounded transition-colors"
                style={{ background: 'rgba(255, 0, 0, 0.2)', color: 'var(--nt-red)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="graph-toolbar" style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className={`library-filter-pill${selectedTag === tag ? ' active' : ''}`}
            onClick={() => setSelectedTag(tag)}
            style={{
              background: selectedTag === tag ? 'var(--nt-accent)' : 'var(--nt-bg2)',
              color: selectedTag === tag ? 'var(--nt-bg)' : 'var(--nt-text2)',
              border: '1px solid var(--nt-border)',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '12px'
            }}
          >
            {tag === 'all' ? 'All tags' : `#${tag}`}
          </button>
        ))}
      </div>

      <Stage
        width={dims.width}
        height={dims.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        draggable
        onDragMove={(event) => setStagePos({ x: event.target.x(), y: event.target.y() })}
        onWheel={(event) => {
          event.evt.preventDefault();
          const pointer = event.target.getStage()?.getPointerPosition();
          if (!pointer) return;
          const oldScale = scale;
          const scaleBy = 1.1;
          const nextScale = event.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
          const mousePointTo = {
            x: (pointer.x - stagePos.x) / oldScale,
            y: (pointer.y - stagePos.y) / oldScale,
          };
          setScale(Math.max(0.3, Math.min(2.5, nextScale)));
          setStagePos({
            x: pointer.x - mousePointTo.x * nextScale,
            y: pointer.y - mousePointTo.y * nextScale,
          });
        }}
      >
        <Layer listening={false}>
          {edges.map((edge) => {
            const fromNode = nodes.find((node) => node.id === edge.from);
            const toNode = nodes.find((node) => node.id === edge.to);
            if (!fromNode || !toNode) return null;

            const fadedByHover = hoveredNodeId && !(connectedNodeIds.has(edge.from) && connectedNodeIds.has(edge.to));
            const fadedByTag =
              selectedTag !== 'all' &&
              !(
                (cardMap.get(edge.from)?.tags || []).map((tag: string) => String(tag).replace(/^#+/, '').trim().toLowerCase()).includes(selectedTag) ||
                (cardMap.get(edge.to)?.tags || []).map((tag: string) => String(tag).replace(/^#+/, '').trim().toLowerCase()).includes(selectedTag)
              );

            return (
              <Line
                key={`${edge.from}-${edge.to}`}
                points={[fromNode.x, fromNode.y, toNode.x, toNode.y]}
                stroke={edge.color}
                strokeWidth={Math.min(3, 1 + edge.strength * 0.75)}
                opacity={fadedByHover || fadedByTag ? 0.2 : 0.7}
                lineCap="round"
              />
            );
          })}
        </Layer>

        <Layer>
          {nodes.map((node) => {
            const fadedByHover = hoveredNodeId && !connectedNodeIds.has(node.id);
            const fadedByTag =
              selectedTag !== 'all' &&
              !(node.tags || []).map((tag: string) => String(tag).replace(/^#+/, '').trim().toLowerCase()).includes(selectedTag);

            return (
              <React.Fragment key={node.id}>
                <Circle
                  x={node.x}
                  y={node.y}
                  radius={node.radius}
                  fill={getNodeColor(node.status)}
                  opacity={fadedByHover || fadedByTag ? 0.2 : hoveredNodeId === node.id ? 1 : 0.82}
                  shadowBlur={hoveredNodeId === node.id ? 24 : 12}
                  shadowColor={getNodeColor(node.status)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => setSelectedCardId(node.id)}
                />
                <Text
                  x={node.x - node.radius}
                  y={node.y + node.radius + 8}
                  width={node.radius * 2}
                  text={node.label}
                  align="center"
                  fontSize={10}
                  fontFamily="'JetBrains Mono', monospace"
                  fill="var(--nt-text2)"
                  opacity={fadedByHover || fadedByTag ? 0.2 : 1}
                />
              </React.Fragment>
            );
          })}
        </Layer>
      </Stage>

      <LibraryDrawer
        card={activeCard}
        imageSrc={activeCard ? images[activeCard.id] : null}
        onClose={() => setSelectedCardId(null)}
        onOpenCanvas={() => activeCard && openCardOnCanvas(activeCard)}
        onEditCard={() => activeCard && openCardOnCanvas(activeCard, { openDetails: true })}
        onDeleteCard={() => {
          if (!activeCard) return;
          setConfirmState({
            message: `Delete "${activeCard.note || activeCard.id}" from the graph?`,
            onConfirm: async () => {
              await canvasStorage.deleteCard(activeCard.id);
              setSelectedCardId(null);
              setCards((previousCards) => previousCards.filter((card) => card.id !== activeCard.id));
              setNodes((previousNodes) => previousNodes.filter((node) => node.id !== activeCard.id));
              setEdges((previousEdges) => previousEdges.filter((edge) => edge.from !== activeCard.id && edge.to !== activeCard.id));
              setConfirmState(null);
            }
          });
        }}
      />
    </div>
  );
}

export default function GraphView(props: any) {
  return (
    <GraphErrorBoundary>
      <InnerGraphView {...props} />
    </GraphErrorBoundary>
  );
}
