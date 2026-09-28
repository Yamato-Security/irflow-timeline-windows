const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { windowChrome, commandLineFiles, pythonCandidates } = require("../electron/utils/desktop-platform");

test("Windows keeps native close/minimize/maximize controls; macOS keeps inset chrome", () => {
  assert.equal(windowChrome("win32").titleBarStyle, "default");
  assert.equal(windowChrome("win32").vibrancy, undefined);
  assert.equal(windowChrome("darwin").titleBarStyle, "hiddenInset");
});

test("file arguments preserve spaces and Unicode, skip switches and nonexistent paths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "irflow-argv-"));
  try {
    const name = "日本語 timeline.csv";
    const file = path.join(root, name);
    fs.writeFileSync(file, "Timestamp,Message\n");
    assert.deepEqual(commandLineFiles(["app.exe", name, "--flag", "absent.csv"], { cwd: root }), [file]);
    assert.deepEqual(commandLineFiles(["electron.exe", ".", name], { packaged: false, cwd: root }), [file]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("bundled Windows Python is preferred over PATH and omitted on macOS", () => {
  const options = { resourcesPath: path.resolve("space in resources"), appPath: path.resolve("app") };
  assert.equal(pythonCandidates({ ...options, platform: "win32" })[0], path.join(options.resourcesPath, "tools", "python", "python.exe"));
  assert.deepEqual(pythonCandidates({ ...options, platform: "darwin" }), ["python3", "python"]);
});

test("renderer path labels handle Windows and POSIX separators", async () => {
  const { displayBasename, displayDirname } = await import("../src/utils/platform.js");
  assert.equal(displayBasename("C:\\Evidence\\日本語 timeline.evtx"), "日本語 timeline.evtx");
  assert.equal(displayDirname("C:\\Evidence\\日本語 timeline.evtx"), "C:/Evidence");
  assert.equal(displayBasename("/evidence/timeline.csv"), "timeline.csv");
});
