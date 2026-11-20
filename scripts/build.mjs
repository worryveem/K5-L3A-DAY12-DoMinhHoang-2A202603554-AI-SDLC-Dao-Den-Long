import { mkdir, cp, copyFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
if (existsSync("node_modules/electron"))
  createRequire(import.meta.url)("electron");
await mkdir("dist/vendor", { recursive: true });
await cp("public", "dist", { recursive: true });
await cp("src", "dist/src", { recursive: true });
await copyFile("game.contract.json", "dist/game.contract.json");
await mkdir("dist/evidence", { recursive: true });
for (const [source, target] of [
  ["bench.json", "bench.json"],
  ["soak.json", "soak.json"],
  ["docs/proof/phase-4/tests.txt", "tests.txt"],
  ["docs/proof/phase-4/headless.jsonl", "headless.jsonl"],
])
  if (existsSync(source)) await copyFile(source, `dist/evidence/${target}`);
for (const file of ["three.module.js", "three.core.js"])
  await copyFile(`node_modules/three/build/${file}`, `dist/vendor/${file}`);
const license = await readFile("node_modules/three/LICENSE", "utf8");
await import("node:fs/promises").then((fs) =>
  fs.writeFile("dist/vendor/THREE-LICENSE.txt", license),
);
console.log("Static game built in dist/");
