import fs from "fs";

const DATA_DIR = "./data";
const OUTPUT_JSON = "./tools/backtests/results-multi-setup-grid.json";

import { UNIVERSE } from "./universe-v2.mjs";

const SYMBOLS = Object.values(
  UNIVERSE
).flat();

const UNIQUE_SYMBOLS = [...new Set(SYMBOLS)];

const YEARS = ["2021", "2022", "2023", "2024", "2025"];

const SETUPS = [
  {
    id: "PULLBACK_MOMENTUM",
    variants: [
      { name: "pullback_rsi42_58_chg20_5_stop0.1", rsiMin: 42, rsiMax: 58, chg20Min: 5, stopAtr: 0.1 },
      { name: "pullback_rsi42_58_chg20_3_stop0.1", rsiMin: 42, rsiMax: 58, chg20Min: 3, stopAtr: 0.1 },
      { name: "pullback_base_rsi42_58_chg20_0_stop0.1", rsiMin: 42, rsiMax: 58, chg20Min: 0, stopAtr: 0.1 },
      { name: "pullback_rsi42_58_chg20_5_stop0.5", rsiMin: 42, rsiMax: 58, chg20Min: 5, stopAtr: 0.5 },
      { name: "pullback_rsi42_58_chg20_3_stop0.5", rsiMin: 42, rsiMax: 58, chg20Min: 3, stopAtr: 0.5 }
    ]
  },
  {
    id: "BREAKOUT_EXPANSION",
    variants: [
      { name: "breakout_h20_vol1.2_stop1_rr2", lookback: 20, volMult: 1.2, stopAtr: 1.0, rr: 2.0 },
      { name: "breakout_h20_vol1.5_stop1_rr2", lookback: 20, volMult: 1.5, stopAtr: 1.0, rr: 2.0 },
      { name: "breakout_h50_vol1.2_stop1.5_rr2.5", lookback: 50, volMult: 1.2, stopAtr: 1.5, rr: 2.5 },
      { name: "breakout_h50_vol1.5_stop1.5_rr2.5", lookback: 50, volMult: 1.5, stopAtr: 1.5, rr: 2.5 }
    ]
  },
  {
    id: "MEAN_REVERSION",
    variants: [
      { name: "meanrev_rsi30_dist5_stop1_rr1.2", rsiMax: 30, distMin: -5, stopAtr: 1.0, rr: 1.2 },
      { name: "meanrev_rsi35_dist4_stop1_rr1.2", rsiMax: 35, distMin: -4, stopAtr: 1.0, rr: 1.2 },
      { name: "meanrev_rsi30_dist7_stop1.5_rr1.5", rsiMax: 30, distMin: -7, stopAtr: 1.5, rr: 1.5 }
    ]
  },
  {
    id: "VOLATILITY_COMPRESSION",
    variants: [
      { name: "compression_20_ratio0.65_break20_stop1_rr2", atrLookback: 20, compressionRatio: 0.65, breakoutLookback: 20, stopAtr: 1.0, rr: 2.0 },
      { name: "compression_20_ratio0.75_break20_stop1_rr2", atrLookback: 20, compressionRatio: 0.75, breakoutLookback: 20, stopAtr: 1.0, rr: 2.0 },
      { name: "compression_40_ratio0.7_break30_stop1.5_rr2.5", atrLookback: 40, compressionRatio: 0.7, breakoutLookback: 30, stopAtr: 1.5, rr: 2.5 }
    ]
  }
];

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ema(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const result = [];
  let prev = avg(values.slice(0, period));

  for (let i = 0; i < period - 1; i++) result.push(null);
  result.push(prev);

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }

  return result;
}

function rsi(values, period = 14) {
  if (values.length < period + 1) return [];
  let gains = 0;
  let losses = 0;
  const result = [];

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < period; i++) result.push(null);

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }

  return result;
}

function pctChange(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return ((a - b) / b) * 100;
}

function trueRanges(candles) {
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    trs.push(Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    ));
  }
  return trs;
}

function averageRange(candles, period = 14) {
  if (candles.length < period + 1) return null;
  return avg(trueRanges(candles).slice(-period));
}

function volumeMA(candles, period = 20) {
  const volumes = candles.map(c => Number(c.volume || 0)).filter(Number.isFinite);
  if (volumes.length < period) return null;
  return avg(volumes.slice(-period));
}

function getYear(candle) {
  const raw = candle.time || candle.date || candle.datetime || candle.timestamp;
  if (!raw) return null;
  return String(raw).slice(0, 4);
}

function normalizeCandles(candles) {
  return candles
    .map(c => ({
      time: c.time || c.date || c.datetime || c.timestamp,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume || 0)
    }))
    .filter(c =>
      c.time &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close)
    )
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function loadCandles(symbol) {
  const path = `${DATA_DIR}/${symbol}_2025.json`;
  if (!fs.existsSync(path)) return [];
  return normalizeCandles(JSON.parse(fs.readFileSync(path, "utf-8")));
}

// === Régime macro (référence : SPY/QQQ/SMH EMA200) ===========================
// Identique au pattern utilisé dans
//   - backtest-relative-strength-rotation-regime-v1.mjs
//   - backtest-pullback-yearly-walkforward.mjs
// RISK_ON  = SPY, QQQ, SMH au-dessus de leur EMA200
// RISK_OFF = SPY, QQQ, SMH en-dessous de leur EMA200
// Sinon    = RANGE
function buildRegimeByDate() {
  const required = ["SPY", "QQQ", "SMH"];
  const market = {};

  for (const symbol of required) {
    const candles = loadCandles(symbol);
    if (!candles || !candles.length) {
      throw new Error(`Missing market regime data: ${symbol}`);
    }
    const closes = candles.map(c => c.close);
    const indexByDate = new Map();
    for (let i = 0; i < candles.length; i++) indexByDate.set(candles[i].time, i);
    market[symbol] = { candles, ema200: ema(closes, 200), indexByDate };
  }

  const allDates = new Set();
  for (const m of Object.values(market)) {
    for (const c of m.candles) allDates.add(c.time);
  }
  const commonDates = [...allDates]
    .filter(d => required.every(s => market[s].indexByDate.has(d)))
    .sort();

  const regimeByDate = new Map();
  for (const date of commonDates) {
    const spyIdx = market.SPY.indexByDate.get(date);
    const qqqIdx = market.QQQ.indexByDate.get(date);
    const smhIdx = market.SMH.indexByDate.get(date);
    if (spyIdx < 200 || qqqIdx < 200 || smhIdx < 200) continue;

    const spyBull = market.SPY.candles[spyIdx].close > market.SPY.ema200[spyIdx];
    const qqqBull = market.QQQ.candles[qqqIdx].close > market.QQQ.ema200[qqqIdx];
    const smhBull = market.SMH.candles[smhIdx].close > market.SMH.ema200[smhIdx];

    let regime = "RANGE";
    if (spyBull && qqqBull && smhBull) regime = "RISK_ON";
    if (!spyBull && !qqqBull && !smhBull) regime = "RISK_OFF";
    regimeByDate.set(date, regime);
  }

  return regimeByDate;
}

const REGIME_BY_DATE = buildRegimeByDate();

function regimeForDate(date) {
  if (!date) return "RANGE";
  return REGIME_BY_DATE.get(date) || "RANGE";
}

function detectPullback(candles, variant) {
  const closes = candles.map(c => c.close);
  if (closes.length < 60) return null;

  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const rsiSeries = rsi(closes, 14);

  const last = closes.at(-1);
  const ema20 = ema20Series.at(-1);
  const ema50 = ema50Series.at(-1);
  const rsi14 = rsiSeries.at(-1);

  const distEma20 = pctChange(last, ema20);
  const chg5 = pctChange(last, closes[closes.length - 6]);
  const chg20 = pctChange(last, closes[closes.length - 21]);

  const recent20 = candles.slice(-20);
  const recent10 = candles.slice(-10);

  const swingHigh20 = Math.max(...recent20.map(c => c.high));
  const swingLow10 = Math.min(...recent10.map(c => c.low));
  const atr = averageRange(candles, 14);

  const valid =
    ema20 > ema50 &&
    distEma20 >= -1 &&
    distEma20 <= 2 &&
    rsi14 >= variant.rsiMin &&
    rsi14 <= variant.rsiMax &&
    chg5 < 0 &&
    chg20 > variant.chg20Min;

  if (!valid || !atr) return null;

  const entry = ema20;
  const stop = swingLow10 - atr * variant.stopAtr;
  const tp = swingHigh20;
  const rr = (tp - entry) / (entry - stop);

  if (!Number.isFinite(rr) || rr < 1.6) return null;
  return { entry, stop, tp, rr };
}

function detectBreakout(candles, variant) {
  const closes = candles.map(c => c.close);
  if (closes.length < Math.max(220, variant.lookback + 30)) return null;

  const ema50Series = ema(closes, 50);
  const ema200Series = ema(closes, 200);

  const lastCandle = candles.at(-1);
  const prevRange = candles.slice(-(variant.lookback + 1), -1);
  const highestHigh = Math.max(...prevRange.map(c => c.high));
  const atr = averageRange(candles, 14);
  const vma = volumeMA(candles.slice(0, -1), 20);

  const ema50 = ema50Series.at(-1);
  const ema200 = ema200Series.at(-1);

  const hasVolume = lastCandle.volume > 0 && vma && vma > 0;

  const valid =
    ema50 > ema200 &&
    lastCandle.close > highestHigh &&
    (!hasVolume || lastCandle.volume >= vma * variant.volMult);

  if (!valid || !atr) return null;

  const entry = lastCandle.close;
  const stop = Math.min(lastCandle.low, entry - atr * variant.stopAtr);
  const risk = entry - stop;
  const tp = entry + risk * variant.rr;
  const rr = (tp - entry) / risk;

  if (!Number.isFinite(rr) || rr < 1.2 || risk <= 0) return null;
  return { entry, stop, tp, rr };
}

function detectMeanReversion(candles, variant) {
  const closes = candles.map(c => c.close);
  if (closes.length < 80) return null;

  const ema20Series = ema(closes, 20);
  const rsiSeries = rsi(closes, 14);

  const lastCandle = candles.at(-1);
  const prevCandle = candles.at(-2);
  const ema20 = ema20Series.at(-1);
  const rsi14 = rsiSeries.at(-1);
  const atr = averageRange(candles, 14);
  const distEma20 = pctChange(lastCandle.close, ema20);

  const greenReversal = lastCandle.close > lastCandle.open && lastCandle.close > prevCandle.close;

  const valid =
    rsi14 <= variant.rsiMax &&
    distEma20 <= variant.distMin &&
    greenReversal;

  if (!valid || !atr) return null;

  const entry = lastCandle.close;
  const stop = Math.min(lastCandle.low, entry - atr * variant.stopAtr);
  const risk = entry - stop;
  const tp = entry + risk * variant.rr;
  const rr = (tp - entry) / risk;

  if (!Number.isFinite(rr) || risk <= 0) return null;
  return { entry, stop, tp, rr };
}

function detectVolatilityCompression(candles, variant) {
  const closes = candles.map(c => c.close);
  if (closes.length < Math.max(220, variant.atrLookback * 3, variant.breakoutLookback + 30)) return null;

  const ema50Series = ema(closes, 50);
  const ema200Series = ema(closes, 200);

  const trs = trueRanges(candles);
  const recentAtr = avg(trs.slice(-variant.atrLookback));
  const priorAtr = avg(trs.slice(-(variant.atrLookback * 3), -variant.atrLookback));

  const lastCandle = candles.at(-1);
  const prevRange = candles.slice(-(variant.breakoutLookback + 1), -1);
  const highestHigh = Math.max(...prevRange.map(c => c.high));

  const ema50 = ema50Series.at(-1);
  const ema200 = ema200Series.at(-1);

  const compressed = priorAtr > 0 && recentAtr / priorAtr <= variant.compressionRatio;

  const valid =
    ema50 > ema200 &&
    compressed &&
    lastCandle.close > highestHigh;

  if (!valid || !recentAtr) return null;

  const entry = lastCandle.close;
  const stop = Math.min(lastCandle.low, entry - recentAtr * variant.stopAtr);
  const risk = entry - stop;
  const tp = entry + risk * variant.rr;
  const rr = (tp - entry) / risk;

  if (!Number.isFinite(rr) || risk <= 0) return null;
  return { entry, stop, tp, rr };
}

function detectSignal(setupId, candles, variant) {
  if (setupId === "PULLBACK_MOMENTUM") return detectPullback(candles, variant);
  if (setupId === "BREAKOUT_EXPANSION") return detectBreakout(candles, variant);
  if (setupId === "MEAN_REVERSION") return detectMeanReversion(candles, variant);
  if (setupId === "VOLATILITY_COMPRESSION") return detectVolatilityCompression(candles, variant);
  throw new Error(`Unknown setup: ${setupId}`);
}

function simulateTrade(futureCandles, trade) {
  for (let i = 0; i < Math.min(10, futureCandles.length); i++) {
    const candle = futureCandles[i];
    const stopHit = candle.low <= trade.stop;
    const tpHit = candle.high >= trade.tp;

    if (stopHit && tpHit) return { result: "LOSS", pnl: -1 };
    if (stopHit) return { result: "LOSS", pnl: -1 };
    if (tpHit) return { result: "WIN", pnl: trade.rr };
  }

  return { result: "TIMEOUT", pnl: 0 };
}

function summarizeTrades(tradesList) {
  const trades = tradesList.length;
  const winsList = tradesList.filter(t => t.pnl > 0);
  const lossesList = tradesList.filter(t => t.pnl < 0);
  const timeouts = tradesList.filter(t => t.pnl === 0).length;

  const grossWin = winsList.reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(lossesList.reduce((a, b) => a + b.pnl, 0));

  const totalPnl = tradesList.reduce((a, b) => a + b.pnl, 0);

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let longestLossStreak = 0;
  let currentLossStreak = 0;

  for (const trade of tradesList) {
    equity += trade.pnl;
    if (equity > peak) peak = equity;
    maxDrawdown = Math.max(maxDrawdown, peak - equity);

    if (trade.pnl < 0) {
      currentLossStreak++;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    } else {
      currentLossStreak = 0;
    }
  }

  return {
    trades,
    wins: winsList.length,
    losses: lossesList.length,
    timeouts,
    winrate: trades ? Number(((winsList.length / trades) * 100).toFixed(2)) : 0,
    expectancy: trades ? Number((totalPnl / trades).toFixed(2)) : 0,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? 999 : 0) : Number((grossWin / grossLoss).toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    longestLossStreak
  };
}

function runSetupVariantOnSymbol({ setupId, variant, symbol, candles, allowedYears = null }) {
  const tradesList = [];

  for (let i = 220; i < candles.length - 11; i++) {
    const signalCandle = candles[i];
    const year = getYear(signalCandle);

    if (allowedYears && !allowedYears.includes(year)) continue;

    const slice = candles.slice(0, i + 1);
    const setup = detectSignal(setupId, slice, variant);
    if (!setup) continue;

    const result = simulateTrade(candles.slice(i + 1, i + 11), setup);

    tradesList.push({
      symbol,
      setupId,
      variant: variant.name,
      time: signalCandle.time,
      year,
      // regime macro à la date d'entrée — additif, n'influence pas l'ouverture
      regime: regimeForDate(signalCandle.time),
      pnl: result.pnl,
      result: result.result,
      rr: setup.rr
    });
  }

  return tradesList;
}

function runAll({ allowedYears = null } = {}) {
  const candlesBySymbol = new Map();

  for (const symbol of UNIQUE_SYMBOLS) {
    const candles = loadCandles(symbol);
    if (candles.length) candlesBySymbol.set(symbol, candles);
  }

  const rows = [];
  const bySymbolSetup = [];
  // bySymbolByRegime[] — additif (mai 2026). Décomposition per-(symbol, regime)
  // pour chaque (setup, variant). Modes émis : ALL_REGIMES (tous les trades)
  // et NO_RISK_OFF (trades dont regime != RISK_OFF, dérivé post-hoc). Pas de
  // RISK_ON_ONLY car aucun setup du multi-grid ne filtre par régime à l'entrée.
  // Cellules avec 0 trade omises (cohérent avec backtest-rs-regime).
  const bySymbolByRegime = [];

  for (const setup of SETUPS) {
    for (const variant of setup.variants) {
      const allTrades = [];

      for (const [symbol, candles] of candlesBySymbol.entries()) {
        const trades = runSetupVariantOnSymbol({
          setupId: setup.id,
          variant,
          symbol,
          candles,
          allowedYears
        });

        allTrades.push(...trades);

        bySymbolSetup.push({
          setupId: setup.id,
          variant: variant.name,
          symbol,
          ...summarizeTrades(trades)
        });

        // Décomposition par régime pour ce (setup, variant, symbol)
        const modes = [
          { name: "ALL_REGIMES", keep: () => true },
          { name: "NO_RISK_OFF", keep: t => t.regime !== "RISK_OFF" }
        ];
        for (const mode of modes) {
          const modeTrades = trades.filter(mode.keep);
          for (const regime of ["RISK_ON", "RANGE", "RISK_OFF"]) {
            const cellTrades = modeTrades.filter(t => t.regime === regime);
            if (cellTrades.length === 0) continue;
            bySymbolByRegime.push({
              setupId: setup.id,
              variant: variant.name,
              symbol,
              regimeMode: mode.name,
              regime,
              ...summarizeTrades(cellTrades)
            });
          }
        }
      }

      rows.push({
        setupId: setup.id,
        variant: variant.name,
        ...summarizeTrades(allTrades)
      });
    }
  }

  rows.sort((a, b) => {
    if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
    if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
    return b.trades - a.trades;
  });

  bySymbolByRegime.sort((a, b) => {
    if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
    if (a.setupId !== b.setupId) return a.setupId.localeCompare(b.setupId);
    if (a.variant !== b.variant) return a.variant.localeCompare(b.variant);
    if (a.regimeMode !== b.regimeMode) return a.regimeMode.localeCompare(b.regimeMode);
    return a.regime.localeCompare(b.regime);
  });

  return {
    symbolsTested: candlesBySymbol.size,
    rows,
    bySymbolSetup,
    bySymbolByRegime
  };
}

function bestBySymbolSetup(bySymbolSetup, minTrades = 20) {
  return bySymbolSetup
    .filter(r => r.trades >= minTrades)
    .sort((a, b) => {
      if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
      if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
      return b.trades - a.trades;
    });
}

function bestSetupPerSymbol(bySymbolSetup, minTrades = 20) {
  const best = new Map();

  for (const row of bySymbolSetup.filter(r => r.trades >= minTrades)) {
    const current = best.get(row.symbol);
    if (
      !current ||
      row.expectancy > current.expectancy ||
      (row.expectancy === current.expectancy && row.profitFactor > current.profitFactor)
    ) {
      best.set(row.symbol, row);
    }
  }

  return [...best.values()].sort((a, b) => b.expectancy - a.expectancy);
}

function printRows(title, rows, limit = 20) {
  console.log(`\n=== ${title} ===`);
  console.table(rows.slice(0, limit).map(r => ({
    setup: r.setupId,
    variant: r.variant,
    trades: r.trades,
    winrate: r.winrate,
    expectancy: r.expectancy,
    profitFactor: r.profitFactor,
    maxDrawdown: r.maxDrawdown,
    longestLossStreak: r.longestLossStreak
  })));
}

function printSymbolRows(title, rows, limit = 40) {
  console.log(`\n=== ${title} ===`);
  console.table(rows.slice(0, limit).map(r => ({
    symbol: r.symbol,
    setup: r.setupId,
    variant: r.variant,
    trades: r.trades,
    winrate: r.winrate,
    expectancy: r.expectancy,
    profitFactor: r.profitFactor,
    maxDrawdown: r.maxDrawdown,
    longestLossStreak: r.longestLossStreak
  })));
}

const overall = runAll();
const yearly = {};
for (const year of YEARS) {
  yearly[year] = runAll({ allowedYears: [year] });
}

const output = {
  createdAt: new Date().toISOString(),
  symbolsInput: SYMBOLS.length,
  symbolsTested: overall.symbolsTested,
  setups: SETUPS.map(s => ({
    id: s.id,
    variants: s.variants.map(v => v.name)
  })),
  overall,
  yearly
};

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2));

console.log(`\nSymbols tested: ${overall.symbolsTested}`);
printRows("OVERALL TOP SETUP VARIANTS", overall.rows, 30);
printSymbolRows("OVERALL BEST SYMBOL + SETUP PAIRS | min trades 20", bestBySymbolSetup(overall.bySymbolSetup, 20), 60);
printSymbolRows("BEST SETUP PER SYMBOL | min trades 20", bestSetupPerSymbol(overall.bySymbolSetup, 20), 80);

for (const year of YEARS) {
  printRows(`TOP SETUP VARIANTS ${year}`, yearly[year].rows, 15);
  printSymbolRows(`BEST SYMBOL + SETUP PAIRS ${year} | min trades 5`, bestBySymbolSetup(yearly[year].bySymbolSetup, 5), 40);
}

console.log(`\nSaved: ${OUTPUT_JSON}`);
