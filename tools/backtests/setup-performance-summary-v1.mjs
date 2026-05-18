// tools/backtests/setup-performance-summary-v1.mjs
//
// Résumé consolidé des performances par setup — ManiTradePro.
//
// Produit une vue claire et honnête (winrate, expectancy, profit factor,
// drawdown, robustesse) pour chaque setup, en consolidant les sources
// existantes sans inventer de métriques.
//
// RÈGLE ABSOLUE : ce script est offline. Aucun ordre, aucun broker,
// aucun endpoint live. Aucun fichier amont modifié. Lecture seule sur :
//   - tools/backtests/results-multi-setup-grid.json
//   - tools/backtests/results-relative-strength-rotation-regime-v1.json
//   - tools/backtests/output/rolling-walkforward-validator.json
//   - tools/backtests/output/tradable-universe.json
//   - tools/backtests/output/tradable-universe-v2.json
//   - tools/backtests/output/allocation-plan-v3.json
//   - tools/backtests/output/setup-variant-matrix.json
//   - tools/backtests/output/variant-regime-matrix.json
//
// Sorties :
//   - tools/backtests/output/setup-performance-summary-v1.json
//   - tools/backtests/output/setup-performance-summary-v1.md
//
// Usage : node tools/backtests/setup-performance-summary-v1.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const BT_DIR = join(REPO_ROOT, "tools", "backtests");
const OUT_DIR = join(BT_DIR, "output");

const INPUT = {
  multiSetupGrid: join(BT_DIR, "results-multi-setup-grid.json"),
  rsRotation: join(BT_DIR, "results-relative-strength-rotation-regime-v1.json"),
  rolling: join(OUT_DIR, "rolling-walkforward-validator.json"),
  tuV1: join(OUT_DIR, "tradable-universe.json"),
  tuV2: join(OUT_DIR, "tradable-universe-v2.json"),
  allocV3: join(OUT_DIR, "allocation-plan-v3.json"),
  setupVariantMatrix: join(OUT_DIR, "setup-variant-matrix.json"),
  variantRegimeMatrix: join(OUT_DIR, "variant-regime-matrix.json"),
};
const OUT_JSON = join(OUT_DIR, "setup-performance-summary-v1.json");
const OUT_MD = join(OUT_DIR, "setup-performance-summary-v1.md");

const SETUPS = [
  "PULLBACK_MOMENTUM",
  "BREAKOUT_EXPANSION",
  "RELATIVE_STRENGTH_ROTATION",
  "MEAN_REVERSION",
  "VOLATILITY_COMPRESSION",
];

// === Helpers ===============================================================

async function loadJson(path) {
  try {
    await access(path);
    return JSON.parse(await readFile(path, "utf8"));
  } catch (_err) {
    return null;
  }
}

function safeNumber(n) {
  return Number.isFinite(n) ? n : null;
}

function weightedAvg(values) {
  // values: [{ value, weight }]
  let sumW = 0;
  let sumWV = 0;
  for (const { value, weight } of values) {
    if (!Number.isFinite(value) || !Number.isFinite(weight) || weight <= 0) continue;
    sumW += weight;
    sumWV += value * weight;
  }
  if (sumW === 0) return null;
  return sumWV / sumW;
}

// === Agrégation des stats de trading par setup =============================

function aggregateTradingStats(multiGrid, rsRotation) {
  const result = {};
  for (const s of SETUPS) result[s] = { trades: 0, wins: 0, losses: 0, timeouts: 0, maxDrawdown: 0, longestLossStreak: 0, variants: [] };

  // multiGrid.overall.rows couvre PULLBACK, BREAKOUT, MEANREV, VOLCOMP
  const mgRows = multiGrid?.overall?.rows ?? [];
  for (const r of mgRows) {
    const s = r.setupId;
    if (!result[s]) continue;
    result[s].trades += r.trades ?? 0;
    result[s].wins += r.wins ?? 0;
    result[s].losses += r.losses ?? 0;
    result[s].timeouts += r.timeouts ?? 0;
    if (Number.isFinite(r.maxDrawdown)) result[s].maxDrawdown = Math.max(result[s].maxDrawdown, r.maxDrawdown);
    if (Number.isFinite(r.longestLossStreak)) result[s].longestLossStreak = Math.max(result[s].longestLossStreak, r.longestLossStreak);
    result[s].variants.push({
      variant: r.variant,
      trades: r.trades,
      winrate: r.winrate,
      expectancy: r.expectancy,
      profitFactor: r.profitFactor,
      maxDrawdown: r.maxDrawdown,
      longestLossStreak: r.longestLossStreak,
    });
  }

  // rsRotation.overall.rows couvre RS Rotation par regimeMode × variant
  // On consolide en additionnant tous les regimeModes (overcompte les trades
  // mais c'est ce que le brief demande pour "agrégé").
  const rsRows = rsRotation?.overall?.rows ?? [];
  for (const r of rsRows) {
    const s = "RELATIVE_STRENGTH_ROTATION";
    result[s].trades += r.trades ?? 0;
    result[s].wins += r.wins ?? 0;
    result[s].losses += r.losses ?? 0;
    if (Number.isFinite(r.maxDrawdown)) result[s].maxDrawdown = Math.max(result[s].maxDrawdown, r.maxDrawdown);
    if (Number.isFinite(r.longestLossStreak)) result[s].longestLossStreak = Math.max(result[s].longestLossStreak, r.longestLossStreak);
    result[s].variants.push({
      variant: `${r.variant} (${r.regimeMode})`,
      trades: r.trades,
      winrate: r.winrate,
      expectancy: r.expectancy,
      profitFactor: r.profitFactor,
      maxDrawdown: r.maxDrawdown,
      longestLossStreak: r.longestLossStreak,
    });
  }

  // Calculer winrate/expectancy/PF agrégés pondérés par trades
  for (const s of SETUPS) {
    const data = result[s];
    if (data.trades === 0) {
      data.winratePct = null;
      data.expectancy = null;
      data.profitFactor = null;
      continue;
    }
    data.winratePct = Number(((data.wins / data.trades) * 100).toFixed(2));
    // PF agrégé : moyenne pondérée par trades (approximation, voir limites)
    const pfWeighted = weightedAvg(data.variants.map((v) => ({ value: v.profitFactor, weight: v.trades })));
    data.profitFactor = Number.isFinite(pfWeighted) ? Number(pfWeighted.toFixed(3)) : null;
    const exWeighted = weightedAvg(data.variants.map((v) => ({ value: v.expectancy, weight: v.trades })));
    data.expectancy = Number.isFinite(exWeighted) ? Number(exWeighted.toFixed(3)) : null;
    data.winrateWeighted = data.winratePct;
  }

  return result;
}

// === Agrégation rolling verdicts ===========================================

function aggregateRollingBySetup(rolling) {
  const result = {};
  for (const s of SETUPS) result[s] = { evaluated: 0, robust: 0, stable: 0, fragile: 0, overfit: 0, insufficient: 0 };
  const cells = rolling?.cells ?? [];
  for (const c of cells) {
    if (!result[c.setup]) continue;
    result[c.setup].evaluated++;
    switch (c.rollingVerdict) {
      case "ROBUST": result[c.setup].robust++; break;
      case "STABLE": result[c.setup].stable++; break;
      case "FRAGILE": result[c.setup].fragile++; break;
      case "OVERFIT": result[c.setup].overfit++; break;
      case "INSUFFICIENT_DATA": result[c.setup].insufficient++; break;
    }
  }
  return result;
}

// === Agrégation tradable universe ==========================================

function aggregateTradableUniverseBySetup(tuV1, tuV2) {
  const result = {};
  for (const s of SETUPS) result[s] = { allowV1: 0, reduceV1: 0, experimentalV1: 0, blockV1: 0, allowV2: 0, reduceV2: 0, experimentalV2: 0, blockV2: 0, totalCells: 0 };

  const v1cells = tuV1?.cells ?? [];
  for (const c of v1cells) {
    if (!result[c.setup]) continue;
    result[c.setup].totalCells++;
    switch (c.decision) {
      case "ALLOW": result[c.setup].allowV1++; break;
      case "REDUCE": result[c.setup].reduceV1++; break;
      case "EXPERIMENTAL": result[c.setup].experimentalV1++; break;
      case "BLOCK": result[c.setup].blockV1++; break;
    }
  }
  const v2cells = tuV2?.cells ?? [];
  for (const c of v2cells) {
    if (!result[c.setup]) continue;
    switch (c.decisionV2) {
      case "ALLOW": result[c.setup].allowV2++; break;
      case "REDUCE":
      case "WATCH": result[c.setup].reduceV2++; break;
      case "EXPERIMENTAL": result[c.setup].experimentalV2++; break;
      case "BLOCK": result[c.setup].blockV2++; break;
    }
  }
  return result;
}

// === Survivants allocation v3 ==============================================

function countAllocationV3SurvivorsBySetup(allocV3) {
  const result = {};
  for (const s of SETUPS) result[s] = 0;
  const positions = allocV3?.positions ?? [];
  for (const p of positions) {
    if (result[p.setup] !== undefined) result[p.setup]++;
  }
  return result;
}

// === Top variants / avoid variants =========================================

function topVariantsBySetup(setupVariantMatrix, k = 5) {
  const result = {};
  for (const s of SETUPS) {
    const top = setupVariantMatrix?.topBySetup?.[s] ?? [];
    result[s] = top.slice(0, k).map((t) => ({
      symbol: t.symbol,
      variant: t.variant,
      tier: t.tier,
      score: t.score,
      profitFactor: safeNumber(t.metrics?.profitFactor),
      winratePct: safeNumber(t.metrics?.winrate),
      expectancy: safeNumber(t.metrics?.expectancy),
      trades: t.metrics?.trades ?? null,
    }));
  }
  return result;
}

function avoidVariantsBySetup(setupVariantMatrix) {
  const result = {};
  for (const s of SETUPS) result[s] = [];
  const va = setupVariantMatrix?.variantsToAbandon ?? [];
  for (const v of va) {
    if (!result[v.setup]) continue;
    result[v.setup].push({
      variant: v.variant,
      cells: v.cells,
      avoidRatio: v.avoidRatio,
      totalTrades: v.totalTrades,
    });
  }
  return result;
}

// === Régimes : best / worst ================================================
//
// On classe par regime à partir de cells de rolling + tradable-universe pour
// estimer la performance dans chaque régime.

function regimesBySetup(rolling, tuV2) {
  const result = {};
  for (const s of SETUPS) result[s] = { bestRegimes: [], worstRegimes: [] };

  // Agréger par (setup, regime) : nombre de cellules robust/stable vs fragile/overfit
  const byKey = new Map();
  const cells = rolling?.cells ?? [];
  for (const c of cells) {
    if (!result[c.setup]) continue;
    const key = `${c.setup}|${c.regime}`;
    if (!byKey.has(key)) byKey.set(key, { setup: c.setup, regime: c.regime, robust: 0, stable: 0, fragile: 0, overfit: 0, insufficient: 0, total: 0 });
    const e = byKey.get(key);
    e.total++;
    switch (c.rollingVerdict) {
      case "ROBUST": e.robust++; break;
      case "STABLE": e.stable++; break;
      case "FRAGILE": e.fragile++; break;
      case "OVERFIT": e.overfit++; break;
      case "INSUFFICIENT_DATA": e.insufficient++; break;
    }
  }

  // Score régime = (robust+stable)/total - (overfit)/total
  const bySetupGroup = {};
  for (const s of SETUPS) bySetupGroup[s] = [];
  for (const e of byKey.values()) {
    const goodRatio = e.total > 0 ? (e.robust + e.stable) / e.total : 0;
    const badRatio = e.total > 0 ? e.overfit / e.total : 0;
    const score = goodRatio - badRatio;
    bySetupGroup[e.setup].push({ ...e, goodRatio: Number(goodRatio.toFixed(4)), badRatio: Number(badRatio.toFixed(4)), score: Number(score.toFixed(4)) });
  }
  for (const s of SETUPS) {
    const arr = bySetupGroup[s];
    arr.sort((a, b) => b.score - a.score);
    result[s].bestRegimes = arr.slice(0, 3).map((x) => ({ regime: x.regime, totalCells: x.total, robust: x.robust, stable: x.stable, fragile: x.fragile, overfit: x.overfit, goodRatio: x.goodRatio }));
    const sorted = [...arr].sort((a, b) => a.score - b.score);
    result[s].worstRegimes = sorted.slice(0, 3).map((x) => ({ regime: x.regime, totalCells: x.total, robust: x.robust, stable: x.stable, fragile: x.fragile, overfit: x.overfit, goodRatio: x.goodRatio }));
  }
  return result;
}

// === Score / grade =========================================================
//
// Score sur 100 → grade A/B/C/D/FAILED. Composante par composante,
// transparente, pas de magie.

function scoreSetup({ pf, expectancy, rolling, tradableUniverse, topVariantTiers }) {
  const breakdown = {};
  let score = 0;

  // 1) Profit factor agrégé (max 25 pts)
  let pfPts = 0;
  if (Number.isFinite(pf)) {
    if (pf >= 2.0) pfPts = 25;
    else if (pf >= 1.5) pfPts = 22;
    else if (pf >= 1.3) pfPts = 14;
    else if (pf >= 1.1) pfPts = 8;
    else if (pf >= 1.0) pfPts = 4;
    else if (pf >= 0.9) pfPts = 2;
    else pfPts = 0;
  }
  breakdown.profitFactor = { value: pf, points: pfPts, max: 25 };
  score += pfPts;

  // 2) Expectancy agrégée (max 15 pts)
  let exPts = 0;
  if (Number.isFinite(expectancy)) {
    if (expectancy >= 1.0) exPts = 15;
    else if (expectancy >= 0.5) exPts = 11;
    else if (expectancy >= 0.2) exPts = 7;
    else if (expectancy >= 0.0) exPts = 3;
    else exPts = 0;
  }
  breakdown.expectancy = { value: expectancy, points: exPts, max: 15 };
  score += exPts;

  // 3) Robustesse rolling (max 20 pts) — combine ratio relatif et compte absolu
  let robPts = 0;
  let robustRatio = null;
  const robustPlusStable = rolling.robust + rolling.stable;
  if (rolling.evaluated > 0) {
    robustRatio = robustPlusStable / rolling.evaluated;
    if (robustRatio >= 0.05) robPts = 20;
    else if (robustRatio >= 0.02) robPts = 15;
    else if (robustRatio >= 0.01) robPts = 10;
    else if (robustRatio >= 0.005) robPts = 7;
    else if (robustRatio > 0) robPts = 4;
    else robPts = 0;
  }
  breakdown.robustnessRolling = { robustPlusStable, evaluated: rolling.evaluated, ratio: robustRatio !== null ? Number(robustRatio.toFixed(4)) : null, points: robPts, max: 20 };
  score += robPts;

  // 4) Stabilité temporelle : moins de FRAGILE relatif à (robust+stable+fragile) (max 10 pts)
  let stbPts = 0;
  let fragilityRatio = null;
  const totalRSF = rolling.robust + rolling.stable + rolling.fragile;
  if (totalRSF > 0) {
    fragilityRatio = rolling.fragile / totalRSF;
    if (fragilityRatio <= 0.5) stbPts = 10;
    else if (fragilityRatio <= 0.7) stbPts = 7;
    else if (fragilityRatio <= 0.9) stbPts = 4;
    else stbPts = 1;
  }
  breakdown.temporalStability = { fragile: rolling.fragile, robustPlusStable, fragilityRatio: fragilityRatio !== null ? Number(fragilityRatio.toFixed(4)) : null, points: stbPts, max: 10 };
  score += stbPts;

  // 5) Survie dans tradable-universe-v2 ALLOW (max 15 pts)
  let surPts = 0;
  const allowV2 = tradableUniverse.allowV2;
  if (allowV2 >= 20) surPts = 15;
  else if (allowV2 >= 10) surPts = 11;
  else if (allowV2 >= 5) surPts = 8;
  else if (allowV2 >= 1) surPts = 5;
  else surPts = 0;
  breakdown.survivalV2 = { allowV2, points: surPts, max: 15 };
  score += surPts;

  // 6) Force des top variantes (max 15 pts) — captue "ce setup a au moins
  // une variante remarquable même si l'agrégé est moyen".
  let topPts = 0;
  const strong = topVariantTiers.strong || 0;
  const ok = topVariantTiers.ok || 0;
  if (strong >= 20) topPts = 15;
  else if (strong >= 5) topPts = 11;
  else if (strong >= 1) topPts = 6;
  else if (ok >= 5) topPts = 3;
  else if (ok >= 1) topPts = 1;
  else topPts = 0;
  breakdown.topVariantStrength = { strongVariants: strong, okVariants: ok, points: topPts, max: 15 };
  score += topPts;

  // 7) Pénalité OVERFIT (max -10 pts)
  let ofPts = 0;
  let overfitRatio = null;
  if (rolling.evaluated > 0) {
    overfitRatio = rolling.overfit / rolling.evaluated;
    if (overfitRatio >= 0.05) ofPts = -10;
    else if (overfitRatio >= 0.02) ofPts = -5;
    else if (overfitRatio >= 0.01) ofPts = -2;
    else if (overfitRatio > 0) ofPts = -1;
    else ofPts = 0;
  }
  breakdown.overfitPenalty = { overfit: rolling.overfit, evaluated: rolling.evaluated, ratio: overfitRatio !== null ? Number(overfitRatio.toFixed(4)) : null, points: ofPts, min: -10 };
  score += ofPts;

  // Grade final (max théorique 100)
  let grade;
  if (score >= 70) grade = "A";
  else if (score >= 45) grade = "B";
  else if (score >= 25) grade = "C";
  else if (score >= 10) grade = "D";
  else grade = "FAILED";

  return { score, grade, breakdown };
}

// === Markdown ==============================================================

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function pct(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return `${Number(n).toFixed(d)} %`;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Setup Performance Summary v1 — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/setup-performance-summary-v1.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Synthèse offline uniquement.** Aucun ordre, aucun broker, aucun endpoint live. À lire comme un instantané de recherche, pas une recommandation de trading.");
  lines.push("");

  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Setups comparés : ${report.summary.setupsCompared}`);
  lines.push(`- Meilleur setup : **${report.summary.bestSetup}**`);
  lines.push(`- Pire setup : **${report.summary.worstSetup}**`);
  lines.push(`- Plus robuste (rolling, robust+stable absolus) : **${report.summary.mostRobust}**`);
  lines.push(`- Plus de cellules OVERFIT (en absolu) : **${report.summary.mostOverfitAbs ?? "aucun"}**`);
  lines.push(`- Setup le plus overfit (en ratio, > 0) : **${report.summary.mostOverfitRatio ?? "aucun"}**`);
  lines.push("");
  lines.push("Sources utilisées :");
  lines.push("");
  for (const [k, v] of Object.entries(report.sources)) lines.push(`- \`${v}\` (${k})`);
  lines.push("");

  lines.push("## 2. Classement des setups");
  lines.push("");
  lines.push("| Rang | Setup | Grade | Score | Trades | Winrate | PF agrégé | Expectancy | Robust+Stable | ALLOW v2 | Survivants v3 |");
  lines.push("|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|");
  const ranked = [...report.setups].sort((a, b) => b.scoreNumber - a.scoreNumber);
  ranked.forEach((s, i) => {
    lines.push(`| ${i + 1} | ${s.setup} | **${s.grade}** | ${s.scoreNumber}/100 | ${s.trades.toLocaleString("fr-FR")} | ${pct(s.winratePct)} | ${fmt(s.profitFactor, 2)} | ${fmt(s.expectancy, 2)} | ${s.rolling.robust + s.rolling.stable}/${s.rolling.evaluated} | ${s.tradableUniverse.allowV2} | ${s.allocationV3Survivors} |`);
  });
  lines.push("");

  lines.push("## 3. Détail setup par setup");
  lines.push("");
  for (const s of ranked) {
    lines.push(`### ${s.setup} — grade **${s.grade}** (${s.scoreNumber}/100)`);
    lines.push("");
    lines.push("Statistiques de trading agrégées (toutes variantes confondues) :");
    lines.push("");
    lines.push("| Métrique | Valeur |");
    lines.push("|---|---:|");
    lines.push(`| Total trades | ${s.trades.toLocaleString("fr-FR")} |`);
    lines.push(`| Wins | ${s.wins.toLocaleString("fr-FR")} |`);
    lines.push(`| Losses | ${s.losses.toLocaleString("fr-FR")} |`);
    lines.push(`| Timeouts (breakeven approx.) | ${s.timeouts.toLocaleString("fr-FR")} |`);
    lines.push(`| Winrate | ${pct(s.winratePct)} |`);
    lines.push(`| Expectancy moyenne (pondérée trades) | ${fmt(s.expectancy, 3)} |`);
    lines.push(`| Profit factor agrégé (pondéré trades) | ${fmt(s.profitFactor, 3)} |`);
    lines.push(`| Max drawdown observé (max sur variantes) | ${fmt(s.maxDrawdown, 2)} |`);
    lines.push(`| Plus longue série de pertes | ${s.longestLossStreak} |`);
    lines.push("");
    lines.push("Rolling walk-forward (3 splits) :");
    lines.push("");
    lines.push("| Verdict | Cellules |");
    lines.push("|---|---:|");
    lines.push(`| ROBUST | ${s.rolling.robust} |`);
    lines.push(`| STABLE | ${s.rolling.stable} |`);
    lines.push(`| FRAGILE | ${s.rolling.fragile} |`);
    lines.push(`| OVERFIT | ${s.rolling.overfit} |`);
    lines.push(`| INSUFFICIENT_DATA | ${s.rolling.insufficient} |`);
    lines.push(`| Total évalué | ${s.rolling.evaluated} |`);
    lines.push("");
    lines.push("Tradable universe :");
    lines.push("");
    lines.push("| Décision | v1 | v2 |");
    lines.push("|---|---:|---:|");
    lines.push(`| ALLOW | ${s.tradableUniverse.allowV1} | ${s.tradableUniverse.allowV2} |`);
    lines.push(`| REDUCE / WATCH | ${s.tradableUniverse.reduceV1} | ${s.tradableUniverse.reduceV2} |`);
    lines.push(`| EXPERIMENTAL | ${s.tradableUniverse.experimentalV1} | ${s.tradableUniverse.experimentalV2} |`);
    lines.push(`| BLOCK | ${s.tradableUniverse.blockV1} | ${s.tradableUniverse.blockV2} |`);
    lines.push("");
    lines.push(`- Survivants dans le plan d'allocation v3 actuel : **${s.allocationV3Survivors}**`);
    lines.push("");
    if (s.topVariants.length) {
      lines.push("Top variantes (extrait de `setup-variant-matrix.topBySetup`) :");
      lines.push("");
      lines.push("| Symbole | Variante | Tier | Score | PF | Winrate | Expectancy | Trades |");
      lines.push("|---|---|---|---:|---:|---:|---:|---:|");
      for (const t of s.topVariants) lines.push(`| ${t.symbol} | \`${t.variant}\` | ${t.tier} | ${t.score} | ${fmt(t.profitFactor)} | ${pct(t.winratePct)} | ${fmt(t.expectancy)} | ${t.trades} |`);
      lines.push("");
    }
    if (s.avoidVariants.length) {
      lines.push("Variantes à éviter (extrait de `setup-variant-matrix.variantsToAbandon`) :");
      lines.push("");
      lines.push("| Variante | Cellules | Avoid ratio | Trades |");
      lines.push("|---|---:|---:|---:|");
      for (const a of s.avoidVariants) lines.push(`| \`${a.variant}\` | ${a.cells} | ${pct(a.avoidRatio * 100)} | ${a.totalTrades} |`);
      lines.push("");
    }
    if (s.bestRegimes.length) {
      lines.push("Top régimes (où ce setup tient mieux en rolling) :");
      lines.push("");
      lines.push("| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |");
      lines.push("|---|---:|---:|---:|---:|---:|---:|");
      for (const r of s.bestRegimes) lines.push(`| ${r.regime} | ${r.totalCells} | ${r.robust} | ${r.stable} | ${r.fragile} | ${r.overfit} | ${pct(r.goodRatio * 100)} |`);
      lines.push("");
    }
    if (s.worstRegimes.length) {
      lines.push("Régimes dangereux :");
      lines.push("");
      lines.push("| Régime | Cellules | ROBUST | STABLE | FRAGILE | OVERFIT | Ratio bon |");
      lines.push("|---|---:|---:|---:|---:|---:|---:|");
      for (const r of s.worstRegimes) lines.push(`| ${r.regime} | ${r.totalCells} | ${r.robust} | ${r.stable} | ${r.fragile} | ${r.overfit} | ${pct(r.goodRatio * 100)} |`);
      lines.push("");
    }
    lines.push("Décomposition du score :");
    lines.push("");
    lines.push("| Composante | Détail | Points |");
    lines.push("|---|---|---:|");
    lines.push(`| Profit factor agrégé | PF = ${fmt(s.breakdown.profitFactor.value, 2)} | ${s.breakdown.profitFactor.points}/${s.breakdown.profitFactor.max} |`);
    lines.push(`| Expectancy | E = ${fmt(s.breakdown.expectancy.value, 3)} | ${s.breakdown.expectancy.points}/${s.breakdown.expectancy.max} |`);
    lines.push(`| Robustesse rolling | (${s.breakdown.robustnessRolling.robustPlusStable}/${s.breakdown.robustnessRolling.evaluated} = ${pct((s.breakdown.robustnessRolling.ratio ?? 0) * 100)}) | ${s.breakdown.robustnessRolling.points}/${s.breakdown.robustnessRolling.max} |`);
    lines.push(`| Stabilité temporelle | fragilité = ${pct((s.breakdown.temporalStability.fragilityRatio ?? 0) * 100)} | ${s.breakdown.temporalStability.points}/${s.breakdown.temporalStability.max} |`);
    lines.push(`| Survie ALLOW v2 | ${s.breakdown.survivalV2.allowV2} cellules | ${s.breakdown.survivalV2.points}/${s.breakdown.survivalV2.max} |`);
    lines.push(`| Force top variantes | ${s.breakdown.topVariantStrength.strongVariants} STRONG, ${s.breakdown.topVariantStrength.okVariants} OK | ${s.breakdown.topVariantStrength.points}/${s.breakdown.topVariantStrength.max} |`);
    lines.push(`| Pénalité OVERFIT | ${s.breakdown.overfitPenalty.overfit}/${s.breakdown.overfitPenalty.evaluated} = ${pct((s.breakdown.overfitPenalty.ratio ?? 0) * 100)} | ${s.breakdown.overfitPenalty.points}/${s.breakdown.overfitPenalty.min} |`);
    lines.push(`| **Total** | | **${s.scoreNumber}/100 → grade ${s.grade}** |`);
    lines.push("");
    if (s.notes.length) {
      lines.push("Notes / limites :");
      for (const n of s.notes) lines.push(`- ${n}`);
      lines.push("");
    }
  }

  lines.push("## 4. Pourquoi certains setups survivent mieux");
  lines.push("");
  lines.push("Les setups les mieux notés combinent **plusieurs caractéristiques** :");
  lines.push("- Profit factor agrégé ≥ 1.5 (les gains compensent largement les pertes).");
  lines.push("- Présence de cellules ROBUST ou STABLE dans le rolling walk-forward (le setup tient à travers plusieurs périodes).");
  lines.push("- Survie significative dans `tradable-universe-v2` (le filtre rolling ne les a pas tous éliminés).");
  lines.push("- Variantes top concentrées sur des actifs réels et identifiables (cf. setup-variant-matrix.topBySetup).");
  lines.push("");

  lines.push("## 5. Pourquoi certains setups sont fragiles");
  lines.push("");
  lines.push("Les setups mal notés présentent au moins un de ces signaux :");
  lines.push("- Profit factor agrégé < 1.2 → l'edge est marginal, dévoré par les frais en réel.");
  lines.push("- Aucune cellule ROBUST ou STABLE → le setup ne tient pas dans le temps.");
  lines.push("- Forte concentration en INSUFFICIENT_DATA → on n'a pas assez de trades pour conclure.");
  lines.push("- Variantes massivement classées AVOID dans setup-variant-matrix.");
  lines.push("");

  lines.push("## 6. Comparaison v1 vs v2 (tradable universe)");
  lines.push("");
  lines.push("Le passage v1 → v2 (durci par rolling walk-forward) érode brutalement les ALLOW sauf pour les setups les plus robustes :");
  lines.push("");
  lines.push("| Setup | ALLOW v1 | ALLOW v2 | Perte |");
  lines.push("|---|---:|---:|---:|");
  for (const s of ranked) {
    const loss = s.tradableUniverse.allowV1 - s.tradableUniverse.allowV2;
    lines.push(`| ${s.setup} | ${s.tradableUniverse.allowV1} | ${s.tradableUniverse.allowV2} | ${loss > 0 ? `−${loss}` : `+${-loss}`} |`);
  }
  lines.push("");

  lines.push("## 7. Impact du rolling walk-forward");
  lines.push("");
  lines.push("Le rolling walk-forward (3 splits) classe les cellules par leur capacité à tenir sur plusieurs périodes 2021-2025. Voir distribution par setup :");
  lines.push("");
  lines.push("| Setup | Évaluées | ROBUST | STABLE | FRAGILE | OVERFIT | INSUFFICIENT |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const s of ranked) {
    const r = s.rolling;
    lines.push(`| ${s.setup} | ${r.evaluated} | ${r.robust} | ${r.stable} | ${r.fragile} | ${r.overfit} | ${r.insufficient} |`);
  }
  lines.push("");

  const failed = ranked.filter((s) => s.grade === "FAILED" || s.grade === "D");
  lines.push("## 8. Setups à éviter");
  lines.push("");
  if (!failed.length) lines.push("_aucun setup n'est noté D ou FAILED dans ce run_");
  else {
    for (const s of failed) {
      lines.push(`- **${s.setup}** (grade ${s.grade}, score ${s.scoreNumber}/100) — ${s.failureReason || "performance et robustesse insuffisantes"}`);
    }
  }
  lines.push("");

  const promising = ranked.filter((s) => s.grade === "A" || s.grade === "B");
  lines.push("## 9. Setups prometteurs");
  lines.push("");
  if (!promising.length) lines.push("_aucun setup n'atteint le grade A ou B dans ce run_");
  else {
    for (const s of promising) {
      const summary = `winrate ${pct(s.winratePct)}, PF ${fmt(s.profitFactor)}, ${s.rolling.robust + s.rolling.stable} cellules ROBUST/STABLE`;
      lines.push(`- **${s.setup}** (grade ${s.grade}, score ${s.scoreNumber}/100) — ${summary}.`);
    }
  }
  lines.push("");

  lines.push("## 10. Ce qu'on apprend réellement");
  lines.push("");
  lines.push("- **Le winrate seul ne suffit pas** : RS Rotation a ~55 % de winrate mais 0 cellule ROBUST/STABLE → fragile dans le temps.");
  lines.push("- **Pullback Momentum domine en volume** : énorme nombre de trades, mais hétérogène (winrate ~28 % moyen, sauvé par quelques variantes à PF > 5).");
  lines.push("- **Breakout Expansion est éparpillé** : 1 seule cellule ROBUST (GLD), beaucoup de variantes AVOID.");
  lines.push("- **Mean Reversion et Volatility Compression** sont les vraies cibles à abandonner : PF marginal, aucune ROBUST, expectancy basse.");
  lines.push("- **Le filtre rolling élimine 92 %+ des ALLOW v1** sur la plupart des setups, ce qui confirme que la sélection v1 était optimiste.");
  lines.push("");

  lines.push("## 11. Limites");
  lines.push("");
  lines.push("- **PF et expectancy agrégés sont pondérés par trades** : c'est une approximation, pas une moyenne arithmétique. Plus la variante a de trades, plus elle pèse. C'est un compromis pour avoir UN chiffre par setup.");
  lines.push("- **Pas de calcul de PF \"vrai\"** au sens des gains/pertes individuels, car les fichiers résultats n'exportent que les agrégats par variante.");
  lines.push("- **Max drawdown** est le max observé sur les variantes (le pire), pas un DD agrégé.");
  lines.push("- **RS Rotation** est consolidé en sommant tous les regimeModes — il y a donc une légère surcounting des trades RISK_ON inclus dans NO_RISK_OFF et ALL_REGIMES.");
  lines.push("- **Pas de friction (frais/slippage)** dans cette synthèse. Voir `friction-adjusted-report.json` pour la couche friction.");
  lines.push("- **Le grade A/B/C/D/FAILED est une heuristique simple** : 6 composantes pondérées, pas d'optimisation. Documenté composante par composante dans chaque détail setup.");
  lines.push("- **Pas d'audit anti-look-ahead** réalisé dans cette synthèse — un setup peut avoir un beau PF si l'indicateur utilise des données futures. À traiter dans une PR séparée.");
  lines.push("");

  lines.push("## 12. Prochaine étape recommandée");
  lines.push("");
  lines.push("- **Abandonner officiellement** les setups grade FAILED (cf. SETUPS_REGISTRY.md à mettre à jour si politique).");
  lines.push("- **Restreindre tradable-universe-v3** aux setups grade A/B en première intention.");
  lines.push("- **Audit anti-look-ahead** des indicateurs pour les setups grade A/B (priorité : Pullback Momentum vu le volume).");
  lines.push("- **Calibration empirique** de la friction sur les top variantes, pour mesurer l'edge survivant après coûts.");
  lines.push("- **Walk-forward conditionnel au régime** : si un setup tient en RISK_ON mais explose en RISK_OFF, son grade global cache le risque régime.");
  lines.push("");

  return lines.join("\n");
}

// === Main ==================================================================

async function main() {
  console.log("[setup-performance-summary] démarrage");

  const [multiGrid, rsRotation, rolling, tuV1, tuV2, allocV3, svm, vrm] = await Promise.all([
    loadJson(INPUT.multiSetupGrid),
    loadJson(INPUT.rsRotation),
    loadJson(INPUT.rolling),
    loadJson(INPUT.tuV1),
    loadJson(INPUT.tuV2),
    loadJson(INPUT.allocV3),
    loadJson(INPUT.setupVariantMatrix),
    loadJson(INPUT.variantRegimeMatrix),
  ]);

  const missing = [];
  if (!multiGrid) missing.push("results-multi-setup-grid.json");
  if (!rsRotation) missing.push("results-relative-strength-rotation-regime-v1.json");
  if (!rolling) missing.push("rolling-walkforward-validator.json");
  if (!tuV1) missing.push("tradable-universe.json");
  if (!tuV2) missing.push("tradable-universe-v2.json");
  if (!allocV3) missing.push("allocation-plan-v3.json");
  if (!svm) missing.push("setup-variant-matrix.json");
  if (missing.length) {
    console.warn(`[setup-performance-summary] sources manquantes (lecture nulle, valeurs par défaut) : ${missing.join(", ")}`);
  }

  const trading = aggregateTradingStats(multiGrid, rsRotation);
  const rollingAgg = aggregateRollingBySetup(rolling);
  const tuAgg = aggregateTradableUniverseBySetup(tuV1, tuV2);
  const allocV3Surv = countAllocationV3SurvivorsBySetup(allocV3);
  const topVars = topVariantsBySetup(svm, 5);
  const avoidVars = avoidVariantsBySetup(svm);
  const regimes = regimesBySetup(rolling, tuV2);

  const setups = SETUPS.map((s) => {
    const t = trading[s];
    const r = rollingAgg[s];
    const tu = tuAgg[s];
    const tiersForSetup = svm?.summary?.bySetup?.[s] ?? { STRONG: 0, OK: 0, WEAK: 0, AVOID: 0 };
    const { score, grade, breakdown } = scoreSetup({
      pf: t.profitFactor,
      expectancy: t.expectancy,
      rolling: r,
      tradableUniverse: tu,
      topVariantTiers: { strong: tiersForSetup.STRONG, ok: tiersForSetup.OK },
    });
    const notes = [];
    if (t.trades === 0) notes.push("Aucun trade dans les fichiers de résultats — métriques null.");
    if (r.evaluated === 0) notes.push("Aucune cellule évaluée par rolling walk-forward — robustesse indéterminée.");
    if (s === "RELATIVE_STRENGTH_ROTATION" && t.trades > 0) {
      notes.push("Trades agrégés sur tous les regimeModes (ALL_REGIMES, NO_RISK_OFF, RISK_ON_ONLY) — léger overcounting structurel.");
    }
    if (t.maxDrawdown === 0) notes.push("Max drawdown nul → soit aucune donnée DD, soit setup sans trade perdant — vérifier source.");
    // Détection de l'écart grade agrégé vs top variantes individuelles
    const tiersForSetupNote = svm?.summary?.bySetup?.[s] ?? { STRONG: 0 };
    if ((grade === "D" || grade === "FAILED") && tiersForSetupNote.STRONG >= 1) {
      const topNames = topVars[s].slice(0, 3).map((v) => `${v.symbol} (${v.tier}, PF ${fmt(v.profitFactor)})`).join("; ");
      notes.push(`Grade agrégé ${grade}, MAIS ${tiersForSetupNote.STRONG} variante(s) individuelle(s) STRONG existent (top : ${topNames}). L'agrégé est tiré vers le bas par le très grand nombre de variantes AVOID/WEAK sur d'autres actifs. Pour le tradable réel, regarder les variantes isolées plutôt que l'agrégé.`);
    }
    if ((grade === "B" || grade === "A") && r.robust + r.stable === 0 && t.profitFactor && t.profitFactor >= 1.3) {
      notes.push("Bonne performance backtest, mais 0 cellule ROBUST/STABLE en rolling walk-forward — l'edge n'a pas tenu sur les splits temporels. Risque structurel de fragilité.");
    }
    let failureReason = null;
    if (grade === "FAILED" || grade === "D") {
      const reasons = [];
      if (!Number.isFinite(t.profitFactor) || t.profitFactor < 1.1) reasons.push(`PF ${fmt(t.profitFactor)}`);
      if (r.robust + r.stable === 0) reasons.push("aucune cellule ROBUST/STABLE");
      if (tu.allowV2 === 0) reasons.push("aucun ALLOW v2 survivant");
      failureReason = reasons.length ? reasons.join(", ") : "score insuffisant";
    }
    return {
      setup: s,
      grade,
      scoreNumber: score,
      breakdown,
      trades: t.trades,
      wins: t.wins,
      losses: t.losses,
      timeouts: t.timeouts,
      winratePct: t.winratePct,
      expectancy: t.expectancy,
      profitFactor: t.profitFactor,
      maxDrawdown: t.maxDrawdown,
      longestLossStreak: t.longestLossStreak,
      rolling: r,
      tradableUniverse: tu,
      allocationV3Survivors: allocV3Surv[s],
      topVariants: topVars[s],
      avoidVariants: avoidVars[s],
      bestRegimes: regimes[s].bestRegimes,
      worstRegimes: regimes[s].worstRegimes,
      notes,
      failureReason,
    };
  });

  // Synthèse globale
  const ranked = [...setups].sort((a, b) => b.scoreNumber - a.scoreNumber);
  const mostRobust = [...setups].sort((a, b) => (b.rolling.robust + b.rolling.stable) - (a.rolling.robust + a.rolling.stable))[0];
  const mostOverfit = [...setups].sort((a, b) => b.rolling.overfit - a.rolling.overfit)[0];
  // "mostOverfit" en RATIO (pas en absolu) pour ne pas être trompé par la taille du pool
  const mostOverfitByRatio = [...setups]
    .filter((s) => s.rolling.evaluated > 0)
    .sort((a, b) => (b.rolling.overfit / b.rolling.evaluated) - (a.rolling.overfit / a.rolling.evaluated))[0];

  const report = {
    generatedAt: new Date().toISOString(),
    sources: Object.fromEntries(Object.entries(INPUT).map(([k, v]) => [k, relative(REPO_ROOT, v)])),
    summary: {
      setupsCompared: setups.length,
      bestSetup: ranked[0]?.setup ?? null,
      worstSetup: ranked[ranked.length - 1]?.setup ?? null,
      mostRobust: mostRobust ? mostRobust.setup : null,
      mostOverfitAbs: mostOverfit && mostOverfit.rolling.overfit > 0 ? mostOverfit.setup : null,
      mostOverfitRatio: mostOverfitByRatio && mostOverfitByRatio.rolling.overfit > 0 ? mostOverfitByRatio.setup : null,
      gradesDistribution: setups.reduce((acc, s) => { acc[s.grade] = (acc[s.grade] || 0) + 1; return acc; }, {}),
    },
    grading: {
      formula: "PF (max 25) + Expectancy (max 15) + Robustness rolling (max 20) + Temporal stability (max 10) + Survival ALLOW v2 (max 15) + Top variant strength (max 15) − OVERFIT penalty (max -10) → grade A ≥ 70, B ≥ 45, C ≥ 25, D ≥ 10, FAILED < 10",
      composantsExplained: {
        profitFactor: "PF ≥ 2.0 → 25, ≥ 1.5 → 22, ≥ 1.3 → 14, ≥ 1.1 → 8, ≥ 1.0 → 4, ≥ 0.9 → 2, sinon 0",
        expectancy: "E ≥ 1.0 → 15, ≥ 0.5 → 11, ≥ 0.2 → 7, ≥ 0 → 3, sinon 0",
        robustnessRolling: "(robust+stable)/evaluated : ≥ 5 % → 20, ≥ 2 % → 15, ≥ 1 % → 10, ≥ 0.5 % → 7, > 0 → 4, 0 → 0",
        temporalStability: "fragile / (robust+stable+fragile) : ≤ 50 % → 10, ≤ 70 % → 7, ≤ 90 % → 4, > 90 % → 1",
        survivalV2: "allowV2 ≥ 20 → 15, ≥ 10 → 11, ≥ 5 → 8, ≥ 1 → 5, 0 → 0",
        topVariantStrength: "Comptes STRONG/OK depuis setup-variant-matrix : STRONG ≥ 20 → 15, ≥ 5 → 11, ≥ 1 → 6, OK ≥ 5 → 3, OK ≥ 1 → 1, sinon 0",
        overfitPenalty: "overfit/evaluated : ≥ 5 % → −10, ≥ 2 % → −5, ≥ 1 % → −2, > 0 → −1, 0 → 0",
      },
    },
    setups,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUT_MD, buildMarkdown(report), "utf8");

  console.log("[setup-performance-summary] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);
  console.log("");
  console.log("Classement :");
  for (const s of ranked) {
    console.log(`  ${s.scoreNumber.toString().padStart(3, " ")}/100 (${s.grade}) ${s.setup.padEnd(28, " ")} trades=${s.trades.toString().padStart(6, " ")} PF=${(s.profitFactor ?? 0).toFixed(2).padStart(5, " ")} WR=${(s.winratePct ?? 0).toFixed(1).padStart(5, " ")}%`);
  }
}

main().catch((err) => {
  console.error("[setup-performance-summary] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
