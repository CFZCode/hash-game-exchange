'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const { createLogger, entitlements, errorHandler, requestContext } = require('@ibitplay/common');

const { createEntitlementsPoller, sign } = require('../entitlements.poller');
const publicRoutes = require('../routes/public.routes');

/**
 * `POST /api/v1/admin/entitlements/refresh` — the owner panel's nudge after a
 * save (docs/OWNER-PANEL.md §3): x-owner-key only, pulls at once through the
 * same checks as a poll, pushes on a new version, and cannot be hammered.
 */

const SECRET = 'test-owner-shared-secret-0123456789abcdef';
const logger = createLogger({ name: 'entitlements-refresh-test', level: 'silent' });

const doc = (version, features = {}) => ({ site: 'casino-sportsbook', version, updatedAt: '2026-10-09T13:00:00.000Z', features, flags: {} });

test('owner refresh route', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'owner-refresh-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  let answer = doc(1);
  let fetches = 0;
  let forge = false;
  const pushes = [];
  const poller = createEntitlementsPoller({
    config: { OWNER_PANEL_URL: 'https://owner.test/', OWNER_SHARED_SECRET: SECRET, OWNER_POLL_SECONDS: 3600 },
    logger,
    filePath: path.join(dir, 'owner-entitlements.json'),
    onChange: (current) => pushes.push(current.version),
    fetchImpl: async () => {
      fetches += 1;
      const data = answer;
      return { ok: true, status: 200, json: async () => ({ data, signature: sign(data, forge ? 'wrong-secret' : SECRET) }) };
    },
  });
  await poller.pollOnce();
  entitlements.configureEntitlements({ read: () => poller.current() });
  t.after(() => entitlements.resetEntitlements());

  const app = express();
  app.use(requestContext());
  app.use(express.json());
  app.use('/api/v1/admin/entitlements', publicRoutes({ entitlementsPoller: poller, config: { OWNER_SHARED_SECRET: SECRET }, logger }));
  app.use(errorHandler({ logger }));
  const server = app.listen(0);
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/api/v1/admin/entitlements/refresh`;
  const post = (key) => fetch(url, { method: 'POST', headers: key === undefined ? {} : { 'x-owner-key': key } });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  await t.test('no key or a wrong key is 401 and does not poll', async () => {
    const before = fetches;
    assert.equal((await post(undefined)).status, 401);
    assert.equal((await post('nope')).status, 401);
    assert.equal(fetches, before);
  });

  await t.test('the right key pulls now; a new version is live at once and pushed', async () => {
    answer = doc(2, { vault: false });
    assert.equal(await entitlements.isFeatureEntitled('vault'), true, 'not yet pulled');
    const res = await post(SECRET);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.deepEqual(body.data, { version: 2, source: 'owner', changed: true });
    assert.equal(await entitlements.isFeatureEntitled('vault'), false);
    assert.deepEqual(pushes, [1, 2]);
    assert.ok(!JSON.stringify(body).includes(SECRET));
  });

  await t.test('nudges a moment apart are never dropped: they share one follow-up pull, a second later', async () => {
    answer = doc(3, { vault: false, swap: false });
    const before = fetches;
    const started = Date.now();
    const [a, b] = await Promise.all([post(SECRET), post(SECRET)]);
    assert.equal(a.status, 200);
    assert.equal(b.status, 200);
    assert.equal((await a.json()).data.version, 3);
    assert.equal((await b.json()).data.version, 3);
    assert.equal(fetches - before, 1, 'one shared pull');
    assert.ok(Date.now() - started >= 900, 'spaced at least a second after the previous pull');
    assert.equal(await entitlements.isFeatureEntitled('swap'), false);
    assert.deepEqual(pushes, [1, 2, 3]);
  });

  await t.test('a nudge only pulls: a badly signed answer is still refused', async () => {
    forge = true;
    answer = doc(9, { vault: true });
    const body = await (await post(SECRET)).json();
    forge = false;
    assert.equal(body.data.version, 3, 'kept the last good copy');
    assert.equal(body.data.source, 'cache');
    assert.equal(await entitlements.isFeatureEntitled('vault'), false);
  });

  await t.test('the shared helper drops its cached copy on invalidate', async () => {
    let served = { features: { swap: false }, flags: {}, version: 1 };
    let calls = 0;
    const client = { get: async () => { calls += 1; return served; } };
    entitlements.resetEntitlements();
    entitlements.configureEntitlements({ clients: { admin: client }, logger, config: { ENTITLEMENTS_TTL_MS: 60_000 } });
    assert.equal(await entitlements.isFeatureEntitled('swap'), false);
    served = { features: {}, flags: {}, version: 2 };
    assert.equal(await entitlements.isFeatureEntitled('swap'), false, 'cached');
    entitlements.invalidateEntitlements();
    assert.equal(await entitlements.isFeatureEntitled('swap'), true, 're-read after invalidate');
    assert.equal(calls, 2);
    entitlements.resetEntitlements();
  });
});
