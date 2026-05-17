// tools/backtests/asset-setup-matrix-v1.mjs
//
// Matrice de compatibilité actif × setup pour ManiTradePro.
// Lit les mêmes JSON de backtest que asset-quality-engine-v1.mjs et produit,
// pour chaque cellule (actif, setup), un score de compatibilité 0-100, un tier
// (STRONG / OK / WEAK / AVOID) et un niveau de confiance.
//
// Écrit :
//   - tools/backtests/output/asset-setup-matrix.json
//   - tools/backtests/output/asset-setup-matrix.md
//
// Objectif : repérer les cas où un actif "ELITE" globalement est en réalité
// mauvais sur un setup précis (ou inversement, un "BLACKLIST" globalement
// exploitable sur un setup donné).
//
// Aucune donnée n'est inventée. Si aucun JSON exploitable n'est trouvé, le
// script affiche une erreur claire et sort avec le code 1.
//
// Usage : node tools/backtests/asset-setup-matrix-v1.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, relative, resolve } from "node:path";

import {
  extractRecords,
  listJsonFiles,
  emptyBucket,
  pushToBucket,
  summarizeBucket,
  pickCanonicalRecords,
} from "./lib/backtest-records.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const INPUT_DIRS = [join(REPO_ROOT, "tools", "backtests"), join(REPO_ROOT, "tools", "backtests", "output")];
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUTPUT_JSON = join(OUTPUT_DIR, "asset-setup-matrix.json");
const OUTPUT_MD = join(OUTPUT_DIR, "asset-setup-matrix.md");
const ASSET_QUALITY_REPORT = join(OUTPUT_DIR, "asset-quality-report.json");

const SKIP_FILENAMES = new Set(["asset-quality-report.json", "asset-setup-matrix.json"]);

// Setups que la matrice expose. Tout autre famille de setup détectée dans les
// JSON sera ignorée à la sortie mais comptée dans les statistiques internes.
const TRACKED_SETUPS = [
  "PULLBACK_MOMENTUM",
  "BREAKOUT_EXPANSION",
  "RELATIVE_STRENGTH_ROTATION",
  "MEAN_REVERSION",
  "VOLATILITY_COMPRESSION",
];

// Setups marqués comme non prioritaires (le moteur ne doit pas les utiliser
// comme source primaire de décision, même si la compatibilité est OK).
const NON_PRIORITY_SETUPS = new Set(["MEAN_REVERSION", "VOLATILITY_COMPRESSION"]);

// Seuils de tier pour la compatibilité actif × setup
const TIER_THRESHOLDS = {
  STRONG: 75,
  OK: 55,
  WEAK: 35,
};

// Score 0-100 de la compatibilité d'un actif avec un setup donné.
// Inputs : `cell` (agrégé canonique de tous les records de la paire),
// `byYear` (Map year → bucket), `byRegimeMode` (Map mode → bucket).
function scoreCell(cell, byYear, byRegimeMode, setupFamily) {
  let score = 0;
  const reasons = [];

  const exp = cell.expectancy ?? 0;
  const pf = cell.profitFactor ?? 0;
  const wr = cell.winrate ?? 0;
  const trades = cell.trades ?? 0;
  const tr = cell.totalR ?? cell.totalPnl ?? null;
  const dd = cell.maxDrawdown ?? 0;

  // expectancy (0-30)
  if (exp >= 1.0) score += 30;
  else if (exp >= 0.5) score += 25;
  else if (exp >= 0.2) score += 15;
  else if (exp > 0) score += 8;

  // profitFactor (0-25)
  if (pf >= 2.0) score += 25;
  else if (pf >= 1.5) score += 20;
  else if (pf >= 1.2) score += 12;
  else if (pf >= 1.0) score += 5;

  // winrate (0-15)
  if (wr >= 60) score += 15;
  else if (wr >= 50) score += 10;
  else if (wr >= 45) score += 5;

  // sample size (0-15)
  if (trades >= 100) score += 15;
  else if (trades >= 50) score += 10;
  else if (trades >= 30) score += 7;
  else if (trades >= 15) score += 3;

  // drawdown vs gain (0-10)
  if (tr !== null && tr > 0 && dd > 0) {
    const ratio = dd / Math.abs(tr);
    if (ratio < 0.3) score += 10;
    else if (ratio < 0.5) score += 7;
    else if (ratio < 1.0) score += 4;
  } else if (tr !== null && tr > 0 && dd === 0) {
    score += 8;
  }

  // stabilité multi-années (0-5)
  const years = Array.from(byYear.values()).map(b => summarizeBucket(b));
  const profitableYears = years.filter(y => (y.expectancy ?? 0) > 0 && y.trades >= 5).length;
  const observedYears = years.length;
  if (observedYears >= 2 && profitableYears / observedYears >= 0.66) score += 5;
  else if (observedYears >= 2 && profitableYears / observedYears >= 0.5) score += 3;

  // PÉNALITÉS
  if (trades < 10) { score -= 20; reasons.push("échantillon < 10 trades"); }
  if (setupFamily === "RELATIVE_STRENGTH_ROTATION") {
    // Seul le setup RS expose un régime ALL_REGIMES / NO_RISK_OFF
    const allReg = byRegimeMode.get("ALL_REGIMES");
    const noRiskOff = byRegimeMode.get("NO_RISK_OFF");
    if (allReg && noRiskOff) {
      const allRegSum = summarizeBucket(allReg);
      const noRiskOffSum = summarizeBucket(noRiskOff);
      if (allRegSum.totalR !== null && noRiskOffSum.totalR !== null) {
        const drop = noRiskOffSum.totalR - allRegSum.totalR;
        if (drop > Math.abs(allRegSum.totalR) * 0.15) {
          score -= 10;
          reasons.push("performance dégradée par RISK_OFF");
        }
      }
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Tier
  let tier;
  const blacklistByExpectancy = exp <= 0 && trades >= 30;
  const blacklistByPf = pf > 0 && pf < 1.0;
  if (score < TIER_THRESHOLDS.WEAK || blacklistByExpectancy || blacklistByPf) {
    tier = "AVOID";
  } else if (score >= TIER_THRESHOLDS.STRONG && pf >= 1.4 && exp > 0 && trades >= 30) {
    tier = "STRONG";
  } else if (score >= TIER_THRESHOLDS.OK && pf >= 1.1 && exp > 0) {
    tier = "OK";
  } else {
    tier = "WEAK";
  }

  // Confidence
  let confidence;
  if (trades >= 50 && observedYears >= 2) confidence = "HIGH";
  else if (trades >= 20) confidence = "MEDIUM";
  else confidence = "LOW";

  // Reason (texte court pour le rapport)
  const reasonParts = [];
  if (reasons.length) reasonParts.push(...reasons);
  if (exp <= 0 && trades >= 10) reasonParts.push(`espérance ${exp.toFixed(2)}`);
  if (pf > 0 && pf < 1.0) reasonParts.push(`PF ${pf.toFixed(2)} < 1`);
  if (trades >= 30 && tier === "STRONG") reasonParts.push("setup solide");
  if (NON_PRIORITY_SETUPS.has(setupFamily)) reasonParts.push("setup non prioritaire");

  return {
    compatibilityScore: score,
    tier,
    confidence,
    profitableYears,
    observedYears,
    reason: reasonParts.join(" ; "),
  };
}

function buildCells(records) {
  // canonique : déduplique ALL_REGIMES vs NO_RISK_OFF, etc.
  const canonical = pickCanonicalRecords(records);

  // bySymbolSetup : Map "SYM|FAMILY" → { bucket, byYear:Map, byRegimeMode:Map }
  const cells = new Map();
  const cellKey = (sym, fam) => `${sym}|${fam}`;
  for (const rec of canonical) {
    const key = cellKey(rec.symbol, rec.setupFamily);
    if (!cells.has(key)) cells.set(key, { bucket: emptyBucket(), byYear: new Map(), byRegimeMode: new Map() });
    const entry = cells.get(key);
    pushToBucket(entry.bucket, rec);
    if (rec.year) {
      if (!entry.byYear.has(rec.year)) entry.byYear.set(rec.year, emptyBucket());
      pushToBucket(entry.byYear.get(rec.year), rec);
    }
  }
  // byRegimeMode utilise TOUS les records (pas seulement canoniques) pour
  // permettre la comparaison ALL_REGIMES vs NO_RISK_OFF dans une même cellule.
  for (const rec of records) {
    if (!rec.regimeMode) continue;
    const key = cellKey(rec.symbol, rec.setupFamily);
    if (!cells.has(key)) continue;
    const entry = cells.get(key);
    if (!entry.byRegimeMode.has(rec.regimeMode)) entry.byRegimeMode.set(rec.regimeMode, emptyBucket());
    pushToBucket(entry.byRegimeMode.get(rec.regimeMode), rec);
  }

  return cells;
}

function buildMatrix(records) {
  const cells = buildCells(records);
  const matrix = {};
  const allSymbols = new Set();
  const setupsSeen = new Set();
  const cellsByTier = { STRONG: 0, OK: 0, WEAK: 0, AVOID: 0 };
  const cellsBySetupTier = {};
  const allCellsList = [];

  for (const [key, entry] of cells.entries()) {
    const [symbol, setupFamily] = key.split("|");
    if (!TRACKED_SETUPS.includes(setupFamily)) continue;
    const summary = summarizeBucket(entry.bucket);
    const scored = scoreCell(summary, entry.byYear, entry.byRegimeMode, setupFamily);
    const yearMetrics = {};
    for (const [year, bucket] of entry.byYear.entries()) yearMetrics[year] = summarizeBucket(bucket);
    const regimeMetrics = {};
    for (const [mode, bucket] of entry.byRegimeMode.entries()) regimeMetrics[mode] = summarizeBucket(bucket);

    const cell = {
      symbol,
      setup: setupFamily,
      compatibilityScore: scored.compatibilityScore,
      tier: scored.tier,
      confidence: scored.confidence,
      metrics: {
        trades: summary.trades,
        winrate: summary.winrate,
        expectancy: summary.expectancy,
        profitFactor: summary.profitFactor,
        totalR: summary.totalR,
        totalPnl: summary.totalPnl,
        maxDrawdown: summary.maxDrawdown,
        longestLossStreak: summary.longestLossStreak,
      },
      byYear: yearMetrics,
      byRegimeMode: regimeMetrics,
      profitableYears: scored.profitableYears,
      observedYears: scored.observedYears,
      reason: scored.reason,
      nonPriority: NON_PRIORITY_SETUPS.has(setupFamily),
    };

    if (!matrix[symbol]) matrix[symbol] = {};
    matrix[symbol][setupFamily] = cell;
    allSymbols.add(symbol);
    setupsSeen.add(setupFamily);
    cellsByTier[scored.tier] = (cellsByTier[scored.tier] ?? 0) + 1;
    if (!cellsBySetupTier[setupFamily]) cellsBySetupTier[setupFamily] = { STRONG: 0, OK: 0, WEAK: 0, AVOID: 0 };
    cellsBySetupTier[setupFamily][scored.tier]++;
    allCellsList.push(cell);
  }

  return {
    matrix,
    summary: {
      totalAssets: allSymbols.size,
      totalCells: allCellsList.length,
      setupsCovered: TRACKED_SETUPS.filter(s => setupsSeen.has(s)),
      byTier: cellsByTier,
      bySetup: cellsBySetupTier,
    },
    allCellsList,
  };
}

function buildTopBySetup(allCellsList) {
  // Top 10 actifs par compatibilité pour chaque setup, parmi cellules STRONG/OK
  const out = {};
  for (const setup of TRACKED_SETUPS) {
    const cells = allCellsList
      .filter(c => c.setup === setup && (c.tier === "STRONG" || c.tier === "OK") && c.metrics.trades >= 20)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore || a.symbol.localeCompare(b.symbol))
      .slice(0, 10);
    out[setup] = cells;
  }
  return out;
}

async function tryReadAssetQualityReport() {
  try {
    await access(ASSET_QUALITY_REPORT);
    const raw = await readFile(ASSET_QUALITY_REPORT, "utf8");
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

function crossWithAssetQuality(matrix, allCellsList, assetQualityReport) {
  if (!assetQualityReport) {
    return { eliteCoreButWeakOnSetup: [], blacklistButExploitable: [], assetQualityAvailable: false };
  }
  const tierBySymbol = {};
  for (const [sym, entry] of Object.entries(assetQualityReport.assets || {})) {
    tierBySymbol[sym] = entry.tier;
  }

  const eliteCoreButWeakOnSetup = [];
  const blacklistButExploitable = [];

  for (const cell of allCellsList) {
    if (cell.nonPriority) continue;
    if (cell.metrics.trades < 20) continue;
    const tier = tierBySymbol[cell.symbol];
    if (!tier) continue;
    if ((tier === "ELITE" || tier === "CORE") && (cell.tier === "WEAK" || cell.tier === "AVOID")) {
      eliteCoreButWeakOnSetup.push({
        symbol: cell.symbol,
        overallTier: tier,
        setup: cell.setup,
        cellTier: cell.tier,
        compatibilityScore: cell.compatibilityScore,
        trades: cell.metrics.trades,
        expectancy: cell.metrics.expectancy,
        profitFactor: cell.metrics.profitFactor,
        reason: cell.reason,
      });
    }
    if (tier === "BLACKLIST" && (cell.tier === "STRONG" || cell.tier === "OK")) {
      blacklistButExploitable.push({
        symbol: cell.symbol,
        overallTier: tier,
        setup: cell.setup,
        cellTier: cell.tier,
        compatibilityScore: cell.compatibilityScore,
        trades: cell.metrics.trades,
        expectancy: cell.metrics.expectancy,
        profitFactor: cell.metrics.profitFactor,
      });
    }
  }
  eliteCoreButWeakOnSetup.sort((a, b) => a.compatibilityScore - b.compatibilityScore || a.symbol.localeCompare(b.symbol));
  blacklistButExploitable.sort((a, b) => b.compatibilityScore - a.compatibilityScore || a.symbol.localeCompare(b.symbol));
  return { eliteCoreButWeakOnSetup, blacklistButExploitable, assetQualityAvailable: true };
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Asset × Setup Matrix — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/asset-setup-matrix-v1.mjs\`.`);
  lines.push("");

  lines.push("## 1. Synthèse globale");
  lines.push("");
  lines.push(`- Actifs analysés : **${report.summary.totalAssets}**`);
  lines.push(`- Cellules actif × setup : **${report.summary.totalCells}**`);
  lines.push(`- Setups couverts : ${report.summary.setupsCovered.join(", ")}`);
  lines.push("");
  lines.push("Répartition globale des cellules :");
  lines.push("");
  lines.push("| Tier | Nombre |");
  lines.push("|---|---:|");
  for (const tier of ["STRONG", "OK", "WEAK", "AVOID"]) {
    lines.push(`| ${tier} | ${report.summary.byTier[tier] ?? 0} |`);
  }
  lines.push("");
  lines.push("Par setup :");
  lines.push("");
  lines.push("| Setup | STRONG | OK | WEAK | AVOID |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const setup of report.summary.setupsCovered) {
    const s = report.summary.bySetup[setup] || {};
    lines.push(`| ${setup} | ${s.STRONG ?? 0} | ${s.OK ?? 0} | ${s.WEAK ?? 0} | ${s.AVOID ?? 0} |`);
  }
  lines.push("");

  lines.push("## 2. Top actifs par setup");
  lines.push("");
  for (const setup of report.summary.setupsCovered) {
    lines.push(`### ${setup}`);
    if (NON_PRIORITY_SETUPS.has(setup)) lines.push("_(setup non prioritaire — à utiliser avec parcimonie)_");
    lines.push("");
    const top = report.topBySetup[setup] || [];
    if (!top.length) { lines.push("_aucune cellule STRONG/OK avec ≥ 20 trades_"); lines.push(""); continue; }
    lines.push("| Symbole | Tier | Score | Trades | Winrate | Expectancy | PF | TotalR/PnL | Drawdown |");
    lines.push("|---|---|---:|---:|---:|---:|---:|---:|---:|");
    for (const c of top) {
      const tr = c.metrics.totalR !== null ? fmt(c.metrics.totalR) : (c.metrics.totalPnl !== null ? fmt(c.metrics.totalPnl) : "n/a");
      lines.push(`| ${c.symbol} | ${c.tier} | ${c.compatibilityScore} | ${c.metrics.trades} | ${fmt(c.metrics.winrate, 1)}% | ${fmt(c.metrics.expectancy)} | ${fmt(c.metrics.profitFactor)} | ${tr} | ${fmt(c.metrics.maxDrawdown)} |`);
    }
    lines.push("");
  }

  lines.push("## 3. Actifs ELITE/CORE mais faibles sur un setup donné");
  lines.push("");
  if (!report.cross.assetQualityAvailable) {
    lines.push("_`asset-quality-report.json` introuvable — lancer `node tools/backtests/asset-quality-engine-v1.mjs` puis relancer ce script._");
    lines.push("");
  } else if (!report.cross.eliteCoreButWeakOnSetup.length) {
    lines.push("_aucun cas détecté_");
    lines.push("");
  } else {
    lines.push("Ces actifs ont une bonne note globale mais sont à exclure / réduire sur le setup concerné :");
    lines.push("");
    lines.push("| Symbole | Tier global | Setup | Cell tier | Score | Trades | Expectancy | PF | Raison |");
    lines.push("|---|---|---|---|---:|---:|---:|---:|---|");
    for (const r of report.cross.eliteCoreButWeakOnSetup) {
      lines.push(`| ${r.symbol} | ${r.overallTier} | ${r.setup} | ${r.cellTier} | ${r.compatibilityScore} | ${r.trades} | ${fmt(r.expectancy)} | ${fmt(r.profitFactor)} | ${r.reason || "—"} |`);
    }
    lines.push("");
  }

  lines.push("## 4. Actifs BLACKLIST mais exploitables sur un setup");
  lines.push("");
  if (!report.cross.assetQualityAvailable) {
    lines.push("_`asset-quality-report.json` introuvable_");
    lines.push("");
  } else if (!report.cross.blacklistButExploitable.length) {
    lines.push("_aucun cas détecté_");
    lines.push("");
  } else {
    lines.push("Ces actifs sont BLACKLIST globalement mais ont un setup où ils performent — à considérer pour un usage strictement ciblé :");
    lines.push("");
    lines.push("| Symbole | Setup | Cell tier | Score | Trades | Expectancy | PF |");
    lines.push("|---|---|---|---:|---:|---:|---:|");
    for (const r of report.cross.blacklistButExploitable) {
      lines.push(`| ${r.symbol} | ${r.setup} | ${r.cellTier} | ${r.compatibilityScore} | ${r.trades} | ${fmt(r.expectancy)} | ${fmt(r.profitFactor)} |`);
    }
    lines.push("");
  }

  lines.push("## 5. Recommandations moteur");
  lines.push("");
  lines.push("Sur la base de cette matrice, le moteur ManiTradePro devrait :");
  lines.push("");
  lines.push("- **Autoriser un trade uniquement si la cellule (actif × setup) est STRONG ou OK** avec confiance ≥ MEDIUM.");
  lines.push("- **Ignorer un setup pour un actif** si la cellule est WEAK ou AVOID, même si l'actif est ELITE globalement (cf. section 3).");
  lines.push("- **Reconsidérer les actifs BLACKLIST** uniquement pour les setups où ils sortent STRONG/OK (cf. section 4) — usage ciblé, pas générique.");
  lines.push("- **Ne pas utiliser les setups non prioritaires (MEAN_REVERSION, VOLATILITY_COMPRESSION) comme moteur principal** — les considérer comme complément, jamais comme source unique de décision.");
  lines.push(`- **Préférer NO_RISK_OFF en mode opérationnel** pour Relative Strength Rotation (cf. SETUPS_REGISTRY.md).`);
  lines.push("");

  // Matrice détaillée
  lines.push("## 6. Matrice complète");
  lines.push("");
  lines.push("Lignes = actifs, colonnes = setups. Chaque cellule affiche `tier (score)`. `—` = pas de données.");
  lines.push("");
  const symbols = Object.keys(report.matrix).sort();
  const setups = report.summary.setupsCovered;
  const header = ["Symbole", ...setups];
  lines.push("| " + header.join(" | ") + " |");
  lines.push("|" + header.map(() => "---").join("|") + "|");
  for (const sym of symbols) {
    const row = [sym];
    for (const setup of setups) {
      const c = report.matrix[sym]?.[setup];
      if (!c) row.push("—");
      else row.push(`${c.tier} (${c.compatibilityScore})`);
    }
    lines.push("| " + row.join(" | ") + " |");
  }
  lines.push("");

  return lines.join("\n");
}

function expectedFormatMessage() {
  return [
    "",
    "Aucun JSON exploitable n'a été trouvé.",
    "",
    "Le moteur cherche les mêmes formats que `asset-quality-engine-v1.mjs`",
    "dans :",
    "  - tools/backtests/",
    "  - tools/backtests/output/",
    "",
    "Pour générer les JSON sources, lancer d'abord les scripts de backtest",
    "présents dans `tools/backtests/` (cf. SETUPS_REGISTRY.md).",
    "",
  ].join("\n");
}

async function main() {
  console.log("[asset-setup-matrix] démarrage");
  const files = await listJsonFiles({ inputDirs: INPUT_DIRS, skipFilenames: SKIP_FILENAMES });
  if (!files.length) {
    console.error("[asset-setup-matrix] aucun fichier .json trouvé");
    console.error(expectedFormatMessage());
    process.exit(1);
  }
  console.log(`[asset-setup-matrix] ${files.length} fichier(s) candidat(s)`);

  const allRecords = [];
  const usedSources = [];
  for (const file of files) {
    let parsed;
    try {
      const raw = await readFile(file, "utf8");
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn(`  ✗ ${basename(file)} — JSON invalide (${err?.message || err})`);
      continue;
    }
    const { records, adapter } = extractRecords(parsed, basename(file));
    if (!records.length) {
      console.warn(`  ⊘ ${basename(file)} — shape non reconnue ou aucun enregistrement par symbole`);
      continue;
    }
    console.log(`  ✓ ${basename(file)} — ${records.length} record(s) via ${adapter}`);
    allRecords.push(...records);
    usedSources.push(file);
  }
  if (!allRecords.length) {
    console.error("[asset-setup-matrix] aucun enregistrement exploitable extrait");
    console.error(expectedFormatMessage());
    process.exit(1);
  }
  console.log(`[asset-setup-matrix] ${allRecords.length} record(s) extrait(s) au total`);

  const { matrix, summary, allCellsList } = buildMatrix(allRecords);
  const topBySetup = buildTopBySetup(allCellsList);
  const assetQualityReport = await tryReadAssetQualityReport();
  if (!assetQualityReport) {
    console.warn("[asset-setup-matrix] asset-quality-report.json introuvable — sections cross-check vides");
  }
  const cross = crossWithAssetQuality(matrix, allCellsList, assetQualityReport);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFiles: usedSources.map(f => relative(REPO_ROOT, f)),
    summary,
    matrix,
    topBySetup,
    cross,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[asset-setup-matrix] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Résumé : ${summary.totalAssets} actifs / ${summary.totalCells} cellules — STRONG ${summary.byTier.STRONG}, OK ${summary.byTier.OK}, WEAK ${summary.byTier.WEAK}, AVOID ${summary.byTier.AVOID}`);
  if (cross.assetQualityAvailable) {
    console.log(`Cross-check : ${cross.eliteCoreButWeakOnSetup.length} ELITE/CORE × WEAK/AVOID, ${cross.blacklistButExploitable.length} BLACKLIST × STRONG/OK`);
  }
}

main().catch(err => {
  console.error("[asset-setup-matrix] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
