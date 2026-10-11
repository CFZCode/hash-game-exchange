'use strict';

const test = require('node:test');
const assert = require('node:assert');

const {
  resolvePermissions,
  executiveGrants,
  canIssueFunds,
  hasPermission,
  LEVEL_PERMISSIONS,
  STAFF_LEVELS,
  PERMISSIONS,
  createAuthMiddleware,
  TokenService,
  PASSWORD_CHANGE_REQUIRED,
} = require('..');

/**
 * Staff permission resolution, the B2B agent-tree grants, the issuance
 * capability and the must-change-password gate.
 */

test('an executive with no valid grant gets NOTHING, never its parent', async (t) => {
  const admin = { level: STAFF_LEVELS.ADMIN };

  await t.test('null, empty, prose and junk resolve to no permissions', () => {
    for (const stored of [null, undefined, '', '   ', 'Full platform control, infinite balance', '{}', '[]', 42, {}, { authority: 'all' }]) {
      const got = resolvePermissions({ ...admin, executivePermissions: stored, isExecutive: true });
      assert.deepEqual(got, [], `stored ${JSON.stringify(stored)} must grant nothing`);
    }
  });

  await t.test('under a Super Admin (`*`) prose is still nothing', () => {
    const got = resolvePermissions({ level: STAFF_LEVELS.SUPER_ADMIN, executivePermissions: 'Unrestricted access', isExecutive: true });
    assert.deepEqual(got, []);
  });

  await t.test('the `{authority: [...]}` shape the access module writes is read, and intersected', () => {
    const got = resolvePermissions({
      level: STAFF_LEVELS.AGENT,
      executivePermissions: { authority: ['users:read', 'roles:manage'] },
      isExecutive: true,
    });
    assert.deepEqual(got, ['users:read'], 'roles:manage is not the agent\'s to give');
  });

  await t.test('JSON strings and legacy comma lists are read', () => {
    assert.deepEqual(executiveGrants('{"permissions":["reports:read"]}'), ['reports:read']);
    assert.deepEqual(executiveGrants('["wallet:read"]'), ['wallet:read']);
    assert.deepEqual(executiveGrants('users:read, wallet:read'), ['users:read', 'wallet:read']);
  });

  await t.test('a non-executive with no executive grant keeps its role', () => {
    assert.deepEqual(resolvePermissions({ level: STAFF_LEVELS.MASTER }), LEVEL_PERMISSIONS[STAFF_LEVELS.MASTER]);
  });
});

test('the B2B tree: who may build staff and players', () => {
  const grants = (level) => LEVEL_PERMISSIONS[level];

  assert.ok(hasPermission(grants(STAFF_LEVELS.SUPER_MASTER), PERMISSIONS.STAFF_WRITE));
  assert.ok(hasPermission(grants(STAFF_LEVELS.MASTER), PERMISSIONS.STAFF_WRITE));
  assert.ok(hasPermission(grants(STAFF_LEVELS.MASTER), PERMISSIONS.STAFF_READ), 'a master sees its agents');
  assert.ok(!hasPermission(grants(STAFF_LEVELS.AGENT), PERMISSIONS.STAFF_WRITE), 'an agent builds no staff');
  assert.ok(hasPermission(grants(STAFF_LEVELS.AGENT), PERMISSIONS.USERS_WRITE), 'an agent creates its players');
  assert.ok(!hasPermission(grants(STAFF_LEVELS.EXECUTIVE), PERMISSIONS.STAFF_WRITE));
  // No agent-tree level gains the house-only grants.
  for (const level of [STAFF_LEVELS.SUPER_MASTER, STAFF_LEVELS.MASTER, STAFF_LEVELS.AGENT]) {
    assert.ok(!hasPermission(grants(level), PERMISSIONS.ROLES_MANAGE));
    assert.ok(!hasPermission(grants(level), PERMISSIONS.WALLET_ADJUST));
  }
});

test('only a Super Admin issues funds — level 1, not 0', () => {
  assert.equal(canIssueFunds({ level: 1 }), true);
  assert.equal(canIssueFunds({ level: '1' }), true);
  assert.equal(canIssueFunds({ level: 0 }), false, 'there is no level 0');
  assert.equal(canIssueFunds({ level: 2 }), false);
  assert.equal(canIssueFunds({ level: 1, executiveId: 9 }), false, 'not an executive under the owner');
  assert.equal(canIssueFunds(null), false);
});

test('a staff session that must change its password is held to three routes', async (t) => {
  const config = { JWT_ACCESS_SECRET: 'test-access-secret-0123456789', JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789' };
  const tokens = new TokenService(config);
  let row = { id: 5, status: 'active', level: 4, permissions: ['*'], must_change_password: true };
  const auth = createAuthMiddleware({ config, loadStaff: async () => row });
  const guard = auth.authenticateStaff();

  const call = (method, url, { executiveId = null } = {}) =>
    new Promise((resolve) => {
      const token = tokens.signAdminToken({ staffId: 5, roleId: 4, level: 4, executiveId });
      const req = { method, originalUrl: url, headers: { authorization: `Bearer ${token}` } };
      guard(req, {}, (err) => resolve({ err, req }));
    });

  await t.test('everything else answers 403 PASSWORD_CHANGE_REQUIRED', async () => {
    for (const [method, url] of [
      ['GET', '/api/v1/admin/staff'],
      ['POST', '/api/v1/admin/staff'],
      ['GET', '/api/v1/admin/players?limit=5'],
      ['GET', '/api/v1/sports/admin/bets'],
      ['POST', '/api/v1/admin/staff/password'],
    ]) {
      const { err } = await call(method, url);
      assert.ok(err, `${method} ${url} must be refused`);
      assert.equal(err.status, 403);
      assert.equal(err.code, PASSWORD_CHANGE_REQUIRED);
    }
  });

  await t.test('who am I, change-password and logout still work', async () => {
    for (const [method, url] of [
      ['GET', '/api/v1/admin/access/me/permissions'],
      ['PATCH', '/api/v1/admin/staff/password'],
      ['POST', '/api/v1/admin/auth/logout'],
    ]) {
      const { err, req } = await call(method, url);
      assert.equal(err, undefined, `${method} ${url} must pass`);
      assert.equal(req.staff.mustChangePassword, true);
    }
  });

  await t.test('an executive sub-login is not gated by its parent row\'s flag', async () => {
    row = { ...row, executive: { id: 3, status: 'active', parent_staff_id: 5 } };
    const { err } = await call('GET', '/api/v1/admin/staff', { executiveId: 3 });
    assert.equal(err, undefined);
  });

  await t.test('once changed, the gate lifts on the next request', async () => {
    row = { ...row, executive: undefined, must_change_password: false };
    const { err, req } = await call('GET', '/api/v1/admin/staff');
    assert.equal(err, undefined);
    assert.equal(req.staff.mustChangePassword, false);
  });
});
