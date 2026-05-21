// tools/quant/context-engine-smoke-v1.mjs
//
// Smoke script Context Engine V1.
//
// But : charger les bougies daily des 16 symboles de l'univers contexte V1
// depuis `data/{SYMBOL}_2025.json` et produire un snapshot pour la dernière
// date commune. Écrit l'output dans `tools/quant/output/context-engine-smoke-v1.json`.
//
// Exécution :
//   node tools/quant/context-engine-smoke-v1.mjs
//   node tools/quant/context-engine-smoke-v1.mjs --asOf 2024-06-28
//
// Caractéristiques :
//   - Read-only sur `data/`. Aucune mutation des datasets.
//   - Reproductible : pas de Date.now(), pas d'aléa, pas de network.
//   - Sortie déterministe pour le même dataset + asOf.
//
// Le smoke script n'est PAS branché en runtime. Il sert uniquement à valider
// que le moteur tourne sur des données réelles.

import fs from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import {
  buildContextSnapshotV1,
  CONTEXT_V1_UNIVERSE,
} from "./lib/context-engine-v1.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "quant", "output");
const OUT_FILE = join(OUT_DIR, "context-engine-smoke-v1.json");

function parseArgs(argv) {
  const args = { asOf: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--asOf" && i + 1 < argv.length) {
      args.asOf = argv[i + 1];
      i++;
    }
  }
  return args;
}

function loadCandles(symbol) {
  const path = join(DATA_DIR, `${symbol}_2025.json`);
  if (!fs.existsSync(path)) return null;
  const raw = JSON.parse(fs.readFileSync(path, "utf8"));
  if (!Array.isArray(raw)) return null;
  const normalized = raw
    .map((c) => ({
      time: c.time || c.date,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume) || 0,
    }))
    .filter(
      (c) =>
        typeof c.time === "string" &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close),
    )
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
  return normalized;
}

async function main() {
  const args = parseArgs(process.argv);

  const candlesBySymbol = {};
  const loaded = [];
  const missing = [];
  for (const sym of CONTEXT_V1_UNIVERSE) {
    const c = loadCandles(sym);
    if (c && c.length > 0) {
      candlesBySymbol[sym] = c;
      loaded.push(sym);
    } else {
      missing.push(sym);
    }
  }

  const snapshot = buildContextSnapshotV1({
    asOf: args.asOf,
    candlesBySymbol,
  });

  const payload = {
    smokeMeta: {
      script: "tools/quant/context-engine-smoke-v1.mjs",
      universeLoaded: loaded,
      universeMissingOnDisk: missing,
      asOfRequested: args.asOf,
    },
    snapshot,
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2), "utf8");

  // Petit résumé console (smoke = doit pouvoir tourner et donner un signal).
  const s = snapshot;
  const lines = [
    `Context Engine V1 — smoke run`,
    `  asOf            : ${s.asOf}`,
    `  regime          : ${s.regime} (confidence ${s.regimeConfidence})`,
    `  vol             : rvol=${s.vol.value} state=${s.vol.state}`,
    `  breadth         : ${s.breadth.riskOnCount}/${s.breadth.totalEvaluated} riskOn (${s.breadth.pctRiskOn}%)`,
    `  leaders         : ${s.sectorLeadership.leaders.map((l) => l.symbol).join(", ") || "—"}`,
    `  laggards        : ${s.sectorLeadership.laggards.map((l) => l.symbol).join(", ") || "—"}`,
    `  defensive       : TLT=${s.defensiveConfirmation.tltState} GLD=${s.defensiveConfirmation.gldState}`,
    `  warnings        : ${s.warnings.length}`,
    `  output          : ${OUT_FILE}`,
  ];
  console.log(lines.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
