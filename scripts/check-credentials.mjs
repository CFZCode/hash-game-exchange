#!/usr/bin/env node
/**
 * Sign every account in CREDENTIALS.local.md in, through the real APIs, and print OK / FAIL per
 * check. NEVER prints a password, a token or any other value from the file.
 *
 *   node scripts/check-credentials.mjs
 *
 * Checks:
 *   owner        owner panel login (POST :3085/api/auth/login)
 *   staff        admin login (no forced password change left) + its transaction password verifies
 *                (admin-service's internal check, the one user-service calls; a wrong one is refused)
 *                + the same login is REFUSED by the player API
 *   players      player login + /user/auth/me capabilities: the agent player has every agent-player
 *                restriction (all false), the direct player none
 *   tree scope   the Agent sees only the agent player; the Super Admin sees both players
 *
 * About 7 staff + 9 player sign-ins: inside the default rate limits on a fresh backend.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { URLS } from './stack.config.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API = `${process.env.GATEWAY_URL || URLS.gateway}/api/v1`

const beEnv = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, 'backend/.env'), 'utf8').split('\n')
    .map(l => l.match(/^\s*([A-Z_0-9]+)\s*=(.*)$/)).filter(Boolean).map(m => [m[1], m[2].trim().replace(/^"(.*)"$/, '$1')])
)
const ADMIN_SVC = beEnv.ADMIN_SERVICE_URL || 'http://127.0.0.1:4702'
// Sent only to admin-service on this host, as user-service does; never printed.
const INTERNAL = { 'x-internal-service': 'user-service', 'x-internal-key': beEnv.INTERNAL_KEY_USER_SERVICE || beEnv.INTERNAL_API_KEY || '' }

function rows() {
  const lines = fs.readFileSync(path.join(ROOT, 'CREDENTIALS.local.md'), 'utf8').split('\n').filter(l => l.startsWith('| '))
  const head = lines[0].split(/(?<!\\)\|/).map(c => c.trim())
  const at = n => head.indexOf(n)
  return lines.slice(1).filter(l => !l.startsWith('|---')).map(l => {
    const c = l.split(/(?<!\\)\|/).map(x => x.trim().replace(/\\\|/g, '|'))
    const v = s => (s === '—' ? '' : s.replace(/^`|`$/g, ''))
    const pw = v(c[at('password')])
    const tx = v(c[at('transaction password')])
    // TXN_PASSWORD_MODE=login: the file says so instead of repeating the password.
    return { role: c[at('role')], login: v(c[at('login / email')]), password: pw, tx: tx === 'same as login password' ? pw : tx }
  })
}

async function post(url, body, token, extra = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: await res.json().catch(() => ({})) }
}
async function get(url, token) {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  return { status: res.status, json: await res.json().catch(() => ({})) }
}

const results = []
const report = (name, ok, why = '') => results.push({ name, ok, why })

const all = rows()
const staffRoles = ['Super Admin', 'Admin', 'Sub Admin', 'Executive', 'Super Master', 'Master', 'Agent']
const tokens = {}

// ── Owner ─────────────────────────────────────────────────────────────────
for (const r of all.filter(r => r.role === 'Owner')) {
  const { status, json } = await post(`${URLS.ownerPanel}/api/auth/login`, { username: r.login, password: r.password })
  report(`Owner ${r.login}: owner panel login`, status === 200 && json?.success === true, `${status}`)
}

// ── Staff ─────────────────────────────────────────────────────────────────
for (const r of all.filter(r => staffRoles.includes(r.role))) {
  // An executive is a sub-login (no staff row): username sign-in, acting as its parent's role.
  const isExec = r.role === 'Executive'
  const { status, json } = isExec
    ? await post(`${API}/admin/auth/executive/login`, { username: r.login, password: r.password })
    : await post(`${API}/admin/auth/login`, { email: r.login, password: r.password })
  const d = json?.data ?? {}
  const ok = status === 200 && d.token && !d.mustChangePassword && !d.firstLogin &&
    (isExec ? Boolean(d.actor?.executiveId) : d.actor?.roleName === r.role)
  report(`${r.role} ${r.login}: ${isExec ? 'executive' : 'admin'} login (role ${d.actor?.roleName ?? '?'})`, Boolean(ok), `${status} ${json?.error?.code ?? ''}`)
  if (ok) tokens[r.role] = d.token
  if (ok && r.tx) {
    // A pure check (no write): the admin-service route user-service calls before a money move.
    const check = tx => post(`${ADMIN_SVC}/internal/admin/auth/transaction-password/check`,
      { staffId: d.actor.staffId, transactionPassword: tx, ...(isExec ? { executiveId: d.actor.executiveId } : {}) }, null, INTERNAL)
    const right = await check(r.tx)
    const wrong = await check(`${r.tx}x`)
    report(`${r.role} ${r.login}: transaction password verifies`, right.status === 200 && right.json?.data?.verified === true && wrong.status === 403,
      `${right.status}/${wrong.status} ${right.json?.error?.code ?? ''}`)
  }
  const asPlayer = await post(`${API}/user/auth/login`, { identifier: r.login, password: r.password })
  report(`${r.role} ${r.login}: refused on the player API`, asPlayer.status >= 400 && !asPlayer.json?.data?.accessToken, `${asPlayer.status}`)
}

// ── Players ───────────────────────────────────────────────────────────────
const RESTRICTED = ['promotions', 'vault', 'deposit', 'swap', 'withdraw']
for (const r of all.filter(r => /player/i.test(r.role))) {
  const { status, json } = await post(`${API}/user/auth/login`, { identifier: r.login, password: r.password })
  const token = json?.data?.accessToken ?? json?.data?.tokens?.accessToken ?? json?.data?.token
  report(`${r.role} ${r.login}: player login`, status === 200 && Boolean(token), `${status} ${json?.error?.code ?? ''}`)
  if (!token) continue
  const me = await get(`${API}/user/auth/me`, token)
  const caps = me.json?.data?.capabilities ?? me.json?.data?.user?.capabilities ?? null
  if (/agent/i.test(r.role)) {
    const off = caps ? RESTRICTED.filter(k => caps[k] === false) : []
    report(`${r.role} ${r.login}: capabilities restricted (${off.join(',') || 'none'} off)`, off.length === RESTRICTED.length)
  } else {
    // A B2B site switches promotions off for every player; nothing else may be off.
    const off = caps ? Object.keys(caps).filter(k => caps[k] === false && k !== 'promotions') : ['(missing)']
    report(`${r.role} ${r.login}: capabilities unrestricted${caps?.promotions === false ? ' (promotions off site-wide: B2B)' : ''}`, Boolean(caps) && off.length === 0, off.join(','))
  }
  const staffApi = await get(`${API}/admin/staff`, token)
  report(`${r.role} ${r.login}: refused on the admin API`, staffApi.status === 401 || staffApi.status === 403, `${staffApi.status}`)
}

// ── Tree scope ────────────────────────────────────────────────────────────
const players = async role => {
  const res = await get(`${API}/admin/reports/players?limit=50`, tokens[role])
  const list = res.json?.data?.rows ?? res.json?.data?.items ?? res.json?.data ?? []
  return Array.isArray(list) ? list.map(p => p.name ?? p.username).sort() : null
}
if (tokens.Agent) {
  const seen = await players('Agent')
  report(`Agent scope: sees only agent_player (${seen?.join(',') ?? '?'})`, JSON.stringify(seen) === JSON.stringify(['agent_player']))
}
if (tokens['Super Admin']) {
  const seen = await players('Super Admin')
  report(`Super Admin scope: sees every player (${seen?.join(',') ?? '?'})`, JSON.stringify(seen) === JSON.stringify(['agent_player', 'direct_player']))
}

for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'}  ${r.name}${r.ok ? '' : `  [${r.why}]`}`)
const failed = results.filter(r => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} OK`)
process.exit(failed ? 1 : 0)
