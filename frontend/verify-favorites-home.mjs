/* Throwaway harness for the home page's Continue Playing / Favorites block.
 *
 * Proves the one behaviour the feature is about: the section is ABSENT with no favourites and
 * PRESENT once a game is starred, driven by the read rather than by any client-side flag.
 *
 *   HAPPY_DOM=<scratchpad>/node_modules/happy-dom node verify-favorites-home.mjs
 *
 * Needs `backend copy` running. Cleans up every row it creates. Nothing in src/ imports it.
 */
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';

/* ── ITS OWN ACCOUNT, NOT THE ONE A HUMAN IS BROWSING WITH ──────────────────
 *
 * This file has to start from "no favourites", and the only way to get there is
 * to remove whatever is on the account. Pointed at `demo_player03` — the account
 * the browser is usually signed into — that silently DELETED a real person's
 * starred games every time the regression suite ran, and the loss showed up
 * later as "the Favorites section disappeared", with nothing to connect it to.
 *
 * So it uses `demo_player05` by default, and restores what it removed anyway
 * (see the snapshot below): a harness must not depend on being pointed at the
 * right account to be safe.
 */
const PLAYER = process.env.PLAYER || 'demo_player05';
const PASS = process.env.PASS || process.env.DEMO_PASSWORD;

const { Window } = await import(pathToFileURL(process.env.HAPPY_DOM + '/lib/index.js').href);
const win = new Window({ url: 'http://localhost:5173/' });
for (const key of [
  'document', 'navigator', 'location', 'history', 'localStorage', 'sessionStorage',
  'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent',
  'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'matchMedia',
  'ResizeObserver', 'IntersectionObserver', 'MutationObserver', 'DOMParser', 'Image',
]) {
  if (win[key] === undefined) continue;
  try { globalThis[key] = win[key]; } catch { Object.defineProperty(globalThis, key, { value: win[key], configurable: true, writable: true }); }
}
globalThis.window = win;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
if (!globalThis.matchMedia) globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
win.matchMedia = win.matchMedia || globalThis.matchMedia;

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (p) => server.ssrLoadModule(p);

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(58)} ${String(detail).slice(0, 80)}`);
};
const settle = async (passes = 6) => {
  for (let i = 0; i < passes; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 250)); });
};

let collection;
const STARRED = [];
/* Whatever the account already had, put back in `finally`. */
let preexisting = [];

try {
  const auth = await load('/src/services/auth.js');
  const accountCtx = await load('/src/context/account.js');
  const persist = await load('/src/context/persist.js');
  collection = await load('/src/services/collection.js');

  const { account } = await auth.login({ identifier: PLAYER, password: PASS });
  persist.createPersistedStore('account', accountCtx.ACCOUNT_DEFAULTS).write({
    login: true, name: account.name, setting: account.setting,
  });
  console.log(`signed in: ${account.name} (${account.userId})\n`);

  /* Start from a known state: no favourites, and the persisted "was shown" flags cleared, since
     a leftover `favorite_show` is exactly what would make an absent section render a skeleton.

     SNAPSHOT FIRST, RESTORE IN `finally`. The rows removed here are not this file's to destroy —
     they belong to whoever the account belongs to — and an earlier version simply deleted them,
     which cost a real person their starred games with no way to tell what had happened. */
  preexisting = await collection.getFavoriteGames({});
  if (preexisting.length) {
    console.log(`  preserving ${preexisting.length} existing favourite(s) on ${PLAYER}`);
  }
  for (const row of preexisting) {
    await collection.removeFavoriteGame(row.slug);
  }
  win.localStorage.removeItem('favorite_show');
  win.localStorage.removeItem('continue_playing_show');

  const App = (await load('/src/App.jsx')).default;
  const renderHome = async () => {
    const host = win.document.createElement('div');
    win.document.body.appendChild(host);
    let root;
    await act(async () => {
      root = createRoot(host);
      root.render(React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(App)));
    });
    await settle();
    const text = win.document.body.textContent.replace(/\s+/g, ' ');
    await act(async () => root.unmount());
    host.remove();
    return text;
  };

  /* ── 1. no favourites: the tab must be absent ─────────────────────────────────────────── */
  const before = await renderHome();
  check('home renders signed in', before.length > 0, `${before.length} chars`);
  check('NO "Favorites" tab before starring', !before.includes('Favorites'), '');
  check('  (BC Originals still there — page intact)', before.includes('BC Originals'), '');

  /* ── 2. star two games ────────────────────────────────────────────────────────────────── */
  await collection.addFavoriteGame('crash', 'in-house');
  STARRED.push('crash');
  await collection.addFavoriteGame('limbo', 'in-house');
  STARRED.push('limbo');
  const rows = await collection.getFavoriteGames({});
  check('server has the two favourites', rows.length === 2, rows.map((r) => r.fullName).join(', '));

  /* ── 3. the section is now on the home page ───────────────────────────────────────────── */
  const after = await renderHome();
  check('"Favorites" tab appears after starring', after.includes('Favorites'), '');
  check('  the starred game is named in the strip', after.includes('Crash') || after.includes('crash'), '');
  check('  page still intact', after.includes('BC Originals'), '');

  /* The gate is the LIST, not a flag: with recently-played empty (gap 2) the block must show the
     Favorites tab ALONE, never a "Continue Playing" tab over an empty strip. */
  const played = await collection.getRecentGames({});
  check('recently-played is empty on this delivery', played.length === 0, `${played.length} rows`);
  check('so NO "Continue Playing" tab', !after.includes('Continue Playing'), '');

  /* ── 3b. the three things reported on 2026-09-04 ──────────────────────────────────────── */
  const homeHost = win.document.createElement('div');
  win.document.body.appendChild(homeHost);
  let homeRoot;
  await act(async () => {
    homeRoot = createRoot(homeHost);
    homeRoot.render(React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(App)));
  });
  await settle();

  /* THE COVER. A favourite resolved locally carries `icon: undefined`, so the tile has to reach
     for `assetExact(slug)` — before the fix it fell straight to the brand placeholder and every
     card in the strip drew the same grey BC card. Asserted on the DOM rather than the text: the
     img's src has to be a real per-game asset, not `game-placeholder`. */
  const tileImgs = [...homeHost.querySelectorAll('a[href^="/game/"] img')];
  const crashImg = tileImgs.find((i) => i.closest('a')?.getAttribute('href') === '/game/crash');
  check('the Favorites card has its OWN cover', Boolean(crashImg) && !/placeholder/i.test(crashImg.getAttribute('src') || ''),
    crashImg?.getAttribute('src')?.slice(-40));

  /* THE STAR BADGE. `yn` stamps `autoTag` and GameTile draws the badge off it — one <svg> per
     tagged card, inside the anchor, positioned top-left. */
  const starred = [...homeHost.querySelectorAll('a[href^="/game/"] svg.absolute')];
  check('the card carries a corner badge', starred.length >= 2, `${starred.length} badges`);
  check('  positioned top-left as `start-1.5 top-1.5 size-5`',
    starred[0]?.getAttribute('class')?.includes('start-1.5 top-1.5 size-5'),
    starred[0]?.getAttribute('class'));

  await act(async () => homeRoot.unmount());
  homeHost.remove();

  /* THE RECOMMENDED ROW on /favorite, which starring used to delete. */
  const favHost = win.document.createElement('div');
  win.document.body.appendChild(favHost);
  let favRoot;
  await act(async () => {
    favRoot = createRoot(favHost);
    favRoot.render(React.createElement(MemoryRouter, { initialEntries: ['/favorite'] }, React.createElement(App)));
  });
  await settle();
  const favText = favHost.textContent.replace(/\s+/g, ' ');
  check('/favorite still shows Recommended Games WITH favourites', favText.includes('Recommended Games'), '');
  check('  and the favourites themselves are on it', favText.includes('Crash') || favText.includes('Limbo'), '');
  await act(async () => favRoot.unmount());
  favHost.remove();

  /* ── 3c. the casino lobby carries the same block ──────────────────────────────────────── */
  const casHost = win.document.createElement('div');
  win.document.body.appendChild(casHost);
  let casRoot;
  await act(async () => {
    casRoot = createRoot(casHost);
    casRoot.render(React.createElement(MemoryRouter, { initialEntries: ['/casino'] }, React.createElement(App)));
  });
  await settle();
  const casText = casHost.textContent.replace(/\s+/g, ' ');
  check('/casino lobby shows the Favorites tab', casText.includes('Favorites'), '');
  check('  and it is the LOBBY, not every tab', casText.includes('BC Originals'), '');
  const casBadges = [...casHost.querySelectorAll('a[href^="/game/"] svg.absolute')];
  check('  its cards carry the badge too', casBadges.length >= 2, `${casBadges.length} badges`);
  await act(async () => casRoot.unmount());
  casHost.remove();

  /* A non-lobby tab must NOT show it — the original mounts it in the lobby's section list. */
  const slotsHost = win.document.createElement('div');
  win.document.body.appendChild(slotsHost);
  let slotsRoot;
  await act(async () => {
    slotsRoot = createRoot(slotsHost);
    slotsRoot.render(React.createElement(MemoryRouter, { initialEntries: ['/casino/slots'] }, React.createElement(App)));
  });
  await settle();
  const slotsText = slotsHost.textContent.replace(/\s+/g, ' ');
  check('/casino/slots does NOT show it', !slotsText.includes('Continue Playing'), '');
  await act(async () => slotsRoot.unmount());
  slotsHost.remove();

  /* ── 3d. the strip is padded, and only the real favourites wear a star ────────────────── */
  const padHost = win.document.createElement('div');
  win.document.body.appendChild(padHost);
  let padRoot;
  await act(async () => {
    padRoot = createRoot(padHost);
    padRoot.render(React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(App)));
  });
  await settle();
  const pair = await collection.getRecentAndFavorites();
  check('the favourites list is padded past the 2 starred', pair[1].length > 2, `${pair[1].length} rows`);
  check('  the padding is flagged isRecItem', pair[1].filter((r) => r.isRecItem).length === pair[1].length - 2,
    `${pair[1].filter((r) => r.isRecItem).length} padded`);
  check('  the two starred rows are NOT flagged', pair[1].slice(0, 2).every((r) => !r.isRecItem), '');
  const padBadges = [...padHost.querySelectorAll('a[href^="/game/"] svg.absolute')];
  check('  only the starred cards draw a badge', padBadges.length === 2, `${padBadges.length} badges for ${pair[1].length} cards`);
  await act(async () => padRoot.unmount());
  padHost.remove();

  /* ── 4. un-star everything: the section goes away again ───────────────────────────────── */
  for (const slug of STARRED.splice(0)) await collection.removeFavoriteGame(slug);
  win.localStorage.removeItem('favorite_show');
  const gone = await renderHome();
  check('"Favorites" tab gone after un-starring', !gone.includes('Favorites'), '');
} catch (error) {
  check('harness', false, error.message);
  console.error(error.stack);
} finally {
  if (collection) {
    for (const slug of STARRED) await collection.removeFavoriteGame(slug).catch(() => {});
    /* Put back what was there before, including on a crash — which is the run where losing
       somebody's data would be least expected and least explicable. */
    for (const row of preexisting) {
      await collection.addFavoriteGame(row.slug, row.source ?? 'unknown').catch(() => {});
    }
    if (preexisting.length) console.log(`restored ${preexisting.length} pre-existing favourite(s)`);
  }
  await server.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
