import fs from "fs";

// ============================================================
// CONFIG
// ============================================================

const SYMBOLS = [
  "SPY",
  "QQQ",
  "NVDA",
  "AAPL",
  "MSFT",
  "META",
  "AMZN",
  "GOOGL"
];

const YEAR = 2025;

const RESULTS = [];

// ============================================================
// HELPERS
// ============================================================

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ema(values, period) {
  const k = 2 / (period + 1);
  const result = [];

  let prev = avg(values.slice(0, period));
  result[period - 1] = prev;

  for (let i = period; i < values.length; i++) {
    const next = values[i] * k + prev * (1 - k);
    result.push(next);
    prev = next;
  }

  return result;
}

function rsi(values, period = 14) {
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];

    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let rs = gains / losses;
  const result = [100 - 100 / (1 + rs)];

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];

    if (diff >= 0) {
      gains = (gains * (period - 1) + diff) / period;
      losses = (losses * (period - 1)) / period;
    } else {
      gains = (gains * (period - 1)) / period;
      losses = (losses * (period - 1) + Math.abs(diff)) / period;
    }

    rs = gains / losses;
    result.push(100 - 100 / (1 + rs));
  }

  return result;
}

function pctChange(a, b) {
  return ((a - b) / b) * 100;
}

function averageRange(candles, period = 14) {
  if (candles.length < period + 1) return null;

  const trs = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    trs.push(
      Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      )
    );
  }

  return avg(trs.slice(-period));
}

// ============================================================
// SETUP DETECTION
// ============================================================

function detectPullback(candles) {
  const closes = candles.map(c => c.close);

  if (closes.length < 60) return null;

  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const rsiSeries = rsi(closes, 14);

  const last = closes[closes.length - 1];

  const ema20 = ema20Series[ema20Series.length - 1];
  const ema50 = ema50Series[ema50Series.length - 1];
  const rsi14 = rsiSeries[rsiSeries.length - 1];

  const distEma20 = pctChange(last, ema20);

  const chg5 = pctChange(
    last,
    closes[closes.length - 6]
  );

  const chg20 = pctChange(
    last,
    closes[closes.length - 21]
  );

  const recent20 = candles.slice(-20);
  const recent10 = candles.slice(-10);

  const swingHigh20 = Math.max(...recent20.map(c => c.high));
  const swingLow10 = Math.min(...recent10.map(c => c.low));

  const atr = averageRange(candles, 14);

  const valid =
    ema20 > ema50 &&
    distEma20 >= -1 &&
    distEma20 <= 2 &&
    rsi14 >= 45 &&
    rsi14 <= 55 &&
    chg5 < 0 &&
    chg20 > 0;

  if (!valid) return null;

  const entry = ema20;
  const stop = swingLow10 - atr * 0.1;
  const tp = swingHigh20;

  const rr = (tp - entry) / (entry - stop);

  if (rr < 1.6) return null;

  return {
    entry,
    stop,
    tp,
    rr
  };
}

// ============================================================
// TRADE SIMULATION
// ============================================================

function simulateTrade(futureCandles, trade) {
  const maxBars = 10;

  for (let i = 0; i < Math.min(maxBars, futureCandles.length); i++) {
    const candle = futureCandles[i];

    const stopHit = candle.low <= trade.stop;
    const tpHit = candle.high >= trade.tp;

    // règle prudente : stop d'abord
    if (stopHit && tpHit) {
      return {
        result: "LOSS",
        pnl: -1
      };
    }

    if (stopHit) {
      return {
        result: "LOSS",
        pnl: -1
      };
    }

    if (tpHit) {
      return {
        result: "WIN",
        pnl: trade.rr
      };
    }
  }

  return {
    result: "TIMEOUT",
    pnl: 0
  };
}

// ============================================================
// LOAD DATA
// ============================================================

async function loadCandles(symbol) {
  const path = `./data/${symbol}_2025.json`;

  if (!fs.existsSync(path)) {
    throw new Error(`Missing data file: ${path}`);
  }

  return JSON.parse(fs.readFileSync(path, "utf-8"));
}

// ============================================================
// MAIN
// ============================================================

async function run() {
  for (const symbol of SYMBOLS) {
    console.log(`\n=== ${symbol} ===`);

    const candles = await loadCandles(symbol);

    let wins = 0;
    let losses = 0;
    let timeouts = 0;
    let totalPnl = 0;
    let trades = 0;

    for (let i = 60; i < candles.length - 11; i++) {
      const slice = candles.slice(0, i + 1);

      const setup = detectPullback(slice);

      if (!setup) continue;

      trades++;

      const futureCandles = candles.slice(i + 1, i + 11);

      const result = simulateTrade(
        futureCandles,
        setup
      );

      totalPnl += result.pnl;

      if (result.result === "WIN") wins++;
      else if (result.result === "LOSS") losses++;
      else timeouts++;
    }

    const winrate =
      trades > 0
        ? ((wins / trades) * 100).toFixed(2)
        : 0;

    const expectancy =
      trades > 0
        ? (totalPnl / trades).toFixed(2)
        : 0;

    const summary = {
      symbol,
      trades,
      wins,
      losses,
      timeouts,
      winrate,
      expectancy
    };

    RESULTS.push(summary);

    console.table(summary);
  }

  fs.writeFileSync(
    "./tools/backtests/results-pullback-2025.json",
    JSON.stringify(RESULTS, null, 2)
  );

  console.log("\nSaved results.");
}

run();