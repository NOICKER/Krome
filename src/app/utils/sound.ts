let audioCtx: AudioContext | null = null;
let hasVisibilityResumeListener = false;
const SCHEDULE_LEAD_SECONDS = 0.1;
const MAX_ACCEPTABLE_SCHEDULE_DELAY_MS = 250;
let diagnosticsReporter: ((event: Record<string, unknown>) => void) | null = null;

function emitDiagnosticsEvent(event: Record<string, unknown>) {
  diagnosticsReporter?.({
    timestamp: Date.now(),
    ...event,
  });
}

export function setSoundDiagnosticsReporter(reporter: ((event: Record<string, unknown>) => void) | null) {
  diagnosticsReporter = reporter;
}

function ensureVisibilityResumeListener() {
  if (typeof document === "undefined" || hasVisibilityResumeListener) {
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && audioCtx?.state === "suspended") {
      void audioCtx.resume().catch(() => {});
    }
  });
  hasVisibilityResumeListener = true;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    ensureVisibilityResumeListener();
    emitDiagnosticsEvent({
      type: "audio_context_created",
      state: audioCtx.state,
    });
  }

  return audioCtx;
}

function clampVolume(volume: number | undefined, fallback: number = 0.5) {
  if (typeof volume !== "number" || !Number.isFinite(volume)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, volume));
}

async function ensureRunningAudioContext(contextLabel: string) {
  const ctx = getAudioContext();
  if (!ctx) {
    console.log("[audio] No AudioContext available.");
    return null;
  }

  if (ctx.state === "closed") {
    console.warn(`[audio] AudioContext is closed during ${contextLabel}.`);
    return null;
  }

  if (ctx.state !== "running") {
    console.log(`[audio] resume requested during ${contextLabel}:`, ctx.state);
    emitDiagnosticsEvent({
      type: "audio_resume_requested",
      contextLabel,
      state: ctx.state,
    });
    try {
      await ctx.resume();
      emitDiagnosticsEvent({
        type: "audio_resume_succeeded",
        contextLabel,
        state: ctx.state,
      });
    } catch (err) {
      console.error(`[audio] resume failed during ${contextLabel}:`, err);
      emitDiagnosticsEvent({
        type: "audio_resume_failed",
        contextLabel,
        message: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  return ctx.state === "running" ? ctx : null;
}

function scheduleOscillatorAt(ctx: AudioContext, startTime: number, volume: number) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, startTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(clampVolume(volume), startTime + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.12);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + 0.15);

  return oscillator;
}

export async function warmUpAudio() {
  const ctx = await ensureRunningAudioContext("warmUpAudio()");
  if (!ctx) return;

  console.log("[audio] warmUpAudio() initial state:", ctx.state);
  console.log("[audio] state after resume:", ctx.state);

  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

export async function playPlip(volume: number = 0.5) {
  const ctx = await ensureRunningAudioContext("playPlip()");
  if (!ctx) return;

  scheduleOscillatorAt(ctx, ctx.currentTime, volume);
}

export async function playEndSound(volume: number = 0.5) {
  const ctx = await ensureRunningAudioContext("playEndSound()");
  if (!ctx) return;

  ([
    [528, 0],
    [660, 0.18],
  ] as const).forEach(([frequency, delaySeconds]) => {
    const startTime = ctx.currentTime + delaySeconds;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startTime);

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(clampVolume(volume), startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.65);
  });
}

export function scheduleSessionPlips(offsetsSeconds: number[], volume: number = 0.5) {
  if (offsetsSeconds.length === 0) {
    return () => {};
  }

  const ctx = getAudioContext();
  if (!ctx) {
    return () => {};
  }

  let cancelled = false;
  let scheduledOscillators: OscillatorNode[] = [];
  const requestedAtMs = Date.now();
  const normalizedOffsetsSeconds = offsetsSeconds.filter((offset) => Number.isFinite(offset) && offset > 0);

  const scheduleAll = () => {
    if (cancelled) {
      return;
    }

    const scheduleDelayMs = Math.max(0, Date.now() - requestedAtMs);
    const remainingOffsetsSeconds = normalizedOffsetsSeconds
      .map((offset) => offset - scheduleDelayMs / 1000)
      .filter((offset) => offset > 0);
    const skippedCount = normalizedOffsetsSeconds.length - remainingOffsetsSeconds.length;

    if (scheduleDelayMs > MAX_ACCEPTABLE_SCHEDULE_DELAY_MS || skippedCount > 0) {
      emitDiagnosticsEvent({
        type: "contract_violation",
        dedupeKey: "plip_schedule_drift_detected",
        severity: skippedCount > 0 ? "error" : "warning",
        title: "Plip scheduling drift detected",
        summary: "Audio scheduling started later than the session clock expected.",
        expected: "Future plips should be scheduled immediately against the current wall clock.",
        observed: skippedCount > 0
          ? `Scheduling started ${Math.round(scheduleDelayMs)}ms late and ${skippedCount} plip(s) were already in the past.`
          : `Scheduling started ${Math.round(scheduleDelayMs)}ms late.`,
        probableCause: "The audio context took too long to resume before the session plips could be booked onto the audio timeline.",
        evidenceLabel: "Delayed plip scheduling observed.",
        evidenceDetail: `delay=${Math.round(scheduleDelayMs)}ms, skipped=${skippedCount}`,
      });
    }

    const baseTime = ctx.currentTime;
    scheduledOscillators = remainingOffsetsSeconds.map((offset) =>
      scheduleOscillatorAt(ctx, baseTime + Math.max(offset, SCHEDULE_LEAD_SECONDS), volume)
    );
  };

  if (ctx.state === "running") {
    scheduleAll();
  } else {
    void ctx.resume().then(() => {
      if (cancelled) {
        return;
      }
      scheduleAll();
    }).catch(() => {});
  }

  return () => {
    cancelled = true;
    const oscillatorsToStop = scheduledOscillators;
    scheduledOscillators = [];
    oscillatorsToStop.forEach((oscillator) => {
      try {
        oscillator.stop(0);
      } catch {
        // Ignore already-stopped oscillators.
      }
    });
  };
}
