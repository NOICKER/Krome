import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as adapter from '../services/canvasStorageAdapter';
import type {
  LocalCardRecord,
  LocalCardConnectionRecord,
  LocalCanvasPositionRecord,
  LocalCanvasShapeRecord,
  LocalCanvasStickyRecord,
} from '../types';

export function useCanvasStorage() {
  const { user } = useAuth();
  
  // Safe user ID accessor
  const userId = user?.id || '';

  const getAllCards = useCallback(async () => {
    if (!userId) return [];
    return adapter.getAllCards(userId);
  }, [userId]);

  const saveCard = useCallback(async (card: LocalCardRecord) => {
    return adapter.saveCard(user, card);
  }, [user]);

  const updateCard = useCallback(async (id: string, fields: Partial<LocalCardRecord>) => {
    return adapter.updateCard(user, id, fields);
  }, [user]);

  const deleteCard = useCallback(async (id: string) => {
    if (!userId) return;
    return adapter.deleteCard(user, id, userId);
  }, [user, userId]);

  const getCanvasPositions = useCallback(async (canvasId: string) => {
    if (!userId) return [];
    return adapter.getCanvasPositions(userId, canvasId);
  }, [userId]);

  const saveCanvasPositions = useCallback(async (positions: LocalCanvasPositionRecord[]) => {
    return adapter.saveCanvasPositions(user, positions);
  }, [user]);

  const getConnections = useCallback(async () => {
    if (!userId) return [];
    return adapter.getConnections(userId);
  }, [userId]);

  const saveConnections = useCallback(async (connections: LocalCardConnectionRecord[]) => {
    return adapter.saveConnections(user, connections);
  }, [user]);

  const getShapes = useCallback(async (canvasId: string) => {
    if (!userId) return [];
    return adapter.getShapes(userId, canvasId);
  }, [userId]);

  const saveShapes = useCallback(async (shapes: LocalCanvasShapeRecord[]) => {
    return adapter.saveShapes(user, shapes);
  }, [user]);

  const getStickies = useCallback(async (canvasId: string) => {
    if (!userId) return [];
    return adapter.getStickies(userId, canvasId);
  }, [userId]);

  const saveStickies = useCallback(async (stickies: LocalCanvasStickyRecord[]) => {
    return adapter.saveStickies(user, stickies);
  }, [user]);

  const saveImage = useCallback(async (filename: string, base64: string) => {
    return adapter.saveImage(user, filename, base64, userId);
  }, [user, userId]);

  const getImageUrl = useCallback((filename: string) => {
    return adapter.getImageUrl(filename, userId);
  }, [userId]);

  const loadNotes = useCallback(async () => {
    try {
      const stored = localStorage.getItem('krome_canvas_notes');
      return stored ? JSON.parse(stored) : { text: '', lastUpdated: '' };
    } catch { return { text: '', lastUpdated: '' }; }
  }, []);

  const saveNotes = useCallback(async (data: { text: string, lastUpdated: string }) => {
    localStorage.setItem('krome_canvas_notes', JSON.stringify(data));
  }, []);

  // Handle config locally using localStorage since KROME's db schema 
  // didn't include a specific config table during the migration setup
  const getConfig = useCallback(async () => {
    try {
      const stored = localStorage.getItem('krome_canvas_config');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  const updateConfig = useCallback(async (newConfig: any) => {
    try {
      const existing = await getConfig();
      const updated = { ...existing, ...newConfig };
      localStorage.setItem('krome_canvas_config', JSON.stringify(updated));
      return { success: true, config: updated };
    } catch (e) {
      return { success: false };
    }
  }, [getConfig]);

  return {
    getAllCards,
    saveCard,
    updateCard,
    deleteCard,
    getCanvasPositions,
    saveCanvasPositions,
    getConnections,
    saveConnections,
    getShapes,
    saveShapes,
    getStickies,
    saveStickies,
    saveImage,
    getImageUrl,
    loadNotes,
    saveNotes,
    getConfig,
    updateConfig,
  };
}
