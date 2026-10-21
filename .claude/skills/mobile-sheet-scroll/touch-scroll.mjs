// Real touch swipe through CDP (Input.dispatchTouchEvent) inside the open sheet, then reports
// whether its scroller moved and whether the sheet stayed open.
// usage: node touch-scroll.mjs <url-substring> [selector=.pop-content] [port=9333]
const [, , urlPart, sel = '.pop-bottomsheet .scroll-y, .pop-center .scroll-y', port = 9333] = process.argv;
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const t = targets.find((x) => x.type === 'page' && x.url.includes(urlPart));
if (!t) throw new Error(`no page matching ${urlPart}`);
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.result.value;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const box = await ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.getClientRects().length);
  if (!el) return null; el.scrollTop = 0; const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, top: r.top, bottom: r.bottom, client: el.clientHeight, scroll: el.scrollHeight }; })()`);
if (!box) { console.log(JSON.stringify({ error: 'no open scroller', sel })); process.exit(1); }
const x = box.x;
const y0 = Math.min(box.bottom - 10, box.top + box.client * 0.8);
const y1 = Math.max(box.top + 5, y0 - 200);
await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
for (let i = 1; i <= 12; i++) {
  await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 12 }] });
  await wait(16);
}
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await wait(500);
const after = await ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.getClientRects().length);
  return el ? { scrollTop: el.scrollTop, open: true } : { open: false }; })()`);
console.log(JSON.stringify({ ...box, ...after, pass: !!after.open && (box.scroll - box.client <= 1 || after.scrollTop > 20) }));
ws.close();
