// Simple synth for sounds
let audioCtx: AudioContext | null = null;

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

function scheduleFillTone(ctx: AudioContext, volume: number, startTime: number) {
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(600, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(800, startTime + 0.1);

  gainNode.gain.setValueAtTime(Math.max(volume * 0.1, 0.001), startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

  oscillator.start(startTime);
  oscillator.stop(startTime + 0.15);
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

    scheduleFillTone(ctx, volume, ctx.currentTime);
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

    const firstToneTime = ctx.currentTime;
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

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(440, time);
      oscillator.frequency.linearRampToValueAtTime(660, time + 0.3);

      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(volume * 0.2, time + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, time + 0.8);

      oscillator.start(time);
      oscillator.stop(time + 0.8);
    };

    const now = ctx.currentTime;
    playTone(now);

    for (let i = 1; i <= repeats; i++) {
      playTone(now + i * 1.0); // 1 second gap
    }

  } catch (e) {
    console.error("Audio playback failed", e);
  }
};
