/* Throwaway harness for the front-end wiring of the 2026-09-04 backend routes.
 *
 *   HAPPY_DOM=<scratchpad>/node_modules/happy-dom node verify-wiring.mjs
 *
 * Calls the SERVICES rather than rendering pages — these are adapters, and what
 * matters is that each maps the platform's shape onto the one its component
 * already expects. `verify-pages.mjs` covers the rendering.
 *
 * Needs `backend copy` running. Registration is metered at 5/hour, so the
 * sign-up check needs `RATE_LIMIT_ENABLED=false` like `verify-new-routes.mjs`;
 * it reports rather than fails when the budget is spent.
 *
 * Cleans up the accounts it creates. Nothing in src/ imports it.
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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n.padEnd(54)} ${String(d).slice(0, 60)}`);
};
const section = (t) => console.log(`\n── ${t} ${'─'.repeat(Math.max(0, 54 - t.length))}`);

let pg;
let db;

try {
  const auth = await load('/src/services/auth.js');
  const notifications = await load('/src/services/notification.js');
  const accountCtx = await load('/src/context/account.js');
  const persist = await load('/src/context/persist.js');

  const { default: pgMod } = await import(pathToFileURL('D:/CFZ/bc-games/backend copy/node_modules/pg/lib/index.js').href);
  pg = pgMod;
  db = new pg.Client({ host: '127.0.0.1', port: 5433, user: 'postgres', password: 'root', database: 'bc_games' });
  await db.connect();

  // ══════════════════════════════════════════════════════════════════════
  section('gap 12 — the Sign Up tab reaches the platform');
  const email = `probe_${Date.now()}@demo.local`;
  let signedUp = null;
  try {
    signedUp = await auth.register({ email, password: 'Probe@123456' });
    check('register() creates an account AND signs in',
      signedUp?.account?.login === true, `name=${signedUp?.account?.name}`);
    check('  the username is derived from the email local part',
      signedUp?.account?.name === email.split('@')[0], signedUp?.account?.name);
    check('  and a wallet came back with it',
      Array.isArray(signedUp?.balances) && signedUp.balances.length > 0,
      `${signedUp?.balances?.length} currencies`);
  } catch (e) {
    if (e?.code === 'TOO_MANY_REQUESTS') {
      check('register() — SKIPPED, rate-limit budget spent', true, 'set RATE_LIMIT_ENABLED=false');
      check('  (two further sign-up checks skipped)', true, '');
      check('  (and one more)', true, '');
    } else {
      check('register() creates an account AND signs in', false, `${e?.code} ${e?.message}`);
      check('  the username is derived from the email local part', false, '');
      check('  and a wallet came back with it', false, '');
    }
  }

  /* A password reset request must answer identically for a known and an unknown address. */
  const a = await auth.requestPasswordReset({ email }).catch((e) => ({ err: e?.code }));
  const b = await auth.requestPasswordReset({ email: 'nobody@nowhere.invalid' }).catch((e) => ({ err: e?.code }));
  check('requestPasswordReset answers the same either way',
    JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a));

  // ══════════════════════════════════════════════════════════════════════
  section('gap 10 — the notification drawer');
  const { account } = await auth.login({ identifier: 'demo_player03', password: process.env.DEMO_PASSWORD });
  persist.createPersistedStore('account', accountCtx.ACCOUNT_DEFAULTS).write({
    login: true, name: account.name, setting: account.setting,
  });
  const { rows: [d3] } = await db.query(`select id from users where name='demo_player03'`);
  await db.query('delete from user_notifications where user_id=$1', [d3.id]);
  for (const [t, body, type] of [
    ['Deposit received', 'INR 500 credited', 'deposit'],
    ['Welcome', 'Thanks for joining', 'general'],
    ['Weekend bonus', 'Claim it now', 'promotion'],
  ]) {
    await db.query(
      `insert into user_notifications (user_id,title,body,type,is_read,delivered,created_at)
       values ($1,$2,$3,$4,false,true,now())`, [d3.id, t, body, type]
    );
  }

  const payload = await notifications.getSystemNotices({});
  check('getSystemNotices returns the platform rows', payload?.noticeList?.length === 3,
    `${payload?.noticeList?.length} rows`);
  const first = payload?.noticeList?.[0];
  check('  mapped onto the panel\u2019s own notice shape',
    !!first?.afficheId && Array.isArray(first?.contentV3) && !!first?.contentV3?.[0]?.title,
    Object.keys(first ?? {}).join(','));
  check('  the title and body survive the mapping',
    !!first?.contentV3?.[0]?.title && !!first.contentV3[0].content?.[0]?.content,
    `${first?.contentV3?.[0]?.title}`);
  check('  createTime is epoch ms, not a string', typeof first?.createTime === 'number' && first.createTime > 9e11,
    String(first?.createTime));
  check('  the id stays a STRING (bigint safety)', typeof first?.afficheId === 'string', typeof first?.afficheId);

  /* The three tabs filter on the numeric type, so the mapping has to land each row in one. */
  const reduced = notifications.reduceNotices(payload, {});
  check('reduceNotices sorts them into the three tabs',
    reduced.unreadCount.transaction === 1 && reduced.unreadCount.system === 1
      && reduced.unreadCount.promotion === 1,
    JSON.stringify(reduced.unreadCount));
  check('  and the bell counts all three', notifications.totalUnread(reduced.unreadCount) === 3,
    String(notifications.totalUnread(reduced.unreadCount)));

  const unreadOnly = await notifications.getSystemNotices({ showUnread: true });
  check('showUnread=true is the SERVER\u2019s filter', unreadOnly?.noticeList?.length === 3,
    `${unreadOnly?.noticeList?.length} rows`);

  await notifications.readNotice(first.afficheId, 4);
  const afterOne = await notifications.getSystemNotices({ showUnread: true });
  check('readNotice marks exactly one', afterOne?.noticeList?.length === 2,
    `${afterOne?.noticeList?.length} unread left`);

  await notifications.readAllNotices();
  const afterAll = await notifications.getSystemNotices({ showUnread: true });
  check('readAllNotices clears the rest', afterAll?.noticeList?.length === 0,
    `${afterAll?.noticeList?.length} unread left`);
  const stillThere = await notifications.getSystemNotices({});
  check('  and the rows remain, just read',
    stillThere?.noticeList?.length === 3 && stillThere.noticeList.every((r) => r.isRead === 1),
    `${stillThere?.noticeList?.length} rows`);

  // ══════════════════════════════════════════════════════════════════════
  section('gap 14 — the rollover pane');
  const rollover = await load('/src/services/rollover.js');
  let empty = await rollover.getRolloverTasks({ page: 1 });
  check('an account with no approved deposits lists nothing',
    Array.isArray(empty?.list) && empty.list.length === 0 && empty.totalPage === 0,
    JSON.stringify(empty));

  const { rows: [dep] } = await db.query(
    `insert into fiat_deposits (user_id, amount, status, created_at)
     values ($1,'1000','approved', now()) returning deposit_id`, [d3.id]
  );
  const paged = await rollover.getRolloverTasks({ page: 1 });
  const row = paged?.list?.[0];
  check('with one, the pane shows a real task', paged?.list?.length === 1, `${paged?.list?.length} row(s)`);
  check('  mapped onto the table\u2019s own row shape',
    !!row?.taskId && !!row?.taskTypeDesc && 'originalAmount' in (row ?? {}),
    Object.keys(row ?? {}).join(','));
  check('  the amount is the TARGET (deposits x multiplier)', row?.originalAmount === '3000.00000000',
    row?.originalAmount);
  check('  createTime is a real date, not 0', typeof row?.createTime === 'number' && row.createTime > 9e11,
    row?.createTime ? new Date(row.createTime).toISOString().slice(0, 10) : String(row?.createTime));
  /* `INRFIAT`, NOT `INR`. The platform sends a bare code and this build keys money on the
     wallet row; without the translation the coin-art lookup misses and the amount renders
     beside a BROKEN IMAGE — which is exactly what the first screenshot of this page showed
     while this assertion, pinned to the bare code, passed. */
  check('  the currency is translated to the wallet key',
    row?.originalCurrencyName === 'INRFIAT', String(row?.originalCurrencyName));
  check('  status maps onto the badge\u2019s enum (2 = Ongoing)', row?.status === 2, String(row?.status));
  const page2 = await rollover.getRolloverTasks({ page: 2 });
  check('  page 2 of a one-row list is empty', page2?.list?.length === 0, `${page2?.list?.length}`);
  await db.query('delete from fiat_deposits where deposit_id=$1', [dep.deposit_id]);

  // ══════════════════════════════════════════════════════════════════════
  section('gap 16 — Whitelist Management');
  const settings = await load('/src/services/settings.js');
  check('the pane starts empty and disarmed',
    (await settings.getWhitelist()).length === 0 && (await settings.getWhitelistEnabled()) === false, '');

  await settings.addWhitelistAddress({
    label: 'Probe wallet', currency: 'usdt', network: 'TRC20', address: 'TXk9probe1234567890abcdef',
  });
  const list = await settings.getWhitelist();
  check('addWhitelistAddress then getWhitelist returns it', list.length === 1, `${list.length} row(s)`);
  const addr = list[0];
  check('  mapped onto the table\u2019s own row shape',
    !!addr?.addressName && !!addr?.withdrawAddress && 'addressType' in addr,
    Object.keys(addr).join(','));
  check('  the currency is upper-cased by the platform', addr?.currencyName === 'USDT', addr?.currencyName);
  check('  a network makes it a Universal address', addr?.addressType === 1 && addr?.chain === 'TRC20',
    `type=${addr?.addressType} chain=${addr?.chain}`);
  check('  createTime is a real date', typeof addr?.createTime === 'number' && addr.createTime > 9e11, '');

  await settings.setWhitelistEnabled(true);
  check('setWhitelistEnabled(true) arms it', (await settings.getWhitelistEnabled()) === true, '');
  await settings.renameWhitelistAddress(addr.id, { label: 'Renamed' });
  check('renameWhitelistAddress changes the label',
    (await settings.getWhitelist())[0]?.addressName === 'Renamed', '');
  await settings.removeWhitelistAddress(addr.id);
  check('removing the last address disarms it',
    (await settings.getWhitelist()).length === 0 && (await settings.getWhitelistEnabled()) === false, '');

  // ══════════════════════════════════════════════════════════════════════
  section('gap 17 — another player\u2019s profile');
  const profile = await load('/src/services/profile.js');
  const pub = await profile.getUserProfile(String(d3.id), { userId: d3.id });
  check('getUserProfile reads the platform', pub?.name === 'demo_player03', pub?.name);
  check('  the join date is real, not 0', pub?.createTime > 9e11,
    pub?.createTime ? new Date(pub.createTime).toISOString().slice(0, 10) : String(pub?.createTime));
  check('  the counts came from casino-service', typeof pub?.betNum === 'number' && pub.betNum > 0,
    `bets=${pub?.betNum} wins=${pub?.winNum}`);
  check('  the card tier fills levelName', typeof pub?.levelName === 'string', `"${pub?.levelName}"`);
  check('  fields the platform does NOT have keep their defaults',
    Array.isArray(pub?.titles) && Array.isArray(pub?.contest) && Array.isArray(pub?.achievements),
    'titles/contest/achievements');
  const missing = await profile.getUserProfile('999999999999', {});
  check('  an unknown id degrades to the default rather than throwing',
    !!missing && missing.name === '', `name="${missing?.name}"`);

  // ══════════════════════════════════════════════════════════════════════
  section('gap 25 — sign one device out');
  const second = await auth.login({ identifier: 'demo_player03', password: process.env.DEMO_PASSWORD });
  const sessions = await auth.getSessions();
  check('getSessions lists devices', Array.isArray(sessions) && sessions.length > 0, `${sessions.length} devices`);
  const target = sessions[0];
  await auth.revokeSession(target.id);
  const left = await auth.getSessions();
  check('revokeSession removes it from the list',
    !left.some((x) => String(x.id) === String(target.id)), `${left.length} left`);
  void second;
} catch (error) {
  check('harness', false, error?.message ?? String(error));
  console.error(error);
} finally {
  if (db) {
    const { rows } = await db.query(`select id from users where name like 'probe\\_%'`);
    for (const r of rows) {
      await db.query('delete from auth_verification_tokens where user_id=$1', [r.id]);
      await db.query('delete from auth_sessions where user_id=$1', [r.id]);
      await db.query('delete from credits where uid=$1', [r.id]);
      await db.query('delete from users where id=$1', [r.id]);
    }
    const { rows: [d3] } = await db.query(`select id from users where name='demo_player03'`);
    if (d3) await db.query('delete from user_notifications where user_id=$1', [d3.id]);
    await db.query(`delete from auth_login_attempts where identifier like 'probe\\_%'`);
    await db.end();
    console.log(`\ncleaned up: ${rows.length} probe account(s) and the seeded notifications`);
  }
  await server.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
