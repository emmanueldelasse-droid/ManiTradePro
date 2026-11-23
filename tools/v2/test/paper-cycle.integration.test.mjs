import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import { V2_SYMBOLS } from '../lib/engine-v2.mjs';

// The Worker is an ES module deployed by Wrangler, while the repository's .js
// files default to CommonJS in Node. Keep its real imports and route handlers.
const entry = new URL('../../../cloudflare-worker/worker-v2.js', import.meta.url);
const workerSource = (await readFile(entry, 'utf8')).replace(/from "(\.[^"]+)"/g,
  (_, path) => `from "${new URL(path, entry).href}"`);
const { default: worker, PaperJournal } = await import('data:text/javascript;base64,' + Buffer.from(workerSource).toString('base64'));

function journalStorage(database) {
  return {
    sql: { exec(sql, ...params) {
      if (sql.trimStart().startsWith('CREATE ')) { database.exec(sql); return; }
      const statement = database.prepare(sql);
      const rows = statement.columns().length ? statement.all(...params) : [];
      const rowsWritten = statement.columns().length ? 0 : Number(statement.run(...params).changes);
      return Object.assign(rows, { rowsWritten, toArray: () => rows });
    } },
    transactionSync(callback) {
      database.exec('BEGIN');
      try { const result = callback(); database.exec('COMMIT'); return result; }
      catch (e) { database.exec('ROLLBACK'); throw e; }
    },
  };
}

function cache() {
  const entries = new Map(['v2:positions', 'v2:trades', 'v2:cycles'].map(key => [key, { value: '[]', until: Infinity }]));
  return {
    get(key) { const row = entries.get(key); return row && row.until > Date.now() ? row.value : null; },
    put(key, value, options) { entries.set(key, { value, until: Date.now() + (options?.expirationTtl ?? Infinity) * 1000 }); },
  };
}

const DAY = 86_400_000;
const firstDay = Date.parse('2026-11-16T00:00:00Z'); // Monday
const scanTime = index => firstDay + (index + 22.5 / 24) * DAY;

function marketBars(symbol, index, continuous) {
  const bars = [];
  let rallySessions = 0;
  for (let day = -104; day <= index; day++) {
    const date = new Date(firstDay + day * DAY);
    if (!continuous && [0, 6].includes(date.getUTCDay())) continue;
    const anchor = { 'EURUSD=X': 1.2, 'USDJPY=X': 150 }[symbol] ?? 100;
    let mid = anchor;
    if (symbol === 'AAPL') {
      // 10 rising trading sessions, followed by a stable entry day, then a
      // large gap up against the first mean-reversion short and in favour of the reference long.
      if (day >= -13 && day <= 0) mid += 3 * ++rallySessions;
      if (day === 1) mid = 130;
      if (day === 2) mid = 155;
    }
    const radius = anchor < 2 ? 0.001 : 0.35;
    bars.push({ time: date.getTime(), open: mid, high: mid + radius, low: mid - radius, close: mid, volume: 1000 });
  }
  return bars;
}

function providerResponse(url, index) {
  const path = new URL(url);
  if (path.host === 'api.binance.com') {
    const symbol = path.searchParams.get('symbol');
    return Response.json(marketBars(symbol, index, true).map(b => [b.time, b.open, b.high, b.low, b.close, b.volume]));
  }
  assert.equal(path.host, 'query1.finance.yahoo.com', 'the integration test should never contact a live provider');
  const symbol = decodeURIComponent(path.pathname.split('/').at(-1));
  const bars = marketBars(symbol, index, false);
  const quote = Object.fromEntries(['open','high','low','close','volume'].map(key => [key, bars.map(b => b[key])]));
  return Response.json({ chart: { result: [{ timestamp: bars.map(b => b.time / 1000), indicators: { quote: [quote] } }] } });
}

const reportRequest = suffix => new Request('https://test.invalid/api/v2/paper' + suffix);

test('provider market data → scheduled V2 cycle → durable SQLite journal → A/B/reference report', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: scanTime(0) });
  let day = 0;
  let providerCalls = 0;
  t.mock.method(globalThis, 'fetch', async url => { providerCalls++; return providerResponse(url, day); });
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const ctx = { storage: journalStorage(db) };
  let durable = new PaperJournal(ctx);
  const env = { MTP_CACHE: cache(), PAPER_JOURNAL: {
    idFromName: name => name,
    get(id) { assert.equal(id, 'prospective-v1'); return { fetch: (url, init) => durable.fetch(new Request(url, init)) }; },
  } };
  async function report(query = '') {
    const response = await worker.fetch(reportRequest(query), env);
    assert.equal(response.status, 200);
    return response.json();
  }
  async function scan(index) {
    day = index;
    t.mock.timers.setTime(scanTime(day));
    const tasks = [];
    await worker.scheduled({}, env, { waitUntil: task => tasks.push(task) });
    await Promise.all(tasks);
    const result = await report();
    assert.equal(result.lastReliableAt, new Date(scanTime(index)).toISOString());
    assert.equal(result.coverage.scanned, V2_SYMBOLS.length);
    return result;
  }
  const empty = await worker.fetch(reportRequest(''), env);
  assert.equal(empty.status, 503);
  const initial = await scan(0);
  const signal = initial.decisions.find(d => d.symbol === 'AAPL');
  assert.equal(signal.setupType, 'mean_reversion');
  assert.equal(signal.decision, 'Entrée envisageable');
  assert.equal(signal.plan.direction, 'short');
  assert.equal(signal.referencePlan.direction, 'long');
  assert.equal(initial.dashboard.portfolios.current.closedCount, 0);
  const afterEntry = await scan(1);
  assert.equal(afterEntry.dashboard.portfolios.current.openCount, 1);
  assert.equal(afterEntry.dashboard.portfolios.variant.openCount, 0);
  const final = await scan(2);
  assert.ok(providerCalls >= 3 * V2_SYMBOLS.length);
  const { current, variant, reference } = final.dashboard.portfolios;
  assert.equal(current.closedCount, 1);
  assert.equal(variant.closedCount, 0);
  assert.ok(reference.closedCount > 0);
  assert.ok(current.netEur < 0 && current.costsEur > 0);
  assert.equal(variant.netEur, 0);
  assert.ok(reference.netEur > 0);
  assert.equal(final.dashboard.variantEffect.missedGainEur, 0);
  assert.equal(final.dashboard.variantEffect.closedExcluded, 1);
  assert.ok(Math.abs(final.dashboard.netVsReferenceEur - (current.netEur - reference.netEur)) < 0.011);

  durable = new PaperJournal(ctx); // recover the same SQLite database as a new object instance
  assert.deepEqual(await report(), final);
  let page = final;
  const pages = {};
  const journal = [...page.decisions];
  while (page.nextCursor) {
    const cursor = page.nextCursor;
    page = await report('?before=' + encodeURIComponent(cursor));
    pages[cursor] = page;
    journal.push(...page.decisions);
  }
  const original = journal.find(d => d.id === signal.id);
  const { lifecycle, ...immutable } = original;
  const { lifecycle: initialState, ...firstSeen } = signal;
  assert.deepEqual(immutable, firstSeen);
  assert.equal(lifecycle.state, 'closed');
  const execution = lifecycle.trades.current;
  assert.equal(execution.entry, 130);
  assert.equal(execution.exit, 155);
  assert.ok(execution.exit > original.plan.stopLoss);
  assert.match(execution.exitReason, /Stop franchi à l’ouverture/);
  assert.equal(execution.openedAt, '2026-11-17T14:30:00.000Z');
  assert.ok(execution.netEur < -signal.estimatedLossEur);
  assert.equal(final.dashboard.variantEffect.avoidedLossEur, -execution.netEur);
  assert.equal(lifecycle.trades.variant, undefined);
  assert.ok(lifecycle.trades.reference.netEur > 0);
  if (process.env.PAPER_E2E_REPORT) {
    await writeFile(process.env.PAPER_E2E_REPORT, JSON.stringify(final));
    await writeFile(process.env.PAPER_E2E_REPORT + '.pages.json', JSON.stringify(pages));
  }
  // Losing the original position ledger cannot open a second historic
  // position, or prevent the independent prospective journal from advancing.
  const baseCache = env.MTP_CACHE;
  env.MTP_CACHE = {
    ...baseCache,
    get(key) { return key === 'v2:positions' ? null : baseCache.get(key); },
    put(key, value, options) {
      assert.ok(!['v2:positions', 'v2:trades', 'v2:cycles'].includes(key));
      return baseCache.put(key, value, options);
    },
  };
  env.ADMIN_API_TOKEN = 'fixture';
  t.mock.timers.setTime(scanTime(2) + 3_600_000);
  const run = await worker.fetch(new Request('https://test.invalid/api/v2/cycle', {
    method: 'POST', headers: { 'X-Admin-Token': 'fixture' },
  }), env);
  const partial = await run.json();
  assert.equal(run.status, 200);
  assert.equal(partial.status, 'partial');
  assert.equal(partial.legacyUnavailable, true);
  assert.equal(partial.paperJournal, 'ok');
  assert.equal(partial.health.openPositions, null);
  assert.equal(partial.cycle.opened, null);
  const health = await (await worker.fetch(new Request('https://test.invalid/api/v2/health'), env)).json();
  assert.equal(health.status, 'partial');
  assert.equal(health.lastCycle, new Date(Date.now()).toISOString());
  assert.equal(health.openPositions, null);
  assert.equal((await report()).lastReliableAt, health.lastCycle);
});
