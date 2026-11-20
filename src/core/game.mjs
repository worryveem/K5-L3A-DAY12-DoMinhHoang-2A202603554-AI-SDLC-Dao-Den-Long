import { random } from "./random.mjs";
import { makeMap, groundHeight, isTower } from "./maps.mjs";
export const DT = 1 / 60;
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const distance3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const rounded = (x) => Math.round(x * 1000) / 1000 || 0;
export const posOut = (p) => p.map(rounded);
export const idCompare = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const numericIds = (a, b) =>
  Number(a.id.slice(1)) - Number(b.id.slice(1)) || idCompare(a, b);
const direction = (from, to) => {
  const dx = to[0] - from[0],
    dz = to[2] - from[2],
    d = Math.hypot(dx, dz);
  return d ? [dx / d, dz / d] : [1, 0];
};
const EPS = 1e-9;
export class Game {
  constructor({
    tuning,
    seed = 1,
    night = 1,
    scenario = {},
    spawnPos = [0, 0, 0],
  }) {
    this.t = tuning;
    this.rng = random(seed);
    this.night = night;
    this.map = makeMap(night);
    this.tick = 0;
    this.simTick = 0;
    this.state = "playing";
    this.events = [];
    this.score = 0;
    this.timeTicks =
      (scenario.time_left_s ?? tuning[`night${night}_duration_s`]) * 60;
    this.input = {
      move: [0, 0],
      cam_yaw_deg: 0,
      jump: false,
      interact: false,
      pulse: false,
      dash: false,
      pause: false,
    };
    const p = scenario.player ?? {};
    this.spawnPos = [...spawnPos];
    this.player = {
      pos: [...(p.pos ?? spawnPos)],
      vel: [0, 0, 0],
      grounded: false,
      carried: p.carried ?? 0,
      successfulLights: p.successful_lights ?? 0,
      flames: p.flames ?? tuning.flames,
      invuln: p.invuln_ticks ?? 0,
      dashCd: p.dash_cd_ticks ?? 0,
      pulseCd: p.pulse_cd_ticks ?? 0,
      charm: p.charm_ticks ?? 0,
      dashLeft: 0,
      dashDir: [0, 1],
      facing: [0, 1],
      launched: false,
      launchVel: [0, 0],
      respawnLeft: 0,
    };
    this.player.grounded =
      Math.abs(
        this.player.pos[1] -
          (groundHeight(this.map, this.player.pos[0], this.player.pos[2]) ??
            -Infinity),
      ) < EPS;
    this.lanterns = this.map.lanterns.map((pos, i) => ({
      id: `L${i + 1}`,
      pos: [...pos],
      lit: false,
      deposited: 0,
      fuelUnits: 0,
      ever_lit: false,
      relit_count: 0,
    }));
    for (const patch of scenario.lanterns ?? []) {
      const l = this.lanterns.find((x) => x.id === patch.id);
      if (patch.pos) l.pos = [...patch.pos];
      l.deposited = patch.deposited ?? 0;
      l.ever_lit = patch.ever_lit ?? false;
      const cost = this.lightingCost(l);
      l.lit = patch.lit === true || l.deposited >= cost;
      if (l.lit) {
        l.ever_lit = true;
        // Normal gameplay uses integral 1/60 units. Preserve finer scenario values:
        // rounding here could move 29.999 above the exact safe-zone threshold.
        l.fuelUnits = (patch.fuel ?? tuning.fuel_max) * 60;
        l.deposited = patch.deposited ?? tuning.lantern_cost;
      }
    }
    this.randomMotes = scenario.random_motes !== false;
    this.randomShades = scenario.random_shades !== false;
    this.randomDrifters = scenario.random_drifters !== false;
    this.windEnabled = scenario.wind_enabled !== false;
    this.wind = { active: false, dir_deg: 0, warning: false };
    this.nextMote = 1;
    this.nextShade = 1;
    this.nextDrifter = 1;
    this.motes = [];
    this.shades = [];
    this.drifters = [];
    for (const s of scenario.shades ?? []) {
      const n = /^S(\d+)$/.exec(s.id ?? "");
      if (n) this.nextShade = Math.max(this.nextShade, Number(n[1]) + 1);
    }
    for (const d of scenario.drifters ?? []) {
      const n = /^D(\d+)$/.exec(d.id ?? "");
      if (n) this.nextDrifter = Math.max(this.nextDrifter, Number(n[1]) + 1);
    }
    if (scenario.motes) for (const pos of scenario.motes) this.addMote(pos);
    else if (this.randomMotes) {
      const points = [...this.map.motePoints];
      for (let i = 0; i < 20; i++) {
        const index = Math.floor(this.rng() * points.length);
        this.addMote(points.splice(index, 1)[0]);
      }
    }
    for (const s of scenario.shades ?? []) this.addShade(s);
    for (const d of scenario.drifters ?? []) this.addDrifter(d);
    this.charms = (
      scenario.charms ??
      this.map.charms.map((pos, i) => ({ id: `C${i + 1}`, pos }))
    ).map((c, i) => ({
      id: c.id ?? `C${i + 1}`,
      pos: [
        ...(c.pos ??
          this.map.charms[Number((c.id ?? `C${i + 1}`).slice(1)) - 1] ?? [
            0, 0, 0,
          ]),
      ],
      available: c.available ?? true,
      respawn: c.respawn_ticks ?? Math.round((c.respawn_s ?? 0) * 60),
    }));
  }
  event(name, data = {}) {
    this.events.push({ type: "event", tick: this.tick, name, data });
  }
  addMote(pos, kind = "random") {
    this.motes.push({
      id: `M${this.nextMote++}`,
      pos: [...pos],
      kind,
      ttl: kind === "dropped" ? 480 : null,
      ready: this.simTick + (kind === "dropped" ? 1 : 0),
    });
  }
  addShade(s) {
    const id = s.id ?? `S${this.nextShade++}`,
      n = /^S(\d+)$/.exec(id);
    if (n) this.nextShade = Math.max(this.nextShade, Number(n[1]) + 1);
    this.shades.push({
      id,
      pos: [...s.pos],
      state: s.state ?? "chase",
      stateTicks: s.state_ticks_left ?? 0,
      pushLeft: 0,
      pushDir: [1, 0],
      recoilLeft: 0,
      recoilDir: [1, 0],
      evacLeft: 0,
      targetLanternId: s.target_lantern_id ?? null,
      drainTicks: 0,
    });
    const shade = this.shades.at(-1);
    if (shade.state === "drain" && !shade.targetLanternId) {
      shade.targetLanternId =
        this.nearestLantern(
          shade.pos,
          (l) =>
            l.lit &&
            this.fuel(l) < this.t.low_fuel_threshold &&
            distance(l.pos, shade.pos) <= 2 + EPS,
        )?.id ?? null;
    }
  }
  addDrifter(d) {
    const id = d.id ?? `D${this.nextDrifter++}`,
      n = /^D(\d+)$/.exec(id);
    if (n) this.nextDrifter = Math.max(this.nextDrifter, Number(n[1]) + 1);
    this.drifters.push({
      id,
      pos: [...d.pos],
      state: d.state ?? "idle",
      stolen: d.stolen ?? 0,
      stateTicks: d.state_ticks_left ?? 240,
      dir: direction(this.player.pos, d.pos),
    });
  }
  get capacity() {
    return Math.min(
      this.t.capacity_max,
      this.t.carry_capacity + 2 * this.player.successfulLights,
    );
  }
  fuel(l) {
    return l.fuelUnits / 60;
  }
  fuelOut(l) {
    return Math.round(l.fuelUnits / 6) / 10;
  }
  lightingCost(l) {
    return l.ever_lit ? this.t.relight_cost : this.t.lantern_cost;
  }
  hasSafeZone(l) {
    return l.lit && l.fuelUnits >= this.t.low_fuel_threshold * 60;
  }
  acceptsMotes(l) {
    return !l.lit || l.fuelUnits < this.t.fuel_max * 60;
  }
  nearestLantern(pos, predicate) {
    return this.lanterns
      .filter(predicate)
      .sort(
        (a, b) =>
          distance(pos, a.pos) - distance(pos, b.pos) || idCompare(a, b),
      )[0];
  }
  isSafe(pos) {
    return this.lanterns.some(
      (l) =>
        this.hasSafeZone(l) && distance(l.pos, pos) <= this.t.safe_radius + EPS,
    );
  }
  advanceFuel() {
    // Integrate the tick-start drain states, then extinguish before player actions.
    const drains = this.shades.toSorted(numericIds).filter((s) => {
      const l = this.lanterns.find((l) => l.id === s.targetLanternId);
      return (
        s.state === "drain" &&
        !s.evacLeft &&
        l?.lit &&
        this.fuel(l) < this.t.low_fuel_threshold &&
        distance(s.pos, l.pos) <= 2 + EPS
      );
    });
    for (const l of this.lanterns)
      if (l.lit) l.fuelUnits -= this.t.fuel_decay_per_s;
    const reports = [];
    for (const s of drains) {
      const l = this.lanterns.find((l) => l.id === s.targetLanternId);
      l.fuelUnits -= this.t.drain_per_s;
      if (++s.drainTicks % 60 === 0) reports.push({ s, l });
    }
    for (const s of this.shades) if (!drains.includes(s)) s.drainTicks = 0;
    for (const l of this.lanterns) l.fuelUnits = Math.max(0, l.fuelUnits);
    for (const { s, l } of reports)
      this.event("fuel_drain", {
        lantern_id: l.id,
        shade_id: s.id,
        fuel: this.fuelOut(l),
      });
    for (const l of this.lanterns)
      if (l.lit && l.fuelUnits === 0) {
        l.lit = false;
        l.deposited = 0;
        this.event("lantern_out", { lantern_id: l.id });
      }
  }
  drop(count, center, ring = true) {
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2,
        r = ring ? 1.5 + this.rng() : 0;
      const x = center[0] + Math.cos(a) * r,
        z = center[2] + Math.sin(a) * r;
      this.addMote(
        [x, groundHeight(this.map, x, z) ?? center[1], z],
        "dropped",
      );
    }
  }
  step(patch = {}) {
    if (this.state === "won" || this.state === "lost") return [];
    this.events = [];
    const previous = { ...this.input };
    Object.assign(this.input, patch);
    const edge = (k) => this.input[k] && !previous[k];
    this.tick++;
    if (edge("pause")) {
      this.state = this.state === "paused" ? "playing" : "paused";
      this.event(this.state === "paused" ? "paused" : "resumed");
    }
    if (this.state === "paused") return this.events;
    this.simTick++;
    if (this.simTick === 1) this.event("night_start", { night: this.night });
    const p = this.player,
      t = this.t;
    this.timeTicks = Math.max(0, this.timeTicks - 1);
    for (const key of ["invuln", "dashCd", "pulseCd", "charm", "dashLeft"])
      p[key] = Math.max(0, p[key] - 1);
    for (const s of this.shades) s.stateTicks = Math.max(0, s.stateTicks - 1);
    for (const d of this.drifters)
      if (d.state === "flee") d.stateTicks = Math.max(0, d.stateTicks - 1);
    this.motes = this.motes.filter((m) => m.ttl === null || --m.ttl > 0);
    for (const c of this.charms)
      if (!c.available && c.respawn > 0 && --c.respawn === 0)
        c.available = true;
    this.advanceFuel();
    let skipPlayer = p.respawnLeft > 0;
    if (skipPlayer && --p.respawnLeft === 0) {
      p.pos = [...this.spawnPos];
      p.vel = [0, 0, 0];
      p.grounded =
        Math.abs(
          (groundHeight(this.map, p.pos[0], p.pos[2]) ?? -Infinity) - p.pos[1],
        ) < EPS;
      p.invuln = 90;
      p.launched = false;
      p.dashLeft = 0;
    }
    this.updateWind();
    if (!skipPlayer) {
      this.movePlayer(edge);
      if (p.pos[1] < -10) {
        const lost = p.carried;
        p.carried = 0;
        p.flames = Math.max(0, p.flames - 1);
        p.respawnLeft = 60;
        p.vel = [0, 0, 0];
        p.dashLeft = 0;
        p.launched = false;
        this.event("player_hit", {
          by: "fall",
          flames: p.flames,
          dropped: 0,
          lost,
        });
        skipPlayer = true;
      }
    }
    if (!skipPlayer) {
      this.motes = this.motes.filter((m) => {
        if (
          m.ready <= this.simTick &&
          p.carried < this.capacity &&
          distance(p.pos, m.pos) <= t.pickup_radius + EPS &&
          Math.abs(p.pos[1] - m.pos[1]) <= 1.5 + EPS
        ) {
          p.carried++;
          this.event("mote_picked", { carried: p.carried });
          return false;
        }
        return true;
      });
      for (const c of this.charms)
        if (
          c.available &&
          distance(p.pos, c.pos) <= t.pickup_radius + EPS &&
          Math.abs(p.pos[1] - c.pos[1]) <= 1.5 + EPS
        ) {
          c.available = false;
          c.respawn = 2700;
          p.charm = 600;
          p.dashCd = 0;
          this.event("charm_picked", { charm_id: c.id, charm_ticks: 600 });
        }
      if (edge("interact")) this.deposit();
    }
    this.updateSafeZones();
    if (!skipPlayer && edge("pulse")) this.pulse();
    this.moveShades();
    this.moveDrifters();
    if (!skipPlayer) this.collisions();
    this.spawn();
    this.finish();
    return this.events;
  }
  updateWind() {
    if (this.night !== 3 || !this.windEnabled) {
      this.wind.active = false;
      this.wind.warning = false;
      return;
    }
    const phase = this.simTick % 1800;
    if (phase === 1680) this.wind.dir_deg = this.rng() * 360;
    this.wind.warning = phase >= 1680;
    this.wind.active = this.simTick >= 1800 && phase < 300;
  }
  movePlayer(edge) {
    const p = this.player,
      t = this.t,
      [x, z] = this.input.move,
      a = (this.input.cam_yaw_deg * Math.PI) / 180,
      n = Math.max(1, Math.hypot(x, z));
    const dir = [
      (x * Math.cos(a) + z * Math.sin(a)) / n,
      (-x * Math.sin(a) + z * Math.cos(a)) / n,
    ];
    if (Math.hypot(...dir) > EPS)
      p.facing = direction([0, 0, 0], [dir[0], 0, dir[1]]);
    if (edge("jump") && p.grounded) {
      p.vel[1] = 7;
      p.grounded = false;
    }
    if (edge("dash") && !p.dashLeft && (p.dashCd === 0 || p.charm > 0)) {
      p.dashLeft = Math.round(t.dash_duration_s * 60);
      p.dashCd = p.charm ? 0 : Math.round(t.dash_cooldown_s * 60);
      p.dashDir = [...p.facing];
      this.event("dash");
    }
    let vx = dir[0] * (p.charm > 0 ? 7.2 : t.player_speed),
      vz = dir[1] * (p.charm > 0 ? 7.2 : t.player_speed);
    if (p.launched) [vx, vz] = p.launchVel;
    if (p.dashLeft) {
      vx = p.dashDir[0] * t.dash_speed;
      vz = p.dashDir[1] * t.dash_speed;
    }
    if (this.wind.active) {
      const a = (this.wind.dir_deg * Math.PI) / 180;
      vx += 2 * Math.cos(a);
      vz += 2 * Math.sin(a);
    }
    const old = [...p.pos];
    let nx = old[0] + vx * DT,
      nz = old[2] + vz * DT;
    const nh = groundHeight(this.map, nx, nz),
      oh = groundHeight(this.map, old[0], old[2]);
    if (
      isTower(this.map, nx, nz) ||
      (nh !== null && nh > old[1] + 0.25 && (oh === null || nh > oh + 0.25))
    ) {
      nx = old[0];
      nz = old[2];
      vx = 0;
      vz = 0;
    }
    p.pos[0] = nx;
    p.pos[2] = nz;
    p.vel[0] = vx;
    p.vel[2] = vz;
    const ground = groundHeight(this.map, nx, nz);
    if (p.grounded && (ground === null || old[1] > ground + 0.3))
      p.grounded = false;
    if (p.grounded && ground !== null) p.pos[1] = ground;
    else if (!p.dashLeft) {
      p.vel[1] -= 20 * DT;
      p.pos[1] += p.vel[1] * DT;
    }
    if (
      !p.grounded &&
      ground !== null &&
      p.vel[1] <= 0 &&
      old[1] >= ground - EPS &&
      p.pos[1] <= ground + EPS
    ) {
      p.pos[1] = ground;
      p.vel[1] = 0;
      p.grounded = true;
      p.launched = false;
    }
    if (p.grounded) {
      p.vel[1] = 0;
      for (const pad of this.map.pads)
        if (
          distance(p.pos, pad.pos) <= 1 + EPS &&
          Math.abs(p.pos[1] - pad.pos[1]) < 0.1
        ) {
          p.grounded = false;
          p.launched = true;
          p.vel[1] = pad.vy;
          const d = direction(pad.pos, pad.target);
          p.launchVel = [d[0] * pad.speed, d[1] * pad.speed];
          break;
        }
    }
  }
  deposit() {
    const p = this.player,
      t = this.t,
      l = this.lanterns
        .filter(
          (l) =>
            this.acceptsMotes(l) &&
            distance(p.pos, l.pos) <= t.interact_radius + EPS,
        )
        .sort(
          (a, b) =>
            distance(p.pos, a.pos) - distance(p.pos, b.pos) || idCompare(a, b),
        )[0];
    if (!l || !p.carried) return;
    if (l.lit) {
      const amount = Math.min(
        p.carried,
        Math.ceil((t.fuel_max * 60 - l.fuelUnits) / (t.fuel_per_mote * 60)),
      );
      if (amount === 0) return;
      l.fuelUnits = Math.min(
        t.fuel_max * 60,
        l.fuelUnits + amount * t.fuel_per_mote * 60,
      );
      p.carried -= amount;
      this.score += amount * t.score.per_mote;
      this.event("refuel", { lantern_id: l.id, amount, fuel: this.fuelOut(l) });
      return;
    }
    const cost = this.lightingCost(l);
    const amount = Math.min(p.carried, cost - l.deposited);
    p.carried -= amount;
    l.deposited += amount;
    this.score += amount * t.score.per_mote;
    this.event("deposit", { lantern_id: l.id, amount, deposited: l.deposited });
    if (l.deposited === cost) {
      const relight = l.ever_lit;
      l.lit = true;
      l.fuelUnits = t.fuel_max * 60;
      l.ever_lit = true;
      if (relight) l.relit_count++;
      p.successfulLights++;
      this.score += relight ? t.score.per_relight : t.score.per_lantern;
      this.event("lantern_lit", { lantern_id: l.id, relight });
    }
  }
  updateSafeZones() {
    for (const s of this.shades) {
      if (
        !s.evacLeft &&
        this.lanterns.some(
          (l) =>
            this.hasSafeZone(l) &&
            distance(s.pos, l.pos) < this.t.safe_radius - EPS,
        )
      )
        s.evacLeft = 30;
    }
  }
  pulse() {
    const p = this.player,
      t = this.t;
    if (p.pulseCd || p.carried < t.pulse_cost) return;
    p.carried -= t.pulse_cost;
    p.pulseCd = Math.round(t.pulse_cooldown_s * 60);
    const center = [p.pos[0], p.pos[1] + 0.8, p.pos[2]],
      stunned = [];
    for (const s of this.shades)
      if (distance3(center, s.pos) <= t.pulse_radius + EPS) {
        this.score +=
          s.state === "drain" ? t.score.per_drain_stun : t.score.per_stun;
        s.state = "stunned";
        s.targetLanternId = null;
        s.drainTicks = 0;
        s.stateTicks = 120;
        s.pushLeft = 15;
        s.pushDir = direction(p.pos, s.pos);
        s.recoilLeft = 0;
        stunned.push(s.id);
      }
    for (const d of this.drifters)
      if (
        d.state !== "removed" &&
        distance3(center, d.pos) <= t.pulse_radius + EPS
      ) {
        if (d.state === "chase") {
          d.state = "flee";
          d.stateTicks = 240;
          d.dir = direction(p.pos, d.pos);
        } else if (d.state === "flee" && d.stolen) {
          const amount = d.stolen;
          this.drop(amount, d.pos, false);
          d.stolen = 0;
          d.stateTicks = 120;
          this.event("drifter_drop", { drifter_id: d.id, amount });
        }
      }
    this.event("pulse", {
      stunned_ids: stunned.sort((a, b) => numericIds({ id: a }, { id: b })),
    });
  }
  shadeMove(s, dx, dz, blockSafe = true) {
    let next = [s.pos[0] + dx, s.pos[1], s.pos[2] + dz];
    if (blockSafe)
      for (const l of this.lanterns)
        if (
          this.hasSafeZone(l) &&
          distance(s.pos, l.pos) >= this.t.safe_radius - EPS &&
          distance(next, l.pos) < this.t.safe_radius
        ) {
          const d = direction(l.pos, next);
          next[0] = l.pos[0] + d[0] * this.t.safe_radius;
          next[2] = l.pos[2] + d[1] * this.t.safe_radius;
        }
    const oldGround = groundHeight(this.map, s.pos[0], s.pos[2]),
      newGround = groundHeight(this.map, next[0], next[2]);
    if (
      newGround === null ||
      isTower(this.map, next[0], next[2]) ||
      (oldGround !== null && Math.abs(newGround - oldGround) > 0.3)
    )
      return;
    next[1] = s.pos[1] + (newGround - (oldGround ?? newGround));
    s.pos = next;
  }
  moveShades({wanderOnly=false}={}) {
    const p = this.player,
      speed = this.night === 3 ? 4.5 : this.t.shade_speed;
    for (const s of this.shades) {
      let leftDrain = false;
      if (s.state === "drain") {
        const target = this.lanterns.find((l) => l.id === s.targetLanternId);
        if (distance(p.pos, s.pos) <= 6 + EPS && p.respawnLeft === 0) {
          s.state = "chase";
          s.targetLanternId = null;
          s.drainTicks = 0;
        } else if (
          !target?.lit ||
          this.fuel(target) >= this.t.low_fuel_threshold ||
          distance(s.pos, target.pos) > 2 + EPS
        ) {
          s.state = "wander";
          s.targetLanternId = null;
          s.drainTicks = 0;
          leftDrain = true;
        }
      }
      if (s.evacLeft) {
        const l = this.lanterns
          .filter(
            (l) =>
              this.hasSafeZone(l) &&
              distance(l.pos, s.pos) < this.t.safe_radius - EPS,
          )
          .sort((a, b) => distance(a.pos, s.pos) - distance(b.pos, s.pos))[0];
        if (l) {
          const d = direction(l.pos, s.pos),
            step = (this.t.safe_radius - distance(l.pos, s.pos)) / s.evacLeft;
          s.pos[0] += d[0] * step;
          s.pos[2] += d[1] * step;
          s.evacLeft--;
          continue;
        }
        s.evacLeft = 0;
      }
      if (leftDrain) continue;
      if (s.state === "drain") continue;
      if (s.state === "spawning") {
        if (s.stateTicks > 0) continue;
        s.state = "wander";
      }
      if (s.state === "stunned") {
        if (s.pushLeft > 0) {
          this.shadeMove(
            s,
            (s.pushDir[0] * this.t.pulse_push_m) / 15,
            (s.pushDir[1] * this.t.pulse_push_m) / 15,
          );
          s.pushLeft--;
        }
        if (s.stateTicks > 0) continue;
        s.state = "wander";
        s.targetLanternId = null;
        continue;
      }
      if (s.state === "recoil") {
        if (s.recoilLeft > 0) {
          this.shadeMove(
            s,
            (s.recoilDir[0] * 2) / 60,
            (s.recoilDir[1] * 2) / 60,
          );
          s.recoilLeft--;
          continue;
        }
        s.state = "wander";
      }
      const d = distance(p.pos, s.pos);
      if (s.state === "chase" && (d > 18 || p.respawnLeft > 0))
        s.state = "wander";
      if (!wanderOnly && s.state === "wander" && d <= 12 && p.respawnLeft === 0)
        s.state = "chase";
      if (s.state === "chase") {
        s.targetLanternId = null;
        const dir = direction(s.pos, p.pos),
          step = Math.min(d, speed * DT);
        this.shadeMove(s, dir[0] * step, dir[1] * step);
      } else {
        const weak = this.nearestLantern(
          s.pos,
          (l) => l.lit && this.fuel(l) < this.t.low_fuel_threshold,
        );
        const target = weak ?? this.nearestLantern(s.pos, (l) => !l.lit);
        s.targetLanternId = target?.id ?? null;
        if (target) {
          const d = distance(s.pos, target.pos),
            dir = direction(s.pos, target.pos),
            step = Math.min(d, speed * DT);
          if (!weak || d > 2 + EPS)
            this.shadeMove(s, dir[0] * step, dir[1] * step);
          if (weak && distance(s.pos, target.pos) <= 2 + EPS) {
            s.state = "drain";
            s.drainTicks = 0;
          }
        } else {
          const a =
            (this.simTick / 180 + Number(s.id.replace(/\D/g, ""))) * 1.3;
          this.shadeMove(s, Math.cos(a) * DT, Math.sin(a) * DT);
        }
      }
    }
  }
  moveDrifters() {
    const p = this.player;
    for (const d of this.drifters) {
      if (d.state === "removed") continue;
      if (d.state === "flee") {
        if (d.stateTicks === 0) {
          d.state = "removed";
          continue;
        }
        d.pos[0] += d.dir[0] * 7 * DT;
        d.pos[2] += d.dir[1] * 7 * DT;
        continue;
      }
      const eligible =
        p.carried >= 5 && distance(d.pos, p.pos) <= 15 + EPS && !p.respawnLeft;
      d.state = eligible ? "chase" : "idle";
      const dir =
          d.state === "chase"
            ? direction(d.pos, p.pos)
            : [Math.cos(this.simTick / 120), Math.sin(this.simTick / 120)],
        speed = d.state === "chase" ? 7 : 2;
      const step =
        d.state === "chase"
          ? Math.min(distance(d.pos, p.pos), speed * DT)
          : speed * DT;
      d.pos[0] += dir[0] * step;
      d.pos[2] += dir[1] * step;
    }
    this.drifters = this.drifters.filter((d) => d.state !== "removed");
  }
  collisions() {
    const p = this.player,
      t = this.t;
    for (const d of this.drifters.sort(numericIds))
      if (d.state === "chase" && distance(p.pos, d.pos) <= 1.2 + EPS) {
        const amount = Math.min(3, p.carried);
        p.carried -= amount;
        d.stolen = amount;
        d.state = "flee";
        d.stateTicks = 240;
        d.dir = direction(p.pos, d.pos);
        this.event("drifter_steal", {
          drifter_id: d.id,
          amount,
          carried: p.carried,
        });
      }
    if (p.invuln || this.isSafe(p.pos)) return;
    for (const s of this.shades.toSorted(numericIds))
      if (
        !s.evacLeft &&
        ["wander", "chase"].includes(s.state) &&
        distance(p.pos, s.pos) <= t.shade_hit_radius + EPS &&
        Math.abs(p.pos[1] - s.pos[1]) <= 1.5 + EPS
      ) {
        p.flames = Math.max(0, p.flames - 1);
        const dropped = Math.floor(p.carried / 2);
        p.carried -= dropped;
        p.invuln = 90;
        this.drop(dropped, p.pos);
        s.state = "recoil";
        s.stateTicks = 60;
        s.recoilLeft = 60;
        s.recoilDir = direction(p.pos, s.pos);
        this.event("player_hit", { by: "shade", flames: p.flames, dropped });
        break;
      }
  }
  spawn() {
    if (
      this.randomMotes &&
      this.simTick % 240 === 0 &&
      this.motes.filter((m) => m.kind === "random").length < 30
    ) {
      const points = this.map.motePoints.filter(
        (pos) =>
          !this.motes.some(
            (m) =>
              m.kind === "random" &&
              distance(pos, m.pos) < 0.01 &&
              Math.abs(pos[1] - m.pos[1]) < 0.01,
          ),
      );
      if (points.length)
        this.addMote(points[Math.floor(this.rng() * points.length)]);
    }
    if (
      this.randomShades &&
      (this.simTick === 300 ||
        (this.simTick > 300 &&
          (this.simTick - 300) % this.map.spawnInterval === 0))
    ) {
      const count = this.simTick === 300 ? 2 : 1;
      for (
        let i = 0;
        i < count && this.shades.length < this.map.maxShades;
        i++
      ) {
        const points = this.map.mistPoints.filter(
          (pos) =>
            distance(pos, this.player.pos) >= 15 &&
            !this.isSafe(pos) &&
            !this.shades.some((s) => distance(pos, s.pos) < 1),
        );
        if (!points.length) break;
        this.addShade({
          pos: points[Math.floor(this.rng() * points.length)],
          state: "spawning",
          state_ticks_left: 60,
        });
        this.event("shade_spawned", { id: this.shades.at(-1).id });
      }
    }
    if (
      this.night >= 2 &&
      this.randomDrifters &&
      this.simTick % 1200 === 0 &&
      this.drifters.length < 2
    )
      this.addDrifter({
        pos: this.map.mistPoints[
          Math.floor(this.rng() * this.map.mistPoints.length)
        ],
      });
  }
  finish() {
    const p = this.player,
      t = this.t;
    let reason;
    if (p.flames === 0) {
      this.state = "lost";
      reason = "no_flames";
    } else if (this.timeTicks === 0) {
      const lit = this.lanterns.filter((l) => l.lit);
      if (lit.length >= Math.ceil(t.win_ratio * this.lanterns.length)) {
        this.state = "won";
        reason = "dawn_survived";
        this.score +=
          lit.reduce(
            (total, l) =>
              total +
              t.score.per_lit_at_dawn +
              Math.floor(l.fuelUnits / 60) * t.score.per_fuel_at_dawn,
            0,
          ) +
          p.flames * t.score.per_flame_left;
      } else {
        this.state = "lost";
        reason = "dawn";
      }
    }
    if (reason) this.event("game_over", { result: this.state, reason });
  }
  snapshot() {
    const p = this.player;
    return {
      type: "snapshot",
      tick: this.tick,
      sim_tick: this.simTick,
      night: this.night,
      state: this.state,
      time_left_s: rounded(this.timeTicks / 60),
      score: this.score,
      wind: { active: this.wind.active, dir_deg: rounded(this.wind.dir_deg) },
      player: {
        pos: posOut(p.pos),
        vel: posOut(p.vel),
        grounded: p.grounded,
        flames: p.flames,
        carried: p.carried,
        capacity: this.capacity,
        invuln: p.invuln > 0,
        dash_cd_s: rounded(p.dashCd / 60),
        pulse_cd_s: rounded(p.pulseCd / 60),
        charm_s: rounded(p.charm / 60),
      },
      lanterns: this.lanterns.map((l) => ({
        id: l.id,
        pos: posOut(l.pos),
        lit: l.lit,
        deposited: l.deposited,
        fuel: this.fuelOut(l),
        ever_lit: l.ever_lit,
        relit_count: l.relit_count,
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: posOut(s.pos),
        state: s.state,
      })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({
        id: m.id,
        pos: posOut(m.pos),
        kind: m.kind,
        ttl_s: m.ttl === null ? null : rounded(m.ttl / 60),
      })),
      drifters: this.drifters.map((d) => ({
        id: d.id,
        pos: posOut(d.pos),
        state: d.state,
        stolen: d.stolen,
      })),
      charms: this.charms.map((c) => ({
        id: c.id,
        available: c.available,
        respawn_s: rounded(c.respawn / 60),
      })),
    };
  }
  end() {
    return {
      type: "end",
      ticks: this.tick,
      state: this.state,
      score: this.score,
    };
  }
}
