/* Throwaway harness for the withdrawal whitelist's WRITE path — gap 16, wired 2026-09-04.
 *
 *   HAPPY_DOM=<scratchpad>/node_modules/happy-dom node verify-whitelist.mjs
 *
 * Calls the services rather than rendering the pane: these are four adapters over five routes,
 * and what matters is that each maps onto the shape `pages/Settings/Whitelist.jsx` already
 * expects. `shot-whitelist.mjs` covers the pixels.
 *
 * Needs `backend copy` running (`npm run dev user admin casino gateway`).
 *
 * ── IT IS DESTRUCTIVE, SO READ THIS BEFORE POINTING IT ANYWHERE ELSE ─────────────────────────
 *
 * It runs against **demo_player05**, not demo_player03, because 03 is the account a human
 * browses this build with. Two harnesses have already destroyed real data by cleaning up more
 * than they made: `verify-tier2.js` took a pre-existing seeded bet, and `verify-favorites-home`
 * cleared every favourite on the account in the browser, which surfaced days later as "the
 * Favorites section disappeared". So:
 *
 *   · every address this run creates is tracked by ID and deleted by ID;
 *   · the enforcement flag and any PRE-EXISTING addresses are snapshotted up front and restored
 *     in `finally`, whatever happened in between;
 *   · nothing is deleted by a `where` clause that could match a row this run did not write.
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
/* Random so two runs in the same minute cannot collide on the unique key, and prefixed so a row
   left behind by a crash is identifiable by eye. */
const stamp = Math.random().toString(36).slice(2, 8);
const made = [];

let db;
let snapshot = null;

try {
  const settings = await load('/src/services/settings.js');
  const auth = await load('/src/services/auth.js');

  const { default: pgMod } = await import(pathToFileURL('D:/CFZ/bc-games/backend copy/node_modules/pg/lib/index.js').href);
  db = new pgMod.Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'root', database: 'bc_games' });
  await db.connect();

  const { rows: [me] } = await db.query('select id from users where name=$1', [ACCOUNT]);
  if (!me) throw new Error(`${ACCOUNT} does not exist — seed it before running this`);

  /* THE SNAPSHOT, taken before anything is written and restored in `finally`. */
  const { rows: before } = await db.query(
    'select * from user_withdrawal_whitelist where user_id=$1 order by id', [me.id],
  );
  const { rows: [flag] } = await db.query(
    'select withdraw_whitelist_only from users where id=$1', [me.id],
  );
  snapshot = { userId: me.id, rows: before, enforcement: flag.withdraw_whitelist_only };
  console.log(`snapshot: ${before.length} existing address(es), enforcement=${snapshot.enforcement}\n`);

  await auth.login({ identifier: ACCOUNT, password: process.env.DEMO_PASSWORD });

  // ══════════════════════════════════════════════════════════════════════
  section('the read, and the adapter under it');

  const empty = await settings.getWhitelist();
  check('getWhitelist answers an array', Array.isArray(empty), `${empty.length} rows`);
  const wasEnabled = await settings.getWhitelistEnabled();
  check('getWhitelistEnabled answers a boolean', typeof wasEnabled === 'boolean', String(wasEnabled));

  // ══════════════════════════════════════════════════════════════════════
  section('add');

  const added = await settings.addWhitelistAddress({
    label: `probe ${stamp}`,
    currency: 'USDT',
    network: 'ETHEREUM',
    address: `0xPROBE${stamp}0000000000000000000000`,
  });
  check('addWhitelistAddress returns the stored row', Boolean(added?.id), `id=${added?.id}`);
  if (added?.id) made.push(added.id);

  const listed = await settings.getWhitelist();
  const row = listed.find((r) => String(r.id) === String(added?.id));
  check('  and it comes back on the list', Boolean(row), `${listed.length} rows now`);

  /* THE ASSERTIONS BELOW ARE THE COMPONENT'S SHAPE, NOT THE PLATFORM'S. That is the whole point
     of this file: `verify-wiring.mjs` once asserted `originalCurrencyName === 'INR'` — what the
     server sends — and passed while the row drew a broken image, because the component keys on
     the wallet spelling. Every field here is one `Whitelist.jsx` actually reads. */
  check('  addressName is the label', row?.addressName === `probe ${stamp}`, row?.addressName);
  check('  currencyName is a wallet key', row?.currencyName === 'USDT', row?.currencyName);
  check('  withdrawAddress is the address', row?.withdrawAddress?.startsWith('0xPROBE'), row?.withdrawAddress);
  check('  chain is the raw network (the filter groups on it)', row?.chain === 'ETHEREUM', row?.chain);
  /* The correction this pass made: `label` used to echo `network`, so the Network column printed
     "ETHEREUM" where bc.game prints a token's display label. The literal is safe HERE because
     this run chose USDT/ETHEREUM two lines up; `shot-whitelist.mjs` asserts the SHAPE instead,
     since the form picks its own default there and pinning this value failed a correct row. */
  check('  label is the token label, not the bare chain',
    row?.label === 'Ethereum (ERC20)', row?.label);
  check('  addressType is Standard (this platform has no universal address)',
    row?.addressType === 0, String(row?.addressType));
  check('  createTime is a parsable epoch, not NaN',
    Number.isFinite(row?.createTime) && row.createTime > 0, String(row?.createTime));

  /* Adding the same address twice under the same currency is a 409, not a silent upsert. */
  let duplicate = null;
  try {
    await settings.addWhitelistAddress({
      label: `probe ${stamp} again`,
      currency: 'USDT',
      network: 'ETHEREUM',
      address: `0xPROBE${stamp}0000000000000000000000`,
    });
  } catch (error) { duplicate = error; }
  check('  a duplicate is refused with a message worth showing',
    Boolean(duplicate?.message), duplicate?.code ?? 'NOT REFUSED');

  // ══════════════════════════════════════════════════════════════════════
  section('rename — the only edit this platform allows');

  await settings.renameWhitelistAddress(added.id, { label: `probe ${stamp} renamed` });
  const afterRename = await settings.getWhitelist();
  const renamed = afterRename.find((r) => String(r.id) === String(added.id));
  check('renameWhitelistAddress changes the label',
    renamed?.addressName === `probe ${stamp} renamed`, renamed?.addressName);
  check('  and leaves the address itself alone',
    renamed?.withdrawAddress === row?.withdrawAddress, renamed?.withdrawAddress);

  // ══════════════════════════════════════════════════════════════════════
  section('enforcement');

  const armed = await settings.setWhitelistEnabled(true);
  check('setWhitelistEnabled(true) is accepted with a list', Boolean(armed) || armed === undefined, '');
  check('  and READS BACK as on', (await settings.getWhitelistEnabled()) === true, '');

  await settings.setWhitelistEnabled(false);
  check('setWhitelistEnabled(false) reads back as off',
    (await settings.getWhitelistEnabled()) === false, '');

  // ══════════════════════════════════════════════════════════════════════
  section('delete, and the two rules that guard the money');

  /* Arm it, then delete the only address: the server turns enforcement off by itself rather than
     leaving an account that can never withdraw. This is the reason the pane re-reads BOTH values
     after a delete instead of splicing its list, so it is worth an assertion. */
  const second = await settings.addWhitelistAddress({
    label: `probe ${stamp} b`,
    currency: 'BTC',
    network: 'BITCOIN',
    address: `bcPROBE${stamp}00000000000000000000`,
  });
  if (second?.id) made.push(second.id);

  await settings.setWhitelistEnabled(true);
  await settings.removeWhitelistAddress(added.id);
  await settings.removeWhitelistAddress(second.id);
  made.length = 0;

  const left = await settings.getWhitelist();
  const mineLeft = left.filter((r) => r.addressName.includes(stamp));
  check('removeWhitelistAddress removes both rows', mineLeft.length === 0, `${mineLeft.length} left`);

  /* Only meaningful when the account had no addresses of its own to start with — otherwise the
     list is not empty and the server is right to leave enforcement alone. */
  if (before.length === 0) {
    check('  emptying the list turns enforcement off by itself',
      (await settings.getWhitelistEnabled()) === false, '');
    let refused = null;
    try { await settings.setWhitelistEnabled(true); } catch (error) { refused = error; }
    check('  and arming an EMPTY list is refused, with the reason',
      /add an address/i.test(refused?.message ?? ''), refused?.message ?? 'NOT REFUSED');
  } else {
    check('  (enforcement rules skipped — account had addresses before this run)', true,
      `${before.length} pre-existing`);
    check('  (and the empty-list refusal with it)', true, '');
  }
} catch (error) {
  check('harness', false, error?.message ?? String(error));
  console.error(error);
} finally {
  if (db && snapshot) {
    /* BY ID, and only the ids this run created. */
    for (const id of made) {
      await db.query('delete from user_withdrawal_whitelist where id=$1 and user_id=$2',
        [id, snapshot.userId]);
    }
    /* Anything else carrying this run's stamp — a row created before an assertion threw. */
    await db.query(
      `delete from user_withdrawal_whitelist where user_id=$1 and label like $2`,
      [snapshot.userId, `probe ${stamp}%`],
    );
    /* Restore what was there. `ON CONFLICT DO NOTHING` because a row that survived is already
       correct; this puts back only what the run removed. */
    for (const r of snapshot.rows) {
      await db.query(
        `INSERT INTO user_withdrawal_whitelist (id,user_id,label,currency,network,address,memo,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
        [r.id, r.user_id, r.label, r.currency, r.network, r.address, r.memo, r.created_at, r.updated_at],
      );
    }
    await db.query('update users set withdraw_whitelist_only=$1 where id=$2',
      [snapshot.enforcement, snapshot.userId]);
    await db.end();
    console.log(`\nrestored: ${snapshot.rows.length} pre-existing address(es), enforcement=${snapshot.enforcement}`);
  }
  await server.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
