// Simple synth for sounds
let audioCtx: AudioContext | null = null;
const MIN_GAIN = 0.0001;
const SCHEDULE_LOOKAHEAD_SECONDS = 0.01;

const createAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  return new (window.AudioContext || (window as any).webkitAudioContext)();
};

const getAudioContext = async (): Promise<AudioContext | null> => {
  if (typeof window === "undefined") return null;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = createAudioContext();
  }
  if (!audioCtx) return null;
  if (audioCtx.state !== "running") {
    await audioCtx.resume();
  }
  return audioCtx;
};

function clampVolume(volume: number | undefined, fallback: number = 0.5) {
  if (typeof volume !== "number" || !Number.isFinite(volume)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, volume));
}

function toFillGain(volume: number) {
  const normalized = clampVolume(volume);
  return 0.02 + Math.pow(normalized, 1.15) * 0.18;
}

function toEndGain(volume: number) {
  const normalized = clampVolume(volume);
  return 0.03 + Math.pow(normalized, 1.1) * 0.22;
}

function applyEnvelope(gain: AudioParam, startTime: number, peakGain: number, attackSeconds: number, releaseSeconds: number) {
  gain.cancelScheduledValues(startTime);
  gain.setValueAtTime(MIN_GAIN, startTime);
  gain.linearRampToValueAtTime(peakGain, startTime + attackSeconds);
  gain.exponentialRampToValueAtTime(MIN_GAIN, startTime + attackSeconds + releaseSeconds);
}

function scheduleFillTone(ctx: AudioContext, volume: number, startTime: number) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(600, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(840, startTime + 0.12);

  applyEnvelope(gainNode.gain, startTime, toFillGain(volume), 0.015, 0.16);

  oscillator.start(startTime);
  oscillator.stop(startTime + 0.2);
}

// Call this on user interaction (e.g. Start button click) to pre-warm the AudioContext
export const warmUpAudio = () => {
  if (typeof window === "undefined") return;
  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = createAudioContext();
  }
  if (audioCtx && audioCtx.state !== "running") {
    void audioCtx.resume().catch(() => {});
  }
};

export const playFillSound = async (volume: number = 0.5) => {
  try {
    const ctx = await getAudioContext();
    if (!ctx) return;

    scheduleFillTone(ctx, volume, ctx.currentTime + SCHEDULE_LOOKAHEAD_SECONDS);
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

export const playFillSounds = async (count: number, volume: number = 0.5, gapMs: number = 180) => {
  try {
    const totalCount = Math.max(0, Math.floor(count));
    if (totalCount === 0) return;

    const ctx = await getAudioContext();
    if (!ctx) return;

    const firstToneTime = ctx.currentTime + SCHEDULE_LOOKAHEAD_SECONDS;
    for (let index = 0; index < totalCount; index += 1) {
      scheduleFillTone(ctx, volume, firstToneTime + (index * gapMs) / 1000);
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

export const playEndSound = async (volume: number = 0.5, durationMs: number = 1000, repeats: number = 0) => {
  try {
    const ctx = await getAudioContext();
    if (!ctx) return;

    const playTone = (time: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const toneDurationSeconds = Math.max(durationMs / 1000, 0.5);
      const attackSeconds = Math.min(0.08, toneDurationSeconds * 0.18);
      const releaseSeconds = Math.max(toneDurationSeconds - attackSeconds, 0.24);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(440, time);
      oscillator.frequency.linearRampToValueAtTime(660, time + Math.min(0.3, toneDurationSeconds * 0.35));

      applyEnvelope(gainNode.gain, time, toEndGain(volume), attackSeconds, releaseSeconds);

      oscillator.start(time);
      oscillator.stop(time + toneDurationSeconds + 0.02);
    };

    const now = ctx.currentTime + SCHEDULE_LOOKAHEAD_SECONDS;
    playTone(now);

    for (let i = 1; i <= repeats; i++) {
      playTone(now + i * 1.0); // 1 second gap
    }

  } catch (e) {
    console.error("Audio playback failed", e);
  }
};
