-- Migration : ajout des colonnes manquantes sur mtp_training_settings
-- À exécuter dans Supabase → SQL Editor (UNE SEULE FOIS, idempotent via IF NOT EXISTS).
-- Après exécution, redéployer le Worker avec `wrangler deploy`.

alter table public.mtp_training_settings
  add column if not exists mode varchar(20),
  add column if not exists is_enabled boolean default false,
  add column if not exists auto_open_enabled boolean default true,
  add column if not exists auto_close_enabled boolean default true,
  add column if not exists allow_long boolean default true,
  add column if not exists allow_short boolean default true,
  add column if not exists max_open_positions integer default 15,
  add column if not exists max_positions_per_symbol integer default 1,
  add column if not exists min_actionability_score integer default 60,
  add column if not exists min_dossier_score integer default 60,
  add column if not exists capital_base numeric default 10000,
  add column if not exists risk_per_trade_pct numeric default 0.02,
  add column if not exists allocation_per_trade_pct numeric default 0.08,
  add column if not exists max_holding_hours integer default 240,
  add column if not exists allowed_symbols jsonb default '[]'::jsonb,
  add column if not exists allowed_setups jsonb default '["pullback","breakout","continuation","mean_reversion"]'::jsonb,
  add column if not exists mean_reversion_enabled boolean default true,
  add column if not exists max_daily_loss_pct numeric default 0.30,
  add column if not exists max_weekly_loss_pct numeric default 1.0,
  add column if not exists max_consecutive_losses integer default 999,
  add column if not exists updated_at timestamptz default now();

-- Unique constraint sur mode pour upsert (on_conflict=mode)
create unique index if not exists mtp_training_settings_mode_key on public.mtp_training_settings(mode);
