-- Migration 015 : colonne currency sur mtp_positions et mtp_trades.
--
-- À exécuter dans Supabase → SQL Editor (UNE SEULE FOIS, idempotent).
--
-- Contexte : la position ASML ouverte le 13/05 à 1531,44 $US (Nasdaq) a été
-- fermée par "stop_loss" alors que le prix Nasdaq n'avait pas atteint le
-- stop. La cause : entre deux cycles cron, le worker a basculé sur Twelve
-- Data qui a renvoyé la cotation ASML.AS (Amsterdam) en EUR — 1367 EUR. Le
-- tracker a stocké 1367 dans `live.lowSinceOpen`, puis le check stop a
-- comparé 1367 (EUR) à 1456,20 (USD, le stop) comme s'ils étaient dans la
-- même devise → faux stop touché.
--
-- Fix worker : refuse de mettre à jour le tracker et le check stop si la
-- devise du live quote ne correspond pas à celle de l'entry. Pour ça il
-- faut savoir dans quelle devise l'entry a été ouvert → on stocke
-- explicitement `currency` sur chaque position et trade clos.
--
-- Backfill : EUR pour les actions cotées Paris/Xetra/Amsterdam, CHF pour
-- Six Suisse, USD pour tout le reste (US stocks, crypto, forex).

alter table public.mtp_positions
  add column if not exists currency text;

alter table public.mtp_trades
  add column if not exists currency text;

update public.mtp_positions
   set currency = 'EUR'
 where currency is null
   and symbol in ('LVMH','RMS','AIR','TTE','SAP','SIE');

update public.mtp_positions
   set currency = 'CHF'
 where currency is null
   and symbol = 'NESN';

update public.mtp_positions
   set currency = 'USD'
 where currency is null;

update public.mtp_trades
   set currency = 'EUR'
 where currency is null
   and symbol in ('LVMH','RMS','AIR','TTE','SAP','SIE');

update public.mtp_trades
   set currency = 'CHF'
 where currency is null
   and symbol = 'NESN';

update public.mtp_trades
   set currency = 'USD'
 where currency is null;
