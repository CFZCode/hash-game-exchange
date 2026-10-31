#!/usr/bin/env node
/**
 * Live web-push test on the REAL player site over CDP — every notification type to ONE test player,
 * checking each arrives in the open tab and plays the chime.
 *
 *   STAFF_EMAIL=… STAFF_PASSWORD=… node .claude/skills/live-qa/push-live-test.mjs
 *
 * Before running:
 *   - push is ON for the site (owner panel → Features & plan → Push notifications, OneSignal) and the
 *     App ID + App API key are set (backend .env ONESIGNAL_* or site admin → Features → Push);
 *     OneSignal → Settings → Keys & IDs → Identity Verification is OFF;
 *   - the CDP Chrome (port 9333, NOT an incognito / isolated context: it denies notifications) has a
 *     tab on SITE with the test player signed in.
 *
 * Sends only to that player. `ALL=1` also sends a broadcast and an "everyone" campaign — those reach
 * every subscribed real player, so only with the owner's say-so.
 *
 * Env: STAFF_EMAIL, STAFF_PASSWORD (a staff login with config:write), optional API (default
 * https://api.parker567.com), SITE (default https://parker567.com), CDP_PORT (9333),
 * SCHEDULE_MIN (2), ALL (0).
 */
const API = (process.env.API || 'https://api.parker567.com').replace(/\/+$/, '') + '/api/v1';
const SITE = (process.env.SITE || 'https://parker567.com').replace(/\/+$/, '');
const CDP = `http://127.0.0.1:${process.env.CDP_PORT || 9333}`;
const SCHEDULE_MIN = Number(process.env.SCHEDULE_MIN || 2);
const ALL = process.env.ALL === '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const die = (msg) => {
  console.error(`\nSTOP: ${msg}`);
  process.exit(1);
};

// ── CDP: one browser socket, flattened sessions ──
async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((res, rej) => ((ws.onopen = res), (ws.onerror = rej)));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result)));
      ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  return { send, close: () => ws.close() };
}

async function main() {
  if (!process.env.STAFF_EMAIL || !process.env.STAFF_PASSWORD) die('set STAFF_EMAIL and STAFF_PASSWORD (a staff login with config:write).');

  // 1. Is push on, with an App ID the browser can use?
  const features = await (await fetch(`${API}/admin/features/public`)).json();
  const push = (features.data ?? []).find((f) => f.feature === 'push_notifications');
  if (!push) die('push_notifications is OFF on this site — owner panel → Features & plan → Push notifications ON (OneSignal), save.');
  if (!push.config?.appId) die('push is on but has no App ID — backend .env ONESIGNAL_APP_ID, or site admin → Site Config → Features → Push.');
  console.log(`1. push ON, App ID ${push.config.appId}`);

  // 2. Staff login + the admin's own readiness card.
  const login = await (await fetch(`${API}/admin/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: process.env.STAFF_EMAIL, password: process.env.STAFF_PASSWORD }) })).json();
  const d = login.data ?? {};
  const token = d.accessToken || d.token || d.tokens?.accessToken;
  if (!token) die(`staff login failed: ${login.error?.code || login.error?.message || 'no token'} (2FA accounts cannot be used here).`);
  const call = async (method, path, body) => {
    const r = await fetch(API + path, { method, headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, ok: Boolean(j.success), data: j.data, err: j.error?.code || j.error?.message };
  };
  const status = await call('GET', '/admin/push/status');
  if (!status.ok) die(`push status: ${status.err}`);
  console.log(`2. admin status: ${status.data.ready ? 'ready to send' : 'NOT ready'} (feature ${status.data.enabled}, appId ${status.data.appIdSet}, apiKey ${status.data.apiKeySet})`);
  if (!status.data.ready) die('the App API key is missing — backend .env ONESIGNAL_API_KEY or site admin → Features → Push.');

  // 3. The player's tab on the real site.
  const version = await (await fetch(`${CDP}/json/version`)).json().catch(() => null);
  if (!version) die(`no CDP Chrome on ${CDP}.`);
  const cdp = await connect(version.webSocketDebuggerUrl);
  const { targetInfos } = await cdp.send('Target.getTargets');
  const tab = targetInfos.find((t) => t.type === 'page' && t.url.startsWith(SITE));
  if (!tab) die(`open ${SITE} in the CDP Chrome and sign the test player in.`);
  if (tab.browserContextId && targetInfos.some((t) => t.browserContextId === tab.browserContextId && t.url.startsWith('chrome://'))) console.warn('   (tab context looks non-default)');
  await cdp.send('Browser.grantPermissions', { origin: SITE, permissions: ['notifications'], ...(tab.browserContextId ? { browserContextId: tab.browserContextId } : {}) });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: tab.targetId, flatten: true });
  const evaluate = async (expression) => (await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId)).result.value;
  await cdp.send('Page.reload', {}, sessionId);
  await sleep(4000);

  const sub = await evaluate(`(async () => {
    for (let i = 0; i < 40; i++) { const S = window.OneSignal?.User?.PushSubscription; if (S?.optedIn && S?.token && S?.id && !String(S.id).startsWith('local-')) break; await new Promise(r => setTimeout(r, 1000)); }
    const O = window.OneSignal;
    return { permission: Notification.permission, loaded: !!O?.User, optedIn: !!O?.User?.PushSubscription?.optedIn, token: !!O?.User?.PushSubscription?.token, externalId: O?.User?.externalId ?? null };
  })()`);
  console.log(`3. browser: permission ${sub.permission}, OneSignal ${sub.loaded ? 'loaded' : 'NOT loaded'}, subscribed ${sub.optedIn && sub.token}, player ${sub.externalId}`);
  if (sub.permission !== 'granted') die('notifications are not granted in this tab (an incognito / isolated context denies them).');
  if (!sub.externalId) die('no player signed in on the site tab.');
  if (!sub.optedIn || !sub.token) die('the browser did not register with OneSignal — check Identity Verification is OFF, then clear the site data and reload.');
  const UID = Number(sub.externalId);

  // 4. A real click (browsers play sound only after one), then watch pushes + sound in the page.
  for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: 5, y: 300, button: 'left', clickCount: 1 }, sessionId);
  await evaluate(`(() => {
    window.__pushLog = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { const p = play.call(this); const src = this.src; p.then(() => window.__pushLog.push({ ev: 'sound', src }), (e) => window.__pushLog.push({ ev: 'sound-blocked', err: e.name })); return p; };
    window.OneSignal.Notifications.addEventListener('foregroundWillDisplay', (e) => window.__pushLog.push({ ev: 'push', title: e.notification?.title }));
    return true;
  })()`);
  console.log(`4. watching player ${UID} (gesture ${await evaluate('navigator.userActivation.hasBeenActive')})`);

  // 5. Every send type, one player only (plus everyone with ALL=1).
  const stamp = new Date().toISOString().slice(11, 19);
  const content = (title, body) => ({ title: `${title} · ${stamp}`, body, url: '/promotions', buttons: [{ id: 'open', text: 'Open', url: '/bonus' }], priority: 'high' });
  const sent = [];
  const fire = async (label, title, fn) => {
    const r = await fn();
    sent.push({ label, title: `${title} · ${stamp}`, status: r.status, err: r.err });
    await sleep(5000);
    return r;
  };
  await fire('one user (Content → Notifications)', 'QA 1 one user', () => call('POST', '/admin/notifications/send', { userId: UID, title: `QA 1 one user · ${stamp}`, body: 'Admin → Content → Notifications → One user', type: 'general' }));
  await fire('campaign → player (Push → Compose)', 'QA 2 campaign player', async () => {
    const c = await call('POST', '/admin/push/campaigns', { name: `qa players ${stamp}`, ...content('QA 2 campaign player', 'Push → Compose → Players'), audience: { kind: 'players', userIds: [UID] } });
    return c.ok ? call('POST', `/admin/push/campaigns/${c.data.id}/send`) : c;
  });
  await fire('test send (Push → Compose → Test)', 'QA 3 test send', () => call('POST', '/admin/push/test', { userId: UID, ...content('QA 3 test send', 'Push → Compose → Test') }));
  if (ALL) {
    await fire('broadcast (all direct users)', 'QA 4 broadcast', () => call('POST', '/admin/notifications/broadcast', { title: `QA 4 broadcast · ${stamp}`, body: 'Every direct player', type: 'general' }));
    await fire('campaign → everyone', 'QA 5 everyone', async () => {
      const c = await call('POST', '/admin/push/campaigns', { name: `qa all ${stamp}`, ...content('QA 5 everyone', 'Every subscriber'), audience: { kind: 'all' } });
      return c.ok ? call('POST', `/admin/push/campaigns/${c.data.id}/send`) : c;
    });
  }
  const at = new Date(Date.now() + SCHEDULE_MIN * 60_000);
  const sched = await call('POST', '/admin/push/campaigns', { name: `qa scheduled ${stamp}`, ...content('QA 6 scheduled', `Due ${at.toISOString().slice(11, 19)} UTC`), audience: { kind: 'players', userIds: [UID] } });
  const schedR = sched.ok ? await call('POST', `/admin/push/campaigns/${sched.data.id}/schedule`, { sendAt: at.toISOString() }) : sched;
  sent.push({ label: `scheduled +${SCHEDULE_MIN} min`, title: `QA 6 scheduled · ${stamp}`, status: schedR.status, err: schedR.err });
  const canc = await call('POST', '/admin/push/campaigns', { name: `qa cancelled ${stamp}`, ...content('QA 7 CANCELLED', 'Must never arrive'), audience: { kind: 'players', userIds: [UID] } });
  if (canc.ok) await call('POST', `/admin/push/campaigns/${canc.data.id}/schedule`, { sendAt: new Date(Date.now() + 60_000).toISOString() });
  const cancR = canc.ok ? await call('POST', `/admin/push/campaigns/${canc.data.id}/cancel`) : canc;
  console.log(`5. sent ${sent.length} (+1 scheduled-then-cancelled: ${cancR.ok ? 'cancelled' : cancR.err}); waiting ${SCHEDULE_MIN} min for the scheduled one…`);

  // 6. Wait past the scheduled time (+ the scheduler's tick), then read what the tab saw.
  await sleep(SCHEDULE_MIN * 60_000 + 45_000);
  const log = await evaluate('window.__pushLog');
  const got = log.filter((x) => x.ev === 'push').map((x) => x.title);
  const sounds = log.filter((x) => x.ev === 'sound').length;
  const blocked = log.filter((x) => x.ev === 'sound-blocked').length;

  console.log('\n RESULT');
  for (const s of sent) console.log(` ${got.includes(s.title) ? 'PASS' : 'FAIL'}  ${s.label.padEnd(36)} api ${s.status}${s.err ? ` ${s.err}` : ''}`);
  console.log(` ${got.some((t) => t.startsWith('QA 7 CANCELLED')) ? 'FAIL' : 'PASS'}  ${'scheduled then cancelled (must not arrive)'.padEnd(36)} api ${cancR.status}`);
  console.log(` sound played ${sounds} time(s) for ${got.length} push(es)${blocked ? `, blocked ${blocked}` : ''}; source ${log.find((x) => x.ev === 'sound')?.src ?? '—'}`);
  cdp.close();
  process.exit(sent.every((s) => got.includes(s.title)) && sounds >= got.length ? 0 : 2);
}

main().catch((e) => die(e.message));
