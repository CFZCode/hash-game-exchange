#!/usr/bin/env node
// End-to-end player journey on the LOCAL stack only: signup → manual INR deposit → admin approve →
// first-deposit bonus → sports wager (simulated settled bets, counted by the real sports wager sync)
// up to VIP 2 → daily / weekly VIP bonus claims → rakeback. Prints PASS/FAIL per check; exit 1 on any FAIL.
// Usage (repo root): node scripts/e2e-player-journey.mjs
// Betting budget (.claude/skills/qa-betting-budget): no provider money; no real sports bet above ₹10.
import { readFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const GW = 'http://127.0.0.1:4700/api/v1'
const USER_SVC = 'http://127.0.0.1:4701/api/v1'
const DB = 'postgres://postgres:postgres@127.0.0.1:5432/parker567'
const STAFF = { email: 'admin@ibitplay.local', password: 'P8owNQqmd-1L4ZRlYR214mahaZ9!' }
const DEPOSIT_INR = '1000' // ≈12 USDT at 0.012, inside the 10 USDT first-deposit tier
const SPORTS_INR = 85_000 // crosses VIP 2 (1,000 USD) at 0.012
const CASINO_ROUNDS = 20 // in-house budget: at most ~20 rounds of ₹10
const RUN = Date.now().toString(36)

const env = Object.fromEntries(
  readFileSync(new URL('../backend/.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => /^[A-Z0-9_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')])
)
const sql = (q) => execFileSync('psql', ['-At', DB, '-c', q]).toString().trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
const check = (name, ok, got = '') => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${got !== '' ? `  →  ${got}` : ''}`)
  return ok
}

async function call(method, path, token, body, { form, base = GW, headers = {} } = {}) {
  const h = { ...headers, ...(token ? { authorization: `Bearer ${token}` } : {}) }
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    h['content-type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const r = await fetch(base + path, { method, headers: h, body: payload })
  const j = await r.json().catch(() => null)
  return { status: r.status, code: j?.error?.code ?? null, msg: j?.error?.message ?? null, data: j?.data ?? j }
}
const tokenOf = (d) => d?.accessToken ?? d?.token ?? d?.tokens?.accessToken
const num = (v) => Number(v ?? 0)

const created = { betIds: [], player: null, savedWelcome: null }
let staff, player

try {
  // ── 1. SETUP ──────────────────────────────────────────────────────────────
  staff = tokenOf((await call('POST', '/admin/auth/login', null, STAFF)).data)
  if (!check('staff login', Boolean(staff))) throw new Error('stop')

  const welcome = await call('GET', '/admin/site-config/welcome-bonuses', staff)
  check('read welcome-bonus config', welcome.status === 200, welcome.status)
  created.savedWelcome = welcome.data
  const fd = welcome.data?.firstDepositBonus ?? {}
  const tiers = (fd.tiers?.length ? fd.tiers : [
    { minDeposit: '10', percent: '100', maxBonus: '100' },
    { minDeposit: '100', percent: '50', maxBonus: '500' },
    { minDeposit: '1000', percent: '25', maxBonus: '1000' },
  ]).map((t) => ({ minDeposit: String(num(t.minDeposit)), percent: String(num(t.percent)), maxBonus: String(num(t.maxBonus)) }))
  const on = await call('PUT', '/admin/site-config/welcome-bonuses', staff, {
    firstDepositBonus: { enabled: true, tiers, wagerMultiplier: fd.wagerMultiplier ?? null, expiryDays: fd.expiryDays ?? 30 },
  })
  if (!check('enable first-deposit bonus', on.status === 200, `${on.status} ${on.code ?? ''}`)) throw new Error('stop')
  // user-service caches the welcome-bonus terms for 5 s (bonus/welcomeBonusSettings.js): wait them out.
  await new Promise((r) => setTimeout(r, 6000))

  // ── 2. SIGNUP ─────────────────────────────────────────────────────────────
  const username = `e2e${RUN}`
  const password = `E2e!${RUN}Aa9x`
  const reg = await call('POST', '/user/auth/register', null, { username, password })
  if (!check('player signup', reg.status === 201 || reg.status === 200, `${reg.status} ${reg.code ?? ''} ${reg.msg ?? ''}`)) throw new Error('stop')
  const login = await call('POST', '/user/auth/login', null, { identifier: username, password })
  player = tokenOf(login.data)
  if (!check('player login', Boolean(player), login.status)) throw new Error('stop')
  const me = (await call('GET', '/user/auth/me', player)).data
  created.player = String(me?.id ?? me?.user?.id ?? me?.userId)
  console.log(`   player ${username} id ${created.player}`)
  const fdView = (await call('GET', '/user/bonus/first-deposit', player)).data
  check('new player is eligible for the first-deposit bonus', fdView?.enabled === true && fdView?.eligible === true, JSON.stringify({ enabled: fdView?.enabled, eligible: fdView?.eligible }))

  // ── 3. DEPOSIT ────────────────────────────────────────────────────────────
  const proof = existsSync('logs/qa/test-payment-proof.png')
    ? readFileSync('logs/qa/test-payment-proof.png')
    : Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const form = new FormData()
  form.append('amount', DEPOSIT_INR)
  form.append('currency', 'INR')
  form.append('transactionId', `E2E${RUN}`.toUpperCase())
  form.append('screenshot', new Blob([proof], { type: 'image/png' }), 'proof.png')
  const dep = await call('POST', '/user/deposits/fiat', player, undefined, { form })
  const depositId = dep.data?.depositId ?? dep.data?.deposit_id ?? dep.data?.id
  if (!check('manual INR deposit request accepted', (dep.status === 201 || dep.status === 200) && depositId, `${dep.status} ${dep.code ?? ''} ${dep.msg ?? ''}`)) throw new Error('stop')
  const mine = await call('GET', '/user/history/fiat/deposits', player)
  const pending = (Array.isArray(mine.data) ? mine.data : mine.data?.rows ?? mine.data?.items ?? []).find((d) => String(d.depositId ?? d.deposit_id ?? d.id) === String(depositId))
  check('player sees the deposit pending', /pending/i.test(pending?.status ?? ''), pending?.status ?? `${mine.status} not listed`)

  // ── 4. APPROVE ────────────────────────────────────────────────────────────
  const bal = async () => {
    const b = (await call('GET', '/user/wallet/balances', player)).data
    const list = Array.isArray(b) ? b : b?.balances ?? b
    const get = (c) => (Array.isArray(list) ? list.find((x) => String(x.currency).toUpperCase() === c)?.amount ?? list.find((x) => String(x.currency).toUpperCase() === c)?.balance : list?.[c] ?? list?.[c.toLowerCase()])
    return { INR: num(get('INR')), USDT: num(get('USDT')) }
  }
  const before = await bal()
  const appr = await call('PUT', `/admin/user/deposits/fiat/${depositId}/approve`, staff, { transactionPassword: STAFF.password /* TXN_PASSWORD_MODE=login locally */ })
  if (!check('admin approves the deposit', appr.status === 200, `${appr.status} ${appr.code ?? ''} ${appr.msg ?? ''}`)) throw new Error('stop')
  const afterDep = await bal()
  check('wallet INR credited exactly the claimed amount', afterDep.INR - before.INR === num(DEPOSIT_INR), `${before.INR} → ${afterDep.INR}`)

  const rate = num(sql(`select usd_rate from exchangerate where currency='INR'`))
  const depUsdt = num(DEPOSIT_INR) * rate
  const tier = [...tiers].sort((a, b) => num(b.minDeposit) - num(a.minDeposit)).find((t) => depUsdt >= num(t.minDeposit))
  const expectBonus = tier ? Math.min((depUsdt * num(tier.percent)) / 100, num(tier.maxBonus)) : 0
  let claimed = null
  for (let i = 0; i < 10 && !claimed; i += 1) {
    claimed = (await call('GET', '/user/bonus/first-deposit', player)).data?.claimed
    if (!claimed) await sleep(1000)
  }
  check('first-deposit bonus granted at the tier rate', claimed && Math.abs(num(claimed.amount) - expectBonus) < 0.01, `got ${claimed?.amount ?? 'none'} ${claimed?.currency ?? ''}, expected ${expectBonus.toFixed(2)} (tier ${tier?.minDeposit} @ ${tier?.percent}%)`)
  const bb = (await call('GET', '/user/bonus-balance', player)).data
  const bbTotal = (bb?.balances ?? []).reduce((s, b) => s + num(b.amount), 0)
  // No wagering multiplier set (admin left it blank) → the bonus is paid straight to the wallet,
  // otherwise it is held as an active locked bonus until wagered off.
  if (num(fd.wagerMultiplier) > 0 && bb?.wageringLock)
    check('bonus held as an active locked bonus (wagering ×' + fd.wagerMultiplier + ')', bbTotal > 0 && (bb?.active ?? []).length > 0, `balance ${bbTotal}, active ${(bb?.active ?? []).length}`)
  else
    check('bonus paid straight to the wallet (no wagering multiplier set)', Math.abs(afterDep.USDT - before.USDT - expectBonus) < 0.01 && bbTotal === 0, `USDT ${before.USDT} → ${afterDep.USDT}, bonus balance ${bbTotal}`)
  const hist = await call('GET', '/user/history', player)
  check('transaction history lists the deposit', new RegExp(String(depositId)).test(JSON.stringify(hist.data ?? '')), hist.status)
  const wallet = await call('GET', '/user/wallet/history', player)
  check('wallet history lists the bonus credit', /bonus/i.test(JSON.stringify(wallet.data ?? '')), `${wallet.status} ${JSON.stringify(wallet.data ?? '').slice(0, 120)}`)
  const prog0 = (await call('GET', '/user/wager/progress', player)).data
  check('rollover target reported after the deposit', num(prog0?.target) > 0, JSON.stringify(prog0 ?? {}).slice(0, 160))

  // ── 5. SPORTS → VIP 2 ─────────────────────────────────────────────────────
  console.log('   FINDING  real sports bet skipped: slip minimum ₹50 is above the ₹10 test budget (qa-betting-budget)')
  // The sportsbook keeps its own player row, created the first time the player calls it.
  await call('GET', '/sports/user/buttonlist', player)
  check('player provisioned in the sportsbook', sql(`select count(*) from mssports.users where user_id=${created.player}`) === '1')
  const half = Math.round(SPORTS_INR / 2)
  for (const [stake, result] of [[half, 'loss'], [SPORTS_INR - half, 'won']]) {
    const id = sql(
      `insert into mssports."SportsBet" (user_id, game_type, match_title, selection_name, bet_type, market_type, odds, stake_amount,
         original_currency, original_amount, liability, status, result_status, fixed, sport_id, unmatched, created_at, updated_at)
       values (${created.player}, 'MO', 'E2E ${RUN}', 'E2E', 'back', 'MATCH_ODDS', 2.0, ${stake}, 'INR', ${stake}, ${stake},
         'closed', '${result}', 1, '4', false, now(), now()) returning id`
    ).split('\n')[0]
    created.betIds.push(id)
  }
  let vip = null
  for (let i = 0; i < 18; i += 1) {
    vip = (await call('GET', '/user/vip', player)).data
    if (num(vip?.level) >= 2) break
    await sleep(5000)
  }
  check('sports wager sync counts the settled bets → VIP level ≥ 2', num(vip?.level) >= 2, `L${vip?.level} ${vip?.name}, wager ${vip?.wager} USD`)
  const credits = sql(`select idempotency_key||'='||amount from credits_ledger where user_id='${created.player}' and idempotency_key like 'vip:%' order by id`)
  check('level-up / rank-up credits arrived in the ledger', /vip:level_up/.test(credits), credits.replace(/\n/g, ', ') || 'none')
  const prog1 = (await call('GET', '/user/wager/progress', player)).data
  check('rollover progress moved with the sports wager', num(prog1?.wagered) > num(prog0?.wagered), `${prog0?.wagered} → ${prog1?.wagered}`)
  const bb1 = (await call('GET', '/user/bonus-balance', player)).data
  console.log(`   bonus balance after wager: ${JSON.stringify({ balances: bb1?.balances, active: (bb1?.active ?? []).map((a) => ({ status: a.status, wagered: a.wagered ?? a.wageredAmount, target: a.wagerTarget ?? a.target })) })}`)

  // ── 6. CLAIMS ─────────────────────────────────────────────────────────────
  for (const type of ['daily', 'weekly']) {
    const view = (await call('GET', '/user/bonus', player)).data?.types?.[type]
    if (!check(`${type} VIP bonus is claimable at VIP 2`, view?.claimable === true, JSON.stringify({ eligible: view?.eligible, claimable: view?.claimable, award: view?.award }))) continue
    const b0 = await bal()
    const c1 = await call('POST', `/user/bonus/claim/${type}`, player)
    const b1 = await bal()
    check(`${type} claim credits the wallet`, c1.status === 200 && b1.USDT > b0.USDT, `${c1.status} ${c1.code ?? ''} USDT ${b0.USDT} → ${b1.USDT}`)
    const c2 = await call('POST', `/user/bonus/claim/${type}`, player)
    check(`${type} second claim is refused`, c2.status >= 400, `${c2.status} ${c2.code}`)
  }

  const internalKey = env.INTERNAL_KEY_CASINO_SERVICE || env.INTERNAL_API_KEY
  let recorded = 0
  for (let i = 0; i < CASINO_ROUNDS; i += 1) {
    const r = await call('POST', '/internal/user/wager/record', null,
      { userId: Number(created.player), amount: '10', currency: 'INR', source: 'inhouse', ref: `e2e-${RUN}-${i}`, rakeback: true },
      { base: USER_SVC.replace('/api/v1', ''), headers: { 'x-internal-key': internalKey, 'x-internal-service': 'casino-service' } })
    if (r.status === 200 || r.status === 201) recorded += 1
    else if (i === 0) console.log(`   internal wager record: ${r.status} ${r.code} ${r.msg}`)
  }
  check(`${CASINO_ROUNDS} in-house stakes of ₹10 recorded`, recorded === CASINO_ROUNDS, recorded)
  const rb = (await call('GET', '/user/rakeback', player)).data
  if (rb?.claimable) {
    const b0 = await bal()
    const c = await call('POST', '/user/rakeback/claim', player)
    const b1 = await bal()
    check('rakeback claim credits the wallet', c.status === 200 && b1.USDT > b0.USDT, `${c.status} ${c.code ?? ''} ${b0.USDT} → ${b1.USDT}`)
  } else {
    console.log(`   NOTE  rakeback ${rb?.amount} ${rb?.currency} at rate ${(num(rb?.rate) * 100).toFixed(2)}% is below the ${rb?.minimum} minimum after ₹${CASINO_ROUNDS * 10} of in-house stakes (budget cap) — not claimable, by the rules`)
  }

  // ── 7. TRACKING SKILL ─────────────────────────────────────────────────────
  console.log('\n--- vip-progress ---')
  try {
    console.log(execFileSync('node', ['.claude/skills/vip-progress/check.mjs', username, password], {
      env: { ...process.env, API: 'http://127.0.0.1:4700', STAFF_EMAIL: STAFF.email, STAFF_PASSWORD: STAFF.password },
    }).toString())
  } catch (e) {
    console.log(`vip-progress failed: ${e.message}`)
  }
} catch (e) {
  if (e.message !== 'stop') check('journey ran without crashing', false, e.stack?.split('\n').slice(0, 3).join(' | '))
} finally {
  // ── 8. CLEANUP ────────────────────────────────────────────────────────────
  if (created.savedWelcome && staff) {
    const s = created.savedWelcome
    const r = await call('PUT', '/admin/site-config/welcome-bonuses', staff, {
      registerBonus: { enabled: Boolean(s.registerBonus?.enabled), amount: String(num(s.registerBonus?.amount)) },
      firstDepositBonus: {
        enabled: Boolean(s.firstDepositBonus?.enabled),
        tiers: (s.firstDepositBonus?.tiers ?? []).map((t) => ({ minDeposit: String(num(t.minDeposit)), percent: String(num(t.percent)), maxBonus: String(num(t.maxBonus)) })),
        wagerMultiplier: s.firstDepositBonus?.wagerMultiplier ?? null,
        expiryDays: s.firstDepositBonus?.expiryDays ?? 30,
      },
    })
    console.log(`cleanup: welcome-bonus config restored → ${r.status}`)
  }
  if (created.betIds.length) {
    const ids = created.betIds.join(',')
    sql(`update mssports."SportsBet" set result_status='void' where id in (${ids})`)
    // sports-service's wager-report sync reverses voided bets (every SPORTS_WAGER_SYNC_INTERVAL_MS, 60 s).
    const refs = created.betIds.map((id) => `'${id}'`).join(',')
    for (let i = 0; i < 24; i += 1) {
      const left = sql(`select count(*) from wager_activity where source='sports' and ref in (${refs}) and reversed_at is null`)
      if (left === '0') break
      await sleep(5000)
    }
    sql(`delete from mssports."SportsBet" where id in (${ids})`)
    console.log(`cleanup: sports bets ${ids} voided (wager reversed by the sync) and deleted`)
  }
  if (created.player) {
    const c = sql(`select coalesce(inr,0)||' INR, '||coalesce(usdt,0)||' USDT' from credits where uid=${created.player}`)
    console.log(`cleanup: e2e player ${created.player} left in place with ${c}`)
  }
  const failed = results.filter((ok) => !ok).length
  console.log(`\n${results.length - failed}/${results.length} passed`)
  process.exit(failed ? 1 : 0)
}
