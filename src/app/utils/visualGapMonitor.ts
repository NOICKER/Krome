export interface VisualGapAlert {
  gapMs: number;
  expectedMaxGapMs: number;
  visibilityState: DocumentVisibilityState;
}

export function createVisualGapMonitor(expectedMaxGapMs: number = 1200) {
  let lastVisibleFrameAtMs: number | null = null;

  return {
    noteVisibilityChange(_visibilityState: DocumentVisibilityState) {
      lastVisibleFrameAtMs = null;
    },
    observeFrame(nowMs: number, visibilityState: DocumentVisibilityState): VisualGapAlert | null {
      if (visibilityState !== "visible") {
        lastVisibleFrameAtMs = null;
        return null;
      }

      if (lastVisibleFrameAtMs === null) {
        lastVisibleFrameAtMs = nowMs;
        return null;
      }

      const gapMs = nowMs - lastVisibleFrameAtMs;
      lastVisibleFrameAtMs = nowMs;

      if (gapMs <= expectedMaxGapMs) {
        return null;
      }

      return {
        gapMs,
        expectedMaxGapMs,
        visibilityState,
      };
    },
    reset() {
      lastVisibleFrameAtMs = null;
    },
  };
}
