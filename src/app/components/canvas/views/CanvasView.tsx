import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Arrow, Layer, Stage } from 'react-konva';
import { toast } from 'sonner';

import Tesseract from 'tesseract.js';

import AnnotationLayer from '../AnnotationLayer';
import AnnotationToolbar from '../AnnotationToolbar';
import CanvasCard from '../CanvasCard';
import CanvasGrid from '../CanvasGrid';
import CanvasToolbar from '../CanvasToolbar';
import ConnectionsLayer from '../ConnectionsLayer';
import ContextMenu from '../ContextMenu';
import DetailsPanel from '../DetailsPanel';
import MaskLayer from '../MaskLayer';
import NotesPanel from '../NotesPanel';
import PropertyPanel from '../PropertyPanel';
import SelectionLayer from '../SelectionLayer';
import ShapesLayer, { SHAPE_TOOLS } from '../ShapesLayer';
import StickyNote from '../StickyNote';
import { ProGateModal } from '../../ProGateModal';
import {
  deriveAutoConnections,
  getConnectionMidpoint,
  MANUAL_CONNECTION_COLOR,
  mergeCanvasConnections,
} from '../../../lib/canvas/connectionState';
import { buildInsightSummary, buildNotesPatternFallback, extractGeminiText, normalizeInsightList } from '../../../lib/canvas/insightState';
import { isCardDueForReview } from '../../../lib/canvas/libraryState';
import { toggleMaskVisibility } from '../../../lib/canvas/maskState';
import {
  buildCardPayload,
  createUnsavedCard,
  duplicateCards,
  duplicateStickies,
  getCardFocusTransform,
  getCardRect,
  getStickyRect,
  getVisibleCardIds,
  getVisibleStickyIds,
  getWorldViewport,
  getZoom100Transform,
  getZoomToFitTransform,
  moveCards,
  moveStickies,
  STICKY_H,
  STICKY_W,
} from '../../../lib/canvas/canvasState';
import { useCanvasStorage } from '../../../hooks/useCanvasStorage';
import { useAuth } from '../../../context/AuthContext';
import { ProGateError } from '../../../utils/proGate';
import type {
  LocalCardRecord,
  LocalCardConnectionRecord,
  LocalCanvasPositionRecord,
  LocalCanvasShapeRecord,
  LocalCanvasStickyRecord,
} from '../../../types';

function emptySelection() {
  return { cardIds: [] as string[], stickyIds: [] as string[] };
}

function normalizeSticky(sticky: any) {
  return {
    ...sticky,
    text: sticky.text || '',
    w: sticky.w || STICKY_W,
    h: sticky.h || STICKY_H,
  };
}

function isEditableTarget(target: any) {
  if (!target) return false;
  const tagName = target.tagName?.toUpperCase();
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName);
}

function getSelectionRect(startPoint: any, endPoint: any) {
  return {
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y),
  };
}

function getWorldPointer(stage: any) {
  if (!stage) return null;
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;

  return {
    x: (pointer.x - stage.x()) / stage.scaleX(),
    y: (pointer.y - stage.y()) / stage.scaleY(),
  };
}

function getWorldPointFromClient(stage: any, clientX: number, clientY: number) {
  if (!stage) return null;
  const containerRect = stage.container().getBoundingClientRect();

  return {
    x: (clientX - containerRect.left - stage.x()) / stage.scaleX(),
    y: (clientY - containerRect.top - stage.y()) / stage.scaleY(),
  };
}

function buildDeleteMessage(cardCount: number, stickyCount: number) {
  const parts = [];
  if (cardCount) parts.push(`${cardCount} card${cardCount === 1 ? '' : 's'}`);
  if (stickyCount) parts.push(`${stickyCount} ${stickyCount === 1 ? 'sticky' : 'stickies'}`);
  if (parts.length === 0) return '';
  return `Delete ${parts.join(' and ')}?`;
}

function sanitizeStickyList(stickies: any[]): LocalCanvasStickyRecord[] {
  return stickies.map((sticky) => ({ 
    id: sticky.id,
    canvas_id: sticky.canvas_id || 'main',
    user_id: sticky.user_id,
    x: sticky.x,
    y: sticky.y,
    text: sticky.text,
    w: sticky.w,
    h: sticky.h,
    z_index: 0,
    color: sticky.color || '#F0F0F0',
    updated_at: Date.now(),
    deleted_at: null
  }));
}

async function fetchGeminiNotePattern(apiKey: string, noteText: string, summary: any) {
  const prompt =
    `A student wrote this study note: ${noteText}. ` +
    `Based on their mistake patterns: ${JSON.stringify(summary)}. ` +
    `In one sentence (max 12 words), what pattern connects their notes to their mistakes? ` +
    `Return only the sentence, nothing else.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!response.ok) return '';
    const payload = await response.json();
    const pattern = normalizeInsightList(extractGeminiText(payload))[0] || extractGeminiText(payload).trim();
    return pattern || '';
  } catch (error) {
    return '';
  }
}

export default function CanvasView({ activeSessionContext }: { activeSessionContext?: any }) {
  const { user } = useAuth();
  const canvasStorage = useCanvasStorage();
  const stageRef = useRef<Konva.Stage>(null);
  const detailsPanelRef = useRef<HTMLDivElement>(null);
  const cardNodeRefs = useRef<Record<string, any>>({});
  const stickyNodeRefs = useRef<Record<string, any>>({});
  const dragSnapshotRef = useRef<any>(null);
  const selectionAnchorRef = useRef<any>(null);
  const selectionRectRef = useRef<any>(null);
  const selectionMovedRef = useRef(false);
  const undoStack = useRef<any[]>([]);
  const preStrokeAnnotationsRef = useRef<any[]>([]);
  const consumedRouteIntentRef = useRef<string | null>(null);
  const connectionsComputedRef = useRef(false);
  const connectionsRef = useRef<any[]>([]);
  const notesSaveTimeoutRef = useRef<number | null>(null);
  const notesPatternTimeoutRef = useRef<number | null>(null);
  const notesRef = useRef({ text: '', lastUpdated: null as string | null, lastPattern: '' });
  const shapesSaveTimeoutRef = useRef<number | null>(null);

  const cardsRef = useRef<any[]>([]);
  const imagesRef = useRef<Record<string, string>>({});
  const stickiesRef = useRef<any[]>([]);
  const annotationsRef = useRef<any[]>([]);
  const selectionRef = useRef(emptySelection());
  const scaleRef = useRef(1);
  const stagePosRef = useRef({ x: 0, y: 0 });
  const panelCardRef = useRef<any>(null);
  const stickyEditorRef = useRef<any>(null);
  const shapesRef = useRef<any[]>([]);
  const wheelDebounceTimeoutRef = useRef<number | null>(null);
  const shapesLayerRef = useRef<any>(null);

  const [dims, setDims] = useState({ w: window.innerWidth - 52, h: window.innerHeight - 48 });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  const [cards, setCards] = useState<any[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [stickies, setStickies] = useState<any[]>([]);
  const [selection, setSelection] = useState(emptySelection());
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [connectionEditor, setConnectionEditor] = useState<any>(null);
  const [arrowDraft, setArrowDraft] = useState<any>(null);
  const [hoveredArrowCardId, setHoveredArrowCardId] = useState<string | null>(null);

  const [panelCard, setPanelCard] = useState<any>(null);
  const [showPanel, setShowPanel] = useState(false);

  const [showToolbar, setShowToolbar] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [activeTool, setActiveTool] = useState('select');
  const [activeColor, setActiveColor] = useState('#E8834A');
  const [activeSize, setActiveSize] = useState('m');
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState({ text: '', lastUpdated: null as string | null, lastPattern: '' });
  const [config, setConfig] = useState<any>({});

  const [menuState, setMenuState] = useState<any>(null);
  const [selectionRect, setSelectionRect] = useState<any>(null);
  const [stickyEditor, setStickyEditor] = useState<any>(null);

  const [shapes, setShapes] = useState<any[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [textShapeEditor, setTextShapeEditor] = useState<any>(null);
  const [drawingDefaults, setDrawingDefaults] = useState({
    strokeColor: '#E8834A',
    backgroundColor: 'transparent',
    fillStyle: 'hachure',
    strokeWidth: 2,
    roughness: 1,
    opacity: 100,
  });

  const [confirmState, setConfirmState] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [isProGateOpen, setIsProGateOpen] = useState(false);

  const handleCanvasWrite = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      if (err instanceof ProGateError) {
        setIsProGateOpen(true);
      } else {
        toast.error('Something went wrong. Try again.');
      }
    }
  }, []);

  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => { stickiesRef.current = stickies; }, [stickies]);
  useEffect(() => { annotationsRef.current = annotations; }, [annotations]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { selectionRef.current = selection; }, [selection]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { stagePosRef.current = stagePos; }, [stagePos]);
  useEffect(() => { panelCardRef.current = panelCard; }, [panelCard]);
  useEffect(() => { stickyEditorRef.current = stickyEditor; }, [stickyEditor]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { shapesRef.current = shapes; }, [shapes]);

  const clearWheelSyncTimeout = useCallback(() => {
    if (wheelDebounceTimeoutRef.current) {
      window.clearTimeout(wheelDebounceTimeoutRef.current);
      wheelDebounceTimeoutRef.current = null;
    }
  }, []);

  const applyStageTransform = useCallback((nextScale: number, nextStagePos: any) => {
    scaleRef.current = nextScale;
    stagePosRef.current = nextStagePos;

    const stage = stageRef.current;
    if (!stage) return;

    stage.scale({ x: nextScale, y: nextScale });
    stage.position(nextStagePos);
    stage.batchDraw();
  }, []);

  const syncStageStateFromRefs = useCallback(() => {
    setScale(scaleRef.current);
    setStagePos(stagePosRef.current);
  }, []);

  useEffect(() => () => clearWheelSyncTimeout(), [clearWheelSyncTimeout]);

  useEffect(() => {
    if (shapesSaveTimeoutRef.current) window.clearTimeout(shapesSaveTimeoutRef.current);
    shapesSaveTimeoutRef.current = window.setTimeout(async () => {
      // Whiteboard: save geometric shapes to the canvas metadata
      // Annotations are intentionally skipped per original save format instructions unless requested later
      await handleCanvasWrite(() => canvasStorage.saveShapes(shapes.map(s => ({
        ...s,
        user_id: user?.id || '',
        canvas_id: 'main',
        z_index: 0
      }))));
    }, 1000);
    return () => {
      if (shapesSaveTimeoutRef.current) window.clearTimeout(shapesSaveTimeoutRef.current);
    };
  }, [shapes, user, canvasStorage, handleCanvasWrite]);

  const selectedCardId =
    selection.cardIds.length === 1 && selection.stickyIds.length === 0 ? selection.cardIds[0] : null;
  const selectionCount = selection.cardIds.length + selection.stickyIds.length;

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const previousAnnotations = undoStack.current.pop();
    setAnnotations(previousAnnotations);
  }, []);

  const handleStrokeCommit = useCallback(() => {
    undoStack.current.push(preStrokeAnnotationsRef.current);
    if (undoStack.current.length > 50) undoStack.current.shift();
  }, []);

  const handleBeforeStroke = useCallback(() => {
    preStrokeAnnotationsRef.current = annotationsRef.current;
  }, []);

  const persistStickiesList = useCallback(async (nextStickies: any[]) => {
    const list = sanitizeStickyList(nextStickies).map(s => ({...s, user_id: user?.id || ''}));
    await handleCanvasWrite(() => canvasStorage.saveStickies(list));
  }, [canvasStorage, user, handleCanvasWrite]);

  const persistCardPositions = useCallback(async (nextCards: any[], cardIds: string[]) => {
    const positionsToSave = nextCards
      .filter((card) => cardIds.includes(card.id) && !card._unsaved)
      .map((card) => ({
        id: `pos_${card.id}`,
        user_id: user?.id || '',
        canvas_id: 'main',
        card_id: card.id,
        x: card.canvasPos.x,
        y: card.canvasPos.y,
        updated_at: Date.now(),
    }));
    if (positionsToSave.length > 0) {
      await handleCanvasWrite(() => canvasStorage.saveCanvasPositions(positionsToSave));
    }
  }, [canvasStorage, user, handleCanvasWrite]);

  const persistCardLayouts = useCallback(async (nextCards: any[], cardIds: string[]) => {
    await Promise.all(
      nextCards
        .filter((card) => cardIds.includes(card.id) && !card._unsaved)
        .map((card) =>
          handleCanvasWrite(() => canvasStorage.updateCard(card.id, {
            w: card.w,
            h: card.h,
          })),
        ),
    );
    await persistCardPositions(nextCards, cardIds);
  }, [canvasStorage, persistCardPositions, handleCanvasWrite]);

  const persistCardMasks = useCallback(async (cardId: string, nextMasks: any[]) => {
    const card = cardsRef.current.find((candidate) => candidate.id === cardId);
    if (!card || card._unsaved) return;
    await handleCanvasWrite(() => canvasStorage.updateCard(cardId, { masks: nextMasks } as any));
  }, [canvasStorage, handleCanvasWrite]);

  const persistCanvasConnections = useCallback(async (nextConnections: any[]) => {
    const records = nextConnections.filter(c => c.type === 'manual').map(c => ({
      ...c,
      user_id: user?.id || '',
    }));
    await handleCanvasWrite(() => canvasStorage.saveConnections(records));
  }, [canvasStorage, user, handleCanvasWrite]);

  const recomputeConnections = useCallback(async (sourceCards = cardsRef.current) => {
    const persistedCards = sourceCards.filter((card) => card.canvasPos && !card._unsaved);
    const autoConnections = deriveAutoConnections(persistedCards);
    const nextConnections = mergeCanvasConnections(autoConnections, connectionsRef.current);

    setConnections(nextConnections);
    connectionsComputedRef.current = true;
    await persistCanvasConnections(nextConnections);
    return nextConnections;
  }, [persistCanvasConnections]);

  const updatePanelPos = useCallback(() => {
    if (!showPanel || !detailsPanelRef.current || !panelCardRef.current) return;

    const liveCard = cardsRef.current.find((card) => card.id === panelCardRef.current.id) || panelCardRef.current;
    if (!liveCard?.canvasPos) return;

    const nextScale = scaleRef.current;
    const nextStagePos = stagePosRef.current;
    const panelX = liveCard.canvasPos.x * nextScale + nextStagePos.x + (liveCard.w || 240) * nextScale + 16;
    const panelY = liveCard.canvasPos.y * nextScale + nextStagePos.y;

    detailsPanelRef.current.style.left = `${panelX}px`;
    detailsPanelRef.current.style.top = `${panelY}px`;
  }, [showPanel]);

  useEffect(() => {
    updatePanelPos();
  }, [cards, scale, stagePos, panelCard, showPanel, updatePanelPos]);

  useEffect(() => {
    if (!activeSessionContext || typeof activeSessionContext !== 'object') return;
    const { focusCardId, openDetails } = activeSessionContext;
    if (!focusCardId) return;

    const intentKey = `${focusCardId}:${openDetails ? 'edit' : 'open'}`;
    if (consumedRouteIntentRef.current === intentKey) return;

    const targetCard = cards.find((card) => card.id === focusCardId);
    if (!targetCard) return;

    consumedRouteIntentRef.current = intentKey;
    const transform = getCardFocusTransform({
      card: targetCard,
      dims,
      scale: 1,
    });

    setScale(transform.scale);
    setStagePos(transform.stagePos);
    setSelection({ cardIds: [targetCard.id], stickyIds: [] });
    setMenuState(null);

    if (openDetails) {
      setPanelCard(targetCard);
      setShowPanel(true);
    } else {
      setPanelCard(null);
      setShowPanel(false);
    }
  }, [cards, dims, activeSessionContext]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateCanvas() {
      try {
        const [storedCards, storedStickies, storedConnections, storedPositions, storedShapes, storedNotes, storedConfig] = await Promise.all([
          canvasStorage.getAllCards(),
          canvasStorage.getStickies('main'),
          canvasStorage.getConnections(),
          canvasStorage.getCanvasPositions('main'),
          canvasStorage.getShapes('main'),
          canvasStorage.loadNotes(),
          canvasStorage.getConfig(),
        ]);
        if (cancelled) return;

        const hydratedCards = storedCards.map(card => {
          const pos = storedPositions.find(p => p.card_id === card.id);
          return {
            ...card,
            canvasPos: pos ? { x: pos.x, y: pos.y } : undefined,
            w: card.w,
            h: card.h,
          };
        }).filter(card => card.canvasPos);

        const manualConnections = storedConnections.filter(c => c.type === 'manual');
        setCards(hydratedCards);
        setStickies((storedStickies || []).map(normalizeSticky));
        setConnections(manualConnections);
        setShapes(storedShapes || []);
        setNotes({
          text: storedNotes.text || '',
          lastUpdated: storedNotes.lastUpdated || null,
          lastPattern: storedNotes.lastPattern || '',
        });
        setConfig(storedConfig || {});
        
        const legacyCardAnnotations = hydratedCards.flatMap((card) =>
          ((card as any).annotations || []).map((annotation: any) => ({
            ...annotation,
            cardId: annotation.cardId || card.id,
          })),
        );
        setAnnotations(legacyCardAnnotations);

        const imageEntries = hydratedCards.map(card => card.screenshot_url ? [card.id, card.screenshot_url] : null).filter(Boolean);
        setImages(Object.fromEntries(imageEntries as any));

        if (!cancelled && !connectionsComputedRef.current) {
          connectionsRef.current = manualConnections;
          await recomputeConnections(hydratedCards);
        }
      } catch (error) {
        console.error('Failed to hydrate canvas', error);
      }
    }

    hydrateCanvas();
    return () => { cancelled = true; };
  }, [canvasStorage, recomputeConnections]);

  useEffect(() => {
    const onResize = () => setDims({ w: window.innerWidth - 52, h: window.innerHeight - 48 });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (notesSaveTimeoutRef.current) {
      window.clearTimeout(notesSaveTimeoutRef.current);
    }

    notesSaveTimeoutRef.current = window.setTimeout(async () => {
      const nextNotes = {
        ...notes,
        lastUpdated: new Date().toISOString(),
      };
      await handleCanvasWrite(() => canvasStorage.saveNotes(nextNotes));
    }, 800);

    return () => {
      if (notesSaveTimeoutRef.current) window.clearTimeout(notesSaveTimeoutRef.current);
    };
  }, [notes, canvasStorage, handleCanvasWrite]);

  useEffect(() => {
    if (notesPatternTimeoutRef.current) window.clearTimeout(notesPatternTimeoutRef.current);
    if (!notes.text || notes.text.trim().length <= 80 || !config?.geminiApiKey) return undefined;

    notesPatternTimeoutRef.current = window.setTimeout(async () => {
      const pattern = await fetchGeminiNotePattern(config.geminiApiKey, notes.text, buildInsightSummary(cardsRef.current));
      if (!pattern) return;

      setNotes((previousNotes) => ({ ...previousNotes, lastPattern: pattern }));
      const latestNotes = notesRef.current;
      const nextNotes = {
        ...latestNotes,
        lastPattern: pattern,
        lastUpdated: new Date().toISOString(),
      };
      await handleCanvasWrite(() => canvasStorage.saveNotes(nextNotes));
    }, 10000);

    return () => {
      if (notesPatternTimeoutRef.current) window.clearTimeout(notesPatternTimeoutRef.current);
    };
  }, [config?.geminiApiKey, notes.text, canvasStorage, handleCanvasWrite]);

  const pasteCardFromClipboard = useCallback(async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) return false;
      const items = await navigator.clipboard.read();
      let blob: Blob | null = null;
      for (const item of items) {
        if (item.types.includes('image/png')) {
          blob = await item.getType('image/png');
          break;
        }
      }
      if (!blob) return false;

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      const base64Image = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] || '');
        };
      });

      if (!base64Image) return false;

      const filename = `clip_${Date.now()}.png`;
      let publicUrl = '';
      await handleCanvasWrite(async () => {
        publicUrl = await canvasStorage.saveImage(filename, base64Image);
      });
      if (!publicUrl) return false;

      const newCard = createUnsavedCard({
        base64Image: publicUrl,
        dims,
        scale: scaleRef.current,
        stagePos: stagePosRef.current,
      });

      if (activeSessionContext) {
        (newCard as any).session_id = activeSessionContext;
      }

      setCards((previousCards) => [...previousCards, newCard]);
      setImages((previousImages) => ({ ...previousImages, [newCard.id]: publicUrl }));
      setSelection({ cardIds: [newCard.id], stickyIds: [] });
      setPanelCard(newCard);
      setShowPanel(true);
      setMenuState(null);
      return true;
    } catch (e) {
      console.warn('Clipboard read failed. Ensure HTTPS and user gesture.', e);
      return false;
    }
  }, [dims, canvasStorage, activeSessionContext, handleCanvasWrite]);

  const zoomToFit = useCallback(() => {
    const transform = getZoomToFitTransform({
      cards: cardsRef.current,
      stickies: stickiesRef.current,
      dims,
      padding: 96,
    });
    setScale(transform.scale);
    setStagePos(transform.stagePos);
  }, [dims]);

  const zoomTo100 = useCallback(() => {
    const transform = getZoom100Transform({
      dims,
      scale: scaleRef.current,
      stagePos: stagePosRef.current,
    });
    setScale(transform.scale);
    setStagePos(transform.stagePos);
  }, [dims]);

  const selectSingleCard = useCallback((cardId: string, event?: any) => {
    const toggle = event?.evt?.ctrlKey || event?.evt?.metaKey;

    setSelection((previousSelection) => {
      if (!toggle) {
        return { cardIds: [cardId], stickyIds: [] };
      }

      const cardIds = previousSelection.cardIds.includes(cardId)
        ? previousSelection.cardIds.filter((id) => id !== cardId)
        : [...previousSelection.cardIds, cardId];

      return { cardIds, stickyIds: [] };
    });
  }, []);

  const selectSingleSticky = useCallback((stickyId: string, event?: any) => {
    const toggle = event?.evt?.ctrlKey || event?.evt?.metaKey;

    setSelection((previousSelection) => {
      if (!toggle) {
        return { cardIds: [], stickyIds: [stickyId] };
      }

      const stickyIds = previousSelection.stickyIds.includes(stickyId)
        ? previousSelection.stickyIds.filter((id) => id !== stickyId)
        : [...previousSelection.stickyIds, stickyId];

      return { cardIds: [], stickyIds };
    });
    setShowPanel(false);
  }, []);

  const getDraggedCollections = useCallback((snapshot: any, x: number, y: number) => {
    const dx = x - snapshot.activeOrigin.x;
    const dy = y - snapshot.activeOrigin.y;

    return {
      nextCards: cardsRef.current.map((card) => {
        const origin = snapshot.originCards[card.id];
        return origin
          ? { ...card, canvasPos: { x: origin.x + dx, y: origin.y + dy } }
          : card;
      }),
      nextStickies: stickiesRef.current.map((sticky) => {
        const origin = snapshot.originStickies[sticky.id];
        return origin ? { ...sticky, x: origin.x + dx, y: origin.y + dy } : sticky;
      }),
    };
  }, []);

  const beginDrag = useCallback((type: string, id: string) => {
    setMenuState(null);

    const currentSelection = selectionRef.current;
    const isAlreadySelected =
      type === 'card' ? currentSelection.cardIds.includes(id) : currentSelection.stickyIds.includes(id);
    const selectedCardIds =
      type === 'card'
        ? isAlreadySelected
          ? currentSelection.cardIds
          : [id]
        : isAlreadySelected
          ? currentSelection.cardIds
          : [];
    const selectedStickyIds =
      type === 'sticky'
        ? isAlreadySelected
          ? currentSelection.stickyIds
          : [id]
        : isAlreadySelected
          ? currentSelection.stickyIds
          : [];

    if (
      (!currentSelection.cardIds.includes(id) && type === 'card') ||
      (!currentSelection.stickyIds.includes(id) && type === 'sticky')
    ) {
      setSelection(type === 'card' ? { cardIds: [id], stickyIds: [] } : { cardIds: [], stickyIds: [id] });
    }

    const originCards = Object.fromEntries(
      cardsRef.current
        .filter((card) => selectedCardIds.includes(card.id))
        .map((card) => [card.id, { x: card.canvasPos.x, y: card.canvasPos.y }]),
    );
    const originStickies = Object.fromEntries(
      stickiesRef.current
        .filter((sticky) => selectedStickyIds.includes(sticky.id))
        .map((sticky) => [sticky.id, { x: sticky.x, y: sticky.y }]),
    );

    dragSnapshotRef.current = {
      activeId: id,
      activeType: type,
      selectedCardIds,
      selectedStickyIds,
      originCards,
      originStickies,
      activeOrigin: type === 'card' ? originCards[id] : originStickies[id],
    };
  }, []);

  const handleCardDragMove = useCallback((id: string, x: number, y: number) => {
    const snapshot = dragSnapshotRef.current;
    if (!snapshot || snapshot.activeType !== 'card' || snapshot.activeId !== id) return;

    const { nextCards, nextStickies } = getDraggedCollections(snapshot, x, y);
    setCards(nextCards);
    setStickies(nextStickies);
  }, [getDraggedCollections]);

  const handleStickyDragMove = useCallback((id: string, x: number, y: number) => {
    const snapshot = dragSnapshotRef.current;
    if (!snapshot || snapshot.activeType !== 'sticky' || snapshot.activeId !== id) return;

    const { nextCards, nextStickies } = getDraggedCollections(snapshot, x, y);
    setCards(nextCards);
    setStickies(nextStickies);
  }, [getDraggedCollections]);

  const finishDrag = useCallback(
    async (type: string, id: string, x: number, y: number) => {
      const snapshot = dragSnapshotRef.current;
      if (!snapshot || snapshot.activeType !== type || snapshot.activeId !== id) return;

      const { nextCards, nextStickies } = getDraggedCollections(snapshot, x, y);
      dragSnapshotRef.current = null;
      setCards(nextCards);
      setStickies(nextStickies);

      await persistCardPositions(nextCards, snapshot.selectedCardIds);
      if (snapshot.selectedStickyIds.length) {
        await persistStickiesList(nextStickies);
      }
    },
    [getDraggedCollections, persistCardPositions, persistStickiesList],
  );

  const handleCardResize = useCallback((id: string, newW: number, newH: number, newX: number, newY: number) => {
    setCards((previousCards) =>
      previousCards.map((card) =>
        card.id === id ? { ...card, w: newW, h: newH, canvasPos: { x: newX, y: newY } } : card,
      ),
    );
  }, []);

  const handleCardResizeEnd = useCallback(
    (id: string) => {
      window.requestAnimationFrame(() => {
        persistCardLayouts(cardsRef.current, [id]);
      });
    },
    [persistCardLayouts],
  );

  const handleCreateMask = useCallback(
    async (cardId: string, mask: any) => {
      if (!mask) return;

      let nextMasks: any[] = [];
      setCards((previousCards) =>
        previousCards.map((card) => {
          if (card.id !== cardId) return card;
          nextMasks = [...(card.masks || []), mask];
          return { ...card, masks: nextMasks };
        }),
      );
      await handleCanvasWrite(() => canvasStorage.updateCard(cardId, { masks: nextMasks } as any));
    },
    [canvasStorage, handleCanvasWrite],
  );

  const handleToggleMask = useCallback(
    async (cardId: string, maskId: string) => {
      let nextMasks: any[] = [];
      setCards((previousCards) =>
        previousCards.map((card) => {
          if (card.id !== cardId) return card;
          nextMasks = toggleMaskVisibility(card.masks || [], maskId);
          return { ...card, masks: nextMasks };
        }),
      );
      await handleCanvasWrite(() => canvasStorage.updateCard(cardId, { masks: nextMasks } as any));
    },
    [canvasStorage, handleCanvasWrite],
  );

  const runSilentOcr = useCallback((cardId: string, base64Image: string, shouldRefreshConnections = false) => {
    if (!cardId || !base64Image) return;

    void Tesseract.recognize(base64Image, 'eng')
      .then(({ data: { text } }) => handleCanvasWrite(() => canvasStorage.updateCard(cardId, { ocr_text: text || '' })))
      .then(() => {
        let nextCards: any[] | null = null;
        setCards((previousCards) => {
          nextCards = previousCards.map((card) => (
            card.id === cardId ? { ...card, ocrText: 'recognized' } : card
          ));
          return nextCards;
        });
        if (shouldRefreshConnections && nextCards) {
          void recomputeConnections(nextCards);
        }
      })
      .catch(() => {});
  }, [recomputeConnections, canvasStorage, handleCanvasWrite]);

  const deleteManualConnection = useCallback(async (connectionId: string) => {
    const nextConnections = connectionsRef.current.filter((connection) => connection.id !== connectionId);
    setConnections(nextConnections);
    setSelectedConnectionId(null);
    setConnectionEditor(null);
    await persistCanvasConnections(nextConnections);
  }, [persistCanvasConnections]);

  const saveManualConnectionLabel = useCallback(async (connectionId: string, label: string) => {
    const trimmedLabel = label.trim();
    const nextConnections = connectionsRef.current.map((connection) => (
      connection.id === connectionId ? { ...connection, label: trimmedLabel || null } : connection
    ));
    setConnections(nextConnections);
    setConnectionEditor(null);
    await persistCanvasConnections(nextConnections);
  }, [persistCanvasConnections]);

  const focusDueCards = useCallback(() => {
    const dueCards = cardsRef.current.filter((card) => isCardDueForReview(card, new Date()));
    if (!dueCards.length) return;

    const transform = getZoomToFitTransform({
      cards: dueCards,
      stickies: [],
      dims,
      padding: 96,
    });
    setScale(transform.scale);
    setStagePos(transform.stagePos);
    setSelection({ cardIds: dueCards.map((card) => card.id), stickyIds: [] });
  }, [dims]);

  const handleShapeAdd = useCallback((shape: any, opts: any = {}) => {
    setShapes((prev) => [...prev, shape]);
    setSelectedShapeId(shape.id);
    if (opts.editText && shape.type === 'text') {
      setTextShapeEditor({ id: shape.id, x: shape.x, y: shape.y, width: shape.width || 200 });
    }
  }, []);

  const handleShapeUpdate = useCallback((id: string, patch: any) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setDrawingDefaults((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleShapeSelect = useCallback((id: string) => {
    setSelectedShapeId(id);
    setSelection(emptySelection());
    setSelectedConnectionId(null);
  }, []);

  const handleShapeDelete = useCallback((id: string) => {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    if (selectedShapeId === id) setSelectedShapeId(null);
  }, [selectedShapeId]);

  const handleShapeContextMenu = useCallback((shapeId: string, event: any) => {
    event.evt.preventDefault();
    setSelectedShapeId(shapeId);
    setMenuState({
      pos: { x: event.evt.clientX, y: event.evt.clientY },
      type: 'shape',
      shapeId,
    });
  }, []);

  const handleShapeBringToFront = useCallback((shapeId: string) => {
    setShapes((prev) => {
      const shape = prev.find((s) => s.id === shapeId);
      if (!shape) return prev;
      return [...prev.filter((s) => s.id !== shapeId), shape];
    });
  }, []);

  const handleShapeSendToBack = useCallback((shapeId: string) => {
    setShapes((prev) => {
      const shape = prev.find((s) => s.id === shapeId);
      if (!shape) return prev;
      return [shape, ...prev.filter((s) => s.id !== shapeId)];
    });
  }, []);

  const startManualArrow = useCallback((cardId: string) => {
    if (activeTool !== 'arrow') return undefined;
    setSelectedConnectionId(null);
    setConnectionEditor(null);
    setArrowDraft({
      fromId: cardId,
      toPoint: null,
    });
    return false;
  }, [activeTool]);

  const finishManualArrow = useCallback(async (cardId: string) => {
    if (!arrowDraft?.fromId || arrowDraft.fromId === cardId) {
      setArrowDraft(null);
      return;
    }

    const newConnection = {
      id: `manual_${Date.now()}`,
      from: arrowDraft.fromId,
      to: cardId,
      label: null,
      type: 'manual',
      color: MANUAL_CONNECTION_COLOR,
    };
    const nextConnections = [...connectionsRef.current, newConnection];
    setConnections(nextConnections);
    setSelectedConnectionId(newConnection.id);
    setArrowDraft(null);
    await persistCanvasConnections(nextConnections);
  }, [arrowDraft, persistCanvasConnections]);

  const handleSaveCard = useCallback(
    async (fields: any) => {
      const activeCard = cardsRef.current.find((card) => card.id === panelCardRef.current?.id) || panelCardRef.current;
      if (!activeCard) return;
      const wasUnsaved = Boolean(activeCard._unsaved);

      const payload = buildCardPayload({ ...activeCard, ...fields }, annotationsRef.current);
      if (activeSessionContext && !payload.session_id) {
        payload.session_id = activeSessionContext;
      }
      
      const imageUrl = imagesRef.current[activeCard.id] || activeCard._base64;
      payload.screenshot_url = imageUrl;

      let didSaveCard = false;
      if (wasUnsaved) {
        await handleCanvasWrite(async () => {
          await canvasStorage.saveCard(payload);
          didSaveCard = true;
        });
      } else {
        await handleCanvasWrite(async () => {
          await canvasStorage.updateCard(activeCard.id, payload);
          didSaveCard = true;
        });
      }
      if (!didSaveCard) return;

      let nextCardsSnapshot = cardsRef.current;
      if (wasUnsaved) {
        nextCardsSnapshot = cardsRef.current.map((card) => (card.id === activeCard.id ? { ...card, ...payload, _unsaved: false } : card));
        setCards(nextCardsSnapshot);
        setSelection((previousSelection) => ({
          ...previousSelection,
          cardIds: previousSelection.cardIds.map((cardId) => (cardId === activeCard.id ? payload.id : cardId)),
        }));
      } else {
        nextCardsSnapshot = cardsRef.current.map((card) =>
          (card.id === payload.id ? { ...card, ...payload } : card),
        );
        setCards(nextCardsSnapshot);
      }

      if (wasUnsaved) {
        await persistCardPositions(nextCardsSnapshot, [payload.id]);
        await recomputeConnections(nextCardsSnapshot);
      }
      
      // Attempt silent OCR if we have base64 (which we might not if it's purely a URL now, 
      // but tesseract needs actual bytes. Skipping silent OCR for purely URL-based saves in KROME).
      
      setPanelCard(payload);
      setShowPanel(false);
    },
    [recomputeConnections, persistCardPositions, canvasStorage, activeSessionContext, handleCanvasWrite],
  );

  const dismissPanel = useCallback(() => {
    const activeCard = panelCardRef.current;
    if (activeCard?._unsaved) {
      setCards((previousCards) => previousCards.filter((card) => card.id !== activeCard.id));
      setAnnotations((previousAnnotations) =>
        previousAnnotations.filter((annotation) => annotation.cardId !== activeCard.id),
      );
      setImages((previousImages) => {
        const nextImages = { ...previousImages };
        delete nextImages[activeCard.id];
        return nextImages;
      });
      setSelection((previousSelection) => ({
        ...previousSelection,
        cardIds: previousSelection.cardIds.filter((cardId) => cardId !== activeCard.id),
      }));
    }

    setPanelCard(null);
    setShowPanel(false);
  }, []);

  const createStickyAt = useCallback(
    async (worldPos: any) => {
      const sticky = normalizeSticky({
        id: `sticky_${Date.now()}`,
        x: worldPos.x - STICKY_W / 2,
        y: worldPos.y - STICKY_H / 2,
        text: '',
      });

      let nextStickies: any[] = [];
      setStickies((previousStickies) => {
        nextStickies = [...previousStickies, sticky];
        return nextStickies;
      });
      await persistStickiesList(nextStickies);

      setSelection({ cardIds: [], stickyIds: [sticky.id] });
      setStickyEditor({ noteId: sticky.id, text: '' });
      setMenuState(null);
      setShowPanel(false);
    },
    [persistStickiesList],
  );

  const startStickyEdit = useCallback((stickyId: string) => {
    const sticky = stickiesRef.current.find((note) => note.id === stickyId);
    if (!sticky) return;

    setSelection({ cardIds: [], stickyIds: [stickyId] });
    setStickyEditor({ noteId: stickyId, text: sticky.text || '' });
    setMenuState(null);
    setShowPanel(false);
  }, []);

  const commitStickyEdit = useCallback(
    async ({ save }: { save: boolean }) => {
      const editor = stickyEditorRef.current;
      if (!editor) return;

      if (save) {
        let nextStickies: any[] = [];
        setStickies((previousStickies) => {
          nextStickies = previousStickies.map((sticky) =>
            sticky.id === editor.noteId ? { ...sticky, text: editor.text.trim() } : sticky,
          );
          return nextStickies;
        });
        await persistStickiesList(nextStickies);
      }

      setStickyEditor(null);
    },
    [persistStickiesList],
  );

  const performDelete = useCallback(
    async ({ cardIds = selectionRef.current.cardIds, stickyIds = selectionRef.current.stickyIds } = {}) => {
      if (!cardIds.length && !stickyIds.length) return;

      const nextCards = cardsRef.current.filter((card) => !cardIds.includes(card.id));
      const nextAnnotations = annotationsRef.current.filter((annotation) => !cardIds.includes(annotation.cardId));
      const nextStickies = stickiesRef.current.filter((sticky) => !stickyIds.includes(sticky.id));

      const savedCards = cardsRef.current.filter((card) => cardIds.includes(card.id) && !card._unsaved);
      if (savedCards.length) {
        await Promise.all(savedCards.map((card) => handleCanvasWrite(() => canvasStorage.deleteCard(card.id))));
      }
      if (stickyIds.length) {
        await persistStickiesList(nextStickies);
      }

      setCards(nextCards);
      setAnnotations(nextAnnotations);
      setStickies(nextStickies);
      setImages((previousImages) => {
        const nextImages = { ...previousImages };
        cardIds.forEach((cardId) => delete nextImages[cardId]);
        return nextImages;
      });
      if (cardIds.length) {
        const nextConnections = connections.filter(
          (connection) => !cardIds.includes(connection.from) && !cardIds.includes(connection.to),
        );
        setConnections(nextConnections);
        await persistCanvasConnections(nextConnections);
      }

      if (panelCardRef.current && cardIds.includes(panelCardRef.current.id)) {
        setPanelCard(null);
        setShowPanel(false);
      }
      if (stickyEditorRef.current && stickyIds.includes(stickyEditorRef.current.noteId)) {
        setStickyEditor(null);
      }

      setSelection(emptySelection());
      setMenuState(null);
      setConfirmState(null);
    },
    [connections, persistCanvasConnections, persistStickiesList, canvasStorage, handleCanvasWrite],
  );

  const deleteSelection = useCallback(
    ({ cardIds = selectionRef.current.cardIds, stickyIds = selectionRef.current.stickyIds } = {}) => {
      if (!cardIds.length && !stickyIds.length) return;
      setConfirmState({
        message: buildDeleteMessage(cardIds.length, stickyIds.length),
        onConfirm: () => performDelete({ cardIds, stickyIds })
      });
    },
    [performDelete],
  );

  const duplicateSelectionItems = useCallback(
    async ({ cardIds = selectionRef.current.cardIds, stickyIds = selectionRef.current.stickyIds } = {}) => {
      const cardCopies = duplicateCards({
        cards: cardsRef.current,
        annotations: annotationsRef.current,
        selectedCardIds: cardIds,
      });
      const stickyCopies = duplicateStickies({
        stickies: stickiesRef.current,
        selectedStickyIds: stickyIds,
      });

      const nextCards = [];
      const nextAnnotations = [];
      const nextImages: Record<string, string> = {};

      for (const draftCard of cardCopies.cards) {
        const imageUrl = imagesRef.current[draftCard.sourceCardId];
        const draftAnnotations = cardCopies.annotations.filter(
          (annotation: any) => annotation.cardId === draftCard.id,
        );

        if (imageUrl) {
          const payload = buildCardPayload(draftCard, cardCopies.annotations);
          payload.screenshot_url = imageUrl;
          if (activeSessionContext) payload.session_id = activeSessionContext;
          
          let didSaveCopy = false;
          await handleCanvasWrite(async () => {
            await canvasStorage.saveCard(payload);
            didSaveCopy = true;
          });
          if (!didSaveCopy) continue;
          nextCards.push(payload);
          nextAnnotations.push(...(payload.annotations || []));
          nextImages[payload.id] = imageUrl;
          continue;
        }

        nextCards.push(draftCard);
        nextAnnotations.push(...draftAnnotations);
      }

      let nextStickies = stickiesRef.current;
      if (stickyCopies.stickies.length) {
        nextStickies = [...stickiesRef.current, ...stickyCopies.stickies.map(normalizeSticky)];
        setStickies(nextStickies);
        await persistStickiesList(nextStickies);
      }

      let nextCardsCollection = cardsRef.current;
      if (nextCards.length) {
        nextCardsCollection = [...cardsRef.current, ...nextCards];
        setCards((previousCards) => [...previousCards, ...nextCards]);
      }
      if (nextAnnotations.length) setAnnotations((previousAnnotations) => [...previousAnnotations, ...nextAnnotations]);
      if (Object.keys(nextImages).length) setImages((previousImages) => ({ ...previousImages, ...nextImages }));
      if (nextCards.length) {
        await persistCardPositions(nextCards, nextCards.map(c => c.id));
        await recomputeConnections(nextCardsCollection);
      }

      setSelection({
        cardIds: nextCards.map((card) => card.id),
        stickyIds: stickyCopies.selectedStickyIds,
      });
      setMenuState(null);
    },
    [persistStickiesList, recomputeConnections, canvasStorage, persistCardPositions, activeSessionContext, handleCanvasWrite],
  );

  const nudgeSelection = useCallback(
    async (dx: number, dy: number) => {
      if (selectionRef.current.cardIds.length === 0 && selectionRef.current.stickyIds.length === 0) return;

      const nextCards = moveCards(cardsRef.current, selectionRef.current.cardIds, dx, dy);
      const nextStickies = moveStickies(stickiesRef.current, selectionRef.current.stickyIds, dx, dy);

      setCards(nextCards);
      setStickies(nextStickies);
      await persistCardPositions(nextCards, selectionRef.current.cardIds);
      if (selectionRef.current.stickyIds.length) {
        await persistStickiesList(nextStickies);
      }
    },
    [persistCardPositions, persistStickiesList],
  );

  const handleWheel = useCallback((event: any) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const scaleBy = 1.1;
    let newScale = event.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    newScale = Math.max(0.1, Math.min(newScale, 4));

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const nextStagePos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    applyStageTransform(newScale, nextStagePos);
    clearWheelSyncTimeout();
    wheelDebounceTimeoutRef.current = window.setTimeout(() => {
      setScale(scaleRef.current);
      setStagePos(stagePosRef.current);
      wheelDebounceTimeoutRef.current = null;
    }, 100);
  }, [applyStageTransform, clearWheelSyncTimeout]);

  const completeSelection = useCallback(() => {
    const stage = stageRef.current;
    const marqueeRect = selectionRectRef.current;

    selectionAnchorRef.current = null;
    selectionRectRef.current = null;
    setSelectionRect(null);

    if (!stage || !marqueeRect) return;
    if (marqueeRect.width < 4 && marqueeRect.height < 4) return;

    const viewport = getWorldViewport({
      dims,
      scale: scaleRef.current,
      stagePos: stagePosRef.current,
    });

    const visibleCardIds = new Set(getVisibleCardIds(cardsRef.current, viewport));
    const visibleStickyIds = new Set(getVisibleStickyIds(stickiesRef.current, viewport));

    const nextCardIds = cardsRef.current
      .filter((card) => visibleCardIds.has(card.id))
      .filter((card) => {
        const nodeRect = cardNodeRefs.current[card.id]?.getClientRect?.();
        return Konva.Util.haveIntersection(marqueeRect, nodeRect || getCardRect(card));
      })
      .map((card) => card.id);

    const nextStickyIds = stickiesRef.current
      .filter((sticky) => visibleStickyIds.has(sticky.id))
      .filter((sticky) => {
        const nodeRect = stickyNodeRefs.current[sticky.id]?.getClientRect?.();
        return Konva.Util.haveIntersection(marqueeRect, nodeRect || getStickyRect(sticky));
      })
      .map((sticky) => sticky.id);

    setSelection({ cardIds: nextCardIds, stickyIds: nextStickyIds });
  }, [dims]);

  useEffect(() => {
    const handleKeyDown = async (event: any) => {
      const editable = isEditableTarget(event.target);

      if (event.code === 'Space' && !editable) {
        event.preventDefault();
        setIsSpaceDown(true);
      }

      if (stickyEditorRef.current) {
        if (event.key === 'Escape') {
          event.preventDefault();
          await commitStickyEdit({ save: false });
        }
        return;
      }

      if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        setNotesOpen((previousValue) => !previousValue);
        return;
      }

      if (editable || confirmState) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        await pasteCardFromClipboard();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handleUndo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 't') {
        event.preventDefault();
        setShowToolbar((previousValue) => !previousValue);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        setNotesOpen((previousValue) => !previousValue);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        await duplicateSelectionItems();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelection({
          cardIds: cardsRef.current.map((card) => card.id),
          stickyIds: stickiesRef.current.map((sticky) => sticky.id),
        });
        return;
      }

      if (!event.ctrlKey && !event.metaKey && !event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'v': setActiveTool('select'); return;
          case 'h': setActiveTool('hand'); return;
          case 'r': setActiveTool('shape-rect'); return;
          case 'd': setActiveTool('shape-diamond'); return;
          case 'e': setActiveTool('shape-ellipse'); return;
          case 'a': setActiveTool('shape-arrow'); return;
          case 'l': setActiveTool('shape-line'); return;
          case 'p': setActiveTool('shape-freedraw'); return;
          case 't': setActiveTool('shape-text'); return;
          case 'n': setActiveTool('pen'); return;      
          case 'm': setActiveTool('marker'); return;   
          case 'i': setActiveTool('highlighter'); return; 
          case 'x': setActiveTool('eraser'); return;   
          default: break;
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.code === 'Digit1') {
        event.preventDefault();
        zoomTo100();
        return;
      }

      if (event.shiftKey && event.code === 'Digit1') {
        event.preventDefault();
        zoomToFit();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        if (selectedShapeId) {
          handleShapeDelete(selectedShapeId);
          return;
        }
        if (selectedConnectionId) {
          await deleteManualConnection(selectedConnectionId);
          return;
        }
        deleteSelection();
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        await nudgeSelection(0, -step);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        await nudgeSelection(0, step);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        await nudgeSelection(-step, 0);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        await nudgeSelection(step, 0);
        return;
      }

      if (event.code === 'Escape') {
        setMenuState(null);
        setSelectedConnectionId(null);
        setConnectionEditor(null);
        setArrowDraft(null);
        setActiveTool('select');
      }
    };

    const handleKeyUp = (event: any) => {
      if (event.code === 'Space') {
        setIsSpaceDown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    commitStickyEdit,
    deleteSelection,
    duplicateSelectionItems,
    deleteManualConnection,
    handleShapeDelete,
    handleUndo,
    nudgeSelection,
    pasteCardFromClipboard,
    selectedConnectionId,
    selectedShapeId,
    zoomTo100,
    zoomToFit,
    confirmState
  ]);

  const openCardContextMenu = useCallback((cardId: string, event: any) => {
    const isMultiTarget = selectionCount > 1 && selectionRef.current.cardIds.includes(cardId);
    if (!isMultiTarget) {
      setSelection({ cardIds: [cardId], stickyIds: [] });
    }

    setMenuState({
      pos: { x: event.evt.clientX, y: event.evt.clientY },
      worldPos: getWorldPointFromClient(stageRef.current, event.evt.clientX, event.evt.clientY),
      type: isMultiTarget ? 'multi' : 'card',
      cardId,
    });
  }, [selectionCount]);

  const openStickyContextMenu = useCallback((stickyId: string, event: any) => {
    const isMultiTarget = selectionCount > 1 && selectionRef.current.stickyIds.includes(stickyId);
    if (!isMultiTarget) {
      setSelection({ cardIds: [], stickyIds: [stickyId] });
    }

    setMenuState({
      pos: { x: event.evt.clientX, y: event.evt.clientY },
      worldPos: getWorldPointFromClient(stageRef.current, event.evt.clientX, event.evt.clientY),
      type: isMultiTarget ? 'multi' : 'sticky',
      stickyId,
    });
  }, [selectionCount]);

  const handleMenuAction = useCallback(
    async (action: string) => {
      if (action === 'paste') {
        await pasteCardFromClipboard();
        return;
      }
      if (action === 'sticky') {
        const fallbackPoint = getWorldPointer(stageRef.current) || {
          x: (-stagePosRef.current.x + dims.w / 2) / scaleRef.current,
          y: (-stagePosRef.current.y + dims.h / 2) / scaleRef.current,
        };
        await createStickyAt(menuState?.worldPos || fallbackPoint);
        return;
      }
      if (action === 'zoom-fit') {
        zoomToFit();
        return;
      }
      if (action === 'zoom-100') {
        zoomTo100();
        return;
      }
      if (action === 'edit') {
        const card = cardsRef.current.find((candidate) => candidate.id === menuState?.cardId);
        if (!card) return;
        setSelection({ cardIds: [card.id], stickyIds: [] });
        setPanelCard(card);
        setShowPanel(true);
        return;
      }
      if (action === 'duplicate') {
        await duplicateSelectionItems({ cardIds: [menuState?.cardId], stickyIds: [] });
        return;
      }
      if (action === 'duplicate-multi') {
        await duplicateSelectionItems();
        return;
      }
      if (action === 'delete') {
        deleteSelection({ cardIds: [menuState?.cardId], stickyIds: [] });
        return;
      }
      if (action === 'delete-multi') {
        deleteSelection();
        return;
      }
      if (action === 'edit-sticky') {
        startStickyEdit(menuState?.stickyId);
        return;
      }
      if (action === 'delete-sticky') {
        deleteSelection({ cardIds: [], stickyIds: [menuState?.stickyId] });
        return;
      }
      if (action === 'shape-bring-front') {
        handleShapeBringToFront(menuState?.shapeId);
        return;
      }
      if (action === 'shape-send-back') {
        handleShapeSendToBack(menuState?.shapeId);
        return;
      }
      if (action === 'shape-delete') {
        handleShapeDelete(menuState?.shapeId);
      }
    },
    [
      createStickyAt,
      deleteSelection,
      dims,
      duplicateSelectionItems,
      handleShapeBringToFront,
      handleShapeDelete,
      handleShapeSendToBack,
      menuState,
      pasteCardFromClipboard,
      startStickyEdit,
      zoomTo100,
      zoomToFit,
    ],
  );

  const drawingTools = ['pen', 'marker', 'highlighter', 'eraser', 'rect', 'shape-freedraw'];
  const isDrawMode = drawingTools.includes(activeTool);
  const isMaskMode = activeTool === 'mask';
  const isArrowMode = activeTool === 'arrow';
  const isShapeTool = SHAPE_TOOLS.includes(activeTool);
  const isToolDrawing = isDrawMode || isMaskMode || isArrowMode;
  const isHandMode = activeTool === 'hand';
  const dueCardIdSet = useMemo(() => {
    const time = new Date();
    return new Set(cards.filter((card) => isCardDueForReview(card, time)).map((c) => c.id));
  }, [cards]);
  const dueCount = dueCardIdSet.size;
  const notesFallbackPattern = buildNotesPatternFallback(notes.text, config?.insights || []);

  const cursorStyle = () => {
    if (isSpaceDown || isHandMode) return 'grab';
    if (activeTool === 'eraser') return 'cell';
    if (isToolDrawing || isShapeTool) return 'crosshair';
    return 'default';
  };

  const { visibleCards, visibleStickies } = useMemo(() => {
    const viewport = getWorldViewport({ dims, scale, stagePos });
    
    const bufferedViewport = {
      x: viewport.x - viewport.width * 0.25,
      y: viewport.y - viewport.height * 0.25,
      width: viewport.width * 1.5,
      height: viewport.height * 1.5,
    };

    const visibleCardIdSet = new Set(getVisibleCardIds(cards, bufferedViewport));
    const visibleStickyIdSet = new Set(getVisibleStickyIds(stickies, bufferedViewport));

    return {
      visibleCards: cards.filter((c) => visibleCardIdSet.has(c.id)),
      visibleStickies: stickies.filter((s) => visibleStickyIdSet.has(s.id)),
    };
  }, [cards, stickies, scale, stagePos, dims]);

  const editingSticky = stickyEditor ? stickies.find((sticky) => sticky.id === stickyEditor.noteId) : null;

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        background: 'var(--nt-bg)',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        minHeight: '100%',
      }}
    >
      <Stage
        ref={stageRef}
        width={dims.w}
        height={dims.h}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={isSpaceDown || isHandMode}
        onWheel={handleWheel}
        onDragStart={(event) => {
          if (event.target === stageRef.current) {
            clearWheelSyncTimeout();
          }
        }}
        onDragMove={(event) => {
          if (event.target === stageRef.current) {
            stagePosRef.current = { x: event.target.x(), y: event.target.y() };
          }
        }}
        onDragEnd={(event) => {
          if (event.target === stageRef.current) {
            stagePosRef.current = { x: event.target.x(), y: event.target.y() };
            syncStageStateFromRefs();
          }
        }}
        onMouseDown={(event) => {
          if (isShapeTool && shapesLayerRef.current?._handlers?.onMouseDown) {
            shapesLayerRef.current._handlers.onMouseDown(event);
            return;
          }
          if (event.target !== stageRef.current) return;
          if (isSpaceDown || isHandMode || event.evt.button !== 0) return;
          if (isArrowMode) {
            setArrowDraft(null);
            return;
          }
          if (isToolDrawing) return;

          const worldPoint = getWorldPointer(stageRef.current);
          if (!worldPoint) return;

          selectionAnchorRef.current = worldPoint;
          selectionRectRef.current = { x: worldPoint.x, y: worldPoint.y, width: 0, height: 0 };
          selectionMovedRef.current = false;
          setSelectionRect(selectionRectRef.current);
          setMenuState(null);
        }}
        onMouseMove={(event) => {
          if (isShapeTool && shapesLayerRef.current?._handlers?.onMouseMove) {
            shapesLayerRef.current._handlers.onMouseMove(event);
            return;
          }
          if (arrowDraft?.fromId) {
            const draftPoint = getWorldPointer(stageRef.current);
            if (draftPoint) {
              setArrowDraft((previousDraft: any) => (
                previousDraft ? { ...previousDraft, toPoint: draftPoint } : previousDraft
              ));
            }
          }
          if (!selectionAnchorRef.current) return;
          const worldPoint = getWorldPointer(stageRef.current);
          if (!worldPoint) return;

          const nextRect = getSelectionRect(selectionAnchorRef.current, worldPoint);
          selectionRectRef.current = nextRect;
          selectionMovedRef.current = nextRect.width > 2 || nextRect.height > 2;
          setSelectionRect(nextRect);
        }}
        onMouseUp={(event) => {
          if (isShapeTool && shapesLayerRef.current?._handlers?.onMouseUp) {
            shapesLayerRef.current._handlers.onMouseUp(event);
            return;
          }
          if (arrowDraft?.fromId && event.target === stageRef.current) {
            setArrowDraft(null);
          }
          completeSelection();
        }}
        onMouseLeave={completeSelection}
        onClick={(event) => {
          if (isShapeTool && shapesLayerRef.current?._handlers?.onClick) {
            shapesLayerRef.current._handlers.onClick(event);
            return;
          }
          if (selectionMovedRef.current) {
            selectionMovedRef.current = false;
            return;
          }

          if (event.target === stageRef.current && !isToolDrawing) {
            setSelection(emptySelection());
            setMenuState(null);
            setSelectedConnectionId(null);
            setSelectedShapeId(null);
          }
        }}
        onContextMenu={(event) => {
          event.evt.preventDefault();
          if (event.target !== stageRef.current) return;

          setMenuState({
            pos: { x: event.evt.clientX, y: event.evt.clientY },
            worldPos: getWorldPointFromClient(stageRef.current, event.evt.clientX, event.evt.clientY),
            type: 'canvas',
          });
        }}
        style={{ cursor: cursorStyle() }}
      >
        <Layer listening={false}>
          <CanvasGrid width={dims.w} height={dims.h} stageRef={stageRef} />
        </Layer>

        <Layer>
          <ShapesLayer
            ref={shapesLayerRef}
            shapes={shapes}
            activeTool={activeTool}
            stageRef={stageRef}
            scale={scale}
            stagePos={stagePos}
            selectedShapeId={selectedShapeId}
            onShapeAdd={handleShapeAdd}
            onShapeUpdate={handleShapeUpdate}
            onShapeSelect={handleShapeSelect}
            onShapeContextMenu={handleShapeContextMenu}
            defaultProps={drawingDefaults}
          />
        </Layer>

        <Layer>
          <ConnectionsLayer
            cards={cards}
            connections={connections}
            showAutoConnections={showLinks}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={setSelectedConnectionId}
            onDeleteConnection={(connectionId) => void deleteManualConnection(connectionId)}
            onEditConnection={(connection, midpoint) => {
              setSelectedConnectionId(connection.id);
              setConnectionEditor({
                id: connection.id,
                label: connection.label || '',
                left: midpoint.x * scale + stagePos.x,
                top: midpoint.y * scale + stagePos.y,
              });
            }}
          />

          {arrowDraft?.fromId && arrowDraft.toPoint ? (
            (() => {
              const fromCard = cards.find((card) => card.id === arrowDraft.fromId);
              if (!fromCard) return null;
              const fromRect = getCardRect(fromCard);
              return (
                <Arrow
                  points={[
                    fromRect.x + fromRect.width / 2,
                    fromRect.y + fromRect.height / 2,
                    arrowDraft.toPoint.x,
                    arrowDraft.toPoint.y,
                  ]}
                  stroke={MANUAL_CONNECTION_COLOR}
                  fill={MANUAL_CONNECTION_COLOR}
                  strokeWidth={1.5}
                  pointerLength={8}
                  pointerWidth={6}
                  listening={false}
                />
              );
            })()
          ) : null}
        </Layer>

        <Layer>
          {visibleCards.map((card) => (
            <CanvasCard
              key={card.id}
              card={card}
              imgSrc={images[card.id]}
              isSelected={selection.cardIds.includes(card.id)}
              showResizeHandles={selection.cardIds.length === 1 && selection.stickyIds.length === 0 && selection.cardIds.includes(card.id) && !isToolDrawing}
              onSelect={!isToolDrawing ? selectSingleCard : undefined}
              onPrimaryPointerDown={(id) => startManualArrow(id)}
              onPrimaryPointerUp={(id) => void finishManualArrow(id)}
              onDragStart={(id) => beginDrag('card', id)}
              onDragMove={handleCardDragMove}
              onDragEnd={(id, x, y) => finishDrag('card', id, x, y)}
              onDblClick={(cardData) => {
                setSelection({ cardIds: [cardData.id], stickyIds: [] });
                setPanelCard(cardData);
                setShowPanel(true);
              }}
              onResize={handleCardResize}
              onResizeEnd={handleCardResizeEnd}
              onContextMenu={openCardContextMenu}
              onMaskToggle={handleToggleMask}
              draggable={!isToolDrawing}
              isDue={dueCardIdSet.has(card.id)}
              showArrowTarget={isArrowMode && (hoveredArrowCardId === card.id || arrowDraft?.fromId === card.id)}
              onPointerEnter={(id) => {
                if (isArrowMode) setHoveredArrowCardId(id);
              }}
              onPointerLeave={() => {
                if (isArrowMode) setHoveredArrowCardId(null);
              }}
              registerNodeRef={(id, node) => {
                if (node) cardNodeRefs.current[id] = node;
                else delete cardNodeRefs.current[id];
              }}
            />
          ))}

          {visibleStickies.map((sticky) => (
            <StickyNote
              key={sticky.id}
              note={sticky}
              isSelected={selection.stickyIds.includes(sticky.id)}
              onSelect={!isToolDrawing ? selectSingleSticky : undefined}
              onDoubleClick={startStickyEdit}
              onDragStart={(id) => beginDrag('sticky', id)}
              onDragMove={handleStickyDragMove}
              onDragEnd={(id, x, y) => finishDrag('sticky', id, x, y)}
              onContextMenu={openStickyContextMenu}
              draggable={!isToolDrawing}
              registerNodeRef={(id, node) => {
                if (node) stickyNodeRefs.current[id] = node;
                else delete stickyNodeRefs.current[id];
              }}
            />
          ))}
        </Layer>

        <Layer>
          <AnnotationLayer
            stageRef={stageRef}
            dims={dims}
            scale={scale}
            stagePos={stagePos}
            cards={cards}
            selectedCardId={isDrawMode ? selectedCardId : null}
            activeTool={activeTool}
            activeColor={activeColor}
            activeSize={activeSize as any}
            annotations={annotations}
            setAnnotations={setAnnotations}
            onStrokeCommit={handleStrokeCommit}
            onBeforeStroke={handleBeforeStroke}
          />
        </Layer>

        <Layer>
          <MaskLayer
            stageRef={stageRef}
            dims={dims}
            scale={scale}
            stagePos={stagePos}
            cards={cards}
            selectedCardId={isMaskMode ? selectedCardId : null}
            activeTool={activeTool}
            onCreateMask={handleCreateMask}
          />

          <SelectionLayer selectionRect={selectionRect} />
        </Layer>
      </Stage>

      <PropertyPanel />

      {showPanel && panelCard && (
        <DetailsPanel
          card={cards.find((card) => card.id === panelCard.id) || panelCard}
          initialPos={{ x: 0, y: 0 }}
          onSave={handleSaveCard}
          onDismiss={dismissPanel}
        />
      )}

      {editingSticky && (
        <textarea
          autoFocus
          value={stickyEditor.text}
          onChange={(event) =>
            setStickyEditor((previousEditor: any) => ({ ...previousEditor, text: event.target.value }))
          }
          onBlur={() => commitStickyEdit({ save: true })}
          onKeyDown={async (event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              await commitStickyEdit({ save: false });
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              await commitStickyEdit({ save: true });
            }
          }}
          style={{
            position: 'absolute',
            left: editingSticky.x * scale + stagePos.x,
            top: editingSticky.y * scale + stagePos.y,
            width: Math.max(180, editingSticky.w * scale),
            height: Math.max(180, editingSticky.h * scale),
            background: 'var(--nt-bg3)',
            border: '2px solid var(--nt-accent)',
            borderRadius: 10,
            padding: 14,
            color: 'var(--nt-text1)',
            fontSize: 14,
            lineHeight: 1.4,
            resize: 'none',
            outline: 'none',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            zIndex: 2200,
            fontFamily: "'Instrument Sans', sans-serif",
          }}
        />
      )}

      {connectionEditor && (
        <input
          autoFocus
          value={connectionEditor.label}
          onChange={(event) =>
            setConnectionEditor((previousEditor: any) => ({ ...previousEditor, label: event.target.value }))
          }
          onBlur={() => void saveManualConnectionLabel(connectionEditor.id, connectionEditor.label)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setConnectionEditor(null);
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              void saveManualConnectionLabel(connectionEditor.id, connectionEditor.label);
            }
          }}
          style={{
            position: 'absolute',
            left: connectionEditor.left - 70,
            top: connectionEditor.top - 18,
            width: 140,
            background: 'var(--nt-bg)',
            border: '1px solid rgba(232,131,74,0.5)',
            borderRadius: 8,
            padding: '6px 8px',
            color: 'var(--nt-text1)',
            fontSize: 11,
            outline: 'none',
            zIndex: 2100,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      )}

      <NotesPanel
        isOpen={notesOpen}
        text={notes.text}
        onChange={(value) => setNotes((previousNotes) => ({ ...previousNotes, text: value }))}
        pattern={notes.lastPattern}
        fallbackPattern={notesFallbackPattern}
      />

      {showToolbar && !['lock', 'hand', 'select', 'shape-rect', 'shape-diamond', 'shape-ellipse', 'shape-arrow', 'shape-line', 'shape-freedraw', 'shape-text', 'image', 'pen', 'marker', 'highlighter', 'eraser'].includes(activeTool) && (
        <AnnotationToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          activeColor={activeColor}
          setActiveColor={setActiveColor}
          activeSize={activeSize as any}
          setActiveSize={setActiveSize}
          showLinks={showLinks}
          onToggleLinks={() => setShowLinks((previousValue) => !previousValue)}
          dueCount={dueCount}
          onReviewDue={focusDueCards}
          notesOpen={notesOpen}
          onToggleNotes={() => setNotesOpen((previousValue) => !previousValue)}
          onUndo={handleUndo}
          onHide={() => setShowToolbar(false)}
        />
      )}

      {!showToolbar && (
        <button
          onClick={() => setShowToolbar(true)}
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--nt-bg2)',
            border: '1px solid var(--nt-border)',
            borderRadius: 20,
            color: 'var(--nt-text2)',
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: 12,
            zIndex: 900,
          }}
        >
          Show toolbar (Ctrl+T)
        </button>
      )}

      <ContextMenu
        pos={menuState?.pos}
        type={menuState?.type}
        onAction={handleMenuAction}
        onClose={() => setMenuState(null)}
      />

      <ProGateModal isOpen={isProGateOpen} onClose={() => setIsProGateOpen(false)} />

      {showToolbar && ['lock', 'hand', 'select', 'shape-rect', 'shape-diamond', 'shape-ellipse', 'shape-arrow', 'shape-line', 'shape-freedraw', 'shape-text', 'image', 'pen', 'marker', 'highlighter', 'eraser'].includes(activeTool) && (
        <CanvasToolbar activeTool={activeTool} setActiveTool={setActiveTool} />
      )}

      {selectedShapeId && (
        <PropertyPanel
          selectedShape={shapes.find((s) => s.id === selectedShapeId) || null}
          onShapeUpdate={handleShapeUpdate}
        />
      )}

      {textShapeEditor && (() => {
        const worldX = textShapeEditor.x * scale + stagePos.x;
        const worldY = textShapeEditor.y * scale + stagePos.y;
        return (
          <textarea
            autoFocus
            defaultValue={shapes.find((s) => s.id === textShapeEditor.id)?.text || ''}
            style={{
              position: 'absolute',
              left: worldX,
              top: worldY,
              width: (textShapeEditor.width || 200) * scale,
              minHeight: 40 * scale,
              background: 'var(--nt-bg-transparent)',
              border: '1.5px solid var(--nt-accent)',
              borderRadius: 6,
              color: 'var(--nt-text1)',
              fontSize: 18 * scale,
              fontFamily: "'Instrument Sans', sans-serif",
              padding: '4px 8px',
              resize: 'none',
              outline: 'none',
              zIndex: 2200,
              overflow: 'hidden',
            }}
            onBlur={(e) => {
              handleShapeUpdate(textShapeEditor.id, { text: (e.target as HTMLTextAreaElement).value });
              setTextShapeEditor(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleShapeUpdate(textShapeEditor.id, { text: (e.target as HTMLTextAreaElement).value });
                setTextShapeEditor(null);
              }
            }}
          />
        );
      })()}

      {confirmState && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--nt-bg3)',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--nt-border)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
        }}>
          <div style={{ color: 'var(--nt-text1)', fontSize: '16px' }}>{confirmState.message}</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setConfirmState(null)}
              style={{
                padding: '8px 16px',
                background: 'var(--nt-bg2)',
                border: '1px solid var(--nt-border)',
                color: 'var(--nt-text1)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={() => {
                confirmState.onConfirm();
                setConfirmState(null);
              }}
              style={{
                padding: '8px 16px',
                background: 'var(--nt-error)',
                border: 'none',
                color: '#fff',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}

      {cards.length === 0 && stickies.length === 0 && shapes.length === 0 && (
        <div className="canvas-empty-state" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--nt-text3)',
          fontSize: '14px',
          pointerEvents: 'none',
          fontFamily: "'Instrument Sans', sans-serif",
        }}>
          CTRL+V to paste your first card.
        </div>
      )}
    </div>
  );
}
