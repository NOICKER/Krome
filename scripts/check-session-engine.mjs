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

const {
  createNewSession,
  calculateBricks,
  computeFuturePlipOffsetsSec,
  getTotalBlocks,
  isSessionComplete,
} = await importTypescriptModule(
  "src/app/core/sessionEngine.ts"
);

const session = createNewSession({
  sessionMinutes: 25,
  plipMinutes: 7,
  soundEnabled: true,
  volume: 0.5,
});

assert.equal(
  session.totalBlocks,
  4,
  "Finite sessions should include the final partial block in their visual/timing model."
);

assert.equal(
  getTotalBlocks(25, 7),
  4,
  "Total block count should round up to include a final partial block."
);

const brickState = calculateBricks(23 * 60 * 1000, {
  sessionMinutes: 25,
  plipMinutes: 7,
});

assert.equal(brickState.filledBricks, 3, "Three full plip blocks should be complete after 23 minutes.");
assert.equal(
  Number(brickState.partialFill.toFixed(2)),
  0.5,
  "The final partial block should be halfway full at 23/25 minutes."
);

assert.equal(
  isSessionComplete(24.9 * 60 * 1000, {
    sessionMinutes: 25,
    plipMinutes: 7,
  }),
  false,
  "Sessions should not complete before the configured total duration."
);

assert.equal(
  isSessionComplete(25 * 60 * 1000, {
    sessionMinutes: 25,
    plipMinutes: 7,
  }),
  true,
  "Sessions should complete once the configured total duration is reached."
);

assert.deepEqual(
  computeFuturePlipOffsetsSec(7 * 60 * 1000, {
    sessionMinutes: 25,
    plipMinutes: 5,
  }),
  [180, 480, 780],
  "Future plip offsets should start strictly after the current elapsed time and exclude the session-end boundary."
);

assert.deepEqual(
  computeFuturePlipOffsetsSec(23 * 60 * 1000, {
    sessionMinutes: 25,
    plipMinutes: 7,
  }),
  [],
  "Near the end of a finite session, there may be no remaining plip boundaries before the end chime."
);

assert.deepEqual(
  computeFuturePlipOffsetsSec(0, {
    sessionMinutes: Number.POSITIVE_INFINITY,
    plipMinutes: 5,
  }, 3),
  [300, 600, 900],
  "Infinite sessions should continue yielding future plip offsets until the requested cap is reached."
);

console.log("session-engine checks passed");
