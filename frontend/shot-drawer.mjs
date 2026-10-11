/* Throwaway: open the notification drawer and photograph it with real rows.
 *
 *   PW=<scratchpad>/node_modules/playwright-core SHOTS=<dir> node shot-drawer.mjs
 *
 * Split out of `shot-wiring-seeded.mjs` because the drawer needs a specific
 * click — `button[aria-label="Notifications"]` — and guessing at header buttons
 * found the wrong one. Seeds three notifications, opens the drawer, shoots each
 * tab, then removes them.
 *
 * The bell's unread DOT is deliberately not rendered on this build (a requested
 * departure; see the one-line revert in Header/AfterLogin), so its absence in
 * these shots is correct and not a wiring failure.
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

const db = new pgMod.Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'root', database: 'bc_games' });
await db.connect();
const { rows: [me] } = await db.query(`select id from users where name='demo_player03'`);

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
const shot = async (n) => { await page.waitForTimeout(900); await page.screenshot({ path: `${SHOTS}/${n}.png` }); console.log(`  shot: ${n}.png`); };

try {
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
  console.log('seeded 3 unread notifications\n');

  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForTimeout(800);
  await page.locator('button:visible', { hasText: 'Sign In' }).first().click({ timeout: 10000 });
  await page.waitForTimeout(900);
  await dismiss();
  await page.locator('input:visible').first().fill('demo_player03');
  await page.locator('input[type="password"]:visible').first().fill('Demo@12345');
  await page.locator('button:visible', { hasText: /^Sign In$/ }).last().click({ timeout: 10000 });
  await page.waitForTimeout(2600);
  await dismiss();

  await page.locator('button[aria-label="Notifications"]:visible').first().click({ timeout: 10000 });
  await page.waitForTimeout(1800);
  const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  console.log('  drawer open: ' + /Deposit received|Weekend reload|Welcome to BC/.test(body));
  await shot('20-drawer-default-tab');

  /* The drawer opens on whichever tab has something unread — Promotions first, then
     Transactions, else System — so walk all three to photograph each mapping. */
  for (const [name, label] of [['21-drawer-promotions', 'Promotion'], ['22-drawer-transactions', 'Transaction'], ['23-drawer-system', 'System']]) {
    const tab = page.locator(`text=/^${label}/`).first();
    if (await tab.count().catch(() => 0)) {
      await tab.click({ timeout: 4000 }).catch(() => {});
      await shot(name);
    }
  }

  console.log('\npage errors: ' + (errors.length ? errors.join(' | ') : 'none'));
} catch (error) {
  console.log('\nERROR: ' + error.message.slice(0, 250));
  await page.screenshot({ path: `${SHOTS}/zz-drawer-error.png` }).catch(() => {});
} finally {
  await browser.close();
  await db.query('delete from user_notifications where user_id=$1', [me.id]);
  await db.end();
  console.log('cleaned up the seeded notifications');
}
