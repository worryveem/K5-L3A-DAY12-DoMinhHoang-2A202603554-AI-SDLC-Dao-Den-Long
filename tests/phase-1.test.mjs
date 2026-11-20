import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  writeFileSync,
  readFileSync as read,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { Game } from "../src/core/game.mjs";
import {
  validateInputs,
  validateScenario,
  InputError,
} from "../src/core/validation.mjs";
const { tuning: t } = JSON.parse(
  readFileSync(new URL("../game.contract.json", import.meta.url)),
);
const make = (scenario = {}) =>
  new Game({
    tuning: t,
    seed: 42,
    scenario: { random_motes: false, random_shades: false, ...scenario },
  });
test("snapshot tick 0; input of tick k produces state/event k+1", () => {
  const g = make({ motes: [[0, 0, 0]] });
  assert.equal(g.snapshot().tick, 0);
  assert.equal(g.score, 0);
  assert.deepEqual(g.events, []);
  g.step();
  assert.equal(g.tick, 1);
  assert.equal(g.simTick, 1);
  assert.equal(g.events[0].tick, 1);
  assert.equal(g.player.carried, 1);
});
test("camera transform and normalized diagonal, persistent fields", () => {
  const g = make();
  for (let k = 0; k < 60; k++)
    g.step(k === 0 ? { move: [0, 1], cam_yaw_deg: 90 } : {});
  assert.ok(Math.abs(g.player.pos[0] - t.player_speed) < 1e-9);
  assert.ok(Math.abs(g.player.pos[2]) < 1e-9);
  const h = make();
  for (let k = 0; k < 60; k++) h.step(k === 0 ? { move: [1, 1] } : {});
  assert.ok(
    Math.abs(Math.hypot(h.player.pos[0], h.player.pos[2]) - t.player_speed) <
      1e-9,
  );
});
test("pickup inclusive XZ radius and capacity", () => {
  const g = make({
    player: { carried: t.carry_capacity - 1 },
    motes: [
      [t.pickup_radius, 0, 0],
      [0, 0, 0],
    ],
  });
  g.step();
  assert.equal(g.player.carried, t.carry_capacity);
  assert.equal(g.motes.length, 1);
  assert.equal(g.events.filter((e) => e.name === "mote_picked").length, 1);
});
test("deposit partial, nearest lantern, rising edge and retained progress", () => {
  const g = make({
    player: { carried: 3 },
    lanterns: [{ id: "L1", pos: [0, 0, 0] }],
  });
  g.step({ interact: true });
  assert.equal(g.lanterns[0].deposited, 3);
  g.player.carried = 7;
  g.step();
  assert.equal(g.lanterns[0].deposited, 3);
  g.step({ interact: false });
  g.step({ interact: true });
  assert.equal(g.lanterns[0].lit, true);
  assert.equal(g.player.carried, 0);
});
test("scenario lit setup grants no score/events", () => {
  const g = make({ lanterns: [{ id: "L1", lit: true }] });
  assert.equal(g.score, 0);
  assert.equal(g.events.length, 0);
  assert.equal(g.lanterns[0].deposited, t.lantern_cost);
});
test("pulse charges, stuns inclusive target, pushes, and rejects held/recharging inputs", () => {
  const g = make({
    player: { carried: 9 },
    shades: [{ id: "target", pos: [t.pulse_radius, 0.8, 0] }],
  });
  g.step({ pulse: true });
  assert.equal(g.player.carried, 6);
  assert.equal(g.shades[0].state, "stunned");
  assert.deepEqual(g.events.find((e) => e.name === "pulse").data.stunned_ids, [
    "target",
  ]);
  assert.ok(g.shades[0].pos[0] > t.pulse_radius);
  g.step();
  assert.equal(g.player.carried, 6);
  g.step({ pulse: false });
  g.step({ pulse: true });
  assert.equal(g.player.carried, 6);
});
test("pulse insufficient carried produces no action", () => {
  const g = make({ player: { carried: 2 } });
  g.step({ pulse: true });
  assert.equal(g.player.carried, 2);
  assert.ok(!g.events.some((e) => e.name === "pulse"));
});
test("overlapping shades produce one hit during invulnerability; floor drop", () => {
  const g = make({
    player: { carried: 9 },
    shades: [{ pos: [0, 0, 0] }, { pos: [0, 0, 0] }],
  });
  g.step();
  assert.equal(g.player.flames, 2);
  assert.equal(g.player.carried, 9 - Math.floor(9 * t.hit_drop_ratio));
  assert.equal(g.events.filter((e) => e.name === "player_hit").length, 1);
  for (let i = 0; i < 20; i++) g.step();
  assert.equal(g.player.flames, 2);
});
test("lit safe zone blocks shades and damage", () => {
  const g = make({
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true }],
    shades: [{ pos: [t.safe_radius + 0.01, 0, 0] }],
  });
  for (let i = 0; i < 180; i++) g.step();
  assert.ok(g.shades[0].pos[0] >= t.safe_radius);
  assert.equal(g.player.flames, 3);
});
test("win/lose and end stop simulation with documented priority", () => {
  const all = Array.from({ length: 5 }, (_, i) => ({
    id: `L${i + 1}`,
    lit: true,
  }));
  const won = make({ lanterns: all, time_left_s: 1 / 60 });
  won.step();
  assert.equal(won.state, "won");
  assert.equal(won.events.at(-1).data.reason, "all_lit");
  const tick = won.tick;
  won.step();
  assert.equal(won.tick, tick);
  const lost = make({ time_left_s: 1 / 60 });
  lost.step();
  assert.equal(lost.state, "lost");
  assert.equal(lost.events.at(-1).data.reason, "dawn");
  const dead = make({ player: { flames: 0 }, lanterns: all });
  dead.step();
  assert.equal(dead.events.at(-1).data.reason, "no_flames");
});
test("validation rejects invalid JSON shapes, duplicate ticks, nonfinite and excess carry", () => {
  for (const input of [
    { frames: [{ tick: 1 }, { tick: 1 }] },
    { frames: [{ tick: 0, move: [2, 0] }] },
    { frames: [{ tick: 0, pulse: 1 }] },
    { frames: [{ tick: 0, cam_yaw_deg: Infinity }] },
  ])
    assert.throws(() => validateInputs(input), InputError);
  assert.throws(
    () => validateScenario({ player: { carried: t.carry_capacity + 1 } }, t),
    InputError,
  );
  assert.throws(
    () => validateScenario({ lanterns: [{ id: "L9" }] }, t),
    InputError,
  );
});
test("CLI reproducible JSONL including snapshot 0, N steps, final end; invalid files exit 2", () => {
  const dir = mkdtempSync(join(tmpdir(), "lantern-cli-"));
  try {
    const scenario = join(dir, "scenario.json"),
      inputs = join(dir, "inputs.json");
    writeFileSync(
      scenario,
      JSON.stringify({ random_shades: false, motes: [[0, 0, 0]] }),
    );
    writeFileSync(
      inputs,
      JSON.stringify({
        frames: [
          { tick: 0, move: [0, 1] },
          { tick: 30, move: [0, 0] },
        ],
      }),
    );
    const run = (out) =>
      spawnSync(
        process.execPath,
        [
          "src/headless.mjs",
          "--seed",
          "17",
          "--night",
          "1",
          "--ticks",
          "60",
          "--scenario",
          scenario,
          "--inputs",
          inputs,
          "--out",
          join(dir, out),
        ],
        { encoding: "utf8" },
      );
    assert.equal(run("a.jsonl").status, 0);
    assert.equal(run("b.jsonl").status, 0);
    const a = read(join(dir, "a.jsonl"), "utf8");
    assert.equal(a, read(join(dir, "b.jsonl"), "utf8"));
    const lines = a.trim().split("\n").map(JSON.parse);
    assert.equal(lines[0].tick, 0);
    assert.deepEqual(lines.at(-1), {
      type: "end",
      ticks: 60,
      state: "playing",
      score: lines.at(-2).score,
    });
    assert.equal(lines.at(-2).sim_tick, 60);
    writeFileSync(inputs, '{"frames":[{"tick":0,"jump":"yes"}]}');
    assert.equal(run("bad.jsonl").status, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
