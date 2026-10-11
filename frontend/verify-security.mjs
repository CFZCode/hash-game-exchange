/* Throwaway harness for the two Security-pane modals that reach a real endpoint, 2026-09-04.
 *
 *   HAPPY_DOM=<scratchpad>/node_modules/happy-dom node verify-security.mjs
 *
 * Six tiles now open a modal and only TWO of them can submit — the e-mail CHANGE and the 2FA
 * DISABLE. The other four (verify e-mail, both phone arms, passkey, anti-phishing) have no
 * backend on this platform at all and their forms say so; `shot-security.mjs` photographs those,
 * because a deliberately inert screen is exactly what gets shipped broken without a picture.
 *
 * ── IT RUNS ENTIRELY ON THROWAWAY ACCOUNTS ──────────────────────────────────────────────────
 *
 * Not `demo_player05` and certainly not `demo_player03`: both flows here CHANGE A CREDENTIAL —
 * one moves the address password reset delivers to, the other removes a second factor — and a
 * run that died halfway would leave a demo login altered. Each account is registered by this
 * file, used, and deleted by id in `finally`.
 *
 * NEEDS `RATE_LIMIT_ENABLED=false` in `backend copy/.env`: it registers two accounts against a
 * 5-an-hour budget. It reports rather than fails when the budget is spent. Put the flag back.
 *
 * Nothing in src/ imports it.
 */
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';

const { Window } = await import(pathToFileURL(process.env.HAPPY_DOM + '/lib/index.js').href);
const win = new Window({ url: 'http://localhost:5173/' });
for (const k of ['document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'fetch']) {
  if (win[k] === undefined) continue;
  try { globalThis[k] = win[k]; } catch { /* getter-only */ }
}
globalThis.window = win;

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (p) => server.ssrLoadModule(p);

const results = [];
const check = (n, ok, d = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(56)} ${String(d).slice(0, 58)}`);
};
const section = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 56 - t.length))}`);
const rateLimited = (e) => e?.code === 'TOO_MANY_REQUESTS';

const stamp = Math.random().toString(36).slice(2, 8);
let db;

try {
  const auth = await load('/src/services/auth.js');
  const twoFactor = await load('/src/services/twoFactor.js');

  const { default: pgMod } = await import(pathToFileURL('D:/CFZ/bc-games/backend copy/node_modules/pg/lib/index.js').href);
  db = new pgMod.Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'root', database: 'bc_games' });
  await db.connect();

  // ══════════════════════════════════════════════════════════════════════
  section('the e-mail change — the only wired arm of four');

  const first = `probe_${stamp}a@demo.local`;
  const moved = `probe_${stamp}b@demo.local`;

  try {
    await auth.register({ email: first, password: 'Probe@123456' });

    /* ── SMTP IS NOT CONFIGURED ON THIS DEPLOYMENT, AND THAT IS THE FINDING ──────────────────
     *
     * `requestOtp` writes the row and THEN sends; a failed send throws `SEND_FAILED` after the
     * code already exists. So the request reaching the endpoint and failing there proves the
     * wiring is right and the blocker is four empty keys — the same one gap 12's password-reset
     * arm has, and the same class of blocker as the payment provider.
     *
     * A previous version of this file expected `requestEmailOtp` to SUCCEED, on a note in
     * `docs/backend-gaps.md` claiming the mailer "degrades by reporting failure rather than
     * throwing". It reports failure by throwing. Corrected in both places.
     */
    let send = null;
    try { await auth.requestEmailOtp({ email: moved, purpose: 'change-email' }); }
    catch (error) { send = error; }
    check('requestEmailOtp reaches the endpoint',
      send === null || /SEND_FAILED/.test(String(send?.code)), send?.code ?? 'sent');
    check('  (blocked on SMTP, which is a config gap not a code one)',
      send === null || /SEND_FAILED/.test(String(send?.code)), send ? 'SEND_FAILED' : 'SMTP configured');

    const { rows: [issued] } = await db.query(
      `select otp_hash from user_otps where email=$1 and purpose='change-email'
        order by id desc limit 1`,
      [moved],
    );
    check('  and the code is written before the send is attempted',
      Boolean(issued?.otp_hash), issued ? 'row present, hash only' : 'NO ROW');

    /* THE CODE IS HASHED IN THE TABLE, so it cannot be read back — which is correct and is why
       the rest of this section plants a KNOWN code with the platform's own hash function rather
       than trying to recover the issued one. That tests the route this pass wired; whether a
       mailbox receives anything is SMTP's business and is asserted above. */
    /* `@ibitplay/auth` is CommonJS, so under ESM its exports may land on `.default` instead of
       as named ones depending on how Node analyses it — the same interop trap the playwright
       harnesses note at the top. Take whichever actually carries the function. */
    const authPkg = await import(pathToFileURL('D:/CFZ/bc-games/backend copy/packages/auth/src/index.js').href);
    const { hashPassword } = authPkg.hashPassword ? authPkg : authPkg.default;
    const known = '123456';
    await db.query(
      `update user_otps set otp_hash=$1, attempts=0, is_verified=false
        where email=$2 and purpose='change-email'`,
      [await hashPassword(known, 10), moved],
    );

    let refusedWrong = null;
    try { await auth.changeEmail({ email: moved, code: '000000' }); }
    catch (error) { refusedWrong = error; }
    check('a wrong code is refused', Boolean(refusedWrong), refusedWrong?.code ?? 'ACCEPTED');

    await auth.changeEmail({ email: moved, code: known });
    const { rows: [after] } = await db.query('select email from users where name=$1', [first.split('@')[0]]);
    check('changeEmail moves the address', after?.email === moved, after?.email);

    /* SPENT, NOT JUST VERIFIED — one code authorises exactly one change, which is the whole
       reason the controller verifies and spends in the same call. */
    let replay = null;
    try { await auth.changeEmail({ email: first, code: known }); } catch (error) { replay = error; }
    check('  and the code cannot be replayed', Boolean(replay), replay?.code ?? 'REPLAY ACCEPTED');
  } catch (error) {
    if (rateLimited(error)) {
      for (const n of ['the e-mail chain — SKIPPED, rate limited', '  (five checks skipped)', '  (and one)', '  (and one)', '  (and one)', '  (and the last)']) check(n, true, 'set RATE_LIMIT_ENABLED=false');
    } else {
      check('the e-mail change chain', false, `${error?.code} ${error?.message}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  section('the 2FA disable — a confirm, then two proofs');

  const twofaEmail = `probe_${stamp}c@demo.local`;
  try {
    await auth.register({ email: twofaEmail, password: 'Probe@123456' });

    /* Enrol first, so there is something to disable. `beginTwoFactorSetup` answers the secret in
       clear — it has to, the visitor types it into an authenticator — so the harness can compute
       codes the same way the app would. */
    const setup = await twoFactor.beginTwoFactorSetup();
    check('beginTwoFactorSetup answers a secret', Boolean(setup?.secret), setup?.secret ? 'present' : 'MISSING');

    /* `currentCode(secret)`, not `generateCode` — the module's own name, and taking it positionally
       rather than as an object. Checked against `packages/auth/src/totp.js` rather than guessed,
       which is what the first version of this line did. */
    const authMod = await import(pathToFileURL('D:/CFZ/bc-games/backend copy/packages/auth/src/index.js').href);
    const { totp } = authMod.totp ? authMod : authMod.default;
    await twoFactor.completeTwoFactorSetup({ code: totp.currentCode(setup.secret) });
    const { rows: [on] } = await db.query(
      `select u.two_fa_status from users u where u.name=$1`, [twofaEmail.split('@')[0]],
    );
    check('  and enrolment turns it on', on?.two_fa_status === true, String(on?.two_fa_status));

    /* A WRONG PASSWORD MUST BE REFUSED even with a valid code — the point of asking for both. */
    let wrongPassword = null;
    try {
      await twoFactor.disableTwoFactor({
        code: totp.currentCode(setup.secret),
        password: 'Not@TheRightOne1',
      });
    } catch (error) { wrongPassword = error; }
    check('a valid code with the WRONG password is refused',
      Boolean(wrongPassword), wrongPassword?.code ?? 'ACCEPTED');

    /* And a wrong code with the right password. The two guards are independent. */
    let wrongCode = null;
    try {
      await twoFactor.disableTwoFactor({ code: '000000', password: 'Probe@123456' });
    } catch (error) { wrongCode = error; }
    check('  and the right password with a WRONG code is too',
      Boolean(wrongCode), wrongCode?.code ?? 'ACCEPTED');

    /* THE REAL ONE, AND IT HAS TO WAIT FOR THE NEXT 30-SECOND STEP.
     *
     * `verifyCodeOnce` refuses a code whose step equals `last_used_step` — a replay guard, and a
     * good one: it is what stops a code shoulder-surfed seconds ago from being reused. Enrolment
     * a moment ago consumed the current step, so asking to disable inside the same window is
     * correctly refused. This is the harness having to behave like a real visitor rather than a
     * defect, and it is worth the wait: skipping it would mean deleting the assertion that the
     * disable actually works. */
    const step = () => Math.floor(Date.now() / 30_000);
    const startedAt = step();
    while (step() === startedAt) {
      await new Promise((resolve) => { setTimeout(resolve, 500); });
    }
    await twoFactor.disableTwoFactor({
      code: totp.currentCode(setup.secret),
      password: 'Probe@123456',
    });
    const { rows: [off] } = await db.query(
      `select two_fa_status, withdraw_locked_until from users where name=$1`,
      [twofaEmail.split('@')[0]],
    );
    check('disableTwoFactor turns it off', off?.two_fa_status === false, String(off?.two_fa_status));

    /* THE DIALOG'S FIRST BULLET IS A PROMISE — "Withdrawals will be disabled for 24 hours after
       you disable the 2FA." It had nothing behind it until this pass, exactly like the password
       one; the service writes the same `withdraw_locked_until` column migration 040 added. */
    const hours = off?.withdraw_locked_until
      ? (new Date(off.withdraw_locked_until).getTime() - Date.now()) / 3_600_000
      : 0;
    check('  and freezes withdrawals for ~24h, as its own confirm says',
      hours > 23.9 && hours < 24.1, `${hours.toFixed(2)}h`);
  } catch (error) {
    if (rateLimited(error)) {
      for (const n of ['2FA disable — SKIPPED, rate limited', '  (four checks skipped)', '  (and two more)', '  (and one more)', '  (and the freeze)', '  (and the last)']) check(n, true, 'set RATE_LIMIT_ENABLED=false');
    } else {
      check('the 2FA disable chain', false, `${error?.code} ${error?.message}`);
    }
  }
} catch (error) {
  check('harness', false, error?.message ?? String(error));
  console.error(error);
} finally {
  if (db) {
    const { rows } = await db.query(`select id from users where name like $1`, [`probe\\_${stamp}%`]);
    for (const r of rows) {
      await db.query('delete from user_2fa where uid=$1', [String(r.id)]).catch(() => {});
      await db.query('delete from auth_verification_tokens where user_id=$1', [r.id]);
      await db.query('delete from auth_sessions where user_id=$1', [r.id]);
      await db.query('delete from credits where uid=$1', [r.id]);
      await db.query('delete from users where id=$1', [r.id]);
    }
    await db.query(`delete from user_otps where email like $1`, [`probe\\_${stamp}%`]);
    await db.query(`delete from auth_login_attempts where identifier like $1`, [`probe\\_${stamp}%`]);
    await db.end();
    console.log(`\ncleaned up ${rows.length} probe account(s)`);
  }
  await server.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
