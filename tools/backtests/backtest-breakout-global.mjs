import fs from "fs";

const DATA_DIR = "./data";

import { UNIVERSE } from "./universe-v2.mjs";

const SYMBOLS = Object.values(
  UNIVERSE
).flat();

const VARIANTS = [
  {
    name: "breakout_h20_vol13",
    breakout: 20,
    volumeMult: 1.3,
    stopAtr: 1,
    rr: 2
  },

  {
    name: "breakout_h10_vol12",
    breakout: 10,
    volumeMult: 1.2,
    stopAtr: 1,
    rr: 2.5
  }
];

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ema(values, period) {
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

function atr(candles, period = 14) {
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

function loadCandles(symbol) {
  const path = `${DATA_DIR}/${symbol}_2025.json`;

  if (!fs.existsSync(path)) {
    return [];
  }

  return JSON.parse(
    fs.readFileSync(path, "utf8")
  );
}

function testVariant(symbol, candles, variant) {
  const trades = [];

  const closes = candles.map(c => c.close);

  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);

  for (let i = 220; i < candles.length - 10; i++) {
    const c = candles[i];

    const prev = candles.slice(
      i - variant.breakout,
      i
    );

    const hh = Math.max(
      ...prev.map(x => x.high)
    );

    const volMA = avg(
      prev.map(x => x.volume || 0)
    );

    const currentAtr = atr(
      candles.slice(i - 20, i)
    );

    const trendOk =
      ema20[i] > ema50[i] &&
      ema50[i] > ema200[i];

    const breakoutOk =
      c.close > hh;

    const volumeOk =
      (c.volume || 0) >
      volMA * variant.volumeMult;

    let compressionOk = true;

    if (variant.compression) {
      const atrRecent = atr(
        candles.slice(i - 20, i)
      );

      const atrOld = atr(
        candles.slice(i - 60, i - 20)
      );

      compressionOk =
        atrRecent < atrOld * 0.75;
    }

    if (
      trendOk &&
      breakoutOk &&
      volumeOk &&
      compressionOk
    ) {
      const entry = c.close;

      const stop =
        entry -
        currentAtr * variant.stopAtr;

      const risk =
        entry - stop;

      const tp =
        entry +
        risk * variant.rr;

      let result = 0;

      for (
        let j = i + 1;
        j < i + 10;
        j++
      ) {
        const f = candles[j];

        if (f.low <= stop) {
          result = -1;
          break;
        }

        if (f.high >= tp) {
          result = variant.rr;
          break;
        }
      }

      trades.push(result);
    }
  }

  const wins = trades.filter(x => x > 0);
  const losses = trades.filter(x => x < 0);

  const grossWin =
    wins.reduce((a, b) => a + b, 0);

  const grossLoss =
    Math.abs(
      losses.reduce((a, b) => a + b, 0)
    );

  return {
    symbol,
    variant: variant.name,
    trades: trades.length,
    winrate:
      trades.length
        ? (
            wins.length /
            trades.length *
            100
          ).toFixed(2)
        : 0,

    expectancy:
      trades.length
        ? (
            trades.reduce((a, b) => a + b, 0) /
            trades.length
          ).toFixed(2)
        : 0,

    profitFactor:
      grossLoss > 0
        ? (
            grossWin / grossLoss
          ).toFixed(2)
        : 0
  };
}

const results = [];

for (const symbol of SYMBOLS) {
  const candles = loadCandles(symbol);

  for (const variant of VARIANTS) {
    const r = testVariant(
      symbol,
      candles,
      variant
    );

    console.table(r);

    results.push(r);
  }
}

const robust = results
  .filter(r =>
    r.trades >= 10 &&
    r.expectancy > 0 &&
    r.profitFactor > 1.2
  )
  .sort(
    (a, b) =>
      b.expectancy - a.expectancy
  );

console.log("\n=== ROBUST ===\n");

console.table(robust);