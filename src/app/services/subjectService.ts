import { KromeSettings, Subject, SubjectSettings } from '../types';
import { getItem, setItem } from './storageService';
import { assignSubjectColor } from '../utils/subjectUtils';
import { normalizeGoalProgress } from '../utils/goalUtils';

const SUBJECTS_KEY = 'krome_subjects';

const DEFAULT_SUBJECT: Subject = {
    id: 'general',
    name: 'General',
    createdAt: Date.now(),
    color: '#62699D',
    settings: {},
    archived: false,
};

type LegacySubjectSettings = SubjectSettings & {
    muteFillSound?: boolean;
    soundVolume?: number;
};

function normalizeVolume(value: number | undefined) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
    }

    return Math.min(1, Math.max(0, value));
}

function normalizeSubject(subject: Subject, fallbackColor?: string): Subject {
    const rawSettings = subject.settings as LegacySubjectSettings | undefined;
    const {
        muteFillSound,
        soundVolume,
        ...settingsWithoutLegacyKeys
    } = rawSettings ?? {};
    const normalizedSettings = rawSettings
        ? {
            ...settingsWithoutLegacyKeys,
            plipInterval: settingsWithoutLegacyKeys.plipInterval ?? settingsWithoutLegacyKeys.intervalMinutes,
            sessionDuration: settingsWithoutLegacyKeys.sessionDuration ?? settingsWithoutLegacyKeys.blockMinutes,
            soundEnabled:
                typeof settingsWithoutLegacyKeys.soundEnabled === 'boolean'
                    ? settingsWithoutLegacyKeys.soundEnabled
                    : muteFillSound !== undefined
                        ? !muteFillSound
                        : undefined,
            volume: normalizeVolume(settingsWithoutLegacyKeys.volume ?? soundVolume),
        }
        : {};

    return {
        ...subject,
        createdAt: subject.createdAt ?? Date.now(),
        color: subject.color ?? fallbackColor ?? '#62699D',
        settings: normalizedSettings,
        archived: subject.archived ?? false,
    };
}

export const getSubjects = (): Subject[] => {
    const stored = getItem<Subject[]>(SUBJECTS_KEY, [DEFAULT_SUBJECT]);
    // Ensure the general subject always exists and has a color
    const hasGeneral = stored.some(s => s.id === 'general' || s.id === 'default');
    const subjects = hasGeneral ? stored : [DEFAULT_SUBJECT, ...stored];
    // Backfill colors for any old subjects missing them
    const existingColors = subjects.filter(s => s.color).map(s => s.color!);
    let changed = false;
    const normalized = subjects.map((subject) => {
        const nextColor = subject.color ?? assignSubjectColor(existingColors);
        if (!subject.color || subject.createdAt === undefined || subject.settings === undefined || subject.archived === undefined) {
            changed = true;
        }
        if (!existingColors.includes(nextColor)) {
            existingColors.push(nextColor);
        }
        return normalizeSubject(subject, nextColor);
    });
    if (changed) setItem(SUBJECTS_KEY, normalized);
    return normalized;
};

export const saveSubject = (subject: Subject): void => {
    const subjects = getSubjects();
    // Auto-assign a color if the subject doesn't have one
    if (!subject.color) {
        const existingColors = subjects.filter(s => s.color).map(s => s.color!);
        subject = { ...subject, color: assignSubjectColor(existingColors) };
    }
    const existingIndex = subjects.findIndex(s => s.id === subject.id);
    const updatedSubjects = existingIndex >= 0
        ? subjects.map((existingSubject, index) => index === existingIndex ? {
            ...existingSubject,
            ...subject,
            settings: {
                ...(existingSubject.settings ?? {}),
                ...(subject.settings ?? {}),
            },
        } : existingSubject)
        : [...subjects, normalizeSubject(subject)];
    setItem(SUBJECTS_KEY, updatedSubjects);
};

export const saveSubjects = (subjects: Subject[]): void => {
    setItem(SUBJECTS_KEY, subjects);
};

export const deleteSubject = (id: string): void => {
    const subjects = getSubjects();
    setItem(SUBJECTS_KEY, subjects.filter(s => s.id !== id));
};

export const resolveSettings = (
    globalSettings: KromeSettings,
    subjectId?: string,
    subjectsOverride?: Subject[]
): KromeSettings => {
    if (!subjectId) {
        return globalSettings;
    }

    const subject = (subjectsOverride ?? getSubjects()).find((entry) => entry.id === subjectId);
    if (!subject?.settings) {
        return globalSettings;
    }

    const overrides = subject.settings as LegacySubjectSettings;
    const subjectVolume = normalizeVolume(overrides.volume ?? overrides.soundVolume);
    const subjectSoundEnabled =
        typeof overrides.soundEnabled === 'boolean'
            ? overrides.soundEnabled
            : overrides.muteFillSound !== undefined
                ? !overrides.muteFillSound
                : undefined;
    const {
        dailyGoal,
        weeklyGoal,
        plipInterval,
        sessionDuration,
        blockMinutes,
        intervalMinutes,
        muteFillSound: _legacyMuteFillSound,
        soundVolume: _legacySoundVolume,
        soundEnabled,
        volume,
        ...settingsOverrides
    } = overrides;
    const nextBlockMinutes = sessionDuration ?? blockMinutes;
    const nextIntervalMinutes = plipInterval ?? intervalMinutes;

    return {
        ...globalSettings,
        ...Object.fromEntries(
            Object.entries(settingsOverrides).filter(([, value]) => value !== undefined)
        ),
        ...(subjectSoundEnabled !== undefined ? { soundEnabled: subjectSoundEnabled } : {}),
        ...(subjectVolume !== undefined ? { volume: subjectVolume } : {}),
        blockMinutes: nextBlockMinutes ?? globalSettings.blockMinutes,
        intervalMinutes: nextIntervalMinutes ?? globalSettings.intervalMinutes,
        dailyGoalProgress: dailyGoal !== undefined
            ? normalizeGoalProgress(
                typeof dailyGoal === 'number'
                    ? { type: globalSettings.dailyGoalProgress.type, target: dailyGoal, current: 0 }
                    : dailyGoal,
                globalSettings.dailyGoalProgress
            )
            : globalSettings.dailyGoalProgress,
        weeklyGoalProgress: weeklyGoal !== undefined
            ? normalizeGoalProgress(
                typeof weeklyGoal === 'number'
                    ? { type: globalSettings.weeklyGoalProgress.type, target: weeklyGoal, current: 0 }
                    : weeklyGoal,
                globalSettings.weeklyGoalProgress
            )
            : globalSettings.weeklyGoalProgress,
    };
};
