"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");

module.exports = async function prepareWindowsPackage(context) {
  if (context.electronPlatformName !== "win32") return;

  const databasePath = path.join(context.appOutDir, "resources", "messages", "merged-messages.db");
  const database = new Database(databasePath);
  try {
    // The dependency currently distributes this catalog in WAL mode. A portable
    // read-only catalog must not need writable -wal/-shm sidecars at runtime.
    database.pragma("wal_checkpoint(TRUNCATE)");
    const mode = database.pragma("journal_mode = DELETE", { simple: true });
    if (String(mode).toLowerCase() !== "delete") {
      throw new Error(`Could not normalize EVTX message catalog journal mode: ${mode}`);
    }
  } finally {
    database.close();
  }

  for (const suffix of ["-wal", "-shm"]) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
};
