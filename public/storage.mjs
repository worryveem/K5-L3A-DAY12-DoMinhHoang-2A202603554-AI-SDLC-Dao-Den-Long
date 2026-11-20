import { addEntry, topEntries } from "/src/local/leaderboard-core.mjs";
const key = "lantern-leaderboard";
export async function loadLeaderboard() {
  try {
    const r = await fetch("/api/leaderboard");
    if (r.ok)
      return { entries: topEntries((await r.json()).entries), source: "disk" };
  } catch {}
  return {
    entries: topEntries(JSON.parse(localStorage.getItem(key) ?? "[]")),
    source: "browser",
  };
}
export async function saveScore(entry) {
  const r = await fetch("/api/leaderboard", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(entry),
  }).catch(() => null);
  if (r?.ok) return r.json();
  if (r && r.status !== 404 && r.status !== 405)
    throw Error((await r.json()).error ?? "Không lưu được điểm");
  const entries = addEntry(
    JSON.parse(localStorage.getItem(key) ?? "[]"),
    entry,
  );
  localStorage.setItem(key, JSON.stringify(entries));
  return { entries };
}
