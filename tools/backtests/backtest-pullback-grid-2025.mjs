import fs from "fs";

// Backtest Pullback Momentum - ManiTradePro
// Version renforcée : métriques risque/rendement, symboles dédupliqués, classement plus lisible.

const SYMBOLS = [...new Set([
  "SPY", "QQQ", "TLT", "GLD",
  "BTC", "ETH", "SOL", "BNB", "AVAX", "LINK",
  "NVDA", "AAPL", "MSFT", "AMD", "META", "GOOGL", "AMZN", "TSLA",
  "JPM", "V", "MA", "NFLX", "COIN",
  "ASML", "AIR", "LVMH", "TTE", "SAP", "NESN", "RMS", "SIE",
  "EURUSD", "GBPUSD", "USDJPY",

  "XLK", "SMH", "SOXX", "IGV", "VGT", "IYW", "FTEC",
  "BOTZ", "CIBR", "HACK", "FDN", "SKYY", "PSI", "XSD",
  "IGM", "SOXQ", "XSW", "CLOU", "WCLD", "BUG",
  "SOXL", "USD", "ROM",
  "IWM", "MDY", "SPYG", "VUG",

  "AVGO", "TSM", "MU", "ARM", "KLAC", "LRCX", "AMAT", "ADI", "MCHP", "ON",
  "TXN", "NXPI", "MPWR", "ENTG", "TER", "SWKS", "QCOM", "MRVL", "INTC",
  "NVMI", "ASX", "AEHR", "ACLS", "CAMT", "ONTO", "RMBS", "SLAB", "SYNA", "WOLF",
  "QRVO", "LSCC", "ALGM", "AMKR", "FORM", "IPGP", "STM",

  "PANW", "CRWD", "DDOG", "MDB", "NET", "FTNT", "ZS", "OKTA", "CYBR", "S",
  "RBRK", "SENT", "TENB", "VRNS", "CHKP", "GEN",

  "CRM", "NOW", "PLTR", "SNOW", "SNPS", "CDNS", "ORCL", "HUBS", "TEAM", "SHOP", "ADBE",
  "ESTC", "PATH", "AI", "CFLT", "DOCN", "HCP", "INTU", "PAYC",
  "SOUN", "BBAI", "UPST", "ADSK", "PAYX", "TYL", "FICO",
  "AKAM", "DT", "GTLB", "PD", "SPLK", "ZEN",

  "ANET", "DELL", "SMCI", "UBER", "ABNB", "MELI", "SE", "PDD",
  "TTD", "APP", "DUOL", "WDAY", "LIN", "ROP", "PH",
  "MSTR", "IBIT", "CRWV", "APLD", "NBIS",
  "TTWO", "EA", "ROKU", "TT", "ETN", "HUBB",
  "AXP", "BKNG", "COST", "WM", "LLY", "VRTX", "ELV", "MSCI", "SPGI"
])];

const VARIANTS = [
  { name: "base_rsi42_58_chg20_0_stop0.1", rsiMin: 42, rsiMax: 58, chg20Min: 0, stopAtr: 0.1 },
  { name: "rsi45_55_chg20_0_stop0.1", rsiMin: 45, rsiMax: 55, chg20Min: 0, stopAtr: 0.1 },
  { name: "rsi42_58_chg20_3_stop0.1", rsiMin: 42, rsiMax: 58, chg20Min: 3, stopAtr: 0.1 },
  { name: "rsi42_58_chg20_5_stop0.1", rsiMin: 42, rsiMax: 58, chg20Min: 5, stopAtr: 0.1 },
  { name: "rsi42_58_chg20_0_stop0.5", rsiMin: 42, rsiMax: 58, chg20Min: 0, stopAtr: 0.5 },
  { name: "rsi42_58_chg20_3_stop0.5", rsiMin: 42, rsiMax: 58, chg20Min: 3, stopAtr: 0.5 },
  { name: "rsi42_58_chg20_5_stop0.5", rsiMin: 42, rsiMax: 58, chg20Min: 5, stopAtr: 0.5 },
  { name: "rsi42_58_chg20_0_stop1.0", rsiMin: 42, rsiMax: 58, chg20Min: 0, stopAtr: 1.0 },
  { name: "rsi42_58_chg20_3_stop1.0", rsiMin: 42, rsiMax: 58, chg20Min: 3, stopAtr: 1.0 },
  { name: "rsi42_58_chg20_5_stop1.0", rsiMin: 42, rsiMax: 58, chg20Min: 5, stopAtr: 1.0 }
];

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ema(values, period) {
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

function averageRange(candles, period = 14) {
  if (candles.length < period + 1) return null;
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

  return avg(trs.slice(-period));
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

  if (!valid) return null;

  const entry = ema20;
  const stop = swingLow10 - atr * variant.stopAtr;
  const tp = swingHigh20;
  const rr = (tp - entry) / (entry - stop);

  if (!Number.isFinite(rr) || rr < 1.6) return null;

  return { entry, stop, tp, rr };
}

function simulateTrade(futureCandles, trade) {
  for (let i = 0; i < Math.min(10, futureCandles.length); i++) {
    const candle = futureCandles[i];

    const stopHit = candle.low <= trade.stop;
    const tpHit = candle.high >= trade.tp;

    // Conservative rule: if stop and TP are both touched in same daily candle, count loss.
    if (stopHit && tpHit) return { result: "LOSS", pnl: -1 };
    if (stopHit) return { result: "LOSS", pnl: -1 };
    if (tpHit) return { result: "WIN", pnl: trade.rr };
  }

  return { result: "TIMEOUT", pnl: 0 };
}

function loadCandles(symbol) {
  const path = `./data/${symbol}_2025.json`;
  if (!fs.existsSync(path)) {
    console.warn(`Missing data file, skipped: ${path}`);
    return null;
  }

  const candles = JSON.parse(fs.readFileSync(path, "utf-8"));
  return candles
    .map(c => ({
      date: c.date,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume ?? 0)
    }))
    .filter(c =>
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close) &&
      c.high >= c.low
    );
}

function summarizeTrades(tradeResults) {
  const trades = tradeResults.length;
  const winsArr = tradeResults.filter(r => r.pnl > 0);
  const lossesArr = tradeResults.filter(r => r.pnl < 0);
  const timeoutsArr = tradeResults.filter(r => r.pnl === 0);

  const wins = winsArr.length;
  const losses = lossesArr.length;
  const timeouts = timeoutsArr.length;

  const grossWin = winsArr.reduce((sum, r) => sum + r.pnl, 0);
  const grossLoss = Math.abs(lossesArr.reduce((sum, r) => sum + r.pnl, 0));
  const totalPnl = tradeResults.reduce((sum, r) => sum + r.pnl, 0);

  const avgWin = wins ? grossWin / wins : 0;
  const avgLoss = losses ? lossesArr.reduce((sum, r) => sum + r.pnl, 0) / losses : 0;
  const largestWin = wins ? Math.max(...winsArr.map(r => r.pnl)) : 0;
  const largestLoss = losses ? Math.min(...lossesArr.map(r => r.pnl)) : 0;

  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let longestLossStreak = 0;
  let currentLossStreak = 0;

  for (const r of tradeResults) {
    equity += r.pnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);

    if (r.pnl < 0) {
      currentLossStreak++;
      longestLossStreak = Math.max(longestLossStreak, currentLossStreak);
    } else {
      currentLossStreak = 0;
    }
  }

  return {
    trades,
    wins,
    losses,
    timeouts,
    winrate: trades ? round((wins / trades) * 100) : 0,
    expectancy: trades ? round(totalPnl / trades) : 0,
    totalPnl: round(totalPnl),
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? 999 : 0) : round(grossWin / grossLoss),
    avgWin: round(avgWin),
    avgLoss: round(avgLoss),
    largestWin: round(largestWin),
    largestLoss: round(largestLoss),
    maxDrawdown: round(maxDrawdown),
    longestLossStreak
  };
}

function runVariant(variant) {
  const bySymbol = [];
  const allTradeResults = [];
  const skippedSymbols = [];

  for (const symbol of SYMBOLS) {
    const candles = loadCandles(symbol);
    if (!candles || candles.length < 75) {
      skippedSymbols.push(symbol);
      continue;
    }

    const symbolTradeResults = [];

    for (let i = 60; i < candles.length - 11; i++) {
      const slice = candles.slice(0, i + 1);
      const setup = detectPullback(slice, variant);
      if (!setup) continue;

      const result = simulateTrade(candles.slice(i + 1, i + 11), setup);
      const tradeResult = {
        symbol,
        date: candles[i]?.date ?? null,
        result: result.result,
        pnl: result.pnl,
        rr: setup.rr
      };

      symbolTradeResults.push(tradeResult);
      allTradeResults.push(tradeResult);
    }

    bySymbol.push({
      symbol,
      ...summarizeTrades(symbolTradeResults)
    });
  }

  return {
    variant: variant.name,
    ...summarizeTrades(allTradeResults),
    bySymbol: bySymbol.sort((a, b) => {
      if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
      return b.trades - a.trades;
    }),
    skippedSymbols
  };
}

const results = VARIANTS.map(runVariant)
  .sort((a, b) => {
    if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
    if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
    return b.trades - a.trades;
  });

fs.mkdirSync("./tools/backtests", { recursive: true });
fs.writeFileSync(
  "./tools/backtests/results-pullback-grid-2025.json",
  JSON.stringify(results, null, 2)
);

console.log(`\nSymbols tested: ${SYMBOLS.length}`);

console.log("\n=== TOP VARIANTS ===");
console.table(results.map(r => ({
  variant: r.variant,
  trades: r.trades,
  wins: r.wins,
  losses: r.losses,
  timeouts: r.timeouts,
  winrate: r.winrate,
  expectancy: r.expectancy,
  profitFactor: r.profitFactor,
  maxDrawdown: r.maxDrawdown,
  longestLossStreak: r.longestLossStreak
})));

console.log("\n=== BEST SYMBOLS BY BEST VARIANT ===");
const bestBySymbol = new Map();
for (const variantResult of results) {
  for (const symbolResult of variantResult.bySymbol) {
    const current = bestBySymbol.get(symbolResult.symbol);
    const candidate = {
      symbol: symbolResult.symbol,
      variant: variantResult.variant,
      ...symbolResult
    };

    if (
      !current ||
      candidate.expectancy > current.expectancy ||
      (candidate.expectancy === current.expectancy && candidate.trades > current.trades)
    ) {
      bestBySymbol.set(symbolResult.symbol, candidate);
    }
  }
}

const rankedSymbols = [...bestBySymbol.values()]
  .filter(r => r.trades > 0)
  .sort((a, b) => {
    if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
    if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
    return b.trades - a.trades;
  });

console.table(rankedSymbols.slice(0, 50).map(r => ({
  symbol: r.symbol,
  variant: r.variant,
  trades: r.trades,
  winrate: r.winrate,
  expectancy: r.expectancy,
  profitFactor: r.profitFactor,
  maxDrawdown: r.maxDrawdown,
  longestLossStreak: r.longestLossStreak
})));

console.log("\n=== ROBUST SYMBOLS ONLY: trades >= 20, expectancy > 0, profitFactor > 1.2 ===");
console.table(rankedSymbols
  .filter(r => r.trades >= 20 && r.expectancy > 0 && r.profitFactor > 1.2)
  .slice(0, 60)
  .map(r => ({
    symbol: r.symbol,
    variant: r.variant,
    trades: r.trades,
    winrate: r.winrate,
    expectancy: r.expectancy,
    profitFactor: r.profitFactor,
    maxDrawdown: r.maxDrawdown,
    longestLossStreak: r.longestLossStreak
  }))
);

console.log("\n=== WORST SYMBOLS BY BEST VARIANT ===");
console.table(rankedSymbols
  .slice(-30)
  .reverse()
  .map(r => ({
    symbol: r.symbol,
    variant: r.variant,
    trades: r.trades,
    winrate: r.winrate,
    expectancy: r.expectancy,
    profitFactor: r.profitFactor,
    maxDrawdown: r.maxDrawdown,
    longestLossStreak: r.longestLossStreak
  }))
);

console.log("\n=== BEST VARIANT BY SYMBOL ===");
for (const symbol of SYMBOLS) {
  const rows = results
    .map(r => ({
      variant: r.variant,
      ...r.bySymbol.find(s => s.symbol === symbol)
    }))
    .filter(r => Number.isFinite(r.expectancy))
    .sort((a, b) => {
      if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
      if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
      return b.trades - a.trades;
    });

  if (!rows.length) continue;

  console.log(`\n${symbol}`);
  console.table(rows.slice(0, 5).map(r => ({
    variant: r.variant,
    trades: r.trades,
    winrate: r.winrate,
    expectancy: r.expectancy,
    profitFactor: r.profitFactor,
    maxDrawdown: r.maxDrawdown,
    longestLossStreak: r.longestLossStreak
  })));
}

const skipped = [...new Set(results.flatMap(r => r.skippedSymbols ?? []))];
if (skipped.length) {
  console.log("\nSkipped symbols due to missing/insufficient data:");
  console.log(skipped.join(", "));
}

console.log("\nSaved: tools/backtests/results-pullback-grid-2025.json");
