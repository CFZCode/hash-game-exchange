#!/usr/bin/env node
/**
 * Sign a demo player or demo staff account in through the gateway WITHOUT ever showing a password.
 *
 *   node scripts/demo-login.mjs <login>            prints {"login","accessToken"} as JSON
 *   node scripts/demo-login.mjs <login> --check    prints OK or FAIL only
 *   node scripts/demo-login.mjs --list             prints every demo login and its kind (no passwords)
 *
 * Reads backend/.demo-credentials.local.md (gitignored) itself. Agents and scripts must use this
 * instead of opening that file: never cat, grep, head or sed it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(root, 'backend/.demo-credentials.local.md');
const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:4700';

function rows() {
  const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter((l) => l.startsWith('|'));
  const head = lines[0].split('|').map((c) => c.trim());
  const at = (name) => head.indexOf(name);
  return lines.slice(2).map((l) => {
    const c = l.split('|').map((x) => x.trim().replace(/^`|`$/g, ''));
    return { kind: c[at('kind')], login: c[at('login')], password: c[at('password')] };
  });
}

const [arg, flag] = process.argv.slice(2);
if (!arg) { console.error('usage: node scripts/demo-login.mjs <login> [--check] | --list'); process.exit(2); }
if (arg === '--list') {
  for (const r of rows()) if (r.login) console.log(`${r.login}\t${r.kind}`);
  process.exit(0);
}
const row = rows().find((r) => r.login === arg);
if (!row) { console.error(`no demo account ${arg}`); process.exit(2); }
/* Staff rows sign in to the admin API by e-mail. The site admin keeps that token in the
   `cfz_hash_game_exchange_token` cookie (admin SESSION_COOKIE_NAME; the hub default
   `cfz_sa_token` is not used here), so a browser test can set it directly. */
const staff = row.kind && !row.kind.toLowerCase().includes('player');
const email = staff ? staffEmail(arg) : null;
function staffEmail(login) {
  const lines = fs.readFileSync(FILE, 'utf8').split('\n').filter((l) => l.startsWith('|'));
  const head = lines[0].split('|').map((c) => c.trim());
  const hit = lines.slice(2).map((l) => l.split('|').map((x) => x.trim().replace(/^`|`$/g, ''))).find((c) => c[head.indexOf('login')] === login);
  return hit?.[head.indexOf('email')];
}
const res = await fetch(`${GATEWAY}/api/v1/${staff ? 'admin' : 'user'}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(staff ? { email, password: row.password } : { identifier: row.login, password: row.password }),
});
const body = await res.json().catch(() => ({}));
const token = body?.data?.accessToken ?? body?.data?.tokens?.accessToken ?? body?.data?.token;
if (flag === '--check') { console.log(res.ok && token ? 'OK' : `FAIL ${res.status} ${body?.error?.code ?? ''}`); process.exit(res.ok ? 0 : 1); }
if (!res.ok || !token) { console.error(`FAIL ${res.status} ${body?.error?.code ?? body?.message ?? ''}`); process.exit(1); }
console.log(JSON.stringify({ login: row.login, accessToken: token }));
