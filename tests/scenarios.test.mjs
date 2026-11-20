import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
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
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
