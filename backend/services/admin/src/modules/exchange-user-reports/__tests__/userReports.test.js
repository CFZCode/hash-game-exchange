'use strict';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger } = require('@ibitplay/common');
const { hashPassword } = require('@ibitplay/auth');

const { UserReportsService, fmtDate } = require('../userReports.service');

/**
 * Exchange user reports — zip (msadmin) ka Home, User History, User Authentication,
 * Fraud Report aur User Register Detail. Sab credits / users / staff se padhte hain.
 */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';

let connection;
let nextStaffId = 985_000 + (process.pid % 1000) * 100;
const newStaffId = () => (nextStaffId += 1);
let nextUid = 840_000_000 + Math.floor(process.pid % 100_000) * 1000;
const newUid = () => (nextUid += 1);

test('exchange user reports', async (t) => {
  const logger = createLogger({ name: 'user-reports-test', level: 'silent' });

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
  const run = (query, replacements) => connection.sequelize.query(query, { replacements });
  const reports = new UserReportsService({ models, logger });

  const seeded = { staff: [], users: [] };
  t.after(async () => {
    const { Op } = require('sequelize');
    if (seeded.users.length) {
      await run('DELETE FROM user_login_history WHERE user_id IN (:ids)', { ids: seeded.users });
      await run('DELETE FROM mssports.total_exposures WHERE user_id IN (:ids)', { ids: seeded.users });
      await run("DELETE FROM staff_transfers WHERE to_type = 'user' AND to_id IN (:ids)", { ids: seeded.users });
      await models.Credits.destroy({ where: { uid: seeded.users } });
      await models.Users.destroy({ where: { id: seeded.users } });
    }
    if (seeded.staff.length) {
      await run('DELETE FROM admin_activity_logs WHERE staff_id IN (:ids)', { ids: seeded.staff });
      await models.StaffCredits.destroy({ where: { staff_id: seeded.staff } });
      await models.StaffHierarchy.destroy({ where: { [Op.or]: [{ ancestor_id: seeded.staff }, { descendant_id: seeded.staff }] } });
      await models.Staff.destroy({ where: { id: seeded.staff } });
    }
    await connection.close();
  });

  const agentRole = 8550 + (process.pid % 40); // 8xxx: sirf exchange tests
  await run(
    'INSERT INTO roles (id, name, level) VALUES (:id, :name, 6) ON CONFLICT (id) DO UPDATE SET level = EXCLUDED.level',
    { id: agentRole, name: `ur-role-${agentRole}` }
  );

  const seedStaff = async (parentId = null, wallet = {}) => {
    const id = newStaffId();
    seeded.staff.push(id);
    await models.StaffCredits.destroy({ where: { staff_id: id } });
    // Ids pid se bante hain — pichhle run ke child staff / players is id ke neeche reh sakte hain.
    await models.Staff.update({ parent_id: null }, { where: { parent_id: id } });
    await models.Users.update({ parent_staff_id: null }, { where: { parent_staff_id: id } });
    await models.Staff.destroy({ where: { id } });
    await models.Staff.create({
      id,
      name: `ur-staff-${id}`,
      email: `ur-staff-${id}@test.invalid`,
      password: await hashPassword('login password', 4),
      role_id: agentRole,
      parent_id: parentId,
      status: 'active',
    });
    await models.StaffCredits.create({ staff_id: id, user_type: 'STAFF', inr: '0' });
    for (const [col, value] of Object.entries(wallet)) await run(`UPDATE credits SET ${col} = :value WHERE staff_id = :id`, { value, id });
    const rows = [{ ancestor_id: id, descendant_id: id, depth: 0 }];
    if (parentId) {
      const ancestors = await models.StaffHierarchy.findAll({ where: { descendant_id: parentId }, raw: true });
      rows.push(...ancestors.map((a) => ({ ancestor_id: a.ancestor_id, descendant_id: id, depth: Number(a.depth) + 1 })));
    }
    await models.StaffHierarchy.bulkCreate(rows, { ignoreDuplicates: true });
    return id;
  };

  const seedPlayer = async (parentStaffId, wallet = {}, extra = {}) => {
    const uid = newUid();
    seeded.users.push(uid);
    await models.Credits.destroy({ where: { uid } });
    await models.Users.destroy({ where: { id: uid } });
    await models.Users.create({ id: uid, name: `ur-player-${uid}`, password: 'x', status: 'active', parent_staff_id: parentStaffId, ...extra });
    await models.Credits.create({ uid, inr: '0' });
    // sports_pts waghera model me nahi bhi ho sakte — seedha SQL se
    for (const [col, value] of Object.entries(wallet)) await run(`UPDATE credits SET ${col} = :value WHERE uid = :uid`, { value, uid });
    return uid;
  };

  const agentActor = (id) => ({ id, level: 6 });
  const page = { limit: 25, offset: 0 };

  await t.test('home: own credits row, settlement = all_point − credit, exposure of the downline', async () => {
    const agent = await seedStaff(null, { inr: '1500.5', credit: '1000', all_point: '1250', upper_point: '30', down_point: '-20', sports_pts: '-250' });
    const sub = await seedStaff(agent);
    const p1 = await seedPlayer(agent);
    const p2 = await seedPlayer(sub);
    await run('INSERT INTO mssports.total_exposures (user_id, total_exposure, "createdAt", "updatedAt") VALUES (:a, -100, NOW(), NOW()), (:b, -40.5, NOW(), NOW())', { a: p1, b: p2 });

    const home = await reports.home({ actor: agentActor(agent) });
    assert.equal(home.balance, '1500.50');
    assert.equal(home.credit, '1000.00');
    assert.equal(home.allPoint, '1250.00');
    assert.equal(home.settlementPoints, '250.00');
    assert.equal(home.upperPoint, '30.00');
    assert.equal(home.downPoint, '-20.00');
    assert.equal(home.sportsPts, '-250.00');
    assert.equal(home.exposure, '140.50', 'both players, sub-agent ka bhi');
    assert.equal(home.isOwner, false);
  });

  await t.test('login history: player rows in the date range, outside the downline refused', async () => {
    const agent = await seedStaff();
    const other = await seedStaff();
    const player = await seedPlayer(agent);
    const stranger = await seedPlayer(other);
    await run(
      `INSERT INTO user_login_history (user_id, ip_address, created_at, city, country) VALUES
         (:u, '::ffff:203.0.113.7', '2026-10-10T10:00:00Z', 'Pune', 'India'),
         (:u, '198.51.100.2, 10.0.0.1', '2026-10-12T10:00:00Z', NULL, NULL),
         (:u, '198.51.100.3', '2026-09-01T10:00:00Z', NULL, NULL)`,
      { u: player }
    );
    const name = `ur-player-${player}`;

    const all = await reports.loginHistory({ actor: agentActor(agent), username: name, ...page });
    assert.equal(all.total, 3);
    assert.deepEqual(all.rows.map((r) => r.ip), ['198.51.100.2', '203.0.113.7', '198.51.100.3']);
    assert.equal(all.rows[0].username, name);

    const ranged = await reports.loginHistory({ actor: agentActor(agent), username: name, fromDate: '2026-10-01', toDate: '2026-10-10', ...page });
    assert.deepEqual(ranged.rows.map((r) => r.ip), ['203.0.113.7']);

    await assert.rejects(
      reports.loginHistory({ actor: agentActor(agent), username: `ur-player-${stranger}`, ...page }),
      (e) => e.statusCode === 403 || e.status === 403
    );

    const missing = await reports.loginHistory({ actor: agentActor(agent), username: 'nobody-ur-xyz', ...page });
    assert.equal(missing.total, 0);

    // Ip Detail — login ke waqt save hui location
    const detail = await reports.ipDetail({ ip: '203.0.113.7' });
    assert.deepEqual(detail, { ip: '203.0.113.7', city: 'Pune', country: 'India', mobile: false }, '::ffff: wala row bhi milta hai');
    const unknown = await reports.ipDetail({ ip: '198.51.100.3' });
    assert.deepEqual(unknown, { ip: '198.51.100.3', city: '-', country: '-', mobile: false });
  });

  await t.test('password history: audit rows of the target, self = own account', async () => {
    const agent = await seedStaff();
    const player = await seedPlayer(agent);
    const insert = (action, targetType, targetId, details = {}) =>
      run(
        `INSERT INTO admin_activity_logs (staff_id, actor_name, action, target_type, target_id, details, ip, status, created_at)
         VALUES (:staff, :actor, :action, :tt, :tid, CAST(:details AS jsonb), '::ffff:192.0.2.9', 'success', NOW())`,
        { staff: agent, actor: `ur-staff-${agent}`, action, tt: targetType, tid: String(targetId), details: JSON.stringify(details) }
      );
    await insert('account.password.set', 'USER', player);
    await insert('user.update', 'USER', player, { passwordChanged: true });
    await insert('user.update', 'USER', player, { passwordChanged: false });
    await insert('staff.password.change', 'STAFF', agent, { self: true });

    const forPlayer = await reports.passwordHistory({ actor: agentActor(agent), username: `ur-player-${player}`, ...page });
    assert.equal(forPlayer.total, 2);
    assert.equal(forPlayer.rows[0].ip, '192.0.2.9');
    assert.equal(forPlayer.rows[0].changedBy, `ur-staff-${agent}`);

    const self = await reports.passwordHistory({ actor: agentActor(agent), username: '', ...page });
    assert.equal(self.total, 1);
    assert.equal(self.rows[0].username, `ur-staff-${agent}`);

    // Staff login save nahi hota — khaali list, error nahi
    const staffLogins = await reports.loginHistory({ actor: agentActor(agent), ...page });
    assert.equal(staffLogins.total, 0);
  });

  await t.test('auth list: direct children only, sorted, 2FA label', async () => {
    const agent = await seedStaff();
    const sub = await seedStaff(agent);
    await models.Staff.update({ two_fa_enabled: true }, { where: { id: sub } });
    const player = await seedPlayer(agent);
    await seedPlayer(sub); // pota — list me nahi

    const list = await reports.authList({ actor: agentActor(agent), ...page });
    assert.equal(list.total, 2);
    const byName = Object.fromEntries(list.rows.map((r) => [r.username, r.authentication]));
    assert.equal(byName[`ur-staff-${sub}`], 'google authentication');
    assert.equal(byName[`ur-player-${player}`], 'no authentication');
    assert.deepEqual(list.rows.map((r) => r.username), [`ur-player-${player}`, `ur-staff-${sub}`]);
  });

  await t.test('fraud: no source, empty page', async () => {
    assert.deepEqual(await reports.fraud(), { rows: [], total: 0 });
  });

  await t.test('register detail: tree players, staff filter, deposit dates, sort by type', async () => {
    const agent = await seedStaff();
    const sub = await seedStaff(agent);
    const older = await seedPlayer(agent, { sports_pts: '-12.5' }, { created: '2026-01-01T00:00:00Z', last_login_at: '2026-10-01T00:00:00Z', referalcode: 'REF1' });
    const newer = await seedPlayer(sub, {}, { created: '2026-05-01T00:00:00Z', last_login_at: '2026-02-01T00:00:00Z' });
    await run(
      `INSERT INTO staff_transfers (from_type, from_id, to_type, to_id, amount, created_at, direction, transfer_type)
       VALUES ('staff', :a, 'user', :u, 100, '2026-03-01T10:00:00Z', 'deposit', 'refill'),
              ('staff', :a, 'user', :u, 50, '2026-04-01T10:00:00Z', 'deposit', 'refill')`,
      { a: agent, u: older }
    );

    const all = await reports.registerDetail({ actor: agentActor(agent), type: '1', ...page });
    assert.equal(all.total, 2);
    assert.deepEqual(all.rows.map((r) => r.id), [String(newer), String(older)], 'created date desc');
    const o = all.rows[1];
    assert.equal(o.agentName, `ur-staff-${agent}`);
    assert.equal(o.createdDate, fmtDate('2026-01-01T00:00:00Z'));
    assert.equal(o.firstDepositDate, '01/03/2026 15:30:00');
    assert.equal(o.lastDepositDate, '01/04/2026 15:30:00');
    assert.equal(o.deposit, 'Deposit');
    assert.equal(o.sportsBalance, -12.5);
    assert.equal(o.referralCode, 'REF1');
    assert.equal(all.rows[0].deposit, 'No Deposit');

    const byLogin = await reports.registerDetail({ actor: agentActor(agent), type: '3', ...page });
    assert.deepEqual(byLogin.rows.map((r) => r.id), [String(older), String(newer)]);

    const subOnly = await reports.registerDetail({ actor: agentActor(agent), username: `ur-staff-${sub}`, type: '1', ...page });
    assert.deepEqual(subOnly.rows.map((r) => r.id), [String(newer)]);

    const one = await reports.registerDetail({ actor: agentActor(agent), username: `ur-player-${older}`, type: '1', ...page });
    assert.deepEqual(one.rows.map((r) => r.id), [String(older)]);

    // Sub-agent upar wale ko nahi dekh sakta
    const fromSub = await reports.registerDetail({ actor: agentActor(sub), username: `ur-staff-${agent}`, type: '1', ...page });
    assert.equal(fromSub.total, 0);
  });
});
