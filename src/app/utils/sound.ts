let audioCtx: AudioContext | null = null;
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

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    ensureVisibilityResumeListener();
  }

  return audioCtx;
}

function clampVolume(volume: number | undefined, fallback: number = 0.5) {
  if (typeof volume !== "number" || !Number.isFinite(volume)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, volume));
}

function primeContext(ctx: AudioContext) {
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

export function warmUpAudio() {
  const ctx = getAudioContext();
  if (!ctx) return;

  primeContext(ctx);

  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

export function playPlip(volume: number = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  primeContext(ctx);

  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(clampVolume(volume), now + 0.005);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.15);
}

export function playEndSound(volume: number = 0.5) {
  const ctx = getAudioContext();
  if (!ctx) return;

  primeContext(ctx);

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
