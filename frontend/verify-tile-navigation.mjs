/* Throwaway harness: clicking a game tile must navigate CLIENT-SIDE, not reload the document.
 *
 *   HAPPY_DOM=<scratchpad>/node_modules/happy-dom node verify-tile-navigation.mjs
 *
 * The discriminator is not the markup — React Router's <Link> renders an <a href> too, so
 * inspecting the element proves nothing. It is what a CLICK does: under MemoryRouter a <Link>
 * runs the router and swaps the tree in place, while a bare <a> hands the click to the document
 * and the mounted app never moves. So the test clicks a real tile and asserts the game page
 * replaced the home page inside the same React root.
 *
 * Nothing in src/ imports this. Fixtures on: this is a routing test, no backend needed.
 */
import { pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';

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

const server = await createServer({
  server: { middlewareMode: true }, appType: 'custom', logLevel: 'error',
  define: { 'import.meta.env.VITE_USE_FIXTURES': '"true"', 'import.meta.env.VITE_FIXTURE_DELAY': '"0"' },
});

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(56)} ${String(detail).slice(0, 80)}`);
};
const settle = async (passes = 5) => {
  for (let i = 0; i < passes; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
};

try {
  const App = (await server.ssrLoadModule('/src/App.jsx')).default;

  /* The router's own answer, rather than a guess from the text. Asserting "the home page is
     gone" by looking for a string was wrong the first time this ran: "BC Originals" is a
     SIDEBAR row and is on screen at every route, so the check failed while the navigation had
     in fact worked. A probe mounted beside App inside the same MemoryRouter reports the real
     location and cannot be fooled by chrome. */
  let location = null;
  const Probe = () => { location = useLocation().pathname; return null; };

  const host = win.document.createElement('div');
  win.document.body.appendChild(host);
  let root;
  await act(async () => {
    root = createRoot(host);
    root.render(React.createElement(MemoryRouter, { initialEntries: ['/'] },
      React.createElement(App), React.createElement(Probe)));
  });
  await settle();

  const homeText = host.textContent.replace(/\s+/g, ' ');
  check('home rendered at /', location === '/'
    && homeText.includes('BC Originals'), `location=${location}`);
  check('home rendered', homeText.includes('BC Originals'), `${homeText.length} chars`);

  /* A real tile: an anchor whose href is a game page. Both <a> and <Link> produce this, which
     is the point — the markup is identical and only the behaviour differs. */
  const tiles = [...host.querySelectorAll('a')].filter((a) => (a.getAttribute('href') || '').startsWith('/game/'));
  check('found game tiles on the home page', tiles.length > 0, `${tiles.length} tiles`);
  const target = tiles[0]?.getAttribute('href');
  check('  the tile points at a game page', Boolean(target), target);

  /* The click. `cancelable` matters: React Router calls preventDefault, and a non-cancelable
     event would let the "navigation" through while reporting success. */
  await act(async () => {
    tiles[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  });
  await settle();

  const afterText = host.textContent.replace(/\s+/g, ' ');

  /* THE ASSERTION. With a bare <a> the router never runs, the tree never changes, and the home
     page is still on screen — which is exactly what a full-document reload looks like from
     inside the app: this root is simply not the thing that moved. */
  check('the click navigated the ROUTER, not the document', location === target, `location=${location}`);
  check('  the tree swapped in the SAME root', afterText.length > 0 && afterText !== homeText,
    `${homeText.length} -> ${afterText.length} chars`);
  check('  the game page rendered (not a blank crash)', afterText.length > 500, `${afterText.length} chars`);
  check('  no full-document navigation happened', win.location.href === 'http://localhost:5173/',
    win.location.href);

  await act(async () => root.unmount());
  host.remove();
} catch (error) {
  check('harness', false, error.message);
  console.error(error.stack);
} finally {
  await server.close();
  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
