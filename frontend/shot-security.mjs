/* Throwaway visual check for every modal on Settings -> Security, built 2026-09-04.
 *
 *   PW=<scratchpad>/node_modules/playwright-core SHOTS=<dir> node shot-security.mjs
 *
 * Six tiles, and every one of them now opens something. This walks each in turn and photographs
 * it, because four of the six are UI-only — their backends do not exist — and a screen whose
 * action is deliberately inert is exactly the kind that gets shipped broken without a picture.
 *
 * IT ALSO ASSERTS THAT NOTHING ON THESE SCREENS IS THIS BUILD'S OWN WORDS. Each of the four inert
 * forms briefly carried a sentence explaining the missing backend; none of those is in the chunks,
 * so all four were removed and the check is now that they stay removed. The reason each control is
 * inert lives in its component's own note and in docs/settings.md, which is where it belongs.
 *
 * ── DESTRUCTIVE ONLY IN ONE PLACE, AND IT IS AVOIDED ────────────────────────────────────────
 *
 * Signs in as **demo_player05**. Nothing here submits: the email change stops at the code step
 * without a valid code, the 2FA confirm is cancelled, and the four inert forms cannot submit by
 * construction. `withdraw_locked_until` is cleared in `finally` regardless, since a 2FA disable
 * that somehow went through would set it.
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

const SHOTS = process.env.SHOTS || 'C:/Users/gurpr/AppData/Local/Temp/shots-security';
fs.mkdirSync(SHOTS, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5173';
const ACCOUNT = 'demo_player05';

const notes = [];
const note = (n, d = '') => { notes.push(`${n}${d ? ` — ${d}` : ''}`); console.log(`  ${n}${d ? ` — ${d}` : ''}`); };

const db = new pgMod.Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'root', database: 'bc_games' });
await db.connect();
const { rows: [me] } = await db.query('select id from users where name=$1', [ACCOUNT]);
if (!me) { console.log(`${ACCOUNT} does not exist`); process.exit(1); }

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
/* Every sentence these four screens once carried that bc.game never wrote. Asserted as ABSENT,
   which is the whole point of the pass that removed them. */
const INVENTED = [
  'This deployment',
  'Only the name can be changed',
  'is saved for',
  'no longer open',
];

const toSecurity = async () => {
  await page.goto(BASE + '/settings/security', { waitUntil: 'domcontentloaded' });
  await dismiss();
  await page.waitForTimeout(1400);
};

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

  await toSecurity();
  await shot('00-security-pane');

  /* Every tile, by the label on its button. `open` navigates by clicking, so the TILE's own
     handler is what is under test rather than the URL. */
  const open = async (label) => {
    /* WAIT FOR IT, then scroll, then click. The one-shot `click` this used to be timed out on the
       Anti-Phishing tile alone — the last of the six and the furthest down the pane — while the
       button was plainly in the DOM on a fresh load. Waiting explicitly says whether the button
       is missing or merely late, which a click's own timeout does not. */
    const button = page.locator('button', { hasText: label }).first();
    await button.waitFor({ state: 'visible', timeout: 15000 });
    await button.scrollIntoViewIfNeeded();
    await button.click({ timeout: 8000 });
    await page.waitForTimeout(1200);
  };

  // ── 1. Change Password (already built; the confirm in front of it is 4b.18) ──────────────
  console.log('\n1. Change Password');
  await open(/^Change Password$/);
  note('Account Restrictions confirm', /Account Restrictions/.test(await body()) ? 'raised' : 'MISSING');
  await shot('01-change-password-confirm');
  await page.locator('button:visible', { hasText: /^Cancel$/ }).first().click({ timeout: 6000 });
  await page.waitForTimeout(600);

  // ── 2. Email ────────────────────────────────────────────────────────────────────────────
  console.log('\n2. Email');
  await open(/^(Verify Email|Change Email)$/);
  const email = await body();
  note('the email dialog opened', page.url().includes('/user-action/email') ? page.url().split('/').pop() : 'URL DID NOT CHANGE');
  note('  heading', /Change Email Address/.test(email) ? 'Change Email Address' : /Email Verification/.test(email) ? 'Email Verification' : 'NO HEADING');
  note('  and carries no copy of this build’s own', INVENTED.every((t) => !email.includes(t)) ? 'none' : 'INVENTED COPY PRESENT');
  await shot('02-email');
  await toSecurity();

  // ── 3. Phone ────────────────────────────────────────────────────────────────────────────
  console.log('\n3. Phone');
  await open(/^(Verify Phone Number|Change Phone Number)$/);
  const phone = await body();
  note('the phone dialog opened', page.url().includes('/user-action/phone') ? page.url().split('/').pop() : 'URL DID NOT CHANGE');
  note('  and carries no copy of this build’s own', INVENTED.every((t) => !phone.includes(t)) ? 'none' : 'INVENTED COPY PRESENT');
  await shot('03-phone');
  await toSecurity();

  // ── 4. Two-factor ───────────────────────────────────────────────────────────────────────
  console.log('\n4. Two-factor');
  const twofaLabel = /Disable 2FA/.test(await body()) ? /^Disable 2FA$/ : /^Enable 2FA$/;
  await open(twofaLabel);
  const twofa = await body();
  note('the 2FA dialog opened', /Disable 2FA/.test(twofa) ? 'Disable 2FA confirm' : /Enable 2FA/.test(twofa) ? 'Enable 2FA (enrolment)' : 'NOTHING');
  await shot('04-twofactor');
  const cancel = page.locator('button:visible', { hasText: /^Cancel$/ }).first();
  if (await cancel.count().catch(() => 0)) await cancel.click({ timeout: 4000 }).catch(() => {});
  await toSecurity();

  // ── 5. Passkey ──────────────────────────────────────────────────────────────────────────
  console.log('\n5. Passkey');
  await open(/^(Enable Passkey|Edit Passkey)$/);
  const passkey = await body();
  note('the passkey dialog opened', page.url().endsWith('/settings/passkey') ? page.url() : 'URL DID NOT CHANGE');
  note('  three benefit lines', ['without password', 'Improves security', 'across all devices'].every((t) => passkey.includes(t)) ? 'all three' : 'MISSING');
  note('  and carries no copy of this build’s own', INVENTED.every((t) => !passkey.includes(t)) ? 'none' : 'INVENTED COPY PRESENT');
  await shot('05-passkey');
  await toSecurity();

  // ── 6. Anti-phishing ────────────────────────────────────────────────────────────────────
  console.log('\n6. Anti-Phishing Code');
  await open(/Anti-Phishing Code$/);
  note('the explainer opened', page.url().endsWith('/settings/phishing/enter') ? page.url() : `NO — ${page.url()}`);
  note('  and explains it', /appear in official BC.GAME emails/.test(await body()) ? 'yes' : 'COPY MISSING');
  await shot('06-phishing-enter');

  await page.locator('button:visible', { hasText: /^Create$/ }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1100);
  note('Create replaces the explainer', page.url().endsWith('/settings/phishing/create') ? page.url() : `NO — ${page.url()}`);
  const rules = await body();
  note('  both rules are listed', /6-8 characters/.test(rules) && /At lest 3 of the following types/.test(rules) ? 'yes (typo kept)' : 'MISSING');
  note('  Create starts disabled', await page.locator('button:disabled', { hasText: /^Create$/ }).count().catch(() => 0) ? 'disabled' : 'NOT DISABLED');
  note('  and no copy of this build’s own', INVENTED.every((t) => !rules.includes(t)) ? 'none' : 'INVENTED COPY PRESENT');
  await shot('07-phishing-create');

  /* The rules are live: a value that satisfies both must arm the button, and one that satisfies
     neither must not. That is the only behaviour on this screen that is not inert. */
  await page.locator('form input:visible, .input input:visible').first().fill('aaaaaa');
  await page.waitForTimeout(400);
  note('  a weak code leaves it disabled',
    await page.locator('button:disabled', { hasText: /^Create$/ }).count().catch(() => 0) ? 'still disabled' : 'ARMED TOO EARLY');
  await page.locator('form input:visible, .input input:visible').first().fill('Ab3_de');
  await page.waitForTimeout(400);
  note('  a valid one arms it',
    await page.locator('button:disabled', { hasText: /^Create$/ }).count().catch(() => 0) ? 'STILL DISABLED' : 'armed');
  await shot('08-phishing-create-valid');

  console.log('\n   the phone arm, 390x844');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await shot('09-phishing-create-phone');

  console.log('\npage errors: ' + (errors.length ? errors.join(' | ') : 'none'));
} catch (error) {
  console.log('\nERROR: ' + (error?.message ?? String(error)).slice(0, 700));
  await page.screenshot({ path: `${SHOTS}/zz-error.png` }).catch(() => {});
} finally {
  await browser.close();
  await db.query('update users set withdraw_locked_until = null where id=$1', [me.id]);
  await db.end();
  console.log(`\n${notes.length} observations, shots in ${SHOTS}`);
}
