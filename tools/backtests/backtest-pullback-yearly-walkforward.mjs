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
      // EODHD data exported by our downloader uses `time` (ex: "2021-01-04").
      // Keep fallbacks for compatibility with other providers.
      date: c.time ?? c.date ?? c.datetime ?? c.timestamp ?? null,
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

// === Régime macro (référence : SPY/QQQ/SMH EMA200) ===========================
// Même logique que `backtest-relative-strength-rotation-regime-v1.mjs`.
// RISK_ON  = SPY, QQQ, SMH tous au-dessus de leur EMA200
// RISK_OFF = SPY, QQQ, SMH tous en-dessous de leur EMA200
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
    for (let i = 0; i < candles.length; i++) indexByDate.set(candles[i].date, i);
    market[symbol] = { candles, ema200: ema(closes, 200), indexByDate };
  }

  // Toutes les dates où les 3 indices sont présents
  const allDates = new Set();
  for (const m of Object.values(market)) {
    for (const c of m.candles) allDates.add(c.date);
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


function yearOfTradeDate(dateValue) {
  if (!dateValue) return null;

  // Works with strings like "2021-01-04", ISO timestamps, and numeric timestamps.
  if (typeof dateValue === "number") {
    const d = new Date(dateValue);
    const y = d.getFullYear();
    return Number.isFinite(y) ? y : null;
  }

  const raw = String(dateValue);
  const year = raw.slice(0, 4);

  if (/^\d{4}$/.test(year)) return Number(year);

  const parsed = new Date(raw);
  const parsedYear = parsed.getFullYear();
  return Number.isFinite(parsedYear) ? parsedYear : null;
}

function inYearSet(dateValue, years) {
  const y = yearOfTradeDate(dateValue);
  return y !== null && years.includes(y);
}

function generateTradesForSymbol(symbol, variant) {
  const candles = loadCandles(symbol);
  if (!candles || candles.length < 75) return [];

  const trades = [];

  for (let i = 60; i < candles.length - 11; i++) {
    const slice = candles.slice(0, i + 1);
    const setup = detectPullback(slice, variant);
    if (!setup) continue;

    const result = simulateTrade(candles.slice(i + 1, i + 11), setup);
    const entryDate = candles[i]?.date ?? null;
    trades.push({
      symbol,
      date: entryDate,
      year: yearOfTradeDate(entryDate),
      variant: variant.name,
      // regime macro à la date d'entrée — additif, n'influence pas l'ouverture
      regime: regimeForDate(entryDate),
      result: result.result,
      pnl: result.pnl,
      rr: round(setup.rr)
    });
  }

  return trades;
}

const TRADE_CACHE = new Map();
function getTrades(symbol, variant) {
  const key = `${symbol}__${variant.name}`;
  if (!TRADE_CACHE.has(key)) {
    TRADE_CACHE.set(key, generateTradesForSymbol(symbol, variant));
  }
  return TRADE_CACHE.get(key);
}

function summarizeVariantForYears(variant, years, symbolFilter = SYMBOLS) {
  const bySymbol = [];
  const allTrades = [];
  const skippedSymbols = [];

  for (const symbol of symbolFilter) {
    const trades = getTrades(symbol, variant).filter(t => inYearSet(t.date, years));

    if (!trades.length && !loadCandles(symbol)) {
      skippedSymbols.push(symbol);
    }

    bySymbol.push({
      symbol,
      ...summarizeTrades(trades)
    });

    allTrades.push(...trades);
  }

  // === bySymbolByRegime (additif, mai 2026) ============================
  // Décomposition per-(symbol, regime) pour cette variante et cette plage
  // d'années. Le mode `ALL_REGIMES` capte tous les trades (la stratégie
  // Pullback ne filtre pas par régime à l'entrée). Le mode `NO_RISK_OFF`
  // est dérivé en retirant les trades dont le régime à l'entrée est
  // RISK_OFF, ce qui répond à la question "qu'est-ce que cette variante
  // rapporte si on l'utilise hors marchés bear ?".
  // Les cellules avec 0 trade sont OMISES (choix de design pour ne pas
  // polluer le JSON, cohérent avec backtest-relative-strength-rotation-regime-v1).
  const bySymbolByRegime = [];
  const symbolsWithTrades = [...new Set(allTrades.map(t => t.symbol))];
  const modes = [
    { name: "ALL_REGIMES", keep: () => true },
    { name: "NO_RISK_OFF", keep: t => t.regime !== "RISK_OFF" }
  ];
  for (const symbol of symbolsWithTrades) {
    const symTrades = allTrades.filter(t => t.symbol === symbol);
    for (const mode of modes) {
      const modeTrades = symTrades.filter(mode.keep);
      for (const regime of ["RISK_ON", "RANGE", "RISK_OFF"]) {
        const cellTrades = modeTrades.filter(t => t.regime === regime);
        if (cellTrades.length === 0) continue;
        bySymbolByRegime.push({
          symbol,
          variant: variant.name,
          regimeMode: mode.name,
          regime,
          ...summarizeTrades(cellTrades)
        });
      }
    }
  }
  bySymbolByRegime.sort((a, b) => {
    if (a.symbol !== b.symbol) return a.symbol.localeCompare(b.symbol);
    if (a.regimeMode !== b.regimeMode) return a.regimeMode.localeCompare(b.regimeMode);
    return a.regime.localeCompare(b.regime);
  });

  return {
    variant: variant.name,
    years,
    ...summarizeTrades(allTrades),
    bySymbol: bySymbol.sort((a, b) => {
      if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
      if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
      return b.trades - a.trades;
    }),
    bySymbolByRegime,
    skippedSymbols
  };
}

function rankVariantsForYears(years, symbolFilter = SYMBOLS) {
  return VARIANTS.map(v => summarizeVariantForYears(v, years, symbolFilter))
    .sort((a, b) => {
      if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
      if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
      return b.trades - a.trades;
    });
}

function bestPairsForYears(years, options = {}) {
  const minTrades = options.minTrades ?? 20;
  const minExpectancy = options.minExpectancy ?? 0;
  const minProfitFactor = options.minProfitFactor ?? 1.2;

  const pairs = [];

  for (const symbol of SYMBOLS) {
    const candidates = [];

    for (const variant of VARIANTS) {
      const trades = getTrades(symbol, variant).filter(t => inYearSet(t.date, years));
      const summary = summarizeTrades(trades);
      candidates.push({
        symbol,
        variant: variant.name,
        ...summary
      });
    }

    const best = candidates.sort((a, b) => {
      if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
      if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
      return b.trades - a.trades;
    })[0];

    if (
      best &&
      best.trades >= minTrades &&
      best.expectancy > minExpectancy &&
      best.profitFactor > minProfitFactor
    ) {
      pairs.push(best);
    }
  }

  return pairs.sort((a, b) => {
    if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
    if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
    return b.trades - a.trades;
  });
}

function evaluatePairsOnYears(pairs, years) {
  const allTrades = [];
  const rows = [];

  for (const pair of pairs) {
    const variant = VARIANTS.find(v => v.name === pair.variant);
    if (!variant) continue;

    const trades = getTrades(pair.symbol, variant).filter(t => inYearSet(t.date, years));
    const summary = summarizeTrades(trades);

    rows.push({
      symbol: pair.symbol,
      variant: pair.variant,
      ...summary
    });
    allTrades.push(...trades);
  }

  return {
    years,
    pairs: pairs.length,
    ...summarizeTrades(allTrades),
    byPair: rows.sort((a, b) => {
      if (b.expectancy !== a.expectancy) return b.expectancy - a.expectancy;
      if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
      return b.trades - a.trades;
    })
  };
}

function compactSummary(r) {
  return {
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
  };
}

function compactPair(r) {
  return {
    symbol: r.symbol,
    variant: r.variant,
    trades: r.trades,
    winrate: r.winrate,
    expectancy: r.expectancy,
    profitFactor: r.profitFactor,
    maxDrawdown: r.maxDrawdown,
    longestLossStreak: r.longestLossStreak
  };
}

const YEARS_TO_TEST = [2022, 2023, 2024, 2025];
const FULL_YEARS = [2021, 2022, 2023, 2024, 2025];

fs.mkdirSync("./tools/backtests", { recursive: true });

const yearly = {};
for (const year of YEARS_TO_TEST) {
  yearly[year] = rankVariantsForYears([year]);
}

const overall = rankVariantsForYears(FULL_YEARS);

const walkForwardSplits = [
  { trainYears: [2021], testYears: [2022] },
  { trainYears: [2021, 2022], testYears: [2023] },
  { trainYears: [2021, 2022, 2023], testYears: [2024] },
  { trainYears: [2021, 2022, 2023, 2024], testYears: [2025] }
];

const walkForward = walkForwardSplits.map(split => {
  const selectedPairs = bestPairsForYears(split.trainYears, {
    minTrades: 15,
    minExpectancy: 0,
    minProfitFactor: 1.2
  });

  const test = evaluatePairsOnYears(selectedPairs, split.testYears);

  return {
    trainYears: split.trainYears,
    testYears: split.testYears,
    selectedPairs: selectedPairs.length,
    trainTopPairs: selectedPairs.slice(0, 25),
    test
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  symbolsTested: SYMBOLS.length,
  variants: VARIANTS.map(v => v.name),
  overall,
  yearly,
  walkForward
};

fs.writeFileSync(
  "./tools/backtests/results-pullback-yearly-walkforward.json",
  JSON.stringify(report, null, 2)
);

console.log(`\nSymbols tested: ${SYMBOLS.length}`);

console.log("\n=== OVERALL TOP VARIANTS 2021-2025 ===");
console.table(overall.map(compactSummary));

for (const year of YEARS_TO_TEST) {
  console.log(`\n=== TOP VARIANTS ${year} ONLY ===`);
  console.table(yearly[year].map(compactSummary));

  const robust = bestPairsForYears([year], {
    minTrades: 5,
    minExpectancy: 0,
    minProfitFactor: 1.2
  });

  console.log(`\n=== ROBUST SYMBOLS ${year} ONLY ===`);
  console.table(robust.slice(0, 40).map(compactPair));
}

console.log("\n=== WALK-FORWARD TESTS ===");
console.table(walkForward.map(w => ({
  trainYears: w.trainYears.join("-"),
  testYears: w.testYears.join("-"),
  selectedPairs: w.selectedPairs,
  trades: w.test.trades,
  winrate: w.test.winrate,
  expectancy: w.test.expectancy,
  profitFactor: w.test.profitFactor,
  maxDrawdown: w.test.maxDrawdown,
  longestLossStreak: w.test.longestLossStreak
})));

for (const w of walkForward) {
  console.log(`\n=== WALK-FORWARD DETAILS | train ${w.trainYears.join("-")} → test ${w.testYears.join("-")} ===`);
  console.log("Selected train pairs, top 20:");
  console.table(w.trainTopPairs.slice(0, 20).map(compactPair));
  console.log("Test result by pair, top 20:");
  console.table(w.test.byPair.slice(0, 20).map(compactPair));
  console.log("Test result by pair, worst 20:");
  console.table(w.test.byPair.slice(-20).reverse().map(compactPair));
}

console.log("\nSaved: tools/backtests/results-pullback-yearly-walkforward.json");
