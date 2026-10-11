# Wiring plan — bc-games front-end → iBitPlay backend

**What this is.** The running order for connecting this front-end to the backend in
`backend copy/`, what is done, what is next, and everything a person needs to pick it up cold.
Updated as each step lands — this file is the source of truth, not the conversation it came from.

**Read `CLAUDE.md` first** for the front-end's own conventions. The section called
*Wiring it to the iBitPlay backend*, in `docs/data-layer.md`, is the long-form version of the
decisions summarised here; this file is the schedule.

---

## Status

| # | Step | State |
|---|---|---|
| 01 | Transport seam — envelopes, bearer, refresh | **Done** |
| 02 | Auth and session | **Done** |
| 03 | Wallet and exchange rates | **Done** |
| 04 | Global Settings — six panes | **Done** |
| 05 | Swap | **Done** |
| 06 | Transaction and bet history | **Done** |
| 07 | Referral / affiliate | **Done** |
| 08 | Vault · Withdraw · Deposit | **Done** |
| 09 | Bonus rewards & VIP position | **Done** |
| 10 | The gift's bonus panel | **Done** |
| 11 | Transaction — Deposit & Withdraw rows | **Done** |
| 12 | KYC status · 2FA | **Done** |
| 13 | Casino — BC Originals | **Done** — the aggregator catalogues stay unprovisioned |
| 14 | Latest Bets · profile statistics · recently played | **Done** — and three bugs the live data exposed |

Roughly 136 player-facing routes exist on user-service; this plan wires the ones that have a
surface in this build. What has no backend at all is listed at the end and stays on fixtures.

---

## Environment

### Backend

```bash
cd "backend copy"
node scripts/setup.js --demo          # first time only: .env, secrets, db, migrations, seeds
RATE_LIMIT_ENABLED=false node scripts/dev.js user admin casino gateway
```

Gateway `http://127.0.0.1:4000` · `/api/v1` is the endpoint index · `/health` aggregates.

| | |
|---|---|
| Database | `bc_games` on **port 5433** (PostgreSQL 18; 5432 is the 17 instance), `postgres`/`root` |
| Players | `demo_player01` … `demo_player05`, password from `DEMO_PASSWORD` (seed config) |
| Staff | the seeded super admin (password from the seed config), plus a four-deep demo tree on `DEMO_PASSWORD` |
| Re-print credentials | `node scripts/seed-data.js --demo` (idempotent) |

**Name the four services.** Bare `npm run dev` starts sports too, and sports **cannot boot** — see
*Backend gaps* below. `dev.js` takes a service list; `RATE_LIMIT_ENABLED=false` is worth having
while developing against the login route, which is metered.

### Front-end

`.env` (or `.env.local`):

```
VITE_USE_FIXTURES=false
VITE_API_BASE=http://127.0.0.1:4000
VITE_FIXTURE_DELAY=400
```

The gateway's own `CORS_ORIGIN` already lists `http://localhost:5173`, so nothing else is needed.
With no `.env` at all the build behaves exactly as it always has — every service returns its
fixture and nothing is fetched.

---

## Invariants — do not break these

Five decisions the work so far rests on. Each cost something to arrive at.

**1 · `live: true` is opt-in, per call site.** `VITE_USE_FIXTURES=false` does not mean "fetch
everything" — it means "fetch everything that HAS a route". A call site marks itself when a real
endpoint exists behind it and keeps its fixture otherwise. The alternative (flip everything, fall
back to a fixture on error) would hide a genuine 500 behind plausible-looking data.
**`grep -rn "live: true" src/` is the migration list.**

**2 · Two envelopes, detected by shape.** bc.game's `{code, msg, data}` and the platform's
`{success, data, meta}`. `code` is tested only when `success` is absent, because the platform's
error object carries one too. Branch on `error.code`, never on the message — the platform's own
`docs/API-ROUTES.md` §5 says the message may be reworded.

**3 · `requestPage` is a second reader, not a flag.** A list's total lives under
`meta.pagination` and there is no top-level `meta.total`; `request` drops `meta`, which is right
for every other route and wrong for a list.

**4 · The refresh is single-flight.** A cold load fires a dozen reads that all 401 within
milliseconds. Twelve concurrent refreshes would each present a token an earlier one had already
retired, which the platform treats as a replay and answers by revoking the session.

**5 · Authenticate, then animate, then commit.** Committing a session makes `depositNeedsAuth` and
its siblings false in `App`, which unmounts the auth dialog mid-tween and drops the queued
navigation with it. Credentials can also be refused, and a dialog that plays its exit before it
knows the answer has to play an entrance again to show the error.

And one that is not ours: **`persist.read()` returns `{...defaults, ...stored}`**, so a record
missing a `setting` key inherits the defaults' BTC and overwrites `SIGNED_IN`'s BCD. The app never
writes such a record; a test harness that hand-writes one will read this as a bug in `restore()`.

---

## 01 · Transport seam — **done**

Everything else depends on this. One file, plus a token store.

**Changed** — `src/services/client.js` (rewritten), `src/services/tokens.js` (new),
`.env.example`.

- Dual envelope reader; `ApiError` gained `status`, `details`, `fields` and a `requestId` getter.
- `requestPage(path, opts) → {rows, pagination}`, normalising a fixture given as a bare array or
  as `{rows|list, pagination}`.
- `Authorization: Bearer` from `tokens.js`, with a single-flight refresh on 401 and one replay.
- `notifyAuthExpired()` — a listener registry, because a failed refresh has to reach React state
  from outside React.
- 204 and binary branched on **before** the body is touched: the platform sends zero bytes for a
  204 and `JSON.parse('')` throws.

**Verified** — 10/10 against stubs (both envelopes, the failure shape, the fixture gate,
refresh-and-replay, three concurrent 401s producing one refresh, 204, the `json` body option), then
7/7 against the running gateway including a forged-expiry token refreshing and replaying
transparently.

---

## 02 · Auth and session — **done**

**Changed** — `src/services/endpoints.js` (added `PLATFORM`), `src/services/auth.js` (new),
`src/context/SessionContext.jsx`, `src/components/modals/Auth/index.jsx`.

**Routes**

| | |
|---|---|
| `POST /api/v1/user/auth/login` | `{identifier, password}` → `{accessToken, refreshToken, expiresAt, user}` |
| `GET /api/v1/user/profile` | mapped columns — **read this, not `/auth/me`**, which returns raw ones |
| `GET /api/v1/user/wallet/balances` | one object keyed by currency code, 28 keys, decimal strings |
| `POST /api/v1/user/auth/logout` | revokes the refresh token |
| `GET /api/v1/user/auth/sessions` | the device list, for step 04 |

**Decisions made**

- `PLATFORM` is a **second endpoint map**, kept apart from `ENDPOINTS`. Everything in the latter is
  bc.game's own captured path and is documentation whether or not anything calls it; a live read
  names `PLATFORM.user.auth.login` and says what it is.
- The account shape stays bc.game's and `services/auth.js` adapts. Renaming forty call sites to
  match a backend this project may not ship against would trade a captured shape for one that is
  neither captured nor documented.
- **Missing fields keep their default rather than being invented** — `redDot`,
  `chatRoomPermission`, `emailVerified`, the whole `setting` block. The XP band comes from the
  captured ladder in `data/vipConfig.js` and `currXP` sits at the band's floor: the platform
  stores `users.level` and no XP, and a fabricated figure would render as a plausible progress
  ring and be wrong every time.
- `pickCurrency` stops the header pill naming a coin the account cannot hold — the forcing case is
  every first live sign-in on a browser that used the fixtures, where a saved `BCD` meets a wallet
  with no such column.
- A third session state exists: **signed in, nothing read yet**, for a token that survived a
  reload. Its placeholder wallet is `VISITOR_BALANCES` and **not** `[]`, because the header pill
  reads `balances.find(…) || balances[0]` then `current.generalAmount` — an empty array is a crash
  on the first paint.
- With the API on, `login` in the persisted record is **not** authoritative — the token is.

**Deliberately not wired**, each flagged at its own form: the **One-time Code** tab (the routes
exist but it is a two-step flow and the dialog has no code-entry screen) and the whole **Sign Up**
tab — **registration is a socket event** there, `REGISTER_USER`, with no HTTP route at all.

**Verified** — 8/8 at the service layer against the live gateway, then the real `App` mounted in
happy-dom with a live token: signed-in shell on frame one, fixture account absent, INR 10,000 on
the pill, no BCD in the live chrome. Plus a fixtures-on regression pass.

---

## 03 · Wallet and exchange rates — **done**

**Goal.** The header pill's currency dropdown, the `/wallet/balance` pane, and a live FX table —
so every converted figure in the shell stops reading a frozen snapshot.

**Routes** (all confirmed answering)

| Route | Answers |
|---|---|
| `GET /user/wallet/balances` | already wired in step 02 — reuse `toWalletRows` |
| `GET /user/wallet/ledger` | paginated, `meta.pagination` present |
| `GET /user/wallet/history` | legacy-shaped, **outside the envelope** — see §4 of their docs |
| `GET /user/exchange-rate/rates` | `[{currency, usdRate, lastUpdated}]` — **25 rows, seeded** |

**Changed** — `src/services/exchangeRate.js` (new), `src/data/usdPrice.js`,
`src/utils/currency.js` (`isFiatCode`), `src/services/auth.js`, `src/context/SessionContext.jsx`,
`src/services/endpoints.js`.

The wallet itself needed no work: step 02 already wired `/user/wallet/balances`, so the dropdown,
the pill and the Balance pane were live before this step began. What was left was the FX table
behind every converted figure.

**Decisions made**

- **The rate table is a module cache, not a hook**, because `printCurrency` is a pure function
  called during render across the shell and cannot await anything. That is the ORIGINAL'S own
  arrangement (`mt().get(…).then(s => n(qg(o)))` fills a store `getUsdPrice` reads synchronously),
  and `services/bonus.js` already carries the same read-plus-store shape.
- **Primed from `SessionProvider`, unconditionally**, because the route is `public` — checked
  against the running server — and a signed-OUT home page converts too. It bumps an `fxVersion`
  the context publishes, which is what re-renders figures formatted before the rates landed.
  Published rather than kept private on purpose: a memo dependency nothing in the value reads is
  one the linter is right to reject.
- **The overlay MERGES rather than replaces**, and that is temporary. Replacing is the honest
  shape — one table, one source — but `services/swap.js` and `services/buyCrypto.js` price their
  fixtures through the same accessor against catalogues of 43 and 38 coins the platform's 25 rows
  do not cover, so replacing would take every quote on two unwired pages to zero. Revisit at
  steps 05 and 08.
- **A TICKER IS NOT AN ASSET, and the merge is unsound without `dropUnpricedCodes`.** Found by
  testing, not by reading: bc.game's snapshot prices **`SC` at $1** and `SC` is also a column on
  this platform's wallet — a different token, which the merge silently gave a dollar. `NC` and
  `BJB` are the same shape and only invisible because bc.game happens not to carry them. So
  `loadAccount` hands the table the codes this account can actually hold, and any of them the live
  source did not quote loses its inherited price and reads `$0.00` — "no rate" rather than another
  asset's rate wearing the same three letters. **Check this again for any backend whose currency
  set differs from bc.game's.**
- `USD`/`USDFIAT` are re-pinned to exactly 1 after every overlay, as the original's fetch hook does.

**Verified** — 13/13 against the running gateway: the fiat double-key (`INR` **and** `INRFIAT`, or
the shell's own lookups miss it), the SC collision being dropped, SOL and USD surviving the drop,
BTC moving 62,790 → 65,000, and the wallet pane rendering INR 10,000 → **$120.00** at the live rate
rather than ~$113 at the snapshot. Plus a fixtures-on pass proving the prime is a no-op and the
snapshot still converts.

**One harness trap worth recording**: `services/tokens.js` reads `localStorage` at module scope, so
a test that writes its token after loading any app module gets a signed-out shell. Write it first.

---

## 04 · Global Settings — six panes — **done**

**IT IS MUCH SMALLER THAN THE PANE COUNT SUGGESTS, and that is the finding rather than a
shortfall.** The plan called this "the highest-density win"; checking each endpoint against the
running server rather than against the module map turned up two live reads, one already-live tile,
and four panes that are correctly empty.

| Pane | Route | Outcome |
|---|---|---|
| Security — sessions | `GET /user/auth/sessions` | **WIRED** — real devices replace one invented row |
| Preferences | `GET`/`PATCH /user/preferences` | **WIRED**, one field of five |
| Security — 2FA | — | **already live**, without a read: the tile branches on `session.google2StepAuth`, which `services/auth.js` fills from the profile's `twoFactorEnabled`. `/user/2fa/status` would ask the same column the same question. |
| Verification | `GET /user/kyc/status` | **not wired, deliberately** — see below |
| Payment methods · Whitelist · connections · linked accounts · community links · privacy | | all **403/6002**, all rendering the site's own empty state, which is the correct rendering |

**Why KYC is not wired.** The platform has ONE status (`NotSubmitted` | `Unverified` | `Pending` |
`Verified` | `Rejected`) and no levels; this pane draws a TWO-LEVEL ladder and — checked, not
assumed — branches on nothing but `levelResults.length`. Wiring it would mean synthesising two
levels from one status to produce a render identical to the fixture's. The endpoint is recorded
for the day the pane grows a real status arm.

**Preferences: five fields, one wired.** `emailNotifications` → "Receive marketing promotions by
Email", which was **inert** (bound to `session.acceptPromotion` with an empty handler, because
bc.game's own endpoint is shut) and now reads and writes. `language` has a display-only control
(one locale ships). `theme` is **left local** as recommended — three controls already write this
build's own store and a server copy lets a reload disagree with what was just clicked.
`pushNotifications` and `hideBalance` have no control that means the same thing: the pane's second
marketing switch is SMS, a different channel, and "Hide Small" filters small balances rather than
hiding the balance. Mapping either would be inventing a meaning the server does not have.

**`myself` comes from the token, not from the list.** The platform does not say which session is
the caller's, and it decides "In Use" against a **Remove** button — so getting it wrong offers to
revoke the session you are reading the page on. `getSessionId()` reads `sid` out of the access
token's own payload. Reading our own token for an id is not the same as trusting it: nothing is
authorised on the strength of it and the server verifies the signature regardless. The heuristic
it replaces — newest `last_used_at` — is wrong the moment two devices are active in the same
minute, which the tests demonstrate.

**One bug found in passing:** `getSessions` carried `method: 'POST'` (bc.game's verb), invisible
because fixture mode ignores the method. The platform's is a GET, so it would have 404'd on the
first live call.

**Verified** — 9/9 against the running gateway, including a second login proving the "In Use"
marker does not follow the newest row, a `PATCH` round-trip, and the Security pane rendering real
IPs with exactly one *In Use* and five *Remove*. Plus a fixtures-on pass proving the adapter does
not run over the captured fixture.

---

## 05 · Swap — **done**

**Changed** — `src/services/swap.js`, `src/services/endpoints.js`,
`src/pages/Wallet/Swap/index.jsx` (one line: the offered list moved into the service).

| Route | Outcome |
|---|---|
| `GET /user/swap/estimate` | **WIRED** — `{feePercentage, feeAmount, amountAfterFee, converted, usdRateFrom, usdRateTo}` |
| `POST /user/swap` | **WIRED** — verified by actually moving money |
| `GET /user/swap/balances` | **deliberately not wired** — see below |
| `GET /user/swap/history` | no surface: the page never calls it (`useSwap` is not built) |

**THE OPEN DECISION IS SETTLED, AND `swap/balances` IS THE WRONG LIST.** It looked like the
obvious source for the picker and returns **only currencies you hold** — `{INR: "10000"}` on the
demo account. The original's own filter is `config.list.filter(c => wallet[c] && wallet[c].amount
>= 0)`, and the `>= 0` is the point: a coin you hold **none** of is still offered, because you
have to be able to swap *into* it. Wiring the funded view would have left a one-row picker.

So the offered set is **the wallet** — the platform publishes no swappable list, and its `currency`
validator's allow-list is the same 28 codes its wallet carries. `swapOptions(config, balances)`
holds that rule and branches on the fixture flag rather than intersecting, because bc.game's list
is **crypto-only** and shares few codes with the platform's 28: an intersection would hide **INR**,
the demo account's only funded currency and the one coin the page must be able to spend.

**Other decisions**

- **`feePercentage` is a FRACTION, not a percent** — `0.15` on INR is 15%, and the backend's table
  is `{inr: 0.15, bjt: 0, default: 0.01}` (read, not inferred from one response). bc.game's `f` is
  the same kind of number, so nothing is scaled. The field NAME is the trap.
- **The estimate is priced on an amount and the read asks for a nominal `1`.** Rates and the fee
  rate do not vary with size, and the read is keyed on the PAIR — threading the typed amount
  through would refetch on every keystroke. The server's own `converted` is therefore unused, and
  it was checked against the page's arithmetic: identical to 8dp, the platform's own precision.
- **First place one `request` could not serve both.** bc.game's is a POST answering three fields;
  the platform's is a GET with query parameters answering nine. The live path is the platform's,
  the fixture is bc.game-shaped, and `toQuote` normalises — branching on `.then`, as `getSessions`
  does.
- **A self-swap is guarded here.** The platform 422s on `from === to` where bc.game answers
  happily; a single-currency wallet has no second coin for the page's own fallback to pick, so the
  service answers the null quote the page already renders as "no rate yet".
- Currency codes are **stripped of the `FIAT` suffix** at the seam — `INRFIAT` would be a 422.

**Verified** — 7/7 against the running gateway, including a **real swap**: 100 INR out, USDT in,
and the wallet reflecting both. Plus a rejected oversized swap carrying a stable error code, and a
fixtures-on pass confirming the picker is still the documented 31 coins and the quote still the
captured "1 USDT ≈ 1 BCD, fee 0".

---

## 06 · Transaction and bet history — **done**

**Changed** — `src/services/transaction.js`, `src/services/betHistory.js`,
`src/services/endpoints.js`. No component changes.

**`GET /user/wallet/ledger` IS THE BILL FEED, AND PICKING IT TOOK A PROBE RATHER THAN A READING.**
`/user/history` is the obvious-looking name and is **deposits and withdrawals only** — on an
account with real activity it answers `{deposits: {count: 0}, withdrawals: {count: 0}}` while the
ledger carries every movement, each with a `description` ("Swap INR → USDT") and the balance after
it. The Bill tab now renders real rows.

**The before-balance is derived, and the pane's own arithmetic is what makes it a mapping rather
than an invention.** The table computes `balance = before(general+bonus) + both changes`, and the
ledger row carries `amount` plus the balance *after* it — so `before = balance - amount` makes the
second line come out at exactly the ledger's own figure. The bonus half is zero throughout: the
platform has no bonus/general split, and splitting one figure across two columns would put a number
on screen that no row holds.

**Which filters reach the server, and why the two panes differ**

| Filter | Bill (ledger) | Bet history |
|---|---|---|
| assets / currency | **sent** as `currency` | no parameter — the four merged sources are keyed by game, not coin |
| time | **no date range on the ledger at all** | **sent** as `from`/`to`, ISO-8601 |
| category | `reason` is ONE of thirteen values where the filter's options are groups — "Game" is four reasons, "Swap" is two | its axis is `source` (which aggregator) against bc.game's game categories 1..8 |

Nothing is mapped onto a nearest-looking parameter, and filtering a fetched page client-side was
rejected: it would show fewer rows than the pager counts.

**The cursor stays in the contract.** bc.game pages by `minDistributeId` and the platform by
`page`/`limit`. The component is untouched — it still threads a cursor through, and the service
still answers one (the last row's `distributeId`), so the call site is already correct the day a
real cursor endpoint sits behind it.

**One thing read wrong and corrected by probing:** the comment first said the validator refuses
`to` before `from`. That refine is on the **staff** `listing`; the player route is `myHistory`,
which carries the window and no refine — an inverted range is accepted and simply matches nothing.

**Verified** — 8/8 against the running gateway (real ledger rows, the table's arithmetic
reproducing the ledger's balance, `INR → INRFIAT`, the assets filter narrowing 10 rows to 5, offset
paging with no overlap, and the time window captured on the outgoing URL), plus 3/3 fixtures-on.

**The fixtures-on pass earned its keep here.** `requestPage` normalises its **fixture** too, so the
"not a Promise → return as-is" shortcut handed the panes `{rows, pagination}` where they read
`list` / `resList` — an empty table with nothing to explain it. Both services now run their mapper
on both arms.

**Done when** — both panes list real rows, the pagers work off `meta.pagination`, and the filters
map onto the platform's own query parameters.

---

## 07 · Referral / affiliate — **done**

**Changed** — `src/services/referral.js`, `src/services/endpoints.js`. No component changes.

**THE LINK DECISION IS SETTLED: THE CODE IS TAKEN LIVE, THE LINK IS BUILT HERE.** The platform
answers `referralLink: "http://localhost:3000/referal/<code>"` — its **own front-end's** origin,
baked into its config — so printing it would hand a friend a link into a different application.
`INVITE_HOST` is now `window.location.origin` when the API is on and the captured `hash.game` when
it is not, which is **the original's own rule rather than a new one**: bc.game builds the link from
`location.host`, and the captures say `hash.game` only because that is what answered when they were
taken. With fixtures on the string is byte-identical, so the Referral Codes table's content-sized
columns render exactly as documented.

**Two figures of ten are real, and the other eight keep the declared default.**

| | |
|---|---|
| `friendNumber` | ← `team.total` |
| `availableRewardUsd` | ← `rewards.totalAmount` |
| the other eight | `DASHBOARD`'s own zeros — the request module's declared fallback, and what the capture renders |

bc.game's dashboard is a ten-field card; the platform's whole affiliate module holds a member count
and a reward total. `ratio`/`maxRatio` are the tempting ones and are deliberately left: the Rate &
Rules pane states 25% from its own table, and a zero here does not contradict it — the card reads
the account's *earned* ratio, which is genuinely unknown. Deriving "today" from a total would have
put figures on the card that no endpoint holds.

**The Referral Codes table stays derived rather than fetched**, and for a new reason: the platform
has **no invite-code list at all** — an account has exactly one code and no way to create another.
So there is nothing to page through, the one row is built from the live code, and `registerNum`
comes from the real team count. `1/20` stays as the capture's pair because it describes bc.game's
own cap on a feature the platform does not have, and it reads true either way.

**Verified** — 6/6 live (the code matching the server, the link on `localhost:5173` and not
`localhost:3000` or `hash.game`, all three surfaces agreeing, and the eight untouched figures
asserted individually) plus 3/3 fixtures-on confirming `https://hash.game/i-98q7ntrof8-n/` byte for
byte.

**Still shut, still correct:** the four My Rewards feeds (`/agent/*`, 6002 and 403), the Live
Rewards ticker, and the `claim` / `claim-all` writes — the platform has them but nothing in this
build reaches them, since the rewards list they act on is empty.

---

## 08 · Vault · Withdraw · Deposit — **done**

**Changed** — `src/services/vault.js`, `src/services/endpoints.js`, `src/services/withdraw.js`
(notes only), `src/pages/Deposit/deposit.js`, `src/data/currencyTokens.js` (note only),
`src/pages/Wallet/VaultPro/index.jsx` (one line).

The three gates are answered by the standing instruction — **the UI stays bc.game's, the data comes
from the platform** — so no pane grew a control and no backend change was asked for. What that
settles, in order.

### Vault — the read side wired, the write side deliberately not

Their Vault Pro is a **fixed-term deposit**: pick a `lockPeriod`, the principal is locked until
`endTime`, and you take it back out by `depositId`. bc.game's is instant in and out at a published
APR. Same noun, different product, so only the read maps — and where it maps it maps exactly.

| this pane | the platform |
|---|---|
| `amount` | `GET /user/vault` → `totals[coin]`, joined on `aliasCurrencyName` (their `INR` against this build's `INRFIAT`) |
| `returnRatio` | `GET /user/vault/lock-options` → the **shortest** term's rate, **÷ 100** |
| `yesterdayReturn` / `accumulatedReturn` | stay `'0'` — see below |
| `bonusAmount` | stays `'0'`; their wallet has no bonus/general split |

**`rate` IS A PERCENTAGE AND `returnRatio` IS A FRACTION**, which is a hundred-fold slip that would
have rendered "APR 750%" and looked deliberate. Not inferred from a response — their validator says
it in as many words: *"Annual percentage: 7.5 means 7.5%"*.

**The shortest term rather than the highest rate**, because this pane's APR answers "what does money
put in now earn", and on a term product the nearest thing to *now* is the shortest lock; the highest
rate is an upsell you cannot have without committing longest. `listLockOptions` already orders
`days ASC`, so `[0]` is the server's ordering rather than a sort of ours.

**IT IS 0% ON THIS DELIVERY AND THAT IS THE CORRECT RENDERING.** Nothing seeds `vault_lock_rates`,
so there are no terms on offer.

**BOTH RETURN COLUMNS STAY ZERO, AND NOT FOR WANT OF AN ENDPOINT.**
`GET /user/vault/interest` is the accrual ledger and answers fine — it just answers empty for good:
`VaultInterestHistory` is **read** in three places in `vault.service.js` and **written in none**, and
a grep of the whole delivery finds no accrual job. A request per pane load that can only ever return
`[]` buys nothing, so the path is declared in `endpoints.js` and not called.

**Neither transfer was wired**, and the reason is the product rather than the plumbing: `transferIn`
needs a `lockPeriod` this pane has no control for and there are no terms to name, so it could only
answer `VAULT_LOCK_PERIOD_NOT_FOUND`; `transferOut` needs a `depositId` where this pane sends an
amount, and refuses outright while the term runs. Both buttons already stop at the original's own
disabled gate, which is a better place to stop than at a write that can only fail.

**One line of UI changed and it changes nothing the original renders.** The pane prints
`returnRatio * 100` raw, which is fine for every value bc.game's server sends — `0.05 * 100` is
exactly `5` in IEEE754. It stops being fine once the ratio is built from a percentage: `0.035 * 100`
is `3.5000000000000004`, printed in full. Rounded at the rate's own `DECIMAL(10,4)`, so no digit can
be lost and every original figure is byte-identical.

### Withdraw — already as live as it can get

Surveyed rather than assumed. Four things the form needs and three need nothing new:

- **the balance** — already live since the account step.
- **the token list** — their equivalent, `GET /api/v1/user/crypto/chains`, **is not a data route**.
  It is a signed passthrough to **CCPayment**, and this delivery ships `CCPAYMENT_APP_ID` and
  `CCPAYMENT_APP_SECRET` empty, so it **500s before it reaches the wire**. Probed, along with
  `/user/crypto/coins`, which fails identically. `data/currencyTokens.js` stays — and it is a real
  captured `system/conf` response for all 89 coins, not a stand-in.
- **the fee** — derived from those rows, so it moves with them.
- **the submit** — there is **no player HTTP route that files a crypto withdrawal at all**.
  `/user/withdrawals/crypto` is the *history*; the only writes are the staff `decision` pair. The
  player's submit is the socket event `SUBMIT_NEW_WITHDRAWL`. Standing up a second transport for one
  button that is not built is not the trade. (`/user/withdrawals/fiat` **is** a real POST, but the
  fiat arm of this form is not built either.)

### Deposit — the invented table is gone

`NETWORKS` was ten hand-written coins that said of themselves *"Everything else is made up. Do not
quote these figures anywhere."* It is **deleted**; `networksFor` now reads `data/currencyTokens.js`,
which has carried `depositLimitAmount` and `canDeposit` since the withdraw pass specifically so this
would be a data swap and not another fetch.

**And it checks out on the one row that had evidence.** VTHO was the only entry with a capture behind
it — 360 minimum. The captured row reads `depositLimitAmount: "360"`, to the digit, which settles
that this is the field the notice prints. It also **corrects** the other two fields: the chain is
`VET` and the label a bare `VTHO`, where the invention had guessed `VTHO` / "VeThor (VTHO)". ETH goes
from 2 guessed chains to its real 10, and `canDeposit` is filtered on rather than assumed — USDT's
PLASMA chain is withdraw-only and is now correctly not offered.

**The platform cannot supply this, or the two things still invented.** Its chain table is the dead
CCPayment proxy above; its **deposit address** is a socket event (`GET_ADDRESS`), not an HTTP route;
and its **fiat channels** come from `GET /user/payments/methods/:provider`, which answers
`PAYORDER_PROVIDER_DISABLED` for every one of the five gateways it registers (`waypay`, `apay`,
`cricpay`, `upi`, `ccpayment`) because every API key ships empty. Probed on two. That refusal is
well-named and deliberate — the platform saying no provider is configured, which is a state to
respect rather than invent around.

**Verified** — 20/20 live and 9/9 fixtures-on. The two live vault assertions that matter most were
vacuous on an empty delivery (no terms, no deposits), and seeding real ones needs `config:write`
which the demo admin cannot reach without 2FA enrolment — so rather than write to their database the
fetch was stubbed with exactly what the live routes answered plus the rows an operator would add,
proving the join (`INR` → the `INRFIAT` row at 250.00000000), the 0-not-undefined default, the
shortest-term choice (7d @ 3.5% over 30d @ 7.5%) and the ÷100.

---

## 09 · Bonus rewards & VIP position — **done**

**Changed** — `src/services/rewards.js`, `src/services/auth.js`, `src/services/endpoints.js`, and
one arm of `src/pages/Bonus/Rewards.jsx`.

The first platform read that answers a built page with something other than zeros. `/bonus` had
been rendering the service module's own declared default — six reward rows, all empty. **Four of
the six are now real**, and the two that are not keep that default rather than being invented.

| bc.game type | platform |
|---|---|
| `daily_bet_back_bonus` | `GET /user/bonus` → `types.daily` |
| `weekly_bonus` | `types.weekly` |
| `month_bonus` | `types.monthly` |
| `rakeback` | `GET /user/rakeback` — its own module, and its own currency |
| `instant_bc`, `level_up_bonus` | no equivalent; declared default, unchanged |

**`extra.nextClaimTime` IS THE "still accruing" STATE, NOT DECORATION**, and that is what makes the
mapping a placement rather than a copy. `RewardStatus`'s arm order is the chunk's: a recurring type
carrying that instant prints **In Progress** and the amount arm never runs. So it is kept while
`claimable` is false and **dropped** when it is true, which is what lets the figure and the Claim
affordance appear. The instant itself stays derived from each bonus's own stated drop rule, because
the platform publishes no next-claim time at all.

`eligible` is deliberately **not** consulted: it answers "does your VIP level reach `minVipLevel`"
(20/25/30 for the three) — whether the bonus can ever pay, not whether there is anything to take —
and bc.game renders an ineligible row exactly as it renders an empty one.

**A zero amount produces no item at all**, and that reaches past this page: the account dropdown's
gift counts `canClaim ? items.length : 0` and branches on it, so an empty-but-claimable row would
light the badge for nothing to claim.

**One arm of the UI was finished rather than changed.** The row's right-hand column had a hardcoded
`amount={0}` — correct for as long as every entry came from the declared default and so had empty
`items`, which made the zero arm the only reachable one. It now sums the entry's items, which is the
chunk's own last arm. An empty `items` still sums to 0, so the fixture path renders byte-identical.

### The VIP position — and the two levels that disagree

The header ring, `/user/enter`'s card and the `/bonus` level card all read `currXP` against
`levelStartXP`/`levelEndXP`. `GET /user/profile` carries only `level`, so `currXP` sat at the band's
**floor** and every ring on the platform read 0% — honest, and flat for every account.
`GET /user/bonus` answers the missing half.

**THE PERCENTAGE IS USED RATHER THAN THE FIGURE, AND THAT IS THE POINT.** The platform measures
progress in **wager** and bc.game measures it in **XP**; the two scales have nothing to do with each
other, so `wager` cannot be written into `currXP`. A fraction of the way through a level is the one
quantity both express, and it is exactly what the ring draws.

**THE PLATFORM HAS TWO VIP LEVELS AND THEY DISAGREE ON THE SAME ACCOUNT IN THE SAME SECOND.**
`/user/profile` answers `level: 1` for `demo_player03` while `/user/bonus` answers `vip.level: 0`.
Not a bug: `users.level` is a **stored** column an operator sets, while the bonus module **derives**
its level from lifetime wager (`vipLevelFor(#wagerAmount(wager))`) — a seeded account can be granted
a level it has not wagered its way to.

The derived one is taken, for the band and for `vipLevel` itself, on two grounds:

- it is what the platform's **own gates** use — `eligible` is `vip.level >= spec.minVipLevel` and
  the claim refuses on the same comparison — so a badge reading off the other column would promise
  a bonus the server then declines;
- it is the only one that comes with a position. Mixing `profile.level`'s band with
  `bonus.vip.progressPct` would draw a fraction of one level inside the bounds of another, which is
  wrong by construction rather than merely imprecise.

`profile.level` is the fallback when the bonus read fails — and **that read is the only one of the
four in `loadAccount` allowed to fail**. The other three each carry something the shell cannot
render without; this one refines a figure that already has an honest fallback, so a 500 must not
cost a visitor their session.

`bonusCurrencyName` comes from the same response (`BJB` on a demo account — a token bc.game does not
carry, so its mark falls through the coin glob to the blank disc, the same fallback `BC` already
takes on that page).

**Verified** — 19/19 live and 3/3 fixtures-on. The states this account cannot reach (a claimable
row, an accrued-but-not-due row, a mid-band VIP position) were proved against stubs in the server's
own shape, since every figure on a fresh demo account is zero.

**Not wired**, each a real route behind UI that is not built: `POST /bonus/claim/:type` and
`/rakeback/claim` (the buttons stop at the original's own disabled gate), the redeem-code family
(`codes`, `events`, `games`, `history`, `record`, `redeem`), and the gift's dropdown panel — which
becomes reachable the moment something is claimable, so it is the next thing this feature needs.

---

## 10 · The gift's bonus panel — **done**

**Changed** — `layouts/MainLayout/Header/AfterLogin/BonusPanel.jsx` (new),
`components/shared/BonusCurrencyAmount/` (new), `pages/Bonus/claimAll.js` (new), plus the gift's
own shell in `AfterLogin/index.jsx` and one field in `services/rewards.js`.

Step 09 made a bonus claimable for the first time, and that turned a documented gap into a live
one: the gift's click has two arms — navigate to `/bonus` when nothing is claimable, **toggle a
panel** when something is — and the second arm pointed at a component that did not exist. This
builds it.

**Nothing here is inferred.** `notification-shell-BOaO8MP0.js` came off `hash.game/assets/` (6.8 KB
and barely minified), along with `use-claim-all-Dbi11oaE.js`, `bonus-currency-amount-CgQhatqc.js`
and `index-CUb2-xA-.js` for the row's amount renderer. Every class list, every string and every
number below is the chunk's.

### The panel

Three blocks in one `bonus-scope flex flex-col` column: a **sticky** header carrying Total
Claimable and a Claim All button, one row per claimable ITEM between them, and a **sticky**
"View All Bonuses ›" footer. Both bars are `bg-layer1` — which is why the layer paints layer1 on a
desktop and **nothing at all** on a phone: the bars supply the fill and the panel's own wrapper
adds the rounding there.

**THE SHELL DOES THREE THINGS BY HAND RATHER THAN LEAVING THEM TO THE DROPDOWN IT RENDERS**, and
all three are reproduced:

- The popover is handed **`setVisible: () => {}`**, a deliberate no-op, so it cannot close itself —
  **a CAPTURE-phase listener on `document` owns the closing**, ignoring anything inside the trigger
  or the layer. Capture rather than bubble is not a detail: a row inside the layer stops
  propagation, so a bubble listener would never see the clicks it is meant to ignore.
- **`lock-scroll` on `<body>`, on a phone only**, and removed on unmount whichever width it opened
  at — the chunk registers both.
- The layer's geometry: `!w-screen` under `sm` against `sm:!w-[26rem]`, `max-h-[21rem]`, 16px from
  the trigger on a phone and 30 on a desktop, and z-index **98 below the header and 1001 above it**,
  which reads as a typo and is not.

### `BonusCurrencyAmount` is not `CurrencyAmount`

Worth stating because both live in this project now and they are different components from
different chunks. `CurrencyAmount` (`R` in `claimable-item-detail`) is a coin mark beside a figure.
This one (`X` in `bonus-currency-amount`) is the figure **alone, split into three spans** — prefix,
digits, suffix — so the digits can truncate while a currency symbol or a ticker stays legible.
`Y`, the splitter, is ported whole because every part of it is load-bearing: the target is the
account's display currency unless the call site names one, **precision is decided by the target**
(CLDR's own `maximumFractionDigits` for a fiat code, 7 for a crypto one), `formatToParts` is what
makes the split possible at all, rounding is truncation throughout, and a non-zero amount that
truncates away prints **`< 0.0000001`** rather than `0`. Its ResizeObserver-driven tooltip is the
one part not ported — this build has no tooltip primitive, and the visible result is identical
until a figure is wide enough to clip.

### One field, and why it is recovery rather than invention

A row prints the ENTRY's `rewardTypeName`, which the live payload carries and the platform does not
send. `REWARD_TYPES[type].title` is the chunk's own i18n title for exactly that type ("Daily
Bonus", "Deposit Rakeback") — what the server would have sent — and the `/bonus` page reads the
same map directly, so the two surfaces cannot disagree.

Two smaller mappings are recorded at the code: an item with no platform id is **keyed on its reward
type** (the platform issues one figure per type, so it is unique for the same reason, and only a
React key and the unbuilt detail flow read it); and `rewardItemType` stays absent, which costs
nothing because the panel **flattens** the groups — `o().flatMap(a => a.data)` — so the grouping
exists for the claim-all success popup, which is not built.

**Verified** — 29/29, rendered rather than asserted on source: the formatter's four arms, the
grouping and the total (12.5 + 1.25 USDT → `$13.75`), the panel's markup against the chunk's own
class lists, the empty state, and the shell's three hand-rolled behaviours. The fixtures path is
unchanged: nothing is claimable there, so the gift still navigates and the panel never opens.

**Not built:** the `track` emit (`O.emit("track", …)` — no event bus here), the claimable-item
detail flow a row opens, and Claim All's write, which stops at the original's own
`unclaimedCount === 0` gate.

---

## 11 · Transaction — the Deposit and Withdraw rows — **done**

**Changed** — `pages/Wallet/Transaction/index.jsx`, `pages/Wallet/Transaction/status.js` (new),
`services/transaction.js`, `services/endpoints.js`.

The one genuinely half-built thing in the project: the pane's Deposit and Withdraw tabs had their
filters, their column headers and their empty state, and no row renderer — step 06 deferred them
because no fixture could reach a row. `GET /user/history/deposits` and `/withdrawals` answer, so
now one can.

**Nothing here is inferred.** `me` in `index-BnY4Y-60.js` and `Re` in the pane's own chunk, with
`getDepositOrderStatus-CoPuz2eA.js` and `getWithdrawOrderStatus-D8AKKocq.js` beside them, all off
`hash.game/assets/`.

### The two rows are not one component with a prop

Every difference is the chunks' own:

- **A deposit prints two different amounts** — `isSuccess ? receiveAmount : amount`, what arrived
  once it has and what was sent while it has not. A withdrawal prints one.
- **The signs are opposite and asymmetric.** Deposit is `+`/success at both widths; withdraw is
  `-`/error on a desktop and `auto`/`auto` on a phone, so a refund reads as a credit there.
- **A deposit's row is wrapped.** Its anchor sits inside a `border-b border-third` div so the UTR
  verification line can share the rule; a withdrawal's anchor carries the border itself.
- Their status cells differ by exactly one class: `text-secondary` on withdraw, not on deposit.
- The mobile headers differ too — deposit's second column is one div reading "Amount/Status".

### Seven tables behind two routes

Their `transactionHistory` module merges four deposit rails and three withdrawal rails in memory
and answers **one row shape** — `{id, reference, amount, currency, status, details, date, kind,
method, type}`. The mapping onto bc.game's row is mechanical except for one field.

**`status` IS A NORMALISED WORD AND BOTH MACHINES SWITCH ON AN INTEGER.** Two ways to bridge that,
and the one written turns the word into the code that already means it, because **the machines are
the source of this pane's status vocabulary** — the text, the colour, and the `isSuccess` that
decides which of two amounts a deposit prints. Rendering the platform's word directly would put
strings on screen that no bc.game status ever produced ("approved" where the site says "Success")
and would need a second colour table beside the one already there. An unmapped word falls to each
machine's **own** default — "Failed" for a deposit, "Unknown Status" for a withdrawal — rather than
to a shared one.

The mirror of that adapter runs on the REQUEST: the filter stores bc.game's vocabulary
(`success`/`progress`/`fail`/…) and the platform matches `approved`/`pending`/`failed`. An unmapped
filter value is **dropped rather than guessed at**, which shows every row instead of silently
showing none.

**THE TIME FILTER REACHES THE SERVER ON THESE TWO TABS AND NOT ON THE BILL TAB.** These routes take
`from`/`to` as ISO-8601 where the wallet ledger takes no date range at all — so the same control is
live here and inert one tab over, which is the platform's shape rather than an inconsistency of
ours. bc.game's own 60-day clamp still sits in front of it.

**Four fields are deliberately left off the mapped row.** `mode` gates the fiat UTR-verification
line and `ticketId`/`unReadMsgCount`/`ticketStatus` gate the support-ticket chip — both bc.game
features with no platform equivalent, and leaving the fields absent is what makes the two `<Show>`s
correctly render nothing. `receiveAmount` is set equal to `amount` because the platform reports one
figure: equal values keep the deposit row's arm honest rather than inventing a difference between
what was sent and what arrived.

**Verified** — 29/29 live and 15/15 fixtures-on. The live pass proves the transport and the request
against the real gateway (the window sent as `from`/`to`, `INRFIAT` sent as bare `INR`, `success`
sent as `approved`, an empty filter dropped rather than sent as `""`, and the empty state for an
account with no history); no demo account has a deposit or withdrawal row on any rail, so the
mapping and the markup were proved against stubs in the platform's own row shape.

**Not built:** Swap and Buy Crypto's row renderers — neither feed answers on either backend — and
`/wallet/<type>-detail`, which both rows link to. The href is left as the chunk's for the reason
the bet-history row's `/game-detail/` link is: the path is right and only the page is missing.

---

## 12 · KYC status · 2FA — **done**

**Changed** — `pages/Settings/Verification.jsx`, `services/settings.js`, `services/endpoints.js`,
plus two PNGs off the account remote. **2FA needed no change at all** — see below.

### 2FA was already live, and this is the finding rather than the work

The Security tile branches on `session.google2StepAuth`, which `services/auth.js` has filled from
the profile's `twoFactorEnabled` since step 02. `GET /user/2fa/status` answers `isEnabled` — the
same column, the same question — and the two agree on the running server, checked rather than
assumed. So the read is **declared in `endpoints.js` and deliberately not called**, alongside its
four writes (the enable/verify flow, which is not built). `hasInitiated` is the one field the
profile does not carry, and no bc.game tile has a half-enrolled state to show it in.

### KYC — the objection that held it back is answered, not overruled

Step 04 left this unwired with a reason: the platform has ONE status and this pane draws a
two-level ladder, so wiring it would mean synthesising two levels from one.

**It would not — their KYC *is* the basic level.** Their submission is a name, a date of birth, an
address and one identity document, and there is **no `level` field anywhere in the module**. That
is bc.game's Basic Verification exactly. Advanced (proof of address, source of funds) has no
equivalent there and stays at `none`, which is true rather than a placeholder. One record maps onto
the one level it corresponds to and nothing is invented.

The other half of that note was right, and is why this took building rather than a one-line read:
**the pane branched on nothing but `levelResults.length`**, so a live status changed no pixel until
its arms existed.

| platform | card |
|---|---|
| `Verified` | `approved` — the card BODY is replaced by a success illustration; no rule list, no action row, no review time |
| `Pending` | `pending` — an amber ribbon over the same body, with the action row disabled so a second submission cannot land on the first |
| `Rejected` | `rejected_retry` — a red ribbon (not the amber one), the failure heading and the reason, and a retry row |
| `NotSubmitted` | `init` — the capture's arm |
| `Unverified` | `init` |

**`Rejected` goes to retry rather than final**, because their `review` route can set `Rejected`
again after a resubmission — there is no terminal state there — and the final arm brings an Appeal
card with a flow behind it that does not exist. **`Unverified` goes to `init`** with the rest of the
not-yet arm: their `KYC_STATUSES` spells it as a state a record can be *created* in, not one a
review produces, so a card reading "Verification Failed" for it would be inventing a refusal nobody
issued.

Five arms are written and the fifth, `rejected_final`, is unreachable from this platform — kept
because it is a genuinely different card (no reason, no retry) and a state machine that is half a
machine is worse than one arm too many. Two stay unbuilt because each brings a route that does not
exist: `isManualPending` and `isKycUsed`. An unrecognised status renders **nothing** for that card,
which is the chunk's own `fallback: null` rather than a defensive default.

Both illustrations are the deploy's own files (`kyc_success`, `kyc_fail`, off
`hash.game/modules/account/assets/`), and the chunk's obfuscated anti-tamper snippet inside `u1` is
deliberately not ported — the same call Vault Pro's `ht` got.

**Verified** — 25/25 live and 4/4 fixtures-on, rendered rather than asserted on source: every arm
reached **through the real mapper** with the platform's own response stubbed, so the mapping and the
markup are checked together. The fixtures pass is the regression that matters — the pane must render
exactly what it always did, with no ribbon, no illustration and no rejection copy.

---

## 13 · Casino — BC Originals — **done**

**Changed** — `services/originals.js` (new), `services/endpoints.js`,
`pages/Casino/catalogue.js`, `pages/Casino/index.jsx`, `pages/GameList/catalogue.js`,
`pages/GameList/index.jsx`.

### Why only BC Originals

The platform has **three** catalogues and one of them is populated — and that split is bc.game's
own. BC Originals are the house's games; Slots, Live Casino and Game Shows are third-party. **So
BC Originals is exactly the half the platform has.**

| | | |
|---|---|---|
| in-house | `GET /casino/js-games/v1/games` | **20 active. Seeded.** |
| GIS / Slotegrator | `GET /casino/games` | 0 — `GIS_MERCHANT_ID`/`GIS_MERCHANT_KEY` unset |
| Casino Hub | `GET /casino/catalogue/*` | `CATALOGUE_NOT_CONFIGURED` |

The two empty ones are **unprovisioned, not unseeded** — the CCPayment and PSP pattern again — so no
seeding fills them; they need a sync against real merchant credentials. Every other tab keeps its
transcribed set, because twenty coverless tiles under "Slots" would be worse than the real list.

**Three surfaces, one read**: the lobby's BC Originals row, the `/casino/brand` tab, and
`/gamelist/brand`. Threaded as an optional argument through `gamesFor(tab, originals)` rather than
special-cased at each call site, so the tab and the page its All pill points at cannot disagree.

**`undefined` while the read is in flight falls through to the transcription; `[]` does not.** An
empty array is a real answer and is honoured — the tab is never momentarily blank on a slow read,
and is correctly empty if the platform ever returns nothing.

### The artwork is local and the list is not

`game_icon` is **null on all twenty rows** — there is no artwork anywhere in the delivery — so
covers come from this project's own 615 files, joined by slug. **15 of 20 resolve.** Three aliases
where the two spell the same game differently (`mine`→`mines`, `tower`→`tower-legend`,
`videopoker`→`video-poker`), and underscores become hyphens.

**THE OTHER FIVE ARE DELIBERATELY NOT ALIASED.** `single_keno`, `highlow` and `magic_wheel` would
take Keno's, Hilo's and Wheel's covers — three tiles wearing another game's artwork, which reads as
correct and is not — and `diamond` and `goal` have no bc.game original of that name at all. They
come through with a real name and the tile's own BC placeholder.

The platform's `game_name` wins, so an operator renaming a game there moves the grid. The
transcription still supplies what the platform does not carry: the studio the Providers filter
groups on, and the badge. **`players` is 0 rather than the transcription's snapshot** — that counter
is the live site's own, and printing it beside this casino's game list would be inventing traffic.

### One correctness fix this exposed

**The lobby row and the casino tab both resolved artwork through `assetFor`, which never returns
nothing** — it falls back to keyword-and-hash matching. Harmless while every transcribed game had
its own file, and wrong the moment a game can arrive without one. Both now use exact resolution
(`assetExact` in `toRow`, `exactArt` on the tab's `GameGrid`), which is what the Explore panel and
the list pages already did.

**Checked before changing it: not one game in any of the twelve transcribed tabs loses an image**,
and no row of `data/games.js` either. So it is a no-op for every fixture surface and a fix for the
live one.

**Verified** — 23/23 live and 19/19 fixtures-on: the pending-vs-empty fallthrough, the override
reaching only `brand` on all three surfaces, every mapping rule including the three aliases and the
three deliberate non-aliases, 15/20 covers with **no two games sharing one**, and the fixtures pass
proving the transcribed 63 render exactly as before.

**Not wired:** the two aggregator catalogues (declared in `endpoints.js` so the next person probes
rather than re-derives), and `POST /casino/catalogue/launch` — this build has no game view, so a
tile's href stays bc.game's own `/game/:slug`.

---

`docs/backend-gaps.md` is the plain-language version of the two sections below, written for
whoever extends the backend: what is connected, what is ready but unused, and what has to be built.

## 14 · Latest Bets · profile statistics · recently played — **done**

Three more reads wired, and **the interesting part is what wiring them exposed** — all three bugs
were invisible until a live feed had rows in it.

| | |
| --- | --- |
| `GET /casino/bet-history/live` | **WIRED** — the home page's Latest Bets. Public, so it needs no token. `userName` is not in the payload (it is a public feed) and lands on bc.game's own `HIDDEN_NAME` sentinel, which the row already renders as "Hidden". |
| `GET /casino/bet-history/stats` | **WIRED** — the profile's Total Bets / Total Wins. `betAmountUsd` stays 0: no reachable route carries a per-player wagered total, and `wager/progress`'s is not one (see below). |
| `GET /casino/games/recently-played` | **WIRED**, and correctly empty — only the GIS launch path writes that table and GIS is unprovisioned. |

### Three bugs, each found by real data rather than by reading

**The bet-history pane was silently dropping every live row.** It reads bc.game's field names
(`type`, `time`, `payout`, `currencyName`, `distributeId`) and the platform answers with
`transaction_timestamp`, `amount`, `currency_code`, `game_title`, `id` — only `profit` is spelled
the same. It did not surface as blank cells: `truncateBetPage` drops any row with no `time`, so the
pane rendered its empty state exactly as it does with no bets at all. `toBetRow` in
`services/betHistory.js` is the adapter, and `services/home.js` maps the live ticker through the
same function — the two feeds spell the same three values differently (`reference`/`game`/`at`).

**Vault Pro crashed on a live cold load.** `TransferPanel` seeded its selected coin with
`useState(() => options[0])`, and `options` is empty on the first paint of a live session — the
wallet arrives from `/user/wallet/balances` a beat after the shell mounts, and until it does every
row carries the visitor list's `display: false`. The initialiser captured `undefined` and never
corrected, so `getAlias(undefined)` threw. Fixed both ways the loading notes prescribe: derive
during render from a `null` sentinel, and mount the form only once its data has landed.

**The header pill opened on `0 BTC` for an account holding ₹9,769.** `authenticate` passes the
current account as `previous`, and a VISITOR's `setting.currencyName` is `ACCOUNT_DEFAULTS`'
shipped BTC — which `SessionProvider` persists on its first mount, before anybody has clicked
anything. `pickCurrency` honoured it because the platform's wallet does carry a BTC column. Now
only a signed-in `previous` carries a preference, which is what the sign-out rule already said.
**This one was invisible to every service-level check** — `auth.login` with no `previous` picks the
funded coin — and was found in a browser screenshot.

---

## No backend at all — permanently on fixtures

Not gaps to fill; there is no route and no table. Listed so nobody goes looking.

**VIP Club · Quest Hub · Weekly Raffle · Daily Contest · Free Plays · achievements and medals ·
promotions · the notification drawer · favourites** (recently-played exists; favourites does not).

**Sports** is a different domain, not a missing route: theirs is a cricket exchange with fancy
markets, exposure and scorecards; ours is BetBy. Nothing maps.

**Chat** is socket-only (`ADD_CHAT`, `CHATS`) and has **two rooms** — `global` and `brazil` —
against this build's 21.

---

## Backend gaps found while setting up

Both reported; neither is a configuration problem.

**Sports cannot boot.** `services/sports/src/modules/bets/bets.service.js` requires
`./legacy/oddsGuard`, `./legacy/marketName` and `./legacy/markets`, and that `legacy/` subfolder is
**absent from the delivery** — checked against the original checkout under
`backend/test-automation-and-updated-admin/`, which is byte-identical. The worker exits at boot and
`scripts/dev.js` stops every other service with it, which reads as "the platform will not start".

**`scripts/setup.js` was patched** (the one backend edit, approved): `run()` and `capture()`
spawned `process.execPath` — `C:\Program Files\nodejs\node.exe` — with `shell: true` on Windows,
so `cmd.exe` split the command at the space and every database step failed with
`'C:\Program' is not recognized`. Inert off Windows, where `shell` is false. Re-apply if the folder
is ever replaced from source.

**Do not put a space in `DB_NAME`.** It half-works. `scripts/seed-test-logins.js` additionally
refuses any name not matching `/(test|restore|dev|local|sandbox|staging)/i`, so that one helper
will not run against `bc_games` — nothing else cares.

Four more found during step 08. None is a defect to report — three are provisioning and one is a
missing feature — but all four decide what a front-end can render, so they are recorded here rather
than being rediscovered.

**Every payment integration is unprovisioned, and the crypto one 500s rather than refusing.**
`.env` ships `CCPAYMENT_APP_ID`, `CCPAYMENT_APP_SECRET`, `APAY_API_KEY`, `UPI_API_KEY`,
`WAYPAY_MERCHANT_KEY` and `CRICPAY_MERCHANT_CODE` all **empty**. The five PSP gateways behind
`/user/payments/*` handle it properly and answer `503 PAYORDER_PROVIDER_DISABLED`; `/user/crypto/chains`
and `/user/crypto/coins` do not — they throw `TypeError: Cannot read properties of undefined
(reading 'raw')` out of `crypto.service.js:376` and surface as a 500. So there is **no chain,
network, minimum or fiat-channel data available from the platform at all** until a provider is
configured.

**Nothing accrues vault interest.** `VaultInterestHistory` is read in three places in
`vault.service.js` — the player list, the staff list and `stats` — and **written in none**; a grep
of the whole tree finds no job, no cron and no service that credits a deposit. `vault_lock_rates` is
likewise unseeded, so there are no terms to open a deposit against either. Both routes answer
correctly; they answer empty.

**The demo staff account cannot log in.** `POST /admin/auth/login` (note: `email`, not `identifier`)
answers `403 STAFF_AUTH_TWO_FACTOR_ENROLMENT_REQUIRED` for `admin@ibitplay.local` — the role requires
2FA and enrolment has to be started by another administrator. So nothing behind `config:write` is
reachable from a fresh `--demo` setup, which is what stopped step 08 seeding vault terms to test
against.

---

## How to verify a step

There is no test framework and no localhost preview from this environment, so each step is checked
with a throwaway harness — about ten minutes to write, deleted afterwards.

**Service level.** `vite.createServer({server: {middlewareMode: true}, appType: 'custom'})` then
`ssrLoadModule('/src/services/<name>.js')`, with `localStorage` stubbed on `globalThis` and
`process.env.VITE_*` set before the import. That is what resolves `import.meta.env`, the CSS
imports and the PNG imports; nothing else will.

**DOM level.** Same server, plus `happy-dom` installed **in the scratchpad** (never the project),
`ssrLoadModule('/src/App.jsx')`, and `createRoot` + `MemoryRouter` — not `renderToStaticMarkup`,
which refuses portals and so rules out every dialog route. Copy the DOM globals only; copying
happy-dom's timers breaks Vite's own. A chained read needs more than one `await act(...)` pass.

**Always run the fixtures-on pass too.** `VITE_USE_FIXTURES=true` must render exactly what it did
before the step — that is what proves the seam stayed a seam.

Then `npx eslint src/` and `npm run build`.
