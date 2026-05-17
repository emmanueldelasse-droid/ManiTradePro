import fs from "fs";

const DATA_DIR = "./data";
const OUTPUT_JSON = "./tools/backtests/results-relative-strength-rotation-v1.json";

import { UNIVERSE } from "./universe-v2.mjs";

const SYMBOLS = Object.values(
  UNIVERSE
).flat();

const UNIQUE_SYMBOLS = [...new Set(SYMBOLS)];

const VARIANTS = [
  {
    name: "rs_20d_top5_hold5",
    lookback: 20,
    topN: 5,
    holdDays: 5,
    rebalanceEvery: 5,
    minMomentum: 3
  },
  {
    name: "rs_60d_top5_hold10",
    lookback: 60,
    topN: 5,
    holdDays: 10,
    rebalanceEvery: 5,
    minMomentum: 8
  },
  {
    name: "rs_90d_top10_hold20",
    lookback: 90,
    topN: 10,
    holdDays: 20,
    rebalanceEvery: 10,
    minMomentum: 12
  },
  {
    name: "rs_120d_top10_hold20",
    lookback: 120,
    topN: 10,
    holdDays: 20,
    rebalanceEvery: 10,
    minMomentum: 15
  }
];

function normalizeCandles(raw) {
  return raw
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
  return normalizeCandles(JSON.parse(fs.readFileSync(path, "utf8")));
}

function pct(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return ((a - b) / b) * 100;
}

function getYear(time) {
  return String(time).slice(0, 4);
}

function summarize(trades) {
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const grossWin = wins.reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b.pnl, 0));
  const total = trades.reduce((a, b) => a + b.pnl, 0);

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let longestLossStreak = 0;
  let currentLossStreak = 0;

  for (const trade of trades) {
    equity += trade.pnl;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (trade.pnl < 0) {
      currentLossStreak++;
      if (currentLossStreak > longestLossStreak) {
        longestLossStreak = currentLossStreak;
      }
    } else {
      currentLossStreak = 0;
    }
  }

  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winrate: trades.length ? Number(((wins.length / trades.length) * 100).toFixed(2)) : 0,
    expectancy: trades.length ? Number((total / trades.length).toFixed(2)) : 0,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? 999 : 0) : Number((grossWin / grossLoss).toFixed(2)),
    totalR: Number(total.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    longestLossStreak
  };
}

function buildDateIndex(candlesBySymbol) {
  const counts = new Map();

  for (const candles of candlesBySymbol.values()) {
    for (const c of candles) {
      counts.set(c.time, (counts.get(c.time) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= 20)
    .map(([time]) => time)
    .sort();
}

function findCandleIndex(candles, time) {
  return candles.findIndex(c => c.time === time);
}

function runVariant(candlesBySymbol, dates, variant, allowedYears = null) {
  const trades = [];

  for (let di = variant.lookback; di < dates.length - variant.holdDays; di += variant.rebalanceEvery) {
    const time = dates[di];
    const year = getYear(time);

    if (allowedYears && !allowedYears.includes(year)) continue;

    const candidates = [];

    for (const [symbol, candles] of candlesBySymbol.entries()) {
      const idx = findCandleIndex(candles, time);
      if (idx < variant.lookback || idx + variant.holdDays >= candles.length) continue;

      const now = candles[idx].close;
      const past = candles[idx - variant.lookback].close;
      const mom = pct(now, past);

      if (mom === null || mom < variant.minMomentum) continue;

      candidates.push({
        symbol,
        idx,
        mom,
        entry: now,
        exit: candles[idx + variant.holdDays].close,
        entryTime: candles[idx].time,
        exitTime: candles[idx + variant.holdDays].time
      });
    }

    candidates.sort((a, b) => b.mom - a.mom);

    for (const c of candidates.slice(0, variant.topN)) {
      const pnlPct = pct(c.exit, c.entry);
      const pnl = pnlPct / 5; // approx: 5% move = +1R, -5% = -1R

      trades.push({
        symbol: c.symbol,
        variant: variant.name,
        entryTime: c.entryTime,
        exitTime: c.exitTime,
        year,
        momentum: Number(c.mom.toFixed(2)),
        pnl: Number(pnl.toFixed(2)),
        pnlPct: Number(pnlPct.toFixed(2))
      });
    }
  }

  return trades;
}

function runAll(allowedYears = null) {
  const candlesBySymbol = new Map();

  for (const symbol of UNIQUE_SYMBOLS) {
    const candles = loadCandles(symbol);
    if (candles.length >= 180) candlesBySymbol.set(symbol, candles);
  }

  const dates = buildDateIndex(candlesBySymbol);
  const rows = [];
  const bySymbol = [];

  for (const variant of VARIANTS) {
    const trades = runVariant(candlesBySymbol, dates, variant, allowedYears);

    rows.push({
      variant: variant.name,
      ...summarize(trades)
    });

    const symbols = [...new Set(trades.map(t => t.symbol))];

    for (const symbol of symbols) {
      const st = trades.filter(t => t.symbol === symbol);
      bySymbol.push({
        symbol,
        variant: variant.name,
        ...summarize(st)
      });
    }
  }

  rows.sort((a, b) => {
    if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
    if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
    return b.trades - a.trades;
  });

  bySymbol.sort((a, b) => {
    if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
    if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
    return b.trades - a.trades;
  });

  return {
    symbolsTested: candlesBySymbol.size,
    rows,
    bySymbol
  };
}

function printRows(title, rows, limit = 20) {
  console.log(`\n=== ${title} ===`);
  console.table(rows.slice(0, limit));
}

const years = ["2021", "2022", "2023", "2024", "2025"];
const overall = runAll();
const yearly = {};

for (const year of years) {
  yearly[year] = runAll([year]);
}

const output = {
  createdAt: new Date().toISOString(),
  symbolsInput: SYMBOLS.length,
  symbolsTested: overall.symbolsTested,
  variants: VARIANTS,
  overall,
  yearly
};

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(output, null, 2));

console.log(`\nSymbols tested: ${overall.symbolsTested}`);

printRows("RELATIVE STRENGTH ROTATION | OVERALL VARIANTS", overall.rows, 20);

printRows(
  "RELATIVE STRENGTH ROTATION | BEST SYMBOLS OVERALL | min trades 10",
  overall.bySymbol.filter(r => r.trades >= 10),
  50
);

for (const year of years) {
  printRows(`RELATIVE STRENGTH ROTATION | ${year} VARIANTS`, yearly[year].rows, 10);
  printRows(
    `RELATIVE STRENGTH ROTATION | ${year} BEST SYMBOLS | min trades 3`,
    yearly[year].bySymbol.filter(r => r.trades >= 3),
    30
  );
}

console.log(`\nSaved: ${OUTPUT_JSON}`);
