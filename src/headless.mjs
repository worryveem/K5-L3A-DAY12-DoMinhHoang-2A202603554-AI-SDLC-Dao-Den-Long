import { readFile, open } from "node:fs/promises";
import { parseArgs } from "node:util";
import { Game } from "./core/game.mjs";
import {
  InputError,
  validateInputs,
  validateScenario,
} from "./core/validation.mjs";
const config = JSON.parse(
  await readFile(new URL("../game.contract.json", import.meta.url), "utf8"),
);
try {
  const { values } = parseArgs({
    options: Object.fromEntries(
      [
        "seed",
        "night",
        "scenario",
        "inputs",
        "ticks",
        "out",
        "snapshot-every",
      ].map((k) => [k, { type: "string" }]),
    ),
  });
  for (const key of ["seed", "night", "ticks", "out"])
    if (values[key] === undefined) throw new InputError(`missing --${key}`);
  const number = (key, fallback, min) => {
    const raw = values[key] ?? String(fallback);
    if (!/^-?\d+$/.test(raw)) throw new InputError(`invalid --${key}`);
    const n = Number(raw);
    if (!Number.isSafeInteger(n) || n < min)
      throw new InputError(`invalid --${key}`);
    return n;
  };
  const seed = number("seed", 1, -2147483648),
    night = number("night", 1, 1),
    ticks = number("ticks", 0, 0),
    every = number("snapshot-every", 10, 1);
  if (night < 1 || night > 3) throw new InputError("--night must be 1, 2 or 3");
  const load = async (key, fallback) => {
    if (!values[key]) return fallback;
    try {
      return JSON.parse(await readFile(values[key], "utf8"));
    } catch (error) {
      throw new InputError(`${key}: ${error.message}`);
    }
  };
  const scenario = validateScenario(
      await load("scenario", {}),
      config.tuning,
      night,
    ),
    frames = validateInputs(await load("inputs", { frames: [] }));
  const game = new Game({ tuning: config.tuning, seed, night, scenario }),
    output = await open(values.out, "w");
  const write = async (value) => output.write(JSON.stringify(value) + "\n");
  let cursor = 0;
  try {
    await write(game.snapshot());
    for (
      let k = 0;
      k < ticks && (game.state === "playing" || game.state === "paused");
      k++
    ) {
      const patch = frames[cursor]?.tick === k ? frames[cursor++] : {};
      for (const event of game.step(patch)) await write(event);
      if (game.tick % every === 0) await write(game.snapshot());
    }
    await write(game.end());
  } finally {
    await output.close();
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode =
    error instanceof InputError ||
    error.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION" ||
    error.code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE"
      ? 2
      : 1;
}
