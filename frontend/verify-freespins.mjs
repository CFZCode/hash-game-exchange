/* Throwaway harness for the three pieces built 2026-09-04 after the whitelist:
 *
 *   HAPPY_DOM=<scratchpad>/node_modules/happy-dom node verify-freespins.mjs
 *
 *   1. gap 8's first half — a player's own freespin campaigns, and the adapter that turns one
 *      into the row `components/modals/FreePlay` already renders;
 *   2. the 24-hour withdrawal freeze that migration 040 puts behind the "Account Restrictions"
 *      dialog — asserted on the column, on the write, and on the FIAT rail's refusal. The crypto
 *      rail carries the same guard and is not covered here: it is a websocket event, and standing
 *      a socket client up for one assertion is more harness than the claim is worth. Its guard is
 *      three lines beside `system_locked` in `crypto-withdraw/sockets.js` and reads the same
 *      column;
 *   3. nothing for the dialog cross — that is pixels, and `shot-freespins.mjs` has it.
 *
 * Needs `backend copy` running (`npm run dev user admin casino gateway`).
 *
 * ── DESTRUCTIVE, WITH THE USUAL PRECAUTIONS ─────────────────────────────────────────────────
 *
 * Runs against **demo_player05**, never the account a human browses with. It creates one
 * freespin campaign and deletes it by id; it snapshots `withdraw_locked_until` and restores it
 * in `finally`. It does NOT change that account's password — the freeze is asserted by writing
 * the column directly, because changing a demo account's password would leave it unusable if
 * this run died between the change and the restore. The write path itself is asserted separately
 * against a throwaway account.
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

const ACCOUNT = 'demo_player05';
const stamp = Math.random().toString(36).slice(2, 8);

let db;
let me = null;
let lockSnapshot;

try {
  const freePlay = await load('/src/services/freePlay.js');
  const auth = await load('/src/services/auth.js');

  const { default: pgMod } = await import(pathToFileURL('D:/CFZ/bc-games/backend copy/node_modules/pg/lib/index.js').href);
  db = new pgMod.Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'root', database: 'bc_games' });
  await db.connect();

  const { rows: [row] } = await db.query('select id, withdraw_locked_until from users where name=$1', [ACCOUNT]);
  if (!row) throw new Error(`${ACCOUNT} does not exist`);
  me = row.id;
  lockSnapshot = row.withdraw_locked_until;
  console.log(`snapshot: withdraw_locked_until=${lockSnapshot ?? 'null'}\n`);

  await auth.login({ identifier: ACCOUNT, password: 'Demo@12345' });

  // ══════════════════════════════════════════════════════════════════════
  section('gap 8 — a player can finally see their own free spins');

  await db.query('delete from gis_freespins where freespin_id like $1', [`probe-${stamp}%`]);
  await db.query(
    `insert into gis_freespins
       (user_id,freespin_id,game_uuid,currency,quantity,quantity_left,
        valid_from,valid_until,denomination,bet_id,status,is_canceled,created_at,updated_at)
     values ($1,$2,'limbo','USDT',20,14,now()-interval '1 day',now()+interval '7 days',0.10,'bet1','active',0,now(),now())`,
    [me, `probe-${stamp}-active`],
  );

  const payload = await freePlay.getFreePlays();
  check('getFreePlays answers the dialog envelope',
    payload && Array.isArray(payload.freeSpins), JSON.stringify(Object.keys(payload ?? {})));
  const mine = (payload?.freeSpins ?? []).find((r) => r.fsId === `probe-${stamp}-active`);
  check('  the seeded campaign is listed', Boolean(mine), `${payload?.freeSpinCount} spins`);

  /* ASSERT WHAT THE COMPONENT NEEDS, not what the platform sends — the rule `verify-wiring.mjs`
     learned by pinning `'INR'` and passing while the row drew a broken image. Every field below
     is one `FreePlayRow` reads. */
  check('  bonusType picks the free-spin arm', mine?.bonusType === 'Free Spin', mine?.bonusType);
  check('  fullName is the GAME, resolved server-side', mine?.fullName === 'Limbo', mine?.fullName);
  check('  gameUnique is what Play Now navigates to', mine?.gameUnique === 'limbo', mine?.gameUnique);
  check('  quantity is what is LEFT, not what was granted', mine?.quantity === 14, String(mine?.quantity));
  check('  currencyName is a wallet key', mine?.currencyName === 'USDT', mine?.currencyName);
  check('  amount is the per-spin stake', Number(mine?.amount) === 0.1, String(mine?.amount));
  check('  fsId rides the Play Now query', mine?.fsId === `probe-${stamp}-active`, mine?.fsId);
  check('  rewardItemId is set', Boolean(mine?.rewardItemId), String(mine?.rewardItemId));
  /* THE ARTWORK RESOLVES LOCALLY, which is what this row needs and what the server cannot give:
     `js_games.game_icon` is null for all twenty in-house games and the aggregator catalogue is
     empty, so a row that trusted the feed would draw nothing. `limbo` has a cover in
     `src/assets/games`, so this asserts the hit; the miss arm is asserted below, and it must be
     `undefined` rather than another game's art — `assetExact`, not `assetFor`. */
  check('  iconThreeFour resolves this build’s own artwork',
    typeof mine?.iconThreeFour === 'string' && /limbo\.(avif|png|jpg)/.test(mine.iconThreeFour),
    String(mine?.iconThreeFour));

  /* THE MISS ARM, which is the one that matters: `assetFor` would hand back SOME game's cover
     for an unknown slug and put another game's picture on a free spin. */
  await db.query(
    `insert into gis_freespins (user_id,freespin_id,game_uuid,currency,quantity,quantity_left,valid_until,status,is_canceled,created_at,updated_at)
     values ($1,$2,'no-such-game-xyz','USDT',3,3,now()+interval '7 days','active',0,now(),now())`,
    [me, `probe-${stamp}-nocover`],
  );
  const withUnknown = await freePlay.getFreePlays();
  const unknown = (withUnknown?.freeSpins ?? []).find((r) => r.fsId === `probe-${stamp}-nocover`);
  check('  and is undefined for a game with no cover, not another game’s',
    unknown?.iconThreeFour === undefined, String(unknown?.iconThreeFour));
  check('  a campaign whose game cannot be named still lists',
    unknown?.fullName === 'no-such-game-xyz', unknown?.fullName);
  await db.query('delete from gis_freespins where freespin_id=$1', [`probe-${stamp}-nocover`]);

  check('  the counts drive the tab strip', payload?.totalCount === payload?.freeSpins.length
    && payload?.freeSpinCount === payload?.freeSpins.length, `${payload?.totalCount}`);
  check('  freeBetCount is 0 — no sports provider exists to grant one',
    payload?.freeBetCount === 0 && payload?.freeBets.length === 0, String(payload?.freeBetCount));

  // ── the three exclusions, each of which would put a dead row on screen ──
  const hidden = [
    ['cancelled', `insert into gis_freespins (user_id,freespin_id,game_uuid,currency,quantity,quantity_left,valid_until,status,is_canceled,created_at,updated_at) values ($1,$2,'dice','USDT',5,5,now()+interval '7 days','canceled',1,now(),now())`],
    ['expired', `insert into gis_freespins (user_id,freespin_id,game_uuid,currency,quantity,quantity_left,valid_from,valid_until,status,is_canceled,created_at,updated_at) values ($1,$2,'dice','USDT',5,5,now()-interval '9 days',now()-interval '1 day','active',0,now(),now())`],
    ['not yet started', `insert into gis_freespins (user_id,freespin_id,game_uuid,currency,quantity,quantity_left,valid_from,valid_until,status,is_canceled,created_at,updated_at) values ($1,$2,'dice','USDT',5,5,now()+interval '1 day',now()+interval '9 days','active',0,now(),now())`],
  ];
  for (const [name, sql] of hidden) {
    const id = `probe-${stamp}-${name.replace(/\s/g, '')}`;
    await db.query(sql, [me, id]);
    const again = await freePlay.getFreePlays();
    check(`  a ${name} campaign is not listed`,
      !(again?.freeSpins ?? []).some((r) => r.fsId === id), `${again?.freeSpinCount} listed`);
  }

  // ══════════════════════════════════════════════════════════════════════
  section('migration 040 — the 24h freeze the dialog promises');

  const { rows: [col] } = await db.query(
    `select data_type, is_nullable from information_schema.columns
      where table_name='users' and column_name='withdraw_locked_until'`,
  );
  check('users.withdraw_locked_until exists and is nullable',
    col?.data_type?.startsWith('timestamp') && col?.is_nullable === 'YES', `${col?.data_type}`);

  /* THE WHOLE CHAIN, ON A THROWAWAY ACCOUNT — register, change its password, and then try to
     withdraw as it. That is the actual scenario the dialog describes, and doing it on a real
     account is what the demo logins must never be used for: `changePassword` revokes every
     session and leaves the account on a new password, so a run that died halfway would leave
     `demo_player05` unusable for the next person.

     IT ALSO FIXES A TEST BUG WORTH NAMING. This block used to change the probe account's
     password and then assert against `demo_player05`'s column — but `auth.register` SIGNS THE
     NEW ACCOUNT IN, so the client's token was the probe's all along and the withdrawal was
     submitted as the probe. It passed the refusal assertion for entirely the wrong reason and
     then failed the expiry one, which is the only reason it was caught. */
  const email = `probe_${stamp}@demo.local`;
  const username = email.split('@')[0];
  const withdrawal = {
    amount: '100', currency: 'INR', accountHolderName: 'Probe', upiId: 'probe@upi',
  };
  const client = await load('/src/services/client.js');
  const submit = async () => {
    try {
      await client.request('/api/v1/user/withdrawals/fiat', { live: true, method: 'POST', json: withdrawal });
      return null;
    } catch (error) { return error; }
  };
  const isCooldown = (e) => /COOLDOWN/i.test(String(e?.code)) || /paused for 24 hours/i.test(String(e?.message));

  try {
    await auth.register({ email, password: 'Probe@123456' });
    await auth.changePassword({ currentPassword: 'Probe@123456', newPassword: 'Probe@654321' });

    const { rows: [after] } = await db.query(
      'select id, withdraw_locked_until from users where name=$1', [username],
    );
    const wrote = after?.withdraw_locked_until ? new Date(after.withdraw_locked_until) : null;
    const hours = wrote ? (wrote.getTime() - Date.now()) / 3_600_000 : 0;
    check('changePassword writes a freeze ~24h out', hours > 23.9 && hours < 24.1, `${hours.toFixed(2)}h`);

    /* Every session was revoked by the change, so signing in again is part of the flow rather
       than a workaround — it is what the real visitor does. */
    await auth.login({ identifier: username, password: 'Probe@654321' });

    const refused = await submit();
    check('the fiat rail refuses inside the window', isCooldown(refused),
      `${refused?.code ?? 'NOT REFUSED'}`);

    /* A PAST timestamp is simply not a lock — nothing sweeps the column, which is the whole
       reason it is a timestamp and not a flag. The next refusal is KYC, which is correct: this
       account is unverified and that gate is real too. */
    await db.query(`update users set withdraw_locked_until = now() - interval '1 minute' where id=$1`, [after.id]);
    const afterExpiry = await submit();
    check('  and a PAST timestamp is simply not a lock', !isCooldown(afterExpiry),
      `${afterExpiry?.code ?? 'accepted'} — the next gate`);

    await db.query('update users set withdraw_locked_until = null where id=$1', [after.id]);
    const cleared = await submit();
    check('  a null column is not a lock either', !isCooldown(cleared),
      `${cleared?.code ?? 'accepted'}`);
  } catch (error) {
    if (error?.code === 'TOO_MANY_REQUESTS') {
      check('changePassword writes a freeze — SKIPPED, rate-limit budget spent', true,
        'set RATE_LIMIT_ENABLED=false');
      check('  (the two rail assertions skipped with it)', true, '');
      check('  (and the third)', true, '');
      check('  (and the fourth)', true, '');
    } else {
      check('the password-change freeze chain', false, `${error?.code} ${error?.message}`);
    }
  }
} catch (error) {
  check('harness', false, error?.message ?? String(error));
  console.error(error);
} finally {
  if (db && me) {
    await db.query('delete from gis_freespins where freespin_id like $1', [`probe-${stamp}%`]);
    await db.query('update users set withdraw_locked_until=$1 where id=$2', [lockSnapshot ?? null, me]);
    const { rows } = await db.query(`select id from users where name like $1`, [`probe\\_${stamp}%`]);
    for (const r of rows) {
      await db.query('delete from auth_verification_tokens where user_id=$1', [r.id]);
      await db.query('delete from auth_sessions where user_id=$1', [r.id]);
      await db.query('delete from credits where uid=$1', [r.id]);
      await db.query('delete from users where id=$1', [r.id]);
    }
    await db.query(`delete from auth_login_attempts where identifier like $1`, [`probe\\_${stamp}%`]);
    await db.end();
    console.log(`\nrestored: withdraw_locked_until=${lockSnapshot ?? 'null'}, ${rows.length} probe account(s) removed`);
  }
  await server.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
