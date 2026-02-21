import { Subject } from '../types';

// 12-color curated palette — clinical, distinct, low saturation
export const SUBJECT_PALETTE: string[] = [
    '#10b981', // emerald
    '#3b82f6', // blue
    '#a855f7', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
    '#ec4899', // pink
    '#14b8a6', // teal
    '#6366f1', // indigo
    '#e11d48', // rose
];

const FALLBACK_COLOR = '#64748b'; // slate-500

/**
 * Given a list of already-used colors, pick the next palette color.
 * Falls back to deterministic HSL if palette is exhausted.
 */
export function assignSubjectColor(existingColors: string[]): string {
    for (const color of SUBJECT_PALETTE) {
        if (!existingColors.includes(color)) return color;
    }
    // Deterministic HSL fallback based on count
    const hue = (existingColors.length * 47) % 360;
    return `hsl(${hue}, 60%, 50%)`;
}

/**
 * Given a pre-built subject map and a subjectId, return the subject's color.
 * Falls back to FALLBACK_COLOR if subject not found or has no color.
 */
export function getSubjectColor(
    subjectMap: Record<string, Subject>,
    subjectId?: string
): string {
    if (!subjectId) return FALLBACK_COLOR;
    const subject = subjectMap[subjectId];
    return subject?.color ?? FALLBACK_COLOR;
}

/**
 * Build a memoization-friendly map from subject id → Subject.
 */
export function buildSubjectMap(subjects: Subject[]): Record<string, Subject> {
    const map: Record<string, Subject> = {};
    for (const s of subjects) {
        map[s.id] = s;
    }
    return map;
}
