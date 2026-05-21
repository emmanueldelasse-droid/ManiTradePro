// tools/quant/test/context-engine-v1.test.mjs
//
// Tests unitaires Context Engine V1 — node:test (intégré, zéro dépendance).
//
// Exécution :
//   node --test tools/quant/test/context-engine-v1.test.mjs
//
// Couvre les 5 cas obligatoires du brief PR-CTX-2 :
//   1. RISK_ON canonique (tendance positive + vol normale).
//   2. HIGH_VOL override (tendance positive + rvol > 25 %).
//   3. RISK_OFF canonique (tendance négative).
//   4. Données insuffisantes (warnings remplis, pas d'exception).
//   5. Déterminisme (mêmes inputs → mêmes sorties JSON).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildContextSnapshotV1,
  CONTEXT_V1_UNIVERSE,
} from "../lib/context-engine-v1.mjs";

// === PRNG seedé (mulberry32) ===============================================

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand) {
  const u1 = Math.max(1e-9, rand());
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function ymd(offsetDays) {
  // base date 2020-01-01, increment offsetDays (no calendar skipping — only ordering matters).
  const base = Date.UTC(2020, 0, 1);
  const d = new Date(base + offsetDays * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function makeSeries({ days, startPrice, slope, dailyVol, seed }) {
  const rand = mulberry32(seed);
  const candles = [];
  let price = startPrice;
  for (let i = 0; i < days; i++) {
    const ret = slope + dailyVol * gaussian(rand);
    price = price * Math.exp(ret);
    candles.push({
      time: ymd(i),
      open: price,
      high: price * 1.002,
      low: price * 0.998,
      close: price,
      volume: 1_000_000,
    });
  }
  return candles;
}

// Génère un univers complet avec des paramètres de tendance par défaut.
function makeUniverse({
  days = 320,
  trend = "up",
  vol = "normal",
  highVolBurstDays = 0,
  seedBase = 1000,
}) {
  // Slopes (log returns daily) :
  //   up   :  +0.0008 (~+20%/an)
  //   flat :   0
  //   down :  -0.0010
  // Daily vol :
  //   normal : 0.0080 (~12.7% annualised)
  //   high   : 0.0200 (~31.7% annualised)
  const slopeMap = { up: 0.0008, flat: 0, down: -0.0010 };
  const volMap = { normal: 0.0080, high: 0.0200 };
  const slope = slopeMap[trend] ?? 0;
  const dailyVol = volMap[vol] ?? 0.0080;

  const universe = {};
  CONTEXT_V1_UNIVERSE.forEach((sym, idx) => {
    let s = makeSeries({
      days,
      startPrice: 100,
      slope,
      dailyVol,
      seed: seedBase + idx,
    });
    // Burst HIGH_VOL ciblé sur SPY (derniers N jours surchauffés).
    if (sym === "SPY" && highVolBurstDays > 0) {
      const rand = mulberry32(seedBase + 999);
      for (let i = days - highVolBurstDays; i < days; i++) {
        const ret = slope + 0.0250 * gaussian(rand); // ~40% annualised
        const prev = i === 0 ? 100 : s[i - 1].close;
        const newClose = prev * Math.exp(ret);
        s[i] = {
          time: s[i].time,
          open: newClose,
          high: newClose * 1.01,
          low: newClose * 0.99,
          close: newClose,
          volume: 1_000_000,
        };
      }
    }
    universe[sym] = s;
  });
  return universe;
}

// === Tests =================================================================

test("1. RISK_ON canonique : tendance positive + vol normale → regime = RISK_ON", () => {
  const candlesBySymbol = makeUniverse({
    days: 320,
    trend: "up",
    vol: "normal",
    seedBase: 4000,
  });

  const snap = buildContextSnapshotV1({ candlesBySymbol });

  assert.equal(snap.version, "context-engine-v1");
  assert.equal(snap.regime, "RISK_ON");
  assert.ok(snap.regimeConfidence >= 50 && snap.regimeConfidence <= 100,
    `confidence in [50,100], got ${snap.regimeConfidence}`);
  assert.equal(snap.regimeSource.primary, "SPY");
  assert.equal(snap.regimeSource.rulesVersion, "regime-rules-v1");
  assert.equal(snap.dataQuality.missingSymbols.length, 0);
  assert.equal(snap.dataQuality.insufficientHistory.length, 0);
  assert.equal(snap.dataQuality.evaluatedSymbols.length, CONTEXT_V1_UNIVERSE.length);
  assert.equal(snap.breadth.totalEvaluated, 14); // 3 indices + 11 secteurs
  assert.ok(snap.breadth.pctRiskOn >= 50,
    `breadth pctRiskOn should be majority risk_on, got ${snap.breadth.pctRiskOn}`);
  assert.equal(snap.vol.proxy, "SPY_REALIZED_VOL_20D");
  assert.ok(["LOW", "NORMAL", "ELEVATED"].includes(snap.vol.state),
    `vol.state should be sub-HIGH, got ${snap.vol.state}`);
  assert.ok(snap.vol.value !== null && snap.vol.value < 0.25,
    `rvol should be below 25%, got ${snap.vol.value}`);
  assert.equal(snap.sectorLeadership.leaders.length, 3);
  assert.equal(snap.sectorLeadership.laggards.length, 3);
});

test("2. HIGH_VOL override : burst de volatilité SPY → regime = HIGH_VOL", () => {
  const candlesBySymbol = makeUniverse({
    days: 320,
    trend: "up",
    vol: "normal",
    highVolBurstDays: 20,
    seedBase: 5000,
  });

  const snap = buildContextSnapshotV1({ candlesBySymbol });

  assert.equal(snap.regime, "HIGH_VOL",
    `expected HIGH_VOL override, got ${snap.regime} (rvol=${snap.vol.value})`);
  assert.equal(snap.vol.state, "HIGH",
    `vol.state should be HIGH on override, got ${snap.vol.state}`);
  assert.ok(snap.vol.value > 0.25,
    `rvol should exceed 25% threshold, got ${snap.vol.value}`);
  assert.ok(snap.regimeConfidence >= 50,
    `confidence should be >= 50, got ${snap.regimeConfidence}`);
});

test("3. RISK_OFF canonique : tendance négative → regime = RISK_OFF", () => {
  const candlesBySymbol = makeUniverse({
    days: 320,
    trend: "down",
    vol: "normal",
    seedBase: 6000,
  });

  const snap = buildContextSnapshotV1({ candlesBySymbol });

  assert.equal(snap.regime, "RISK_OFF",
    `expected RISK_OFF, got ${snap.regime}`);
  assert.ok(snap.breadth.pctRiskOff >= 50,
    `breadth pctRiskOff should be majority risk_off, got ${snap.breadth.pctRiskOff}`);
  assert.notEqual(snap.defensiveConfirmation.tltState, "UNKNOWN");
  assert.notEqual(snap.defensiveConfirmation.gldState, "UNKNOWN");
});

test("4. Données insuffisantes : warnings remplis, pas d'exception, output produit", () => {
  // Seulement 100 bougies par symbole — sous le seuil 252.
  const candlesBySymbol = {};
  CONTEXT_V1_UNIVERSE.forEach((sym, idx) => {
    candlesBySymbol[sym] = makeSeries({
      days: 100,
      startPrice: 100,
      slope: 0.0008,
      dailyVol: 0.0080,
      seed: 7000 + idx,
    });
  });

  const snap = buildContextSnapshotV1({ candlesBySymbol });

  // Le snapshot doit être produit, pas une exception.
  assert.equal(snap.version, "context-engine-v1");
  assert.equal(snap.regime, null,
    "regime should be null when SPY/QQQ/SMH lack history");
  assert.equal(snap.regimeConfidence, 0);
  assert.equal(snap.dataQuality.evaluatedSymbols.length, 0);
  assert.equal(snap.dataQuality.insufficientHistory.length, CONTEXT_V1_UNIVERSE.length);
  assert.ok(snap.warnings.length > 0, "warnings should be populated");
  // Aucune valeur inventée pour rvol.
  assert.equal(snap.vol.state, "UNKNOWN");
  assert.equal(snap.vol.value, null);

  // Cas extrême : symboles manquants entièrement.
  const empty = buildContextSnapshotV1({ candlesBySymbol: {} });
  assert.equal(empty.regime, null);
  assert.equal(empty.dataQuality.missingSymbols.length, CONTEXT_V1_UNIVERSE.length);
  assert.equal(empty.dataQuality.evaluatedSymbols.length, 0);
});

test("5. Déterminisme : mêmes inputs → mêmes sorties JSON byte-à-byte", () => {
  const dataset = makeUniverse({
    days: 320,
    trend: "up",
    vol: "normal",
    seedBase: 8000,
  });

  const snap1 = buildContextSnapshotV1({ candlesBySymbol: dataset });
  const snap2 = buildContextSnapshotV1({ candlesBySymbol: dataset });
  const snap3 = buildContextSnapshotV1({ candlesBySymbol: dataset, asOf: snap1.asOf });

  const json1 = JSON.stringify(snap1);
  const json2 = JSON.stringify(snap2);
  const json3 = JSON.stringify(snap3);

  assert.equal(json1, json2, "two identical calls must produce identical JSON");
  assert.equal(json1, json3, "explicit asOf at last date must match implicit asOf");
});

test("bonus : forme de l'output respecte le contrat", () => {
  const dataset = makeUniverse({
    days: 320,
    trend: "up",
    vol: "normal",
    seedBase: 9000,
  });
  const snap = buildContextSnapshotV1({ candlesBySymbol: dataset });

  // Top-level keys
  for (const k of [
    "version", "asOf", "regime", "regimeConfidence", "regimeSource",
    "breadth", "sectorLeadership", "vol", "defensiveConfirmation",
    "warnings", "dataQuality",
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(snap, k), `missing key: ${k}`);
  }

  // Breadth shape
  for (const k of [
    "riskOnCount", "riskOffCount", "neutralCount",
    "totalEvaluated", "pctRiskOn", "pctRiskOff",
  ]) {
    assert.ok(Object.prototype.hasOwnProperty.call(snap.breadth, k),
      `missing breadth.${k}`);
  }

  // Sector leader shape
  for (const e of snap.sectorLeadership.leaders) {
    for (const k of ["symbol", "score", "trendState", "relStrength20d", "relStrength63d"]) {
      assert.ok(Object.prototype.hasOwnProperty.call(e, k), `missing leader.${k}`);
    }
  }

  // Vol shape
  assert.equal(snap.vol.proxy, "SPY_REALIZED_VOL_20D");
  assert.ok(["LOW", "NORMAL", "ELEVATED", "HIGH", "UNKNOWN"].includes(snap.vol.state));

  // Defensive shape
  assert.ok(["CONFIRM_RISK_OFF", "NEUTRAL", "RISK_ON_CONTRADICTION", "UNKNOWN"]
    .includes(snap.defensiveConfirmation.tltState));
  assert.ok(["CONFIRM_STRESS", "NEUTRAL", "RISK_ON_CONTRADICTION", "UNKNOWN"]
    .includes(snap.defensiveConfirmation.gldState));
});
