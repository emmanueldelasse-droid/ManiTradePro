// tools/backtests/asset-quality-engine-v1.mjs
//
// Moteur officiel de classification d'actifs ManiTradePro.
// Lit les JSON de backtest présents dans tools/backtests/ (et tools/backtests/output/),
// agrège les performances par actif, attribue un score 0-100, classe chaque actif
// en ELITE / CORE / TACTICAL / BLACKLIST, puis écrit :
//   - tools/backtests/output/asset-quality-report.json
//   - tools/backtests/output/asset-quality-report.md
//
// Aucune donnée n'est inventée. Si aucun JSON exploitable n'est trouvé, le script
// affiche une erreur claire avec le format attendu et sort avec le code 1.
//
// Usage : node tools/backtests/asset-quality-engine-v1.mjs

import { readFile, writeFile, mkdir } from "node:fs/promises";
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
const OUTPUT_JSON = join(OUTPUT_DIR, "asset-quality-report.json");
const OUTPUT_MD = join(OUTPUT_DIR, "asset-quality-report.md");

// Fichiers à ignorer côté input (sorties du moteur lui-même, données brutes)
const SKIP_FILENAMES = new Set(["asset-quality-report.json", "asset-setup-matrix.json"]);

// Seuils de score (cf. CLAUDE.md + spec asset-quality)
const TIER_THRESHOLDS = {
  ELITE: 80,
  CORE: 65,
  TACTICAL: 50,
};

// Score 0-100 + classification + raisons (forces/risques)
function scoreSymbolAggregate(agg) {
  const strengths = [];
  const risks = [];
  let score = 0;

  const best = agg.bestSetup;
  const overall = agg.overall;

  // expectancy (0-25)
  const exp = best?.expectancy ?? overall.expectancy ?? 0;
  if (exp >= 1.0) { score += 25; strengths.push(`espérance forte (${exp.toFixed(2)})`); }
  else if (exp >= 0.5) { score += 20; strengths.push(`espérance solide (${exp.toFixed(2)})`); }
  else if (exp >= 0.3) { score += 15; strengths.push(`espérance positive (${exp.toFixed(2)})`); }
  else if (exp > 0) { score += 8; }
  else { risks.push(`espérance non positive (${exp.toFixed(2)})`); }

  // profit factor (0-20)
  const pf = best?.profitFactor ?? overall.profitFactor ?? 0;
  if (pf >= 2.0) { score += 20; strengths.push(`PF élevé (${pf.toFixed(2)})`); }
  else if (pf >= 1.5) { score += 15; strengths.push(`PF solide (${pf.toFixed(2)})`); }
  else if (pf >= 1.2) { score += 10; }
  else if (pf >= 1.0) { score += 5; }
  else { risks.push(`PF sous 1 (${pf.toFixed(2)})`); }

  // winrate (0-15)
  const wr = best?.winrate ?? overall.winrate ?? 0;
  if (wr >= 60) { score += 15; strengths.push(`gagne ${wr.toFixed(1)} % des trades`); }
  else if (wr >= 55) { score += 12; }
  else if (wr >= 50) { score += 8; }
  else if (wr >= 45) { score += 4; }

  // sample size (0-10)
  const totalTrades = overall.trades || 0;
  if (totalTrades >= 100) { score += 10; }
  else if (totalTrades >= 50) { score += 7; }
  else if (totalTrades >= 30) { score += 5; }
  else if (totalTrades >= 15) { score += 2; }

  // drawdown vs gain net (0-10)
  // On évalue la rentabilité à partir du best setup en priorité (sinon overall).
  // Mélanger totalR (RS, unité = R-multiple) et totalPnl (pullback, unité = %)
  // dans la même somme overall fausserait le verdict — on regarde donc le best
  // setup d'abord, et on retient l'unité qui le concerne.
  const bestTr = best?.totalR ?? best?.totalPnl ?? null;
  const overallTr = overall.totalR ?? overall.totalPnl ?? null;
  const tr = bestTr !== null ? bestTr : overallTr;
  const dd = overall.maxDrawdown ?? 0;
  if (tr !== null && tr > 0 && dd > 0) {
    const ratio = dd / Math.abs(tr);
    if (ratio < 0.3) { score += 10; strengths.push(`drawdown faible (${ratio.toFixed(2)} × gain)`); }
    else if (ratio < 0.5) { score += 7; }
    else if (ratio < 1.0) { score += 4; }
    else { risks.push(`drawdown supérieur au gain (${ratio.toFixed(2)} × gain)`); }
  } else if (tr !== null && tr > 0 && dd === 0) {
    score += 8;
  } else if (tr !== null && tr <= 0 && exp <= 0) {
    risks.push("aucun gain net cumulé observé");
  }

  // longest loss streak (0-5)
  const lls = overall.longestLossStreak ?? 0;
  if (lls > 0) {
    if (lls <= 5) { score += 5; }
    else if (lls <= 10) { score += 3; }
    else if (lls <= 15) { score += 1; }
    else { risks.push(`série de pertes longue (${lls} consécutives)`); }
  } else {
    score += 5;
  }

  // multi-year stability (0-10)
  const yearsCount = agg.totalYearsObserved;
  const profitableYears = agg.profitableYearsCount;
  if (yearsCount >= 3 && profitableYears / yearsCount >= 0.66) {
    score += 10;
    strengths.push(`stable sur ${profitableYears}/${yearsCount} années`);
  } else if (yearsCount >= 2 && profitableYears / yearsCount >= 0.5) {
    score += 5;
  } else if (yearsCount <= 1) {
    risks.push("performance observée sur une seule période");
  }

  // setup compatibility (0-5)
  const setupsCompat = agg.compatibleSetupsCount;
  if (setupsCompat >= 2) { score += 5; strengths.push(`compatible avec ${setupsCompat} familles de setup`); }
  else if (setupsCompat >= 1) { score += 2; }
  else { risks.push("aucun setup réellement compatible"); }

  // PÉNALITÉS
  if (totalTrades < 15) {
    score -= 15;
    risks.push("échantillon trop faible (moins de 15 trades)");
  }
  if (yearsCount <= 1) {
    score -= 10;
  }
  if (agg.riskOffPenalty) {
    score -= 10;
    risks.push("performance fortement dégradée en RISK_OFF");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Tier
  let tier;
  const expPos = exp > 0;
  const blacklistByMetrics = pf > 0 && pf < 1;
  const blacklistByExpectancy = exp <= 0 && totalTrades >= 30;
  if (score < TIER_THRESHOLDS.TACTICAL || blacklistByMetrics || blacklistByExpectancy) {
    tier = "BLACKLIST";
  } else if (score >= TIER_THRESHOLDS.ELITE && pf >= 1.4 && expPos && (yearsCount >= 2 || setupsCompat >= 2) && (tr !== null && tr > 0 && (dd === 0 || dd / Math.abs(tr) < 1.0))) {
    tier = "ELITE";
  } else if (score >= TIER_THRESHOLDS.CORE && pf >= 1.1 && expPos) {
    tier = "CORE";
  } else {
    tier = "TACTICAL";
  }

  // Confidence
  let confidence;
  if (totalTrades >= 100 && yearsCount >= 3) confidence = "HIGH";
  else if (totalTrades >= 30 && yearsCount >= 2) confidence = "MEDIUM";
  else confidence = "LOW";

  // Allocation profile
  const allocByTier = { ELITE: "strong", CORE: "normal", TACTICAL: "reduced", BLACKLIST: "none" };
  const recommendedAllocationProfile = allocByTier[tier];

  return { tier, qualityScore: score, confidence, strengths, risks, recommendedAllocationProfile };
}

function aggregateBySymbol(records) {
  const canonical = pickCanonicalRecords(records);
  const bySymbol = new Map();
  // Première passe : agrégats principaux à partir des records canoniques uniquement
  for (const rec of canonical) {
    if (!bySymbol.has(rec.symbol)) {
      bySymbol.set(rec.symbol, {
        symbol: rec.symbol,
        records: [],
        bySetupFamily: new Map(),
        byYear: new Map(),
        byRegimeMode: new Map(),
        sources: new Set(),
        setupFamilies: new Set(),
      });
    }
    const agg = bySymbol.get(rec.symbol);
    agg.records.push(rec);
    agg.sources.add(rec.source);
    agg.setupFamilies.add(rec.setupFamily);
    if (!agg.bySetupFamily.has(rec.setupFamily)) agg.bySetupFamily.set(rec.setupFamily, emptyBucket());
    pushToBucket(agg.bySetupFamily.get(rec.setupFamily), rec);
    if (rec.year) {
      if (!agg.byYear.has(rec.year)) agg.byYear.set(rec.year, emptyBucket());
      pushToBucket(agg.byYear.get(rec.year), rec);
    }
  }
  // Deuxième passe : byRegimeMode utilise TOUS les records (y compris les
  // doublons ALL_REGIMES vs NO_RISK_OFF) pour permettre la comparaison régime.
  for (const rec of records) {
    if (!rec.regimeMode) continue;
    const agg = bySymbol.get(rec.symbol);
    if (!agg) continue;
    if (!agg.byRegimeMode.has(rec.regimeMode)) agg.byRegimeMode.set(rec.regimeMode, emptyBucket());
    pushToBucket(agg.byRegimeMode.get(rec.regimeMode), rec);
  }

  // Synthèse par actif
  const result = {};
  for (const [symbol, agg] of bySymbol.entries()) {
    const bySetup = {};
    for (const [family, bucket] of agg.bySetupFamily.entries()) bySetup[family] = summarizeBucket(bucket);
    const byYear = {};
    for (const [year, bucket] of agg.byYear.entries()) byYear[year] = summarizeBucket(bucket);
    const byRegimeMode = {};
    for (const [rm, bucket] of agg.byRegimeMode.entries()) byRegimeMode[rm] = summarizeBucket(bucket);

    // Best setup : argmax expectancy parmi ceux ayant >= 10 trades
    let bestSetupName = null;
    let bestSetup = null;
    for (const [family, summary] of Object.entries(bySetup)) {
      if (summary.trades < 10 || summary.expectancy === null) continue;
      if (!bestSetup || summary.expectancy > bestSetup.expectancy) {
        bestSetup = summary; bestSetupName = family;
      }
    }
    // Si rien ne passe le filtre 10 trades, on prend l'agrégé global comme proxy
    if (!bestSetup) {
      const globalBucket = emptyBucket();
      for (const rec of agg.records) pushToBucket(globalBucket, rec);
      bestSetup = summarizeBucket(globalBucket);
      bestSetupName = "AGGREGATED";
    }

    // Overall agrégé toutes sources
    const globalBucket = emptyBucket();
    for (const rec of agg.records) pushToBucket(globalBucket, rec);
    const overall = summarizeBucket(globalBucket);

    // Comptes pour stabilité
    const yearsObserved = Object.keys(byYear);
    const profitableYearsCount = Object.values(byYear).filter(y => (y.expectancy ?? 0) > 0 && y.trades >= 5).length;
    const compatibleSetupsCount = Object.values(bySetup).filter(s => (s.expectancy ?? 0) > 0 && s.trades >= 10).length;

    // Pénalité RISK_OFF : si on dispose de ALL_REGIMES et NO_RISK_OFF, et que
    // NO_RISK_OFF donne un totalR significativement supérieur à ALL_REGIMES,
    // c'est que RISK_OFF dégrade le résultat pour cet actif.
    let riskOffPenalty = false;
    const allReg = byRegimeMode["ALL_REGIMES"];
    const noRiskOff = byRegimeMode["NO_RISK_OFF"];
    if (allReg && noRiskOff && allReg.totalR !== null && noRiskOff.totalR !== null) {
      // On considère qu'une perte de plus de 15 % de totalR par retrait de RISK_OFF est significative
      const drop = noRiskOff.totalR - allReg.totalR;
      if (drop > Math.abs(allReg.totalR) * 0.15) riskOffPenalty = true;
    }

    const aggregateOut = {
      bestSetup,
      bestSetupName,
      overall,
      totalYearsObserved: yearsObserved.length,
      profitableYearsCount,
      compatibleSetupsCount,
      riskOffPenalty,
    };
    const scored = scoreSymbolAggregate(aggregateOut);

    result[symbol] = {
      symbol,
      tier: scored.tier,
      qualityScore: scored.qualityScore,
      confidence: scored.confidence,
      metrics: {
        overall,
        bestSetup: { name: bestSetupName, ...bestSetup },
        bySetupFamily: bySetup,
        byYear,
        byRegimeMode,
        sources: Array.from(agg.sources).sort(),
        setupFamiliesCount: agg.setupFamilies.size,
        yearsObserved: yearsObserved.sort(),
        profitableYearsCount,
        compatibleSetupsCount,
        riskOffPenalty,
      },
      strengths: scored.strengths,
      risks: scored.risks,
      recommendedAllocationProfile: scored.recommendedAllocationProfile,
    };
  }
  return result;
}

function buildReport(assets, sourceFiles) {
  const tiers = { ELITE: [], CORE: [], TACTICAL: [], BLACKLIST: [] };
  for (const [symbol, entry] of Object.entries(assets)) {
    if (tiers[entry.tier]) tiers[entry.tier].push(symbol);
  }
  for (const tier of Object.keys(tiers)) {
    tiers[tier].sort((a, b) => (assets[b].qualityScore - assets[a].qualityScore) || a.localeCompare(b));
  }
  const totalAssets = Object.keys(assets).length;
  return {
    generatedAt: new Date().toISOString(),
    sourceFiles: sourceFiles.map(f => relative(REPO_ROOT, f)),
    summary: {
      totalAssets,
      elite: tiers.ELITE.length,
      core: tiers.CORE.length,
      tactical: tiers.TACTICAL.length,
      blacklist: tiers.BLACKLIST.length,
    },
    tiers,
    assets,
  };
}

function fmt(n, digits = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(digits);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Asset Quality Report — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/asset-quality-engine-v1.mjs\`.`);
  lines.push("");
  lines.push("## Synthèse");
  lines.push("");
  lines.push(`- Actifs analysés : **${report.summary.totalAssets}**`);
  lines.push(`- ELITE : ${report.summary.elite}`);
  lines.push(`- CORE : ${report.summary.core}`);
  lines.push(`- TACTICAL : ${report.summary.tactical}`);
  lines.push(`- BLACKLIST : ${report.summary.blacklist}`);
  lines.push("");
  lines.push("## Sources lues");
  lines.push("");
  for (const f of report.sourceFiles) lines.push(`- \`${f}\``);
  lines.push("");

  const tierTitles = {
    ELITE: "ELITE — actifs majeurs (allocation forte)",
    CORE: "CORE — actifs fiables (allocation normale)",
    TACTICAL: "TACTICAL — actifs opportunistes (allocation réduite)",
    BLACKLIST: "BLACKLIST — actifs incompatibles",
  };
  for (const tier of ["ELITE", "CORE", "TACTICAL", "BLACKLIST"]) {
    const symbols = report.tiers[tier];
    lines.push(`## ${tierTitles[tier]}`);
    lines.push("");
    if (!symbols.length) { lines.push("_aucun actif dans cette catégorie_"); lines.push(""); continue; }
    lines.push("| Symbole | Score | Confiance | Meilleur setup | Trades | Winrate | Expectancy | PF | TotalR | DrawDown |");
    lines.push("|---|---:|---|---|---:|---:|---:|---:|---:|---:|");
    for (const sym of symbols) {
      const a = report.assets[sym];
      const best = a.metrics.bestSetup;
      const ov = a.metrics.overall;
      const tr = ov.totalR !== null ? fmt(ov.totalR, 2) : (ov.totalPnl !== null ? fmt(ov.totalPnl, 2) : "n/a");
      lines.push(`| ${sym} | ${a.qualityScore} | ${a.confidence} | ${best.name} | ${ov.trades} | ${fmt(ov.winrate, 1)}% | ${fmt(best.expectancy, 2)} | ${fmt(best.profitFactor, 2)} | ${tr} | ${fmt(ov.maxDrawdown, 2)} |`);
    }
    lines.push("");
  }

  lines.push("## Détail par actif");
  lines.push("");
  const ordered = Object.values(report.assets).sort((a, b) => b.qualityScore - a.qualityScore || a.symbol.localeCompare(b.symbol));
  for (const a of ordered) {
    const ov = a.metrics.overall;
    const best = a.metrics.bestSetup;
    lines.push(`### ${a.symbol} — ${a.tier} (score ${a.qualityScore}, confiance ${a.confidence})`);
    lines.push("");
    lines.push(`- Profil d'allocation : \`${a.recommendedAllocationProfile}\``);
    lines.push(`- Setups testés : ${a.metrics.setupFamiliesCount} (${a.metrics.compatibleSetupsCount} compatible(s))`);
    lines.push(`- Années observées : ${a.metrics.yearsObserved.length > 0 ? a.metrics.yearsObserved.join(", ") : "n/a"} (${a.metrics.profitableYearsCount} profitable(s))`);
    lines.push(`- Meilleur setup : \`${best.name}\` — trades ${best.trades}, winrate ${fmt(best.winrate, 1)}%, expectancy ${fmt(best.expectancy, 2)}, PF ${fmt(best.profitFactor, 2)}`);
    lines.push(`- Agrégé global : trades ${ov.trades}, winrate ${fmt(ov.winrate, 1)}%, expectancy ${fmt(ov.expectancy, 2)}, PF ${fmt(ov.profitFactor, 2)}, totalR ${fmt(ov.totalR, 2)}, drawdown ${fmt(ov.maxDrawdown, 2)}, série perdante max ${ov.longestLossStreak}`);
    if (a.strengths.length) lines.push(`- Forces : ${a.strengths.join(" ; ")}`);
    if (a.risks.length) lines.push(`- Risques : ${a.risks.join(" ; ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

function expectedFormatMessage() {
  return [
    "",
    "Aucun JSON exploitable n'a été trouvé.",
    "",
    "Le moteur cherche des fichiers .json dans :",
    "  - tools/backtests/",
    "  - tools/backtests/output/",
    "",
    "Format attendu (l'un des suivants — détecté automatiquement) :",
    "",
    "1) Tableau plat de résultats par symbole :",
    '   [ { "symbol": "NVDA", "trades": 30, "wins": 18, "losses": 12,',
    '       "winrate": 60.0, "expectancy": 0.85, "profitFactor": 1.7,',
    '       "totalR": 25.5, "maxDrawdown": 8.2, "longestLossStreak": 4 } ]',
    "",
    "2) Tableau de variantes, chacune avec bySymbol[] :",
    '   [ { "variant": "pullback_xxx", ...metrics, "bySymbol": [ { ... } ] } ]',
    "",
    "3) Résultats Relative Strength Rotation :",
    '   { "overall": { "bySymbol": [ { "symbol": "...", "variant": "rs_...", ...metrics } ] },',
    '     "yearly": { "2024": { "bySymbol": [...] } } }',
    "",
    "4) Grille multi-setup :",
    '   { "overall": { "bySymbolSetup": [ { "setupId": "...", "variant": "...", "symbol": "...", ...metrics } ] },',
    '     "yearly": { ... } }',
    "",
    "5) Walk-forward pullback :",
    '   { "overall": [ { "variant": "...", "bySymbol": [ {...} ] } ],',
    '     "yearly": { "2024": [ { "variant": "...", "bySymbol": [...] } ] } }',
    "",
    "Champs minimaux pour chaque enregistrement de symbole :",
    "  - symbol (string)",
    "  - trades (number > 0)",
    "  - expectancy ou totalR ou totalPnl (number)",
    "Champs optionnels mais recommandés :",
    "  - wins, losses, winrate, profitFactor, maxDrawdown, longestLossStreak",
    "",
  ].join("\n");
}

async function main() {
  console.log("[asset-quality-engine] démarrage");
  const files = await listJsonFiles({ inputDirs: INPUT_DIRS, skipFilenames: SKIP_FILENAMES });
  if (!files.length) {
    console.error("[asset-quality-engine] aucun fichier .json trouvé");
    console.error(expectedFormatMessage());
    process.exit(1);
  }
  console.log(`[asset-quality-engine] ${files.length} fichier(s) candidat(s)`);

  const allRecords = [];
  const usedSources = [];
  const skipped = [];
  for (const file of files) {
    let parsed;
    try {
      const raw = await readFile(file, "utf8");
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn(`  ✗ ${basename(file)} — JSON invalide (${err?.message || err})`);
      skipped.push({ file, reason: "json_invalide" });
      continue;
    }
    const { records, adapter } = extractRecords(parsed, basename(file));
    if (!records.length) {
      console.warn(`  ⊘ ${basename(file)} — shape non reconnue ou aucun enregistrement par symbole`);
      skipped.push({ file, reason: "shape_inconnue" });
      continue;
    }
    console.log(`  ✓ ${basename(file)} — ${records.length} enregistrement(s) via ${adapter}`);
    allRecords.push(...records);
    usedSources.push(file);
  }

  if (!allRecords.length) {
    console.error("[asset-quality-engine] aucun enregistrement exploitable extrait");
    console.error(expectedFormatMessage());
    process.exit(1);
  }
  console.log(`[asset-quality-engine] ${allRecords.length} enregistrement(s) extrait(s) au total`);

  const assets = aggregateBySymbol(allRecords);
  const report = buildReport(assets, usedSources);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[asset-quality-engine] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Résumé : ${report.summary.totalAssets} actif(s) classé(s) — ELITE ${report.summary.elite}, CORE ${report.summary.core}, TACTICAL ${report.summary.tactical}, BLACKLIST ${report.summary.blacklist}`);
  if (skipped.length) {
    console.log(`Fichiers ignorés : ${skipped.length}`);
  }
}

main().catch(err => {
  console.error("[asset-quality-engine] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
