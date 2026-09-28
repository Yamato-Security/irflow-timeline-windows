const base = require("./electron-builder.config.cjs");

module.exports = {
  appId: base.appId,
  productName: base.productName,
  artifactName: "IRFlow-Timeline-${version}-windows-${arch}.${ext}",
  files: [...base.files, "!node_modules/@ts-evtx/messages/assets/**"],
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
