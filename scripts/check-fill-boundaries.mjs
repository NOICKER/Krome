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

const { calculateBricks, getAudibleBoundariesCrossed } = await importTypescriptModule(
  "src/app/core/sessionEngine.ts"
);

const finiteConfig = {
  sessionMinutes: 25,
  plipMinutes: 5,
};

assert.deepEqual(
  getAudibleBoundariesCrossed(4.8 * 60 * 1000, 5.1 * 60 * 1000, finiteConfig),
  [5 * 60 * 1000],
  "Crossing the first boundary should emit exactly one audible plip boundary."
);

assert.deepEqual(
  getAudibleBoundariesCrossed(19.8 * 60 * 1000, 25 * 60 * 1000, finiteConfig),
  [20 * 60 * 1000],
  "Session completion should keep the last real plip boundary, but must not add a fake plip at session end."
);

assert.deepEqual(
  getAudibleBoundariesCrossed(2 * 60 * 1000, 18 * 60 * 1000, finiteConfig),
  [15 * 60 * 1000],
  "Large timer gaps should cap catch-up plips to the most recent boundary."
);

const partialConfig = {
  sessionMinutes: 25,
  plipMinutes: 7,
};

assert.deepEqual(
  getAudibleBoundariesCrossed(20.8 * 60 * 1000, 25 * 60 * 1000, partialConfig),
  [21 * 60 * 1000],
  "A partial last block should still emit only the last real plip boundary."
);

const partialBrickState = calculateBricks(23 * 60 * 1000, partialConfig);
assert.equal(partialBrickState.totalBricks, 4, "Partial sessions should include a final partial brick.");
assert.equal(partialBrickState.filledBricks, 3, "Three bricks should be complete after 23 of 25 minutes.");
assert.equal(
  Number(partialBrickState.partialFill.toFixed(2)),
  0.5,
  "The last partial brick should be halfway filled at 23/25 minutes."
);

console.log("fill-boundary checks passed");
