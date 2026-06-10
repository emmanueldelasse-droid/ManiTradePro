// Smoke test hors-ligne du pipeline V2 complet (sans réseau).
// Génère des bougies synthétiques, simule un cycle bout-en-bout et imprime les
// statistiques d'apprentissage. Lancer : node tools/v2/smoke-v2.mjs
import {
  V2_UNIVERSE, V2_DEFAULT_SETTINGS, computeIndicators, bestSetup,
  validatePlan, computePositionSize, resolvePosition, computePnl, computeStats,
} from "./lib/engine-v2.mjs";

// Générateur de bougies pseudo-aléatoires mais déterministe (seed).
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genSeries(seed, n = 220, start = 100) {
  const rnd = mulberry32(seed);
  let price = start;
  const out = [];
  let trend = (rnd() - 0.5) * 0.4; // dérive
  for (let i = 0; i < n; i++) {
    if (i % 30 === 0) trend = (rnd() - 0.5) * 0.6;
    const drift = trend + (rnd() - 0.5) * 2.5;
    const open = price;
    const close = Math.max(1, price + drift);
    const high = Math.max(open, close) * (1 + rnd() * 0.012);
    const low = Math.min(open, close) * (1 - rnd() * 0.012);
    const volume = 1000 * (0.6 + rnd() * 1.8);
    out.push({ time: new Date(Date.now() - (n - i) * 86400000).toISOString(), open, high, low, close, volume });
    price = close;
  }
  return out;
}

const settings = V2_DEFAULT_SETTINGS;

// On génère, pour chaque actif, un historique + une fenêtre "future" pour
// résoudre les positions ouvertes (stop/objectif/temps).
let detected = 0;
const closedTrades = [];

for (let a = 0; a < V2_UNIVERSE.length; a++) {
  const asset = V2_UNIVERSE[a];
  const candles = genSeries(a + 1, 220, 50 + (a % 40) * 10);
  const ind = computeIndicators(candles);
  if (!ind) continue;
  const setup = bestSetup(ind, asset.symbol);
  if (!setup) continue;
  const v = validatePlan(setup, settings);
  if (!v.valid) continue;
  detected++;
  const qty = computePositionSize(setup, settings);
  const pos = {
    id: `${asset.symbol}-1`, symbol: asset.symbol, setupType: setup.setupType,
    direction: setup.direction, entry: setup.entry, stopLoss: setup.stopLoss,
    takeProfit: setup.takeProfit, rr: setup.rr, qty,
    openedAt: candles[candles.length - 1].time,
  };
  // Simule les jours suivants pour fermer la position.
  const future = genSeries(1000 + a, settings.maxHoldDays + 2, setup.entry);
  let closedAt = null; let exit = null; let exitReason = null;
  for (let d = 0; d < future.length; d++) {
    const forceTime = d >= settings.maxHoldDays;
    const r = resolvePosition(pos, future[d], { forceTimeExit: forceTime });
    if (r) { exit = r.exit; exitReason = r.exitReason; closedAt = future[d].time; break; }
  }
  if (exit == null) { exit = future[future.length - 1].close; exitReason = "time"; closedAt = future[future.length - 1].time; }
  const { pnl, pnlPct } = computePnl(pos, exit);
  closedTrades.push({ ...pos, exit, exitReason, pnl, pnlPct, closedAt });
}

const stats = computeStats(closedTrades);

console.log(`Univers scanné       : ${V2_UNIVERSE.length} actifs`);
console.log(`Setups détectés      : ${detected}`);
console.log(`Trades fermés        : ${closedTrades.length}`);
console.log("");
console.log("=== Par setup ===");
for (const [k, s] of Object.entries(stats.bySetup)) {
  console.log(`${k.padEnd(16)} n=${String(s.trades).padStart(2)}  réussite=${(s.winRate * 100).toFixed(0)}%  PF=${s.profitFactor ?? "∞"}  espérance=${s.expectancy}`);
}
console.log("");
console.log("=== Global ===");
console.log(`Trades=${stats.overall.trades}  réussite=${(stats.overall.winRate * 100).toFixed(0)}%  P/L=${stats.overall.totalPnl}  DD max=${stats.overall.maxDrawdown}`);

if (detected === 0 || closedTrades.length === 0) {
  console.error("\nÉCHEC : un bot d'apprentissage doit prendre des trades.");
  process.exit(1);
}
console.log("\nOK — le pipeline détecte, ouvre, ferme et agrège les résultats.");
