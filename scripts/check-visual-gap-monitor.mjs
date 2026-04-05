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

const { createVisualGapMonitor } = await importTypescriptModule("src/app/utils/visualGapMonitor.ts");

const monitor = createVisualGapMonitor(1200);

assert.equal(
  monitor.observeFrame(1000, "visible"),
  null,
  "The first visible frame should seed the monitor without reporting a gap."
);
assert.equal(
  monitor.observeFrame(1600, "visible"),
  null,
  "Normal visible frame cadence should not report a stall."
);

assert.equal(
  monitor.observeFrame(1800, "visible", false),
  null,
  "Losing page focus should reset the visible-frame tracker."
);

assert.equal(
  monitor.observeFrame(25000, "visible"),
  null,
  "Returning to a focused page after an unfocused stretch should reseed the monitor instead of reporting a false stall."
);

monitor.noteVisibilityChange("hidden");
monitor.noteVisibilityChange("visible");

assert.equal(
  monitor.observeFrame(40000, "visible"),
  null,
  "Returning from a hidden tab should reset the visible-frame tracker instead of reporting a giant false stall."
);

const largeGap = monitor.observeFrame(42050, "visible");
assert.deepEqual(
  largeGap,
  {
    gapMs: 2050,
    expectedMaxGapMs: 1200,
    visibilityState: "visible",
  },
  "A real large gap while still visible should still be reported."
);

console.log("visual-gap-monitor checks passed");
