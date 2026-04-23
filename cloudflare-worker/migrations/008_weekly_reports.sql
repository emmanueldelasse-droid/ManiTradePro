-- Migration 008 : mtp_weekly_reports (PR #9 Phase 2)
-- Stocke les rapports hebdomadaires générés automatiquement chaque lundi
-- par Claude Sonnet (résumé français des trades de la semaine précédente).

create table if not exists public.mtp_weekly_reports (
  id bigserial primary key,
  created_at timestamptz not null default now(),

  -- Fenêtre analysée
  week_start date not null,          -- lundi de la semaine analysée
  week_end date not null,            -- dimanche de la semaine analysée

  -- Contenu
  report_markdown text,              -- rapport complet rendu en markdown
  stats_snapshot jsonb,              -- metrics bruts utilisés pour la génération
  trades_analyzed integer default 0,
  corrections_applied integer default 0,

  -- Métadonnées Claude
  claude_model text,
  claude_tokens_input integer,
  claude_tokens_output integer,
  generation_duration_ms integer,

  -- Statut
  status text not null default 'generated' check (status in ('generated','archived','failed')),
  error_message text
);

-- Unique : un seul rapport par semaine calendaire
create unique index if not exists idx_mtp_weekly_reports_week
  on public.mtp_weekly_reports(week_start);

create index if not exists idx_mtp_weekly_reports_created_at
  on public.mtp_weekly_reports(created_at desc);

alter table public.mtp_weekly_reports enable row level security;
drop policy if exists "mtp_weekly_reports_read"  on public.mtp_weekly_reports;
drop policy if exists "mtp_weekly_reports_write" on public.mtp_weekly_reports;
create policy "mtp_weekly_reports_read"  on public.mtp_weekly_reports for select using (true);
create policy "mtp_weekly_reports_write" on public.mtp_weekly_reports for all    using (true) with check (true);
