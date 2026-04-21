-- Migration : actifs personnalisés (Phase 1 MVP)
-- À exécuter UNE SEULE FOIS dans Supabase → SQL Editor.
-- Après exécution, redéployer le Worker avec `wrangler deploy`.

create table if not exists public.mtp_user_assets (
  id bigserial primary key,
  symbol varchar(20) not null unique,
  name varchar(100),
  asset_class varchar(20) not null check (asset_class in ('crypto','stock','etf','forex','commodity')),
  enabled boolean not null default true,
  provider_used varchar(20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mtp_user_assets_enabled_idx on public.mtp_user_assets(enabled);
create index if not exists mtp_user_assets_symbol_idx on public.mtp_user_assets(symbol);

-- Trigger updated_at auto
create or replace function public.mtp_user_assets_set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists mtp_user_assets_updated on public.mtp_user_assets;
create trigger mtp_user_assets_updated
before update on public.mtp_user_assets
for each row execute function public.mtp_user_assets_set_updated_at();

-- RLS : lecture ouverte (anon key), écriture réservée au Worker via clé anon + RLS policies
alter table public.mtp_user_assets enable row level security;

drop policy if exists "mtp_user_assets_read" on public.mtp_user_assets;
create policy "mtp_user_assets_read" on public.mtp_user_assets
  for select using (true);

drop policy if exists "mtp_user_assets_write" on public.mtp_user_assets;
create policy "mtp_user_assets_write" on public.mtp_user_assets
  for all using (true) with check (true);
