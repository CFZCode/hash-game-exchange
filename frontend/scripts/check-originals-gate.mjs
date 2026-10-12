#!/usr/bin/env node
/**
 * The BC Originals gate (services/gates.js `originals`) on a site-config payload with the
 * owner's "Originals (in-house)" flag off, and that the in-house list is then never asked for.
 *
 *   node --test scripts/check-originals-gate.mjs
 *
 * No server: `fetch` is stubbed with the two public reads. Exits 1 on any failure.
 */
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import assert from 'node:assert/strict';

/* src/ imports are extensionless (bundler style); let Node resolve them the same way. */
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith('.') && !/\.\w+$/.test(specifier)) return next(`${specifier}.js`, context);
      throw err;
    }
  },
});

process.env.NEXT_PUBLIC_USE_FIXTURES = 'false';
process.env.NEXT_PUBLIC_API_BASE = 'http://backend.test';

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window ??= globalThis;
globalThis.window.addEventListener ??= () => {};
globalThis.window.dispatchEvent ??= () => true;
globalThis.document ??= { documentElement: { dataset: {}, setAttribute() {}, removeAttribute() {} } };

const FEATURES = [
  { feature: 'theme', kind: 'theme', variant: 'hash_game' },
  { feature: 'swap', variant: 'default' },
  { feature: 'vip', variant: 'default' },
  { feature: 'promotions', variant: 'default' },
];
let siteFlags = { casino: true, originals: false, crash: true, vipclub: true, bonus: true };
const calls = [];
globalThis.fetch = async (url) => {
  const path = new URL(url).pathname;
  calls.push(path);
  const data = path.endsWith('/admin/site-config/public')
    ? siteFlags
    : path.endsWith('/admin/features/public')
      ? FEATURES
      : [{ game_uid: 'crash', game_name: 'Crash', vendor: 'in-house', is_active: true }];
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'content-type': 'application/json' } });
};

const { makeGates, gateOf, loadPublicGates, publicGates } = await import('../src/services/gates.js');
const { getOriginals } = await import('../src/services/originals.js');

test('originals off: the gate, its routes, nothing else', () => {
  const gates = makeGates({ flags: siteFlags, features: FEATURES, capabilities: null });
  assert.equal(gates.on('originals'), false);
  assert.equal(gates.blocked('originals'), 'site');
  for (const path of ['/casino/brand', '/gamelist/brand', '/section/originals']) {
    assert.equal(gateOf(path), 'originals', path);
    assert.equal(gates.routeOn(path), false, path);
  }
  for (const path of ['/', '/casino', '/casino/slots', '/casino/hot', '/game/crash', '/help/provably-fair']) {
    assert.equal(gates.routeOn(path), true, path);
  }
  for (const gate of ['swap', 'vip', 'promotions', 'deposit', 'withdraw', 'sports']) {
    assert.equal(gates.on(gate), true, gate);
  }
});

test('originals missing or true: on', () => {
  assert.equal(makeGates({ flags: { casino: true }, features: FEATURES }).on('originals'), true);
  assert.equal(makeGates({ flags: { originals: true }, features: FEATURES }).on('originals'), true);
  assert.equal(makeGates({}).on('originals'), true, 'reads not answered = on');
});

test('originals off: the in-house list is never requested', async () => {
  calls.length = 0;
  await loadPublicGates();
  assert.equal((await publicGates()).on('originals'), false);
  assert.deepEqual(await getOriginals(), []);
  assert.ok(!calls.some((p) => p.includes('/js-games/')), `asked for ${calls.join(', ')}`);
});

test('originals back on: the list is read again', async () => {
  siteFlags = { ...siteFlags, originals: true };
  await new Promise((resolve) => setTimeout(resolve, 1100)); // past the shared-read window
  await loadPublicGates();
  calls.length = 0;
  const games = await getOriginals();
  assert.equal(games.length, 1);
  assert.ok(calls.some((p) => p.endsWith('/casino/js-games/v1/games')));
});
