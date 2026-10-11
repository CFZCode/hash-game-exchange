/* Throwaway verification harness — see the `runtime-verification-harness` note.
 *
 * Loads the app's own service modules through Vite (so `import.meta.env`, the asset globs and the
 * CSS imports all resolve), signs in against the running iBitPlay gateway, and calls every read
 * this build has wired live. Prints one line per check.
 *
 *   node verify-services.mjs                  # against the running gateway
 *
 * LIVE ONLY, unlike `verify-pages.mjs`: every assertion here is about what the platform answers
 * and what the adapters make of it, so there is nothing to check with the seam turned back to the
 * fixtures. Needs `backend copy` running — `npm run dev user admin casino gateway`.
 *
 * Nothing in src/ imports it.
 */
import { createServer } from 'vite';

/* `services/referral.js` reads `window.location.origin` at module scope to build the invite link
   (the original reads `location.host` for the same reason). Nothing else in the services needs a
   DOM, so one stub is cheaper than happy-dom here. */
globalThis.window = globalThis.window ?? { location: { origin: 'http://localhost:5173' } };

const PLAYER = process.env.PLAYER || 'demo_player03';
const PASS = process.env.PASS || process.env.DEMO_PASSWORD;

/* `FIXTURES=1` runs the same pass with the seam turned back to the captured payloads — the
   regression check the loading notes prescribe after any data-layer change. `define` rather than a
   `.env` file, so the project's own env is untouched. */
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  define: process.env.FIXTURES
    ? { 'import.meta.env.VITE_USE_FIXTURES': '"true"', 'import.meta.env.VITE_FIXTURE_DELAY': '"0"' }
    : {},
});
const load = (p) => server.ssrLoadModule(p);

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(42)} ${detail ?? ''}`);
};
const show = (v) => JSON.stringify(v)?.slice(0, 150) ?? String(v);

try {
  const client = await load('/src/services/client.js');
  console.log(`fixtures: ${client.USE_FIXTURES ? 'ON' : 'OFF'}   delay: ${client.FIXTURE_DELAY}ms\n`);

  /* ── sign in ─────────────────────────────────────────────────────────────────────── */
  const auth = await load('/src/services/auth.js');
  const signedIn = await auth.login({ identifier: PLAYER, password: PASS });
  const account = signedIn.account;
  check('auth.login', !!account?.login && account.name === PLAYER, `name=${account?.name} id=${account?.userId} vip=${account?.vipLevel}`);
  check('  wallet rows', signedIn.balances?.length > 0, `${signedIn.balances?.length} rows, funded: ${signedIn.balances.filter((r) => Number(r.amount) > 0).map((r) => `${r.currencyName} ${r.amount}`).join(', ') || 'none'}`);
  check('  selected currency', !!account?.setting?.currencyName, account?.setting?.currencyName);
  /* `=== 0` was the allowance for gap 20 — `joinedAt` mapped a BOOLEAN column, so the
     adapter coerced it to 0 and "no join date" was the correct answer. Both halves are
     fixed now (the backend sends `created`, the adapter parses it), so this asserts on a
     REAL date; 0 would mean one of the two has regressed. */
  check('  createTime is a real join date', account?.createTime > 9e11,
    `createTime=${account?.createTime} (${account?.createTime ? new Date(account.createTime).toISOString().slice(0, 10) : '-'})`);

  const reload = await auth.loadAccount(account);
  check('auth.loadAccount (restore)', reload.account?.login === true, `name=${reload.account?.name}`);

  const sessions = await auth.getSessions();
  check('auth.getSessions', Array.isArray(sessions) && sessions.length > 0, `${sessions.length} devices`);

  /* ── exchange rates ──────────────────────────────────────────────────────────────── */
  const fx = await load('/src/services/exchangeRate.js');
  const rates = await fx.getExchangeRates();
  check('exchangeRate.getExchangeRates', Array.isArray(rates) && rates.length > 0, `${rates.length} rows`);
  const table = fx.toPriceTable(rates);
  check('  INR filed under both keys', !!table.INR && !!table.INRFIAT, `INR=${table.INR} INRFIAT=${table.INRFIAT}`);
  /* The USD pin happens in `setUsdPrices`, not in `toPriceTable` — so prime the cache and ask it. */
  const primed = await fx.primeUsdPrices();
  const usdPrice = await load('/src/data/usdPrice.js');
  check('exchangeRate.primeUsdPrices', primed === true, 'table overlaid');
  check('  USD pinned to 1', Number(usdPrice.getUsdPrice('USD')) === 1, `USD=${usdPrice.getUsdPrice('USD')} INRFIAT=${usdPrice.getUsdPrice('INRFIAT')}`);

  /* ── wallet / transaction ────────────────────────────────────────────────────────── */
  const tx = await load('/src/services/transaction.js');
  const bill = await tx.getBillRecords({ page: 1 });
  check('transaction.getBillRecords', Array.isArray(bill?.list), `${bill?.list?.length ?? 0} rows, totalPage=${bill?.totalPage}`);
  if (bill?.list?.length) {
    const r = bill.list[0];
    check('  bill row mapped', !!r.currencyName && r.createTime > 0, show(r));
  }
  const dep = await tx.getDepositRecords({});
  check('transaction.getDepositRecords', Array.isArray(dep?.list), `${dep?.list?.length ?? 0} rows`);
  if (dep?.list?.length) check('  deposit row mapped', !!dep.list[0].currencyName && dep.list[0].createTime > 0, show(dep.list[0]));
  const wdr = await tx.getWithdrawRecords({});
  check('transaction.getWithdrawRecords', Array.isArray(wdr?.list), `${wdr?.list?.length ?? 0} rows`);
  if (wdr?.list?.length) check('  withdraw row mapped', !!wdr.list[0].currencyName && wdr.list[0].createTime > 0, show(wdr.list[0]));

  /* ── bet history (adapter added this session) ────────────────────────────────────── */
  const bh = await load('/src/services/betHistory.js');
  const page = await bh.getBetHistory({ page: 1 });
  const rows = bh.truncateBetPage(page.resList ?? [], 1).rows;
  check('betHistory.getBetHistory', Array.isArray(page.resList), `${page.resList.length} rows`);
  check('  rows survive truncateBetPage', rows.length === page.resList.length, `${rows.length} of ${page.resList.length} kept`);
  if (rows.length) {
    const r = rows[0];
    check('  row: time is epoch ms', Number.isFinite(r.time) && r.time > 9e11, new Date(r.time).toISOString());
    check('  row: type is a name', typeof r.type === 'string' && r.type.length > 0, r.type);
    check('  row: currency is a wallet key', /FIAT$|^[A-Z]+$/.test(r.currencyName), r.currencyName);
    check('  row: payout is x10000', Number.isFinite(r.payout), `${r.payout} → ${r.payout / 1e4}x`);
    check('  row: has a key', !!r.distributeId, r.distributeId);
  }

  /* ── latest bets (wired this session) ────────────────────────────────────────────── */
  const home = await load('/src/services/home.js');
  const latest = await home.getLatestBets();
  check('home.getLatestBets', Array.isArray(latest), `${latest.length} rows`);
  if (latest.length) {
    const b = latest[0];
    check('  latest bet mapped', !!b.betId && !!b.gameUnique && !!b.currencyName, show(b));
    check('  payout is a x100 multiplier', Number.isFinite(b.payout), `${b.payout} → ${b.payout / 100}x`);
  }

  /* ── profile statistics (wired this session) ─────────────────────────────────────── */
  const profile = await load('/src/services/profile.js');
  const summary = await profile.getGameSummary(account.userId, 'Global');
  check('profile.getGameSummary(Global)', Number.isFinite(summary.betNum), show(summary));
  const perGame = await profile.getGameSummary(account.userId, 'dice');
  check('  per-game keeps zeros', perGame.betNum === 0, show(perGame));

  /* ── recently played (wired this session) ────────────────────────────────────────── */
  const collection = await load('/src/services/collection.js');
  const played = await collection.getRecentGames({ mobile: false });
  check('collection.getRecentGames', Array.isArray(played), `${played.length} rows`);
  const favs = await collection.getFavoriteGames({});
  check('collection.getFavoriteGames', Array.isArray(favs), `${favs.length} rows`);

  /* ── settings ────────────────────────────────────────────────────────────────────── */
  const settings = await load('/src/services/settings.js');
  const prefs = await settings.getPreferences();
  check('settings.getPreferences', !!prefs && 'emailNotifications' in prefs, show(prefs));
  const kyc = await settings.getKycStatus();
  check('settings.getKycStatus', Array.isArray(kyc?.levelResults), `basic=${kyc?.levelResults?.[0]?.kycStatus} advanced=${kyc?.levelResults?.[1]?.kycStatus}`);
  const devices = await settings.getSessions();
  check('settings.getSessions', Array.isArray(devices), `${devices.length} rows`);

  /* ── swap ────────────────────────────────────────────────────────────────────────── */
  const swap = await load('/src/services/swap.js');
  const price = await swap.getSwapPrice('INRFIAT', 'USDT');
  check('swap.getSwapPrice', Number(price?.fromCurrencyPrice) > 0 && Number(price?.toCurrencyPrice) > 0, show(price));
  check('  fee comes from the platform', price?.f !== undefined, `fee=${price?.f}`);

  /* ── vault ───────────────────────────────────────────────────────────────────────── */
  const vault = await load('/src/services/vault.js');
  const vaultRows = await vault.getVaultAmountList(signedIn.balances);
  check('vault.getVaultAmountList', Array.isArray(vaultRows) && vaultRows.length > 0, `${vaultRows.length} rows, apr=${vaultRows[0]?.returnRatio}`);

  /* ── bonus / rewards ─────────────────────────────────────────────────────────────── */
  const rewards = await load('/src/services/rewards.js');
  const bonus = await rewards.getRewards({});
  check('rewards.getRewards', !!bonus?.rewards, `types=${Object.keys(bonus?.rewards ?? {}).join(',')} unclaimed=${bonus?.unclaimedCount}`);

  /* ── referral ────────────────────────────────────────────────────────────────────── */
  const referral = await load('/src/services/referral.js');
  const dash = await referral.getAffiliateDashboard();
  check('referral.getAffiliateDashboard', Number.isFinite(dash?.dashboard?.friendNumber), `friends=${dash?.dashboard?.friendNumber} available=${dash?.dashboard?.availableRewardUsd}`);
  const codes = await referral.getInviteCodes();
  check('referral.getInviteCodes', Array.isArray(codes?.list), `${codes?.list?.length} codes, createdNum=${codes?.createdNum}`);

  /* ── casino originals ────────────────────────────────────────────────────────────── */
  const originals = await load('/src/services/originals.js');
  const games = await originals.getOriginals();
  check('originals.getOriginals', Array.isArray(games) && games.length > 0, `${games.length} games: ${games.slice(0, 4).map((g) => g.fullName ?? g.slug).join(', ')}…`);
  check('  every game has a slug', games.every((g) => !!g.slug), '');

  /* ── sign out ────────────────────────────────────────────────────────────────────── */
  await auth.logout();
  check('auth.logout', true, 'token revoked');
} catch (error) {
  console.error('\nHARNESS ERROR:', error?.stack || error);
  results.push({ name: 'harness', ok: false });
} finally {
  await server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('failed:', failed.map((f) => f.name).join(', '));
  process.exitCode = 1;
}
