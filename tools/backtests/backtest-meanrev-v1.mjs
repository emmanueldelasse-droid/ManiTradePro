import fs from "fs";

const DATA_DIR = "./data";

const SYMBOLS = [
  "SPY",
  "QQQ",
  "XLK",
  "GLD",
  "VGT",
  "IWM"
];

const VARIANTS = [
  {
    name: "mr_rsi30_ema5",
    rsiMax: 30,
    distEma: -5,
    rr: 1.2,
    stopAtr: 1
  },

  {
    name: "mr_rsi25_ema7",
    rsiMax: 25,
    distEma: -7,
    rr: 1.5,
    stopAtr: 1
  },

  {
    name: "mr_rsi35_ema4",
    rsiMax: 35,
    distEma: -4,
    rr: 1,
    stopAtr: 0.8
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

function rsi(values, period = 14) {
  const result = [];

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];

    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  let rs = avgGain / avgLoss;

  result.push(
    100 - 100 / (1 + rs)
  );

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];

    const gain =
      diff > 0 ? diff : 0;

    const loss =
      diff < 0 ? Math.abs(diff) : 0;

    avgGain =
      (avgGain * 13 + gain) / 14;

    avgLoss =
      (avgLoss * 13 + loss) / 14;

    rs = avgGain / avgLoss;

    result.push(
      100 - 100 / (1 + rs)
    );
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

function pct(a, b) {
  return (
    ((a - b) / b) * 100
  );
}

function runVariant(symbol, candles, variant) {
  const trades = [];

  const closes =
    candles.map(c => c.close);

  const ema20 =
    ema(closes, 20);

  const rsi14 =
    rsi(closes, 14);

  for (
    let i = 50;
    i < candles.length - 10;
    i++
  ) {
    const c = candles[i];

    const dist =
      pct(
        c.close,
        ema20[i]
      );

    const r =
      rsi14[i];

    const reversal =
      c.close > c.open &&
      c.close >
      candles[i - 1].close;

    const valid =
      r <= variant.rsiMax &&
      dist <= variant.distEma &&
      reversal;

    if (!valid) continue;

    const currentAtr =
      atr(
        candles.slice(
          i - 20,
          i
        )
      );

    const entry =
      c.close;

    const stop =
      entry -
      currentAtr *
      variant.stopAtr;

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
      const f =
        candles[j];

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

  const wins =
    trades.filter(x => x > 0);

  const losses =
    trades.filter(x => x < 0);

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
  const candles =
    loadCandles(symbol);

  for (const variant of VARIANTS) {
    const r =
      runVariant(
        symbol,
        candles,
        variant
      );

    console.table(r);

    results.push(r);
  }
}

console.log("\n=== ROBUST ===\n");

console.table(
  results
    .filter(r =>
      r.trades >= 10 &&
      r.expectancy > 0 &&
      r.profitFactor > 1.1
    )
    .sort(
      (a, b) =>
        b.expectancy - a.expectancy
    )
);