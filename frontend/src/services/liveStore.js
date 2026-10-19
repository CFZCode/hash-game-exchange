/**
 * ─── The realtime socket's state, shared ─────────────────────────────────────────────────────
 *
 * One store between the socket (services/realtime.js, which fills it every ~2 s) and everything
 * that reads the platform: `client.js` answers the startup GETs below out of it instead of
 * calling the API, and components subscribe through `onLiveState` / `useLiveState`. Its own
 * module so `client.js` can read it without importing the socket (realtime.js imports client.js).
 *
 * One SYNC_STATE reply carries what used to be eight HTTP reads:
 *
 *   branding     GET /admin/branding/public        everyone
 *   region       GET /user/region                  everyone (this socket's address)
 *   currencies   GET /admin/currencies/public      everyone
 *   avatars      GET /admin/avatars/public         everyone
 *   me           GET /user/auth/me                 signed in
 *   profile      GET /user/profile                 signed in
 *   balances     GET /user/wallet/balances         signed in
 *   preferences  GET /user/preferences             signed in
 *
 * A key the backend did not send (an older deploy, a read that failed there) is simply not
 * served from here, and the call goes over HTTP as before.
 */

/** API path → the key of the sync state that answers it, and whether it needs the player. */
export const SOCKET_READS = Object.freeze({
  '/api/v1/admin/branding/public': { key: 'branding', player: false },
  '/api/v1/user/region': { key: 'region', player: false },
  '/api/v1/admin/currencies/public': { key: 'currencies', player: false },
  '/api/v1/admin/avatars/public': { key: 'avatars', player: false },
  '/api/v1/user/auth/me': { key: 'me', player: true },
  '/api/v1/user/profile': { key: 'profile', player: true },
  '/api/v1/user/wallet/balances': { key: 'balances', player: true },
  '/api/v1/user/preferences': { key: 'preferences', player: true },
});

/** A state older than this is not answered from; the socket is probably down. */
const FRESH_MS = 6000;

let last = null;
let lastAt = 0;
/** The access token the socket that produced `last` was opened with (null = a visitor's). */
let lastToken = null;
/** True while a socket is open or opening: a read may wait briefly for its first state. Set from
 *  the start by client.js in a live browser build — the socket is opened at start-up
 *  (SessionProvider), and the first reads (branding, region) are asked before that effect runs. */
let active = false;
const listeners = new Set();
const waiters = new Set();

export function setLiveActive(on) {
  active = on;
  if (!on) {
    last = null;
    lastAt = 0;
    for (const w of waiters) w(null);
    waiters.clear();
  }
}

/** A write went out: every state from before it may be stale (a just-saved preference, a balance
 *  the write moved), so no read is answered from one; the next state, built after the write,
 *  is. Called by client.js on every non-GET. */
let staleBefore = 0;
export function markLiveStale() {
  staleBefore = Date.now();
}

/* The SITE half (owner / operator config). When it changes after the first state, every read on
   screen is stale — a coin switched off, a section closed — so `siteEpoch` moves and useResource
   re-reads (hooks/useResource.js): owner changes show without a reload. */
let siteSig = null;
let siteEpoch = 0;
const epochListeners = new Set();
const siteSigOf = (s) => JSON.stringify([s?.flags, s?.features, s?.currencies, s?.branding, s?.avatars]);

export const getSiteEpoch = () => siteEpoch;
export function onSiteEpoch(fn) {
  epochListeners.add(fn);
  return () => epochListeners.delete(fn);
}

export function publishLiveState(state, token, askedAt = Date.now()) {
  // A reply to a sync asked before the last write may already be out of date: drop it for reads.
  if (askedAt < staleBefore) return;
  const sig = siteSigOf(state);
  const siteChanged = siteSig !== null && sig !== siteSig;
  siteSig = sig;
  last = state;
  lastAt = Date.now();
  lastToken = token ?? null;
  for (const w of waiters) w(state);
  waiters.clear();
  listeners.forEach((fn) => fn(state));
  if (siteChanged) {
    siteEpoch += 1;
    epochListeners.forEach((fn) => fn(siteEpoch));
  }
}

export const liveState = () => last;

/** Every state the socket brings, the latest at once to a new subscriber. Returns unsubscribe. */
export function onLiveState(fn) {
  listeners.add(fn);
  if (last) fn(last);
  return () => listeners.delete(fn);
}

function fresh(token) {
  if (!last || Date.now() - lastAt > FRESH_MS || lastAt < staleBefore) return null;
  /* Signed in vs not, rather than the token itself: a refresh rotates the token for the same
     player, while a sign-in or sign-out re-opens the socket (restartRealtime), which clears
     the store before any state of the new session lands. */
  return { state: last, sameUser: Boolean(lastToken) === Boolean(token) };
}

/**
 * The value the socket holds for `path`, or `undefined` when it cannot answer (no socket, no
 * such key, a state for another session). Waits up to `waitMs` for the first state of a socket
 * that is still connecting, so a cold load does not fire the HTTP read it is meant to replace.
 */
export async function liveRead(path, token, waitMs = 2500) {
  const read = SOCKET_READS[path];
  if (!read) return undefined;
  const usable = (h) => h && (!read.player || (h.state.signedIn && h.sameUser));
  let hit = fresh(token);
  // Still connecting, or the state is the previous session's (a sign-in re-opens the socket):
  // wait for one this read can use, rather than going to HTTP straight away.
  const deadline = Date.now() + waitMs;
  while (!usable(hit) && active && Date.now() < deadline) {
    await new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        waiters.delete(done);
        resolve();
      };
      const timer = setTimeout(done, deadline - Date.now());
      waiters.add(done);
    });
    hit = fresh(token);
    if (hit && !read.player) break;
  }
  if (!usable(hit)) return undefined;
  const value = hit.state[read.key];
  return value === undefined || value === null ? undefined : value;
}
