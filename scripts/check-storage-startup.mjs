import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const workspaceRoot = process.cwd();
const compiledRoot = path.join(workspaceRoot, ".codex-tmp", "storage-startup-check");
const compiledPackageJson = path.join(compiledRoot, "package.json");
const sourceFiles = [
  "src/app/services/storageService.ts",
  "src/app/services/syncEvents.ts",
  "src/app/db/db.ts",
  "src/app/db/repositories/focusSessionRepo.ts",
  "src/app/db/repositories/keyValueRepo.ts",
  "src/app/db/repositories/milestoneRepo.ts",
  "src/app/db/repositories/observationRepo.ts",
  "src/app/db/repositories/shared.ts",
  "src/app/db/repositories/subjectRepo.ts",
  "src/app/db/repositories/taskRepo.ts",
  "src/app/utils/migrationUtils.ts",
  "src/app/utils/timeUtils.ts",
  "src/app/types.ts",
];

fs.rmSync(compiledRoot, { recursive: true, force: true });
fs.mkdirSync(compiledRoot, { recursive: true });
fs.writeFileSync(compiledPackageJson, JSON.stringify({ type: "commonjs" }));

for (const relativeSourcePath of sourceFiles) {
  const absoluteSourcePath = path.join(workspaceRoot, relativeSourcePath);
  const source = fs.readFileSync(absoluteSourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });

  const relativeOutputPath = relativeSourcePath
    .replace(/^src\/app\//, "")
    .replace(/\.ts$/, ".js");
  const absoluteOutputPath = path.join(compiledRoot, relativeOutputPath);

  fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });
  fs.writeFileSync(absoluteOutputPath, transpiled.outputText);
  if (transpiled.sourceMapText) {
    fs.writeFileSync(`${absoluteOutputPath}.map`, transpiled.sourceMapText);
  }
}

const localStore = new Map();
globalThis.window = globalThis;
globalThis.localStorage = {
  getItem(key) {
    return localStore.has(key) ? localStore.get(key) : null;
  },
  setItem(key, value) {
    localStore.set(key, String(value));
  },
  removeItem(key) {
    localStore.delete(key);
  },
};
globalThis.BroadcastChannel = class {
  postMessage() {}
  close() {}
};
globalThis.__KROME_STORAGE_OPEN_TIMEOUT_MS__ = 25;

const require = createRequire(import.meta.url);
const { db } = require(path.join(compiledRoot, "db", "db.js"));
db.open = () => new Promise(() => {});

const { initializeStorage } = require(path.join(compiledRoot, "services", "storageService.js"));

const result = await Promise.race([
  initializeStorage(),
  new Promise((resolve) => setTimeout(() => resolve("timed_out"), 250)),
]);

assert.notEqual(
  result,
  "timed_out",
  "initializeStorage should not hang forever when IndexedDB open stalls."
);

console.log("storage-startup checks passed");
