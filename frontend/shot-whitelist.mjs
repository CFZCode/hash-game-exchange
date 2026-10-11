/* Throwaway visual check for the whitelist write path — gap 16, wired 2026-09-04.
 *
 *   PW=<scratchpad>/node_modules/playwright-core SHOTS=<dir> node shot-whitelist.mjs
 *
 * Drives the machine's installed Chrome against the dev server on 5173 and walks the whole
 * feature the way a visitor does: add an address, rename it, arm the switch, disarm it through
 * its confirm, delete it through its confirm. Every step is photographed, because every
 * service-level assertion in `verify-whitelist.mjs` passed while nothing at all had been seen on
 * screen — which is the failure mode this file exists for.
 *
 * ── DESTRUCTIVE, AND POINTED AWAY FROM THE BROWSING ACCOUNT ──────────────────────────────────
 *
 * Signs in as **demo_player05**, not demo_player03, for the reason written at the head of
 * `verify-whitelist.mjs`. The addresses it adds it deletes through the UI, which is the point;
 * anything it leaves behind on a failure is cleaned by stamp, and any PRE-EXISTING address and
 * the enforcement flag are snapshotted and restored in `finally` whatever happened.
 *
 *
 * ── DO NOT PIPE THIS THROUGH `head` ─────────────────────────────────────────────────────────
 *
 * `node shot-whitelist.mjs | head -22` closes the pipe as soon as it has its lines, node takes
 * SIGPIPE, and the process dies BEFORE `finally` runs — so the cleanup never happens and the run
 * leaves its rows behind. That happened once here and left one address on `demo_player05`; it was
 * only obvious because the stamp in the label says which run wrote it, which is the whole reason
 * the naming convention exists. Use `tail`, redirect to a file, or let it print.
 * Needs `backend copy` running and `npm run dev` on 5173. Nothing in src/ imports it.
 */
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const pw = await import(pathToFileURL(process.env.PW + '/index.js').href);
const { chromium } = pw.chromium ? pw : pw.default;
const { default: pgMod } = await import(pathToFileURL('D:/CFZ/bc-games/backend copy/node_modules/pg/lib/index.js').href);

const SHOTS = process.env.SHOTS || 'C:/Users/gurpr/AppData/Local/Temp/shots-whitelist';
fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5173';
const ACCOUNT = 'demo_player05';
const stamp = Math.random().toString(36).slice(2, 8);
const LABEL = `probe ${stamp}`;
const ADDRESS = `0xSHOT${stamp}1111111111111111111111`;

const notes = [];
const note = (n, d = '') => { notes.push(`${n}${d ? ` — ${d}` : ''}`); console.log(`  ${n}${d ? ` — ${d}` : ''}`); };

const db = new pgMod.Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'root', database: 'bc_games' });
await db.connect();
const { rows: [me] } = await db.query('select id from users where name=$1', [ACCOUNT]);
if (!me) { console.log(`${ACCOUNT} does not exist`); process.exit(1); }
const { rows: before } = await db.query(
  'select * from user_withdrawal_whitelist where user_id=$1 order by id', [me.id],
);
const { rows: [flag] } = await db.query('select withdraw_whitelist_only from users where id=$1', [me.id]);
console.log(`snapshot: ${before.length} existing address(es), enforcement=${flag.withdraw_whitelist_only}\n`);

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
  await page.locator('input[type="password"]:visible').first().fill('Demo@12345');
  await page.locator('button:visible', { hasText: /^Sign In$/ }).last().click({ timeout: 10000 });
  await page.waitForTimeout(2600);
  await dismiss();

  console.log('\nthe pane');
  await page.goto(BASE + '/settings/whitelist', { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForTimeout(1400);
  note('pane heading', /Whitelist Management/.test(await body()) ? 'drawn' : 'MISSING');
  note('switch state line', /Whitelist Disabled|Whitelist Enabled/.test(await body()) ? 'drawn' : 'MISSING');
  await shot('01-pane-empty');

  console.log('\nadd address');
  await page.locator('button:visible', { hasText: 'Add Address' }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  note('add dialog opened', page.url().endsWith('/settings/whitelist/add') ? page.url() : 'URL DID NOT CHANGE');
  const addBody = await body();
  note('form labels', ['Address Name', 'Currency', 'Network', 'Address'].filter((l) => addBody.includes(l)).join(', '));
  await shot('02-add-empty');

  const inputs = page.locator('form input:visible');
  await inputs.nth(0).fill(LABEL);
  await inputs.nth(1).fill(ADDRESS);
  await shot('03-add-filled');

  await page.locator('button:visible', { hasText: /^Save$/ }).first().click({ timeout: 8000 });
  await page.waitForTimeout(2200);
  await dismiss();
  const afterAdd = await body();
  note('back on the pane', page.url().endsWith('/settings/whitelist') ? 'yes' : `NO — ${page.url()}`);
  note('the new row is listed', afterAdd.includes(LABEL) ? 'yes' : 'NO — the pane did not re-read');
  /* READ THE CELL, not the page. This was a regex over `body()` and reported "NOT THE LABEL"
     against a row that was plainly correct in the screenshot beside it — a harness bug of exactly
     the kind this file exists to catch in the app, so it is worth naming: the fourth `<td>` IS
     the Network column, and asking for it directly cannot be wrong about which text it read.
     Asserted as a SHAPE — "Name (STANDARD)" — rather than one coin's value, because the form
     defaults to whatever the wallet's first tokened currency is. */
  const network = (await page.locator('table tbody tr td').nth(3).innerText().catch(() => '')).trim();
  note('the Network cell shows the token label',
    /^[A-Z][\w ]* \([A-Z0-9]+\)$/.test(network) ? network : `NOT A TOKEN LABEL — "${network}"`);
  await shot('04-pane-with-row');

  console.log('\nedit');
  await page.locator('button[aria-label="Edit"]:visible').first().click({ timeout: 8000 });
  await page.waitForTimeout(1300);
  note('edit dialog opened', page.url().endsWith('/settings/whitelist/edit') ? page.url() : 'URL DID NOT CHANGE');
  const editBody = await body();
  note('it carries the row', editBody.includes(LABEL) ? 'label prefilled' : 'LABEL MISSING');
  note('the immutable fields are disabled',
    (await page.locator('form input:disabled, form button:disabled').count()) >= 2 ? 'yes' : 'NO');
  note('and it says why', /Only the name can be changed/.test(editBody) ? 'yes' : 'NO');
  await shot('05-edit');

  await page.locator('form input:not(:disabled):visible').first().fill(`${LABEL} renamed`);
  await page.locator('button:visible', { hasText: /^Save$/ }).first().click({ timeout: 8000 });
  await page.waitForTimeout(2200);
  await dismiss();
  note('the rename is on the pane',
    (await body()).includes(`${LABEL} renamed`) ? 'yes' : 'NO — the pane did not re-read');
  await shot('06-pane-renamed');

  console.log('\nthe switch');
  await page.locator('[role="switch"]:visible').first().click({ timeout: 8000 });
  await page.waitForTimeout(2200);
  note('arming needs no confirm and sticks',
    /Whitelist Enabled/.test(await body()) ? 'Whitelist Enabled' : 'DID NOT ARM');
  await shot('07-armed');

  await page.locator('[role="switch"]:visible').first().click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  const confirmBody = await body();
  note('disarming raises a confirm first',
    /may lead to greater risk/.test(confirmBody) ? 'drawn' : 'NO CONFIRM');
  note('  and its title is the chunk\u2019s own wrong one',
    /Remove Passkey/.test(confirmBody) ? 'Remove Passkey (as on bc.game)' : 'not drawn');
  await shot('08-disarm-confirm');

  await page.locator('button:visible', { hasText: /^Confirm$/ }).first().click({ timeout: 8000 });
  await page.waitForTimeout(2200);
  note('and disarms', /Whitelist Disabled/.test(await body()) ? 'Whitelist Disabled' : 'STILL ARMED');
  await shot('09-disarmed');

  /* THE PHONE ARM IS WALKED WITH A ROW STILL ON THE LIST, and the delete is done THROUGH its own
     three-dot menu. That row markup and that menu were transcribed from the chunk and had never
     rendered once — the "an unreachable branch is untested theory" case, twice over — so the
     delete happens here rather than on the desktop table, and covers both in one pass. */
  console.log('\nphone arm, 390x844');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1400);
  const phoneBody = await body();
  note('the row is drawn as label/value pairs',
    ['Currency', 'Address', 'Type', 'Network', 'Last Updated'].every((l) => phoneBody.includes(l))
      ? 'all five lines' : 'MISSING LINES');
  note('  and its Type reads Standard',
    /Standard Address/.test(phoneBody) ? 'Standard Address' : 'NOT STANDARD');
  await shot('10-phone-row');

  await page.locator('button[aria-label="More"]:visible').first().click({ timeout: 8000 });
  await page.waitForTimeout(700);
  const menuBody = await body();
  note('the three-dot menu opens',
    /Edit/.test(menuBody) && /Delete/.test(menuBody) ? 'Edit + Delete' : 'DID NOT OPEN');
  await shot('11-phone-menu');

  console.log('\ndelete');
  await page.locator('button:visible', { hasText: /^Delete$/ }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  const delBody = await body();
  note('delete confirm names the address',
    delBody.includes(`delete address ${LABEL} renamed`) ? 'yes' : 'NAME NOT INTERPOLATED');
  await shot('12-delete-confirm');

  await page.locator('button:visible', { hasText: /^Delete$/ }).last().click({ timeout: 8000 });
  await page.waitForTimeout(2400);
  note('the row is gone', (await body()).includes(LABEL) ? 'STILL THERE' : 'removed');
  await shot('13-phone-empty-again');

  console.log('\npage errors: ' + (errors.length ? errors.join(' | ') : 'none'));
} catch (error) {
  console.log('\nERROR: ' + (error?.message ?? String(error)).slice(0, 900));
  await page.screenshot({ path: `${SHOTS}/zz-error.png` }).catch(() => {});
} finally {
  await browser.close();
  /* By stamp, so only rows this run wrote can match — then put back what was there. */
  await db.query('delete from user_withdrawal_whitelist where user_id=$1 and label like $2',
    [me.id, `probe ${stamp}%`]);
  for (const r of before) {
    await db.query(
      `INSERT INTO user_withdrawal_whitelist (id,user_id,label,currency,network,address,memo,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
      [r.id, r.user_id, r.label, r.currency, r.network, r.address, r.memo, r.created_at, r.updated_at],
    );
  }
  await db.query('update users set withdraw_whitelist_only=$1 where id=$2',
    [flag.withdraw_whitelist_only, me.id]);
  await db.end();
  console.log(`\nrestored: ${before.length} pre-existing address(es), enforcement=${flag.withdraw_whitelist_only}`);
  console.log(`\n${notes.length} observations, shots in ${SHOTS}`);
}
