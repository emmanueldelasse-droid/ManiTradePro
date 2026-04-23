-- Migration 007 : auto-watchlist (PR #8 Phase 2)
-- Étend mtp_user_assets pour distinguer manuel vs auto + épinglage.
-- Nouvelle table mtp_watchlist_history pour traçabilité ajouts/retraits.

-- ------------------------------------------------------------
-- 1. Extension de mtp_user_assets
-- ------------------------------------------------------------

alter table public.mtp_user_assets
  add column if not exists source varchar(16) not null default 'user'
    check (source in ('user','auto','core'));
alter table public.mtp_user_assets
  add column if not exists is_pinned boolean not null default false;
alter table public.mtp_user_assets
  add column if not exists auto_added_at timestamptz;
alter table public.mtp_user_assets
  add column if not exists auto_reason jsonb;
alter table public.mtp_user_assets
  add column if not exists last_signal_at timestamptz;
alter table public.mtp_user_assets
  add column if not exists dormant_flag boolean not null default false;

create index if not exists mtp_user_assets_source_idx
  on public.mtp_user_assets(source);
create index if not exists mtp_user_assets_pinned_idx
  on public.mtp_user_assets(is_pinned) where is_pinned = true;

-- ------------------------------------------------------------
-- 2. Nouvelle table mtp_watchlist_history
-- ------------------------------------------------------------

create table if not exists public.mtp_watchlist_history (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  action varchar(16) not null check (action in ('auto_add','auto_remove','manual_pin','manual_unpin','manual_add','manual_remove')),
  symbol varchar(20) not null,
  asset_class varchar(20),
  reason jsonb,
  triggered_by varchar(32)
);

create index if not exists mtp_watchlist_history_created_idx
  on public.mtp_watchlist_history(created_at desc);
create index if not exists mtp_watchlist_history_symbol_idx
  on public.mtp_watchlist_history(symbol);
create index if not exists mtp_watchlist_history_action_idx
  on public.mtp_watchlist_history(action);

alter table public.mtp_watchlist_history enable row level security;
drop policy if exists "mtp_watchlist_history_read"  on public.mtp_watchlist_history;
drop policy if exists "mtp_watchlist_history_write" on public.mtp_watchlist_history;
create policy "mtp_watchlist_history_read"  on public.mtp_watchlist_history for select using (true);
create policy "mtp_watchlist_history_write" on public.mtp_watchlist_history for all    using (true) with check (true);
