/* Throwaway render harness — the second half of `runtime-verification-harness`.
 *
 * Mounts the real App at a list of routes, signed in against the running iBitPlay gateway, and
 * asserts on the settled DOM. Catches what a service-level check cannot: a component reading a
 * field the adapter does not produce, a crash inside a page, an empty table that should have rows.
 *
 *   npm i --prefix <scratchpad> happy-dom
 *   HAPPY_DOM=<scratchpad>/node_modules/happy-dom node verify-pages.mjs
 *
 * Delete when done. Nothing in src/ imports it.
 */
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';

/* With fixtures on there are no live rows to find, and the captured payloads are deliberately
   empty — so the assertions that look for real bets are the live pass's only. Everything else
   runs in both, which is what makes this a regression check rather than two different tests. */
const LIVE = !process.env.FIXTURES;
const PLAYER = process.env.PLAYER || 'demo_player03';
const PASS = process.env.PASS || 'Demo@12345';

/* ── DOM ─────────────────────────────────────────────────────────────────────────────────────
   Only the globals, never the timers: copying happy-dom's setTimeout breaks Vite's own. */
const { Window } = await import(pathToFileURL(process.env.HAPPY_DOM + '/lib/index.js').href);
const win = new Window({ url: 'http://localhost:5173/' });
for (const key of [
  'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
  'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia',
  'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'DOMParser', 'Image',
]) {
  if (win[key] === undefined) continue;
  /* Node 24 defines `navigator` as a getter-only global, so assignment throws. */
  try { globalThis[key] = win[key]; } catch { Object.defineProperty(globalThis, key, { value: win[key], configurable: true, writable: true }); }
}
globalThis.window = win;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
if (!globalThis.matchMedia) globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
win.matchMedia = win.matchMedia || globalThis.matchMedia;

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
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(46)} ${String(detail).slice(0, 90)}`);
};

const settle = async (passes = 6) => {
  for (let i = 0; i < passes; i += 1) {
    await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
  }
};

try {
  /* ── sign in, then persist the account the way the app does ────────────────────────── */
  const auth = await load('/src/services/auth.js');
  const accountCtx = await load('/src/context/account.js');
  const persist = await load('/src/context/persist.js');
  const { account } = await auth.login({ identifier: PLAYER, password: PASS });
  persist.createPersistedStore('account', accountCtx.ACCOUNT_DEFAULTS).write({
    login: true, name: account.name, setting: account.setting,
  });
  console.log(`signed in: ${account.name} (${account.userId})\n`);

  const App = (await load('/src/App.jsx')).default;

  const renderAt = async (path) => {
    const host = win.document.createElement('div');
    win.document.body.appendChild(host);
    let root;
    await act(async () => {
      root = createRoot(host);
      root.render(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)));
    });
    await settle();
    const text = win.document.body.textContent.replace(/\s+/g, ' ');
    return { host, text, unmount: () => act(async () => root.unmount()) };
  };

  const page = async (name, path, assertions) => {
    let view;
    try {
      view = await renderAt(path);
    } catch (error) {
      check(name, false, `render threw: ${error.message}`);
      if (process.env.TRACE) console.error(error.stack);
      return;
    }
    check(`${name} renders`, view.text.length > 0, `${view.text.length} chars`);
    for (const [label, ok, detail] of assertions(view.text)) check(`  ${label}`, ok, detail);
    await view.unmount();
    view.host.remove();
  };

  const has = (text, s) => text.includes(s);

  await page('/ (home)', '/', (t) => [
    ['header shows the wallet pill', has(t, 'Deposit'), ''],
    ['Latest Bets section present', has(t, 'Latest'), ''],
    /* The feed's own rendering of a player it cannot name is the word "Hidden", not the `****`
       sentinel itself — the row branches on `userName === HIDDEN_NAME`. */
    ['live bets rendered (anonymous players)', !LIVE || (t.match(/Hidden/g) || []).length >= 1, `${(t.match(/Hidden/g) || []).length} anonymous rows`],
    ['a live game name is printed', has(t, 'Wheel') || has(t, 'Limbo') || has(t, 'Classic Dice'), ''],
  ]);

  await page('/wallet/bet-history', '/wallet/bet-history', (t) => [
    ['rows present (live) / empty state (fixtures)', LIVE !== has(t, 'Stay tuned'), ''],
    ['a game name in the Type column', !LIVE || has(t, 'Wheel') || has(t, 'Limbo') || has(t, 'Classic Dice'), ''],
    ['no Invalid Date', !has(t, 'Invalid Date'), ''],
    ['a winning multiplier is printed', !LIVE || /(?<![\d.])[1-9]\d*(\.\d+)?x/.test(t), (t.match(/[1-9]\d*(\.\d+)?x/) || [])[0] ?? 'n/a'],
  ]);

  await page('/wallet/transaction', '/wallet/transaction', (t) => [
    ['bill rows rendered (live only)', !LIVE || has(t, 'Swap INR -> USDT') || has(t, 'TRANSFER'), ''],
    ['no Invalid Date', !has(t, 'Invalid Date'), ''],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await page('/wallet/balance', '/wallet/balance', (t) => [
    ['the funded coin is listed', has(t, 'INR'), ''],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await page('/wallet/swap', '/wallet/swap', (t) => [
    ['the form rendered', has(t, 'Swap'), ''],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await page('/wallet/vault', '/wallet/vault', (t) => [
    ['the transfer panel rendered (not a spinner)', has(t, 'APR') || has(t, 'Transfer In'), ''],
    ['the total-value card rendered', has(t, 'Total Value') || has(t, 'Total'), ''],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await page('/recent', '/recent', (t) => [
    ['Continue Playing heading', has(t, 'Continue Playing'), ''],
    ['empty state, correctly', has(t, 'Stay tuned') || has(t, 'something'), ''],
  ]);

  /* THE GAME PAGE, and it is here because its absence hid a white screen. `launchGame`'s fixture
     is `null` and `services/client.js` answers a fixture SYNCHRONOUSLY, so a bare `.catch` on the
     call threw `Cannot read properties of null` and every game page in the FIXTURES build
     rendered nothing. Nothing on this list reached `/game/:gameUnique`, so the arm that exists to
     catch exactly that missed it for as long as the page had been built. `crash` is an in-house
     slug present in both the captured catalogue and the platform's own `js_games`. */
  await page('/game/crash', '/game/crash', (t) => [
    ['the game page rendered, not a blank', t.length > 500, `${t.length} chars`],
    ['the game is named', has(t, 'Crash'), ''],
    ['no Invalid Date', !has(t, 'Invalid Date'), ''],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await page('/settings/verification', '/settings/verification', (t) => [
    ['the KYC card rendered', has(t, 'Verification') || has(t, 'Basic'), ''],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await page('/bonus', '/bonus', (t) => [
    ['reward rows rendered', has(t, 'Rakeback') || has(t, 'Bonus'), ''],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await page('/referral', '/referral', (t) => [
    ['the invite code is printed', has(t, 'DEMO1003') || has(t, 'Referral'), ''],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await page(`/user/profile/${account.userId}`, `/user/profile/${account.userId}`, (t) => [
    ['profile dialog rendered', has(t, 'Statistics') || has(t, 'Medals'), ''],
    ['live bet count printed', /\b4\b/.test(t), ''],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await page('/user/statistics', '/user/statistics', (t) => [
    ['statistics dialog rendered', has(t, 'Total Bets') && has(t, 'Total Wins'), ''],
    ['bets=4 and wins=2 from the platform', !LIVE || (/Total Wins ?2/.test(t) && /Total Bets ?4/.test(t)), t.slice(t.indexOf('Total Wins'), t.indexOf('Total Wins') + 60)],
    ['no NaN', !has(t, 'NaN'), ''],
  ]);

  await auth.logout();
} catch (error) {
  console.error('\nHARNESS ERROR:', error?.stack || error);
  results.push({ name: 'harness', ok: false });
} finally {
  await server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) console.log('failed:', failed.map((f) => f.name).join(' | '));
process.exit(failed.length ? 1 : 0);
