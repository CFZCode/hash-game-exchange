/**
 * Pure helpers for the whitelabel setup script (worker.mjs / steps.mjs): names, ports, Redis
 * databases, env files, nginx sites and the pm2 file of one copy. Nothing here touches the
 * machine, so all of it is unit-tested (__tests__/lib.test.mjs).
 */
import crypto from 'node:crypto';
import path from 'node:path';

/** Same rule as the panel (admin modules/whitelabels validators). Every path and name below derives from it. */
export const SLUG_RE = /^[a-z][a-z0-9-]{2,28}[a-z0-9]$/;
const DOMAIN_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const WHITELABEL_ROOT = '/var/www/main';
export const ARCHIVE_DIR = path.join(WHITELABEL_ROOT, 'whitelabel-archive');
export const MARKER = '.whitelabel.json';

export function assertSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) throw new Error(`refusing an unsafe whitelabel slug: ${JSON.stringify(slug)}`);
  return slug;
}

export function assertDomain(domain) {
  if (typeof domain !== 'string' || !DOMAIN_RE.test(domain)) throw new Error(`refusing an unsafe domain: ${JSON.stringify(domain)}`);
  return domain;
}

/** /var/www/main/<slug> — never anything else, so a delete can never reach outside it. */
export const targetDirOf = (slug) => path.join(WHITELABEL_ROOT, assertSlug(slug));

/** Postgres role and database: `wl_<slug with _>` (a hyphen is not a bare identifier). */
export const dbNameOf = (slug) => `wl_${assertSlug(slug).replace(/-/g, '_')}`;

// ── Ports ─────────────────────────────────────────────────────────────────

/** One block of 10 per copy; `base + offset`. The order is stack.config.mjs's PORTS. */
export const PORT_OFFSETS = Object.freeze({
  gateway: 0,
  user: 1,
  admin: 2,
  casino: 3,
  sports: 4,
  sportsWorker: 5,
  userWorker: 6,
  siteAdmin: 7,
  ownerPanel: 8,
  frontend: 9,
});
export const PORT_FIRST_BASE = 6100;
const PORT_STEP = 20;
const PORT_LAST_BASE = 7900;

export const portsFrom = (base) => Object.fromEntries(Object.entries(PORT_OFFSETS).map(([k, o]) => [k, base + o]));

/**
 * The first block none of whose ports is listening now (`listening`) or recorded for another
 * whitelabel (`reserved`, their `ports` objects).
 */
export function pickPortBase(listening, reserved = []) {
  const taken = new Set(listening);
  for (const ports of reserved) for (const p of Object.values(ports ?? {})) if (Number.isInteger(p)) taken.add(p);
  for (let base = PORT_FIRST_BASE; base <= PORT_LAST_BASE; base += PORT_STEP) {
    if (Object.values(portsFrom(base)).every((p) => !taken.has(p))) return base;
  }
  throw new Error('no free block of 10 ports between 6100 and 7909');
}

/** `ss -ltnH` → listening TCP ports. */
export const listeningPorts = (ssOutput) =>
  new Set(
    String(ssOutput)
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[3])
      .filter(Boolean)
      .map((addr) => Number(addr.slice(addr.lastIndexOf(':') + 1)))
      .filter(Number.isInteger)
  );

// ── Redis ─────────────────────────────────────────────────────────────────

/**
 * Sports-service keys carry no prefix, so each copy needs its own Redis DATABASE (the shared
 * cache also gets REDIS_PREFIX=<slug>). 0–7 are left to the other sites on this machine; a copy
 * takes the first of 8–15 that has no keys, no site's .env names it and no whitelabel holds.
 */
export const REDIS_FIRST_DB = 8;
const REDIS_LAST_DB = 15;

export function pickRedisDb(used) {
  for (let db = REDIS_FIRST_DB; db <= REDIS_LAST_DB; db += 1) if (!used.has(db)) return db;
  throw new Error('no free Redis database (8–15 are all in use) — this machine holds no more whitelabels');
}

/** `redis-cli INFO keyspace` → databases holding keys. */
export const redisDbsWithKeys = (info) => new Set([...String(info).matchAll(/^db(\d+):keys=/gm)].map((m) => Number(m[1])));

/** REDIS_DB=N or a REDIS_URL ending /N in env files' text → those numbers. */
export function redisDbsNamed(texts) {
  const out = new Set();
  for (const text of texts) {
    for (const m of String(text).matchAll(/^\s*REDIS_DB\s*=\s*"?(\d+)/gm)) out.add(Number(m[1]));
    for (const m of String(text).matchAll(/^\s*REDIS_URL\s*=\s*"?redis[s]?:\/\/[^\s"]*\/(\d+)\s*"?$/gm)) out.add(Number(m[1]));
  }
  return out;
}

// ── Env files ─────────────────────────────────────────────────────────────

export function parseEnv(text) {
  const out = {};
  for (const line of String(text ?? '').split('\n')) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
  }
  return out;
}

const quote = (v) => (/[\s#"']/.test(v) ? JSON.stringify(v) : v);

/** Set `patch` in place (comments and order kept), appending keys the text lacks — make-env.mjs's rule. */
export function patchEnv(text, patch, header = '# ── set by scripts/whitelabel ──') {
  const seen = new Set();
  const lines = String(text ?? '')
    .replace(/\n+$/, '')
    .split('\n')
    .map((line) => {
      const m = line.match(/^\s*([A-Z_0-9]+)\s*=/);
      if (!m || !(m[1] in patch)) return line;
      seen.add(m[1]);
      return `${m[1]}=${quote(String(patch[m[1]]))}`;
    });
  const added = Object.keys(patch).filter((k) => !seen.has(k));
  if (added.length) {
    lines.push('', header);
    for (const k of added) lines.push(`${k}=${quote(String(patch[k]))}`);
  }
  return `${lines.join('\n').replace(/\n*$/, '')}\n`;
}

/**
 * What a copy takes from the PARENT's backend/.env: the shared sports feed and JSGames v2 keys,
 * and the platform's limits and timings. Everything else — every secret, every payment gateway,
 * GIS / JSGames v1 / seamless / original-games keys (their callbacks are registered to the
 * parent), SMTP, Telegram, storage paths, ports and URLs — is the copy's own or left empty.
 * An allowlist, so a secret the parent adds later never reaches a copy by default.
 */
const SHARED = [
  /^AVRKHUB_/,
  /^SPORTS_FEED_/,
  /^JSGAMES_V2_(BASE_URL|API_KEY|API_SECRET)$/,
  /^JSGAMES_(MAX_SKEW_SECONDS|TIMEOUT_MS)$/,
  /^SPORTS_(?!SERVICE_|WORKER_)[A-Z_]+$/,
  /^CASINO_(HOUSE_EDGE|MAX_BET|MIN_BET|SEED_ROTATE_AFTER)$/,
  /^(DEPOSIT|WITHDRAW)_(MINIMUM|MAXIMUM)$/,
  /^MIN_(DEPOSIT|WITHDRAWAL)_USDT$/,
  /^(AUTO_WITHDRAWALS_ENABLED|WITHDRAWAL_AUTO_APPROVE_LIMIT|ALLOW_ZERO_BALANCE_AFTER_BET|INHOUSE_SERVER_AUTHORITY)$/,
  /^(BASE_CURRENCY|CURRENCY_SCALE|SUPPORTED_CURRENCIES)$/,
  /^(AUTH|REGISTER|WALLET)_RATE_LIMIT_(MAX|WINDOW_MS)$/,
  /^RATE_LIMIT_(MAX|WINDOW_MS)$/,
  /^(LOGIN_LOCK_MINUTES|LOGIN_MAX_ATTEMPTS|MAX_ACTIVE_SESSIONS|PASSWORD_MIN_LENGTH|PASSWORD_RESET_TTL_MINUTES|BCRYPT_ROUNDS)$/,
  /^(EMAIL_VERIFY_TTL_HOURS|REQUIRE_EMAIL_VERIFICATION)$/,
  /^STAFF_2FA_REQUIRED_LEVEL$/,
  /^JWT_(ACCESS|REFRESH|ADMIN)_TTL$/,
  /^(GEO_LOOKUP_ENABLED|GEO_PROVIDERS|IPINFO_TOKEN)$/,
  /^(RACE_TIMEZONE|TRUST_PROXY|REQUEST_TIMEOUT_MS|BODY_LIMIT|UPLOAD_MAX_BYTES|PSP_TIMEOUT_MS|SERVICE_TIMEOUT_MS|SERVICE_RETRIES)$/,
  /^DB_(POOL_[A-Z_]+|STATEMENT_TIMEOUT_MS|SSL|HOST|PORT|SCHEMA|LOGGING)$/,
  /^(LOG_LEVEL|LOG_PRETTY|NODE_ENV|OWNER_POLL_SECONDS|OWNER_MAX_AGE_SECONDS|CRICKET_SCORE_EMBED_URL)$/,
];

export const sharedFromParent = (parentEnv) =>
  Object.fromEntries(Object.entries(parentEnv).filter(([k, v]) => v !== '' && SHARED.some((re) => re.test(k))));

/** Keys of the parent's that must be EMPTY on a copy even though .env.example ships a value. */
export const BLANK_ON_COPY = [
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM',
  'DB_USER_USER_SERVICE', 'DB_PASSWORD_USER_SERVICE', 'DB_USER_ADMIN_SERVICE', 'DB_PASSWORD_ADMIN_SERVICE',
  'DB_USER_CASINO_SERVICE', 'DB_PASSWORD_CASINO_SERVICE', 'DB_USER_SPORTS_SERVICE', 'DB_PASSWORD_SPORTS_SERVICE',
];

/**
 * Everything one copy's env files need beyond make-env.mjs's local defaults. `secrets` are made
 * by the caller (crypto) so a test can pin them.
 */
export function copyEnv({ wl, slug, ports, redisDb, parentEnv, parentFrontendEnv = {}, linkKey, hub, secrets }) {
  const site = `https://${wl.site_domain}`;
  const admin = `https://${wl.admin_domain}`;
  const api = `https://${wl.api_domain}`;
  const dbName = dbNameOf(slug);
  const origins = [site, admin].join(',');
  const redis = redisOf(parentEnv);

  const backend = {
    ...sharedFromParent(parentEnv),
    ...Object.fromEntries(BLANK_ON_COPY.map((k) => [k, ''])),
    // Staff 2FA off on copies (the owner's choice): no level has to enrol an authenticator.
    STAFF_2FA_REQUIRED_LEVEL: '0',
    NODE_ENV: 'production',
    DB_NAME: dbName,
    DB_USER: dbName,
    DB_PASSWORD: secrets.dbPassword,
    // The parent's Redis server (its password too), the copy's own database on it.
    REDIS_HOST: redis.host,
    REDIS_PORT: String(redis.port),
    REDIS_PASSWORD: redis.password,
    REDIS_DB: String(redisDb),
    REDIS_URL: redisUrl(redis, redisDb),
    REDIS_PREFIX: slug,
    CORS_ORIGIN: origins,
    SOCKET_ALLOWED_ORIGINS: origins,
    PUBLIC_BASE_URL: api,
    PUBLIC_SITE_URL: site,
    PUBLIC_ASSET_URL: `${api}/assets`,
    OWNER_PANEL_URL: `http://127.0.0.1:${ports.ownerPanel}/owner`,
    OWNER_SITE_KEY: slug,
    SITE_TEMPLATE: wl.template,
    TOTP_ISSUER: wl.name,
    JSGAMES_CALLBACK_URL: `${api}/api/v1/casino/js-games/v2/bet-callback`,
    JSGAMES_HOME_URL: site,
    API_ENCRYPTION_KEY: secrets.apiEncryptionKey,
    MAIL_DRY_RUN: 'true',
    // The company chooses its own transaction password on first sign-in (Phase 1): separate mode.
    TXN_PASSWORD_MODE: 'separate',
    RATE_LIMIT_ENABLED: 'true',
    SEED_ADMIN_EMAIL: wl.company_email,
    SEED_ADMIN_PASSWORD: secrets.seedAdminPassword,
    WHITELABEL_MODE: 'true',
    WHITELABEL_LINK_KEY: linkKey,
    // Gateway payments and casino games run on the parent's accounts (user- and casino-service modules/wl-hub).
    ...(hub ? { PARENT_HUB_URL: hub.url, PARENT_HUB_CASINO_URL: hub.casinoUrl, PARENT_HUB_KEY: hub.key, PARENT_HUB_SECRET: hub.secret } : {}),
  };

  const frontend = {
    NEXT_PUBLIC_API_BASE: api,
    VITE_API_BASE: api,
    NEXT_PUBLIC_USE_FIXTURES: 'false',
    VITE_USE_FIXTURES: 'false',
    NEXT_PUBLIC_API_ENC_KEY: secrets.apiEncryptionKey,
    NEXT_PUBLIC_WHITELABEL_MODE: 'true',
    // The stream / scorecard vendors are shared: the same hosts as the parent's player site.
    ...Object.fromEntries(
      ['NEXT_PUBLIC_SPORTS_STREAM_BASE', 'NEXT_PUBLIC_SCORECARD_BASE', 'NEXT_PUBLIC_SCORE_SOCKET_URL'].filter((k) => parentFrontendEnv[k]).map((k) => [k, parentFrontendEnv[k]])
    ),
  };

  const siteAdmin = {
    API_URL: `http://127.0.0.1:${ports.gateway}`,
    NEXT_PUBLIC_API_BASE: api,
    NEXT_PUBLIC_SITE_NAME: `${wl.name} Admin`,
    NEXT_PUBLIC_ENV_LABEL: 'production',
    NEXT_PUBLIC_WHITELABEL_MODE: 'true',
    PORT: String(ports.siteAdmin),
  };

  const ownerPanel = {
    BASEPATH: '/owner',
    SITE_NAME: wl.name,
    SITE_GATEWAY_URL: `http://127.0.0.1:${ports.gateway}`,
    SITE_ADMIN_URL: admin,
    SITE_FRONTEND_URL: site,
    NEXT_PUBLIC_ENV_LABEL: 'production',
    PORT: String(ports.ownerPanel),
  };

  return { backend, frontend, siteAdmin, ownerPanel };
}

export const newSecrets = () => ({
  dbPassword: crypto.randomBytes(24).toString('hex'),
  apiEncryptionKey: crypto.randomBytes(32).toString('base64'),
  seedAdminPassword: `${crypto.randomBytes(18).toString('base64url')}aZ9!`,
});

// ── The copy's own stack.config.mjs and pm2 file ──────────────────────────

export function stackConfig({ wl, slug, ports }) {
  return `/**
 * Whitelabel copy "${wl.name}" — written by scripts/whitelabel (do not edit by hand).
 * Read by scripts/make-env.mjs and scripts/dev.mjs, as in the parent.
 */
export const SITE_KEY = ${JSON.stringify(slug)}
export const SITE_NAME = ${JSON.stringify(wl.name)}
export const SITE_TEMPLATE = ${JSON.stringify(wl.template)}
export const DB_NAME = ${JSON.stringify(dbNameOf(slug))}
export const TEST_DB_NAME = ${JSON.stringify(`${dbNameOf(slug)}_test`)}

export const PORTS = ${JSON.stringify(ports, null, 2)}

export const URLS = {
  gateway: \`http://127.0.0.1:\${PORTS.gateway}\`,
  siteAdmin: \`http://localhost:\${PORTS.siteAdmin}\`,
  ownerPanel: \`http://127.0.0.1:\${PORTS.ownerPanel}\`,
  frontend: \`http://localhost:\${PORTS.frontend}\`
}

export const BROWSER_ORIGINS = [PORTS.frontend, PORTS.siteAdmin, PORTS.ownerPanel].flatMap(p => [
  \`http://localhost:\${p}\`,
  \`http://127.0.0.1:\${p}\`
])
`;
}

/** pm2 apps `<slug>-*`, the parent's ecosystem.config.cjs layout on this copy's ports. */
export function ecosystem({ slug, ports }) {
  return `// pm2 layout of whitelabel copy "${slug}" — written by scripts/whitelabel (do not edit by hand).
//   pm2 start ecosystem.config.cjs && pm2 save
const path = require('path');
const root = __dirname;
const backend = path.join(root, 'backend');
const base = {
  exec_mode: 'fork', instances: 1, autorestart: true, restart_delay: 5000,
  max_restarts: 20, watch: false, time: true,
};
const svc = (name, script) => ({ ...base, name: \`${slug}-\${name}\`, script, cwd: backend });
const next = (name, dir, port) => ({
  ...base, name: \`${slug}-\${name}\`, cwd: path.join(root, dir),
  script: 'node_modules/next/dist/bin/next', args: \`start -p \${port} -H 127.0.0.1\`,
  env: { NODE_ENV: 'production' },
});

module.exports = {
  apps: [
    svc('user-svc', 'services/user/src/index.js'),
    svc('admin-svc', 'services/admin/src/index.js'),
    svc('casino-svc', 'services/casino/src/index.js'),
    svc('sports-svc', 'services/sports/src/index.js'),
    svc('sports-worker', 'services/sports/src/worker.js'),
    svc('user-worker', 'services/user/src/worker.js'),
    svc('gateway', 'gateway/src/index.js'),
    { ...next('frontend', 'frontend', ${ports.frontend}), script: 'scripts/start-live.sh' },
    next('admin', 'admin', ${ports.siteAdmin}),
    next('owner-panel', 'owner-panel', ${ports.ownerPanel}),
  ],
};
`;
}

// ── nginx ─────────────────────────────────────────────────────────────────

export const SITES_AVAILABLE = '/etc/nginx/sites-available';
export const SITES_ENABLED = '/etc/nginx/sites-enabled';
/** certbot --webroot's folder; port 80 serves the challenge from here (the parent's pattern). */
export const ACME_ROOT = '/var/www/certbot';
export const OUR_VHOST = '# Whitelabel copy — written by scripts/whitelabel.';

const PROXY = [
  'proxy_http_version 1.1;',
  'proxy_set_header Upgrade $http_upgrade;',
  'proxy_set_header Connection "upgrade";',
  'proxy_set_header Host $host;',
  'proxy_set_header X-Real-IP $remote_addr;',
  'proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
  'proxy_set_header X-Forwarded-Proto https;',
  'proxy_set_header X-Forwarded-Host $host;',
  'proxy_read_timeout 120s;',
];

/**
 * One domain's nginx site. Without `ssl`: port 80 only (the ACME challenge, the rest redirected),
 * enough for certbot's first certificate. With `ssl`: plus the 443 server on that certificate.
 * `routes` = [[path, port]]; every location carries the WebSocket upgrade headers.
 */
function vhost(domain, routes, { ssl, extra = [] }) {
  assertDomain(domain);
  const http = `server {
    listen 80;
    listen [::]:80;
    server_name ${domain};
    location /.well-known/acme-challenge/ { root ${ACME_ROOT}; }
    location / { return 301 https://$host$request_uri; }
}
`;
  if (!ssl) return `${OUR_VHOST}\n${http}`;
  const locations = routes
    .map(([p, port]) => `    location ${p} {\n        proxy_pass http://127.0.0.1:${port};\n${PROXY.map((l) => `        ${l}`).join('\n')}\n    }`)
    .join('\n');
  return `${OUR_VHOST}
${http}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name ${domain};
    ssl_certificate     /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
${extra.map((l) => `    ${l}`).join('\n')}${extra.length ? '\n' : ''}    client_max_body_size 20m;

${locations}
}
`;
}

export function vhosts(wl, ports, { ssl = true } = {}) {
  return {
    [wl.site_domain]: vhost(wl.site_domain, [['/', ports.frontend]], { ssl }),
    [wl.admin_domain]: vhost(wl.admin_domain, [['/owner', ports.ownerPanel], ['/', ports.siteAdmin]], {
      ssl,
      // The owner's first sign-in link, as on the parent's admin domain.
      extra: ['add_header X-Frame-Options SAMEORIGIN always;', 'location = /owner-first-login { return 301 https://$host/owner/login; }'],
    }),
    [wl.api_domain]: vhost(wl.api_domain, [['/', ports.gateway]], { ssl }),
  };
}

/** [the site file, its sites-enabled link]. */
export const vhostFiles = (domain) => [path.join(SITES_AVAILABLE, `wl-${assertDomain(domain)}`), path.join(SITES_ENABLED, `wl-${domain}`)];

/** `nginx -t` output → the problem with one of `domains`, if any (a duplicate server_name is only a warning there). */
export function nginxConflict(output, domains) {
  for (const domain of domains) {
    if (String(output).includes(`conflicting server name "${domain}"`)) return `another nginx site already serves ${domain}`;
  }
  return null;
}

// ── Redis server ──────────────────────────────────────────────────────────

/** The parent's Redis server (this machine's other sites may run their own): the copies share it, one database each. */
export const redisOf = (parentEnv) => ({
  host: parentEnv.REDIS_HOST || '127.0.0.1',
  port: Number(parentEnv.REDIS_PORT || 6379),
  password: parentEnv.REDIS_PASSWORD || '',
});

export const redisUrl = ({ host, port, password }, db) => `redis://${password ? `:${encodeURIComponent(password)}@` : ''}${host}:${port}/${db}`;
