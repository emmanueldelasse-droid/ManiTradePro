-- Migration 011 : ajout de la colonne bot_mode sur mtp_training_settings
-- (PR système adaptatif — modes Exploration / Core)
--
-- À exécuter dans Supabase → SQL Editor (UNE SEULE FOIS, idempotent via IF NOT EXISTS).
-- Sans cette migration, le toggle Mode bot fonctionne dans l'UI mais le worker
-- retombera sur le default 'exploration' à chaque démarrage. Default = exploration
-- → comportement neutre, l'app marche.
--
-- Pas besoin de redéployer le worker après — la lecture est rétro-compatible
-- (fallback 'exploration' si la colonne n'existe pas en base).

alter table public.mtp_training_settings
  add column if not exists bot_mode text not null default 'exploration'
  check (bot_mode in ('exploration', 'core'));
