import { request } from './client';
import { loadCapabilities } from './gates';
import { getSiteConfig, isCurrencyEnabled } from './siteConfig';
import { PLATFORM } from './endpoints';
import { clearTokens, setTokens } from './tokens';
import { ACCOUNT_DEFAULTS, SIGNED_IN, SIGNED_IN_BALANCES, VISITOR } from '../context/account';
import { vipLevelRow } from '../data/vipConfig';
import { pushLogin, pushLogout } from './onesignal';
import { isFiatCode } from '../utils/currency';
import { dropUnpricedCodes } from '../data/usdPrice';

/* Signing in, and turning what the platform answers with into the account this shell reads.
 *
 * ── WHY THERE IS AN ADAPTER AT ALL ────────────────────────────────────────────────────────
 *
 * Every component in this build reads bc.game's OWN account store — `session.login`,
 * `session.vipLevel`, `session.setting.enableLocaleCurrency`, `session.redDot.systemNotice` —
 * because the shell was transcribed from a site whose store has that shape (see
 * `context/account.js`). The backend answers with a much smaller object under different names.
 * Renaming forty call sites to match a backend this project may not ship against would trade a
 * documented, captured shape for one that is neither, so the account shape stays and the
 * translation happens once, here.
 *
 * WHAT THE PLATFORM DOES NOT CARRY keeps its default from `ACCOUNT_DEFAULTS` rather than being
 * invented: XP progress, `redDot`, `chatRoomPermission`, `emailVerified`, `acceptPromotion`, the
 * whole `setting` block. Those are real gaps and reading them as defaults is what makes them
 * visible — a fabricated XP figure would render as a full progress ring and look correct.
 */

/* ── The wallet ────────────────────────────────────────────────────────────────────────────
 *
 * The platform answers `{BTC: "0.00000000", INR: "10000.00000000", …}` — 28 keys, one per COLUMN
 * on its `credits` table, every value a decimal string. This build's wallet is a list of rows
 * carrying `currencyName`, an alias, `display`, `sort` and the group amounts the currency
 * dropdown and the Balance pane both read.
 *
 * TWO THINGS THE 28 DO NOT COVER, and both are visible rather than hidden:
 *
 *   - **There is no BCD**, which is this build's fixture account's own balance currency, the
 *     unit the Deposit Bonus page is denominated in and the coin the signed-in header capture
 *     shows. Adding one is a migration on their side, not config. `pickCurrency` below is what
 *     stops the header pill naming a coin the account cannot hold.
 *   - **120 of this build's 148 rows simply do not exist there.** A live wallet is 28 rows, so
 *     the currency dropdown is genuinely shorter. That is the backend being smaller, not a
 *     mapping that dropped something, and it should read that way.
 *
 * WHICH CODES ARE FIAT is decided by asking this project's own catalogue rather than by a new
 * classification: a code is fiat when `<CODE>FIAT` is a currency bc.game lists as one, which is
 * what turns their `INR` into our `INRFIAT`/`INR` pair. MVR, BJB, NC and SC fall through to the
 * crypto arm — MVR really is a fiat currency and bc.game does not carry it, so there is nothing
 * to map it onto and no icon for it either way. Recorded rather than special-cased.
 *
 * `isFiatCode` lives in `utils/currency.js` because `services/exchangeRate.js` needs the same
 * answer for the same reason, and two copies of it would drift. It used to be derived here from
 * `SIGNED_IN_BALANCES`; the catalogue is the better source and agrees with it on every code this
 * wallet carries.
 */
function toWalletRows(balances, flags) {
  return Object.entries(balances ?? {})
    /* THE OPERATOR'S OWN CURRENCY SWITCHES, and the filter runs BEFORE `index` is taken so `sort`
       stays a dense 0..n-1 over the rows that survive rather than carrying holes where a disabled
       currency used to be. Nothing downstream reads `sort` as an index into anything, but a gap
       in it would be a puzzle for whoever next does.

       `isCurrencyEnabled` answers `true` for an absent flag AND for a failed read — see
       `services/siteConfig.js` for why a broken config must never hide a currency. So this is a
       no-op on a deployment that has not configured itself, which is every one of them today. */
    .filter(([code]) => isCurrencyEnabled(flags, code, isFiatCode(code)))
    .map(([code, amount], index) => {
    const fiat = isFiatCode(code);
    return {
      lastLogId: '0',
      currencyName: fiat ? `${code}FIAT` : code,
      aliasCurrencyName: code,
      amount,
      /* `amount` is the whole balance and `generalAmount` the withdrawable part. The platform
         reports one number, so the two are the same — and the split is real on this build's
         side (the Balance pane sorts on `amount`, the header dropdown on `generalAmount`), so
         they are both written rather than one being left out for the other to fall back on. */
      generalAmount: amount,
      bonusAmount: '0',
      /* Both zero, which is what keeps the dropdown's Bonus Balance tab hidden — it only
         unhides when some coin carries a sports or free-play amount, and the platform holds
         neither on a wallet row. */
      groupAmount: { sports: '0', free_amount: '0' },
      abnormal: false,
      /* The platform has no per-row sort, so the object's own key order is the order — which is
         `CURRENCY_COLUMN`'s declaration order in `wallet.constants.js`, i.e. stable and theirs. */
      sort: index,
      /* No `display` flag either: their wallet has no Manage Assets equivalent, so every row a
         visitor can hold is a row they can see. Hide Small still works, because that filters on
         the amount rather than on this. */
      display: true,
      displayStatus: 0,
      supportTx: true,
      useable: true,
      areaAble: true,
    };
    });
}

/**
 * Which coin the header pill opens on.
 *
 * A coin the visitor EXPLICITLY picked (`explicit` — the header dropdown, the game page's
 * currency picker, a free-play claim; see `setSetting` in `SessionContext.jsx`) wins whenever the
 * wallet has a row for it, funded or not: it was their choice.
 *
 * Anything else in `preferred` is only a default the shell remembered — `ACCOUNT_DEFAULTS`' BTC,
 * or whatever this function answered on an earlier load — and it is kept only while it holds
 * money. An agent-funded player is the case that forced the distinction: the first sign-in on an
 * empty wallet lands on the first row (BTC), that answer is persisted, and once the agent credits
 * INR every reload kept opening the pill on **0 BTC** beside ₹450 in the dropdown. So an unfunded
 * default gives way to the largest balance, and only then to the default itself or the first row.
 */
function pickCurrency(rows, preferred, explicit = false) {
  const held = rows.find((row) => row.currencyName === preferred);
  if (held && (explicit || Number(held.amount) > 0)) return preferred;

  const funded = rows
    .filter((row) => Number(row.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount))[0];

  return funded?.currencyName ?? held?.currencyName ?? rows[0]?.currencyName ?? ACCOUNT_DEFAULTS.setting.currencyName;
}

/* ── The account ───────────────────────────────────────────────────────────────────────────
 *
 * `GET /user/profile` rather than `/auth/me`: the two read the same row and answer differently,
 * and only `profile` maps the columns (`twoFactorEnabled` for `two_fa_status`, `referralCode`
 * for `referalcode`) and adds `gamesPlayed`. See the note in `endpoints.js`.
 */
function toAccount(profile, rows, previous, prefs, bonus) {
  /* THE XP BAND IS DERIVED FROM THE LEVEL AND THE POSITION INSIDE IT IS MEASURED, NOT INVENTED.
     The band comes out of the captured VIP ladder in `data/vipConfig.js`, which is real, and this
     shell's header ring and the bonus page's level card both read `currXP` against
     `levelStartXP`/`levelEndXP`.

     `GET /user/profile` carries only `level`, so for a long time `currXP` sat at the band's FLOOR
     and every ring read 0% — honest, and flat for every account on the platform. `GET /user/bonus`
     answers the missing half: `progressPct` is how far the account is toward its next level, and
     placing it in the band is arithmetic rather than a guess.

     IT IS A DIFFERENT UNIT ON EACH SIDE AND THAT IS THE POINT OF USING THE PERCENTAGE RATHER THAN
     THE FIGURE. The platform measures progress in WAGER (`wager`, `wagerToNextLevel`) and bc.game
     measures it in XP; the two scales have nothing to do with each other, so `wager` cannot be
     written into `currXP`. A fraction of the way through a level is the one quantity both express,
     and it is exactly what the ring draws.

     `progressPct` is a percentage STRING ("0.00"), clamped here because a server that reports 100
     at the moment of a level-up would otherwise put `currXP` on the next band's floor. Falls back
     to the floor when the read failed or the field is absent, which is where this started.

     ── THE PLATFORM HAS TWO VIP LEVELS AND THEY DISAGREE, SO ONLY ONE OF THEM CAN BE USED ─────

     `GET /user/profile` answers `level: 1` for `demo_player03` while `GET /user/bonus` answers
     `vip.level: 0` for the same account in the same second. Not a bug: `users.level` is a STORED
     column an operator sets, while the bonus module DERIVES its level from lifetime wager
     (`vipLevelFor(#wagerAmount(wager))`) — a seeded account can be granted a level it has not
     wagered its way to.

     The derived one is taken, for both the band and `vipLevel` itself, on two grounds. It is what
     the platform's OWN gates use — `eligible` is `vip.level >= spec.minVipLevel` and the claim
     refuses on the same comparison — so a badge reading off the other column would promise a
     bonus the server then declines. And it is the only one that comes with a position: mixing
     `profile.level`'s band with `bonus.vip.progressPct` would draw a fraction of one level inside
     the bounds of another, which is wrong by construction rather than merely imprecise.

     `profile.level` is the fallback when the bonus read failed, which is the same arm the floor
     is reached by. */
  const level = Number(bonus?.vip?.level ?? profile.level ?? 0);
  const band = vipLevelRow(level);
  const pct = Math.min(Math.max(Number(bonus?.vip?.progressPct) || 0, 0), 100);
  const currXP = band.minXp + ((band.maxXp - band.minXp) * pct) / 100;

  return {
    ...ACCOUNT_DEFAULTS,
    login: true,
    visitor: false,

    name: profile.username ?? '',
    /* Three names for one id, exactly as the captured account carries them. */
    userId: profile.id ?? 0,
    uniqueUid: profile.id ?? 0,
    uid: profile.id ?? 0,
    email: profile.email ?? '',
    avatar: profile.avatar ?? '',
    /* `country` is a two-letter code (`IN` on the demo accounts). bc.game's `areaCode` is the
       same idea and `userCountry` is what the notification drawer's region gate reads, so both
       take it rather than one being guessed at. */
    areaCode: profile.country ?? '',
    userCountry: profile.country ?? null,

    vipLevel: level,
    currXP,
    levelStartXP: band.minXp,
    levelEndXP: band.maxXp,

    /* The account's bonus currency, which is what every figure on `/bonus` is priced in and what
       its coin mark shows. `BJB` on a demo account — a token bc.game does not carry, so the mark
       falls through the coin glob to the blank disc, which is the same fallback `BC` already
       takes on that page. Left at the default when the read failed. */
    bonusCurrencyName: bonus?.currency ?? ACCOUNT_DEFAULTS.bonusCurrencyName,

    /* The one preference field with a control that both exists here and can move. The pane binds
       its marketing-email switch to this, so the server's answer has to reach the account rather
       than being read separately — see the note at the third read in `loadAccount`. Falls back to
       the default rather than to `false`, so a missing read leaves the switch where a fresh
       account would have it instead of silently reading as opted-out. */
    acceptPromotion: prefs?.emailNotifications ?? ACCOUNT_DEFAULTS.acceptPromotion,

    currentInvitationCode: profile.referralCode ?? '',
    invitationUrl: profile.referralLink ?? '',

    google2StepAuth: Boolean(profile.twoFactorEnabled),
    /* Everyone who can sign in through this form has a password; the platform offers no other
       credential to a browser. */
    passwordExist: true,
    /* `Date.parse`, NOT `Number` — the backend gap this worked around is FIXED.
       `joinedAt` used to map `created_estimated`, a BOOLEAN on their row, so it came back
       `false` and `Number(false)` was 0, which the profile dialog already treats as absent.
       It now carries the real `created` timestamp as an ISO string, and `Number` of that is
       NaN — so the workaround was what kept the date at 0 once the server started sending one.
       `Date.parse` handles both: milliseconds for a real date, NaN for anything else, and the
       `|| 0` still catches it. See gap 20 in docs/backend-gaps.md. */
    createTime: Date.parse(profile.joinedAt) || 0,

    /* Carried across a re-read so a currency the visitor picked, or a toggle they flipped, is
       not reset every time the account is refetched. `previous` is the account already in state
       on a refresh and the persisted record on a cold load. */
    setting: {
      ...ACCOUNT_DEFAULTS.setting,
      ...previous?.setting,
      /* ── ONLY A SIGNED-IN `previous` CARRIES A CURRENCY PREFERENCE ────────────────────────
       *
       * A visitor's `setting.currencyName` is not a choice, it is `ACCOUNT_DEFAULTS`' shipped
       * BTC — and `SessionProvider` persists the whole `setting` block on its first mount, so
       * that default is in `localStorage` before anybody has clicked anything. Handing it to
       * `pickCurrency` as a preference made it win on every first live sign-in, because the
       * platform's wallet does carry a BTC column: the header pill opened on **0 BTC** for an
       * account holding 9,769 INR. Found in the browser, not in the service — signing in through
       * `auth.login` with no `previous` picks the funded coin and looks right.
       *
       * `previous.login` is the whole of the test, and it is also what the sign-out rule already
       * says: "a sign-out does not carry the previous session's currency choice into the next
       * one". A reload keeps its preference, because `restore()` raises `login` before
       * `loadAccount` runs. */
      currencyName: pickCurrency(
        rows,
        previous?.login ? previous?.setting?.currencyName : undefined,
        Boolean(previous?.login && previous?.setting?.currencyPicked),
      ),
    },
  };
}

/* ── The reads ─────────────────────────────────────────────────────────────────────────────
 *
 * `live: true` on every one: these are real routes. With `VITE_USE_FIXTURES` on (the default)
 * the flag is ignored and the fixture is what comes back, which is what keeps the whole build
 * working with no backend running — see the note at the top of `client.js`.
 */

/** The fixture arm, so both modes return the same shape and the caller never branches. */
const FIXTURE_ACCOUNT = { account: SIGNED_IN, balances: SIGNED_IN_BALANCES };

/**
 * Exchange credentials for a session.
 *
 * Stores the token pair as a side effect, because everything after this needs it and there is
 * exactly one right moment to do it. Answers the account this shell reads rather than the
 * platform's own payload — the caller is a dialog, and what it wants is something to commit.
 *
 * @param {{identifier: string, password: string, twoFactorCode?: string}} credentials
 */
export async function login(credentials, previous) {
  const session = await request(PLATFORM.user.auth.login, {
    live: true,
    method: 'POST',
    json: credentials,
    fixture: null,
  });

  /* Fixtures on: `request` answered with the fixture and there is no session to store. The
     dialog's own overrides still reach the account through `signIn`, as they always did. */
  if (!session?.accessToken) return FIXTURE_ACCOUNT;

  setTokens(session);
  return loadAccount(previous);
}

/* The bonus summary, read only for an account allowed promotions. An agent-tree player's
   `/user/bonus` answers `403 PROMOTIONS_NOT_FOR_AGENT_USERS` on every load, so the account's
   capabilities (`/user/auth/me`) are asked first and the read is skipped when promotions is
   off. A failed capabilities read (`null`) still tries the summary, and an agent refusal is
   swallowed as `null` either way — the summary only refines a figure that has a fallback. */
async function readBonusSummary() {
  const caps = await loadCapabilities().catch(() => null);
  if (caps?.promotions === false) return null;
  return Promise.resolve(request(PLATFORM.user.bonus.summary, { live: true, fixture: null })).catch(() => null);
}

/**
 * Read the signed-in account — the profile and the wallet, in one shape.
 *
 * Two requests rather than one, because the platform has no combined endpoint; issued together
 * rather than in sequence, because neither depends on the other and a serial pair would double
 * the time the header spends on its signed-out tree.
 */
export async function loadAccount(previous) {
  const [profile, balances, prefs, bonus, siteConfig] = await Promise.all([
    request(PLATFORM.user.profile.get, { live: true, fixture: null }),
    request(PLATFORM.user.wallet.balances, { live: true, fixture: null }),
    /* The third read is the marketing switch's own state, and it is folded into the ACCOUNT
       rather than read by the Preferences pane, because that pane already binds the switch to
       `session.acceptPromotion` — giving it a second source would mean two values for one control
       that could disagree after a write. `services/settings.js` says which of the five preference
       fields this is and why the other four are left alone. */
    request(PLATFORM.user.preferences, { live: true, fixture: null }),
    /* THE FOURTH READ IS THE ONLY PLACE THE ACCOUNT'S POSITION INSIDE ITS VIP BAND EXISTS, and
       it is the bonus summary rather than the profile — see `toAccount`. It is also the only one
       of the four that is allowed to fail: the other three each carry something the shell cannot
       render without, while this one refines a figure that already has an honest fallback, so a
       500 here must not cost a visitor their session. */
    readBonusSummary(),
    /* THE FIFTH READ IS PUBLIC AND IS ALLOWED TO FAIL FOR THE SAME REASON THE FOURTH IS, but the
       failure means something stronger here: `isCurrencyEnabled` reads a missing map as "every
       currency on", so a 500 from site-config costs a visitor nothing at all — they get the
       wallet this build showed before the flags existed. It rides along in this `Promise.all`
       rather than being fetched where it is used because the wallet rows are built here, once,
       and a second round trip after the account had landed would show the full list and then
       shorten it. */
    getSiteConfig(),
  ]);

  if (!profile) return FIXTURE_ACCOUNT;

  /* Runs on sign-in AND on a reload that restores the session, which is the pair of moments the
     browser's push subscription has to be tied to this player. */
  pushLogin(profile.id);

  const rows = toWalletRows(balances, siteConfig);

  /* THE WALLET IS WHAT SAYS WHICH CURRENCIES ARE REAL HERE, so it is what settles the rate table.
     `data/usdPrice.js` is a merge of this platform's rates over bc.game's captured snapshot, and
     a ticker in both does not mean the same asset in both — `SC` is a row in the snapshot at $1
     AND a column on this wallet, and they are different tokens. Handing over the codes this
     account can actually hold lets the table drop any of them the live source did not quote, so
     they read as "no rate" rather than as another asset's price. See the note at that function. */
  dropUnpricedCodes(rows.map((row) => row.aliasCurrencyName));

  return { account: toAccount(profile, rows, previous, prefs, bonus), balances: rows };
}

/**
 * End the session.
 *
 * The local tokens are cleared WHATEVER the server says, and the order is the point: a logout
 * that failed on the network still has to sign the visitor out of this tab, or a transient 502
 * leaves them looking at a signed-in shell they have already left. The POST is what revokes the
 * refresh token server-side, so it is worth attempting and not worth blocking on.
 */
export async function logout() {
  pushLogout();
  try {
    await request(PLATFORM.user.auth.logout, { live: true, method: 'POST', fixture: null });
  } catch {
    /* Deliberately swallowed — see above. */
  } finally {
    clearTokens();
  }
  return { account: VISITOR, balances: [] };
}

/** The device list behind Settings → Security. Read here because the module owns the session. */
export const getSessions = () =>
  request(PLATFORM.user.auth.sessions, { live: true, fixture: [] });

/* ── Change Password ─────────────────────────────────────────────────────────────────────────
 *
 * `POST /user/auth/change-password`, and it is the FIRST of the six Settings panes' actions to
 * reach a real endpoint — every other tile there is still inert for the reason `docs/settings.md`
 * records (the flow behind it was never captured and the path answers 403).
 *
 * The platform takes `{currentPassword, newPassword}` and nothing else. `newPassword` is a
 * minimum of TEN characters, which is its own rule and stricter than bc.game's — the validator
 * says so in as many words, preferring length to a character-class requirement — and it refuses a
 * new password equal to the current one at the schema level, before any hashing.
 *
 * THE SERVER REVOKES EVERY SESSION ON SUCCESS (`revoked_reason: 'password_changed'`), which is
 * why the dialog signs out afterwards rather than merely toasting. It is also what the original's
 * own step two warns about in the box above its Confirm button ("Re-login will be required after
 * setting password.") and why that flow ends by navigating to `/logout`. The two agree; only the
 * number of round trips differs.
 *
 * `live: true` with no fixture arm. A fixture that answered "changed" would be a lie a visitor
 * acts on — they would sign out believing a password that does not exist — so with fixtures on
 * this rejects instead, which is the same choice `docs/data-layer.md` prescribes for a write.
 *
 * ONE THING TO KNOW ABOUT ITS REFUSAL: a wrong current password answers **401**, not 403 or 422,
 * and this project's transport reads a 401 as "that access token has expired" — so it refreshes
 * the session and REPLAYS the request, which then fails the same way and surfaces correctly. The
 * visible behaviour is right; what it costs is that every wrong-password attempt reaches the
 * server twice and rotates a refresh token on the way. Worth knowing before anything here is
 * counted (a lockout after N attempts would count double). The fix belongs on the platform side —
 * a failed credential check inside an authenticated request is not an authentication failure —
 * and is written up in `docs/backend-gaps.md` rather than worked around here, because teaching
 * the transport to special-case one path's 401 is how a retry rule stops being a rule.
 */
/* `PUT /user/profile` — the account's own editable fields, and the write behind Account Info's
 * Edit button. Takes `{username?, country?, avatar?}`, each optional, and refuses an empty body
 * with `422 "Nothing to update"` (checked on the running server, not read off the validator).
 *
 * ONLY `username` IS SENT FROM HERE, because only username is what the original's Edit Profile
 * dialog changes — see `modals/EditProfile` for the rest of that argument. `country` and `avatar`
 * are the platform's and have no control on that screen; sending either would be this build
 * inventing a field the dialog does not have.
 *
 * The rule is the PLATFORM'S: 3..30 characters over `/^[A-Za-z0-9_.-]+$/`. bc.game's own is
 * 3..20 and letters-required, and its message ("Username must be 3-20 characters and include
 * letters(requried), numbers or '_'." — the typo is theirs) describes a rule this server does not
 * enforce, so it would be a lie here. `USERNAME_TAKEN` comes back on a collision.
 */
export function updateProfile({ username }) {
  return request(PLATFORM.user.profile.get, {
    live: true,
    method: 'PUT',
    json: { username },
  });
}

/* ── Changing the account's e-mail, wired 2026-09-04 (gap 23's other half) ───────────────────
 *
 * TWO CALLS, AND THE SPLIT IS THE SECURITY PROPERTY. `requestEmailOtp` sends a six-digit code to
 * the NEW address — not the current one, because the question being answered is "can this person
 * receive mail there", and that is where password reset will deliver afterwards. `changeEmail`
 * then verifies the code and SPENDS it, so one code authorises exactly one change and a replay
 * is refused rather than silently accepted.
 *
 * The route was built and wired at the seam in Part 4b.8 and nothing called it until now: the
 * form it needed is `/user-action/email-change`, which is what this pass builds.
 */
export function requestEmailOtp({ email, purpose = 'change-email' }) {
  return request(PLATFORM.user.emailOtp, {
    live: true,
    method: 'POST',
    json: { email, purpose },
  });
}

/* `code` is required rather than optional on the platform's own validator, which is the one place
   it differs from the socket path it replaced: "no code supplied" and "wrong code" were two
   routes to the same refusal there, and a dedicated route can simply require it. */
export function changeEmail({ email, code }) {
  return request(PLATFORM.user.changeEmail, {
    live: true,
    method: 'POST',
    json: { email, code },
  });
}

export function changePassword({ currentPassword, newPassword }) {
  return request(PLATFORM.user.auth.changePassword, {
    live: true,
    method: 'POST',
    json: { currentPassword, newPassword },
  });
}

/* ── Sign one device out ─────────────────────────────────────────────────────────────────────
 *
 * The Remove button on each row of Settings → Security. `getSessions` above has been readable
 * since the port with nothing able to act on what it returned.
 *
 * IT STOPS THE REFRESH, NOT THE ACCESS TOKEN. An access token already issued to that device
 * lives to its expiry — which is exactly how `logout` behaves on this platform too, measured
 * rather than assumed, so it is a property of the platform and not of this call. What it means
 * for the UI is that the row disappears immediately and the other device keeps working for a
 * few minutes; there is nothing this build can do about that from here.
 */
export function revokeSession(sessionId) {
  return request(PLATFORM.user.auth.revokeSession(sessionId), {
    live: true,
    method: 'DELETE',
  });
}

/* ── Registration ────────────────────────────────────────────────────────────────────────────
 *
 * The Sign Up tab. Until 2026-09-04 this dialog could not reach the platform at all —
 * registration existed only as a socket event — so the form swapped a fixture and the note in
 * `components/modals/Auth/index.jsx` said so. `POST /user/auth/register` exists now.
 *
 * ── THE FORM HAS NO USERNAME FIELD AND THE PLATFORM REQUIRES ONE ───────────────────────────
 *
 * bc.game's sign-up collects an email, a password and an optional referral code, and this build
 * reproduces that markup exactly. The platform wants a `username` of 3–60 characters as well.
 * Rather than add a field the original does not have — which would be this build inventing a
 * screen — the username is DERIVED from the email's local part, sanitised to the character class
 * the profile validator enforces elsewhere (`[A-Za-z0-9_.-]`).
 *
 * That derivation can collide, and when it does the server answers `409 AUTH_ALREADY_REGISTERED`
 * naming the field. It is surfaced rather than retried with a suffix: silently signing somebody
 * up as `alice2` when they typed `alice@…` is worse than telling them the name is taken, and a
 * retry loop here would burn the 5-an-hour budget the route is metered at.
 *
 * ── REGISTERING DOES NOT SIGN YOU IN ───────────────────────────────────────────────────────
 *
 * The service answers `{id, name, email}` and mints no session, which is what the socket flow
 * did too. So this signs in afterwards with the same credentials — one extra round trip, and it
 * keeps `login` the only thing in this file that creates a session.
 */
const usernameFromEmail = (email) => {
  const local = String(email ?? '').split('@')[0] ?? '';
  const cleaned = local.replace(/[^A-Za-z0-9_.-]/g, '');
  /* Three characters is the platform's floor. A local part shorter than that is rare and real
     (`bo@…`), so it is padded rather than refused — the alternative is a form that rejects a
     valid email for a rule the visitor cannot see. */
  return cleaned.length >= 3 ? cleaned.slice(0, 60) : `${cleaned}user`.slice(0, 60);
};

export async function register({ email, password, referral }, previous) {
  await request(PLATFORM.user.auth.register, {
    live: true,
    method: 'POST',
    json: {
      username: usernameFromEmail(email),
      email,
      password,
      /* Only when the visitor opened the panel and typed one — an empty string is a value the
         validator would accept and store as a referrer that does not exist. */
      ...(referral ? { referredBy: referral } : {}),
    },
  });

  /* Straight into a session, so the dialog closes onto a signed-in page exactly as the fixture
     arm always did. A failure HERE is worth surfacing differently from a failed registration —
     the account exists at this point — but the caller cannot usefully act on that distinction,
     so it propagates as one error. */
  return login({ identifier: email, password }, previous);
}

/* ── Password reset ──────────────────────────────────────────────────────────────────────────
 *
 * `requestPasswordReset` ANSWERS THE SAME WAY FOR A REGISTERED AND AN UNREGISTERED ADDRESS, and
 * the server computes that reply before it branches so the two even cost the same time. Nothing
 * here may shape it: a 404 for an unknown address, or a different message, would rebuild the
 * account-enumeration oracle the platform is deliberately avoiding. So the UI's only correct
 * response is "if that address is registered, a link is on its way".
 *
 * NEITHER IS REACHABLE FROM THIS BUILD YET. The Sign In tab's "Forgot your password?" is an
 * `<a href="/login/forgot">` — the original's own href — and `/login/forgot` is not a route
 * here, so it falls to the catch-all. Building that screen means designing a form the capture
 * does not contain. Both are wired at the seam, correct and unused, which is the same state the
 * vault transfers were in before their screen existed.
 *
 * The reset arm also needs SMTP configured before a link actually arrives; the mailer exists and
 * reports failure rather than throwing, so the call succeeds and the email does not.
 */
export function requestPasswordReset({ email }) {
  return request(PLATFORM.user.auth.forgotPassword, {
    live: true,
    method: 'POST',
    json: { email },
  });
}

export function completePasswordReset({ token, newPassword }) {
  return request(PLATFORM.user.auth.resetPassword, {
    live: true,
    method: 'POST',
    json: { token, newPassword },
  });
}
