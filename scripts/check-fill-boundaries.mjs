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

const { getNewlyCompletedFillCount } = await importTypescriptModule("src/app/core/sessionEngine.ts");

assert.equal(
  getNewlyCompletedFillCount(4.8 * 60 * 1000, 5.1 * 60 * 1000, 5, 5, 25),
  1,
  "Crossing the first 5-minute plip boundary should emit exactly one fill sound."
);

assert.equal(
  getNewlyCompletedFillCount(19.8 * 60 * 1000, 25 * 60 * 1000, 5, 5, 25),
  1,
  "The final completion tone should not double-count as another plip."
);

assert.equal(
  getNewlyCompletedFillCount(20.8 * 60 * 1000, 25 * 60 * 1000, 7, 4, 25),
  1,
  "A partial last block should still emit only the final real plip boundary."
);

assert.equal(
  getNewlyCompletedFillCount(7.2 * 60 * 1000, 7.3 * 60 * 1000, 7, 4, 25),
  0,
  "No extra plips should fire after the boundary has already been crossed."
);

console.log("fill-boundary checks passed");
