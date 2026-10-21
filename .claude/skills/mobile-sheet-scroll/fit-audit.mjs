// Fit audit at phone + desktop widths: for each route, report page side-scroll and every element whose
// text is cut (overflow hidden/clip and scrollWidth > clientWidth). Routes ending in "*" also run
// table-check.js (switch through the first filter's options).
// usage: node fit-audit.mjs <page-url-substring> <base> <route>[*] …   (CDP_PORT, default 9333)
import { readFileSync } from 'node:fs';
const [, , urlPart, base, ...routes] = process.argv;
const port = process.env.CDP_PORT || 9333;
const t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((x) => x.type === 'page' && x.url.includes(urlPart));
if (!t) throw new Error(`no page matching ${urlPart}`);
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); });
const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result.result?.value ?? r.result.exceptionDetails?.exception?.description; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const tableCheck = readFileSync(new URL('./table-check.js', import.meta.url), 'utf8').replace(/^\/\/.*$/gm, '');
const MEASURE = `(() => {
  const main = document.querySelector('main') || document.body;
  const cut = [...main.querySelectorAll('*')].filter(e => {
    if (!e.getClientRects().length || !e.innerText || e.children.length > 3) return false;
    const s = getComputedStyle(e); if (!/(hidden|clip)/.test(s.overflowX)) return false;
    return e.scrollWidth > e.clientWidth + 1 && e.clientWidth > 0;
  }).map(e => e.innerText.replace(/\\s+/g, ' ').slice(0, 30));
  return { side: document.documentElement.scrollWidth > innerWidth, cut: [...new Set(cut)].slice(0, 8) };
})()`;
const VIEWS = [
  { name: 'phone360', width: 360, height: 640, deviceScaleFactor: 3, mobile: true },
  { name: 'desktop1280', width: 1280, height: 900, deviceScaleFactor: 1, mobile: false },
];
for (const v of VIEWS) {
  await send('Emulation.setDeviceMetricsOverride', v);
  await send('Emulation.setTouchEmulationEnabled', { enabled: v.mobile });
  for (const spec of routes) {
    const route = spec.replace(/\*$/, '');
    await send('Page.navigate', { url: base + route });
    await wait(Number(process.env.SETTLE_MS || 6000));
    const res = spec.endsWith('*') ? await ev(`(${tableCheck})()`) : await ev(MEASURE);
    console.log(v.name, route, JSON.stringify(res));
  }
}
await send('Emulation.clearDeviceMetricsOverride');
ws.close();
