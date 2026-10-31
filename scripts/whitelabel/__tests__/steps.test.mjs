import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { createRequire } from 'node:module';

import { NO_OWNER_META, createWhitelabel, removeWhitelabel } from '../steps.mjs';

const { metaOf } = createRequire(import.meta.url)('../../../backend/services/admin/src/modules/branding/branding.store.js');
import { parseEnv } from '../lib.mjs';

/**
 * The setup script against a FAKE machine: files in a Map, every program recorded instead of run,
 * the two databases answered by hand. Proves the order of what it does, that secrets never reach
 * the log or a command line, and that a delete only ever takes what is this whitelabel's.
 */

const SERVER_IP = '203.0.113.7';
const wl = {
  id: 42,
  slug: 'lucky-play',
  name: 'Lucky Play',
  title: null,
  description: 'Play',
  site_domain: 'lucky.example.com',
  admin_domain: 'admin.lucky.example.com',
  api_domain: 'api.lucky.example.com',
  template: 'emerald_dark',
  palette: null,
  logo: Buffer.from('fake-png-bytes-long-enough-to-matter-here-0123456789-0123456789'),
  logo_type: 'image/png',
  company_role_name: 'Company',
  company_name: 'Lucky Ltd',
  company_email: 'owner@lucky.example.com',
  company_password_hash: '$2b$12$abcdefghijklmnopqrstuuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  link_key: 'sealed',
  ports: null,
};

function machine({ dns = SERVER_IP, files = {}, pm2 = [], dbExists = false, nginxTest = { code: 0, stdout: '', stderr: '' } } = {}) {
  const fsMap = new Map(Object.entries(files));
  const commands = [];
  const logs = [];
  const parentQueries = [];
  const copyQueries = [];
  const secrets = { dbPassword: 'db-secret-hex', apiEncryptionKey: 'ZW5jLWtleQ==', seedAdminPassword: 'seed-secret' };
  const under = (dir) => [...fsMap.keys()].some((k) => k === dir || k.startsWith(`${dir}/`));

  const ctx = {
    serverIp: SERVER_IP,
    resolve4: async () => [dns],
    httpOk: async () => true,
    sleep: async () => {},
    envFiles: async () => ['/var/www/main/other/backend/.env'],
    parentRoot: '/var/www/main/hash-game-exchange',
    parentEnv: { DB_PORT: '5432', AVRKHUB_SPORTS_KEY: 'feed', JWT_ACCESS_SECRET: 'parent-jwt', F2PAY_PRIVATE_KEY: 'parent-psp', REDIS_HOST: '127.0.0.1', REDIS_PORT: '6380', REDIS_PASSWORD: 'redis-secret' },
    parentFrontendEnv: {},
    linkKey: 'link-secret',
    secrets,
    log: (t) => logs.push(t),
    step: (t) => logs.push(`── ${t}`),
    fs: {
      exists: async (p) => under(p),
      read: async (p) => {
        if (!fsMap.has(p)) throw new Error(`ENOENT ${p}`);
        return fsMap.get(p);
      },
      write: async (p, text) => void fsMap.set(p, text),
      mkdir: async (p) => void (under(p) || fsMap.set(`${p}/.dir`, '')),
      rm: async (p) => {
        for (const k of [...fsMap.keys()]) if (k === p || k.startsWith(`${p}/`)) fsMap.delete(k);
      },
    },
    run: async (cmd, args, opts = {}) => {
      commands.push({ cmd, args, cwd: opts.cwd, input: opts.input, env: opts.env });
      const line = `${cmd} ${args.join(' ')}`;
      if (cmd === 'ss') return { code: 0, stdout: 'LISTEN 0 511 127.0.0.1:6100 0.0.0.0:*\n', stderr: '' };
      if (cmd === 'nginx') return nginxTest;
      if (cmd === 'redis-cli' && args.includes('INFO')) return { code: 0, stdout: 'db8:keys=2,expires=0\n', stderr: '' };
      if (line.includes('pg_database')) return { code: 0, stdout: dbExists ? '1\n' : '', stderr: '' };
      if (cmd === 'pm2' && args[0] === 'jlist') return { code: 0, stdout: JSON.stringify(pm2), stderr: '' };
      if (cmd === 'node' && args[0] === 'scripts/make-env.mjs') {
        fsMap.set(path.join(opts.cwd, 'backend/.env'), '# example\nNODE_ENV=development\nJWT_ACCESS_SECRET=fresh-copy-secret\nTELEGRAM_BOT_TOKEN=example\nSTAFF_2FA_REQUIRED_LEVEL=0\n');
      }
      return { code: 0, stdout: '', stderr: '' };
    },
    pipe: async (cmds, opts = {}) => {
      commands.push({ pipe: cmds.map(([c, a]) => `${c} ${a.join(' ')}`).join(' | '), toFile: opts.toFile });
      if (opts.toFile) fsMap.set(opts.toFile, 'dump');
    },
    parent: {
      query: async (sql, params) => {
        parentQueries.push({ sql, params });
        if (/FROM exchangerate/.test(sql)) return [{ currency: 'USDT', usd_rate: '1.0' }, { currency: 'INR', usd_rate: '0.012' }];
        if (/FROM whitelabel_assets/.test(sql)) return [{ slot: 'poster', content_type: 'image/jpeg', bytes: Buffer.from('jpeg-bytes') }];
        if (/FROM site_features/.test(sql)) return [{ feature: 'default_currency', enabled: true, variant: 'INR' }, { feature: 'reward_currency', enabled: true, variant: 'INR' }];
        return [];
      },
    },
    copyDb: async () => ({
      query: async (sql, params) => {
        copyQueries.push({ sql, params });
        if (/SELECT s\.id FROM staff/.test(sql)) return [{ id: 1 }];
        if (/UPDATE exchangerate/.test(sql)) return params[0] === 'INR' ? [{ id: 3 }] : [];
        return [{}];
      },
      end: async () => {},
    }),
  };
  return { ctx, fsMap, commands, logs, parentQueries, copyQueries };
}

const lines = (commands) => commands.map((c) => (c.pipe ? `| ${c.pipe}` : `${c.cmd} ${c.args.join(' ')}`));

test('create: the whole sequence, in order, with nothing secret on a command line or in the log', async () => {
  const m = machine();
  const result = await createWhitelabel(m.ctx, wl);
  assert.deepEqual(result, { ports: { gateway: 6120, user: 6121, admin: 6122, casino: 6123, sports: 6124, sportsWorker: 6125, userWorker: 6126, siteAdmin: 6127, ownerPanel: 6128, frontend: 6129 }, redisDb: 9 });

  const run = lines(m.commands);
  const order = [
    'ss -ltnH',
    'redis-cli -h 127.0.0.1 -p 6380 INFO keyspace',
    '| git -C /var/www/main/hash-game-exchange archive --format=tar HEAD | tar -x -C /var/www/main/lucky-play',
    'node scripts/make-env.mjs',
    'npm ci --no-audit --no-fund --prefer-offline',
    'sudo -u postgres psql -v ON_ERROR_STOP=1 -q -d postgres',
    'npm run db:migrate',
    'npm run db:seed',
    'node scripts/seed-data.js',
    'npm run build',
    'pm2 start /var/www/main/lucky-play/ecosystem.config.cjs',
    'pm2 save',
    'ln -sfn /etc/nginx/sites-available/wl-lucky.example.com /etc/nginx/sites-enabled/wl-lucky.example.com',
    'nginx -t',
    'systemctl reload nginx',
    'certbot certonly --webroot -w /var/www/certbot --cert-name lucky.example.com -d lucky.example.com --non-interactive --agree-tos --keep-until-expiring',
    'nginx -t',
    'systemctl reload nginx',
  ];
  let at = -1;
  for (const want of order) {
    const found = run.findIndex((l, i) => i > at && l === want);
    assert.ok(found > at, `"${want}" after step ${at} in:\n${run.join('\n')}`);
    at = found;
  }
  assert.equal(run.filter((l) => l.startsWith('npm ci')).length, 4, 'backend, admin, owner panel, frontend');
  assert.equal(run.filter((l) => l === 'npm run build').length, 3);
  assert.equal(run.filter((l) => l.startsWith('certbot')).length, 3);

  // The role password goes over stdin, never as an argument; nothing secret is logged.
  const createRole = m.commands.find((c) => c.input?.includes('CREATE ROLE'));
  assert.match(createRole.input, /CREATE ROLE wl_lucky_play LOGIN PASSWORD 'db-secret-hex';\nCREATE DATABASE wl_lucky_play OWNER wl_lucky_play;/);
  const everything = JSON.stringify(m.commands.map((c) => c.args ?? c.pipe)) + m.logs.join('\n');
  for (const secret of ['db-secret-hex', 'link-secret', 'seed-secret', 'parent-jwt', 'redis-secret', wl.company_password_hash]) assert.equal(everything.includes(secret), false, secret);
  assert.equal(m.commands.find((c) => c.cmd === 'redis-cli').env.REDISCLI_AUTH, 'redis-secret', 'redis-cli authenticates through its environment');

  // The copy's env: its own secrets, the link key, the shared feed — not the parent's secrets.
  const backendEnv = parseEnv(m.fsMap.get('/var/www/main/lucky-play/backend/.env'));
  assert.equal(backendEnv.JWT_ACCESS_SECRET, 'fresh-copy-secret');
  assert.equal(backendEnv.WHITELABEL_LINK_KEY, 'link-secret');
  assert.equal(backendEnv.AVRKHUB_SPORTS_KEY, 'feed');
  assert.equal(backendEnv.F2PAY_PRIVATE_KEY, undefined);
  assert.equal(backendEnv.TELEGRAM_BOT_TOKEN, '');
  assert.equal(backendEnv.STAFF_2FA_REQUIRED_LEVEL, '0', 'staff 2FA is off on copies');
  assert.equal(backendEnv.REDIS_DB, '9', 'db8 has keys, so 9');
  assert.equal(backendEnv.REDIS_URL, 'redis://:redis-secret@127.0.0.1:6380/9', 'the parent’s Redis server, the copy’s own database');
  assert.equal(backendEnv.REDIS_PORT, '6380');
  assert.equal(backendEnv.REDIS_PASSWORD, 'redis-secret');
  assert.equal(JSON.parse(m.fsMap.get('/var/www/main/lucky-play/.whitelabel.json')).id, 42, 'the folder is marked as ours');
  const adminSite = m.fsMap.get('/etc/nginx/sites-available/wl-admin.lucky.example.com');
  assert.match(adminSite, /^# Whitelabel copy — written by scripts\/whitelabel\./);
  assert.match(adminSite, /listen 443 ssl;/, 'the HTTPS site replaces the port-80-only one once certified');

  // The company, the parent's rates, the branding.
  const copySql = m.copyQueries.map((q) => q.sql).join('\n');
  assert.match(copySql, /UPDATE roles SET name = \$1 WHERE level = 1/);
  assert.ok(m.copyQueries.some((q) => /UPDATE staff SET name/.test(q.sql) && q.params[3] === wl.company_password_hash));
  assert.ok(m.copyQueries.some((q) => /INSERT INTO exchangerate/.test(q.sql) && q.params[0] === 'USDT'), 'a missing rate is added');
  assert.deepEqual(
    m.copyQueries.filter((q) => /INSERT INTO site_features/.test(q.sql)).map((q) => q.params),
    [['default_currency', true, 'INR'], ['reward_currency', true, 'INR']],
    'the admin reports in the parent’s coin'
  );
  assert.match(copySql, /INSERT INTO owner_branding_assets/);
  const banner = m.copyQueries.find((q) => /INSERT INTO banners/.test(q.sql));
  assert.deepEqual(banner.params.slice(0, 2), ['home', 'home.jpg'], 'the desktop poster is the home placement');
  const slots = m.copyQueries.filter((q) => /INSERT INTO site_branding \(slot/.test(q.sql)).map((q) => q.params[0]);
  assert.deepEqual(slots, ['logo', 'mark'], 'no icon given: the logo is the favicon / mark too');
  const metaRow = m.copyQueries.find((q) => /INSERT INTO site_branding_meta/.test(q.sql));
  assert.equal(metaRow.params[1], metaOf(null), 'the name shows: the copy has no owner document');
  assert.equal(NO_OWNER_META, metaOf(null));
  assert.equal(JSON.parse(metaRow.params[0]).siteName, 'Lucky Play');

  // Ports recorded first, then live with the admin port.
  assert.match(m.parentQueries[1].sql, /UPDATE whitelabels SET ports/);
  assert.equal(JSON.parse(m.parentQueries[1].params[1]).redisDb, 9);
  const live = m.parentQueries.at(-1);
  assert.match(live.sql, /status = 'live'/);
  assert.deepEqual(live.params, [42, 6122]);
});

test('create stops before touching anything when DNS is not ready, or the folder is someone else’s', async () => {
  const notReady = machine({ dns: '198.51.100.1' });
  await assert.rejects(() => createWhitelabel(notReady.ctx, wl), /does not point at this server/);
  assert.equal(notReady.commands.length, 0);

  const taken = machine({ files: { '/var/www/main/lucky-play/README.md': 'someone else' } });
  await assert.rejects(() => createWhitelabel(taken.ctx, wl), /not this whitelabel's/);
  assert.equal(taken.commands.length, 0);
  assert.equal(taken.fsMap.has('/var/www/main/lucky-play/README.md'), true, 'nothing removed');

  const dbThere = machine({ dbExists: true });
  await assert.rejects(() => createWhitelabel(dbThere.ctx, wl), /already exists/);
});

test('delete: export first, then only what is this whitelabel’s', async () => {
  const target = '/var/www/main/lucky-play';
  const m = machine({
    dbExists: true,
    files: {
      [`${target}/.whitelabel.json`]: JSON.stringify({ id: 42 }),
      [`${target}/backend/.env`]: 'x',
      '/etc/nginx/sites-available/wl-lucky.example.com': '# Whitelabel copy — written by scripts/whitelabel.\nserver {',
      '/etc/nginx/sites-enabled/wl-lucky.example.com': '(link)',
      // Same name, not written by this script: left alone.
      '/etc/nginx/sites-available/wl-api.lucky.example.com': 'server { someone else',
      '/etc/nginx/sites-enabled/wl-api.lucky.example.com': '(link)',
    },
    pm2: [
      { name: 'lucky-play-gateway', pm2_env: { pm_cwd: `${target}/backend` } },
      { name: 'lucky-play-admin', pm2_env: { pm_cwd: `${target}/admin` } },
      { name: 'lucky-play2-gateway', pm2_env: { pm_cwd: '/var/www/main/lucky-play2/backend' } },
      { name: 'lucky-play-x', pm2_env: { pm_cwd: '/var/www/main/elsewhere' } },
      { name: 'parker-gateway', pm2_env: { pm_cwd: '/var/www/main/hash-game-exchange/backend' } },
    ],
  });
  await removeWhitelabel(m.ctx, { ...wl, ports: { gateway: 6120, redisDb: 9 } });
  const run = lines(m.commands);

  const dump = run.findIndex((l) => l.startsWith('| sudo -u postgres pg_dump --no-owner --no-privileges wl_lucky_play | gzip -9'));
  const firstStop = run.findIndex((l) => l.startsWith('pm2 delete'));
  assert.ok(dump >= 0 && dump < firstStop, 'the export is taken before anything is stopped');
  assert.match(m.commands[dump].toFile, /^\/var\/www\/main\/whitelabel-archive\/lucky-play-\d{8}-\d{6}\.sql\.gz$/);

  assert.deepEqual(run.filter((l) => l.startsWith('pm2 delete')), ['pm2 delete lucky-play-gateway', 'pm2 delete lucky-play-admin']);
  assert.equal(m.fsMap.has('/etc/nginx/sites-available/wl-lucky.example.com'), false);
  assert.equal(m.fsMap.has('/etc/nginx/sites-enabled/wl-lucky.example.com'), false);
  assert.equal(m.fsMap.has('/etc/nginx/sites-available/wl-api.lucky.example.com'), true, 'not ours: kept');
  assert.equal(m.fsMap.has('/etc/nginx/sites-enabled/wl-api.lucky.example.com'), true, 'not ours: kept');
  assert.ok(run.indexOf('nginx -t') < run.indexOf('systemctl reload nginx'));
  assert.deepEqual(run.filter((l) => l.startsWith('certbot delete')), ['certbot delete --non-interactive --cert-name lucky.example.com']);
  assert.ok(m.commands.some((c) => c.input === 'DROP DATABASE IF EXISTS wl_lucky_play WITH (FORCE);\nDROP ROLE IF EXISTS wl_lucky_play;\n'));
  assert.ok(run.includes('redis-cli -h 127.0.0.1 -p 6380 -n 9 FLUSHDB'), 'the parent’s Redis server, not the machine default');
  assert.equal([...m.fsMap.keys()].some((k) => k.startsWith(`${target}/`)), false, 'folder gone');
});

test('delete refuses a folder that is not this whitelabel’s, and never flushes a shared Redis database', async () => {
  const other = machine({ files: { '/var/www/main/lucky-play/.whitelabel.json': JSON.stringify({ id: 7 }) } });
  await assert.rejects(() => removeWhitelabel(other.ctx, wl), /not this whitelabel's/);
  assert.equal(other.commands.length, 0);

  const shared = machine();
  await removeWhitelabel(shared.ctx, { ...wl, ports: { redisDb: 1 } }, { archive: false });
  assert.equal(lines(shared.commands).some((l) => l.includes('FLUSHDB')), false);
});

test('a bad nginx test, or a domain another site serves, takes this whitelabel’s files out before any reload', async () => {
  for (const nginxTest of [
    { code: 1, stdout: '', stderr: 'nginx: [emerg] unexpected "}"' },
    { code: 0, stdout: '', stderr: 'nginx: [warn] conflicting server name "api.lucky.example.com" on 0.0.0.0:80, ignored' },
  ]) {
    const m = machine({ nginxTest });
    await assert.rejects(() => createWhitelabel(m.ctx, wl), /taken out again/);
    assert.equal([...m.fsMap.keys()].some((k) => k.startsWith('/etc/nginx/')), false, 'no site file or link left behind');
    assert.equal(lines(m.commands).includes('systemctl reload nginx'), false);
  }
});

test('a Redis password that does not work stops setup before anything is copied', async () => {
  const m = machine();
  const run = m.ctx.run;
  m.ctx.run = async (cmd, args, opts) => (cmd === 'redis-cli' ? { code: 0, stdout: 'NOAUTH Authentication required.\n', stderr: '' } : run(cmd, args, opts));
  await assert.rejects(() => createWhitelabel(m.ctx, wl), /NOAUTH/);
  assert.equal(m.commands.some((c) => c.pipe), false);
});
