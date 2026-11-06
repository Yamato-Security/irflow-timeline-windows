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

const SHORTCUT_MODIFIERS = { "⌘": "Ctrl", "⌃": "Ctrl", "⌥": "Alt", "⇧": "Shift" };
const SHORTCUT_ORDER = ["Ctrl", "Alt", "Shift"];

// macOS labels list modifiers in Apple's order (⌥⌘F, ⇧⌘O). On Windows and Linux each
// run of modifiers is written in the usual Ctrl, Alt, Shift order: Ctrl+Alt+F, Ctrl+Shift+O.
// A "+" between a modifier and its key is a separator (⌘+Click); a "+" followed by a space
// or the end is the plus key itself (⌘ + / ⌘ - → Ctrl++ / Ctrl+-).
export function formatShortcut(value) {
  if (isMacDesktop()) return value;
  return String(value).replace(/[⌘⌃⇧⌥](?:\s*\+?\s*[⌘⌃⇧⌥])*(?:\s*\+(?!\s|$)|\s*)/g, (match, offset, source) => {
    const held = new Set([...match].map((ch) => SHORTCUT_MODIFIERS[ch]).filter(Boolean));
    const label = SHORTCUT_ORDER.filter((name) => held.has(name)).join("+");
    return label + (offset + match.length < source.length ? "+" : "");
  });
}
