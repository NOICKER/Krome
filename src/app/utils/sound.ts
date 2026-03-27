// Simple synth for sounds
let audioCtx: AudioContext | null = null;
const MIN_GAIN = 0.0001;
const SCHEDULE_LOOKAHEAD_SECONDS = 0.03;
const FILL_SOUND_DURATION_SECONDS = 0.18;
let fillSoundBuffer: AudioBuffer | null = null;
let scheduledFillSources: AudioBufferSourceNode[] = [];
let hasVisibilityResumeListener = false;

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

const createAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  ensureVisibilityResumeListener();
  return ctx;
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
  return 0.12 + Math.pow(normalized, 1.05) * 0.5;
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

function getFillSoundBuffer(ctx: AudioContext) {
  if (fillSoundBuffer && fillSoundBuffer.sampleRate === ctx.sampleRate) {
    return fillSoundBuffer;
  }

  const frameCount = Math.max(1, Math.floor(ctx.sampleRate * FILL_SOUND_DURATION_SECONDS));
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const channelData = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    const time = index / ctx.sampleRate;
    const progress = time / FILL_SOUND_DURATION_SECONDS;
    const attack = Math.min(1, time / 0.01);
    const decay = Math.exp(-7 * progress);
    const envelope = attack * decay;
    const baseFrequency = 720 + 280 * progress;
    const shimmerFrequency = baseFrequency * 2;

    const tone =
      Math.sin(2 * Math.PI * baseFrequency * time) * 0.8 +
      Math.sin(2 * Math.PI * shimmerFrequency * time) * 0.25;

    channelData[index] = tone * envelope;
  }

  fillSoundBuffer = buffer;
  return buffer;
}

function scheduleFillTone(ctx: AudioContext, volume: number, startTime: number) {
  const source = ctx.createBufferSource();
  const gainNode = ctx.createGain();

  source.buffer = getFillSoundBuffer(ctx);
  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  gainNode.gain.setValueAtTime(toFillGain(volume), startTime);

  source.start(startTime);
  source.stop(startTime + FILL_SOUND_DURATION_SECONDS);
  source.onended = () => {
    scheduledFillSources = scheduledFillSources.filter((entry) => entry !== source);
  };
  scheduledFillSources.push(source);
}

export function cancelScheduledFillSounds() {
  scheduledFillSources.forEach((source) => {
    try {
      source.stop();
    } catch {
      // Source may already be stopped; that's fine.
    }
    source.disconnect();
  });
  scheduledFillSources = [];
}

export const scheduleFillSoundsForSession = async ({
  startTimeMs,
  intervalMinutes,
  totalBlocks,
  volume = 0.5,
}: {
  startTimeMs: number;
  intervalMinutes: number;
  totalBlocks: number;
  volume?: number;
}) => {
  try {
    const ctx = await getAudioContext();
    if (!ctx) return;

    cancelScheduledFillSounds();

    const intervalMs = intervalMinutes * 60 * 1000;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      return;
    }

    const maxAudibleFill = Number.isFinite(totalBlocks)
      ? Math.max(totalBlocks - 1, 0)
      : 0;
    const nowMs = Date.now();

    for (let fillIndex = 1; fillIndex <= maxAudibleFill; fillIndex += 1) {
      const targetWallTimeMs = startTimeMs + fillIndex * intervalMs;
      if (targetWallTimeMs <= nowMs) {
        continue;
      }

      const startTime = ctx.currentTime + ((targetWallTimeMs - nowMs) / 1000) + SCHEDULE_LOOKAHEAD_SECONDS;
      scheduleFillTone(ctx, volume, startTime);
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
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
