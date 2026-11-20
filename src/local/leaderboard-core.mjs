export function validateEntry(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid leaderboard entry");
  if (
    typeof value.name !== "string" ||
    !/^[A-Za-z0-9_]{3,12}$/.test(value.name)
  )
    throw new Error("Tên cần 3–12 ký tự A–Z, a–z, 0–9 hoặc _");
  if (!Number.isSafeInteger(value.score) || value.score < 0)
    throw new Error("Invalid score");
  if (
    !Number.isInteger(value.nights_won) ||
    value.nights_won < 0 ||
    value.nights_won > 3
  )
    throw new Error("Invalid nights_won");
  if (!Number.isSafeInteger(value.seed)) throw new Error("Invalid seed");
  if (
    typeof value.achieved_at !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value.achieved_at,
    ) ||
    !Number.isFinite(Date.parse(value.achieved_at))
  )
    throw new Error("achieved_at requires an ISO8601 timezone");
  return {
    name: value.name,
    score: value.score,
    nights_won: value.nights_won,
    achieved_at: value.achieved_at,
    seed: value.seed,
  };
}
export function topEntries(entries) {
  if (!Array.isArray(entries)) throw new Error("Invalid entries");
  return entries
    .map(validateEntry)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(a.achieved_at) - Date.parse(b.achieved_at),
    )
    .slice(0, 10);
}
export function addEntry(entries, entry) {
  return topEntries([...entries, validateEntry(entry)]);
}
