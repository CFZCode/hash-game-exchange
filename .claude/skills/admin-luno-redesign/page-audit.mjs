// Audit admin pages for the Luno redesign — READ-ONLY: it navigates and looks, it never clicks, types or submits.
// Per page: screenshots at 360 / 768 / 1280 in light + dark, the controls (buttons / inputs / tabs / links + labels),
// the page's API calls (method, path, status), console errors, NaN / undefined / Invalid Date text, side-scroll at 360.
//
// usage:
//   node page-audit.mjs <route> [outDir]                 one route, e.g. /users → outDir/users.json + PNGs
//   node page-audit.mjs --all [pages.txt] [outDir]       every route in pages.txt (default: next to this file)
//   node page-audit.mjs --diff before.json after.json    what disappeared / changed (also takes two dirs)
// env: CDP_PORT (9333) — a running CDP Chrome; it opens and closes its OWN tab. BASE (http://localhost:3080).
//      SETTLE_MS (12000 max wait for the network to go quiet). STAFF_EMAIL / STAFF_PASSWORD: sign in when the
//      tab lands on /login (never pass them on the command line of a script you commit). API_BASE for the login.
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { attach, wait } from '../luno-icons/cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE || 'http://localhost:3080').replace(/\/$/, '');
const API_BASE = (process.env.API_BASE || 'https://api.parker567.com').replace(/\/$/, '');
const PORT = process.env.CDP_PORT || 9333;
const SETTLE = Number(process.env.SETTLE_MS || 12000);
const WIDTHS = [1280, 768, 360];
const THEMES = ['light', 'dark'];
const slug = (route) => route.replace(/^\//, '').replace(/[^\w-]+/g, '_') || 'root';
// Live data moves between runs: numbers in labels and ids in API paths are not a change.
const normLabel = (s) => String(s).replace(/\d[\d,.]*/g, '#').replace(/\s+/g, ' ').trim();
const normPath = (p) => p.replace(/\/\d+(?=\/|$)/g, '/:id').replace(/\/[0-9a-f-]{20,}(?=\/|$)/gi, '/:id');

// ── diff ───────────────────────────────────────────────────────────────────────────────────────
function diffOne(a, b) {
  const out = [];
  const bag = (j) => {
    const m = new Map();
    for (const c of j.controls || []) { const k = `${c.kind} "${normLabel(c.label)}"`; m.set(k, (m.get(k) || 0) + 1); }
    return m;
  };
  const ca = bag(a), cb = bag(b);
  for (const [k, n] of ca) if ((cb.get(k) || 0) < n) out.push(`control gone: ${k}${n > 1 ? ` (${n}→${cb.get(k) || 0})` : ''}`);
  for (const [k, n] of cb) if ((ca.get(k) || 0) < n) out.push(`control new: ${k}`);
  const api = (j) => new Map((j.api || []).map((r) => [`${r.method} ${normPath(r.path)}`, r.status]));
  const aa = api(a), ab = api(b);
  for (const [k, s] of aa) {
    if (!ab.has(k)) out.push(`api gone: ${k}`);
    else if (s > 0 && ab.get(k) > 0 && Math.floor(s / 100) !== Math.floor(ab.get(k) / 100)) out.push(`api status: ${k} ${s}→${ab.get(k)}`);
  }
  for (const k of ab.keys()) if (!aa.has(k)) out.push(`api new: ${k}`);
  const old = new Set((a.consoleErrors || []).map(normLabel));
  for (const e of b.consoleErrors || []) if (!old.has(normLabel(e))) out.push(`console error new: ${e.slice(0, 200)}`);
  const oldBad = new Set((a.badText || []).map(normLabel));
  for (const t of b.badText || []) if (!oldBad.has(normLabel(t))) out.push(`bad text new: ${t}`);
  if (!a.sideScroll360 && b.sideScroll360) out.push(`side-scroll at 360 new (${b.sideScroll360}px)`);
  for (const [w, list] of Object.entries(b.overlaps || {})) for (const o of list) if (!(a.overlaps?.[w] || []).includes(o)) out.push(`overlap at ${w} new: ${o}`);
  if (!a.blank && b.blank) out.push('page is blank now');
  if (!a.errorOverlay && b.errorOverlay) out.push('error overlay now');
  if (a.finalPath !== b.finalPath) out.push(`lands on ${b.finalPath} (was ${a.finalPath})`);
  return out;
}

if (process.argv[2] === '--diff') {
  const [, , , A, B] = process.argv;
  if (!A || !B) { console.error('usage: page-audit.mjs --diff before.json after.json  (or two dirs)'); process.exit(2); }
  const pairs = statSync(A).isDirectory()
    ? readdirSync(A).filter((f) => f.endsWith('.json') && f !== 'summary.json').map((f) => [join(A, f), join(B, f)])
    : [[A, B]];
  let bad = 0;
  for (const [x, y] of pairs) {
    if (!existsSync(y)) { console.log(`${basename(x)}: MISSING in after`); bad++; continue; }
    const d = diffOne(JSON.parse(readFileSync(x, 'utf8')), JSON.parse(readFileSync(y, 'utf8')));
    console.log(`${basename(x)}: ${d.length ? 'CHANGED' : 'same'}`);
    d.forEach((l) => console.log(`  - ${l}`));
    if (d.length) bad++;
  }
  console.log(`\n${pairs.length - bad}/${pairs.length} same`);
  process.exit(bad ? 1 : 0);
}

// ── self-check of the diff (cheap, runs every time) ─────────────────────────────────────────────
{
  const a = { controls: [{ kind: 'button', label: 'Save' }, { kind: 'tab', label: 'Pending (3)' }], api: [{ method: 'GET', path: '/api/gw/api/v1/admin/users/12', status: 200 }], finalPath: '/x' };
  const b = { controls: [{ kind: 'tab', label: 'Pending (7)' }], api: [{ method: 'GET', path: '/api/gw/api/v1/admin/users/99', status: 500 }], finalPath: '/x' };
  const d = diffOne(a, b);
  if (d.length !== 2 || !d[0].includes('Save') || !d[1].includes('200→500')) throw new Error(`diff self-check failed: ${d}`);
}

// ── audit ──────────────────────────────────────────────────────────────────────────────────────
const INVENTORY = `(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const label = (e) => (e.getAttribute('aria-label') || e.innerText || e.value || e.placeholder || e.getAttribute('title') || e.name || e.querySelector?.('svg')?.getAttribute('data-icon') || '').replace(/\\s+/g, ' ').trim().slice(0, 80);
  const zone = (e) => e.closest('[data-slot=sidebar],[data-sidebar]') ? 'sidebar' : e.closest('header') ? 'header' : e.closest('[role=dialog]') ? 'dialog' : 'page';
  const kinds = [
    ['tab', '[role=tab]'],
    ['input', 'input:not([type=hidden]),textarea,select,[role=combobox],[role=switch],[role=checkbox],[role=radio],[role=slider]'],
    ['button', 'button,[role=button]'],
    ['link', 'a[href]'],
  ];
  const seen = new Set(); const controls = [];
  for (const [kind, sel] of kinds) for (const e of document.querySelectorAll(sel)) {
    if (seen.has(e) || !vis(e)) continue; seen.add(e);
    const c = { kind, zone: zone(e), label: label(e) };
    if (kind === 'input') c.type = e.getAttribute('role') || e.type || e.tagName.toLowerCase();
    if (kind === 'link') c.href = e.getAttribute('href');
    if (e.disabled || e.getAttribute('aria-disabled') === 'true') c.disabled = true;
    if (e.getAttribute('aria-selected') === 'true' || e.getAttribute('data-state') === 'active') c.active = true;
    controls.push(c);
  }
  const text = document.body.innerText || '';
  const badText = [...new Set(text.split('\\n').filter((l) => /\\bNaN\\b|\\bundefined\\b|Invalid Date|\\[object Object\\]|\\bInfinity\\b/.test(l)).map((l) => l.trim().slice(0, 120)))];
  const portal = document.querySelector('nextjs-portal');
  const errorOverlay = !!(portal?.shadowRoot?.querySelector('[data-nextjs-dialog],[data-nextjs-error-overlay]')) || /Application error|Unhandled Runtime Error/.test(text);
  const main = document.querySelector('main') || document.body;
  const title = [...main.querySelectorAll('h1,h2')].filter(vis).map((e) => e.innerText.trim()).filter(Boolean)[0] || document.title;
  return { finalPath: location.pathname, title, controls, badText, errorOverlay, blank: (main.innerText || '').trim().length < 20,
    skeletons: document.querySelectorAll('[data-slot=skeleton],.animate-pulse').length };
})()`;

async function newTab() {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  return attach(t.id);
}
const closeTab = (id) => fetch(`http://127.0.0.1:${PORT}/json/close/${id}`).catch(() => {});

async function signIn(cdp) {
  const { STAFF_EMAIL: email, STAFF_PASSWORD: password } = process.env;
  if (!email || !password) throw new Error('landed on /login — set STAFF_EMAIL / STAFF_PASSWORD (env) or sign this Chrome in first');
  // The same two calls views/auth/Login.tsx makes: platform login, then hand the token to the admin's cookie route.
  const ok = await cdp.ev(`(async () => {
    const r = await fetch(${JSON.stringify(API_BASE + '/api/v1/admin/auth/login')}, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(${JSON.stringify({ email, password })}) });
    const j = await r.json(); if (!j?.data?.token) return 'login ' + r.status + ' ' + (j?.error?.code || '');
    const s = await fetch('/api/auth/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: j.data.token }) });
    return s.ok ? 'ok' : 'session ' + s.status;
  })()`);
  if (ok !== 'ok') throw new Error(`sign-in failed: ${ok}`);
}


// Controls of DIFFERENT fields that paint over each other (a picker wider than its grid cell over the next select).
// A control's "field" is its nearest ancestor that is a flex / grid item; controls inside one field may overlap
// on purpose (a clear button over its input), so only pairs from different fields count.
const OVERLAPS = `(() => {
  const main = document.querySelector('main') || document.body;
  const sel = 'button, input:not([type=hidden]), textarea, select, [role=combobox], [role=switch], [data-slot=popover-trigger], [data-slot=select-trigger]';
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.opacity !== '0'; };
  const els = [...main.querySelectorAll(sel)].filter((e) => vis(e) && !e.closest('[role=dialog],[data-slot=popover-content],[data-slot=dropdown-menu-content],[data-slot=sheet-content],[data-sonner-toaster],.sr-only'));
  const field = (e) => { let n = e; while (n.parentElement && n.parentElement !== main) { const d = getComputedStyle(n.parentElement).display; if (/flex|grid/.test(d)) return n; n = n.parentElement; } return n; };
  const name = (e) => (e.getAttribute('aria-label') || e.placeholder || e.innerText || e.name || e.tagName).trim().replace(/\\s+/g, ' ').slice(0, 40);
  const items = els.map((e) => ({ e, f: field(e), r: e.getBoundingClientRect() }));
  const out = new Set();
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j];
    if (a.f === b.f || a.f.contains(b.f) || b.f.contains(a.f) || a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (w > 3 && h > 3) out.add(name(a.e) + ' × ' + name(b.e) + ' (' + Math.round(w) + 'px)');
  }
  return [...out].slice(0, 20);
})()`;

async function auditRoute(cdp, route, outDir, state) {
  const net = new Map(); // requestId → { method, path, status, type }
  const consoleErrors = [];
  let inflight = 0, lastNet = Date.now();
  state.handler = (m) => {
    const p = m.params;
    if (m.method === 'Network.requestWillBeSent' && ['XHR', 'Fetch'].includes(p.type)) {
      const u = new URL(p.request.url);
      if (u.pathname.startsWith('/_next') || u.pathname.includes('__nextjs') || u.pathname.startsWith('/socket.io')) return; // build + live-push transport, not page data
      net.set(p.requestId, { method: p.request.method, path: u.pathname, query: [...u.searchParams.keys()].sort().join(','), status: 0 });
      inflight++; lastNet = Date.now();
    } else if (m.method === 'Network.responseReceived' && net.has(p.requestId)) net.get(p.requestId).status = p.response.status;
    else if ((m.method === 'Network.loadingFinished' || m.method === 'Network.loadingFailed') && net.has(p.requestId)) {
      inflight--; lastNet = Date.now();
      if (m.method === 'Network.loadingFailed' && !net.get(p.requestId).status) Object.assign(net.get(p.requestId), { status: -1, error: p.canceled ? 'canceled' : p.errorText });
    } else if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') consoleErrors.push(p.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    else if (m.method === 'Runtime.exceptionThrown') consoleErrors.push((p.exceptionDetails.exception?.description || p.exceptionDetails.text).split('\n')[0].slice(0, 300));
    else if (m.method === 'Log.entryAdded' && p.entry.level === 'error') consoleErrors.push(`${p.entry.source}: ${p.entry.text} ${p.entry.url || ''}`.slice(0, 300));
  };
  const quiet = async () => {
    const t0 = Date.now(); await wait(800);
    while (Date.now() - t0 < SETTLE && (inflight > 0 || Date.now() - lastNet < 1000)) await wait(200);
    await wait(500);
  };
  const metrics = (width, height = 900) => cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  const shotFull = async (file, width) => {
    const h = Math.min(await cdp.ev('document.documentElement.scrollHeight'), 6000);
    await metrics(width, Math.max(h, 700)); await wait(300);
    await cdp.shot(join(outDir, file), { fullPage: true });
    await metrics(width);
  };

  const result = { route, url: BASE + route, at: new Date().toISOString(), shots: [] };
  const savedTheme = await cdp.ev(`localStorage.getItem('theme')`); // put the viewer's own choice back afterwards
  for (const theme of THEMES) {
    await cdp.ev(`localStorage.setItem('theme', '${theme}')`);
    await metrics(1280);
    await cdp.send('Page.navigate', { url: BASE + route });
    await quiet();
    if (theme === 'light') {
      if ((await cdp.ev('location.pathname')).startsWith('/login') && !route.startsWith('/login')) {
        await signIn(cdp); net.clear(); consoleErrors.length = 0; inflight = 0;
        await cdp.send('Page.navigate', { url: BASE + route }); await quiet();
      }
      let inv = await cdp.ev(INVENTORY);
      if (inv.errorOverlay || inv.blank) { // a hot reload from the parallel restyle can land mid-render: retry once
        net.clear(); consoleErrors.length = 0; inflight = 0;
        await cdp.send('Page.navigate', { url: BASE + route }); await quiet();
        inv = await cdp.ev(INVENTORY); result.retried = true;
      }
      Object.assign(result, inv);
      // one row per call shape (socket.io polls and refetches repeat); a pending call shows status 0
      const api = new Map();
      for (const { method, path, query, status, error } of net.values()) {
        const k = `${method} ${path}?${query}`;
        if (!api.has(k) || api.get(k).status <= 0) api.set(k, { method, path, ...(query && { query }), status, ...(error && { error }) });
      }
      result.api = [...api.values()];
      result.consoleErrors = [...new Set(consoleErrors)];
    }
    for (const w of WIDTHS) {
      await metrics(w); await wait(700);
      if (w === 360 && theme === 'light') {
        const over = await cdp.ev('document.documentElement.scrollWidth - window.innerWidth');
        result.sideScroll360 = over > 1 ? over : 0;
      }
      if (theme === 'light') {
        const ov = await cdp.ev(OVERLAPS);
        if (ov?.length) (result.overlaps ??= {})[w] = ov;
      }
      const file = `${slug(route)}-${w}-${theme}.png`;
      await shotFull(file, w); result.shots.push(file);
    }
  }
  await cdp.ev(savedTheme ? `localStorage.setItem('theme', ${JSON.stringify(savedTheme)})` : `localStorage.removeItem('theme')`);
  writeFileSync(join(outDir, `${slug(route)}.json`), JSON.stringify(result, null, 1));
  return result;
}

const all = process.argv[2] === '--all';
const routes = all
  ? readFileSync(process.argv[3] || join(HERE, 'pages.txt'), 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim()).filter((l) => l.startsWith('/'))
  : [process.argv[2]];
const outDir = (all ? process.argv[4] : process.argv[3]) || 'logs/qa/redesign/before';
if (!routes[0]?.startsWith('/')) { console.error('usage: page-audit.mjs <route>|--all [pages.txt] [outDir] | --diff a b'); process.exit(2); }
mkdirSync(outDir, { recursive: true });

// A CDP call can hang for good (tab crash, dev-server reload killing the socket): each route gets a deadline,
// and on a timeout the tab is replaced and the route tried once more. SKIP_DONE=1 keeps routes already in outDir.
const ROUTE_MS = Number(process.env.ROUTE_MS || 180000);
const state = { handler: () => {} };
let cdp;
async function freshTab() {
  if (cdp) { cdp.close(); await closeTab(cdp.id); }
  cdp = await newTab();
  cdp.on((m) => state.handler(m));
  await Promise.all(['Network.enable', 'Runtime.enable', 'Log.enable', 'Page.enable'].map((m) => cdp.send(m)));
  await cdp.send('Page.navigate', { url: BASE + '/login' }); await wait(1500); // same origin for localStorage
}
const withDeadline = (p) => Promise.race([p, wait(ROUTE_MS).then(() => { throw new Error(`timeout ${ROUTE_MS}ms`); })]);
await freshTab();
const summary = [];
try {
  for (const route of routes) {
    try {
      const file = join(outDir, `${slug(route)}.json`);
      let r;
      if (process.env.SKIP_DONE && existsSync(file)) r = JSON.parse(readFileSync(file, 'utf8'));
      else {
        try { r = await withDeadline(auditRoute(cdp, route, outDir, state)); }
        catch (e) { if (!/^timeout/.test(e.message)) throw e; await freshTab(); r = await withDeadline(auditRoute(cdp, route, outDir, state)); r.retried = true; }
      }
      const failed = r.api.filter((a) => a.status >= 400 || (a.status === -1 && a.error !== 'canceled')).map((a) => `${a.status} ${a.method} ${a.path}`);
      const row = { route, finalPath: r.finalPath, title: r.title, controls: r.controls.length, api: r.api.length, failedApi: failed,
        consoleErrors: r.consoleErrors.length, badText: r.badText, blank: r.blank, errorOverlay: r.errorOverlay, sideScroll360: r.sideScroll360, overlaps: r.overlaps, retried: !!r.retried };
      summary.push(row);
      const flags = [r.blank && 'BLANK', r.errorOverlay && 'ERROR', r.finalPath !== route && `→${r.finalPath}`, failed.length && `api✗${failed.length}`,
        r.consoleErrors.length && `console✗${r.consoleErrors.length}`, r.badText.length && 'NaN/undefined', r.sideScroll360 && `scroll360+${r.sideScroll360}`,
        r.overlaps && `overlap@${Object.keys(r.overlaps).join('/')}`].filter(Boolean);
      console.log(`${route}  controls ${r.controls.length}  api ${r.api.length}  ${flags.join(' ') || 'ok'}`);
    } catch (e) {
      summary.push({ route, error: e.message }); console.log(`${route}  FAILED ${e.message}`);
      if (/sign-in|STAFF_EMAIL/.test(e.message)) break;
    }
  }
} finally {
  if (all) writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
  cdp.close(); await closeTab(cdp.id);
}
