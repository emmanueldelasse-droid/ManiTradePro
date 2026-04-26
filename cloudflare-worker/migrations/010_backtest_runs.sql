-- Migration 010 : table mtp_backtest_runs (Phase 3 — backtest historique)
-- Une ligne par exécution du backtest. Permet de comparer plusieurs runs (ex.
-- avant/après modif des règles), tracer la version du moteur utilisée, l'état
-- d'avancement (status), et de pointer vers les trades simulés générés.

create table if not exists public.mtp_backtest_runs (
  id text primary key,                   -- ex: run_20260426_1102_a8f3
  created_at timestamptz not null default now(),
  finished_at timestamptz,

  -- Paramètres d'exécution
  engine_version text,                   -- copie de ENGINE_VERSION au moment du run
  engine_ruleset text,                   -- copie de ENGINE_RULESET
  symbols jsonb,                         -- liste des symboles testés
  date_from date,
  date_to date,
  status text default 'running' check (status in ('running','completed','failed','partial')),

  -- Avancement
  symbols_total integer default 0,
  symbols_done integer default 0,
  trades_generated integer default 0,

  -- Résultats agrégés (calculés à la fin du run)
  win_rate numeric,                      -- 0..1
  expectancy_pct numeric,                -- EV moyen par trade en %
  total_pnl_pct numeric,                 -- somme des pnl_pct
  max_drawdown_pct numeric,
  sharpe_approx numeric,

  -- Diagnostic
  notes text,
  error_message text
);

create index if not exists idx_mtp_backtest_runs_created
  on public.mtp_backtest_runs (created_at desc);

create index if not exists idx_mtp_backtest_runs_status
  on public.mtp_backtest_runs (status);

alter table public.mtp_backtest_runs enable row level security;
drop policy if exists "mtp_backtest_runs_read"  on public.mtp_backtest_runs;
drop policy if exists "mtp_backtest_runs_write" on public.mtp_backtest_runs;
create policy "mtp_backtest_runs_read"  on public.mtp_backtest_runs for select using (true);
create policy "mtp_backtest_runs_write" on public.mtp_backtest_runs for all    using (true) with check (true);
