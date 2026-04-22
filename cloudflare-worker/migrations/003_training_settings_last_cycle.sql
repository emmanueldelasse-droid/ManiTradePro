-- Migration : ajout de `last_cycle_at` sur mtp_training_settings pour idempotence du cron scheduled
-- À exécuter dans Supabase → SQL Editor (UNE SEULE FOIS, idempotent via IF NOT EXISTS).
-- Après exécution, redéployer le Worker avec `wrangler deploy`.

alter table public.mtp_training_settings
  add column if not exists last_cycle_at timestamptz,
  add column if not exists last_cycle_mode varchar(30),
  add column if not exists last_cycle_summary jsonb default '{}'::jsonb;

-- `last_cycle_at`      : timestamp du dernier cycle scheduled terminé (utilisé pour skip si < 10 min)
-- `last_cycle_mode`    : "crypto-only" | "crypto+actions" | "skipped-night" | "skipped-off-hours"
-- `last_cycle_summary` : {closed: n, opened: n, errors: n, duration_ms: n} — résumé pour le badge UI
