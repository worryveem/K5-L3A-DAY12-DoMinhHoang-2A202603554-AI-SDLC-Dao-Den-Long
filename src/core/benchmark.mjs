import { Game } from "./game.mjs";
import { random } from "./random.mjs";
export function benchmarkCamera(seconds) {
  const a = (seconds * Math.PI * 2) / 15;
  return [30 * Math.cos(a), 15, 30 * Math.sin(a)];
}
export function makeBenchmark(tuning, seed = 42) {
  const rng = random(seed),
    points = (n, r, y) =>
      Array.from({ length: n }, (_, i) => {
        const a = i * Math.PI * (3 - Math.sqrt(5)) + rng() * 0.04,
          rad = r * Math.sqrt((i + 0.5) / n);
        return [Math.cos(a) * rad, y, Math.sin(a) * rad];
      });
  const game = new Game({
    tuning,
    seed,
    night: 1,
    scenario: {
      random_motes: false,
      random_shades: false,
      random_drifters: false,
      wind_enabled: false,
      motes: points(100, 39, 0),
      shades: points(200, 38, 1).map((pos, i) => ({
        id: `S${i + 1}`,
        pos,
        state: "wander",
      })),
      lanterns: [1, 2, 3].map((i) => ({ id: `L${i}`, lit: true, fuel: 100 })),
    },
  });
  return game;
}
export function stepBenchmark(game) {
  game.tick++;
  game.simTick++;
  game.updateSafeZones();
  game.moveShades({ wanderOnly: true });
}
export function frameStats(times) {
  if (
    !Array.isArray(times) ||
    !times.length ||
    times.some((x) => !Number.isFinite(x) || x <= 0)
  )
    throw Error("No valid rendered frame timings");
  const sorted = [...times].sort((a, b) => a - b),
    sum = times.reduce((s, x) => s + x, 0),
    k = Math.max(1, Math.ceil(times.length * 0.01)),
    slow = sorted.slice(-k);
  return {
    avg_fps: (1000 * times.length) / sum,
    p1_low_fps: 1000 / (slow.reduce((s, x) => s + x, 0) / k),
    frame_ms_p95: sorted[Math.max(0, Math.ceil(0.95 * times.length) - 1)],
    frames: times.length,
  };
}
