const test = require("node:test");
const assert = require("node:assert/strict");

const load = () => import("../src/utils/proximity-filter.js");
const tab = (extra = {}) => ({
  id: "tab-1", tsColumns: new Set(["Timestamp", "OtherTime"]), dateRangeFilters: {}, ...extra,
});

test("pivot accepts Hayabusa timestamps with a space before the UTC offset", async () => {
  const { buildProximityFilter } = await load();
  for (const pivot of [
    "2026-01-17 12:00:00.1234567 +00:00", "2026-01-17 21:00:00.1234567 +09:00",
    "2026-01-17T12:00:00.1234567Z", "2026-01-17 12:00:00.1234567",
  ]) {
    const result = buildProximityFilter(tab(), "Timestamp", pivot, 300000, "5m");
    assert.equal(result.error, undefined, pivot);
    assert.deepEqual(result.tabPatch.dateRangeFilters.Timestamp, {
      from: "2026-01-17 11:55:00.1234567", to: "2026-01-17 12:05:00.123456700",
    }, pivot);
    assert.equal(result.proximity.pivotRaw, pivot);
  }
});

test("Apply preserves every existing filter except the selected timestamp's old range", async () => {
  const { buildProximityFilter } = await load();
  const current = tab({
    searchTerm: "needle", columnFilters: { Level: "high" }, checkboxFilters: { Computer: ["HOST"] },
    dateRangeFilters: { OtherTime: { from: "2025-01-01" }, Timestamp: { from: "2020-01-01" } },
    advancedFilters: [{ column: "Details", condition: "contains", value: "example" }],
    showBookmarkedOnly: true, tagFilter: "review", rowIdFilter: [4], rowIdFilterLabel: "Related",
    searchHighlight: true, disabledFilters: new Set(["Computer"]),
  });
  const before = structuredClone(current);
  const { tabPatch } = buildProximityFilter(current, "Timestamp", "2026-01-17T12:00:00Z", 60000, "1m");
  assert.deepEqual(current, before, "never mutate current tab state");
  assert.deepEqual(Object.keys(tabPatch), ["dateRangeFilters"]);
  const after = { ...current, ...tabPatch };
  for (const key of Object.keys(current).filter((k) => k !== "dateRangeFilters")) {
    assert.deepEqual(after[key], current[key], key);
  }
  assert.deepEqual(after.dateRangeFilters.OtherTime, current.dateRangeFilters.OtherTime);
  assert.equal(after.dateRangeFilters.Timestamp.from, "2026-01-17 11:59:00");
});

test("Apply and remove filters clears all other restrictions but keeps evidence annotations", async () => {
  const { buildProximityFilter, clearedFiltersPatch } = await load();
  const current = tab({
    searchTerm: "needle", columnFilters: { Level: "high" }, checkboxFilters: { Computer: ["HOST"] },
    advancedFilters: [{ column: "Details", condition: "contains", value: "example" }],
    dateRangeFilters: { OtherTime: { to: "2020-01-01" } }, showBookmarkedOnly: true,
    tagFilter: "review", rowIdFilter: [4], rowIdFilterLabel: "Related", searchHighlight: true,
    disabledFilters: new Set(["Computer"]), bookmarkedSet: new Set([4]), rowTags: { 4: ["review"] },
    sortCol: "Timestamp", sortDir: "desc", colorRules: [{ column: "Level" }],
  });
  const before = structuredClone(current);
  const { tabPatch } = buildProximityFilter(current, "Timestamp", "2026-01-17T12:00:00Z", 60000, "1m", true);
  const after = { ...current, ...tabPatch };
  for (const [key, value] of Object.entries(clearedFiltersPatch())) {
    if (key !== "dateRangeFilters") assert.deepEqual(after[key], value, key);
  }
  assert.deepEqual(Object.keys(after.dateRangeFilters), ["Timestamp"]);
  for (const key of ["bookmarkedSet", "rowTags", "sortCol", "sortDir", "colorRules"]) {
    assert.deepEqual(after[key], current[key], key);
  }
  assert.deepEqual(current, before);
});

test("pivot follows the selected column's European date convention and explicit offsets", async () => {
  const { buildProximityFilter } = await load();
  const current = tab({ dayFirstColumns: new Set(["Timestamp"]) });
  const { tabPatch } = buildProximityFilter(current, "Timestamp", "03-08-2026 01:00:00.0000001 +09:00", 3600000, "1h");
  assert.deepEqual(tabPatch.dateRangeFilters.Timestamp, {
    from: "2026-08-02 15:00:00.0000001", to: "2026-08-02 17:00:00.000000100",
  });
});

test("short custom windows keep fractional evidence across day and year boundaries", async () => {
  const { buildProximityFilter } = await load();
  const { tabPatch } = buildProximityFilter(tab(), "Timestamp", "2026-12-31T23:59:59.999999999Z", 1, "0.001s");
  assert.deepEqual(tabPatch.dateRangeFilters.Timestamp, {
    from: "2026-12-31 23:59:59.998999999", to: "2027-01-01 00:00:00.000999999",
  });
});

test("invalid timestamps and invalid windows return actionable errors without a patch", async () => {
  const { buildProximityFilter } = await load();
  for (const raw of [null, "", "not a date", "1601-01-01T00:00:00Z"]) {
    const result = buildProximityFilter(tab(), "Timestamp", raw, 60000, "1m");
    assert.match(result.error, /timestamp/i);
    assert.equal(result.tabPatch, undefined);
  }
  for (const window of [0, -1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    const result = buildProximityFilter(tab(), "Timestamp", "2026-01-17T12:00:00Z", window, "invalid");
    assert.match(result.error, /window/i);
    assert.equal(result.tabPatch, undefined);
  }
  assert.match(buildProximityFilter(tab(), "Missing", "2026-01-17T12:00:00Z", 60000, "1m").error, /column/i);
  assert.match(buildProximityFilter(tab(), "Timestamp", "2026-01-17T12:00:00Z", 9000000000000000, "large").error, /too large/i);
  assert.match(buildProximityFilter(tab(), "Timestamp", "2026-01-17T12:00:00Z", 900000000000000, "extended year").error, /too large/i);
});

test("cleared filter state is independent across invocations", async () => {
  const { clearedFiltersPatch } = await load();
  const first = clearedFiltersPatch();
  first.disabledFilters.add("Computer"); first.columnFilters.Level = "high";
  assert.deepEqual(clearedFiltersPatch().disabledFilters, new Set());
  assert.deepEqual(clearedFiltersPatch().columnFilters, {});
});

test("inclusive pivot boundaries include equal instants in mixed precisions before and after indexing", async (t) => {
  const { buildProximityFilter } = await load();
  const TimelineDB = require("../electron/db");
  const db = new TimelineDB();
  t.after(() => db.closeAll());
  for (const [id, fraction] of [["whole", ""], ["fraction", ".1234567"]]) {
    const start = `2026-01-17 11:59:00${fraction}`;
    const end = `2026-01-17 12:01:00${fraction}`;
    const zeros = fraction ? "00" : ".000000000";
    const rows = [start, start + zeros, start.replace(" ", "T") + "Z",
      end, end + zeros, end.replace(" ", "T") + "Z",
      fraction ? "2026-01-17T11:59:00.123456699Z" : "2026-01-17T11:58:59.999999999Z",
      fraction ? "2026-01-17T12:01:00.123456701Z" : "2026-01-17T12:01:00.000000001Z"];
    db.createTab(id, ["Timestamp"]);
    db.insertBatchArrays(id, rows.map((s) => [s]));
    db.finalizeImport(id);
    const { tabPatch } = buildProximityFilter(tab(), "Timestamp", `2026-01-17T12:00:00${fraction}Z`, 60000, "1m");
    const query = () => db.queryRows(id, { offset: 0, limit: 20, dateRangeFilters: tabPatch.dateRangeFilters });
    assert.deepEqual(query().rows.map((r) => r.__idx), [1, 2, 3, 4, 5, 6]);
    await db.buildIndexesAsync(id);
    assert.deepEqual(query().rows.map((r) => r.__idx), [1, 2, 3, 4, 5, 6]);
  }
});
