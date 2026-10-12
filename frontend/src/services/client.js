import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  notifyAuthExpired,
  setTokens,
} from './tokens';

/* The one seam between this build and a backend.
 *
 * Every piece of data the app renders goes through `request()`. It hands back a local fixture,
 * or fetches — and which one is now a decision per CALL SITE rather than per build, because the
 * backend being wired to answers only part of what this front-end renders. See `live` below.
 *
 * ── THE SWITCH ───────────────────────────────────────────────────────────────────────────
 *
 * `VITE_USE_FIXTURES=false` in a `.env` (or the shell) turns fixtures off and `VITE_API_BASE`
 * points at the host. Both are read at build time by Vite, so this is a config change and a
 * rebuild, not a code change.
 *
 * WHAT "OFF" MEANS HAS BEEN NARROWED, and the narrowing is the whole of what makes an
 * incremental wire-up possible. It used to mean "fetch everything". It now means "fetch
 * everything THAT HAS A ROUTE" — a call site marks itself `live: true` when a real endpoint
 * exists behind it, and one that does not keeps returning its fixture with the flag off.
 *
 *   request(ENDPOINTS.wallet.balances, { live: true, fixture: WALLET })   // fetches
 *   request(ENDPOINTS.quest.list,      { fixture: QUEST_LIST })           // still the fixture
 *
 * The alternative was to flip the whole build and let the pages with no backend answer 404.
 * Falling back to a fixture on ANY error would hide a genuine 500 behind plausible-looking
 * data, which is the one failure mode worth designing against here — a page that silently shows
 * invented rows against a broken server is worse than a page that shows an error. So the flag is
 * an explicit declaration and the set of `live: true` call sites IS the migration list: one
 * grep says exactly how far the wiring has got.
 *
 * ── FIXTURE MODE IS ASYNCHRONOUS, AND THAT REVERSED AN EARLIER DECISION ON PURPOSE ────────
 *
 * This used to return the fixture ITSELF, on the reasoning that a resolved Promise still settles
 * a microtask later and would give every section one frame of empty state it does not have on
 * the live site. That reasoning was sound while the loading states were not built — but it is
 * also exactly what made them unbuildable, since a pending arm that can never be reached cannot
 * be checked against anything. `VITE_FIXTURE_DELAY` is the dial:
 *
 *   unset / 400   the default — every read settles after 400ms, so each section paints its own
 *                 loading state first, which is what the live site does on a cold load
 *   0             the OLD behaviour exactly: the fixture is returned synchronously, no Promise,
 *                 no pending frame. Set this to compare a screenshot against the reference
 *                 without a loader in the way
 *
 * 400ms is this build's number, not the original's — a real request has no fixed duration.
 *
 * `useResource` accepts either a value or a Promise, so no call site cares which it gets.
 */
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

/* Exported because ONE consumer needs the origin rather than a fetch: a banner's artwork is
   served by the gateway (`/admin/banners/image/<type>`) and goes into a CSS `url()`, which no
   amount of `request()` can help with. Empty string when unset, so a same-origin deploy
   concatenates to a plain absolute path and nothing has to branch. */
export const API_BASE = BASE;

/* Defaults to ON, so a checkout with no env file behaves exactly as the build does today.
   Compared against the string because Vite injects env values as strings. */
export const USE_FIXTURES = String(process.env.NEXT_PUBLIC_USE_FIXTURES ?? 'true') !== 'false';

/* How long a fixture read pretends to take. See the note above; 0 restores the synchronous
   behaviour this file had before the loading states were built. `Number.isFinite` rather than a
   bare `Number(...) || 400`, so an explicit 0 is honoured instead of falling back to the
   default the way a falsy value would. */
const configured = Number(process.env.NEXT_PUBLIC_FIXTURE_DELAY ?? '');
export const FIXTURE_DELAY =
  String(process.env.NEXT_PUBLIC_FIXTURE_DELAY ?? '').trim() !== '' &&
  Number.isFinite(configured) &&
  configured >= 0
    ? configured
    : 400;

/* One timer per read. Deliberately NOT a shared clock: two sections that start together should
   finish together, and two that start a beat apart should not, which is what a real page does. */
const settleLater = (value) =>
  new Promise((resolve) => {
    setTimeout(() => resolve(value), FIXTURE_DELAY);
  });

/**
 * ── TWO ENVELOPES, DETECTED BY SHAPE ─────────────────────────────────────────────────────
 *
 * bc.game's own, from every captured response in `bc.game/bc.game/api/`:
 *
 *   {"code":0,"msg":null,"data":{...}}          `code: 0` is success
 *
 * and the platform this build is being wired to, whose `docs/API-ROUTES.md` §4 declares one
 * shape everywhere:
 *
 *   {"success":true,  "data":…, "meta":{…}}
 *   {"success":false, "error":{"code":"WALLET_INSUFFICIENT_FUNDS","message":…,"details":{…}}}
 *
 * Both are read, because both can answer in one session: `VITE_API_BASE` may point at either,
 * and there is no reason to make the transport care which. Detection is on the discriminating
 * key rather than on a config flag — a body carrying `success` is the second, a body carrying
 * `code` is the first, and anything else passes through untouched rather than having an error
 * invented for a shape we have not seen.
 *
 * `code` is checked SECOND and only when `success` is absent, because the second envelope's
 * error object also carries a `code` — nested, but a future flattening of it would otherwise be
 * read as a bc.game failure with a string where a number belongs.
 */
export class ApiError extends Error {
  constructor(message, { code, path, status, details, fields } = {}) {
    super(message);
    this.name = 'ApiError';
    /* The platform's stable string (`WALLET_INSUFFICIENT_FUNDS`), bc.game's number, or the HTTP
       status when the body carried no envelope at all. Branch on this, never on `message` —
       API-ROUTES.md §5 is explicit that the message is for a human and may be reworded. */
    this.code = code;
    this.path = path;
    this.status = status;
    this.details = details;
    /* A 422 carries the offending fields, so a form can mark them without parsing prose. */
    this.fields = fields;
  }

  /* `details.requestId` is always present on a platform failure and is what to quote in a bug
     report. Named rather than left for a call site to dig out of `details`. */
  get requestId() {
    return this.details?.requestId;
  }
}

/* AN AGENT-TREE PLAYER'S REFUSAL IS AN EMPTY SECTION, NOT A FAILURE. A player under an agent
   gets `403 PROMOTIONS_NOT_FOR_AGENT_USERS` (or VAULT_/DEPOSIT_/… — @ibitplay/auth
   `agentPlayers.js`) from every route of a section the gates already hide from them; a read that
   still fires (the header's gift badge, a gated page in the instant before its redirect) must
   render as "nothing there" rather than throw an uncaught ApiError. Anything else re-throws.

     request(PLATFORM.user.bonus.summary, { live: true }).catch(emptyIfAgentBlocked(null))
*/
export const isAgentBlocked = (error) =>
  error instanceof ApiError && error.status === 403 && /_NOT_FOR_AGENT_USERS$/.test(String(error.code ?? ''));

export const emptyIfAgentBlocked = (empty) => (error) => {
  if (isAgentBlocked(error)) return empty;
  throw error;
};

function unwrap(body, path, status) {
  if (!body || typeof body !== 'object') return body;

  if ('success' in body) {
    if (body.success === false) {
      const error = body.error ?? {};
      throw new ApiError(error.message || `Request failed (${error.code ?? status})`, {
        code: error.code,
        path,
        status,
        details: error.details,
        fields: error.details?.fields,
      });
    }
    /* `data` is never absent on a success, so this is always safe to read — and `meta` is
       dropped here on purpose. A list's page info lives under `meta.pagination`, which is what
       `requestPage` is for; a call site that wanted it and used this function would get rows
       with no total and no error saying so. */
    return body.data;
  }

  if ('code' in body) {
    if (body.code !== 0) {
      throw new ApiError(body.msg || `Request failed (code ${body.code})`, {
        code: body.code,
        path,
        status,
      });
    }
    return body.data;
  }

  /* Not every endpoint is guaranteed to use an envelope — 55 of the platform's routes answer
     outside it, and binary routes answer with bytes. Pass anything else through rather than
     inventing an error for a shape we have not seen. */
  return body;
}

/* `params` become a query string. Path segments that vary (a language, a brand id) belong in
   the path itself — see endpoints.js, where those are functions. */
function withQuery(path, params) {
  if (!params) return path;
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (!entries.length) return path;
  return `${path}?${new URLSearchParams(entries)}`;
}

/* ── Re-authentication ─────────────────────────────────────────────────────────────────────
 *
 * Access tokens are short-lived and the platform rotates them: `POST /auth/refresh` takes the
 * refresh token and answers with a NEW pair, retiring the old one. So a 401 is not "signed
 * out", it is "that token has expired, present the other one" — and only if THAT fails is the
 * session really gone.
 *
 * Driven by the server's 401 rather than by a timer, deliberately. The access token's expiry is
 * inside a JWT this build does not parse, and a clock-based scheme has to guess a skew; a 401 is
 * the server's own answer to the only question that matters.
 *
 * SINGLE-FLIGHT, because a cold page load fires a dozen reads at once and every one of them
 * gets the same 401 within the same few milliseconds. Twelve concurrent refreshes would rotate
 * the token twelve times, and eleven of those would be presenting a token the first had already
 * retired — which the platform treats as a replayed token, and its own note on that path says
 * the answer is to revoke the session. So the first 401 starts the refresh and the rest await
 * the same promise.
 */
const REFRESH_PATH = '/api/v1/user/auth/refresh';

let refreshing = null;

function refreshSession() {
  if (refreshing) return refreshing;

  const token = getRefreshToken();
  if (!token) return Promise.resolve(false);

  refreshing = fetch(BASE + REFRESH_PATH, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token }),
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = await res.json().catch(() => null);
      const data = body?.success ? body.data : null;
      if (!data?.accessToken) return false;
      setTokens(data);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      /* Cleared in `finally` rather than in each arm, so a rejection cannot leave a settled
         promise cached and turn every later 401 into an instant failure. */
      refreshing = null;
    });

  return refreshing;
}

/* One fetch, no retry. `request` and `requestPage` wrap this so the token, the content type and
   the 204/binary handling live in exactly one place. */
async function send(url, path, { json, headers, ...init }) {
  const token = getAccessToken();

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(json === undefined ? null : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : null),
      ...headers,
    },
    ...(json === undefined ? null : { body: JSON.stringify(json) }),
  });

  /* 204 carries NO BODY AT ALL — the platform sends zero bytes and `JSON.parse('')` throws, so
     the status has to be branched on before the body is touched. API-ROUTES.md §4 says so
     explicitly, and deletes are what answer with it. */
  if (res.status === 204) return { res, body: null };

  const type = res.headers.get('content-type') ?? '';
  /* Binary routes — images, a PDF, one CSV — answer with bytes and a detected content type.
     Handing a call site the Blob is more useful than a parse failure. */
  const body = type.includes('json') ? await res.json().catch(() => null) : await res.blob();

  return { res, body };
}

/* A 401 FROM AN AUTH ROUTE IS AN ANSWER, NOT AN EXPIRED TOKEN. Wrong password on login, a bad
   2FA code, a spent reset link: each answers 401 about the CREDENTIALS IN THE BODY, and none of
   them is helped by presenting a refresh token. Worse, a leftover pair in localStorage from an
   earlier session would get rotated (or revoked as a replay) by a sign-in that merely failed,
   and `notifyAuthExpired` would then sign out a tab that was never signed in by this attempt.
   `refresh` is in the set for the obvious reason: refreshing a failed refresh is a loop. */
export const NO_REFRESH_PATH =
  /^\/api\/v1\/user\/(?:auth\/(?:login|register|refresh|forgot-password|reset-password)|2fa\/(?:verify|enable|setup-verify|disable))\/?$/;

/* The 401 arm, shared by both readers. Answered ONCE: `retried` is what stops it being a loop,
   since a second 401 after a successful refresh means the new token is not the problem and the
   session really is over. */
async function handle(res, body, path, retried, replay) {
  if (res.status === 401 && !retried && !NO_REFRESH_PATH.test(path)) {
    const ok = await refreshSession();
    if (ok) return { replay: replay() };
    /* The refresh failed, so nothing this tab holds will authenticate again. Told to the
       session rather than only to this caller, because the read that happened to trigger it may
       be three components away from anything the visitor is looking at. */
    notifyAuthExpired();
  }

  /* A LOCKED ACCOUNT ENDS THE SESSION TOO. The platform answers every player route with
     `403 ACCOUNT_LOCKED` once staff lock the account, and no refresh can change that — so a tab
     that was signed in when the lock landed is signed out here instead of staying on screen with
     a header that can no longer read its own wallet. Login answers the same code about the
     credentials in its body, which is why the auth routes are excluded, as for the 401 arm. */
  if (res.status === 403 && body?.error?.code === 'ACCOUNT_LOCKED' && !NO_REFRESH_PATH.test(path)) {
    notifyAuthExpired();
  }

  if (!res.ok) {
    /* `unwrap` throws the platform's own error when the body carries one, which is what carries
       the stable code and the offending fields. The bare status is only the fallback for a
       failure that answered with no envelope — a gateway 403, an HTML 502. */
    unwrap(body, path, res.status);
    throw new ApiError(`${res.status} ${res.statusText}`, {
      code: res.status,
      path,
      status: res.status,
    });
  }

  return null;
}

/**
 * Read (or write) through the seam.
 *
 * @param {string}      path            from `endpoints.js` — never written out at a call site
 * @param {object}      options
 * @param {*}           options.fixture what to answer with while this endpoint is not wired
 * @param {boolean}     options.live    a real route exists behind this path — see the note above
 * @param {object}      options.params  query string
 * @param {*}           options.json    a body to serialise; sets the content type with it
 * @param {AbortSignal} options.signal
 * @returns the payload directly while fixtures are on, or a Promise of it once they are off.
 */
export function request(path, { fixture, live = false, params, ...init } = {}) {
  if (USE_FIXTURES || !live) {
    return FIXTURE_DELAY > 0 ? settleLater(fixture) : fixture;
  }

  const url = BASE + withQuery(path, params);

  const attempt = async (retried) => {
    const { res, body } = await send(url, path, init);
    const again = await handle(res, body, path, retried, () => attempt(true));
    if (again) return again.replay;
    return unwrap(body, path, res.status);
  };

  return attempt(false);
}

/**
 * A paginated read — the rows and the page info, kept apart.
 *
 *   const { rows, pagination } = await requestPage(ENDPOINTS.…, { live: true, fixture: … });
 *
 * `request` returns `data` and drops `meta`, which is right for every other route and wrong for
 * a list: the platform puts the total under `meta.pagination` and there is no `meta.total` at
 * the top level (API-ROUTES.md §6). A `Pagination` component needs that total, so rather than
 * smuggling it onto the array as a hidden property, the shape of the read says what it is.
 *
 * The fixture is passed in whatever shape the call site already has and is normalised: a bare
 * array becomes `{rows, pagination: null}`, and an object carrying `rows` or `list` is read as
 * written. That is what lets a service adapt one shape for both modes instead of two.
 */
export function requestPage(path, { fixture, live = false, params, ...init } = {}) {
  if (USE_FIXTURES || !live) {
    const value = normalisePage(fixture);
    return FIXTURE_DELAY > 0 ? settleLater(value) : value;
  }

  const url = BASE + withQuery(path, params);

  const attempt = async (retried) => {
    const { res, body } = await send(url, path, init);
    const again = await handle(res, body, path, retried, () => attempt(true));
    if (again) return again.replay;
    return {
      rows: unwrap(body, path, res.status) ?? [],
      pagination: body?.meta?.pagination ?? null,
    };
  };

  return attempt(false);
}

function normalisePage(value) {
  if (Array.isArray(value)) return { rows: value, pagination: null };
  if (value && typeof value === 'object') {
    return { rows: value.rows ?? value.list ?? [], pagination: value.pagination ?? null };
  }
  return { rows: [], pagination: null };
}

/* Re-exported so a service reaches for one import rather than two. The store itself is
   `services/tokens.js`; this is the transport's view of it. */
export { clearTokens, getAccessToken, setTokens };
