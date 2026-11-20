import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Game, distance } from "../src/core/game.mjs";
import { makeMap, groundHeight } from "../src/core/maps.mjs";
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
      ...scenario,
    },
  });
const steps = (g, n, patch = {}) => {
  for (let i = 0; i < n; i++) g.step(i === 0 ? patch : {});
  return g;
};
test("standardized maps, exact lantern positions, unique random spawn points", () => {
  assert.deepEqual(makeMap(1).lanterns[0], [0, 0, 25]);
  assert.deepEqual(makeMap(2).lanterns[5], [53, 0, -10]);
  assert.equal(makeMap(3).lanterns.length, 7);
  assert.equal(groundHeight(makeMap(2), 35, 0), 0);
  assert.equal(groundHeight(makeMap(2), 35, 2.01), null);
  assert.equal(groundHeight(makeMap(3), 0, 6), 6);
  assert.equal(groundHeight(makeMap(3), 0, 18), 3);
  assert.ok(
    Math.abs(
      groundHeight(makeMap(3), 27 * Math.cos(Math.PI / 6), 27 * 0.5) - 1.5,
    ) < 1e-9,
  );
  for (const night of [1, 2, 3]) {
    const g = new Game({ tuning: t, seed: 42, night });
    assert.equal(g.motes.length, 20);
    assert.equal(new Set(g.motes.map((m) => m.pos.join(","))).size, 20);
  }
});
test("pickup vertical limit and new scoring only on deposit", () => {
  const g = make({ player: { pos: [0, 1.51, 0] }, motes: [[0, 0, 0]] });
  g.step({ dash: true });
  assert.equal(g.player.carried, 0);
  const h = make({
    motes: [[1, 0, 0]],
    lanterns: [{ id: "L1", pos: [0, 0, 0] }],
  });
  h.step({ interact: true });
  assert.equal(h.score, 10);
  assert.equal(h.lanterns[0].deposited, 1);
});
test("equal-distance deposit chooses lexical smallest unlit ID", () => {
  const g = make({
    player: { carried: 10 },
    lanterns: [
      { id: "L2", pos: [1, 0, 0] },
      { id: "L1", pos: [-1, 0, 0] },
    ],
  });
  g.step({ interact: true });
  assert.equal(g.lanterns[0].lit, true);
  assert.equal(g.lanterns[1].lit, false);
  assert.equal(g.score, 200);
});
test("dash 14m/s for exactly 12 ticks, cooldown from start, requires new press", () => {
  const g = make();
  steps(g, 12, { dash: true });
  assert.ok(Math.abs(g.player.pos[2] - 2.8) < 1e-9);
  assert.equal(g.player.dashCd, 79);
  g.step();
  assert.ok(Math.abs(g.player.pos[2] - 2.8) < 1e-9);
  steps(g, 100);
  assert.ok(Math.abs(g.player.pos[2] - 2.8) < 1e-9);
  g.step({ dash: false });
  g.step({ dash: true });
  assert.ok(g.player.pos[2] > 2.8);
});
test("air dash preserves altitude and no invulnerability", () => {
  const g = make({ player: { pos: [0, 4, 0] } });
  steps(g, 12, { dash: true });
  assert.equal(g.player.pos[1], 4);
  assert.equal(g.player.invuln, 0);
});
test("jump has air control, landing and no double jump", () => {
  const g = make();
  g.step({ jump: true });
  assert.ok(g.player.pos[1] > 0);
  g.step({ jump: false, move: [1, 0] });
  const vy = g.player.vel[1];
  g.step({ jump: true });
  assert.ok(g.player.vel[1] < vy);
  steps(g, 80, { jump: false });
  assert.equal(g.player.grounded, true);
  assert.ok(g.player.pos[0] > 1);
});
test("pulse exact 3D radius, gradual 4m push in 15 ticks, 120 tick stun", () => {
  const g = make({
    player: { carried: 10 },
    shades: [
      { id: "S1", pos: [5, 0.8, 0] },
      { id: "S2", pos: [0, 6, 0] },
    ],
  });
  g.step({ pulse: true });
  assert.deepEqual(g.events.find((e) => e.name === "pulse").data.stunned_ids, [
    "S1",
  ]);
  assert.ok(Math.abs(g.shades[0].pos[0] - (5 + 4 / 15)) < 1e-9);
  steps(g, 14);
  assert.ok(Math.abs(g.shades[0].pos[0] - 9) < 1e-9);
  assert.equal(g.shades[0].state, "stunned");
  steps(g, 104);
  assert.equal(g.shades[0].state, "stunned");
  g.step();
  assert.equal(g.shades[0].state, "stunned");
  g.step();
  assert.notEqual(g.shades[0].state, "stunned");
  assert.equal(g.score, 5);
});
test("new safe zone evacuates within 30 ticks and prevents hits during evacuation", () => {
  const g = make({
    player: { carried: 10 },
    lanterns: [{ id: "L1", pos: [0, 0, 0] }],
    shades: [{ pos: [0, 0, 0] }],
  });
  g.step({ interact: true });
  assert.equal(g.player.flames, 3);
  steps(g, 29);
  assert.ok(Math.abs(distance(g.shades[0].pos, [0, 0, 0]) - 6) < 1e-8);
  assert.equal(g.player.flames, 3);
});
test("shade chase hysteresis 12/18 and exact hit height bound", () => {
  const g = make({ shades: [{ pos: [13, 0, 0], state: "wander" }] });
  g.step();
  assert.equal(g.shades[0].state, "wander");
  g.shades[0].pos = [11, 0, 0];
  g.step();
  assert.equal(g.shades[0].state, "chase");
  g.shades[0].pos = [17, 0, 0];
  g.step();
  assert.equal(g.shades[0].state, "chase");
  g.shades[0].pos = [19, 0, 0];
  g.step();
  assert.equal(g.shades[0].state, "wander");
  const h = make({ shades: [{ pos: [0, 1.51, 0] }] });
  h.step();
  assert.equal(h.player.flames, 3);
});
test("hit creates floor(n/2) recoverable drops with TTL, recoil 2m/60 ticks", () => {
  const g = make({ player: { carried: 9 }, shades: [{ pos: [0, 0, 0] }] });
  g.step();
  assert.equal(g.player.carried, 5);
  assert.equal(g.player.invuln, 90);
  assert.equal(g.motes.length, 4);
  assert.ok(
    g.motes.every(
      (m) =>
        m.kind === "dropped" &&
        m.ttl === 480 &&
        distance(m.pos, [0, 0, 0]) >= 1.5 &&
        distance(m.pos, [0, 0, 0]) <= 2.5,
    ),
  );
  steps(g, 60);
  assert.ok(Math.abs(g.shades[0].pos[0] - 2) < 1e-8);
});
test("fall bypasses invulnerability once; 60-tick wait then respawn and 90 invulnerability", () => {
  const g = make({
    player: { pos: [41, -11, 0], carried: 9, invuln_ticks: 500 },
  });
  g.step();
  assert.equal(g.player.flames, 2);
  assert.equal(g.player.carried, 0);
  assert.equal(g.events.find((e) => e.name === "player_hit").data.lost, 9);
  steps(g, 59);
  assert.equal(g.player.flames, 2);
  assert.equal(g.player.respawnLeft, 1);
  g.step();
  assert.deepEqual(g.player.pos, [0, 0, 0]);
  assert.equal(g.player.invuln, 90);
  const h = make({ player: { pos: [41, -11, 0], flames: 1 } });
  h.step();
  assert.equal(h.state, "lost");
});
test("pause freezes all gameplay timers and input edges are retained", () => {
  const g = make({
    player: { pulse_cd_ticks: 50, charm_ticks: 100 },
    motes: [[0, 0, 0]],
  });
  g.step({ pause: true });
  assert.equal(g.tick, 1);
  assert.equal(g.simTick, 0);
  assert.equal(g.snapshot().state, "paused");
  assert.equal(g.player.carried, 0);
  steps(g, 30, { pause: false });
  assert.equal(g.simTick, 0);
  assert.equal(g.player.pulseCd, 50);
  assert.equal(g.player.charm, 100);
  g.step({ pause: true });
  assert.equal(g.simTick, 1);
  assert.equal(g.player.pulseCd, 49);
  assert.equal(g.player.carried, 1);
  assert.equal(g.events[0].name, "resumed");
});
test("mote and shade exact spawn schedule; new spawns cannot interact until next tick", () => {
  const g = make({ random_motes: true, random_shades: true, motes: [] });
  steps(g, 239);
  assert.equal(g.motes.length, 0);
  g.step();
  assert.equal(g.motes.length, 1);
  steps(g, 59);
  assert.equal(g.shades.length, 0);
  g.step();
  assert.equal(g.shades.length, 2);
  assert.deepEqual(
    g.shades.map((s) => s.id),
    ["S1", "S2"],
  );
  assert.ok(g.shades.every((s) => s.state === "spawning"));
  steps(g, 480);
  assert.equal(g.shades.length, 3);
});
test("drifter steals before shade hit; safe/invulnerable player can still be robbed", () => {
  const g = make(
    {
      player: { carried: 9 },
      drifters: [{ pos: [0, 1, 0], state: "chase" }],
      shades: [{ pos: [0, 0, 0] }],
    },
    2,
  );
  g.step();
  const events = g.events.filter((e) =>
    ["drifter_steal", "player_hit"].includes(e.name),
  );
  assert.deepEqual(
    events.map((e) => e.name),
    ["drifter_steal", "player_hit"],
  );
  assert.equal(events[0].data.amount, 3);
  assert.equal(events[1].data.dropped, 3);
  assert.equal(g.player.carried, 3);
  const h = make(
    {
      player: { carried: 9, invuln_ticks: 90 },
      drifters: [{ pos: [0, 1, 0] }],
      lanterns: [{ id: "L1", pos: [0, 0, 0], lit: true }],
    },
    2,
  );
  h.step();
  assert.equal(h.player.carried, 6);
});
test("pulse scares chasing drifter; fleeing stolen motes drop and it expires after 120 ticks", () => {
  const g = make(
    {
      player: { carried: 10 },
      drifters: [{ id: "D1", pos: [0, 1, 0], state: "chase" }],
    },
    2,
  );
  g.step({ pulse: true });
  assert.equal(g.drifters[0].state, "flee");
  assert.equal(g.drifters[0].stolen, 0);
  const h = make(
    {
      player: { carried: 6 },
      drifters: [{ id: "D1", pos: [2, 1, 0], state: "flee", stolen: 3 }],
    },
    2,
  );
  h.step({ pulse: true });
  assert.equal(h.drifters[0].stolen, 0);
  assert.equal(h.motes.length, 3);
  assert.equal(h.events.find((e) => e.name === "drifter_drop").data.amount, 3);
  steps(h, 120);
  assert.equal(h.drifters.length, 0);
});
test("drifter spawn at tick1200, limit2, deterministic ID", () => {
  const g = make({ random_drifters: true, time_left_s: 300 }, 2);
  steps(g, 1199);
  assert.equal(g.drifters.length, 0);
  g.step();
  assert.equal(g.drifters[0].id, "D1");
});
test("charm gives 600 ticks, 7.2 speed, free dash cooldown; respawn2700", () => {
  const g = make({ charms: [{ id: "C1", pos: [0, 0, 0] }] }, 2);
  g.step();
  assert.equal(g.player.charm, 600);
  assert.equal(g.charms[0].respawn, 2700);
  g.step({ move: [1, 0] });
  assert.equal(g.player.vel[0], 7.2);
  g.step({ move: [0, 0], dash: true });
  assert.equal(g.player.dashCd, 0);
  steps(g, 599, { dash: false });
  assert.equal(g.player.charm, 0);
  g.player.pos = [0, 0, 10];
  g.player.grounded = true;
  steps(g, 2099);
  assert.equal(g.charms[0].available, true);
});
test("jump pads preserve launch velocity despite input and reach destination island", () => {
  const g = make({ player: { pos: [20, 0, 18] } }, 2);
  g.step();
  assert.equal(g.player.vel[1], 14);
  g.step({ move: [-1, 0] });
  assert.ok(g.player.vel[0] > 20);
  steps(g, 90);
  assert.ok(g.player.pos[0] > 45);
  assert.equal(g.player.grounded, true);
});
test("night3 ramp supports ascent, vertical wall blocks ascent and tower blocks", () => {
  const map = makeMap(3),
    a = Math.PI / 6;
  const g = make(
    { player: { pos: [30 * Math.cos(a), 0, 30 * Math.sin(a)] } },
    3,
  );
  steps(g, 55, { move: [-Math.cos(a), -Math.sin(a)] });
  assert.ok(g.player.pos[1] > 2.5);
  const wall = make({ player: { pos: [0, 0, 25] } }, 3);
  steps(wall, 20, { move: [0, -1] });
  assert.ok(wall.player.pos[2] >= 24);
  const tower = make({ player: { pos: [0, 6, 3] } }, 3);
  steps(tower, 30, { move: [0, -1] });
  assert.ok(tower.player.pos[2] >= 2);
});
test("night3 wind warning120 ticks and active300 ticks repeat deterministically", () => {
  const g = make({ wind_enabled: true, player: { pos: [35, 0, 0] } }, 3);
  steps(g, 1680);
  assert.equal(g.wind.warning, true);
  assert.equal(g.wind.active, false);
  steps(g, 120);
  assert.equal(g.wind.active, true);
  assert.equal(g.wind.warning, false);
  const before = [...g.player.pos];
  g.step();
  assert.ok(distance(before, g.player.pos) > 0);
  steps(g, 299);
  assert.equal(g.wind.active, false);
});

test("fractional scenario time is preserved in snapshot zero", () => {
  const g = make({ time_left_s: 123.456 });
  assert.equal(g.snapshot().time_left_s, 123.456);
  g.step();
  assert.equal(g.snapshot().time_left_s, 123.439);
});

test("charm replacement without pos resolves its own ID", () => {
  const g = make(
    { charms: [{ id: "C2", available: true }], player: { pos: [-30, 0, 25] } },
    3,
  );
  g.step();
  assert.equal(g.player.charm, 600);
  assert.equal(
    g.events.find((e) => e.name === "charm_picked").data.charm_id,
    "C2",
  );
});

test("night3 jump pad lands on tier two and retains launched movement", () => {
  const g = make({ player: { pos: [0, 3, 13] } }, 3);
  g.step();
  assert.equal(g.player.vel[1], 12);
  let landed = false;
  for (let i = 0; i < 80; i++) {
    g.step();
    if (g.player.grounded && g.player.pos[1] === 6) {
      landed = true;
      break;
    }
  }
  assert.ok(landed);
  assert.ok(g.player.pos[2] < 8);
});

test("dropped mote TTL expires at 480 gameplay ticks and freezes while paused", () => {
  const g = make(
    {
      player: { carried: 6 },
      drifters: [{ pos: [2, 1, 0], state: "flee", stolen: 3 }],
    },
    2,
  );
  g.step({ pulse: true });
  g.step({ pause: true });
  steps(g, 100, { pause: false });
  assert.equal(g.motes[0].ttl, 480);
  g.step({ pause: true });
  steps(g, 478, { pause: false });
  assert.equal(g.motes.length, 3);
  assert.equal(g.motes[0].ttl, 1);
  g.step();
  assert.equal(g.motes.length, 0);
});
