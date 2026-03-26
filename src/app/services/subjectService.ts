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

export function normalizeSubjectSettings(settings: SubjectSettings | undefined): SubjectSettings {
    const rawSettings = settings as LegacySubjectSettings | undefined;
    const {
        muteFillSound,
        soundVolume,
        ...settingsWithoutLegacyKeys
    } = rawSettings ?? {};
    const sessionDuration = settingsWithoutLegacyKeys.sessionDuration ?? settingsWithoutLegacyKeys.blockMinutes;
    const blockMinutes = settingsWithoutLegacyKeys.blockMinutes ?? settingsWithoutLegacyKeys.sessionDuration;
    const plipInterval = settingsWithoutLegacyKeys.plipInterval ?? settingsWithoutLegacyKeys.intervalMinutes;
    const intervalMinutes = settingsWithoutLegacyKeys.intervalMinutes ?? settingsWithoutLegacyKeys.plipInterval;
    const soundEnabled =
        typeof settingsWithoutLegacyKeys.soundEnabled === 'boolean'
            ? settingsWithoutLegacyKeys.soundEnabled
            : muteFillSound !== undefined
                ? !muteFillSound
                : undefined;
    const volume = normalizeVolume(settingsWithoutLegacyKeys.volume ?? soundVolume);

    return Object.fromEntries(
        Object.entries({
            ...settingsWithoutLegacyKeys,
            sessionDuration,
            blockMinutes,
            plipInterval,
            intervalMinutes,
            soundEnabled,
            volume,
        }).filter(([, value]) => value !== undefined)
    ) as SubjectSettings;
}

type SubjectSettingsOverrideInput = Pick<SubjectSettings, 'dailyGoal' | 'weeklyGoal'> & {
    blockMinutes?: number;
    intervalMinutes?: number;
    soundEnabled?: boolean;
    volume?: number;
    strictMode?: boolean;
};

export function buildSubjectSettingsOverrides(
    settings: SubjectSettingsOverrideInput,
    defaults: KromeSettings
): SubjectSettings {
    const overrides: SubjectSettings = {};
    const normalizedVolume = normalizeVolume(settings.volume);
    const normalizedDailyGoal = settings.dailyGoal
        ? normalizeGoalProgress(settings.dailyGoal, defaults.dailyGoalProgress)
        : undefined;
    const normalizedWeeklyGoal = settings.weeklyGoal
        ? normalizeGoalProgress(settings.weeklyGoal, defaults.weeklyGoalProgress)
        : undefined;

    if (settings.blockMinutes !== undefined && settings.blockMinutes !== defaults.blockMinutes) {
        overrides.blockMinutes = settings.blockMinutes;
        overrides.sessionDuration = settings.blockMinutes;
    }
    if (settings.intervalMinutes !== undefined && settings.intervalMinutes !== defaults.intervalMinutes) {
        overrides.intervalMinutes = settings.intervalMinutes;
        overrides.plipInterval = settings.intervalMinutes;
    }
    if (typeof settings.soundEnabled === 'boolean' && settings.soundEnabled !== defaults.soundEnabled) {
        overrides.soundEnabled = settings.soundEnabled;
    }
    if (normalizedVolume !== undefined && Math.abs(normalizedVolume - defaults.volume) > 0.001) {
        overrides.volume = normalizedVolume;
    }
    if (
        normalizedDailyGoal &&
        (
            normalizedDailyGoal.type !== defaults.dailyGoalProgress.type ||
            normalizedDailyGoal.target !== defaults.dailyGoalProgress.target
        )
    ) {
        overrides.dailyGoal = normalizedDailyGoal;
    }
    if (
        normalizedWeeklyGoal &&
        (
            normalizedWeeklyGoal.type !== defaults.weeklyGoalProgress.type ||
            normalizedWeeklyGoal.target !== defaults.weeklyGoalProgress.target
        )
    ) {
        overrides.weeklyGoal = normalizedWeeklyGoal;
    }
    if (typeof settings.strictMode === 'boolean' && settings.strictMode !== defaults.strictMode) {
        overrides.strictMode = settings.strictMode;
    }

    return overrides;
}

function normalizeSubject(subject: Subject, fallbackColor?: string): Subject {
    const normalizedSettings = normalizeSubjectSettings(subject.settings);

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
        const normalizedSettings = normalizeSubjectSettings(subject.settings);
        if (
            !subject.color ||
            subject.createdAt === undefined ||
            subject.settings === undefined ||
            subject.archived === undefined ||
            JSON.stringify(subject.settings ?? {}) !== JSON.stringify(normalizedSettings)
        ) {
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
            settings: normalizeSubjectSettings({
                ...(existingSubject.settings ?? {}),
                ...(subject.settings ?? {}),
            }),
        } : existingSubject)
        : [...subjects, normalizeSubject(subject)];
    setItem(SUBJECTS_KEY, updatedSubjects);
};

export const saveSubjects = (subjects: Subject[]): void => {
    setItem(SUBJECTS_KEY, subjects.map((subject) => normalizeSubject(subject)));
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

    const overrides = normalizeSubjectSettings(subject.settings) as LegacySubjectSettings;
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
