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
  UNIVERSAL_BRICK_ACCENT,
  buildBrickDisplayTheme,
  withAlpha,
} = await importTypescriptModule("src/app/components/brickDisplayTheme.ts");

assert.equal(
  UNIVERSAL_BRICK_ACCENT,
  "#62699D",
  "Universal focus should use the brand accent so active bricks stay visible."
);

const universalTheme = buildBrickDisplayTheme();
assert.equal(
  universalTheme.accent,
  UNIVERSAL_BRICK_ACCENT,
  "Universal brick theming should resolve to the brand accent."
);
assert.match(
  universalTheme.currentShellBackground,
  /linear-gradient/i,
  "Active bricks should render an explicit shell background, not a barely visible flat tint."
);
assert.equal(
  withAlpha("#64748b", "42"),
  "#64748b42",
  "Hex accents should preserve alpha-expanded fill styles."
);
assert.equal(
  withAlpha("#abc", "80"),
  "#aabbcc80",
  "Shorthand hex colors should be normalized before alpha is appended."
);

console.log("brick display theme checks passed");
