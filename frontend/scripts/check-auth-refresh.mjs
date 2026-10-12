#!/usr/bin/env node
/**
 * Proves a 401 from an auth route never triggers the refresh-and-retry in services/client.js,
 * while a 401 from any other route still does.
 *
 *   node scripts/check-auth-refresh.mjs
 *
 * No server: `fetch` and `localStorage` are stubbed, and a leftover token pair is planted the
 * way an earlier session would leave one. Exits 1 on any failure.
 */
import { registerHooks } from 'node:module';

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

const store = new Map([
  ['api-session', JSON.stringify({ accessToken: 'stale-access', refreshToken: 'leftover-refresh' })],
]);
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window ??= globalThis;
globalThis.window.addEventListener ??= () => {};
globalThis.window.dispatchEvent ??= () => true;

const calls = [];
/* The refresh route answers 200 (a working pair) except when it is itself the route under test. */
let refreshAnswers = 401;
globalThis.fetch = async (url) => {
  const path = new URL(url).pathname;
  calls.push(path);
  const ok = path.endsWith('/auth/refresh') && refreshAnswers === 200;
  const body = ok
    ? { success: true, data: { accessToken: 'new-access', refreshToken: 'new-refresh' } }
    : { success: false, error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' } };
  const status = ok ? 200 : 401;
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
};

const { request, ApiError } = await import('../src/services/client.js');

let failed = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${extra ? `  ${extra}` : ''}`);
  if (!ok) failed++;
};

const AUTH = [
  '/api/v1/user/auth/login',
  '/api/v1/user/auth/register',
  '/api/v1/user/auth/refresh',
  '/api/v1/user/auth/forgot-password',
  '/api/v1/user/auth/reset-password',
  '/api/v1/user/2fa/verify',
  '/api/v1/user/2fa/enable',
  '/api/v1/user/2fa/setup-verify',
  '/api/v1/user/2fa/disable',
];

for (const path of AUTH) {
  calls.length = 0;
  refreshAnswers = path.endsWith('/auth/refresh') ? 401 : 200;
  let err = null;
  try {
    await request(path, { live: true, method: 'POST', json: {} });
  } catch (e) {
    err = e;
  }
  check(
    `401 from ${path} -> no refresh`,
    err instanceof ApiError && err.status === 401 && calls.length === 1 && calls[0] === path,
    `fetches=${JSON.stringify(calls)}`,
  );
}

check('leftover refresh token untouched', JSON.parse(store.get('api-session')).refreshToken === 'leftover-refresh');

/* Control: an ordinary read still refreshes once and replays. */
calls.length = 0;
refreshAnswers = 200;
try {
  await request('/api/v1/user/profile', { live: true });
} catch {
  /* the replay answers 401 again in this stub; only the call sequence matters */
}
check(
  '401 from /user/profile -> refresh + one replay',
  calls.length === 3 && calls[1] === '/api/v1/user/auth/refresh' && calls[2] === '/api/v1/user/profile',
  `fetches=${JSON.stringify(calls)}`,
);

process.exit(failed ? 1 : 0);
