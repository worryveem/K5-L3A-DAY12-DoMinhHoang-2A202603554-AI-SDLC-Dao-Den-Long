import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { Game } from "./core/game.mjs";
import { random } from "./core/random.mjs";
const { values } = parseArgs({
  options: Object.fromEntries(
    ["seed", "nights", "out"].map((k) => [k, { type: "string" }]),
  ),
});
const seed = Number(values.seed ?? 7),
  nights = Number(values.nights ?? 10);
if (
  !Number.isSafeInteger(seed) ||
  !Number.isInteger(nights) ||
  nights < 1 ||
  !values.out
) {
  console.error("Usage: soak --seed 7 --nights 10 --out soak.json");
  process.exit(2);
}
const { tuning } = JSON.parse(
  await readFile(new URL("../game.contract.json", import.meta.url), "utf8"),
);
const rss = () => process.memoryUsage.rss() / 1024 ** 2;
let game = new Game({ tuning, seed, night: 1 });
global.gc?.();
const memStart = rss(),
  start = performance.now(),
  results = [],
  details = [];
let crashes = 0;
for (let i = 0; i < nights; i++) {
  const night = (i % 3) + 1,
    nightSeed = seed + i,
    inputRng = random(nightSeed);
  if (i) game = new Game({ tuning, seed: nightSeed, night });
  try {
    let move = [0, 0];
    const maxTicks = tuning[`night${night}_duration_s`] * 60;
    for (let k = 0; k < maxTicks && game.state === "playing"; k++) {
      if (k % 30 === 0) move = [inputRng() * 2 - 1, inputRng() * 2 - 1];
      game.step({
        move,
        jump: inputRng() < 0.05,
        dash: inputRng() < 0.03,
        pulse: inputRng() < 0.02,
        interact: inputRng() < 0.1,
      });
    }
    results.push(game.state);
    details.push({
      night,
      seed: nightSeed,
      ticks: game.tick,
      result: game.state,
      pid: process.pid,
    });
  } catch (error) {
    crashes++;
    results.push("crashed");
    details.push({ night, seed: nightSeed, error: error.message });
  }
  // Release the old run before measuring the final reset, without retaining game histories.
  game = new Game({ tuning, seed: nightSeed, night });
  global.gc?.();
}
global.gc?.();
const output = {
  nights,
  crashes,
  results,
  mem_start_mb: memStart,
  mem_end_mb: rss(),
  duration_s: (performance.now() - start) / 1000,
};
await writeFile(values.out, JSON.stringify(output, null, 2) + "\n");
await writeFile(
  values.out.replace(/\.json$/i, "") + ".details.json",
  JSON.stringify(
    {
      seed,
      process_id: process.pid,
      details,
      gc_at_boundaries: Boolean(global.gc),
      input_policy: {
        direction_every_ticks: 30,
        jump: 0.05,
        dash: 0.03,
        pulse: 0.02,
        interact: 0.1,
      },
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(output));
if (crashes || output.mem_end_mb > 1.2 * memStart) process.exitCode = 1;
