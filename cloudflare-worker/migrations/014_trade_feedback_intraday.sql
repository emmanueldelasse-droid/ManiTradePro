-- Migration 014 : colonnes intraday sur mtp_trade_feedback (PR #10 follow-up).
--
-- À exécuter dans Supabase → SQL Editor (UNE SEULE FOIS, idempotent via IF NOT EXISTS).
--
-- Contexte : la PR #10 a ajouté la détection de stop/TP via les bornes
-- intra-trade (live.highSinceOpen / lowSinceOpen). Le helper
-- `captureTradeFeedback` du worker insère désormais 5 nouveaux champs dans
-- chaque ligne `mtp_trade_feedback`. Cette migration crée les colonnes
-- correspondantes côté Supabase. Sans elle, l'INSERT échoue silencieusement
-- (try/catch absorbant l'erreur) et la trace intraday est perdue.
--
-- Non destructif, additif uniquement.

alter table public.mtp_trade_feedback
  add column if not exists intraday_detected boolean not null default false;

alter table public.mtp_trade_feedback
  add column if not exists intraday_source text;

alter table public.mtp_trade_feedback
  add column if not exists intraday_high numeric;

alter table public.mtp_trade_feedback
  add column if not exists intraday_low numeric;

alter table public.mtp_trade_feedback
  add column if not exists execution_assumption text;
