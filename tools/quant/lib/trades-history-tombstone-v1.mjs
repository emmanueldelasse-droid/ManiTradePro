// tools/quant/lib/trades-history-tombstone-v1.mjs
//
// TRADES HISTORY TOMBSTONE V1 — module analytique pur ManiTradePro.
//
// Référence documentaire : docs/monitoring/KNOWN_ISSUES.md #16
//                          docs/project/DATA_PIPELINE.md § Trades sync
//
// Rôle : helpers déterministes pour gérer le **tombstone** d'une
// suppression utilisateur d'historique trades. Empêche la réapparition
// d'anciens trades :
//   - depuis Supabase (filtre `loadTradesState` côté front) ;
//   - depuis le sync (filtre `syncTradesToSupabase`) ;
//   - depuis le backup local (`restoreTradesFromBackupIfEmpty`).
//
// PRINCIPE :
//   Une suppression utilisateur est une VÉRITÉ PERSISTÉE, pas une simple
//   suppression visuelle. Tant que `meta.lastWipedAt` est défini, tous
//   les trades dont la date `opened_at` (ou `created_at`/`closed_at`)
//   est ANTÉRIEURE à `lastWipedAt` sont considérés "obsolètes" et
//   filtrés.
//
// CONTRAT D'API :
//   - Pure functions. Pas d'I/O. Pas d'effet de bord.
//   - Déterministe.
//   - Inputs invalides → boolean false par défaut (conservatif —
//     ne filtre pas par accident).

export const TRADES_HISTORY_TOMBSTONE_V1_VERSION = "trades-history-tombstone-v1";

/**
 * Le tombstone est-il actif (lastWipedAt défini et > 0) ?
 *
 * Aucun TTL : la suppression est persistée tant que `meta.lastWipedAt`
 * existe en localStorage. L'utilisateur peut reset via DevTools si
 * besoin (clé `mtp_trades_meta`).
 *
 * @param {Object} meta — payload `loadTradesMeta()` côté front
 * @returns {boolean}
 */
export function isTombstoneActiveV1(meta) {
  if (!meta || typeof meta !== "object") return false;
  const ts = Number(meta.lastWipedAt);
  return Number.isFinite(ts) && ts > 0;
}

/**
 * Retourne le timestamp en ms de la suppression, ou null si aucune.
 *
 * @param {Object} meta
 * @returns {number|null}
 */
export function getTombstoneMsV1(meta) {
  if (!isTombstoneActiveV1(meta)) return null;
  return Number(meta.lastWipedAt);
}

/**
 * Un trade est-il antérieur au tombstone (donc obsolète) ?
 *
 * Convention : on regarde dans l'ordre `opened_at`, puis `created_at`,
 * puis `closed_at`. Si aucune date dispo → return false (on garde par
 * prudence, plutôt que filtrer par accident).
 *
 * Pourquoi `opened_at` en priorité : le trade est créé à l'ouverture.
 * Un trade pré-wipe (ouvert avant) est obsolète même s'il a été fermé
 * après le wipe (cas rare : position pas fermée par le wipeAll, mais
 * fermée plus tard par une autre action).
 *
 * @param {Object} trade
 * @param {number|null} tombstoneMs
 * @returns {boolean}
 */
export function isTradeOlderThanTombstoneV1(trade, tombstoneMs) {
  if (!Number.isFinite(tombstoneMs) || tombstoneMs <= 0) return false;
  if (!trade || typeof trade !== "object") return false;
  const refDate = trade.opened_at || trade.openedAt
    || trade.created_at || trade.createdAt
    || trade.closed_at || trade.closedAt;
  if (!refDate) return false;
  const ms = Date.parse(String(refDate));
  if (!Number.isFinite(ms)) return false;
  return ms < tombstoneMs;
}

/**
 * Filtre une liste de trades en retirant ceux antérieurs au tombstone.
 *
 * @param {Array} trades
 * @param {number|null} tombstoneMs
 * @returns {Array}
 */
export function filterTradesByTombstoneV1(trades, tombstoneMs) {
  if (!Array.isArray(trades)) return [];
  if (!Number.isFinite(tombstoneMs) || tombstoneMs <= 0) return [...trades];
  return trades.filter((t) => !isTradeOlderThanTombstoneV1(t, tombstoneMs));
}

/**
 * Faut-il restaurer les trades depuis le backup local ?
 *
 * Réponse : NON si tombstone actif (la suppression est définitive).
 * Sinon, oui (comportement legacy).
 *
 * @param {Object} meta
 * @returns {boolean}
 */
export function shouldRestoreFromBackupV1(meta) {
  return !isTombstoneActiveV1(meta);
}

/**
 * Faut-il ignorer un trade à l'envoi de sync ?
 *
 * Réponse : OUI si tombstone actif ET trade antérieur au tombstone.
 * Évite la réinjection multi-onglet/multi-device.
 *
 * @param {Object} trade
 * @param {Object} meta
 * @returns {boolean}
 */
export function shouldIgnoreTradeForSyncV1(trade, meta) {
  const ts = getTombstoneMsV1(meta);
  if (ts === null) return false;
  return isTradeOlderThanTombstoneV1(trade, ts);
}

// === TOMBSTONE SERVEUR (PR-TRADES-TOMBSTONE-SERVER-V2) =====================
//
// Étend le tombstone V1 (local uniquement) avec une vérité centrale côté
// Supabase. Permet la synchronisation multi-device (PC ↔ iPhone) :
// un wipe sur un device propage au prochain refresh des autres.
//
// Source SQL : cloudflare-worker/migrations/017_trades_meta.sql
// Endpoint  : GET /api/trades/state → payload.data.meta = { lastWipedAt, wipeVersion, updatedAt }
//             POST /api/trades/sync → idem dans response.

/**
 * Parse une string ISO en ms epoch, ou retourne 0 si invalide.
 *
 * @param {string|null|undefined} iso
 * @returns {number}
 */
export function parseIsoToMsSafeV1(iso) {
  if (typeof iso !== "string" || iso.length === 0) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Fusionne le tombstone local et le tombstone serveur. Le plus récent gagne.
 *
 * Cas :
 *   - server > local : adoption server. Le client s'aligne.
 *   - local > server : le client a wipé hors-ligne. Flag `pendingRemoteWipe`
 *     pour retenter au prochain sync.
 *   - server == local : aligné, rien à faire.
 *   - both null : pas de tombstone du tout.
 *
 * @param {Object} input
 * @param {Object|null} input.localMeta   payload `loadTradesMeta()` côté front
 * @param {Object|null} input.serverMeta  payload `response.data.meta` du worker
 * @returns {Object} {
 *   effectiveTombstoneMs: number,    // max des deux (0 si aucun)
 *   serverTombstoneMs:    number,
 *   localTombstoneMs:     number,
 *   serverWins:           boolean,   // adopter le serveur
 *   pendingRemoteWipe:    boolean,   // pusher au serveur au prochain wipe
 *   inSync:               boolean    // server == local exactement
 * }
 */
export function mergeTombstonesV1({ localMeta, serverMeta } = {}) {
  const localMs = Number(localMeta?.lastWipedAt);
  const localTombstoneMs = Number.isFinite(localMs) && localMs > 0 ? localMs : 0;
  const serverTombstoneMs = parseIsoToMsSafeV1(serverMeta?.lastWipedAt);

  const effectiveTombstoneMs = Math.max(localTombstoneMs, serverTombstoneMs);
  const serverWins = serverTombstoneMs > localTombstoneMs;
  const pendingRemoteWipe = localTombstoneMs > serverTombstoneMs;
  const inSync = localTombstoneMs > 0 && localTombstoneMs === serverTombstoneMs;

  return {
    effectiveTombstoneMs,
    serverTombstoneMs,
    localTombstoneMs,
    serverWins,
    pendingRemoteWipe,
    inSync,
  };
}

/**
 * Faut-il pousser un wipe au serveur ? OUI si tombstone local > serveur
 * (donc l'utilisateur a wipé hors-ligne et le serveur ne l'a pas encore vu).
 *
 * @param {Object|null} localMeta
 * @param {Object|null} serverMeta
 * @returns {boolean}
 */
export function shouldPushPendingWipeV1(localMeta, serverMeta) {
  const merged = mergeTombstonesV1({ localMeta, serverMeta });
  return merged.pendingRemoteWipe;
}
