/* Throwaway visual check for the 2026-09-04 front-end wiring.
 *
 *   npm i --prefix <scratchpad> playwright-core
 *   PW=<scratchpad>/node_modules/playwright-core SHOTS=<dir> node shot-wiring.mjs
 *
 * Drives the machine's installed Chrome against the dev server on 5173 and
 * screenshots each wired surface, so a layout or a wrong figure is VISIBLE
 * rather than inferred. Every service-level check passed once while `0 BTC`
 * was on screen; that is what this is for.
 *
 * Needs `backend copy` running and `npm run dev` on 5173 — the gateway's
 * CORS_ORIGIN lists 5173 and not the 5174 a second instance takes.
 * Nothing in src/ imports it.
 */
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const pw = await import(pathToFileURL(process.env.PW + '/index.js').href);
/* playwright-core is CommonJS, so under ESM its exports land on `.default`; some Node versions
   also surface the named ones. Take whichever actually carries `chromium`. */
const { chromium } = pw.chromium ? pw : pw.default;

const SHOTS = process.env.SHOTS || 'C:/Users/gurpr/AppData/Local/Temp/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5173';

const notes = [];
const note = (n, d = '') => { notes.push(`${n}${d ? ` — ${d}` : ''}`); console.log(`  ${n}${d ? ` — ${d}` : ''}`); };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));

/* The region-block dialog covers the page and re-mounts on navigation, so it can arrive between
   a dismiss and a click. Dismiss before anything that touches the page. */
const dismissRegionBlock = async () => {
  const close = page.locator('.region-block-overlay button[aria-label="Close"]');
  for (let i = 0; i < 3; i += 1) {
    if (await close.count().catch(() => 0)) {
      await close.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(200);
    } else break;
  }
};

const shot = async (name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
  console.log(`    shot: ${name}.png`);
};

try {
  // ── sign in the way a visitor does ────────────────────────────────────────
  console.log('\nsigning in');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await dismissRegionBlock();
  await page.waitForTimeout(800);

  /* Both header trees are always in the DOM, so `:visible` matters. */
  await page.locator('button:visible', { hasText: 'Sign In' }).first().click({ timeout: 10000 });
  await page.waitForTimeout(900);
  await dismissRegionBlock();

  await page.locator('input:visible').first().fill('demo_player03');
  await page.locator('input[type="password"]:visible').first().fill('Demo@12345');
  await shot('00-signin-filled');
  await page.locator('button:visible', { hasText: /^Sign In$/ }).last().click({ timeout: 10000 });
  await page.waitForTimeout(2500);
  await dismissRegionBlock();

  const signedIn = await page.locator('text=/Deposit/i').first().count().catch(() => 0);
  note('signed in', signedIn ? 'header shows the wallet/deposit chrome' : 'COULD NOT CONFIRM');
  await shot('01-home-signed-in');

  // ── the notification drawer ───────────────────────────────────────────────
  console.log('\nnotification drawer');
  const bell = page.locator('header button:visible, .page-header button:visible');
  const count = await bell.count();
  note('header buttons found', String(count));
  await shot('02-header');

  // ── the wired pages, straight by URL ──────────────────────────────────────
  for (const [name, path] of [
    ['03-rollover', '/wallet/rollover'],
    ['04-whitelist', '/settings/whitelist'],
    ['05-security', '/settings/security'],
    ['06-profile-dialog', '/user/profile/5673992207'],
    ['07-casino-lobby', '/casino'],
    ['08-favourites', '/favorite'],
  ]) {
    console.log(`\n${path}`);
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await dismissRegionBlock();
    await page.waitForTimeout(1600);
    await dismissRegionBlock();
    const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
    note(`${path} rendered`, `${text.length} chars`);
    for (const bad of ['NaN', 'Invalid Date', 'undefined', '1970']) {
      if (text.includes(bad)) note(`  !! "${bad}" ON SCREEN at ${path}`);
    }
    await shot(name);
  }

  // ── the sign-up form, filled but NOT submitted ────────────────────────────
  console.log('\nsign-up form');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await dismissRegionBlock();
  await page.waitForTimeout(800);
  await page.goto(BASE + '/login/regist', { waitUntil: 'domcontentloaded' });
  await dismissRegionBlock();
  await page.waitForTimeout(1400);
  await shot('09-signup');

  console.log('\nconsole errors: ' + (errors.length ? '' : 'none'));
  for (const e of [...new Set(errors)].slice(0, 8)) console.log('  ! ' + e);
} catch (error) {
  console.log('\nHARNESS ERROR: ' + error.message.slice(0, 300));
  await page.screenshot({ path: `${SHOTS}/zz-error.png` }).catch(() => {});
} finally {
  await browser.close();
  console.log('\n' + notes.length + ' notes, shots in ' + SHOTS);
}
