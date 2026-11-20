import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createGameServer } from "../src/server.mjs";
import { Leaderboard } from "../src/local/leaderboard.mjs";
const { values } = parseArgs({
  options: {
    "export-leaderboard": { type: "string" },
    port: { type: "string" },
  },
});
if (values["export-leaderboard"]) {
  await writeFile(
    values["export-leaderboard"],
    JSON.stringify(await new Leaderboard().read(), null, 2) + "\n",
  );
  console.log("Leaderboard exported");
} else {
  const server = createGameServer();
  server.listen(
    Number(values.port ?? process.env.PORT ?? 4173),
    "127.0.0.1",
    () =>
      console.log(`Đảo Đèn Lồng: http://localhost:${server.address().port}`),
  );
}
