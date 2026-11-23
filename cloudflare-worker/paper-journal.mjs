// One named SQLite Durable Object owns the append-only tape and its recoverable
// projection. No public mutation endpoint, trading credentials or broker.
import { replayPaper } from "./paper-engine.mjs";

const HOUR = 3_600_000;
const KEEP_WARMUP = 8 * 24 * HOUR;

function readJson(sql, key) {
  const row = sql.exec("SELECT payload FROM metadata WHERE name = ?", key).toArray()[0];
  return row ? JSON.parse(row.payload) : null;
}

function writeJson(sql, key, value) {
  sql.exec("INSERT INTO metadata(name,payload) VALUES(?,?) ON CONFLICT(name) DO UPDATE SET payload=excluded.payload",
    key, JSON.stringify(value));
}

function answer(data, status = 200) { return Response.json(data, { status }); }

export class PaperJournal {
  constructor(ctx) {
    this.storage = ctx.storage;
    this.sql = ctx.storage.sql;
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY, observed TEXT NOT NULL, payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS signals_order ON signals(observed DESC, id DESC);
      CREATE TABLE IF NOT EXISTS last_signal (
        symbol TEXT PRIMARY KEY, signature TEXT NOT NULL, observed TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS candles (
        symbol TEXT NOT NULL, open_at TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(symbol, open_at)
      );
      CREATE TABLE IF NOT EXISTS metadata(name TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS outcomes(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/scan") {
      const scan = await request.json();
      if (!Number.isFinite(Date.parse(scan.observedAt)) || !scan.coverage
        || !Array.isArray(scan.decisions) || !Array.isArray(scan.bars)) return answer({ error: "invalid_scan" }, 400);
      const { asOf, recalculate } = this.storage.transactionSync(() => this.append(scan));
      // Projection failure must not roll back immutable observations.
      if (recalculate) {
        try { this.storage.transactionSync(() => this.project(asOf)); }
        catch { return answer({ recorded: true, projection: "unavailable", asOf }, 503); }
      }
      return answer({ recorded: true, asOf, lastReliableAt: readJson(this.sql, "reliable") });
    }
    if (request.method === "GET" && url.pathname === "/cursor") {
      return answer({ cursors: readJson(this.sql, "cursors") || {}, settings: readJson(this.sql, "config") });
    }
    if (request.method === "GET" && url.pathname === "/report") return this.report(url);
    return answer({ error: "not_found" }, 404);
  }

  append(scan) {
    const { sql } = this;
    const existing = readJson(sql, "scan");
    const latest = !existing || scan.observedAt > existing.observedAt;
    const config = readJson(sql, "config") || { ...scan.settings, startedAt: scan.observedAt };
    if (!existing) writeJson(sql, "config", config);
    const earliest = Date.parse(config.startedAt) - KEEP_WARMUP;
    const cursors = readJson(sql, "cursors") || {};
    let changed = false;
    for (const bar of scan.bars) {
      if (Date.parse(bar.closeAt) < earliest || bar.closeAt > scan.observedAt) continue;
      const result = sql.exec("INSERT OR IGNORE INTO candles VALUES(?,?,?)", bar.symbol, bar.openAt, JSON.stringify(bar));
      changed ||= result.rowsWritten > 0;
      if (!cursors[bar.symbol] || bar.openAt > cursors[bar.symbol]) cursors[bar.symbol] = bar.openAt;
    }
    for (const original of scan.decisions) {
      const last = sql.exec("SELECT signature,observed FROM last_signal WHERE symbol=?", original.symbol).toArray()[0];
      const newest = !last || original.observedAt > last.observed;
      if (last?.signature === original.id && newest) continue;
      const exists = sql.exec("SELECT observed FROM signals WHERE id=?", original.id).toArray()[0];
      // A → B → A is a new publication even when the last A has exactly the
      // first one's prices. Retrying a scan reuses the same row.
      const id = exists && newest && last?.signature !== original.id ? original.id + "@" + original.observedAt : original.id;
      const result = sql.exec("INSERT OR IGNORE INTO signals VALUES(?,?,?)", id, original.observedAt, JSON.stringify({ ...original, id }));
      changed ||= result.rowsWritten > 0;
      if (newest) sql.exec("INSERT INTO last_signal VALUES(?,?,?) ON CONFLICT(symbol) DO UPDATE SET signature=excluded.signature, observed=excluded.observed",
        original.symbol, original.id, original.observedAt);
    }
    writeJson(sql, "cursors", cursors);
    if (latest) {
      writeJson(sql, "scan", { observedAt: scan.observedAt, coverage: scan.coverage });
      const missedCycle = existing && Date.parse(scan.observedAt) - Date.parse(existing.observedAt) > 2 * HOUR;
      if (missedCycle || scan.coverage.scanned < scan.coverage.total) {
        writeJson(sql, "coverageGap", { from: missedCycle ? existing.observedAt : scan.observedAt, to: scan.observedAt,
          missingSymbols: scan.coverage.missingSymbols, reason: missedCycle ? "cycle_manquant" : "couverture_partielle" });
      }
    }
    const asOf = latest ? scan.observedAt : existing.observedAt;
    const recalculate = changed || latest || readJson(sql, "projectionAt") !== asOf;
    if (recalculate) writeJson(sql, "projectionAt", null);
    return { asOf, recalculate };
  }

  project(asOf) {
    const { sql } = this;
    const config = readJson(sql, "config");
    const { coverage } = readJson(sql, "scan");
    const decisions = Array.from(sql.exec("SELECT payload FROM signals ORDER BY observed,id"), r => JSON.parse(r.payload));
    const bars = Array.from(sql.exec("SELECT payload FROM candles ORDER BY open_at,symbol"), r => JSON.parse(r.payload));
    const report = replayPaper({ decisions, bars, settings: config, asOf });
    const { statuses = {}, ...dashboard } = report;
    // Serve per-signal results only with the corresponding page, including
    // closed trades that have rolled off the home screen.
    const fills = new Map();
    const arms = {};
    for (const [name, portfolio] of Object.entries(report.portfolios)) {
      const { trades, outcomes, ...summary } = portfolio;
      arms[name] = summary;
      for (const trade of trades) {
        if (!fills.has(trade.decisionId)) fills.set(trade.decisionId, {});
        fills.get(trade.decisionId)[name] = trade;
      }
    }
    dashboard.portfolios = arms;
    const previous = new Map(Array.from(sql.exec("SELECT id,payload FROM outcomes"), r => [r.id, r.payload]));
    for (const [id, outcome] of Object.entries(statuses)) {
      const payload = JSON.stringify({ ...outcome, trades: fills.get(id) || null });
      if (previous.get(id) !== payload) {
        sql.exec("INSERT INTO outcomes VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload", id, payload);
      }
    }
    if (readJson(sql, "coverageGap")) dashboard.limitations.unshift(
      "Couverture interrompue depuis le début. Les signaux absents sont inconnus. Les résultats et la baisse maximale portent uniquement sur la période observée."
    );
    writeJson(sql, "dashboard", dashboard);
    const fullCoverage = coverage.total > 0 && coverage.scanned === coverage.total;
    const pricesAvailable = Object.values(arms).every(p => !p.dataError);
    if (fullCoverage && pricesAvailable) writeJson(sql, "reliable", asOf);
    writeJson(sql, "projectionAt", asOf);
  }

  report(url) {
    const scan = readJson(this.sql, "scan");
    const asOf = scan?.observedAt || null;
    const lastReliableAt = readJson(this.sql, "reliable");
    let cursor = ["9999", ""];
    const before = url.searchParams.get("before");
    if (before) {
      try {
        cursor = JSON.parse(atob(before));
        if (!Array.isArray(cursor) || cursor.length !== 2 || cursor.some(v => typeof v !== "string")) throw new Error();
      } catch { return answer({ status: "error", message: "Curseur invalide" }, 400); }
    }
    const rows = this.sql.exec(`SELECT signals.id, observed, signals.payload, outcomes.payload AS outcome FROM signals
      LEFT JOIN outcomes ON outcomes.id=signals.id WHERE (observed, signals.id) < (?,?)
      ORDER BY observed DESC, signals.id DESC LIMIT 48`, ...cursor).toArray();
    const page = rows.slice(0, 47);
    const last = page.at(-1);
    const available = scan && Date.now() - Date.parse(asOf) <= 2 * HOUR && lastReliableAt === asOf && readJson(this.sql, "projectionAt") === asOf;
    const coverage = scan?.coverage || null;
    if (coverage) coverage.lastInterruption = readJson(this.sql, "coverageGap");
    return answer({
      status: available ? "ok" : "unavailable",
      message: available ? null : "Données indisponibles",
      asOf, lastReliableAt, coverage,
      dashboard: available ? readJson(this.sql, "dashboard") : null,
      decisions: page.map(r => ({ ...JSON.parse(r.payload), lifecycle: r.outcome ? JSON.parse(r.outcome) : null })),
      nextCursor: rows.length > page.length ? btoa(JSON.stringify([last.observed, last.id])) : null,
    }, available ? 200 : 503);
  }
}

export function journalBinding(env) {
  const binding = env.PAPER_JOURNAL;
  return binding ? binding.get(binding.idFromName("prospective-v1")) : null;
}
