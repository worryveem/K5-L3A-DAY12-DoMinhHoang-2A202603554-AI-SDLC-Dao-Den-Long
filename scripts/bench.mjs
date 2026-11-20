import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
const { values } = parseArgs({
  options: {
    seed: { type: "string" },
    duration: { type: "string" },
    out: { type: "string" },
    mode: { type: "string" },
    screenshot: { type: "string" },
  },
});
const seed = Number(values.seed ?? 42),
  duration = Number(values.duration ?? 30);
if (
  !Number.isSafeInteger(seed) ||
  !Number.isFinite(duration) ||
  duration <= 0 ||
  !values.out
) {
  console.error("bench --seed 42 --duration 30 --out bench.json");
  process.exit(2);
}
const electron = createRequire(import.meta.url)("electron");
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(
  electron,
  [
    "scripts/electron-main.cjs",
    "--mode",
    values.mode ?? "bench",
    "--seed",
    String(seed),
    "--duration",
    String(duration),
    "--out",
    values.out,
    "--started-at",
    String(Date.now() - process.uptime() * 1000),
    ...(values.screenshot ? ["--screenshot", values.screenshot] : []),
  ],
  { stdio: "inherit", env },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
  if (code === 0 && !existsSync(values.out)) {
    console.error("Renderer exited without a measurement file");
    process.exitCode = 1;
  }
});
