-- ============================================================
-- ManiTradePro V2 — Anti-duplication positions ouvertes
-- ============================================================
-- Objectif : garantir au niveau PostgreSQL qu'un symbole ne peut avoir
-- qu'une seule position V2 ouverte à la fois, même si deux cycles Worker
-- concurrents tentent d'insérer simultanément le même symbole.
--
-- IMPORTANT : cette migration est volontairement non destructive.
-- Si des doublons ouverts existent déjà, elle échoue explicitement au lieu
-- de fermer/supprimer silencieusement des positions.
-- ============================================================

DO $$
DECLARE
  duplicate_symbols text;
BEGIN
  SELECT string_agg(symbol, ', ' ORDER BY symbol)
    INTO duplicate_symbols
  FROM (
    SELECT symbol
    FROM mtp_v2_positions
    WHERE status = 'open'
    GROUP BY symbol
    HAVING count(*) > 1
  ) d;

  IF duplicate_symbols IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'mtp_v2_positions contains duplicate open symbols: ' || duplicate_symbols,
      HINT = 'Audit and resolve existing duplicate open positions before re-running migration 003. No row was modified by this migration.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mtp_v2_positions_one_open_symbol
  ON mtp_v2_positions (symbol)
  WHERE status = 'open';

COMMENT ON INDEX uq_mtp_v2_positions_one_open_symbol IS
  'V2 execution invariant: at most one open paper position per symbol. Prevents concurrent Worker cycles from duplicating the same market idea.';
