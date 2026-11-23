import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { V2_POST_FIX_START, validateHistoryRows, validateArchiveContinuity } from "./lib/history-integrity.mjs";
export { V2_POST_FIX_START };
import { computeStats } from "./lib/engine-v2.mjs";

const V1_URL = "https://manitradepro.emmanueldelasse.workers.dev/api/public/bot-stats";
const V2_STATS_URL = "https://manitradepro-v2.emmanueldelasse.workers.dev/api/v2/stats";
const V2_TRADES_URL = "https://manitradepro-v2.emmanueldelasse.workers.dev/api/v2/trades?limit=2000";

const USER_AGENT = "ManiTradeProSnapshot/4.0";

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
  if (payload?.status !== "ok" || !data?.configured || data.ledgerSource !== "mtp_trades"
      || !Number.isFinite(Date.parse(data.verifiedAt)) || !Number.isInteger(data.stats?.totalCount)) {
    throw new Error("V1 non vérifiée");
  }
  return data;
}

function digestRows(rows) {
  const fields = ["id", "symbol", "setupType", "direction", "entry", "exit", "stopLoss", "takeProfit", "qty", "pnl", "openedAt", "closedAt"];
  const normalized = rows.map(row => fields.map(key => row[key])).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

async function readV2(previous) {
  const raw = await fetchJson(V2_STATS_URL);
  if (raw.status !== "ok" || !raw.source || !Number.isFinite(Date.parse(raw.verifiedAt)) || !Number.isInteger(raw.tradeCount) || raw.tradeCount < 0) {
    throw new Error("V2 stats non vérifiées");
  }
  const trades = [];
  do {
    const page = await fetchJson(V2_TRADES_URL + "&offset=" + trades.length);
    if (page.status !== "ok" || !Number.isFinite(Date.parse(page.verifiedAt)) || page.source !== raw.source || raw.tradeCount !== page.totalCount
        || !Array.isArray(page.trades) || page.count !== page.trades.length || (page.count === 0 && trades.length < raw.tradeCount)) {
      throw new Error("V2 page incomplète");
    }
    trades.push(...page.trades);
  } while (trades.length < raw.tradeCount);
  validateHistoryRows(trades);
  validateArchiveContinuity(trades);
  if (previous.ledgerHash) {
    const earlier = trades.filter(row => Date.parse(row.closedAt) <= Date.parse(previous.latestClosedAt));
    if (digestRows(earlier) !== previous.ledgerHash) throw new Error("V2 historique modifié");
  }
  const computed = computeStats(trades);
  if (trades.length !== raw.tradeCount || ["overall", "byAsset", "bySetup"].some(key => !isDeepStrictEqual(computed[key], raw[key]))) {
    throw new Error("V2 désaccord entre opérations et agrégats");
  }
  const post = trades.filter(openedAfterPostFix);
  if (trades.length < previous.v2LifetimeTrades || post.length < previous.v2PostFixTrades) throw new Error("V2 recul du compteur");
  const latestClosedAt = new Date(trades.reduce((ms, row) => Math.max(ms, Date.parse(row.closedAt)), 0)).toISOString();
  return { raw, latestClosedAt, ledgerHash: digestRows(trades), post: compactV2PostFix(post, computeStats(post)) };
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

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

// Each source advances independently. Keep the last good documents if an API
// fails, returns its old unverified zero, or disagrees with the trading ledger.
export async function run() {
  await mkdir("data", { recursive: true });
  const previous = await readJson("data/history-status.json");
  const status = { ...previous };
  const [a, b] = await Promise.allSettled([
    fetchJson(V1_URL).then(normalizeV1).then(v1 => {
      if (v1.stats.totalCount < previous.v1Trades) throw new Error("V1 recul du compteur");
      return v1;
    }),
    readV2(previous),
  ]);
  if (a.status === "fulfilled") {
    const { verifiedAt, ...v1 } = a.value;
    status.v1Status = "ok";
    if (status.v1Trades !== v1.stats.totalCount || previous.v1Status !== "ok" || verifiedAt.slice(0, 10) !== status.v1LastReliableAt?.slice(0, 10)) {
      status.v1LastReliableAt = verifiedAt;
    }
    status.v1Trades = v1.stats.totalCount;
    await writeJson("data/bot-stats-v1.json", v1);
    await writeJson("data/bot-stats.json", v1);
  } else {
    status.v1Status = "unavailable";
  }
  if (b.status === "fulfilled") {
    const { raw, latestClosedAt, ledgerHash, post } = b.value;
    const { verifiedAt, ...snapshot } = raw;
    status.status = "ok";
    status.message = null;
    status.provenance = "recomputed_from_closed_trades";
    if (ledgerHash !== status.ledgerHash || previous.status !== "ok" || verifiedAt.slice(0, 10) !== previous.lastReliableAt?.slice(0, 10)) {
      status.lastReliableAt = verifiedAt;
    }
    Object.assign(status, { v2LifetimeTrades: raw.tradeCount, v2PostFixTrades: post.tradeCount, ledgerHash, latestClosedAt });
    await writeJson("data/bot-stats-v2.json", snapshot);
    await writeJson("data/bot-stats-v2-post-fix.json", post);
  } else {
    status.status = "unavailable";
    status.message = "Données indisponibles";
  }
  if (a.status === "fulfilled" || b.status === "fulfilled") {
    const v1 = await readJson("data/bot-stats-v1.json");
    const raw = await readJson("data/bot-stats-v2.json");
    const post = await readJson("data/bot-stats-v2-post-fix.json");
    await writeJson("data/v1-v2-comparison.json", buildComparison(v1, raw, post));
  }
  await writeJson("data/history-status.json", status);
  console.log(JSON.stringify({ v1: status.v1Status, v2: status.status, lastReliableAt: status.lastReliableAt,
    archivedV1: status.v1Trades, archivedV2: status.v2LifetimeTrades, archivedPostFix: status.v2PostFixTrades }));
  return status;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
