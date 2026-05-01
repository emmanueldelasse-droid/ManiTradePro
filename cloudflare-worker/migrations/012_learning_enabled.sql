-- Migration 012 : ajout de la colonne learning_enabled sur mtp_training_settings
-- (PR C système adaptatif — boucle d'apprentissage)
--
-- À exécuter dans Supabase → SQL Editor (UNE SEULE FOIS, idempotent via IF NOT EXISTS).
--
-- Default false : opt-in volontaire. Tant que ce flag est false, le moteur
-- ignore les statistiques d'apprentissage et fonctionne exactement comme
-- avant PR C. L'utilisateur active explicitement depuis Réglages → Bot.
--
-- Sans cette migration, le toggle marche dans l'UI mais le worker retombe
-- toujours sur false (comportement neutre identique à avant).

alter table public.mtp_training_settings
  add column if not exists learning_enabled boolean not null default false;
