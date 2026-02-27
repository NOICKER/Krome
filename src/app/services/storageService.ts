import { HistoryEntry } from '../types';

export const STORAGE_KEYS = {
    SETTINGS: 'krome_settings',
    DAY: 'krome_day',
    SESSION: 'krome_session',
    STREAK: 'krome_streak',
    HISTORY: 'krome_history',
    SUBJECTS: 'krome_subjects',
};

// --- Module-level memory cache (Rule 7.5) ---
const storageCache = new Map<string, unknown>();

export function getItem<T>(key: string, fallback: T): T {
    try {
        if (typeof window === 'undefined') return fallback;

        // Return from cache if available
        if (storageCache.has(key)) {
            return storageCache.get(key) as T;
        }

        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : fallback;
        storageCache.set(key, parsed);
        return parsed;
    } catch (e) {
        console.warn(`Failed to parse ${key}`, e);
        return fallback;
    }
}

export function setItem<T>(key: string, value: T): void {
    try {
        if (typeof window === 'undefined') return;
        localStorage.setItem(key, JSON.stringify(value));
        storageCache.set(key, value); // Keep cache in sync
    } catch (e) {
        console.warn(`Failed to stringify ${key}`, e);
    }
}

// Invalidate cache when another tab modifies storage
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key) {
            storageCache.delete(e.key);
        }
    });

    // Clear entire cache when tab regains visibility (handles external cookie/storage changes)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            storageCache.clear();
        }
    });
}

export const getHistory = (): HistoryEntry[] => {
    return getItem<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
};
