import { View, THREE } from "./view.mjs";
import {
  makeBenchmark,
  stepBenchmark,
  benchmarkCamera,
  frameStats,
} from "/src/core/benchmark.mjs";
try {
  const config = await window.lanternHost.config(),
    { tuning } = await fetch("/game.contract.json").then((r) => r.json());
  const game = makeBenchmark(tuning, config.seed),
    view = new View(document.getElementById("world"));
  view.renderer.setPixelRatio(1);
  view.renderer.setSize(1280, 720);
  view.load(game, { standardScene: true });
  let start,
    last,
    measureStart,
    previousMeasured,
    accumulator = 0,
    captured = false;
  const times = [];
  function frame(now) {
    try {
      if (start === undefined) {
        start = last = now;
      }
      const dt = (now - last) / 1000;
      last = now;
      accumulator += dt;
      while (accumulator >= 1 / 60) {
        stepBenchmark(game);
        accumulator -= 1 / 60;
      }
      const seconds = (now - start) / 1000;
      view.render(game, {
        time: seconds,
        dt,
        yaw: 0,
        cameraPosition: benchmarkCamera(seconds),
        standardScene: true,
      });
      if (seconds === 0) window.lanternHost.firstFrame();
      if (seconds >= 3) {
        measureStart ??= now;
        if (
          previousMeasured !== undefined &&
          now - measureStart <= config.duration * 1000
        )
          times.push(now - previousMeasured);
        previousMeasured = now;
        if (!captured) {
          captured = true; /* Captures outside the measured interval are handled after measurement. */
        }
        if (now - measureStart >= config.duration * 1000) {
          const stats = frameStats(times);
          window.lanternHost
            .capture()
            .then(() =>
              window.lanternHost.complete({
                ...stats,
                three_revision: THREE.REVISION,
                frame_times_ms: times,
                measured_duration_s: config.duration,
                scene: {
                  shades: game.shades.length,
                  motes: game.motes.length,
                  lit: game.lanterns.filter((l) => l.lit).length,
                  player: game.player.pos,
                  creative: false,
                },
              }),
            );
          return;
        }
      }
      requestAnimationFrame(frame);
    } catch (error) {
      document.getElementById("error").textContent = error.message;
      window.lanternHost.complete({ error: error.stack });
    }
  }
  requestAnimationFrame(frame);
} catch (error) {
  document.getElementById("error").textContent = error.message;
  window.lanternHost?.complete({ error: error.stack });
}
