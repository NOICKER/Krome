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

const { createDiagnosticsStore } = await importTypescriptModule("src/app/services/diagnosticsService.ts");

const store = createDiagnosticsStore();
store.setEnabled(true);

store.record({
  type: "contract_violation",
  timestamp: 1000,
  dedupeKey: "plip_scheduler_cancelled_while_running",
  severity: "error",
  title: "Plip scheduler cancelled unexpectedly",
  summary: "Future plips disappeared during an active running session.",
  expected: "Running sessions with sound enabled should retain future scheduled plips.",
  observed: "The scheduler was cancelled before the session paused, completed, or was abandoned.",
  probableCause: "A lifecycle cleanup or resubscribe path cancelled the scheduler too early.",
  evidenceLabel: "Cancel observed while session remained active.",
  evidenceDetail: "sessionId=s-1",
});

store.record({
  type: "contract_violation",
  timestamp: 1250,
  dedupeKey: "plip_scheduler_cancelled_while_running",
  severity: "error",
  title: "Plip scheduler cancelled unexpectedly",
  summary: "Future plips disappeared during an active running session.",
  expected: "Running sessions with sound enabled should retain future scheduled plips.",
  observed: "The scheduler was cancelled before the session paused, completed, or was abandoned.",
  probableCause: "A lifecycle cleanup or resubscribe path cancelled the scheduler too early.",
  evidenceLabel: "Repeat cancellation observed while session remained active.",
  evidenceDetail: "sessionId=s-1",
});

const issues = store.getIssues();
assert.equal(issues.length, 1, "Duplicate contract violations should collapse into a single issue.");
assert.equal(issues[0].severity, "error", "Contract violations should preserve severity.");
assert.equal(issues[0].lastSeenAt, 1250, "Repeated issue sightings should update the last-seen timestamp.");
assert.equal(issues[0].evidence.length, 2, "Repeated issue sightings should append evidence instead of creating duplicate issues.");

store.dismissIssue(issues[0].id);
assert.equal(store.getVisibleIssues().length, 0, "Dismissed issues should disappear from the active diagnostics chip list.");

console.log("diagnostics-service checks passed");
