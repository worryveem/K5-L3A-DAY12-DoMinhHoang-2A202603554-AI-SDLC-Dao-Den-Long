import assert from "node:assert/strict";
import { readFile, writeFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { frameStats } from "../src/core/benchmark.mjs";
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const [bench, frames, details, soak, trace, ui, env, capture] =
  await Promise.all(
    [
      "bench.json",
      "bench.frames.json",
      "bench.details.json",
      "soak.json",
      "soak.details.json",
      "docs/proof/phase-4/ui-check.json",
      "docs/proof/phase-4/environment.json",
      "docs/demo/capture.json",
    ].map(json),
  );
const recomputed = frameStats(frames);
for (const key of ["avg_fps", "p1_low_fps", "frame_ms_p95", "frames"])
  assert.ok(
    Math.abs(recomputed[key] - bench[key]) < 1e-8,
    `Benchmark ${key} mismatch`,
  );
assert.equal(bench.contract_version, "1.3");
assert.ok(
  bench.avg_fps >= 60 && bench.p1_low_fps >= 30 && bench.load_ms <= 10000,
);
assert.equal(details.measured_duration_s, 30);
assert.equal(details.scene.shades, 200);
assert.equal(details.scene.motes, 100);
assert.equal(details.scene.lit, 3);
assert.equal(details.scene.creative, false);
assert.deepEqual(details.scene.player, [0, 0, 0]);
assert.equal(soak.nights, 10);
assert.equal(soak.crashes, 0);
assert.equal(soak.results.length, 10);
assert.ok(soak.mem_start_mb > 0 && soak.mem_end_mb <= soak.mem_start_mb * 1.2);
assert.equal(new Set(trace.details.map((x) => x.pid)).size, 1);
assert.deepEqual(
  trace.details.map((x) => x.seed),
  [7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
);
assert.equal(ui.width, 1280);
assert.equal(ui.height, 720);
assert.ok(Object.values(ui.font_samples_px).every((x) => x >= 18));
assert.equal(ui.large_scale, 1.25);
assert.equal(env.test_exit_code, 0);
assert.equal(env.build_exit_code, 0);
assert.equal(capture.mode, "automated-replay");
assert.equal(capture.reports_shown, true);
const file = await stat("docs/demo/demo.mp4");
assert.ok(file.size > 0 && file.size < 100 * 1024 ** 2);
const ffmpeg = createRequire(import.meta.url)("ffmpeg-static"),
  decode = spawnSync(ffmpeg, ["-i", "docs/demo/demo.mp4", "-f", "null", "-"], {
    encoding: "utf8",
  });
assert.equal(decode.status, 0, decode.stderr);
const time = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(decode.stderr);
assert.ok(time);
const duration =
  Number(time[1]) * 3600 + Number(time[2]) * 60 + Number(time[3]);
assert.ok(duration > 0 && duration < 300);
const head = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).stdout.trim();
const report = {
  recorded_at: new Date().toISOString(),
  local_checks: "passed",
  bench_formula_recomputed: true,
  bench_thresholds_passed: true,
  soak_threshold_passed: true,
  ui_font_check_passed: true,
  video_decode_passed: true,
  video_duration_s: duration,
  video_bytes: file.size,
  base_commit: head,
  publication:
    "Not committed, tagged, pushed or released in this Phase4 work, per user instruction. Local checks do not imply GitHub submission complete.",
};
await writeFile(
  "docs/proof/phase-4/readiness.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
