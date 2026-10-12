#!/usr/bin/env node
/**
 * Writes CREDENTIALS.local.md at the repo root: every login of this stack, one table per role,
 * with where to sign in and what each account is for.
 *
 *   node scripts/make-credentials-md.mjs [--qa-creds <path/to/creds.json>]
 *
 * Reads (never writes) these local, gitignored files:
 *   backend/.demo-credentials.local.md   demo staff + players (seed-data.js --demo), this site's DB rows only
 *   backend/.env                         SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (bootstrap super admin)
 *   owner-panel/.env.local               OWNER_USERNAME / OWNER_PASSWORD
 *   --qa-creds / QA_CREDS_JSON           optional JSON of the qa_onb_* accounts made by the onboarding QA run
 *
 * The output is mode 0600 and gitignored (root .gitignore). This script prints NO value, only a count.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DB_NAME, URLS } from './stack.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'CREDENTIALS.local.md')

const argQa = process.argv.indexOf('--qa-creds')
const QA_JSON = argQa > 0 ? process.argv[argQa + 1] : process.env.QA_CREDS_JSON || ''

const ADMIN = URLS.siteAdmin + '/login'
const SITE = URLS.frontend + '/login/signin'
const OWNER = URLS.ownerPanel + '/login'

function readEnv(file) {
  const out = {}
  if (!fs.existsSync(file)) return out
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let v = m[2]
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}

/** Rows of backend/.demo-credentials.local.md for this site's database. */
function readDemo(file) {
  if (!fs.existsSync(file)) return []
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(l => l.startsWith('| ') && !l.startsWith('| db |') && !l.startsWith('|---'))
    .map(l => l.split(/(?<!\\)\|/).slice(1, -1).map(v => v.trim().replace(/\\\|/g, '|')))
    .filter(c => c.length >= 8 && (c[0] === DB_NAME || c[0].startsWith(`${DB_NAME}@`)))
    .map(([, kind, login, email, password, role, tx, note]) => ({ kind, login, email, password, role, tx, note }))
}

function readQa(file) {
  if (!file || !fs.existsSync(file)) return {}
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

const cell = v => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
const code = v => (v ? '`' + cell(v).replace(/`/g, "'") + '`' : '—')

const sections = []
let count = 0
function section(title, intro, rows) {
  rows = rows.filter(Boolean)
  if (!rows.length) return
  count += rows.length
  sections.push(
    `## ${title}\n\n${intro ? intro + '\n\n' : ''}| role | sign in at | login / email | password | transaction password | notes |\n|---|---|---|---|---|---|\n` +
      rows.map(r => `| ${cell(r.role)} | ${r.url} | ${code(r.login)} | ${code(r.password)} | ${code(r.tx)} | ${cell(r.note)} |`).join('\n')
  )
}

const ownerEnv = readEnv(path.join(ROOT, 'owner-panel/.env.local'))
const beEnv = readEnv(path.join(ROOT, 'backend/.env'))
const demo = readDemo(path.join(ROOT, 'backend/.demo-credentials.local.md'))
const qa = readQa(QA_JSON)

// ── Owner ─────────────────────────────────────────────────────────────────
section('Owner (owner panel)', 'Ours only — never handed to the client. Listens on 127.0.0.1.', [
  ownerEnv.OWNER_USERNAME && {
    role: 'Owner', url: OWNER, login: ownerEnv.OWNER_USERNAME, password: ownerEnv.OWNER_PASSWORD,
    note: 'Features & plan, Branding, Audit. Config login (no DB row).',
  },
])

// ── Bootstrap super admin ─────────────────────────────────────────────────
section('Super Admin (bootstrap)', 'Created by `db cli seed`. Set the transaction password in Account on first use.', [
  beEnv.SEED_ADMIN_EMAIL && {
    role: 'Super Admin', url: ADMIN, login: beEnv.SEED_ADMIN_EMAIL, password: beEnv.SEED_ADMIN_PASSWORD,
    note: 'Whole site; root of the staff tree.',
  },
])

// ── Demo staff, one table per role in tree order ──────────────────────────
const TREE = {
  demo_superadmin: 'root of the demo tree',
  demo_admin: 'under demo_superadmin',
  demo_executive: 'under demo_admin',
  demo_subadmin: 'under demo_admin',
  demo_supermaster: 'under demo_subadmin',
  demo_master: 'under demo_supermaster',
  demo_agent: 'under demo_master',
  demo_agent2: 'under demo_master',
}
const staff = demo.filter(r => r.kind === 'staff')
const nameOf = r => (r.email || r.login).split('@')[0]
for (const name of Object.keys(TREE)) {
  const r = staff.find(s => nameOf(s) === name)
  if (!r) continue
  section(`${r.role} — ${name}`, '', [
    { role: r.role, url: ADMIN, login: r.email || r.login, password: r.password, tx: r.tx, note: [TREE[name], r.note].filter(Boolean).join('; ') },
  ])
}
const otherStaff = staff.filter(s => !TREE[nameOf(s)])
section('Other demo staff', '', otherStaff.map(r => ({ role: r.role, url: ADMIN, login: r.email || r.login, password: r.password, tx: r.tx, note: r.note })))

// ── QA onboarding agent ───────────────────────────────────────────────────
const pick = (o, re) => Object.entries(o || {}).find(([k]) => re.test(k))?.[1]
const qaStaff = Object.entries(qa).filter(([k]) => /agent$|master$|admin$/.test(k) && !/player/.test(k))
section('QA onboarding agent', 'Made through the real admin UI by the onboarding QA run.', qaStaff.map(([k, v]) => ({
  role: 'Agent', url: ADMIN, login: v.email || k,
  password: v.password, tx: pick(v, /^(transactionPassword|txn|tx)/i),
  note: `${k}; created by demo_master (under demo_master); owns qa_onb_player_agent`,
})))

// ── Players ───────────────────────────────────────────────────────────────
const players = demo.filter(r => r.kind.startsWith('player'))
const prow = (r, extra) => ({ role: 'Player', url: SITE, login: r.login, password: r.password, note: [extra, r.note].filter(Boolean).join('; ') })
const used = new Set()
function playerGroup(title, intro, test, extra) {
  const rows = players.filter(r => !used.has(r.login) && test(r))
  rows.forEach(r => used.add(r.login))
  section(title, intro, rows.map(r => prow(r, extra)))
}
playerGroup('Players — direct', 'Self-registered style players (no agent); every player page available.',
  r => ['demo_fresh', 'demo_depositor', 'demo_multicoin', 'demo_bonus', 'demo_notips'].includes(r.login), 'direct')
playerGroup('Players — VIP tiers', '', r => r.login.startsWith('demo_vip_'), 'direct')
playerGroup('Players — affiliate', '', r => r.login === 'demo_affiliate' || r.login.startsWith('demo_referee'), 'direct')
playerGroup('Players — KYC rejected', 'Withdraw is gated by KYC.', r => r.login === 'demo_kyc_rejected', 'direct')
playerGroup('Players — vault', '', r => r.login === 'demo_vault', 'direct')
playerGroup('Players — agent tree', 'Owned by an agent: deposit/withdraw/promo pages are hidden; the agent funds them.',
  r => r.kind.includes('agent'), 'agent tree')
playerGroup('Players — other demo', '', () => true, '')

const qaPlayers = Object.entries(qa).filter(([k]) => /player/.test(k))
section('Players — QA onboarding', '', qaPlayers.map(([k, v]) => ({
  role: 'Player', url: SITE, login: k, password: v.password,
  note: /agent/.test(k) ? 'agent tree: created by qa_onb_agent' : 'direct: self-registered through Sign Up',
})))

const doc = `# Credentials (LOCAL ONLY)

Generated by \`node scripts/make-credentials-md.mjs\` on ${new Date().toISOString().slice(0, 10)}.
Gitignored, mode 0600 — never commit, paste or share. Regenerate after a re-seed or a password change.

- Owner panel: ${URLS.ownerPanel} · Site admin: ${URLS.siteAdmin} · Player site: ${URLS.frontend}
- Staff sign in on the site admin only; players on the player site only.
- The transaction password is asked before a transfer, a wallet adjust or a setting change.

${sections.join('\n\n')}
`

fs.writeFileSync(OUT, doc, { mode: 0o600 })
fs.chmodSync(OUT, 0o600)
console.log(`wrote ${count} accounts`)
