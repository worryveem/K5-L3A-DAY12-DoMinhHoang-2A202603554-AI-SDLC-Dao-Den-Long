import { Game, DT, distance } from "/src/core/game.mjs";
import { makeMap } from "/src/core/maps.mjs";
import { View } from "./view.mjs";
import { Audio } from "./audio.mjs";
import { normalizeSettings, paletteFor } from "./presentation.mjs";
const $ = (id) => document.getElementById(id);
try {
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
    wasWarning = false;
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
    hide("hud", "pause", "settings", "result", "intro");
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
    game = new Game({ tuning: t, seed: 2026 + night, night, spawnPos });
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
    yaw = 0;
    hide("intro", "menu", "pause", "settings", "result");
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
    toast("Thắp đèn bằng E · Tỏa sáng bằng Q · Lướt bằng Shift", 4);
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
  const controls = [
    "Space",
    "KeyQ",
    "KeyE",
    "KeyP",
    "Escape",
    "ShiftLeft",
    "ShiftRight",
  ];
  addEventListener("keydown", (e) => {
    const onControl =
      e.target instanceof Element &&
      e.target.closest("input,button,select,textarea");
    if (
      onControl &&
      (mode !== "play" || game.state === "paused") &&
      !["Escape", "KeyP"].includes(e.code)
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
    if (controls.includes(e.code)) pending.add(e.code);
    if ((e.code === "Escape" || e.code === "KeyP") && mode === "play") {
      requestedPause = true;
      keys.delete(e.code);
      pending.delete(e.code);
    }
    if (
      e.code === "Space" &&
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
    if (mode === "play" && game.state === "playing") requestedPause = true;
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
  function action(code) {
    return keys.has(code) || pending.has(code);
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
      `Q <span>${p.pulseCd ? `${(p.pulseCd / 60).toFixed(1)} s` : "Tỏa sáng · 3"}</span>`;
    $("dash-label").innerHTML =
      `SHIFT <span>${p.charm ? "Bùa Gió" : p.dashCd ? `${(p.dashCd / 60).toFixed(1)} s` : "Lướt"}</span>`;
    const near = game.nearestLantern(p.pos, (l) => game.acceptsMotes(l));
    $("interact").classList.toggle(
      "hidden",
      !near ||
        distance(p.pos, near.pos) > t.interact_radius ||
        p.respawnLeft > 0,
    );
    if (near)
      $("interact").textContent = near.lit
        ? `${game.fuel(near) < 30 ? warning : ""}E — Châm dầu (${game.fuel(near).toFixed(1)}/100)`
        : `E — Nạp ánh sáng (${near.deposited}/${game.lightingCost(near)})`;
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
        const events = game.step({
          move: [
            Number(keys.has("KeyA")) - Number(keys.has("KeyD")),
            Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
          ],
          cam_yaw_deg: (yaw * 180) / Math.PI,
          jump: action("Space"),
          interact: action("KeyE"),
          pulse: action("KeyQ"),
          dash: action("ShiftLeft") || action("ShiftRight"),
          pause,
        });
        pending.clear();
        accumulator -= DT;
        for (const e of events) {
          audio.event(e.name, e.data.result);
          if (e.name === "pulse") view.pulseAt(game.player.pos);
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
  }
  requestAnimationFrame(animate);
} catch (error) {
  $("error").classList.remove("hidden");
  $("error").textContent =
    `Không khởi tạo được game: ${error.message}. Cần trình duyệt hỗ trợ WebGL 2.`;
  console.error(error);
}
