// tools/backtests/setup-execution-bias-audit-v1.mjs
//
// Audit offline d'exécution / look-ahead bias sur les 3 setups restants
// après l'invalidation de PULLBACK_MOMENTUM (cf. PR #207) :
//   - BREAKOUT_EXPANSION
//   - MEAN_REVERSION
//   - RELATIVE_STRENGTH_ROTATION
//
// STRICTEMENT offline. Aucun ordre, aucun broker, aucun endpoint live.
// Aucun moteur existant modifié. Lecture seule de :
//   - tools/backtests/backtest-multi-setup-grid.mjs (code Breakout / MeanRev)
//   - tools/backtests/backtest-relative-strength-rotation-regime-v1.mjs
//   - tools/backtests/universe-v2.mjs
//   - data/*.json (OHLC daily)
//
// Sorties :
//   - tools/backtests/output/setup-execution-bias-audit-v1.json
//   - tools/backtests/output/setup-execution-bias-audit-v1.md
//
// Pour CHAQUE setup, on combine :
//   1. Audit statique line-by-line du code source (findings + severity)
//   2. Re-simulation avec plusieurs modèles d'entrée alternatifs
//   3. Mesure de l'inflation PF/expectancy entre CURRENT et chaque modèle
//   4. Verdict par setup : CLEAN / LOW_RISK / MEDIUM_RISK / HIGH_RISK / INVALID_BACKTEST

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "setup-execution-bias-audit-v1.json");
const OUT_MD = join(OUT_DIR, "setup-execution-bias-audit-v1.md");

const SYMBOLS = [...new Set(Object.values(UNIVERSE).flat())];

// === Variants ==============================================================

const BREAKOUT_VARIANTS = [
  { name: "breakout_h20_vol1.2_stop1_rr2", lookback: 20, volMult: 1.2, stopAtr: 1.0, rr: 2.0 },
  { name: "breakout_h20_vol1.5_stop1_rr2", lookback: 20, volMult: 1.5, stopAtr: 1.0, rr: 2.0 },
  { name: "breakout_h50_vol1.2_stop1.5_rr2.5", lookback: 50, volMult: 1.2, stopAtr: 1.5, rr: 2.5 },
  { name: "breakout_h50_vol1.5_stop1.5_rr2.5", lookback: 50, volMult: 1.5, stopAtr: 1.5, rr: 2.5 },
];

const MEANREV_VARIANTS = [
  { name: "meanrev_rsi30_dist5_stop1_rr1.2", rsiMax: 30, distMin: -5, stopAtr: 1.0, rr: 1.2 },
  { name: "meanrev_rsi35_dist4_stop1_rr1.2", rsiMax: 35, distMin: -4, stopAtr: 1.0, rr: 1.2 },
  { name: "meanrev_rsi30_dist7_stop1.5_rr1.5", rsiMax: 30, distMin: -7, stopAtr: 1.5, rr: 1.5 },
];

const RS_VARIANTS = [
  { name: "rs_90d_top10_hold20", lookback: 90, topN: 10, holdDays: 20, rebalanceEvery: 10, minMomentum: 12 },
  { name: "rs_120d_top10_hold20", lookback: 120, topN: 10, holdDays: 20, rebalanceEvery: 10, minMomentum: 15 },
];

const BREAKOUT_MODELS = [
  "CURRENT",
  "NEXT_OPEN",
  "SIGNAL_CLOSE",
  "NO_SIGNAL_CANDLE_LOW_STOP",
  "NEXT_OPEN_NO_SIGNAL_CANDLE_STOP",
];

const MEANREV_MODELS = [
  "CURRENT",
  "NEXT_OPEN",
  "SIGNAL_CLOSE",
  "NO_SIGNAL_CANDLE_LOW_STOP",
  "NEXT_OPEN_NO_SIGNAL_CANDLE_STOP",
];

const RS_MODELS = [
  "CURRENT",
  "NEXT_OPEN_ENTRY_ONLY",
  "NEXT_OPEN_BOTH",
];

// === Helpers ===============================================================

function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

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
  if (values.length < period + 1) return [];
  let g = 0, l = 0;
  const r = [];
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) g += d; else l += Math.abs(d);
  }
  let ag = g / period, al = l / period;
  for (let i = 0; i < period; i++) r.push(null);
  let rs = al === 0 ? 100 : ag / al;
  r.push(100 - 100 / (1 + rs));
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const gain = d > 0 ? d : 0;
    const loss = d < 0 ? Math.abs(d) : 0;
    ag = (ag * (period - 1) + gain) / period;
    al = (al * (period - 1) + loss) / period;
    rs = al === 0 ? 100 : ag / al;
    r.push(100 - 100 / (1 + rs));
  }
  return r;
}

function pctChange(a, b) { if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null; return ((a - b) / b) * 100; }

function trueRanges(candles) {
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs;
}

function averageRange(candles, period = 14) {
  if (candles.length < period + 1) return null;
  return avg(trueRanges(candles).slice(-period));
}

function volumeMA(candles, period = 20) {
  const v = candles.map((c) => Number(c.volume || 0)).filter(Number.isFinite);
  if (v.length < period) return null;
  return avg(v.slice(-period));
}

function normalizeCandles(raw) {
  return raw
    .map((c) => ({
      time: c.time || c.date || c.datetime || c.timestamp,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume || 0),
    }))
    .filter((c) => c.time && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function loadCandles(symbol) {
  const p = join(DATA_DIR, `${symbol}_2025.json`);
  if (!fs.existsSync(p)) return null;
  return normalizeCandles(JSON.parse(fs.readFileSync(p, "utf8")));
}

// === Breakout ===============================================================

function detectBreakoutComponents(candles, i, variant) {
  if (i < Math.max(220, variant.lookback + 30)) return null;
  const slice = candles.slice(0, i + 1);
  const closes = slice.map((c) => c.close);
  const ema50 = ema(closes, 50).at(-1);
  const ema200 = ema(closes, 200).at(-1);
  const lastCandle = slice.at(-1);
  // CODE SOURCE : prevRange = slice.slice(-(lookback+1), -1) — EXCLUT bougie i déjà
  const prevRange = slice.slice(-(variant.lookback + 1), -1);
  if (prevRange.length < variant.lookback) return null;
  const highestHigh = Math.max(...prevRange.map((c) => c.high));
  const atrWithSignal = averageRange(slice, 14);
  const atrWithoutSignal = averageRange(slice.slice(0, -1), 14);
  const vma = volumeMA(slice.slice(0, -1), 20);
  const hasVolume = lastCandle.volume > 0 && vma && vma > 0;
  const valid =
    ema50 > ema200 &&
    lastCandle.close > highestHigh &&
    (!hasVolume || lastCandle.volume >= vma * variant.volMult);
  if (!valid || !atrWithSignal) return null;
  return { signalIdx: i, signalCandle: lastCandle, highestHigh, atrWithSignal, atrWithoutSignal };
}

function buildBreakoutTrade(model, comp, candles, variant) {
  const i = comp.signalIdx;
  const lc = comp.signalCandle;
  const atr = model === "NO_SIGNAL_CANDLE_LOW_STOP" || model === "NEXT_OPEN_NO_SIGNAL_CANDLE_STOP" ? comp.atrWithoutSignal : comp.atrWithSignal;
  if (!Number.isFinite(atr) || atr <= 0) return null;

  let entry, simulStartIdx, stop;
  switch (model) {
    case "CURRENT":
    case "SIGNAL_CLOSE": {
      // identique au code actuel
      entry = lc.close;
      stop = Math.min(lc.low, entry - atr * variant.stopAtr);
      simulStartIdx = i + 1;
      break;
    }
    case "NEXT_OPEN": {
      if (i + 1 >= candles.length) return null;
      entry = candles[i + 1].open;
      // stop calculé après l'ouverture suivante : on n'a plus besoin d'utiliser
      // low[i], mais le code source le faisait. On compare donc avec/sans.
      stop = Math.min(lc.low, entry - atr * variant.stopAtr);
      simulStartIdx = i + 1;
      break;
    }
    case "NO_SIGNAL_CANDLE_LOW_STOP": {
      // entry au close[i] mais stop NE prend pas en compte low[i]
      entry = lc.close;
      stop = entry - atr * variant.stopAtr;
      simulStartIdx = i + 1;
      break;
    }
    case "NEXT_OPEN_NO_SIGNAL_CANDLE_STOP": {
      if (i + 1 >= candles.length) return null;
      entry = candles[i + 1].open;
      stop = entry - atr * variant.stopAtr;
      simulStartIdx = i + 1;
      break;
    }
    default: throw new Error(`Unknown model: ${model}`);
  }
  const risk = entry - stop;
  if (!Number.isFinite(risk) || risk <= 0) return { skipped: true };
  const tp = entry + risk * variant.rr;
  const rr = (tp - entry) / risk;
  if (!Number.isFinite(rr) || rr < 1.2) return { skipped: true };
  return { entry, stop, tp, rr, simulStartIdx };
}

// === Mean Reversion =========================================================

function detectMeanReversionComponents(candles, i, variant) {
  if (i < 80) return null;
  const slice = candles.slice(0, i + 1);
  const closes = slice.map((c) => c.close);
  const ema20 = ema(closes, 20).at(-1);
  const rsi14 = rsi(closes, 14).at(-1);
  const lc = slice.at(-1);
  const prev = slice.at(-2);
  if (!prev) return null;
  const atrWithSignal = averageRange(slice, 14);
  const atrWithoutSignal = averageRange(slice.slice(0, -1), 14);
  const distEma20 = pctChange(lc.close, ema20);
  const greenReversal = lc.close > lc.open && lc.close > prev.close;
  const valid = rsi14 <= variant.rsiMax && distEma20 <= variant.distMin && greenReversal;
  if (!valid || !atrWithSignal) return null;
  return { signalIdx: i, signalCandle: lc, atrWithSignal, atrWithoutSignal };
}

function buildMeanRevTrade(model, comp, candles, variant) {
  const i = comp.signalIdx;
  const lc = comp.signalCandle;
  const atr = model === "NO_SIGNAL_CANDLE_LOW_STOP" || model === "NEXT_OPEN_NO_SIGNAL_CANDLE_STOP" ? comp.atrWithoutSignal : comp.atrWithSignal;
  if (!Number.isFinite(atr) || atr <= 0) return null;
  let entry, simulStartIdx, stop;
  switch (model) {
    case "CURRENT":
    case "SIGNAL_CLOSE": {
      entry = lc.close;
      stop = Math.min(lc.low, entry - atr * variant.stopAtr);
      simulStartIdx = i + 1;
      break;
    }
    case "NEXT_OPEN": {
      if (i + 1 >= candles.length) return null;
      entry = candles[i + 1].open;
      stop = Math.min(lc.low, entry - atr * variant.stopAtr);
      simulStartIdx = i + 1;
      break;
    }
    case "NO_SIGNAL_CANDLE_LOW_STOP": {
      entry = lc.close;
      stop = entry - atr * variant.stopAtr;
      simulStartIdx = i + 1;
      break;
    }
    case "NEXT_OPEN_NO_SIGNAL_CANDLE_STOP": {
      if (i + 1 >= candles.length) return null;
      entry = candles[i + 1].open;
      stop = entry - atr * variant.stopAtr;
      simulStartIdx = i + 1;
      break;
    }
    default: throw new Error(`Unknown model: ${model}`);
  }
  const risk = entry - stop;
  if (!Number.isFinite(risk) || risk <= 0) return { skipped: true };
  const tp = entry + risk * variant.rr;
  const rr = (tp - entry) / risk;
  if (!Number.isFinite(rr)) return { skipped: true };
  return { entry, stop, tp, rr, simulStartIdx };
}

// === Trade simulation (Breakout + MeanRev) =================================

function simulateTrade(candles, trade) {
  const start = trade.simulStartIdx;
  const end = Math.min(start + 10, candles.length);
  for (let j = start; j < end; j++) {
    const c = candles[j];
    const stopHit = c.low <= trade.stop;
    const tpHit = c.high >= trade.tp;
    if (stopHit && tpHit) return { result: "LOSS", pnl: -1 };
    if (stopHit) return { result: "LOSS", pnl: -1 };
    if (tpHit) return { result: "WIN", pnl: trade.rr };
  }
  return { result: "TIMEOUT", pnl: 0 };
}

// === RS Rotation ===========================================================
//
// La rotation utilise une boucle date-by-date : à chaque rebalance, on classe
// les symboles par momentum sur lookback days et on entre dans le top N.
// Le pnl est en R via pnlPct / 5.

function buildDateIndex(candlesBySymbol) {
  const counts = new Map();
  for (const candles of candlesBySymbol.values()) {
    for (const c of candles) counts.set(c.time, (counts.get(c.time) || 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n >= 20).map(([t]) => t).sort();
}

function findCandleIndex(candles, time) {
  return candles.findIndex((c) => c.time === time);
}

function runRsVariant({ candlesBySymbol, dates, variant, model }) {
  const trades = [];
  for (let di = variant.lookback; di < dates.length - variant.holdDays - 2; di += variant.rebalanceEvery) {
    const time = dates[di];
    const candidates = [];
    for (const [symbol, candles] of candlesBySymbol.entries()) {
      const idx = findCandleIndex(candles, time);
      if (idx < variant.lookback) continue;
      if (idx + variant.holdDays + 2 >= candles.length) continue;

      const now = candles[idx].close;
      const past = candles[idx - variant.lookback].close;
      const mom = pctChange(now, past);
      if (mom === null || mom < variant.minMomentum) continue;

      let entry, exit, entryTime, exitTime;
      switch (model) {
        case "CURRENT": {
          // entry = close[idx], exit = close[idx+holdDays]
          entry = now;
          exit = candles[idx + variant.holdDays].close;
          entryTime = candles[idx].time;
          exitTime = candles[idx + variant.holdDays].time;
          break;
        }
        case "NEXT_OPEN_ENTRY_ONLY": {
          // entry = open[idx+1], exit = close[idx+holdDays]
          if (idx + 1 >= candles.length) continue;
          entry = candles[idx + 1].open;
          exit = candles[idx + variant.holdDays].close;
          entryTime = candles[idx + 1].time;
          exitTime = candles[idx + variant.holdDays].time;
          break;
        }
        case "NEXT_OPEN_BOTH": {
          // entry = open[idx+1], exit = open[idx+1+holdDays]
          if (idx + 1 + variant.holdDays >= candles.length) continue;
          entry = candles[idx + 1].open;
          exit = candles[idx + 1 + variant.holdDays].open;
          entryTime = candles[idx + 1].time;
          exitTime = candles[idx + 1 + variant.holdDays].time;
          break;
        }
        default: throw new Error(`Unknown RS model: ${model}`);
      }
      const pnlPct = pctChange(exit, entry);
      if (pnlPct === null) continue;
      candidates.push({ symbol, momentum: mom, entry, exit, entryTime, exitTime, pnlPct });
    }
    candidates.sort((a, b) => b.momentum - a.momentum);
    for (const c of candidates.slice(0, variant.topN)) {
      const pnl = c.pnlPct / 5;
      trades.push({ symbol: c.symbol, variant: variant.name, model, entryTime: c.entryTime, exitTime: c.exitTime, momentum: c.momentum, pnl: Number(pnl.toFixed(2)), pnlPct: Number(c.pnlPct.toFixed(2)) });
    }
  }
  return trades;
}

// === Agrégation des trades =================================================

function summarizeTrades(trades) {
  const total = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const timeouts = trades.filter((t) => t.pnl === 0).length;
  const grossWin = wins.reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b.pnl, 0));
  const totalPnl = trades.reduce((a, b) => a + b.pnl, 0);
  let equity = 0, peak = 0, maxDD = 0;
  for (const t of trades) {
    equity += t.pnl;
    if (equity > peak) peak = equity;
    maxDD = Math.max(maxDD, peak - equity);
  }
  return {
    trades: total,
    wins: wins.length,
    losses: losses.length,
    timeouts,
    winrate: total ? Number(((wins.length / total) * 100).toFixed(2)) : null,
    expectancy: total ? Number((totalPnl / total).toFixed(3)) : null,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? 999 : 0) : Number((grossWin / grossLoss).toFixed(3)),
    maxDrawdown: Number(maxDD.toFixed(2)),
    totalPnl: Number(totalPnl.toFixed(2)),
  };
}

function inflation(currentPF, modelPF) {
  if (!Number.isFinite(currentPF) || !Number.isFinite(modelPF) || modelPF <= 0) return null;
  return Number((currentPF / modelPF).toFixed(3));
}

// === Audit statique =========================================================

function staticAudit() {
  return {
    BREAKOUT_EXPANSION: {
      findings: [
        {
          id: "B1",
          component: "highestHigh (fenêtre lookback)",
          codeRef: "candles.slice(-(variant.lookback + 1), -1)",
          description: "Fenêtre EXCLUT déjà la bougie signal. highestHigh est calculé sur les `lookback` jours strictement antérieurs.",
          severity: "LOW",
          verdict: "SAFE",
        },
        {
          id: "B2",
          component: "entry = lastCandle.close",
          codeRef: "const entry = lastCandle.close",
          description: "L'entrée est le close de la bougie signal. Réaliste UNIQUEMENT si on accepte un MOC order (Market On Close) ou si on attend l'open suivant. Si pas de MOC dispo en réel, l'entrée effective est open[i+1].",
          severity: "MEDIUM",
          verdict: "RISKY (selon mode d'exécution)",
        },
        {
          id: "B3",
          component: "stop = min(lastCandle.low, entry - atr*x)",
          codeRef: "Math.min(lastCandle.low, entry - atr * variant.stopAtr)",
          description: "Le stop utilise low[i] qui est connu en fin de jour. Si l'entrée est intraday (impossible sans tick data), le low[i] serait postérieur. En MOC ou post-close, low[i] est OK.",
          severity: "LOW",
          verdict: "RISKY (selon mode d'exécution)",
        },
        {
          id: "B4",
          component: "ATR calcul",
          codeRef: "averageRange(candles, 14)",
          description: "ATR inclut TR de la bougie i (TR utilise high[i], low[i], close[i-1]). Tout est connu en fin de jour, OK.",
          severity: "LOW",
          verdict: "SAFE",
        },
        {
          id: "B5",
          component: "volumeMA",
          codeRef: "volumeMA(candles.slice(0, -1), 20)",
          description: "Volume MA calculé sur fenêtre EXCLUANT bougie i. Pas de look-ahead.",
          severity: "LOW",
          verdict: "SAFE",
        },
      ],
    },
    MEAN_REVERSION: {
      findings: [
        {
          id: "M1",
          component: "greenReversal",
          codeRef: "lastCandle.close > lastCandle.open && lastCandle.close > prevCandle.close",
          description: "Condition utilise close[i], open[i], close[i-1]. Toutes connues en fin de jour. OK signal post-close.",
          severity: "LOW",
          verdict: "SAFE",
        },
        {
          id: "M2",
          component: "entry = lastCandle.close",
          codeRef: "const entry = lastCandle.close",
          description: "Même remarque que Breakout B2 : réaliste si MOC, sinon NEXT_OPEN.",
          severity: "MEDIUM",
          verdict: "RISKY (selon mode d'exécution)",
        },
        {
          id: "M3",
          component: "stop = min(lastCandle.low, entry - atr*x)",
          codeRef: "Math.min(lastCandle.low, entry - atr * variant.stopAtr)",
          description: "Idem Breakout B3. low[i] connu en fin de jour, OK post-close.",
          severity: "LOW",
          verdict: "RISKY (selon mode d'exécution)",
        },
      ],
    },
    RELATIVE_STRENGTH_ROTATION: {
      findings: [
        {
          id: "R1",
          component: "momentum sur lookback days",
          codeRef: "const now = candles[idx].close; const past = candles[idx - variant.lookback].close",
          description: "Momentum = (close[i] - close[i-lookback]) / close[i-lookback]. Causal.",
          severity: "LOW",
          verdict: "SAFE",
        },
        {
          id: "R2",
          component: "entry = candles[idx].close, exit = candles[idx + holdDays].close",
          codeRef: "const now = candles[idx].close (entry); const exit = candles[idx + variant.holdDays].close",
          description: "Entry au close[i] et exit au close[i+holdDays]. Comme Breakout/MeanRev, réaliste si MOC à l'entrée ET à la sortie. En réel, sans MOC, l'exécution est open[i+1] et open[i+1+holdDays]. Risque modéré.",
          severity: "MEDIUM",
          verdict: "RISKY (selon mode d'exécution)",
        },
        {
          id: "R3",
          component: "ranking inter-symboles à la date i",
          codeRef: "candidates.sort((a, b) => b.momentum - a.momentum)",
          description: "Le ranking nécessite le close[i] de TOUS les symboles, donc impossible à exécuter intraday. Doit être fait après cloture du marché, et l'exécution sera open[i+1] en pratique.",
          severity: "MEDIUM",
          verdict: "RISKY (ranking post-close, exécution open suivant)",
        },
        {
          id: "R4",
          component: "pnl = pnlPct / 5 (convention R)",
          codeRef: "const pnl = c.pnlPct / 5",
          description: "Conversion arbitraire : 5 % = 1R. Pas de look-ahead mais le rapport R/Risk n'a pas de sens absolu — c'est juste une normalisation.",
          severity: "LOW",
          verdict: "SAFE (convention documentée)",
        },
        {
          id: "R5",
          component: "overcounting regimeMode",
          codeRef: "Le moteur produit 3 regimeModes (ALL_REGIMES, NO_RISK_OFF, RISK_ON_ONLY)",
          description: "Les trades sont comptés trois fois dans certaines agrégations downstream (cf. setup-performance-summary). Pas un bias de calcul mais un risque d'interprétation.",
          severity: "LOW",
          verdict: "SAFE (déjà documenté ailleurs)",
        },
      ],
    },
  };
}

// === Severity model =========================================================

function classifySetupSeverity(currentPF, realisticPF) {
  if (!Number.isFinite(currentPF) || !Number.isFinite(realisticPF) || realisticPF <= 0) {
    return { level: "UNKNOWN", justification: "PF indéterminé sur l'un des modèles" };
  }
  const ratio = currentPF / realisticPF;
  // Critères :
  //   < 1.05  → CLEAN
  //   < 1.15  → LOW_RISK
  //   < 1.30  → MEDIUM_RISK
  //   < 1.70  → HIGH_RISK
  //   else    → INVALID_BACKTEST
  // ET si PF réaliste < 1.0 → au moins HIGH_RISK
  let level;
  if (realisticPF < 1.0) level = "INVALID_BACKTEST";
  else if (ratio < 1.05) level = "CLEAN";
  else if (ratio < 1.15) level = "LOW_RISK";
  else if (ratio < 1.30) level = "MEDIUM_RISK";
  else if (ratio < 1.70) level = "HIGH_RISK";
  else level = "INVALID_BACKTEST";
  return { level, justification: `PF CURRENT ${currentPF.toFixed(2)} / PF réaliste ${realisticPF.toFixed(2)} = ×${ratio.toFixed(2)}${realisticPF < 1.0 ? " (réaliste sous le break-even)" : ""}` };
}

// === Main ==================================================================

async function main() {
  console.log("[setup-execution-bias-audit] démarrage");
  console.log(`[setup-execution-bias-audit] univers déclaré : ${SYMBOLS.length} symboles`);

  // Charger candles
  const candlesBySymbol = new Map();
  const missing = [];
  for (const s of SYMBOLS) {
    const c = loadCandles(s);
    if (c && c.length) candlesBySymbol.set(s, c);
    else missing.push(s);
  }
  console.log(`[setup-execution-bias-audit] OHLC chargés : ${candlesBySymbol.size} / ${SYMBOLS.length}`);

  // Survivorship audit
  const allDataFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith("_2025.json")).map((f) => f.replace("_2025.json", ""));
  const dataFilesNotInUniverse = allDataFiles.filter((s) => !SYMBOLS.includes(s));
  const survivorship = {
    declaredUniverseSize: SYMBOLS.length,
    dataFilesAvailable: allDataFiles.length,
    missingDataSymbols: missing,
    dataFilesNotInUniverse,
  };

  // === BREAKOUT simulation ====================================================
  console.log("[setup-execution-bias-audit] simulation Breakout…");
  const breakoutAgg = {};
  for (const v of BREAKOUT_VARIANTS) for (const m of BREAKOUT_MODELS) breakoutAgg[`${v.name}|${m}`] = [];
  let cnt = 0;
  for (const [symbol, candles] of candlesBySymbol) {
    cnt++;
    if (cnt % 30 === 0) console.log(`  Breakout ${cnt}/${candlesBySymbol.size}…`);
    for (let i = 220; i < candles.length - 11; i++) {
      for (const variant of BREAKOUT_VARIANTS) {
        const comp = detectBreakoutComponents(candles, i, variant);
        if (!comp) continue;
        for (const model of BREAKOUT_MODELS) {
          const trade = buildBreakoutTrade(model, comp, candles, variant);
          if (!trade || trade.skipped) continue;
          const res = simulateTrade(candles, trade);
          breakoutAgg[`${variant.name}|${model}`].push({ symbol, pnl: res.pnl, rr: trade.rr });
        }
      }
    }
  }

  const breakoutByVariantModel = {};
  for (const v of BREAKOUT_VARIANTS) {
    breakoutByVariantModel[v.name] = {};
    for (const m of BREAKOUT_MODELS) breakoutByVariantModel[v.name][m] = summarizeTrades(breakoutAgg[`${v.name}|${m}`]);
  }
  const breakoutGlobal = {};
  for (const m of BREAKOUT_MODELS) {
    const all = [];
    for (const v of BREAKOUT_VARIANTS) all.push(...breakoutAgg[`${v.name}|${m}`]);
    breakoutGlobal[m] = summarizeTrades(all);
  }

  // === MEAN REVERSION simulation ============================================
  console.log("[setup-execution-bias-audit] simulation Mean Reversion…");
  const meanrevAgg = {};
  for (const v of MEANREV_VARIANTS) for (const m of MEANREV_MODELS) meanrevAgg[`${v.name}|${m}`] = [];
  cnt = 0;
  for (const [symbol, candles] of candlesBySymbol) {
    cnt++;
    if (cnt % 30 === 0) console.log(`  MeanRev ${cnt}/${candlesBySymbol.size}…`);
    for (let i = 80; i < candles.length - 11; i++) {
      for (const variant of MEANREV_VARIANTS) {
        const comp = detectMeanReversionComponents(candles, i, variant);
        if (!comp) continue;
        for (const model of MEANREV_MODELS) {
          const trade = buildMeanRevTrade(model, comp, candles, variant);
          if (!trade || trade.skipped) continue;
          const res = simulateTrade(candles, trade);
          meanrevAgg[`${variant.name}|${model}`].push({ symbol, pnl: res.pnl, rr: trade.rr });
        }
      }
    }
  }

  const meanrevByVariantModel = {};
  for (const v of MEANREV_VARIANTS) {
    meanrevByVariantModel[v.name] = {};
    for (const m of MEANREV_MODELS) meanrevByVariantModel[v.name][m] = summarizeTrades(meanrevAgg[`${v.name}|${m}`]);
  }
  const meanrevGlobal = {};
  for (const m of MEANREV_MODELS) {
    const all = [];
    for (const v of MEANREV_VARIANTS) all.push(...meanrevAgg[`${v.name}|${m}`]);
    meanrevGlobal[m] = summarizeTrades(all);
  }

  // === RS ROTATION simulation ================================================
  console.log("[setup-execution-bias-audit] simulation RS Rotation…");
  // Filtre candlesBySymbol pour RS : ≥ 220 bougies
  const rsCandles = new Map();
  for (const [s, c] of candlesBySymbol) {
    if (c.length >= 220) rsCandles.set(s, c);
  }
  const dates = buildDateIndex(rsCandles);
  const rsByVariantModel = {};
  const rsGlobal = {};
  for (const m of RS_MODELS) {
    const all = [];
    rsByVariantModel[m] = {};
    for (const v of RS_VARIANTS) {
      const trades = runRsVariant({ candlesBySymbol: rsCandles, dates, variant: v, model: m });
      rsByVariantModel[m][v.name] = summarizeTrades(trades);
      all.push(...trades);
    }
    rsGlobal[m] = summarizeTrades(all);
  }

  // === Findings + severity ===================================================
  const staticReport = staticAudit();

  // Breakout : compare CURRENT vs NEXT_OPEN_NO_SIGNAL_CANDLE_STOP (le plus réaliste)
  const breakoutSev = classifySetupSeverity(breakoutGlobal.CURRENT.profitFactor, breakoutGlobal.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP.profitFactor);
  const meanrevSev = classifySetupSeverity(meanrevGlobal.CURRENT.profitFactor, meanrevGlobal.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP.profitFactor);
  const rsSev = classifySetupSeverity(rsGlobal.CURRENT.profitFactor, rsGlobal.NEXT_OPEN_BOTH.profitFactor);

  // Variante GLD breakout_h20_vol1.5_stop1_rr2 — focus spécifique
  const gldVariantName = "breakout_h20_vol1.5_stop1_rr2";
  const gldByModel = {};
  for (const m of BREAKOUT_MODELS) {
    const trades = breakoutAgg[`${gldVariantName}|${m}`].filter((t) => t.symbol === "GLD");
    gldByModel[m] = summarizeTrades(trades);
  }

  // === Build report ===========================================================
  const report = {
    generatedAt: new Date().toISOString(),
    scope: "Audit look-ahead / execution / temporal leakage / survivorship sur BREAKOUT_EXPANSION, MEAN_REVERSION, RELATIVE_STRENGTH_ROTATION",
    sources: [
      "tools/backtests/backtest-multi-setup-grid.mjs",
      "tools/backtests/backtest-relative-strength-rotation-regime-v1.mjs",
      "tools/backtests/universe-v2.mjs",
      "data/*.json (OHLC quotidiens 2021-2025)",
      "tools/backtests/output/setup-performance-summary-v1.json (référence)",
      "tools/backtests/output/pullback-lookahead-audit-v1.json (référence)",
      "tools/backtests/output/rolling-walkforward-validator.json (référence)",
      "tools/backtests/output/setup-variant-matrix.json (référence)",
    ],
    survivorship,
    setups: {
      BREAKOUT_EXPANSION: {
        models: BREAKOUT_MODELS,
        variants: BREAKOUT_VARIANTS.map((v) => v.name),
        staticFindings: staticReport.BREAKOUT_EXPANSION.findings,
        byVariantModel: breakoutByVariantModel,
        global: breakoutGlobal,
        severity: breakoutSev,
        gldFocus: gldByModel,
      },
      MEAN_REVERSION: {
        models: MEANREV_MODELS,
        variants: MEANREV_VARIANTS.map((v) => v.name),
        staticFindings: staticReport.MEAN_REVERSION.findings,
        byVariantModel: meanrevByVariantModel,
        global: meanrevGlobal,
        severity: meanrevSev,
      },
      RELATIVE_STRENGTH_ROTATION: {
        models: RS_MODELS,
        variants: RS_VARIANTS.map((v) => v.name),
        staticFindings: staticReport.RELATIVE_STRENGTH_ROTATION.findings,
        byModelVariant: rsByVariantModel,
        global: rsGlobal,
        severity: rsSev,
      },
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUT_MD, buildMarkdown(report), "utf8");

  console.log("");
  console.log("Verdicts par setup :");
  console.log(`  BREAKOUT_EXPANSION         severity=${breakoutSev.level}  ${breakoutSev.justification}`);
  console.log(`  MEAN_REVERSION             severity=${meanrevSev.level}  ${meanrevSev.justification}`);
  console.log(`  RELATIVE_STRENGTH_ROTATION severity=${rsSev.level}  ${rsSev.justification}`);
  console.log("");
  console.log(`Outputs :`);
  console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);
}

function fmt(n, d = 2) { if (n === null || n === undefined || !Number.isFinite(n)) return "n/a"; return Number(n).toFixed(d); }

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Setup Execution Bias Audit v1 — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/setup-execution-bias-audit-v1.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Audit offline uniquement.** Aucun ordre, aucun broker, aucun endpoint live. Aucun moteur existant modifié. Le but est de détecter un faux edge, pas de sauver les setups.");
  lines.push("");

  lines.push("## 1. Scope");
  lines.push("");
  lines.push(`Audit des trois setups restants après l'invalidation de PULLBACK_MOMENTUM (PR #207 verdict INVALID_BACKTEST) :`);
  lines.push("- **BREAKOUT_EXPANSION** (4 variantes)");
  lines.push("- **MEAN_REVERSION** (3 variantes)");
  lines.push("- **RELATIVE_STRENGTH_ROTATION** (2 variantes)");
  lines.push("");

  lines.push("## 2. Sources analysées");
  lines.push("");
  for (const s of report.sources) lines.push(`- ${s}`);
  lines.push("");

  lines.push("## 3. Méthodologie");
  lines.push("");
  lines.push("Pour chaque setup, l'audit combine :");
  lines.push("1. **Analyse statique** du code source — identification des composantes utilisant la bougie signal ou des fenêtres incluant la bougie i.");
  lines.push("2. **Re-simulation** sur les mêmes OHLC 2021-2025 avec plusieurs modèles d'entrée alternatifs.");
  lines.push("3. **Verdict** : CLEAN / LOW_RISK / MEDIUM_RISK / HIGH_RISK / INVALID_BACKTEST en fonction de l'inflation PF observée.");
  lines.push("");
  lines.push("Modèles testés :");
  lines.push("");
  lines.push("| Setup | Modèles |");
  lines.push("|---|---|");
  lines.push(`| BREAKOUT_EXPANSION | ${report.setups.BREAKOUT_EXPANSION.models.join(", ")} |`);
  lines.push(`| MEAN_REVERSION | ${report.setups.MEAN_REVERSION.models.join(", ")} |`);
  lines.push(`| RELATIVE_STRENGTH_ROTATION | ${report.setups.RELATIVE_STRENGTH_ROTATION.models.join(", ")} |`);
  lines.push("");

  // 4. Résumé exécutif
  lines.push("## 4. Résumé exécutif");
  lines.push("");
  lines.push("| Setup | Severity | Justification |");
  lines.push("|---|---|---|");
  lines.push(`| BREAKOUT_EXPANSION | **${report.setups.BREAKOUT_EXPANSION.severity.level}** | ${report.setups.BREAKOUT_EXPANSION.severity.justification} |`);
  lines.push(`| MEAN_REVERSION | **${report.setups.MEAN_REVERSION.severity.level}** | ${report.setups.MEAN_REVERSION.severity.justification} |`);
  lines.push(`| RELATIVE_STRENGTH_ROTATION | **${report.setups.RELATIVE_STRENGTH_ROTATION.severity.level}** | ${report.setups.RELATIVE_STRENGTH_ROTATION.severity.justification} |`);
  lines.push("");
  lines.push("Pour mémoire : PULLBACK_MOMENTUM = **INVALID_BACKTEST** (PR #207).");
  lines.push("");

  // 5. Breakout audit
  lines.push("## 5. Breakout audit");
  lines.push("");
  lines.push("### Statique");
  lines.push("");
  for (const f of report.setups.BREAKOUT_EXPANSION.staticFindings) {
    lines.push(`- **${f.id}** (${f.severity}) — ${f.component}. ${f.description} (Réf. \`${f.codeRef}\`, verdict : ${f.verdict}.)`);
  }
  lines.push("");
  lines.push("### Re-simulation (agrégée toutes variantes)");
  lines.push("");
  lines.push("| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation vs CURRENT |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const m of report.setups.BREAKOUT_EXPANSION.models) {
    const g = report.setups.BREAKOUT_EXPANSION.global[m];
    const inf = inflation(report.setups.BREAKOUT_EXPANSION.global.CURRENT.profitFactor, g.profitFactor);
    lines.push(`| ${m} | ${g.trades.toLocaleString("fr-FR")} | ${fmt(g.winrate)} % | ${fmt(g.expectancy, 3)} | ${fmt(g.profitFactor, 2)} | ${fmt(g.maxDrawdown, 1)} | ${m === "CURRENT" ? "—" : (inf !== null ? `×${inf}` : "n/a")} |`);
  }
  lines.push("");
  lines.push("### Focus GLD × breakout_h20_vol1.5_stop1_rr2");
  lines.push("");
  lines.push("La variante phare de Breakout (seule à atteindre tier STRONG dans setup-variant-matrix). Verdict après exécution réaliste :");
  lines.push("");
  lines.push("| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  for (const m of report.setups.BREAKOUT_EXPANSION.models) {
    const g = report.setups.BREAKOUT_EXPANSION.gldFocus[m];
    lines.push(`| ${m} | ${g.trades} | ${fmt(g.winrate)} % | ${fmt(g.expectancy, 3)} | ${fmt(g.profitFactor, 2)} | ${fmt(g.maxDrawdown, 1)} |`);
  }
  lines.push("");

  // 6. MeanRev audit
  lines.push("## 6. Mean Reversion audit");
  lines.push("");
  lines.push("### Statique");
  lines.push("");
  for (const f of report.setups.MEAN_REVERSION.staticFindings) {
    lines.push(`- **${f.id}** (${f.severity}) — ${f.component}. ${f.description} (Réf. \`${f.codeRef}\`, verdict : ${f.verdict}.)`);
  }
  lines.push("");
  lines.push("### Re-simulation (agrégée toutes variantes)");
  lines.push("");
  lines.push("| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation vs CURRENT |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const m of report.setups.MEAN_REVERSION.models) {
    const g = report.setups.MEAN_REVERSION.global[m];
    const inf = inflation(report.setups.MEAN_REVERSION.global.CURRENT.profitFactor, g.profitFactor);
    lines.push(`| ${m} | ${g.trades.toLocaleString("fr-FR")} | ${fmt(g.winrate)} % | ${fmt(g.expectancy, 3)} | ${fmt(g.profitFactor, 2)} | ${fmt(g.maxDrawdown, 1)} | ${m === "CURRENT" ? "—" : (inf !== null ? `×${inf}` : "n/a")} |`);
  }
  lines.push("");

  // 7. RS Rotation
  lines.push("## 7. RS Rotation audit");
  lines.push("");
  lines.push("### Statique");
  lines.push("");
  for (const f of report.setups.RELATIVE_STRENGTH_ROTATION.staticFindings) {
    lines.push(`- **${f.id}** (${f.severity}) — ${f.component}. ${f.description} (Réf. \`${f.codeRef}\`, verdict : ${f.verdict}.)`);
  }
  lines.push("");
  lines.push("### Re-simulation (agrégée toutes variantes, toutes dates 2021-2025)");
  lines.push("");
  lines.push("| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation vs CURRENT |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const m of report.setups.RELATIVE_STRENGTH_ROTATION.models) {
    const g = report.setups.RELATIVE_STRENGTH_ROTATION.global[m];
    const inf = inflation(report.setups.RELATIVE_STRENGTH_ROTATION.global.CURRENT.profitFactor, g.profitFactor);
    lines.push(`| ${m} | ${g.trades.toLocaleString("fr-FR")} | ${fmt(g.winrate)} % | ${fmt(g.expectancy, 3)} | ${fmt(g.profitFactor, 2)} | ${fmt(g.maxDrawdown, 1)} | ${m === "CURRENT" ? "—" : (inf !== null ? `×${inf}` : "n/a")} |`);
  }
  lines.push("");
  lines.push("**Rappel** : rolling walk-forward → 0 cellule ROBUST/STABLE pour RS Rotation, 0 ALLOW v2 (cf. setup-performance-summary-v1). L'edge backtest n'a pas tenu sur les splits temporels même avant cet audit.");
  lines.push("");

  // 8. Comparaison modèles d'entrée
  lines.push("## 8. Comparaison des modèles d'entrée — tableau récapitulatif");
  lines.push("");
  lines.push("Synthèse cross-setup : PF agrégé par modèle, pour répondre rapidement à « quel modèle d'exécution fait le moins/le plus de dégâts ».");
  lines.push("");
  lines.push("| Setup | CURRENT | NEXT_OPEN | SIGNAL_CLOSE | NO_SIG_LOW_STOP | NEXT_OPEN_NO_SIG_STOP |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  lines.push(`| Breakout | ${fmt(report.setups.BREAKOUT_EXPANSION.global.CURRENT.profitFactor, 2)} | ${fmt(report.setups.BREAKOUT_EXPANSION.global.NEXT_OPEN.profitFactor, 2)} | ${fmt(report.setups.BREAKOUT_EXPANSION.global.SIGNAL_CLOSE.profitFactor, 2)} | ${fmt(report.setups.BREAKOUT_EXPANSION.global.NO_SIGNAL_CANDLE_LOW_STOP.profitFactor, 2)} | ${fmt(report.setups.BREAKOUT_EXPANSION.global.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP.profitFactor, 2)} |`);
  lines.push(`| Mean Reversion | ${fmt(report.setups.MEAN_REVERSION.global.CURRENT.profitFactor, 2)} | ${fmt(report.setups.MEAN_REVERSION.global.NEXT_OPEN.profitFactor, 2)} | ${fmt(report.setups.MEAN_REVERSION.global.SIGNAL_CLOSE.profitFactor, 2)} | ${fmt(report.setups.MEAN_REVERSION.global.NO_SIGNAL_CANDLE_LOW_STOP.profitFactor, 2)} | ${fmt(report.setups.MEAN_REVERSION.global.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP.profitFactor, 2)} |`);
  lines.push("");
  lines.push("RS Rotation (3 modèles différents) :");
  lines.push("");
  lines.push("| Modèle | PF | Inflation |");
  lines.push("|---|---:|---:|");
  const rsCur = report.setups.RELATIVE_STRENGTH_ROTATION.global.CURRENT.profitFactor;
  for (const m of report.setups.RELATIVE_STRENGTH_ROTATION.models) {
    const pf = report.setups.RELATIVE_STRENGTH_ROTATION.global[m].profitFactor;
    const inf = inflation(rsCur, pf);
    lines.push(`| ${m} | ${fmt(pf, 2)} | ${m === "CURRENT" ? "—" : (inf !== null ? `×${inf}` : "n/a")} |`);
  }
  lines.push("");

  // 9. Survivorship
  lines.push("## 9. Survivorship / data completeness");
  lines.push("");
  lines.push(`- Univers déclaré : **${report.survivorship.declaredUniverseSize}** symboles.`);
  lines.push(`- Fichiers OHLC dispo : **${report.survivorship.dataFilesAvailable}**.`);
  lines.push(`- Symboles UNIVERSE sans OHLC : **${report.survivorship.missingDataSymbols.length}** (${report.survivorship.missingDataSymbols.slice(0, 12).join(", ") || "_aucun_"}${report.survivorship.missingDataSymbols.length > 12 ? "…" : ""}).`);
  lines.push(`- Fichiers OHLC hors univers : **${report.survivorship.dataFilesNotInUniverse.length}**.`);
  lines.push("");
  lines.push("Limites : pas de liste externe de tickers delistés 2021-2025 pour audit complet. Les delistés hors UNIVERSE ne sont pas mesurables.");
  lines.push("");

  // 10. Findings détaillés
  lines.push("## 10. Findings détaillés");
  lines.push("");
  for (const setupKey of ["BREAKOUT_EXPANSION", "MEAN_REVERSION", "RELATIVE_STRENGTH_ROTATION"]) {
    lines.push(`### ${setupKey}`);
    lines.push("");
    for (const f of report.setups[setupKey].staticFindings) {
      lines.push(`- **${f.id}** (severity ${f.severity}, verdict ${f.verdict}) — ${f.component}.`);
      lines.push(`  - Réf. code : \`${f.codeRef}\``);
      lines.push(`  - ${f.description}`);
    }
    lines.push("");
  }

  // 11. Severity grading
  lines.push("## 11. Severity grading");
  lines.push("");
  lines.push("Échelle : **CLEAN**, **LOW_RISK**, **MEDIUM_RISK**, **HIGH_RISK**, **INVALID_BACKTEST**.");
  lines.push("");
  lines.push("Méthode : ratio PF CURRENT / PF modèle le plus réaliste (NEXT_OPEN_NO_SIGNAL_CANDLE_STOP pour Breakout/MeanRev, NEXT_OPEN_BOTH pour RS Rotation).");
  lines.push("");
  lines.push("Seuils :");
  lines.push("- ratio < 1.05 → CLEAN");
  lines.push("- ratio < 1.15 → LOW_RISK");
  lines.push("- ratio < 1.30 → MEDIUM_RISK");
  lines.push("- ratio < 1.70 → HIGH_RISK");
  lines.push("- ratio ≥ 1.70 OU PF réaliste < 1.0 → INVALID_BACKTEST");
  lines.push("");

  // 12. Conséquences pipeline aval
  lines.push("## 12. Conséquences pipeline aval");
  lines.push("");
  lines.push("Si l'un des setups est noté HIGH_RISK ou INVALID_BACKTEST :");
  lines.push("- `tradable-universe-v1`, `tradable-universe-v2` listent des ALLOW potentiellement sur-évalués.");
  lines.push("- `rolling-walkforward-validator` calcule la robustesse sur les mêmes données biaisées.");
  lines.push("- `allocation-engine-v3` consomme ces verdicts (status actuel = failed, l'écart peut s'aggraver).");
  lines.push("- `setup-performance-summary-v1` affiche les grades B/D/FAILED sur la base CURRENT — à reréviser après correction du code source.");
  lines.push("");

  // 13. Recommandations
  lines.push("## 13. Recommandations");
  lines.push("");
  const recs = [];
  // Breakout
  if (report.setups.BREAKOUT_EXPANSION.severity.level === "INVALID_BACKTEST" || report.setups.BREAKOUT_EXPANSION.severity.level === "HIGH_RISK") {
    recs.push("**Breakout** : corriger `detectBreakout` (entry = open[i+1] et stop = entry - atr*x sans min(low[i], …)).");
  } else if (report.setups.BREAKOUT_EXPANSION.severity.level === "MEDIUM_RISK") {
    recs.push("**Breakout** : surveiller. Le PF résiste correctement à NEXT_OPEN, mais documenter clairement l'hypothèse MOC vs open-suivant.");
  } else {
    recs.push("**Breakout** : pas de correction urgente nécessaire. Documenter le mode d'exécution attendu (MOC ou open suivant).");
  }
  // MeanRev
  if (report.setups.MEAN_REVERSION.severity.level === "INVALID_BACKTEST") {
    recs.push("**Mean Reversion** : confirmer l'abandon (déjà grade D dans setup-performance-summary). Aucun edge ne survit à exécution réaliste.");
  } else if (report.setups.MEAN_REVERSION.severity.level === "HIGH_RISK") {
    recs.push("**Mean Reversion** : corriger ou abandonner. Edge marginal et fragile.");
  } else {
    recs.push("**Mean Reversion** : edge marginal résiste à exécution réaliste — décider politique (garder pour diversification ou abandonner).");
  }
  // RS
  if (report.setups.RELATIVE_STRENGTH_ROTATION.severity.level === "INVALID_BACKTEST") {
    recs.push("**RS Rotation** : INVALID. Le ranking inter-symbole impose une exécution open[i+1] qui détruit l'edge.");
  } else if (report.setups.RELATIVE_STRENGTH_ROTATION.severity.level === "HIGH_RISK") {
    recs.push("**RS Rotation** : corriger pour utiliser open[i+1] partout (entry ET exit). 0 cellule ROBUST/STABLE déjà observé en rolling.");
  } else {
    recs.push("**RS Rotation** : PF résiste à exécution open suivant. Mais le rolling walk-forward montre toujours 0 robust/stable — fragilité structurelle indépendante du bias d'exécution.");
  }
  recs.push("**Audit symétrique sur les autres composantes** : friction, slippage, fees, taille de position (déjà partiellement traité par friction-model-v1).");
  recs.push("**Recalcul complet** de la pipeline aval après toute correction de code source.");
  for (const r of recs) lines.push(`- ${r}`);
  lines.push("");

  // 14. Verdict final
  lines.push("## 14. Verdict final");
  lines.push("");
  lines.push(`- **BREAKOUT_EXPANSION** : ${report.setups.BREAKOUT_EXPANSION.severity.level}. ${report.setups.BREAKOUT_EXPANSION.severity.justification}`);
  lines.push(`- **MEAN_REVERSION** : ${report.setups.MEAN_REVERSION.severity.level}. ${report.setups.MEAN_REVERSION.severity.justification}`);
  lines.push(`- **RELATIVE_STRENGTH_ROTATION** : ${report.setups.RELATIVE_STRENGTH_ROTATION.severity.level}. ${report.setups.RELATIVE_STRENGTH_ROTATION.severity.justification}`);
  lines.push("");
  lines.push("Réponses directes aux questions du brief :");
  lines.push("");
  const bkSev = report.setups.BREAKOUT_EXPANSION.severity.level;
  const gldNextOpenStop = report.setups.BREAKOUT_EXPANSION.gldFocus.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP;
  const gldCurrent = report.setups.BREAKOUT_EXPANSION.gldFocus.CURRENT;
  lines.push(`1. **Est-ce que Breakout garde un edge réel ?** ${bkSev === "CLEAN" || bkSev === "LOW_RISK" ? "OUI, l'edge résiste à exécution réaliste (PF " + fmt(report.setups.BREAKOUT_EXPANSION.global.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP.profitFactor, 2) + " en NEXT_OPEN_NO_SIG_STOP)." : (bkSev === "MEDIUM_RISK" ? "FRAGILE. Edge dégradé mais positif (PF " + fmt(report.setups.BREAKOUT_EXPANSION.global.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP.profitFactor, 2) + ")." : "NON. PF " + fmt(report.setups.BREAKOUT_EXPANSION.global.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP.profitFactor, 2) + " en exécution réaliste, edge détruit.")}`);
  lines.push(`2. **Est-ce que la variante GLD reste forte après exécution réaliste ?** PF CURRENT ${fmt(gldCurrent.profitFactor, 2)} → PF NEXT_OPEN_NO_SIG_STOP ${fmt(gldNextOpenStop.profitFactor, 2)}. ${gldNextOpenStop.profitFactor >= 1.5 ? "OUI, GLD garde un edge substantiel." : gldNextOpenStop.profitFactor >= 1.1 ? "FRAGILE mais positif." : "NON, GLD perd son edge."}`);
  const mrSev = report.setups.MEAN_REVERSION.severity.level;
  lines.push(`3. **Est-ce que Mean Reversion est définitivement mort ?** ${mrSev === "INVALID_BACKTEST" ? "OUI, confirmé. PF " + fmt(report.setups.MEAN_REVERSION.global.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP.profitFactor, 2) + " en exécution réaliste." : "EDGE TRÈS MARGINAL (PF " + fmt(report.setups.MEAN_REVERSION.global.NEXT_OPEN_NO_SIGNAL_CANDLE_STOP.profitFactor, 2) + "), à confirmer après friction."}`);
  const rsSevLevel = report.setups.RELATIVE_STRENGTH_ROTATION.severity.level;
  lines.push(`4. **Est-ce que RS Rotation est un vrai setup à retravailler ou à bloquer ?** ${rsSevLevel === "INVALID_BACKTEST" ? "À BLOQUER. PF " + fmt(report.setups.RELATIVE_STRENGTH_ROTATION.global.NEXT_OPEN_BOTH.profitFactor, 2) + " en exécution réaliste, plus 0 cellule robust/stable rolling." : "À RETRAVAILLER. PF résiste partiellement mais aucune cellule robust/stable en rolling — fragilité indépendante du bias d'exécution."}`);
  const failedCount = [bkSev, mrSev, rsSevLevel].filter((s) => s === "INVALID_BACKTEST" || s === "HIGH_RISK").length;
  lines.push(`5. **Doit-on corriger ou repartir de zéro ?** ${failedCount >= 2 ? "Les corrections individuelles sont risquées. À l'échelle de 4 setups, " + (failedCount + 1) + " sur 4 sont en HIGH_RISK ou INVALID (avec Pullback). Recommandation : audit complet de l'architecture, repartir d'une logique d'exécution rigoureuse (entry = open[i+1] systématique, stop sans bougie i, ranking inter-symboles sans look-ahead) plutôt que des patches isolés." : "Corrections ciblées suffisantes. Pas besoin de repartir de zéro."}`);
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("**Hypothèses** : indicateurs causaux, OHLC daily, simulation 10 bougies max, LOSS prioritaire si stop+TP même bougie, RS Rotation : pnl = pnlPct / 5. Pas de friction modélisée.");
  lines.push("");
  lines.push("**Limites** : simulation des 4 variants Breakout, 3 variants MeanRev, 2 variants RS ; pas tous les regimeModes RS testés (chaque modèle utilise un regimeMode équivalent à ALL_REGIMES). Pas d'audit anti-look-ahead sur indicateurs eux-mêmes (vérifié causal). Survivorship limité à la diff UNIVERSE vs data/.");

  return lines.join("\n");
}

main().catch((err) => {
  console.error("[setup-execution-bias-audit] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
