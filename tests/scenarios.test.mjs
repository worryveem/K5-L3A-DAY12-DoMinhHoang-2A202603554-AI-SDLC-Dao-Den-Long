import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
test("10 published headless scenarios meet expected outcomes and byte determinism", () => {
  const dir = mkdtempSync(join(tmpdir(), "lantern-scenarios-"));
  try {
    const run = spawnSync(
      process.execPath,
      ["scripts/replay-scenarios.mjs", dir],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.equal(run.stdout.split("PASS ").length - 1, 10);
    const hashes = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
    const baseline = JSON.parse(
      readFileSync("docs/proof/phase-3/legacy-scenarios/summary.json", "utf8"),
    );
    assert.deepEqual(
      hashes.map((x) => [x.scenario, x.sha256]),
      baseline.map((x) => [x.scenario, x.sha256]),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("8 Phase3 headless scenarios preserve fuel/drain/dawn outcomes and byte determinism", () => {
  const dir = mkdtempSync(join(tmpdir(), "lantern-phase3-"));
  try {
    const run = spawnSync(
      process.execPath,
      [
        "scripts/replay-scenarios.mjs",
        dir,
        "tests/scenarios/phase-3/manifest.json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.equal(run.stdout.split("PASS ").length - 1, 8);
    const hashes = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
    const baseline = JSON.parse(
      readFileSync("docs/proof/phase-3/scenarios/summary.json", "utf8"),
    );
    assert.deepEqual(
      hashes.map((x) => [x.scenario, x.sha256]),
      baseline.map((x) => [x.scenario, x.sha256]),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
