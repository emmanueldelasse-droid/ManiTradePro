// tools/backtests/walk-forward-regime-validator-v1.mjs
//
// Walk-forward validator par régime pour ManiTradePro.
// Vérifie que les cellules STRONG/OK de la matrice variant-regime ne sont
// pas du sur-ajustement, en comparant la performance d'apprentissage
// (années anciennes) à la performance de test (années récentes).
//
// Méthode :
//   - TRAIN_YEARS = 2021-2023 (3 ans)
//   - TEST_YEARS  = 2024-2025 (2 ans)
//   - Pour chaque cellule (symbol × setup × variant × regime), on agrège
//     les records yearly correspondants pour le train et pour le test,
//     puis on compare.
//
// Sortie :
//   - tools/backtests/output/walk-forward-regime-validator.json
//   - tools/backtests/output/walk-forward-regime-validator.md
//
// Limite documentée : ce validateur n'autorise PAS un trade live. Il
// filtre seulement le futur tradable-universe (PASS / WATCH / FAIL /
// INSUFFICIENT_DATA). Un PASS reste susceptible de surajustement, et
// un FAIL peut redevenir bon dans un futur split. Toujours combiner
// avec les autres niveaux (asset-quality, asset-setup, setup-variant,
// variant-regime) avant toute décision.
//
// Usage : node tools/backtests/walk-forward-regime-validator-v1.mjs

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, basename, relative, resolve } from "node:path";

import {
  listJsonFiles,
  emptyBucket,
  pushToBucket,
  summarizeBucket,
  toNumberOrNull,
  inferSetupFamily,
} from "./lib/backtest-records.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const INPUT_DIRS = [join(REPO_ROOT, "tools", "backtests"), join(REPO_ROOT, "tools", "backtests", "output")];
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUTPUT_JSON = join(OUTPUT_DIR, "walk-forward-regime-validator.json");
const OUTPUT_MD = join(OUTPUT_DIR, "walk-forward-regime-validator.md");
const VARIANT_REGIME_MATRIX = join(OUTPUT_DIR, "variant-regime-matrix.json");

const SKIP_FILENAMES = new Set([
  "asset-quality-report.json",
  "asset-setup-matrix.json",
  "setup-variant-matrix.json",
  "variant-regime-matrix.json",
  "walk-forward-regime-validator.json",
]);

const TRAIN_YEARS = ["2021", "2022", "2023"];
const TEST_YEARS = ["2024", "2025"];
const FOCUS_SYMBOLS = ["NVDA", "SOXL", "PLTR", "APP", "SMCI", "AVGO", "BTC", "SOL", "COIN", "MSTR"];

// Mode régime canonique pour le walk-forward : on prend ALL_REGIMES (qui contient
// toutes les cellules par régime individuel). NO_RISK_OFF est dérivé / redondant
// pour ce besoin.
const CANONICAL_REGIME_MODE = "ALL_REGIMES";

// === Extraction des records bySymbolByRegime AVEC year tag ===
// Walker qui détecte tous les arrays bySymbolByRegime et tag chaque record
// avec l'année trouvée dans le chemin (yearly[YYYY]). Les records overall
// (year = null) sont aussi extraits mais filtrés en aval (on ne garde que
// les records yearly pour éviter le double-comptage).
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

// Scoring composite simple (0-100) — sert à mesurer le score drop train → test.
function scoreSummary(s) {
  if (!s || (s.trades ?? 0) === 0) return 0;
  const exp = s.expectancy ?? 0;
  const pf = s.profitFactor ?? 0;
  const wr = s.winrate ?? 0;
  const trades = s.trades ?? 0;
  let score = 0;
  if (exp >= 1.0) score += 30;
  else if (exp >= 0.5) score += 25;
  else if (exp >= 0.2) score += 15;
  else if (exp > 0) score += 8;
  if (pf >= 2.0) score += 25;
  else if (pf >= 1.5) score += 20;
  else if (pf >= 1.2) score += 12;
  else if (pf >= 1.0) score += 5;
  if (wr >= 60) score += 15;
  else if (wr >= 50) score += 10;
  else if (wr >= 45) score += 5;
  if (trades >= 50) score += 15;
  else if (trades >= 25) score += 10;
  else if (trades >= 10) score += 7;
  else if (trades >= 5) score += 3;
  return score;
}

// Application des règles de décision walk-forward.
function classifyWalkForward({ train, test, observedYears }) {
  const reasons = [];
  if (observedYears < 2) {
    return { tier: "INSUFFICIENT_DATA", decision: "needs_more_data", reason: "moins de 2 années observées" };
  }

  const trainTrades = train.trades ?? 0;
  const testTrades = test.trades ?? 0;
  const testExp = test.expectancy ?? 0;
  const testPf = test.profitFactor ?? 0;
  const testDd = test.maxDrawdown ?? 0;
  const testTr = test.totalR ?? test.totalPnl ?? null;

  if (trainTrades === 0 && testTrades > 0) {
    // Cas symbole entièrement post-2024 (ex. CRWV, RBRK, NBIS récents)
    return { tier: "INSUFFICIENT_DATA", decision: "needs_more_data", reason: "aucune donnée train (symbole post-2024)" };
  }
  if (trainTrades > 0 && testTrades === 0) {
    return { tier: "INSUFFICIENT_DATA", decision: "needs_more_data", reason: "aucune donnée test (symbole disparu/désactivé)" };
  }

  // Conditions FAIL strictes
  if (testTrades >= 10 && testExp <= 0) {
    return { tier: "FAIL", decision: "block", reason: `test expectancy ${testExp.toFixed(2)} avec ${testTrades} trades` };
  }
  if (testTrades >= 10 && testPf > 0 && testPf < 1.0) {
    return { tier: "FAIL", decision: "block", reason: `test PF ${testPf.toFixed(2)} < 1` };
  }
  if (testTr !== null && testTr > 0 && testDd > 0 && testDd > testTr * 2) {
    return { tier: "FAIL", decision: "block", reason: `test drawdown ${testDd.toFixed(2)} > 2× totalR ${testTr.toFixed(2)}` };
  }

  // INSUFFICIENT_DATA si test trop petit ET pas clairement négatif
  if (testTrades < 10) {
    return { tier: "INSUFFICIENT_DATA", decision: "needs_more_data", reason: `seulement ${testTrades} trades en test` };
  }

  // Calcul score drop
  const trainScore = scoreSummary(train);
  const testScore = scoreSummary(test);
  const scoreDrop = trainScore > 0 ? (trainScore - testScore) / trainScore : 0;

  // WATCH si score drop important mais test encore acceptable
  if (scoreDrop > 0.5 && testExp > 0 && testPf >= 1.0) {
    reasons.push(`score drop ${(scoreDrop * 100).toFixed(0)}%`);
    return { tier: "WATCH", decision: "reduce", reason: reasons.join(" ; "), scoreDrop };
  }

  // WATCH si test PF entre 1.0 et 1.1 (marginal)
  if (testExp > 0 && testPf >= 1.0 && testPf < 1.1) {
    return { tier: "WATCH", decision: "reduce", reason: `test PF ${testPf.toFixed(2)} marginal`, scoreDrop };
  }

  // PASS si test confirme train avec marge
  if (testExp > 0 && testPf >= 1.1 && testTrades >= 10) {
    return { tier: "PASS", decision: "keep", reason: "test confirme train", scoreDrop };
  }

  // Cas résiduel
  return { tier: "WATCH", decision: "reduce", reason: "limites atteintes (cas non couvert par les règles primaires)", scoreDrop };
}

// === Chargement et agrégation ===

async function tryReadBaseMatrix() {
  try {
    await access(VARIANT_REGIME_MATRIX);
    return JSON.parse(await readFile(VARIANT_REGIME_MATRIX, "utf8"));
  } catch (_err) {
    return null;
  }
}

function buildBaseTierIndex(baseMatrix) {
  const index = {};
  if (!baseMatrix || !baseMatrix.symbolMatrix) return index;
  for (const [sym, byVariant] of Object.entries(baseMatrix.symbolMatrix)) {
    for (const [variant, byMode] of Object.entries(byVariant)) {
      for (const [mode, byRegime] of Object.entries(byMode)) {
        for (const [regime, cell] of Object.entries(byRegime)) {
          const key = `${sym}|${variant}|${mode}|${regime}`;
          index[key] = { tier: cell.tier, score: cell.score, setup: cell.setup };
        }
      }
    }
  }
  return index;
}

function aggregateByCell(records) {
  // Filtre : on garde uniquement les records yearly (year !== null) et le
  // mode canonique. Les autres modes sont redondants ou dérivés.
  const filtered = records.filter(r => r.year !== null && r.regimeMode === CANONICAL_REGIME_MODE);
  const cells = new Map();
  for (const rec of filtered) {
    const key = [rec.symbol, rec.setupFamily, rec.variant, rec.regime].join("|");
    if (!cells.has(key)) {
      cells.set(key, {
        symbol: rec.symbol,
        setupFamily: rec.setupFamily,
        variant: rec.variant,
        regime: rec.regime,
        train: emptyBucket(),
        test: emptyBucket(),
        years: new Set(),
      });
    }
    const entry = cells.get(key);
    entry.years.add(rec.year);
    if (TRAIN_YEARS.includes(rec.year)) pushToBucket(entry.train, rec);
    else if (TEST_YEARS.includes(rec.year)) pushToBucket(entry.test, rec);
  }
  return cells;
}

function buildCellRows(cells, baseTierIndex) {
  const rows = [];
  for (const entry of cells.values()) {
    const train = summarizeBucket(entry.train);
    const test = summarizeBucket(entry.test);
    const observedYears = entry.years.size;
    const classification = classifyWalkForward({ train, test, observedYears });

    const baseKey = `${entry.symbol}|${entry.variant}|${CANONICAL_REGIME_MODE}|${entry.regime}`;
    const base = baseTierIndex[baseKey];

    const trainScore = scoreSummary(train);
    const testScore = scoreSummary(test);
    rows.push({
      symbol: entry.symbol,
      setup: entry.setupFamily,
      variant: entry.variant,
      regime: entry.regime,
      baseTier: base?.tier ?? null,
      baseScore: base?.score ?? null,
      walkForwardTier: classification.tier,
      train: {
        years: TRAIN_YEARS,
        trades: train.trades,
        expectancy: train.expectancy,
        profitFactor: train.profitFactor,
        winrate: train.winrate,
        totalR: train.totalR,
        totalPnl: train.totalPnl,
        maxDrawdown: train.maxDrawdown,
        score: trainScore,
      },
      test: {
        years: TEST_YEARS,
        trades: test.trades,
        expectancy: test.expectancy,
        profitFactor: test.profitFactor,
        winrate: test.winrate,
        totalR: test.totalR,
        totalPnl: test.totalPnl,
        maxDrawdown: test.maxDrawdown,
        score: testScore,
      },
      stability: {
        observedYears,
        profitableYears: null, // non calculé ici, retraçable via les sources
        scoreDrop: classification.scoreDrop ?? null,
        degradationReason: classification.reason,
      },
      decision: classification.decision,
    });
  }
  rows.sort((a, b) => {
    const tierRank = { FAIL: 0, WATCH: 1, INSUFFICIENT_DATA: 2, PASS: 3 };
    if (tierRank[a.walkForwardTier] !== tierRank[b.walkForwardTier]) {
      return tierRank[a.walkForwardTier] - tierRank[b.walkForwardTier];
    }
    return (b.train.score ?? 0) - (a.train.score ?? 0);
  });
  return rows;
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Walk-Forward Regime Validator — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/walk-forward-regime-validator-v1.mjs\`.`);
  lines.push("");
  lines.push(`Split : TRAIN = ${TRAIN_YEARS.join("-")} | TEST = ${TEST_YEARS.join("-")}.`);
  lines.push("");
  lines.push("Mode régime canonique : `ALL_REGIMES` (le mode contient les trades par régime individuel, sans filtre opérationnel).");
  lines.push("");

  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Cellules analysées : **${report.summary.totalCells}**`);
  lines.push(`- Actifs uniques : **${report.summary.uniqueSymbols}**`);
  lines.push(`- Variantes uniques : **${report.summary.uniqueVariants}**`);
  lines.push("");
  lines.push("Distribution :");
  lines.push("");
  lines.push("| Tier walk-forward | Nombre | % |");
  lines.push("|---|---:|---:|");
  for (const tier of ["PASS", "WATCH", "FAIL", "INSUFFICIENT_DATA"]) {
    const count = report.summary.byTier[tier] ?? 0;
    const pct = report.summary.totalCells > 0 ? (count / report.summary.totalCells * 100).toFixed(1) : "0.0";
    lines.push(`| ${tier} | ${count} | ${pct}% |`);
  }
  lines.push("");
  lines.push("Par setup :");
  lines.push("");
  lines.push("| Setup | PASS | WATCH | FAIL | INSUFFICIENT_DATA |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const setup of Object.keys(report.summary.bySetup).sort()) {
    const s = report.summary.bySetup[setup];
    lines.push(`| ${setup} | ${s.PASS ?? 0} | ${s.WATCH ?? 0} | ${s.FAIL ?? 0} | ${s.INSUFFICIENT_DATA ?? 0} |`);
  }
  lines.push("");
  lines.push("Cross-check baseTier (variant-regime-matrix) × walkForwardTier :");
  lines.push("");
  lines.push("| Base tier | PASS | WATCH | FAIL | INSUFFICIENT_DATA |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const baseTier of ["STRONG", "OK", "WEAK", "AVOID", "null"]) {
    const c = report.summary.crossBaseTier[baseTier] || {};
    lines.push(`| ${baseTier} | ${c.PASS ?? 0} | ${c.WATCH ?? 0} | ${c.FAIL ?? 0} | ${c.INSUFFICIENT_DATA ?? 0} |`);
  }
  lines.push("");

  // 3. Cellules STRONG qui FAIL
  lines.push("## 2. Cellules `STRONG` qui échouent en walk-forward");
  lines.push("");
  const strongFail = report.rows.filter(r => r.baseTier === "STRONG" && r.walkForwardTier === "FAIL");
  if (!strongFail.length) {
    lines.push("_aucune cellule STRONG ne tombe en FAIL_");
    lines.push("");
  } else {
    lines.push("Ces cellules étaient classées STRONG sur l'historique global mais ratent le test 2024-2025. À retirer du tradable-universe.");
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | Train (trades / exp / PF) | Test (trades / exp / PF) | Raison |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const r of strongFail) {
      lines.push(`| ${r.symbol} | ${r.setup} | ${r.variant} | ${r.regime} | ${r.train.trades} / ${fmt(r.train.expectancy)} / ${fmt(r.train.profitFactor)} | ${r.test.trades} / ${fmt(r.test.expectancy)} / ${fmt(r.test.profitFactor)} | ${r.stability.degradationReason} |`);
    }
    lines.push("");
  }

  // 4. Cellules STRONG confirmées PASS
  lines.push("## 3. Cellules `STRONG` confirmées PASS");
  lines.push("");
  const strongPass = report.rows.filter(r => r.baseTier === "STRONG" && r.walkForwardTier === "PASS");
  lines.push(`Cellules STRONG validées par le test (${strongPass.length} cellules).`);
  if (strongPass.length) {
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | Train | Test | Score drop |");
    lines.push("|---|---|---|---|---|---|---:|");
    for (const r of strongPass.slice(0, 30)) {
      lines.push(`| ${r.symbol} | ${r.setup} | ${r.variant} | ${r.regime} | t=${r.train.trades} exp=${fmt(r.train.expectancy)} PF=${fmt(r.train.profitFactor)} | t=${r.test.trades} exp=${fmt(r.test.expectancy)} PF=${fmt(r.test.profitFactor)} | ${r.stability.scoreDrop !== null ? (r.stability.scoreDrop * 100).toFixed(0) + "%" : "n/a"} |`);
    }
    if (strongPass.length > 30) lines.push(`| ... | | | | | | ${strongPass.length - 30} cellules supplémentaires non listées |`);
  }
  lines.push("");

  // 5. Breakout suspectes
  lines.push("## 4. Cellules Breakout suspectes (STRONG ou OK → FAIL ou WATCH)");
  lines.push("");
  const breakoutSuspect = report.rows.filter(r =>
    r.setup === "BREAKOUT_EXPANSION" &&
    (r.baseTier === "STRONG" || r.baseTier === "OK") &&
    (r.walkForwardTier === "FAIL" || r.walkForwardTier === "WATCH")
  );
  if (!breakoutSuspect.length) {
    lines.push("_aucune cellule Breakout STRONG/OK ne tombe en FAIL/WATCH_");
    lines.push("");
  } else {
    lines.push("| Symbole | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Raison |");
    lines.push("|---|---|---|---|---|---|---|---|");
    for (const r of breakoutSuspect.slice(0, 30)) {
      lines.push(`| ${r.symbol} | ${r.variant} | ${r.regime} | ${r.baseTier} | ${r.walkForwardTier} | ${r.train.trades}/${fmt(r.train.expectancy)}/${fmt(r.train.profitFactor)} | ${r.test.trades}/${fmt(r.test.expectancy)}/${fmt(r.test.profitFactor)} | ${r.stability.degradationReason} |`);
    }
    if (breakoutSuspect.length > 30) lines.push(`_${breakoutSuspect.length - 30} cellules supplémentaires non listées_`);
    lines.push("");
  }

  // 6. Focus assets
  lines.push("## 5. Cas focus par actif");
  lines.push("");
  for (const sym of FOCUS_SYMBOLS) {
    lines.push(`### ${sym}`);
    lines.push("");
    const cells = report.rows.filter(r => r.symbol === sym);
    if (!cells.length) { lines.push("_aucune cellule yearly disponible_"); lines.push(""); continue; }
    const dist = { PASS: 0, WATCH: 0, FAIL: 0, INSUFFICIENT_DATA: 0 };
    for (const c of cells) dist[c.walkForwardTier]++;
    lines.push(`Distribution : PASS ${dist.PASS} / WATCH ${dist.WATCH} / FAIL ${dist.FAIL} / INSUFFICIENT_DATA ${dist.INSUFFICIENT_DATA} (total ${cells.length}).`);
    lines.push("");
    const interesting = cells.filter(c => c.walkForwardTier === "PASS" || (c.baseTier === "STRONG" && c.walkForwardTier !== "INSUFFICIENT_DATA"));
    if (!interesting.length) {
      lines.push("_aucune cellule PASS ni STRONG-base avec verdict défini_");
      lines.push("");
      continue;
    }
    lines.push("| Setup | Variante | Régime | Base | WF | Train (t/exp/PF) | Test (t/exp/PF) | Score drop |");
    lines.push("|---|---|---|---|---|---|---|---:|");
    for (const c of interesting) {
      lines.push(`| ${c.setup} | ${c.variant} | ${c.regime} | ${c.baseTier} | ${c.walkForwardTier} | ${c.train.trades}/${fmt(c.train.expectancy)}/${fmt(c.train.profitFactor)} | ${c.test.trades}/${fmt(c.test.expectancy)}/${fmt(c.test.profitFactor)} | ${c.stability.scoreDrop !== null ? (c.stability.scoreDrop * 100).toFixed(0) + "%" : "n/a"} |`);
    }
    lines.push("");
  }

  // 7. Recommandations
  lines.push("## 6. Recommandations moteur");
  lines.push("");
  lines.push("- **PASS** : cellule confirmée par le test 2024-2025. À conserver dans le tradable-universe avec sizing standard. Reste susceptible de surajustement long terme — ne pas considérer comme garantie.");
  lines.push("- **WATCH** : cellule positive en test mais avec score drop élevé ou PF marginal. Allocation réduite, surveillance renforcée.");
  lines.push("- **FAIL** : cellule à exclure du tradable-universe pour le futur, même si la matrice variant-regime la classe STRONG. C'est exactement le filtre anti-surajustement attendu.");
  lines.push("- **INSUFFICIENT_DATA** : pas assez d'échantillons sur 2024-2025 (typiquement < 10 trades). Ne pas trader sur cette base — attendre plus de data ou utiliser le tier global.");
  lines.push("");
  lines.push("Le validateur ne **remplace pas** les 4 niveaux précédents (asset-quality, asset-setup, setup-variant, variant-regime). Il les **complète** en filtrant le futur tradable-universe. Toute décision live doit combiner les 5 niveaux.");
  lines.push("");

  // 8. Limites
  lines.push("## 7. Limites de fiabilité");
  lines.push("");
  lines.push("- **Split unique 3/2** : le validateur utilise un seul split (2021-2023 train, 2024-2025 test). Un split différent (ex. 2/3) pourrait donner des verdicts différents. Une v2 future pourrait faire du walk-forward roulant.");
  lines.push("- **Petits échantillons** : beaucoup de cellules ont < 10 trades en test → INSUFFICIENT_DATA. Le résultat dépend fortement de la couverture des données 2024-2025.");
  lines.push("- **Pas de pénalité de transaction** : ce walk-forward suppose des frictions nulles (pas de slippage, pas de spread, pas de frais). Une cellule PASS reste vulnérable à des frictions réelles. Priorité #3 du TODO quant.");
  lines.push("- **Pas de validation régime cross-period** : si le régime macro 2024-2025 est très différent de 2021-2023, certaines cellules PASS peuvent être de la chance. Idéalement il faudrait faire le walk-forward CONDITIONNELLEMENT au régime (mais les échantillons deviennent encore plus petits).");
  lines.push("- **Effet de levier (SOXL) toujours invisible** : SOXL peut PASS sur les chiffres bruts mais reste un instrument à risque non-linéaire.");
  lines.push("- **Données yearly limitées** : seuls les setups avec breakdown yearly + bySymbolByRegime sont validables. Si une cellule existe dans variant-regime-matrix sans yearly breakdown, elle ne peut pas être validée ici (verdict INSUFFICIENT_DATA).");
  lines.push("- **Verdict ≠ autorisation live** : un PASS dit \"le passé récent confirme l'historique long\". Cela ne dit pas que le futur ressemblera au passé récent. À combiner avec la gestion du risque, le sizing dynamique et l'observation live.");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  console.log("[walk-forward-regime-validator] démarrage");
  const files = await listJsonFiles({ inputDirs: INPUT_DIRS, skipFilenames: SKIP_FILENAMES });
  if (!files.length) {
    console.error("[walk-forward-regime-validator] aucun fichier .json source trouvé");
    process.exit(1);
  }
  console.log(`[walk-forward-regime-validator] ${files.length} fichier(s) candidat(s)`);

  const allRecords = [];
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(await readFile(file, "utf8"));
    } catch (err) {
      console.warn(`  ✗ ${basename(file)} — JSON invalide`);
      continue;
    }
    const recs = extractSymbolRegimeYearlyRecords(parsed, basename(file));
    if (recs.length) console.log(`  ✓ ${basename(file)} — ${recs.length} record(s) symbol × variant × regime × year`);
    allRecords.push(...recs);
  }

  if (!allRecords.length) {
    console.error("[walk-forward-regime-validator] aucun record bySymbolByRegime yearly trouvé");
    console.error("Lancer d'abord les backtests qui produisent ce champ :");
    console.error("  - backtest-relative-strength-rotation-regime-v1.mjs");
    console.error("  - backtest-pullback-yearly-walkforward.mjs");
    console.error("  - backtest-multi-setup-grid.mjs");
    process.exit(1);
  }
  console.log(`[walk-forward-regime-validator] ${allRecords.length} record(s) au total`);

  const baseMatrix = await tryReadBaseMatrix();
  if (!baseMatrix) {
    console.warn("[walk-forward-regime-validator] variant-regime-matrix.json introuvable — colonne baseTier sera null");
  }
  const baseTierIndex = buildBaseTierIndex(baseMatrix);
  console.log(`[walk-forward-regime-validator] base matrix : ${Object.keys(baseTierIndex).length} cellules référencées`);

  const cells = aggregateByCell(allRecords);
  console.log(`[walk-forward-regime-validator] ${cells.size} cellule(s) (symbol × setup × variant × regime) à valider`);

  const rows = buildCellRows(cells, baseTierIndex);

  // Stats
  const byTier = { PASS: 0, WATCH: 0, FAIL: 0, INSUFFICIENT_DATA: 0 };
  const bySetup = {};
  const crossBaseTier = {};
  const uniqueSymbols = new Set();
  const uniqueVariants = new Set();
  for (const r of rows) {
    byTier[r.walkForwardTier]++;
    if (!bySetup[r.setup]) bySetup[r.setup] = { PASS: 0, WATCH: 0, FAIL: 0, INSUFFICIENT_DATA: 0 };
    bySetup[r.setup][r.walkForwardTier]++;
    const baseKey = r.baseTier ?? "null";
    if (!crossBaseTier[baseKey]) crossBaseTier[baseKey] = { PASS: 0, WATCH: 0, FAIL: 0, INSUFFICIENT_DATA: 0 };
    crossBaseTier[baseKey][r.walkForwardTier]++;
    uniqueSymbols.add(r.symbol);
    uniqueVariants.add(`${r.setup}|${r.variant}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    trainYears: TRAIN_YEARS,
    testYears: TEST_YEARS,
    canonicalRegimeMode: CANONICAL_REGIME_MODE,
    summary: {
      totalCells: rows.length,
      uniqueSymbols: uniqueSymbols.size,
      uniqueVariants: uniqueVariants.size,
      byTier,
      bySetup,
      crossBaseTier,
    },
    rows,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[walk-forward-regime-validator] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Résumé : ${rows.length} cellules — PASS ${byTier.PASS}, WATCH ${byTier.WATCH}, FAIL ${byTier.FAIL}, INSUFFICIENT_DATA ${byTier.INSUFFICIENT_DATA}`);
}

main().catch(err => {
  console.error("[walk-forward-regime-validator] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
