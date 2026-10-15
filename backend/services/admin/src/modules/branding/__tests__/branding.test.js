'use strict';

const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');

const { createLogger, errorHandler, requestContext } = require('@ibitplay/common');

const { createEntitlementsPoller, sign } = require('../../entitlements/entitlements.poller');
const { createBrandingStore } = require('../branding.store');
const { cleanBranding, imageProblem } = require('../branding.rules');
const publicRoutes = require('../routes/public.routes');

/**
 * Branding (docs/OWNER-PANEL.md §8): the signed document carries the block with images named by
 * their SHA-256; the store fetches each image from the owner panel and keeps it only when the
 * bytes hash to the name and pass the image checks; the public read lists only what is here;
 * the asset route serves it immutable and inert.
 */

const SECRET = 'test-owner-shared-secret-0123456789abcdef';
const logger = createLogger({ name: 'branding-test', level: 'silent' });
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/** A real PNG header (the sniff needs the signature) padded past the 64-byte minimum. */
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]), Buffer.alloc(120, 7)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#1A1D1E"/><path fill="#24EE89" d="M10 10h50v50H10z"/></svg>\n');
const EVIL = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><script>alert(document.cookie)</script><path d="M0 0h1v1H0z"/></svg>\n');

const ref = (buf, ext, type) => ({ file: `${sha(buf)}.${ext}`, type, bytes: buf.length, width: 128, height: 128 });
const logo = { ...ref(PNG, 'png', 'image/png'), width: 576 };
const mark = ref(SVG, 'svg', 'image/svg+xml');
const evil = ref(EVIL, 'svg', 'image/svg+xml');

const branding = (over = {}) => ({
  siteName: 'jumboflush',
  title: 'Jumbo Flush — Casino & Sports',
  titleTemplate: '%s · Jumbo Flush',
  description: 'Crypto casino and sports.',
  keywords: ['casino', 'Casino', 'sports'],
  ogTitle: '',
  ogDescription: '',
  themeColor: '#24ee89',
  logo,
  mark,
  ogImage: null,
  ...over,
});

const doc = (version, b) => ({ site: 'hash-game-exchange', version, updatedAt: '2026-10-12T10:00:00.000Z', features: {}, flags: {}, ...(b === undefined ? {} : { branding: b }) });

test('rules: a malformed field reads as unset, never reaches a reader', () => {
  const c = cleanBranding(branding({ title: '<script>x</script>', titleTemplate: 'no placeholder', themeColor: 'red', logo: { file: '../../etc/passwd', type: 'image/png', bytes: 100 }, extra: 1 }));
  assert.equal(c.title, '');
  assert.equal(c.titleTemplate, '');
  assert.equal(c.themeColor, '');
  assert.equal(c.logo, null);
  assert.deepEqual(c.keywords, ['casino', 'sports']);
  assert.equal('extra' in c, false);
  assert.equal(cleanBranding(undefined), null);
  assert.equal(cleanBranding(branding()).themeColor, '#24EE89');
});

test('rules: image checks by bytes', () => {
  assert.equal(imageProblem(PNG, logo.file, 'logo'), null);
  assert.equal(imageProblem(SVG, mark.file, 'mark'), null);
  assert.match(imageProblem(EVIL, evil.file, 'mark'), /unsafe SVG/);
  assert.match(imageProblem(SVG, `${sha(SVG)}.png`, 'logo'), /not a PNG/);
  assert.match(imageProblem(PNG, `${sha(PNG)}.svg`, 'logo'), /raster/);
  assert.match(imageProblem(Buffer.alloc(300 * 1024, 1), logo.file, 'logo'), /too large/);
});

test('branding: signed document → fetched images → public read → served bytes', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'branding-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  // The owner panel: the document, and the images by name (one of them tampered on demand).
  let answer = doc(1);
  const served = new Map([[logo.file, PNG], [mark.file, SVG], [evil.file, EVIL]]);
  const assetCalls = [];
  const fetchImpl = async (url, init) => {
    if (url.endsWith('/api/entitlements')) {
      const data = answer;
      return { ok: true, status: 200, json: async () => ({ data, signature: sign(data, SECRET) }) };
    }
    const name = url.split('/').pop();
    assetCalls.push({ name, key: init?.headers?.['x-owner-key'] });
    const bytes = served.get(name);
    return bytes ? { ok: true, status: 200, arrayBuffer: async () => bytes } : { ok: false, status: 404 };
  };
  const config = { OWNER_PANEL_URL: 'https://owner.test/', OWNER_SHARED_SECRET: SECRET, OWNER_POLL_SECONDS: 3600, RATE_LIMIT_ENABLED: false };
  const poller = createEntitlementsPoller({ config, logger, filePath: path.join(dir, 'owner-entitlements.json'), fetchImpl });
  const store = createBrandingStore({ config, logger, dir: path.join(dir, 'branding'), fetchImpl });

  const app = express();
  app.use(requestContext());
  app.use('/api/v1/admin/branding', publicRoutes({ entitlementsPoller: poller, brandingStore: store, config, logger }));
  app.use(errorHandler({ logger }));
  const server = app.listen(0);
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}/api/v1/admin/branding`;
  const read = async () => (await (await fetch(`${base}/public`)).json()).data;

  await t.test('not branded: every field null, the UI keeps its own', async () => {
    await poller.pollOnce();
    const data = await read();
    assert.equal(data.branded, false);
    assert.equal(data.siteName, null);
    assert.equal(data.logoUrl, null);
  });

  await t.test('a document names images: none listed until fetched, then listed with hash URLs', async () => {
    answer = doc(2, branding());
    await poller.pollOnce();
    const before = await read();
    assert.equal(before.siteName, 'jumboflush');
    assert.equal(before.titleTemplate, '%s · Jumbo Flush');
    assert.deepEqual(before.keywords, ['casino', 'sports']);
    assert.equal(before.themeColor, '#24EE89');
    // The read kicked a fetch; wait for the explicit sync too.
    const result = await store.sync(poller.current().branding);
    assert.deepEqual(result.failed, []);
    const after = await read();
    assert.equal(after.logoUrl, `/api/v1/admin/branding/asset/${logo.file}`);
    assert.equal(after.markUrl, `/api/v1/admin/branding/asset/${mark.file}`);
    assert.equal(after.ogImageUrl, null);
    assert.ok(assetCalls.every((c) => c.key === SECRET));
    assert.ok(!JSON.stringify(after).includes(SECRET));
  });

  await t.test('the asset route serves the bytes immutable and inert', async () => {
    const res = await fetch(`${base}/asset/${mark.file}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'image/svg+xml');
    assert.match(res.headers.get('cache-control'), /immutable/);
    assert.match(res.headers.get('content-security-policy'), /sandbox/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('etag'), `"${sha(SVG)}"`);
    assert.deepEqual(Buffer.from(await res.arrayBuffer()), SVG);
    const png = await fetch(`${base}/asset/${logo.file}`);
    assert.equal(png.headers.get('content-type'), 'image/png');
  });

  await t.test('strict validators: bad names, traversal and query strings are refused', async () => {
    for (const p of [`/asset/${'f'.repeat(64)}.png`]) assert.equal((await fetch(base + p)).status, 404);
    for (const p of ['/asset/..%2F..%2Fowner-entitlements.json', `/asset/${logo.file.toUpperCase()}`, `/asset/${sha(PNG)}.jpg`, '/asset/x.png']) {
      const status = (await fetch(base + p)).status;
      assert.ok(status === 422 || status === 400, `${p} → ${status}`);
    }
    assert.ok([400, 422].includes((await fetch(`${base}/public?x=1`)).status));
    assert.ok([400, 422].includes((await fetch(`${base}/asset/${logo.file}?v=1`)).status));
  });

  await t.test('bytes that do not hash to the signed name are never stored', async () => {
    const other = { ...logo, file: `${'0'.repeat(64)}.png` };
    served.set(other.file, PNG); // right format, wrong hash
    const result = await store.sync({ ...poller.current().branding, ogImage: other });
    assert.deepEqual(result.failed, [other.file]);
    assert.equal(fs.existsSync(path.join(dir, 'branding', other.file)), false);
  });

  await t.test('an unsafe SVG is refused even when its hash matches', async () => {
    const result = await store.sync({ ...poller.current().branding, mark: evil });
    assert.deepEqual(result.failed, [evil.file]);
    assert.equal((await fetch(`${base}/asset/${evil.file}`)).status, 404);
  });

  await t.test('http:// to another host is never called', async () => {
    const calls = assetCalls.length;
    const insecure = createBrandingStore({ config: { ...config, OWNER_PANEL_URL: 'http://owner.example.com' }, logger, dir: path.join(dir, 'b2'), fetchImpl });
    const result = await insecure.sync({ logo });
    assert.deepEqual(result.failed, [logo.file]);
    assert.equal(assetCalls.length, calls);
  });
});
