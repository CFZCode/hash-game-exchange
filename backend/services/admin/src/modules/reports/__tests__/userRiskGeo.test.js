'use strict';

const test = require('node:test');
const assert = require('node:assert');

const db = require('@ibitplay/db');
const { createLogger } = require('@ibitplay/common');

const { ReportsService } = require('../reports.service');
const { deviceFromUA } = require('../ipTracker');
const v = require('../reports.validators');

/**
 * A player's risk view and the geo stats.
 *
 *   1. scope: an agent reads only players in their tree; a rival's player is a
 *      404 (PLAYER_NOT_FOUND), never a 403 that would confirm the id;
 *   2. registration origin: the signup lookup when there is one, else the
 *      earliest PUBLIC login (`source: first_login`);
 *   3. loopback/private addresses never make "multiple IPs" or a shared IP;
 *   4. shared IPs and the geo stats count only accounts inside the tree, and
 *      each player once (not each login).
 */

const TEST_DB = process.env.TEST_DB_NAME || 'ibitplay_test';

let nextId = 720_000_000 + (process.pid % 100_000) * 1000;
const newId = () => (nextId += 1);

test('risk and geo validators take no stray input', () => {
  assert.equal(v.userRisk.params.safeParse({ userId: '12' }).success, true);
  assert.equal(v.userRisk.params.safeParse({ userId: 'abc' }).success, false);
  assert.equal(v.userRisk.query.safeParse({}).success, true);
  assert.equal(v.userRisk.query.safeParse(undefined).success, true);
  assert.equal(v.userRisk.query.safeParse({ debug: '1' }).success, false);
  assert.equal(v.geoStats.query.safeParse({}).success, true);
  assert.equal(v.geoStats.query.safeParse({ staffId: '1' }).success, false);
});

test('device names from user agents', () => {
  assert.equal(deviceFromUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'), 'Chrome on Windows');
  assert.equal(deviceFromUA('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120'), 'Edge on Windows');
  assert.equal(deviceFromUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Mobile/15E148 Safari/604.1'), 'Safari on iOS');
  assert.equal(deviceFromUA('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36'), 'Chrome on Android');
  assert.equal(deviceFromUA(null), null);
});

test('user risk and geo stats against a database', async (t) => {
  const logger = createLogger({ name: 'user-risk-test', level: 'silent' });

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
  const service = new ReportsService({ models, db: connection, logger, config: {} });

  const agentA = newId();
  const agentB = newId();
  const playerA1 = newId(); // signed up with a located address
  const playerA2 = newId(); // agent-created: no signup geo, loopback login first
  const playerB = newId(); // a rival's player on A1's address
  const players = [playerA1, playerA2, playerB];
  const staffIds = [agentA, agentB];

  const n = (process.pid % 250) + 1;
  const SHARED = `198.51.100.${n}`;
  const SECOND = `203.0.113.${n}`;

  const cleanup = async () => {
    await models.UserLoginHistory.destroy({ where: { user_id: players } });
    await models.Users.destroy({ where: { id: players } });
    await models.Staff.destroy({ where: { id: staffIds } });
  };
  t.after(async () => {
    await cleanup();
    await connection.close();
  });

  const agentRole = (await models.Roles.findOne({ where: { level: 6 }, raw: true }))?.id;
  assert.ok(agentRole, 'the test database needs an agent role');

  await cleanup();
  const staff = (id, name) => ({ id, name: `${name}-${id}`, email: `${name}${id}@t.test`, password: 'x', role_id: agentRole, parent_id: null });
  await models.Staff.bulkCreate([staff(agentA, 'risk-a'), staff(agentB, 'risk-b')]);
  await models.Users.bulkCreate([
    {
      id: playerA1, name: `risk-a1-${playerA1}`, password: 'x', status: 'active', parent_staff_id: agentA,
      signup_ip: SHARED, signup_country_code: 'IN', signup_country: 'India', signup_region: 'Maharashtra',
      signup_city: 'Mumbai', signup_isp: 'Jio',
    },
    { id: playerA2, name: `risk-a2-${playerA2}`, password: 'x', status: 'active', parent_staff_id: agentA },
    { id: playerB, name: `risk-b-${playerB}`, password: 'x', status: 'active', parent_staff_id: agentB, signup_country_code: 'IN', signup_country: 'India', signup_city: 'Mumbai' },
  ]);
  const at = (s) => new Date(`${s}T12:00:00Z`);
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';
  await models.UserLoginHistory.bulkCreate([
    { user_id: playerA1, ip_address: SHARED, source: 'register', country_code: 'IN', country: 'India', city: 'Mumbai', user_agent: UA, created_at: at('2026-01-01') },
    { user_id: playerA1, ip_address: SHARED, source: 'login', country_code: 'IN', country: 'India', city: 'Mumbai', user_agent: UA, created_at: at('2026-01-02') },
    { user_id: playerA1, ip_address: SECOND, source: 'login', country_code: 'AE', country: 'United Arab Emirates', city: 'Dubai', user_agent: UA, created_at: at('2026-01-03') },
    { user_id: playerA2, ip_address: '127.0.0.1', source: 'login', created_at: at('2026-01-01') },
    { user_id: playerA2, ip_address: SECOND, source: 'login', country_code: 'AE', country: 'United Arab Emirates', city: 'Dubai', created_at: at('2026-01-04') },
    { user_id: playerB, ip_address: SHARED, source: 'login', country_code: 'IN', country: 'India', city: 'Mumbai', created_at: at('2026-01-05') },
  ]);

  const asA = { id: agentA, permissions: ['*'] };
  const asB = { id: agentB, permissions: ['*'] };

  await t.test("a rival's player is a 404, not a 403", async () => {
    await assert.rejects(
      () => service.userRisk({ staff: asA, userId: playerB }),
      (err) => err.code === 'REPORTS_PLAYER_NOT_FOUND' && err.status === 404
    );
    await assert.rejects(() => service.userRisk({ staff: asB, userId: playerA1 }), (err) => err.code === 'REPORTS_PLAYER_NOT_FOUND');
  });

  await t.test('the shape: registration, activity, financials, flags', async () => {
    const r = await service.userRisk({ staff: asA, userId: playerA1 });
    assert.equal(r.user.id, String(playerA1));
    assert.deepEqual(
      { ip: r.registration.ip, source: r.registration.source, region: r.registration.region, city: r.registration.city },
      { ip: SHARED, source: 'signup', region: 'Maharashtra', city: 'Mumbai' }
    );
    assert.equal(r.activity.distinctIpCount, 2);
    assert.equal(r.activity.publicIpCount, 2);
    assert.deepEqual(r.activity.countries.map((c) => c.countryCode), ['IN', 'AE']);
    const shared = r.activity.ipBreakdown.find((b) => b.ipAddress === SHARED);
    assert.equal(shared.uses, 2, 'the register row and the login, on one address');
    assert.equal(r.activity.recentLogins[0].device, 'Chrome on Windows');
    assert.ok(Array.isArray(r.activity.recentBets));
    assert.equal(typeof r.financials.reward.currency, 'string');
    assert.equal(r.financials.reward.totalDeposit, '0.00000000');
    assert.equal(r.riskFlags.multipleIps, true);
    assert.equal(r.riskFlags.multipleCountries, true);
  });

  await t.test('shared IPs count only accounts inside the tree', async () => {
    const r = await service.userRisk({ staff: asA, userId: playerA1 });
    // A2 shares SECOND; the rival's player on SHARED is not even a number.
    assert.equal(r.sharedIps.total, 1);
    assert.deepEqual(r.sharedIps.accounts.map((a) => a.id), [String(playerA2)]);
    assert.deepEqual(r.sharedIps.accounts[0].ips, [SECOND]);
    assert.equal(r.riskFlags.sharedIp, true);
  });

  await t.test('no signup geo: the earliest PUBLIC login stands in, and loopback is not an IP', async () => {
    const r = await service.userRisk({ staff: asA, userId: playerA2 });
    assert.equal(r.registration.source, 'first_login');
    assert.equal(r.registration.ip, SECOND, 'not the earlier 127.0.0.1');
    assert.equal(r.registration.countryCode, 'AE');
    assert.equal(r.activity.distinctIpCount, 2);
    assert.equal(r.activity.publicIpCount, 1);
    assert.equal(r.riskFlags.multipleIps, false, 'a loopback login does not make a second IP');
    assert.equal(r.activity.ipBreakdown.find((b) => b.ipAddress === '127.0.0.1').isPrivate, true);
  });

  await t.test('geo stats: players once each, inside the tree only', async () => {
    const g = await service.geoStats({ staff: asA });
    assert.equal(g.totalPlayers, 2);
    assert.deepEqual(g.registration.bySource, { signup: 1, firstLogin: 1 });
    assert.equal(g.registration.unknown, 0);
    const countries = Object.fromEntries(g.registration.countries.map((c) => [c.countryCode, c.players]));
    assert.deepEqual(countries, { IN: 1, AE: 1 }, "the rival's Indian player is not counted");
    assert.deepEqual(
      g.registration.cities.map((c) => `${c.city}/${c.players}`).sort(),
      ['Dubai/1', 'Mumbai/1']
    );
    assert.equal(g.login.players, 2);
    const ae = g.login.countries.find((c) => c.countryCode === 'AE');
    const ind = g.login.countries.find((c) => c.countryCode === 'IN');
    assert.deepEqual({ players: ae.players, logins: ae.logins }, { players: 2, logins: 2 });
    assert.deepEqual({ players: ind.players, logins: ind.logins }, { players: 1, logins: 2 }, 'one player, two events');

    const rival = await service.geoStats({ staff: asB });
    assert.equal(rival.totalPlayers, 1);
    assert.deepEqual(rival.registration.countries.map((c) => c.countryCode), ['IN']);
  });
});
