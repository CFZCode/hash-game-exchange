'use strict';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger } = require('@ibitplay/common');
const { hashPassword } = require('@ibitplay/auth');

const { LocksService } = require('../locks.service');
const { LordsService } = require('../../lords/lords.service');

/**
 * Unlocking an agent lifts only the locks IT imposed (B2B fix 4).
 *
 * Locking an agent cascades to the whole branch. Unlocking it used to write
 * `false` over the whole branch too — undoing a lock an operator had set on a
 * child directly, or one another ancestor was holding.
 *
 *     root ── a ── b ── bPlayer
 *              │
 *           aPlayer, aPlayer2
 */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';
const TXN = 'cascade txn password';

let nextId = 510_000_000 + (process.pid % 100_000) * 1000;
const newId = () => (nextId += 1);

test('lock cascade keeps direct locks', async (t) => {
  const logger = createLogger({ name: 'lock-cascade-test', level: 'silent' });

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

  const { models } = connection;
  const deps = { models, db: connection, logger, config: {} };
  const locks = new LocksService(deps);
  const lords = new LordsService(deps);

  const roleId = (await models.Roles.findOne({ where: { level: 6 }, raw: true }))?.id;
  assert.ok(roleId, 'the test database needs a level-6 (agent) role');

  const root = newId();
  const a = newId();
  const b = newId();
  const aPlayer = newId();
  const aPlayer2 = newId();
  const bPlayer = newId();
  const allStaff = [root, a, b];
  const allPlayers = [aPlayer, aPlayer2, bPlayer];

  const reset = async () => {
    await models.Users.destroy({ where: { id: allPlayers } });
    await models.Staff.destroy({ where: { id: allStaff } });
    const txn = await hashPassword(TXN, 4);
    await models.Staff.bulkCreate([
      { id: root, name: `cr-${root}`, email: `cr${root}@t.test`, password: 'x', transaction_password: txn, role_id: roleId, parent_id: null },
      { id: a, name: `ca-${a}`, email: `ca${a}@t.test`, password: 'x', role_id: roleId, parent_id: root },
      { id: b, name: `cb-${b}`, email: `cb${b}@t.test`, password: 'x', role_id: roleId, parent_id: a },
    ]);
    await models.Users.bulkCreate([
      { id: aPlayer, name: `cpa-${aPlayer}`, password: 'x', status: 'active', parent_staff_id: a },
      { id: aPlayer2, name: `cpa2-${aPlayer2}`, password: 'x', status: 'active', parent_staff_id: a },
      { id: bPlayer, name: `cpb-${bPlayer}`, password: 'x', status: 'active', parent_staff_id: b },
    ]);
  };

  t.after(async () => {
    await models.Users.destroy({ where: { id: allPlayers } });
    await models.Staff.destroy({ where: { id: allStaff } });
    await connection.close();
  });

  const actor = { id: root, permissions: ['*'] };
  const player = async (id) => Boolean((await models.Users.findByPk(id, { raw: true })).sports_betlocked);
  const staff = async (id) => Boolean((await models.Staff.findByPk(id, { raw: true })).sports_betlocked);

  await t.test('a lock set on a player directly survives unlocking its agent', async () => {
    await reset();
    await locks.updateLocks({ actor, userId: aPlayer, locks: { sports: true } });
    await locks.updateLocks({ actor, staffId: a, locks: { sports: true } });

    assert.equal(await player(aPlayer), true);
    assert.equal(await player(aPlayer2), true);
    assert.equal(await staff(b), true);
    assert.equal(await player(bPlayer), true);

    await locks.updateLocks({ actor, staffId: a, locks: { sports: false } });

    assert.equal(await staff(a), false, 'the agent itself');
    assert.equal(await player(aPlayer), true, 'THE DIRECT LOCK STAYS');
    assert.equal(await player(aPlayer2), false, 'the inherited lock is lifted');
    assert.equal(await staff(b), false);
    assert.equal(await player(bPlayer), false);
  });

  await t.test('a lock held by two agents is lifted only when both let go', async () => {
    await reset();
    await locks.updateLocks({ actor, staffId: a, locks: { sports: true } });
    await locks.updateLocks({ actor, staffId: b, locks: { sports: true } });

    await locks.updateLocks({ actor, staffId: a, locks: { sports: false } });
    assert.equal(await staff(b), true, 'b was locked directly as well');
    assert.equal(await player(bPlayer), true, 'still held by b');
    assert.equal(await player(aPlayer), false);

    await locks.updateLocks({ actor, staffId: b, locks: { sports: false } });
    assert.equal(await staff(b), false);
    assert.equal(await player(bPlayer), false);
  });

  await t.test('a direct lock through the accounts route is kept too, and a direct unlock clears it', async () => {
    await reset();
    await lords.setStatus({
      actor: { id: root }, accountType: 'user', accountId: bPlayer, sportsLocked: true, transactionPassword: TXN,
    });
    await locks.updateLocks({ actor, staffId: a, locks: { sports: true } });
    await locks.updateLocks({ actor, staffId: a, locks: { sports: false } });
    assert.equal(await player(bPlayer), true);

    await lords.setStatus({
      actor: { id: root }, accountType: 'user', accountId: bPlayer, sportsLocked: false, transactionPassword: TXN,
    });
    assert.equal(await player(bPlayer), false);
  });

  await t.test('a lock from before lock_sources is never lifted by a cascade', async () => {
    await reset();
    // Locked the old way: the column, no record of why.
    await models.Users.update({ sports_betlocked: true }, { where: { id: aPlayer } });

    await locks.updateLocks({ actor, staffId: a, locks: { sports: true } });
    await locks.updateLocks({ actor, staffId: a, locks: { sports: false } });

    assert.equal(await player(aPlayer), true, 'unknown origin is treated as a direct lock');
    assert.equal(await player(aPlayer2), false);
  });

  await t.test('only the named lock column cascades', async () => {
    await reset();
    await locks.updateLocks({ actor, userId: aPlayer, locks: { casino: true } });
    await locks.updateLocks({ actor, staffId: a, locks: { sports: true, casino: true } });
    await locks.updateLocks({ actor, staffId: a, locks: { sports: false, casino: false } });

    const row = await models.Users.findByPk(aPlayer, { raw: true });
    assert.equal(row.casino_locked, true, 'direct casino lock kept');
    assert.equal(row.sports_betlocked, false, 'inherited sports lock lifted');
  });
});
