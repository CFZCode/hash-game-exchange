/* The bearer pair, and the one place it is stored.
 *
 * bc.game authenticates with a COOKIE — every captured request in the mirror carries one and
 * none carries an `Authorization` header, which is why `client.js` was written with
 * `credentials: 'include'` and no token handling at all. The backend this build is being wired
 * to does the opposite: `POST /api/v1/user/auth/login` answers with an access token and a
 * refresh token, and every player route reads `Authorization: Bearer <access>`.
 *
 * So this module exists because the transport now has state. It is deliberately NOT part of
 * `context/persist.js`, which is the account store: that helper gates every saved record on a
 * hash of the defaults' SHAPE, so adding a field to `ACCOUNT_DEFAULTS` throws the record away —
 * exactly the property that store wants, and exactly the wrong one for a credential, which
 * should survive an unrelated edit to a fixture.
 *
 * WHAT IS STORED, AND WHY IT IS localStorage. The refresh token is a bearer credential in the
 * browser; `httpOnly` would be better and is not available to us, because the token arrives in a
 * JSON body rather than a `Set-Cookie` the browser would keep out of reach. Given that, session
 * vs local is the only real choice, and local is what makes a reload keep you signed in — which
 * is the behaviour the rest of this build already has (see `persist.js`). Recorded rather than
 * defended: if the backend ever moves the refresh token into an httpOnly cookie, this module is
 * the only thing that changes.
 */

/* One key, distinct from `account` and `setting` — the two `persist.js` already owns. */
const KEY = 'api-session';

/* Every read and write is wrapped, for the reason `persist.js` documents: a private window or
   disabled site data makes `localStorage` THROW rather than return null, and a header that
   cannot render is worse than a sign-in that does not stick. */
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(value) {
  try {
    if (value === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Ignored on purpose. The tokens live in the module's own memory for this tab either way,
       so a private window gets a working session that does not survive a reload. */
  }
}

/* The in-memory copy is the authority DURING a page's life; localStorage is only how it
   survives a reload. Two reasons that matters. A refresh rotates the pair, and a second tab
   writing its own rotation should not silently replace this tab's — each holds the pair it was
   issued. And reading localStorage on every request is a synchronous disk hit in the hot path
   of every fetch the app makes. */
let current = read();

export const getAccessToken = () => current?.accessToken ?? null;
export const getRefreshToken = () => current?.refreshToken ?? null;
export const isSignedIn = () => Boolean(current?.accessToken);

/**
 * The id of the session THIS tab is signed in on, read out of the access token's payload.
 *
 * READING OUR OWN TOKEN FOR AN ID IS NOT THE SAME AS TRUSTING IT, and the distinction is why this
 * is here at all. The note above says the expiry inside the JWT is deliberately not parsed — that
 * is about not letting a client-side clock decide when to refresh, where the server's 401 is the
 * better answer. This asks a different question: "which of the rows the server just listed is the
 * one I am using?" Nothing is authorised on the strength of it; the server verifies the signature
 * on every request regardless, and the worst a tampered value could do is mislabel a row in a
 * table the same server populated.
 *
 * The alternative was a heuristic — the row with the newest `last_used_at` — which is wrong the
 * moment two devices are active in the same minute.
 *
 * `atob` rather than a JWT library: the payload is one base64url segment and nothing here needs
 * to verify anything. Returns null on anything unexpected, and the settings table simply marks no
 * row as current, which is the same state a signed-out visitor would see.
 */
export function getSessionId() {
  const token = current?.accessToken;
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    /* base64url -> base64. `atob` rejects `-` and `_`, which a JWT payload may contain. */
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).sid ?? null;
  } catch {
    return null;
  }
}

/**
 * Store the pair a login or a refresh handed back.
 *
 * The backend answers `{accessToken, refreshToken, expiresAt, tokenType, user}`; only the two
 * tokens are kept. `expiresAt` is the REFRESH session's expiry rather than the access token's,
 * so it cannot be used to decide when to refresh — and the access token's own expiry is inside
 * a JWT this build deliberately does not parse. Refreshing is driven by a 401 instead, which is
 * the server's answer rather than our guess at it; see `client.js`.
 */
export function setTokens({ accessToken, refreshToken } = {}) {
  const was = Boolean(current?.accessToken);
  current = accessToken ? { accessToken, refreshToken: refreshToken ?? null } : null;
  write(current);
  if (was !== Boolean(current)) notifySessionChanged();
}

export function clearTokens() {
  const was = Boolean(current?.accessToken);
  current = null;
  write(null);
  if (was) notifySessionChanged();
}

/* ── Signed in ↔ signed out ──────────────────────────────────────────────────────────────
 *
 * Fired when this tab goes from no session to one (sign-in) or back (sign-out, an expired
 * refresh) — not on a refresh, which keeps the same player. The realtime socket listens: its
 * handshake names the player, so it re-opens at once, before the reads that follow a sign-in. */
const sessionListeners = new Set();

export function onSessionChanged(fn) {
  sessionListeners.add(fn);
  return () => sessionListeners.delete(fn);
}

function notifySessionChanged() {
  for (const fn of [...sessionListeners]) {
    try {
      fn();
    } catch {
      /* one listener must not stop the others */
    }
  }
}

/* ── The signed-out signal ────────────────────────────────────────────────────────────────
 *
 * When a refresh fails there is nobody to return an error to: the request that triggered it
 * may be a background read three components away from anything the visitor is looking at. The
 * session has to hear about it, so listeners are registered here and `client.js` fires them.
 *
 * A plain Set rather than a context or an event target: this module is imported by
 * `client.js`, which is not a React file and must not become one. `SessionProvider` subscribes
 * in an effect and unsubscribes on unmount, which is what the returned function is for.
 */
const listeners = new Set();

export function onAuthExpired(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* The codes the platform answers a LOCKED account with: `ACCOUNT_LOCKED` from the player-route
   guard (`requireActive`), `AUTH_ACCOUNT_LOCKED` from login and `POST /auth/refresh`. Both mean
   the same thing — staff (or an upline suspension) locked the account and no token will work. */
export const isAccountLockedCode = (code) => code === 'ACCOUNT_LOCKED' || code === 'AUTH_ACCOUNT_LOCKED';

/** `reason` is `'locked'` when the session ended because the account was locked, else undefined. */
export function notifyAuthExpired(reason) {
  clearTokens();
  /* Copied before iterating: a listener that unsubscribes itself would otherwise mutate the
     set mid-loop. */
  for (const fn of [...listeners]) {
    try {
      fn(reason);
    } catch {
      /* One listener throwing must not stop the others being told the session is gone. */
    }
  }
}
