// Logged-out guard audit: opens every route in a SIGNED-OUT CDP page at phone and desktop width and
// reports, per route, whether a login wall appeared (sign-in dialog / redirect) or the screen rendered.
// A private route that renders without a login wall, or that fires player-API calls answered 401, is a LEAK.
// usage: node guard-audit.mjs <cdp-target-id | unique url part> <base>     (CDP_PORT default 9333, SETTLE_MS default 4500)
import { PRIVATE, PUBLIC } from './routes.mjs';
const [, , urlPart, base] = process.argv;
const port = process.env.CDP_PORT || 9333;
const pages = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((x) => x.type === 'page');
// Prefer the exact CDP target id; a url fragment must match ONE page, never someone else's tab too.
const hits = pages.filter((x) => x.id === urlPart || x.url.includes(urlPart));
const t = hits.find((x) => x.id === urlPart) || (hits.length === 1 ? hits[0] : null);
if (!t) throw new Error(`need exactly one page for ${urlPart}, got ${hits.length} — pass the target id from /json/list`);
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map(); let unauthorized = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Network.responseReceived' && m.params.response.status === 401) unauthorized.push(new URL(m.params.response.url).pathname.replace('/api/v1', ''));
  pending.get(m.id)?.(m); pending.delete(m.id);
});
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.result?.value;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await send('Network.enable');
const signedIn = await ev(`!!(localStorage.getItem('api-session') || '').includes('accessToken')`);
if (signedIn) throw new Error('this page has a session — run it in a fresh isolated (signed-out) page');

// What is on screen: the login wall (a visible password field — the sign-in dialog — or a /login path), or the page.
const STATE = `(() => {
  const vis = (e) => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const pw = [...document.querySelectorAll('input[type=password]')].some(vis);
  const main = document.querySelector('main') || document.body;
  const head = [...main.querySelectorAll('h1,h2,.dialog-title,[class*=title]')].filter(vis).map(e => e.innerText.trim()).filter(Boolean).slice(0, 3).join(' | ');
  return { path: location.pathname, wall: pw || location.pathname.startsWith('/login'), head: head.slice(0, 80) };
})()`;

const VIEWS = [
  { name: 'phone', width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
  { name: 'desktop', width: 1280, height: 900, deviceScaleFactor: 1, mobile: false },
];
const leaks = [];
for (const v of VIEWS) {
  await send('Emulation.setDeviceMetricsOverride', v);
  await send('Emulation.setTouchEmulationEnabled', { enabled: v.mobile });
  for (const [list, kind] of [[PRIVATE, 'private'], [PUBLIC, 'public']]) {
    for (const route of list) {
      unauthorized = [];
      await send('Page.navigate', { url: base + route });
      await wait(Number(process.env.SETTLE_MS || 4500));
      const s = await ev(STATE);
      const calls = [...new Set(unauthorized)];
      // private: must show a wall or leave for a public page; public: must render without a wall
      const leftForPublic = s.path !== route.split('?')[0] && PUBLIC.some((p) => s.path === p.split('?')[0]);
      const ok = kind === 'private' ? s.wall || leftForPublic : !s.wall;
      const verdict = ok ? (kind === 'private' && calls.length ? 'WALL+401' : 'OK') : kind === 'private' ? 'LEAK' : 'WALLED-PUBLIC';
      if (verdict !== 'OK') leaks.push(`${v.name} ${route}`);
      console.log(JSON.stringify({ view: v.name, kind, route, verdict, ...s, unauthorized: calls.slice(0, 4) }));
    }
  }
}
await send('Emulation.clearDeviceMetricsOverride');
console.log(`\n${leaks.length ? 'NOT OK' : 'ALL OK'}: ${leaks.length} flagged`, leaks);
ws.close();
