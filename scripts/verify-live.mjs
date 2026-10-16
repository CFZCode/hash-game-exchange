#!/usr/bin/env node
/**
 * Live smoke test for Parker567 — read-only GETs (and one read-only POST: the sports board) against
 * the live API and the Vercel frontend. Checks the operator-facing state this project depends on.
 *
 *   node scripts/verify-live.mjs
 *   API=https://api.parker567.com WEB=https://parker567.vercel.app node scripts/verify-live.mjs
 *
 * Exit code 1 if any check fails. Nothing is written anywhere.
 */
const API = (process.env.API ?? 'https://api.parker567.com').replace(/\/+$/, '');
const WEB = (process.env.WEB ?? 'https://parker567.vercel.app').replace(/\/+$/, '');

const results = [];
const check = async (name, fn) => {
  try {
    const detail = await fn();
    results.push({ ok: true, name, detail });
  } catch (error) {
    results.push({ ok: false, name, detail: error.message });
  }
};
const get = async (base, path, init) => {
  const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30_000), ...init });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
};
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

await check('API health', async () => {
  const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(15_000) });
  assert(res.ok, `status ${res.status}`);
  return 'ok';
});

await check('Coins: only INR, USDT (TRC20), BTC', async () => {
  const { body } = await get(API, '/api/v1/admin/currencies/public');
  const list = (body?.data ?? []).map((c) => `${c.code}${c.networks?.length ? `[${c.networks.map((n) => n.key).join('/')}]` : ''}`);
  assert(JSON.stringify(list.sort()) === JSON.stringify(['BTC[BTC]', 'INR', 'USDT[TRC20]']), `got ${list.join(', ')}`);
  return list.join(', ');
});

await check('Default currency is USDT', async () => {
  const { body } = await get(API, '/api/v1/admin/site-config/public');
  assert(body?.data?.defaultCurrency === 'USDT', `got ${body?.data?.defaultCurrency}`);
  return 'USDT';
});

await check('Originals catalogue has the five offered games', async () => {
  const { body } = await get(API, '/api/v1/casino/js-games/v1/games?vendor=in-house&per_page=100');
  const rows = Array.isArray(body?.data) ? body.data : (body?.data?.games ?? body?.data?.rows ?? []);
  const uids = new Set(rows.map((r) => r.game_uid));
  const want = ['limbo', 'diamond', 'keno', 'mine', 'plinko'];
  const missing = want.filter((u) => !uids.has(u));
  assert(!missing.length, `missing ${missing.join(', ')}`);
  return want.join(', ');
});

await check('After-login slides slider-1..3 active', async () => {
  const { body } = await get(API, '/api/v1/admin/banners');
  const types = (body?.data ?? []).filter((b) => b.active !== false).map((b) => b.type);
  const missing = ['slider-1', 'slider-2', 'slider-3'].filter((t) => !types.includes(t));
  assert(!missing.length, `missing ${missing.join(', ')}`);
  return types.join(', ');
});

await check('First-deposit bonus enabled with tiers', async () => {
  const { body } = await get(API, '/api/v1/user/bonus/first-deposit');
  assert(body?.data?.enabled === true && body.data.tiers?.length > 0, `enabled=${body?.data?.enabled} tiers=${body?.data?.tiers?.length}`);
  return `${body.data.tiers.length} tiers`;
});

await check('Promotions list reachable', async () => {
  const { status, body } = await get(API, '/api/v1/admin/promotions?limit=5');
  assert(status === 200, `status ${status}`);
  return `${body?.data?.length ?? 0} published`;
});

await check('Blog (owner feature)', async () => {
  const { status, body } = await get(API, '/api/v1/admin/blogs?limit=1');
  if (status === 403) return 'OFF — owner has not enabled the blog feature (warning, not a failure)';
  assert(status === 200, `status ${status} ${body?.error?.code ?? ''}`);
  return 'on';
});

await check('Vercel: home page', async () => {
  const res = await fetch(`${WEB}/`, { signal: AbortSignal.timeout(30_000) });
  assert(res.ok, `status ${res.status}`);
  return 'ok';
});

await check('Vercel: API proxied same-origin', async () => {
  const { status } = await get(WEB, '/api/v1/admin/site-config/public');
  assert(status === 200, `status ${status}`);
  return 'ok';
});

await check('Vercel: sports POST passes the gateway (no CORS 403)', async () => {
  const { status } = await get(WEB, '/api/v1/sports/user/cricket/all-data', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: WEB },
    body: JSON.stringify({ id: 4 }),
  });
  assert(status === 200, `status ${status}`);
  return 'ok';
});

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
