const { app, BrowserWindow, ipcMain } = require("electron");
const { parseArgs } = require("node:util");
const { resolve, dirname } = require("node:path");
const { writeFile, mkdir } = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: Object.fromEntries(
    ["mode", "seed", "duration", "out", "started-at", "screenshot"].map((k) => [
      k,
      { type: "string" },
    ]),
  ),
});
const started = Number(values["started-at"] ?? Date.now()),
  mode = values.mode ?? "bench",
  out = resolve(values.out);
let window,
  server,
  loadMs,
  done = false;
let encoder,
  recordTimer,
  recordFrames = 0,
  recordStarted,
  recordBusy = false,
  encoderLog = "",
  lastRecordedPNG,
  captureQueue = Promise.resolve();
function capturePNG() {
  const next = captureQueue.then(async () => {
    const bitmap = await window.capturePage(undefined, { stayAwake: true });
    if (bitmap.isEmpty()) throw Error("Empty rendered bitmap");
    return bitmap.toPNG();
  });
  captureQueue = next.catch(() => {});
  return next;
}
process.on("unhandledRejection", (error) => {
  console.error(error);
  app.exit(1);
});
if (mode === "bench") {
  app.commandLine.appendSwitch("disable-frame-rate-limit");
  app.commandLine.appendSwitch("disable-gpu-vsync");
}
app.commandLine.appendSwitch("force_high_performance_gpu");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
if (mode !== "bench")
  app.commandLine.appendSwitch(
    "disable-features",
    "CalculateNativeWinOcclusion",
  );
app.on("window-all-closed", () => {
  app.exit(done ? 0 : 1);
});
app
  .whenReady()
  .then(async () => {
    const { createGameServer } = await import(
      pathToFileURL(resolve("src/server.mjs")).href
    );
    server = createGameServer({ dataDir: resolve(".work/electron-data") });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    window = new BrowserWindow({
      width: 1280,
      height: 720,
      useContentSize: true,
      show: true,
      autoHideMenuBar: true,
      resizable: false,
      fullscreen: false,
      backgroundColor: "#0E1430",
      title: "Đảo Đèn Lồng · benchmark",
      webPreferences: {
        preload: resolve("scripts/electron-preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        backgroundThrottling: false,
      },
    });
    window.setMenu(null);
    ipcMain.handle("config", () => ({
      mode,
      seed: Number(values.seed),
      duration: Number(values.duration),
    }));
    ipcMain.handle("first-frame", async () => {
      loadMs ??= Date.now() - started;
      if (mode === "demo" && !encoder) {
        await mkdir(dirname(out), { recursive: true });
        encoder = spawn(
          require("ffmpeg-static"),
          [
            "-y",
            "-loglevel",
            "error",
            "-f",
            "image2pipe",
            "-framerate",
            "15",
            "-vcodec",
            "png",
            "-i",
            "pipe:0",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "24",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            resolve(dirname(out), "demo.mp4"),
          ],
          { stdio: ["pipe", "ignore", "pipe"] },
        );
        encoder.stderr.on("data", (chunk) => (encoderLog += chunk));
        recordStarted = Date.now();
        recordTimer = setInterval(async () => {
          if (recordBusy || done) return;
          recordBusy = true;
          try {
            const png = await capturePNG();
            lastRecordedPNG = png;
            const target = Math.floor(
              ((Date.now() - recordStarted) / 1000) * 15,
            );
            do {
              if (!encoder.stdin.write(png))
                await new Promise((r) => encoder.stdin.once("drain", r));
              recordFrames++;
            } while (recordFrames < target);
          } catch (error) {
            console.error(error);
          } finally {
            recordBusy = false;
          }
        }, 1000 / 15);
      }
      return loadMs;
    });
    ipcMain.handle("capture", async (_event, label) => {
      if (values.screenshot) {
        const target =
          typeof label === "string" && /^[a-z-]+$/.test(label)
            ? values.screenshot.replace(/\.png$/i, `-${label}.png`)
            : values.screenshot;
        await mkdir(dirname(resolve(values.screenshot)), { recursive: true });
        await writeFile(target, lastRecordedPNG ?? (await capturePNG()));
      }
      return true;
    });
    ipcMain.handle("complete", async (_event, data) => {
      if (done) return;
      done = true;
      await mkdir(dirname(out), { recursive: true });
      let video;
      if (encoder) {
        clearInterval(recordTimer);
        while (recordBusy) await new Promise((r) => setTimeout(r, 20));
        encoder.stdin.end();
        const code = await new Promise((r) => encoder.once("close", r));
        if (code !== 0) throw Error("Video encoding failed: " + encoderLog);
        video = {
          file: "demo.mp4",
          frames: recordFrames,
          fps: 15,
          duration_s: recordFrames / 15,
          audio: false,
          recording:
            "Actual Electron page capture; automated replay, not manual input",
        };
      }
      const report =
        mode === "bench"
          ? {
              contract_version: "1.3",
              avg_fps: data.avg_fps,
              p1_low_fps: data.p1_low_fps,
              frame_ms_p95: data.frame_ms_p95,
              frames: data.frames,
              load_ms: loadMs,
              peak_mem_mb: null,
              vsync_off: mode === "bench",
              renderer: `Three.js r${data.three_revision ?? "unknown"} / WebGL2 / Electron ${process.versions.electron} / Chromium ${process.versions.chrome}`,
              os: `${process.platform} ${require("node:os").release()} ${process.arch}`,
            }
          : { ...data, load_ms: loadMs, video };
      await writeFile(out, JSON.stringify(report, null, 2) + "\n");
      if (Array.isArray(data.frame_times_ms))
        await writeFile(
          out.replace(/\.json$/i, "") + ".frames.json",
          JSON.stringify(data.frame_times_ms) + "\n",
        );
      await writeFile(
        out.replace(/\.json$/i, "") + ".details.json",
        JSON.stringify({ ...data, frame_times_ms: undefined }, null, 2) + "\n",
      );
      console.log(JSON.stringify({ ...report, frame_times_ms: undefined }));
      server.close();
      setTimeout(() => app.exit(data.error ? 1 : 0), 100);
      return true;
    });
    window.webContents.on("console-message", (_event, ...args) => {
      const details = args.find((x) => x && typeof x === "object");
      if (details?.level === "error" || args[0] === 3)
        console.error("Renderer:", details?.message ?? args[1]);
    });
    window.webContents.on("render-process-gone", (_e, details) => {
      console.error("Renderer gone", details.reason);
      app.exit(1);
    });
    await window.loadURL(
      `http://127.0.0.1:${server.address().port}/${mode === "bench" ? "bench.html" : "index.html"}${mode === "bench" ? "" : "?capture=1"}`,
    );
    setTimeout(
      () => {
        if (!done) {
          console.error("Renderer timed out");
          app.exit(1);
        }
      },
      (Number(values.duration) + 45) * 1000,
    ).unref();
  })
  .catch((error) => {
    console.error(error);
    app.exit(1);
  });
