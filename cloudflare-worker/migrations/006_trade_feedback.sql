-- Migration 006 : table mtp_trade_feedback (PR #5 Phase 2)
-- Capture enrichie de chaque trade clos pour alimenter l'apprentissage du bot
-- (Règle #1 de l'objectif final). MAE = Max Adverse Excursion, MFE = Max Favorable
-- Excursion — essentiels pour détecter stops trop serrés ou TP trop gourmands,
-- même sur trades perdants.

create table if not exists public.mtp_trade_feedback (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  trade_id text not null unique,         -- = mtp_trades.id

  -- Contexte du trade
  symbol text not null,
  asset_class text,                      -- crypto|stock|etf|forex|commodity
  setup_type text,                       -- pullback|breakdown|continuation|continuation_short|pullback_short|mean_reversion...
  direction text check (direction in ('long','short')),
  regime_at_open text,                   -- RISK_ON|RISK_OFF|NEUTRAL|unknown
  regime_at_close text,

  -- Issue
  exit_reason text,                      -- stop_loss|take_profit|time_exit|engine_invalidation|manual|unknown
  opened_at timestamptz,
  closed_at timestamptz,
  holding_minutes integer,

  -- Prix clés
  entry_price numeric,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,

  -- P&L
  pnl numeric,
  pnl_pct numeric,

  -- MAE / MFE en % de l'entrée (valeurs toujours >= 0)
  mae_pct numeric,                       -- pire drawdown intra-trade (stop trop serré si > 70% du risk)
  mfe_pct numeric,                       -- meilleur gain intra-trade (TP trop gourmand si << MFE)

  -- Ratios relatifs aux cibles
  stop_distance_pct numeric,             -- distance entry → stop en % (toujours > 0)
  tp_distance_pct numeric,               -- distance entry → TP en % (toujours > 0)
  mae_vs_stop_ratio numeric,             -- mae_pct / stop_distance_pct (> 1 = stop touché)
  mfe_vs_tp_ratio numeric,               -- mfe_pct / tp_distance_pct (> 1 = TP dépassé puis retour)

  -- Clé d'agrégation utilisée par la Règle #1 (bucket = setup × direction × régime × asset_class)
  bucket_key text,

  -- Contexte enrichi (réservé Règle #5 / PR #7-9)
  news_context_open jsonb,
  news_context_close jsonb,
  notes text
);

create index if not exists idx_mtp_trade_feedback_bucket
  on public.mtp_trade_feedback (bucket_key)
  where bucket_key is not null;

create index if not exists idx_mtp_trade_feedback_closed_at
  on public.mtp_trade_feedback (closed_at desc);

create index if not exists idx_mtp_trade_feedback_setup_direction
  on public.mtp_trade_feedback (setup_type, direction);

create index if not exists idx_mtp_trade_feedback_symbol
  on public.mtp_trade_feedback (symbol);

alter table public.mtp_trade_feedback enable row level security;
drop policy if exists "mtp_trade_feedback_read"  on public.mtp_trade_feedback;
drop policy if exists "mtp_trade_feedback_write" on public.mtp_trade_feedback;
create policy "mtp_trade_feedback_read"  on public.mtp_trade_feedback for select using (true);
create policy "mtp_trade_feedback_write" on public.mtp_trade_feedback for all    using (true) with check (true);
