import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  frameStats,
  benchmarkCamera,
  makeBenchmark,
  stepBenchmark,
} from "../src/core/benchmark.mjs";
import {
  defaults,
  normalizeBindings,
  updateBinding,
  matchesBinding,
} from "../public/bindings.mjs";
import { normalizeSettings } from "../public/presentation.mjs";
import { validateEntry, topEntries } from "../src/local/leaderboard-core.mjs";
import { Leaderboard } from "../src/local/leaderboard.mjs";
import { createGameServer } from "../src/server.mjs";
const { tuning } = JSON.parse(
  await readFile(new URL("../game.contract.json", import.meta.url), "utf8"),
);
const entry = (i, score = i) => ({
  name: `May_${i}`,
  score,
  nights_won: i % 4,
  achieved_at: `2026-11-20T0${i % 9}:00:00.000Z`,
  seed: 42,
});
test("benchmark exact average, worst1% and nearest-rank p95 formulas", () => {
  const a = frameStats([10, 10, 20, 40]);
  assert.equal(a.avg_fps, 50);
  assert.equal(a.p1_low_fps, 25);
  assert.equal(a.frame_ms_p95, 40);
  assert.equal(a.frames, 4);
  const b = frameStats([...Array(198).fill(10), 20, 40]);
  assert.equal(b.p1_low_fps, 1000 / 30);
  assert.equal(b.frame_ms_p95, 10);
  assert.throws(() => frameStats([]));
});
test("benchmark camera starts30,15,0 and loops every15s with correct quarter turn", () => {
  assert.deepEqual(benchmarkCamera(0), [30, 15, 0]);
  assert.ok(Math.abs(benchmarkCamera(3.75)[2] - 30) < 1e-9);
  assert.ok(Math.abs(benchmarkCamera(15)[0] - 30) < 1e-9);
});
test("benchmark fixture retains200wander/100motes/3 lamps, no gameplay side effects", () => {
  const g = makeBenchmark(tuning, 42),
    initial = JSON.stringify(g.snapshot());
  for (let i = 0; i < 3600; i++) stepBenchmark(g);
  assert.equal(g.shades.length, 200);
  assert.equal(g.motes.length, 100);
  assert.equal(g.lanterns.filter((l) => l.lit).length, 3);
  assert.ok(g.lanterns.filter((l) => l.lit).every((l) => g.fuel(l) === 100));
  assert.ok(g.shades.every((s) => s.state === "wander"));
  assert.equal(g.player.flames, 3);
  assert.equal(g.player.carried, 0);
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  assert.equal(g.state, "playing");
  assert.equal(g.timeTicks, tuning.night1_duration_s * 60);
  assert.notEqual(JSON.stringify(g.snapshot()), initial);
  assert.deepEqual(
    makeBenchmark(tuning, 42).snapshot(),
    makeBenchmark(tuning, 42).snapshot(),
  );
});
test("all9 keybindings rebind, reject duplicates, reset and survive settings serialization", () => {
  assert.equal(Object.keys(defaults).length, 9);
  const custom = updateBinding(defaults, "jump", "KeyJ");
  assert.equal(custom.jump, "KeyJ");
  assert.throws(() => updateBinding(custom, "dash", "KeyJ"), /dùng/);
  assert.throws(() => updateBinding(custom, "__proto__", "KeyK"));
  assert.deepEqual(normalizeBindings({ ...custom, dash: "KeyJ" }), defaults);
  assert.equal(
    normalizeSettings(
      JSON.parse(
        JSON.stringify({
          bindings: custom,
          largeText: true,
          reducedMotion: true,
        }),
      ),
    ).bindings.jump,
    "KeyJ",
  );
  assert.equal(normalizeSettings({ largeText: true }).largeText, true);
  assert.equal(normalizeSettings({ reducedMotion: true }).reducedMotion, true);
  assert.equal(matchesBinding(custom, "pause", "KeyP"), true);
  assert.equal(
    matchesBinding(updateBinding(custom, "pulse", "KeyP"), "pause", "KeyP"),
    false,
  );
});
test("leaderboard validates names, ISO timezone and sorts top10 by score then earlier achievement", () => {
  const list = Array.from({ length: 15 }, (_, i) => entry(i));
  assert.equal(topEntries(list).length, 10);
  assert.equal(topEntries(list)[0].score, 14);
  const a = entry(1, 10),
    b = { ...entry(2, 10), achieved_at: "2026-11-19T23:59:00+07:00" };
  assert.equal(topEntries([a, b])[0].name, b.name);
  for (const name of ["ab", "long_name_123456", "bad name", "<b>"])
    assert.throws(() => validateEntry({ ...a, name }));
  assert.throws(() =>
    validateEntry({ ...a, achieved_at: "2026-11-20T01:00:00" }),
  );
  assert.throws(() => validateEntry({ ...a, score: -1 }));
});
test("leaderboard concurrent writes persist across instances and CLI export uses same disk", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lantern-board-"));
  try {
    const board = new Leaderboard(dir);
    await Promise.all(
      Array.from({ length: 15 }, (_, i) => board.add(entry(i))),
    );
    const saved = await new Leaderboard(dir).read();
    assert.equal(saved.entries.length, 10);
    assert.equal(saved.entries[0].score, 14);
    const out = join(dir, "export.json");
    const run = spawnSync(
      process.execPath,
      ["scripts/serve.mjs", "--export-leaderboard", out],
      { encoding: "utf8", env: { ...process.env, LANTERN_DATA_DIR: dir } },
    );
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual(JSON.parse(await readFile(out, "utf8")), saved);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("leaderboard HTTP save/read survives server restart and rejects malformed names", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lantern-board-api-"));
  let server;
  try {
    const start = async () => {
      server = createGameServer({ dataDir: dir });
      await new Promise((r) => server.listen(0, "127.0.0.1", r));
      return `http://127.0.0.1:${server.address().port}`;
    };
    let base = await start();
    let r = await fetch(base + "/api/leaderboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entry(1, 500)),
    });
    assert.equal(r.status, 200);
    r = await fetch(base + "/api/leaderboard", {
      method: "POST",
      body: JSON.stringify({ ...entry(2), name: "x" }),
    });
    assert.equal(r.status, 400);
    await new Promise((r) => server.close(r));
    base = await start();
    r = await fetch(base + "/api/leaderboard");
    assert.equal((await r.json()).entries[0].score, 500);
  } finally {
    if (server?.listening) await new Promise((r) => server.close(r));
    await rm(dir, { recursive: true, force: true });
  }
});
test("soak ten runs share one PID, cycle nights/seeds, random inputs finish and report real RSS", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lantern-soak-"));
  try {
    const out = join(dir, "soak.json");
    const run = spawnSync(
      process.execPath,
      [
        "--expose-gc",
        "--max-semi-space-size=1",
        "src/soak.mjs",
        "--seed",
        "7",
        "--nights",
        "10",
        "--out",
        out,
      ],
      { encoding: "utf8" },
    );
    const data = JSON.parse(await readFile(out, "utf8"));
    const trace = JSON.parse(
      await readFile(out.replace(/\.json$/i, "") + ".details.json", "utf8"),
    );
    assert.equal(new Set(trace.details.map((d) => d.pid)).size, 1);
    assert.equal(data.nights, 10);
    assert.equal(data.crashes, 0);
    assert.equal(data.results.length, 10);
    assert.deepEqual(
      trace.details.map((d) => d.seed),
      [7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    );
    assert.deepEqual(
      trace.details.map((d) => d.night),
      [1, 2, 3, 1, 2, 3, 1, 2, 3, 1],
    );
    assert.ok(data.mem_start_mb > 0 && data.mem_end_mb > 0);
    assert.ok(data.duration_s > 0);
    assert.ok(
      trace.details.every(
        (d) => d.ticks <= tuning[`night${d.night}_duration_s`] * 60,
      ),
    );
    assert.ok([0, 1].includes(run.status));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
