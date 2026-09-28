# IRFlow Timeline

![IRFlow Timeline home screen — capability launcher with Process Inspector, Lateral Movement, Persistence, Sigma, Collect AI Artifacts, Master File Table, USN Journal, and Open & Explore](assets/IRFlow-Timeline-Home.png)

> [!IMPORTANT]
> This repository is the Windows port of [Renzon Cruz's original IRFlow Timeline](https://github.com/r3nzsec/irflow-timeline), maintained by Yamato Security. We created this fork because the original project did not provide a Windows port. The application design and the great majority of its functionality come from Renzon's project; Windows-specific packaging, compatibility work, and testing are maintained here.

Native Windows forensic timeline analysis for Windows 10/11 on x64 and ARM64. Import, search, and investigate EVTX, CSV, TSV, XLSX, Plaso, `$MFT`, `$J`, triage collections, and local AI-assistant artifacts. IRFlow Timeline uses Electron, SQLite, and FTS5 to keep multi-million-row investigations responsive.

## Timeline Explorer-style workflow, with more DFIR capabilities

IRFlow Timeline keeps the familiar parts of Eric Zimmerman's Timeline Explorer—fast tabular review, sorting, filtering, searching, column management, bookmarks, and export—but goes substantially beyond a timeline grid:

- **Direct evidence ingestion** — Open raw EVTX, raw NTFS `$MFT` and `$UsnJrnl` (`$J`), Plaso databases, CSV, TSV, and XLSX without first converting everything to a common CSV.
- **Built-in investigation views** — Process trees, lateral-movement graphs, RDP session reconstruction, persistence analysis, timestomping detection, ransomware-impact analysis, IOC review, and file-activity heatmaps.
- **Detection and enrichment** — Run bundled Hayabusa/Sigma rules against EVTX and enrich indicators through VirusTotal with local caching.
- **Cross-source analysis** — Work with multiple evidence tabs, correlate related telemetry, compare timelines, group events, and pivot between findings and source rows.
- **Large-dataset performance** — SQLite-backed imports, streaming parsers, virtualized grids, indexes, and FTS5 search support timelines containing millions of rows.
- **Windows artifact workflows** — KAPE/triage discovery, VHDX artifact extraction, RDP bitmap-cache recovery with bundled bmc-tools and Python, and offline EVTX message rendering.
- **AI application forensics** — Collect and normalize histories from Claude Code, Codex, ChatGPT, Gemini CLI, Cursor, Copilot, Windsurf, Continue, and other supported assistants, including secret/token exposure checks.
- **Analyst reporting** — Tags, bookmarks, saved sessions, filtered exports, evidence provenance, and HTML/PDF reporting from analyzer results.

### Key Features

- **AI Artifacts** — Collect local AI history from Claude Code, Codex, Grok Build, ChatGPT Desktop, Gemini CLI, Cursor, Copilot, Windsurf, and Continue into one timeline tab; **ChatGPT Computer History** for macOS interaction telemetry; **AI Secret Hunt** for exposed keys, tokens, and credentials
- **Raw NTFS Artifact Import** — Direct ingestion of `$MFT` and `$UsnJrnl` (`$J`) with full path reconstruction, SI/FN timestamps, and change reason mapping
- **Ransomware Analytics** — Automated impact analysis from `$MFT` data: bulk rename detection, entropy-based extension analysis, ransom note identification, and temporal clustering
- **VirusTotal Enrichment** — IOC matching with bulk VT lookups, malware family extraction, verdict badges, relationship pivoting, and local caching
- **Process Inspector** — Parent-child process tree analysis with 340+ MITRE ATT&CK detection rules
- **Lateral Movement Tracker** — Network logon and RDP session visualization as interactive force-directed graphs
- **RDP Bitmap Cache Recovery** — Recover `bcache*.bmc` and `cache????.bin` artifacts with bundled bmc-tools, preview images, and export evidence packages
- **Persistence Analyzer** — 30+ persistence techniques with account chain detection, cross-technique correlation, and PowerShell 4104 script block reassembly
- **IOC Matching** — 17+ indicator categories with auto-defanging, inline highlighting, CSV/HTML export with VT enrichment data

For the upstream feature documentation, visit the **[original IRFlow Timeline documentation](https://r3nzsec.github.io/irflow-timeline/)**. Windows-specific instructions are in [WINDOWS.md](WINDOWS.md).

## Building from Source

**Prerequisites (for developers only):**
- Windows 10 or Windows 11
- Node.js 22.14 or later
- An x64 or ARM64 system matching the build you want to run

```powershell
git clone https://github.com/Yamato-Security/irflow-timeline-windows.git
cd irflow-timeline-windows
npm ci --ignore-scripts
npx patch-package
node node_modules/electron/install.js

# Development (hot-reload)
npm run dev

# Build + launch
npm run start

# Build a portable Windows folder
npm run dist:win:x64
# Or, for Windows on ARM
npm run dist:win:arm64
```

Portable builds are written under `release/windows/`. The Windows build bundles Hayabusa, its offline rules, bmc-tools, and embedded Python; users do not need to install those dependencies separately. The development builds are unsigned.

## Credits & Acknowledgments

This Windows port is based on [IRFlow Timeline](https://github.com/r3nzsec/irflow-timeline), created by [Renzon Cruz](https://github.com/r3nzsec). IRFlow Timeline was inspired by [Eric Zimmerman's Timeline Explorer](https://ericzimmerman.github.io/).

### Open Source Projects

| Project | Usage | Link |
|---------|-------|------|
| **Electron** | Application framework | [electron/electron](https://github.com/electron/electron) |
| **better-sqlite3** | High-performance SQLite engine with WAL mode, FTS5 | [WiseLibs/better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| **@ts-evtx/core** | Native Windows EVTX event log parsing | [NickSmet/ts-evtx](https://github.com/NickSmet/ts-evtx) |
| **Plaso (log2timeline)** | Forensic timeline generation (we import Plaso SQLite output) | [log2timeline/plaso](https://github.com/log2timeline/plaso) |
| **ExcelJS** | XLSX streaming reader | [exceljs/exceljs](https://github.com/exceljs/exceljs) |
| **SheetJS (xlsx)** | XLSX parsing | [SheetJS/sheetjs](https://github.com/SheetJS/sheetjs) |
| **csv-parser** | CSV/TSV streaming parser | [mafintosh/csv-parser](https://github.com/mafintosh/csv-parser) |
| **React** | UI rendering | [facebook/react](https://github.com/facebook/react) |
| **Vite** | Build tooling and hot-reload | [vitejs/vite](https://github.com/vitejs/vite) |
| **VitePress** | Documentation site | [vuejs/vitepress](https://github.com/vuejs/vitepress) |
| **electron-builder** | Windows portable packaging and macOS DMG packaging | [electron-userland/electron-builder](https://github.com/electron-userland/electron-builder) |
| **Hayabusa** | Sigma-based Windows event-log detection | [Yamato-Security/hayabusa](https://github.com/Yamato-Security/hayabusa) |
| **bmc-tools** | RDP Bitmap Cache recovery | [ANSSI-FR/bmc-tools](https://github.com/ANSSI-FR/bmc-tools) |

### DFIR Community

- [Eric Zimmerman](https://ericzimmerman.github.io/) -- Timeline Explorer for Windows, the original inspiration for this project
- [log2timeline/Plaso](https://github.com/log2timeline/plaso) -- Super timeline generation framework by Kristinn Gudjonsson and contributors
- [SANS DFIR](https://www.sans.org/digital-forensics-incident-response/) -- DFIR training and community resources
- [The DFIR Report](https://thedfirreport.com/) -- Real-world intrusion analysis reports that informed threat detection patterns
- [CyberCX](https://cybercx.com.au/blog/ntfs-usnjrnl-rewind/) -- NTFS $UsnJrnl research that informed $J parsing implementation

### Beta Testers

Thanks to the following people for testing and providing feedback:

- [Maddy Keller](https://www.linkedin.com/in/madeleinekeller98/)
- [Omar Jbari](https://www.linkedin.com/in/jbariomar/)
- [Nicolas Bareil](https://www.linkedin.com/in/nbareil/)
- [Dominic Rathmann](https://www.linkedin.com/in/dominic-rathmann-77664323b/)
- [Chip Riley](https://www.linkedin.com/in/criley4640/)

## License

Apache-2.0
