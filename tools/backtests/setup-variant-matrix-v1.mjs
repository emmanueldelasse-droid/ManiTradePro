// tools/backtests/setup-variant-matrix-v1.mjs
//
// Matrice de compatibilité actif × setup × variante.
// Granularité plus fine que asset-setup-matrix-v1.mjs : une variante précise
// peut être excellente pour un actif alors que sa moyenne setup est moyenne.
//
// Lit les mêmes JSON de backtest et réutilise les helpers de lib/.
// Écrit :
//   - tools/backtests/output/setup-variant-matrix.json
//   - tools/backtests/output/setup-variant-matrix.md
//
// Aucune donnée n'est inventée. Quand une source n'expose pas de nom de
// variante, la cellule est marquée UNKNOWN_VARIANT.
//
// Usage : node tools/backtests/setup-variant-matrix-v1.mjs

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
const OUTPUT_JSON = join(OUTPUT_DIR, "setup-variant-matrix.json");
const OUTPUT_MD = join(OUTPUT_DIR, "setup-variant-matrix.md");
const ASSET_QUALITY_REPORT = join(OUTPUT_DIR, "asset-quality-report.json");

const SKIP_FILENAMES = new Set([
  "asset-quality-report.json",
  "asset-setup-matrix.json",
  "setup-variant-matrix.json",
]);

const UNKNOWN_VARIANT_LABEL = "UNKNOWN_VARIANT";

const NON_PRIORITY_SETUPS = new Set(["MEAN_REVERSION", "VOLATILITY_COMPRESSION"]);

const TIER_THRESHOLDS = {
  STRONG: 75,
  OK: 55,
  WEAK: 35,
};

// Actifs à inspecter en détail dans la section "Cas importants"
const FOCUS_SYMBOLS = ["NVDA", "SOXL", "AVGO", "QQQ", "PLTR", "APP", "SMCI", "BTC", "SOL"];

// Score 0-100 d'une variante pour un actif donné. Seuils de trade plus bas
// que pour la matrice (setup, asset) car une variante isole un sous-ensemble
// — il faut tout de même un minimum de signal.
function scoreVariantCell(cellSummary, byYear, byRegimeMode, setupFamily) {
  let score = 0;
  const reasons = [];

  const exp = cellSummary.expectancy ?? 0;
  const pf = cellSummary.profitFactor ?? 0;
  const wr = cellSummary.winrate ?? 0;
  const trades = cellSummary.trades ?? 0;
  const tr = cellSummary.totalR ?? cellSummary.totalPnl ?? null;
  const dd = cellSummary.maxDrawdown ?? 0;

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

  // sample size (0-15) — seuils plus bas qu'asset-setup-matrix
  if (trades >= 50) score += 15;
  else if (trades >= 25) score += 10;
  else if (trades >= 15) score += 7;
  else if (trades >= 8) score += 3;

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
  const profitableYears = years.filter(y => (y.expectancy ?? 0) > 0 && y.trades >= 3).length;
  const observedYears = years.length;
  if (observedYears >= 2 && profitableYears / observedYears >= 0.66) score += 5;
  else if (observedYears >= 2 && profitableYears / observedYears >= 0.5) score += 3;

  // PÉNALITÉS — plus strictes au niveau variante
  if (trades < 8) { score -= 25; reasons.push("échantillon < 8 trades"); }
  if (observedYears <= 1 && trades > 0) { score -= 5; }
  if (setupFamily === "RELATIVE_STRENGTH_ROTATION") {
    const allReg = byRegimeMode.get("ALL_REGIMES");
    const noRiskOff = byRegimeMode.get("NO_RISK_OFF");
    if (allReg && noRiskOff) {
      const a = summarizeBucket(allReg);
      const n = summarizeBucket(noRiskOff);
      if (a.totalR !== null && n.totalR !== null) {
        const drop = n.totalR - a.totalR;
        if (drop > Math.abs(a.totalR) * 0.15) {
          score -= 10;
          reasons.push("performance dégradée par RISK_OFF");
        }
      }
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier;
  const blacklistByExpectancy = exp <= 0 && trades >= 20;
  const blacklistByPf = pf > 0 && pf < 1.0;
  if (score < TIER_THRESHOLDS.WEAK || blacklistByExpectancy || blacklistByPf) {
    tier = "AVOID";
  } else if (score >= TIER_THRESHOLDS.STRONG && pf >= 1.4 && exp > 0 && trades >= 25) {
    tier = "STRONG";
  } else if (score >= TIER_THRESHOLDS.OK && pf >= 1.1 && exp > 0 && trades >= 10) {
    tier = "OK";
  } else {
    tier = "WEAK";
  }

  let confidence;
  if (trades >= 30 && observedYears >= 2) confidence = "HIGH";
  else if (trades >= 15) confidence = "MEDIUM";
  else confidence = "LOW";

  const reasonParts = [...reasons];
  if (exp <= 0 && trades >= 10) reasonParts.push(`espérance ${exp.toFixed(2)}`);
  if (pf > 0 && pf < 1.0) reasonParts.push(`PF ${pf.toFixed(2)} < 1`);
  if (tier === "STRONG" && trades >= 25) reasonParts.push("variante exploitable");
  if (NON_PRIORITY_SETUPS.has(setupFamily)) reasonParts.push("setup non prioritaire");

  return {
    score,
    tier,
    confidence,
    profitableYears,
    observedYears,
    reason: reasonParts.join(" ; "),
  };
}

function buildVariantCells(records) {
  const canonical = pickCanonicalRecords(records);
  const cells = new Map();
  const cellKey = (sym, fam, variant) => `${sym}|${fam}|${variant || UNKNOWN_VARIANT_LABEL}`;
  for (const rec of canonical) {
    const key = cellKey(rec.symbol, rec.setupFamily, rec.variant);
    if (!cells.has(key)) cells.set(key, { bucket: emptyBucket(), byYear: new Map(), byRegimeMode: new Map() });
    const entry = cells.get(key);
    pushToBucket(entry.bucket, rec);
    if (rec.year) {
      if (!entry.byYear.has(rec.year)) entry.byYear.set(rec.year, emptyBucket());
      pushToBucket(entry.byYear.get(rec.year), rec);
    }
  }
  for (const rec of records) {
    if (!rec.regimeMode) continue;
    const key = cellKey(rec.symbol, rec.setupFamily, rec.variant);
    if (!cells.has(key)) continue;
    const entry = cells.get(key);
    if (!entry.byRegimeMode.has(rec.regimeMode)) entry.byRegimeMode.set(rec.regimeMode, emptyBucket());
    pushToBucket(entry.byRegimeMode.get(rec.regimeMode), rec);
  }
  return cells;
}

function buildMatrix(records) {
  const cells = buildVariantCells(records);
  const matrix = {};
  const allCells = [];
  const setupsSeen = new Set();
  const variantsSeen = new Set();
  const cellsByTier = { STRONG: 0, OK: 0, WEAK: 0, AVOID: 0 };
  const cellsBySetupTier = {};
  const cellsByVariantTier = {};

  for (const [key, entry] of cells.entries()) {
    const [symbol, setupFamily, variant] = key.split("|");
    const summary = summarizeBucket(entry.bucket);
    const scored = scoreVariantCell(summary, entry.byYear, entry.byRegimeMode, setupFamily);

    const yearMetrics = {};
    for (const [year, b] of entry.byYear.entries()) yearMetrics[year] = summarizeBucket(b);
    const regimeMetrics = {};
    for (const [mode, b] of entry.byRegimeMode.entries()) regimeMetrics[mode] = summarizeBucket(b);

    const cell = {
      symbol,
      setup: setupFamily,
      variant,
      score: scored.score,
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
      isUnknownVariant: variant === UNKNOWN_VARIANT_LABEL,
    };

    if (!matrix[symbol]) matrix[symbol] = {};
    if (!matrix[symbol][setupFamily]) matrix[symbol][setupFamily] = {};
    matrix[symbol][setupFamily][variant] = cell;
    allCells.push(cell);
    setupsSeen.add(setupFamily);
    variantsSeen.add(`${setupFamily}|${variant}`);
    cellsByTier[scored.tier]++;
    if (!cellsBySetupTier[setupFamily]) cellsBySetupTier[setupFamily] = { STRONG: 0, OK: 0, WEAK: 0, AVOID: 0 };
    cellsBySetupTier[setupFamily][scored.tier]++;
    const vKey = `${setupFamily} / ${variant}`;
    if (!cellsByVariantTier[vKey]) cellsByVariantTier[vKey] = { STRONG: 0, OK: 0, WEAK: 0, AVOID: 0 };
    cellsByVariantTier[vKey][scored.tier]++;
  }

  return {
    matrix,
    allCells,
    summary: {
      totalAssets: Object.keys(matrix).length,
      totalCells: allCells.length,
      setupsCovered: Array.from(setupsSeen).sort(),
      uniqueVariants: variantsSeen.size,
      byTier: cellsByTier,
      bySetup: cellsBySetupTier,
      byVariant: cellsByVariantTier,
    },
  };
}

function topVariantsBySetup(allCells, perSetup = 10) {
  const out = {};
  const setups = [...new Set(allCells.map(c => c.setup))].sort();
  for (const setup of setups) {
    const cells = allCells
      .filter(c => c.setup === setup && (c.tier === "STRONG" || c.tier === "OK") && c.metrics.trades >= 10 && !c.isUnknownVariant)
      .sort((a, b) => b.score - a.score || a.symbol.localeCompare(b.symbol))
      .slice(0, perSetup);
    out[setup] = cells;
  }
  return out;
}

function bestVariantsByAsset(allCells, assetQualityReport) {
  if (!assetQualityReport) return null;
  const tierBySymbol = {};
  for (const [sym, e] of Object.entries(assetQualityReport.assets || {})) tierBySymbol[sym] = e.tier;
  const out = {};
  const targetSymbols = Object.keys(tierBySymbol).filter(s => tierBySymbol[s] === "ELITE" || tierBySymbol[s] === "CORE").sort();
  for (const sym of targetSymbols) {
    const cells = allCells
      .filter(c => c.symbol === sym && (c.tier === "STRONG" || c.tier === "OK") && c.metrics.trades >= 10 && !c.isUnknownVariant && !c.nonPriority)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    if (cells.length) out[sym] = { overallTier: tierBySymbol[sym], top: cells };
  }
  return out;
}

function variantsToAbandon(allCells, perVariantStats) {
  // Une variante mérite d'être abandonnée si :
  // - elle n'a aucune cellule STRONG, ET
  // - elle a au moins 10 cellules observées (sinon échantillon trop petit pour conclure), ET
  // - le ratio AVOID / total > 0.7
  const variantsAggregate = new Map();
  for (const cell of allCells) {
    if (cell.isUnknownVariant) continue;
    const key = `${cell.setup} / ${cell.variant}`;
    if (!variantsAggregate.has(key)) variantsAggregate.set(key, { setup: cell.setup, variant: cell.variant, cells: 0, byTier: { STRONG: 0, OK: 0, WEAK: 0, AVOID: 0 }, totalTrades: 0 });
    const agg = variantsAggregate.get(key);
    agg.cells++;
    agg.byTier[cell.tier]++;
    agg.totalTrades += cell.metrics.trades;
  }
  const candidates = [];
  for (const agg of variantsAggregate.values()) {
    if (agg.cells < 10) continue;
    if (agg.byTier.STRONG > 0) continue;
    const avoidRatio = agg.byTier.AVOID / agg.cells;
    if (avoidRatio > 0.7) {
      candidates.push({
        setup: agg.setup,
        variant: agg.variant,
        cells: agg.cells,
        strong: agg.byTier.STRONG,
        ok: agg.byTier.OK,
        weak: agg.byTier.WEAK,
        avoid: agg.byTier.AVOID,
        avoidRatio,
        totalTrades: agg.totalTrades,
      });
    }
  }
  candidates.sort((a, b) => b.avoidRatio - a.avoidRatio || b.cells - a.cells);
  return candidates;
}

function focusCases(matrix, symbols) {
  const out = {};
  for (const sym of symbols) {
    if (!matrix[sym]) { out[sym] = null; continue; }
    const flat = [];
    for (const [setup, variants] of Object.entries(matrix[sym])) {
      for (const cell of Object.values(variants)) flat.push(cell);
    }
    flat.sort((a, b) => b.score - a.score || a.setup.localeCompare(b.setup) || a.variant.localeCompare(b.variant));
    out[sym] = flat;
  }
  return out;
}

async function tryReadAssetQualityReport() {
  try {
    await access(ASSET_QUALITY_REPORT);
    return JSON.parse(await readFile(ASSET_QUALITY_REPORT, "utf8"));
  } catch (_err) {
    return null;
  }
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Setup × Variant Matrix — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/setup-variant-matrix-v1.mjs\`.`);
  lines.push("");

  // 1. Synthèse globale
  lines.push("## 1. Synthèse globale");
  lines.push("");
  lines.push(`- Actifs analysés : **${report.summary.totalAssets}**`);
  lines.push(`- Variantes distinctes (setup × variant) : **${report.summary.uniqueVariants}**`);
  lines.push(`- Cellules (actif × setup × variant) : **${report.summary.totalCells}**`);
  lines.push(`- Setups couverts : ${report.summary.setupsCovered.join(", ")}`);
  lines.push("");
  lines.push("Répartition globale des cellules :");
  lines.push("");
  lines.push("| Tier | Nombre |");
  lines.push("|---|---:|");
  for (const tier of ["STRONG", "OK", "WEAK", "AVOID"]) lines.push(`| ${tier} | ${report.summary.byTier[tier]} |`);
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
  lines.push("Par variante (toutes setups confondus) :");
  lines.push("");
  lines.push("| Variante | STRONG | OK | WEAK | AVOID | Total |");
  lines.push("|---|---:|---:|---:|---:|---:|");
  const variantRows = Object.entries(report.summary.byVariant)
    .map(([k, v]) => ({ key: k, ...v, total: v.STRONG + v.OK + v.WEAK + v.AVOID }))
    .sort((a, b) => (b.STRONG + b.OK) - (a.STRONG + a.OK) || a.key.localeCompare(b.key));
  for (const v of variantRows) lines.push(`| ${v.key} | ${v.STRONG} | ${v.OK} | ${v.WEAK} | ${v.AVOID} | ${v.total} |`);
  lines.push("");

  // 2. Meilleures variantes par setup
  lines.push("## 2. Meilleures variantes par setup");
  lines.push("");
  for (const setup of report.summary.setupsCovered) {
    lines.push(`### ${setup}`);
    if (NON_PRIORITY_SETUPS.has(setup)) lines.push("_(setup non prioritaire)_");
    lines.push("");
    const top = report.topBySetup[setup] || [];
    if (!top.length) { lines.push("_aucune cellule STRONG/OK avec ≥ 10 trades_"); lines.push(""); continue; }
    lines.push("| Symbole | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD |");
    lines.push("|---|---|---|---:|---:|---:|---:|---:|---:|");
    for (const c of top) {
      lines.push(`| ${c.symbol} | ${c.variant} | ${c.tier} | ${c.score} | ${c.metrics.trades} | ${fmt(c.metrics.winrate, 1)}% | ${fmt(c.metrics.expectancy)} | ${fmt(c.metrics.profitFactor)} | ${fmt(c.metrics.maxDrawdown)} |`);
    }
    lines.push("");
  }

  // 3. Meilleures variantes par actif ELITE/CORE
  lines.push("## 3. Meilleures variantes par actif ELITE / CORE");
  lines.push("");
  if (!report.bestByAsset) {
    lines.push("_`asset-quality-report.json` introuvable — lancer `node tools/backtests/asset-quality-engine-v1.mjs` puis relancer ce script._");
    lines.push("");
  } else {
    lines.push("Pour chaque actif ELITE ou CORE, les 3 meilleures variantes (hors setups non prioritaires) :");
    lines.push("");
    lines.push("| Symbole | Tier global | Top 1 (variante / score) | Top 2 | Top 3 |");
    lines.push("|---|---|---|---|---|");
    const entries = Object.entries(report.bestByAsset).sort(([, a], [, b]) => {
      const tierRank = { ELITE: 0, CORE: 1 };
      if (tierRank[a.overallTier] !== tierRank[b.overallTier]) return tierRank[a.overallTier] - tierRank[b.overallTier];
      return (b.top[0]?.score ?? 0) - (a.top[0]?.score ?? 0);
    });
    for (const [sym, payload] of entries) {
      const fmtCell = c => c ? `\`${c.variant}\` (${c.score}, ${c.tier}, ${c.metrics.trades}t)` : "—";
      lines.push(`| ${sym} | ${payload.overallTier} | ${fmtCell(payload.top[0])} | ${fmtCell(payload.top[1])} | ${fmtCell(payload.top[2])} |`);
    }
    lines.push("");
  }

  // 4. Variantes à abandonner
  lines.push("## 4. Variantes à abandonner");
  lines.push("");
  if (!report.variantsToAbandon.length) {
    lines.push("_aucune variante n'atteint le seuil d'abandon (≥ 10 cellules observées et ratio AVOID > 0.70 sans aucune STRONG)_");
    lines.push("");
  } else {
    lines.push("Critères : ≥ 10 actifs testés, aucune cellule STRONG, ratio AVOID > 0.70.");
    lines.push("");
    lines.push("| Setup | Variante | Cellules | STRONG | OK | WEAK | AVOID | Ratio AVOID |");
    lines.push("|---|---|---:|---:|---:|---:|---:|---:|");
    for (const v of report.variantsToAbandon) {
      lines.push(`| ${v.setup} | ${v.variant} | ${v.cells} | ${v.strong} | ${v.ok} | ${v.weak} | ${v.avoid} | ${(v.avoidRatio * 100).toFixed(0)}% |`);
    }
    lines.push("");
  }

  // 5. Cas importants
  lines.push("## 5. Cas importants");
  lines.push("");
  for (const sym of FOCUS_SYMBOLS) {
    lines.push(`### ${sym}`);
    lines.push("");
    const cells = report.focus[sym];
    if (cells === null) { lines.push("_actif absent des backtests_"); lines.push(""); continue; }
    if (!cells.length) { lines.push("_aucune cellule_"); lines.push(""); continue; }
    lines.push("| Setup | Variante | Tier | Score | Trades | Winrate | Exp | PF | DD | Raison |");
    lines.push("|---|---|---|---:|---:|---:|---:|---:|---:|---|");
    for (const c of cells) {
      lines.push(`| ${c.setup} | ${c.variant} | ${c.tier} | ${c.score} | ${c.metrics.trades} | ${fmt(c.metrics.winrate, 1)}% | ${fmt(c.metrics.expectancy)} | ${fmt(c.metrics.profitFactor)} | ${fmt(c.metrics.maxDrawdown)} | ${c.reason || "—"} |`);
    }
    lines.push("");
  }

  // 6. Limites de fiabilité
  lines.push("## 6. Limites de fiabilité");
  lines.push("");
  lines.push("- **Variantes nommées différemment selon la source** : `pullback_rsi42_58_chg20_5_stop0.1` (multi-setup-grid) et `rsi42_58_chg20_5_stop0.1` (pullback-grid + walk-forward) sont sémantiquement proches mais nommées différemment. Pas de fusion automatique — chaque label est traité comme une variante distincte pour ne pas inventer une équivalence non vérifiée.");
  lines.push("- **UNKNOWN_VARIANT** : 8 records (results-pullback-2025.json) n'exposent pas de nom de variante. Comptés sous `UNKNOWN_VARIANT`, exclus des sections \"meilleures variantes\" et \"à abandonner\".");
  lines.push("- **Échantillons faibles** : une variante avec < 8 trades reçoit une pénalité de -25. Les cellules low-confidence (< 15 trades) sont marquées MEDIUM/LOW pour rappel.");
  lines.push("- **Régime** : la pénalité RISK_OFF n'est appliquée qu'à `RELATIVE_STRENGTH_ROTATION` (seul setup où on dispose des deux modes ALL_REGIMES / NO_RISK_OFF).");
  lines.push("- **Pas d'allocation** : cette matrice dit quoi trader, pas combien. La sizing reste à concevoir en fonction du tier (STRONG / OK / WEAK) et du contexte régime.");
  lines.push("- **Pas de walk-forward strict** : les variantes sont scorées sur l'ensemble des années disponibles. Une variante peut paraître STRONG sur l'historique tout en surajustant — c'est précisément ce que la priorité #2 de SESSION.md adresse (Walk-forward réel).");
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
  ].join("\n");
}

async function main() {
  console.log("[setup-variant-matrix] démarrage");
  const files = await listJsonFiles({ inputDirs: INPUT_DIRS, skipFilenames: SKIP_FILENAMES });
  if (!files.length) {
    console.error("[setup-variant-matrix] aucun fichier .json trouvé");
    console.error(expectedFormatMessage());
    process.exit(1);
  }
  console.log(`[setup-variant-matrix] ${files.length} fichier(s) candidat(s)`);

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
      console.warn(`  ⊘ ${basename(file)} — shape non reconnue ou aucun record exploitable`);
      continue;
    }
    console.log(`  ✓ ${basename(file)} — ${records.length} record(s) via ${adapter}`);
    allRecords.push(...records);
    usedSources.push(file);
  }
  if (!allRecords.length) {
    console.error("[setup-variant-matrix] aucun record exploitable extrait");
    console.error(expectedFormatMessage());
    process.exit(1);
  }
  console.log(`[setup-variant-matrix] ${allRecords.length} record(s) extrait(s) au total`);

  const { matrix, summary, allCells } = buildMatrix(allRecords);
  const topBySetup = topVariantsBySetup(allCells);
  const assetQualityReport = await tryReadAssetQualityReport();
  if (!assetQualityReport) {
    console.warn("[setup-variant-matrix] asset-quality-report.json introuvable — section 'meilleures variantes par actif' vide");
  }
  const bestByAsset = bestVariantsByAsset(allCells, assetQualityReport);
  const variantsToAbandonList = variantsToAbandon(allCells);
  const focus = focusCases(matrix, FOCUS_SYMBOLS);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceFiles: usedSources.map(f => relative(REPO_ROOT, f)),
    summary,
    matrix,
    topBySetup,
    bestByAsset,
    variantsToAbandon: variantsToAbandonList,
    focus,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[setup-variant-matrix] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Résumé : ${summary.totalAssets} actifs / ${summary.uniqueVariants} variantes / ${summary.totalCells} cellules — STRONG ${summary.byTier.STRONG}, OK ${summary.byTier.OK}, WEAK ${summary.byTier.WEAK}, AVOID ${summary.byTier.AVOID}`);
  console.log(`Variantes à abandonner : ${variantsToAbandonList.length}`);
}

main().catch(err => {
  console.error("[setup-variant-matrix] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
