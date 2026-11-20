import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, distance } from "../src/core/game.mjs";
import { validateScenario, InputError } from "../src/core/validation.mjs";
const { tuning: t } = JSON.parse(
  readFileSync(new URL("../game.contract.json", import.meta.url)),
);
const make = (scenario = {}, night = 1) =>
  new Game({
    tuning: t,
    night,
    seed: 42,
    scenario: {
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      wind_enabled: false,
      ...(night === 3 ? { player: { pos: [0, 6, 6] } } : {}),
      ...scenario,
    },
  });
const steps = (g, n, patch = {}) => {
  const events = [];
  for (let i = 0; i < n; i++) events.push(...g.step(i === 0 ? patch : {}));
  return events;
};
const lit = (count, fuel = 100) =>
  Array.from({ length: count }, (_, i) => ({
    id: `L${i + 1}`,
    lit: true,
    fuel,
  }));

test("v1.2 durations and all lit no longer end a night early", () => {
  for (const [night, duration] of [
    [1, 240],
    [2, 270],
    [3, 300],
  ]) {
    const g = make({ lanterns: lit([0, 5, 6, 7][night]) }, night);
    assert.equal(g.timeTicks, duration * 60);
    g.step();
    assert.equal(g.state, "playing");
    assert.ok(!g.events.some((e) => e.name === "game_over"));
  }
});
test("scenario prelit defaults100 and ever_lit, no events/score/capacity increase", () => {
  const g = make({ lanterns: [{ id: "L1", lit: true }] });
  assert.equal(g.snapshot().lanterns[0].fuel, 100);
  assert.equal(g.lanterns[0].ever_lit, true);
  assert.equal(g.lanterns[0].relit_count, 0);
  assert.equal(g.capacity, 10);
  assert.equal(g.score, 0);
  assert.deepEqual(g.events, []);
});
test("fuel100 expires at exactly6000 simulation steps and preserves ever_lit", () => {
  const g = make({ lanterns: [{ id: "L1", lit: true }] });
  steps(g, 5999);
  assert.equal(g.lanterns[0].fuelUnits, 1);
  assert.equal(g.lanterns[0].lit, true);
  g.step();
  assert.equal(g.lanterns[0].lit, false);
  assert.equal(g.lanterns[0].deposited, 0);
  assert.equal(g.lanterns[0].fuelUnits, 0);
  assert.equal(g.lanterns[0].ever_lit, true);
  assert.deepEqual(g.events.find((e) => e.name === "lantern_out").data, {
    lantern_id: "L1",
  });
  assert.equal(g.state, "playing");
});
test("pause freezes fuel, drain timers and night clock", () => {
  const g = make({
    player: { pos: [25, 0, 0] },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ pos: [0, 1, 0], state: "drain", target_lantern_id: "L1" }],
  });
  g.step({ pause: true });
  steps(g, 120, { pause: false });
  assert.equal(g.lanterns[0].fuelUnits, 1200);
  assert.equal(g.shades[0].drainTicks, 0);
  assert.equal(g.simTick, 0);
  g.step({ pause: true });
  assert.equal(g.lanterns[0].fuelUnits, 1194);
});
test("refuel uses ceil, clamps100, consumes only used motes and scores5 each", () => {
  const g = make({
    player: { carried: 10 },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 70 }],
  });
  g.step({ interact: true });
  assert.equal(g.player.carried, 6);
  assert.equal(g.fuel(g.lanterns[0]), 100);
  assert.equal(g.score, 20);
  assert.deepEqual(g.events.find((e) => e.name === "refuel").data, {
    lantern_id: "L1",
    amount: 4,
    fuel: 100,
  });
  assert.equal(g.capacity, 10);
  g.step();
  assert.ok(!g.events.some((e) => e.name === "refuel"));
});
test("partial refuel consumes available motes and does not falsely fill lamp", () => {
  const g = make({
    player: { carried: 2 },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 20 }],
  });
  g.step({ interact: true });
  assert.equal(g.lanterns[0].fuelUnits, 2399);
  assert.equal(g.player.carried, 0);
  assert.equal(g.score, 10);
});
test("full lamp excluded at interaction time; after natural decay it can receive1", () => {
  const g = make({
    player: { carried: 10 },
    lanterns: [
      { id: "L1", pos: [0, 0, 0], lit: true },
      { id: "L2", pos: [1, 0, 0] },
    ],
  });
  assert.equal(g.acceptsMotes(g.lanterns[0]), false);
  g.deposit();
  assert.equal(g.lanterns[1].lit, true);
  assert.ok(!g.events.some((e) => e.name === "refuel"));
  const h = make({
    player: { carried: 10 },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true }],
  });
  h.step({ interact: true });
  assert.equal(h.events.find((e) => e.name === "refuel").data.amount, 1);
});
test("refuel and unlit compete by distance then ID, not by lamp state", () => {
  const g = make({
    player: { carried: 10 },
    lanterns: [
      { id: "L1", pos: [1, 0, 0], lit: true, fuel: 20 },
      { id: "L2", pos: [-1, 0, 0] },
    ],
  });
  g.step({ interact: true });
  assert.equal(g.events.find((e) => e.name === "refuel").data.lantern_id, "L1");
  assert.equal(g.lanterns[1].deposited, 0);
});
test("first light then expiry and relight retain history, cost5 and distinct score", () => {
  const g = make({
    player: { carried: 10 },
    lanterns: [{ id: "L1", pos: [0, 0, 0] }],
  });
  g.step({ interact: true });
  assert.equal(g.score, 150);
  assert.equal(g.capacity, 12);
  assert.equal(
    g.events.find((e) => e.name === "lantern_lit").data.relight,
    false,
  );
  g.lanterns[0].fuelUnits = 1;
  g.step({ interact: false });
  assert.equal(g.lanterns[0].lit, false);
  g.player.carried = 5;
  g.step({ interact: true });
  assert.equal(g.score, 215);
  assert.equal(g.capacity, 14);
  assert.equal(g.lanterns[0].relit_count, 1);
  assert.equal(g.lanterns[0].deposited, 5);
  assert.equal(g.fuel(g.lanterns[0]), 100);
  assert.equal(
    g.events.find((e) => e.name === "lantern_lit").data.relight,
    true,
  );
});
test("capacity grows after lighting and next tick pickup uses new limit", () => {
  const g = make({
    player: { carried: 10 },
    lanterns: [{ id: "L1", pos: [0, 0, 0] }],
    motes: Array.from({ length: 20 }, () => [0, 0, 0]),
  });
  g.step({ interact: true });
  assert.equal(g.player.carried, 0);
  assert.equal(g.snapshot().player.capacity, 12);
  g.step();
  assert.equal(g.player.carried, 12);
  assert.equal(g.motes.length, 8);
});
test("scenario successful_lights is honored and capped20, new night resets it", () => {
  const scenario = { player: { successful_lights: 8, carried: 20 } };
  validateScenario(scenario, t);
  const g = make(scenario);
  assert.equal(g.capacity, 20);
  assert.equal(make().capacity, 10);
  assert.throws(
    () =>
      validateScenario({ player: { successful_lights: 1, carried: 13 } }, t),
    InputError,
  );
});
test("safe threshold is exact30 before decay, below30 permits shade entry", () => {
  const g = make({
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 30 }],
    shades: [{ pos: [6, 1, 0], state: "chase" }],
  });
  assert.equal(g.isSafe([0, 0, 0]), true);
  g.step();
  assert.equal(g.isSafe([0, 0, 0]), false);
  assert.ok(distance(g.shades[0].pos, [0, 0, 0]) < 6);
  const h = make({
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 30 + 1 / 60 }],
    shades: [{ pos: [6, 1, 0], state: "chase" }],
  });
  h.step();
  assert.equal(h.fuel(h.lanterns[0]), 30);
  assert.ok(distance(h.shades[0].pos, [0, 0, 0]) >= 6);
});
test("wander targets nearest weak lamp with ID tie and drains from following tick", () => {
  const g = make({
    player: { pos: [30, 0, 0] },
    lanterns: [
      { id: "L1", pos: [-1, 0, 0], lit: true, fuel: 20 },
      { id: "L2", pos: [1, 0, 0], lit: true, fuel: 20 },
    ],
    shades: [{ pos: [0, 1, 0], state: "wander" }],
  });
  g.step();
  assert.equal(g.shades[0].state, "drain");
  assert.equal(g.shades[0].targetLanternId, "L1");
  assert.equal(g.lanterns[0].fuelUnits, 1199);
  g.step();
  assert.equal(g.lanterns[0].fuelUnits, 1193);
  assert.equal(g.lanterns[1].fuelUnits, 1198);
});
test("wander fallback goes to nearest unlit; chase continues toward player", () => {
  const g = make({
    player: { pos: [30, 0, 0] },
    lanterns: [{ id: "L1", pos: [0, 0, 5] }],
    shades: [{ pos: [0, 1, 0], state: "wander" }],
  });
  g.step();
  assert.ok(g.shades[0].pos[2] > 0);
  const h = make({
    player: { pos: [10, 0, 0] },
    lanterns: [{ id: "L1", pos: [0, 0, 1], lit: true, fuel: 20 }],
    shades: [{ pos: [0, 1, 0], state: "chase" }],
  });
  h.step();
  assert.equal(h.shades[0].state, "chase");
  assert.ok(h.shades[0].pos[0] > 0);
  assert.equal(h.shades[0].pos[2], 0);
});
test("drain stacks with decay and reports every60 active ticks per shade", () => {
  const g = make({
    player: { pos: [25, 0, 0] },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [
      { id: "S1", pos: [0, 1, 0], state: "drain", target_lantern_id: "L1" },
      { id: "S2", pos: [1, 1, 0], state: "drain", target_lantern_id: "L1" },
    ],
  });
  const events = steps(g, 60);
  assert.equal(g.fuel(g.lanterns[0]), 9);
  const reports = events.filter((e) => e.name === "fuel_drain");
  assert.equal(reports.length, 2);
  assert.ok(reports.every((e) => e.tick === 60 && e.data.fuel === 9));
  assert.deepEqual(
    reports.map((e) => e.data.shade_id),
    ["S1", "S2"],
  );
});
test("drain switches chase at6m, stops for out-of-range target or restored safe zone", () => {
  const base = {
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ pos: [0, 1, 0], state: "drain", target_lantern_id: "L1" }],
  };
  const g = make({ ...base, player: { pos: [6, 0, 0] } });
  g.step();
  assert.equal(g.shades[0].state, "chase");
  const h = make({
    ...base,
    player: { pos: [25, 0, 0] },
    shades: [{ pos: [3, 1, 0], state: "drain", target_lantern_id: "L1" }],
  });
  h.step();
  assert.notEqual(h.shades[0].state, "drain");
  assert.equal(h.lanterns[0].fuelUnits, 1199);
  const safe = make({
    ...base,
    player: { pos: [25, 0, 0] },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 40 }],
  });
  safe.step();
  assert.equal(safe.shades[0].state, "wander");
  assert.equal(safe.lanterns[0].fuelUnits, 2399);
});
test("fuel expiry from drain happens before interactions and releases drain state", () => {
  const g = make({
    player: { pos: [25, 0, 0] },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 0.1 }],
    shades: [{ pos: [0, 1, 0], state: "drain", target_lantern_id: "L1" }],
  });
  g.step();
  assert.equal(g.lanterns[0].lit, false);
  assert.equal(g.shades[0].state, "wander");
  assert.equal(g.events.filter((e) => e.name === "lantern_out").length, 1);
});
test("refill above30 evacuates shade in30 ticks without damage", () => {
  const g = make({
    player: { carried: 2 },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ pos: [1, 1, 0], state: "drain", target_lantern_id: "L1" }],
  });
  g.step({ interact: true });
  assert.equal(g.isSafe([0, 0, 0]), true);
  assert.notEqual(g.shades[0].state, "drain");
  steps(g, 29);
  assert.ok(Math.abs(distance(g.shades[0].pos, [0, 0, 0]) - 6) < 1e-8);
  assert.equal(g.player.flames, 3);
});
test("pulse awards total15 for drain and5 for other shade, then stun expires to wander", () => {
  const g = make({
    player: { carried: 6 },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [
      { id: "S1", pos: [0, 1, 0], state: "drain", target_lantern_id: "L1" },
      { id: "S2", pos: [1, 1, 0], state: "chase" },
    ],
  });
  g.step({ pulse: true });
  assert.equal(g.score, 20);
  assert.ok(g.shades.every((s) => s.state === "stunned"));
  steps(g, 120, { pulse: false });
  assert.ok(g.shades.every((s) => s.state === "wander"));
  assert.equal(g.score, 20);
});
test("dawn thresholds3/5,4/6,5/7 and no bonus on failure", () => {
  for (const [night, required] of [
    [1, 3],
    [2, 4],
    [3, 5],
  ]) {
    const won = make(
      { time_left_s: 1 / 60, lanterns: lit(required, 60) },
      night,
    );
    won.step();
    assert.equal(won.state, "won");
    assert.equal(won.events.at(-1).data.reason, "dawn_survived");
    assert.equal(won.score, required * 109 + 150);
    const lost = make(
      { time_left_s: 1 / 60, lanterns: lit(required - 1, 60) },
      night,
    );
    lost.step();
    assert.equal(lost.state, "lost");
    assert.equal(lost.score, 0);
  }
});
test("last-tick expiry can lose; same-tick relight can recover the dawn threshold", () => {
  const lamps = [
    { id: "L1", pos: [0, 0, 0], lit: true, fuel: 1 / 60 },
    ...lit(3).slice(1),
  ];
  const lost = make({ time_left_s: 1 / 60, lanterns: lamps });
  lost.step();
  assert.equal(lost.state, "lost");
  const won = make({
    time_left_s: 1 / 60,
    player: { carried: 5 },
    lanterns: lamps,
  });
  won.step({ interact: true });
  assert.equal(won.state, "won");
  assert.equal(won.lanterns[0].relit_count, 1);
  assert.deepEqual(
    won.events
      .filter((e) =>
        ["lantern_out", "lantern_lit", "game_over"].includes(e.name),
      )
      .map((e) => e.name),
    ["lantern_out", "lantern_lit", "game_over"],
  );
});
test("fatal hit at dawn always loses even with enough lit lamps", () => {
  const g = make({
    time_left_s: 1 / 60,
    player: { flames: 1 },
    lanterns: lit(3),
    shades: [{ pos: [0, 1, 0] }],
  });
  g.step();
  assert.equal(g.state, "lost");
  assert.equal(g.events.at(-1).data.reason, "no_flames");
  assert.equal(g.score, 0);
});
test("snapshot fuel rounds1 decimal while thresholds/floor rewards use exact units", () => {
  const g = make({ time_left_s: 1 / 60, lanterns: lit(3, 60) });
  g.step();
  assert.equal(g.snapshot().lanterns[0].fuel, 60);
  assert.equal(g.lanterns[0].fuelUnits, 3599);
  assert.equal(g.score, 477);
  assert.equal(g.snapshot().player.capacity, 10);
});
test("v1.2 scenario validation rejects invalid fuel/history/drain targets, CLI data is valid", () => {
  for (const lantern of [
    { id: "L1", fuel: 101 },
    { id: "L1", fuel: -1 },
    { id: "L1", fuel: NaN },
    { id: "L1", ever_lit: 1 },
  ])
    assert.throws(
      () => validateScenario({ lanterns: [lantern] }, t),
      InputError,
    );
  assert.throws(
    () => validateScenario({ player: { successful_lights: -1 } }, t),
    InputError,
  );
  assert.throws(
    () =>
      validateScenario(
        {
          shades: [{ pos: [0, 1, 0], state: "drain", target_lantern_id: "L9" }],
        },
        t,
      ),
    InputError,
  );
  validateScenario(
    {
      shades: [{ pos: [0, 1, 0], state: "drain", target_lantern_id: "L1" }],
      lanterns: [{ id: "L1", lit: true, fuel: 20, ever_lit: true }],
    },
    t,
  );
});

test("a drain target beyond2m transitions to wander before it may be acquired again", () => {
  const g = make({
    player: { pos: [25, 0, 0] },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 20 }],
    shades: [{ pos: [2.01, 1, 0], state: "drain", target_lantern_id: "L1" }],
  });
  g.step();
  assert.equal(g.shades[0].state, "wander");
  assert.equal(g.lanterns[0].fuelUnits, 1199);
  g.step();
  assert.equal(g.shades[0].state, "drain");
});

test("scenario fuel finer than1/60 is never rounded across the30 safe threshold", () => {
  const g = make({
    player: { pos: [25, 0, 0] },
    lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true, fuel: 29.999 }],
    shades: [{ pos: [0, 1, 0], state: "drain", target_lantern_id: "L1" }],
  });
  assert.equal(g.hasSafeZone(g.lanterns[0]), false);
  assert.equal(g.snapshot().lanterns[0].fuel, 30);
  g.step();
  assert.ok(Math.abs(g.fuel(g.lanterns[0]) - 29.899) < 1e-9);
  assert.equal(g.snapshot().lanterns[0].fuel, 29.9);
});
