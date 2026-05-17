import fs from "fs";
import { UNIVERSE } from "./universe-v2.mjs";

const DATA_DIR = "./data";
const OUTPUT_JSON = "./tools/backtests/results-relative-strength-rotation-regime-v1.json";

const SYMBOLS = [
  ...new Set(
    Object.values(UNIVERSE).flat()
  )
];

const VARIANTS = [
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

const REGIME_MODES = [
  {
    name: "ALL_REGIMES",
    allowed: ["RISK_ON", "RANGE", "RISK_OFF"]
  },
  {
    name: "RISK_ON_ONLY",
    allowed: ["RISK_ON"]
  },
  {
    name: "NO_RISK_OFF",
    allowed: ["RISK_ON", "RANGE"]
  }
];

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ema(values, period) {
  if (values.length < period) return [];

  const k = 2 / (period + 1);
  let prev = avg(values.slice(0, period));
  const result = [];

  for (let i = 0; i < period - 1; i++) {
    result.push(null);
  }

  result.push(prev);

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }

  return result;
}

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

  if (!fs.existsSync(path)) {
    return [];
  }

  return normalizeCandles(
    JSON.parse(
      fs.readFileSync(path, "utf8")
    )
  );
}

function pct(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) {
    return null;
  }

  return ((a - b) / b) * 100;
}

function getYear(time) {
  return String(time).slice(0, 4);
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

function summarize(trades) {
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);

  const grossWin = wins.reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(
    losses.reduce((a, b) => a + b.pnl, 0)
  );

  const total = trades.reduce((a, b) => a + b.pnl, 0);

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let longestLossStreak = 0;
  let currentLossStreak = 0;

  for (const trade of trades) {
    equity += trade.pnl;

    if (equity > peak) {
      peak = equity;
    }

    const dd = peak - equity;

    if (dd > maxDrawdown) {
      maxDrawdown = dd;
    }

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
    winrate: trades.length
      ? Number(((wins.length / trades.length) * 100).toFixed(2))
      : 0,
    expectancy: trades.length
      ? Number((total / trades.length).toFixed(2))
      : 0,
    profitFactor: grossLoss === 0
      ? grossWin > 0 ? 999 : 0
      : Number((grossWin / grossLoss).toFixed(2)),
    totalR: Number(total.toFixed(2)),
    maxDrawdown: Number(maxDrawdown.toFixed(2)),
    longestLossStreak
  };
}

function buildMarketRegimes(candlesBySymbol, dates) {
  const required = ["SPY", "QQQ", "SMH"];

  for (const symbol of required) {
    if (!candlesBySymbol.has(symbol)) {
      throw new Error(`Missing market regime symbol data: ${symbol}`);
    }
  }

  const regimeByDate = new Map();

  const market = {};

  for (const symbol of required) {
    const candles = candlesBySymbol.get(symbol);
    const closes = candles.map(c => c.close);

    market[symbol] = {
      candles,
      ema200: ema(closes, 200)
    };
  }

  for (const date of dates) {
    const spyIdx = findCandleIndex(market.SPY.candles, date);
    const qqqIdx = findCandleIndex(market.QQQ.candles, date);
    const smhIdx = findCandleIndex(market.SMH.candles, date);

    if (
      spyIdx < 200 ||
      qqqIdx < 200 ||
      smhIdx < 200
    ) {
      continue;
    }

    const spyBull =
      market.SPY.candles[spyIdx].close >
      market.SPY.ema200[spyIdx];

    const qqqBull =
      market.QQQ.candles[qqqIdx].close >
      market.QQQ.ema200[qqqIdx];

    const smhBull =
      market.SMH.candles[smhIdx].close >
      market.SMH.ema200[smhIdx];

    let regime = "RANGE";

    if (spyBull && qqqBull && smhBull) {
      regime = "RISK_ON";
    }

    if (!spyBull && !qqqBull && !smhBull) {
      regime = "RISK_OFF";
    }

    regimeByDate.set(date, regime);
  }

  return regimeByDate;
}

function runVariant({
  candlesBySymbol,
  dates,
  regimeByDate,
  variant,
  regimeMode,
  allowedYears = null
}) {
  const trades = [];

  for (
    let di = variant.lookback;
    di < dates.length - variant.holdDays;
    di += variant.rebalanceEvery
  ) {
    const time = dates[di];
    const year = getYear(time);

    if (allowedYears && !allowedYears.includes(year)) {
      continue;
    }

    const regime = regimeByDate.get(time) || "RANGE";

    if (!regimeMode.allowed.includes(regime)) {
      continue;
    }

    const candidates = [];

    for (const [symbol, candles] of candlesBySymbol.entries()) {
      const idx = findCandleIndex(candles, time);

      if (
        idx < variant.lookback ||
        idx + variant.holdDays >= candles.length
      ) {
        continue;
      }

      const now = candles[idx].close;
      const past = candles[idx - variant.lookback].close;
      const mom = pct(now, past);

      if (mom === null || mom < variant.minMomentum) {
        continue;
      }

      const exit = candles[idx + variant.holdDays].close;
      const pnlPct = pct(exit, now);

      if (pnlPct === null) {
        continue;
      }

      candidates.push({
        symbol,
        momentum: mom,
        entry: now,
        exit,
        entryTime: candles[idx].time,
        exitTime: candles[idx + variant.holdDays].time,
        pnlPct
      });
    }

    candidates.sort((a, b) => b.momentum - a.momentum);

    for (const c of candidates.slice(0, variant.topN)) {
      const pnl = c.pnlPct / 5; // approx: 5% = 1R

      trades.push({
        symbol: c.symbol,
        variant: variant.name,
        regimeMode: regimeMode.name,
        regime,
        entryTime: c.entryTime,
        exitTime: c.exitTime,
        year,
        momentum: Number(c.momentum.toFixed(2)),
        pnl: Number(pnl.toFixed(2)),
        pnlPct: Number(c.pnlPct.toFixed(2))
      });
    }
  }

  return trades;
}

function runAll(allowedYears = null) {
  const candlesBySymbol = new Map();

  for (const symbol of SYMBOLS) {
    const candles = loadCandles(symbol);

    if (candles.length >= 220) {
      candlesBySymbol.set(symbol, candles);
    }
  }

  const dates = buildDateIndex(candlesBySymbol);
  const regimeByDate = buildMarketRegimes(candlesBySymbol, dates);

  const rows = [];
  const bySymbol = [];
  const byRegime = [];

  for (const regimeMode of REGIME_MODES) {
    for (const variant of VARIANTS) {
      const trades = runVariant({
        candlesBySymbol,
        dates,
        regimeByDate,
        variant,
        regimeMode,
        allowedYears
      });

      rows.push({
        regimeMode: regimeMode.name,
        variant: variant.name,
        ...summarize(trades)
      });

      for (const regime of ["RISK_ON", "RANGE", "RISK_OFF"]) {
        const regimeTrades = trades.filter(t => t.regime === regime);

        byRegime.push({
          regimeMode: regimeMode.name,
          variant: variant.name,
          regime,
          ...summarize(regimeTrades)
        });
      }

      const symbols = [...new Set(trades.map(t => t.symbol))];

      for (const symbol of symbols) {
        const st = trades.filter(t => t.symbol === symbol);

        bySymbol.push({
          regimeMode: regimeMode.name,
          variant: variant.name,
          symbol,
          ...summarize(st)
        });
      }
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
    byRegime,
    bySymbol
  };
}

function printRows(title, rows, limit = 30) {
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
  regimeModes: REGIME_MODES,
  overall,
  yearly
};

fs.writeFileSync(
  OUTPUT_JSON,
  JSON.stringify(output, null, 2)
);

console.log(`\nSymbols tested: ${overall.symbolsTested}`);

printRows(
  "ROTATION WITH REGIME FILTER | OVERALL",
  overall.rows,
  20
);

printRows(
  "ROTATION BY REGIME | OVERALL",
  overall.byRegime,
  30
);

printRows(
  "BEST SYMBOLS | RISK_ON_ONLY | min trades 10",
  overall.bySymbol
    .filter(r => r.regimeMode === "RISK_ON_ONLY")
    .filter(r => r.trades >= 10),
  50
);

for (const year of years) {
  printRows(
    `ROTATION WITH REGIME FILTER | ${year}`,
    yearly[year].rows,
    20
  );
}

console.log(`\nSaved: ${OUTPUT_JSON}`);
