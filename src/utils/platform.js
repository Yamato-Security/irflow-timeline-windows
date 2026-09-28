export function isMacDesktop() {
  return globalThis.window?.tle?.platform === "darwin";
}

export function desktopPlatformLabel() {
  const platform = globalThis.window?.tle?.platform;
  if (platform === "darwin") return "macOS";
  if (platform === "win32") return "Windows";
  if (platform === "linux") return "Linux";
  return "Desktop";
}

export function displayBasename(value) {
  const normalized = String(value || "").replace(/\\/g, "/").replace(/\/+$/, "");
  return normalized.slice(normalized.lastIndexOf("/") + 1);
}

export function displayDirname(value) {
  const normalized = String(value || "").replace(/\\/g, "/").replace(/\/+$/, "");
  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(0, index) : "";
}

export function formatShortcut(value) {
  if (isMacDesktop()) return value;
  const labels = { "⌘": "Ctrl", "⌃": "Ctrl", "⇧": "Shift", "⌥": "Alt" };
  return String(value).replace(/([⌘⌃⇧⌥])\s*\+?\s*/g, (match, key, offset, source) =>
    labels[key] + (offset + match.length < source.length ? "+" : ""));
}
