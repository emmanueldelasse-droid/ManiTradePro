import test from "node:test";
import assert from "node:assert/strict";
import { buildPaperDecision, replayPaper } from "../../../cloudflare-worker/paper-engine.mjs";
import { getAsset, V2_DEFAULT_SETTINGS } from "../lib/engine-v2.mjs";

const cfg = { ...V2_DEFAULT_SETTINGS, startingEquity: 10_000, riskPerTradePct: 1, maxOpenPositions: 2 };
const iso = (day, hh = "08:00") => `2026-11-${String(day).padStart(2, "0")}T${hh}:00.000Z`;
function signal({ symbol = "AIR", setupType = "breakout", direction = "long", observedAt = iso(3, "18:00"), ...options } = {}) {
  return buildPaperDecision({ asset: getAsset(symbol), source: "eodhd", barTime: iso(3), observedAt,
    settings: cfg, quoteToEur: 0.9, ind: { close: 100, ema50: 95, atr14: 5, rsi14: 60 },
    setup: setupType && { direction, setupType, entry: 100, stopLoss: direction === "long" ? 95 : 105,
      takeProfit: direction === "long" ? 112 : 88, rr: 2.4, reason: "Signal initial" },
    validation: { valid: Boolean(setupType), reason: setupType ? "ok" : "no_setup" }, ...options });
}
const bar = (day, open, low, high, close, symbol = "AIR") =>
  ({ symbol, time: iso(day), openAt: iso(day), closeAt: iso(day, "17:00"), open, low, high, close });
const replay = (decisions, bars, asOf = iso(10, "20:00"), settings = cfg) => replayPaper({ decisions, bars, asOf, settings });

test("carte immuable, origine de la décision, limite, perte après frais et alerte de gap", () => {
  const d = signal();
  assert.equal(d.decision, "Entrée envisageable");
  assert.equal(d.quoteCurrency, "EUR");
  assert.equal(d.plan.entryLimit, 101.25);
  assert.ok(d.estimatedLossEur > 90 && d.estimatedLossEur <= 100);
  assert.match(d.gapWarning, /saut/);
  assert.equal(d.id, signal({ observedAt: iso(3,"19:00") }).id);
  assert.notEqual(d.id, signal({ validation: { valid: false, reason: "rr_below_min" } }).id);
  assert.equal(signal({ setupType: null }).decision, "Attendre");
  assert.equal(signal({ symbol: "SPY", quoteToEur: null }).referencePlan, null);
  assert.equal(signal({ source: "twelve" }).decision, "Écarter");
  assert.equal(signal({ dataUsable: false }).decision, "Écarter");
});

test("pas d'entrée rétrospective, délai de 5 min, ouverture trop chère définitivement manquée", () => {
  const d = signal({ observedAt: iso(4,"07:57") });
  const bars = [bar(4,100,94,115,110), bar(5,103,98,110,104), bar(6,100,90,115,112)];
  const r = replay([d], bars);
  assert.equal(r.statuses[d.id].state, "missed");
  assert.equal(r.statuses[d.id].at, iso(5));
  assert.equal(r.portfolios.current.closedCount, 0);
  assert.equal(replay([d],bars,iso(4,"10:00")).statuses[d.id].state, "pending");
});

test("A et référence finissent négatifs au gap, B évite seulement le retour à la moyenne", () => {
  const d = signal({ setupType: "mean_reversion" });
  const result = replay([d, d], [bar(4,100,97,103,99),bar(5,80,77,95,88)]);
  const { current, variant, reference } = result.portfolios;
  assert.equal(current.closedCount, 1);
  assert.equal(variant.closedCount, 0);
  assert.equal(reference.closedCount, 1);
  assert.equal(current.trades[0].exit, 80);
  assert.equal(current.trades[0].openedAt, iso(4));
  assert.equal(current.trades[0].closedAt, iso(5));
  assert.ok(current.netEur < -d.estimatedLossEur);
  assert.equal(current.netEur, +(current.grossEur-current.costsEur).toFixed(2));
  assert.equal(current.maxDrawdownEur, -current.netEur);
  assert.equal(result.variantEffect.avoidedLossEur, -current.netEur);
});

test("objectif et stop dans une bougie après une entrée à l'ouverture : stop prioritaire", () => {
  const d = signal();
  const result = replay([d],[bar(4,100,94,115,113)]);
  assert.equal(result.portfolios.current.trades[0].exit, 95);
  assert.equal(result.portfolios.current.closedCount, result.portfolios.variant.closedCount);
});

test("écarter un retour à la moyenne gagnant est comptabilisé et le plus gros gain est isolé", () => {
  const d = signal({setupType:"mean_reversion"});
  const r = replay([d],[bar(4,100,99,114,113)]);
  assert.equal(r.variantEffect.missedGainEur, r.portfolios.current.netEur);
  assert.equal(r.portfolios.current.dependsOnBest, true);
  assert.equal(r.portfolios.current.netWithoutBestEur, 0);
});

test("vente à découvert : prix plancher et gap haussier, coût du portage", () => {
  const d = signal({direction:"short"});
  assert.equal(d.plan.entryLimit, 98.75);
  assert.equal(replay([d],[bar(4,98,97,103,102)]).statuses[d.id].state, "missed");
  const r = replay([d],[bar(4,100,95,104,102),bar(5,120,110,121,111)]);
  assert.equal(r.portfolios.current.trades[0].exit, 120);
  assert.ok(r.portfolios.current.trades[0].costsEur > 2);
});

test("Benchmark indépendant actif aussi quand A conseille d'attendre, même capital et limites", () => {
  const d = signal({setupType:null});
  const r = replay([d],[bar(4,100,99,111,109)]);
  assert.equal(r.portfolios.current.closedCount, 0);
  assert.equal(r.portfolios.reference.closedCount, 1);
  assert.equal(r.netVsReferenceEur, -r.portfolios.reference.netEur);
});

test("taux de change connu avant l'exécution ; pas d'utilisation d'un futur taux", () => {
  const d = signal({symbol:"SPY"});
  const spy = bar(4,100,98,113,108,"SPY");
  const r = replay([d],[spy,bar(5,1.1,1.1,1.1,1.1,"EURUSD")]);
  assert.equal(r.statuses[d.id].state, "missed");
  const filled = replay([d],[bar(3,1.25,1.25,1.25,1.25,"EURUSD"),spy]);
  assert.equal(filled.portfolios.current.trades[0].entryFx, 0.8);
});

test("devise JPY des positions USDJPY convertie par EURUSD × USDJPY", () => {
  const d = signal({symbol:"USDJPY", quoteToEur:.008});
  const bars = [bar(3,1.25,1.25,1.25,1.25,"EURUSD"),bar(3,100,100,100,100,"USDJPY"),bar(4,100,97,113,110,"USDJPY")];
  const t = replay([d],bars).portfolios.current.trades[0];
  assert.equal(t.entryFx,0.008);
  assert.equal(t.exitFx,1 / (1.25 * 110));
  assert.ok(Math.abs(t.grossEur - 12 * t.qty * t.exitFx) <= .005);
});

test("limites communes, ordres concurrents et valorisation des positions non clôturées", () => {
  const d = signal(), e = signal({symbol:"SIE"});
  const bars = [bar(4,100,96,105,103),bar(4,100,96,105,103,"SIE")];
  const r = replay([d,e],bars,iso(4,"18:00"),{...cfg,maxOpenPositions:1});
  for (const p of Object.values(r.portfolios)) {
    assert.equal(p.openCount,1); assert.equal(p.closedCount,0);
    assert.ok(p.netEur > 0 && p.costsEur > 0);
  }
  assert.equal(Object.values(r.statuses).filter(s=>s.state==="missed").length,1);
});

test("un vrai zéro, une idée expirée et une valorisation devenue indisponible", () => {
  const d = signal();
  assert.equal(replay([],[]).portfolios.current.netEur,0);
  assert.equal(replay([d],[bar(10,100,95,120,110)]).statuses[d.id].state,"expired");
  assert.equal(replay([d],[bar(4,100,97,101,100)],iso(12)).portfolios.current.netEur,null);
});

test("idée échue alors que la séance d'exécution n'a pas encore publié son OHLC", () => {
  const d = signal();
  d.plan.expiresAt = iso(4, "13:00");
  const bars = [bar(4,100,99,114,113)];
  const beforeFinal = replay([d],bars,iso(4,"15:00"));
  assert.equal(beforeFinal.statuses[d.id].state, "pending");
  assert.match(beforeFinal.statuses[d.id].reason, /cotation finale/);
  assert.equal(replay([d],bars,iso(4,"17:00")).statuses[d.id].state,"closed");
});

test("révision du signal avant exécution et changement d'éligibilité indépendante", () => {
  const first = signal();
  const revision = signal({observedAt: iso(3,"19:00"), setup: {direction:"long", setupType:"breakout", entry:100, stopLoss:94, takeProfit:116, rr:2.67}});
  assert.notEqual(first.id, revision.id);
  const inactiveRef = signal({setupType:null, ind:{close:90,ema50:95,atr14:2}});
  const activeRef = signal({setupType:null, ind:{close:96,ema50:95,atr14:2}});
  assert.notEqual(inactiveRef.id, activeRef.id);
  const r = replay([first,revision],[bar(4,100,99,117,113)]);
  assert.equal(r.statuses[first.id].state, "discarded");
  assert.equal(r.portfolios.current.closedCount, 1);
  assert.equal(r.portfolios.current.trades[0].decisionId, revision.id);
});

test("provision d'acquisition LVMH et coûts de conversion explicites et imputés", () => {
  const lvmh = signal({symbol:"LVMH"});
  assert.equal(lvmh.costs.buyTaxReserveBps, 40);
  assert.equal(lvmh.costs.conversionBps, 0);
  const d = signal();
  const comparable = replay([d],[bar(4,100,99,113,110)]);
  const taxed = replay([lvmh],[bar(4,100,99,113,110,"LVMH")]);
  assert.ok(taxed.portfolios.current.costsEur > comparable.portfolios.current.costsEur);
  assert.equal(signal({symbol:"SPY"}).costs.conversionBps, 3);
});
