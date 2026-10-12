#!/usr/bin/env node
/**
 * Write the local env files for this client's stack:
 *
 *   backend/.env              from backend/.env.example + ports, DB, origins, owner pull, fresh secrets
 *   admin/.env.local          gateway URL, site key/name, session cookie name, port
 *   owner-panel/.env.local    owner login, session secret, shared secret, site URLs, port
 *   (then owner-panel/scripts/owner-keys.mjs adds the Ed25519 pair to owner-panel + backend)
 *
 *   node scripts/make-env.mjs            create what is missing; keep every secret already set
 *   node scripts/make-env.mjs --rotate   generate NEW values for every secret (sessions and 2FA enrolments die)
 *   node scripts/make-env.mjs --dev-no-rate-limit
 *                                        write RATE_LIMIT_ENABLED=false — LOCAL TESTING ONLY, for scripted
 *                                        runs that send hundreds of logins from one address. The default
 *                                        is true, which is what a handover must ship.
 *
 * Secrets are generated here with crypto.randomBytes and written straight to the files
 * (mode 600). NO VALUE IS EVER PRINTED — only variable names. Third-party provider keys
 * (game aggregators, payment providers, OneSignal, SMTP) are left empty.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { BROWSER_ORIGINS, DB_NAME, PORTS, SITE_KEY, SITE_NAME, SITE_TEMPLATE, URLS } from './stack.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rotate = process.argv.includes('--rotate')
/* Rate limiting is ON unless this flag is passed. Never pass it for an environment reachable
   from the internet — see the "Before handover" checklist in README.md. */
const devNoRateLimit = process.argv.includes('--dev-no-rate-limit')
const hex = (n = 32) => crypto.randomBytes(n).toString('hex')
/** A password a person can type: 24 url-safe chars plus a guaranteed upper/lower/digit/symbol. */
const password = () => `${crypto.randomBytes(18).toString('base64url')}aZ9!`

function parse(file) {
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=(.*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
  }
  return out
}

const quote = v => (/[\s#"']/.test(v) ? JSON.stringify(v) : v)

/** Apply `patch` in place (keeping comments and order), appending keys the file does not have. */
function apply(file, patch, header) {
  const lines = fs.existsSync(file) ? fs.readFileSync(file, 'utf8').split('\n') : []
  const seen = new Set()
  const out = lines.map(line => {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=/)
    if (!m || !(m[1] in patch)) return line
    seen.add(m[1])
    return `${m[1]}=${quote(patch[m[1]])}`
  })
  const added = Object.keys(patch).filter(k => !seen.has(k))
  if (added.length) {
    if (header) out.push('', header)
    for (const k of added) out.push(`${k}=${quote(patch[k])}`)
  }
  fs.writeFileSync(file, out.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 })
  fs.chmodSync(file, 0o600)
}

const PLACEHOLDER = /^$|replace[-_ ]?me|change[-_ ]?me|dev-only/i
/** Keep an existing real secret unless --rotate; else make a fresh one. */
const secret = (current, make) => (!rotate && current && !PLACEHOLDER.test(current) ? current : make())

// ── backend/.env ─────────────────────────────────────────────────────────
const beEnv = path.join(ROOT, 'backend', '.env')
if (!fs.existsSync(beEnv)) fs.copyFileSync(path.join(ROOT, 'backend', '.env.example'), beEnv)
const be = parse(beEnv)

const ownerEnv = path.join(ROOT, 'owner-panel', '.env.local')
const owner = parse(ownerEnv)
// One shared secret, the same in both files.
const shared = secret(be.OWNER_SHARED_SECRET || owner.OWNER_SHARED_SECRET, hex)

const backendSecrets = {
  JWT_ACCESS_SECRET: secret(be.JWT_ACCESS_SECRET, hex),
  JWT_REFRESH_SECRET: secret(be.JWT_REFRESH_SECRET, hex),
  JWT_ADMIN_SECRET: secret(be.JWT_ADMIN_SECRET, hex),
  TOTP_ENCRYPTION_KEY: secret(be.TOTP_ENCRYPTION_KEY, hex),
  INTERNAL_API_KEY: secret(be.INTERNAL_API_KEY, hex),
  INTERNAL_KEY_USER_SERVICE: secret(be.INTERNAL_KEY_USER_SERVICE, hex),
  INTERNAL_KEY_ADMIN_SERVICE: secret(be.INTERNAL_KEY_ADMIN_SERVICE, hex),
  INTERNAL_KEY_CASINO_SERVICE: secret(be.INTERNAL_KEY_CASINO_SERVICE, hex),
  INTERNAL_KEY_SPORTS_SERVICE: secret(be.INTERNAL_KEY_SPORTS_SERVICE, hex),
  OWNER_SHARED_SECRET: shared,
  SEED_ADMIN_PASSWORD: secret(be.SEED_ADMIN_PASSWORD === 'ChangeMe!2026' ? '' : be.SEED_ADMIN_PASSWORD, password)
}

apply(beEnv, {
  NODE_ENV: 'development',
  DB_NAME,
  GATEWAY_PORT: String(PORTS.gateway),
  GATEWAY_BIND_HOST: '127.0.0.1',
  USER_SERVICE_PORT: String(PORTS.user),
  ADMIN_SERVICE_PORT: String(PORTS.admin),
  CASINO_SERVICE_PORT: String(PORTS.casino),
  SPORTS_SERVICE_PORT: String(PORTS.sports),
  SPORTS_WORKER_PORT: String(PORTS.sportsWorker),
  USER_WORKER_PORT: String(PORTS.userWorker),
  USER_SERVICE_URL: `http://127.0.0.1:${PORTS.user}`,
  ADMIN_SERVICE_URL: `http://127.0.0.1:${PORTS.admin}`,
  CASINO_SERVICE_URL: `http://127.0.0.1:${PORTS.casino}`,
  SPORTS_SERVICE_URL: `http://127.0.0.1:${PORTS.sports}`,
  CORS_ORIGIN: BROWSER_ORIGINS.join(','),
  SOCKET_ALLOWED_ORIGINS: BROWSER_ORIGINS.join(','),
  PUBLIC_BASE_URL: URLS.gateway,
  PUBLIC_SITE_URL: URLS.frontend,
  PUBLIC_ASSET_URL: `${URLS.gateway}/assets`,
  // Local development only; refused by the platform's production guards.
  STAFF_2FA_REQUIRED_LEVEL: '0',
  // On by default. `--dev-no-rate-limit` turns it off for local scripted testing only.
  RATE_LIMIT_ENABLED: devNoRateLimit ? 'false' : 'true',
  SITE_TEMPLATE,
  OWNER_PANEL_URL: URLS.ownerPanel,
  OWNER_POLL_SECONDS: '15',
  OWNER_SITE_KEY: SITE_KEY,
  // The sportsbook (mssports) boots without its feed and refuses every bet until
  // AVRKHUB_SPORTS_BASE_URL / AVRKHUB_SPORTS_KEY are filled in by hand.
  ...backendSecrets
}, '# ── set by scripts/make-env.mjs ──')

// ── admin/.env.local (no secrets) ────────────────────────────────────────
const adminEnv = path.join(ROOT, 'admin', '.env.local')
apply(adminEnv, {
  API_URL: URLS.gateway,
  NEXT_PUBLIC_SITE_KEY: SITE_KEY,
  NEXT_PUBLIC_SITE_NAME: `${SITE_NAME} Admin`,
  NEXT_PUBLIC_SITE_TAGLINE: 'Operator panel',
  NEXT_PUBLIC_ENV_LABEL: 'localhost',
  SESSION_COOKIE_NAME: `cfz_${SITE_KEY.replace(/[^a-z0-9]/g, '_')}_token`,
  SESSION_MAX_AGE_SECONDS: '28800',
  PORT: String(PORTS.siteAdmin)
})

// ── owner-panel/.env.local ───────────────────────────────────────────────
apply(ownerEnv, {
  OWNER_USERNAME: owner.OWNER_USERNAME || 'owner',
  OWNER_PASSWORD: secret(owner.OWNER_PASSWORD, password),
  OWNER_SESSION_SECRET: secret(owner.OWNER_SESSION_SECRET, hex),
  OWNER_SHARED_SECRET: shared,
  SITE_KEY,
  SITE_NAME,
  SITE_GATEWAY_URL: URLS.gateway,
  SITE_ADMIN_URL: URLS.siteAdmin,
  SITE_FRONTEND_URL: URLS.frontend,
  NEXT_PUBLIC_ENV_LABEL: 'localhost',
  PORT: String(PORTS.ownerPanel)
})

// Ed25519 pair: private half to the owner panel, public half to the backend.
execFileSync('node', [path.join(ROOT, 'owner-panel', 'scripts', 'owner-keys.mjs'), ...(rotate ? ['--force'] : [])], { stdio: 'inherit' })

console.log(`backend/.env, admin/.env.local, owner-panel/.env.local written (mode 600).`)
console.log(`Secrets ${rotate ? 'rotated' : 'kept or generated'}: ${[...Object.keys(backendSecrets), 'OWNER_PASSWORD', 'OWNER_SESSION_SECRET', 'OWNER_SIGNING_KEY/OWNER_VERIFY_KEY'].join(', ')} (values not shown).`)
