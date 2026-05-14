-- Migration 013 : flags `require_structural_setup` et `post_stop_cooldown_hours`
-- sur mtp_training_settings (PR #10 — setup obligatoire + cooldown post-stop).
--
-- À exécuter dans Supabase → SQL Editor (UNE SEULE FOIS, idempotent via IF NOT EXISTS).
--
-- `require_structural_setup` (default true) : bloque l'ouverture automatique
-- d'un trade si le moteur n'a pas détecté de pattern technique (pullback /
-- breakout / continuation / etc.). Issu du post-mortem du 28/04 — 67 % des
-- trades étaient "score-only" et WR 11 % (vs 31 % breakeven). Couper en
-- repassant à false depuis Réglages → Bot si on veut reprendre la collecte
-- data brute.
--
-- `post_stop_cooldown_hours` (default 24) : durée du blocage d'une nouvelle
-- entrée auto sur un symbole qui vient d'être stoppé. 0 désactive le
-- cooldown. Plage 0-720 (= 30 jours max).
--
-- Sans cette migration, le worker continue de fonctionner ; le toggle est
-- bien lu côté UI mais ne persiste pas en base. Les valeurs par défaut codées
-- dans `getTrainingDefaults` (require=true, cooldown=24) s'appliquent.

alter table public.mtp_training_settings
  add column if not exists require_structural_setup boolean not null default true;

alter table public.mtp_training_settings
  add column if not exists post_stop_cooldown_hours integer not null default 24
  check (post_stop_cooldown_hours >= 0 and post_stop_cooldown_hours <= 720);
