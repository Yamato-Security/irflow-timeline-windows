"use strict";

// Runs under the packaged Electron binary with ELECTRON_RUN_AS_NODE=1.
// No globally installed Node/Python and no host policy changes are needed.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { createRequire } = require("node:module");
const { spawn, execFileSync } = require("node:child_process");
const { once } = require("node:events");

const packageRoot = path.resolve(process.argv[2]);
const outputRoot = path.resolve(process.argv[3]);
fs.mkdirSync(outputRoot, { recursive: true });
const resources = path.join(packageRoot, "resources");
const appRoot = path.join(resources, "app.asar");
// In backend-only cross-platform checks, Electron's resourcesPath belongs to the
// host runtime rather than the package under test.
process.env.IRFLOW_RESOURCES_PATH = resources;
const appRequire = createRequire(path.join(appRoot, "package.json"));
const backendOnly = process.argv.includes("--backend-only");
const report = { started: new Date().toISOString(), mode: backendOnly ? "backend-only" : "windows-full", platform: process.platform, arch: process.arch, versions: process.versions, checks: [] };
let child;
let ws;
let db;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function check(name, fn) {
  const started = Date.now();
  const details = await fn();
  report.checks.push({ name, passed: true, milliseconds: Date.now() - started, details });
  console.log(`PASS: ${name}`);
}

async function main() {
  if (!backendOnly) assert.equal(process.platform, "win32", "Run this validation on Windows");
  const evidence = path.join(outputRoot, "evidence 日本語 spaces");
  fs.mkdirSync(evidence, { recursive: true });
  const csv = path.join(evidence, "timeline 日本語.csv");
  fs.writeFileSync(csv, 'Timestamp,Computer,EventID,Message\r\n2026-09-28 01:00:00,HOST-A,4624,"Login 日本語"\r\n2026-09-28 01:00:01,HOST-B,4688,"Process, comma"\r\n2026-09-28 01:00:02,HOST-A,4625,"Failed login"\r\n');
  const tsv = path.join(evidence, "timeline.tsv");
  fs.writeFileSync(tsv, 'Timestamp\tComputer\tMessage\r\n2026-09-28 01:00:00\tHOST-A\tTSV test\r\n');
  const XLSX = appRequire("xlsx");
  const xlsx = path.join(evidence, "timeline.xlsx");
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ["Timestamp", "Computer", "Message"], ["2026-09-28 01:00:00", "HOST-A", "Workbook 日本語"],
  ]), "Timeline");
  XLSX.writeFile(book, xlsx);

  await check("Native SQLite and FTS5 load from packaged resources", () => {
    const Database = appRequire("better-sqlite3");
    const connection = new Database(":memory:");
    try {
      connection.exec("CREATE VIRTUAL TABLE sample USING fts5(message, tokenize='trigram'); INSERT INTO sample VALUES ('unicode timeline 日本語')");
      assert.equal(connection.prepare("SELECT count(*) n FROM sample WHERE sample MATCH 'timeline'").get().n, 1);
      return connection.prepare("SELECT sqlite_version() version").get();
    } finally { connection.close(); }
  });

  db = new (appRequire("./electron/db"))();
  const { parseFile } = appRequire("./electron/parsers");
  for (const [id, file, count] of [["csv", csv, 3], ["tsv", tsv, 1], ["xlsx", xlsx, 1]]) {
    await check(`${id.toUpperCase()} import from path with spaces and Japanese`, async () => {
      await parseFile(file, id, db, () => {});
      db.finalizeImport(id);
      const result = db.queryRows(id, { limit: 10 });
      assert.equal(result.totalFiltered, count);
      return { rows: result.totalFiltered, headers: db.getTabInfo(id).headers };
    });
  }
  await check("Filtering, sorting, bookmarks, and tags", () => {
    const result = db.queryRows("csv", { searchTerm: "HOST-A", searchMode: "exact", sortCol: "Timestamp", sortDir: "desc", limit: 10 });
    assert.equal(result.totalFiltered, 2);
    assert.equal(result.rows[0].EventID, "4625");
    db.toggleBookmark("csv", result.rows[0].__idx);
    assert.equal(db.getBookmarkCount("csv"), 1);
    db.addTag("csv", result.rows[0].__idx, "reviewed");
    return { filtered: result.totalFiltered, firstEventId: result.rows[0].EventID };
  });

  const evtx = process.argv[4] && !process.argv[4].startsWith("--") && path.resolve(process.argv[4]);
  if (evtx) {
    await check("Windows EVTX import and message provider", async () => {
      const parsed = await parseFile(evtx, "evtx", db, () => {});
      db.finalizeImport("evtx");
      const result = db.queryRows("evtx", { limit: 10 });
      assert.ok(result.totalFiltered > 0);
      const { getEvtxMessageProvider } = appRequire("./electron/parsers/evtx");
      assert.ok(await getEvtxMessageProvider(), "Bundled EVTX message provider is available offline");
      return { rows: result.totalFiltered, sourceFormat: parsed.sourceFormat };
    });
  }

  if (backendOnly) {
    db.closeAll();
    db = null;
    report.passed = true;
    return;
  }
  const hayabusa = path.join(resources, "hayabusa", "hayabusa.exe");
  await check("Bundled Hayabusa executable and offline rules", () => {
    const help = execFileSync(hayabusa, ["help"], { encoding: "utf8", windowsHide: true }).trim();
    assert.match(help, /Hayabusa v4\.1\.0/);
    assert.ok(fs.existsSync(path.join(resources, "hayabusa", "rules")));
    return { banner: help.split(/\r?\n/, 1)[0] };
  });
  await check("Bundled Python and bmc-tools", () => {
    const python = path.join(resources, "tools", "python", "python.exe");
    const tool = path.join(resources, "tools", "bmc-tools", "bmc-tools.py");
    const version = execFileSync(python, ["--version"], { encoding: "utf8", windowsHide: true }).trim();
    const help = execFileSync(python, [tool, "-h"], { encoding: "utf8", windowsHide: true });
    assert.match(help, /usage:/i);
    return { version };
  });
  db.closeAll();
  db = null;

  // Exercise the actual packaged GUI, preload bridge, worker imports, and queries.
  const env = { ...process.env, IRFLOW_USER_DATA_DIR: path.join(outputRoot, "app-data") };
  delete env.ELECTRON_RUN_AS_NODE;
  const executable = path.join(packageRoot, "IRFlow Timeline.exe");
  const port = 19333;
  const stderr = fs.openSync(path.join(outputRoot, "gui-stderr.log"), "w");
  child = spawn(executable, [`--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1", csv], { env, stdio: ["ignore", "ignore", stderr] });
  fs.closeSync(stderr);
  child.on("error", (error) => { report.launchError = error.message; });
  let target;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode != null) throw new Error(`GUI exited during startup: ${child.exitCode}`);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((item) => item.type === "page"); } catch {}
    if (target?.webSocketDebuggerUrl) break;
    await sleep(500);
  }
  assert.ok(target?.webSocketDebuggerUrl, "GUI exposes a test connection on loopback");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await once(ws, "open");
  let sequence = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    if (message.error) item.reject(new Error(JSON.stringify(message.error)));
    else item.resolve(message.result);
  });
  function cdp(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
  }
  async function evaluate(expression) {
    const result = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  await check("Packaged GUI, sandboxed preload, and initial file argument", async () => {
    for (let i = 0; i < 120; i++) {
      if (await evaluate("!!window.tle && !!document.querySelector('.tle-menubar-shell') && document.querySelectorAll('[role=tab]').length === 1 && document.querySelector('[role=tab]')?.innerText.includes('(3)')")) break;
      await sleep(500);
    }
    const details = await evaluate(`({
      platform: window.tle.platform,
      title: document.title,
      menu: !!document.querySelector('.tle-menubar-shell'),
      tabCount: document.querySelectorAll('[role=tab]').length,
      tabText: [...document.querySelectorAll('[role=tab]')].map((item) => item.innerText),
      bodyText: document.body.innerText.slice(0, 800),
      rootHtml: document.querySelector('#root')?.innerHTML.slice(0, 1200),
      resources: performance.getEntriesByType('resource').map((item) => item.name).slice(-20),
    })`);
    console.log(`GUI DETAILS: ${JSON.stringify(details)}`);
    assert.equal(details.platform, "win32");
    assert.equal(details.menu, true, `Timeline workspace did not render: ${JSON.stringify(details)}`);
    assert.equal(details.tabCount, 1, `Initial file argument was not imported: ${JSON.stringify(details)}`);
    assert.match(details.tabText[0], /timeline .*\.csv/i);
    await evaluate("window.__smokeImports=[]; window.tle.onImportComplete(x=>window.__smokeImports.push({tabId:x.tabId,rowCount:x.rowCount,fileName:x.fileName})); true");
    return details;
  });
  await check("Packaged GUI worker import, query, and Unicode display", async () => {
    await evaluate(`window.tle.importFiles(${JSON.stringify([tsv])})`);
    for (let i = 0; i < 120; i++) {
      if (await evaluate("window.__smokeImports.length >= 1")) break;
      await sleep(500);
    }
    const imports = await evaluate("window.__smokeImports");
    assert.equal(imports.length, 1);
    assert.deepEqual(imports.map((item) => item.rowCount), [1]);
    const rows = await evaluate(`window.tle.queryRows(${JSON.stringify(imports[0].tabId)}, {searchTerm:'TSV test',searchMode:'exact',limit:10})`);
    assert.equal(rows.totalFiltered, 1);
    assert.equal(await evaluate("document.querySelectorAll('[role=tab]').length"), 2);
    assert.equal(await evaluate("!!document.querySelector('.tle-menubar-shell')"), true);
    return { imports, matchingRows: rows.totalFiltered };
  });
  await check("Windows file arguments reach the existing window", async () => {
    const second = spawn(executable, [xlsx], { env, stdio: "ignore" });
    await once(second, "exit");
    for (let i = 0; i < 120; i++) {
      if (await evaluate("window.__smokeImports.length >= 2")) break;
      await sleep(500);
    }
    const last = await evaluate("window.__smokeImports[1]");
    assert.equal(last?.rowCount, 1);
    assert.equal(last.fileName, "timeline.xlsx");
    const rows = await evaluate(`window.tle.queryRows(${JSON.stringify(last.tabId)}, {searchTerm:'日本語',searchMode:'exact',limit:10})`);
    assert.equal(rows.totalFiltered, 1);
    for (let i = 0; i < 120; i++) {
      if (await evaluate("document.body.innerText.includes('Workbook 日本語')")) break;
      await sleep(500);
    }
    const rowRendered = await evaluate("document.body.innerText.includes('Workbook 日本語')");
    assert.equal(rowRendered, true, "Imported Unicode row was not painted in the grid");
    return { ...last, unicodeRows: rows.totalFiltered, rowRendered };
  });
  const screenshot = await cdp("Page.captureScreenshot", { format: "png" });
  await fsp.writeFile(path.join(outputRoot, "windows-ui.png"), Buffer.from(screenshot.data, "base64"));
  await check("GUI bundled bitmap-tool discovery", async () => {
    const result = await evaluate("window.tle.rdpBitmapToolStatus()");
    assert.equal(result.installed, true);
    assert.equal(result.pythonAvailable, true);
    return result;
  });
  await Promise.race([cdp("Browser.close").catch(() => {}), sleep(5000)]);
  report.passed = true;
}

const timeout = setTimeout(() => { console.error("Validation timed out"); child?.kill(); process.exit(1); }, 300000);
main().catch((error) => { report.passed = false; report.error = error.stack; process.exitCode = 1; console.error(error); }).finally(async () => {
  clearTimeout(timeout);
  ws?.close();
  db?.closeAll();
  if (child && child.exitCode == null) child.kill();
  report.finished = new Date().toISOString();
  await fsp.writeFile(path.join(outputRoot, "windows-runtime-results.json"), JSON.stringify(report, null, 2));
});
