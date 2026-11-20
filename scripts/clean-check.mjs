import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
const phase = process.argv[2] ?? "2",
  npmCli = process.env.npm_execpath;
if (!npmCli) throw Error("Run through npm: npm run verify:clean -- 2");
if (!["1", "2", "3", "4"].includes(phase)) throw Error("Phase must be 1..4");
const root = process.cwd(),
  out = `docs/proof/phase-${phase}`;
await mkdir(out, { recursive: true });
const directory = await mkdtemp(join(tmpdir(), "lantern-clean-")),
  logs = [];
let server;
const run = (exe, args) => {
  const r = spawnSync(exe, args, { cwd: directory, encoding: "utf8" });
  logs.push(
    `$ ${exe === process.execPath ? "node" : exe} ${args.join(" ")}\n${r.stdout ?? ""}${r.stderr ?? ""}`,
  );
  if (r.status !== 0)
    throw Error(`Clean checkout check failed: ${args.join(" ")}`);
  return r.stdout;
};
try {
  run("git", ["clone", "--no-hardlinks", root, "."]);
  run(process.execPath, [npmCli, "ci", "--no-audit", "--no-fund"]);
  run(process.execPath, [npmCli, "run", "build"]);
  run(process.execPath, [npmCli, "test"]);
  server = spawn(process.execPath, ["scripts/serve.mjs"], {
    cwd: directory,
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const port = await new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(
      () => reject(Error("Clean preview timed out")),
      10000,
    );
    server.once("error", reject);
    server.stdout.on("data", (chunk) => {
      output += chunk;
      const match = /localhost:(\d+)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    server.once("exit", (code) => {
      clearTimeout(timer);
      if (code) reject(Error(`Clean preview exited ${code}`));
    });
  });
  const routes = [];
  for (const path of [
    "/",
    "/app.mjs",
    "/view.mjs",
    "/src/core/game.mjs",
    "/vendor/three.module.js",
  ]) {
    const r = await fetch(`http://localhost:${port}${path}`);
    if (!r.ok) throw Error(`Clean HTTP ${path}: ${r.status}`);
    routes.push({ path, status: r.status });
  }
  const commit = run("git", ["rev-parse", "HEAD"]).trim();
  await writeFile(
    `${out}/clean-check.json`,
    JSON.stringify(
      {
        recorded_at: new Date().toISOString(),
        commit,
        install: "passed",
        build: "passed",
        tests: "passed",
        http: routes,
        visual_browser_check: "not performed",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Clean clone ${commit}: install, build, tests, HTTP passed`);
} finally {
  if (server && !server.killed) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  await writeFile(`${out}/clean-check.txt`, logs.join("\n"));
  // Resolve and check the exact generated target before recursive Windows cleanup.
  const absolute = resolve(directory),
    tempRoot = resolve(tmpdir());
  if (
    !absolute.startsWith(tempRoot + sep) ||
    !absolute.slice(tempRoot.length + 1).startsWith("lantern-clean-")
  )
    throw Error("Refusing cleanup outside generated temporary checkout");
  await rm(absolute, { recursive: true, force: true });
}
