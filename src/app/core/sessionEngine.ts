import { KromeSession, KromeSettings } from '../types';

export function getTotalBlocks(totalDurationMinutes: number, intervalMinutes: number) {
    if (!Number.isFinite(totalDurationMinutes)) {
        return Number.POSITIVE_INFINITY;
    }

    if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
        return 1;
    }

    return Math.max(1, Math.ceil(totalDurationMinutes / intervalMinutes));
}

function getFiniteBlockDurationsMs(totalDurationMinutes: number, intervalMinutes: number) {
    if (!Number.isFinite(totalDurationMinutes) || !Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
        return [] as number[];
    }

    const totalDurationMs = Math.max(0, totalDurationMinutes * 60 * 1000);
    const intervalMs = intervalMinutes * 60 * 1000;
    const totalBlocks = getTotalBlocks(totalDurationMinutes, intervalMinutes);

    if (!Number.isFinite(totalBlocks) || totalBlocks <= 0) {
        return [] as number[];
    }

    return Array.from({ length: totalBlocks }, (_, index) =>
        Math.max(0, Math.min(intervalMs, totalDurationMs - index * intervalMs))
    );
}

export function createNewSession(settings: KromeSettings): KromeSession {
    return {
        isActive: true,
        startTime: Date.now(),
        status: 'running',
        totalDurationMinutes: settings.blockMinutes,
        intervalMinutes: settings.intervalMinutes,
        soundEnabled: settings.soundEnabled,
        volume: settings.volume,
        totalBlocks: getTotalBlocks(settings.blockMinutes, settings.intervalMinutes),
        type: 'standard', // default
        subject: '',
        intent: '',
        abandonReason: undefined,
        abandonNote: undefined,
        subjectId: undefined,
        taskId: undefined,
        potResult: null,
    };
}

export function evaluateBlockCompletion(
    session: KromeSession,
    elapsedMs: number,
    nowMs: number = Date.now()
): boolean {
    if (!session.isActive || session.startTime === null) return false;

    const totalDurationMs = session.totalDurationMinutes * 60 * 1000;

    if (session.claimedEndTime) {
        return nowMs >= session.claimedEndTime;
    } else {
        return elapsedMs >= totalDurationMs;
    }
}

export function calculateBricks(
    elapsedMs: number,
    intervalMinutes: number,
    totalBlocks: number,
    totalDurationMinutes?: number
): { filledBricks: number; currentBrickProgress: number } {
    // Guard against divide by zero or invalid data
    if (intervalMinutes <= 0 || totalBlocks <= 0) {
        return { filledBricks: 0, currentBrickProgress: 0 };
    }

    const boundedElapsedMs = Math.max(0, elapsedMs);
    const intervalMs = intervalMinutes * 60 * 1000;

    if (Number.isFinite(totalDurationMinutes)) {
        const blockDurationsMs = getFiniteBlockDurationsMs(totalDurationMinutes, intervalMinutes);

        if (blockDurationsMs.length === 0) {
            return { filledBricks: 0, currentBrickProgress: 0 };
        }

        let remainingElapsedMs = boundedElapsedMs;
        let filledBricks = 0;

        while (
            filledBricks < blockDurationsMs.length &&
            remainingElapsedMs >= blockDurationsMs[filledBricks]
        ) {
            remainingElapsedMs -= blockDurationsMs[filledBricks];
            filledBricks += 1;
        }

        if (filledBricks >= blockDurationsMs.length) {
            return { filledBricks: blockDurationsMs.length, currentBrickProgress: 1 };
        }

        const currentBlockDurationMs = blockDurationsMs[filledBricks] || intervalMs;
        return {
            filledBricks,
            currentBrickProgress: Math.min(remainingElapsedMs / currentBlockDurationMs, 1),
        };
    }

    // Entire blocks that are 100% past their time
    let filledBricks = Math.floor(boundedElapsedMs / intervalMs);
    if (filledBricks >= totalBlocks) filledBricks = totalBlocks;

    // The partial progress of the CURRENT brick
    let currentBrickProgress = 0;
    if (filledBricks < totalBlocks) {
        // how many ms into the current block are we?
        const remainder = boundedElapsedMs % intervalMs;
        currentBrickProgress = remainder / intervalMs;
    } else {
        currentBrickProgress = 1; // maxed out
    }

    return { filledBricks, currentBrickProgress };
}

export function getNewlyCompletedFillCount(
    previousElapsedMs: number,
    nextElapsedMs: number,
    intervalMinutes: number,
    totalBlocks: number,
    totalDurationMinutes?: number
) {
    if (intervalMinutes <= 0 || totalBlocks <= 0 || nextElapsedMs <= previousElapsedMs) {
        return 0;
    }

    const previousFilledBricks = calculateBricks(
        previousElapsedMs,
        intervalMinutes,
        totalBlocks,
        totalDurationMinutes
    ).filledBricks;
    const nextFilledBricks = calculateBricks(
        nextElapsedMs,
        intervalMinutes,
        totalBlocks,
        totalDurationMinutes
    ).filledBricks;
    const maxAudibleFill = Number.isFinite(totalDurationMinutes)
        ? Math.max(totalBlocks - 1, 0)
        : totalBlocks;

    return Math.max(
        0,
        Math.min(nextFilledBricks, maxAudibleFill) - Math.min(previousFilledBricks, maxAudibleFill)
    );
}
