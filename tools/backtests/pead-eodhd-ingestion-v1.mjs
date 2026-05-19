// tools/backtests/pead-eodhd-ingestion-v1.mjs
//
// Ingestion des earnings historiques via EOD Historical Data (EODHD) pour le
// futur moteur POST_EARNINGS_DRIFT (PEAD).
//
// CE SCRIPT NE FAIT PAS DE BACKTEST. Il télécharge un dataset earnings propre,
// anti-look-ahead, et versionné.
//
// Pré-requis : variable d'environnement EODHD_API_KEY (cf. .env).
//
// Sortie principale :
//   - data/earnings/pead-eodhd-v1.json         (dataset complet)
//   - data/earnings/pead-eodhd-v1.meta.json    (metadata)
//   - tools/backtests/output/pead-eodhd-ingestion-v1.{json,md}  (audit qualité)
//
// Mode DRY_RUN (si EODHD_API_KEY absent) : aucun appel réseau, dataset vide
// avec verdict explicite "DATASET_NOT_GENERATED_DRY_RUN".

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
// Charge .env si dotenv est dispo, sinon utilise process.env tel quel
try { await import("dotenv/config"); } catch { /* dotenv optional */ }

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_EARNINGS_DIR = join(REPO_ROOT, "data", "earnings");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "pead-eodhd-ingestion-v1.json");
const OUT_MD = join(OUT_DIR, "pead-eodhd-ingestion-v1.md");
const DATASET_PATH = join(DATA_EARNINGS_DIR, "pead-eodhd-v1.json");
const META_PATH = join(DATA_EARNINGS_DIR, "pead-eodhd-v1.meta.json");

const API_KEY = process.env.EODHD_API_KEY;
const DRY_RUN = !API_KEY;

// === Mapping symbole UNIVERSE → ticker EODHD ===============================
// EODHD format : "AAPL.US", "ASML.AS", "BTC-USD.CC", etc.
// On reprend le mapping minimal pour rester causal vis-à-vis de l'univers.

const SYMBOL_TO_EODHD = {
  // US equities (default suffix .US)
  // Crypto
  BTC: "BTC-USD.CC", ETH: "ETH-USD.CC", SOL: "SOL-USD.CC",
  BNB: "BNB-USD.CC", AVAX: "AVAX-USD.CC", LINK: "LINK-USD.CC",
  // Europe
  ASML: "ASML.AS", AIR: "AIR.PA", LVMH: "MC.PA", TTE: "TTE.PA",
  SAP: "SAP.XETRA", NESN: "NESN.SW", RMS: "RMS.PA", SIE: "SIE.XETRA",
  STM: "STM.PA", CAP: "CAP.PA", DSY: "DSY.PA",
  // FX (pas applicable earnings)
  EURUSD: null, GBPUSD: null, USDJPY: null,
};

function symbolToEodhd(sym) {
  if (SYMBOL_TO_EODHD[sym] !== undefined) return SYMBOL_TO_EODHD[sym];
  return `${sym}.US`;
}

// === Univers =================================================================

const SYMBOLS = [...new Set(Object.values(UNIVERSE).flat())].filter((s) => symbolToEodhd(s) !== null);

// === Quality flags ==========================================================

function classifyMarketSession(beforeAfterMarket) {
  // EODHD field "before_after_market" :
  //   "BeforeMarket" | "AfterMarket" | "DuringMarket" | null
  if (beforeAfterMarket === "BeforeMarket") return "PRE_MARKET";
  if (beforeAfterMarket === "AfterMarket") return "POST_MARKET";
  if (beforeAfterMarket === "DuringMarket") return "INTRADAY";
  return "UNKNOWN";
}

function computeSurprisePct(actual, estimate) {
  if (!Number.isFinite(actual) || !Number.isFinite(estimate)) return null;
  if (estimate === 0) return null;
  return Number(((actual - estimate) / Math.abs(estimate) * 100).toFixed(2));
}

// === API call EODHD =========================================================
//
// Endpoint : /api/calendar/earnings/?api_token=KEY&fmt=json&from=YYYY-MM-DD
//             &to=YYYY-MM-DD&symbols=SYM1,SYM2,...
//
// Limite de batching : EODHD accepte plusieurs symboles, mais on batch par 50
// pour rester sous les limites raisonnables.

async function fetchEodhdEarningsBatch(eodhdSymbols, fromDate, toDate) {
  const url = new URL("https://eodhd.com/api/calendar/earnings/");
  url.searchParams.set("api_token", API_KEY);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("from", fromDate);
  url.searchParams.set("to", toDate);
  url.searchParams.set("symbols", eodhdSymbols.join(","));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`EODHD HTTP ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

async function fetchAllEarnings(symbols, fromDate, toDate) {
  const allEarnings = [];
  const BATCH = 50;
  const eodhdSyms = symbols.map(symbolToEodhd);
  for (let i = 0; i < eodhdSyms.length; i += BATCH) {
    const batch = eodhdSyms.slice(i, i + BATCH);
    console.log(`[pead-eodhd-ingestion] batch ${i}-${i + batch.length} / ${eodhdSyms.length}`);
    try {
      const data = await fetchEodhdEarningsBatch(batch, fromDate, toDate);
      const list = Array.isArray(data?.earnings) ? data.earnings : (Array.isArray(data) ? data : []);
      allEarnings.push(...list);
    } catch (e) {
      console.warn(`[pead-eodhd-ingestion] batch error : ${e.message}`);
    }
    // Pause anti-rate-limit
    await new Promise((r) => setTimeout(r, 250));
  }
  return allEarnings;
}

// === Normalisation EODHD → format PEAD =====================================

function normalize(raw, eodhdToUniverse) {
  const eodhdSym = raw.code || raw.symbol;
  const universeSym = eodhdToUniverse.get(eodhdSym) || eodhdSym.split(".")[0];
  const reportDate = raw.report_date || raw.date;
  const baMarket = raw.before_after_market || null;
  const session = classifyMarketSession(baMarket);
  // Construction du timestamp publishedAt :
  //   - PRE_MARKET : reportDate 08:00 ET (avant ouverture 9:30 ET)
  //   - POST_MARKET : reportDate 17:00 ET (après cloture 16:00 ET)
  //   - INTRADAY : reportDate 12:00 ET (peu fiable, marquer UNKNOWN)
  //   - UNKNOWN : reportDate seul, sans heure
  // Conversion ET → UTC : ET = UTC-5 (hiver) ou UTC-4 (été). Pour la
  // simplicité et la pré-data, on fixe à UTC-5 et on documente.
  let publishedAt;
  if (session === "PRE_MARKET") publishedAt = `${reportDate}T13:00:00Z`; // 08:00 ET ≈ 13:00 UTC (UTC-5)
  else if (session === "POST_MARKET") publishedAt = `${reportDate}T22:00:00Z`; // 17:00 ET ≈ 22:00 UTC
  else if (session === "INTRADAY") publishedAt = `${reportDate}T17:00:00Z`;
  else publishedAt = `${reportDate}T00:00:00Z`; // date seule

  const epsActual = Number.isFinite(Number(raw.actual)) ? Number(raw.actual) : null;
  const epsEstimate = Number.isFinite(Number(raw.estimate)) ? Number(raw.estimate) : null;
  const epsSurprisePct = computeSurprisePct(epsActual, epsEstimate);

  // EODHD fournit parfois revenue dans /api/fundamentals mais pas /calendar/earnings.
  // On laisse null si absent, à enrichir en v2.
  const revenueActual = Number.isFinite(Number(raw.revenue_actual)) ? Number(raw.revenue_actual) : null;
  const revenueEstimate = Number.isFinite(Number(raw.revenue_estimate)) ? Number(raw.revenue_estimate) : null;
  const revenueSurprisePct = computeSurprisePct(revenueActual, revenueEstimate);

  const qualityFlags = [];
  if (session === "UNKNOWN") qualityFlags.push("MARKET_SESSION_UNKNOWN");
  if (session === "INTRADAY") qualityFlags.push("INTRADAY_NOT_TRADABLE");
  if (epsActual === null) qualityFlags.push("EPS_ACTUAL_MISSING");
  if (epsEstimate === null) qualityFlags.push("EPS_ESTIMATE_MISSING");
  if (revenueActual === null) qualityFlags.push("REVENUE_ACTUAL_MISSING");
  if (revenueEstimate === null) qualityFlags.push("REVENUE_ESTIMATE_MISSING");

  return {
    symbol: universeSym,
    eodhdCode: eodhdSym,
    publishedAt,
    reportDate,
    marketSession: session,
    timezone: "UTC (assumed UTC-5 for ET, no DST adjustment)",
    epsActual,
    epsEstimate,
    epsSurprisePct,
    revenueActual,
    revenueEstimate,
    revenueSurprisePct,
    source: "EODHD",
    sourceConsensusDate: null, // EODHD ne fournit pas la date du consensus pré-publication
    fetchedAt: new Date().toISOString(),
    qualityFlags,
  };
}

// === Audit qualité ==========================================================

function audit(dataset) {
  const totalEvents = dataset.length;
  const bySymbol = new Map();
  const byYear = new Map();
  const bySession = { PRE_MARKET: 0, POST_MARKET: 0, INTRADAY: 0, UNKNOWN: 0 };
  let withEps = 0, withRevenue = 0, withSurprise = 0;
  for (const e of dataset) {
    bySymbol.set(e.symbol, (bySymbol.get(e.symbol) || 0) + 1);
    const y = String(e.reportDate || "").slice(0, 4);
    byYear.set(y, (byYear.get(y) || 0) + 1);
    bySession[e.marketSession] = (bySession[e.marketSession] || 0) + 1;
    if (e.epsActual !== null) withEps++;
    if (e.revenueActual !== null) withRevenue++;
    if (e.epsSurprisePct !== null) withSurprise++;
  }
  const symbolsRequested = SYMBOLS.length;
  const symbolsWithEarnings = bySymbol.size;
  const symbolsMissing = SYMBOLS.filter((s) => !bySymbol.has(s));
  const unknownPct = totalEvents > 0 ? Number((bySession.UNKNOWN / totalEvents * 100).toFixed(1)) : 0;
  const completenessScore = Math.round(
    (symbolsWithEarnings / symbolsRequested * 40) +
    (withEps / Math.max(1, totalEvents) * 30) +
    ((totalEvents - bySession.UNKNOWN) / Math.max(1, totalEvents) * 20) +
    (withSurprise / Math.max(1, totalEvents) * 10)
  );
  let verdict;
  if (totalEvents === 0) verdict = "DATASET_NOT_GENERATED_DRY_RUN";
  else if (completenessScore >= 80 && unknownPct < 20) verdict = "DATASET_READY_FOR_PROTOTYPE";
  else if (completenessScore >= 50 && unknownPct < 40) verdict = "PARTIAL_DATASET_READY";
  else if (unknownPct >= 40) verdict = "HIGH_LOOKAHEAD_RISK";
  else verdict = "DATASET_UNUSABLE";
  return {
    totalEvents, symbolsRequested, symbolsWithEarnings,
    symbolsMissingCount: symbolsMissing.length, symbolsMissing,
    bySession, unknownPct,
    epsActualCoveragePct: totalEvents > 0 ? Number((withEps / totalEvents * 100).toFixed(1)) : 0,
    revenueActualCoveragePct: totalEvents > 0 ? Number((withRevenue / totalEvents * 100).toFixed(1)) : 0,
    surpriseComputableCoveragePct: totalEvents > 0 ? Number((withSurprise / totalEvents * 100).toFixed(1)) : 0,
    byYear: Object.fromEntries(byYear),
    bySymbolDistribution: Object.fromEntries([...bySymbol.entries()].sort((a, b) => b[1] - a[1])),
    completenessScore, verdict,
  };
}

// === Main ==================================================================

async function main() {
  console.log(`[pead-eodhd-ingestion] démarrage (DRY_RUN=${DRY_RUN})`);
  if (DRY_RUN) {
    console.warn("[pead-eodhd-ingestion] EODHD_API_KEY absent → mode dry-run, AUCUN appel réseau, AUCUN dataset téléchargé.");
    console.warn("[pead-eodhd-ingestion] Pour exécuter avec ingestion réelle : exporter EODHD_API_KEY dans l'environnement et relancer.");
  }

  await mkdir(DATA_EARNINGS_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const fromDate = "2021-01-01";
  const toDate = "2025-12-31";

  let dataset = [];
  if (!DRY_RUN) {
    const eodhdToUniverse = new Map();
    for (const sym of SYMBOLS) eodhdToUniverse.set(symbolToEodhd(sym), sym);
    const raw = await fetchAllEarnings(SYMBOLS, fromDate, toDate);
    dataset = raw.map((r) => normalize(r, eodhdToUniverse)).filter((d) => d !== null);
    // Sort by symbol then publishedAt
    dataset.sort((a, b) => a.symbol.localeCompare(b.symbol) || a.publishedAt.localeCompare(b.publishedAt));
    console.log(`[pead-eodhd-ingestion] ${dataset.length} earnings événements ingérés`);
  }

  const auditResult = audit(dataset);

  const meta = {
    version: "v1",
    setupId: "POST_EARNINGS_DRIFT",
    source: "EODHD",
    sourceEndpoint: "https://eodhd.com/api/calendar/earnings/",
    ingestedAt: new Date().toISOString(),
    scriptVersion: "tools/backtests/pead-eodhd-ingestion-v1.mjs",
    coverage: {
      symbolsRequested: SYMBOLS.length,
      periodStart: fromDate,
      periodEnd: toDate,
      symbolsIngested: auditResult.symbolsWithEarnings,
      eventsTotal: auditResult.totalEvents,
      completenessScore: auditResult.completenessScore,
    },
    parameters: { fromDate, toDate, batchSize: 50, rateLimitMs: 250 },
    knownLimitations: [
      "EODHD ne fournit pas systématiquement le `sourceConsensusDate` (date où le consensus analystes a été figé). Risque de look-ahead silencieux si EODHD met à jour les estimates rétroactivement. Validation SEC nécessaire (cf. pead-sec-validation-v1.mjs).",
      "Heures de publication estimées : PRE_MARKET = 08:00 ET, POST_MARKET = 17:00 ET. Conversion en UTC en supposant UTC-5 (pas d'ajustement DST). Précision : ~1h.",
      "INTRADAY publications classées non-tradables (UNKNOWN_TRADABILITY).",
      "Symboles FX (EURUSD, GBPUSD, USDJPY) exclus (pas d'earnings).",
      "Symboles crypto inclus mais EODHD ne retourne probablement rien pour eux (pas d'earnings).",
      "Univers survivant 2021-2025 — pas de tickers delistés (cf. DATASET_GOVERNANCE.md).",
    ],
    antiLookAheadGuarantees: [
      "Aucun champ futur stocké (next quarter guidance, revisions post-earnings, etc.).",
      "PRE_MARKET → publishedAt = 13:00 UTC (≈ 08:00 ET, avant ouverture marché US à 14:30 UTC ≈ 9:30 ET).",
      "POST_MARKET → publishedAt = 22:00 UTC (≈ 17:00 ET, après cloture marché US à 21:00 UTC ≈ 16:00 ET).",
      "qualityFlags pour chaque event documentent les champs manquants.",
    ],
  };

  if (!DRY_RUN) {
    await writeFile(DATASET_PATH, JSON.stringify(dataset, null, 2), "utf8");
    await writeFile(META_PATH, JSON.stringify(meta, null, 2), "utf8");
  }

  const auditOutput = {
    generatedAt: new Date().toISOString(),
    scope: "Ingestion EODHD earnings + audit qualité",
    dryRun: DRY_RUN,
    verdict: auditResult.verdict,
    coverage: auditResult,
    meta,
    sources: [
      "EODHD /api/calendar/earnings",
      "tools/backtests/universe-v2.mjs",
    ],
  };

  await writeFile(OUT_JSON, JSON.stringify(auditOutput, null, 2), "utf8");
  await writeFile(OUT_MD, buildMarkdown(auditOutput), "utf8");

  console.log("");
  console.log(`Verdict : ${auditResult.verdict}`);
  console.log(`Completeness score : ${auditResult.completenessScore}/100`);
  console.log(`Events totaux : ${auditResult.totalEvents}`);
  console.log(`Symbols avec earnings : ${auditResult.symbolsWithEarnings}/${auditResult.symbolsRequested}`);
  console.log(`Distribution sessions : ${JSON.stringify(auditResult.bySession)}`);
  console.log(`Outputs :`);
  console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);
  if (!DRY_RUN) {
    console.log(`  - ${relative(REPO_ROOT, DATASET_PATH)}`);
    console.log(`  - ${relative(REPO_ROOT, META_PATH)}`);
  }
}

function fmt(n, d = 1) { if (n === null || n === undefined || !Number.isFinite(n)) return "n/a"; return Number(n).toFixed(d); }

function buildMarkdown(o) {
  const L = [];
  L.push("# PEAD EODHD Ingestion v1 — ManiTradePro");
  L.push("");
  L.push(`> Généré le ${o.generatedAt} par \`tools/backtests/pead-eodhd-ingestion-v1.mjs\`.`);
  L.push("");
  if (o.dryRun) {
    L.push("**⚠ MODE DRY_RUN.** Variable d'environnement `EODHD_API_KEY` absente. Aucun appel réseau, aucun dataset téléchargé. Pour générer le dataset réel :");
    L.push("");
    L.push("```bash");
    L.push("export EODHD_API_KEY=\"votre_clé\"");
    L.push("node tools/backtests/pead-eodhd-ingestion-v1.mjs");
    L.push("```");
    L.push("");
  }
  L.push(`## Verdict : **${o.verdict}**`);
  L.push("");
  L.push("| Critère | Valeur |");
  L.push("|---|---:|");
  L.push(`| Mode | ${o.dryRun ? "DRY_RUN" : "INGESTION_REELLE"} |`);
  L.push(`| Score complétude | ${o.coverage.completenessScore}/100 |`);
  L.push(`| Symbols UNIVERSE | ${o.coverage.symbolsRequested} |`);
  L.push(`| Symbols avec earnings | ${o.coverage.symbolsWithEarnings} (${fmt(o.coverage.symbolsWithEarnings / o.coverage.symbolsRequested * 100, 1)} %) |`);
  L.push(`| Events totaux | ${o.coverage.totalEvents} |`);
  L.push(`| EPS actual coverage | ${fmt(o.coverage.epsActualCoveragePct)} % |`);
  L.push(`| Revenue actual coverage | ${fmt(o.coverage.revenueActualCoveragePct)} % |`);
  L.push(`| Surprise computable | ${fmt(o.coverage.surpriseComputableCoveragePct)} % |`);
  L.push(`| UNKNOWN session % | ${fmt(o.coverage.unknownPct)} % |`);
  L.push("");

  L.push("## Distribution par session marché");
  L.push("");
  L.push("| Session | Events | % |");
  L.push("|---|---:|---:|");
  for (const [k, v] of Object.entries(o.coverage.bySession)) {
    const pct = o.coverage.totalEvents > 0 ? (v / o.coverage.totalEvents * 100) : 0;
    L.push(`| ${k} | ${v} | ${fmt(pct, 1)} % |`);
  }
  L.push("");

  L.push("## Distribution par année");
  L.push("");
  L.push("| Année | Events |");
  L.push("|---|---:|");
  for (const [y, n] of Object.entries(o.coverage.byYear).sort()) {
    L.push(`| ${y} | ${n} |`);
  }
  L.push("");

  if (o.coverage.symbolsMissing && o.coverage.symbolsMissing.length) {
    L.push(`## Symbols UNIVERSE SANS earnings (${o.coverage.symbolsMissingCount})`);
    L.push("");
    L.push(o.coverage.symbolsMissing.slice(0, 30).join(", ") + (o.coverage.symbolsMissingCount > 30 ? "…" : ""));
    L.push("");
    L.push("**Raisons possibles** : symbole non US (FX, crypto), ticker non couvert par EODHD, ou symbole sans earnings publics.");
    L.push("");
  }

  L.push("## Limitations connues");
  L.push("");
  for (const lim of o.meta.knownLimitations) L.push(`- ${lim}`);
  L.push("");

  L.push("## Garanties anti-look-ahead");
  L.push("");
  for (const g of o.meta.antiLookAheadGuarantees) L.push(`- ${g}`);
  L.push("");

  L.push("## Prochaines étapes obligatoires");
  L.push("");
  if (o.dryRun) {
    L.push("1. **Exécuter avec une vraie clé EODHD_API_KEY** pour générer le dataset.");
    L.push("2. **Re-tourner cet audit** pour vérifier la couverture réelle.");
    L.push("3. **Exécuter `pead-sec-validation-v1.mjs`** pour valider 20-50 earnings contre SEC EDGAR.");
    L.push("4. **Si verdict ≥ PARTIAL_DATASET_READY**, construire `pead-signal-detect-v1.mjs` (PR séparée).");
  } else {
    L.push("1. **Exécuter `pead-sec-validation-v1.mjs`** pour valider 20-50 earnings contre SEC EDGAR.");
    L.push("2. **Réviser le verdict** une fois la validation SEC effectuée.");
    L.push("3. **Si DATASET_READY_FOR_PROTOTYPE** confirmé, construire `pead-signal-detect-v1.mjs` (PR séparée).");
    L.push("4. **Toute mise à jour du dataset** → nouvelle version (`pead-eodhd-v2.json`), pas modification rétroactive.");
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("**Référence framework** : `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`, `docs/research/DATASET_GOVERNANCE.md`, `docs/research/PEAD_DATA_REQUIREMENTS.md`.");
  return L.join("\n");
}

main().catch((err) => {
  console.error("[pead-eodhd-ingestion] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
