import { io } from 'socket.io-client';
import { API_BASE, USE_FIXTURES } from './client';
import { getAccessToken, onSessionChanged } from './tokens';
import { liveState as storedState, onLiveState as subscribe, publishLiveState, setLiveActive } from './liveStore';

/**
 * ─── The one platform socket ─────────────────────────────────────────────────────────────────
 *
 * user-service's socket (gateway `/socket.io`). Opened at start-up for everyone — a visitor's
 * socket carries the site half — and re-opened with the new token on sign-in / sign-out, so the
 * handshake always names the current player. Over it:
 *
 *   every 2 s   SYNC_STATE → the whole client state in one scrambled reply:
 *                 { me, profile, balances, preferences }   the player
 *                 { flags, features, currencies, branding } the site
 *                 { region }                               this visitor's address and country
 *               It lands in services/liveStore.js, which answers those startup GETs in
 *               `client.js` (see SOCKET_READS there) so they never go over HTTP.
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
const WS = process.env.NEXT_PUBLIC_SOCKET_TRANSPORT === 'websocket';

let socket = null;
let timer = null;
let inFlight = false;
let keyFor = { id: null, key: null };
let openedWith = null;

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
    const token = openedWith;
    unscramble(body.d, id).then(
      (state) => {
        console.log('[socket] SYNC_STATE', state);
        publishLiveState(state, token);
      },
      () => {},
    );
  });
}

/**
 * Open the socket (no-op with fixtures on, or when it is already open for the current token).
 * Long-polling, like the platform's other clients (casino-sportsbook's lib/socket.ts): plain HTTP
 * requests that pass any proxy and show in the Network tab. NEXT_PUBLIC_SOCKET_TRANSPORT=websocket
 * lets it upgrade to a WebSocket where the edge carries one. The backend's HTTP rate limit does
 * not count /socket.io (each socket event has its own limit).
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
    transports: WS ? ['polling', 'websocket'] : ['polling'],
    upgrade: WS,
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

/** Close it. */
export function stopRealtime() {
  clearInterval(timer);
  timer = null;
  inFlight = false;
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
if (typeof window !== 'undefined') onSessionChanged(() => socket && restartRealtime());
