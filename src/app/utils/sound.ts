// Simple synth for sounds
let audioCtx: AudioContext | null = null;

const getAudioContext = async (): Promise<AudioContext | null> => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  return audioCtx;
};

// Call this on user interaction (e.g. Start button click) to pre-warm the AudioContext
export const warmUpAudio = () => {
  if (typeof window === 'undefined') return;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playFillSound = async (volume: number = 0.5) => {
  try {
    const ctx = await getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Soft "plip" sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(volume * 0.1, ctx.currentTime); // Scale down a bit as raw sine is loud
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.15);
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