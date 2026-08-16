import { mkdir, writeFile } from "node:fs/promises";
import { computeStats } from "./lib/engine-v2.mjs";

const V1_URL = "https://manitradepro.emmanueldelasse.workers.dev/api/public/bot-stats";
const V2_STATS_URL = "https://manitradepro-v2.emmanueldelasse.workers.dev/api/v2/stats";
const V2_TRADES_URL = "https://manitradepro-v2.emmanueldelasse.workers.dev/api/v2/trades?limit=2000";

// Migration Supabase v2_one_open_position_per_symbol appliquée sous la version
// 20260816210447. On prend ce timestamp comme frontière conservatrice : seuls
// les trades OUVERTS après cette frontière appartiennent à la cohorte propre.
export const V2_POST_FIX_START = "2026-08-16T21:04:47Z";

const USER_AGENT = "ManiTradeProSnapshot/3.0";

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  return response.json();
}

function finiteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeV1(payload) {
  const data = payload?.data;
  if (!data || typeof data !== "object" || !data.stats || typeof data.stats !== "object") {
    throw new Error("V1 payload invalide: .data.stats absent");
  }
  return data;
}

function normalizeV2Stats(payload) {
  if (payload?.status !== "ok" || typeof payload?.overall !== "object" || !Number.isFinite(Number(payload?.tradeCount))) {
    throw new Error("V2 stats payload invalide");
  }
  return payload;
}

function normalizeV2Trades(payload) {
  if (payload?.status !== "ok" || !Array.isArray(payload?.trades)) {
    throw new Error("V2 trades payload invalide");
  }
  return payload.trades;
}

function openedAfterPostFix(trade) {
  const openedAt = trade?.openedAt || trade?.opened_at;
  const openedMs = Date.parse(openedAt || "");
  return Number.isFinite(openedMs) && openedMs >= Date.parse(V2_POST_FIX_START);
}

function compactV1(v1) {
  const s = v1.stats || {};
  return {
    scope: "V1 lifetime benchmark",
    tradeCount: finiteNumber(s.totalCount),
    wins: finiteNumber(s.winCount),
    losses: finiteNumber(s.lossCount),
    winRate: finiteNumber(s.winRate),
    expectancy: finiteNumber(s.expectancy),
    totalPnl: finiteNumber(s.totalPnl),
    avgWin: finiteNumber(s.avgWin),
    avgLoss: finiteNumber(s.avgLoss),
    realizedWinLossRatio: finiteNumber(s.rrActual),
    openCount: finiteNumber(s.openCount),
    lastClosedAt: v1.lastClosedAt || null,
    bySetup: Array.isArray(s.bySetup) ? s.bySetup : [],
  };
}

function compactV2PostFix(postFixTrades, stats) {
  return {
    scope: "V2_POST_ANTI_DUP_FIX",
    cohortStart: V2_POST_FIX_START,
    cohortRule: "trade.openedAt >= cohortStart",
    tradeCount: postFixTrades.length,
    wins: finiteNumber(stats.overall?.wins),
    losses: finiteNumber(stats.overall?.losses),
    winRate: finiteNumber(stats.overall?.winRate),
    expectancy: finiteNumber(stats.overall?.expectancy),
    totalPnl: finiteNumber(stats.overall?.totalPnl),
    avgWin: finiteNumber(stats.overall?.avgWin),
    avgLoss: finiteNumber(stats.overall?.avgLoss),
    profitFactor: stats.overall?.profitFactor ?? null,
    maxDrawdown: finiteNumber(stats.overall?.maxDrawdown),
    bySetup: stats.bySetup || {},
    byAsset: stats.byAsset || {},
  };
}

function buildComparison(v1, v2Raw, v2PostFix) {
  return {
    schemaVersion: 1,
    methodology: {
      v1: "benchmark V1 tel qu'exposé par /api/public/bot-stats",
      v2: "uniquement trades V2 ouverts après la contrainte atomique anti-doublon",
      warning: "Ne pas utiliser les 121 trades V2 pré-fix pour décider V1 vs V2.",
      v2PostFixStart: V2_POST_FIX_START,
    },
    v1: compactV1(v1),
    v2PostFix,
    v2HistoricalReference: {
      scope: "V2 lifetime incluant V2_PRE_ANTI_DUP_FIX — référence seulement",
      tradeCount: finiteNumber(v2Raw.tradeCount),
      overall: v2Raw.overall || {},
      bySetup: v2Raw.bySetup || {},
    },
  };
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function run() {
  const [v1Payload, v2StatsPayload, v2TradesPayload] = await Promise.all([
    fetchJson(V1_URL),
    fetchJson(V2_STATS_URL),
    fetchJson(V2_TRADES_URL),
  ]);

  const v1 = normalizeV1(v1Payload);
  const v2Raw = normalizeV2Stats(v2StatsPayload);
  const v2Trades = normalizeV2Trades(v2TradesPayload);
  const postFixTrades = v2Trades.filter(openedAfterPostFix);
  const postFixStats = computeStats(postFixTrades);
  const v2PostFix = compactV2PostFix(postFixTrades, postFixStats);
  const comparison = buildComparison(v1, v2Raw, v2PostFix);

  await mkdir("data", { recursive: true });

  // Legacy V1 conservé pour ne casser aucun consommateur existant.
  await writeJson("data/bot-stats.json", v1);
  await writeJson("data/bot-stats-v1.json", v1);
  await writeJson("data/bot-stats-v2.json", v2Raw);
  await writeJson("data/bot-stats-v2-post-fix.json", v2PostFix);
  await writeJson("data/v1-v2-comparison.json", comparison);

  console.log(JSON.stringify({
    status: "ok",
    v1Trades: comparison.v1.tradeCount,
    v2HistoricalTrades: comparison.v2HistoricalReference.tradeCount,
    v2PostFixTrades: comparison.v2PostFix.tradeCount,
    cohortStart: V2_POST_FIX_START,
  }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
