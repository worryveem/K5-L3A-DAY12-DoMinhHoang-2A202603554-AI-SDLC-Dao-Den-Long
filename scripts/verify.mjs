import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, arch, totalmem } from "node:os";
import { createHash } from "node:crypto";
const phase = process.argv[process.argv.indexOf("--phase") + 1];
if (!["1", "2", "3", "4"].includes(phase)) {
  console.error("Usage: npm run verify -- --phase 1|2|3|4");
  process.exit(2);
}
const dir = `docs/proof/phase-${phase}`;
await mkdir(dir, { recursive: true });
const run = spawnSync(process.execPath, ["--test"], { encoding: "utf8" });
const log = run.stdout + run.stderr;
await writeFile(`${dir}/tests.txt`, log);
process.stdout.write(log);
const git = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
await writeFile(
  `${dir}/environment.json`,
  JSON.stringify(
    {
      recorded_at: new Date().toISOString(),
      phase,
      node: process.version,
      platform: platform(),
      arch: arch(),
      cpu: cpus()[0]?.model,
      memory_gb: Math.round(totalmem() / 1024 ** 3),
      base_commit: git.stdout.trim(),
      working_tree:
        "Evidence generated before phase commit; tracked with that commit.",
      test_exit_code: run.status,
      test_output_sha256: createHash("sha256").update(log).digest("hex"),
    },
    null,
    2,
  ) + "\n",
);
process.exitCode = run.status ?? 1;
