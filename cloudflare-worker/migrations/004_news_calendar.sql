-- Migration 004 : calendrier économique (PR #3 Phase 1 — news garde-fou)
-- Stocke les événements high-impact récupérés depuis Forex Factory RSS
-- pour le blocage des entrées dans la fenêtre [-30 min ; +30 min].
-- À exécuter dans Supabase → SQL Editor (idempotent via IF NOT EXISTS).

create table if not exists public.mtp_economic_calendar (
  id bigserial primary key,
  -- hash stable sur country|title|date (JJ-MM-AAAA, sans heure) pour
  -- supporter les reschedulings Forex Factory : l'upsert met à jour
  -- event_time au lieu de créer un doublon.
  event_uid text unique not null,
  title text not null,               -- ex: "Fed Interest Rate Decision", "Nonfarm Payrolls"
  country varchar(10) not null,      -- ex: "USD", "EUR", "JPY"
  impact varchar(10) not null,       -- "high" | "medium" | "low"
  event_time timestamptz not null,   -- heure UTC de l'événement
  forecast text,                     -- prévision consensus
  previous text,                     -- valeur précédente
  source varchar(20) not null default 'forex_factory',
  fetched_at timestamptz not null default now()
);

create index if not exists idx_mtp_economic_calendar_time
  on public.mtp_economic_calendar (event_time);

create index if not exists idx_mtp_economic_calendar_impact_time
  on public.mtp_economic_calendar (impact, event_time)
  where impact = 'high';

-- RLS : le Worker utilise la clé anon, policies ouvertes comme sur mtp_user_assets.
-- Nettoyage automatique : les events passés depuis plus de 30 jours sont supprimés
-- par le job de fetch lui-même (DELETE WHERE event_time < now() - interval '30 days').
alter table public.mtp_economic_calendar enable row level security;
drop policy if exists "mtp_economic_calendar_read" on public.mtp_economic_calendar;
drop policy if exists "mtp_economic_calendar_write" on public.mtp_economic_calendar;
create policy "mtp_economic_calendar_read"  on public.mtp_economic_calendar for select using (true);
create policy "mtp_economic_calendar_write" on public.mtp_economic_calendar for all    using (true) with check (true);

create table if not exists public.mtp_earnings_calendar (
  id bigserial primary key,
  symbol varchar(20) not null,
  earnings_date timestamptz not null, -- date annonce (UTC)
  period varchar(20),                  -- "Q1 2026", etc.
  eps_forecast numeric,
  eps_actual numeric,
  revenue_forecast numeric,
  revenue_actual numeric,
  timing varchar(10),                  -- "bmo" (before market open) | "amc" (after market close) | null — le Worker normalise les valeurs Finnhub longues avant insert
  source varchar(20) not null default 'finnhub',
  fetched_at timestamptz not null default now(),
  constraint mtp_earnings_calendar_symbol_date_key unique (symbol, earnings_date)
);

-- L'index (symbol, earnings_date) est créé automatiquement par la contrainte unique ci-dessus.
create index if not exists idx_mtp_earnings_calendar_date
  on public.mtp_earnings_calendar (earnings_date);

alter table public.mtp_earnings_calendar enable row level security;
drop policy if exists "mtp_earnings_calendar_read"  on public.mtp_earnings_calendar;
drop policy if exists "mtp_earnings_calendar_write" on public.mtp_earnings_calendar;
create policy "mtp_earnings_calendar_read"  on public.mtp_earnings_calendar for select using (true);
create policy "mtp_earnings_calendar_write" on public.mtp_earnings_calendar for all    using (true) with check (true);
