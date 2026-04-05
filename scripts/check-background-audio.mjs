import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import ts from "typescript";

async function importTypescriptModule(relativePath) {
  const filePath = path.resolve(relativePath);
  const source = await fs.readFile(filePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  });

  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
}

class FakeAudioContext {
  static instances = [];

  constructor() {
    this.state = "suspended";
    this.currentTime = 10;
    this.destination = {};
    this.resumeCalls = 0;
    this.resumeResolver = null;
    this.oscillatorStarts = 0;
    this.bufferStarts = 0;
    this.scheduledStartTimes = [];
    this.stopTimes = [];
    FakeAudioContext.instances.push(this);
  }

  resume() {
    this.resumeCalls += 1;
    return new Promise((resolve) => {
      this.resumeResolver = () => {
        this.state = "running";
        resolve();
      };
    });
  }

  createBuffer() {
    return {};
  }

  createBufferSource() {
    return {
      connect: () => {},
      start: () => {
        if (this.state !== "running") {
          throw new Error("buffer source started before audio context resumed");
        }
        this.bufferStarts += 1;
      },
    };
  }

  createOscillator() {
    const owner = this;
    return {
      type: "sine",
      frequency: {
        setValueAtTime: () => {},
      },
      connect: () => {},
      start: (when = owner.currentTime) => {
        if (owner.state !== "running") {
          throw new Error("oscillator started before audio context resumed");
        }
        owner.oscillatorStarts += 1;
        owner.scheduledStartTimes.push(when);
      },
      stop: (when) => {
        owner.stopTimes.push(when);
      },
    };
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    };
  }
}

globalThis.window = {
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
};

globalThis.document = {
  visibilityState: "hidden",
  addEventListener: () => {},
};

const { playPlip, playEndSound, scheduleSessionPlips } = await importTypescriptModule("src/app/utils/sound.ts");
const realDateNow = Date.now;
let fakeNow = 1000;
Date.now = () => fakeNow;

const plipPromise = Promise.resolve(playPlip(0.5));
const plipContext = FakeAudioContext.instances[0];

assert.ok(plipContext, "playPlip should create an audio context");
assert.equal(plipContext.resumeCalls, 1, "playPlip should attempt to resume a suspended context before sounding");

plipContext.resumeResolver?.();
await plipPromise;

assert.equal(plipContext.oscillatorStarts, 1, "playPlip should sound after the context has resumed");

const endSoundPromise = Promise.resolve(playEndSound(0.5));
plipContext.resumeResolver?.();
await endSoundPromise;

assert.equal(plipContext.oscillatorStarts, 3, "playEndSound should also wait for resume and schedule both tones");

plipContext.state = "running";
const cancelScheduled = scheduleSessionPlips([1, 2], 0.5);
assert.equal(typeof cancelScheduled, "function", "scheduleSessionPlips should return a cancel function");
assert.deepEqual(
  plipContext.scheduledStartTimes.slice(-2).map((value) => Number(value.toFixed(2))),
  [11.1, 12.1],
  "scheduleSessionPlips should pre-schedule future plips against the audio clock with a small lead time."
);

cancelScheduled();
assert.ok(
  plipContext.stopTimes.includes(0),
  "Cancelling scheduled plips should stop any not-yet-played oscillators."
);

plipContext.state = "suspended";
const scheduledStartCountBeforeCancel = plipContext.scheduledStartTimes.length;
const cancelBeforeResume = scheduleSessionPlips([3], 0.5);
cancelBeforeResume();
plipContext.resumeResolver?.();
await Promise.resolve();
assert.equal(
  plipContext.scheduledStartTimes.length,
  scheduledStartCountBeforeCancel,
  "Cancelling before resume resolves should prevent deferred plip scheduling."
);

plipContext.state = "suspended";
const driftTestStartIndex = plipContext.scheduledStartTimes.length;
fakeNow = 5000;
const cancelDelayedSchedule = scheduleSessionPlips([3, 6], 0.5);
fakeNow = 7500;
plipContext.resumeResolver?.();
await Promise.resolve();
assert.deepEqual(
  plipContext.scheduledStartTimes.slice(driftTestStartIndex).map((value) => Number(value.toFixed(2))),
  [10.6, 13.6],
  "Delayed audio-context resume should subtract wall-clock drift so scheduled plips stay aligned with the session clock."
);
cancelDelayedSchedule();

Date.now = realDateNow;

console.log("background audio checks passed");
