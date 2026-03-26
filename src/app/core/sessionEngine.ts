import { KromeSession, KromeSettings } from '../types';

export function createNewSession(settings: KromeSettings): KromeSession {
    return {
        isActive: true,
        startTime: Date.now(),
        status: 'running',
        totalDurationMinutes: settings.blockMinutes,
        intervalMinutes: settings.intervalMinutes,
        soundEnabled: settings.soundEnabled,
        volume: settings.volume,
        totalBlocks: Math.max(1, Math.floor(settings.blockMinutes / settings.intervalMinutes)),
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
    totalBlocks: number
): { filledBricks: number; currentBrickProgress: number } {
    // Guard against divide by zero or invalid data
    if (intervalMinutes <= 0 || totalBlocks <= 0) {
        return { filledBricks: 0, currentBrickProgress: 0 };
    }

    const intervalMs = intervalMinutes * 60 * 1000;

    // Entire blocks that are 100% past their time
    let filledBricks = Math.floor(elapsedMs / intervalMs);
    if (filledBricks >= totalBlocks) filledBricks = totalBlocks;

    // The partial progress of the CURRENT brick
    let currentBrickProgress = 0;
    if (filledBricks < totalBlocks) {
        // how many ms into the current block are we?
        const remainder = elapsedMs % intervalMs;
        currentBrickProgress = remainder / intervalMs;
    } else {
        currentBrickProgress = 1; // maxed out
    }

    return { filledBricks, currentBrickProgress };
}
