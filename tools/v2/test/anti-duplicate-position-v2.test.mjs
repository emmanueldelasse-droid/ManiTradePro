import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');

const migration = fs.readFileSync(
  path.join(root, 'cloudflare-worker/migrations/v2/003_one_open_position_per_symbol.sql'),
  'utf8',
);
const worker = fs.readFileSync(
  path.join(root, 'cloudflare-worker/worker-v2.js'),
  'utf8',
);

test('migration 003 is non-destructive and refuses pre-existing open duplicates', () => {
  assert.match(migration, /WHERE status = 'open'/);
  assert.match(migration, /HAVING count\(\*\) > 1/);
  assert.match(migration, /RAISE EXCEPTION/);
  assert.doesNotMatch(migration, /DELETE\s+FROM\s+mtp_v2_positions/i);
  assert.doesNotMatch(migration, /UPDATE\s+mtp_v2_positions/i);
});

test('database enforces one open position per symbol atomically', () => {
  assert.match(
    migration,
    /CREATE UNIQUE INDEX IF NOT EXISTS uq_mtp_v2_positions_one_open_symbol[\s\S]*ON mtp_v2_positions \(symbol\)[\s\S]*WHERE status = 'open'/,
  );
});

test('worker keeps the in-memory first-line guard in addition to DB constraint', () => {
  assert.match(worker, /const openBySymbol = new Set\(openRows\.map\(\(p\) => p\.symbol\)\)/);
  assert.match(worker, /if \(openBySymbol\.has\(opp\.symbol\)\) continue;/);
  assert.match(worker, /openBySymbol\.add\(opp\.symbol\)/);
});
