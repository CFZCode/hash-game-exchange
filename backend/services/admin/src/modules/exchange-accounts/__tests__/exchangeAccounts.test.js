'use strict';

process.env.TXN_PASSWORD_MODE = 'separate';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger, money } = require('@ibitplay/common');
const { hashPassword } = require('@ibitplay/auth');

const { CreateAccountService } = require('../createAccount');
const { MultiLoginService, PRIVILEGE_PERMISSIONS } = require('../multiLogin');
const { userCreationCsv } = require('../userCreationCsv');
const migration104 = require('../../../../../../packages/db/migrations/104-exchange-accounts-tables');

/**
 * Exchange Accounts — Create Account, Multi Login aur Assign Agent CSV (zip msadmin ke screens).
 *
 *   naya account: staff/player row + credits row; Credit Amount parent se aata hai,
 *   point ledger me entry; parent ke paas kam ho to account 0 credit pe (creditSkipped)
 */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';
const TXN = 'exchange accounts txn password';
const tag = `${process.pid % 100000}`;

let connection;
let nextStaffId = 1_240_000 + (process.pid % 1000) * 100;
const newStaffId = () => (nextStaffId += 1);

test('exchange accounts screens', async (t) => {
  const logger = createLogger({ name: 'exchange-accounts-test', level: 'silent' });

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
  t.after(async () => {
    if (connection) await connection.close();
  });

  const { models } = connection;
  const sequelize = connection.sequelize;
  const sql = (query, replacements) => sequelize.query(query, { replacements, type: 'SELECT' });
  await sequelize.transaction((transaction) => migration104.up({ sequelize, transaction }));

  const deps = { models, db: connection, logger, config: { SERVICE_NAME: 'admin-service' } };
  const accounts = new CreateAccountService(deps);
  const multiLogin = new MultiLoginService(deps);

  const dec = (v) => Number(money.fromStored(v ?? '0'));

  /** Staff + credits + staff_hierarchy, jaise StaffService banata. */
  const seedStaff = async ({ roleId, parentId = null, inr = '0' }) => {
    const id = newStaffId();
    await models.Staff.create({
      id,
      name: `xacc${tag}s${id}`,
      email: `xacc-${id}@test.invalid`,
      password: await hashPassword('login password', 4),
      transaction_password: await hashPassword(TXN, 4),
      role_id: roleId,
      parent_id: parentId,
      status: 'active',
    });
    await models.StaffCredits.create({ staff_id: id, user_type: roleId === 1 ? 'OWNER' : 'STAFF', inr });
    const rows = [{ ancestor_id: id, descendant_id: id, depth: 0 }];
    if (parentId) {
      const ancestors = await models.StaffHierarchy.findAll({ where: { descendant_id: parentId }, raw: true });
      rows.push(...ancestors.map((a) => ({ ancestor_id: a.ancestor_id, descendant_id: id, depth: Number(a.depth) + 1 })));
    }
    await models.StaffHierarchy.bulkCreate(rows, { ignoreDuplicates: true });
    return id;
  };

  /** Route jo do actor banata hai, wahi yahan. */
  const actors = (id, level) => {
    const permissions = level === 1 ? ['*'] : ['users:read', 'users:write', 'staff:read', 'staff:write', 'wallet:read', 'wallet:credit', 'wallet:debit', 'reports:read', 'sports:read', 'users:lock'];
    const owner = level === 1;
    return {
      staffActor: { id, level, executiveId: null, permissions, canIssueFunds: owner, canAdjustWallets: owner, canCredit: true, canDebit: true },
      playerActor: { id, level, executiveId: null, permissions },
    };
  };

  const ownerId = await seedStaff({ roleId: 1, inr: '10000' });
  const owner = actors(ownerId, 1);

  await t.test('owner creates an Admin with Credit Amount: credits row, money moved, point ledger entry', async () => {
    const username = `xadm${tag}a`;
    const result = await accounts.create({
      ...owner,
      username,
      password: 'StrongPassword12',
      creditAmount: '1500',
      userType: 2,
      percentage: '2.5',
      transactionPassword: TXN,
    });

    assert.equal(result.creditSkipped, false);
    assert.equal(result.message, 'User created successfully under parent');
    const staff = await models.Staff.findOne({ where: { name: username }, raw: true });
    assert.equal(Number(staff.parent_id), ownerId);
    assert.equal(Number(staff.percentage), 2.5);

    const wallet = await models.StaffCredits.findOne({ where: { staff_id: staff.id }, raw: true });
    assert.equal(dec(wallet.inr), 1500);
    assert.equal(dec(wallet.credit), 1500);
    assert.equal(dec(wallet.all_point), 1500);
    assert.equal(dec((await models.StaffCredits.findOne({ where: { staff_id: ownerId }, raw: true })).inr), 8500);

    const [entry] = await sql('SELECT * FROM mssports.point_ledger WHERE wallet_id = :id', { id: wallet.id });
    assert.equal(Number(entry.delta), 1500);
  });

  await t.test('owner creates a player with Credit Amount: opening balance through PlayersService', async () => {
    const username = `xply${tag}a`;
    const result = await accounts.create({ ...owner, username, password: 'Player1234', creditAmount: '200', userType: 'USER', transactionPassword: TXN });

    assert.equal(result.data.accountType, 'user');
    const user = await models.Users.findOne({ where: { name: username }, raw: true });
    assert.equal(Number(user.parent_staff_id), ownerId);
    const wallet = await models.Credits.findOne({ where: { uid: user.id }, raw: true });
    assert.equal(dec(wallet.inr), 200);
    assert.equal(dec(wallet.all_point), 200);
  });

  await t.test('parent short: account still created with 0 credit (zip creditSkipped)', async () => {
    const agentId = await seedStaff({ roleId: 6, parentId: ownerId, inr: '50' });
    const agent = actors(agentId, 6);
    const username = `xply${tag}b`;

    const result = await accounts.create({ ...agent, username, password: 'Player1234', creditAmount: '100', userType: 'USER', transactionPassword: TXN });

    assert.equal(result.creditSkipped, true);
    assert.match(result.message, /Client Credit is : 50\.00/);
    const user = await models.Users.findOne({ where: { name: username }, raw: true });
    assert.equal(Number(user.parent_staff_id), agentId);
    assert.equal(dec((await models.Credits.findOne({ where: { uid: user.id }, raw: true })).inr), 0);
    assert.equal(dec((await models.StaffCredits.findOne({ where: { staff_id: agentId }, raw: true })).inr), 50, 'nothing moved');
  });

  await t.test('agent funds its own player from its float', async () => {
    const agentId = await seedStaff({ roleId: 6, parentId: ownerId, inr: '300' });
    const username = `xply${tag}c`;
    await accounts.create({ ...actors(agentId, 6), username, password: 'Player1234', creditAmount: '120.50', userType: 'USER', transactionPassword: TXN });

    const user = await models.Users.findOne({ where: { name: username }, raw: true });
    assert.equal(dec((await models.Credits.findOne({ where: { uid: user.id }, raw: true })).inr), 120.5);
    assert.equal(dec((await models.StaffCredits.findOne({ where: { staff_id: agentId }, raw: true })).inr), 179.5);
  });

  await t.test('duplicate name (any of users / staff / executives), bad credit, bad user type, wrong code', async () => {
    const taken = `xadm${tag}a`;
    assert.deepEqual((await accounts.checkUsername(taken.toUpperCase())).available, false);
    assert.equal((await accounts.checkUsername(`free${tag}zz`)).available, true);

    await assert.rejects(
      () => accounts.create({ ...owner, username: taken, password: 'StrongPassword12', userType: 2, transactionPassword: TXN }),
      /User Name Already Exists/
    );
    await assert.rejects(
      () => accounts.create({ ...owner, username: `xbad${tag}a`, password: 'Player1234', creditAmount: '-37', userType: 'USER', transactionPassword: TXN }),
      /creditamount is invalid\./
    );
    await assert.rejects(
      () => accounts.create({ ...owner, username: `xbad${tag}b`, password: 'StrongPassword12', userType: 7, transactionPassword: TXN }),
      /Select Proper User type/
    );
    await assert.rejects(
      () => accounts.create({ ...owner, username: `xbad${tag}c`, password: 'Player1234', userType: 'USER', transactionPassword: 'wrong' }),
      (err) => err.status === 401 || err.status === 403 || err.status === 400 || err.status === 422
    );
    assert.equal(await models.Users.count({ where: { name: `xbad${tag}c` } }), 0, 'nothing created on a wrong code');
  });

  await t.test('multi login: create with zip privileges, list, edit, on/off, password, delete', async () => {
    const actor = { id: ownerId, level: 1, executiveId: null, permissions: ['*'] };
    const created = await multiLogin.create({
      actor,
      username: `xexe${tag}a`,
      full_name: 'Desk Operator',
      password: 'DeskOperator1234',
      transactionPassword: TXN,
      permissions: { userList: true, bank: true, ourCasino: true },
    });
    assert.equal(created.executive.full_name, 'Desk Operator');
    assert.equal(created.executive.permissions.userList, true);
    assert.equal(created.executive.permissions.ourCasino, undefined, 'casino privilege is not kept');

    const row = await models.Executives.findByPk(created.executive.id, { raw: true });
    assert.deepEqual([...row.permissions.authority].sort(), [...PRIVILEGE_PERMISSIONS.userList, ...PRIVILEGE_PERMISSIONS.bank].sort());

    const list = await multiLogin.list({ actor });
    assert.ok(list.executives.some((e) => e.id === created.executive.id && e.active));

    const edited = await multiLogin.updatePrivileges({ actor, executiveId: created.executive.id, permissions: { dashboard: true } });
    assert.equal(edited.executive.permissions.dashboard, true);
    assert.equal(edited.executive.permissions.bank, false);
    assert.equal(edited.executive.full_name, 'Desk Operator', 'full name survives an edit');

    const off = await multiLogin.setActive({ actor, executiveId: created.executive.id });
    assert.equal(off.executive.active, false);
    await multiLogin.changePassword({ actor, executiveId: created.executive.id, password: 'AnotherPass1234' });
    await assert.rejects(() => multiLogin.changePassword({ actor, executiveId: created.executive.id, password: 'weak' }), /at least 8/);

    await assert.rejects(
      () => multiLogin.create({ actor, username: `xexe${tag}b`, full_name: 'No Privs', password: 'DeskOperator1234', transactionPassword: TXN, permissions: {} }),
      /Privileges field is required/
    );

    await multiLogin.remove({ actor, executiveId: created.executive.id });
    assert.equal(await models.Executives.count({ where: { id: created.executive.id } }), 0);
  });

  await t.test('assign agent: User Creation CSV lists players created in the window', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { csv, count } = await userCreationCsv(deps, { actor: owner.staffActor, from: today, to: today });
    assert.ok(count >= 2);
    assert.match(csv, /^S\.No\.,User Name,Mobile Number,Parent,Created At/);
    assert.match(csv, new RegExp(`xply${tag}a`));
    await assert.rejects(() => userCreationCsv(deps, { actor: owner.staffActor, from: '2026-01-01', to: '2026-01-20' }), /at most 7 days/);
  });

});
