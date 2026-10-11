'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');

const { createLogger, errorHandler, ForbiddenError } = require('@ibitplay/common');
const { LEVEL_PERMISSIONS, hasAllPermissions } = require('@ibitplay/auth');

/**
 * The settlement desk's reads used to be guarded by `sports:read`, which the
 * agent tree holds (SUPER_MASTER by default) — so an L4 could read the house's
 * open and settled market books. They need `sports:settle` now, the same grant
 * the admin nav and the settlement writes use.
 */

const IS_AUTHORIZATION = Symbol.for('ibitplay.authorizationMiddleware');
const requirePermission = (...perms) => {
  const required = perms.flat();
  const fn = (req, _res, next) =>
    hasAllPermissions(req.staff.permissions, required)
      ? next()
      : next(new ForbiddenError(`Missing required permission: ${required.join(', ')}`));
  fn[IS_AUTHORIZATION] = true;
  return fn;
};

const READS = ['/mo-matches', '/fancy-matches', '/open-bets?match_id=1&market_type=x', '/settled-markets', '/settled-bets'];

test('settlement reads require sports:settle', async (t) => {
  const logger = createLogger({ name: 'settlement-read-perm', level: 'silent' });
  const deps = {
    config: { SERVICE_NAME: 'sports-service' },
    logger,
    db: {},
    models: {},
    clients: { admin: { post: async () => ({}) } },
    auth: { requirePermission },
  };

  const app = express();
  app.use((req, _res, next) => {
    const level = Number(req.headers['x-test-level']);
    req.staff = { id: 1, level, permissions: LEVEL_PERMISSIONS[level] };
    next();
  });
  // eslint-disable-next-line global-require
  app.use('/settlement', require('../routes/admin.routes')(deps));
  app.use(errorHandler({ logger }));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/settlement`;

  for (const path of READS) {
    await t.test(`GET ${path}`, async () => {
      // SUPER_MASTER holds sports:read but not sports:settle; MASTER/AGENT
      // hold neither; SUB_ADMIN holds sports:read only.
      for (const level of [3, 4, 5, 6]) {
        const res = await fetch(base + path, { headers: { 'x-test-level': String(level) } });
        assert.equal(res.status, 403, `level ${level}`);
        const body = await res.json();
        assert.match(JSON.stringify(body), /sports:settle/);
      }
      // ADMIN holds sports:settle: past the guard (whatever the stubbed
      // handler then does, it is not a permission refusal).
      const res = await fetch(base + path, { headers: { 'x-test-level': '2' } });
      assert.notEqual(res.status, 403);
    });
  }
});
