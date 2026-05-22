// tools/quant/test/trades-history-tombstone-v1.test.mjs
//
// Tests unitaires Trades History Tombstone V1 — node:test.
//
// Exécution :
//   node --test tools/quant/test/trades-history-tombstone-v1.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TRADES_HISTORY_TOMBSTONE_V1_VERSION,
  isTombstoneActiveV1,
  getTombstoneMsV1,
  isTradeOlderThanTombstoneV1,
  filterTradesByTombstoneV1,
  shouldRestoreFromBackupV1,
  shouldIgnoreTradeForSyncV1,
  parseIsoToMsSafeV1,
  mergeTombstonesV1,
  shouldPushPendingWipeV1,
} from "../lib/trades-history-tombstone-v1.mjs";

// === Fixtures =============================================================

const TS_2024_06_01 = Date.parse("2024-06-01T00:00:00.000Z"); // tombstone fictif
const tradeBefore = { id: "T1", opened_at: "2024-05-15T10:00:00.000Z" };
const tradeAfter  = { id: "T2", opened_at: "2024-06-15T10:00:00.000Z" };
const tradeEdge   = { id: "T3", opened_at: "2024-06-01T00:00:00.000Z" }; // strictement égal
const tradeNoDate = { id: "T4" };
const tradeClosedAt = { id: "T5", closed_at: "2024-05-20T10:00:00.000Z" };
const tradeCreatedAt = { id: "T6", created_at: "2024-05-25T10:00:00.000Z" };
const tradeBothDates = {
  id: "T7",
  opened_at: "2024-05-15T10:00:00.000Z",   // avant
  closed_at: "2024-06-15T10:00:00.000Z",   // après
};

// === Tests ================================================================

test("1. supprimer historique → tombstone actif persistant", () => {
  // L'utilisateur clique "vider" → meta.lastWipedAt est défini.
  const meta = { lastWipedAt: Date.now() };
  assert.equal(isTombstoneActiveV1(meta), true);
  // Pas de TTL : même après 24h ou 30 jours, tombstone reste actif.
  const metaOld = { lastWipedAt: Date.now() - 30 * 24 * 3600 * 1000 };
  assert.equal(isTombstoneActiveV1(metaOld), true);
});

test("2. tombstone non actif si meta absent / invalide", () => {
  assert.equal(isTombstoneActiveV1(null), false);
  assert.equal(isTombstoneActiveV1(undefined), false);
  assert.equal(isTombstoneActiveV1({}), false);
  assert.equal(isTombstoneActiveV1({ lastWipedAt: 0 }), false);
  assert.equal(isTombstoneActiveV1({ lastWipedAt: -1 }), false);
  assert.equal(isTombstoneActiveV1({ lastWipedAt: "garbage" }), false);
  assert.equal(getTombstoneMsV1({}), null);
});

test("3. trade antérieur au tombstone est obsolète", () => {
  assert.equal(isTradeOlderThanTombstoneV1(tradeBefore, TS_2024_06_01), true);
  assert.equal(isTradeOlderThanTombstoneV1(tradeAfter, TS_2024_06_01), false);
  // Strictement égal → considéré récent (>= ne filtre pas).
  assert.equal(isTradeOlderThanTombstoneV1(tradeEdge, TS_2024_06_01), false);
});

test("4. trade sans date → on garde par prudence", () => {
  assert.equal(isTradeOlderThanTombstoneV1(tradeNoDate, TS_2024_06_01), false);
  assert.equal(isTradeOlderThanTombstoneV1(null, TS_2024_06_01), false);
  assert.equal(isTradeOlderThanTombstoneV1({}, TS_2024_06_01), false);
});

test("5. closed_at / created_at utilisés en fallback si opened_at absent", () => {
  assert.equal(isTradeOlderThanTombstoneV1(tradeClosedAt, TS_2024_06_01), true);
  assert.equal(isTradeOlderThanTombstoneV1(tradeCreatedAt, TS_2024_06_01), true);
});

test("6. opened_at en priorité (trade ouvert avant wipe, fermé après → obsolète)", () => {
  // Cas rare : trade ouvert AVANT le wipe mais fermé APRÈS. opened_at
  // dicte → trade considéré obsolète.
  assert.equal(isTradeOlderThanTombstoneV1(tradeBothDates, TS_2024_06_01), true);
});

test("7. filterTradesByTombstoneV1 retire les obsolètes", () => {
  const trades = [tradeBefore, tradeAfter, tradeEdge, tradeNoDate, tradeClosedAt, tradeBothDates];
  const filtered = filterTradesByTombstoneV1(trades, TS_2024_06_01);
  // Gardés : tradeAfter, tradeEdge, tradeNoDate. Retirés : tradeBefore, tradeClosedAt, tradeBothDates.
  assert.deepEqual(filtered.map((t) => t.id).sort(), ["T2", "T3", "T4"]);
});

test("8. filterTradesByTombstoneV1 — sans tombstone retourne tout", () => {
  const trades = [tradeBefore, tradeAfter];
  assert.deepEqual(filterTradesByTombstoneV1(trades, null), trades);
  assert.deepEqual(filterTradesByTombstoneV1(trades, 0), trades);
  assert.deepEqual(filterTradesByTombstoneV1(trades, NaN), trades);
});

test("9. shouldRestoreFromBackupV1 — guard backup post-wipe", () => {
  // Sans tombstone → restauration autorisée (legacy).
  assert.equal(shouldRestoreFromBackupV1({}), true);
  assert.equal(shouldRestoreFromBackupV1(null), true);
  // Avec tombstone → restauration BLOQUÉE (la suppression est définitive).
  assert.equal(shouldRestoreFromBackupV1({ lastWipedAt: Date.now() }), false);
});

test("10. shouldIgnoreTradeForSyncV1 — empêche réinjection multi-device", () => {
  const meta = { lastWipedAt: TS_2024_06_01 };
  // Trade obsolète → ignoré au sync.
  assert.equal(shouldIgnoreTradeForSyncV1(tradeBefore, meta), true);
  assert.equal(shouldIgnoreTradeForSyncV1(tradeClosedAt, meta), true);
  // Trade récent → envoyé normalement.
  assert.equal(shouldIgnoreTradeForSyncV1(tradeAfter, meta), false);
  // Sans tombstone → comportement legacy (tout envoyé).
  assert.equal(shouldIgnoreTradeForSyncV1(tradeBefore, {}), false);
});

// === Tests de bout-en-bout simulant les scénarios brief ===================

test("brief #1 : supprimer historique → refresh → vide", () => {
  // Simule : wipe à T, remote contient encore quelques trades (peut arriver
  // entre l'ordre wipe et le refresh).
  const now = Date.now();
  const meta = { lastWipedAt: now };
  const remoteTradesBefore = [
    { id: "old1", opened_at: new Date(now - 10000).toISOString() },
    { id: "old2", opened_at: new Date(now - 5000).toISOString() },
  ];
  const tombstoneMs = getTombstoneMsV1(meta);
  const filtered = filterTradesByTombstoneV1(remoteTradesBefore, tombstoneMs);
  assert.equal(filtered.length, 0, "tous les trades antérieurs au wipe doivent disparaître");
});

test("brief #4 : POST sync ne réinjecte pas l'ancien historique", () => {
  // Cas multi-onglet : un onglet a déjà wipé, l'autre onglet a un
  // localStorage encore plein et tente un sync.
  const meta = { lastWipedAt: TS_2024_06_01 };
  const stalePositions = [tradeBefore, tradeAfter];
  // Filtrer avant l'envoi du sync.
  const cleaned = stalePositions.filter((t) => !shouldIgnoreTradeForSyncV1(t, meta));
  assert.equal(cleaned.length, 1);
  assert.equal(cleaned[0].id, "T2"); // seul tradeAfter reste
});

test("brief #5 : backup local présent → suppression → backup ne restaure rien", () => {
  // Backup local contient encore des trades. Tombstone actif.
  const meta = { lastWipedAt: Date.now() };
  assert.equal(shouldRestoreFromBackupV1(meta), false,
    "le tombstone doit bloquer toute restauration depuis le backup");
});

test("brief #8 : aucun trade supprimé ne doit alimenter Live Paper Analytics", () => {
  // Indirect : Live Paper Analytics se nourrit de mtp_trades.analysis_snapshot.
  // Si Supabase est vidé + tombstone filtre les remote → aucun trade
  // antérieur au wipe n'est ré-introduit côté front, donc rien à
  // ré-analyser.
  const meta = { lastWipedAt: TS_2024_06_01 };
  const remoteSinceLastSession = [tradeBefore, tradeAfter];
  const tsMs = getTombstoneMsV1(meta);
  const tradesVisibleFront = filterTradesByTombstoneV1(remoteSinceLastSession, tsMs);
  // Seul T2 (post-wipe) reste — c'est un nouveau trade, pas un trade supprimé.
  assert.equal(tradesVisibleFront.length, 1);
  assert.equal(tradesVisibleFront[0].id, "T2");
});

test("version exposée", () => {
  assert.equal(TRADES_HISTORY_TOMBSTONE_V1_VERSION, "trades-history-tombstone-v1");
});

// === PR-TRADES-TOMBSTONE-SERVER-V2 — merge server/local ====================

test("V2 A : parseIsoToMsSafeV1 — null/garbage → 0, ISO valide → ms", () => {
  assert.equal(parseIsoToMsSafeV1(null), 0);
  assert.equal(parseIsoToMsSafeV1(undefined), 0);
  assert.equal(parseIsoToMsSafeV1(""), 0);
  assert.equal(parseIsoToMsSafeV1("garbage"), 0);
  assert.equal(parseIsoToMsSafeV1(12345), 0);
  const ms = parseIsoToMsSafeV1("2024-06-01T00:00:00.000Z");
  assert.equal(ms, Date.UTC(2024, 5, 1, 0, 0, 0));
});

test("V2 B : mergeTombstonesV1 — server > local → serverWins", () => {
  // Cas : iPhone vient de wiper à T2, PC se reconnecte avec un local wipe T1.
  const localMs = Date.parse("2024-05-01T00:00:00.000Z");
  const serverIso = "2024-06-01T00:00:00.000Z";
  const merged = mergeTombstonesV1({
    localMeta: { lastWipedAt: localMs },
    serverMeta: { lastWipedAt: serverIso },
  });
  assert.equal(merged.serverWins, true);
  assert.equal(merged.pendingRemoteWipe, false);
  assert.equal(merged.inSync, false);
  assert.equal(merged.effectiveTombstoneMs, Date.parse(serverIso));
});

test("V2 C : mergeTombstonesV1 — local > server → pendingRemoteWipe", () => {
  // Cas : utilisateur wipe sur PC hors-ligne (Safari Load failed), local
  // mis à jour, serveur encore vieux.
  const localMs = Date.parse("2024-06-01T00:00:00.000Z");
  const serverIso = "2024-05-01T00:00:00.000Z";
  const merged = mergeTombstonesV1({
    localMeta: { lastWipedAt: localMs },
    serverMeta: { lastWipedAt: serverIso },
  });
  assert.equal(merged.serverWins, false);
  assert.equal(merged.pendingRemoteWipe, true);
  assert.equal(merged.inSync, false);
  assert.equal(merged.effectiveTombstoneMs, localMs);
});

test("V2 D : mergeTombstonesV1 — server == local → inSync", () => {
  const sameIso = "2024-06-01T00:00:00.000Z";
  const sameMs = Date.parse(sameIso);
  const merged = mergeTombstonesV1({
    localMeta: { lastWipedAt: sameMs },
    serverMeta: { lastWipedAt: sameIso },
  });
  assert.equal(merged.serverWins, false);
  assert.equal(merged.pendingRemoteWipe, false);
  assert.equal(merged.inSync, true);
  assert.equal(merged.effectiveTombstoneMs, sameMs);
});

test("V2 E : mergeTombstonesV1 — aucun tombstone → tout à 0", () => {
  const merged = mergeTombstonesV1({ localMeta: {}, serverMeta: {} });
  assert.equal(merged.effectiveTombstoneMs, 0);
  assert.equal(merged.serverTombstoneMs, 0);
  assert.equal(merged.localTombstoneMs, 0);
  assert.equal(merged.serverWins, false);
  assert.equal(merged.pendingRemoteWipe, false);
  assert.equal(merged.inSync, false);
});

test("V2 F : mergeTombstonesV1 — server seul (iPhone n'a jamais wipé)", () => {
  // Cas typique : un device fraîchement installé qui reçoit le wipe
  // serveur via /api/trades/state au boot.
  const serverIso = "2024-06-01T00:00:00.000Z";
  const merged = mergeTombstonesV1({
    localMeta: null,
    serverMeta: { lastWipedAt: serverIso },
  });
  assert.equal(merged.serverWins, true);
  assert.equal(merged.pendingRemoteWipe, false);
  assert.equal(merged.effectiveTombstoneMs, Date.parse(serverIso));
});

test("V2 G : shouldPushPendingWipeV1 — wrapper", () => {
  // local > server → push
  assert.equal(shouldPushPendingWipeV1(
    { lastWipedAt: Date.parse("2024-06-01T00:00:00.000Z") },
    { lastWipedAt: "2024-05-01T00:00:00.000Z" },
  ), true);
  // server > local → no push
  assert.equal(shouldPushPendingWipeV1(
    { lastWipedAt: Date.parse("2024-05-01T00:00:00.000Z") },
    { lastWipedAt: "2024-06-01T00:00:00.000Z" },
  ), false);
  // no tombstone → no push
  assert.equal(shouldPushPendingWipeV1({}, {}), false);
  assert.equal(shouldPushPendingWipeV1(null, null), false);
});

test("V2 H : flux multi-device PC→iPhone (test brief #1)", () => {
  // 1. PC wipe à T1. PC local meta = { lastWipedAt: T1Ms }.
  const T1ms = Date.parse("2024-06-01T10:00:00.000Z");
  const T1iso = new Date(T1ms).toISOString();
  // 2. iPhone n'a pas encore wipé. iPhone local meta = vide.
  // 3. iPhone fait GET /api/trades/state → reçoit server.lastWipedAt = T1iso.
  // 4. iPhone fait mergeTombstones → server > local → serverWins → adopt.
  const mergedIphone = mergeTombstonesV1({
    localMeta: null,
    serverMeta: { lastWipedAt: T1iso },
  });
  assert.equal(mergedIphone.serverWins, true);
  assert.equal(mergedIphone.effectiveTombstoneMs, T1ms);
  // 5. iPhone applique le filtre tombstone sur ses propres trades locaux.
  const localTradesIphone = [
    { id: "T1", opened_at: "2024-05-15T10:00:00.000Z" },  // antérieur → filtré
    { id: "T2", opened_at: "2024-06-15T10:00:00.000Z" },  // postérieur → gardé
  ];
  const filtered = filterTradesByTombstoneV1(localTradesIphone, mergedIphone.effectiveTombstoneMs);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, "T2");
});

test("V2 I : flux device offline qui revient (test brief #3)", () => {
  // 1. Device A wipe à T1, online OK. Server lastWipedAt = T1iso.
  const T1iso = "2024-06-01T10:00:00.000Z";
  // 2. Device B est offline depuis longtemps. Son localStorage contient
  //    encore d'anciens trades (opened_at = avant T1).
  const stalePositions = [
    { id: "stale1", opened_at: "2024-05-15T10:00:00.000Z" },
    { id: "stale2", opened_at: "2024-05-20T10:00:00.000Z" },
  ];
  // 3. Device B se reconnecte. GET state → server.lastWipedAt = T1iso.
  // 4. Device B tente POST sync avec stalePositions. Côté worker,
  //    isTradeOlderThanServerTombstone filtre. Côté front, on filtre AVANT
  //    l'envoi (anti-spam) via shouldIgnoreTradeForSyncV1.
  const merged = mergeTombstonesV1({
    localMeta: null,
    serverMeta: { lastWipedAt: T1iso },
  });
  const localMetaAfterMerge = { lastWipedAt: merged.effectiveTombstoneMs };
  for (const p of stalePositions) {
    assert.equal(shouldIgnoreTradeForSyncV1(p, localMetaAfterMerge), true,
      `${p.id} doit être ignoré côté sync (antérieur au tombstone server)`);
  }
});
