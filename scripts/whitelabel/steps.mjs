/**
 * What the setup script DOES for one whitelabel: create (build a full copy of this stack on this
 * machine) and remove (take it all away again, after a final database export).
 *
 * Every effect goes through `ctx` (worker.mjs builds the real one), so the whole sequence runs in
 * a test against a fake machine (__tests__/steps.test.mjs):
 *
 *   ctx.run(cmd, args, { cwd, input, allowFail })   a program, NEVER a shell (args are not parsed)
 *   ctx.pipe([[cmd, args, opts], …], { toFile })      a | b (> file)
 *   ctx.fs { exists, read, write(path, text, mode), mkdir, rm }
 *   ctx.resolve4(domain), ctx.serverIp, ctx.httpOk(url), ctx.sleep(ms)
 *   ctx.envFiles()                                    every site's env file on this machine (Redis numbers in use)
 *   ctx.parent.query(sql, params)                     the parent's database
 *   ctx.copyDb(conn) → { query, end }                 a client on the copy's database
 *   ctx.parentRoot, ctx.parentEnv, ctx.parentFrontendEnv, ctx.linkKey, ctx.secrets
 *   ctx.log(text), ctx.step(text)
 *
 * Secrets never reach the log: SQL that carries a password goes over stdin, and command output is
 * logged only when a command fails.
 */
import crypto from 'node:crypto';
import path from 'node:path';

import whitelabelPlan from '../../backend/packages/common/src/whitelabelPlan.js';

import {
  ACME_ROOT,
  ARCHIVE_DIR,
  MARKER,
  OUR_VHOST,
  REDIS_FIRST_DB,
  WHITELABEL_ROOT,
  assertDomain,
  assertSlug,
  copyEnv,
  dbNameOf,
  ecosystem,
  listeningPorts,
  nginxConflict,
  patchEnv,
  pickPortBase,
  pickRedisDb,
  portsFrom,
  redisDbsNamed,
  redisDbsWithKeys,
  redisOf,
  stackConfig,
  targetDirOf,
  vhostFiles,
  vhosts,
} from './lib.mjs';

const APPS = ['backend', 'admin', 'owner-panel', 'frontend'];
const BUILT = ['admin', 'owner-panel', 'frontend'];

/**
 * branding.store.js `metaOf(null)`: the Super Admin's name and title show only while
 * `site_branding_meta.owner_meta` equals the owner's current metadata — a new copy has no owner
 * document, so this empty one. NULL there hides the name and the site reads as not branded
 * (the player site then shows the parent's art). A test checks it against the store's own.
 */
export const NO_OWNER_META = JSON.stringify(['', '', '', '', [], '', '', '']);

const domainsOf = (wl) => [wl.site_domain, wl.admin_domain, wl.api_domain].map(assertDomain);

/** psql as the postgres superuser, the script on stdin (never on the command line). */
const psql = (ctx, sql, { db = 'postgres', allowFail = false } = {}) =>
  ctx.run('sudo', ['-u', 'postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-q', '-d', db], { input: sql, allowFail });

// `dbName` is slug-derived (lower-case letters, digits, _), so it is safe inside the literal.
/** redis-cli on the parent's Redis server; the password goes in the environment, never on the command line. */
async function redisCli(ctx, args) {
  const { host, port, password } = redisOf(ctx.parentEnv);
  const out = await ctx.run('redis-cli', ['-h', host, '-p', String(port), ...args], { env: password ? { REDISCLI_AUTH: password } : {} });
  if (/^(NOAUTH|WRONGPASS|ERR)\b/m.test(out.stdout)) throw new Error(`redis-cli ${args.join(' ')}: ${out.stdout.trim()}`);
  return out;
}

/**
 * Writes (or rewrites) the domains' nginx sites and links them, then `nginx -t` and a reload. If
 * the test fails, or another site already serves one of the domains, this whitelabel's files come
 * out again before anything is reloaded — a bad file must never stay where the next reload of
 * ANY site on this machine would trip over it.
 */
async function writeSites(ctx, confs) {
  const written = [];
  for (const [domain, conf] of Object.entries(confs)) {
    const [file, link] = vhostFiles(domain);
    await ctx.fs.write(file, conf, 0o644);
    written.push(domain);
    await ctx.run('ln', ['-sfn', file, link]);
  }
  const test = await ctx.run('nginx', ['-t'], { allowFail: true });
  const problem = test.code !== 0 ? `nginx -t failed:\n${`${test.stderr}\n${test.stdout}`.trim()}` : nginxConflict(test.stderr, written);
  if (problem) {
    for (const domain of written) for (const f of [...vhostFiles(domain)].reverse()) await ctx.fs.rm(f);
    throw new Error(`${problem} — this whitelabel's nginx files were taken out again`);
  }
  await ctx.run('systemctl', ['reload', 'nginx']);
}

const databaseExists = async (ctx, dbName) =>
  (await ctx.run('sudo', ['-u', 'postgres', 'psql', '-Atqc', `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`])).stdout.trim() === '1';

async function readMarker(ctx, target) {
  const file = path.join(target, MARKER);
  if (!(await ctx.fs.exists(file))) return null;
  try {
    return JSON.parse(await ctx.fs.read(file));
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════
//  Create
// ══════════════════════════════════════════════════════════════════════════

export async function createWhitelabel(ctx, wl) {
  const slug = assertSlug(wl.slug);
  const target = targetDirOf(slug);
  const domains = domainsOf(wl);
  const dbName = dbNameOf(slug);

  ctx.step('Checking DNS');
  for (const domain of domains) {
    const ips = await ctx.resolve4(domain).catch(() => []);
    if (!ips.includes(ctx.serverIp)) {
      throw new Error(`${domain} does not point at this server (${ctx.serverIp}); it resolves to ${ips.join(', ') || 'nothing'}. Add an A record and run setup again.`);
    }
    ctx.log(`${domain} → ${ctx.serverIp}`);
  }

  ctx.step('Checking the machine');
  if (await ctx.fs.exists(target)) {
    const marker = await readMarker(ctx, target);
    if (Number(marker?.id) !== Number(wl.id)) throw new Error(`${target} already exists and is not this whitelabel's — nothing was touched`);
    ctx.log('Leftovers of an earlier attempt found: removing them first');
    await removeWhitelabel(ctx, wl, { archive: false });
  }
  for (const domain of domains) {
    for (const file of vhostFiles(domain)) {
      if (await ctx.fs.exists(file)) throw new Error(`${file} already exists — another site uses ${domain}`);
    }
  }
  if (await databaseExists(ctx, dbName)) throw new Error(`database ${dbName} already exists — nothing was touched`);

  ctx.step('Choosing ports and a Redis database');
  const others = await ctx.parent.query(`SELECT ports FROM whitelabels WHERE id <> $1 AND status <> 'deleted' AND ports IS NOT NULL`, [wl.id]);
  const base = pickPortBase(listeningPorts((await ctx.run('ss', ['-ltnH'])).stdout), others.map((r) => r.ports));
  const ports = portsFrom(base);
  const envTexts = [];
  for (const file of await ctx.envFiles()) envTexts.push(await ctx.fs.read(file).catch(() => ''));
  const usedRedis = new Set([
    ...redisDbsWithKeys((await redisCli(ctx, ['INFO', 'keyspace'])).stdout),
    ...redisDbsNamed(envTexts),
    ...others.map((r) => r.ports?.redisDb).filter(Number.isInteger),
  ]);
  const redisDb = pickRedisDb(usedRedis);
  // Recorded at once: a failed setup's cleanup must know exactly what was taken.
  await ctx.parent.query(`UPDATE whitelabels SET ports = $2, updated_at = NOW() WHERE id = $1`, [wl.id, JSON.stringify({ ...ports, redisDb })]);
  ctx.log(`ports ${base}–${base + 9}, Redis database ${redisDb}`);

  ctx.step('Copying the code');
  await ctx.fs.mkdir(target);
  await ctx.fs.write(path.join(target, MARKER), JSON.stringify({ id: Number(wl.id), slug, createdAt: new Date().toISOString() }), 0o600);
  await ctx.pipe([
    ['git', ['-C', ctx.parentRoot, 'archive', '--format=tar', 'HEAD']],
    ['tar', ['-x', '-C', target]],
  ]);

  ctx.step('Writing the configuration');
  await ctx.fs.write(path.join(target, 'scripts', 'stack.config.mjs'), stackConfig({ wl, slug, ports }));
  await ctx.fs.write(path.join(target, 'ecosystem.config.cjs'), ecosystem({ slug, ports }));
  // Fresh secrets for every file (JWT, internal keys, owner panel login, owner signing pair).
  await ctx.run('node', ['scripts/make-env.mjs'], { cwd: target });
  const env = copyEnv({ wl, slug, ports, redisDb, parentEnv: ctx.parentEnv, parentFrontendEnv: ctx.parentFrontendEnv, linkKey: ctx.linkKey, secrets: ctx.secrets });
  for (const [file, patch] of [
    ['backend/.env', env.backend],
    ['frontend/.env.local', env.frontend],
    ['admin/.env.local', env.siteAdmin],
    ['owner-panel/.env.local', env.ownerPanel],
  ]) {
    const full = path.join(target, file);
    const text = (await ctx.fs.exists(full)) ? await ctx.fs.read(full) : '';
    await ctx.fs.write(full, patchEnv(text, patch), 0o600);
  }

  ctx.step('Installing packages');
  for (const app of APPS) {
    const cwd = path.join(target, app);
    const plain = await ctx.run('npm', ['ci', '--no-audit', '--no-fund', '--prefer-offline'], { cwd, allowFail: true });
    // The admin's jspdf peer clash needs this, as on the parent.
    if (plain.code !== 0) await ctx.run('npm', ['ci', '--no-audit', '--no-fund', '--prefer-offline', '--legacy-peer-deps'], { cwd });
    ctx.log(`${app}: installed`);
  }

  ctx.step('Creating the database');
  // Identifiers are the slug-derived name (lower-case, digits, _); the password is hex.
  await psql(ctx, `CREATE ROLE ${dbName} LOGIN PASSWORD '${ctx.secrets.dbPassword}';\nCREATE DATABASE ${dbName} OWNER ${dbName};\n`);
  ctx.log(`database ${dbName} (own role)`);

  ctx.step('Migrations and base data');
  const backendDir = path.join(target, 'backend');
  await ctx.run('npm', ['run', 'db:migrate'], { cwd: backendDir });
  await ctx.run('npm', ['run', 'db:seed'], { cwd: backendDir });
  await ctx.run('node', ['scripts/seed-data.js'], { cwd: backendDir });

  ctx.step('Company, exchange rates and branding');
  const copy = await ctx.copyDb({ host: '127.0.0.1', port: Number(ctx.parentEnv.DB_PORT || 5432), database: dbName, user: dbName, password: ctx.secrets.dbPassword });
  try {
    await setUpCompany(ctx, copy, wl);
  } finally {
    await copy.end();
  }

  ctx.step('Building the sites');
  for (const app of BUILT) {
    await ctx.run('npm', ['run', 'build'], { cwd: path.join(target, app) });
    ctx.log(`${app}: built`);
  }

  ctx.step('Starting the processes');
  await ctx.run('pm2', ['start', path.join(target, 'ecosystem.config.cjs')], { cwd: target });
  await ctx.run('pm2', ['save']);
  const healthy = await waitFor(ctx, `http://127.0.0.1:${ports.gateway}/health`, 180_000);
  if (!healthy) throw new Error('the copy did not answer /health within 3 minutes (see its pm2 logs)');
  if (!(await ctx.httpOk(`http://127.0.0.1:${ports.admin}/api/v1/admin/whitelabel-link/status`))) throw new Error('the copy is up but its whitelabel link does not answer');

  ctx.step('nginx sites and SSL certificates');
  // Port 80 first (the ACME challenge), then a certificate per domain, then the full HTTPS sites.
  await ctx.fs.mkdir(ACME_ROOT);
  await writeSites(ctx, vhosts(wl, ports, { ssl: false }));
  for (const domain of domains) {
    await ctx.run('certbot', ['certonly', '--webroot', '-w', ACME_ROOT, '--cert-name', domain, '-d', domain, '--non-interactive', '--agree-tos', '--keep-until-expiring']);
    ctx.log(`certificate for ${domain}`);
  }
  await writeSites(ctx, vhosts(wl, ports));
  for (const domain of domains) ctx.log(`https://${domain} ready`);

  await ctx.parent.query(
    `UPDATE whitelabels SET status = 'live', admin_port = $2, company_password_hash = NULL, updated_at = NOW() WHERE id = $1`,
    [wl.id, ports.admin]
  );
  ctx.log(`Live: https://${wl.site_domain} · https://${wl.admin_domain}`);
  return { ports, redisDb };
}

async function waitFor(ctx, url, timeoutMs) {
  for (let waited = 0; waited <= timeoutMs; waited += 5_000) {
    if (await ctx.httpOk(url)) return true;
    await ctx.sleep(5_000);
  }
  return false;
}

/**
 * The seeded super-admin becomes the company: its name, email and the password the parent chose
 * (as its bcrypt hash — the same algorithm here), forced to change on first sign-in. The level-1
 * role takes the hierarchy name. Then the parent's default / reward coin and exchange rates
 * (setup's are USDT and placeholders), the logo and mark, the name and title, and the palette.
 */
async function setUpCompany(ctx, copy, wl) {
  const [company] = await copy.query(
    `SELECT s.id FROM staff s JOIN roles r ON r.id = s.role_id WHERE r.level = 1 ORDER BY s.id LIMIT 1`
  );
  if (!company) throw new Error('the seeded super-admin is missing on the copy');
  await copy.query(`UPDATE roles SET name = $1 WHERE level = 1`, [wl.company_role_name]);
  if (!wl.company_password_hash) throw new Error('no company password is stored (set one on the whitelabel page, then run setup again)');
  await copy.query(
    `UPDATE staff SET name = $2, email = $3, password = $4, must_change_password = true, first_login = true,
            transaction_password = NULL, token_version = token_version + 1
      WHERE id = $1`,
    [company.id, wl.company_name, wl.company_email, wl.company_password_hash]
  );
  ctx.log(`company ${wl.company_email} (${wl.company_role_name})`);

  // The parent's coins: default (what the admin reports in) and reward. Fresh setup says USDT.
  const coins = await ctx.parent.query(`SELECT feature, enabled, variant FROM site_features WHERE feature IN ('default_currency', 'reward_currency')`);
  for (const c of coins) {
    await copy.query(
      `INSERT INTO site_features (feature, enabled, variant) VALUES ($1, $2, $3)
       ON CONFLICT (feature) DO UPDATE SET enabled = EXCLUDED.enabled, variant = EXCLUDED.variant, updated_at = NOW() RETURNING feature`,
      [c.feature, c.enabled, c.variant]
    );
  }
  ctx.log(`coins as the parent: ${coins.map((c) => `${c.feature} ${c.variant}`).join(', ') || 'parent has none set'}`);

  const rates = await ctx.parent.query(`SELECT UPPER(currency) AS currency, usd_rate FROM exchangerate WHERE usd_rate IS NOT NULL`);
  for (const r of rates) {
    const updated = await copy.query(`UPDATE exchangerate SET usd_rate = $2, last_updated = NOW() WHERE UPPER(currency) = $1 RETURNING id`, [r.currency, r.usd_rate]);
    if (!updated.length) await copy.query(`INSERT INTO exchangerate (currency, usd_rate, last_updated) VALUES ($1, $2, NOW()) RETURNING id`, [r.currency, r.usd_rate]);
  }
  ctx.log(`${rates.length} exchange rates from the parent`);

  // The logo, and the square mark (favicon, small icons): the icon, else the logo again.
  if (wl.logo && wl.logo_type) await setImage(copy, 'logo', wl.logo, wl.logo_type);
  const [mark, markType] = wl.icon && wl.icon_type ? [wl.icon, wl.icon_type] : [wl.logo, wl.logo_type];
  if (mark && markType) await setImage(copy, 'mark', mark, markType);
  ctx.log(`${wl.logo ? 'logo' : 'no logo'}, ${wl.icon ? 'icon' : wl.logo ? 'logo as icon' : 'no icon'}`);
  // The home-page poster(s), into the banner placements the player site's hero reads.
  const posters = await ctx.parent.query(`SELECT slot, content_type, bytes FROM whitelabel_assets WHERE whitelabel_id = $1`, [wl.id]);
  for (const p of posters) {
    const placement = p.slot === 'poster' ? 'home' : 'home_mobile';
    const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp' }[p.content_type];
    await copy.query(
      `INSERT INTO banners (type, image, image_data, content_type, byte_size, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       ON CONFLICT (type) DO UPDATE SET image = EXCLUDED.image, image_data = EXCLUDED.image_data, content_type = EXCLUDED.content_type,
         byte_size = EXCLUDED.byte_size, is_active = true, updated_at = NOW()
       RETURNING id`,
      [placement, `${placement}${ext}`, p.bytes, p.content_type, p.bytes.length]
    );
  }
  if (posters.length) ctx.log(`poster: ${posters.map((p) => p.slot).join(', ')}`);

  // Every key the store's setMeta writes; the browser bar takes the brand colour.
  const meta = {
    siteName: wl.name.slice(0, 40),
    title: (wl.title || wl.name).slice(0, 70),
    titleTemplate: '',
    description: wl.description || '',
    keywords: [],
    ogTitle: '',
    ogDescription: '',
    themeColor: wl.palette?.primary?.toUpperCase() ?? '',
  };
  await copy.query(
    `INSERT INTO site_branding_meta (id, meta, owner_meta, updated_at) VALUES (1, $1::jsonb, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET meta = EXCLUDED.meta, owner_meta = EXCLUDED.owner_meta, updated_at = NOW() RETURNING id`,
    [JSON.stringify(meta), NO_OWNER_META]
  );
  await copy.query(
    `INSERT INTO whitelabel_settings (id, palette, updated_at) VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET palette = EXCLUDED.palette, updated_at = NOW() RETURNING id`,
    [wl.palette ? JSON.stringify(wl.palette) : null]
  );
  ctx.log(wl.palette ? 'custom colours set' : `template ${wl.template}`);

  // The products and features the parent sold it: the copy's entitlements read the plan as a
  // ceiling, and the policies it decides are written as the owner would. No plan = not limited.
  const plan = whitelabelPlan.cleanPlan(wl.plan);
  if (plan) {
    await copy.query(`UPDATE whitelabel_settings SET plan = $1::jsonb, updated_at = NOW() WHERE id = 1 RETURNING id`, [JSON.stringify(plan)]);
    for (const [feature, variant] of Object.entries(whitelabelPlan.policiesOf(plan))) {
      await copy.query(
        `INSERT INTO site_features (feature, variant, enabled, owner_enabled, updated_by) VALUES ($1, $2, true, true, 'owner')
         ON CONFLICT (feature) DO UPDATE SET variant = EXCLUDED.variant, enabled = true, owner_enabled = true, updated_by = 'owner', updated_at = NOW()
         RETURNING feature`,
        [feature, variant]
      );
    }
    const on = (group) => Object.keys(group).filter((k) => group[k]).join(', ') || 'none';
    ctx.log(`plan: products ${on(plan.products)}; features ${on(plan.features)}`);
  }
}

/** One Super Admin image slot on the copy, stored by content hash — branding.store.js setSite's rows. */
async function setImage(copy, slot, bytes, type) {
  const ext = { 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg' }[type];
  const file = `${crypto.createHash('sha256').update(bytes).digest('hex')}.${ext}`;
  await copy.query(
    `INSERT INTO owner_branding_assets (file, content_type, byte_size, bytes) VALUES ($1, $2, $3, $4) ON CONFLICT (file) DO NOTHING RETURNING file`,
    [file, type, bytes.length, bytes]
  );
  await copy.query(
    `INSERT INTO site_branding (slot, file, content_type, byte_size, owner_file, updated_at) VALUES ($1, $2, $3, $4, NULL, NOW())
     ON CONFLICT (slot) DO UPDATE SET file = EXCLUDED.file, content_type = EXCLUDED.content_type, byte_size = EXCLUDED.byte_size, updated_at = NOW()
     RETURNING slot`,
    [slot, file, type, bytes.length]
  );
}

// ══════════════════════════════════════════════════════════════════════════
//  Remove
// ══════════════════════════════════════════════════════════════════════════

/**
 * Takes away everything `createWhitelabel` made, each part only if it is this whitelabel's: the
 * folder by its marker, nginx sites by the line this script writes in them, pm2 apps by the
 * `<slug>-` prefix, the Redis database by the number recorded for it (8–15 only). Each part that
 * is already gone is skipped, so it can run again after a failure. `archive` keeps a final
 * database export first (a real delete; not the cleanup before a setup retry).
 */
export async function removeWhitelabel(ctx, wl, { archive = true } = {}) {
  const slug = assertSlug(wl.slug);
  const target = targetDirOf(slug);
  const dbName = dbNameOf(slug);
  const recorded = wl.ports ?? null;

  if (await ctx.fs.exists(target)) {
    const marker = await readMarker(ctx, target);
    if (Number(marker?.id) !== Number(wl.id)) throw new Error(`${target} is not this whitelabel's (marker ${JSON.stringify(marker)}) — nothing removed`);
  }

  if (archive && (await databaseExists(ctx, dbName))) {
    ctx.step('Saving a final database export');
    await ctx.fs.mkdir(ARCHIVE_DIR);
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
    const file = path.join(ARCHIVE_DIR, `${slug}-${stamp}.sql.gz`);
    await ctx.pipe([['sudo', ['-u', 'postgres', 'pg_dump', '--no-owner', '--no-privileges', dbName]], ['gzip', ['-9']]], { toFile: file, mode: 0o600 });
    ctx.log(`export kept: ${file}`);
  }

  ctx.step('Stopping the processes');
  const apps = JSON.parse((await ctx.run('pm2', ['jlist'])).stdout || '[]');
  const ours = apps.filter((a) => typeof a.name === 'string' && a.name.startsWith(`${slug}-`) && String(a.pm2_env?.pm_cwd ?? '').startsWith(`${target}${path.sep}`));
  for (const app of ours) await ctx.run('pm2', ['delete', app.name]);
  if (ours.length) await ctx.run('pm2', ['save']);
  ctx.log(`${ours.length} processes removed`);

  ctx.step('Removing the nginx sites and certificates');
  let reload = false;
  for (const domain of domainsOf(wl)) {
    const [file, link] = vhostFiles(domain);
    if (!(await ctx.fs.exists(file)) || !(await ctx.fs.read(file)).startsWith(OUR_VHOST)) continue;
    await ctx.fs.rm(link);
    await ctx.fs.rm(file);
    await ctx.run('certbot', ['delete', '--non-interactive', '--cert-name', domain], { allowFail: true });
    reload = true;
    ctx.log(`${domain} removed`);
  }
  if (reload) {
    await ctx.run('nginx', ['-t']);
    await ctx.run('systemctl', ['reload', 'nginx']);
  }

  ctx.step('Dropping the database');
  await psql(ctx, `DROP DATABASE IF EXISTS ${dbName} WITH (FORCE);\nDROP ROLE IF EXISTS ${dbName};\n`);

  const redisDb = recorded?.redisDb;
  if (Number.isInteger(redisDb) && redisDb >= REDIS_FIRST_DB && redisDb <= 15) {
    ctx.step('Clearing its Redis database');
    await redisCli(ctx, ['-n', String(redisDb), 'FLUSHDB']);
  }

  ctx.step('Removing the folder');
  // targetDirOf() only ever answers /var/www/main/<valid slug>; the marker matched above.
  if (path.dirname(target) !== WHITELABEL_ROOT) throw new Error(`refusing to remove ${target}`);
  if (await ctx.fs.exists(target)) await ctx.fs.rm(target);
  ctx.log(`${target} removed`);
}
