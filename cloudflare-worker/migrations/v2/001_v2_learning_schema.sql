-- ============================================================
-- ManiTradePro V2 — Schéma base de données (learning bot)
-- ============================================================
--
-- Tables V2 PROPRES et SÉPARÉES. Les tables V1 (mtp_positions, mtp_trades, ...)
-- ne sont PAS touchées. Idempotent (CREATE TABLE IF NOT EXISTS).
--
-- Appliquer dans Supabase Studio → SQL Editor.
--
-- Sécurité : paper trading uniquement. Aucune donnée d'argent réel.
-- ============================================================

-- Positions paper ouvertes (et historisées via status).
CREATE TABLE IF NOT EXISTS mtp_v2_positions (
  id           uuid PRIMARY KEY,
  symbol       text NOT NULL,
  setup_type   text NOT NULL,
  direction    text NOT NULL,            -- 'long' | 'short'
  entry        double precision NOT NULL,
  stop_loss    double precision NOT NULL,
  take_profit  double precision NOT NULL,
  rr           double precision,
  qty          double precision,
  opened_at    timestamptz NOT NULL DEFAULT now(),
  opened_bar_time timestamptz,               -- horodatage de la bougie d'entrée (garde anti fermeture immédiate)
  reason       text,
  status       text NOT NULL DEFAULT 'open'  -- 'open' | 'closed'
);
CREATE INDEX IF NOT EXISTS idx_mtp_v2_positions_status ON mtp_v2_positions (status);
CREATE INDEX IF NOT EXISTS idx_mtp_v2_positions_symbol ON mtp_v2_positions (symbol);

-- Trades fermés (matière première de l'apprentissage).
CREATE TABLE IF NOT EXISTS mtp_v2_trades (
  id             uuid PRIMARY KEY,
  symbol         text NOT NULL,
  setup_type     text NOT NULL,
  direction      text NOT NULL,
  entry          double precision NOT NULL,
  exit           double precision NOT NULL,
  stop_loss      double precision,
  take_profit    double precision,
  rr             double precision,
  qty            double precision,
  pnl            double precision,
  pnl_pct        double precision,
  opened_at      timestamptz,
  closed_at      timestamptz NOT NULL DEFAULT now(),
  duration_hours integer,
  exit_reason    text                     -- 'stop' | 'target' | 'time'
);
CREATE INDEX IF NOT EXISTS idx_mtp_v2_trades_setup  ON mtp_v2_trades (setup_type);
CREATE INDEX IF NOT EXISTS idx_mtp_v2_trades_symbol ON mtp_v2_trades (symbol);
CREATE INDEX IF NOT EXISTS idx_mtp_v2_trades_closed ON mtp_v2_trades (closed_at);

-- Journal des cycles de scan (santé du bot).
CREATE TABLE IF NOT EXISTS mtp_v2_cycles (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  started_at  timestamptz NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT now(),
  scanned     integer,
  detected    integer,
  opened      integer,
  closed      integer,
  errors      integer,
  note        text
);
CREATE INDEX IF NOT EXISTS idx_mtp_v2_cycles_started ON mtp_v2_cycles (started_at);

-- Snapshot des statistiques par setup (recalculé à chaque cycle, upsert).
CREATE TABLE IF NOT EXISTS mtp_v2_setup_stats (
  setup_type    text PRIMARY KEY,
  trades        integer,
  wins          integer,
  losses        integer,
  win_rate      double precision,
  profit_factor double precision,
  expectancy    double precision,
  avg_win       double precision,
  avg_loss      double precision,
  total_pnl     double precision,
  max_drawdown  double precision,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
