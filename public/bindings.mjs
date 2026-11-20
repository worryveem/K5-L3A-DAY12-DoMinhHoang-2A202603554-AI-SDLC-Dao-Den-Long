export const defaults = {
  forward: "KeyW",
  backward: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  dash: "ShiftLeft",
  interact: "KeyE",
  pulse: "KeyQ",
  pause: "Escape",
};
export const actionNames = {
  forward: "Đi tới",
  backward: "Đi lùi",
  left: "Sang trái",
  right: "Sang phải",
  jump: "Nhảy",
  dash: "Lướt",
  interact: "Tương tác",
  pulse: "Tỏa Sáng",
  pause: "Tạm dừng",
};
export function bindingConflict(bindings, action, code) {
  return (
    Object.keys(defaults).find(
      (key) => key !== action && bindings[key] === code,
    ) ?? null
  );
}
export function updateBinding(bindings, action, code) {
  if (
    !Object.hasOwn(defaults, action) ||
    typeof code !== "string" ||
    !/^[A-Za-z][A-Za-z0-9]{1,31}$/.test(code)
  )
    throw Error("Phím không hợp lệ");
  const other = bindingConflict(bindings, action, code);
  if (other) throw Error(`Phím đã dùng cho “${actionNames[other]}”`);
  return { ...bindings, [action]: code };
}
export function normalizeBindings(value) {
  if (
    !value ||
    Object.keys(defaults).some(
      (k) =>
        typeof value[k] !== "string" ||
        !/^[A-Za-z][A-Za-z0-9]{1,31}$/.test(value[k]),
    ) ||
    new Set(Object.keys(defaults).map((k) => value[k])).size !==
      Object.keys(defaults).length
  )
    return { ...defaults };
  return Object.fromEntries(Object.keys(defaults).map((k) => [k, value[k]]));
}
export function keyLabel(code) {
  return (
    {
      Space: "Space",
      Escape: "Esc",
      ShiftLeft: "Shift trái",
      ShiftRight: "Shift phải",
      ArrowUp: "↑",
      ArrowDown: "↓",
      ArrowLeft: "←",
      ArrowRight: "→",
    }[code] ?? code.replace(/^Key|^Digit/, "")
  );
}
export function matchesBinding(bindings, action, code) {
  if (bindings[action] === code) return true;
  if (Object.values(bindings).includes(code)) return false;
  return (
    (action === "pause" && bindings.pause === "Escape" && code === "KeyP") ||
    (action === "dash" &&
      bindings.dash === "ShiftLeft" &&
      code === "ShiftRight")
  );
}
