-- ManiTradePro V2 — migration 002 (additive, non destructive)
--
-- Ajoute l'horodatage de la bougie d'ouverture sur les positions. Sert de garde
-- « anti fermeture immédiate » : une position daily/swing n'est évaluée pour
-- stop/TP que sur une bougie STRICTEMENT postérieure à sa bougie d'entrée.
--
-- Idempotent. À appliquer si les tables V2 existent déjà (créées avant cette
-- correction). Pour une base neuve, la colonne est déjà dans 001.

ALTER TABLE mtp_v2_positions ADD COLUMN IF NOT EXISTS opened_bar_time timestamptz;

-- Recharger le cache de schéma de l'API REST (PostgREST) pour qu'il voie la
-- nouvelle colonne immédiatement.
NOTIFY pgrst, 'reload schema';
