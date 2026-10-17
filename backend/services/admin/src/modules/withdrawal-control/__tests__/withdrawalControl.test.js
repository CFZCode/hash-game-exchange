'use strict';

process.env.TXN_PASSWORD_MODE = 'separate';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger, entitlements, withdrawBlock, withdrawalCap } = require('@ibitplay/common');
const { hashPassword } = require('@ibitplay/auth');

const { WithdrawalControlService } = require('../withdrawalControl.service');

/**
 * Global withdrawals ON / OFF (migration 108):
 *   - sirf owner badal sakta hai, transaction password ke saath
 *   - OFF = player ka withdrawal WITHDRAW_DISABLED; staff pe asar nahi
 *   - ON = wapas normal
 */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';
const TXN = 'withdrawal control txn';

test('global withdrawal switch against a database', async (t) => {
  const logger = createLogger({ name: 'withdrawal-control-test', level: 'silent' });
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
      service: 'admin-service',
    });
    await connection.ping();
  } catch (error) {
    t.skip(`No test database reachable (${error.message})`);
    return;
  }

  const { models, sequelize } = connection;
  const service = new WithdrawalControlService({ models, db: connection, logger });

  // Purane DB pe table na ho to bana lo (migration 108 jaisa).
  await sequelize.query(
    `CREATE TABLE IF NOT EXISTS withdrawal_control (
       id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
       withdrawals_enabled BOOLEAN NOT NULL DEFAULT TRUE,
       updated_by BIGINT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`
  );
  await sequelize.query(
    `ALTER TABLE withdrawal_control ADD COLUMN IF NOT EXISTS limit_enabled BOOLEAN, ADD COLUMN IF NOT EXISTS deposit_multiplier NUMERIC(6,2),
       ADD COLUMN IF NOT EXISTS wager_bonus_enabled BOOLEAN, ADD COLUMN IF NOT EXISTS wager_multiplier NUMERIC(6,2),
       ADD COLUMN IF NOT EXISTS limit_updated_by BIGINT, ADD COLUMN IF NOT EXISTS limit_updated_at TIMESTAMPTZ`
  );
  await sequelize.query('INSERT INTO withdrawal_control (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
  const [[before]] = await sequelize.query('SELECT * FROM withdrawal_control WHERE id = 1');

  const roleId = 8300 + (process.pid % 40);
  await sequelize.query(
    'INSERT INTO roles (id, name, level) VALUES (:id, :name, 1) ON CONFLICT (id) DO UPDATE SET level = 1',
    { replacements: { id: roleId, name: `wc-owner-${roleId}` } }
  );
  const ownerId = 973_000 + (process.pid % 1000);
  const uid = 833_000_000 + (process.pid % 100_000);
  await models.Users.destroy({ where: { id: uid } });
  await models.Staff.destroy({ where: { id: ownerId } });
  await models.Staff.create({
    id: ownerId, name: `wc-owner-${ownerId}`, email: `wc-owner-${ownerId}@test.invalid`,
    password: await hashPassword('x', 4), transaction_password: await hashPassword(TXN, 4),
    role_id: roleId, status: 'active',
  });
  await models.Users.create({ id: uid, name: `wc-player-${uid}`, password: 'x', status: 'active' });

  t.after(async () => {
    await sequelize.query(
      `UPDATE withdrawal_control SET withdrawals_enabled = :on, limit_enabled = :le, deposit_multiplier = :dm,
         wager_bonus_enabled = :wb, wager_multiplier = :wm WHERE id = 1`,
      { replacements: { on: before.withdrawals_enabled, le: before.limit_enabled, dm: before.deposit_multiplier, wb: before.wager_bonus_enabled, wm: before.wager_multiplier } }
    );
    await models.Users.destroy({ where: { id: uid } });
    await models.Staff.destroy({ where: { id: ownerId } });
    await connection.close();
  });

  const owner = { id: ownerId, canIssueFunds: true };

  await t.test('only the owner, only with the transaction password', async () => {
    await assert.rejects(() => service.setGlobal({ actor: { id: ownerId, canIssueFunds: false }, enabled: false, transactionPassword: TXN }), (e) => e.code === 'WITHDRAWAL_CONTROL_OWNER_ONLY');
    await assert.rejects(() => service.setGlobal({ actor: owner, enabled: false, transactionPassword: 'wrong' }), (e) => String(e.code).startsWith('TXN_PASSWORD'));
  });

  await t.test('OFF refuses every player withdrawal; staff are not players', async () => {
    const off = await service.setGlobal({ actor: owner, enabled: false, transactionPassword: TXN });
    assert.equal(off.enabled, false);
    assert.equal(off.updatedBy.id, String(ownerId));
    await assert.rejects(() => withdrawBlock.assertWithdrawAllowed(models, { userId: uid }), (e) => e.code === 'WITHDRAW_DISABLED');
    await withdrawBlock.assertWithdrawAllowed(models, { staffId: ownerId });
  });

  await t.test('limit + wagering bonus come from the owner panel only; old admin columns are ignored', async () => {
    await sequelize.query(
      `UPDATE withdrawal_control SET limit_enabled = TRUE, deposit_multiplier = 2, wager_bonus_enabled = FALSE, wager_multiplier = 7 WHERE id = 1`
    );
    let ownerCap = {};
    try {
      ownerCap = (await entitlements.getEntitlements())?.withdrawalCap ?? {};
    } catch {
      // No owner document reachable in the test run → the defaults.
    }
    const { limit } = await service.read();
    assert.deepEqual({ ...limit }, { ...withdrawalCap.cleanWithdrawalCap(ownerCap), source: 'owner' });
    assert.equal(typeof service.setLimit, 'undefined', 'the admin can no longer save a limit');

    const list = await service.users({ search: String(uid), status: 'all', limit: 10, offset: 0 });
    const me = list.rows.find((r) => r.id === String(uid));
    assert.ok(me, 'direct user listed');
    assert.equal(me.maxWithdrawable, limit.enabled ? '0.00000000' : null, 'nothing deposited → max 0 while the limit is on, none while off');
  });

  await t.test('ON lets them withdraw again', async () => {
    const on = await service.setGlobal({ actor: owner, enabled: true, transactionPassword: TXN });
    assert.equal(on.enabled, true);
    await withdrawBlock.assertWithdrawAllowed(models, { userId: uid });
    assert.equal((await service.read()).enabled, true);
  });
});
