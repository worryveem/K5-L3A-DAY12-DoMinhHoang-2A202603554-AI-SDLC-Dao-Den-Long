import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { Leaderboard } from "./local/leaderboard.mjs";
export function createGameServer({ root = resolve("dist"), dataDir } = {}) {
  const board = new Leaderboard(dataDir),
    types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css",
      ".mjs": "text/javascript",
      ".js": "text/javascript",
      ".json": "application/json",
      ".txt": "text/plain",
      ".png": "image/png",
      ".mp4": "video/mp4",
    };
  const json = (res, status, value) =>
    res
      .writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      })
      .end(JSON.stringify(value));
  return createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/leaderboard") {
      try {
        if (req.method === "GET") return json(res, 200, await board.read());
        if (req.method !== "POST")
          return json(res, 405, { error: "Method not allowed" });
        if (
          req.headers.origin &&
          new URL(req.headers.origin).host !== req.headers.host
        )
          return json(res, 403, { error: "Origin not allowed" });
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 16384)
            return json(res, 413, { error: "Entry too large" });
        }
        return json(res, 200, await board.add(JSON.parse(body)));
      } catch (error) {
        return json(
          res,
          error instanceof SyntaxError ||
            /Invalid|Tên|requires/.test(error.message)
            ? 400
            : 500,
          { error: error.message },
        );
      }
    }
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405).end();
        return;
      }
      const path = resolve(root, "." + decodeURIComponent(url.pathname));
      if (path !== root && !path.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const file = (await stat(path)).isDirectory()
          ? resolve(path, "index.html")
          : path,
        body = await readFile(file);
      res
        .writeHead(200, {
          "content-type": types[extname(file)] ?? "application/octet-stream",
          "cache-control": "no-cache",
        })
        .end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
}
