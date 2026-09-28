"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { extract } = require("@electron-internal/extract-zip");

const arch = process.argv[2] || "x64";
if (!["x64", "arm64"].includes(arch)) throw new Error("Usage: node scripts/bundle-windows-tools.cjs [x64|arm64]");
const root = path.resolve(__dirname, "..", "windows-vendor", arch);
const hayabusa = {
  x64: { name: "hayabusa-4.1.0-win-x64.zip", sha256: "4d304cc5baaa750ed08cc24b7b89c58ea058740c7e344502d7b82554637543a8" },
  arm64: { name: "hayabusa-4.1.0-win-aarch64.zip", sha256: "f305183e49fcb65cc1f65921845bea8c8522a5bd4e1a12117931532ca12f0d3d" },
}[arch];
const bmcCommit = "5a4cad32be78b3b874aeec910cb478e04ba3501e";
const pythonVersion = "3.13.12";

async function download(url) {
  console.log(`Downloading ${url}`);
  const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

function digest(buffer) { return crypto.createHash("sha256").update(buffer).digest("hex"); }

async function main() {
  const manifestPath = path.join(root, "bundle-manifest.json");
  try {
    const previous = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (previous.arch === arch && previous.hayabusa.sha256 === hayabusa.sha256
      && previous.bmcCommit === bmcCommit && previous.python.version === pythonVersion) {
      for (const file of ["hayabusa/hayabusa.exe", "tools/python/python.exe", "tools/bmc-tools/bmc-tools.py"]) {
        await fs.access(path.join(root, file));
      }
      console.log(`Using prepared Windows ${arch} tools at ${root}`);
      return;
    }
  } catch { /* prepare the pinned tools */ }

  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "irflow-windows-tools-"));
  try {
    await fs.mkdir(root, { recursive: true });
    const hUrl = `https://github.com/Yamato-Security/hayabusa/releases/download/v4.1.0/${hayabusa.name}`;
    const hBytes = await download(hUrl);
    if (digest(hBytes) !== hayabusa.sha256) throw new Error("Hayabusa SHA-256 mismatch");
    const hZip = path.join(temp, hayabusa.name);
    await fs.writeFile(hZip, hBytes);
    const hRoot = path.join(root, "hayabusa");
    await extract(hZip, { dir: hRoot });
    const bin = (await fs.readdir(hRoot)).find((name) => /^hayabusa.*\.exe$/i.test(name));
    if (!bin) throw new Error("Hayabusa executable absent from archive");
    if (bin !== "hayabusa.exe") await fs.rename(path.join(hRoot, bin), path.join(hRoot, "hayabusa.exe"));

    const pName = `python-${pythonVersion}-embed-${arch === "x64" ? "amd64" : "arm64"}.zip`;
    const pUrl = `https://www.python.org/ftp/python/${pythonVersion}/${pName}`;
    const pBytes = await download(pUrl);
    // CPython publishes the archive checksum in its SPDX software bill of materials.
    const sbom = JSON.parse((await download(`${pUrl}.spdx.json`)).toString("utf8"));
    const archive = sbom.packages.find((item) => item.packageFileName === pName && item.downloadLocation === pUrl);
    const expected = archive?.checksums?.find((item) => item.algorithm === "SHA256")?.checksumValue;
    if (!expected || digest(pBytes) !== expected.toLowerCase()) throw new Error("Python SHA-256 mismatch or missing publisher checksum");
    const pZip = path.join(temp, pName);
    await fs.writeFile(pZip, pBytes);
    await extract(pZip, { dir: path.join(root, "tools", "python") });

    const bmcRoot = path.join(root, "tools", "bmc-tools");
    await fs.mkdir(bmcRoot, { recursive: true });
    const bmcFiles = {};
    for (const name of ["bmc-tools.py", "README.md", "LICENCE.txt"]) {
      const bytes = await download(`https://raw.githubusercontent.com/ANSSI-FR/bmc-tools/${bmcCommit}/${name}`);
      await fs.writeFile(path.join(bmcRoot, name), bytes);
      bmcFiles[name] = digest(bytes);
    }
    await fs.writeFile(manifestPath, JSON.stringify({
      arch, hayabusa: { version: "4.1.0", url: hUrl, sha256: hayabusa.sha256 },
      python: { version: pythonVersion, url: pUrl, sha256: expected }, bmcCommit, bmcFiles,
    }, null, 2) + "\n");
    console.log(`Prepared Windows ${arch} tools at ${root}`);
  } finally { await fs.rm(temp, { recursive: true, force: true }); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
