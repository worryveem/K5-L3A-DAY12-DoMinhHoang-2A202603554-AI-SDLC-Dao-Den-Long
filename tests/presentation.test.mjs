import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSettings,
  paletteFor,
  lanternAppearance,
} from "../public/presentation.mjs";
test("accessible palette uses exact cyan rim, white danger and non-color warning marker", () => {
  assert.deepEqual(paletteFor(true), {
    shadeRim: 0x00b3ff,
    warning: "#FFFFFF",
    marker: "⚠ ",
  });
  assert.deepEqual(paletteFor(false), {
    shadeRim: 0x7a3cff,
    warning: "#FF5A5F",
    marker: "",
  });
});
test("saved accessibility roundtrip and legacy settings keep valid defaults", () => {
  const saved = JSON.parse(
    JSON.stringify(
      normalizeSettings({
        volume: 0.6,
        sensitivity: 2,
        accessiblePalette: true,
      }),
    ),
  );
  assert.equal(normalizeSettings(saved).accessiblePalette, true);
  assert.equal(normalizeSettings({ volume: 0.5 }).accessiblePalette, false);
  assert.deepEqual(normalizeSettings(null), {
    volume: 0.35,
    sensitivity: 1,
    accessiblePalette: false,
  });
  assert.equal(
    normalizeSettings({
      volume: NaN,
      sensitivity: Infinity,
      accessiblePalette: "true",
    }).accessiblePalette,
    false,
  );
});
test("unlit lantern shape is collapsed20% with tears; lit one restores shape and fuel bar", () => {
  const off = lanternAppearance(false, 0, 0),
    on = lanternAppearance(true, 100, 0);
  assert.equal(off.scaleY, 0.8);
  assert.equal(off.torn, true);
  assert.equal(off.showFuel, false);
  assert.equal(on.scaleY, 1);
  assert.equal(on.torn, false);
  assert.equal(on.showFuel, true);
  assert.equal(on.fuelFraction, 1);
});
test("low-fuel blink has 1Hz period, two half-second phases, strict threshold30", () => {
  const sample = (t) => lanternAppearance(true, 29.99, t).blinkOn;
  assert.equal(sample(0), true);
  assert.equal(sample(0.499), true);
  assert.equal(sample(0.5), false);
  assert.equal(sample(0.999), false);
  assert.equal(sample(1), true);
  assert.equal(lanternAppearance(true, 30, 0.7).low, false);
  assert.equal(lanternAppearance(true, 30, 0.7).blinkOn, true);
});
