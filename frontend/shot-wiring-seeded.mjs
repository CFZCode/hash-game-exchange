/* Throwaway visual check, WITH DATA — the companion to `shot-wiring.mjs`.
 *
 *   PW=<scratchpad>/node_modules/playwright-core SHOTS=<dir> node shot-wiring-seeded.mjs
 *
 * The plain pass proves the wired pages render; it cannot prove they render the
 * PLATFORM's data, because every one of them is legitimately empty for
 * `demo_player03` and an empty live page looks exactly like the fixture it
 * replaced. So this seeds one row per surface, screenshots, and removes them.
 *
 * Everything it creates is deleted in `finally`, including on a crash.
 * Nothing in src/ imports it.
 */
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const pw = await import(pathToFileURL(process.env.PW + '/index.js').href);
const { chromium } = pw.chromium ? pw : pw.default;
const { default: pgMod } = await import(pathToFileURL('D:/CFZ/bc-games/backend copy/node_modules/pg/lib/index.js').href);

const SHOTS = process.env.SHOTS || 'C:/Users/gurpr/AppData/Local/Temp/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5173';
const API = 'http://127.0.0.1:4000/api/v1';

const db = new pgMod.Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'root', database: 'bc_games' });
await db.connect();
const { rows: [me] } = await db.query(`select id from users where name='demo_player03'`);

const login = async () => {
  const r = await fetch(API + '/user/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier: 'demo_player03', password: process.env.DEMO_PASSWORD }),
  });
  return (await r.json())?.data?.accessToken;
};
const token = await login();
const H = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };

let seededDeposit = null;
const starred = [];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));

const dismiss = async () => {
  const close = page.locator('.region-block-overlay button[aria-label="Close"]');
  for (let i = 0; i < 3; i += 1) {
    if (await close.count().catch(() => 0)) {
      await close.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(200);
    } else break;
  }
};
const shot = async (name) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  console.log(`  shot: ${name}.png`);
};

try {
  // ── seed ────────────────────────────────────────────────────────────────
  console.log('seeding');
  await db.query('delete from user_notifications where user_id=$1', [me.id]);
  for (const [t, body, type] of [
    ['Deposit received', 'INR 500.00 has been credited to your wallet.', 'deposit'],
    ['Weekend reload bonus', 'Your 50% reload bonus is ready to claim.', 'promotion'],
    ['Welcome to BC.GAME', 'Thanks for joining. Here is how to get started.', 'general'],
  ]) {
    await db.query(
      `insert into user_notifications (user_id,title,body,type,is_read,delivered,created_at)
       values ($1,$2,$3,$4,false,true,now())`, [me.id, t, body, type]
    );
  }
  const { rows: [dep] } = await db.query(
    `insert into fiat_deposits (user_id, amount, status, created_at)
     values ($1,'1000','approved', now()) returning deposit_id`, [me.id]
  );
  seededDeposit = dep.deposit_id;

  /* ONLY STAR WHAT IS NOT ALREADY STARRED, so the cleanup below removes nothing that was
     already the account's. Un-starring a game the person had chosen is a silent data loss that
     surfaces later as "the Favorites section disappeared" with nothing to connect it to — which
     is exactly what `verify-favorites-home.mjs` once did to a real account. */
  const already = await fetch(`${API}/casino/games/favourites`, { headers: H })
    .then((r) => r.json())
    .then((j) => new Set((j?.data ?? []).map((r) => r.game_ref)))
    .catch(() => new Set());

  for (const slug of ['crash', 'limbo', 'plinko']) {
    if (already.has(slug)) continue;
    await fetch(`${API}/casino/games/favourites/${slug}`, {
      method: 'PUT', headers: H, body: JSON.stringify({ source: 'in-house' }),
    });
    starred.push(slug);
  }
  await fetch(`${API}/user/withdrawals/whitelist`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ label: 'My Tron wallet', currency: 'USDT', network: 'TRC20', address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' }),
  });
  await fetch(`${API}/user/withdrawals/whitelist`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ label: 'Cold storage', currency: 'BTC', address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }),
  });
  await fetch(`${API}/user/withdrawals/whitelist/enforcement`, {
    method: 'PUT', headers: H, body: JSON.stringify({ enabled: true }),
  });
  console.log('  3 notifications, 1 approved deposit, 3 favourites, 2 addresses + enforcement on\n');

  // ── sign in through the UI ──────────────────────────────────────────────
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForTimeout(800);
  await page.locator('button:visible', { hasText: 'Sign In' }).first().click({ timeout: 10000 });
  await page.waitForTimeout(900);
  await dismiss();
  await page.locator('input:visible').first().fill('demo_player03');
  await page.locator('input[type="password"]:visible').first().fill(process.env.DEMO_PASSWORD);
  await page.locator('button:visible', { hasText: /^Sign In$/ }).last().click({ timeout: 10000 });
  await page.waitForTimeout(2600);
  await dismiss();

  console.log('home — the Favorites block');
  await shot('10-home-favourites');

  console.log('the notification drawer');
  /* The bell is the header button carrying the notification icon; open it by clicking the
     button that sits between the gift and the avatar. */
  const headerButtons = page.locator('header button:visible');
  const n = await headerButtons.count();
  for (let i = Math.max(0, n - 4); i < n; i += 1) {
    await headerButtons.nth(i).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(900);
    const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
    if (/Deposit received|Weekend reload|Welcome to BC/.test(body)) {
      console.log(`  drawer opened from header button #${i}`);
      break;
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(400);
  }
  await shot('11-notifications');
  await page.keyboard.press('Escape').catch(() => {});

  for (const [name, path] of [
    ['12-rollover-seeded', '/wallet/rollover'],
    ['13-whitelist-seeded', '/settings/whitelist'],
    ['14-favourites-page', '/favorite'],
    ['15-casino-lobby', '/casino'],
  ]) {
    console.log(path);
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await dismiss();
    await page.waitForTimeout(1800);
    await dismiss();
    const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
    for (const bad of ['NaN', 'Invalid Date', '1970']) {
      if (text.includes(bad)) console.log(`  !! "${bad}" ON SCREEN`);
    }
    await shot(name);
  }

  console.log('\npage errors: ' + (errors.length ? errors.join(' | ') : 'none'));
} catch (error) {
  console.log('\nHARNESS ERROR: ' + error.message.slice(0, 300));
  await page.screenshot({ path: `${SHOTS}/zz-seeded-error.png` }).catch(() => {});
} finally {
  await browser.close();
  const tok = await login();
  const H2 = { authorization: 'Bearer ' + tok, 'content-type': 'application/json' };
  for (const slug of starred) {
    await fetch(`${API}/casino/games/favourites/${slug}`, { method: 'DELETE', headers: H2 }).catch(() => {});
  }
  if (seededDeposit) await db.query('delete from fiat_deposits where deposit_id=$1', [seededDeposit]);
  await db.query('delete from user_notifications where user_id=$1', [me.id]);
  await db.query('delete from user_withdrawal_whitelist where user_id=$1', [me.id]);
  await db.query('update users set withdraw_whitelist_only=false where id=$1', [me.id]);
  await db.end();
  console.log('cleaned up: notifications, deposit, favourites, whitelist, enforcement flag');
}
