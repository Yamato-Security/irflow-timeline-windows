# Changelog

Release history for Yamato Security's IRFlow Timeline fork and the earlier project it builds on. Versions 1.0.11–1.0.13 below retain the earlier project's release history; Yamato Security's macOS releases begin at 1.0.14. Windows and Linux port changes are identified in their entries.

See also the [documentation changelog](docs/about/changelog.md).

## v1.0.16

### Fixes

- **Actions → Pivot ±N Minutes:** Hayabusa timestamps with a space before the UTC offset now work. **Apply** closes the dialog and keeps existing filters; **Apply and remove filters** applies the selected timeframe alone. Presets select a window before applying, and invalid timestamps show an error (@YamatoSecurity)

- **Time-window pivots keep the source event selected and centered**, including when clearing a critical-only filter reveals rows beyond the loaded grid window. Both buttons update the histogram's timestamp column and date-range controls, which now display pivot bounds correctly (@YamatoSecurity)

- **The `yyyy-MM-dd HH:mm:ss.fffffff` date format shows each timestamp's own fractional seconds**, also after a time zone change. A Hayabusa `-O` time ending in `.1234567` showed as `.1230000`. Shorter fractions are padded with zeros and longer ones cut to seven digits without rounding. Sorting and date-range filters keep the full fraction too, for timestamps with a UTC offset (`Z`, `+09:00`) and for dates written like `2026/10/20` or `Oct 20 2026`, so events within the same millisecond stay in order (@YamatoSecurity)

## v1.0.15 — Windows port

Changes in Yamato Security's Windows port since `v1.0.14-windows.1`. The port now has the same features and fixes as Yamato Security's macOS fork [v1.0.15](https://github.com/Yamato-Security/irflow-timeline-mac/releases/tag/v1.0.15).

### DuckDB engine

- **Timelines are stored and queried with [DuckDB](https://duckdb.org/) instead of SQLite.** DuckDB is a columnar database that runs each query on every CPU core, which suits timeline work: searches, sorts, stacking, histograms and the analyzers all read whole columns
- **Search needs no index any more.** Each column is checked with a case-insensitive substring match in parallel, so complete results are there as soon as a tab opens; there is no full-text index to wait for. Regex search uses DuckDB's own regex engine (RE2) and falls back to JavaScript only for lookarounds and backreferences
- **Much smaller temp databases.** DuckDB compresses each column: a 41 MB Hayabusa CSV now takes 35 MB on disk instead of 242 MB, a 29 MB MFT CSV 8 MB instead of 178 MB
- **Faster to a ready tab.** Rows are bulk-loaded on DuckDB's thread while the next batch is parsed, and the background step after import only stores each timestamp column's sort key instead of building an index per column plus a full-text index
- **Search finds text after a NUL character** — SQLite stopped reading a value at an embedded NUL byte (seen in EVTX fields), so a match later in the row was missed
- **Numeric column statistics and sorts skip empty cells** instead of counting them as 0
- SQLite is still used to read SQLite evidence (Plaso storage, browser, VS Code, Codex and other AI app databases, the EVTX message database), for saved Sigma scan results (`results.sqlite`), and for the VirusTotal cache, so scan history and caches from earlier versions keep working
- Tab databases from earlier versions are not reused; sessions re-import their files as before

### Grid

- **View → Full-width cells** (`Ctrl+Alt+F`) makes every column as wide as its widest entry, and **View → Narrow-width cells** (`Ctrl+Alt+N`) as wide as its widest entry but at most 30 characters, so short columns take no more room than they need. Both size the columns from the rows the grid shows, as displayed (timestamps in the chosen date format), and keep each column at least as wide as its name
- **View → Freeze First Column** keeps the first column, the one right of Tags, in view while the grid scrolls sideways; **View → Unfreeze First Column** releases it
- **Right-click a column header** to open the column menu (as `Ctrl+Click` does), and **Hide Column** works on every header, the Tags column included
- **The Tags column can be hidden**, from the header menu or the Column Manager, which now lists it; **Show All** brings it back
- **Edit Filter lists the filters set under the column headers** (text, value list and date range) above its own conditions. A header filter's operator and text can be changed there, or any header filter removed, and Apply updates the header row; Clear All clears them too
- **Header filters have operators.** Right-click a filter box under a header, or click the button to its left, to choose Contains, Does not contain, Equals, Does not equal, Starts with, Ends with, Greater than, Less than, Is empty, Is not empty or Matches regex; the button shows the operator (`~`, `=`, `>`, …). The same menu turns the column's filter off and on (what the button did before) and clears it. Greater than and Less than compare timestamp columns as dates, in header filters and Edit Filter alike
- **The search box has an Ends with condition**, next to Starts with: `.exe` or `system32` matches cells ending with it
- The status bar, start screen and Quick Help say **DuckDB-backed** instead of SQLite-backed
- **Autumn has a red-brown timeline and toolbar** (`#6B3C2C`) **with red headers and status bar** (`#C93036`). The menu bar and tab bar are red-brown; the search conditions bar, group strip, column headers, menus and status bar are red. Their text is yellow `#EAC910`, except the column names (cream, as before) and the timestamp format, time zone, color scheme and match mode dropdowns and the search box (light green `#A6B784`). Lines and outlines above the timeline are dark orange `#FF8C00`
- **Spring's green bars have pale-yellow text** (`#FAE3A0`): the top row, the tab bar and the status bar. The filter boxes under the column headers, filled buttons and the toolbar and match mode dropdowns are pale yellow with purple `#6F5497` text; buttons that were lavender are `#678215` green
- **Christmas:** while a search is typed, the search conditions bar is red like the column headers, and **Clear All** in the group strip and the status bar is vermillion `#EA4630`

### Juntei

- **November 7 refreshed downloads:** recognize Juntei MFT CSVs using the renamed `uSecZeros` column instead of `ZeroU-Secs`. The refreshed 1.0.15 packages also include the November 6 Autumn, Spring and Christmas palette refinements described above

- **Every CSV that Juntei writes is recognized**, from `juntei auto-parse` and from each `juntei parse-…` and `juntei persistence-hunter` command: 55 templates, one per output, in `electron/juntei-templates.json`. The status bar names the format (for example **Juntei MFT**)
- **Each template lists its timestamp columns, and only those are timestamps**: they get the ⏱ mark, the date format and time zone, chronological sorting, date-range filters, the histogram and the Timestamp Converter. Every other column stays as written, whatever its name or values look like. Guessing from column names had missed 56 timestamp columns in Juntei's outputs (`MetadataChanged (SI)`, `LastRun`, `PreviousRun1`–`7`, `LastRunUTC`, …) and taken 33 other columns for timestamps (`UpdateSequenceNumber`, `StartType`, `FocusTimeMs`, …). See [Juntei Templates](https://github.com/Yamato-Security/irflow-timeline-windows/blob/main/docs/reference/juntei-templates.md)

### Hayabusa

- **Every CSV that Hayabusa writes is recognized**: each `dfir-timeline` profile (minimal, standard, verbose, all-field-info, all-field-info-verbose, super-verbose, timesketch-minimal, timesketch-verbose) and the `search`, `logon-summary`, `eid-metrics`, `computer-metrics`, `log-metrics` and `extract-base64` outputs, with or without GeoIP columns: 15 templates in `electron/hayabusa-templates.json`, each listing its timestamp columns. The status bar names the format (for example **Hayabusa standard**)
- **Timelines are colored by rule level**, the same in every color scheme: informational rows white, low green, medium yellow, high orange, and critical and emergency red, all with black text, in the colors Hayabusa uses for these levels
- **Every Hayabusa timestamp format is read correctly.** `--us-time` lost its UTC offset, fractional seconds and `PM`; `--us-military-time` lost its offset; `--european-time` was read month first, so `03-08-2017` (3 August) became 8 March. A timestamp column whose dates can only be day first is now read day first for display, sorting, date filters and the histogram. See [Hayabusa Templates](https://github.com/Yamato-Security/irflow-timeline-windows/blob/main/docs/reference/hayabusa-templates.md)

### Fixes

- **DuckDB imports no longer show the obsolete "Search index skipped (large file)" warning.** Search does not depend on the previous SQLite full-text index

- **Copying from a cell's detail popup shows that it worked.** The popup's Copy buttons fill in solid for a second (near-black on light themes, near-white on dark ones) and say "✓ Copied", with a quick press, and Timestamp Converter values show "✓ Copied" beside the value; a copy the clipboard refuses says "Copy failed"
- **Enter in Edit Filter applies the filter once.** Opened from the status bar, the dialog closed on Enter and opened again at once, so a second Enter was needed; closing any dialog now returns focus to the button that opened it only after the key press
- **Toolbar menus close when you click outside them.** File, View, Actions, Tools and Help stayed open until their own button was clicked again; a click on the grid, the menu bar or the search box now closes them
- **Shortcuts are labeled Ctrl, Alt, Shift in that order** in the menus, the command palette, the Shortcuts list and Quick Help: `Ctrl+Alt+F` and `Ctrl+Shift+O`, not `Alt+Ctrl+F` and `Shift+Ctrl+O`. The Shortcuts list shows the font size keys as `Ctrl++ / Ctrl+-`

### Build

- **DuckDB's Windows library is packaged for each architecture** — `npm run dist:win:x64` and `dist:win:arm64` fetch `@duckdb/node-bindings-win32-x64` or `-win32-arm64` at the version and SHA-512 recorded in `package-lock.json` (`scripts/ensure-duckdb-bindings.cjs`, which now takes a target), so either folder can be built on any host, and each keeps only its own architecture's library

## v1.0.14 — Windows port

Changes in Yamato Security's Windows port since `v1.0.13-windows.1`. The port now has the same color schemes and fixes as Yamato Security's macOS fork [v1.0.14](https://github.com/Yamato-Security/irflow-timeline-mac/releases/tag/v1.0.14):

### Color schemes

- **Six seasonal color schemes** join Dark Mode and Light Mode: **Spring** (light forest green and fresh `#678215` green with floral accents), **Sakura** (blossom pinks, cream and pale blue), **Summer** (aqua blue with pale-yellow headers and sunny-yellow chart panels), **Autumn** (Japanese autumn reds: a bright-red timeline under dark red-brown headers), **Winter** (snow white and pale glacier blue) and **Christmas** (forest and jewel greens, festive red headers and controls, vermillion and gold charts). Choose one from the toolbar dropdown or **Tools → Color Scheme**
- **Refined Light Mode** — soft gray chrome, white rows, navy text, teal and blue controls, blue selections and amber bookmarks
- **The choice is remembered** across launches, the native menu shows the active scheme, and the window is painted in the scheme's background before the interface loads
- Scrollbars, text selection, histogram bars, context menus and native form controls follow the scheme; the Ransomware report follows the scheme's dark or light base
- Text, headers, filled controls and selected or bookmarked rows stay readable in every scheme (main text at least 7:1, 4.5:1 on Autumn's red), and severity colors stay distinct — all enforced by the test suite
- The reference palettes behind the seasonal schemes and their hex codes are listed in [Preferences → Color Scheme](https://github.com/Yamato-Security/irflow-timeline-windows/blob/main/docs/reference/preferences.md#color-scheme)

### Fixes

- **The first search or filter on a newly opened file is applied** — it was ignored until the filter was cleared and set again. Jumping to another tab with a search (**Find across tabs**, the AI Workspace correlate filter) also showed rows for the old query
- **Search-box Equals, Starts with and Like compare the whole input**, as Edit Filter does: Equals `Local Settings` finds cells that are exactly `Local Settings` instead of looking for one cell equal to `Local` and another equal to `Settings`
- **Double quotes group a phrase in every match mode** and are not part of the value. In Mixed mode, `Col:"phrase"`, `-"phrase"` and `+"phrase"` work as well
- **A quoted phrase no longer matches across two neighbouring cells** while the search index is still being built

## v1.0.13 — September 8, 2026

### Process Inspector — correct process identity and lower-noise promotion

- Security 4688/4689 process roles are now resolved per event: `NewProcessId` is the created process on 4688, while termination/privilege events continue to use their own subject PID. EvtxECmd hexadecimal PIDs are normalized instead of collapsing to PID 0
- Sysmon EID 7 and 11 enrichment evaluates the loaded module or created file, not the host process's `Image`. Signed system DLLs and non-PE files no longer inherit a writable process path; real unsigned module loads and dropped executables remain visible
- Administrative binaries are argument-gated: query/list operations from `wmic`, `vssadmin`, `bcdedit`, `wevtutil`, `wbadmin`, and `reg` stay low/context, while destructive or remote-execution forms retain high/critical severity and ATT&CK mapping
- LSASS-tool names require LSASS targeting or corroborating Process Access evidence before critical promotion. Browser/DNS volume, installers, Python virtual environments, `conhost`/WerFault churn, sanctioned vendor roots, and non-remote `Invoke-Command`/`Set-Service` activity receive bounded false-positive handling
- WinRM, DCOM, web-shell, script-from-AppData, RMM/tunnel, `netsh portproxy`, injection, and writable-path service-child coverage is retained or expanded. Chain rules are suppressed across PID-reuse mislinks, and the free-text Event ID filter is parameterized before SQL

### Lateral Movement Tracker — channel-safe sessions and behavioral corroboration

- Consolidated exports now gate ambiguous Event IDs by channel, preventing Sysmon 22/23 rows from becoming fabricated TerminalServices sessions. Raw single-channel logs and Hayabusa RDS-LSM/RDS-RCM aliases remain supported
- Timestamp ordering uses parsed instants across space-separated, ISO, and offset-bearing values; gap, first-seen, and off-hours logic no longer depends on lexical order or the analyst Mac's timezone. The estate UTC offset is configurable in the tracker
- Fixed-cadence service password retries and well-known machine, IIS app-pool, Exchange health, and Entra sync identities are dampened without suppressing ordinary accounts merely named like service accounts
- A single fail-then-success RDP sequence is medium unless repeated or directed at a domain controller. Password spray against many accounts on one target, Type 9 alternate credentials, loopback-tunnelled RDP, RdpCoreTS 140 bursts, RDP shadowing (20503), and write activity against `ADMIN$` gain dedicated coverage
- 4776 user attribution, 4778 client-address fallback, and 4672 admin attribution now follow their own event fields and Logon IDs instead of a nearby row or same-second coincidence

### Export, session, and evidence-package integrity

- CSV/TSV fields containing bare carriage returns are quoted as well as LF-bearing fields, preventing terminal/progress content from shifting columns during round-trip import
- AI source-coverage and acquisition metadata survive session save/reopen; format-v2 export packages preserve source identity, companion files, coverage state, and a repeatable restore recipe
- Partial extracts stay visibly partial instead of being flattened into a generic success state

### AI Apps Forensics Phase 4 — bounded acquisition and measured worker performance

- Every qualified extraction now carries wall time, first-result latency, rows/s, observed bytes read, eligible source bytes, peak RSS, and a versioned per-source completion ledger
- The merged worker uses its shared atomic cancellation flag during filesystem, JSONL, hashing, and SQLite loops; cancellation errors propagate instead of being converted into per-file failures
- Context and Cursor database inventories are sorted, fingerprinted, and resumable with deterministic cursors. Explicit limits list the remaining paths rather than hiding them
- Live SQLite evidence is acquired with a transactionally consistent `VACUUM INTO` snapshot and verified with `PRAGMA quick_check`; original database/WAL/SHM identities and the parse snapshot identity are recorded separately
- A repeatable Node and Electron harness qualifies tiny, six-app representative, 1 GiB Codex, malformed/oversized-line, 30-Cursor-store, GrokBot multi-account/large-attachment, and active-WAL corpora under a 512 MiB worker heap

Reference qualification on an Apple M4 Max: Node 26.7.0 parsed the 1 GiB rollout in 3.06 s warm (334.4 MiB/s); Electron 43.3.0 in 3.62 s (283.2 MiB/s). Both emitted 32,602 identical rows with matching row and coverage hashes. Atomic cancellation completed in 1.19 ms and 90.74 ms. This report is the initial baseline for the next release's 20% regression gate.

### AI Apps Forensics Phase 3 — context, history, independent results, and complete source accounting

- **Claude Code:** parses CLI settings, permission posture, hooks, and MCP definitions; supports `CLAUDE_CONFIG_DIR`; inventories instructions, memory, skills/plugins, tasks/plans, physical file history, and backups with SHA-256. Credential files are never opened or hashed
- **OpenAI Codex:** parses `config.toml` project trust/MCP/plugin settings and instruction/plugin context; emits independent media-reference rows; inventories every eligible rollout, SQLite store, and WAL/SHM/journal companion. Missing and partial rollouts use measured coverage before SQL projection recovery
- **Grok Build:** parses config/trust/version/identity, hashes generated prompt bodies, reads terminal logs independently, decodes worktree rows, and inventories background-task/upload/automation state. Configuration rows never claim execution
- **Gemini CLI:** retains immutable `history_*` rows and rewind/replacement operations alongside the reconstructed current state; supports `GEMINI_CLI_HOME`; adds MCP/tool policy, hashed memory/skill context, and backup/replacement inventory
- **Cursor:** recovers structured tool calls/results including tool-only bubbles, retains native timestamps, inventories hooks/MCP/plans/agent context/raw AI tracking indexes, and accounts for all eligible SQLite stores up to an explicit 2,048-store limit instead of the former 20/16 discovery limits
- Consumer Grok, Gemini desktop/web/mobile, Claude consumer chat, and Cursor cloud history remain explicitly unsupported pending qualified corpora

### Collect AI Artifacts no longer OOMs the worker on large Codex stores

Collect AI Artifacts runs in a worker thread inside the Electron process. A V8 out-of-memory abort on that thread (`node::OOMErrorHandler`) takes the whole app down. On a host whose `~/.codex/sessions` held multi-gigabyte `rollout-*.jsonl` files (one 861 MB), the worker accumulated every row from that source with full message bodies before flushing to SQLite.

- Codex rollouts stream line by line regardless of the former 48 MB threshold; only explicit inventory-only mode skips a large rollout body
- The merged extract flushes to SQLite every 15,000 rows and caps stored FullText at 8 KB per row (enough for secret scanning; single-tool Codex import still keeps the full body)
- Rollout files are read two at a time with a 4 MB per-line cap

### AI artifact parsers — control-plane stores from recent app updates

Collect AI Artifacts now reads the consent, remote-control, and workspace-inventory files the chat transcripts do not carry.

- **Grok Build** `events.jsonl` (tool start/complete, permission request/decision with wait time, MCP lifecycle) and `signals.json` (including `gcsQueue*` codebase-upload counters)
- **Grok Bot Phase 2 evidence semantics.** Transcript permission cards now separate pending/allowed/persistent-policy/denied/expired/cancelled/unknown states from execution, preserve nested request IDs, and leave daemon results unknown unless an explicit same-scope link exists. Typed tool-call, notice, structured approval, reply/channel, and send-journal v1/v2 fields retain native lifecycle IDs and times. Current and rotated daemon logs disclose byte and detail-row omissions. Exactly 200 retained entries reports a retention boundary and unknown earlier availability rather than inventing a deleted 201st entry. Per-root counts now merge identically in direct, profile-memory, and streamed-database imports.
- **Grok Bot attachment verification.** Hash-shaped cloud filenames are recorded as `referenceSha256`; a `computedLocalSha256` is populated only after an opt-in, bounded, cancellable local-file search proves a name + size + SHA-256 match. User folders are not searched by default.
- **Codex** `remote_control_enrollments` and the `projects` / `project_roots` catalogue in `state*.sqlite`
- **Codex authorization and exposure.** `rules/*.rules` (execpolicy prefixes that run without a prompt, `exec_policy_rule`) and `shell_snapshots/` (per-thread dumps of the exported shell environment; credential-like variable names reported, values never read, `shell_snapshot`)
- **Codex `thread_history*.sqlite`.** The app's SQL projection is read for a rollout that is missing, unreadable, or measured as partly parsed, restoring prompts, commands with cwd/pid/exit code, file changes, MCP and web calls, subagent spawns and turn status without duplicating fully parsed rollouts
- **Codex memory, remote hosts and side stores.** `memories*.sqlite` and `memories/*.md` (model memory of the user, per-section, tagged model-written), `.codex-global-state.json` (Codex-managed SSH hosts with identity key, Remote Control allowed hosts, mobile pairing, local project roots; push token never read), `ambient-suggestions/`, `goals*`/`queue*.sqlite`, voice transcription history
- **ChatGPT / Codex desktop profile** `sentry/scope_v3.json` + `session.json` (signed-in user and account, build, and a second-precision breadcrumb trail of backend calls, UI clicks and console errors with every query string stripped) and credential-store inventory for `Default/` and the agent's `codex-browser-app/` profile
- **ChatGPT Work-with-Apps** `com.openai.chat/app_pairing_extensions/` — one row per paired app and workspace, flagging write capabilities such as `setContent`
- **Claude Desktop** `bridge-state.json` and `claude_desktop_config.json` (trusted folders, remote folder grants, MCP servers — env values redacted)
- **Claude Code** `~/.claude.json` and timestamped backups: per-project last session / trust / cost / MCP, Remote Control flag, account identifiers. Workspaces that exist only in a backup are emitted as `project_removed`
- **ChatGPT / Codex merged desktop app** Chromium profile at `~/Library/Application Support/Codex` (in-app History visits, artifact-sessions inventory). Login Data and Cookies are not read. Conversation bodies remain in `~/.codex`
- **Gemini CLI 0.58+** `projects.json`, `settings.json` hooks / sessionRetention / Auto Memory, `trustedFolders.json`, `google_accounts.json`, and slug-based `tmp/<id>/.project_root` / `history/<id>/.project_root`. OAuth token files are inventoried by name and size, never read

### Open a KAPE VHDX directly

**File → Open Triage Collection…** now accepts the `.vhdx` that KAPE writes with `--vhdx`, alongside a folder. macOS cannot mount a VHDX, so IRFlow reads the image itself: a VHDX container reader (dynamic and fixed images, checksum-verified headers, in-memory replay of an unflushed log so the file on disk is never touched) plus a read-only NTFS reader (MBR / GPT / bare volume, `$MFT` walk with fixups, resident and non-resident data, fragmented, sparse and `$ATTRIBUTE_LIST`-split streams). Only the artifacts the triage pipeline recognizes are copied into a scratch folder that mirrors the collection layout; that folder then flows through the existing manifest, host attribution, Lateral Movement and Sigma lanes. Extraction runs in a worker with progress and cancel, checks free space on the Temp Storage volume first, and reports NTFS-compressed or encrypted files by path instead of writing them as garbage. Verified byte-for-byte against macOS-mounted copies of three real KAPE exports, including one that needed log replay.

- Dropping a `.vhdx` on File → Open now explains where to open it instead of parsing the container header as a one-column CSV
- Differencing (child) VHDX images and VHD v1 images are refused with a clear message

## v1.0.12 — August 24, 2026

### Diff Tabs

View → **Diff Tabs** compares any two imported files — not a Computer History special case. Pick a baseline and a compare tab, match on auto-detected identity columns or entire-row content, and get a result timeline of Added / Removed / Changed rows with field-level before/after, clickable status counts, and schema-delta highlighting.

### Tags and bookmarks

A triage layer that was losing work in several places. Every item below is a fix, not a new feature.

- **Bulk Tag / Bookmark leads with an explicit scope** — Selected rows / Filtered view / Entire tab — defaulting to the selection whenever one exists, with the real row count for each option resolved in SQLite. Opened from the Actions menu it previously ignored the selection entirely and, on an unfiltered tab, tagged every row in the file on a single click. Writing to a whole tab now asks first, and the store refuses an unscoped write that has not been confirmed
- **Tags written during the post-import index build are no longer discarded.** Single- and multi-row tag and bookmark writes were dropped for the minutes that build takes, while the grid showed the tag as applied. The guard was unnecessary — the build runs on the same connection and touches only the data tables
- **Multi-row tagging applies one direction uniformly.** The right-clicked row is the anchor: its ● / ○ state decides add-versus-remove and that decision applies to every selected row. Previously each row decided for itself, so one click on a mixed selection tagged some rows and untagged others
- **"Select all" plus tag writes the whole filtered population** in SQL, honouring deselected rows. It used to write exactly one row while the status bar reported the full count
- **Cached query windows no longer repaint pre-tag state.** A filter round-trip could restore the tag snapshot from before an edit, making a successful write look like it had reverted
- **Manage Tags is backed by live row counts** and can rename a tag (merging into the destination on collision), collapse tags that differ only by case or spacing, and delete a tag from the rows that carry it. Deleting previously removed only the colour swatch — every row kept the tag, still filterable and still in the report, and could no longer be untagged from the row menu because the palette no longer listed it. Analyzer-written tags (`IOC:`, `VT:`, Sigma, `Encrypted`) now appear alongside manual ones
- **Tags and bookmarks survive export.** CSV, TSV and XLSX exports carry `Tags` and `Bookmarked` columns when the tab has any
- **`⌘⇧1`–`⌘⇧9` apply palette tag 1–9** to the current selection, under the same scope rules as the context menu
- Multi-row tag writes go through a single transaction instead of one IPC round trip per row

### ChatGPT Computer History — live re-audit (this Mac, 16,173 events)

The 1.0.10 catalog and the 1.0.11 verification both missed a later recorder kind, and overstated how hard 48-hour purge is.

- **`terminal.value_changed` is now parsed.** Nine events on the measured host, all while Secure Input was engaged. Content is the visible iTerm2 scrollback (`keyboard.target.value`): SSH targets, `rsync`/`scp` command lines, first-seen host-key acceptance. The typed password is still withheld. Previously the kind fell through to an empty `Content` field. Activity values: `Terminal Buffer`, `SSH Session`, and the Secure Input variants
- **Visible-range truncation is labelled.** Records prefixed `[truncated to visible range]` are the on-screen AX slice, not full scrollback
- **`com.openai.chat.StatsigService.plist`** is collected as `identity.statsig_account` — email / user id / account UUID with no tokens
- **Computer History plugin vs Computer Use MCP** are recorded separately. They share a container; they are not the same feature
- **48-hour purge caveat.** Advertised rolling window applies while the recorder is running. A stopped recorder left 90 segment buckets on disk three days after the last write

### Signed and notarized disk image

Every release through v1.0.11 shipped a DMG that was **never signed or submitted to Apple**. The application inside was notarized and stapled, so it ran cleanly once installed — but the downloaded disk image itself failed Gatekeeper (`no usable signature`), which is the *"Apple could not verify…"* dialog on first open and the reason the install page advised right-click → Open.

Notarization ran as an `afterSign` step, which fires on the `.app` before any DMG exists; the build then wrapped that stapled app in a disk image and did nothing further to the wrapper. The build now signs, notarizes and staples the DMG itself, and asserts with `spctl` that Gatekeeper accepts it before the build is allowed to succeed.

### Hayabusa v2 / v3 / v4 compatibility

Hayabusa v4 merged `csv-timeline` and `json-timeline` into a single `dfir-timeline` subcommand with an explicit `-t` output type, and rejects the old form before scanning a single event.

- **The scanner detects the installed binary's version and builds the matching command line**, keeping v2 and v3 on the legacy subcommands. Contributed by [@Yuds16](https://github.com/Yuds16) in [#27](https://github.com/r3nzsec/irflow-timeline/pull/27)
- **The output file extension matches the requested type.** `json` and `jsonl` both landed on `.jsonl`, so a JSON run wrote a JSON document into a file named `.jsonl`
- **Version detection requires a real version token.** A loose digit match meant an unparsable version string could route a v4 binary down the legacy path; anything unrecognised now falls back to the modern CLI
- **Hayabusa's abbreviated level names (`crit`, `med`) map to full severities.** Left unmapped they became their own severity buckets, so critical detections dropped out of the severity histogram

Known limitation: the `JSON` output mode still cannot be read by the result parser, which is line-delimited. Use `CSV` or `JSONL`.

### Multi-tab selection controls

- **Lateral Movement Tracker** gains **Select All** and **Clear** for its multi-source tab list
- **Persistence Analyzer** gains **Clear** alongside its existing **Select all**

Both contributed by [@Yuds16](https://github.com/Yuds16) in [#27](https://github.com/r3nzsec/irflow-timeline/pull/27).

## v1.0.11 — August 16, 2026

Computer History correctness release. Every claim in the 1.0.10 analysis was re-tested against a live 9,000-event capture; four were wrong, and three artifacts were not being collected at all.

### Corrected analysis

- **Credential rows no longer claim to recover passwords.** macOS Secure Input Mode blocks the recorder's event tap, so keystrokes consume event ids without ever being written — zero text-bearing input events under secure input across the measured capture. A credential row is now presented as a timing anchor: that a password was entered, in which field and app, at what second
- **Recorder restarts are detected instead of clearing the gap.** `EventId` restarts at 1 with each recorder session, and the previous continuity check subtracted ids across that boundary — yielding a negative shortfall that read as reassurance. On the measured capture it cleared 183 of 186 gap rows with "ids run continuously (17169 → 1)". Restart-spanning gaps are now reported as unassessed
- **Capture fidelity is measured, not assumed.** `resolveFidelityTier` takes the more capable of the known-app table and what the application actually produced, so a stale table entry can be corrected by evidence while a thin sample can never argue capability away. Slack, previously pinned to metadata-only on category reasoning, exposed 53,590 characters of channel content including message bodies
- **`ComputerUseAppApprovals.json` is no longer presented as the recording scope.** It belongs to the separate Computer Use agent feature; on the measured host it listed one bundle against 38 actually recorded, with an mtime predating the feature. Recording scope is account-side and is now reported as unknown

### New evidence collected

- **Consolidated Codex memory.** Skysight summaries are mined by the Codex memory consolidator into `~/.codex/memories/`, which is neither purged at 48 hours nor cleared with Computer History — on a stale host it can be the only surviving copy. Lines carrying the `[skysight memory]` provenance tag, and blocks citing a Skysight resource, are collected as `memory.consolidated` rows
- **Summary bodies are split into their distinct assertions.** `summary.profile` carries the model-inferred user dossier — the largest section, naming documents, typed search terms and application roles, and surviving the raw purge. `summary.priorcontext` carries text describing activity from outside its own window and is labelled so it is never used to date evidence
- **Mouse modifiers.** `mouse.modifiers` was dropped entirely. A command-click on a link opens it in a background tab — deliberate non-navigation, the bulk-open pattern — and now reaches the `KeyChord` column alongside keyboard chords
- **Secure Input as a second credential signal.** `app.secureInput` fires on any system-wide password prompt, including those exposing no secure-field subrole, and surfaces as `Password Prompt`

### Grok Build and Claude Desktop — stores that outlive the conversation

Six stores sitting outside the session trees were unread. All of them survive deletion of the conversation, which is what makes them worth having.

- **Grok `sessions/session_search.sqlite`** — the FTS5 index over session transcripts (`session_id`, `cwd`, `title`, `updated_at`, indexed body). The same artifact class as Cursor's `conversation-search.db`; it mirrors the transcript and survives deleting the session directory
- **Grok `logs/unified.jsonl`** — tool executions with outcome and duration, plus turn boundaries, written independently of the session tree. Records *that* a tool ran, never the command string
- **Grok `active_sessions.json`** — sessions open at acquisition, with pid and working directory
- **Claude Desktop `deleted_<session-uuid>` tombstones** — a 13-byte file whose content is the epoch-ms deletion time and whose filename is the deleted session id. Dated proof a conversation existed and was removed
- **Claude Desktop `pending-uploads/`** — files staged for upload, inventoried by path, size and staging time. File content is never read
- **Claude Desktop `plan-usage-history.json`** — usage samples collapsed into contiguous "application in use" windows, labelled as derived rather than as recorded session boundaries
- **Claude Desktop `scheduled-tasks.json` and `git-worktrees.json`** — agent runs configured to fire without user interaction, and workspaces with last-seen timestamps
- Discovery now prefers `~/Library/Application Support/Claude` over its `claude-code-sessions` child, because three of those stores are siblings of that directory. It replaces the child roots rather than adding to them, so no transcript is parsed twice, and nothing walks up out of a folder you selected
- `~/.grok/memtrace/` is **deliberately not parsed**: despite the name it is a memory profiler trace, not agent memory, and carries no conversation content

### Grid quality

- Click multiplicity is named by meaning — `Click`, `Double-Click`, `Triple-Click`, `Multi-Click` — instead of ten numeric `Click (xN)` values. The exact count remains in the `ClickCount` column, where a numeric dimension belongs
- Open (in-progress) segments are excluded from count reconciliation rather than scored as a shortfall
- Fidelity table corrections: Cursor's real bundle identifier added, a mislabelled entry removed, Slack and Discord tiered from evidence

### Naming

- The artifact family is **ChatGPT Computer History** everywhere — menu, tab title and the `Tool` column previously disagreed

The column schema is unchanged at 54 columns; existing saved tabs and sessions need no migration.

## v1.0.10

IRFlow Timeline 1.0.10 adds **ChatGPT Computer History** as a new forensic artifact family, and hardens the app for long-running investigations.

### ChatGPT Computer History (new)

- **New artifact family** — collect and analyze the opt-in macOS ChatGPT "Computer History" feature: the raw interaction-event stream (kept for roughly 48 hours) and the activity summaries that persist until the user clears them.
- **A timeline of real user activity** — see what was typed, clicked, selected, and dragged between applications, along with the window and website in view at the time. Not just that an application ran.
- **Credential entry is flagged** — typing into a password field is identified as credential entry, with a clear note that macOS hides the value while the keystrokes themselves are still recorded.
- **File and menu selections captured** — Finder file selections and menu commands now appear on the timeline; previously these arrived as empty rows.
- **Cleared history is detected** — each recording segment is reconciled against its own metadata, so records removed by the app's "clear last 10 minutes / hour / day" control are surfaced as a deletion lead rather than passing unnoticed.
- **Deleted summaries recovered** — activity summaries the user cleared are recovered read-only, together with when they were removed.
- **Deleted AI conversations flagged** — conversations marked deleted are identified, and the model chosen and text typed into them are often still recoverable from the activity timeline.
- **Host attribution** — identify the ChatGPT account and signed-in user behind a capture. Every identifier is labelled with how strongly it identifies an account rather than just a device, and no authentication tokens are ever stored or exported.
- **Analyst caveats travel with the evidence** — capture depth varies by application, and in hardened messaging apps only outbound typing is recorded. The import notice states these limits so they reach the report.

### Stability and Crash Resilience

- Worker threads are retired properly once finished, so they no longer accumulate during long sessions.
- Autosaves are written safely and validated on restore, with the previous snapshot kept as a fallback.
- Closing the macOS window now hides the workspace instead of tearing it down; Dock activation restores it with tabs and background work intact.
- Unexpected crashes trigger a clean shutdown of workers and databases followed by one controlled restart.
- A memory-aware worker budget now spans imports, indexing, analyzers, Sigma scans, and AI extraction.
- Cancelling a Hayabusa EVTX scan reliably stops the process and cleans up its temporary output.

### Additional Improvements

- Upgraded to Electron 43 with refreshed native dependencies.
- Minimum supported macOS is now 12 (Monterey).
- Building and testing now require Node.js 22.14 or newer.

**Full artifact paths, schema, and investigation guidance:** [AI Query History and AI App Artifacts](https://r3nzsec.github.io/irflow-timeline/dfir-tips/ai-query-history)

## v1.0.9

IRFlow Timeline 1.0.9 is a focused reliability patch for large Windows Event Log investigations.

### Large EVTX Imports

- **Issue #22 fixed** — Raw EVTX files are no longer opened through Node's whole-file `readFile()` path, removing the 2 GiB Buffer ceiling that rejected large `Security.evtx` files before the first record was parsed.
- **Bounded native chunk parsing** — Reads the 4 KiB EVTX header once, then processes one native 64 KiB EVTX chunk at a time instead of retaining the complete source file in memory.
- **Approximately 4 GiB EVTX support** — Handles logs up to the EVTX format's 65,535-chunk limit, including the reported 4,109,438,976-byte (~3.83 GiB) file.
- **Accurate large-file progress** — Progress now follows physical EVTX chunk offsets rather than record-local offsets.

### Import Reliability

- Duplicate requests for the same pending source are suppressed while preserving distinct workbook sheets and AI-history scopes.
- Repeated identical import failures collapse into one actionable notification instead of filling the screen with duplicate toasts.
- Regression coverage exercises the exact issue #22 file size and verifies that individual reads remain bounded to 64 KiB.

## v1.0.8

IRFlow Timeline 1.0.8 significantly expands **AI application forensics**, adding deeper artifact collection and parsing across popular AI assistants.

### AI Application Forensics

- **Grok Build support (new)** — collect and analyze Grok AI prompts, responses, reasoning, exact terminal commands, tool results, session context, and file-change records.
- **Claude expanded** — recursively parse Claude Code and Claude Desktop/Cowork sessions, transcripts, audit records, tool activity, and actual shell commands.
- **Codex expanded** — recover versioned SQLite data with WAL/SHM support, dated rollout sessions, commands, tool calls, and bounded outputs.
- Improved parsing for ChatGPT Desktop, GitHub Copilot CLI, Gemini CLI, Cursor, and other supported assistants.
- Better provenance, session relationships, and AI Secret Hunt safeguards.

### Additional Improvements

- New guided workflow for importing KAPE and triage collections.
- Enhanced Process Inspector, Persistence Analyzer, and Lateral Movement Tracker.
- Improved timeline navigation, bulk actions, and evidence review.
- Memory-safe queries and bounded workers for greater stability with large datasets.
- Signed and notarized universal macOS release for Apple Silicon and Intel.

## v1.0.7

Brings **AI assistant query history** into the timeline as a first-class forensic artifact: collect it from a host or triage package, normalize every tool into one tab, and **hunt for secrets that were leaked into AI chats** — passwords, API keys, tokens, and private keys.

### AI Query History (new)

- **Collect AI Artifacts** — choose **This Mac** or **Browse folder** (KAPE / triage / mounted disk); a forensic tree scan finds Windows, Linux, and macOS user-profile layouts, attributes each row to its `Users\<user>` / `home/<user>` profile and host, and merges every source into one **AI Query History** tab with verbose progress. Available from the **Tools** menu and the startup screen.
- **Native, offline extractors — no third-party AI binary:**
  - **Claude Code** — `history.jsonl` + project session JSONL under `.claude/` (Timestamp, Role, Summary, SessionId, Model, token counts, per-user/host attribution). Opening or dropping a `.claude` folder consolidates all JSONL into one tab (fixes JSONL mis-importing as broken CSV columns).
  - **ChatGPT Desktop** — LevelDB conversation metadata + SQLite message tables.
  - **Gemini CLI** — `~/.gemini/tmp/.../chats/session-*.json` (user + model messages, token counts, reasoning flag).
  - **Cursor**, **GitHub Copilot**, **OpenAI Codex**, **Continue**, **Windsurf**, and **Claude Desktop** — chat/session stores decoded into the same unified column schema.
- **Copilot JSONL depth** — replays `kind:0`/`1`/`2`, Code Insiders, and `emptyWindowChatSessions`; flags metadata-only sessions on import.
- **Cursor workspace decode** — project slugs map to filesystem paths where possible; transcript timestamps estimated from file birth/mtime.
- **AI Apps menu** — per-brand-tinted launchers for each supported assistant.

### AI Secret Hunt (new)

- **Automated secret & credential leak detection over collected AI history** — surfaces passwords, API keys, tokens, and private keys that were pasted into AI assistants. Lives under **Detection**, beside Sigma Scan.
- **Two-stage, precision-first detector** — a ReDoS-guarded regex catalog proposes candidates, then a validation layer (format/checksum validators, Shannon entropy, and an allow-list of well-known public test values) confirms them, so the default **Quick** scan favors precision. A **Deep** toggle adds PII (emails, phone numbers, and similar).
- **Redact-by-default** — findings are masked in the UI and **cleartext is never written to disk**; reveal per-row on demand, and each match carries a salted fingerprint for dedup/correlation.
- **Threat-report results view** — a liquid-glass UI on a Unit 42–style palette with progressive disclosure: group findings **by Tool or by Session**, provider badges per finding, and confidence / leak-direction / category chips.
- **Exposure brief** — export a polished **PDF or HTML** report of the findings.

### Under the hood

- New unit coverage across every AI-history extractor (Claude Code, ChatGPT, Gemini, Cursor, Copilot, Codex, Continue, Windsurf, Claude Desktop) and the secret detector, plus the path-attribution and profile-scan helpers.

## v1.0.6

A major release: IRFlow Timeline was rebuilt into ~150 focused modules and gained a full Sigma/Hayabusa detection layer plus RDP bitmap-cache recovery.

### Sigma Detection (new)

- **Dual detection engine** — run Sigma rules over **raw `.evtx` folders** via the bundled **Hayabusa** engine (universal binary, no setup, works offline), or over **imported timelines / EvtxECmd output** via an in-app JS Sigma engine.
- **MITRE ATT&CK-mapped triage dashboard** with severity/status filtering and a reopenable **scan history**.
- Scan **presets**, **custom YAML rules**, and **noisy-rule suppression**.

### RDP Bitmap Cache (new)

- Recover bitmap **tiles and collages** from Windows `bcache*.bmc` / `cache????.bin` artifacts (bundled **bmc-tools**).
- Records source/output hashes, keeps prior extraction history, and exports an **evidence package** for reporting.

### Lateral Movement — Accounts Accuracy

- Privilege/credential counts are now **scoped to lateral-movement activity** instead of host-wide totals, so suspicion scores aren't inflated by background noise.
- **Admin-logon correlation (4624 ↔ 4672)** recovers the ADMIN signal for network logons; machine/service accounts are no longer mislabeled.
- **Per-channel Sources/Targets breakdown** (logon / explicit-cred / RDP) explains why those columns can exceed the logon count.

### Under the Hood

- Full modular refactor of the renderer and main process (~150 focused modules).
- Import, indexing, and Sigma scans now run on **worker threads** for a smoother UI on large (30–50 GB) timelines.

### Build & Security

- **Universal** build (Apple Silicon + Intel), **signed and notarized**.
- Upgraded **xlsx (SheetJS) to 0.20.3**, addressing known vulnerabilities in 0.18.5.

### First-Run Notes

- **Sigma scans work fully offline out of the box.** Both the **EVTX Folder** (Hayabusa) and **Current Timeline Tab / EvtxECmd** (JS engine) scans use rules bundled inside the app — no install or network download is required (important on TLS-intercepting corporate/DFIR networks). When online, you can still refresh the JS Sigma rule set from SigmaHQ via the rule manager.
- **RDP Bitmap Cache** requires **Python 3** installed on your machine.

## v1.0.5

### Bug Fixes

- **Plaso import crash fixed** — all Plaso/log2timeline `.plaso` and `.timeline` files now import correctly (a malformed `LIMIT` clause in the column-discovery query caused a SQLite error on every Plaso file).
- **Intel Mac crash fixed** — `better-sqlite3` is now compiled as a universal fat binary (x86_64 + arm64), so the app no longer crashes on Intel MacBooks when opening a file.

### Context Menu Improvements

- **Filter in / Filter out** — right-click any cell to filter the grid to rows matching that value, or exclude them.
- **Tags submenu** — tags are collapsed into a submenu to keep the context menu compact.
- **Multi-row tagging** — select multiple rows, right-click, and apply a tag to all selected rows at once.
- **Opaque menu background** — grid content no longer bleeds through the context menu.

### Copy Behaviour Fix

- **⌘C respects text selection** — when text is selected in the detail panel, ⌘C copies the selection instead of intercepting it and copying the whole row.
