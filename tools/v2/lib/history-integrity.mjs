// Published aggregates. The original rows were not archived with the snapshot.
export const HISTORY_ARCHIVE = Object.freeze({
  lastReliableAt: "2026-09-06T18:34:09Z",
  snapshotCommit: "64050de24116fb6b69d859284482e73ee84aebf8",
  verificationRun: "https://github.com/emmanueldelasse-droid/ManiTradePro/actions/runs/34052114406/job/101537463437",
  v1Trades: 49,
  v2LifetimeTrades: 180,
  v2PostFixTrades: 46,
});
export const V2_POST_FIX_START = "2026-08-16T21:04:47Z";

export function validateHistoryRows(trades) {
  if (!Array.isArray(trades)) throw new Error("source_shape");
  const ids = new Set();
  for (const row of trades) {
    const opened = Date.parse(row?.openedAt || row?.opened_at);
    const closed = Date.parse(row?.closedAt || row?.closed_at);
    if (!row?.id || ids.has(row.id) || !row.symbol || !(row.setupType || row.setup_type)
        || row.pnl == null || row.pnl === "" || !Number.isFinite(Number(row.pnl))
        || !Number.isFinite(opened) || !Number.isFinite(closed) || closed < opened) {
      throw new Error("source_invalid_trade");
    }
    ids.add(row.id);
  }
}

// A replaced table can grow beyond the former row count. Check the published
// cohort AS OF the last positive observation, before accepting a later ledger.
export function validateArchiveContinuity(trades) {
  const before = trades.filter(row => Date.parse(row.closedAt || row.closed_at) <= Date.parse(HISTORY_ARCHIVE.lastReliableAt));
  const clean = before.filter(row => Date.parse(row.openedAt || row.opened_at) >= Date.parse(V2_POST_FIX_START));
  const pnl = clean.reduce((sum, row) => sum + Number(row.pnl), 0);
  const wins = clean.filter(row => Number(row.pnl) >= 0).length;
  if (before.length !== HISTORY_ARCHIVE.v2LifetimeTrades || clean.length !== HISTORY_ARCHIVE.v2PostFixTrades
      || Math.abs(pnl - 808.1598) > 0.0001 || wins !== 12) {
    throw new Error("historical_cohort_missing");
  }
}
