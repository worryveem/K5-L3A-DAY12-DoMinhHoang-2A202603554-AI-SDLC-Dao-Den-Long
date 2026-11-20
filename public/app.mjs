import { Game, DT, distance } from "/src/core/game.mjs";
import { makeMap } from "/src/core/maps.mjs";
import { View } from "./view.mjs";
import { Audio } from "./audio.mjs";
import { normalizeSettings, paletteFor } from "./presentation.mjs";
import {
  defaults,
  actionNames,
  updateBinding,
  keyLabel,
  matchesBinding,
} from "./bindings.mjs";
import { loadLeaderboard, saveScore } from "./storage.mjs";
const $ = (id) => document.getElementById(id);
try {
  const captureConfig = window.lanternHost
    ? await window.lanternHost.config()
    : null;
  const demoScenario =
    captureConfig?.mode === "demo"
      ? await fetch("/demo.scenario.json").then((r) => r.json())
      : null;
  const demoFrames =
    captureConfig?.mode === "demo"
      ? (await fetch("/demo.inputs.json").then((r) => r.json())).frames
      : [];
  let replayCursor = 0;
  const { tuning: t } = await fetch("/game.contract.json").then((r) =>
    r.json(),
  );
  const view = new View($("world"));
  let settings = normalizeSettings();
  try {
    const value = JSON.parse(localStorage.getItem("lantern-settings") ?? "{}");
    settings = normalizeSettings(value);
  } catch {}
  function applyPalette() {
    view.setAccessibility(settings.accessiblePalette);
    document.documentElement.style.setProperty(
      "--danger",
      paletteFor(settings.accessiblePalette).warning,
    );
    view.reducedMotion = settings.reducedMotion;
    document.documentElement.classList.toggle("large-text", settings.largeText);
    document.documentElement.classList.toggle(
      "reduced-motion",
      settings.reducedMotion,
    );
  }
  function persist() {
    try {
      localStorage.setItem("lantern-settings", JSON.stringify(settings));
    } catch {}
  }
  applyPalette();
  $("accessible-palette").checked = settings.accessiblePalette;
  $("accessible-palette").onchange = () => {
    settings.accessiblePalette = $("accessible-palette").checked;
    applyPalette();
    try {
      localStorage.setItem("lantern-settings", JSON.stringify(settings));
    } catch {}
  };
  for (const [id, key] of [
    ["reduced-motion", "reducedMotion"],
    ["large-text", "largeText"],
  ]) {
    $(id).checked = settings[key];
    $(id).onchange = () => {
      settings[key] = $(id).checked;
      applyPalette();
      persist();
    };
  }
  let rebinding = null;
  function drawBindings() {
    $("key-bindings").replaceChildren();
    for (const [action, name] of Object.entries(actionNames)) {
      const row = document.createElement("label"),
        label = document.createElement("span"),
        button = document.createElement("button");
      label.textContent = name;
      button.textContent =
        rebinding === action
          ? "Nhấn phím…"
          : keyLabel(settings.bindings[action]);
      button.type = "button";
      button.onclick = () => {
        rebinding = action;
        $("binding-message").textContent = `Nhấn phím mới cho ${name}`;
        drawBindings();
      };
      row.append(label, button);
      $("key-bindings").append(row);
    }
  }
  drawBindings();
  $("bindings-reset").onclick = () => {
    settings.bindings = { ...defaults };
    rebinding = null;
    keys.clear();
    pending.clear();
    persist();
    drawBindings();
    $("binding-message").textContent = "Đã khôi phục phím mặc định";
  };
  const audio = new Audio(settings);
  for (const key of ["volume", "sensitivity"]) {
    $(key).value = settings[key];
    $(key).oninput = () => {
      settings[key] = Number($(key).value);
      try {
        localStorage.setItem("lantern-settings", JSON.stringify(settings));
      } catch {}
    };
  }
  let game = new Game({ tuning: t, seed: 2026 }),
    mode = "menu",
    night = 1,
    wonScores = [],
    yaw = 0,
    drag = false,
    lastX = 0,
    accumulator = 0,
    last = performance.now(),
    time = 0,
    toastUntil = 0,
    requestedPause = false,
    settingsShown = false,
    countdownSecond = -1,
    wasWarning = false,
    campaignSeed = 2027,
    spawnCue = null;
  const keys = new Set(),
    pending = new Set();
  view.load(game);
  const diagnostics = {
    frames: 0,
    render_seconds: 0,
    average_fps: null,
    width: innerWidth,
    height: innerHeight,
  };
  globalThis.lanternDiagnostics = diagnostics;
  function hide(...ids) {
    ids.forEach((id) => $(id).classList.add("hidden"));
  }
  function show(id) {
    $(id).classList.remove("hidden");
  }
  function toast(text, seconds = 3) {
    $("toast").textContent = text;
    toastUntil = time + seconds;
  }
  function goMenu() {
    mode = "menu";
    keys.clear();
    pending.clear();
    hide("hud", "pause", "settings", "result", "intro", "leaderboard");
    show("menu");
  }
  function intro(n) {
    audio.start();
    night = n;
    mode = "intro";
    keys.clear();
    pending.clear();
    hide("menu", "hud", "pause", "settings", "result");
    show("intro");
    $("intro-label").textContent = `CHUYẾN ĐI THỨ ${n}`;
    $("intro-title").textContent = makeMap(n).name;
    $("intro-story").textContent = [
      null,
      "Ông Đăng: “Đốm sáng nhỏ cũng biết tìm đường về. Gom chúng lại, Mây nhé. Năm chiếc đèn ở Đảo Bến đang đợi con.”",
      "Ông Đăng: “Hai bờ đảo là hai lời hẹn. Cầu tre hẹp lắm; bục đỏ sẽ đưa con qua biển mây. Hãy giữ đom đóm khỏi Gió Lạc.”",
      "Ông Đăng: “Trên Đảo Chuông, gió sẽ kể chuyện bình minh. Theo dốc lên tầng cao, tìm bục nhảy và thắp ngọn đèn cuối cùng.”",
    ][n];
  }
  function startNight() {
    // Headless retains the contract origin. The playable bell island starts on its upper landing.
    const spawnPos = night === 3 ? [0, 6, 6] : [0, 0, 0];
    wonScores = wonScores.slice(0, night - 1);
    game = new Game({
      tuning: t,
      seed: campaignSeed + night - 1,
      night,
      spawnPos,
      scenario: demoScenario ?? {},
    });
    view.load(game);
    mode = "play";
    keys.clear();
    pending.clear();
    accumulator = 0;
    Object.assign(diagnostics, {
      frames: 0,
      render_seconds: 0,
      average_fps: null,
      width: innerWidth,
      height: innerHeight,
    });
    requestedPause = false;
    settingsShown = false;
    countdownSecond = -1;
    wasWarning = false;
    spawnCue = null;
    yaw = 0;
    hide("intro", "menu", "pause", "settings", "result", "leaderboard");
    show("hud");
    $("island-label").textContent =
      `ĐÊM ${night} · ${game.map.name.toLocaleUpperCase("vi-VN")}`;
    $("objective").textContent =
      night === 1
        ? "Giữ ít nhất 3 đèn sáng tới bình minh. Nhớ châm dầu."
        : night === 2
          ? "Giữ ít nhất 4 đèn sáng tới bình minh. Bục đỏ nối hai bờ."
          : "Giữ ít nhất 5 đèn sáng tới bình minh. Cẩn thận gió mạnh.";
    $("mote-slots").replaceChildren(
      ...Array.from({ length: t.carry_capacity }, () =>
        document.createElement("i"),
      ),
    );
    toast(
      `Nạp/châm dầu ${keyLabel(settings.bindings.interact)} · Tỏa sáng ${keyLabel(settings.bindings.pulse)} · Lướt ${keyLabel(settings.bindings.dash)}`,
      4,
    );
  }
  $("start").onclick = () => {
    wonScores = [];
    intro(1);
  };
  $("intro-start").onclick = () => {
    audio.start();
    startNight();
  };
  $("restart").onclick = startNight;
  $("restart-pause").onclick = startNight;
  $("next-night").onclick = () => intro(night + 1);
  $("resume").onclick = () => (requestedPause = true);
  $("settings-open").onclick = () => {
    settingsShown = true;
    hide("pause");
    show("settings");
  };
  $("settings-close").onclick = () => {
    settingsShown = false;
    hide("settings");
    show("pause");
  };
  document.querySelectorAll(".back-menu").forEach((b) => (b.onclick = goMenu));
  let boardEntries = [];
  async function openBoard() {
    try {
      const board = await loadLeaderboard();
      boardEntries = board.entries;
      mode = "leaderboard";
      hide("menu", "hud", "pause", "settings", "result", "intro");
      show("leaderboard");
      $("board-source").textContent =
        board.source === "disk"
          ? "Top 10 · Lưu trên đĩa cục bộ"
          : "Top 10 · Lưu trong trình duyệt";
      $("board-rows").replaceChildren();
      board.entries.forEach((entry, i) => {
        const tr = document.createElement("tr");
        for (const text of [
          i + 1,
          entry.name,
          entry.score.toLocaleString("vi-VN"),
          entry.nights_won,
        ]) {
          const td = document.createElement("td");
          td.textContent = text;
          tr.append(td);
        }
        $("board-rows").append(tr);
      });
      if (!board.entries.length)
        $("board-source").textContent =
          "Chưa có điểm — hãy bắt đầu chuyến đi đầu tiên.";
    } catch (error) {
      toast(error.message);
    }
  }
  $("leaderboard-open").onclick = openBoard;
  $("board-export").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify({ entries: boardEntries }, null, 2)], {
        type: "application/json",
      }),
    );
    a.download = "leaderboard.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("score-form").onsubmit = async (event) => {
    event.preventDefault();
    try {
      await saveScore({
        name: $("player-name").value,
        score: wonScores.reduce((a, b) => a + b, 0),
        nights_won: wonScores.length,
        achieved_at: new Date().toISOString(),
        seed: campaignSeed,
      });
      $("score-message").textContent = "Đã lưu vào bảng xếp hạng";
      $("save-score").disabled = true;
    } catch (error) {
      $("score-message").textContent = error.message;
    }
  };
  addEventListener("keydown", (e) => {
    if (rebinding) {
      e.preventDefault();
      try {
        settings.bindings = updateBinding(settings.bindings, rebinding, e.code);
        rebinding = null;
        persist();
        keys.clear();
        pending.clear();
        drawBindings();
        $("binding-message").textContent = "Đã lưu phím mới";
      } catch (error) {
        $("binding-message").textContent = error.message;
      }
      return;
    }
    const onControl =
      e.target instanceof Element &&
      e.target.closest("input,button,select,textarea");
    if (
      onControl &&
      (mode !== "play" || game.state === "paused") &&
      !matchesBinding(settings.bindings, "pause", e.code)
    )
      return;
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        e.code,
      )
    )
      e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (
      ["jump", "dash", "interact", "pulse"].some((a) =>
        matchesBinding(settings.bindings, a, e.code),
      )
    )
      pending.add(e.code);
    if (matchesBinding(settings.bindings, "pause", e.code) && mode === "play") {
      requestedPause = true;
      keys.delete(e.code);
      pending.delete(e.code);
    }
    if (
      matchesBinding(settings.bindings, "jump", e.code) &&
      mode === "play" &&
      game.state === "playing" &&
      game.player.grounded
    )
      audio.event("jump");
  });
  addEventListener("keyup", (e) => keys.delete(e.code));
  addEventListener("blur", () => {
    keys.clear();
    pending.clear();
    if (!captureConfig && mode === "play" && game.state === "playing")
      requestedPause = true;
  });
  $("world").addEventListener("pointerdown", (e) => {
    drag = true;
    lastX = e.clientX;
    $("world").setPointerCapture(e.pointerId);
  });
  addEventListener("pointerup", () => (drag = false));
  addEventListener("pointermove", (e) => {
    if (drag && mode === "play" && game.state === "playing") {
      yaw -= (e.clientX - lastX) * 0.006 * settings.sensitivity;
      lastX = e.clientX;
    }
  });
  function action(name) {
    return [...keys, ...pending].some((code) =>
      matchesBinding(settings.bindings, name, code),
    );
  }
  function finish() {
    mode = "result";
    hide("pause", "settings");
    show("result");
    const won = game.state === "won";
    if (won) wonScores[night - 1] = game.score;
    const total = wonScores.reduce((a, b) => a + (b ?? 0), 0);
    $("result-eyebrow").textContent =
      won && night === 3 ? "BA HÒN ĐẢO ĐÃ SÁNG" : "NGƯỜI GIỮ ÁNH SÁNG";
    $("result-title").textContent = won
      ? night === 3
        ? "Bình Minh"
        : "Bình minh trở lại!"
      : "Đừng để đèn tắt";
    $("result-text").textContent = won
      ? night === 3
        ? "Chuông ngân qua biển mây. Mây đã giữ lời hứa với cả ba hòn đảo."
        : `Mây đã giữ ${game.map.name} sáng tới bình minh. Một hòn đảo khác đang chờ.`
      : "Một chuyến đi khác đang đợi. Gom ánh sáng, tìm vùng an toàn và thử lại.";
    $("result-score").textContent = won
      ? `${total.toLocaleString("vi-VN")} điểm tổng`
      : `${game.score.toLocaleString("vi-VN")} điểm Đêm này`;
    $("restart").textContent = "Chơi lại Đêm";
    $("next-night").classList.toggle("hidden", !won || night === 3);
    $("score-form").classList.toggle("hidden", won && night !== 3);
    $("score-message").textContent = "";
    $("save-score").disabled = false;
  }
  function hud() {
    const p = game.player,
      seconds = Math.ceil(game.timeTicks / 60);
    const warning = paletteFor(settings.accessiblePalette).marker;
    $("clock").textContent =
      `${seconds <= 30 ? warning : ""}${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    $("clock").classList.toggle("danger", seconds <= 30);
    $("flames").textContent =
      "◆".repeat(p.flames) + "◇".repeat(Math.max(0, t.flames - p.flames));
    const lit = game.lanterns.filter((l) => l.lit).length;
    $("lamps").textContent =
      `${lit} / ${game.lanterns.length} · cần ${Math.ceil(t.win_ratio * game.lanterns.length)}`;
    $("score").textContent = game.score.toLocaleString("vi-VN");
    $("carried").textContent =
      `${p.carried} / ${game.capacity} ĐOM ĐÓM${p.charm ? ` · BÙA ${Math.ceil(p.charm / 60)}s` : ""}`;
    if ($("mote-slots").children.length !== game.capacity)
      $("mote-slots").replaceChildren(
        ...Array.from({ length: game.capacity }, () =>
          document.createElement("i"),
        ),
      );
    [...$("mote-slots").children].forEach((s, i) =>
      s.classList.toggle("full", i < p.carried),
    );
    $("pulse-label").innerHTML =
      `${keyLabel(settings.bindings.pulse)} <span>${p.pulseCd ? `${(p.pulseCd / 60).toFixed(1)} s` : "Tỏa sáng · 3"}</span>`;
    $("dash-label").innerHTML =
      `${keyLabel(settings.bindings.dash)} <span>${p.charm ? "Bùa Gió" : p.dashCd ? `${(p.dashCd / 60).toFixed(1)} s` : "Lướt"}</span>`;
    const near = game.nearestLantern(p.pos, (l) => game.acceptsMotes(l));
    $("interact").classList.toggle(
      "hidden",
      !near ||
        distance(p.pos, near.pos) > t.interact_radius ||
        p.respawnLeft > 0,
    );
    if (near)
      $("interact").textContent = near.lit
        ? `${game.fuel(near) < 30 ? warning : ""}${keyLabel(settings.bindings.interact)} — Châm dầu (${game.fuel(near).toFixed(1)}/100)`
        : `${keyLabel(settings.bindings.interact)} — Nạp ánh sáng (${near.deposited}/${game.lightingCost(near)})`;
    const l =
      game.nearestLantern(p.pos, (l) => !l.lit) ??
      game.nearestLantern(p.pos, (l) => l.lit && game.fuel(l) < 30);
    if (l) {
      const projected = view.project(l.pos),
        visible =
          projected.z >= -1 &&
          projected.z <= 1 &&
          Math.abs(projected.x) < 0.9 &&
          Math.abs(projected.y) < 0.9;
      $("direction").classList.toggle("hidden", visible);
      $("direction").querySelector("span").textContent =
        `${l.id} · ${Math.round(distance(p.pos, l.pos))} m`;
      const angle =
        Math.atan2(projected.x, projected.y) + (projected.z > 1 ? Math.PI : 0);
      $("direction-icon").style.transform = `rotate(${angle}rad)`;
    } else hide("direction");
    const cues = [];
    if (game.wind.warning) cues.push("⚠ Gió mạnh sắp thổi");
    if (seconds <= 10) cues.push(`⚠ Còn ${seconds} giây tới bình minh`);
    const weak = game.lanterns.filter((l) => l.lit && game.fuel(l) < 30);
    if (weak.length)
      cues.push(`⚠ Dầu thấp: ${weak.map((l) => l.id).join(", ")}`);
    if (spawnCue && time < spawnCue.until)
      cues.push("⚠ Bóng Mực vừa xuất hiện");
    $("visual-cues").textContent = cues.join(" · ");
    if (spawnCue && time < spawnCue.until) {
      const p = view.project(spawnCue.pos),
        x = p.x * (p.z > 1 ? -1 : 1),
        y = p.y * (p.z > 1 ? -1 : 1),
        scale = 0.9 / Math.max(Math.abs(x), Math.abs(y), 0.01);
      $("spawn-arrow").style.left = `${50 + x * scale * 45}%`;
      $("spawn-arrow").style.top = `${50 - y * scale * 45}%`;
      $("spawn-arrow").style.transform =
        `translate(-50%,-50%) rotate(${Math.atan2(x, y)}rad)`;
      show("spawn-arrow");
    } else hide("spawn-arrow");
  }
  function animate(now) {
    requestAnimationFrame(animate);
    const realDt = (now - last) / 1000;
    const dt = Math.min(realDt, 0.1);
    last = now;
    time += dt;
    if (mode === "play" && game.state === "playing") {
      diagnostics.frames++;
      diagnostics.render_seconds += realDt;
      diagnostics.average_fps = diagnostics.frames / diagnostics.render_seconds;
    }
    if (mode === "play") {
      accumulator += dt;
      while (accumulator >= DT && mode === "play") {
        const pause = requestedPause;
        requestedPause = false;
        const normalInput = {
          move: [
            Number(action("left")) - Number(action("right")),
            Number(action("forward")) - Number(action("backward")),
          ],
          cam_yaw_deg: (yaw * 180) / Math.PI,
          jump: action("jump"),
          interact: action("interact"),
          pulse: action("pulse"),
          dash: action("dash"),
          pause,
        };
        const replayInput =
          demoFrames[replayCursor]?.tick === game.tick
            ? demoFrames[replayCursor++]
            : {};
        const events = game.step(
          captureConfig?.mode === "demo" ? replayInput : normalInput,
        );
        pending.clear();
        accumulator -= DT;
        for (const e of events) {
          audio.event(e.name, e.data.result);
          if (e.name === "pulse") view.pulseAt(game.player.pos);
          if (e.name === "shade_spawned") {
            const shade = game.shades.find((s) => s.id === e.data.id);
            if (shade) spawnCue = { pos: [...shade.pos], until: time + 4 };
          }
          if (e.name === "lantern_lit") toast("Một ngọn đèn. Một lời hứa.");
          if (e.name === "lantern_out")
            toast(
              `${paletteFor(settings.accessiblePalette).marker}${e.data.lantern_id} đã cạn dầu — thắp lại cần 5 đom đóm`,
            );
          if (e.name === "charm_picked")
            toast("Bùa Gió · Chạy nhanh hơn, lướt tự do");
          if (e.name === "drifter_steal") toast("Gió Lạc mang đi ánh sáng!");
          if (e.name === "player_hit" && e.data.by === "fall")
            toast("Mây đang trở lại bờ…", 1.2);
          if (e.name === "paused") {
            keys.clear();
            pending.clear();
            settingsShown = false;
            hide("settings");
            show("pause");
          }
          if (e.name === "resumed") {
            keys.clear();
            hide("pause", "settings");
            settingsShown = false;
          }
        }
        const seconds = Math.ceil(game.timeTicks / 60);
        if (
          game.state === "playing" &&
          seconds <= 10 &&
          seconds > 0 &&
          countdownSecond !== seconds
        ) {
          countdownSecond = seconds;
          audio.event("countdown");
        }
        if (game.wind.warning && !wasWarning) {
          toast("Gió mạnh đang tới…", 2);
          audio.event("wind");
        }
        wasWarning = game.wind.warning;
        if (game.state === "won" || game.state === "lost") finish();
      }
    } else accumulator = 0;
    if (time > toastUntil) $("toast").textContent = "";
    audio.update(time, mode === "play" && game.state === "playing");
    view.render(game, {
      time,
      dt,
      yaw,
      menu: mode === "menu" || mode === "intro",
    });
    if (mode === "play" || mode === "result") hud();
    if (captureConfig) captureTick(now);
  }
  const captures = {},
    fontSamples = {},
    demoStarted = performance.now();
  let firstFrame = true,
    captureDone = false,
    reports;
  function fontMinimum() {
    return Math.min(
      ...[...document.querySelectorAll("body *")]
        .filter(
          (e) =>
            e.getClientRects().length &&
            [...e.childNodes].some(
              (n) => n.nodeType === 3 && n.textContent.trim(),
            ),
        )
        .map((e) => parseFloat(getComputedStyle(e).fontSize)),
    );
  }
  async function captureTick(now) {
    if (firstFrame) {
      firstFrame = false;
      await window.lanternHost.firstFrame();
    }
    if (captureDone) return;
    const elapsed = (now - demoStarted) / 1000;
    if (captureConfig.mode === "capture") {
      if (elapsed > 1 && !captures.menu) {
        captures.menu = true;
        fontSamples.menu = fontMinimum();
        await window.lanternHost.capture("menu");
      }
      if (elapsed > 2 && !captures.start) {
        captures.start = true;
        startNight();
      }
      if (elapsed > 3 && !captures.game) {
        captures.game = true;
        fontSamples.game = fontMinimum();
        await window.lanternHost.capture("game");
      }
      if (elapsed > 4 && !captures.settings) {
        captures.settings = true;
        game.step({ pause: true });
        hide("pause");
        show("settings");
        fontSamples.settings = fontMinimum();
        await window.lanternHost.capture("settings");
      }
      if (elapsed > 5 && !captures.large) {
        captures.large = true;
        settings.largeText = true;
        settings.accessiblePalette = true;
        settings.reducedMotion = true;
        $("large-text").checked = true;
        $("accessible-palette").checked = true;
        $("reduced-motion").checked = true;
        applyPalette();
        fontSamples.large = fontMinimum();
        await window.lanternHost.capture("large");
      }
      if (elapsed >= captureConfig.duration) {
        captureDone = true;
        await window.lanternHost.complete({
          mode: "ui-capture",
          width: innerWidth,
          height: innerHeight,
          font_samples_px: fontSamples,
          large_scale:
            parseFloat(getComputedStyle(document.documentElement).fontSize) /
            18,
          settings: {
            accessiblePalette: settings.accessiblePalette,
            largeText: settings.largeText,
            reducedMotion: settings.reducedMotion,
          },
          status: Object.values(fontSamples).every((x) => x >= 18)
            ? "passed"
            : "failed",
        });
      }
    } else if (captureConfig.mode === "demo") {
      if (elapsed > 6 && !captures.game) {
        captures.game = true;
        await window.lanternHost.capture();
      }
      if (elapsed > 35) {
        mode = "demo-report";
        hide("hud", "pause", "settings", "result");
        show("demo-report");
        const title =
          elapsed < 45
            ? "Kiểm thử & headless"
            : elapsed < 55
              ? "Benchmark đồ họa"
              : "Soak test 10 Đêm";
        $("demo-report-title").textContent = title;
        if (reports) {
          $("demo-report-text").textContent =
            elapsed < 45
              ? `Test thật: ${reports.testCount} test đạt\nHeadless: ${reports.headless}\n18 scenario tất định · 60 tick/giây\nReplay dùng scenario và inputs công khai\nChưa commit/push theo yêu cầu người dùng`
              : elapsed < 55
                ? `Cửa sổ 1280×720 · 30 giây + warmup 3 giây\n200 Bóng Mực · 100 đom đóm · 3 đèn sáng\nFPS trung bình: ${reports.bench.avg_fps.toFixed(1)}\n1% low: ${reports.bench.p1_low_fps.toFixed(1)} FPS\nP95: ${reports.bench.frame_ms_p95.toFixed(2)} ms\nLoad: ${reports.bench.load_ms} ms`
                : `Cùng một tiến trình · 10 Đêm\nCrash: ${reports.soak.crashes}\nRSS đầu: ${reports.soak.mem_start_mb.toFixed(2)} MB\nRSS cuối: ${reports.soak.mem_end_mb.toFixed(2)} MB\nGiới hạn: ${(reports.soak.mem_start_mb * 1.2).toFixed(2)} MB\nKết quả: ${reports.soak.results.join(", ")}`;
        }
      }
      if (elapsed >= captureConfig.duration) {
        captureDone = true;
        await window.lanternHost.complete({
          mode: "automated-replay",
          duration_requested_s: captureConfig.duration,
          game_end: game.end(),
          scenario: "public/demo.scenario.json",
          inputs: "public/demo.inputs.json",
          reports_shown: Boolean(reports),
        });
      }
    }
  }
  if (captureConfig?.mode === "demo") {
    const [bench, soak, tests, headless] = await Promise.all([
      fetch("/evidence/bench.json").then((r) => r.json()),
      fetch("/evidence/soak.json").then((r) => r.json()),
      fetch("/evidence/tests.txt").then((r) => r.text()),
      fetch("/evidence/headless.jsonl").then((r) => r.text()),
    ]);
    reports = {
      bench,
      soak,
      testCount: Number(/pass\s+(\d+)/.exec(tests)?.[1] ?? 0),
      headless: headless.trim().split("\n").at(-1),
    };
    campaignSeed = captureConfig.seed;
    startNight();
    show("demo-caption");
  }
  requestAnimationFrame(animate);
} catch (error) {
  $("error").classList.remove("hidden");
  $("error").textContent =
    `Không khởi tạo được game: ${error.message}. Cần trình duyệt hỗ trợ WebGL 2.`;
  console.error(error);
  window.lanternHost?.complete({ error: error.stack });
}
