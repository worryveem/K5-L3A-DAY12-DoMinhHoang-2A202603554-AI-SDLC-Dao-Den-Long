export class InputError extends Error {}
const fail = (message) => {
  throw new InputError(message);
};
export const object = (x) =>
  x !== null && typeof x === "object" && !Array.isArray(x);
export const finite = (x) => typeof x === "number" && Number.isFinite(x);
export const integer = (x) => Number.isSafeInteger(x) && x >= 0;
export const vector = (x, length = 3) =>
  Array.isArray(x) && x.length === length && x.every(finite);
export function validateInputs(value) {
  if (!object(value) || !Array.isArray(value.frames))
    fail("inputs.frames must be an array");
  let previous = -1;
  for (const f of value.frames) {
    if (!object(f) || !integer(f.tick) || f.tick <= previous)
      fail("frame ticks must strictly increase");
    previous = f.tick;
    if (
      "move" in f &&
      (!vector(f.move, 2) || f.move.some((x) => Math.abs(x) > 1))
    )
      fail("move must be [x,z] in [-1,1]");
    if ("cam_yaw_deg" in f && !finite(f.cam_yaw_deg))
      fail("cam_yaw_deg must be finite");
    for (const key of ["jump", "interact", "pulse", "dash", "pause"]) {
      if (key in f && typeof f[key] !== "boolean")
        fail(`${key} must be boolean`);
    }
  }
  return value.frames;
}
export function validateScenario(value, tuning, night = 1) {
  if (!object(value)) fail("scenario must be an object");
  for (const key of [
    "random_motes",
    "random_shades",
    "random_drifters",
    "wind_enabled",
  ]) {
    if (key in value && typeof value[key] !== "boolean")
      fail(`${key} must be boolean`);
  }
  if (
    "time_left_s" in value &&
    (!finite(value.time_left_s) || value.time_left_s < 0)
  )
    fail("invalid time_left_s");
  if ("player" in value) {
    if (!object(value.player)) fail("invalid player");
    if ("pos" in value.player && !vector(value.player.pos))
      fail("invalid player.pos");
    for (const key of [
      "carried",
      "flames",
      "invuln_ticks",
      "dash_cd_ticks",
      "pulse_cd_ticks",
      "charm_ticks",
      "successful_lights",
    ]) {
      if (key in value.player && !integer(value.player[key]))
        fail(`invalid player.${key}`);
    }
    const capacity = Math.min(
      tuning.capacity_max,
      tuning.carry_capacity + 2 * (value.player.successful_lights ?? 0),
    );
    if ((value.player.carried ?? 0) > capacity)
      fail("player.carried exceeds capacity");
    if ((value.player.flames ?? 0) > tuning.flames)
      fail("player.flames exceeds maximum");
  }
  for (const key of ["motes", "shades", "lanterns", "drifters", "charms"]) {
    if (!(key in value)) continue;
    if (!Array.isArray(value[key])) fail(`${key} must be an array`);
    const ids = new Set();
    for (const item of value[key]) {
      if (key === "motes") {
        if (!vector(item)) fail("motes must contain [x,y,z]");
        continue;
      }
      if (!object(item)) fail(`invalid ${key} item`);
      if ("pos" in item && !vector(item.pos)) fail(`invalid ${key}.pos`);
      if (key !== "lanterns" && key !== "charms" && !("pos" in item))
        fail(`${key}.pos is required`);
      if ("id" in item) {
        if (typeof item.id !== "string" || !item.id || ids.has(item.id))
          fail(`invalid/duplicate ${key}.id`);
        ids.add(item.id);
      }
      if (key === "lanterns") {
        const count = [0, tuning.lantern_count_night1, 6, 7][night];
        if (!new RegExp(`^L[1-${count}]$`).test(item.id))
          fail("unknown lantern id");
        if ("lit" in item && typeof item.lit !== "boolean")
          fail("invalid lantern.lit");
        if ("ever_lit" in item && typeof item.ever_lit !== "boolean")
          fail("invalid lantern.ever_lit");
        if (
          "fuel" in item &&
          (!finite(item.fuel) || item.fuel < 0 || item.fuel > tuning.fuel_max)
        )
          fail("invalid lantern.fuel");
        if (
          "deposited" in item &&
          (!integer(item.deposited) || item.deposited > tuning.lantern_cost)
        )
          fail("invalid lantern.deposited");
      }
      if ("state_ticks_left" in item && !integer(item.state_ticks_left))
        fail("invalid state_ticks_left");
      if ("stolen" in item && !integer(item.stolen))
        fail("invalid drifter.stolen");
      if ("available" in item && typeof item.available !== "boolean")
        fail("invalid charm.available");
      if ("respawn_ticks" in item && !integer(item.respawn_ticks))
        fail("invalid charm.respawn_ticks");
      if (
        "respawn_s" in item &&
        (!finite(item.respawn_s) || item.respawn_s < 0)
      )
        fail("invalid charm.respawn_s");
      if (
        key === "shades" &&
        "state" in item &&
        !["spawning", "wander", "chase", "recoil", "stunned", "drain"].includes(
          item.state,
        )
      )
        fail("invalid shade.state");
      if (
        key === "shades" &&
        "target_lantern_id" in item &&
        item.target_lantern_id !== null
      ) {
        const count = [0, tuning.lantern_count_night1, 6, 7][night];
        if (
          typeof item.target_lantern_id !== "string" ||
          !new RegExp(`^L[1-${count}]$`).test(item.target_lantern_id)
        )
          fail("invalid shade.target_lantern_id");
      }
      if (
        key === "drifters" &&
        "state" in item &&
        !["idle", "chase", "flee", "removed"].includes(item.state)
      )
        fail("invalid drifter.state");
    }
  }
  return value;
}
