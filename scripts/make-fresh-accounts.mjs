#!/usr/bin/env node
/**
 * Fill a FRESHLY SEEDED database with one working account per role, through the real APIs,
 * and write every login to CREDENTIALS.local.md (repo root, mode 0600, gitignored).
 *
 *   node scripts/make-fresh-accounts.mjs
 *
 * Needs: the stack running (./run.sh start), a database made by `db cli create/migrate/seed` +
 * `seed-data.js` (NO --demo), and RATE_LIMIT_ENABLED=false while it runs (it signs in ~16 times
 * from one address; the staff sign-in bucket allows 12 per 15 min). Switch it back on afterwards.
 *
 * What it makes (each staff account is created BY its parent, with its parent's token, so the
 * closure table, float row and role checks are exactly the panel's):
 *
 *   Super Admin   the bootstrap one (SEED_ADMIN_EMAIL): first-login password replaced, transaction
 *                 password set; SEED_ADMIN_PASSWORD in backend/.env is updated to the final one
 *   └ Admin
 *     ├ Executive      (read-only support; under Admin, as the platform's own demo tree does)
 *     └ Sub Admin
 *       └ Super Master   (created by Admin with parentId = Sub Admin: Sub Admin has no staff:write)
 *         └ Master
 *           └ Agent
 *               └ agent player     created by the Agent (POST /admin/players) → in the agent's tree
 *   direct player    POST /user/auth/register, no referral, in no tree
 *
 * Every staff account replaces the password its parent chose (PATCH /admin/staff/password), so the
 * file holds the final working passwords, and sets a transaction password. Passwords come from
 * crypto.randomBytes. NOTHING SECRET IS PRINTED: the only output is "wrote N accounts" (or the
 * failing step, without values). Refuses to run when staff other than the bootstrap one exist.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { URLS } from './stack.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const OUT = path.join(ROOT, 'CREDENTIALS.local.md')
const BE_ENV = path.join(ROOT, 'backend', '.env')
const API = `${process.env.GATEWAY_URL || URLS.gateway}/api/v1`

const password = () => `${crypto.randomBytes(18).toString('base64url')}aZ9!`
const txnPassword = () => `${crypto.randomBytes(12).toString('base64url')}7`

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

async function main() {
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
  if (!saToken) saToken = (await staffLogin('super admin re-login', saEmail, saPassword)).token

  const existing = await call('staff list', 'GET', '/admin/staff?limit=50', { token: saToken })
  const rows = Array.isArray(existing) ? existing : existing?.items ?? existing?.rows ?? existing?.staff ?? []
  if (rows.filter(r => (r.email ?? '') !== saEmail).length) {
    throw new Error('staff other than the bootstrap super admin already exist — run on a freshly seeded database')
  }

  const saTxn = txnPassword()
  await call('super admin transaction password', 'POST', '/admin/auth/transaction-password', {
    token: saToken,
    body: { currentPassword: saPassword, transactionPassword: saTxn },
  })
  const saMe = await staffLogin('super admin check', saEmail, saPassword)
  accounts.push({
    key: 'superadmin', role: 'Super Admin', url: `${URLS.siteAdmin}/login`, login: saEmail, password: saPassword, tx: saTxn,
    id: saMe.actor?.staffId,
    note: 'Root of the staff tree (bootstrap account from `db cli seed`). Whole site: every player, every staff account, config, reports, money.',
  })

  // ── The hierarchy, each account made by its parent ──────────────────────
  // Role ids and names from the roles seed (levels from STAFF_LEVELS), not copied by hand.
  const { ROLES } = require(path.join(ROOT, 'backend/packages/db/seeders/001-roles-and-admin.js'))
  const roleId = name => {
    const id = ROLES.find(r => r.name === name)?.id
    if (!id) throw new Error(`no role named ${name} in the roles seed`)
    return id
  }

  const TREE = [
    { key: 'admin', role: 'Admin', parent: 'superadmin', email: 'admin@hge.local',
      note: 'Under Super Admin. Full operations: players, staff below it, payments, reports; no role management.' },
    { key: 'executive', role: 'Executive', parent: 'admin', email: 'executive@hge.local',
      note: 'Under Admin. Read-only support account (sees what Admin sees, changes nothing).' },
    { key: 'subadmin', role: 'Sub Admin', parent: 'admin', email: 'subadmin@hge.local',
      note: 'Under Admin. Player operations, payments and reporting for its subtree.' },
    // A Sub Admin has no `staff:write` (LEVEL_PERMISSIONS), so its Admin creates the Super Master
    // under it with `parentId` — the panel's own way (a creator may place an account under one of
    // its descendants).
    { key: 'supermaster', role: 'Super Master', parent: 'subadmin', by: 'admin', email: 'supermaster@hge.local',
      note: 'Under Sub Admin. Manages masters and their downstream players (agent tree).' },
    { key: 'master', role: 'Master', parent: 'supermaster', email: 'master@hge.local',
      note: 'Under Super Master. Manages agents and their players (agent tree).' },
    { key: 'agent', role: 'Agent', parent: 'master', email: 'agent@hge.local',
      note: 'Under Master. Creates and funds its own players; owns `agent_player`. Float starts at 0.' },
  ]
  const tokens = { superadmin: saToken }

  for (const s of TREE) {
    const parent = accounts.find(a => a.key === s.parent)
    const temp = password()
    await call(`create ${s.role}`, 'POST', '/admin/staff', {
      token: tokens[s.by ?? s.parent],
      body: {
        name: s.key, email: s.email, password: temp, roleId: roleId(s.role),
        ...(s.by ? { parentId: Number(parent.id) } : {}),
      },
    })
    const firstLogin = await staffLogin(`${s.role} first login`, s.email, temp)
    const final = password()
    await call(`${s.role} password change`, 'PATCH', '/admin/staff/password', {
      token: firstLogin.token,
      body: { oldPassword: temp, newPassword: final },
    })
    const session = await staffLogin(`${s.role} login`, s.email, final)
    if (session.mustChangePassword || session.firstLogin) throw new Error(`${s.role}: still asked to change the password`)
    let tx = txnPassword()
    try {
      await call(`${s.role} transaction password`, 'POST', '/admin/auth/transaction-password', {
        token: session.token,
        body: { currentPassword: final, transactionPassword: tx },
      })
    } catch (error) {
      if (s.role !== 'Executive') throw error
      tx = '' // a read-only account that may not set one: recorded as "—"
    }
    tokens[s.key] = session.token
    accounts.push({
      key: s.key, role: s.role, url: `${URLS.siteAdmin}/login`, login: s.email, password: final, tx,
      id: session.actor?.staffId, note: s.note, parentLogin: parent.login,
    })
  }

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
  const directPw = password()
  await call('direct player register', 'POST', '/user/auth/register', {
    body: { username: 'direct_player', email: 'direct_player@hge.local', password: directPw },
  })
  accounts.push({
    key: 'direct_player', role: 'Direct player', url: `${URLS.frontend}/login/signin`, login: 'direct_player', password: directPw, tx: '',
    note: 'Self-registered through the public sign-up, no referral, in no agent tree (house player). Every player page; email `direct_player@hge.local` also signs in. Balance 0, KYC not done.',
  })
}

function writeFile() {
  const ownerEnv = readEnv(path.join(ROOT, 'owner-panel', '.env.local'))
  const cell = v => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const code = v => (v ? '`' + cell(v).replace(/`/g, "'") + '`' : '—')
  const rows = [
    {
      role: 'Owner', url: `${URLS.ownerPanel}/login`, login: ownerEnv.OWNER_USERNAME, password: ownerEnv.OWNER_PASSWORD, tx: '',
      note: 'Ours only, never handed to the client. Features & plan, policies, coins, branding, audit. Config login (owner-panel/.env.local), no DB row.',
    },
    ...accounts,
  ]
  const tree = accounts
    .filter(a => a.parentLogin)
    .map(a => `${a.role} \`${a.login}\` ← ${accounts.find(p => p.login === a.parentLogin)?.role}`)
  const doc = `# Credentials (LOCAL ONLY)

Generated by \`node scripts/make-fresh-accounts.mjs\` on ${new Date().toISOString().slice(0, 10)}, on a freshly wiped
and seeded \`cfz_hash_game_exchange\`. Gitignored, mode 0600: never commit, paste or share.
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

Staff sign in on the site admin only, players on the player site only. The transaction password is
asked before a transfer, a wallet adjust or a setting change. Every password below is final (the
first-login change is already done).

Staff tree: Super Admin → Admin → Sub Admin → Super Master → Master → Agent → agent_player; Executive
sits under Admin. (${tree.join('; ')})

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
