#!/usr/bin/env node
// Runtime check over CDP (Chrome on :9333): opens each page in a new tab of the default context
// (so a signed-in admin session is used), waits for it to settle, and searches the visible text,
// document.title and the title / alt / aria-label / placeholder attributes for the reference name,
// and every link / frame / form / loaded file for the reference's domains (hash.game, bc.game).
// Usage: node .claude/skills/no-reference-brand/crawl.mjs <base> <path> [path…]
//   e.g. node crawl.mjs http://localhost:5190 / /casino /bonus
// Exit 1 when a page shows the name. Needs `ws` (frontend/node_modules).
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../frontend/package.json', import.meta.url));
const WebSocket = require('ws');
const PORT = process.env.CDP_PORT || 9333;
const WAIT_MS = Number(process.env.WAIT_MS || 6000);
const [base, ...paths] = process.argv.slice(2);
if (!base || !paths.length) {
  console.error('usage: crawl.mjs <base> <path> [path…]');
  process.exit(2);
}

const PROBE = `(() => {
  const NAME = /hash[\\s.]?game(?![-_]exchange)/i;
  const HOST = /(^|\\.)(hash\\.game|bc\\.game|bcgame\\.[a-z]+)$/i;
  const off = (u) => { try { return HOST.test(new URL(u, location.href).hostname); } catch { return false; } };
  const hits = [];
  if (NAME.test(document.title)) hits.push('title: ' + document.title);
  const text = document.body?.innerText || '';
  for (const line of text.split('\\n')) if (NAME.test(line)) hits.push('text: ' + line.trim().slice(0, 140));
  for (const el of document.querySelectorAll('[title],[alt],[aria-label],[placeholder]')) {
    for (const a of ['title', 'alt', 'aria-label', 'placeholder']) {
      const v = el.getAttribute(a);
      if (v && NAME.test(v)) hits.push(a + ': ' + v.slice(0, 140));
    }
  }
  // Links, frames, forms and loaded files (images, scripts, fonts, API calls) on the reference's domains.
  for (const el of document.querySelectorAll('a[href],area[href],iframe[src],form[action],img[src],source[src],video[src],link[href],script[src]')) {
    const u = el.getAttribute('href') || el.getAttribute('src') || el.getAttribute('action');
    if (off(u)) hits.push(el.tagName.toLowerCase() + ': ' + u.slice(0, 140));
  }
  for (const r of performance.getEntriesByType('resource')) if (off(r.name)) hits.push('loaded: ' + r.name.slice(0, 140));
  return [...new Set(hits)];
})()`;

const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.once('open', r));
let id = 0;
const pending = new Map();
ws.on('message', (m) => {
  const msg = JSON.parse(m);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    id += 1;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });

let bad = 0;
try {
  for (const path of paths) {
    const url = new URL(path, base).href;
    await send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, WAIT_MS));
    const res = await send('Runtime.evaluate', { expression: PROBE, returnByValue: true });
    const hits = res.result?.result?.value ?? [];
    const where = (await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true })).result?.result?.value;
    if (hits.length) bad += 1;
    console.log(`${hits.length ? 'FAIL' : 'ok  '} ${url}${where !== url ? ` (landed on ${where})` : ''}`);
    for (const h of hits) console.log(`       ${h}`);
  }
} finally {
  ws.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/${tab.id}`);
}
console.log(bad ? `\n${bad} page(s) show the reference name.` : '\nClean: no page shows the reference name.');
process.exit(bad ? 1 : 0);
