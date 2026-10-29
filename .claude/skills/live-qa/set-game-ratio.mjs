#!/usr/bin/env node
// Set every Game ratio exception (each provider / game with its own %) on the LIVE site to one %.
// Runs inside the signed-in live admin tab (Chrome CDP :9333), so it is the admin's own save — the
// same PUT the Bonus → Wager contribution screen sends, logged in the Activity log.
//   node .claude/skills/live-qa/set-game-ratio.mjs <percent> [--types <percent>]
// The game types (Slots / Originals / Live casino / Sports) are left as they are unless --types is
// given. The rules before the change are saved to logs/qa/wager-ratio/live-before-<time>.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const ROOT = new URL('../../../', import.meta.url);
const require = createRequire(new URL('frontend/package.json', ROOT));
const WebSocket = require('ws');

const args = process.argv.slice(2);
const pct = args[0];
const typesPct = args.includes('--types') ? args[args.indexOf('--types') + 1] : null;
const valid = (p) => p != null && /^\d+(\.\d+)?$/.test(p) && Number(p) <= 100;
if (!valid(pct) || (typesPct != null && !valid(typesPct))) {
  console.error('usage: set-game-ratio.mjs <percent 0-100> [--types <percent 0-100>]');
  process.exit(2);
}

const tabs = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const tab = tabs.find((t) => t.type === 'page' && t.url.startsWith('https://admin.parker567.com/') && !t.url.includes('/owner'));
if (!tab) throw new Error('Open the live admin (https://admin.parker567.com) signed in, in the CDP Chrome');

const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.once('open', r));
let id = 0;
const evaluate = (expression) =>
  new Promise((resolve) => {
    const my = ++id;
    ws.on('message', function on(m) {
      const j = JSON.parse(m);
      if (j.id !== my) return;
      ws.off('message', on);
      resolve(j.result?.result?.value);
    });
    ws.send(JSON.stringify({ id: my, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
  });

const PATH = '/api/gw/api/v1/admin/site-config/wager-contribution';
const read = async () => {
  const raw = await evaluate(`fetch('${PATH}', { cache: 'no-store' }).then((r) => r.text())`);
  const rules = JSON.parse(raw ?? 'null')?.data?.rules;
  if (!rules) throw new Error('Could not read the rules: ' + String(raw).slice(0, 200));
  return rules;
};

const before = await read();
mkdirSync(new URL('logs/qa/wager-ratio/', ROOT), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(new URL(`logs/qa/wager-ratio/live-before-${stamp}.json`, ROOT), JSON.stringify({ takenAt: new Date().toISOString(), rules: before }, null, 1));

const rules = before.map((r) => ({
  category: r.category,
  provider: r.provider,
  gameRef: r.gameRef,
  percent: r.category ? (typesPct ?? r.percent) : pct,
}));
const put = JSON.parse(
  await evaluate(
    `fetch('${PATH}', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: ${JSON.stringify(JSON.stringify({ rules }))} }).then(async (r) => JSON.stringify({ status: r.status, body: await r.text() }))`
  )
);
if (put.status !== 200) {
  console.error('Save refused:', put.status, put.body.slice(0, 300));
  process.exit(1);
}

const after = await read();
const wrong = after.filter((r) => String(Number(r.percent)) !== String(Number(r.category ? (typesPct ?? before.find((b) => b.category === r.category)?.percent) : pct)));
console.log(`Saved ${after.length} rules (backup: logs/qa/wager-ratio/live-before-${stamp}.json)`);
for (const r of after) console.log(`  ${(r.category ? `type ${r.category}` : r.provider ? `provider ${r.provider}` : `${r.gameName ?? r.gameRef}${r.gameProvider ? ` · ${r.gameProvider}` : ''}`).padEnd(48)} ${r.percent}%`);
console.log(wrong.length ? `MISMATCH on ${wrong.length} rule(s)` : 'Verified: every rule reads back as set.');
ws.close();
process.exit(wrong.length ? 1 : 0);
