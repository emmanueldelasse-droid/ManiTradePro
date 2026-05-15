-- Migration 016 : colonnes quality + quality_flags sur mtp_trades ET mtp_trade_feedback.
--
-- À exécuter dans Supabase → SQL Editor (UNE SEULE FOIS, idempotent).
--
-- Contexte : second livrable de la refonte architecture (vague A.2).
-- Le `tradeValidationEngine` ajoute un statut qualité sur chaque trade
-- clos, pour empêcher la pollution des buckets d'apprentissage par des
-- trades buggés (devise mélangée, données partielles, faux stop, etc.).
--
-- Valeurs de `quality` :
--   - 'ok'      : trade fiable, peut alimenter l'apprentissage normalement
--   - 'suspect' : doute (ex. live.updatedAt > 1h avant close, mouvement
--                 anormal), à exclure des buckets par prudence
--   - 'invalid' : preuve de problème (mismatch devise, prix négatif,
--                 timestamp incohérent), trade tagué comme données non
--                 exploitables
--   - NULL      : trade historique avant cette migration, traité comme
--                 'ok' par les requêtes legacy (filtre `quality = 'ok'
--                 OR quality IS NULL`)
--
-- `quality_flags` : array de codes d'incident (currency_mismatch,
-- stale_quote, partial_data, etc.) pour la traçabilité — pas utilisé
-- par le moteur de décision, juste pour debug et stats post-mortem.
--
-- Les colonnes sont ajoutées sur les DEUX tables : mtp_trades (table
-- source de vérité des trades clos) et mtp_trade_feedback (table lue
-- par computeLearningStats pour alimenter les buckets). Sans les deux,
-- les SELECT d'apprentissage ne peuvent pas filtrer par qualité sans
-- JOIN coûteux.

alter table public.mtp_trades
  add column if not exists quality text;

alter table public.mtp_trades
  add column if not exists quality_flags text[];

alter table public.mtp_trade_feedback
  add column if not exists quality text;

alter table public.mtp_trade_feedback
  add column if not exists quality_flags text[];

-- Index partiels pour accélérer les requêtes d'apprentissage qui
-- filtrent sur quality. La majorité des lectures veulent seulement les
-- trades 'ok' ou legacy (NULL).
create index if not exists idx_mtp_trades_quality
  on public.mtp_trades (quality)
  where quality is not null;

create index if not exists idx_mtp_trade_feedback_quality
  on public.mtp_trade_feedback (quality)
  where quality is not null;
