import { io } from 'socket.io-client';
import { API_BASE, USE_FIXTURES, refreshSession } from './client';
import { getAccessToken, isAccessTokenExpired, onSessionChanged } from './tokens';
import { liveState as storedState, onLiveState as subscribe, onSyncWanted, publishLiveState, setLiveActive } from './liveStore';

/**
 * ─── The one platform socket ─────────────────────────────────────────────────────────────────
 *
 * user-service's socket (gateway `/socket.io`). Opened at start-up for everyone — a visitor's
 * socket carries the site half — and re-opened with the new token on sign-in / sign-out, so the
 * handshake always names the current player. Over it:
 *
 *   SYNC_STATE → the whole client state in one scrambled reply:
 *                 { me, profile, balances, preferences }   the player
 *                 { flags, features, currencies, branding } the site
 *                 { region }                               this visitor's address and country
 *               It lands in services/liveStore.js, which answers those startup GETs in
 *               `client.js` (see SOCKET_READS there) so they never go over HTTP.
 *   asked       every 30 s as a SAFETY read while the tab is visible (TENEXCH: push first, poll
 *               only to catch a missed push), at once when the tab comes back, and at once when
 *               liveStore asks (a read found nothing fresh, a write landed — onSyncWanted);
 *   at once     a push re-asks without waiting for the tick:
 *                 C.CREDIT          the balance moved (any service — DB trigger, migration 113)
 *                 accountUpdated    an operator locked / unlocked the account
 *                 featuresUpdated · siteConfigUpdated · currenciesUpdated   the owner / admin saved
 *
 * The connection also makes the player ONLINE for the operator (presence counts `user:<id>`).
 *
 * WHY NOT THE SAME-ORIGIN PATH: on Vercel the API is proxied through this site's own /api/v1, but
 * Vercel does not carry a WebSocket upgrade, so the socket dials the gateway itself —
 * NEXT_PUBLIC_SOCKET_BASE (next.config.mjs sets it to API_PROXY_TARGET), else API_BASE. The
 * gateway's SOCKET_ALLOWED_ORIGINS must list this site's origin.
 *
 * THE REPLY IS SCRAMBLED, NOT ENCRYPTED: `d` is base64(JSON XOR sha256(`${socket.id}:${SALT}`)),
 * a key that changes every connection (backend modules/sync/sockets.js). It keeps a frame in
 * devtools from reading as JSON; the salt is in this bundle, so it is not a secret.
 */
export const SOCKET_BASE = (process.env.NEXT_PUBLIC_SOCKET_BASE || API_BASE || '').replace(/\/+$/, '');

const SYNC_STATE = '3b84d3951808e13e1b8c65a67d6b7235';
const CREDIT = '660cb6fe7737d7b70e7a07b706b93f70';
const PUSHES = [CREDIT, 'accountUpdated', 'featuresUpdated', 'siteConfigUpdated', 'currenciesUpdated'];
const SALT = 'p567.sync.v1';
const TICK_MS = 30000;

let socket = null;
let timer = null;
let inFlight = false;
/** A sync was wanted while one was in flight: that reply may predate what wanted it, so ask again. */
let again = false;
let keyFor = { id: null, key: null };
let openedWith = null;
/** When the last C.CREDIT push landed: a sync asked before it carries the balances from before it. */
let pushedAt = 0;

/* Every socket event in the browser console: on in development, and on a live site after
   `localStorage.socketDebug = '1'` in the console (then reload). Off for players otherwise. */
const DEBUG =
  process.env.NODE_ENV !== 'production' ||
  (typeof window !== 'undefined' && (() => { try { return localStorage.getItem('socketDebug') === '1'; } catch { return false; } })());
const debug = (...args) => {
  if (DEBUG) console.log('%c[socket]', 'color:#24EE89;font-weight:bold', ...args);
};

/** Every state the socket brings, newest first to a new subscriber. Returns unsubscribe. */
export const onLiveState = subscribe;
export const liveState = storedState;

async function keyOf(id) {
  if (keyFor.id === id) return keyFor.key;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${id}:${SALT}`));
  keyFor = { id, key: new Uint8Array(digest) };
  return keyFor.key;
}

const frameText = (frame) =>
  typeof frame === 'string'
    ? frame
    : frame instanceof ArrayBuffer || ArrayBuffer.isView(frame)
      ? new TextDecoder().decode(frame)
      : JSON.stringify(frame ?? null);

async function unscramble(d, id) {
  const key = await keyOf(id);
  const bytes = Uint8Array.from(atob(d), (c) => c.charCodeAt(0));
  for (let i = 0; i < bytes.length; i += 1) bytes[i] ^= key[i % key.length];
  return JSON.parse(new TextDecoder().decode(bytes));
}

function sync() {
  if (!socket?.connected || inFlight) return;
  inFlight = true;
  const id = socket.id;
  const askedAt = Date.now();
  socket.timeout(8000).emit(SYNC_STATE, null, (err, reply) => {
    inFlight = false;
    if (again) {
      again = false;
      sync();
    }
    if (err) return;
    let body;
    try {
      body = JSON.parse(frameText(reply));
    } catch {
      return;
    }
    if (!body?.status || typeof body.d !== 'string') return;
    const token = openedWith;
    unscramble(body.d, id).then(
      (state) => {
        // Asked before a balance push: keep the pushed balances, not this older read's.
        const pushed = askedAt < pushedAt ? storedState()?.balances : null;
        debug('sync reply', state);
        publishLiveState(pushed ? { ...state, balances: pushed } : state, token, askedAt);
      },
      () => {},
    );
  });
}

function syncSoon() {
  if (inFlight) again = true;
  else sync();
}

const syncIfVisible = () => {
  if (!document.hidden) sync();
};

/* C.CREDIT carries every balance (`{ status, credit: { inr, usdt, … } }`, backend
   wallet.service creditPayload): applied at once, so a settled game round reaches the header even
   when the re-ask it also triggers is skipped (one already in flight) or refused (rate limit). */
function applyCredit(frame) {
  const last = storedState();
  if (!last?.signedIn || !last.balances) return;
  let body;
  try {
    body = JSON.parse(frameText(frame));
  } catch {
    return;
  }
  if (!body?.status || !body.credit || typeof body.credit !== 'object') return;
  const balances = { ...last.balances };
  for (const [code, value] of Object.entries(body.credit)) balances[code.toUpperCase()] = value;
  pushedAt = Date.now();
  debug('balance push', body.credit);
  publishLiveState({ ...last, balances }, openedWith);
}

/**
 * Open the socket (no-op with fixtures on, or when it is already open for the current token).
 * WebSocket, like TENEXCH and the sports balance socket (exchange/balanceSocket.js): one open
 * connection, so every sync and every push are frames on it, not HTTP requests (Apache and the
 * gateway's wsProxy.js carry the upgrade). Long-polling only when the WebSocket cannot open (a
 * proxy that drops the upgrade). The backend's HTTP rate limit does not count /socket.io (each
 * socket event has its own limit).
 */
export function startRealtime() {
  if (USE_FIXTURES || typeof window === 'undefined') return;
  const token = getAccessToken();
  if (socket && openedWith === token) return;
  if (socket) stopRealtime();
  openedWith = token;
  setLiveActive(true);
  socket = io(SOCKET_BASE || undefined, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    /* A function, so every reconnect carries the CURRENT token. The server closes a socket when its
       token expires, so an expired one is refreshed first rather than reconnecting signed out. */
    auth: (cb) => {
      if (!isAccessTokenExpired()) return cb({ token: getAccessToken() });
      refreshSession().finally(() => cb({ token: getAccessToken() }));
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  socket.on('connect', () => debug('connected', socket.id, openedWith ? '(signed in)' : '(visitor)'));
  socket.on('disconnect', (reason) => debug('disconnected:', reason));
  socket.on('connect_error', (error) => debug('connect error:', error?.message));
  socket.onAny((event) => debug('push', event === CREDIT ? 'C.CREDIT (balance moved)' : event));
  socket.on('connect', sync);
  PUSHES.forEach((name) => socket.on(name, sync));
  socket.on(CREDIT, applyCredit);
  timer = setInterval(syncIfVisible, TICK_MS);
  document.addEventListener('visibilitychange', syncIfVisible);
}

/** Close it. */
export function stopRealtime() {
  clearInterval(timer);
  timer = null;
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', syncIfVisible);
  inFlight = false;
  again = false;
  keyFor = { id: null, key: null };
  openedWith = null;
  setLiveActive(false);
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Sign-in / sign-out: the handshake names the player, so the socket is re-opened with the new token. */
export function restartRealtime() {
  stopRealtime();
  startRealtime();
}

/* The moment the token appears or goes, not when React next renders: the reads a sign-in
   triggers are then answered by the new player's socket. */
if (typeof window !== 'undefined') {
  onSessionChanged(() => socket && restartRealtime());
  onSyncWanted(syncSoon);
}
