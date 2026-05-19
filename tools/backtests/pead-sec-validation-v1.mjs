// tools/backtests/pead-sec-validation-v1.mjs
//
// Validation anti-look-ahead du dataset EODHD via SEC EDGAR.
//
// Prend un échantillon aléatoire d'earnings du dataset PEAD EODHD et vérifie
// que la date de publication correspond bien à un filing 10-Q ou 10-K déposé
// auprès de la SEC. Mesure le mismatch rate.
//
// Pré-requis :
//   - dataset EODHD existant (data/earnings/pead-eodhd-v1.json) — sinon dry-run
//   - User-Agent SEC obligatoire (SEC_USER_AGENT env var)
//
// SEC EDGAR n'exige pas de clé API, mais TOUT appel doit inclure un
// User-Agent identifiant l'application + un email de contact. Sinon
// l'IP est blacklistée.
//
// Sortie :
//   - tools/backtests/output/pead-sec-validation-v1.{json,md}

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_EARNINGS_DIR = join(REPO_ROOT, "data", "earnings");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "pead-sec-validation-v1.json");
const OUT_MD = join(OUT_DIR, "pead-sec-validation-v1.md");
const DATASET_PATH = join(DATA_EARNINGS_DIR, "pead-eodhd-v1.json");

const USER_AGENT = process.env.SEC_USER_AGENT || "ManiTradePro Research contact@example.invalid";
const SAMPLE_SIZE = Number(process.env.PEAD_SEC_SAMPLE_SIZE || 30);
const DRY_RUN = !fs.existsSync(DATASET_PATH);

// === Mapping symbole → CIK (préchargé via SEC company_tickers.json) =========
//
// SEC fournit https://www.sec.gov/files/company_tickers.json (~1 MB)
// qui mappe ticker → CIK. On le télécharge une fois et on cache localement.

const CIK_CACHE_PATH = join(DATA_EARNINGS_DIR, "_sec_company_tickers.json");

async function fetchCikMap() {
  if (fs.existsSync(CIK_CACHE_PATH)) {
    return JSON.parse(fs.readFileSync(CIK_CACHE_PATH, "utf8"));
  }
  console.log("[pead-sec-validation] téléchargement SEC company_tickers.json…");
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`SEC company_tickers HTTP ${res.status}`);
  const data = await res.json();
  const tickerToCik = {};
  for (const k of Object.keys(data)) {
    const e = data[k];
    if (e.ticker && e.cik_str !== undefined) {
      tickerToCik[e.ticker] = String(e.cik_str).padStart(10, "0");
    }
  }
  await mkdir(DATA_EARNINGS_DIR, { recursive: true });
  await writeFile(CIK_CACHE_PATH, JSON.stringify(tickerToCik, null, 2), "utf8");
  return tickerToCik;
}

// === Récupération des filings 10-Q/10-K depuis SEC ========================

async function fetchFilings(cik) {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`SEC submissions HTTP ${res.status} for CIK ${cik}`);
  const data = await res.json();
  const recent = data?.filings?.recent;
  if (!recent) return [];
  const out = [];
  for (let i = 0; i < (recent.form || []).length; i++) {
    const form = recent.form[i];
    if (form !== "10-Q" && form !== "10-K") continue;
    out.push({
      form,
      filingDate: recent.filingDate?.[i] || null,
      reportDate: recent.reportDate?.[i] || null,
      accessionNumber: recent.accessionNumber?.[i] || null,
      primaryDocument: recent.primaryDocument?.[i] || null,
    });
  }
  return out;
}

// === Validation d'un earnings vs filings SEC ===============================
//
// Critère de match : filingDate (SEC) ≈ reportDate (EODHD) à ±5 jours.
// Si EODHD reportDate = T (publication earnings) et SEC filingDate = T+1 ou T+2
// (souvent le 10-Q est filé 1-2 jours après l'announce), on considère que le
// match est OK. Si écart > 5 jours, mismatch.

function diffDays(a, b) {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.abs(da - db) / (1000 * 60 * 60 * 24);
}

function matchEarnings(event, filings) {
  const reportDate = event.reportDate;
  let best = null;
  for (const f of filings) {
    const d = diffDays(reportDate, f.filingDate);
    if (d === null) continue;
    if (!best || d < best.diff) best = { ...f, diff: d };
  }
  if (!best) return { matched: false, reason: "no_filing_found" };
  if (best.diff <= 5) return { matched: true, secFilingDate: best.filingDate, diffDays: Number(best.diff.toFixed(1)), form: best.form };
  return { matched: false, reason: `closest_diff_${best.diff.toFixed(1)}_days`, closestFiling: best };
}

// === Main ==================================================================

async function main() {
  console.log(`[pead-sec-validation] démarrage (DRY_RUN=${DRY_RUN}, USER_AGENT="${USER_AGENT.slice(0, 60)}")`);
  await mkdir(OUT_DIR, { recursive: true });

  if (DRY_RUN) {
    const output = {
      generatedAt: new Date().toISOString(),
      scope: "Validation SEC EDGAR du dataset EODHD",
      dryRun: true,
      reason: "data/earnings/pead-eodhd-v1.json absent — exécuter pead-eodhd-ingestion-v1.mjs d'abord",
      verdict: "VALIDATION_NOT_RUN",
      sources: ["data.sec.gov/submissions", "data/earnings/pead-eodhd-v1.json (manquant)"],
    };
    await writeFile(OUT_JSON, JSON.stringify(output, null, 2), "utf8");
    await writeFile(OUT_MD, buildMarkdown(output), "utf8");
    console.log("Verdict : VALIDATION_NOT_RUN (dataset EODHD manquant)");
    return;
  }

  const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, "utf8"));
  console.log(`[pead-sec-validation] dataset chargé : ${dataset.length} events`);

  // Filtrer aux symboles US susceptibles d'être SEC-registered
  const usEvents = dataset.filter((e) => /^[A-Z]+$/.test(e.symbol) && !["BTC", "ETH", "SOL", "BNB", "AVAX", "LINK", "EURUSD", "GBPUSD", "USDJPY"].includes(e.symbol));
  console.log(`[pead-sec-validation] events US filings éligibles : ${usEvents.length}`);

  // Tirer SAMPLE_SIZE events aléatoires
  const shuffled = [...usEvents].sort(() => Math.random() - 0.5);
  const sample = shuffled.slice(0, SAMPLE_SIZE);

  const cikMap = await fetchCikMap();
  const filingsCache = new Map();
  const results = [];
  for (const event of sample) {
    const cik = cikMap[event.symbol];
    if (!cik) {
      results.push({ event, validation: { matched: false, reason: "no_CIK_mapping" } });
      continue;
    }
    let filings;
    if (filingsCache.has(cik)) filings = filingsCache.get(cik);
    else {
      try {
        filings = await fetchFilings(cik);
        filingsCache.set(cik, filings);
        await new Promise((r) => setTimeout(r, 120)); // SEC rate limit
      } catch (e) {
        results.push({ event, validation: { matched: false, reason: `sec_fetch_error: ${e.message}` } });
        continue;
      }
    }
    const validation = matchEarnings(event, filings);
    results.push({ event: { symbol: event.symbol, reportDate: event.reportDate, marketSession: event.marketSession, eodhdCode: event.eodhdCode }, validation });
  }

  const matched = results.filter((r) => r.validation.matched).length;
  const total = results.length;
  const mismatchRate = total > 0 ? (1 - matched / total) : null;

  let verdict;
  if (total === 0) verdict = "VALIDATION_NOT_RUN";
  else if (mismatchRate <= 0.10) verdict = "VALIDATION_PASSED";
  else if (mismatchRate <= 0.25) verdict = "VALIDATION_PARTIAL";
  else verdict = "VALIDATION_FAILED";

  const output = {
    generatedAt: new Date().toISOString(),
    scope: "Validation SEC EDGAR du dataset EODHD",
    dryRun: false,
    sampleSize: total,
    matched,
    mismatchRate: mismatchRate !== null ? Number(mismatchRate.toFixed(3)) : null,
    matchRatePct: total > 0 ? Number(((matched / total) * 100).toFixed(1)) : 0,
    verdict,
    sample: results,
    sources: ["data.sec.gov/submissions", "www.sec.gov/files/company_tickers.json", "data/earnings/pead-eodhd-v1.json"],
  };

  await writeFile(OUT_JSON, JSON.stringify(output, null, 2), "utf8");
  await writeFile(OUT_MD, buildMarkdown(output), "utf8");

  console.log("");
  console.log(`Verdict : ${verdict}`);
  console.log(`Match rate : ${matched}/${total} (${total > 0 ? ((matched / total) * 100).toFixed(1) : 0} %)`);
  console.log(`Outputs :`);
  console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);
}

function fmt(n, d = 1) { if (n === null || n === undefined || !Number.isFinite(n)) return "n/a"; return Number(n).toFixed(d); }

function buildMarkdown(o) {
  const L = [];
  L.push("# PEAD SEC Validation v1 — ManiTradePro");
  L.push("");
  L.push(`> Généré le ${o.generatedAt} par \`tools/backtests/pead-sec-validation-v1.mjs\`.`);
  L.push("");
  L.push("Validation croisée des earnings EODHD contre les filings 10-Q/10-K SEC EDGAR pour détecter d'éventuels timestamps incorrects ou look-ahead silencieux dans le dataset EODHD.");
  L.push("");
  if (o.dryRun) {
    L.push(`**⚠ DRY_RUN** — ${o.reason}`);
    L.push("");
    L.push("Pour exécuter la validation :");
    L.push("");
    L.push("```bash");
    L.push("# 1. Ingérer le dataset EODHD d'abord");
    L.push("export EODHD_API_KEY=\"votre_clé\"");
    L.push("node tools/backtests/pead-eodhd-ingestion-v1.mjs");
    L.push("# 2. Puis lancer la validation SEC");
    L.push("export SEC_USER_AGENT=\"VotreNom contact@email.com\"");
    L.push("node tools/backtests/pead-sec-validation-v1.mjs");
    L.push("```");
    L.push("");
    return L.join("\n");
  }
  L.push(`## Verdict : **${o.verdict}**`);
  L.push("");
  L.push("| Critère | Valeur |");
  L.push("|---|---:|");
  L.push(`| Échantillon | ${o.sampleSize} earnings |`);
  L.push(`| Matches SEC | ${o.matched} |`);
  L.push(`| Match rate | ${fmt(o.matchRatePct)} % |`);
  L.push(`| Mismatch rate | ${fmt((o.mismatchRate || 0) * 100)} % |`);
  L.push("");

  L.push("## Critères de verdict");
  L.push("");
  L.push("- `VALIDATION_PASSED` : mismatch ≤ 10 %");
  L.push("- `VALIDATION_PARTIAL` : mismatch 10-25 %");
  L.push("- `VALIDATION_FAILED` : mismatch > 25 % (dataset EODHD suspect)");
  L.push("");

  L.push("## Échantillon détaillé");
  L.push("");
  L.push("| Symbole | EODHD reportDate | Session | SEC matched | Form | filingDate | diff jours | Reason si NO |");
  L.push("|---|---|---|---|---|---|---:|---|");
  for (const r of o.sample.slice(0, 50)) {
    const v = r.validation;
    if (v.matched) {
      L.push(`| ${r.event.symbol} | ${r.event.reportDate} | ${r.event.marketSession} | ✓ | ${v.form} | ${v.secFilingDate} | ${v.diffDays} | — |`);
    } else {
      L.push(`| ${r.event.symbol} | ${r.event.reportDate} | ${r.event.marketSession} | ✗ | — | — | — | ${v.reason} |`);
    }
  }
  L.push("");
  if (o.sample.length > 50) L.push(`_${o.sample.length - 50} echantillons supplémentaires non affichés_`);
  L.push("");

  L.push("## Lecture");
  L.push("");
  L.push("Le critère de match est : `|EODHD reportDate - SEC filingDate| ≤ 5 jours`. Cette tolérance permet :");
  L.push("- décalages timezone (EODHD parfois en ET, SEC toujours en ET).");
  L.push("- décalage entre announcement et formal filing (souvent 1-2 jours).");
  L.push("");
  L.push("Si mismatch > 5 jours : l'event EODHD ne correspond pas à un filing SEC connu. Causes possibles :");
  L.push("- Symbole non SEC-registered (ETF, étranger).");
  L.push("- Date EODHD incorrecte (look-ahead silencieux possible).");
  L.push("- Filing SEC en retard / amendé.");
  L.push("");

  L.push("## Recommandations");
  L.push("");
  if (o.verdict === "VALIDATION_PASSED") {
    L.push("- Dataset EODHD validé. Procéder à la construction du moteur PEAD (PR séparée).");
  } else if (o.verdict === "VALIDATION_PARTIAL") {
    L.push("- Dataset EODHD partiellement validé. Examiner les mismatches détaillés. Si concentration sur certains symboles → exclure du dataset PEAD.");
  } else if (o.verdict === "VALIDATION_FAILED") {
    L.push("- **Dataset EODHD suspect.** Trop de mismatches. Investiguer la cause :");
    L.push("  - timezone mismatch (EODHD vs SEC)");
    L.push("  - tickers non US (symboles européens, crypto inclus par erreur)");
    L.push("  - défauts de couverture SEC (companies non-public)");
    L.push("- Revoir la normalisation EODHD ou changer de source.");
  }
  L.push("");
  L.push("---");
  L.push("");
  L.push("**Référence framework** : `docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md`, `docs/research/ANTI_LOOKAHEAD_RULES.md`.");
  return L.join("\n");
}

main().catch((err) => {
  console.error("[pead-sec-validation] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
