import fs from "fs";

const DATA_DIR = "./data";

const SYMBOLS = ["SPY", "QQQ", "SMH", "TLT"];

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ema(values, period) {
  const k = 2 / (period + 1);
  let prev = avg(values.slice(0, period));
  const result = [];

  for (let i = 0; i < period - 1; i++) result.push(null);
  result.push(prev);

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }

  return result;
}

function load(symbol) {
  const path = `${DATA_DIR}/${symbol}_2025.json`;
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const market = {};

for (const symbol of SYMBOLS) {
  const candles = load(symbol);
  const closes = candles.map(c => c.close);

  market[symbol] = {
    candles,
    ema200: ema(closes, 200)
  };
}

const spy = market.SPY.candles;
const results = [];

for (let i = 220; i < spy.length; i++) {
  const date = spy[i].time;

  const spyBull = market.SPY.candles[i].close > market.SPY.ema200[i];
  const qqqBull = market.QQQ.candles[i].close > market.QQQ.ema200[i];
  const smhBull = market.SMH.candles[i].close > market.SMH.ema200[i];

  let regime = "RANGE";

  if (spyBull && qqqBull && smhBull) {
    regime = "RISK_ON";
  }

  if (!spyBull && !qqqBull && !smhBull) {
    regime = "RISK_OFF";
  }

  results.push({
    date,
    regime,
    spy: market.SPY.candles[i].close,
    qqq: market.QQQ.candles[i].close,
    smh: market.SMH.candles[i].close
  });
}

console.table(results.slice(-20));

const counts = {
  RISK_ON: 0,
  RANGE: 0,
  RISK_OFF: 0
};

for (const r of results) {
  counts[r.regime]++;
}

console.log("\n=== REGIMES ===");
console.table(counts);