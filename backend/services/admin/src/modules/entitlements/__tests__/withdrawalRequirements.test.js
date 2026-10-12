'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createLogger, entitlements, featureCatalogue, sitePolicy } = require('@ibitplay/common');

const { createEntitlementsPoller, sign } = require('../entitlements.poller');
const { FeaturesService } = require('../../features/features.service');

/**
 * The `withdrawal_requirements` policy from the owner's signed document: it lands in
 * site_features as the policy's variant, the rails read it there (sitePolicy.readPolicy), and
 * staff only see it (403 OWNER_MANAGED). Enforcement: user-service withdraw-requirements tests.
 */

const SECRET = 'test-owner-shared-secret-0123456789abcdef';
const logger = createLogger({ name: 'withdrawal-requirements-test', level: 'silent' });
const KEY = 'withdrawal_requirements';

function site() {
  const rows = new Map();
  const writes = [];
  const models = {
    SiteFeature: {
      findByPk: async (key) => (rows.has(key) ? { ...rows.get(key) } : null),
      findAll: async () => [...rows.values()].map((r) => ({ ...r })),
      upsert: async (row) => { writes.push({ ...row }); rows.set(row.feature, { config: {}, secrets: {}, ...row }); },
    },
    Siteconfig: { findOne: async () => ({ id: 1 }), update: async () => {} },
  };
  const clients = { user: { post: async () => {} } };
  return { rows, writes, models, container: { models, logger, config: { OWNER_PANEL_URL: 'https://owner.test/' }, clients } };
}

test('withdrawal requirements through the owner document', async (t) => {
  t.after(() => entitlements.resetEntitlements());

  await t.test('the catalogue: a policy, default kyc, four variants', () => {
    const f = featureCatalogue.featureByKey(KEY);
    assert.equal(f.kind, 'policy');
    assert.equal(f.category, 'business');
    assert.equal(f.defaultVariant, 'kyc');
    assert.deepEqual(f.variants.map((v) => v.key), ['none', 'kyc', 'wager', 'kyc_and_wager']);
    assert.equal(sitePolicy.POLICY_DEFAULTS[KEY], 'kyc');
  });

  const s = site();

  await t.test('unset: the rails read the default, kyc (what they did before the policy)', async () => {
    assert.equal(await sitePolicy.readPolicy(s.models, KEY), 'kyc');
    assert.equal((await sitePolicy.allows(s.models, KEY, 'kyc')).allowed, true);
    assert.equal((await sitePolicy.allows(s.models, KEY, 'wager')).allowed, false);
  });

  let answer = null;
  const p = createEntitlementsPoller({
    config: { OWNER_PANEL_URL: 'https://owner.test/', OWNER_SHARED_SECRET: SECRET, OWNER_POLL_SECONDS: 15 },
    logger,
    filePath: path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'owner-wreq-')), 'owner-entitlements.json'),
    onChange: (current) => new FeaturesService(s.container).onEntitlementsChange(current),
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => answer }),
  });
  entitlements.configureEntitlements({ read: () => p.current() });

  let version = 1;
  const publish = async (variant) => {
    version += 1;
    const data = { site: 'hash-game-exchange', version, updatedAt: new Date().toISOString(), features: {}, flags: {}, variants: { [KEY]: variant } };
    answer = { data, signature: sign(data, SECRET) };
    return p.pollOnce();
  };

  await t.test('every owner change reaches site_features, and the rails read it', async () => {
    const expect = { none: [false, false], kyc: [true, false], wager: [false, true], kyc_and_wager: [true, true] };
    for (const [variant, [kyc, wager]] of Object.entries(expect)) {
      await publish(variant);
      assert.equal(s.rows.get(KEY).variant, variant);
      assert.equal(s.rows.get(KEY).updated_by, 'owner');
      assert.equal(await sitePolicy.readPolicy(s.models, KEY), variant);
      assert.equal((await sitePolicy.allows(s.models, KEY, 'kyc')).allowed, kyc, `${variant} kyc`);
      assert.equal((await sitePolicy.allows(s.models, KEY, 'wager')).allowed, wager, `${variant} wager`);
    }
  });

  await t.test('an unknown variant is ignored; the last good one stays', async () => {
    await publish('wager');
    await publish('everything');
    assert.equal(s.rows.get(KEY).variant, 'wager');
  });

  await t.test('staff see it read-only, and cannot change it: 403 OWNER_MANAGED, nothing written', async () => {
    const svc = new FeaturesService(s.container);
    const row = (await svc.list()).features.find((f) => f.feature === KEY);
    assert.equal(row.kind, 'policy');
    assert.equal(row.variant, 'wager');
    assert.equal(row.managedBy, 'owner');

    const before = s.writes.length;
    for (const variant of ['none', 'kyc', 'kyc_and_wager']) {
      await assert.rejects(
        () => svc.update({ feature: KEY, patch: { variant }, staff: { id: 1 } }),
        (e) => e.status === 403 && e.code === 'OWNER_MANAGED' && e.details.feature === KEY
      );
    }
    assert.equal(s.writes.length, before);
    assert.equal(s.rows.get(KEY).variant, 'wager');
  });

  await t.test('players read it in features/public as a policy row', async () => {
    const pub = await new FeaturesService(s.container).publicList();
    assert.deepEqual(pub.find((f) => f.feature === KEY), { feature: KEY, kind: 'policy', variant: 'wager' });
  });
});
