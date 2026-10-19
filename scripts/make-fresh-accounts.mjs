#!/usr/bin/env node
/**
 * Fill a database that has only the bootstrap Super Admin with one working account per role,
 * through the real APIs, and write every login to CREDENTIALS.local.md (repo root, mode 0600,
 * gitignored).
 *
 *   node scripts/make-fresh-accounts.mjs           # on a freshly seeded / already wiped DB
 *   node scripts/make-fresh-accounts.mjs --wipe    # FIRST runs scripts/wipe-accounts.sql (deletes
 *                                                  # every account but staff id 1 and all activity)
 *                                                  # and clears the ibitplay:rl:* Redis keys
 *
 * Take a pg_dump before --wipe. Needs the stack running (./run.sh start). The staff sign-in rate
 * limit counts failures only, so a clean run stays inside it; on a 429 clear ibitplay:rl:staff-auth:*.
 *
 * The ladder is the backend's CHILD_LEVELS (@ibitplay/auth): every level creates ONLY the level
 * directly below it, each with its own token, so the closure table, float row and role checks are
 * exactly the panel's:
 *
 *   Super Admin   the bootstrap one (SEED_ADMIN_EMAIL): password replaced with a fresh random one;
 *                 SEED_ADMIN_PASSWORD in backend/.env is updated to it
 *   └ Admin
 *     ├ Executive      read-only sub-login (POST /admin/access/executives by the Admin; an executive is
 *     │                not a staff row, signs in on the site admin's "Executive" tab with a username)
 *     └ Sub Admin
 *       └ Super Master   (made by the Sub Admin)
 *         └ Master
 *           └ Agent
 *               └ agent player     made by the Agent (POST /admin/players) → in the agent's tree
 *   direct player    POST /user/auth/register, no referral, in no tree
 *
 * TXN_PASSWORD_MODE=login (the backend default): the transaction password IS the login password,
 * so none is set (setting one answers 409) and the file says "same as login password".
 *
 * Every staff account replaces the password its parent chose (PATCH /admin/staff/password), so the
 * file holds the final working passwords. Passwords come from crypto.randomBytes. NOTHING SECRET IS
 * PRINTED: the only output is "wrote N accounts" (or the failing step, without values). Refuses to
 * run when staff other than the bootstrap one exist.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { URLS } from './stack.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const OUT = path.join(ROOT, 'CREDENTIALS.local.md')
const BE_ENV = path.join(ROOT, 'backend', '.env')
const API = `${process.env.GATEWAY_URL || URLS.gateway}/api/v1`
const SAME_AS_LOGIN = 'same as login password'

const password = () => `${crypto.randomBytes(18).toString('base64url')}aZ9!`

function readEnv(file) {
  const out = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_0-9]+)\s*=(.*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1')
  }
  return out
}

function setEnv(file, key, value) {
  const quoted = /[\s#"']/.test(value) ? JSON.stringify(value) : value
  let text = fs.readFileSync(file, 'utf8')
  const re = new RegExp(`^${key}=.*$`, 'm')
  text = re.test(text) ? text.replace(re, () => `${key}=${quoted}`) : `${text.replace(/\n*$/, '\n')}${key}=${quoted}\n`
  fs.writeFileSync(file, text, { mode: 0o600 })
  fs.chmodSync(file, 0o600)
}

/** Call the gateway; throw with the step name and error code only (never a body we sent). */
async function call(step, method, url, { token, body } = {}) {
  const res = await fetch(`${API}${url}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json?.success === false) {
    throw new Error(`${step}: ${res.status} ${json?.error?.code ?? ''} ${json?.error?.message ?? ''}`.trim())
  }
  return json?.data ?? json
}

const staffLogin = async (step, email, pw) => {
  const d = await call(step, 'POST', '/admin/auth/login', { body: { email, password: pw } })
  if (!d?.token) throw new Error(`${step}: no token`)
  return d
}

const env = readEnv(BE_ENV)
const accounts = []

/** --wipe: scripts/wipe-accounts.sql in one transaction, then the Redis rate-limit keys. */
function wipe() {
  const sql = spawnSync('psql', [
    '-h', env.DB_HOST || '127.0.0.1', '-p', env.DB_PORT || '5432', '-U', env.DB_USER || 'postgres',
    '-d', env.DB_NAME, '-v', 'ON_ERROR_STOP=1', '-q', '-f', path.join(ROOT, 'scripts', 'wipe-accounts.sql'),
  ], { env: { ...process.env, PGPASSWORD: env.DB_PASSWORD ?? '' }, encoding: 'utf8' })
  if (sql.status !== 0) throw new Error(`wipe: psql exited ${sql.status}`)
  const redis = env.REDIS_URL ? ['-u', env.REDIS_URL] : []
  const keys = spawnSync('redis-cli', [...redis, '--scan', '--pattern', `${env.REDIS_PREFIX || 'ibitplay'}:rl:*`], { encoding: 'utf8' })
  const list = (keys.stdout || '').split('\n').filter(Boolean)
  if (list.length) spawnSync('redis-cli', [...redis, 'del', ...list])
}

async function main() {
  if (process.argv.includes('--wipe')) wipe()

  // ── Super Admin (bootstrap) ─────────────────────────────────────────────
  const saEmail = env.SEED_ADMIN_EMAIL
  const first = await staffLogin('super admin login', saEmail, env.SEED_ADMIN_PASSWORD)
  const saPassword = password()
  let saToken
  if (first.firstLogin || first.mustChangePassword) {
    const d = await call('super admin first-login password', 'POST', '/admin/auth/first-login-password', {
      body: { email: saEmail, currentPassword: env.SEED_ADMIN_PASSWORD, newPassword: saPassword },
    })
    saToken = d.token
  } else {
    await call('super admin password', 'PATCH', '/admin/staff/password', {
      token: first.token,
      body: { oldPassword: env.SEED_ADMIN_PASSWORD, newPassword: saPassword },
    })
  }
  // The seeder only reads it when it creates the account; keep .env telling the truth.
  setEnv(BE_ENV, 'SEED_ADMIN_PASSWORD', saPassword)
  const saMe = await staffLogin('super admin re-login', saEmail, saPassword)
  if (!saToken) saToken = saMe.token
  accounts.push({
    key: 'superadmin', role: 'Super Admin', url: `${URLS.siteAdmin}/login`, login: saEmail, password: saPassword, tx: SAME_AS_LOGIN,
    id: saMe.actor?.staffId,
    note: 'Root of the staff tree (bootstrap account from `db cli seed`). Whole site: every player, every staff account, config, reports, money.',
  })

  const existing = await call('staff list', 'GET', '/admin/staff?limit=50', { token: saToken })
  const rows = Array.isArray(existing) ? existing : existing?.items ?? existing?.rows ?? existing?.staff ?? []
  if (rows.filter(r => (r.email ?? '') !== saEmail).length) {
    throw new Error('staff other than the bootstrap super admin already exist — run with --wipe, or on a freshly seeded database')
  }

  // ── The hierarchy, each account made by its parent (CHILD_LEVELS) ───────
  // Role ids and names from the roles seed (levels from STAFF_LEVELS), not copied by hand.
  const { ROLES } = require(path.join(ROOT, 'backend/packages/db/seeders/001-roles-and-admin.js'))
  const roleId = name => {
    const id = ROLES.find(r => r.name === name)?.id
    if (!id) throw new Error(`no role named ${name} in the roles seed`)
    return id
  }

  const TREE = [
    { key: 'admin', role: 'Admin', parent: 'superadmin', email: 'admin@hge.local',
      note: 'Under Super Admin. Full operations: players, staff below it, payments, reports; no role management. Creates Sub Admins and executives.' },
    { key: 'subadmin', role: 'Sub Admin', parent: 'admin', email: 'subadmin@hge.local',
      note: 'Under Admin. Player operations, payments and reporting for its subtree; creates Super Masters.' },
    { key: 'supermaster', role: 'Super Master', parent: 'subadmin', email: 'supermaster@hge.local',
      note: 'Under Sub Admin (made by it). Manages masters and their downstream players (agent tree).' },
    { key: 'master', role: 'Master', parent: 'supermaster', email: 'master@hge.local',
      note: 'Under Super Master. Manages agents and their players (agent tree).' },
    { key: 'agent', role: 'Agent', parent: 'master', email: 'agent@hge.local',
      note: 'Under Master. Creates and funds its own players; owns `agent_player`. Float starts at 0.' },
  ]
  const tokens = { superadmin: saToken }
  const actors = { superadmin: saMe.actor }

  for (const s of TREE) {
    const parent = accounts.find(a => a.key === s.parent)
    const temp = password()
    await call(`create ${s.role}`, 'POST', '/admin/staff', {
      token: tokens[s.parent],
      body: { name: s.key, email: s.email, password: temp, roleId: roleId(s.role) },
    })
    const firstLogin = await staffLogin(`${s.role} first login`, s.email, temp)
    const final = password()
    if (firstLogin.firstLogin && !firstLogin.mustChangePassword) {
      await call(`${s.role} first-login password`, 'POST', '/admin/auth/first-login-password', {
        body: { email: s.email, currentPassword: temp, newPassword: final },
      })
    } else {
      await call(`${s.role} password change`, 'PATCH', '/admin/staff/password', {
        token: firstLogin.token,
        body: { oldPassword: temp, newPassword: final },
      })
    }
    const session = await staffLogin(`${s.role} login`, s.email, final)
    if (session.mustChangePassword || session.firstLogin) throw new Error(`${s.role}: still asked to change the password`)
    tokens[s.key] = session.token
    actors[s.key] = session.actor
    accounts.push({
      key: s.key, role: s.role, url: `${URLS.siteAdmin}/login`, login: s.email, password: final, tx: SAME_AS_LOGIN,
      id: session.actor?.staffId, note: s.note, parentLogin: parent.login,
    })
  }

  // ── Executive: a read-only sub-login of the Admin ───────────────────────
  const readOnly = (actors.admin?.permissions ?? []).filter(p => /:read$/.test(p))
  if (!readOnly.length) throw new Error('executive: the Admin holds no :read permission to grant')
  const execPw = password()
  const execUser = 'executive.hge'
  await call('create Executive', 'POST', '/admin/access/executives', {
    token: tokens.admin,
    body: { username: execUser, password: execPw, permissions: readOnly },
  })
  const execSession = await call('Executive login', 'POST', '/admin/auth/executive/login', {
    body: { username: execUser, password: execPw },
  })
  if (!execSession?.token) throw new Error('Executive login: no token')
  accounts.push({
    key: 'executive', role: 'Executive', url: `${URLS.siteAdmin}/login (Executive tab)`, login: execUser, password: execPw, tx: SAME_AS_LOGIN,
    note: 'Sub-login of `admin@hge.local` (Admin), read-only grants only (every `:read` the Admin holds). Not a staff row: sign in on the "Executive" tab with this username (an executive username cannot hold an @).',
    parentLogin: 'admin@hge.local',
  })

  // ── Agent player: made by the Agent, so it sits in the agent's tree ─────
  const agentPlayerPw = password()
  await call('agent player create', 'POST', '/admin/players', {
    token: tokens.agent,
    body: { username: 'agent_player', password: agentPlayerPw, initialBalance: '0' },
  })
  accounts.push({
    key: 'agent_player', role: 'Agent player', url: `${URLS.frontend}/login/signin`, login: 'agent_player', password: agentPlayerPw, tx: '',
    note: 'Created by `agent@hge.local` (Agent) → in the agent tree. Deposit, withdraw, swap, promotions and vault are hidden; the agent funds and collects. Balance 0.',
  })

  // ── Direct player: the public sign-up, no referral ──────────────────────
  // A B2B site (owner policy business_model=b2b) closes public sign-up; the owner's choice is left
  // alone and the Super Admin makes a house player instead (owned by level 1 → not in the agent tree).
  const directPw = password()
  let viaSignup = true
  try {
    await call('direct player register', 'POST', '/user/auth/register', {
      body: { username: 'direct_player', email: 'direct_player@hge.local', password: directPw },
    })
  } catch (error) {
    if (!/SITE_POLICY_CHANNEL_CLOSED/.test(error.message)) throw error
    viaSignup = false
    await call('direct player create (house)', 'POST', '/admin/players', {
      token: saToken,
      body: { username: 'direct_player', password: directPw, initialBalance: '0' },
    })
  }
  accounts.push({
    key: 'direct_player', role: 'Direct player', url: `${URLS.frontend}/login/signin`, login: 'direct_player', password: directPw, tx: '',
    note: viaSignup
      ? 'Self-registered through the public sign-up, no referral, in no agent tree (house player). Every player page; email `direct_player@hge.local` also signs in. Balance 0, KYC not done.'
      : 'House player made by the Super Admin (public sign-up is closed: the owner set this site to B2B), no referral, in no agent tree. Deposit, withdraw, swap and vault open; promotions off for everyone on a B2B site. Balance 0, KYC not done.',
  })
}

function writeFile() {
  const ownerEnv = readEnv(path.join(ROOT, 'owner-panel', '.env.local'))
  const cell = v => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const code = v => (v === SAME_AS_LOGIN ? v : v ? '`' + cell(v).replace(/`/g, "'") + '`' : '—')
  const ORDER = ['superadmin', 'admin', 'executive', 'subadmin', 'supermaster', 'master', 'agent', 'agent_player', 'direct_player']
  const made = [...accounts].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key))
  const today = new Date().toLocaleDateString('en-CA')
  const rows = [
    {
      role: 'Owner', url: `${URLS.ownerPanel}/login`, login: ownerEnv.OWNER_USERNAME, password: ownerEnv.OWNER_PASSWORD, tx: '',
      note: 'Ours only, never handed to the client. Features & plan, policies, coins, branding, audit. Config login (owner-panel/.env.local), no DB row.',
    },
    ...made,
  ]
  const tree = made
    .filter(a => a.parentLogin)
    .map(a => `${a.role} \`${a.login}\` ← ${accounts.find(p => p.login === a.parentLogin)?.role}`)
  const doc = `# Credentials (LOCAL ONLY)

Generated by \`node scripts/make-fresh-accounts.mjs\` on ${today}, after a cleanup: every old account and all
their activity were wiped from \`parker567\` (\`scripts/wipe-accounts.sql\`; platform data kept) and
this tree was made fresh through the real APIs. Gitignored, mode 0600: never commit, paste or share.
Check them all with \`node scripts/check-credentials.mjs\` (prints OK/FAIL only).

## How to run

\`\`\`bash
./run.sh start      # backend (gateway :4700), site admin, owner panel, frontend
./run.sh status
./run.sh stop
\`\`\`

- Owner panel: ${URLS.ownerPanel} (127.0.0.1 only)
- Site admin (all staff): ${URLS.siteAdmin}
- Player site: ${URLS.frontend}
- Gateway: ${URLS.gateway}

Staff sign in on the site admin only (executives on its "Executive" tab, with a username), players on
the player site only. The transaction password is asked before a transfer, a wallet adjust or a setting
change; this backend runs TXN_PASSWORD_MODE=login, so it is the account's own login password. Every
password below is final (the first-login change is already done). Balances all start at 0.

Staff tree (each level made by the one above it, CHILD_LEVELS): Super Admin → Admin → Sub Admin → Super
Master → Master → Agent → agent_player; Executive is a read-only sub-login of Admin. (${tree.join('; ')})

| role | sign in at | login / email | password | transaction password | notes |
|---|---|---|---|---|---|
${rows.map(r => `| ${cell(r.role)} | ${r.url} | ${code(r.login)} | ${code(r.password)} | ${code(r.tx)} | ${cell(r.note)} |`).join('\n')}
`
  fs.writeFileSync(OUT, doc, { mode: 0o600 })
  fs.chmodSync(OUT, 0o600)
  return rows.length
}

try {
  await main()
} catch (error) {
  // Keep what was made, so no account is left with a password nobody knows.
  const n = writeFile()
  console.error(`FAILED at ${error.message} (wrote ${n} accounts so far)`)
  process.exit(1)
}
console.log(`wrote ${writeFile()} accounts`)
