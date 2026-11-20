import { spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { cpus, platform, arch } from "node:os";
const dir = process.argv[2] ?? ".work/benchmark";
await mkdir(dir, { recursive: true });
const runs = [];
for (const night of [1, 2, 3]) {
  const scenario = {
    player: { pos: night === 3 ? [35, 0, 0] : [0, 0, 0], invuln_ticks: 21601 },
    time_left_s: 360,
    wind_enabled: false,
  };
  const scenarioFile = `${dir}/night-${night}.scenario.json`;
  await writeFile(scenarioFile, JSON.stringify(scenario, null, 2) + "\n");
  const out = `${dir}/night-${night}.jsonl`,
    start = performance.now();
  const run = spawnSync(
    process.execPath,
    [
      "src/headless.mjs",
      "--seed",
      "42",
      "--night",
      String(night),
      "--scenario",
      scenarioFile,
      "--ticks",
      "21600",
      "--out",
      out,
    ],
    { encoding: "utf8", timeout: 30000 },
  );
  const elapsed = (performance.now() - start) / 1000;
  if (run.status !== 0)
    throw Error(`night ${night}: ${run.stderr || run.error}`);
  const data = (await readFile(out, "utf8")).trim().split("\n").map(JSON.parse),
    end = data.at(-1);
  if (end.ticks !== 21600) throw Error("benchmark ended early");
  runs.push({
    night,
    ticks: end.ticks,
    elapsed_s: elapsed,
    within_30s: elapsed <= 30,
    bytes: (await readFile(out)).length,
  });
  console.log(`Night ${night}: ${elapsed.toFixed(3)}s / 21600 ticks`);
}
await writeFile(
  `${dir}/benchmark.json`,
  JSON.stringify(
    {
      recorded_at: new Date().toISOString(),
      node: process.version,
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model,
      notes:
        "CLI includes JSONL file I/O. Scenario prevents early death; spawns remain enabled. Wind off to keep player on the island. This measures headless throughput, not rendered FPS.",
      runs,
    },
    null,
    2,
  ) + "\n",
);
