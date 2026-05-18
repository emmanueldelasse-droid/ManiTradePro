// tools/backtests/tradable-universe-v1.mjs
//
// Consolidateur officiel du tradable universe ManiTradePro.
// Combine les 5 moteurs quant existants en une décision finale par cellule
// (symbol × setup × variant × regime) :
//
//   1. asset-quality-engine-v1            → tier global par actif
//   2. asset-setup-matrix-v1              → (asset × setup)
//   3. setup-variant-matrix-v1            → (asset × setup × variant)
//   4. variant-regime-matrix-v1           → (asset × variant × régime), mode ALL_REGIMES
//   5. walk-forward-regime-validator-v1   → train/test confirmation
//
// Sortie :
//   - tools/backtests/output/tradable-universe.json
//   - tools/backtests/output/tradable-universe.md
//
// Décisions :
//   - ALLOW        : tous filtres OK + walk-forward PASS
//   - REDUCE       : tous filtres OK + walk-forward WATCH, ou cap leverage
//   - EXPERIMENTAL : tous filtres OK + walk-forward INSUFFICIENT_DATA mais base très forte,
//                     ou setup non-prioritaire avec verdict positif
//   - BLOCK        : au moins un filtre critique échoue, ou WF FAIL,
//                     ou setup non-prioritaire sans base très forte, etc.
//
// Cette PR NE TOUCHE PAS le Worker, le front, les providers, le paper trading
// ni les endpoints API. Le tradable universe reste un artefact offline destiné
// à alimenter un futur allocation-engine et à filtrer les décisions live.

import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");

const ASSET_QUALITY = join(OUTPUT_DIR, "asset-quality-report.json");
const ASSET_SETUP = join(OUTPUT_DIR, "asset-setup-matrix.json");
const SETUP_VARIANT = join(OUTPUT_DIR, "setup-variant-matrix.json");
const VARIANT_REGIME = join(OUTPUT_DIR, "variant-regime-matrix.json");
const WALK_FORWARD = join(OUTPUT_DIR, "walk-forward-regime-validator.json");

const OUTPUT_JSON = join(OUTPUT_DIR, "tradable-universe.json");
const OUTPUT_MD = join(OUTPUT_DIR, "tradable-universe.md");

// === Constantes de politique ===

const CANONICAL_REGIME_MODE = "ALL_REGIMES";

// Setups prioritaires (peuvent atteindre ALLOW / composite A-B)
const PRIORITY_SETUPS = new Set([
  "PULLBACK_MOMENTUM",
  "RELATIVE_STRENGTH_ROTATION",
  "BREAKOUT_EXPANSION",
]);
// Setups non-prioritaires (au mieux EXPERIMENTAL, jamais ALLOW)
const NON_PRIORITY_SETUPS = new Set([
  "MEAN_REVERSION",
  "VOLATILITY_COMPRESSION",
]);

// ETFs leveragés présents dans l'univers ManiTradePro — cap REDUCE maximum.
// Liste conservatrice ; à étendre si l'univers ajoute TQQQ/SQQQ/UPRO/etc.
const LEVERAGED_ETFS = new Set([
  "SOXL",  // ProShares 3× Semiconductors
  "USD",   // ProShares 2× Semiconductors (à ne pas confondre avec cash USD)
  "ROM",   // ProShares 2× Technology
]);

// Actifs focus pour la section "cas détaillés"
const FOCUS_SYMBOLS = ["NVDA", "PLTR", "APP", "SMCI", "AVGO", "SOXL", "BTC", "SOL", "COIN", "MSTR"];

// Pondérations pour calculer une confiance composite (min des 5 disponibles)
const CONFIDENCE_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const RANK_TO_CONFIDENCE = ["LOW", "MEDIUM", "HIGH"];

// === Chargement des sources ===

async function tryRead(path) {
  try {
    await access(path);
    return JSON.parse(await readFile(path, "utf8"));
  } catch (_err) {
    return null;
  }
}

async function loadAllSources() {
  const [aq, asm, svm, vrm, wf] = await Promise.all([
    tryRead(ASSET_QUALITY),
    tryRead(ASSET_SETUP),
    tryRead(SETUP_VARIANT),
    tryRead(VARIANT_REGIME),
    tryRead(WALK_FORWARD),
  ]);
  const missing = [];
  if (!aq) missing.push("asset-quality-report.json");
  if (!asm) missing.push("asset-setup-matrix.json");
  if (!svm) missing.push("setup-variant-matrix.json");
  if (!vrm) missing.push("variant-regime-matrix.json");
  if (!wf) missing.push("walk-forward-regime-validator.json");
  return { aq, asm, svm, vrm, wf, missing };
}

// === Index par cellule ===

function buildAssetQualityIndex(aq) {
  // assets[symbol] → {tier, qualityScore, confidence, recommendedAllocationProfile}
  return aq?.assets ?? {};
}

function buildAssetSetupIndex(asm) {
  // matrix[symbol][setup] → cell
  return asm?.matrix ?? {};
}

function buildSetupVariantIndex(svm) {
  // matrix[symbol][setup][variant] → cell
  return svm?.matrix ?? {};
}

function buildVariantRegimeIndex(vrm) {
  // symbolMatrix[symbol][variant][regimeMode][regime] → cell
  return vrm?.symbolMatrix ?? {};
}

function buildWalkForwardIndex(wf) {
  // rows[] indexed by (symbol, setup, variant, regime) — mode canonique ALL_REGIMES
  const idx = {};
  for (const row of wf?.rows ?? []) {
    const key = `${row.symbol}|${row.setup}|${row.variant}|${row.regime}`;
    idx[key] = row;
  }
  return idx;
}

// === Logique de décision ===

function looksupVariantRegimeCell(vrIdx, symbol, variant, regime) {
  const byVariant = vrIdx[symbol];
  if (!byVariant) return null;
  const byMode = byVariant[variant];
  if (!byMode) return null;
  const byRegime = byMode[CANONICAL_REGIME_MODE];
  if (!byRegime) return null;
  return byRegime[regime] ?? null;
}

function decideCell({ symbol, setup, variant, regime, aqIdx, asmIdx, svmIdx, vrIdx, wfIdx }) {
  const reasons = [];
  const risks = [];

  // === Filtre 1 : asset-quality ===
  const aq = aqIdx[symbol];
  if (!aq) {
    reasons.push("asset-quality absent pour cet actif");
    return finalize({ symbol, setup, variant, regime, decision: "BLOCK", filters: { assetQuality: null, assetSetup: null, setupVariant: null, variantRegime: null, walkForward: null }, reasons, risks });
  }
  const f1 = { tier: aq.tier, qualityScore: aq.qualityScore, confidence: aq.confidence };
  if (aq.tier === "BLACKLIST") {
    reasons.push(`asset-quality BLACKLIST (score ${aq.qualityScore})`);
    return finalize({ symbol, setup, variant, regime, decision: "BLOCK", filters: { assetQuality: f1, assetSetup: null, setupVariant: null, variantRegime: null, walkForward: null }, reasons, risks });
  }

  // === Filtre 2 : asset-setup ===
  const asmCell = asmIdx[symbol]?.[setup];
  if (!asmCell) {
    reasons.push(`asset-setup absent pour ${symbol} × ${setup}`);
    return finalize({ symbol, setup, variant, regime, decision: "BLOCK", filters: { assetQuality: f1, assetSetup: null, setupVariant: null, variantRegime: null, walkForward: null }, reasons, risks });
  }
  const f2 = { tier: asmCell.tier, score: asmCell.compatibilityScore, confidence: asmCell.confidence };
  if (asmCell.tier === "AVOID" || asmCell.tier === "WEAK") {
    reasons.push(`asset-setup ${asmCell.tier} (score ${asmCell.compatibilityScore})`);
    return finalize({ symbol, setup, variant, regime, decision: "BLOCK", filters: { assetQuality: f1, assetSetup: f2, setupVariant: null, variantRegime: null, walkForward: null }, reasons, risks });
  }

  // === Filtre 3 : setup-variant ===
  const svmCell = svmIdx[symbol]?.[setup]?.[variant];
  if (!svmCell) {
    reasons.push(`setup-variant absent pour ${symbol} × ${setup} × ${variant}`);
    return finalize({ symbol, setup, variant, regime, decision: "BLOCK", filters: { assetQuality: f1, assetSetup: f2, setupVariant: null, variantRegime: null, walkForward: null }, reasons, risks });
  }
  const f3 = { tier: svmCell.tier, score: svmCell.score, confidence: svmCell.confidence };
  if (svmCell.tier === "AVOID" || svmCell.tier === "WEAK") {
    reasons.push(`setup-variant ${svmCell.tier} (score ${svmCell.score})`);
    return finalize({ symbol, setup, variant, regime, decision: "BLOCK", filters: { assetQuality: f1, assetSetup: f2, setupVariant: f3, variantRegime: null, walkForward: null }, reasons, risks });
  }

  // === Filtre 4 : variant-regime ===
  const vrCell = looksupVariantRegimeCell(vrIdx, symbol, variant, regime);
  if (!vrCell) {
    reasons.push(`variant-regime absent pour ${symbol} × ${variant} × ${regime}`);
    return finalize({ symbol, setup, variant, regime, decision: "BLOCK", filters: { assetQuality: f1, assetSetup: f2, setupVariant: f3, variantRegime: null, walkForward: null }, reasons, risks });
  }
  const f4 = { tier: vrCell.tier, score: vrCell.score, confidence: vrCell.confidence };
  if (vrCell.tier === "AVOID" || vrCell.tier === "WEAK") {
    reasons.push(`variant-regime ${vrCell.tier} (score ${vrCell.score})`);
    return finalize({ symbol, setup, variant, regime, decision: "BLOCK", filters: { assetQuality: f1, assetSetup: f2, setupVariant: f3, variantRegime: f4, walkForward: null }, reasons, risks });
  }

  // === Filtre 5 : walk-forward ===
  const wfRow = wfIdx[`${symbol}|${setup}|${variant}|${regime}`];
  const f5 = wfRow ? {
    tier: wfRow.walkForwardTier,
    baseTier: wfRow.baseTier,
    trainTrades: wfRow.train?.trades,
    testTrades: wfRow.test?.trades,
    trainExpectancy: wfRow.train?.expectancy,
    testExpectancy: wfRow.test?.expectancy,
    trainPf: wfRow.train?.profitFactor,
    testPf: wfRow.test?.profitFactor,
    scoreDrop: wfRow.stability?.scoreDrop ?? null,
  } : null;
  if (wfRow?.walkForwardTier === "FAIL") {
    reasons.push(`walk-forward FAIL (${wfRow.stability?.degradationReason || "raison non renseignée"})`);
    return finalize({ symbol, setup, variant, regime, decision: "BLOCK", filters: { assetQuality: f1, assetSetup: f2, setupVariant: f3, variantRegime: f4, walkForward: f5 }, reasons, risks });
  }

  // === Application des décisions positives ===
  let decision;
  if (wfRow?.walkForwardTier === "PASS") {
    decision = "ALLOW";
    reasons.push("WF PASS — test 2024-2025 confirme train 2021-2023");
  } else if (wfRow?.walkForwardTier === "WATCH") {
    decision = "REDUCE";
    reasons.push(`WF WATCH — ${wfRow.stability?.degradationReason || "marginal"}`);
  } else if (wfRow?.walkForwardTier === "INSUFFICIENT_DATA" || !wfRow) {
    // EXPERIMENTAL uniquement si base très forte
    const baseVeryStrong = (
      vrCell.tier === "STRONG" &&
      (aq.tier === "ELITE" || aq.tier === "CORE") &&
      asmCell.tier !== "WEAK" &&
      svmCell.tier !== "WEAK" &&
      CONFIDENCE_RANK[vrCell.confidence ?? "LOW"] >= CONFIDENCE_RANK.MEDIUM
    );
    if (baseVeryStrong) {
      decision = "EXPERIMENTAL";
      reasons.push("WF insuffisant mais base très forte (variant-regime STRONG + asset-quality ELITE/CORE + confidence ≥ MEDIUM)");
    } else {
      decision = "BLOCK";
      reasons.push("WF insuffisant et base pas assez forte pour EXPERIMENTAL");
      return finalize({ symbol, setup, variant, regime, decision, filters: { assetQuality: f1, assetSetup: f2, setupVariant: f3, variantRegime: f4, walkForward: f5 }, reasons, risks });
    }
  }

  // === Caps de politique ===
  // Non-prioritaire : jamais ALLOW. Au mieux EXPERIMENTAL.
  if (NON_PRIORITY_SETUPS.has(setup)) {
    if (decision === "ALLOW" || decision === "REDUCE") {
      decision = "EXPERIMENTAL";
      reasons.push(`cap : setup non-prioritaire (${setup}) → max EXPERIMENTAL`);
    }
    risks.push("setup non prioritaire (Mean Reversion / Volatility Compression)");
  }

  // Leveraged ETF : max REDUCE.
  if (LEVERAGED_ETFS.has(symbol)) {
    if (decision === "ALLOW") {
      decision = "REDUCE";
      reasons.push(`cap : ETF leveragé (${symbol}) → max REDUCE`);
    }
    risks.push("ETF à effet de levier — profil de risque non-linéaire, le moteur ne le détecte pas seul");
  }

  return finalize({ symbol, setup, variant, regime, decision, filters: { assetQuality: f1, assetSetup: f2, setupVariant: f3, variantRegime: f4, walkForward: f5 }, reasons, risks });
}

function finalize({ symbol, setup, variant, regime, decision, filters, reasons, risks }) {
  // Confidence composite = min des confidences des filtres présents
  const confidences = [];
  for (const f of Object.values(filters)) {
    if (f && f.confidence && CONFIDENCE_RANK[f.confidence] !== undefined) {
      confidences.push(CONFIDENCE_RANK[f.confidence]);
    }
  }
  const compositeConfidenceRank = confidences.length ? Math.min(...confidences) : 0;
  const confidence = RANK_TO_CONFIDENCE[compositeConfidenceRank];

  // Composite tier
  let compositeTier;
  if (decision === "BLOCK") compositeTier = "BLOCKED";
  else if (decision === "EXPERIMENTAL") compositeTier = "D";
  else if (decision === "REDUCE") compositeTier = "C";
  else if (decision === "ALLOW") {
    const isPriority = PRIORITY_SETUPS.has(setup);
    const notLeveraged = !LEVERAGED_ETFS.has(symbol);
    if (confidence === "HIGH" && isPriority && notLeveraged) compositeTier = "A";
    else compositeTier = "B";
  } else {
    compositeTier = "BLOCKED";
  }

  // Allocation profile
  const allocByTier = { A: "normal", B: "normal", C: "reduced", D: "micro", BLOCKED: "none" };
  const recommendedAllocationProfile = allocByTier[compositeTier];

  return {
    symbol,
    setup,
    variant,
    regime,
    decision,
    compositeTier,
    confidence,
    recommendedAllocationProfile,
    filters,
    reasons,
    risks,
  };
}

// === Main ===

async function main() {
  console.log("[tradable-universe] démarrage");
  const { aq, asm, svm, vrm, wf, missing } = await loadAllSources();
  if (missing.length) {
    console.error(`[tradable-universe] sources manquantes : ${missing.join(", ")}`);
    console.error("Lancer d'abord :");
    for (const m of missing) {
      const sourceMap = {
        "asset-quality-report.json": "node tools/backtests/asset-quality-engine-v1.mjs",
        "asset-setup-matrix.json": "node tools/backtests/asset-setup-matrix-v1.mjs",
        "setup-variant-matrix.json": "node tools/backtests/setup-variant-matrix-v1.mjs",
        "variant-regime-matrix.json": "node tools/backtests/variant-regime-matrix-v1.mjs",
        "walk-forward-regime-validator.json": "node tools/backtests/walk-forward-regime-validator-v1.mjs",
      };
      console.error(`  - ${sourceMap[m] || m}`);
    }
    process.exit(1);
  }
  console.log("[tradable-universe] 5 sources chargées");

  const aqIdx = buildAssetQualityIndex(aq);
  const asmIdx = buildAssetSetupIndex(asm);
  const svmIdx = buildSetupVariantIndex(svm);
  const vrIdx = buildVariantRegimeIndex(vrm);
  const wfIdx = buildWalkForwardIndex(wf);

  // Énumération des cellules : on prend l'union de (1) toutes les WF rows
  // (qui sont déjà à granularité symbol × setup × variant × regime) et (2)
  // toutes les cellules variant-regime que la WF n'aurait pas (cas où la WF
  // n'a pas de données yearly mais où la base existe).
  const cellKeys = new Set();
  for (const row of wf.rows ?? []) {
    cellKeys.add(`${row.symbol}|${row.setup}|${row.variant}|${row.regime}`);
  }
  for (const [sym, byVariant] of Object.entries(vrIdx)) {
    for (const [variant, byMode] of Object.entries(byVariant)) {
      const byRegime = byMode[CANONICAL_REGIME_MODE];
      if (!byRegime) continue;
      for (const [regime, cell] of Object.entries(byRegime)) {
        cellKeys.add(`${sym}|${cell.setup}|${variant}|${regime}`);
      }
    }
  }
  console.log(`[tradable-universe] ${cellKeys.size} cellules à évaluer`);

  // Évaluation
  const cells = [];
  const rejectedBy = { aq: 0, asm: 0, svm: 0, vr: 0, wf: 0, policy: 0, missingData: 0 };
  for (const key of cellKeys) {
    const [symbol, setup, variant, regime] = key.split("|");
    const cell = decideCell({ symbol, setup, variant, regime, aqIdx, asmIdx, svmIdx, vrIdx, wfIdx });
    cells.push(cell);
    // Compte par filtre rejetant
    if (cell.decision === "BLOCK") {
      const r = cell.reasons[0] || "";
      if (r.startsWith("asset-quality")) rejectedBy.aq++;
      else if (r.startsWith("asset-setup")) rejectedBy.asm++;
      else if (r.startsWith("setup-variant")) rejectedBy.svm++;
      else if (r.startsWith("variant-regime")) rejectedBy.vr++;
      else if (r.startsWith("walk-forward FAIL") || r.startsWith("WF")) rejectedBy.wf++;
      else if (r.includes("absent")) rejectedBy.missingData++;
      else rejectedBy.policy++;
    }
  }

  // Distribution
  const byDecision = { ALLOW: 0, REDUCE: 0, EXPERIMENTAL: 0, BLOCK: 0 };
  const byCompositeTier = { A: 0, B: 0, C: 0, D: 0, BLOCKED: 0 };
  const byConfidence = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const c of cells) {
    byDecision[c.decision]++;
    byCompositeTier[c.compositeTier]++;
    byConfidence[c.confidence]++;
  }

  // Tri pour le rapport : ALLOW d'abord par score composite, puis REDUCE, EXPERIMENTAL, BLOCK
  const decisionRank = { ALLOW: 0, REDUCE: 1, EXPERIMENTAL: 2, BLOCK: 3 };
  cells.sort((a, b) => {
    if (decisionRank[a.decision] !== decisionRank[b.decision]) {
      return decisionRank[a.decision] - decisionRank[b.decision];
    }
    const sa = (a.filters.variantRegime?.score ?? 0);
    const sb = (b.filters.variantRegime?.score ?? 0);
    return sb - sa;
  });

  const report = {
    generatedAt: new Date().toISOString(),
    sources: {
      assetQuality: relative(REPO_ROOT, ASSET_QUALITY),
      assetSetup: relative(REPO_ROOT, ASSET_SETUP),
      setupVariant: relative(REPO_ROOT, SETUP_VARIANT),
      variantRegime: relative(REPO_ROOT, VARIANT_REGIME),
      walkForward: relative(REPO_ROOT, WALK_FORWARD),
    },
    canonicalRegimeMode: CANONICAL_REGIME_MODE,
    policy: {
      prioritySetups: Array.from(PRIORITY_SETUPS),
      nonPrioritySetups: Array.from(NON_PRIORITY_SETUPS),
      leveragedEtfs: Array.from(LEVERAGED_ETFS),
    },
    summary: {
      totalCells: cells.length,
      byDecision,
      byCompositeTier,
      byConfidence,
      rejectedBy,
    },
    cells,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUTPUT_MD, buildMarkdown(report), "utf8");

  console.log("[tradable-universe] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUTPUT_MD)}`);
  console.log("");
  console.log(`Résumé : ${cells.length} cellules — ALLOW ${byDecision.ALLOW}, REDUCE ${byDecision.REDUCE}, EXPERIMENTAL ${byDecision.EXPERIMENTAL}, BLOCK ${byDecision.BLOCK}`);
  console.log(`Composite : A ${byCompositeTier.A}, B ${byCompositeTier.B}, C ${byCompositeTier.C}, D ${byCompositeTier.D}, BLOCKED ${byCompositeTier.BLOCKED}`);
  console.log(`Rejets par filtre : asset-quality ${rejectedBy.aq}, asset-setup ${rejectedBy.asm}, setup-variant ${rejectedBy.svm}, variant-regime ${rejectedBy.vr}, walk-forward ${rejectedBy.wf}, données absentes ${rejectedBy.missingData}, policy ${rejectedBy.policy}`);
}

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function pct(n, d = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return (n * 100).toFixed(d) + "%";
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Tradable Universe — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/tradable-universe-v1.mjs\`.`);
  lines.push("");
  lines.push("Consolidation officielle des 5 moteurs quant en une décision finale par cellule (`symbol × setup × variant × regime`). Mode régime canonique : `ALL_REGIMES`.");
  lines.push("");

  // 1. Synthèse
  lines.push("## 1. Résumé global");
  lines.push("");
  lines.push(`- Cellules évaluées : **${report.summary.totalCells}**`);
  lines.push("");
  lines.push("Distribution par décision :");
  lines.push("");
  lines.push("| Décision | Nombre | % |");
  lines.push("|---|---:|---:|");
  for (const d of ["ALLOW", "REDUCE", "EXPERIMENTAL", "BLOCK"]) {
    const n = report.summary.byDecision[d] ?? 0;
    const p = report.summary.totalCells > 0 ? (n / report.summary.totalCells * 100).toFixed(1) : "0.0";
    lines.push(`| ${d} | ${n} | ${p}% |`);
  }
  lines.push("");
  lines.push("Composite tier :");
  lines.push("");
  lines.push("| Tier | Nombre | Allocation |");
  lines.push("|---|---:|---|");
  for (const t of ["A", "B", "C", "D", "BLOCKED"]) {
    const n = report.summary.byCompositeTier[t] ?? 0;
    const alloc = { A: "normal", B: "normal", C: "reduced", D: "micro", BLOCKED: "none" }[t];
    lines.push(`| ${t} | ${n} | ${alloc} |`);
  }
  lines.push("");
  lines.push("Rejets par filtre :");
  lines.push("");
  lines.push("| Filtre | Cellules rejetées |");
  lines.push("|---|---:|");
  lines.push(`| asset-quality (tier BLACKLIST) | ${report.summary.rejectedBy.aq} |`);
  lines.push(`| asset-setup-matrix (AVOID/WEAK) | ${report.summary.rejectedBy.asm} |`);
  lines.push(`| setup-variant-matrix (AVOID/WEAK) | ${report.summary.rejectedBy.svm} |`);
  lines.push(`| variant-regime-matrix (AVOID/WEAK) | ${report.summary.rejectedBy.vr} |`);
  lines.push(`| walk-forward (FAIL ou WF insuff. sans base très forte) | ${report.summary.rejectedBy.wf} |`);
  lines.push(`| données absentes pour un filtre | ${report.summary.rejectedBy.missingData} |`);
  lines.push(`| politique (autres règles dures) | ${report.summary.rejectedBy.policy} |`);
  lines.push("");

  // 2. Top ALLOW par régime
  lines.push("## 2. Top ALLOW par régime (tier A puis B)");
  lines.push("");
  const allowCells = report.cells.filter(c => c.decision === "ALLOW");
  for (const regime of ["RANGE", "RISK_ON", "RISK_OFF"]) {
    const cells = allowCells.filter(c => c.regime === regime);
    lines.push(`### ${regime}`);
    lines.push("");
    if (!cells.length) { lines.push("_aucune cellule ALLOW dans ce régime_"); lines.push(""); continue; }
    cells.sort((a, b) => {
      const ta = a.compositeTier === "A" ? 0 : 1;
      const tb = b.compositeTier === "A" ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return (b.filters.variantRegime?.score ?? 0) - (a.filters.variantRegime?.score ?? 0);
    });
    lines.push("| Symbole | Setup | Variante | Tier | Confiance | Score VR | WF | Allocation |");
    lines.push("|---|---|---|---|---|---:|---|---|");
    for (const c of cells.slice(0, 25)) {
      const wfTier = c.filters.walkForward?.tier ?? "n/a";
      lines.push(`| ${c.symbol} | ${c.setup} | ${c.variant} | ${c.compositeTier} | ${c.confidence} | ${c.filters.variantRegime?.score ?? "n/a"} | ${wfTier} | ${c.recommendedAllocationProfile} |`);
    }
    if (cells.length > 25) lines.push(`_${cells.length - 25} cellules supplémentaires non listées_`);
    lines.push("");
  }

  // 3. Top REDUCE
  lines.push("## 3. Top REDUCE");
  lines.push("");
  const reduceCells = report.cells.filter(c => c.decision === "REDUCE").slice(0, 30);
  if (!reduceCells.length) { lines.push("_aucune cellule REDUCE_"); lines.push(""); }
  else {
    lines.push("| Symbole | Setup | Variante | Régime | Score VR | WF | Raison principale |");
    lines.push("|---|---|---|---|---:|---|---|");
    for (const c of reduceCells) {
      lines.push(`| ${c.symbol} | ${c.setup} | ${c.variant} | ${c.regime} | ${c.filters.variantRegime?.score ?? "n/a"} | ${c.filters.walkForward?.tier ?? "n/a"} | ${c.reasons[0] || "—"} |`);
    }
    const totalReduce = report.summary.byDecision.REDUCE;
    if (totalReduce > 30) lines.push(`_${totalReduce - 30} cellules supplémentaires non listées_`);
    lines.push("");
  }

  // 4. EXPERIMENTAL à surveiller
  lines.push("## 4. EXPERIMENTAL à surveiller");
  lines.push("");
  const expCells = report.cells.filter(c => c.decision === "EXPERIMENTAL").slice(0, 30);
  if (!expCells.length) { lines.push("_aucune cellule EXPERIMENTAL_"); lines.push(""); }
  else {
    lines.push("| Symbole | Setup | Variante | Régime | Base VR | WF | Raison |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const c of expCells) {
      lines.push(`| ${c.symbol} | ${c.setup} | ${c.variant} | ${c.regime} | ${c.filters.variantRegime?.tier ?? "n/a"} | ${c.filters.walkForward?.tier ?? "n/a"} | ${c.reasons.find(r => r.startsWith("WF") || r.startsWith("cap")) || c.reasons[0] || "—"} |`);
    }
    const totalExp = report.summary.byDecision.EXPERIMENTAL;
    if (totalExp > 30) lines.push(`_${totalExp - 30} cellules supplémentaires non listées_`);
    lines.push("");
  }

  // 5. BLOCK importants — STRONG-base bloquées par WF FAIL
  lines.push("## 5. BLOCK importants (STRONG-base bloquées par walk-forward)");
  lines.push("");
  const importantBlocks = report.cells.filter(c =>
    c.decision === "BLOCK" &&
    c.filters.variantRegime?.tier === "STRONG" &&
    c.filters.walkForward?.tier === "FAIL"
  );
  if (!importantBlocks.length) { lines.push("_aucune_"); lines.push(""); }
  else {
    lines.push("Ces cellules étaient STRONG dans la matrice variant-regime mais sont bloquées par le walk-forward. **Anti-surajustement actif.**");
    lines.push("");
    lines.push("| Symbole | Setup | Variante | Régime | Train (exp/PF) | Test (exp/PF) | Raison WF |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const c of importantBlocks) {
      const wf = c.filters.walkForward;
      lines.push(`| ${c.symbol} | ${c.setup} | ${c.variant} | ${c.regime} | ${fmt(wf?.trainExpectancy)} / ${fmt(wf?.trainPf)} | ${fmt(wf?.testExpectancy)} / ${fmt(wf?.testPf)} | ${c.reasons[0] || "—"} |`);
    }
    lines.push("");
  }

  // 6. Cas focus
  lines.push("## 6. Cas focus par actif");
  lines.push("");
  for (const sym of FOCUS_SYMBOLS) {
    const symCells = report.cells.filter(c => c.symbol === sym);
    lines.push(`### ${sym}`);
    lines.push("");
    if (!symCells.length) { lines.push("_aucune cellule pour cet actif_"); lines.push(""); continue; }
    const dist = { ALLOW: 0, REDUCE: 0, EXPERIMENTAL: 0, BLOCK: 0 };
    for (const c of symCells) dist[c.decision]++;
    const flags = [];
    if (LEVERAGED_ETFS.has(sym)) flags.push("⚠ ETF leveragé (cap REDUCE)");
    lines.push(`Distribution : ALLOW ${dist.ALLOW} / REDUCE ${dist.REDUCE} / EXPERIMENTAL ${dist.EXPERIMENTAL} / BLOCK ${dist.BLOCK} (total ${symCells.length}).${flags.length ? " " + flags.join(" ") : ""}`);
    lines.push("");
    const tradables = symCells.filter(c => c.decision !== "BLOCK");
    if (!tradables.length) {
      lines.push("_aucune cellule tradable_");
      lines.push("");
      continue;
    }
    tradables.sort((a, b) => {
      if (a.decision !== b.decision) return ["ALLOW","REDUCE","EXPERIMENTAL"].indexOf(a.decision) - ["ALLOW","REDUCE","EXPERIMENTAL"].indexOf(b.decision);
      return (b.filters.variantRegime?.score ?? 0) - (a.filters.variantRegime?.score ?? 0);
    });
    lines.push("| Setup | Variante | Régime | Décision | Tier | Confiance | Allocation |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const c of tradables.slice(0, 15)) {
      lines.push(`| ${c.setup} | ${c.variant} | ${c.regime} | ${c.decision} | ${c.compositeTier} | ${c.confidence} | ${c.recommendedAllocationProfile} |`);
    }
    if (tradables.length > 15) lines.push(`_${tradables.length - 15} cellules supplémentaires non listées_`);
    lines.push("");
  }

  // 7. Risques connus
  lines.push("## 7. Risques connus");
  lines.push("");
  const cellsWithRisks = report.cells.filter(c => c.risks.length > 0 && c.decision !== "BLOCK");
  const riskCounts = {};
  for (const c of cellsWithRisks) {
    for (const r of c.risks) riskCounts[r] = (riskCounts[r] || 0) + 1;
  }
  if (!Object.keys(riskCounts).length) lines.push("_aucun risque taggé sur les cellules tradables_");
  else {
    lines.push("| Risque | Cellules tradables concernées |");
    lines.push("|---|---:|");
    for (const [risk, n] of Object.entries(riskCounts).sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${risk} | ${n} |`);
    }
  }
  lines.push("");

  // 8. Limites
  lines.push("## 8. Limites de fiabilité");
  lines.push("");
  lines.push("- **Dépend des 5 sources** : si l'une est obsolète ou manquante, des cellules entières peuvent passer à BLOCK ou disparaître. Toujours relancer les 5 moteurs avant ce consolidateur.");
  lines.push("- **Mode régime canonique unique** : on n'évalue que `ALL_REGIMES`. Les modes `NO_RISK_OFF` et `RISK_ON_ONLY` du backtest RS regime sont des filtres opérationnels dérivés, pas évalués séparément ici (ils donnent des chiffres identiques par cellule individuelle).");
  lines.push("- **Setups non-prioritaires** (MEAN_REVERSION, VOLATILITY_COMPRESSION) ne peuvent jamais sortir ALLOW. Au mieux EXPERIMENTAL avec base très forte. Politique stricte.");
  lines.push("- **Leveraged ETFs** : SOXL, USD, ROM sont systématiquement capés REDUCE. Liste à étendre si l'univers ajoute TQQQ, SQQQ, UPRO, etc.");
  lines.push("- **Aucun coût de transaction** : la décision ne tient pas compte du slippage, du spread, des frais ou des gaps. Une cellule ALLOW peut redevenir non rentable avec frictions réelles. Priorité #3 du TODO quant.");
  lines.push("- **Walk-forward unique** : un seul split 2021-2023 / 2024-2025. Une cellule INSUFFICIENT_DATA promue EXPERIMENTAL doit être manipulée prudemment.");
  lines.push("- **Verdict ALLOW ≠ autorisation live** : ce tradable universe alimente un futur allocation-engine et sert de filtre amont. Le passage à l'argent réel reste conditionné à : paper trading live validé, gestion du risque opérationnelle, kill-switch testé, connecteur broker.");
  lines.push("");

  // 9. Recommandations pour allocation-engine-v1
  lines.push("## 9. Recommandations pour allocation-engine-v1");
  lines.push("");
  lines.push("- **Lecture de ce JSON** : `cells[].decision` + `compositeTier` + `recommendedAllocationProfile` est suffisant pour décider qui est autorisé.");
  lines.push("- **Sizing par tier** :");
  lines.push("  - `A` (ALLOW + HIGH confidence + priority setup + non-leveraged) → allocation pleine (à calibrer, ex. 1×).");
  lines.push("  - `B` (ALLOW autre) → allocation pleine (à calibrer, ex. 1×).");
  lines.push("  - `C` (REDUCE) → allocation réduite (ex. 0.5×).");
  lines.push("  - `D` (EXPERIMENTAL) → allocation micro (ex. 0.25×) — uniquement si tracking actif et tolérance perte.");
  lines.push("  - `BLOCKED` → 0.");
  lines.push("- **Exposition globale** : ne pas dépasser N positions ALLOW simultanées (M à calibrer). Privilégier diversification setup × régime × secteur.");
  lines.push("- **Gestion RISK_OFF macro** : quand le régime macro courant est RISK_OFF, ne considérer que les cellules dont `regime === \"RISK_OFF\"` ET dont la décision est ALLOW/REDUCE (très peu — confirme que RISK_OFF doit forcer une réduction d'exposition générale).");
  lines.push("- **Stop & kill-switch** : si le résultat live (paper trading) diverge significativement du test 2024-2025 sur N trades consécutifs, dégrader temporairement la cellule à C ou D.");
  lines.push("");

  return lines.join("\n");
}

main().catch(err => {
  console.error("[tradable-universe] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
