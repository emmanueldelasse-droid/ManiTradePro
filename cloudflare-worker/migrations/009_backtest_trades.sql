-- Migration 009 : table mtp_backtest_trades (Phase 3 — backtest historique)
-- Chaque ligne = un trade simulé par le replay engine, avec son contexte complet
-- au moment de l'entrée. Alimente la mémoire contextuelle fine (Règle #1) et
-- permet l'agrégation par bucket (setup × direction × régime × asset_class).

create table if not exists public.mtp_backtest_trades (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  -- Lien avec le run qui a produit ce trade
  run_id text not null,

  -- Identification
  symbol text not null,
  asset_class text,                      -- crypto|stock|etf
  setup_type text,                       -- pullback|breakout|continuation|pullback_short|breakdown|continuation_short|mean_reversion
  direction text check (direction in ('long','short')),

  -- Contexte régime à l'entrée (pour bucket)
  regime_at_open text,                   -- RISK_ON|RISK_OFF|NEUTRAL|unknown
  regime_label text,                     -- tendanciel_haussier|tendanciel_baissier|range|volatilite_elevee|volatilite_basse

  -- Bucket d'agrégation
  bucket_key text,                       -- ex: pullback_long_RISK_ON_crypto

  -- Timing
  opened_at timestamptz not null,
  closed_at timestamptz,
  holding_minutes integer,
  exit_reason text,                      -- stop_loss|take_profit|time_exit|engine_invalidation|end_of_data

  -- Prix
  entry_price numeric not null,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,

  -- P&L (en % uniquement — pas de quantité réelle, c'est de la simulation pure)
  pnl_pct numeric,
  rr_ratio numeric,
  mae_pct numeric,                       -- max adverse excursion
  mfe_pct numeric,                       -- max favorable excursion

  -- Snapshot des indicateurs à l'entrée
  indicators jsonb,                      -- {ema20, ema50, rsi14, atr14, distance_ema20_pct, ...}
  scores jsonb                           -- {structure, momentum, timing, risk, context, participation, raw}
);

create index if not exists idx_mtp_backtest_trades_run
  on public.mtp_backtest_trades (run_id);

create index if not exists idx_mtp_backtest_trades_bucket
  on public.mtp_backtest_trades (bucket_key)
  where bucket_key is not null;

create index if not exists idx_mtp_backtest_trades_symbol_opened
  on public.mtp_backtest_trades (symbol, opened_at desc);

create index if not exists idx_mtp_backtest_trades_setup_direction
  on public.mtp_backtest_trades (setup_type, direction);

alter table public.mtp_backtest_trades enable row level security;
drop policy if exists "mtp_backtest_trades_read"  on public.mtp_backtest_trades;
drop policy if exists "mtp_backtest_trades_write" on public.mtp_backtest_trades;
create policy "mtp_backtest_trades_read"  on public.mtp_backtest_trades for select using (true);
create policy "mtp_backtest_trades_write" on public.mtp_backtest_trades for all    using (true) with check (true);
