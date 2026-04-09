import { execFileSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const outDir = path.join(process.cwd(), ".tmp-tests");
const outfile = path.join(outDir, "audio-regression.test.cjs");

await rm(outDir, { force: true, recursive: true });
await mkdir(outDir, { recursive: true });

await build({
  entryPoints: [path.join(process.cwd(), "tests", "audio-regression.test.ts")],
  outfile,
  bundle: true,
  format: "cjs",
  platform: "node",
  sourcemap: "inline",
  target: ["node22"],
});

execFileSync(process.execPath, ["--test", outfile], { stdio: "inherit" });
