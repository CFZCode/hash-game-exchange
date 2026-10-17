import { io } from 'socket.io-client';
import { API_BASE, USE_FIXTURES } from './client';
import { getAccessToken } from './tokens';

/**
 * ─── The one platform socket ─────────────────────────────────────────────────────────────────
 *
 * user-service's socket (gateway `/socket.io`). Opened when a player signs in (and on a reload
 * that restores the session), closed on sign-out. Over it:
 *
 *   every 2 s   SYNC_STATE → the whole client state in one scrambled reply:
 *                 { me, balances, preferences }        the player (/user/auth/me, wallet, prefs)
 *                 { flags, features, currencies }      the site (site-config, features, coins)
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
const TICK_MS = 2000;

let socket = null;
let timer = null;
let inFlight = false;
let keyFor = { id: null, key: null };
let last = null;
const listeners = new Set();

/** Every state the socket brings, newest first to a new subscriber. Returns unsubscribe. */
export function onLiveState(fn) {
  listeners.add(fn);
  if (last) fn(last);
  return () => listeners.delete(fn);
}

export const liveState = () => last;

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
  socket.timeout(8000).emit(SYNC_STATE, null, (err, reply) => {
    inFlight = false;
    if (err) return;
    let body;
    try {
      body = JSON.parse(frameText(reply));
    } catch {
      return;
    }
    if (!body?.status || typeof body.d !== 'string') return;
    unscramble(body.d, id).then(
      (state) => {
        last = state;
        listeners.forEach((fn) => fn(state));
      },
      () => {},
    );
  });
}

/** Open the socket for the signed-in player (no-op with fixtures on, or already open). */
export function startRealtime() {
  if (USE_FIXTURES || socket || !getAccessToken()) return;
  socket = io(SOCKET_BASE || undefined, {
    path: '/socket.io',
    transports: ['websocket'],
    // A function, so every reconnect carries the CURRENT token (the transport refreshes it).
    auth: (cb) => cb({ token: getAccessToken() }),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  socket.on('connect', sync);
  PUSHES.forEach((name) => socket.on(name, sync));
  timer = setInterval(sync, TICK_MS);
}

/** Close it — sign-out, or a token that no longer verifies. */
export function stopRealtime() {
  clearInterval(timer);
  timer = null;
  inFlight = false;
  last = null;
  keyFor = { id: null, key: null };
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
