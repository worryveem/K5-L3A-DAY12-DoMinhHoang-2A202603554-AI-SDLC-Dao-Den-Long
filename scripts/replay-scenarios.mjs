import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const manifest = JSON.parse(
  await readFile("tests/scenarios/manifest.json", "utf8"),
);
const outDir = process.argv[2] ?? ".work/scenarios";
await mkdir(outDir, { recursive: true });
const subset = (actual, expected) => {
  for (const [key, value] of Object.entries(expected)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value))
      subset(actual[key], value);
    else assert.deepEqual(actual[key], value);
  }
};
const results = [];
for (const c of manifest) {
  const out = `${outDir}/${c.name}.jsonl`,
    again = `${outDir}/${c.name}.repeat.jsonl`;
  const args = [
    "src/headless.mjs",
    "--seed",
    "42",
    "--night",
    String(c.night),
    "--ticks",
    String(c.ticks),
    "--scenario",
    `tests/scenarios/${c.name}.scenario.json`,
    "--inputs",
    `tests/scenarios/${c.name}.inputs.json`,
    "--snapshot-every",
    "1",
  ];
  for (const file of [out, again]) {
    const r = spawnSync(process.execPath, [...args, "--out", file], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, `${c.name}: ${r.stderr}`);
  }
  const raw = await readFile(out, "utf8");
  assert.equal(raw, await readFile(again, "utf8"), `${c.name}: determinism`);
  const lines = raw.trim().split("\n").map(JSON.parse),
    snapshots = lines.filter((l) => l.type === "snapshot"),
    events = lines.filter((l) => l.type === "event");
  assert.equal(snapshots[0].tick, 0);
  assert.equal(lines.at(-1).type, "end");
  subset(snapshots.at(-1), c.expect.snapshot ?? {});
  subset(lines.at(-1), c.expect.end ?? {});
  for (const expected of c.expect.events ?? []) {
    const event = events.find((e) => e.name === expected.name);
    assert.ok(event, `${c.name}: missing ${expected.name}`);
    subset(event, expected);
  }
  results.push({
    scenario: c.name,
    result: "passed",
    ticks: lines.at(-1).ticks,
    sha256: createHash("sha256").update(raw).digest("hex"),
  });
  // Repeated output is kept in .work only, never as a second evidence copy.
  await import("node:fs/promises").then((fs) => fs.unlink(again));
  console.log(`PASS ${c.name}`);
}
await writeFile(
  `${outDir}/summary.json`,
  JSON.stringify(results, null, 2) + "\n",
);
