// tools/backtests/rolling-walkforward-validator-v1.mjs
//
// Walk-forward roulant multi-splits — ManiTradePro.
// Étend le walk-forward-regime-validator-v1 qui n'utilisait qu'un seul
// split (TRAIN 2021-2023 / TEST 2024-2025). Ce moteur teste plusieurs
// fenêtres temporelles indépendantes pour mesurer la robustesse réelle
// des cellules (symbol × setup × variant × regime).
//
// RÈGLE ABSOLUE : ce moteur ne passe aucun ordre, ne prépare aucun ordre
// broker, ne touche aucun endpoint live. Il ne modifie pas non plus les
// validateurs existants — il coexiste avec walk-forward-regime-validator-v1
// comme couche de robustesse plus exigeante.
//
// Entrées :
//   - tools/backtests/results-pullback-yearly-walkforward.json
//   - tools/backtests/results-multi-setup-grid.json
//   - tools/backtests/results-relative-strength-rotation-regime-v1.json
//
// Sorties :
//   - tools/backtests/output/rolling-walkforward-validator.json
//   - tools/backtests/output/rolling-walkforward-validator.md
//
// Splits effectivement utilisés (adaptés aux années disponibles : 2021-2025
// pour multi-grid et RS, 2022-2025 pour Pullback) :
//   S1 : TRAIN [2021, 2022]       → TEST [2023]
//   S2 : TRAIN [2021, 2022, 2023] → TEST [2024]   (≡ ancien split unique élargi)
//   S3 : TRAIN [2022, 2023, 2024] → TEST [2025]   (rolling)
//
// Le brief original suggérait aussi TRAIN [2020-...] mais 2020 n'est pas
// dans les sources actuelles. Documenté ici et dans le rapport.
//
// Verdict par cellule :
//   ROBUST            : PASS sur tous les splits valides, faible variance
//   STABLE            : PASS ≥ 75 % des splits, variance acceptable
//   FRAGILE           : PASS partiel ou variance élevée
//   OVERFIT           : train consistant mais test échoue majoritairement
//   INSUFFICIENT_DATA : moins de 2 splits valides
//
// Le moteur ne PROMEUT JAMAIS — confirme, dégrade ou invalide seulement.
//
// Usage : node tools/backtests/rolling-walkforward-validator-v1.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import {
  emptyBucket,
  pushToBucket,
  summarizeBucket,
  toNumberOrNull,
  inferSetupFamily,
  listJsonFiles,
} from "./lib/backtest-records.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const INPUT_DIRS = [join(REPO_ROOT, "tools", "backtests"), join(REPO_ROOT, "tools", "backtests", "output")];
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUTPUT_JSON = join(OUTPUT_DIR, "rolling-walkforward-validator.json");
const OUTPUT_MD = join(OUTPUT_DIR, "rolling-walkforward-validator.md");

// Filtres pour ne pas relire nos propres outputs
const SKIP_FILENAMES = new Set([
  "asset-quality-report.json",
  "asset-setup-matrix.json",
  "setup-variant-matrix.json",
  "variant-regime-matrix.json",
  "walk-forward-regime-validator.json",
  "tradable-universe.json",
  "allocation-plan.json",
  "allocation-plan-v2.json",
  "allocation-plan-friction-adjusted.json",
  "friction-adjusted-report.json",
  "theme-classification-v2.json",
  "quant-pipeline-run-summary.json",
  "rolling-walkforward-validator.json",
]);

// === Définition des splits ===
//
// Adapté aux années disponibles (2021-2025 pour multi-grid et RS, 2022-2025
// pour pullback). Si un split référence une année absente, il est marqué
// comme partiellement disponible (cellule notée selon ce qu'elle a).
const SPLITS = [
  { id: "S1", train: ["2021", "2022"], test: ["2023"], description: "TRAIN 2021-2022 → TEST 2023 (expanding)" },
  { id: "S2", train: ["2021", "2022", "2023"], test: ["2024"], description: "TRAIN 2021-2023 → TEST 2024 (expanding, ≡ ancien split unique élargi)" },
  { id: "S3", train: ["2022", "2023", "2024"], test: ["2025"], description: "TRAIN 2022-2024 → TEST 2025 (rolling)" },
];

const CANONICAL_REGIME_MODE = "ALL_REGIMES";

// === Extraction des records bySymbolByRegime avec year tag ===
// (logique copiée à dessein de walk-forward-regime-validator-v1.mjs ;
// les deux moteurs sont volontairement découplés pour ne pas créer de
// dépendance entre validateurs.)
function extractSymbolRegimeYearlyRecords(data, source) {
  const out = [];
  const walk = (obj, year = null) => {
    if (!obj || typeof obj !== "object") return;
    if (Array.isArray(obj)) {
      const first = obj[0];
      if (obj.length && first && typeof first === "object" && first.symbol && first.regime && first.variant) {
        for (const raw of obj) {
          const symbol = String(raw.symbol || "").trim().toUpperCase();
          const variant = String(raw.variant || "").trim();
          const regime = String(raw.regime || "").trim();
          const regimeMode = String(raw.regimeMode || "").trim();
          const trades = toNumberOrNull(raw.trades);
          if (!symbol || !variant || !regime || !regimeMode) continue;
          if (trades === null || trades <= 0) continue;
          let winrate = toNumberOrNull(raw.winrate);
          if (winrate !== null && winrate > 0 && winrate <= 1) winrate *= 100;
          out.push({
            source,
            symbol,
            variant,
            regime,
            regimeMode,
            year,
            setupFamily: inferSetupFamily({ setupId: raw.setupId, variant, source }),
            trades,
            wins: toNumberOrNull(raw.wins),
            losses: toNumberOrNull(raw.losses),
            winrate,
            expectancy: toNumberOrNull(raw.expectancy),
            profitFactor: toNumberOrNull(raw.profitFactor),
            totalR: toNumberOrNull(raw.totalR),
            totalPnl: toNumberOrNull(raw.totalPnl),
            maxDrawdown: toNumberOrNull(raw.maxDrawdown),
            longestLossStreak: toNumberOrNull(raw.longestLossStreak),
          });
        }
        return;
      }
      for (const item of obj) walk(item, year);
      return;
    }
    for (const [key, val] of Object.entries(obj)) {
      const yearMatch = /^\d{4}$/.test(key);
      walk(val, yearMatch ? key : year);
    }
  };
  walk(data);
  return out;
}

// === Évaluation par split ===
//
// Mêmes règles PASS/FAIL que walk-forward-regime-validator-v1, plus
// strictes sur "INSUFFICIENT" pour un seul split (10 trades min).
function evaluateSplit(records, split) {
  const trainBucket = emptyBucket();
  const testBucket = emptyBucket();
  for (const r of records) {
    if (split.train.includes(r.year)) pushToBucket(trainBucket, r);
    else if (split.test.includes(r.year)) pushToBucket(testBucket, r);
  }
  const train = summarizeBucket(trainBucket);
  const test = summarizeBucket(testBucket);
  if (train.trades === 0 && test.trades === 0) {
    return { available: false, reason: "aucune donnée train ni test" };
  }
  if (train.trades === 0) return { available: false, reason: "aucune donnée train", train, test };
  if (test.trades === 0) return { available: false, reason: "aucune donnée test", train, test };
  if (test.trades < 10) {
    return { available: true, train, test, status: "INSUFFICIENT", reason: `seulement ${test.trades} trades test` };
  }
  const testExp = test.expectancy ?? 0;
  const testPf = test.profitFactor ?? 0;
  const testTr = test.totalR ?? test.totalPnl ?? null;
  const testDd = test.maxDrawdown ?? 0;
  if (testExp <= 0) {
    return { available: true, train, test, status: "FAIL", reason: `test expectancy ${testExp.toFixed(2)}` };
  }
  if (testPf > 0 && testPf < 1.0) {
    return { available: true, train, test, status: "FAIL", reason: `test PF ${testPf.toFixed(2)} < 1` };
  }
  if (testTr !== null && testTr > 0 && testDd > testTr * 2) {
    return { available: true, train, test, status: "FAIL", reason: `test drawdown > 2× totalR` };
  }
  if (testPf < 1.1) {
    return { available: true, train, test, status: "FAIL", reason: `test PF ${testPf.toFixed(2)} < 1.1` };
  }
  return { available: true, train, test, status: "PASS" };
}

function stddev(values) {
  if (values.length < 2) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function relativeStddev(values) {
  const sd = stddev(values);
  if (sd === null) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (Math.abs(mean) < 1e-9) return null;
  return sd / Math.abs(mean);
}

function performanceDrift(testExpectancies) {
  if (testExpectancies.length < 3) return "indéterminé";
  // Tendance simple : signe du delta entre premier et dernier
  const first = testExpectancies[0];
  const last = testExpectancies[testExpectancies.length - 1];
  const delta = last - first;
  const meanAbs = Math.abs(testExpectancies.reduce((s, v) => s + v, 0) / testExpectancies.length);
  if (meanAbs < 1e-9) return "plat";
  const relDelta = delta / meanAbs;
  if (relDelta > 0.3) return "rising";
  if (relDelta < -0.3) return "falling";
  return "stable";
}

// === Verdict ===
function deriveVerdict({ splitResults, splitsEvaluated, passCount, failCount, insufficientCount, expectancyRelStdDev, profitFactorRelStdDev, drift, train }) {
  if (splitsEvaluated < 2) {
    return { verdict: "INSUFFICIENT_DATA", confidence: "LOW", notes: ["< 2 splits valides"] };
  }
  // Cas OVERFIT : train consistant positif, test échoue ≥ 50 %
  const trainAllPositive = train.length > 0 && train.every((t) => (t?.expectancy ?? 0) > 0);
  if (trainAllPositive && (failCount / splitsEvaluated) >= 0.5) {
    return { verdict: "OVERFIT", confidence: "MEDIUM", notes: ["train consistant positif mais test échoue ≥ 50%"] };
  }
  // ROBUST : 100 % PASS + variance faible
  if (passCount === splitsEvaluated && passCount >= 2) {
    const varOk = (expectancyRelStdDev === null || expectancyRelStdDev < 0.5);
    if (varOk) {
      const notes = [];
      if (drift === "falling") notes.push("performance en baisse — surveiller");
      return { verdict: "ROBUST", confidence: "HIGH", notes };
    }
    return { verdict: "STABLE", confidence: "MEDIUM", notes: [`variance expectancy relative ${expectancyRelStdDev?.toFixed(2)}`] };
  }
  // STABLE : ≥ 75 % PASS
  if (passCount / splitsEvaluated >= 0.75) {
    return { verdict: "STABLE", confidence: "MEDIUM", notes: [`${passCount}/${splitsEvaluated} splits PASS`] };
  }
  // FRAGILE : entre 25 % et 75 % PASS, ou variance élevée
  if (passCount > 0) {
    return { verdict: "FRAGILE", confidence: "LOW", notes: [`${passCount}/${splitsEvaluated} splits PASS, variance non négligeable`] };
  }
  // Aucun PASS : si train positif → OVERFIT déjà attrapé ci-dessus
  return { verdict: "FRAGILE", confidence: "LOW", notes: ["aucun split PASS"] };
}

// === Main ===

async function main() {
  console.log("[rolling-walkforward-validator] démarrage");
  const files = await listJsonFiles({ inputDirs: INPUT_DIRS, skipFilenames: SKIP_FILENAMES });
  console.log(`[rolling-walkforward-validator] ${files.length} fichier(s) candidat(s)`);

  const allRecords = [];
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(file, "utf8"));
    } catch (err) {
      console.warn(`  ✗ ${file} — JSON invalide`);
      continue;
    }
    const recs = extractSymbolRegimeYearlyRecords(parsed, file);
    if (recs.length) console.log(`  ✓ ${relative(REPO_ROOT, file)} — ${recs.length} record(s)`);
    allRecords.push(...recs);
  }
  if (!allRecords.length) {
    console.error("[rolling-walkforward-validator] aucun record bySymbolByRegime yearly trouvé");
    process.exit(1);
  }
  console.log(`[rolling-walkforward-validator] ${allRecords.length} record(s) au total`);

  // Filtre : mode canonique ALL_REGIMES, année non null
  const filtered = allRecords.filter((r) => r.year !== null && r.regimeMode === CANONICAL_REGIME_MODE);
  console.log(`[rolling-walkforward-validator] ${filtered.length} record(s) canoniques après filtre`);

  // Groupage par (symbol, setupFamily, variant, regime)
  const cells = new Map();
  for (const r of filtered) {
    const key = `${r.symbol}|${r.setupFamily}|${r.variant}|${r.regime}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(r);
  }

  // Analyse par cellule
  const rows = [];
  const summary = { ROBUST: 0, STABLE: 0, FRAGILE: 0, OVERFIT: 0, INSUFFICIENT_DATA: 0 };

  for (const [key, records] of cells.entries()) {
    const [symbol, setup, variant, regime] = key.split("|");

    const splitResults = [];
    const testExpectancies = [];
    const testProfitFactors = [];
    const testDrawdowns = [];
    const trains = [];
    let passCount = 0;
    let failCount = 0;
    let insufficientCount = 0;
    let splitsEvaluated = 0;

    for (const split of SPLITS) {
      const r = evaluateSplit(records, split);
      const entry = { splitId: split.id, train: split.train, test: split.test, ...r };
      splitResults.push(entry);
      if (!r.available) continue;
      splitsEvaluated++;
      trains.push(r.train);
      testExpectancies.push(r.test.expectancy ?? 0);
      testProfitFactors.push(r.test.profitFactor ?? 0);
      testDrawdowns.push(r.test.maxDrawdown ?? 0);
      if (r.status === "PASS") passCount++;
      else if (r.status === "FAIL") failCount++;
      else if (r.status === "INSUFFICIENT") insufficientCount++;
    }

    const expectancyStdDev = stddev(testExpectancies);
    const profitFactorStdDev = stddev(testProfitFactors);
    const expectancyRelStdDev = relativeStddev(testExpectancies);
    const profitFactorRelStdDev = relativeStddev(testProfitFactors);
    const drift = performanceDrift(testExpectancies);

    const { verdict, confidence, notes } = deriveVerdict({
      splitResults,
      splitsEvaluated,
      passCount,
      failCount,
      insufficientCount,
      expectancyRelStdDev,
      profitFactorRelStdDev,
      drift,
      train: trains,
    });

    summary[verdict] = (summary[verdict] ?? 0) + 1;

    rows.push({
      symbol,
      setup,
      variant,
      regime,
      splitsEvaluated,
      passCount,
      failCount,
      insufficientCount,
      splitResults: splitResults.map((s) => ({
        splitId: s.splitId,
        train: s.train,
        test: s.test,
        available: s.available,
        status: s.status ?? null,
        reason: s.reason ?? null,
        trainExpectancy: s.train?.expectancy ?? null,
        trainPf: s.train?.profitFactor ?? null,
        trainTrades: s.train?.trades ?? null,
        testExpectancy: s.test?.expectancy ?? null,
        testPf: s.test?.profitFactor ?? null,
        testTrades: s.test?.trades ?? null,
      })),
      expectancyStdDev: expectancyStdDev !== null ? Number(expectancyStdDev.toFixed(3)) : null,
      profitFactorStdDev: profitFactorStdDev !== null ? Number(profitFactorStdDev.toFixed(3)) : null,
      expectancyRelStdDev: expectancyRelStdDev !== null ? Number(expectancyRelStdDev.toFixed(3)) : null,
      profitFactorRelStdDev: profitFactorRelStdDev !== null ? Number(profitFactorRelStdDev.toFixed(3)) : null,
      performanceDrift: drift,
      rollingVerdict: verdict,
      confidence,
      notes,
    });
  }

  // Tri : ROBUST puis STABLE puis FRAGILE puis OVERFIT puis INSUFFICIENT
  const VERDICT_RANK = { ROBUST: 0, STABLE: 1, FRAGILE: 2, OVERFIT: 3, INSUFFICIENT_DATA: 4 };
  rows.sort((a, b) => {
    if (VERDICT_RANK[a.rollingVerdict] !== VERDICT_RANK[b.rollingVerdict]) {
      return VERDICT_RANK[a.rollingVerdict] - VERDICT_RANK[b.rollingVerdict];
    }
    return (b.passCount - a.passCount) || a.symbol.localeCompare(b.symbol);
  });

  const report = {
    generatedAt: new Date().toISOString(),
    status: "ok",
    splits: SPLITS,
    canonicalRegimeMode: CANONICAL_REGIME_MODE,
    summary: {
      cellsEvaluated: rows.length,
      robust: summary.ROBUST ?? 0,
      stable: summary.STABLE ?? 0,
      fragile: summary.FRAGILE ?? 0,
      overfit: summary.OVERFIT ?? 0,
      insufficientData: summary.INSUFFICIENT_DATA ?? 0,
    },
    cells: rows,
    warnings: [],
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[rolling-walkforward-validator] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Résumé : ${rows.length} cellules — ROBUST ${summary.ROBUST ?? 0}, STABLE ${summary.STABLE ?? 0}, FRAGILE ${summary.FRAGILE ?? 0}, OVERFIT ${summary.OVERFIT ?? 0}, INSUFFICIENT ${summary.INSUFFICIENT_DATA ?? 0}`);
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Rolling Walk-Forward Validator — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/rolling-walkforward-validator-v1.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Validateur de robustesse temporelle.** Teste chaque cellule (symbol × setup × variant × regime) sur plusieurs splits walk-forward indépendants. Le moteur ne **promeut jamais** — il confirme, dégrade ou invalide.");
  lines.push("");

  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Cellules évaluées : **${report.summary.cellsEvaluated}**`);
  lines.push(`- ROBUST : **${report.summary.robust}**`);
  lines.push(`- STABLE : **${report.summary.stable}**`);
  lines.push(`- FRAGILE : **${report.summary.fragile}**`);
  lines.push(`- OVERFIT : **${report.summary.overfit}**`);
  lines.push(`- INSUFFICIENT_DATA : **${report.summary.insufficientData}**`);
  lines.push("");

  lines.push("## 2. Splits utilisés");
  lines.push("");
  lines.push("Les splits sont adaptés aux années réellement présentes (2021-2025 selon les sources, 2022-2025 pour Pullback yearly-walkforward). Le brief original suggérait des splits avec TRAIN 2020-* mais cette année n'est pas dans les sources actuelles.");
  lines.push("");
  lines.push("| Split | TRAIN | TEST | Description |");
  lines.push("|---|---|---|---|");
  for (const s of report.splits) {
    lines.push(`| ${s.id} | ${s.train.join(", ")} | ${s.test.join(", ")} | ${s.description} |`);
  }
  lines.push("");

  lines.push("## 3. Distribution des verdicts");
  lines.push("");
  lines.push("| Verdict | Cellules | % |");
  lines.push("|---|---:|---:|");
  const total = report.summary.cellsEvaluated || 1;
  for (const v of ["ROBUST", "STABLE", "FRAGILE", "OVERFIT", "INSUFFICIENT_DATA"]) {
    const key = v === "INSUFFICIENT_DATA" ? "insufficientData" : v.toLowerCase();
    const n = report.summary[key] ?? 0;
    lines.push(`| ${v} | ${n} | ${(n / total * 100).toFixed(1)} % |`);
  }
  lines.push("");

  lines.push("## 4. Cellules ROBUST");
  lines.push("");
  const robust = report.cells.filter((c) => c.rollingVerdict === "ROBUST");
  if (!robust.length) {
    lines.push("_aucune cellule ROBUST_");
  } else {
    lines.push(`${robust.length} cellules — PASS sur 100 % des splits valides avec variance faible.`);
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | Splits | Drift | Exp stddev |");
    lines.push("|---|---|---|---|---:|---|---:|");
    for (const c of robust.slice(0, 30)) {
      lines.push(`| ${c.symbol} | ${c.setup} | \`${c.variant}\` | ${c.regime} | ${c.passCount}/${c.splitsEvaluated} | ${c.performanceDrift} | ${fmt(c.expectancyStdDev, 3)} |`);
    }
    if (robust.length > 30) lines.push(`_${robust.length - 30} cellules supplémentaires non listées_`);
  }
  lines.push("");

  lines.push("## 5. Cellules OVERFIT");
  lines.push("");
  const overfit = report.cells.filter((c) => c.rollingVerdict === "OVERFIT");
  if (!overfit.length) {
    lines.push("_aucune cellule OVERFIT_");
  } else {
    lines.push(`${overfit.length} cellules — train consistant positif mais test échoue ≥ 50 % des splits. À retirer du tradable universe.`);
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | PASS/FAIL | Notes |");
    lines.push("|---|---|---|---|---|---|");
    for (const c of overfit.slice(0, 30)) {
      lines.push(`| ${c.symbol} | ${c.setup} | \`${c.variant}\` | ${c.regime} | ${c.passCount}/${c.failCount} | ${c.notes.join(" ; ")} |`);
    }
    if (overfit.length > 30) lines.push(`_${overfit.length - 30} cellules supplémentaires non listées_`);
  }
  lines.push("");

  lines.push("## 6. Setups les plus stables");
  lines.push("");
  const bySetup = {};
  for (const c of report.cells) {
    if (!bySetup[c.setup]) bySetup[c.setup] = { ROBUST: 0, STABLE: 0, FRAGILE: 0, OVERFIT: 0, INSUFFICIENT_DATA: 0, total: 0 };
    bySetup[c.setup][c.rollingVerdict]++;
    bySetup[c.setup].total++;
  }
  lines.push("| Setup | ROBUST | STABLE | FRAGILE | OVERFIT | INSUF. | Total | Ratio ROBUST+STABLE |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  const setups = Object.entries(bySetup).sort((a, b) => (b[1].ROBUST + b[1].STABLE) - (a[1].ROBUST + a[1].STABLE));
  for (const [setup, v] of setups) {
    const robustStablePct = ((v.ROBUST + v.STABLE) / v.total * 100).toFixed(1);
    lines.push(`| ${setup} | ${v.ROBUST} | ${v.STABLE} | ${v.FRAGILE} | ${v.OVERFIT} | ${v.INSUFFICIENT_DATA} | ${v.total} | ${robustStablePct} % |`);
  }
  lines.push("");

  lines.push("## 7. Setups les plus fragiles");
  lines.push("");
  const fragileSetups = setups.filter(([, v]) => v.total >= 10).sort((a, b) => (b[1].FRAGILE + b[1].OVERFIT) - (a[1].FRAGILE + a[1].OVERFIT));
  lines.push("| Setup | Fragile + Overfit | Total | % fragile |");
  lines.push("|---|---:|---:|---:|");
  for (const [setup, v] of fragileSetups.slice(0, 10)) {
    const fragilePct = ((v.FRAGILE + v.OVERFIT) / v.total * 100).toFixed(1);
    lines.push(`| ${setup} | ${v.FRAGILE + v.OVERFIT} | ${v.total} | ${fragilePct} % |`);
  }
  lines.push("");

  lines.push("## 8. Régimes les plus robustes");
  lines.push("");
  const byRegime = {};
  for (const c of report.cells) {
    if (!byRegime[c.regime]) byRegime[c.regime] = { ROBUST: 0, STABLE: 0, FRAGILE: 0, OVERFIT: 0, INSUFFICIENT_DATA: 0, total: 0 };
    byRegime[c.regime][c.rollingVerdict]++;
    byRegime[c.regime].total++;
  }
  lines.push("| Régime | ROBUST | STABLE | FRAGILE | OVERFIT | INSUF. | Total | Ratio ROBUST+STABLE |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
  for (const [regime, v] of Object.entries(byRegime).sort((a, b) => (b[1].ROBUST + b[1].STABLE) - (a[1].ROBUST + a[1].STABLE))) {
    const ratio = ((v.ROBUST + v.STABLE) / v.total * 100).toFixed(1);
    lines.push(`| ${regime} | ${v.ROBUST} | ${v.STABLE} | ${v.FRAGILE} | ${v.OVERFIT} | ${v.INSUFFICIENT_DATA} | ${v.total} | ${ratio} % |`);
  }
  lines.push("");

  lines.push("## 9. Variance observée (top 10 cellules les plus volatiles)");
  lines.push("");
  const volatiles = report.cells.filter((c) => c.expectancyRelStdDev !== null && c.splitsEvaluated >= 2).sort((a, b) => (b.expectancyRelStdDev ?? 0) - (a.expectancyRelStdDev ?? 0)).slice(0, 10);
  if (!volatiles.length) {
    lines.push("_aucune cellule avec stddev calculable_");
  } else {
    lines.push("| Symbole | Setup | Variante | Régime | Exp rel stddev | Drift | Verdict |");
    lines.push("|---|---|---|---|---:|---|---|");
    for (const c of volatiles) {
      lines.push(`| ${c.symbol} | ${c.setup} | \`${c.variant}\` | ${c.regime} | ${fmt(c.expectancyRelStdDev, 2)} | ${c.performanceDrift} | ${c.rollingVerdict} |`);
    }
  }
  lines.push("");

  lines.push("## 10. Limites");
  lines.push("");
  lines.push("- **5 ans de données seulement.** 3 splits walk-forward — suffisant pour détecter les overfits massifs, insuffisant pour une mesure de robustesse statistique fine.");
  lines.push("- **Mêmes seuils PASS/FAIL** que `walk-forward-regime-validator-v1` (test exp > 0, test PF ≥ 1.1, drawdown ≤ 2× totalR). Volontairement strict.");
  lines.push("- **Variance relative** : si l'expectancy moyenne est très petite, la variance relative explose mécaniquement. Le seuil 0.5 (50 %) est arbitraire v1.");
  lines.push("- **OVERFIT detection** se base sur train consistant positif + test fail majoritaire. Une cellule avec train mitigé peut passer en FRAGILE plutôt qu'OVERFIT.");
  lines.push("- **Pas de propagation** : ce moteur ne modifie ni `tradable-universe.json` ni `allocation-plan.json`. À utiliser comme filtre amont manuel.");
  lines.push("- **Mode régime canonique unique** : `ALL_REGIMES`. Les modes NO_RISK_OFF / RISK_ON_ONLY ne sont pas évalués séparément.");
  lines.push("- **Pas d'intégration au pipeline orchestré** dans cette PR.");
  lines.push("");

  lines.push("## 11. Prochaine étape recommandée");
  lines.push("");
  lines.push("- **Cross-check avec `walk-forward-regime-validator-v1`** : les cellules PASS du validateur unique ET ROBUST du validateur roulant sont les candidates les plus solides. Les PASS du validateur unique mais FRAGILE / OVERFIT en roulant sont des faux positifs à examiner.");
  lines.push("- **Intégration tradable-universe** : étendre `tradable-universe-v1.mjs` pour exiger en plus du walk-forward unique un verdict ROBUST ou STABLE en walk-forward roulant. Bloquerait les cellules OVERFIT.");
  lines.push("- **Walk-forward conditionnel au régime** : faire les splits SEULEMENT sur les périodes du même régime macro, pour vérifier que la robustesse n'est pas due à un seul environnement.");
  lines.push("- **Ajouter 2020** : si une PR ingère des données 2020, on pourrait avoir 4-5 splits au lieu de 3.");
  lines.push("");

  return lines.join("\n");
}

main().catch((err) => {
  console.error("[rolling-walkforward-validator] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
