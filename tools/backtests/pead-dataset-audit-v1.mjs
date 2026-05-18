// tools/backtests/pead-dataset-audit-v1.mjs
//
// Audit des datasets disponibles pour POST_EARNINGS_DRIFT (PEAD).
//
// Objectif : répondre à "Avons-nous les données nécessaires pour tester
// sérieusement PEAD sans tricher ?"
//
// CE SCRIPT NE FAIT PAS DE BACKTEST. Il audite les sources :
//   - Quelles données existent dans le repo (data/, tools/, etc.) ?
//   - Quels symboles ont OHLC complet ?
//   - Quels champs manquent pour PEAD (earnings dates, EPS surprise) ?
//   - Score de complétude.
//
// STRICTEMENT offline. Aucun runtime modifié. Aucune source externe appelée.

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "pead-dataset-audit-v1.json");
const OUT_MD = join(OUT_DIR, "pead-dataset-audit-v1.md");

const SYMBOLS = [...new Set(Object.values(UNIVERSE).flat())];

// === Audit 1 : OHLC daily existence ========================================

function auditOhlc() {
  const symbolsWithOhlc = [];
  const symbolsWithoutOhlc = [];
  const ohlcDetails = {};
  for (const s of SYMBOLS) {
    const p = join(DATA_DIR, `${s}_2025.json`);
    if (!fs.existsSync(p)) {
      symbolsWithoutOhlc.push(s);
      continue;
    }
    try {
      const raw = JSON.parse(fs.readFileSync(p, "utf8"));
      const first = raw[0]?.time || raw[0]?.date;
      const last = raw[raw.length - 1]?.time || raw[raw.length - 1]?.date;
      const hasOpen = raw.some((c) => Number.isFinite(Number(c.open)));
      const hasVolume = raw.some((c) => Number.isFinite(Number(c.volume)) && Number(c.volume) > 0);
      symbolsWithOhlc.push(s);
      ohlcDetails[s] = {
        candleCount: raw.length,
        firstDate: first,
        lastDate: last,
        hasOpen,
        hasVolume,
      };
    } catch (e) {
      symbolsWithoutOhlc.push(s);
    }
  }
  return { symbolsWithOhlc, symbolsWithoutOhlc, ohlcDetails };
}

// === Audit 2 : recherche de fichiers earnings dans le repo =================

function searchForEarningsData() {
  const candidatePaths = [
    join(REPO_ROOT, "data", "earnings"),
    join(REPO_ROOT, "data", "fundamentals"),
    join(REPO_ROOT, "data", "events"),
    join(REPO_ROOT, "tools", "earnings"),
    join(REPO_ROOT, "tools", "fundamentals"),
    join(REPO_ROOT, "tools", "backtests", "earnings"),
  ];
  const found = [];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const stat = fs.statSync(p);
      found.push({ path: relative(REPO_ROOT, p), exists: true, isDir: stat.isDirectory() });
    }
  }
  // Search for filenames containing "earnings" or "eps"
  function walk(dir, depth = 0, hits = []) {
    if (depth > 3) return hits;
    if (!fs.existsSync(dir)) return hits;
    let items;
    try { items = fs.readdirSync(dir); } catch { return hits; }
    for (const item of items) {
      if (item === "node_modules" || item.startsWith(".")) continue;
      const full = join(dir, item);
      let stat;
      try { stat = fs.statSync(full); } catch { continue; }
      const lower = item.toLowerCase();
      if (lower.includes("earnings") || lower.includes("eps") || (lower.includes("pead") && !lower.includes("pead-dataset-audit") && !lower.includes("pead_data_requirements") && !lower.includes("post_earnings_drift_foundation") && !lower.includes("post-earnings-drift-research"))) {
        hits.push({ path: relative(REPO_ROOT, full), isDir: stat.isDirectory() });
      }
      if (stat.isDirectory()) walk(full, depth + 1, hits);
    }
    return hits;
  }
  const fileHits = walk(REPO_ROOT);
  return { candidatePaths: found, filenameHits: fileHits };
}

// === Audit 3 : champs présents dans les fichiers OHLC =====================

function auditOhlcFieldCoverage(symbolsWithOhlc) {
  // Sample 5 symboles pour voir s'il y a des champs additionnels (gap, surprise, etc.)
  const samples = symbolsWithOhlc.slice(0, 5);
  const fieldsSeen = new Set();
  for (const s of samples) {
    try {
      const raw = JSON.parse(fs.readFileSync(join(DATA_DIR, `${s}_2025.json`), "utf8"));
      const first = raw[0] || {};
      for (const k of Object.keys(first)) fieldsSeen.add(k);
    } catch {}
  }
  return [...fieldsSeen];
}

// === Score de complétude PEAD =============================================

function computeReadiness(ohlc, earnings) {
  // Critères PEAD :
  // 1. OHLC daily complet (open, close, volume) : ESSENTIEL
  // 2. Earnings dates par symbole : ESSENTIEL
  // 3. EPS actual + estimate : IMPORTANT (pour surprise)
  // 4. Pre/post-market flag : IMPORTANT (timing)
  // 5. Volume daily : IMPORTANT (volume relative)
  const ohlcCoverage = ohlc.symbolsWithOhlc.length / SYMBOLS.length;
  const haveEarnings = earnings.candidatePaths.length > 0 || earnings.filenameHits.length > 0;
  let score = 0;
  let level = "DATA_INSUFFICIENT";
  // OHLC : 30 points si complet
  score += Math.round(ohlcCoverage * 30);
  // Earnings : 50 points si dispo
  if (haveEarnings) score += 50;
  // Volume : déjà inclus dans OHLC
  // Pre/post-market : non testable sans earnings dataset
  if (score >= 80) level = "DATA_READY";
  else if (score >= 50) level = "PARTIAL_DATA_READY";
  else if (haveEarnings) level = "PARTIAL_DATA_READY";
  else level = "DATA_INSUFFICIENT";
  // Si OHLC > 80% mais pas d'earnings → high look-ahead risk si on essaie de bricoler
  if (!haveEarnings && ohlcCoverage > 0.8) level = "DATA_INSUFFICIENT";
  return { score, level, ohlcCoveragePct: Number((ohlcCoverage * 100).toFixed(1)), hasEarnings: haveEarnings };
}

// === Main =================================================================

console.log("[pead-dataset-audit] démarrage…");
const ohlc = auditOhlc();
console.log(`[pead-dataset-audit] OHLC : ${ohlc.symbolsWithOhlc.length}/${SYMBOLS.length} symboles`);
const earnings = searchForEarningsData();
console.log(`[pead-dataset-audit] earnings paths trouvés : ${earnings.candidatePaths.length}, fichiers nommés earnings/eps : ${earnings.filenameHits.length}`);
const fields = auditOhlcFieldCoverage(ohlc.symbolsWithOhlc);
const readiness = computeReadiness(ohlc, earnings);

const report = {
  generatedAt: new Date().toISOString(),
  scope: "Audit des datasets disponibles pour POST_EARNINGS_DRIFT (PEAD). Pas de backtest dans ce script.",
  universeSize: SYMBOLS.length,
  ohlcAudit: {
    symbolsWithOhlc: ohlc.symbolsWithOhlc.length,
    symbolsWithoutOhlc: ohlc.symbolsWithoutOhlc.length,
    missingSymbols: ohlc.symbolsWithoutOhlc,
    coveragePct: Number(((ohlc.symbolsWithOhlc.length / SYMBOLS.length) * 100).toFixed(1)),
    ohlcFieldsDetected: fields,
    sampleDateRange: ohlc.ohlcDetails[ohlc.symbolsWithOhlc[0]] || null,
  },
  earningsAudit: {
    paths: earnings.candidatePaths,
    filenameHits: earnings.filenameHits,
    hasEarningsData: earnings.candidatePaths.length > 0 || earnings.filenameHits.length > 0,
  },
  readiness,
  verdict: readiness.level,
  sources: [
    "tools/backtests/universe-v2.mjs (univers)",
    "data/*.json (OHLC daily)",
  ],
};

await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
await writeFile(OUT_MD, buildMarkdown(report), "utf8");

console.log("");
console.log(`Readiness : ${readiness.level} (score ${readiness.score}/100)`);
console.log(`OHLC coverage : ${readiness.ohlcCoveragePct} %`);
console.log(`Earnings data found : ${readiness.hasEarnings}`);
console.log(`Outputs :`);
console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);

function buildMarkdown(r) {
  const L = [];
  L.push("# PEAD Dataset Audit v1 — ManiTradePro");
  L.push("");
  L.push(`> Généré le ${r.generatedAt} par \`tools/backtests/pead-dataset-audit-v1.mjs\`.`);
  L.push("");
  L.push("**⚠ Audit offline.** Ce script ne backtest pas. Il vérifie uniquement si les données nécessaires pour tester PEAD existent dans le repo.");
  L.push("");

  L.push("## Verdict de complétude : **" + r.verdict + "**");
  L.push("");
  L.push("| Critère | Statut |");
  L.push("|---|---|");
  L.push(`| Univers déclaré | ${r.universeSize} symboles |`);
  L.push(`| OHLC coverage | ${r.readiness.ohlcCoveragePct} % (${r.ohlcAudit.symbolsWithOhlc}/${r.universeSize}) |`);
  L.push(`| Earnings data dans repo | ${r.readiness.hasEarnings ? "OUI" : "**NON**"} |`);
  L.push(`| Score de complétude | ${r.readiness.score}/100 |`);
  L.push(`| Verdict | **${r.verdict}** |`);
  L.push("");

  L.push("## 1. OHLC daily");
  L.push("");
  L.push(`- Symboles avec OHLC : **${r.ohlcAudit.symbolsWithOhlc}** / ${r.universeSize}`);
  L.push(`- Coverage : **${r.ohlcAudit.coveragePct} %**`);
  L.push(`- Champs détectés dans les fichiers OHLC : \`${r.ohlcAudit.ohlcFieldsDetected.join(", ")}\``);
  if (r.ohlcAudit.sampleDateRange) {
    L.push(`- Période couverte (sample) : ${r.ohlcAudit.sampleDateRange.firstDate} → ${r.ohlcAudit.sampleDateRange.lastDate}`);
    L.push(`- Candles par symbole (sample) : ${r.ohlcAudit.sampleDateRange.candleCount}`);
  }
  L.push("");
  if (r.ohlcAudit.missingSymbols.length) {
    L.push(`Symboles UNIVERSE sans OHLC : ${r.ohlcAudit.missingSymbols.join(", ")}`);
    L.push("");
  }

  L.push("## 2. Earnings data");
  L.push("");
  if (r.earningsAudit.hasEarningsData) {
    L.push("Données earnings trouvées dans le repo :");
    L.push("");
    for (const p of r.earningsAudit.paths) L.push(`- \`${p.path}\` (${p.isDir ? "dossier" : "fichier"})`);
    L.push("");
    if (r.earningsAudit.filenameHits.length) {
      L.push("Fichiers avec nom contenant earnings/eps/pead :");
      L.push("");
      for (const h of r.earningsAudit.filenameHits.slice(0, 20)) L.push(`- \`${h.path}\``);
      L.push("");
    }
  } else {
    L.push("**Aucune donnée earnings trouvée dans le repo.**");
    L.push("");
    L.push("Aucun fichier nommé `earnings*`, `eps*` ou `pead*` n'a été détecté dans data/, tools/, ou ailleurs.");
    L.push("");
    L.push("Les fichiers OHLC ne contiennent que les champs `" + r.ohlcAudit.ohlcFieldsDetected.join(", ") + "` — pas de surprise EPS, pas de date earnings.");
    L.push("");
    L.push("**Conséquence directe** : tester PEAD nécessite l'ingestion d'un nouveau dataset.");
  }
  L.push("");

  L.push("## 3. Verdict détaillé");
  L.push("");
  if (r.verdict === "DATA_READY") {
    L.push("✓ Les données suffisent pour démarrer un backtest PEAD propre.");
  } else if (r.verdict === "PARTIAL_DATA_READY") {
    L.push("⚠ Données partielles : on peut commencer une recherche mais avec limitations. Voir section \"datasets manquants\" dans `docs/research/PEAD_DATA_REQUIREMENTS.md`.");
  } else if (r.verdict === "HIGH_LOOKAHEAD_RISK") {
    L.push("✗ Des données existent mais leur usage présente un risque élevé de look-ahead. À auditer avant utilisation.");
  } else {
    L.push("✗ **Données insuffisantes.** Impossible de tester PEAD honnêtement sans sourcer un dataset earnings.");
    L.push("");
    L.push("Cf. `docs/research/PEAD_DATA_REQUIREMENTS.md` pour la liste exacte des données nécessaires et les sources possibles.");
  }
  L.push("");

  L.push("## 4. Prochaines étapes");
  L.push("");
  if (r.verdict === "DATA_INSUFFICIENT") {
    L.push("1. Décider d'une source de données earnings (gratuite vs payante, cf. `PEAD_DATA_REQUIREMENTS.md`).");
    L.push("2. Construire un script d'ingestion qui populera `data/earnings/{SYMBOL}_earnings.json` avec : date, type (pre/post-market), actual EPS, estimate EPS, surprise %.");
    L.push("3. Re-tourner ce script d'audit pour valider que la couverture est suffisante.");
    L.push("4. Construire ensuite `tools/backtests/pead-signal-v1.mjs` (PR séparée).");
  } else {
    L.push("1. Valider la qualité des données existantes (audit anti-look-ahead spécifique).");
    L.push("2. Construire le moteur PEAD v1 (PR séparée).");
  }
  L.push("");

  L.push("---");
  L.push("");
  L.push("**Limites de cet audit** :");
  L.push("- Le script ne télécharge rien (offline). Il ne vérifie que ce qui est présent dans le repo.");
  L.push("- Il ne lit que les noms de fichiers et leurs champs JSON. Il ne valide pas la qualité interne (timestamps cohérents, pas de doublons, etc.).");
  L.push("- Il assume que `data/` est le seul emplacement des données. Si d'autres datasets existent ailleurs (Cloudflare KV, R2, etc.), ils ne sont pas audités ici.");
  return L.join("\n");
}
