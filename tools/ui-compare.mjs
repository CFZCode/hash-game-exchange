#!/usr/bin/env node
/**
 * Pixel-compare two running copies of the frontend, route by route, at desktop and phone width.
 *
 *   node tools/ui-compare.mjs <baseA> <baseB> [outDir] [--routes /,/casino,...] [--max 0.5]
 *
 * baseA is the reference (the original hash-games frontend), baseB the build under test.
 * Drives the shared QA Chrome over CDP (http://127.0.0.1:9333; start it with
 * `node /Users/apple/Developer/cfz/admins/agents/qa-browser.mjs start`).
 * Animations, transitions and videos are frozen before each shot so the two are comparable.
 * Prints the share of differing pixels per route; writes both PNGs for any route over --max
 * (percent, default 0.5) and exits 1 if any route is over it.
 *
 * Known noise: /help/* is a federated remote served live by hash.game, which can show its own
 * region pop-up on one load and not the next. Compare it by eye.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../frontend/package.json'));
const { PNG } = require('pngjs');

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); if (i < 0) return dflt; const v = args[i + 1]; args.splice(i, 2); return v; };
const ROUTES = flag('--routes', null)?.split(',') ?? ['/', '/casino', '/casino/slots', '/promotions/promotion',
  '/promotions/daily-contest', '/promotions/weekly-raffle', '/vip-detail', '/bonus', '/quests',
  '/referral-exhibition', '/responsible', '/explore', '/favorite', '/recent', '/deposit-offer', '/settings',
  '/gamelist/slots', '/affiliate', '/sports'];
const MAX = Number(flag('--max', '0.5'));
const [A, B, OUT = path.join(here, '../.ui-compare')] = args;
if (!A || !B) { console.error('usage: node tools/ui-compare.mjs <baseA> <baseB> [outDir] [--routes a,b] [--max 0.5]'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const VIEWS = [{ w: 1440, h: 900, m: false }, { w: 390, h: 844, m: true }];

const CDP = 'http://127.0.0.1:9333';
const tgt = await (await fetch(`${CDP}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tgt.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r, j) => {
  const i = ++id;
  const t = setTimeout(() => { pending.delete(i); j(new Error(`timeout ${method}`)); }, 20000);
  pending.set(i, (m) => { clearTimeout(t); r(m); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Page.enable');
await send('Page.bringToFront');
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
async function shot(url, v) {
  await send('Emulation.setDeviceMetricsOverride', { width: v.w, height: v.h, deviceScaleFactor: 1, mobile: v.m });
  await send('Emulation.setTouchEmulationEnabled', { enabled: v.m });
  await send('Page.navigate', { url });
  await sleep(4500);
  await send('Runtime.evaluate', { expression: `(()=>{const s=document.createElement('style');s.textContent=${JSON.stringify(FREEZE)};document.head.appendChild(s);document.querySelectorAll('video').forEach(v=>{try{v.pause();v.currentTime=0}catch{}});window.scrollTo(0,0)})()` });
  await sleep(600);
  const r = await send('Page.captureScreenshot', { format: 'png' });
  return Buffer.from(r.result.data, 'base64');
}

let failed = 0;
try {
  for (const v of VIEWS) for (const route of ROUTES) {
    let line;
    try {
      const a = PNG.sync.read(await shot(A + route, v));
      const b = PNG.sync.read(await shot(B + route, v));
      let diff = 0; const n = Math.min(a.data.length, b.data.length);
      for (let i = 0; i < n; i += 4) {
        if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > 30) diff++;
      }
      const pct = (diff / (n / 4)) * 100;
      if (pct > MAX) {
        failed++;
        const tag = `${v.w}${route.replace(/\//g, '_') || '_root'}`;
        fs.writeFileSync(path.join(OUT, `${tag}-A.png`), PNG.sync.write(a));
        fs.writeFileSync(path.join(OUT, `${tag}-B.png`), PNG.sync.write(b));
      }
      line = `${pct.toFixed(2).padStart(6)}%  ${v.w}  ${route}${pct > MAX ? '  <-- DIFF' : ''}`;
    } catch (err) {
      failed++;
      line = `  ERROR  ${v.w}  ${route}  (${err.message})`;
    }
    console.log(line);
  }
} finally {
  ws.close();
  await fetch(`${CDP}/json/close/${tgt.id}`).catch(() => {});
}
console.log(failed ? `\n${failed} route(s) over ${MAX}% — shots in ${OUT}` : '\nall routes match');
process.exit(failed ? 1 : 0);
