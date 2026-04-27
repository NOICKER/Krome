import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, test } from "node:test";
import { startAudioKeepAlive } from "../src/app/utils/sound";

class FakeAudioBuffer {
  readonly channelData: Float32Array[];

  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number
  ) {
    this.channelData = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number) {
    return this.channelData[channel];
  }
}

class FakeGainNode {
  gain = { value: 1 };
  connectedTo: unknown[] = [];
  disconnected = false;

  connect(target: unknown) {
    this.connectedTo.push(target);
    return target;
  }

  disconnect() {
    this.disconnected = true;
  }
}

class FakeBufferSourceNode {
  buffer: FakeAudioBuffer | null = null;
  loop = false;
  started = 0;
  stopped = 0;
  connectedTo: unknown[] = [];
  disconnected = false;

  connect(target: unknown) {
    this.connectedTo.push(target);
    return target;
  }

  start() {
    this.started += 1;
  }

  stop() {
    this.stopped += 1;
  }

  disconnect() {
    this.disconnected = true;
  }
}

class FakeAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  sampleRate = 48_000;
  destination = { id: "destination" };
  readonly createdBuffers: FakeAudioBuffer[] = [];
  readonly createdSources: FakeBufferSourceNode[] = [];
  readonly createdGains: FakeGainNode[] = [];

  createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
    const buffer = new FakeAudioBuffer(numberOfChannels, length, sampleRate);
    this.createdBuffers.push(buffer);
    return buffer as unknown as AudioBuffer;
  }

  createBufferSource() {
    const source = new FakeBufferSourceNode();
    this.createdSources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }

  createGain() {
    const gainNode = new FakeGainNode();
    this.createdGains.push(gainNode);
    return gainNode as unknown as GainNode;
  }

  async resume() {
    this.state = "running";
  }
}

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

function installFakeBrowser(fakeAudioContext: FakeAudioContext) {
  const documentStub = {
    visibilityState: "visible",
    addEventListener() {},
    removeEventListener() {},
    hasFocus() {
      return true;
    },
  };

  const windowStub = {
    AudioContext: class {
      constructor() {
        return fakeAudioContext;
      }
    },
    setInterval,
    clearInterval,
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
  };

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: documentStub,
  });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowStub,
  });
}

async function flushMicrotasks() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

afterEach(() => {
  if (originalDocument === undefined) {
    Reflect.deleteProperty(globalThis, "document");
  } else {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
  }

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window");
  } else {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: originalWindow,
    });
  }
});

test("startAudioKeepAlive creates one looping silent source and tears it down once", async () => {
  const fakeAudioContext = new FakeAudioContext();
  installFakeBrowser(fakeAudioContext);

  const firstCleanup = await startAudioKeepAlive();
  const secondCleanup = await startAudioKeepAlive();

  await flushMicrotasks();

  assert.equal(fakeAudioContext.createdBuffers.length, 1);
  assert.equal(fakeAudioContext.createdSources.length, 1);
  assert.equal(fakeAudioContext.createdGains.length, 1);

  const [buffer] = fakeAudioContext.createdBuffers;
  const [source] = fakeAudioContext.createdSources;
  const [gainNode] = fakeAudioContext.createdGains;

  assert.equal(buffer.length, fakeAudioContext.sampleRate);
  assert.ok(buffer.getChannelData(0).every((sample) => sample === 0));
  assert.equal(source.loop, true);
  assert.equal(source.started, 1);
  assert.equal(gainNode.gain.value, 0);

  firstCleanup();
  assert.equal(source.stopped, 0);

  secondCleanup();
  assert.equal(source.stopped, 1);
  assert.equal(source.disconnected, true);
  assert.equal(gainNode.disconnected, true);
});

test("useKrome audio effect uses the watchdog flow instead of future scheduling", async () => {
  const source = await readFile(path.join(process.cwd(), "src", "app", "hooks", "useKrome.tsx"), "utf8");

  assert.match(source, /startAudioKeepAlive/);
  assert.match(source, /getAudibleBoundariesCrossed/);
  assert.doesNotMatch(source, /scheduleSessionPlips/);
  assert.match(source, /setInterval\(/);
  assert.match(source, /Math\.max\(0,\s*Date\.now\(\)\s*-\s*session\.startTime\)/);
  assert.match(source, /getAudibleBoundariesCrossed\(lastAudioElapsed,\s*newElapsed,\s*session\)/);
  assert.match(source, /playPlip\(session\.volume \?\? 0\.5\)/);

  const visualLoopSection = source.match(/const loop = \(\) => \{[\s\S]*?visualLoopRef\.current = window\.requestAnimationFrame\(loop\);\s*\};/);
  assert.ok(visualLoopSection, "expected to find the requestAnimationFrame visual loop");
  assert.doesNotMatch(visualLoopSection[0], /getAudibleBoundariesCrossed|playPlip/);
});
