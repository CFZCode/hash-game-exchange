#!/usr/bin/env node
// Read-only VIP / bonus progress report for one player, in the owner's default coin.
// Usage: API=https://api.parker567.com node check.mjs <identifier> <password>
//        (API defaults to the live API; use http://127.0.0.1:4700 for the local stack)
// Optional STAFF_EMAIL / STAFF_PASSWORD: also read the site admin's welcome-bonus config and
// compare it with what the player site is served.
const API = (process.env.API || 'https://api.parker567.com').replace(/\/+$/, '') + '/api/v1';
const [identifier, password] = process.argv.slice(2);
if (!identifier || !password) {
  console.error('usage: node check.mjs <identifier> <password>');
  process.exit(2);
}

const call = async (path, { token, body } = {}) => {
  const res = await fetch(API + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${path} → ${res.status} ${json?.error?.code ?? ''} ${json?.error?.message ?? ''}`.trim());
  return json?.data ?? json;
};

const login = await call('/user/auth/login', { body: { identifier, password } });
const token = login?.accessToken ?? login?.tokens?.accessToken ?? login?.token;
if (!token) throw new Error('login gave no access token');

const settle = (p) => p.then((v) => v, (e) => ({ error: e.message }));
const staffToken = process.env.STAFF_EMAIL
  ? await call('/admin/auth/login', { body: { email: process.env.STAFF_EMAIL, password: process.env.STAFF_PASSWORD } }).then(
      (d) => d?.token ?? d?.accessToken,
      (e) => (console.error(`staff login failed: ${e.message}`), null)
    )
  : null;
const [pub, vip, levels, bonus, rakeback, bonusBalance, rates, welcome, adminWelcome] = await Promise.all([
  settle(call('/admin/site-config/public')),
  settle(call('/user/vip', { token })),
  settle(call('/user/vip/levels')),
  settle(call('/user/bonus', { token })),
  settle(call('/user/rakeback', { token })),
  settle(call('/user/bonus-balance', { token })),
  settle(call('/user/exchange-rate/rates')),
  settle(call('/user/bonus/first-deposit', { token })),
  staffToken ? settle(call('/admin/site-config/welcome-bonuses', { token: staffToken })) : null,
]);

// Owner's default coin; amounts the API sends in USD are shown in it at today's rate.
const coin = String(pub?.defaultCurrency || vip?.currency || 'USDT').toUpperCase();
const usdPer = (code) => {
  const c = String(code).toUpperCase();
  if (c === 'USD' || c === 'USDT') return 1;
  const list = Array.isArray(rates) ? rates : rates?.rates ?? [];
  const row = list.find?.((r) => String(r.currency ?? r.code).toUpperCase() === c);
  const v = Number(row?.usd_rate ?? row?.usdRate ?? row?.rate ?? (rates && typeof rates === 'object' ? rates[c] : NaN));
  return Number.isFinite(v) && v > 0 ? v : null;
};
const inCoin = (amount, from = 'USD') => {
  const a = usdPer(from), b = usdPer(coin);
  return a && b ? ((Number(amount) || 0) * a) / b : null;
};
const fmt = (n) => (n == null ? '— (no rate)' : `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${coin}`);

const lines = [];
lines.push(`Player ${identifier} · ${API.replace('/api/v1', '')} · amounts in ${coin} (owner default)`);
if (vip?.error) lines.push(`VIP: ERROR ${vip.error}`);
else {
  lines.push(`VIP: L${vip.level} ${vip.name} · progress ${vip.progressPct}% · wagered ${fmt(vip.currency === coin ? Number(vip.wagerInCurrency) : inCoin(vip.wager))}`);
  lines.push(
    vip.nextLevel == null
      ? 'Next: top level reached'
      : `Next: L${vip.nextLevel} ${vip.nextName} · wager ${fmt(vip.currency === coin ? Number(vip.wagerToNextLevelInCurrency) : inCoin(vip.wagerToNextLevel))} more`
  );
  if (vip.currency && vip.currency !== coin) lines.push(`WARN: /user/vip reports ${vip.currency}, owner default is ${coin}`);
}
const ladder = Array.isArray(levels?.levels) ? levels.levels : [];
if (ladder.length) {
  const near = ladder.filter((l) => l.level >= (vip?.level ?? 0) && l.level <= (vip?.level ?? 0) + 2);
  for (const l of near) lines.push(`  L${l.level} ${l.card}: from ${fmt(inCoin(l.minXp))}`);
}
if (bonus?.error) lines.push(`Bonus: ERROR ${bonus.error}`);
else {
  for (const [kind, t] of Object.entries(bonus?.types ?? {})) {
    const state = t.claimable ? 'CLAIMABLE' : t.eligible ? 'eligible' : `locked (VIP ${t.minVipLevel}+)`;
    lines.push(`Bonus ${kind}: ${state} · amount ${fmt(inCoin(t.award?.amount ?? t.amount, t.award?.currency ?? bonus.currency))} · paid ${fmt(inCoin(t.totalPaid, bonus.currency))}${t.nextClaimAt ? ` · next ${t.nextClaimAt}` : ''}`);
  }
}
if (rakeback?.error) lines.push(`Rakeback: ERROR ${rakeback.error}`);
else lines.push(`Rakeback: ${fmt(inCoin(rakeback.amount, rakeback.currency))} · rate ${(Number(rakeback.rate) * 100).toFixed(2)}% · ${rakeback.claimable ? 'CLAIMABLE' : 'not claimable'} (min ${rakeback.minimum})`);
if (bonusBalance?.error) lines.push(`Bonus balance: ERROR ${bonusBalance.error}`);
else {
  const total = (bonusBalance?.balances ?? []).reduce((s, b) => s + (inCoin(b.amount, b.currency) ?? 0), 0);
  lines.push(`Bonus balance (locked, wagering ${bonusBalance?.wageringLock ? 'on' : 'off'}): ${fmt(total)} · active ${bonusBalance?.active?.length ?? 0}`);
}
// Welcome bonus: what the player site is served, and (with staff creds) what the admin saved.
if (pub?.rewardCurrency && String(pub.rewardCurrency).toUpperCase() !== coin)
  lines.push(`NOTE: rewards are paid in ${pub.rewardCurrency}; amounts below are converted to ${coin}`);
if (welcome?.error) lines.push(`First deposit bonus: ERROR ${welcome.error}`);
else {
  lines.push(`First deposit bonus: ${welcome.enabled ? 'ON' : 'OFF'} · ${welcome.eligible ? 'eligible' : 'not eligible'}${welcome.claimed ? ' · already claimed' : ''} · wager ×${welcome.wagerMultiplier ?? 'default'} · ${welcome.expiryDays} days`);
  for (const t of welcome.tiers ?? [])
    lines.push(`  from ${fmt(inCoin(t.minDeposit, welcome.currency))}: ${Number(t.percent)}% up to ${fmt(inCoin(t.maxBonus, welcome.currency))}`);
}
if (adminWelcome) {
  if (adminWelcome.error) lines.push(`Admin welcome bonuses: ERROR ${adminWelcome.error}`);
  else {
    const key = (tiers) => JSON.stringify((tiers ?? []).map((t) => [Number(t.minDeposit), Number(t.percent), Number(t.maxBonus)]));
    const fd = adminWelcome.firstDepositBonus ?? {};
    // Switched off, the player is served no tiers at all — only the switch itself must agree.
    const adminOn = Boolean(fd.enabled) && (fd.tiers ?? []).length > 0;
    const same =
      adminOn === Boolean(welcome?.enabled) &&
      (!adminOn || key(fd.tiers) === key(welcome?.tiers)) &&
      (fd.wagerMultiplier ?? null) === (welcome?.wagerMultiplier ?? null) &&
      Number(fd.expiryDays) === Number(welcome?.expiryDays);
    lines.push(`Admin ↔ player first deposit bonus: ${same ? 'MATCH' : 'MISMATCH — admin saved ' + key(fd.tiers) + ', player served ' + key(welcome?.tiers)}`);
    lines.push(`Register bonus (admin): ${adminWelcome.registerBonus?.enabled ? `ON ${fmt(inCoin(adminWelcome.registerBonus.amount, adminWelcome.registerBonus.currency))}` : 'OFF'}`);
  }
}
console.log(lines.join('\n'));
