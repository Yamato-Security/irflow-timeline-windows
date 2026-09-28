const fs = require("fs");
const path = require("path");

function windowChrome(platform = process.platform) {
  return platform === "darwin"
    ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 16, y: 16 }, vibrancy: "under-window" }
    : { titleBarStyle: "default", autoHideMenuBar: true };
}

function commandLineFiles(argv, { packaged = true, cwd = process.cwd() } = {}) {
  return argv.slice(packaged ? 1 : 2)
    .filter((arg) => arg && !arg.startsWith("-"))
    .map((arg) => path.resolve(cwd, arg))
    .filter((file) => { try { return fs.statSync(file).isFile(); } catch { return false; } });
}

function pythonCandidates({ platform = process.platform, resourcesPath = process.resourcesPath, appPath } = {}) {
  const bundled = platform === "win32"
    ? [resourcesPath, appPath].filter(Boolean).map((root) => path.join(root, "tools", "python", "python.exe"))
    : [];
  return [...new Set([...bundled, "python3", "python"])];
}

module.exports = { windowChrome, commandLineFiles, pythonCandidates };
