'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Op } = require('sequelize');

const db = require('@ibitplay/db');
const { createLogger } = require('@ibitplay/common');

const { ExchangeReportsService } = require('../reports.service');
const v = require('../reports.validators');

/**
 * Sports Exchange → Reports (zip msadmin `reports/*`) — sab tree tak simit.
 *
 *   owner
 *    ├─ agentA ── playerA
 *    ├─ agentB ── playerB
 *    └─ direct  (parent_staff_id NULL — sirf owner dekhta hai)
 *
 * playerA ki ek market settle hui: −50 (haara). point_ledger me playerA + agentA + owner
 * teeno wallets par −50 (sports roll-up jaisa). agentA ne playerA ko 100 Credit diya.
 */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';

const base = 976_000 + (process.pid % 1000) * 10;
const uidBase = 840_000_000 + (process.pid % 100_000) * 10;

test('exchange reports', async (t) => {
  const logger = createLogger({ name: 'exchange-reports-test', level: 'silent' });
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
  let cleanup = async () => {};
  t.after(async () => {
    await cleanup();
    if (connection) await connection.close();
  });

  const { models, sequelize } = connection;
  const run = (query, replacements) => sequelize.query(query, { replacements });
  const one = async (query, replacements) => (await sequelize.query(query, { replacements, type: 'SELECT' }))[0];
  const reports = new ExchangeReportsService({ models, logger });

  // ── Seed ──────────────────────────────────────────────────────────────
  const ownerRole = 8400 + (process.pid % 40); // 8xxx: sirf exchange tests
  const agentRole = 8450 + (process.pid % 40);
  for (const [id, level, name] of [[ownerRole, 1, 'Super Admin'], [agentRole, 6, 'Agent']]) {
    await run('INSERT INTO roles (id, name, level) VALUES (:id, :name, :level) ON CONFLICT (id) DO UPDATE SET level = EXCLUDED.level', {
      id, name: `${name} ${id}`, level,
    });
  }

  const ownerId = base + 1;
  const agentA = base + 2;
  const agentB = base + 3;
  const playerA = String(uidBase + 1);
  const playerB = String(uidBase + 2);
  const direct = String(uidBase + 3);
  const staffIds = [ownerId, agentA, agentB];
  const uids = [playerA, playerB, direct];

  cleanup = async () => {
    const wallets = await sequelize.query('SELECT id FROM credits WHERE staff_id IN (:staffIds) OR uid IN (:uids)', {
      replacements: { staffIds, uids }, type: 'SELECT',
    });
    const walletIds = wallets.map((w) => w.id);
    if (walletIds.length) await run('DELETE FROM mssports.point_ledger WHERE wallet_id IN (:walletIds)', { walletIds });
    await run('DELETE FROM mssports.credits_ledger WHERE user_id IN (:uids)', { uids });
    await run('DELETE FROM mssports."SportsBet" WHERE user_id IN (:uids)', { uids });
    await run('DELETE FROM mssports.users WHERE user_id IN (:uids)', { uids });
    await run('DELETE FROM credits WHERE staff_id IN (:staffIds) OR uid IN (:uids)', { staffIds, uids });
    await run('DELETE FROM users WHERE id IN (:uids)', { uids });
    await models.StaffHierarchy.destroy({ where: { [Op.or]: [{ ancestor_id: staffIds }, { descendant_id: staffIds }] } });
    await run('DELETE FROM staff WHERE id IN (:staffIds)', { staffIds: [agentA, agentB] });
    await run('DELETE FROM staff WHERE id = :id', { id: ownerId });
  };
  await cleanup();

  const seedStaff = async (id, name, parentId, roleId, userType) => {
    await models.Staff.create({
      id, name, email: `${name}@test.invalid`, password: 'x', role_id: roleId, parent_id: parentId, status: 'active',
    });
    await models.StaffCredits.create({ staff_id: id, user_type: userType, inr: '1000' });
    const rows = [{ ancestor_id: id, descendant_id: id, depth: 0 }];
    if (parentId) rows.push({ ancestor_id: parentId, descendant_id: id, depth: 1 });
    await models.StaffHierarchy.bulkCreate(rows, { ignoreDuplicates: true });
  };
  await seedStaff(ownerId, `rep-owner-${base}`, null, ownerRole, 'OWNER');
  await seedStaff(agentA, `rep-agentA-${base}`, ownerId, agentRole, 'STAFF');
  await seedStaff(agentB, `rep-agentB-${base}`, ownerId, agentRole, 'STAFF');

  const seedPlayer = async (uid, name, parentStaffId) => {
    await models.Users.create({ id: uid, name, password: 'x', status: 'active', parent_staff_id: parentStaffId });
    await models.Credits.create({ uid, inr: '0' });
    // sports service ka mirror (SportsBet.user_id ki FK isi par hai)
    await run(
      `INSERT INTO mssports.users (user_id, username, password, role_id, "createdAt", "updatedAt")
       VALUES (:uid, :name, 'x', 1, NOW(), NOW())`,
      { uid, name }
    );
  };
  await seedPlayer(playerA, `rep-playerA-${base}`, agentA);
  await seedPlayer(playerB, `rep-playerB-${base}`, agentB);
  await seedPlayer(direct, `rep-direct-${base}`, null);

  const walletOf = async (column, id) => (await one(`SELECT id FROM credits WHERE ${column} = :id`, { id })).id;
  const wOwner = await walletOf('staff_id', ownerId);
  const wAgentA = await walletOf('staff_id', agentA);
  const wPlayerA = await walletOf('uid', playerA);
  const wPlayerB = await walletOf('uid', playerB);

  // agentA → playerA: 100 Credit (bet_id NULL)
  await run(
    `INSERT INTO mssports.point_ledger (entry_ref, event_type, username, wallet_id, settled_with_wallet_id, delta,
       all_point_after, closing_inr_balance, closing_inr_balance_parent, remark, created_at)
     VALUES (:ref, 'Credit', 'pA', :w, :parent, 100, 100, 100, 900, :remark, NOW())`,
    { ref: `deposit:rep-${base}`, w: wPlayerA, parent: wAgentA, remark: `Deposit#rep-playerA-${base}/rep-agentA-${base}` }
  );

  // playerA ki do bets ek hi market par (match_id + eventid), dono settle — haar 50.
  const bet = async (betType, stake, liability, odds, result) =>
    (await one(
      `INSERT INTO mssports."SportsBet" (user_id, game_type, bet_type, odds, stake_amount, liability, match_id, eventid,
         sport_id, market_type, match_title, gtype, result_status, fixed, created_at, updated_at)
       VALUES (:uid, 'MO', :betType, :odds, :stake, :liability, '1.234', '999', '4', 'MATCH_ODDS', 'India v Australia', 'match', :result, 1, NOW(), NOW())
       RETURNING id`,
      { uid: playerA, betType, stake, liability, odds, result }
    )).id;
  const bet1 = await bet('back', 50, 50, 2, 'loss');
  const bet2 = await bet('back', 20, 20, 3, 'won');
  const betB = await bet('back', 10, 10, 2, 'won');
  await run('UPDATE mssports."SportsBet" SET user_id = :uid WHERE id = :id', { uid: playerB, id: betB });

  // credits_ledger (settlement rows) — profit / loss per bet
  for (const [uid, betId, profit, loss] of [[playerA, bet1, null, -50], [playerA, bet2, 40, null], [playerB, betB, 10, null]]) {
    await run(
      `INSERT INTO mssports.credits_ledger (user_id, bet_id, amount, reason, category, sport_id, profit, loss, eventid, match_id, description, created_at)
       VALUES (:uid, :betId, 0, 'settlement', 'SPORTS', '4', :profit, :loss, '999', '1.234', 'Cricket / India v Australia / Match Odds / India', NOW())`,
      { uid, betId, profit, loss }
    );
  }

  // point_ledger BET_SETTLEMENT: market net −10 (−50 + 40), poori chain par
  for (const w of [wPlayerA, wAgentA, wOwner]) {
    await run(
      `INSERT INTO mssports.point_ledger (entry_ref, event_type, category, bet_id, wallet_id, username, delta, sport_id, game_type,
         closing_inr_balance, remark, created_at)
       VALUES (:ref, 'BET_SETTLEMENT', 'SPORTS', :betId, :w, 'x', -10, '4', 'match', 0, 'Cricket / India v Australia / Match Odds', NOW())`,
      { ref: `settle:bet:SPORTS:${bet1}`, betId: bet1, w }
    );
  }
  await run(
    `INSERT INTO mssports.point_ledger (entry_ref, event_type, category, bet_id, wallet_id, username, delta, sport_id, game_type, remark, created_at)
     VALUES (:ref, 'BET_SETTLEMENT', 'SPORTS', :betId, :w, 'x', 10, '4', 'match', 'b', NOW())`,
    { ref: `settle:bet:SPORTS:${betB}`, betId: betB, w: wPlayerB }
  );

  const { today } = await one('SELECT CURRENT_DATE::text AS today');
  const { from } = await one("SELECT (CURRENT_DATE - 3)::text AS \"from\"");
  const range = { fromDate: from, toDate: today };

  const owner = { id: ownerId, level: 1, canIssueFunds: true };
  const agent = { id: agentA, level: 6, canIssueFunds: false };

  // ── Tests ─────────────────────────────────────────────────────────────

  await t.test('client search only finds accounts in the tree', async () => {
    const mine = await reports.clients({ actor: agent, search: `rep-` });
    const names = mine.filter((r) => r.username.endsWith(String(base))).map((r) => r.username).sort();
    assert.deepStrictEqual(names, [`rep-agentA-${base}`, `rep-playerA-${base}`]);

    const all = await reports.clients({ actor: owner, search: `-${base}` });
    assert.ok(all.some((r) => r.username === `rep-direct-${base}`), 'owner sees direct users');
  });

  await t.test('account statement: deposit/withdraw report, both sides', async () => {
    const asAgent = await reports.statement({ actor: agent, reportType: 'TRANSACTION', statement: 'all', page: 1, limit: 25, ...range });
    assert.strictEqual(asAgent.rows[0].description, 'Opening pts');
    const deposit = asAgent.rows[1];
    // agent parent hai — child ko diya to agent ki taraf debit
    assert.strictEqual(deposit.debit, '100.00');
    assert.strictEqual(deposit.credit, '-');
    assert.strictEqual(deposit.closing, '900.00');
    assert.strictEqual(deposit.fromto, `rep-playerA-${base}/rep-agentA-${base}`);

    const asPlayer = await reports.statement({
      actor: agent, clientType: 'user', clientId: playerA, reportType: 'TRANSACTION', statement: 'all', page: 1, limit: 25, ...range,
    });
    assert.strictEqual(asPlayer.rows[1].credit, '100.00');

    // creditdown = jo maine neeche walon ke saath kiya; balanceupper = koi bank entry nahi
    const down = await reports.statement({ actor: agent, reportType: 'TRANSACTION', statement: 'creditdown', page: 1, limit: 25, ...range });
    assert.strictEqual(down.total, 2);
    const bank = await reports.statement({ actor: agent, reportType: 'TRANSACTION', statement: 'balanceupper', page: 1, limit: 25, ...range });
    assert.strictEqual(bank.total, 1); // sirf Opening pts
  });

  await t.test('account statement: game report flips the sign for staff', async () => {
    const asAgent = await reports.statement({ actor: agent, reportType: 'SPORTS', page: 1, limit: 25, ...range });
    const row = asAgent.rows[1];
    assert.strictEqual(row.credit, 10); // player haara 10 = agent ko +10
    assert.strictEqual(row.closing, 10);
    assert.strictEqual(row.betId, String(bet1));
    assert.strictEqual(row.category, 'SPORTS');

    const asPlayer = await reports.statement({
      actor: agent, clientType: 'user', clientId: playerA, reportType: 'SPORTS', page: 1, limit: 25, ...range,
    });
    assert.strictEqual(asPlayer.rows[1].debit, 10);

    // sport / game type filter
    const tennis = await reports.statement({ actor: agent, reportType: 'SPORTS', sportId: '2', page: 1, limit: 25, ...range });
    assert.strictEqual(tennis.total, 1);
    const match = await reports.statement({ actor: agent, reportType: 'SPORTS', sportId: '4', gameType: 'Match', page: 1, limit: 25, ...range });
    assert.strictEqual(match.total, 2);
  });

  await t.test('account statement: someone outside the tree is refused', async () => {
    await assert.rejects(
      reports.statement({ actor: agent, clientType: 'user', clientId: playerB, reportType: 'SPORTS', page: 1, limit: 25, ...range }),
      /not in your tree/
    );
    await assert.rejects(reports.statement({ actor: agent, clientType: 'user', clientId: direct, reportType: 'SPORTS', page: 1, limit: 25, ...range }));
  });

  await t.test('bet detail + bet export of a game row', async () => {
    const detail = await reports.statementBetDetail({ actor: agent, betId: bet1 });
    assert.strictEqual(detail.bets.length, 2);
    assert.strictEqual(detail.totalWin, -10);
    assert.strictEqual(detail.winner, 'India');
    assert.match(detail.breadcrumb, /^Cricket -> India v Australia -> MATCH_ODDS$/);

    const sheet = await reports.statementBetExport({ actor: agent, betId: bet1 });
    assert.strictEqual(sheet.columns.length, 13);
    assert.strictEqual(sheet.rows.length, 2);
    assert.strictEqual(sheet.rows[0][0], `rep-playerA-${base}`);

    await assert.rejects(reports.statementBetDetail({ actor: agent, betId: betB }), /not in your tree/);
  });

  await t.test('party win loss: staff rows at 0, players with their sport pts', async () => {
    const rows = await reports.partyWinLoss({ actor: agent, type: 'all' });
    const names = rows.map((r) => r.username);
    assert.ok(names.includes(`rep-agentA-${base}`));
    assert.ok(!names.includes(`rep-playerB-${base}`), 'other agent ka player nahi');
    const pA = rows.find((r) => r.username === `rep-playerA-${base}`);
    assert.strictEqual(pA.sport_pts, -10);
    assert.strictEqual(pA.level, 'User');
    assert.strictEqual(rows.find((r) => r.username === `rep-agentA-${base}`).profit_loss, 0);

    const onlyUsers = await reports.partyWinLoss({ actor: owner, type: 'user', search: `-${base}` });
    assert.deepStrictEqual(onlyUsers.map((r) => r.username).sort(), [`rep-direct-${base}`, `rep-playerA-${base}`, `rep-playerB-${base}`]);
  });

  await t.test('user win loss: category sums, client = staff narrows to its players', async () => {
    const res = await reports.userWinLoss({ actor: owner, clientType: 'staff', clientId: agentA, ...range });
    assert.deepStrictEqual(res.rows.map((r) => [r.username, r.sports_pts, r.total]), [[`rep-playerA-${base}`, -10, -10]]);
    assert.strictEqual(res.totals.total, -10);

    const mine = await reports.userWinLoss({ actor: agent, ...range });
    assert.ok(!mine.rows.some((r) => r.username === `rep-playerB-${base}`));
  });

  await t.test('total profit loss: grouped by sport + game type', async () => {
    const res = await reports.totalProfitLoss({ actor: agent, type: '0', ...range });
    assert.deepStrictEqual(res.sports, [{ event_name: 'Cricket', game_type: 'match', opening: 50, closing: 40, profit_loss: -10 }]);
    assert.deepStrictEqual(res.sportbook, []);

    const sportbook = await reports.totalProfitLoss({ actor: agent, type: '5', ...range });
    assert.deepStrictEqual(sportbook.sports, []);
  });

  await t.test('turnover: liability of won / lost bets and ledger win / loss', async () => {
    const res = await reports.turnover({ actor: agent, sportId: '4', gtype: 'Match', ...range });
    assert.deepStrictEqual(res, { loss_turnover: 50, loss: 50, win_turnover: 20, win: 40, total_turnover: 70, total_pl: -10 });

    const ownerAll = await reports.turnover({ actor: owner, clientType: 'staff', clientId: agentB, sportId: '4', ...range });
    assert.strictEqual(ownerAll.win, 10);

    const football = await reports.turnover({ actor: agent, sportId: '1', ...range });
    assert.strictEqual(football.total_turnover, 0);
  });

  await t.test('validators: date windows like the zip', () => {
    const body = (fromDate, toDate) => ({ reportType: 'SPORTS', fromDate, toDate });
    assert.ok(v.statement.body.safeParse(body('2026-10-01', '2026-10-08')).success);
    const eight = v.statement.body.safeParse(body('2026-10-01', '2026-10-09'));
    assert.match(eight.error.issues[0].message, /more than 7 days/);

    const fresh = new Date();
    const iso = (d) => d.toISOString().slice(0, 10);
    const tenAgo = new Date(fresh.getTime() - 10 * 86_400_000);
    const elevenAgo = new Date(fresh.getTime() - 11 * 86_400_000);
    assert.ok(v.userWinLoss.body.safeParse({ fromDate: iso(tenAgo), toDate: iso(fresh) }).success);
    assert.match(v.userWinLoss.body.safeParse({ fromDate: iso(elevenAgo), toDate: iso(fresh) }).error.issues[0].message, /10 days/);
    assert.strictEqual(v.turnover.body.safeParse({ fromDate: iso(tenAgo), toDate: iso(fresh) }).success, false); // sportId zaroori
  });
});
