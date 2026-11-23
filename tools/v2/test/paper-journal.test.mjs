import test from "node:test";
import assert from "node:assert/strict";
import { dailySession, prepareObservation, makeScanBatch } from "../../../cloudflare-worker/paper-feed.mjs";
import { V2_DEFAULT_SETTINGS as settings, getAsset } from "../lib/engine-v2.mjs";

const DAY = 86_400_000;

function candles(when) {
  const day = Date.parse(when.slice(0, 10));
  const bars = Array.from({ length: 65 }, (_, i) => {
    const open = 40 + i / 10;
    return { time: new Date(day - (64 - i) * DAY).toISOString(), open, close: open + 0.1,
      low: open - 0.5, high: open + 0.5, volume: 100 };
  });
  return Object.assign(bars, { fetchedAt: when, source: "yahoo" });
}

test("Une bougie partielle en cache apporte les indicateurs de l’alerte mais ne peut servir d’exécution", () => {
  const bars = candles("2026-11-23T16:00:00Z");
  const a = prepareObservation(getAsset("AAPL"), bars, "2026-11-23T22:00:00Z");
  assert.equal(a.ind.last, bars.at(-1));
  assert.equal(a.barTime, "2026-11-23T14:30:00.000Z");
  assert.equal(a.bars.at(-1).openAt, "2026-11-22T14:30:00.000Z");
  const b = prepareObservation(getAsset("AAPL"), Object.assign(bars, { fetchedAt: "2026-11-23T22:01:00Z" }), "2026-11-23T22:02:00Z");
  assert.equal(b.bars.at(-1).closeAt, "2026-11-23T21:00:00.000Z");
  bars.at(-1).open = 0;
  assert.equal(prepareObservation(getAsset("AAPL"), bars, "2026-11-23T22:02:00Z"), null);
});

test("Les bourses européennes et américaines suivent leurs changements d’heure locaux", () => {
  assert.equal(dailySession("us_stock", "2026-07-01").openAt, "2026-07-01T13:30:00.000Z");
  assert.equal(dailySession("us_stock", "2026-11-23").openAt, "2026-11-23T14:30:00.000Z");
  assert.equal(dailySession("eu_stock", "2026-07-01").closeAt, "2026-07-01T15:30:00.000Z");
  assert.equal(dailySession("eu_stock", "2026-11-23").closeAt, "2026-11-23T16:30:00.000Z");
});

test("Journalisation au moment commun de publication, suspension si conversion manquante", () => {
  const source = candles("2026-11-23T16:00:00Z");
  const asset = prepareObservation(getAsset("AAPL"), source, "2026-11-23T16:01:00Z");
  const fx = prepareObservation(getAsset("EURUSD"), source, "2026-11-23T16:05:00Z");
  const at = "2026-11-23T16:10:00.000Z";
  const scan = makeScanBatch([asset, fx], settings, at, ["AAPL","EURUSD"]);
  assert.equal(scan.coverage.scanned, 2);
  assert.equal(scan.decisions[0].observedAt, at);
  assert.equal(scan.decisions[0].quoteToEur, 1 / fx.bars.at(-1).close);
  const noRate = makeScanBatch([asset], settings, at, ["AAPL","EURUSD"]);
  assert.equal(noRate.decisions[0].decision, "Écarter");
  assert.equal(noRate.decisions[0].referencePlan, null);
  assert.equal(noRate.coverage.scanned, 0);
});

test("Un signal conserve son explication d'origine et une panne conserve la date du bilan", async t => {
  // node:sqlite is available in the local Node 22+ test runtime.
  const sqlite = await import("node:sqlite").catch(() => null);
  if (!sqlite) return t.skip("node:sqlite non disponible sur cette version de Node");
  const { PaperJournal } = await import("../../../cloudflare-worker/paper-journal.mjs");
  const db = new sqlite.DatabaseSync(":memory:");
  const storage = {
    sql: { exec(query, ...args) {
      if (query.trim().startsWith("CREATE ")) { db.exec(query); return {}; }
      const statement = db.prepare(query);
      const rows = query.trim().startsWith("SELECT") ? statement.all(...args) : [];
      const rowsWritten = query.trim().startsWith("SELECT") ? 0 : statement.run(...args).changes;
      return { toArray: () => rows, rowsWritten, [Symbol.iterator]: () => rows[Symbol.iterator]() };
    } },
    transactionSync(fn) {
      db.exec("BEGIN");
      try { const result = fn(); db.exec("COMMIT"); return result; }
      catch (error) { db.exec("ROLLBACK"); throw error; }
    },
  };
  const journal = new PaperJournal({ storage });
  const get = () => journal.fetch(new Request("https://paper.internal/report"));
  const append = batch => journal.fetch(new Request("https://paper.internal/scan", { method: "POST", body: JSON.stringify(batch) }));
  assert.equal((await get()).status, 503);
  const now = new Date(Date.now() - 600_000).toISOString();
  const previousDay = new Date(Date.parse(now) - DAY).toISOString().slice(0,10) + "T22:10:00.000Z";
  const opt = [prepareObservation(getAsset("AIR"), candles(previousDay), now)];
  const batch = makeScanBatch(opt, settings, now, ["AIR"]);
  await append(batch);
  const initial = await (await get()).json();
  assert.equal(initial.status, "ok");
  assert.equal(initial.lastReliableAt, now);
  const original = initial.decisions[0];
  batch.decisions[0].reason = "Modification ultérieure";
  await append(batch);
  const duplicate = await (await get()).json();
  assert.equal(duplicate.decisions.length, 1);
  assert.equal(duplicate.decisions[0].reason, original.reason);
  assert.equal(duplicate.dashboard.portfolios.current.trades, undefined);
  await append({ ...batch, observedAt: new Date().toISOString(), decisions: [], bars: [],
    coverage: { scanned: 0, total: 1, missingSymbols: ["AIR"] } });
  const unavailable = await get();
  assert.equal(unavailable.status, 503);
  const outage = await unavailable.json();
  assert.equal(outage.lastReliableAt, now);
  assert.equal(outage.dashboard, null);
  assert.equal(outage.decisions[0].reason, original.reason);
  db.close();
});
