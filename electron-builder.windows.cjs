const base = require("./electron-builder.config.cjs");

// Modified by Yamato Security, 2026-11-06: keep only the target's DuckDB library. The
// packaging scripts run `--win --x64` or `--win --arm64` and fetch that architecture's
// @duckdb/node-bindings-win32-* package first (scripts/ensure-duckdb-bindings.cjs).
const winArch = process.argv.includes("--arm64") ? "arm64" : "x64";
const DUCKDB_BINDINGS = ["darwin-arm64", "darwin-x64", "linux-arm64", "linux-arm64-musl", "linux-x64", "linux-x64-musl", "win32-arm64", "win32-x64"];
const otherDuckdbBindings = DUCKDB_BINDINGS
  .filter((b) => b !== `win32-${winArch}`)
  .map((b) => `!node_modules/@duckdb/node-bindings-${b}{,/**}`);

module.exports = {
  appId: base.appId,
  productName: base.productName,
  artifactName: "IRFlow-Timeline-${version}-windows-${arch}.${ext}",
  files: [...base.files, "!node_modules/@ts-evtx/messages/assets/**", ...otherDuckdbBindings],
  asarUnpack: base.asarUnpack,
  extraResources: [
    { from: "windows-vendor/${arch}/hayabusa", to: "hayabusa" },
    { from: "windows-vendor/${arch}/tools", to: "tools" },
    { from: "windows-vendor/${arch}/bundle-manifest.json", to: "bundle-manifest.json" },
    { from: "node_modules/@ts-evtx/messages/assets/merged-messages.db", to: "messages/merged-messages.db" },
  ],
  extraFiles: ["LICENSE", "WINDOWS.md"],
  afterPack: "scripts/prepare-windows-package.cjs",
  // better-sqlite3 13 ships Node-API binaries for both Windows architectures.
  // Rebuilding on the host would replace them with the host platform's module.
  npmRebuild: false,
  win: {
    target: [{ target: "dir", arch: ["x64", "arm64"] }],
    executableName: "IRFlow Timeline",
    // This unsigned folder build can be assembled on Linux without Wine.
    signAndEditExecutable: false,
  },
  directories: { output: "release/windows" },
};
