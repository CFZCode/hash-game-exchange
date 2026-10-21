// Opens each route in the CDP page (already at phone width + touch), finds the open sheet/dialog,
// swipes up with real touch events and reports whether its content scrolls.
// usage: node audit.mjs <page-url-substring> <base> <route>[@<button text regex>] …   (port via CDP_PORT, default 9333)
//   "/deposit-offer@Detail" opens the route, then taps the first visible button/link whose text matches, to open a sheet.
const [, , urlPart, base, ...routes] = process.argv;
const port = process.env.CDP_PORT || 9333;
const t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page' && x.url.includes(urlPart));
if (!t) throw new Error(`no page matching ${urlPart}`);
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); });
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.result?.value;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The panel = the open dialog surface; its scroller = the biggest overflowing descendant.
const FIND = `(() => {
  const panels = [...document.querySelectorAll('.pop-bottomsheet, .pop-center, .dialog-item, [role=dialog]')].filter(e => e.getClientRects().length);
  const p = panels[panels.length - 1]; if (!p) return null;
  const all = [p, ...p.querySelectorAll('*')];
  const sc = all.filter(e => /(auto|scroll)/.test(getComputedStyle(e).overflowY) && e.clientHeight > 80)
    .sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
  const pr = p.getBoundingClientRect();
  // lowest painted content: an element counts only if no clipping ancestor (overflow != visible) cuts it off,
  // so a collapsed accordion (overflow-hidden, height 0) is not reported as clipped content
  const clipOf = (e) => { let lim = Infinity; for (let a = e.parentElement; a && a !== p.parentElement; a = a.parentElement) {
    if (getComputedStyle(a).overflowY !== 'visible') lim = Math.min(lim, a.getBoundingClientRect().top + a.clientHeight + (a.scrollHeight - a.clientHeight > 1 ? 1e9 : 0)); } return lim; };
  let bottom = 0; p.querySelectorAll('*').forEach(e => { const r = e.getBoundingClientRect(); if (!r.height || getComputedStyle(e).position === 'fixed') return;
    if (r.top < clipOf(e)) bottom = Math.max(bottom, Math.min(r.bottom, clipOf(e))); });
  window.__sc = sc || null;
  const r = sc ? sc.getBoundingClientRect() : pr;
  return { panel: p.className.toString().slice(0, 50), panelBottom: Math.round(Math.min(pr.bottom, innerHeight)), contentBottom: Math.round(bottom),
    scroller: sc ? sc.className.toString().slice(0, 50) : null, client: sc?.clientHeight, scroll: sc?.scrollHeight,
    x: r.left + r.width / 2, top: Math.max(r.top, 0), bot: Math.min(r.bottom, innerHeight) };
})()`;

for (const spec of routes) {
  const [route, tap] = spec.split('@');
  await send('Page.navigate', { url: base + route });
  await wait(Number(process.env.SETTLE_MS || 5000));
  if (tap) {
    const hit = await ev(`(() => { const re = new RegExp(${JSON.stringify(tap)}, 'i');
      const el = [...document.querySelectorAll('button,a,[role=button],[role=tab],div[class*=cursor-pointer]')].filter(e => e.getClientRects().length).find(e => re.test(e.innerText || e.getAttribute('aria-label') || ''));
      if (!el) return false; el.click(); return true; })()`);
    if (!hit) { console.log(JSON.stringify({ route: spec, result: 'NO-TRIGGER' })); continue; }
    await wait(1500);
  }
  const b = await ev(FIND);
  if (!b) { console.log(JSON.stringify({ route: spec, result: 'NO-DIALOG' })); continue; }
  const overflow = (b.scroll ?? 0) - (b.client ?? 0) > 1;
  let moved = null;
  if (overflow) {
    await ev('window.__sc.scrollTop = 0');
    const y0 = b.top + (b.bot - b.top) * 0.75, y1 = b.top + (b.bot - b.top) * 0.25;
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x, y: y0 }] });
    for (let i = 1; i <= 12; i++) { await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x, y: y0 + ((y1 - y0) * i) / 12 }] }); await wait(16); }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await wait(600);
    moved = await ev('window.__sc && window.__sc.isConnected ? window.__sc.scrollTop : -1');
  }
  // content hanging past the visible panel with nothing able to scroll to it
  const clipped = !overflow && b.contentBottom > b.panelBottom + 4;
  const result = clipped ? 'FAIL-CLIPPED' : overflow && !(moved > 10) ? 'FAIL-NO-SCROLL' : 'PASS';
  console.log(JSON.stringify({ route: spec, result, ...b, moved, x: undefined, top: undefined, bot: undefined }));
}
ws.close();
