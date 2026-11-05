// Color schemes (Yamato Security fork): the eight-scheme catalog, its WCAG contrast guarantees,
// the main-process mirror that paints the window and builds the native menu, the persisted
// preference store, and the source contracts that keep dark/light branching on `base`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const themesModule = () => import("../src/constants/themes.js");

const HEX = /^#[0-9a-f]{6}$/i;
const RGBA = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/;

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}
function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function tokenKeys(theme) {
  return Object.keys(theme).sort().map((key) => (key === "sev" ? `sev{${Object.keys(theme.sev).sort().join(",")}}` : key));
}

test("the catalog lists the eight schemes in menu order and every scheme has a complete token set", async () => {
  const { THEMES, THEME_OPTIONS, THEME_IDS, DEFAULT_THEME } = await themesModule();
  assert.deepEqual(THEME_IDS, ["dark", "light", "spring", "sakura", "summer", "autumn", "winter", "christmas"]);
  assert.deepEqual(THEME_OPTIONS.map((o) => o.label), ["Dark Mode", "Light Mode", "Spring", "Sakura", "Summer", "Autumn", "Winter", "Christmas"]);
  assert.deepEqual(Object.keys(THEMES), THEME_IDS);
  assert.equal(DEFAULT_THEME, "dark");
  const reference = tokenKeys(THEMES.dark);
  for (const [name, theme] of Object.entries(THEMES)) {
    assert.deepEqual(tokenKeys(theme), reference, `${name} must define exactly the dark scheme's tokens`);
    assert.ok(["dark", "light"].includes(theme.base), `${name}.base`);
    for (const [key, value] of Object.entries(theme)) {
      if (key === "base") continue;
      const values = key === "sev" ? Object.values(value) : [value];
      for (const color of values) assert.ok(HEX.test(color) || RGBA.test(color), `${name}.${key} = ${color}`);
    }
  }
  for (const option of THEME_OPTIONS) {
    assert.ok(option.icon && option.description, `${option.id} needs an icon and a description for the toolbar picker`);
  }
});

test("every scheme keeps readable text and distinct severity colors", async () => {
  const { THEMES } = await themesModule();
  for (const [name, th] of Object.entries(THEMES)) {
    const at = (fg, bg, min, what) => assert.ok(contrast(fg, bg) >= min, `${name}: ${what} ${contrast(fg, bg).toFixed(2)} < ${min}`);
    // The Autumn reference background targets AA; other palettes retain AAA.
    at(th.text, th.bg, name === "autumn" ? 4.5 : 7, "text on bg");
    at(th.textDim, th.bg, 4.5, "textDim on bg");
    at(th.textMuted, th.bg, 4.5, "textMuted on bg");
    at(th.textMuted, th.bgAlt, 4.5, "textMuted on bgAlt");
    at(th.headerText, th.headerBg, 4.5, "headerText on headerBg");
    for (const key of ["accent", "success", "warning", "danger"]) at(th[key], th.bg, 3, `${key} on bg`);
    for (const [key, color] of Object.entries(th.sev)) at(color, th.bg, 3, `sev.${key} on bg`);
    assert.equal(new Set(Object.values(th.sev)).size, 7, `${name}: severity colors must remain distinct`);
    // Choose the base that matches readable foregrounds. 0.179 is the crossover
    // where black and white have equal contrast, including saturated backgrounds.
    assert.equal(contrast("#000000", th.bg) < contrast("#ffffff", th.bg) ? "dark" : "light", th.base, `${name}.base disagrees with its background`);
  }
});

test("resolveTheme falls back to the default for unknown names and isDarkTheme follows base", async () => {
  const { THEMES, resolveTheme, isThemeName, isDarkTheme } = await themesModule();
  assert.equal(resolveTheme("no-such-scheme"), THEMES.dark);
  assert.equal(resolveTheme(undefined), THEMES.dark);
  assert.equal(resolveTheme("winter"), THEMES.winter);
  assert.equal(isThemeName("toString"), false);
  assert.equal(isThemeName("autumn"), true);
  assert.equal(isDarkTheme("summer"), false);
  assert.equal(isDarkTheme("christmas"), true);
  assert.equal(isThemeName("christmas-2"), false, "retired names must not be selectable");
  assert.equal(isDarkTheme("spring"), false);
  assert.equal(isDarkTheme("bogus"), true, "unknown names resolve to the dark default");
});

test("the main-process catalog mirrors the renderer catalog", async () => {
  const renderer = await themesModule();
  const main = require("../electron/themes");
  assert.deepEqual(main.THEME_OPTIONS.map((o) => o.id), renderer.THEME_IDS);
  assert.deepEqual(main.THEME_OPTIONS.map((o) => o.label), renderer.THEME_OPTIONS.map((o) => o.label));
  assert.equal(main.DEFAULT_THEME, renderer.DEFAULT_THEME);
  for (const option of main.THEME_OPTIONS) {
    assert.equal(option.windowBackground, renderer.THEMES[option.id].bg, `${option.id} window background must equal the scheme bg`);
  }
  assert.equal(main.windowBackgroundFor("summer"), renderer.THEMES.summer.bg);
  assert.equal(main.windowBackgroundFor("nope"), renderer.THEMES.dark.bg);
  assert.equal(main.isThemeId("winter"), true);
  assert.equal(main.isThemeId("constructor"), false);
  assert.equal(main.isThemeId("christmas-2"), false);
  assert.equal(main.windowBackgroundFor("christmas-2"), renderer.THEMES.christmas.bg);
});

test("ui-prefs store round-trips the scheme and sanitizes missing, corrupt and unknown values", () => {
  const { createUiPrefsStore, sanitizeUiPrefs } = require("../electron/ui-prefs");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "irflow-ui-prefs-"));
  try {
    const file = path.join(dir, "nested", "ui-prefs.json");
    const store = createUiPrefsStore(file);
    assert.deepEqual(store.load(), { themeName: "dark" }, "missing file → defaults");
    assert.deepEqual(store.save({ themeName: "autumn" }), { themeName: "autumn" });
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { themeName: "autumn" });
    assert.deepEqual(createUiPrefsStore(file).load(), { themeName: "autumn" }, "a fresh store reads it back");
    assert.deepEqual(store.save({ themeName: "christmas" }), { themeName: "christmas" });
    assert.deepEqual(createUiPrefsStore(file).load(), { themeName: "christmas" });
    fs.writeFileSync(file, JSON.stringify({ themeName: "christmas-2" }));
    assert.deepEqual(createUiPrefsStore(file).load(), { themeName: "christmas" }, "older Christmas-2 preferences select Christmas");
    assert.deepEqual(store.save({ themeName: "christmas-2" }), { themeName: "christmas" });
    assert.deepEqual(JSON.parse(fs.readFileSync(file, "utf8")), { themeName: "christmas" }, "subsequent saves use the canonical name");
    assert.deepEqual(store.save({ themeName: "sakura" }), { themeName: "sakura" });
    assert.deepEqual(createUiPrefsStore(file).load(), { themeName: "sakura" });
    assert.deepEqual(store.save({ themeName: "light" }), { themeName: "light" });
    assert.deepEqual(createUiPrefsStore(file).load(), { themeName: "light" });
    assert.deepEqual(store.save({ themeName: "neon" }), { themeName: "dark" }, "unknown schemes fall back to the default");
    fs.writeFileSync(file, "{ not json", "utf8");
    assert.deepEqual(store.load(), { themeName: "dark" }, "corrupt file → defaults");
    assert.deepEqual(sanitizeUiPrefs(null), { themeName: "dark" });
    assert.deepEqual(sanitizeUiPrefs({ themeName: "spring", extra: 1 }), { themeName: "spring" });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("Color Scheme menu, toolbar picker, preload and main process are wired together", () => {
  const menu = read("electron/menu.js");
  assert.match(menu, /label: "Color Scheme"/);
  assert.match(menu, /THEME_OPTIONS\.map/);
  assert.match(menu, /type: "radio"/);
  assert.match(menu, /checked: option\.id === currentTheme/);
  assert.doesNotMatch(menu, /label: "Theme"/);

  const toolbar = read("src/components/MenuBar.jsx");
  assert.match(toolbar, /aria-label="Color scheme"/);
  assert.match(toolbar, /THEME_OPTIONS\.map\(\(t\) => <option/);
  assert.match(toolbar, /chooseTheme\(e\.target\.value\)/);
  assert.doesNotMatch(toolbar, /Toggle theme/);

  const preload = read("electron/preload.js");
  assert.match(preload, /getUiPrefs: \(\) => ipcRenderer\.invoke\("get-ui-prefs"\)/);
  assert.match(preload, /setThemePreference: \(themeName\) => ipcRenderer\.invoke\("set-theme-preference", \{ themeName \}\)/);

  const main = read("electron/main.js");
  assert.match(main, /safeHandle\("get-ui-prefs"/);
  assert.match(main, /safeHandle\("set-theme-preference"/);
  assert.match(main, /backgroundColor: windowBackgroundFor\(uiPrefs\.load\(\)\.themeName\)/);
  assert.match(main, /getCurrentTheme: \(\) => uiPrefs\.load\(\)\.themeName, applyTheme/);
  assert.match(menu, /const currentTheme = typeof getCurrentTheme === "function" \? getCurrentTheme\(\) : DEFAULT_THEME/);
  assert.match(main, /safeSend\("set-theme", prefs\.themeName\)/, "menu-initiated changes reach the renderer");

  const app = read("src/App.jsx");
  assert.match(app, /tle\.getUiPrefs\?\.\(\)/, "startup restores the persisted scheme");
  assert.match(app, /const isDark = th\.base === "dark"/);
  assert.match(app, /colorScheme: th\.base/);
});

test("no renderer code branches on the scheme name — only on base/isDark", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(jsx?|mjs)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        if (/themeName\s*[!=]==?\s*["'](dark|light)["']/.test(text) || /colorScheme:\s*themeName\b/.test(text)) {
          offenders.push(path.relative(root, full));
        }
      }
    }
  };
  walk(path.join(root, "src"));
  assert.deepEqual(offenders, []);
  const html = read("index.html");
  for (const prop of ["--tle-bg", "--tle-scrollbar-thumb", "--tle-scrollbar-thumb-hover", "--tle-selection"]) {
    assert.ok(html.includes(`var(${prop}`), `index.html must read ${prop}`);
  }
});


test("light and seasonal text stays readable on panels, controls and selected/bookmarked rows", async () => {
  const { THEMES } = await themesModule();
  const composite = (rgba, background) => {
    const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
    const under = background.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16));
    return "#" + [r, g, b].map((v, i) => Math.round(v * a + under[i] * (1 - a)).toString(16).padStart(2, "0")).join("");
  };
  for (const name of ["light", "spring", "sakura", "summer", "autumn", "winter", "christmas"]) {
    const th = THEMES[name];
    for (const surface of ["bg", "bgAlt", "bgInput", "modalBg", "rowOdd", "rowEven", "panelBg", "btnBg"]) {
      for (const foreground of ["text", "textDim", "textMuted", "accent"]) {
        const ratio = contrast(th[foreground], th[surface]);
        assert.ok(ratio >= 4.5, `${name}: ${foreground} on ${surface}: ${ratio.toFixed(2)}`);
      }
    }
    assert.ok(contrast(th.headerText, th.headerBg) >= 4.5, `${name}: header foreground on its own surface`);
    for (const foreground of ["text", "textDim", "textMuted", "accent"]) {
      const ratio = contrast(th[foreground], composite(th.toolbarBg, th.bg));
      assert.ok(ratio >= 4.5, `${name}: ${foreground} on toolbar: ${ratio.toFixed(2)}`);
    }
    for (const row of [th.rowOdd, th.rowEven]) {
      for (const highlight of [th.selection, th.bookmark]) {
        assert.ok(contrast(th.text, composite(highlight, row)) >= (name === "autumn" ? 4.5 : 7), `${name}: highlighted row text`);
      }
    }
  }
});

test("filled controls pair the foreground with the actual accent or primary surface", async () => {
  const { THEMES } = await themesModule();
  const { buttonStyles } = await import("../src/components/primitives/buttonStyles.js");
  for (const [name, th] of Object.entries(THEMES)) {
    for (const [fg, bg] of [["onAccent", "fillAccent"], ["onAccent", "fillAccentHover"], ["onAccent", "fillWarning"], ["onAccent", "fillDanger"], ["onPrimary", "primaryBtn"], ["onPrimary", "primaryBtnHover"]]) {
      assert.ok(contrast(th[fg], th[bg]) >= 4.5, `${name}: ${fg} on ${bg}`);
    }
    const style = buttonStyles(th);
    assert.ok(contrast(style.color, style.background) >= 4.5, `${name}: rendered primary button`);
    assert.equal(buttonStyles(th, { disabled: true }).color, th.textMuted);
  }
});

test("histogram density colors follow the selected theme, including endpoints and clamping", async () => {
  const { THEMES, createHistogramColorScale } = await themesModule();
  const rgb = (hex) => `rgb(${hex.match(/[0-9a-f]{2}/gi).map((part) => parseInt(part, 16)).join(",")})`;
  for (const th of Object.values(THEMES)) {
    const scale = createHistogramColorScale(th);
    assert.equal(scale(0), rgb(th.histBar));
    assert.equal(scale(1), rgb(th.histBarHover));
    assert.equal(scale(-1), scale(0));
    assert.equal(scale(2), scale(1));
    const lo = th.histBar.match(/[0-9a-f]{2}/gi).map((p) => parseInt(p, 16));
    const hi = th.histBarHover.match(/[0-9a-f]{2}/gi).map((p) => parseInt(p, 16));
    assert.equal(scale(0.5), `rgb(${lo.map((n, i) => Math.round((n + hi[i]) / 2)).join(",")})`);
  }
});
