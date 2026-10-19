'use strict';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger } = require('@ibitplay/common');

const { WalletService, forPlayer } = require('../wallet.service');
const v = require('../wallet.validators');

/**
 * The player's Transaction list (GET /user/wallet/ledger): the Bill-type `category` filter, the
 * sports exchange's mssports rows merged in, and staff notes kept off the player's screen.
 * Skipped (not failed) when no migrated test database is reachable.
 */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';
const UID = String(930_000_000 + (process.pid % 100_000));

test('forPlayer: a staff-written row reads as a plain label', () => {
  const note = 'QA self-used balance (₹833333.33 from Super Admin wallet)';
  assert.equal(forPlayer({ reason: 'ADMIN_CREDIT', description: note, meta: { refType: 'DIRECT_WALLET' } }).description, 'Credit by admin');
  assert.equal(forPlayer({ reason: 'TRANSFER_IN', amount: '5', description: 'agent note', meta: { refType: 'STAFF_TRANSFER' } }).description, 'Credited by agent');
  assert.equal(forPlayer({ reason: 'TRANSFER_OUT', amount: '-5', description: 'x', meta: { refType: 'TRANSFER' } }).description, 'Transfer out');
  assert.equal(forPlayer({ reason: 'TRANSFER_IN', description: 'Swap USDT -> INR', meta: { swap: true } }).description, 'Swap USDT -> INR');
});

test('the category filter is validated', () => {
  assert.equal(v.listLedger.query.parse({ category: 'swap' }).category, 'swap');
  assert.throws(() => v.listLedger.query.parse({ category: 'nope' }));
});

test('player ledger against PostgreSQL', async (t) => {
  const logger = createLogger({ name: 'player-ledger-test', level: 'silent' });
  let connection;
  try {
    connection = await db.connect({
      config: {
        DB_HOST: process.env.DB_HOST || '127.0.0.1',
        DB_PORT: Number(process.env.DB_PORT || 5432),
        DB_NAME: TEST_DB,
        DB_USER: process.env.DB_USER || 'postgres',
        DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
        DB_SCHEMA: 'public',
      },
      logger,
      service: 'user-service',
    });
    await connection.sequelize.query('SELECT 1 FROM mssports.debit_ledger LIMIT 1');
  } catch (error) {
    if (connection) await connection.close();
    t.skip(`No migrated test database reachable (${error.message})`);
    return;
  }
  const q = (sql, replacements) => connection.sequelize.query(sql, { replacements, type: 'SELECT' });
  // Deletes only this run's user id.
  const cleanup = async () => {
    await q('DELETE FROM public.credits_ledger WHERE user_id = :uid RETURNING id', { uid: UID });
    await q('DELETE FROM mssports.debit_ledger WHERE user_id = :uid RETURNING id', { uid: UID });
    await q('DELETE FROM mssports.credits_ledger WHERE user_id = :uid RETURNING id', { uid: UID });
    await q('DELETE FROM og_transactions WHERE user_id = :uid RETURNING id', { uid: UID });
    await q("DELETE FROM og_games WHERE code = 'test-bow' RETURNING code");
  };
  t.after(async () => {
    await cleanup();
    await connection.close();
  });
  await cleanup();

  const row = (reason, currency, amount, meta, at) =>
    q(`INSERT INTO public.credits_ledger (user_id, currency, amount, reason, description, balance, meta, created_at)
       VALUES (:uid, :currency, :amount, :reason, 'staff note', 0, CAST(:meta AS jsonb), :at) RETURNING id`,
    { uid: UID, currency, amount, reason, meta: JSON.stringify(meta), at });
  await row('ADMIN_CREDIT', 'USDT', '10000', { refType: 'DIRECT_WALLET' }, '2026-10-19T06:00:00Z');
  await row('BONUS', 'USDT', '24', { refType: 'BONUS_GRANT' }, '2026-10-19T06:01:00Z');
  await row('TRANSFER_OUT', 'USDT', '-30', { swap: true }, '2026-10-19T06:02:00Z');
  await row('TRANSFER_IN', 'INR', '2475', { swap: true }, '2026-10-19T06:02:00Z');
  await row('TRANSFER_OUT', 'USDT', '-5', { refType: 'VAULT' }, '2026-10-19T06:03:00Z');
  await row('BET_STAKE', 'USDT', '-1', { refType: 'OG' }, '2026-10-19T06:04:00Z');
  // An Original Games row as casino-service used to write it: named from og_transactions → og_games.
  await q(`UPDATE public.credits_ledger SET description = :d WHERE user_id = :uid AND reason = 'BET_STAKE' RETURNING id`, { uid: UID, d: `original-games bet og-${UID}` });
  await q(`INSERT INTO og_games (code, name, position, data, synced_at) VALUES ('test-bow', 'Arrow Bow', 999, '{}'::jsonb, NOW())
           ON CONFLICT (code) DO NOTHING RETURNING code`);
  await q(`INSERT INTO og_transactions (transaction_id, kind, user_id, game_code, currency, amount) VALUES (:tx, 'bet', :uid, 'test-bow', 'USDT', 1) RETURNING id`, { tx: `og-${UID}`, uid: UID });
  await q(`INSERT INTO mssports.debit_ledger (user_id, currency, amount, reason, description, balance, created_at)
           VALUES (:uid, 'INR', 100, 'bet_placed', 'Ind v Aus Australia', 2375, '2026-10-19T06:05:00Z') RETURNING id`, { uid: UID });
  await q(`INSERT INTO mssports.credits_ledger (user_id, currency, amount, reason, description, closing, created_at)
           VALUES (:uid, 'INR', 190, 'settlement', 'Ind v Aus / Australia', 2565, '2026-10-19T07:00:00Z') RETURNING id`, { uid: UID });

  const wallet = new WalletService({ models: connection.models, db: connection, config: { SERVICE_NAME: 'user-service' }, logger });
  const list = (extra) => wallet.listLedger({ userId: UID, limit: 25, offset: 0, ...extra });
  const reasons = (r) => r.rows.map((x) => x.reason);

  const all = await list({});
  assert.equal(all.count, 8);
  assert.deepEqual(reasons(all).slice(0, 2), ['SPORTS_SETTLEMENT', 'SPORTS_STAKE'], 'newest first, sports rows merged');
  assert.equal(Number(all.rows[1].amount), -100, 'a stake hold is a debit');
  assert.equal(all.rows.find((x) => x.reason === 'ADMIN_CREDIT').description, 'Credit by admin');
  assert.equal(all.rows.find((x) => x.reason === 'BET_STAKE').description, 'Arrow Bow bet');

  assert.deepEqual(reasons(await list({ category: 'game' })).sort(), ['BET_STAKE', 'SPORTS_SETTLEMENT', 'SPORTS_STAKE']);
  assert.deepEqual(reasons(await list({ category: 'swap' })).sort(), ['TRANSFER_IN', 'TRANSFER_OUT']);
  assert.deepEqual(reasons(await list({ category: 'vault' })), ['TRANSFER_OUT']);
  assert.deepEqual(reasons(await list({ category: 'bonus' })), ['BONUS']);
  assert.equal((await list({ category: 'affiliate' })).count, 0);
  assert.equal((await list({ currency: 'USDT' })).count, 5, 'a non-INR coin has no sports rows');
  assert.equal((await list({ reason: ['BONUS'] })).count, 1, 'a reason filter is the wallet ledger alone');
  assert.equal((await list({ limit: 2, offset: 2 })).rows.length, 2);
});
