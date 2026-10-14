import React from 'react';
import { SessionContext } from './session';
import { createPersistedStore } from './persist';
import {
  ACCOUNT_DEFAULTS,
  VISITOR,
  VISITOR_BALANCES,
  SIGNED_IN,
  SIGNED_IN_BALANCES,
} from './account';
import { USE_FIXTURES } from '../services/client';
import { isSignedIn, onAuthExpired } from '../services/tokens';
import {
  loadAccount,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from '../services/auth';
import { primeUsdPrices } from '../services/exchangeRate';
import { toast } from '../components/shared/Toast/toast';

/* The platform's own wording for a locked account (`AUTH_ACCOUNT_LOCKED` on login). */
const LOCKED_MESSAGE = 'This account is locked. Contact support.';

/* Who the visitor is, for the whole app.
 *
 * The original keeps this in a persisted Solid store (`[xe, sl] = qs(...)` over `NC`, named
 * "account") and reads it as `b.login`, `b.vipLevel`, `b.redDot.systemNotice`, `b.areaCode`
 * and so on from every corner of the shell. Same idea here, as React context — see account.js
 * for the shape and where each value came from, and session.js for the hook.
 *
 * THERE IS A REAL SIGN-IN NOW, and it is one of two arms rather than a replacement. With
 * fixtures on — the default, and what a checkout with no `.env` does — `signIn()` swaps
 * fixtures exactly as it always has. With `VITE_USE_FIXTURES=false` it exchanges credentials for
 * a token pair and reads the account back off the platform; `services/auth.js` holds that
 * translation and the note there says which fields the backend does not carry.
 */

/* IT IS PERSISTED, and what is stored is the argument.
 *
 * This file used to say "deliberately NOT persisted", and the reason it gave was sound: the
 * original's store survives a reload because a real session does, while ours is two fixtures and
 * a boolean — so storing it whole would mean every edit to `SIGNED_IN` silently doing nothing
 * until you cleared your browser. That trap is real and it is the thing this design avoids.
 *
 * The way out is to store only what a VISITOR CHANGED and rebuild everything else on load. Three
 * things qualify:
 *
 *   login     the sign-in itself, which is the whole point
 *   name      the one field `signIn(overrides)` carries, taken from what was typed into the
 *             auth dialog
 *   setting   the wallet's selected currency and its Hide Small toggle, both writable from
 *             the header's currency dropdown, and both of which the live site remembers
 *
 * Everything else — the account's own fields, and the entire wallet — comes fresh every load, so
 * editing a fixture takes effect immediately and there is no stale copy to clear by hand.
 * `setting` is MERGED over the defaults rather than replacing them, so a key added there later
 * shows up for someone who already has a record.
 *
 * The version gate is `createPersistedStore`'s, and it is the original's own trick: the record
 * carries a hash of `ACCOUNT_DEFAULTS`, so changing that shape discards every saved copy.
 *
 * **WITH THE API ON, `login` IN THAT RECORD IS NOT AUTHORITATIVE — THE TOKEN IS.** A record
 * saying `login: true` beside no token is somebody who signed in against fixtures on this
 * browser and then switched the build over, or whose refresh token was revoked. Trusting the
 * record there would paint the signed-in shell for an account that cannot load, so `restore()`
 * asks `isSignedIn()` instead and the record's flag only decides the fixture arm.
 *
 * ONE THING DELIBERATELY DOES NOT SURVIVE: the wallet's per-coin `display` / `displayStatus`
 * flags, which `updateBalance` writes when you pick a coin out of a search. On the live site
 * those are account state the SERVER remembers and re-sends with `/user/amount/`; the platform
 * has no equivalent, and storing them locally would be inventing one.
 */
const store = createPersistedStore('account', ACCOUNT_DEFAULTS);

/* Read once, at module scope, so the first render already knows: this has to be settled before
   anything paints, or the header would draw its signed-OUT tree for a frame and then swap. */
function restore() {
  const stored = store.read();
  const settings = { ...ACCOUNT_DEFAULTS.setting, ...stored?.setting };

  /* ── The live arm: a token exists, and the account has not been read yet. ────────────────
   *
   * Neither fixture is the truth here — `SIGNED_IN` is somebody else's account and `VISITOR` is
   * the wrong shell — so this is a THIRD state: signed in, and knowing nothing yet. The account
   * is the defaults with `login` raised, so the header renders its signed-in tree once rather
   * than drawing the signed-out one and swapping trees a moment later.
   *
   * The wallet is `VISITOR_BALANCES` and not `[]`, and that is load-bearing: the header pill
   * reads `balances.find(…) || balances[0]` and then `current.generalAmount`, so an empty array
   * is a crash on the first paint. One zero row is also the honest answer to "what is in this
   * wallet" before the read lands.
   */
  if (!USE_FIXTURES && isSignedIn()) {
    return {
      account: {
        ...ACCOUNT_DEFAULTS,
        login: true,
        name: stored?.name ?? '',
        setting: settings,
      },
      balances: VISITOR_BALANCES,
      pending: true,
    };
  }

  if (!stored) return { account: VISITOR, balances: VISITOR_BALANCES, pending: false };

  const base = stored.login ? SIGNED_IN : VISITOR;
  return {
    account: {
      ...base,
      /* `name` only comes back with a sign-in. A visitor's is `""` in the captured response and
         has nothing to restore. */
      ...(stored.login && stored.name ? { name: stored.name } : {}),
      setting: { ...base.setting, ...stored.setting },
    },
    balances: stored.login ? SIGNED_IN_BALANCES : VISITOR_BALANCES,
    pending: false,
  };
}

const INITIAL = restore();

export function SessionProvider({ children }) {
  const [account, setAccount] = React.useState(INITIAL.account);
  const [balances, setBalances] = React.useState(INITIAL.balances);

  /* `he(() => { const { _isStale, ...u } = a; localStorage.setItem(i, JSON.stringify(u)) })` —
     the original's write-on-every-change, as an effect. Writing to storage is the textbook use
     for one: an external system being kept in step with React state, with no setState in sight. */
  React.useEffect(() => {
    store.write({ login: account.login, name: account.name, setting: account.setting });
  }, [account.login, account.name, account.setting]);

  /* ── Filling in the third state ──────────────────────────────────────────────────────────
   *
   * Runs once, and only when `restore()` left the account pending — a live session whose token
   * survived a reload. `live` is the usual guard against a resolve landing after unmount.
   *
   * A failed read is NOT signed out here. A 401 already routes through the transport, which
   * refreshes and, only if that fails too, fires `onAuthExpired` — the subscription below. What
   * is left is a network error or a 500, and dropping the session for one would sign a visitor
   * out because a server hiccuped. The account stays pending and the next navigation retries.
   */
  React.useEffect(() => {
    if (!INITIAL.pending) return undefined;

    /* RETRIED WITH BACKOFF (2s, 4s, 8s, 16s, then every 30s while the token is held), because "the next navigation retries" was not
       true — this effect runs once — and a cold load that met the gateway's rate limit (429) left
       the account pending for the whole visit, which is what rendered /sports/my-bets, /bonus and
       /wallet/vault blank. A 401 is still the transport's to answer (refresh → onAuthExpired). */
    let live = true;
    let timer = null;
    const attempt = (n) => {
      loadAccount(INITIAL.account).then(
        (next) => {
          if (!live) return;
          setAccount(next.account);
          setBalances(next.balances);
        },
        () => {
          if (!live || !isSignedIn()) return;
          timer = setTimeout(() => attempt(n + 1), Math.min(30000, 2000 * 2 ** n));
        },
      );
    };
    attempt(0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);

  /* ── The FX table ────────────────────────────────────────────────────────────────────────
   *
   * Filled here rather than anywhere else for one reason: `printCurrency` is a pure function
   * that reads a module cache during render, so nothing re-renders when that cache changes and
   * every figure formatted before the rates land stays formatted at the old ones. Bumping a
   * value this context already publishes is what fixes that — every consumer of `useSession()`
   * re-renders, and the money-printing components are consumers by definition, since they need
   * `session.setting` to know whether to convert at all.
   *
   * UNCONDITIONAL, not gated on a session: the route is `public` (checked against the running
   * server, not read off the module map), and a signed-OUT home page converts too — the bet
   * feed, Recent Big Wins and the contest board all print through the same formatter.
   *
   * Once. A seeded rate table with no poller behind it has nothing to re-read, and a refetch on
   * every navigation would be a request per page view for a number that cannot have moved.
   */
  const [fxVersion, setFxVersion] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    primeUsdPrices().then((filled) => {
      if (live && filled) setFxVersion((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, []);

  /* The transport fires this when a refresh has failed, which is the only way a session ends
     without the visitor asking. It has to reach state from outside React, which is what the
     listener registry in `services/tokens.js` is for. */
  /* A LOCKED account is told why, once: a cold load fires a dozen reads that all answer
     `ACCOUNT_LOCKED`, and each one ends the session again, so the notice is held back for a
     moment after it shows rather than restarting the toast's timer a dozen times. */
  const lockedNoticeAt = React.useRef(0);

  React.useEffect(
    () =>
      onAuthExpired((reason) => {
        setAccount(VISITOR);
        setBalances(VISITOR_BALANCES);
        if (reason === 'locked' && Date.now() - lockedNoticeAt.current > 5000) {
          lockedNoticeAt.current = Date.now();
          toast.error(LOCKED_MESSAGE);
        }
      }),
    [],
  );

  const value = React.useMemo(
    () => ({
      /* The account object itself, so consumers read the original's own field names —
         `session.login`, `session.vipLevel`, `session.setting.enableLocaleCurrency`. */
      session: account,
      balances,

      /* Bumped once the FX table has been filled from the backend — see the effect above. It is
         published rather than kept private because publishing it is what makes the re-render
         legitimate: a memo dependency nothing in the value reads is a memo dependency the linter
         is right to reject. A consumer that wants to hold a figure back until the rates are real
         can read it; none does yet, and `printCurrency` works off the captured snapshot until
         then, so nothing is waiting on it. */
      fxVersion,

      /**
       * Exchange credentials for a session WITHOUT committing it.
       *
       * The split from `signIn` is not tidiness — it is what lets the auth dialog keep its
       * animation. That dialog is mounted off the pathname, and committing a session makes it
       * unmount immediately (`depositNeedsAuth` and its three siblings go false in App), so a
       * commit before the exit tween takes the dialog away mid-animation and the queued
       * navigation with it. It also has to know whether the credentials were accepted BEFORE it
       * decides to close at all. So: authenticate, then animate, then commit.
       *
       * Rejects with the transport's `ApiError`, whose `code` is the platform's stable string.
       */
      authenticate: (credentials) => apiLogin(credentials, account),

      /**
       * Create an account, then sign into it.
       *
       * The same contract as `authenticate` — it resolves with `{account, balances}` for
       * `signIn` to commit, and rejects with the transport's `ApiError`. The dialog therefore
       * treats the two identically and needs no second code path for the Sign Up tab.
       *
       * `register` in the service does the sign-in itself, because the platform mints no
       * session on registration; that is a property of the endpoint rather than a choice here.
       */
      signUp: (details) => apiRegister(details, account),

      /**
       * Commit a session.
       *
       * Takes either of two things, and the discriminator is the `account` key:
       *
       *   { account, balances }   what `authenticate` answered — committed wholesale
       *   { name: 'x' } | undefined   overrides on the signed-in FIXTURE, which is what this
       *                               took before there was a backend and still does with
       *                               fixtures on
       */
      signIn: (next) => {
        if (next?.account) {
          setAccount(next.account);
          setBalances(next.balances);
          return;
        }
        setAccount({ ...SIGNED_IN, ...next });
        setBalances(SIGNED_IN_BALANCES);
      },

      /* Neither of these touches storage: the effect above writes whatever they leave behind,
         which is `login: false` on the way out and the fixture's own settings on the way back
         in. That is the original's arrangement too — `nl` writes the store, and nothing calls
         `removeItem`. It also means a sign-out does not carry the previous session's currency
         choice into the next one, since `signIn` replaces `setting` wholesale.

         The state is dropped FIRST and the server told second: `apiLogout` clears the local
         tokens whatever the network says, so waiting on it would only delay the visitor's own
         request to leave. With fixtures on it is a no-op that resolves immediately. */
      signOut: () => {
        setAccount(VISITOR);
        setBalances(VISITOR_BALANCES);
        apiLogout();
      },

      /* `I("setting", key, value)` — the original's own three-argument store setter, which is
         what every preference in the shell is written with (`I("setting","currencyName",c)`,
         `I("setting","hideSmallCurrency",v)`). Narrowed to the `setting` sub-object here
         because that is the only branch anything writes to; widen it the day something needs
         to set a top-level field. */
      setSetting: (key, value) =>
        setAccount((current) => ({
          ...current,
          setting: {
            ...current.setting,
            [key]: value,
            /* `currencyPicked` marks the selected coin as the visitor's OWN choice, which every
               caller writing `currencyName` is (the header dropdown, the game page's picker, a
               free-play claim). `pickCurrency` in `services/auth.js` keeps a picked coin even at
               a zero balance, and moves an unpicked default to the coin the wallet actually
               holds. Not in `ACCOUNT_DEFAULTS` — that is the original's `NC`, verbatim, and its
               hash is the store's version — so it lives only in the persisted `setting`. */
            ...(key === 'currencyName' ? { currencyPicked: true } : {}),
          },
        })),

      /* The two-argument form of the same setter, for a field on the account itself rather than
         inside `setting`. The original's `I(key, value)` — this file used to carry only the
         three-argument `setting` branch with a note saying to widen it the day something needed a
         top-level field, and the Preferences pane's marketing switch is that day
         (`acceptPromotion` is on the account, not in `setting`).

         NOT persisted, and that is the existing rule rather than an omission: the record stores
         `login`, `name` and `setting`, and everything else is rebuilt from the server on load.
         A field written here survives until the next `loadAccount`, which is where the server's
         own answer replaces it. */
      setAccountField: (key, value) =>
        setAccount((current) => ({ ...current, [key]: value })),

      /* `j(currencyName, key, value)` — the wallet store's setter. The currency dropdown is the
         only caller: picking a coin out of a search marks it `displayStatus: 1`, and picking a
         hidden one flips `display` true. Takes a patch rather than a key/value pair, since the
         row applies both in the same gesture. Not persisted — see the note above. */
      /* Re-read the account and wallet from the server — after something the server changed,
         like a withdrawal hold. Fixture mode has nothing to re-read, so it is a no-op there and
         the caller patches the row itself. Failure keeps what is on screen. */
      refreshBalances: () =>
        account.login && !USE_FIXTURES
          ? loadAccount(account).then(
              (next) => {
                setAccount(next.account);
                setBalances(next.balances);
              },
              () => {},
            )
          : Promise.resolve(),

      updateBalance: (currencyName, patch) =>
        setBalances((current) =>
          current.map((entry) =>
            entry.currencyName === currencyName ? { ...entry, ...patch } : entry,
          ),
        ),
    }),
    [account, balances, fxVersion],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
