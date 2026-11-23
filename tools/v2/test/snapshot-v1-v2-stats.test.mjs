import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { run } from "../snapshot-v1-v2-stats.mjs";
import { computeStats } from "../lib/engine-v2.mjs";
import { HISTORY_ARCHIVE } from "../lib/history-integrity.mjs";

const tmp = await mkdtemp(path.join(os.tmpdir(), "mtp-report-"));
const originalCwd = process.cwd();
const originalFetch = globalThis.fetch;
const file = name => readFile("data/" + name, "utf8");

// Synthetic rows exercise pagination and continuity. No fixture is published.
const trades = Array.from({ length: 180 }, (_, i) => ({
  id: "test-" + i, symbol: "TEST", setupType: "breakout", direction: "long",
  openedAt: i < 134 ? "2026-08-01" : "2026-08-18", closedAt: "2026-08-20",
  pnl: i < 134 ? 1 : i < 146 ? (i === 145 ? 48.1598 : 100) : -10,
}));
// 11 * 100 + 48.1598 - 34 * 10 = 808.1598
const verifiedAt = "2026-11-23T21:00:00Z";
const source = "mtp_v2_trades";
const v1 = { status: "ok", data: { configured: true, ledgerSource: "mtp_trades", verifiedAt, stats: { totalCount: 49 } } };
let sourceRows = trades;
let apiStats = {};
let unavailable = false;
let v1Offline = false;
let truncate = false;
const refreshStats = () => {
  apiStats = { ...computeStats(sourceRows), status: "ok", source, verifiedAt, tradeCount: sourceRows.length };
};
globalThis.fetch = async url => {
  const request = new URL(url);
  if (request.pathname.endsWith("/bot-stats")) return Response.json(v1, { status: v1Offline ? 503 : 200 });
  if (unavailable) throw new Error("source unreachable");
  if (request.pathname.endsWith("/stats")) return Response.json(apiStats);
  const offset = Number(request.searchParams.get("offset"));
  const page = truncate && offset ? [] : sourceRows.slice(offset, offset + 35);
  return Response.json({ status: "ok", verifiedAt, source, totalCount: sourceRows.length, count: page.length, trades: page });
};

try {
  process.chdir(tmp);
  await mkdir("data");
  const seed = {
    "history-status.json": { ...HISTORY_ARCHIVE, v1Status: "unavailable", status: "unavailable", v1LastReliableAt: HISTORY_ARCHIVE.lastReliableAt },
    "bot-stats-v1.json": { stats: { totalCount: 49 } },
    "bot-stats.json": { stats: { totalCount: 49 } },
    "bot-stats-v2.json": { tradeCount: 180, overall: {} },
    "bot-stats-v2-post-fix.json": { tradeCount: 46 },
    "v1-v2-comparison.json": {},
  };
  for (const [name, contents] of Object.entries(seed)) await writeFile("data/" + name, JSON.stringify(contents));
  // Replaying last positive archive and then restating the old false "ok, zero".
  const archived = await file("bot-stats-v2-post-fix.json");
  refreshStats();
  apiStats = { status: "ok", tradeCount: 0, overall: { trades: 0 } };
  let state = await run();
  assert.equal(state.status, "unavailable");
  assert.equal(state.lastReliableAt, HISTORY_ARCHIVE.lastReliableAt);
  assert.equal(await file("bot-stats-v2-post-fix.json"), archived);

  refreshStats();
  v1Offline = true;
  state = await run();
  assert.equal(state.status, "ok");
  assert.equal(state.v1Status, "unavailable");
  assert.equal(state.v2PostFixTrades, 46);
  assert.equal(state.lastReliableAt, verifiedAt);
  const verified = await file("bot-stats-v2-post-fix.json");
  assert.equal(JSON.parse(verified).totalPnl, 808.1598);
  assert.equal(JSON.parse(await file("v1-v2-comparison.json")).v1.tradeCount, 49);
  v1Offline = false;

  for (const problem of ["read_error", "legitimate_empty_table_after_reset", "partial_page", "api_disagrees", "duplicate", "rewrite"]) {
    unavailable = problem === "read_error";
    truncate = problem === "partial_page";
    sourceRows = problem === "legitimate_empty_table_after_reset" ? [] : trades.map(row => ({ ...row }));
    if (problem === "duplicate") sourceRows[1].id = sourceRows[0].id;
    if (problem === "rewrite") sourceRows[1].entry = 5000;
    refreshStats();
    if (problem === "api_disagrees") apiStats.overall.totalPnl++;
    state = await run();
    assert.equal(state.status, "unavailable", problem);
    assert.equal(state.v1Status, "ok", problem);
    assert.equal(state.lastReliableAt, verifiedAt, problem);
    assert.equal(await file("bot-stats-v2-post-fix.json"), verified, problem);
  }
  unavailable = truncate = false;
  sourceRows = [...trades, { ...trades[0], id: "new", openedAt: "2026-11-10", closedAt: "2026-11-12", pnl: 5 }];
  refreshStats();
  state = await run();
  assert.equal(state.status, "ok");
  assert.equal(state.v2PostFixTrades, 47);
  assert.equal(JSON.parse(await file("bot-stats-v2-post-fix.json")).totalPnl, 813.1598);
  console.log("snapshot-v1-v2-stats.test: OK");
} finally {
  globalThis.fetch = originalFetch;
  process.chdir(originalCwd);
  await rm(tmp, { recursive: true, force: true });
}
