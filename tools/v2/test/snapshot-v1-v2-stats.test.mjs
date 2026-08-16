import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { run, V2_POST_FIX_START } from "../snapshot-v1-v2-stats.mjs";

const previousFetch = globalThis.fetch;
const previousCwd = process.cwd();
const tmp = await mkdtemp(path.join(os.tmpdir(), "mtp-v1-v2-monitor-"));

const v1 = {
  data: {
    configured: true,
    stats: {
      totalCount: 2,
      winCount: 1,
      lossCount: 1,
      winRate: 0.5,
      totalPnl: 3,
      avgWin: 5,
      avgLoss: 2,
      expectancy: 1.5,
      rrActual: 2.5,
      openCount: 1,
      bySetup: [],
    },
    lastClosedAt: "2026-08-17T00:00:00Z",
  },
};

const v2Stats = {
  status: "ok",
  tradeCount: 2,
  overall: { trades: 2, totalPnl: 100 },
  bySetup: { breakout: { trades: 2 } },
};

const beforeFix = new Date(Date.parse(V2_POST_FIX_START) - 1000).toISOString();
const afterFix = new Date(Date.parse(V2_POST_FIX_START) + 1000).toISOString();
const v2Trades = {
  status: "ok",
  count: 2,
  trades: [
    {
      id: "pre",
      symbol: "AAA",
      setupType: "breakout",
      direction: "long",
      pnl: -10,
      pnlPct: -1,
      openedAt: beforeFix,
      closedAt: "2026-08-17T00:00:00Z",
    },
    {
      id: "post",
      symbol: "BBB",
      setupType: "mean_reversion",
      direction: "long",
      pnl: 20,
      pnlPct: 2,
      openedAt: afterFix,
      closedAt: "2026-08-17T01:00:00Z",
    },
  ],
};

globalThis.fetch = async (url) => {
  const text = String(url);
  const body = text.includes("/api/public/bot-stats")
    ? v1
    : text.includes("/api/v2/trades")
      ? v2Trades
      : v2Stats;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

try {
  process.chdir(tmp);
  await run();

  const comparison = JSON.parse(await readFile("data/v1-v2-comparison.json", "utf8"));
  const legacyV1 = JSON.parse(await readFile("data/bot-stats.json", "utf8"));
  const postFix = JSON.parse(await readFile("data/bot-stats-v2-post-fix.json", "utf8"));

  assert.equal(comparison.v1.tradeCount, 2);
  assert.equal(comparison.v2HistoricalReference.tradeCount, 2);
  assert.equal(comparison.v2PostFix.tradeCount, 1);
  assert.equal(comparison.v2PostFix.totalPnl, 20);
  assert.equal(comparison.v2PostFix.bySetup.mean_reversion.trades, 1);
  assert.equal(comparison.v2PostFix.bySetup.breakout, undefined);
  assert.equal(comparison.methodology.v2PostFixStart, V2_POST_FIX_START);
  assert.equal(legacyV1.stats.totalCount, 2);
  assert.equal(postFix.cohortRule, "trade.openedAt >= cohortStart");

  console.log("snapshot-v1-v2-stats.test: OK");
} finally {
  globalThis.fetch = previousFetch;
  process.chdir(previousCwd);
  await rm(tmp, { recursive: true, force: true });
}
