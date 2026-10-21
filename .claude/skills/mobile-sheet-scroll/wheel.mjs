// Mouse-wheel / trackpad scroll over the open sheet's scroller (desktop browser at phone width, DevTools device mode).
// usage: node wheel.mjs <page-url-substring>
const [, , urlPart] = process.argv;
const port = process.env.CDP_PORT || 9333;
const t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page' && x.url.includes(urlPart));
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); });
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.result?.value;
const b = await ev(`(() => { const p = [...document.querySelectorAll('.pop-bottomsheet, .pop-center, .dialog-item')].filter(e => e.getClientRects().length).pop();
  const sc = p && [p, ...p.querySelectorAll('*')].filter(e => e.scrollHeight - e.clientHeight > 1 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)).pop();
  if (!sc) return null; window.__sc = sc; sc.scrollTop = 0; const r = sc.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
if (!b) { console.log('no scroller'); process.exit(1); }
for (let i = 0; i < 5; i++) await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: b.x, y: b.y, deltaX: 0, deltaY: 120 });
await new Promise((r) => setTimeout(r, 600));
console.log(JSON.stringify({ scrollTop: await ev('window.__sc.scrollTop') }));
ws.close();
