// Tests du moteur V2 (pur). Lancer : node --test tools/v2/test/engine-v2.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  V2_UNIVERSE, V2_SYMBOLS, V2_DEFAULT_SETTINGS,
  ema, sma, rsi, atr, computeIndicators,
  detectPullback, detectBreakout, detectMeanReversion, detectGldBreakout,
  detectSetups, bestSetup, validatePlan, computePositionSize,
  resolvePosition, computePnl, computeStats, riskPerTrade,
} from "../lib/engine-v2.mjs";

// ---------- Helpers de génération de bougies ----------

function candle(close, { high, low, open, volume } = {}) {
  const c = Number(close);
  return {
    time: new Date().toISOString(),
    open: open ?? c,
    high: high ?? c * 1.005,
    low: low ?? c * 0.995,
    close: c,
    volume: volume ?? 1000,
  };
}

// Série de N bougies suivant une fonction prix(i).
function series(n, priceFn, volFn = () => 1000) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = priceFn(i);
    out.push(candle(c, { volume: volFn(i) }));
  }
  return out;
}

// ---------- Univers ----------

test("univers = 47 actifs, symboles uniques", () => {
  assert.equal(V2_UNIVERSE.length, 47);
  assert.equal(new Set(V2_SYMBOLS).size, 47);
});

test("toutes les classes d'actifs sont représentées", () => {
  const classes = new Set(V2_UNIVERSE.map((a) => a.class));
  for (const k of ["crypto", "us_stock", "eu_stock", "etf", "commodity", "forex"]) {
    assert.ok(classes.has(k), `classe manquante: ${k}`);
  }
});

// ---------- Indicateurs ----------

test("ema renvoie null si pas assez de données", () => {
  assert.equal(ema([1, 2, 3], 20), null);
});

test("ema d'une série constante = la constante", () => {
  const v = new Array(50).fill(10);
  assert.equal(Math.round(ema(v, 20)), 10);
});

test("sma calcule la moyenne simple des derniers points", () => {
  assert.equal(sma([2, 4, 6, 8], 2), 7);
});

test("rsi = 100 si tout monte", () => {
  const closes = [];
  for (let i = 0; i < 30; i++) closes.push(10 + i);
  assert.equal(rsi(closes, 14), 100);
});

test("rsi bas quand tout descend", () => {
  const closes = [];
  for (let i = 0; i < 30; i++) closes.push(100 - i);
  assert.ok(rsi(closes, 14) < 5);
});

test("atr positif sur série volatile", () => {
  const c = series(30, (i) => 100 + (i % 2 ? 2 : -2));
  assert.ok(atr(c, 14) > 0);
});

// ---------- computeIndicators ----------

test("computeIndicators exige >= 60 bougies", () => {
  assert.equal(computeIndicators(series(40, () => 100)), null);
});

test("computeIndicators renvoie les champs attendus", () => {
  const ind = computeIndicators(series(80, (i) => 100 + i * 0.1));
  assert.ok(ind);
  for (const k of ["close", "ema20", "ema50", "rsi14", "atr14", "avgVol20"]) {
    assert.ok(k in ind, `champ manquant ${k}`);
  }
});

// ---------- Pullback ----------

test("pullback détecté en tendance haussière avec repli sur EMA20", () => {
  // tendance haussière régulière puis un repli sur la dernière bougie qui
  // touche l'EMA20 et referme au-dessus.
  const c = series(80, (i) => 100 + i * 0.8);
  const ind0 = computeIndicators(c);
  // fabrique une dernière bougie qui plonge vers l'EMA20 puis referme dessus
  const last = c[c.length - 1];
  last.low = ind0.ema20 * 0.999;
  last.close = ind0.ema20 * 1.004;
  last.open = last.close;
  const ind = computeIndicators(c);
  const r = detectPullback(ind, "AAPL");
  assert.ok(r, "pullback devrait être détecté");
  assert.equal(r.setupType, "pullback");
  assert.equal(r.direction, "long");
  assert.ok(r.stopLoss < r.entry && r.takeProfit > r.entry);
});

test("pas de pullback en tendance baissière", () => {
  const c = series(80, (i) => 200 - i * 0.8);
  const r = detectPullback(computeIndicators(c), "AAPL");
  assert.equal(r, null);
});

// ---------- Breakout ----------

test("breakout détecté à la cassure avec volume", () => {
  // base plate puis cassure nette sur la dernière bougie avec gros volume
  const c = series(79, (i) => 100 + Math.sin(i / 3) * 1.5, () => 1000);
  c.push(candle(104, { high: 104.5, low: 101.5, volume: 5000 }));
  const r = detectBreakout(computeIndicators(c), "MSFT");
  assert.ok(r, "breakout devrait être détecté");
  assert.equal(r.setupType, "breakout");
  assert.ok(r.takeProfit > r.entry && r.stopLoss < r.entry);
});

test("pas de breakout sans volume suffisant", () => {
  const c = series(79, (i) => 100 + Math.sin(i / 3) * 1.5, () => 1000);
  c.push(candle(104, { high: 104.5, low: 101.5, volume: 800 })); // volume faible
  const r = detectBreakout(computeIndicators(c), "MSFT");
  assert.equal(r, null);
});

// ---------- Mean Reversion ----------

test("mean reversion long en survente extrême", () => {
  // chute marquée pour pousser le RSI sous 28 et étirer sous l'EMA20
  const c = series(60, () => 100);
  for (let i = 0; i < 20; i++) c.push(candle(100 - (i + 1) * 2.5));
  const ind = computeIndicators(c);
  const r = detectMeanReversion(ind, "BTC");
  assert.ok(r, "mean reversion long attendu");
  assert.equal(r.direction, "long");
  assert.equal(r.takeProfit, Math.round(ind.ema20 * 1e6) / 1e6);
});

test("mean reversion short en surachat extrême", () => {
  const c = series(60, () => 100);
  for (let i = 0; i < 20; i++) c.push(candle(100 + (i + 1) * 2.5));
  const ind = computeIndicators(c);
  const r = detectMeanReversion(ind, "BTC");
  assert.ok(r, "mean reversion short attendu");
  assert.equal(r.direction, "short");
  assert.ok(r.stopLoss > r.entry && r.takeProfit < r.entry);
});

// ---------- GLD Breakout ----------

test("gld breakout seulement pour GLD", () => {
  const c = series(79, (i) => 100 + Math.sin(i / 3), () => 1000);
  c.push(candle(103, { high: 103.5, low: 101, volume: 1500 }));
  assert.equal(detectGldBreakout(computeIndicators(c), "SLV"), null);
  const r = detectGldBreakout(computeIndicators(c), "GLD");
  assert.ok(r);
  assert.equal(r.setupType, "gld_breakout");
});

// ---------- detectSetups / bestSetup ----------

test("bestSetup renvoie le rr le plus élevé", () => {
  const c = series(79, (i) => 100 + Math.sin(i / 3) * 1.5, () => 1000);
  c.push(candle(104, { high: 104.5, low: 101.5, volume: 5000 }));
  const ind = computeIndicators(c);
  const all = detectSetups(ind, "MSFT");
  if (all.length > 1) {
    const best = bestSetup(ind, "MSFT");
    for (const s of all) assert.ok(best.rr >= s.rr);
  } else {
    assert.ok(bestSetup(ind, "MSFT"));
  }
});

// ---------- Validation ----------

test("validatePlan rejette rr sous le minimum", () => {
  const setup = { detected: true, direction: "long", entry: 100, stopLoss: 90, takeProfit: 105, rr: 0.5 };
  assert.equal(validatePlan(setup).valid, false);
});

test("validatePlan rejette stop du mauvais côté (long)", () => {
  const setup = { detected: true, direction: "long", entry: 100, stopLoss: 110, takeProfit: 120, rr: 2 };
  assert.equal(validatePlan(setup).valid, false);
});

test("validatePlan accepte un plan cohérent", () => {
  const setup = { detected: true, direction: "long", entry: 100, stopLoss: 95, takeProfit: 115, rr: 3 };
  assert.equal(validatePlan(setup).valid, true);
});

test("INVARIANT : tout setup détecté+validé est ouvrable", () => {
  // Garantie centrale V2 : ce qui est affiché comme ouvrable l'est vraiment.
  const samples = [
    (() => { const c = series(80, (i) => 100 + i * 0.8); const ind = computeIndicators(c); c[c.length - 1].low = ind.ema20 * 0.999; c[c.length - 1].close = ind.ema20 * 1.004; return ["AAPL", computeIndicators(c)]; })(),
  ];
  for (const [sym, ind] of samples) {
    const s = bestSetup(ind, sym);
    if (!s) continue;
    const v = validatePlan(s);
    if (v.valid) {
      // un plan valide doit produire une taille > 0
      assert.ok(computePositionSize(s) > 0, "taille de position doit être > 0");
    }
  }
});

// ---------- Sizing ----------

test("riskPerTrade = équité × pourcentage", () => {
  assert.equal(riskPerTrade({ startingEquity: 100000, riskPerTradePct: 0.5 }), 500);
});

test("risque par défaut réduit à 0,5 %", () => {
  assert.equal(riskPerTrade(), 500);
});

test("computePositionSize proportionnelle au risque", () => {
  const setup = { entry: 100, stopLoss: 90 };
  const size = computePositionSize(setup, { startingEquity: 100000, riskPerTradePct: 1 });
  // risque budget 1000 / risque unitaire 10 = 100 unités
  assert.equal(size, 100);
});

// ---------- Résolution de position ----------

test("resolvePosition : stop touché (long)", () => {
  const pos = { direction: "long", stopLoss: 95, takeProfit: 115 };
  const r = resolvePosition(pos, candle(96, { high: 97, low: 94 }));
  assert.equal(r.exitReason, "stop");
  assert.equal(r.exit, 95);
});

test("resolvePosition : target touché (long)", () => {
  const pos = { direction: "long", stopLoss: 95, takeProfit: 115 };
  const r = resolvePosition(pos, candle(116, { high: 117, low: 112 }));
  assert.equal(r.exitReason, "target");
});

test("resolvePosition : reste ouvert", () => {
  const pos = { direction: "long", stopLoss: 95, takeProfit: 115 };
  assert.equal(resolvePosition(pos, candle(105, { high: 106, low: 104 })), null);
});

test("computePnl long gagnant", () => {
  const pos = { direction: "long", entry: 100, qty: 10 };
  const { pnl, pnlPct } = computePnl(pos, 110);
  assert.equal(pnl, 100);
  assert.equal(pnlPct, 10);
});

test("computePnl short gagnant", () => {
  const pos = { direction: "short", entry: 100, qty: 10 };
  const { pnl } = computePnl(pos, 90);
  assert.equal(pnl, 100);
});

// ---------- Statistiques ----------

test("computeStats agrège par setup et par actif", () => {
  const trades = [
    { symbol: "AAPL", setupType: "pullback", pnl: 100, closedAt: "2026-01-01" },
    { symbol: "AAPL", setupType: "pullback", pnl: -50, closedAt: "2026-01-02" },
    { symbol: "BTC", setupType: "breakout", pnl: 200, closedAt: "2026-01-03" },
  ];
  const s = computeStats(trades);
  assert.equal(s.overall.trades, 3);
  assert.equal(s.overall.wins, 2);
  assert.equal(s.bySetup.pullback.trades, 2);
  assert.equal(s.bySetup.pullback.winRate, 0.5);
  assert.equal(s.byAsset.BTC.totalPnl, 200);
  // profit factor global = (100+200)/50 = 6
  assert.equal(s.overall.profitFactor, 6);
});

test("computeStats gère liste vide", () => {
  const s = computeStats([]);
  assert.equal(s.overall.trades, 0);
  assert.equal(s.overall.winRate, 0);
});

test("maxDrawdown calculé sur la courbe d'équité", () => {
  const trades = [
    { symbol: "X", setupType: "a", pnl: 100, closedAt: "2026-01-01" },
    { symbol: "X", setupType: "a", pnl: -80, closedAt: "2026-01-02" },
    { symbol: "X", setupType: "a", pnl: -50, closedAt: "2026-01-03" },
    { symbol: "X", setupType: "a", pnl: 200, closedAt: "2026-01-04" },
  ];
  const s = computeStats(trades);
  // pic à 100, creux à -30 → drawdown 130
  assert.equal(s.overall.maxDrawdown, 130);
});
