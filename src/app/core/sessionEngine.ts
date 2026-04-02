import { KromeSession, KromeSettings } from '../types';

const MAX_CATCH_UP_PLIPS = 1;

export interface SessionClockConfig {
    sessionMinutes: number;
    plipMinutes: number;
}

export interface BrickState {
    totalBricks: number;
    filledBricks: number;
    partialFill: number;
}

export function getTotalBlocks(sessionMinutes: number, plipMinutes: number) {
    if (!Number.isFinite(sessionMinutes)) {
        return Number.POSITIVE_INFINITY;
    }

    if (!Number.isFinite(plipMinutes) || plipMinutes <= 0) {
        return 1;
    }

    return Math.max(1, Math.ceil(sessionMinutes / plipMinutes));
}

function getFiniteBlockDurationsMs(config: SessionClockConfig) {
    if (!Number.isFinite(config.sessionMinutes) || !Number.isFinite(config.plipMinutes) || config.plipMinutes <= 0) {
        return [] as number[];
    }

    const totalDurationMs = Math.max(0, config.sessionMinutes * 60 * 1000);
    const intervalMs = config.plipMinutes * 60 * 1000;
    const totalBlocks = getTotalBlocks(config.sessionMinutes, config.plipMinutes);

    if (!Number.isFinite(totalBlocks) || totalBlocks <= 0) {
        return [] as number[];
    }

    return Array.from({ length: totalBlocks }, (_, index) =>
        Math.max(0, Math.min(intervalMs, totalDurationMs - index * intervalMs))
    );
}

function getFiniteSessionDurationMs(config: SessionClockConfig) {
    if (!Number.isFinite(config.sessionMinutes)) {
        return Number.POSITIVE_INFINITY;
    }

    return Math.max(0, config.sessionMinutes * 60 * 1000);
}

export function createNewSession(settings: KromeSettings): KromeSession {
    return {
        isActive: true,
        startTime: Date.now(),
        status: 'running',
        sessionMinutes: settings.sessionMinutes,
        plipMinutes: settings.plipMinutes,
        soundEnabled: settings.soundEnabled,
        volume: settings.volume,
        totalBlocks: getTotalBlocks(settings.sessionMinutes, settings.plipMinutes),
        type: 'standard',
        subject: '',
        intent: '',
        abandonReason: undefined,
        abandonNote: undefined,
        subjectId: undefined,
        taskId: undefined,
        potResult: null,
    };
}

export function calculateBricks(elapsedMs: number, config: SessionClockConfig): BrickState {
    const totalBricks = getTotalBlocks(config.sessionMinutes, config.plipMinutes);
    if (!Number.isFinite(totalBricks) || totalBricks <= 0 || config.plipMinutes <= 0) {
        return {
            totalBricks,
            filledBricks: 0,
            partialFill: 0,
        };
    }

    const boundedElapsedMs = Math.max(0, elapsedMs);
    const blockDurationsMs = getFiniteBlockDurationsMs(config);
    if (blockDurationsMs.length === 0) {
        return {
            totalBricks,
            filledBricks: 0,
            partialFill: 0,
        };
    }

    let remainingElapsedMs = Math.min(boundedElapsedMs, getFiniteSessionDurationMs(config));
    let filledBricks = 0;

    while (
        filledBricks < blockDurationsMs.length &&
        remainingElapsedMs >= blockDurationsMs[filledBricks]
    ) {
        remainingElapsedMs -= blockDurationsMs[filledBricks];
        filledBricks += 1;
    }

    if (filledBricks >= blockDurationsMs.length) {
        return {
            totalBricks,
            filledBricks: blockDurationsMs.length,
            partialFill: 0,
        };
    }

    const currentBlockDurationMs = blockDurationsMs[filledBricks] || (config.plipMinutes * 60 * 1000);
    return {
        totalBricks,
        filledBricks,
        partialFill: currentBlockDurationMs > 0
            ? Math.min(remainingElapsedMs / currentBlockDurationMs, 1)
            : 0,
    };
}

export function getAudibleBoundariesCrossed(
    previousElapsedMs: number,
    nextElapsedMs: number,
    config: SessionClockConfig
) {
    if (config.plipMinutes <= 0 || nextElapsedMs <= previousElapsedMs) {
        return [] as number[];
    }

    const plipMs = config.plipMinutes * 60 * 1000;
    const totalDurationMs = getFiniteSessionDurationMs(config);
    const boundaries: number[] = [];

    if (Number.isFinite(totalDurationMs)) {
        for (let boundaryMs = plipMs; boundaryMs < totalDurationMs; boundaryMs += plipMs) {
            if (boundaryMs > previousElapsedMs && boundaryMs <= nextElapsedMs) {
                boundaries.push(boundaryMs);
            }
        }
    } else {
        const firstBoundaryIndex = Math.max(1, Math.floor(previousElapsedMs / plipMs) + 1);
        const lastBoundaryIndex = Math.floor(nextElapsedMs / plipMs);

        for (let boundaryIndex = firstBoundaryIndex; boundaryIndex <= lastBoundaryIndex; boundaryIndex += 1) {
            boundaries.push(boundaryIndex * plipMs);
        }
    }

    if (boundaries.length > MAX_CATCH_UP_PLIPS) {
        return [boundaries[boundaries.length - 1]];
    }

    return boundaries;
}

export function getNewlyCompletedFillCount(
    previousElapsedMs: number,
    nextElapsedMs: number,
    plipMinutes: number,
    _totalBlocks: number,
    sessionMinutes?: number
) {
    return getAudibleBoundariesCrossed(previousElapsedMs, nextElapsedMs, {
        sessionMinutes: sessionMinutes ?? Number.POSITIVE_INFINITY,
        plipMinutes,
    }).length;
}

export function isSessionComplete(elapsedMs: number, config: SessionClockConfig) {
    const totalDurationMs = getFiniteSessionDurationMs(config);
    if (!Number.isFinite(totalDurationMs)) {
        return false;
    }

    return elapsedMs >= totalDurationMs;
}

export function evaluateBlockCompletion(
    session: KromeSession,
    elapsedMs: number,
    nowMs: number = Date.now()
) {
    if (!session.isActive || session.startTime === null) return false;

    if (session.claimedEndTime) {
        return nowMs >= session.claimedEndTime;
    }

    return isSessionComplete(elapsedMs, session);
}
