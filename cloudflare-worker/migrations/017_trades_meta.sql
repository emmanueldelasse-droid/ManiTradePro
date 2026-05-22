-- cloudflare-worker/migrations/017_trades_meta.sql
--
-- PR-TRADES-TOMBSTONE-SERVER-V2 (2026-05-21)
--
-- Tombstone serveur pour la suppression d'historique trades.
--
-- Contexte : PR-TRADES-HISTORY-DELETE-FIX (PR #254) a livré un tombstone
-- LOCAL qui empêche un trade supprimé de réapparaître côté front (un device).
-- Le créateur a depuis identifié le bug multi-device : si on supprime sur PC,
-- l'iPhone réinjecte ses anciens trades au prochain refresh. Et inversement.
--
-- Solution : un marker GLOBAL stocké côté Supabase, qui devient la vérité
-- centrale. Tous les clients (PC, iPhone, Safari, Chrome) le lisent au
-- chargement et appliquent la suppression locale en conséquence.
--
-- Comportement attendu :
--   - Quand l'utilisateur wipe sur n'importe quel device :
--       - DELETE Supabase trades/positions (logique existante préservée).
--       - UPSERT mtp_trades_meta (key='global'): last_wiped_at=NOW(),
--         wipe_version+=1.
--   - GET /api/trades/state retourne le marker + les trades actuels filtrés
--     (tout trade dont opened_at < last_wiped_at est exclu).
--   - POST /api/trades/sync filtre l'input : tout trade dont opened_at
--     < last_wiped_at est rejeté silencieusement (anti-réinjection
--     multi-device).
--
-- Idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING). Aucune destruction.

CREATE TABLE IF NOT EXISTS mtp_trades_meta (
  key TEXT PRIMARY KEY,
  last_wiped_at TIMESTAMPTZ,
  wipe_version BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta JSONB
);

-- Insère la row "global" si elle n'existe pas. wipe_version=0 et
-- last_wiped_at=NULL signifient "aucun wipe n'a jamais eu lieu côté
-- serveur". Les clients qui n'ont pas non plus de tombstone local seront
-- alors en cohérence (aucun filtre).
INSERT INTO mtp_trades_meta (key, last_wiped_at, wipe_version, updated_at)
VALUES ('global', NULL, 0, NOW())
ON CONFLICT (key) DO NOTHING;

-- Index temporel pour consultations admin/debug éventuelles.
CREATE INDEX IF NOT EXISTS idx_mtp_trades_meta_updated_at
  ON mtp_trades_meta (updated_at DESC);

-- Note : aucune RLS policy ajoutée ici. La table est lue/écrite uniquement
-- par le cloudflare-worker via service-role key (cf. supabaseFetch). Le
-- front n'y accède jamais directement.
