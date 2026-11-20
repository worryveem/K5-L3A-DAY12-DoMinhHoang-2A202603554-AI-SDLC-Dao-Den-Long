import { normalizeBindings } from "./bindings.mjs";
export function normalizeSettings(value = {}) {
  return {
    volume: Number.isFinite(value?.volume)
      ? Math.min(1, Math.max(0, value.volume))
      : 0.35,
    sensitivity: Number.isFinite(value?.sensitivity)
      ? Math.min(3, Math.max(0.2, value.sensitivity))
      : 1,
    accessiblePalette: value?.accessiblePalette === true,
    reducedMotion: value?.reducedMotion === true,
    largeText: value?.largeText === true,
    bindings: normalizeBindings(value?.bindings),
  };
}
export function paletteFor(accessible) {
  return {
    shadeRim: accessible ? 0x00b3ff : 0x7a3cff,
    warning: accessible ? "#FFFFFF" : "#FF5A5F",
    marker: accessible ? "⚠ " : "",
  };
}
export function lanternAppearance(lit, fuel, time) {
  const low = lit && fuel < 30;
  return {
    scaleY: lit ? 1 : 0.8,
    torn: !lit,
    showFuel: lit,
    fuelFraction: Math.max(0, Math.min(1, fuel / 100)),
    low,
    blinkOn: !low || Math.floor(time * 2) % 2 === 0,
  };
}
