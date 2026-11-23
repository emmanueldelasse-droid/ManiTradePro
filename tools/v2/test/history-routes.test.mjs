import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { HISTORY_ARCHIVE } from "../lib/history-integrity.mjs";

// In production Wrangler loads ES modules although the root package is CommonJS.
async function loadWorker(file) {
  const url = new URL("../../../cloudflare-worker/" + file, import.meta.url);
  let js = await readFile(url, "utf8");
  js = js.replace(/from "(\.\.?\/[^"]+)"/g, (_, path) => 'from "' + new URL(path, url).href + '"');
  return (await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"))).default;
}

const kvData = new Map();
const kv = { async get(key) { return kvData.get(key) ?? null; }, async put(key, value) { kvData.set(key, value); } };
const env = { SUPABASE_URL: "https://fake-store.test", SUPABASE_ANON_KEY: "test", MTP_CACHE: kv };
const rows = Array.from({length: 180}, (_, i) => ({
  id: "row-" + i, symbol: "AAA", setup_type: "breakout", direction: "long",
  opened_at: i < 134 ? "2026-08-01" : "2026-09-01", closed_at: "2026-09-02",
  pnl: i < 134 ? 1 : i < 146 ? (i === 145 ? 48.1598 : 100) : -10,
}));
const req = path => new Request("https://unit.test" + path);
const original = globalThis.fetch;

test("V2 returns 503 on an empty replacement, missing binding or source error, then reads all pages on recovery", async () => {
  const worker = await loadWorker("worker-v2.js");
  try {
    for (const response of [new Response(null, {status: 503}), Response.json([], {headers: {"Content-Range": "*/0"}})]) {
      globalThis.fetch = async () => response.clone();
      for (const route of ["/api/v2/stats", "/api/v2/trades"]) {
        const result = await worker.fetch(req(route), env, {});
        assert.equal(result.status, 503, route);
        const data = await result.json();
        assert.equal(data.lastReliableAt, HISTORY_ARCHIVE.lastReliableAt);
        assert.equal(data.trades, undefined);
        assert.equal(data.tradeCount, undefined);
      }
    }
    assert.equal((await worker.fetch(req("/api/v2/trades"), {}, {})).status, 503);
    globalThis.fetch = async url => {
      const offset = Number(new URL(url).searchParams.get("offset"));
      const slice = rows.slice(offset, offset + 20); // server-side cap below requested page size
      return Response.json(slice, {headers: {"Content-Range": offset + "-" + (offset + slice.length - 1) + "/" + rows.length}});
    };
    const summary = await (await worker.fetch(req("/api/v2/stats"), env, {})).json();
    assert.equal(summary.tradeCount, 180);
    assert.equal(summary.source, "mtp_v2_trades");
    assert.ok(Date.parse(summary.verifiedAt));
    const page = await (await worker.fetch(req("/api/v2/trades?offset=179&limit=10"), env, {})).json();
    assert.equal(page.totalCount, 180);
    assert.equal(page.count, 1);
    assert.equal(page.trades[0].id, "row-179");
    const empty = await (await worker.fetch(req("/api/v2/trades?offset=180"), env, {})).json();
    assert.deepEqual(empty.trades, []);
    assert.equal(empty.status, "ok");
    globalThis.fetch = async () => new Response(null, {status: 503});
    const failed = await (await worker.fetch(req("/api/v2/stats"), env, {})).json();
    assert.equal(failed.lastReliableAt, summary.verifiedAt);
  } finally { globalThis.fetch = original; }
});

test("V1 public endpoint distinguishes unconfigured, read failure and empty replacement table from a performance report", async () => {
  const worker = await loadWorker("worker.js");
  const route = req("/api/public/bot-stats");
  try {
    const missing = await worker.fetch(route, {}, {});
    assert.equal(missing.status, 503);
    for (const response of [Response.json([]), new Response(null, {status: 503})]) {
      globalThis.fetch = async () => response.clone();
      const result = await worker.fetch(route, env, {});
      assert.equal(result.status, 503);
      const payload = await result.json();
      assert.equal(payload.status, "unavailable");
      assert.equal(payload.lastReliableAt, HISTORY_ARCHIVE.lastReliableAt);
    }
  } finally { globalThis.fetch = original; }
});
