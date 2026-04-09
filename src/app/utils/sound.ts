let audioCtx: AudioContext | null = null;
let hasVisibilityResumeListener = false;
let diagnosticsReporter: ((event: Record<string, unknown>) => void) | null = null;
let audioKeepAliveSource: AudioBufferSourceNode | null = null;
let audioKeepAliveGainNode: GainNode | null = null;
let audioKeepAliveConsumerCount = 0;
let audioKeepAliveSetupPromise: Promise<void> | null = null;

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

function stopAudioKeepAliveNode() {
  const source = audioKeepAliveSource;
  const gainNode = audioKeepAliveGainNode;

  audioKeepAliveSource = null;
  audioKeepAliveGainNode = null;

  if (source) {
    try {
      source.stop();
    } catch {
      // Ignore already-stopped keep-alive nodes.
    }

    try {
      source.disconnect();
    } catch {
      // Ignore disconnected keep-alive nodes.
    }
  }

  if (gainNode) {
    try {
      gainNode.disconnect();
    } catch {
      // Ignore disconnected keep-alive gain nodes.
    }
  }
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

export function startAudioKeepAlive() {
  audioKeepAliveConsumerCount += 1;

  if (!audioKeepAliveSource && !audioKeepAliveSetupPromise) {
    audioKeepAliveSetupPromise = ensureRunningAudioContext("startAudioKeepAlive()")
      .then((ctx) => {
        if (!ctx || audioKeepAliveConsumerCount === 0 || audioKeepAliveSource) {
          return;
        }

        const silentBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();

        source.buffer = silentBuffer;
        source.loop = true;
        gainNode.gain.value = 0;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start();

        audioKeepAliveSource = source;
        audioKeepAliveGainNode = gainNode;
      })
      .catch(() => {})
      .finally(() => {
        audioKeepAliveSetupPromise = null;
      });
  }

  let cleanedUp = false;

  return () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;
    audioKeepAliveConsumerCount = Math.max(0, audioKeepAliveConsumerCount - 1);

    if (audioKeepAliveConsumerCount === 0) {
      stopAudioKeepAliveNode();
    }
  };
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
