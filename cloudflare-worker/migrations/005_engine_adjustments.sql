-- Migration 005 : table mtp_engine_adjustments (PR #4 Phase 1)
-- Trace tous les ajustements automatiques du moteur avec support shadow mode :
-- status = shadow → 20 trades d'observation, puis activation ou rollback.
-- Base de la Règle #1 (apprendre ET se corriger) qui sera opérationnalisée en Phase 2.

create table if not exists public.mtp_engine_adjustments (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Type d'ajustement (correspond aux 7 corrections + drift)
  adjustment_type varchar(40) not null,
    -- "bucket_threshold_up" (seuil +5 sur bucket perdant 30+ trades)
    -- "bucket_disabled"     (bucket désactivé après 50+ trades négatifs)
    -- "stop_widen"          (MAE > 70% → stop élargi +0.5×ATR)
    -- "tp_extend"           (MFE > 1.5× TP → TP allongé ou trailing)
    -- "position_halved"     (3 pertes consécutives → taille /2)
    -- "position_normalized" (3 gains confirmés → taille normale/+20%)
    -- "weights_retrain"     (retrain régression logistique >500 trades)
    -- "drift_alert"         (alerte drift sans correction auto)

  bucket_key text,                 -- ex: "pullback|long|RISK_ON|crypto" — null pour global
  signal_trigger jsonb not null,   -- stats qui ont déclenché : {trades_count, win_rate_30, win_rate_hist, mae_avg, ...}

  old_value jsonb,                 -- ancienne valeur (avant ajustement)
  new_value jsonb,                 -- nouvelle valeur cible

  -- Workflow shadow → active → rollback
  status varchar(20) not null default 'shadow',
    -- "shadow"   : enregistré mais non appliqué (20 trades d'observation)
    -- "active"   : appliqué au moteur
    -- "rollback" : annulé (shadow résultats dégradés, ou décision manuelle)

  shadow_trades_observed integer not null default 0,
  shadow_result_better boolean,     -- true si shadow améliore, false si dégrade, null en cours

  activated_at timestamptz,         -- quand passé shadow → active
  rollback_at timestamptz,          -- quand passé à rollback
  rollback_reason text,             -- "shadow_dégradé" | "manuel" | "drift_persistant"

  severity varchar(10),             -- pour les drift_alert : "light" | "moderate" | "severe"
  notes text                        -- notes libres (rapport hebdo Claude, etc.)
);

create index if not exists idx_mtp_engine_adjustments_status_type
  on public.mtp_engine_adjustments (status, adjustment_type);

create index if not exists idx_mtp_engine_adjustments_created
  on public.mtp_engine_adjustments (created_at desc);

create index if not exists idx_mtp_engine_adjustments_bucket
  on public.mtp_engine_adjustments (bucket_key)
  where bucket_key is not null;

alter table public.mtp_engine_adjustments enable row level security;
drop policy if exists "mtp_engine_adjustments_read"  on public.mtp_engine_adjustments;
drop policy if exists "mtp_engine_adjustments_write" on public.mtp_engine_adjustments;
create policy "mtp_engine_adjustments_read"  on public.mtp_engine_adjustments for select using (true);
create policy "mtp_engine_adjustments_write" on public.mtp_engine_adjustments for all    using (true) with check (true);
