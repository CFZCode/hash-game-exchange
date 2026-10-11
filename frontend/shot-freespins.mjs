/* Throwaway visual check for the three pieces built 2026-09-04 after the whitelist:
 *
 *   PW=<scratchpad>/node_modules/playwright-core SHOTS=<dir> node shot-freespins.mjs
 *
 *   1. `/free-plays` with a real free-spin row in it (gap 8's first half);
 *   2. the "Account Restrictions" confirm in front of Change Password, including its five-second
 *      Confirm countdown — which is the one thing in this pass that CANNOT be asserted from a
 *      service call, since it is a disabled attribute that clears on a timer;
 *   3. the dialog title bar's DESKTOP arm — a cross, and no back arrow on the first dialog of a
 *      stack. `RouteDialog` only ever drew the phone arm, so every `dialog: !0` route was showing
 *      a back arrow and no cross at 1440.
 *
 *
 * ── DO NOT PIPE THIS THROUGH `head` ─────────────────────────────────────────────────────────
 *
 * `node shot-*.mjs | head -22` closes the pipe as soon as it has its lines, node takes SIGPIPE,
 * and the process dies BEFORE `finally` runs — so the cleanup never happens and the run leaves
 * its rows behind. That happened once with `shot-whitelist.mjs` and left one address on
 * `demo_player05`; it was only obvious because the stamp in the label says which run wrote it,
 * which is the whole reason the naming convention exists. Use `tail`, redirect to a file, or let
 * it print.
 *
 * Needs `backend copy` running and `npm run dev` on 5173.
 *
 * ── DESTRUCTIVE, WITH THE USUAL PRECAUTIONS ─────────────────────────────────────────────────
 *
 * Signs in as **demo_player05**, never the account a human browses with. It seeds one freespin
 * campaign and deletes it by its own random stamp in `finally`. It does NOT change anybody's
 * password — the Account Restrictions dialog is photographed and then CANCELLED, which is the
 * whole of what needs seeing; `verify-freespins.mjs` covers what confirming does.
 *
 * Nothing in src/ imports it.
 */
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const pw = await import(pathToFileURL(process.env.PW + '/index.js').href);
const { chromium } = pw.chromium ? pw : pw.default;
const { default: pgMod } = await import(pathToFileURL('D:/CFZ/bc-games/backend copy/node_modules/pg/lib/index.js').href);

const SHOTS = process.env.SHOTS || 'C:/Users/gurpr/AppData/Local/Temp/shots-freespins';
fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5173';
const ACCOUNT = 'demo_player05';
const stamp = Math.random().toString(36).slice(2, 8);

const notes = [];
const note = (n, d = '') => { notes.push(`${n}${d ? ` — ${d}` : ''}`); console.log(`  ${n}${d ? ` — ${d}` : ''}`); };

const db = new pgMod.Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'root', database: 'bc_games' });
await db.connect();
const { rows: [me] } = await db.query('select id from users where name=$1', [ACCOUNT]);
if (!me) { console.log(`${ACCOUNT} does not exist`); process.exit(1); }

/* `limbo` because it is one of the twenty in-house games AND has a cover in `src/assets/games`,
   so the row's artwork arm is exercised rather than its fallback. */
await db.query(
  `insert into gis_freespins
     (user_id,freespin_id,game_uuid,currency,quantity,quantity_left,
      valid_from,valid_until,denomination,bet_id,status,is_canceled,created_at,updated_at)
   values ($1,$2,'limbo','USDT',20,14,now()-interval '1 day',now()+interval '7 days',0.10,'bet1','active',0,now(),now())`,
  [me.id, `shot-${stamp}`],
);
console.log(`seeded 1 freespin campaign (14 of 20 left)\n`);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 160)));

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
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
  console.log(`    shot: ${name}.png`);
};
const body = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');

try {
  console.log('signing in');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForTimeout(800);
  await page.locator('button:visible', { hasText: 'Sign In' }).first().click({ timeout: 10000 });
  await page.waitForTimeout(900);
  await dismiss();
  await page.locator('input:visible').first().fill(ACCOUNT);
  await page.locator('input[type="password"]:visible').first().fill(process.env.DEMO_PASSWORD);
  await page.locator('button:visible', { hasText: /^Sign In$/ }).last().click({ timeout: 10000 });
  await page.waitForTimeout(2600);
  await dismiss();

  // ══════════════════════════════════════════════════════════════════════
  console.log('\n1. free plays');
  await page.goto(BASE + '/free-plays', { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForTimeout(1800);
  const free = await body();
  note('the tab counts are no longer all zero', /Free Spins\s*1|Free Spins1/.test(free) ? 'Free Spins 1' : `NOT COUNTED — ${free.slice(0, 90)}`);
  note('the row names the game', /Limbo/.test(free) ? 'Limbo' : 'GAME NOT NAMED');
  note('and its remaining count', /14/.test(free) ? '14 spins left' : 'COUNT MISSING');
  await shot('01-free-plays-all');

  const spinsTab = page.locator('text=/^Free Spins/').first();
  if (await spinsTab.count().catch(() => 0)) {
    await spinsTab.click({ timeout: 4000 }).catch(() => {});
    await shot('02-free-plays-spins-tab');
  }
  const betTab = page.locator('text=/^Free Bet/').first();
  if (await betTab.count().catch(() => 0)) {
    await betTab.click({ timeout: 4000 }).catch(() => {});
    note('the Free Bet tab keeps its empty state',
      /No Free Bets Yet/.test(await body()) ? 'No Free Bets Yet' : 'UNEXPECTED');
    await shot('03-free-plays-bets-tab');
  }

  // ══════════════════════════════════════════════════════════════════════
  console.log('\n2. account restrictions, in front of Change Password');
  await page.goto(BASE + '/settings/security', { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForTimeout(1600);
  await page.locator('button:visible', { hasText: /^Change Password$/ }).first().click({ timeout: 8000 });
  await page.waitForTimeout(600);
  const confirm = await body();
  note('the confirm is raised', /Account Restrictions/.test(confirm) ? 'Account Restrictions' : 'NOT RAISED');
  note('  and it states the rule', /disable your withdrawals for 24 hours/.test(confirm) ? '24 hours' : 'COPY MISSING');
  note('  Confirm starts disabled behind a countdown',
    await page.locator('button:disabled', { hasText: /^Confirm/ }).count().catch(() => 0) ? 'disabled' : 'NOT DISABLED');
  const label = await page.locator('button', { hasText: /^Confirm/ }).first().innerText().catch(() => '');
  note('  and counts down', /\(\d+s\)/.test(label) ? label.replace(/\s+/g, '') : `NO COUNTER — "${label}"`);
  await shot('04-account-restrictions');

  await page.waitForTimeout(5200);
  const after = await page.locator('button', { hasText: /^Confirm/ }).first();
  note('after five seconds it is enabled',
    (await after.isEnabled().catch(() => false)) ? 'enabled' : 'STILL DISABLED');
  note('  and the counter is gone',
    /\(\d+s\)/.test(await after.innerText().catch(() => '')) ? 'STILL COUNTING' : 'Confirm');
  await shot('05-account-restrictions-armed');

  /* CANCELLED, not confirmed — this run must not change anybody's password. */
  await page.locator('button:visible', { hasText: /^Cancel$/ }).first().click({ timeout: 6000 });
  await page.waitForTimeout(700);
  note('Cancel closes it without navigating',
    !/Account Restrictions/.test(await body()) && page.url().endsWith('/settings/security') ? 'back on Security' : 'DID NOT CLOSE');
  await shot('06-cancelled');

  // ══════════════════════════════════════════════════════════════════════
  console.log('\n3. the dialog title bar, desktop arm');
  await page.goto(BASE + '/settings/whitelist', { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForTimeout(1500);
  await page.locator('button:visible', { hasText: 'Add Address' }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1100);
  const crosses = await page.locator('.dialog-title button[aria-label="Close"]:visible').count().catch(() => 0);
  const backs = await page.locator('.dialog-title button[aria-label="Back"]:visible').count().catch(() => 0);
  note('a desktop dialog draws a CROSS', crosses ? `${crosses}` : 'NONE — still the phone arm');
  note('  and no back arrow on the first of a stack', backs === 0 ? 'none' : `${backs} present`);
  await shot('07-dialog-desktop-cross');

  await page.locator('.dialog-title button[aria-label="Close"]:visible').first().click({ timeout: 6000 });
  await page.waitForTimeout(900);
  note('the cross closes it', page.url().endsWith('/settings/whitelist') ? 'back on the pane' : `NO — ${page.url()}`);

  console.log('\n   the phone arm is unchanged, 390x844');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  await page.locator('button:visible', { hasText: 'Add Address' }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  const pCross = await page.locator('.dialog-title button[aria-label="Close"]:visible').count().catch(() => 0);
  const pBack = await page.locator('.dialog-title button[aria-label="Back"]:visible').count().catch(() => 0);
  note('a phone still draws the back arrow and no cross',
    pBack > 0 && pCross === 0 ? 'back only' : `back=${pBack} cross=${pCross} — CHANGED`);
  await shot('08-dialog-phone-back');

  console.log('\npage errors: ' + (errors.length ? errors.join(' | ') : 'none'));
} catch (error) {
  console.log('\nERROR: ' + (error?.message ?? String(error)).slice(0, 600));
  await page.screenshot({ path: `${SHOTS}/zz-error.png` }).catch(() => {});
} finally {
  await browser.close();
  await db.query('delete from gis_freespins where freespin_id=$1', [`shot-${stamp}`]);
  /* Belt and braces: this run cancels rather than confirms, so nothing should have set one. */
  await db.query('update users set withdraw_locked_until = null where id=$1', [me.id]);
  await db.end();
  console.log('\ncleaned up the seeded campaign');
  console.log(`${notes.length} observations, shots in ${SHOTS}`);
}
