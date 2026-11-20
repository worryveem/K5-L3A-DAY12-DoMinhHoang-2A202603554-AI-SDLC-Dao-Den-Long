import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { addEntry, topEntries } from "./leaderboard-core.mjs";
export class Leaderboard {
  constructor(directory = process.env.LANTERN_DATA_DIR ?? ".local") {
    this.directory = resolve(directory);
    this.file = join(this.directory, "leaderboard.json");
    this.queue = Promise.resolve();
  }
  async read() {
    try {
      const value = JSON.parse(await readFile(this.file, "utf8"));
      return { entries: topEntries(value.entries) };
    } catch (error) {
      if (error.code === "ENOENT") return { entries: [] };
      throw error;
    }
  }
  async add(entry) {
    const task = this.queue.then(async () => {
      const { entries } = await this.read();
      const next = { entries: addEntry(entries, entry) };
      await mkdir(this.directory, { recursive: true });
      const temp = join(this.directory, `leaderboard-${randomUUID()}.tmp`);
      await writeFile(temp, JSON.stringify(next, null, 2) + "\n", "utf8");
      await rename(temp, this.file);
      return next;
    });
    this.queue = task.catch(() => {});
    return task;
  }
}
