# IRFlow Timeline for Windows

This source port is based on upstream commit `a0af054723ef5db771098156979c52bb42ae703e` (1.0.13).

## Run

Extract the complete distribution folder and double-click `IRFlow Timeline.exe`.
Keep `resources`, `locales`, the DLLs, and the other files beside the executable.
No Node.js, Python installation, administrator rights, or installer is required.
Use the x64 build on Intel/AMD Windows and the arm64 build on Windows on ARM.
This is an unsigned development build.

Open evidence from File > Open, drag files into the window, or pass file paths:

```powershell
& '.\IRFlow Timeline.exe' 'C:\Evidence\timeline.csv'
```

Windows uses Ctrl in place of Command. Alt reveals the native application menu.
Settings and analysis caches use the current user's application-data directory;
the application folder contains the runtime and bundled tools.
Set `IRFLOW_USER_DATA_DIR` to choose a separate settings/cache directory, for
example when testing or keeping a portable workspace on another drive.
Hayabusa 4.1.0 with rules, bmc-tools, and embedded Python 3.13.12 are included.
Internet access is required only for online features such as VirusTotal and rule updates.
No automatic application-update feed is configured for this local Windows build.
macOS-specific artifacts can be analyzed when supplied as evidence; they are not
Windows telemetry sources.

## Rebuild

Install Node.js 22.14 or later. From this source checkout:

```powershell
npm ci --ignore-scripts
npx patch-package
node node_modules/electron/install.js
npm run dist:win:x64
# Or: npm run dist:win:arm64
```

The folder build is written under `release/windows/`. The bundling script pins
Hayabusa and bmc-tools, verifies the published Hayabusa/Python checksums, and
records source versions and hashes in `resources/bundle-manifest.json`.
SQLite's Node-API Windows binaries are bundled directly; no C++ build tools are needed.
The packaging hook checkpoints the offline EVTX message catalog and converts it
from WAL to rollback-journal mode so it remains read-only at runtime.

## Validation

Run `npm test` for the source tests. The ARM64 folder was also validated on a
Windows 11 Pro ARM64 VM using copied/synthetic evidence and a separate user-data
directory. The live checks covered:

- native ARM64 Electron, SQLite, and FTS5 loading;
- CSV, TSV, XLSX, and EVTX imports, including spaces and Japanese characters;
- the offline EVTX message catalog, filtering, sorting, bookmarks, and tags;
- bundled Hayabusa 4.1.0, Python 3.13.12, and bmc-tools;
- the packaged renderer and sandboxed preload bridge;
- a file passed on first launch and another passed to the running instance; and
- discovery of the bundled RDP bitmap-cache tooling.

The machine-readable runtime reports and screenshots accompany the handoff.
The x64 folder passed the same suite under Windows 11 ARM's x64 emulation; it
was not run on a native x64 VM during this validation.
