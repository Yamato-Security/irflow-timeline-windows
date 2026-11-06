const updateBaseUrlRaw =
  process.env.IRFLOW_UPDATE_BASE_URL ||
  process.env.TLE_UPDATE_BASE_URL ||
  "";

const updateBaseUrl = updateBaseUrlRaw.replace(/\/+$/, "");
const updateChannel =
  process.env.IRFLOW_UPDATE_CHANNEL ||
  process.env.TLE_UPDATE_CHANNEL ||
  "latest";

// Added by Yamato Security, 2026-11-05: scripts/package-unsigned-mac.sh builds one app per
// architecture and sets IRFLOW_MAC_ARCH (arm64 or x64) for each. Such an app leaves out the
// other architecture's DuckDB package, which universal builds need in both halves.
const singleMacArch = process.env.IRFLOW_MAC_ARCH || "";
if (singleMacArch && !["arm64", "x64"].includes(singleMacArch)) {
  throw new Error(`IRFLOW_MAC_ARCH must be arm64 or x64, not "${singleMacArch}"`);
}
const otherMacArch = { arm64: "x64", x64: "arm64" }[singleMacArch];

const config = {
  appId: "com.dfir.irflow-timeline",
  productName: "IRFlow Timeline",
  // Keep physical artifact names identical to electron-updater's URL-safe
  // names so manual GitHub/S3 uploads cannot publish a broken update feed.
  artifactName: "IRFlow-Timeline-${version}-${arch}.${ext}",
  mac: {
    category: "public.app-category.developer-tools",
    icon: "assets/icon.icns",
    minimumSystemVersion: "12.0",
    // Hayabusa is already universal, while better-sqlite3 13 ships architecture-named
    // Darwin prebuilds in both sub-builds. @electron/universal refuses identical Mach-O
    // files unless they are explicitly allowed, so copy these known, self-identifying
    // files through while it merges the rest of the application normally.
    // Modified by Yamato Security, 2026-11-05: the same goes for DuckDB's per-architecture
    // packages, which scripts/ensure-duckdb-bindings.cjs puts in both sub-builds.
    x64ArchFiles: "**/{hayabusa/hayabusa,node_modules/better-sqlite3/prebuilds/darwin-*.node,node_modules/@duckdb/node-bindings-darwin-*/*.{node,dylib}}",
    target: [
      {
        target: "dmg",
        arch: ["universal"],
      },
      {
        target: "zip",
        arch: ["universal"],
      },
    ],
    darkModeSupport: true,
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "entitlements.mac.plist",
    entitlementsInherit: "entitlements.mac.plist",
  },
  afterSign: "scripts/notarize.js",
  // Notarizes + staples the DMG itself. This must run as artifactBuildCompleted:
  // electron-builder creates the DMG blockmap before this hook and writes
  // latest-mac.yml afterward, so the hook can replace event.updateInfo with the
  // post-staple hash that the updater metadata will consume.
  artifactBuildCompleted: "scripts/notarize-dmg.js",
  electronUpdaterCompatibility: ">=2.16",
  dmg: {
    title: "IRFlow Timeline",
    contents: [
      { x: 130, y: 220 },
      { x: 410, y: 220, type: "link", path: "/Applications" },
    ],
  },
  files: [
    "dist/**/*",
    "electron/**/*",
    "assets/**/*",
    ...(otherMacArch ? [`!node_modules/@duckdb/node-bindings-darwin-${otherMacArch}{,/**}`] : []),
  ],
  extraResources: [
    {
      from: "hayabusa",
      to: "hayabusa",
      filter: ["**/*", "!logs/**"],
    },
    {
      from: "tools/bmc-tools",
      to: "tools/bmc-tools",
      filter: ["**/*"],
    },
  ],
  asarUnpack: [
    "node_modules/better-sqlite3/**",
    // DuckDB's native library is loaded from disk (dlopen), so it cannot stay inside app.asar.
    "node_modules/@duckdb/**",
  ],
  directories: {
    output: "release",
  },
  fileAssociations: [
    { ext: "csv", name: "CSV File", role: "Viewer" },
    { ext: "tsv", name: "TSV File", role: "Viewer" },
    { ext: "xlsx", name: "Excel File", role: "Viewer" },
    { ext: "plaso", name: "Plaso File", role: "Viewer" },
    { ext: "evtx", name: "EVTX File", role: "Viewer" },
    { ext: "mft", name: "MFT File", role: "Viewer" },
  ],
};

if (updateBaseUrl) {
  config.publish = [
    {
      provider: "generic",
      url: updateBaseUrl,
      channel: updateChannel,
      // AWS S3 supports a single byte range per GET request. The regional
      // virtual-hosted URL does not match electron-updater's built-in
      // s3.amazonaws.com heuristic, so disable multipart ranges explicitly.
      useMultipleRangeRequest: false,
    },
  ];
}

module.exports = config;
