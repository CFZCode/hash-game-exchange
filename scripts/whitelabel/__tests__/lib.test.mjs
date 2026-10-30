import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertSlug,
  copyEnv,
  dbNameOf,
  ecosystem,
  listeningPorts,
  patchEnv,
  pickPortBase,
  pickRedisDb,
  portsFrom,
  redisDbsNamed,
  redisDbsWithKeys,
  sharedFromParent,
  targetDirOf,
  vhosts,
} from '../lib.mjs';

test('names come only from a safe slug', () => {
  assert.equal(targetDirOf('lucky-play'), '/var/www/main/lucky-play');
  assert.equal(dbNameOf('lucky-play'), 'wl_lucky_play');
  for (const bad of ['', '../etc', 'Lucky', 'a', 'lucky-', 'lucky play', 'x'.repeat(31), '/', '.']) assert.throws(() => assertSlug(bad), /unsafe/);
});

test('ports: the first block nothing listens on and no whitelabel holds', () => {
  const listening = listeningPorts('LISTEN 0 511 127.0.0.1:6100 0.0.0.0:*\nLISTEN 0 511 [::]:6125 [::]:*\nLISTEN 0 4096 *:22 *:*');
  assert.deepEqual([...listening].sort(), [22, 6100, 6125]);
  // 6100 listens, 6120 block holds 6125, 6140 reserved by another whitelabel → 6160.
  assert.equal(pickPortBase(listening, [portsFrom(6140)]), 6160);
  assert.deepEqual(portsFrom(6160), { gateway: 6160, user: 6161, admin: 6162, casino: 6163, sports: 6164, sportsWorker: 6165, userWorker: 6166, siteAdmin: 6167, ownerPanel: 6168, frontend: 6169 });
});

test('Redis: 8–15 only, skipping any with keys, named in an env file or held', () => {
  const used = new Set([
    ...redisDbsWithKeys('# Keyspace\ndb0:keys=1,expires=0\ndb8:keys=3,expires=0'),
    ...redisDbsNamed(['REDIS_DB=9\n', 'REDIS_URL=redis://:pw@127.0.0.1:6379/10\n', 'X=1']),
    11,
  ]);
  assert.deepEqual([...used].sort((a, b) => a - b), [0, 8, 9, 10, 11]);
  assert.equal(pickRedisDb(used), 12);
  assert.throws(() => pickRedisDb(new Set([8, 9, 10, 11, 12, 13, 14, 15])), /no free Redis/);
});

test('patchEnv keeps comments and order, appends what is missing', () => {
  const out = patchEnv('# top\nA=1\nB=two\n', { B: 'x y', C: '3' });
  assert.equal(out, '# top\nA=1\nB="x y"\n\n# ── set by scripts/whitelabel ──\nC=3\n');
});

test('a copy takes the shared feed and limits from the parent, never its secrets', () => {
  const parentEnv = {
    AVRKHUB_SPORTS_KEY: 'feed', SPORTS_FEED_KEY: 'feed2', JSGAMES_V2_API_KEY: 'v2', JSGAMES_V2_API_SECRET: 'v2s', SPORTS_MAX_STAKE: '5000',
    SPORTS_SERVICE_PORT: '4704', SPORTS_SERVICE_URL: 'http://127.0.0.1:4704', SPORTS_WORKER_PORT: '4705', STAFF_2FA_REQUIRED_LEVEL: '3',
    JWT_ACCESS_SECRET: 'parent-secret', INTERNAL_API_KEY: 'parent-internal', OWNER_SHARED_SECRET: 'o', F2PAY_PRIVATE_KEY: 'pk', GIS_MERCHANT_KEY: 'g',
    JSGAMES_V1_AES_KEY: 'v1', SEAMLESS_SECRET_KEY: 's', OG_API_SECRET: 'og', SMTP_PASSWORD: 'smtp', TELEGRAM_BOT_TOKEN: 't', DB_PASSWORD: 'parent-db',
    UPLOAD_DIR: '/var/www/main/hash-game-exchange/backend/storage', KYC_STORAGE_DIR: '/x', TXN_PASSWORD_MODE: 'login',
  };
  const shared = sharedFromParent(parentEnv);
  assert.deepEqual(Object.keys(shared).sort(), ['AVRKHUB_SPORTS_KEY', 'JSGAMES_V2_API_KEY', 'JSGAMES_V2_API_SECRET', 'SPORTS_FEED_KEY', 'SPORTS_MAX_STAKE', 'STAFF_2FA_REQUIRED_LEVEL']);

  const wl = { name: 'Lucky', template: 'emerald_dark', site_domain: 'lucky.com', admin_domain: 'admin.lucky.com', api_domain: 'api.lucky.com', company_email: 'c@lucky.com' };
  const ports = portsFrom(6100);
  const secrets = { dbPassword: 'dbpw', apiEncryptionKey: 'ZW5j', seedAdminPassword: 'seed' };
  const env = copyEnv({ wl, slug: 'lucky', ports, redisDb: 8, parentEnv, parentFrontendEnv: { NEXT_PUBLIC_SCORECARD_BASE: 'https://score.example' }, linkKey: 'link', secrets });
  for (const v of ['parent-secret', 'parent-internal', 'pk', 'g', 'v1', 's', 'og', 'smtp', 't', 'parent-db', '/x']) assert.equal(Object.values(env.backend).includes(v), false, v);
  assert.equal(env.backend.TXN_PASSWORD_MODE, 'separate', 'the company chooses its own code');
  assert.equal(env.backend.WHITELABEL_MODE, 'true');
  assert.equal(env.backend.WHITELABEL_LINK_KEY, 'link');
  assert.equal(env.backend.DB_NAME, 'wl_lucky');
  assert.equal(env.backend.REDIS_DB, '8');
  assert.equal(env.backend.CORS_ORIGIN, 'https://lucky.com,https://admin.lucky.com');
  assert.equal(env.backend.JSGAMES_CALLBACK_URL, 'https://api.lucky.com/api/v1/casino/js-games/v2/bet-callback');
  assert.equal(env.backend.TELEGRAM_BOT_TOKEN, '', 'blanked even if .env.example ships one');
  assert.equal(env.frontend.NEXT_PUBLIC_API_ENC_KEY, env.backend.API_ENCRYPTION_KEY, 'site and gateway share the key');
  assert.equal(env.frontend.NEXT_PUBLIC_SCORECARD_BASE, 'https://score.example');
  assert.equal(env.siteAdmin.API_URL, 'http://127.0.0.1:6100');
  assert.equal(env.siteAdmin.NEXT_PUBLIC_WHITELABEL_MODE, 'true');
});

test('Apache sites and pm2 file follow the parent pattern on the copy ports', () => {
  const wl = { site_domain: 'lucky.com', admin_domain: 'admin.lucky.com', api_domain: 'api.lucky.com' };
  const confs = vhosts(wl, portsFrom(6100));
  assert.match(confs['lucky.com'], /ProxyPass {8}\/ http:\/\/127\.0\.0\.1:6109\/ /);
  assert.match(confs['admin.lucky.com'], /ProxyPass {8}\/owner http:\/\/127\.0\.0\.1:6108\/owner /);
  assert.match(confs['admin.lucky.com'], /ws:\/\/127\.0\.0\.1:6107\//);
  assert.match(confs['api.lucky.com'], /ws:\/\/127\.0\.0\.1:6100\//);
  assert.throws(() => vhosts({ ...wl, site_domain: 'evil.com\nInclude /etc/passwd' }, portsFrom(6100)), /unsafe domain/);

  const eco = ecosystem({ slug: 'lucky', ports: portsFrom(6100) });
  assert.match(eco, /name: `lucky-\$\{name\}`/);
  assert.match(eco, /next\('admin', 'admin', 6107\)/);
  assert.doesNotMatch(eco, /parker-/);
});
