import { HistoryEntry } from '../types';

export const STORAGE_KEYS = {
    SETTINGS: 'krome_settings',
    DAY: 'krome_day',
    SESSION: 'krome_session',
    STREAK: 'krome_streak',
    HISTORY: 'krome_history',
    SUBJECTS: 'krome_subjects',
};

export function getItem<T>(key: string, fallback: T): T {
    try {
        if (typeof window === 'undefined') return fallback;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
        console.warn(`Failed to parse ${key}`, e);
        return fallback;
    }
}

export function setItem<T>(key: string, value: T): void {
    try {
        if (typeof window === 'undefined') return;
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn(`Failed to stringify ${key}`, e);
    }
}

export const getHistory = (): HistoryEntry[] => {
    return getItem<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
};
