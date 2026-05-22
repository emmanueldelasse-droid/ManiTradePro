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
