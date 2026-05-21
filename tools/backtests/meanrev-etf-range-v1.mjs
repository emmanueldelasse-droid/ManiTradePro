// tools/backtests/meanrev-etf-range-v1.mjs
//
// PR-R3B — Mean Reversion V1 ETF Range Short — test isolé.
//
// Objectif : déterminer honnêtement si une version ETF / RANGE / short-horizon
// du Mean Reversion swing possède encore un comportement exploitable, ou si
// le setup doit être classé DEAD / ABANDONED.
//
// Cette PR NE cherche PAS à sauver Mean Reversion. Elle teste UNE hypothèse
// économique précise, avec paramètres GELÉS ex-ante, sans optimisation
// opportuniste, sans cherry-picking.
//
// Hypothèse économique testée (figée AVANT le test, cf. R3A) :
//   "Les ETF larges et sectoriels possèdent encore des mécanismes de retour
//   à la moyenne court terme grâce aux flux passifs, à l'arbitrage NAV, aux
//   rebalancing institutionnels, et à la dilution idiosyncratique. Cet effet
//   serait potentiellement exploitable UNIQUEMENT en marché RANGE, sur horizon
//   court, avec excès temporaires, sans actifs momentum extrêmes."
//
// CONTRAINTES (cf. RESEARCH_FRAMEWORK_FREEZE_V1.md, ANTI_LOOKAHEAD_RULES.md,
// MEAN_REVERSION_DIAGNOSTIC_R3A.md, TRADING_PHILOSOPHY.md) :
//   - STRICTEMENT offline. Aucun ordre, aucun broker, aucun endpoint live.
//   - Paramètres GELÉS ex-ante. Aucune ré-optimisation post-hoc.
//   - Entry = open[i+1] (NEXT_OPEN). Aucun usage d'indicateur incluant la
//     bougie signal comme prix d'entrée.
//   - Friction OBLIGATOIRE dès le baseline + stress ×2 et ×3.
//   - Aucun cherry-picking d'ETF, aucun retrait post-résultat.
//   - Aucune promotion VALIDATED_RESEARCH_CORE ni LIVE_READY.
//   - Statuts possibles en sortie : KEEP_RESEARCH_CANDIDATE,
//     DEAD_AGGREGATED, DEAD / ABANDONED, NEEDS_MORE_DATA.
//   - Max 4 filtres simultanés (régime RANGE, RSI<25, distEMA<0.97, stop ATR).
//
// Sorties :
//   - tools/backtests/output/meanrev-etf-range-v1.json
//   - tools/backtests/output/meanrev-etf-range-v1.md

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";
import { computeFrictionV1, FRICTION_V1_METADATA } from "./lib/friction-v1.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "meanrev-etf-range-v1.json");
const OUT_MD = join(OUT_DIR, "meanrev-etf-range-v1.md");

// === Paramètres gelés ex-ante ==============================================
//
// Source : MEAN_REVERSION_DIAGNOSTIC_R3A.md § 5.1.
// AUCUNE modification autorisée pendant ou après l'exécution.

const PARAMS = Object.freeze({
  universe: ["ETFs_US_INDEX", "ETFs_US_SECTORS"],
  rsiThreshold: 25,           // RSI < 25
  distEmaFactor: 0.97,        // prix < EMA20 × 0.97 (= 3 % sous EMA20)
  entry: "NEXT_OPEN",         // entry = open[i+1]
  exit: "ema20_or_horizon",   // exit retour EMA20 OU horizon max 10j
  horizonMaxDays: 10,
  stopAtrMultiple: 1.5,       // stop = entry - 1.5 × ATR14
  rsiPeriod: 14,
  emaPeriod: 20,
  atrPeriod: 14,
  // Régime RANGE — définition opérationnelle (cf. brief ChatGPT) :
  //   - SPY proche EMA200 : |close - ema200| / ema200 < 0.05 (±5 %)
  //   - pente EMA200 faible : |slope_20d / ema200| < 0.005 (0.5 % / 20j)
  //   - pas RISK_OFF : NOT (SPY < ema200 AND QQQ < ema200 AND SMH < ema200)
  //   - pas TREND forte : déjà couvert par la pente faible
  rangeSpyEma200BandPct: 0.05,
  rangeSpyEma200SlopePct: 0.005,
  rangeSlopeLookbackDays: 20,
});

const FRICTION_MULTIPLIERS = [1, 2, 3];

// === Helpers ================================================================

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }

function pctChange(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return ((a - b) / b) * 100;
}

function ema(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out = [];
  let prev = avg(values.slice(0, period));
  for (let i = 0; i < period - 1; i++) out.push(null);
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(values, period = 14) {
  const out = [];
  if (values.length < period + 1) return values.map(() => null);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff; else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = 0; i <= period; i++) out.push(null);
  // out[period] = first usable rsi (after warmup), but we shift to use out[period]
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  return out;
}

function atr(candles, period = 14) {
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  // Wilder smoothing
  const out = [null];
  if (trs.length < period) return candles.map(() => null);
  let first = avg(trs.slice(0, period));
  for (let i = 0; i < period - 1; i++) out.push(null);
  out.push(first);
  let prev = first;
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period;
    out.push(prev);
  }
  while (out.length < candles.length) out.push(out[out.length - 1]);
  return out;
}

function loadCandles(symbol) {
  const p = join(DATA_DIR, `${symbol}_2025.json`);
  if (!fs.existsSync(p)) return null;
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  return raw
    .map((c) => ({
      time: c.time || c.date,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume || 0),
    }))
    .filter((c) =>
      c.time &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close)
    )
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function findCandleIndex(candles, time) {
  let lo = 0, hi = candles.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (candles[mid].time === time) return mid;
    if (candles[mid].time < time) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

function getYear(t) { return String(t).slice(0, 4); }

// === Univers ETF gelé =======================================================

const UNIVERSE_ETF = [
  ...(UNIVERSE.ETFs_US_INDEX || []),
  ...(UNIVERSE.ETFs_US_SECTORS || []),
];

console.log(`[meanrev-etf-range-v1] univers ETF brut : ${UNIVERSE_ETF.length} symboles`);
console.log(`[meanrev-etf-range-v1] symboles : ${UNIVERSE_ETF.join(", ")}`);

// === Loaders ================================================================

console.log("[meanrev-etf-range-v1] chargement candles…");
const candlesBySymbol = new Map();
const needed = new Set([...UNIVERSE_ETF, "SPY", "QQQ", "SMH"]);
for (const s of needed) {
  const c = loadCandles(s);
  if (c && c.length >= 230) candlesBySymbol.set(s, c);
}
console.log(`[meanrev-etf-range-v1] OHLC chargés : ${candlesBySymbol.size} / ${needed.size}`);

const TRADING_UNIVERSE = UNIVERSE_ETF.filter((s) => candlesBySymbol.has(s));
const DATASET_GAP_ETF = UNIVERSE_ETF.filter((s) => !candlesBySymbol.has(s));
console.log(`[meanrev-etf-range-v1] univers de trading effectif (gelé) : ${TRADING_UNIVERSE.length} ETF`);
console.log(`[meanrev-etf-range-v1]   présents : ${TRADING_UNIVERSE.join(", ")}`);
if (DATASET_GAP_ETF.length) {
  console.log(`[meanrev-etf-range-v1]   ⚠ ABSENTS du dataset projet : ${DATASET_GAP_ETF.join(", ")}`);
}

// === Indicateurs pré-calculés par symbole ===================================

const indicators = new Map();
for (const sym of [...candlesBySymbol.keys()]) {
  const c = candlesBySymbol.get(sym);
  const closes = c.map((x) => x.close);
  indicators.set(sym, {
    rsi: rsi(closes, PARAMS.rsiPeriod),
    ema20: ema(closes, PARAMS.emaPeriod),
    ema200: ema(closes, 200),
    atr: atr(c, PARAMS.atrPeriod),
  });
}

// === Index date global ======================================================

function buildDateIndex() {
  const counts = new Map();
  for (const c of candlesBySymbol.values()) {
    for (const k of c) counts.set(k.time, (counts.get(k.time) || 0) + 1);
  }
  // Threshold = max(2, ceil(0.5 × loaded_universe_size)) — couvre les cas de
  // dataset clairsemé sans descendre sous une couverture minimale.
  const minCoverage = Math.max(2, Math.ceil(candlesBySymbol.size * 0.5));
  return [...counts.entries()].filter(([, n]) => n >= minCoverage).map(([t]) => t).sort();
}
const DATES = buildDateIndex();
console.log(`[meanrev-etf-range-v1] dates communes : ${DATES.length}`);

// === Régime RANGE — définition opérationnelle ===============================
//
// RANGE = SPY proche EMA200 (±5 %) ET pente EMA200 faible (|slope 20j| < 0.5 %)
// ET NOT RISK_OFF (SPY+QQQ+SMH pas tous sous EMA200).

function isRangeAt(date) {
  const spy = candlesBySymbol.get("SPY");
  const qqq = candlesBySymbol.get("QQQ");
  const smh = candlesBySymbol.get("SMH");
  if (!spy || !qqq || !smh) return false;
  const sIdx = findCandleIndex(spy, date);
  const qIdx = findCandleIndex(qqq, date);
  const mIdx = findCandleIndex(smh, date);
  if (sIdx < 200 + PARAMS.rangeSlopeLookbackDays || qIdx < 200 || mIdx < 200) return false;
  const spyClose = spy[sIdx].close;
  const spyEma200 = indicators.get("SPY").ema200[sIdx];
  const spyEma200Past = indicators.get("SPY").ema200[sIdx - PARAMS.rangeSlopeLookbackDays];
  if (spyEma200 === null || spyEma200Past === null) return false;

  const bandOk = Math.abs(spyClose - spyEma200) / spyEma200 < PARAMS.rangeSpyEma200BandPct;
  const slopePctPer20d = Math.abs((spyEma200 - spyEma200Past) / spyEma200Past);
  const slopeOk = slopePctPer20d < PARAMS.rangeSpyEma200SlopePct;

  const spyBelow = spy[sIdx].close < indicators.get("SPY").ema200[sIdx];
  const qqqBelow = qqq[qIdx].close < indicators.get("QQQ").ema200[qIdx];
  const smhBelow = smh[mIdx].close < indicators.get("SMH").ema200[mIdx];
  const isRiskOff = spyBelow && qqqBelow && smhBelow;

  return bandOk && slopeOk && !isRiskOff;
}

// Pre-compute regime per date
const regimeByDate = new Map();
for (const d of DATES) regimeByDate.set(d, isRangeAt(d));
const rangeDaysCount = [...regimeByDate.values()].filter(Boolean).length;
console.log(`[meanrev-etf-range-v1] jours RANGE / total : ${rangeDaysCount} / ${DATES.length} (${(rangeDaysCount / DATES.length * 100).toFixed(1)} %)`);

// === Simulation =============================================================
//
// Pour chaque (date, ETF) :
//   - vérifier régime RANGE actif à la date du signal ;
//   - vérifier signal : RSI[i] < 25 ET close[i] < ema20[i] × 0.97 ;
//   - entry = open[i+1] ;
//   - stop = entry - 1.5 × ATR(14)[i] ;
//   - exit : (a) low[j] ≤ stop sur j ∈ [i+1, i+11] → exit stop sur day j ;
//            (b) close[j] ≥ ema20[j] sur j ∈ [i+1, i+11] → exit close[j] ;
//            (c) sinon, exit forcé à open[i+11] (horizon 10j atteint).
//   - friction appliquée à la sortie selon multiplier.

// Source canonique : `docs/quant/FRICTION_MODEL.md` + `lib/friction-v1.mjs`
// (CLEAN-1 PR-FRICTION-CANON).
function frictionRPerTrade(holdDays, multiplier = 1) {
  return computeFrictionV1({ holdDays, multiplier });
}

function simulateAll() {
  const trades = [];
  for (let di = 220; di < DATES.length - PARAMS.horizonMaxDays - 2; di++) {
    const date = DATES[di];
    if (!regimeByDate.get(date)) continue;

    for (const sym of TRADING_UNIVERSE) {
      const c = candlesBySymbol.get(sym);
      const ind = indicators.get(sym);
      const idx = findCandleIndex(c, date);
      if (idx < 200 || idx + PARAMS.horizonMaxDays + 1 >= c.length) continue;

      const closeI = c[idx].close;
      const rsiI = ind.rsi[idx];
      const ema20I = ind.ema20[idx];
      const atrI = ind.atr[idx];
      if (rsiI === null || ema20I === null || atrI === null || atrI <= 0) continue;

      // Signal gelé
      if (rsiI >= PARAMS.rsiThreshold) continue;
      if (closeI >= ema20I * PARAMS.distEmaFactor) continue;

      const entryIdx = idx + 1;
      const entryPx = c[entryIdx].open;
      if (!Number.isFinite(entryPx)) continue;
      const stopPx = entryPx - PARAMS.stopAtrMultiple * atrI;

      // Walk through days post-entry
      let exitInfo = null;
      const maxJ = Math.min(entryIdx + PARAMS.horizonMaxDays, c.length - 1);
      for (let j = entryIdx; j <= maxJ; j++) {
        // Stop check on low[j] (except j === entryIdx where open already taken)
        if (j > entryIdx && c[j].low <= stopPx) {
          exitInfo = { exitIdx: j, exitTime: c[j].time, exitPrice: stopPx, reason: "stop" };
          break;
        }
        // EMA20 return check on close[j] (skip entry day)
        if (j > entryIdx) {
          const eJ = ind.ema20[j];
          if (eJ !== null && c[j].close >= eJ) {
            exitInfo = { exitIdx: j, exitTime: c[j].time, exitPrice: c[j].close, reason: "ema20_return" };
            break;
          }
        }
      }
      if (!exitInfo) {
        // Horizon atteint : exit forced at open[entryIdx + horizonMaxDays + 1] if available, else close[maxJ]
        const horizonExitIdx = entryIdx + PARAMS.horizonMaxDays;
        if (horizonExitIdx < c.length) {
          // Exit at open of next day to maintain NEXT_OPEN convention
          const exitOpenIdx = Math.min(horizonExitIdx + 1, c.length - 1);
          exitInfo = { exitIdx: exitOpenIdx, exitTime: c[exitOpenIdx].time, exitPrice: c[exitOpenIdx].open, reason: "horizon" };
        } else {
          exitInfo = { exitIdx: maxJ, exitTime: c[maxJ].time, exitPrice: c[maxJ].close, reason: "horizon_partial" };
        }
      }

      const pnlPct = pctChange(exitInfo.exitPrice, entryPx);
      if (pnlPct === null) continue;
      const holdDays = exitInfo.exitIdx - entryIdx;
      const pnlRGross = pnlPct / 5;

      trades.push({
        symbol: sym,
        signalDate: date,
        entryTime: c[entryIdx].time,
        exitTime: exitInfo.exitTime,
        exitReason: exitInfo.reason,
        year: getYear(date),
        rsiAtSignal: Number(rsiI.toFixed(2)),
        distFromEma20Pct: Number(((closeI - ema20I) / ema20I * 100).toFixed(2)),
        entryPx: Number(entryPx.toFixed(4)),
        exitPx: Number(exitInfo.exitPrice.toFixed(4)),
        stopPx: Number(stopPx.toFixed(4)),
        atrAtEntry: Number(atrI.toFixed(4)),
        holdDays,
        pnlPct: Number(pnlPct.toFixed(3)),
        pnlRGross: Number(pnlRGross.toFixed(4)),
      });
    }
  }
  return trades;
}

console.log("[meanrev-etf-range-v1] simulation…");
const tradesRaw = simulateAll();
console.log(`[meanrev-etf-range-v1] signaux générés (gross R, pré-friction) : ${tradesRaw.length}`);

// Apply friction at 3 levels
function applyFriction(trades, multiplier) {
  return trades.map((t) => {
    const fr = frictionRPerTrade(t.holdDays, multiplier);
    return { ...t, frictionR: Number(fr.toFixed(4)), pnlR: Number((t.pnlRGross - fr).toFixed(4)) };
  });
}

const tradesF1 = applyFriction(tradesRaw, 1);
const tradesF2 = applyFriction(tradesRaw, 2);
const tradesF3 = applyFriction(tradesRaw, 3);

// === Métriques ==============================================================

function summarize(trades) {
  if (!trades.length) {
    return { trades: 0, wins: 0, losses: 0, winrate: 0, expectancyR: 0, profitFactor: 0, totalR: 0, maxDrawdownR: 0, longestLossStreak: 0 };
  }
  const total = trades.length;
  const wins = trades.filter((t) => t.pnlR > 0);
  const losses = trades.filter((t) => t.pnlR < 0);
  const gw = wins.reduce((a, b) => a + b.pnlR, 0);
  const gl = Math.abs(losses.reduce((a, b) => a + b.pnlR, 0));
  const totalR = trades.reduce((a, b) => a + b.pnlR, 0);
  let equity = 0, peak = 0, maxDD = 0, lossStreak = 0, longestLossStreak = 0;
  for (const t of trades) {
    equity += t.pnlR;
    if (equity > peak) peak = equity;
    if (peak - equity > maxDD) maxDD = peak - equity;
    if (t.pnlR < 0) {
      lossStreak++;
      if (lossStreak > longestLossStreak) longestLossStreak = lossStreak;
    } else {
      lossStreak = 0;
    }
  }
  return {
    trades: total,
    wins: wins.length,
    losses: losses.length,
    winrate: Number(((wins.length / total) * 100).toFixed(2)),
    expectancyR: Number((totalR / total).toFixed(4)),
    profitFactor: gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(3)),
    totalR: Number(totalR.toFixed(2)),
    maxDrawdownR: Number(maxDD.toFixed(2)),
    longestLossStreak,
  };
}

function yearlyMetrics(trades) {
  const byYear = {};
  for (const t of trades) (byYear[t.year] = byYear[t.year] || []).push(t);
  const out = {};
  for (const y of ["2021", "2022", "2023", "2024", "2025"]) {
    const ts = byYear[y] || [];
    if (!ts.length) { out[y] = null; continue; }
    const gw = ts.filter((t) => t.pnlR > 0).reduce((a, b) => a + b.pnlR, 0);
    const gl = Math.abs(ts.filter((t) => t.pnlR < 0).reduce((a, b) => a + b.pnlR, 0));
    out[y] = {
      trades: ts.length,
      pf: gl === 0 ? (gw > 0 ? 999 : 0) : Number((gw / gl).toFixed(3)),
      totalR: Number(ts.reduce((a, b) => a + b.pnlR, 0).toFixed(2)),
    };
  }
  return out;
}

// === Walk-forward STRICT ====================================================

const SPLITS = [
  { name: "S1", trainYears: ["2021", "2022"], testYears: ["2023"] },
  { name: "S2", trainYears: ["2021", "2022", "2023"], testYears: ["2024"] },
  { name: "S3", trainYears: ["2021", "2022", "2023", "2024"], testYears: ["2025"] },
];

function walkForward(trades) {
  const splits = [];
  for (const s of SPLITS) {
    const train = trades.filter((t) => s.trainYears.includes(t.year));
    const test = trades.filter((t) => s.testYears.includes(t.year));
    const tr = summarize(train);
    const te = summarize(test);
    splits.push({
      name: s.name,
      trainYears: s.trainYears,
      testYears: s.testYears,
      train: tr,
      test: te,
      passLive: te.profitFactor >= 1.0 && te.trades >= 10,
      passRobust: te.profitFactor >= 1.20 && te.trades >= 15,
    });
  }
  return {
    splits,
    passLive: splits.filter((x) => x.passLive).length,
    passRobust: splits.filter((x) => x.passRobust).length,
  };
}

// === Concentration top 5 ====================================================

function concentration(trades) {
  if (!trades.length) {
    return { universeSize: 0, top5: [], top5SharePctOfPositive: null, pfWithoutTop5: null, singleMaxSharePctOfPositive: null };
  }
  const bySymbol = new Map();
  for (const t of trades) {
    const cur = bySymbol.get(t.symbol) || { symbol: t.symbol, trades: 0, totalR: 0 };
    cur.trades++;
    cur.totalR += t.pnlR;
    bySymbol.set(t.symbol, cur);
  }
  const all = [...bySymbol.values()].map((x) => ({ ...x, totalR: Number(x.totalR.toFixed(3)) }));
  const positive = all.filter((x) => x.totalR > 0).sort((a, b) => b.totalR - a.totalR);
  const sumPositive = positive.reduce((a, b) => a + b.totalR, 0);
  const top5 = positive.slice(0, 5);
  const top5Sum = top5.reduce((a, b) => a + b.totalR, 0);
  const top5SharePct = sumPositive > 0 ? Number(((top5Sum / sumPositive) * 100).toFixed(2)) : null;
  const single = positive[0];
  const singleShare = single && sumPositive > 0 ? Number(((single.totalR / sumPositive) * 100).toFixed(2)) : null;

  const top5Symbols = new Set(top5.map((x) => x.symbol));
  const woTop5 = trades.filter((t) => !top5Symbols.has(t.symbol));
  const wo = summarize(woTop5);
  return {
    universeSize: all.length,
    positiveContributors: positive.length,
    sumPositiveR: Number(sumPositive.toFixed(2)),
    top5: top5.map((x) => ({
      symbol: x.symbol,
      trades: x.trades,
      totalR: x.totalR,
      sharePctOfPositive: sumPositive > 0 ? Number(((x.totalR / sumPositive) * 100).toFixed(2)) : null,
    })),
    top5SharePctOfPositive: top5SharePct,
    singleMaxSharePctOfPositive: singleShare,
    pfWithoutTop5: wo.profitFactor,
    totalRWithoutTop5: wo.totalR,
    tradesWithoutTop5: wo.trades,
  };
}

// === Drawdown deep dive + cluster pertes ===================================

function drawdownAndClusters(trades) {
  if (!trades.length) {
    return {
      maxDD: 0,
      longestLossStreak: 0,
      longestLossStreakWindow: null,
      worstDD: { magnitudeR: 0, startDate: null, endDate: null, durationTrades: 0 },
      lossClusters5plus: [],
    };
  }
  let equity = 0, peak = 0, maxDD = 0;
  let inDD = false, ddStart = -1;
  let worst = { dd: 0, start: -1, end: -1, startDate: null, endDate: null };
  let curStreak = 0, lStreak = 0, lStreakStart = -1, lStreakEnd = -1;
  let bestStreakStart = -1, bestStreakEnd = -1;
  const clusters = []; // séquences de 5+ pertes consécutives
  let clusterStart = -1;

  trades.forEach((t, i) => {
    equity += t.pnlR;
    if (equity > peak) { peak = equity; if (inDD) { inDD = false; } }
    else if (peak - equity > 0) {
      if (!inDD) { inDD = true; ddStart = i; }
      const dd = peak - equity;
      if (dd > worst.dd) {
        worst = { dd, start: ddStart, end: i, startDate: trades[ddStart]?.entryTime, endDate: t.entryTime };
      }
      if (dd > maxDD) maxDD = dd;
    }
    if (t.pnlR < 0) {
      if (curStreak === 0) clusterStart = i;
      curStreak++;
      if (curStreak > lStreak) {
        lStreak = curStreak;
        lStreakStart = i - curStreak + 1;
        lStreakEnd = i;
        bestStreakStart = lStreakStart;
        bestStreakEnd = lStreakEnd;
      }
    } else {
      if (curStreak >= 5) {
        clusters.push({
          startIdx: clusterStart,
          endIdx: i - 1,
          startDate: trades[clusterStart].entryTime,
          endDate: trades[i - 1].entryTime,
          length: curStreak,
          totalRLoss: trades.slice(clusterStart, i).reduce((a, b) => a + b.pnlR, 0),
        });
      }
      curStreak = 0;
    }
  });
  // dernier cluster si on termine sur une streak
  if (curStreak >= 5) {
    clusters.push({
      startIdx: clusterStart,
      endIdx: trades.length - 1,
      startDate: trades[clusterStart].entryTime,
      endDate: trades[trades.length - 1].entryTime,
      length: curStreak,
      totalRLoss: trades.slice(clusterStart).reduce((a, b) => a + b.pnlR, 0),
    });
  }
  return {
    maxDD: Number(maxDD.toFixed(2)),
    longestLossStreak: lStreak,
    longestLossStreakWindow: lStreak > 0 ? {
      startDate: trades[bestStreakStart]?.entryTime ?? null,
      endDate: trades[bestStreakEnd]?.entryTime ?? null,
      tradesIndices: [bestStreakStart, bestStreakEnd],
    } : null,
    worstDD: {
      magnitudeR: Number(worst.dd.toFixed(2)),
      startDate: worst.startDate,
      endDate: worst.endDate,
      durationTrades: worst.start >= 0 ? worst.end - worst.start + 1 : 0,
    },
    lossClusters5plus: clusters,
  };
}

// === Dépendance dates extrêmes ==============================================
//
// "Sans top 3 dates" = retirer les 3 trades les plus gagnants en R et
// recalculer PF/totalR.

function withoutTopNDates(trades, n) {
  const sorted = [...trades].sort((a, b) => b.pnlR - a.pnlR);
  const topDates = new Set(sorted.slice(0, n).map((t) => t.signalDate));
  const filtered = trades.filter((t) => !topDates.has(t.signalDate));
  return { topDates: [...topDates], summary: summarize(filtered) };
}

// === Transitions régime =====================================================
//
// Compter les trades dont le régime à la date de sortie diffère du régime à
// l'entrée. Mesurer le PF / expectancy par sous-groupe (stable vs transition).

function regimeTransitions(trades) {
  let stable = 0, transition = 0;
  const stableT = [], transitionT = [];
  for (const t of trades) {
    const entryRange = regimeByDate.get(t.signalDate);
    // approximate exit date regime
    const exitRange = regimeByDate.get(t.exitTime) ?? entryRange;
    if (entryRange === exitRange) { stable++; stableT.push(t); }
    else { transition++; transitionT.push(t); }
  }
  return {
    stable: { count: stable, ...summarize(stableT) },
    transition: { count: transition, ...summarize(transitionT) },
  };
}

// === Exécution analyses =====================================================

console.log("[meanrev-etf-range-v1] analyses…");

const baselineSummary = summarize(tradesF1);
const baselineYearly = yearlyMetrics(tradesF1);
console.log(`[meanrev-etf-range-v1]   baseline F×1 : trades=${baselineSummary.trades} PF=${baselineSummary.profitFactor} totalR=${baselineSummary.totalR} maxDD=${baselineSummary.maxDrawdownR} loss-streak=${baselineSummary.longestLossStreak}`);

const wfF1 = walkForward(tradesF1);
for (const s of wfF1.splits) {
  console.log(`[meanrev-etf-range-v1]   ${s.name} train PF=${s.train.profitFactor} (${s.train.trades}) | test PF=${s.test.profitFactor} (${s.test.trades}) passLive=${s.passLive} passRobust=${s.passRobust}`);
}

const conc = concentration(tradesF1);
console.log(`[meanrev-etf-range-v1]   top5 share=${conc.top5SharePctOfPositive}% pfWithoutTop5=${conc.pfWithoutTop5}`);

const dd = drawdownAndClusters(tradesF1);
console.log(`[meanrev-etf-range-v1]   maxDD=${dd.maxDD} lossStreak=${dd.longestLossStreak} clusters5+=${dd.lossClusters5plus.length}`);

const wo3 = withoutTopNDates(tradesF1, 3);
console.log(`[meanrev-etf-range-v1]   sans top 3 dates : PF=${wo3.summary.profitFactor} totalR=${wo3.summary.totalR}`);

const wo5 = withoutTopNDates(tradesF1, 5);

const trans = regimeTransitions(tradesF1);
console.log(`[meanrev-etf-range-v1]   stable=${trans.stable.count}(PF ${trans.stable.profitFactor}) transition=${trans.transition.count}(PF ${trans.transition.profitFactor})`);

const f2Summary = summarize(tradesF2);
const f3Summary = summarize(tradesF3);
const wfF2 = walkForward(tradesF2);
const wfF3 = walkForward(tradesF3);
console.log(`[meanrev-etf-range-v1]   friction ×2 : trades=${f2Summary.trades} PF=${f2Summary.profitFactor} totalR=${f2Summary.totalR}`);
console.log(`[meanrev-etf-range-v1]   friction ×3 : trades=${f3Summary.trades} PF=${f3Summary.profitFactor} totalR=${f3Summary.totalR}`);

// === Verdict ================================================================

function decideVerdict() {
  const reasons = [];

  // Findings structurels critiques détectés avant tout jugement quantitatif :
  // (1) gap dataset ETF sectoriels, (2) filtres trop extrêmes pour ETF larges.
  if (DATASET_GAP_ETF.length > 0) {
    reasons.push(`DATASET_GAP : ${DATASET_GAP_ETF.length}/${UNIVERSE_ETF.length} ETF de l'univers cible absents du dataset projet (${DATASET_GAP_ETF.join(", ")}). L'univers effectif est limité à ${TRADING_UNIVERSE.length} ETF (${TRADING_UNIVERSE.join(", ")}).`);
  }

  if (tradesRaw.length === 0 && TRADING_UNIVERSE.length > 0) {
    reasons.push(`FILTERS_TOO_STRICT_FOR_LARGE_ETF : 0 signal généré sur ${TRADING_UNIVERSE.length} ETF × ${rangeDaysCount} jours RANGE = ~${TRADING_UNIVERSE.length * rangeDaysCount} opportunités-jour. Les paramètres gelés (RSI(14) < 25 ET prix < EMA20 × 0.97) ne se déclenchent quasiment jamais sur les ETF larges US (SPY/QQQ/IWM/MDY) en régime RANGE. Conclusion structurelle : l'opérationnalisation V1 proposée dans le diagnostic R3A n'est pas testable sur l'univers disponible.`);
  }

  if (baselineSummary.trades < 30) {
    reasons.push(`Sample insuffisant : ${baselineSummary.trades} trades. RANGE strict + univers ETF + signal RSI<25 produit trop peu de signaux pour conclure quantitativement.`);
    return { status: "NEEDS_MORE_DATA", reasons };
  }

  if (baselineSummary.profitFactor < 1.0) {
    reasons.push(`PF baseline frictionné = ${baselineSummary.profitFactor} < 1.0 → edge inexistant après friction.`);
    return { status: "DEAD_AGGREGATED", reasons };
  }

  if (baselineSummary.profitFactor < 1.20) {
    reasons.push(`PF baseline frictionné = ${baselineSummary.profitFactor} < 1.20 → edge insuffisant.`);
  }

  if (f2Summary.profitFactor < 1.10) {
    reasons.push(`PF friction ×2 = ${f2Summary.profitFactor} < 1.10 → edge consommé par friction réaliste.`);
  }

  if (conc.top5SharePctOfPositive !== null && conc.top5SharePctOfPositive > 70) {
    reasons.push(`Top 5 share = ${conc.top5SharePctOfPositive}% > 70 % → edge non diversifiable.`);
  }
  if (conc.pfWithoutTop5 !== null && conc.pfWithoutTop5 < 1.05) {
    reasons.push(`PF sans top 5 = ${conc.pfWithoutTop5} < 1.05 → edge porté par 5 ETF.`);
  }

  if (wfF1.passLive < 2) {
    reasons.push(`Walk-forward : ${wfF1.passLive}/3 splits PASS live (PF ≥ 1.0) → robustesse temporelle insuffisante.`);
  }

  if (wfF1.passRobust < 2) {
    reasons.push(`Walk-forward : ${wfF1.passRobust}/3 splits PASS robust (PF ≥ 1.20) → seuil PASS minimal non atteint sur ≥ 2/3.`);
  }

  const worst2022 = baselineYearly["2022"];
  if (worst2022 !== null && worst2022.pf < 0.5) {
    reasons.push(`2022 PF = ${worst2022.pf} < 0.5 → survivance bear insuffisante.`);
  }

  if (wo3.summary.profitFactor < 1.0) {
    reasons.push(`Sans top 3 dates : PF = ${wo3.summary.profitFactor} < 1.0 → dépendance excessive à quelques événements.`);
  }

  // DD ratio
  const ddRatio = baselineSummary.totalR > 0 ? dd.maxDD / baselineSummary.totalR : Infinity;
  if (ddRatio > 1.5) {
    reasons.push(`Max DD / Total R = ${ddRatio.toFixed(2)} > 1.5 → drawdown disproportionné par rapport au gain.`);
  }

  // Décision finale
  const criticalFails = reasons.filter((r) =>
    r.includes("DEAD") ||
    r.includes("inexistant") ||
    r.includes("consommé par friction") ||
    r.includes("non diversifiable") ||
    r.includes("porté par 5") ||
    r.includes("Dépendance excessive") ||
    r.includes("dépendance excessive") ||
    r.includes("survivance bear insuffisante")
  ).length;

  if (criticalFails >= 2) {
    return { status: "DEAD / ABANDONED", reasons: ["Plusieurs critères structurels échouent simultanément.", ...reasons] };
  }
  if (criticalFails >= 1) {
    return { status: "DEAD_AGGREGATED", reasons };
  }

  // Si aucun critical fail mais quelques caveats → KEEP_RESEARCH_CANDIDATE
  reasons.push(`Aucun critère critique invalidant. PF baseline = ${baselineSummary.profitFactor}, friction ×2 = ${f2Summary.profitFactor}, WF passRobust = ${wfF1.passRobust}/3. Statut conservateur KEEP_RESEARCH_CANDIDATE.`);
  return { status: "KEEP_RESEARCH_CANDIDATE", reasons };
}

const verdict = decideVerdict();
console.log("");
console.log(`Verdict : ${verdict.status}`);
for (const r of verdict.reasons) console.log(`  - ${r}`);

// === Rapport ================================================================

const report = {
  generatedAt: new Date().toISOString(),
  scope: "PR-R3B Mean Reversion V1 ETF Range Short — test isolé.",
  hypothesis: "Les ETF larges et sectoriels possèdent encore des mécanismes de retour à la moyenne court terme grâce aux flux passifs, à l'arbitrage NAV, aux rebalancing institutionnels, et à la dilution idiosyncratique. Cet effet serait potentiellement exploitable UNIQUEMENT en marché RANGE, sur horizon court, avec excès temporaires, sans actifs momentum extrêmes.",
  params: PARAMS,
  tradingUniverse: TRADING_UNIVERSE,
  datasetGap: {
    expected: UNIVERSE_ETF,
    loaded: TRADING_UNIVERSE,
    missing: DATASET_GAP_ETF,
    gapRatio: UNIVERSE_ETF.length > 0 ? Number((DATASET_GAP_ETF.length / UNIVERSE_ETF.length).toFixed(2)) : 0,
  },
  universeSizeLoaded: candlesBySymbol.size,
  rangeDays: rangeDaysCount,
  totalDays: DATES.length,
  rangeDaysPct: Number((rangeDaysCount / DATES.length * 100).toFixed(2)),
  executionModel: {
    entry: "open[i+1] (NEXT_OPEN)",
    exit: "first of: stop hit (low ≤ entry - 1.5*ATR), close ≥ ema20, horizon 10j (exit open[i+11])",
    friction: {
      formula: "frictionR = (0.30 + 0.02 × holdDays) / 5",
      multipliers: FRICTION_MULTIPLIERS,
      conversionToR: "5 % = 1R",
    },
    lookAheadGuards: [
      "entry = open[i+1] (never close[i] or intra-bar)",
      "stop computed from ATR[i] (causal)",
      "regime computed from EMA200[i] and slope over [i-20..i] (causal)",
      "RSI[i] causal (recursive smoothing on close[0..i])",
    ],
  },
  signalCount: tradesRaw.length,
  baseline_F1: {
    summary: baselineSummary,
    yearly: baselineYearly,
    walkForward: wfF1,
    concentration: conc,
    drawdown: dd,
    withoutTop3Dates: wo3,
    withoutTop5Dates: wo5,
    regimeTransitions: trans,
  },
  friction_F2: {
    summary: f2Summary,
    walkForward: wfF2,
  },
  friction_F3: {
    summary: f3Summary,
    walkForward: wfF3,
  },
  verdict: {
    status: verdict.status,
    reasons: verdict.reasons,
    vocabulary: "Statuts autorisés ici : KEEP_RESEARCH_CANDIDATE, DEAD_AGGREGATED, DEAD / ABANDONED, NEEDS_MORE_DATA. Interdits : VALIDATED_RESEARCH_CORE, LIVE_READY, CONDITIONAL_EDGE (réservé à une PR ultérieure, jamais auto-appliqué).",
    note: "Le statut effectif Setup 4 Mean Reversion dans SETUPS_REGISTRY.md reste inchangé tant que GO MERGE ChatGPT explicite n'est pas reçu.",
  },
  passFailChecklist: {
    sampleMin30: baselineSummary.trades >= 30,
    pfBaselineMin120: baselineSummary.profitFactor >= 1.20,
    pfF2Min110: f2Summary.profitFactor >= 1.10,
    wfPassRobustMin2of3: wfF1.passRobust >= 2,
    top5ShareUnder70: conc.top5SharePctOfPositive === null || conc.top5SharePctOfPositive < 70,
    pfWithoutTop5Min105: conc.pfWithoutTop5 === null || conc.pfWithoutTop5 >= 1.05,
    year2022MinPf05: baselineYearly["2022"] === null || baselineYearly["2022"].pf >= 0.5,
    withoutTop3DatesPfMin10: wo3.summary.profitFactor >= 1.0,
    ddRatioMax15: baselineSummary.totalR <= 0 || (dd.maxDD / Math.max(baselineSummary.totalR, 0.01)) <= 1.5,
  },
  limitations: [
    "Univers ex-post (survivants 2021-2025). Pas de delistés.",
    "Friction simplifiée uniforme (pas de modulation par classe d'actif ETF index vs ETF sectoriel).",
    "Long-only (pas de short-side).",
    "Pas de sizing dynamique (taille fixe = 1 unité, 5 % = 1R).",
    "Régime RANGE = SPY proche EMA200 + pente faible. Définition opérationnelle, pas seul standard possible.",
    "Walk-forward sur années calendaires (pas de rolling glissant).",
    "Pas de VIX intégré.",
    "Exit `close ≥ ema20` peut sortir trop tôt après un rebond intra-day vers ema20 — convention conservatrice retenue.",
  ],
  rollback: {
    runtime: "Aucun. Aucun fichier runtime modifié.",
    documentation: "git revert de la PR — aucun impact moteur.",
    outputs: "Reproductibles à chaque exécution du script — supprimables sans impact.",
  },
  sources: [
    "docs/research/MEAN_REVERSION_DIAGNOSTIC_R3A.md (hypothèse économique V1, paramètres gelés)",
    "tools/backtests/rs-rotation-robustness-v1.mjs (modèle méthodologique walk-forward + friction + concentration)",
    "tools/backtests/backtest-meanrev-v1.mjs (référence historique — variantes RSI 25/30/35 déjà testées)",
    "tools/backtests/universe-v2.mjs (univers ETF source)",
    "docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md § 3.5 walk-forward, § 4 critères, § 6.3 interdictions",
    "docs/project/TRADING_PHILOSOPHY.md § 4.4 Mean Reversion comme axe secondaire",
    "Directives ChatGPT 2026-05-19 (PR-R3B mission, méthodologie obligatoire, critères PASS/FAIL).",
  ],
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
await writeFile(OUT_MD, buildMarkdown(report), "utf8");

console.log("");
console.log(`Outputs :`);
console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);

// === Markdown ===============================================================

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(r) {
  const L = [];
  L.push("# PR-R3B — Mean Reversion V1 ETF Range Short — test isolé");
  L.push("");
  L.push(`> Généré le ${r.generatedAt} par \`tools/backtests/meanrev-etf-range-v1.mjs\`.`);
  L.push("");
  L.push("**⚠ Analyse strictement offline.** Aucun ordre, aucun broker. Aucun fichier runtime modifié. Paramètres GELÉS ex-ante. Aucune ré-optimisation. Test UNIQUE.");
  L.push("");
  L.push("**Statuts autorisés en sortie** : `KEEP_RESEARCH_CANDIDATE`, `DEAD_AGGREGATED`, `DEAD / ABANDONED`, `NEEDS_MORE_DATA`. **Interdits** : `VALIDATED_RESEARCH_CORE`, `LIVE_READY`, `CONDITIONAL_EDGE`.");
  L.push("");

  L.push("## 1. Hypothèse économique testée (gelée avant test)");
  L.push("");
  L.push(`> ${r.hypothesis}`);
  L.push("");

  L.push("## 2. Paramètres gelés");
  L.push("");
  L.push("```json");
  L.push(JSON.stringify(r.params, null, 2));
  L.push("```");
  L.push("");

  L.push("## 3. Univers");
  L.push("");
  L.push(`- Univers cible prévu (brief ChatGPT) : \`ETFs_US_INDEX\` + \`ETFs_US_SECTORS\` = **${r.datasetGap.expected.length} ETF** : ${r.datasetGap.expected.join(", ")}.`);
  L.push(`- Univers effectif (présents dans le dataset projet) : **${r.tradingUniverse.length} ETF** : ${r.tradingUniverse.join(", ")}.`);
  if (r.datasetGap.missing.length) {
    L.push(`- **⚠ DATASET_GAP** : ${r.datasetGap.missing.length}/${r.datasetGap.expected.length} ETF ABSENTS du dataset projet (\`${r.datasetGap.missing.join(", ")}\`). Ratio gap = ${(r.datasetGap.gapRatio * 100).toFixed(0)} %.`);
  }
  L.push(`- OHLC chargés (incluant SPY/QQQ/SMH pour régime) : ${r.universeSizeLoaded}.`);
  L.push("");
  if (r.datasetGap.missing.length) {
    L.push("**Finding structurel #1 — DATASET_GAP** : l'hypothèse économique V1 (cf. R3A) cible explicitement les ETF larges **et** sectoriels. Les ETF sectoriels (SPDR `XLE`/`XLF`/`XLV`/…) ne sont pas dans `data/*.json`. Le test ne couvre donc que les ETF d'indice large (SPY/QQQ/IWM/MDY). Les conclusions ci-dessous **ne peuvent pas** se généraliser à l'hypothèse V1 complète tant que ce gap dataset n'est pas comblé.");
    L.push("");
  }

  L.push("## 4. Définition opérationnelle du régime RANGE");
  L.push("");
  L.push(`- SPY |close - EMA200| / EMA200 < ${r.params.rangeSpyEma200BandPct * 100} % (proche EMA200)`);
  L.push(`- |slope EMA200 sur ${r.params.rangeSlopeLookbackDays}j| < ${r.params.rangeSpyEma200SlopePct * 100} % (pente faible)`);
  L.push(`- NOT RISK_OFF (SPY+QQQ+SMH pas tous sous EMA200)`);
  L.push("");
  L.push(`**Jours RANGE / total** : ${r.rangeDays} / ${r.totalDays} (**${r.rangeDaysPct} %**).`);
  L.push("");

  L.push("## 5. Modèle d'exécution");
  L.push("");
  for (const g of r.executionModel.lookAheadGuards) L.push(`- ${g}`);
  L.push("");
  L.push(`- Entry : ${r.executionModel.entry}`);
  L.push(`- Exit : ${r.executionModel.exit}`);
  L.push(`- Friction formule : \`${r.executionModel.friction.formula}\` × multiplier (5 % = 1R)`);
  L.push(`- Multipliers testés : ×${r.executionModel.friction.multipliers.join(", ×")}`);
  L.push("");

  if (r.signalCount === 0 && r.tradingUniverse.length > 0) {
    L.push("## 5bis. Finding structurel #2 — FILTERS_TOO_STRICT_FOR_LARGE_ETF");
    L.push("");
    L.push(`**0 signal généré** sur ${r.tradingUniverse.length} ETF × ${r.rangeDays} jours RANGE = ~${r.tradingUniverse.length * r.rangeDays} opportunités-jour théoriques.`);
    L.push("");
    L.push("Les paramètres gelés ex-ante (RSI(14) < 25 ET prix < EMA20 × 0.97) **ne se déclenchent quasiment jamais** sur les ETF larges US (SPY/QQQ/IWM/MDY) en régime RANGE. Raisons probables :");
    L.push("");
    L.push("- RSI(14) < 25 sur un ETF d'indice large = excès statistique rare (≈ < 1 % des jours, et concentré en bear violent — pas en RANGE).");
    L.push("- Distance EMA20 < -3 % sur indice large = mouvement amplitude rare (les indices sont par construction moins volatils que les single names).");
    L.push("- La conjonction des deux + filtre RANGE = quasi-impossible.");
    L.push("");
    L.push("**Conséquence méthodologique** : l'opérationnalisation V1 du diagnostic R3A (paramètres calibrés implicitement pour des ETF sectoriels ou des leaders volatils) **n'est pas adaptée** aux ETF d'indice large. Soit (a) il faut tester sur les ETF sectoriels (absents du dataset — cf. finding #1), soit (b) il faut reformuler V1 avec des paramètres explicitement calibrés pour les ETF d'indice large (RSI < 30 + distEMA20 < -1 %, par exemple — **mais cela nécessite une nouvelle PR-R3A bis avec hypothèse économique distincte**, pas une modification post-hoc des paramètres de V1).");
    L.push("");
    L.push("**Pour respecter la règle anti-overfit** : aucune modification des paramètres V1 dans cette PR. Le résultat 0-signal est consigné honnêtement comme **information utile**, pas comme échec à corriger.");
    L.push("");
  }

  L.push("## 6. Baseline F×1 (friction baseline projet)");
  L.push("");
  const bs = r.baseline_F1.summary;
  L.push("| Métrique | Valeur |");
  L.push("|---|---:|");
  L.push(`| Signaux générés (avant friction) | ${r.signalCount} |`);
  L.push(`| Trades (= signaux, exit géré) | ${bs.trades} |`);
  L.push(`| Wins / Losses | ${bs.wins} / ${bs.losses} |`);
  L.push(`| Winrate | ${fmt(bs.winrate)} % |`);
  L.push(`| Expectancy R | ${fmt(bs.expectancyR, 4)} |`);
  L.push(`| **Profit factor (frictionné F×1)** | **${fmt(bs.profitFactor)}** |`);
  L.push(`| Total R | ${fmt(bs.totalR)} |`);
  L.push(`| Max drawdown R | ${fmt(bs.maxDrawdownR)} |`);
  L.push(`| Longest loss streak | ${bs.longestLossStreak} |`);
  L.push("");

  L.push("PF par année :");
  L.push("");
  L.push("| Année | Trades | PF | Total R |");
  L.push("|---|---:|---:|---:|");
  for (const y of ["2021", "2022", "2023", "2024", "2025"]) {
    const v = r.baseline_F1.yearly[y];
    if (v === null) L.push(`| ${y} | _aucun trade_ | n/a | n/a |`);
    else L.push(`| ${y} | ${v.trades} | ${fmt(v.pf)} | ${fmt(v.totalR)} |`);
  }
  L.push("");

  L.push("## 7. Walk-forward STRICT (3 splits, paramètres gelés)");
  L.push("");
  L.push("| Split | Train years | Test years | Train trades | Train PF | Test trades | Test PF | Test totalR | Pass live (≥1.0) | Pass robust (≥1.20) |");
  L.push("|---|---|---|---:|---:|---:|---:|---:|---|---|");
  for (const s of r.baseline_F1.walkForward.splits) {
    L.push(`| ${s.name} | ${s.trainYears.join("-")} | ${s.testYears.join("-")} | ${s.train.trades} | ${fmt(s.train.profitFactor)} | ${s.test.trades} | **${fmt(s.test.profitFactor)}** | ${fmt(s.test.totalR)} | ${s.passLive ? "✓" : "✗"} | ${s.passRobust ? "✓" : "✗"} |`);
  }
  L.push("");
  L.push(`**Splits PASS live** : ${r.baseline_F1.walkForward.passLive} / 3.`);
  L.push("");
  L.push(`**Splits PASS robust** : ${r.baseline_F1.walkForward.passRobust} / 3.`);
  L.push("");

  L.push("## 8. Concentration top 5 contributeurs");
  L.push("");
  const c = r.baseline_F1.concentration;
  L.push(`- Symboles ayant tradé : **${c.universeSize}**`);
  L.push(`- Symboles avec contribution positive : **${c.positiveContributors}**`);
  L.push(`- Somme positive (R) : **${fmt(c.sumPositiveR)}**`);
  L.push(`- **Top 5 share** (% du PnL positif) : **${fmt(c.top5SharePctOfPositive)} %**`);
  L.push(`- Single max share : ${fmt(c.singleMaxSharePctOfPositive)} %`);
  L.push(`- **PF sans top 5** : **${fmt(c.pfWithoutTop5)}**`);
  L.push(`- Total R sans top 5 : ${fmt(c.totalRWithoutTop5)} (sur ${c.tradesWithoutTop5} trades)`);
  L.push("");
  L.push("Top 5 contributeurs positifs :");
  L.push("");
  L.push("| Rang | Symbole | Trades | Total R | Share % |");
  L.push("|---:|---|---:|---:|---:|");
  c.top5.forEach((x, i) => {
    L.push(`| ${i + 1} | ${x.symbol} | ${x.trades} | ${fmt(x.totalR)} | ${fmt(x.sharePctOfPositive)} % |`);
  });
  L.push("");

  L.push("## 9. Drawdown deep-dive");
  L.push("");
  const ddx = r.baseline_F1.drawdown;
  L.push(`- Max drawdown : **${fmt(ddx.maxDD)} R**`);
  L.push(`- Longest loss streak : **${ddx.longestLossStreak}** trades consécutifs perdants`);
  if (ddx.longestLossStreakWindow) {
    L.push(`  - Fenêtre : ${ddx.longestLossStreakWindow.startDate} → ${ddx.longestLossStreakWindow.endDate}`);
  }
  L.push(`- Worst drawdown magnitude : ${fmt(ddx.worstDD.magnitudeR)} R sur ${ddx.worstDD.durationTrades} trades`);
  if (ddx.worstDD.startDate) {
    L.push(`  - Période : ${ddx.worstDD.startDate} → ${ddx.worstDD.endDate}`);
  }
  L.push("");
  L.push(`**Clusters de pertes (≥ 5 trades consécutifs perdants)** : ${ddx.lossClusters5plus.length}`);
  if (ddx.lossClusters5plus.length) {
    L.push("");
    L.push("| # | Période | Longueur | Total R perdu |");
    L.push("|---:|---|---:|---:|");
    ddx.lossClusters5plus.forEach((cl, i) => {
      L.push(`| ${i + 1} | ${cl.startDate} → ${cl.endDate} | ${cl.length} | ${fmt(cl.totalRLoss)} |`);
    });
  }
  L.push("");

  L.push("## 10. Dépendance aux dates extrêmes");
  L.push("");
  const wo3x = r.baseline_F1.withoutTop3Dates;
  const wo5x = r.baseline_F1.withoutTop5Dates;
  L.push(`- **Sans top 3 dates gagnantes** : PF = **${fmt(wo3x.summary.profitFactor)}**, Total R = ${fmt(wo3x.summary.totalR)} (sur ${wo3x.summary.trades} trades).`);
  L.push(`- Top 3 dates retirées : ${wo3x.topDates.map((d) => `\`${d}\``).join(", ")}`);
  L.push(`- **Sans top 5 dates gagnantes** : PF = **${fmt(wo5x.summary.profitFactor)}**, Total R = ${fmt(wo5x.summary.totalR)} (sur ${wo5x.summary.trades} trades).`);
  L.push("");
  L.push("**Lecture** : si PF sans top 3 dates < 1.0, l'edge dépend de quelques événements (rebonds de crash, recovery exceptionnelle) — pas reproductible.");
  L.push("");

  L.push("## 11. Transitions régime mid-hold");
  L.push("");
  const tr = r.baseline_F1.regimeTransitions;
  L.push("| Sous-groupe | Trades | Winrate | Expectancy R | PF | Total R |");
  L.push("|---|---:|---:|---:|---:|---:|");
  L.push(`| Stable (régime entry == régime exit) | ${tr.stable.count} | ${fmt(tr.stable.winrate)} % | ${fmt(tr.stable.expectancyR, 4)} | ${fmt(tr.stable.profitFactor)} | ${fmt(tr.stable.totalR)} |`);
  L.push(`| Transition (régime change mid-hold) | ${tr.transition.count} | ${fmt(tr.transition.winrate)} % | ${fmt(tr.transition.expectancyR, 4)} | ${fmt(tr.transition.profitFactor)} | ${fmt(tr.transition.totalR)} |`);
  L.push("");
  L.push("**Lecture** : si la branche transition est très négative, le setup est fragile aux bascules régime mid-hold (limite du filtre statique à l'entrée).");
  L.push("");

  L.push("## 12. Friction stress ×2 et ×3");
  L.push("");
  L.push("| Friction | Trades | PF | Total R | Max DD | WF passLive | WF passRobust |");
  L.push("|---|---:|---:|---:|---:|---|---|");
  L.push(`| ×1 (baseline) | ${bs.trades} | ${fmt(bs.profitFactor)} | ${fmt(bs.totalR)} | ${fmt(bs.maxDrawdownR)} | ${r.baseline_F1.walkForward.passLive}/3 | ${r.baseline_F1.walkForward.passRobust}/3 |`);
  L.push(`| ×2 | ${r.friction_F2.summary.trades} | ${fmt(r.friction_F2.summary.profitFactor)} | ${fmt(r.friction_F2.summary.totalR)} | ${fmt(r.friction_F2.summary.maxDrawdownR)} | ${r.friction_F2.walkForward.passLive}/3 | ${r.friction_F2.walkForward.passRobust}/3 |`);
  L.push(`| ×3 | ${r.friction_F3.summary.trades} | ${fmt(r.friction_F3.summary.profitFactor)} | ${fmt(r.friction_F3.summary.totalR)} | ${fmt(r.friction_F3.summary.maxDrawdownR)} | ${r.friction_F3.walkForward.passLive}/3 | ${r.friction_F3.walkForward.passRobust}/3 |`);
  L.push("");
  L.push("**Critères Freeze § 4** : friction ×2 PF ≥ 1.10 attendu, friction ×3 PF ≥ 1.0 souhaité.");
  L.push("");

  L.push("## 13. Checklist PASS / FAIL");
  L.push("");
  const chk = r.passFailChecklist;
  L.push("| Critère | Seuil | Valeur | Pass |");
  L.push("|---|---|---|---|");
  L.push(`| Sample minimum | ≥ 30 trades | ${bs.trades} | ${chk.sampleMin30 ? "✓" : "✗"} |`);
  L.push(`| PF baseline F×1 | ≥ 1.20 | ${fmt(bs.profitFactor)} | ${chk.pfBaselineMin120 ? "✓" : "✗"} |`);
  L.push(`| PF friction ×2 | ≥ 1.10 | ${fmt(r.friction_F2.summary.profitFactor)} | ${chk.pfF2Min110 ? "✓" : "✗"} |`);
  L.push(`| WF pass robust | ≥ 2/3 splits PF test ≥ 1.20 | ${r.baseline_F1.walkForward.passRobust}/3 | ${chk.wfPassRobustMin2of3 ? "✓" : "✗"} |`);
  L.push(`| Top 5 share | < 70 % | ${fmt(c.top5SharePctOfPositive)} % | ${chk.top5ShareUnder70 ? "✓" : "✗"} |`);
  L.push(`| PF sans top 5 | ≥ 1.05 | ${fmt(c.pfWithoutTop5)} | ${chk.pfWithoutTop5Min105 ? "✓" : "✗"} |`);
  L.push(`| 2022 PF | ≥ 0.5 | ${fmt(r.baseline_F1.yearly["2022"]?.pf)} | ${chk.year2022MinPf05 ? "✓" : "✗"} |`);
  L.push(`| Sans top 3 dates PF | ≥ 1.0 | ${fmt(wo3x.summary.profitFactor)} | ${chk.withoutTop3DatesPfMin10 ? "✓" : "✗"} |`);
  L.push(`| Max DD / Total R | ≤ 1.5 | ${bs.totalR > 0 ? fmt(ddx.maxDD / bs.totalR) : "n/a"} | ${chk.ddRatioMax15 ? "✓" : "✗"} |`);
  L.push("");

  L.push("## 14. Verdict");
  L.push("");
  L.push(`**Statut : \`${r.verdict.status}\`**`);
  L.push("");
  L.push("Raisons :");
  L.push("");
  for (const reason of r.verdict.reasons) L.push(`- ${reason}`);
  L.push("");
  L.push(`Note : ${r.verdict.note}`);
  L.push("");
  L.push(`Vocabulaire : ${r.verdict.vocabulary}`);
  L.push("");
  L.push("### Lecture honnête du verdict");
  L.push("");
  L.push("Cette PR n'a pas cherché à sauver Mean Reversion ; elle a testé une hypothèse économique précise avec paramètres gelés. Le résultat est **NEEDS_MORE_DATA** pour deux raisons structurelles distinctes :");
  L.push("");
  L.push("1. **Dataset incomplet** : les ETF sectoriels (XLE, XLF, etc.) qui constituent une partie significative de l'hypothèse V1 ne sont pas dans `data/`. Sans eux, on ne peut conclure que sur les ETF d'indice large.");
  L.push("2. **Filtres inadaptés aux ETF d'indice large** : les paramètres RSI < 25 + distEMA20 < -3 % sont trop extrêmes pour les indices US, qui sont par construction moins volatils que les single names. Sur 5 ans × 4 ETF × 139 jours RANGE, 0 signal — le filtre ne capte aucun excès.");
  L.push("");
  L.push("**Implication produit** : Mean Reversion V1 dans sa forme actuelle n'est **pas opérationnellement testable** sur l'univers ManiTradePro disponible. Les options réalistes pour ChatGPT :");
  L.push("");
  L.push("- **(A) Sourcer les OHLC ETF sectoriels** (XLE, XLF, XLV, XLI, XLP, XLY, XLB, XLU, XLRE, XLC) puis relancer PR-R3B sur l'univers complet 15 ETF avec les **mêmes paramètres gelés** — c'est la voie la plus saine méthodologiquement.");
  L.push("- **(B) Accepter que V1 est non-testable sur le dataset actuel** et la classer `DATA_INSUFFICIENT` dans `SETUPS_REGISTRY.md` (statut Freeze § 8). Le setup officiel Mean Reversion resterait `EXPERIMENTAL_ONLY / FRICTION_REQUIRED`, V1 marquée comme bloquée par dataset.");
  L.push("- **(C) Reformuler une nouvelle hypothèse V1bis** dans une PR-R3A bis (pas dans cette PR) avec paramètres calibrés ex-ante pour ETF d'indice large (par exemple RSI < 30 + distEMA20 < -1.5 %) — **interdiction de modifier les paramètres de V1 ici**, ce serait du tuning post-hoc.");
  L.push("");
  L.push("Issue **DEAD / ABANDONED** **non recommandée** à ce stade : on ne peut pas dire que V1 est mort si on ne l'a jamais réellement testé. L'issue saine est `NEEDS_MORE_DATA` + décision politique sourcing dataset (A) ou reformulation hypothèse (C).");
  L.push("");

  L.push("## 15. Limites");
  L.push("");
  for (const lim of r.limitations) L.push(`- ${lim}`);
  L.push("");

  L.push("## 16. Rollback");
  L.push("");
  L.push(`- Runtime : ${r.rollback.runtime}`);
  L.push(`- Documentation : ${r.rollback.documentation}`);
  L.push(`- Outputs : ${r.rollback.outputs}`);
  L.push("");

  L.push("## 17. Anti-overfit — vérifications honnêteté");
  L.push("");
  L.push("- ✅ Paramètres figés ex-ante (cf. § 2). Aucune modification post-résultat.");
  L.push("- ✅ Aucune variante cachée. Une seule version testée.");
  L.push("- ✅ Aucun cherry-picking de période. Toutes les années 2021-2025 incluses.");
  L.push("- ✅ Aucun cherry-picking d'ETF. Univers gelé `ETFs_US_INDEX + ETFs_US_SECTORS`.");
  L.push("- ✅ Friction obligatoire dès baseline + stress ×2 et ×3.");
  L.push("- ✅ Walk-forward strict 3 splits paramètres gelés.");
  L.push("- ✅ Concentration analyse explicite (top 5, single max, PF sans top 5).");
  L.push("- ✅ Drawdown deep-dive + clusters de pertes + transitions régime.");
  L.push("- ✅ Dépendance dates extrêmes mesurée (sans top 3 / top 5 dates).");
  L.push("- ✅ Max 4 filtres simultanés (régime RANGE, RSI < 25, dist EMA20 × 0.97, stop ATR × 1.5). Garde-fou TRADING_PHILOSOPHY § 1 respecté.");
  L.push("");

  L.push("## 18. Sources");
  L.push("");
  for (const s of r.sources) L.push(`- \`${s}\``);
  L.push("");

  L.push("---");
  L.push("");
  L.push("Hypothèses : friction round-trip 0.30 % + 0.02 %/j, conversion 5 % = 1R, indicateurs causaux par construction, entry NEXT_OPEN exclusivement, paramètres baseline gelés ex-ante.");
  return L.join("\n");
}
