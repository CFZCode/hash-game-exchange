# What the backend gives us, and what it still needs

This is a plain-language check of the iBitPlay backend in `backend copy/` against this front-end.
It answers three questions:

1. **What is connected already?**
2. **What does the backend have that we are not using yet?**
3. **What is missing in the backend and has to be built?**

Written for whoever will add to the backend. No front-end knowledge needed.
The long technical version is in `WIRING-PLAN.md` and `docs/data-layer.md`.

## Keep this file current — it is part of the work, not a report on it

**Any change that moves a feature between the four states below updates this file in the same
pass.** Wiring a page to a live route, adding or fixing something in `backend copy/`, discovering
that a route answers differently than recorded — each of those makes a line here wrong, and a
line here that is wrong is worse than no line, because every later decision is taken from it.
This has already bitten: `bank-details/:coin` was recorded as "wiring it would show nothing" long
after it had a row in it, and the Part 2 history lists were recorded as empty after this project's
own testing had filled two of them.

Concretely, when a change lands:

- **Wired a page to a live route** → move its row from Part 2 into the Part 1 table, and say what
  the platform's version of the feature does NOT do where it differs from bc.game's.
- **Changed anything in `backend copy/`** → add a numbered entry to Part 4b saying what was added
  and why, and mark the Part 3 gap or Part 5 defect it closes rather than deleting it. Nothing in
  this file is deleted when it is fixed; it is marked `FIXED` with a pointer, so the reasoning
  survives.
- **Probed a route and got something new** → correct the claim wherever it appears, not only in
  the run log. A finding recorded once in a dated section and left contradicting the tables above
  it is how this file goes stale.
- **Ran the harnesses** → update the run section, and say whether a failure is a regression or a
  known expiry. Do not loosen an assertion to make a number look better.

The four-state table below is the vocabulary. If a change does not move anything between those
states, it does not need a line here.

Checked against `backend copy/docs/api-surface.json` (**613 routes**, regenerated 2026-09-04 after
the Tier 1–3 work) and the service code itself, not from memory. The audience split is
**302 admin, 35 internal, 105 public, 171 player** — so **276 routes a signed-in player can
actually reach**, not the 311 a naive count gives. 311 is every route that is not admin, and it
counts the 35 internal ones, which the gateway blocks.

**It was 590 and 254 before this session.** The 23 added are the Tier 1–3 routes in Part 4b.8–16 —
registration and password reset, the notification inbox, device revocation, change-email, the VIP
ladder, the contest board and public top wins, one bet, the public profile, the withdrawal
whitelist and the rollover task list. Regenerate with `node tools/api-surface.js` (and
`--check` in CI); it rewrites `docs/API-ROUTES.md` too, which is the file the backend team reads.
That block is not a detail: it is the whole reason gaps 7, 10, 13 and 18 below are gaps.

**There is a second delivery in the tree.** `backend/test-automation-and-updated-admin/` adds the
Addaplay front-end, an updated admin panel, test automation, and a `legacy-hotfix/` for the legacy
deployment that is still serving traffic. Its `backend/` subtree is **the same code** — a
`diff -rq` across the whole tree returns exactly three differences, and none of them is a route or
a service:

- `.env` — only in `backend copy/`, being local config;
- `services/user/storage` — only in `backend copy/`, a runtime artefact;
- `scripts/setup.js` — **`backend copy/` carries the Windows patch from Part 5.4 and the new
  delivery does not.** That is the concrete "re-apply if the folder is replaced" that Part 5.4
  warns about, so anyone setting up from the new delivery on Windows will hit that failure.

So every finding in this file applies to it unchanged, the missing sports `legacy/` folder in
Part 5.1 included. Nothing in it needs re-auditing.

---

## How to read this

Every feature is in one of four states:

| State | Meaning |
| --- | --- |
| **Connected** | The page asks the backend and shows the real answer. |
| **Ready** | The backend route exists and works, but the page does not call it yet. Front-end work only. |
| **Missing** | There is no route and no table. Someone has to build it. |
| **Switched off** | The code exists but a key or a setting is empty, so it answers nothing. Config work only. |

One thing to know before reading further. This front-end talks to the backend over normal HTTP
requests. Some backend features only exist as **websocket events** (a different way of talking).
Those count as *missing* here, because the front-end cannot reach them as they are.

---

## Part 1 — What is connected today

These pages show real data from the backend right now.

| Page / feature | Backend route |
| --- | --- |
| Sign in, sign out, stay signed in after reload | `POST /user/auth/login`, `/logout`, `/refresh` |
| Profile (name, id, join date, 2FA on/off) | `GET /user/profile` |
| Wallet balances, the coin picker in the header | `GET /user/wallet/balances` |
| Money shown in dollars | `GET /user/exchange-rate/rates` |
| Settings → Security → device list | `GET /user/auth/sessions` |
| Settings → Preferences | `GET` / `PATCH /user/preferences` |
| Settings → Verification (KYC status) | `GET /user/kyc/status` |
| Swap (the quote and the actual swap) | `GET /user/swap/estimate`, `POST /user/swap` |
| Wallet → Transaction (money in and out) | `GET /user/wallet/ledger`, `/user/history/deposits`, `/user/history/withdrawals` |
| Wallet → Bet history | `GET /casino/bet-history` |
| Wallet → Vault (the numbers, read only) | `GET /user/vault`, `/user/vault/lock-options` |
| Bonus page: daily, weekly, monthly, rakeback | `GET /user/bonus`, `GET /user/rakeback` |
| VIP level and progress bar | `GET /user/bonus` (the `vip` part) |
| Referral: my code, team size, rewards total | `GET /user/affiliate`, `/team`, `/rewards` |
| Casino → BC Originals (20 house games) | `GET /casino/js-games/v1/games` |
| Home → Latest Bets | `GET /casino/bet-history/live` (public) |
| Profile → Statistics (bets, wins) | `GET /casino/bet-history/stats` |
| `/recent` — Continue Playing | `GET /casino/games/recently-played` (answers empty — see gap 2) |
| Settings → Security → Change Password | `POST /user/auth/change-password` (works; read gap 22 before counting failed attempts) |
| Opening a BC Original — the launch call | `POST /casino/js-games/v1/launch` (wired, but cannot succeed yet — see Part 4) |
| Home hero banner artwork | `GET /admin/banners` (public) + `/admin/banners/image/:type`. Answers `[]` on this delivery, so the captured artwork renders — see the note in Part 2 |
| Which currencies the wallet offers | `GET /admin/site-config/public` (public). The operator's own per-currency switches now gate the wallet and the header dropdown — see the note in Part 2 |
| Settings → Security → Enable 2FA | `POST /user/2fa/enable` + `/setup-verify`. The whole enrolment flow, on the original's own `twofa-bind` route — see `docs/settings.md` |
| Settings → Verification → Start New Verification | `POST /user/kyc/submit` (multipart). The application form, on the original's own `/settings/verify/:levelName` route — though bc.game's own body there is Sumsub's SDK, so the form is this build's; see `docs/settings.md` |
| Documents already on file, above that form | `GET /user/kyc/documents/:kycId/:field`. Authenticated, so the bytes are fetched with the token and turned into an object URL rather than put in an `<img src>` — see `services/kyc.js` |
| Settings → Account Info → Edit | `PUT /user/profile`. Username only; the original's dialog also picks an avatar FRAME, which is a shut feed with nowhere to save to — see `docs/settings.md` |
| `/bonus` → the Redeem field | `POST /user/bonus/redeem`. A code belongs to an ACCOUNT here, not to a campaign — see `docs/bonus.md` |
| Transaction → a deposit row → Deposit Detail | `GET /user/deposits/fiat` + `/:id/screenshot`. The link existed and fell through to Home; `adminComment` is the only place a rejection is explained — see `docs/wallet.md` |
| Transaction → a withdrawal row → Withdrawal Detail | `GET /user/withdrawals/fiat` and `/crypto`. Two rails with different shapes, and the link carries a `rail` because the merged ids collide — see gap 26 |
| `/bonus` → the Claim buttons and Total Claimable | `POST /user/bonus/claim/:type`, `/user/rakeback/claim`. No batch route exists here, so Claim All is one call per reward IN SEQUENCE — each credits a wallet, so a `Promise.all` would fire the rest into a state the first already invalidated |
| Referral → My Rewards → Claim | `POST /user/affiliate/rewards/claim-all`. bc.game has a whole withdraw SCREEN there; this platform's entire capability is one argumentless call, so the screen would be a form with no fields — see `services/referral.js` |
| Wallet → Vault → Transfer In / Transfer Out | `POST /user/vault/transfer-in`, `/transfer-out`. A DIFFERENT PRODUCT from bc.game's instant-APR vault: these are fixed-term deposits with a `lockPeriod`, and the terms table is unseeded (Part 4) so there is nothing to lock into yet |
| Home → the Continue Playing / Favorites block | `GET /casino/games/favourites` + `/casino/games/recently-played`. The original's `recent-and-like` batch read, composed from the two routes this platform has. **Renders as Favorites alone** — the history arm answers empty (gap 2) and an empty list gates its tab away; see `docs/casino.md` |
| `/favorite` — Favorites, and the star on a game page | `GET /casino/games/favourites`, `PUT`/`DELETE .../:gameRef`. **The first feature here whose backend had to be built** — there was no table, no route and no column, on this platform or in the legacy one it came from. Gap 1, closed; see Part 4b.7 |
| Settings → Account Info → Edit → Avatar Frame | none, and that is the finding. The ten-cell grid, its order, templates, "In use" pill and padlock are all in the original's chunk and are ported; what no route carries is which frames an account OWNS. Every ring renders locked, which is both a fresh account's state and the only truthful one here — see `docs/settings.md` |
| Wallet → Vault → Last Day Return / Total Return | `GET /user/vault/interest` (SmartBet, 2026-10-12). The old backend never wrote that table; SmartBet accrues daily, so the two columns are summed per coin from it (`vaultReturns` in `services/vault.js`) |
| `/deposit-offer` and the fiat tab's bonus chips | `GET /user/bonus/first-deposit` (SmartBet, 2026-10-12). One first-deposit bonus with amount tiers, not bc.game's four monthly stages. **`enabled: false` on this delivery**, so the live page shows its headings over no cards and the chips carry no bonus tag. Enabled + eligible → one card whose stages are the tiers, and the lowest tier feeds the chips |
| Deposit → Fiat tab → channels | none, deliberately (2026-10-12). Live mode shows the original's out-of-channels state instead of bc.game's six UPI channels: every PSP answers `503 PAYORDER_PROVIDER_DISABLED`, and the manual bank rail (`/user/bank-details/:coin` + `POST /user/deposits/fiat`) needs a bank reference and a screenshot this form has no fields for |

**Wallet area, checked against SmartBet 2026-10-12 and still not wired, with the reason:**
crypto deposit address and crypto withdraw submit (CCPayment unconfigured: `/user/crypto/chains`
answers `503 CRYPTO_NOT_CONFIGURED`, and the player's crypto withdrawal is a socket event, not an
HTTP route); the fiat withdraw arm (`POST /user/withdrawals/fiat` + `/user/bank-accounts` work,
but this build has no fiat withdraw form); Buy Crypto (no on-ramp route at all); the Swap and
Vault rows in Transaction (`/user/swap/history`, `/user/vault/transactions` answer, but the pane
has no row renderer for those types); one bet's details (`GET /casino/bet-history/:betId` works,
`/game-detail/:id` is not a route here); Rollover detail/cancel/types (no route); Manage Assets'
show/hide (no per-currency display setting on the backend).

Everything else on the site is still showing saved sample data.

---

## Part 1b — The front-end wiring, 2026-09-04

The routes in Part 4b.8–16 were built before anything called them, which is the right order — a
route with no caller is still a route, a caller with no route is a lie. This is the other half.
Verified by `verify-wiring.mjs` in the project root, 40 assertions against the running platform.

### Wired

| Feature | Route | What changed for a visitor |
| --- | --- | --- |
| **The Sign Up tab** | `POST /user/auth/register` | It reaches the platform. It used to swap a fixture because registration was socket-only — the form's own comment said so. **The form has no username field and the platform requires one**, so it is derived from the email's local part, sanitised to `[A-Za-z0-9_.-]`; a collision surfaces as the server's 409 rather than being retried with a suffix |
| **Password reset** | `/forgot-password`, `/reset-password` | Wired at the seam and NOT reachable: "Forgot your password?" is an `<a href="/login/forgot">` — the original's own href — and that route is not built here. Building it means designing a form the capture does not contain |
| **The notification drawer** | `GET /user/notifications` + three writes | Real rows, real unread counts, the bell's badge, and both writes. The adapter is in `services/notification.js` |
| **Settings → Security → Remove** | `DELETE /user/auth/sessions/:id` | The device list has been readable since the port with nothing able to act on it |
| **`/wallet/rollover`** | `GET /user/wager/tasks` | The pane showed a permanent empty state; it now shows the account's real requirement |
| **Settings → Whitelist** | `GET/POST/PATCH/DELETE /user/withdrawals/whitelist` + `PUT .../enforcement` | **Complete, 2026-09-04 — reads AND all four writes.** Add Address and the row pencil are their own dialog routes; the bin and the enforcement switch each raise the chunk's own confirm. See Part 4b.17 |
| **`/user/profile/:id`** | `GET /user/profile/:userId/public` | Name, avatar, VIP level and tier, join date and bet/win counts are real; everything else keeps `PROFILE_DEFAULT` |
| **`/free-plays`, Free Spins tab** | `GET /casino/gis/freespins/mine` | Was "Free Spins 0" over an empty state since it was built, because the only read it needed did not exist. See Part 4b.18 |
| **Home → High Roller tab** | `GET /casino/bet-history/top-wins` | It was showing **Latest Bet's data** — both tabs rendered one feed. Two feeds on the original, two now. See Part 4b.20 |
| **Settings → Security, six modals** | `POST /user/email/otp` + `/user/profile/change-email`; `POST /user/2fa/disable` | Every card opens a screen. Only those two can submit, and the e-mail one is blocked on SMTP. See Part 4b.19 |

**Two shapes had to meet in every case, and the adapters live in `services/`.** The notice is the
clearest: the panel is written against bc.game's `{afficheId, type, isTop, isRead, createTime,
contentV3}` and the platform answers a flat `{id, title, body, type, read, createdAt}`. The type
vocabularies are different sizes too — four numeric buckets against six names — so the mapping is
a judgement, written in one place so it can be argued with: money movements to Transactions,
promotions and bonuses to Promotions, everything else to System.

**One backend change came out of the wiring.** `GET /user/wager/tasks` gained `since` and
`currency`, because the table prints a date and a currency symbol and the task carried neither.
`since` is the FIRST approved deposit — the one that created the requirement. `currency` is
reported only when every contributing deposit agrees and `null` when they do not, which surfaced
something pre-existing: **`#totalApprovedDeposits` sums `fiat_deposits.amount` across currencies**,
so an account with an INR deposit and a EUR one gets a target that is the sum of two units. Not
introduced here — `getProgress` has always done it and the admin listing shares the definition —
but a row that has to NAME a currency is where it stops being invisible.

### The visual pass, and the one bug only it could find

`shot-wiring.mjs`, `shot-wiring-seeded.mjs` and `shot-drawer.mjs` drive the machine's installed
Chrome against the dev server and photograph each wired surface. They exist because **every
service-level assertion passed while a broken image was on screen**, which is the same class of
failure as the `0 BTC` wallet pill this project has hit before.

**The seeded pass is the one that matters.** Every wired page is legitimately EMPTY for
`demo_player03` — no favourites, no approved deposit, no notifications, no whitelist rows — and an
empty live page looks exactly like the fixture it replaced. So the second harness seeds one row per
surface, photographs, and removes them in `finally`.

**THE BUG: the rollover row rendered `+3,000 INR` beside a broken image.** The platform sends a
BARE currency code and this build keys money on the WALLET ROW — `INR` against `INRFIAT`, which
`docs/backend-gaps.md` Part 6 has recorded as a difference since the audit and which
`services/betHistory.js` already translates on exactly this boundary. The rollover adapter passed
the bare code straight through, so `coinIcon('INR')` missed and the cell drew a broken image next
to the amount. Now `isFiatCode(code) ? code + 'FIAT' : code`, the shared one-liner, applied in the
rollover row and defensively in the whitelist row too.

**My own assertion had pinned the broken value.** `verify-wiring.mjs` checked
`originalCurrencyName === 'INR'` and passed, because I wrote the test from what the platform sends
rather than from what the component needs. It now asserts the translation, which is the thing that
was actually wrong. **A test written from the producer's shape cannot catch a consumer mismatch.**

**One thing that looked like a bug and is not.** The bell shows no unread badge with three unread
notifications, because the dot is DELIBERATELY not drawn on this build — a requested departure,
with the one-line revert recorded in `Header/AfterLogin/index.jsx`. The drawer itself is fully
live: three tabs badged 1, 1 and 1, one per seeded notification, so the six-name-to-four-bucket
type mapping lands each row in the right tab.

What the shots confirm: the Favorites block on both Home and the Casino lobby with stars on the
three starred games and none on the padding beside them; the drawer with real titles, bodies and
timestamps; the rollover row reading `Wager 3x your deposits / +₹3,000.00 / Ongoing`; the whitelist
with "Whitelist Enabled", two masked addresses, their coin icons and networks; and the profile
dialog with the real name, id and `Total Wins 2 / Total Bet Counts 4`. No console errors on any
page, and no `NaN`, `Invalid Date` or `1970` anywhere.

### Not wired, and why

**These are not oversights.** Each is a route whose consumer does not fit it, and forcing one
would put something untrue on the screen.

- **`/user/vip/levels` and `/user/vip`.** `/vip-detail` is a MARKETING page — hero, video, perks,
  FAQ — and renders neither a 75-band ladder nor a progress figure. The player's standing already
  reaches the header through `GET /user/bonus`. There is nowhere for these to go until somebody
  designs a ladder screen.
- **`GET /casino/bet-history/top-wins` — WIRED 2026-09-04, to a different component than the one
  this entry was written about.** The objection below still stands for **Recent Big Wins**, which
  draws a player NAME and a VIP TIER on every card that the public route deliberately carries
  neither of. It does NOT stand for the home page's **High Roller** tab: that table has no VIP
  column and already renders every player as `HIDDEN_NAME`, the site's own word for a player it
  will not name. Same route, two consumers, one of which it suits exactly.

  Worth naming as a mistake in how this file was written rather than in what it says: "not wired,
  and why" listed a ROUTE and gave a reason belonging to one CALLER, so the reason read as a
  property of the route and the second caller went unconsidered for two passes. The tab showed
  Latest Bet's data the whole time.

  The original's own argument settles it: `ThrowAndHighRolles-C7GElDRJ.js` keys the panel on the
  tab — `highRoller` reads `/game/support/home/v2/high-rollers/` and `lastBet` reads
  `/game/support/home/last-bet/` — so these are two feeds there and were one here.
- **`GET /casino/bet-history/leaderboard`.** The Wager Contest widget is a PRIZE promotion: its
  rows carry `bonus` and `rate` and the page is built around a prize pool. This platform has no
  prize pool, so real standings would appear under prize columns reading zero. That is a product
  decision — whether to run a contest — and not one this port should make. **The route is ready
  the day a prize ladder exists.**
- **`GET /casino/bet-history/:betId`.** Bet-history rows do not open a detail on this build, so
  there is nothing to call it. Built for a row that has no click.

---

### Rewards area, 2026-10-12

| Screen | Route(s) | State |
|---|---|---|
| `/bonus` rows, Total Claimable, Claim, Redeem | `GET /user/bonus`, `/user/rakeback`, `POST /user/bonus/claim/:type`, `/user/rakeback/claim`, `/user/bonus/redeem` | Already wired (see above). Level-up and other bc.game reward types have no platform route and keep the declared default |
| `/bonus` level card | `GET /user/vip` | **Wired.** Name, percentage and "… XP to <next>" now come off the PLATFORM ladder (41 levels, Wood to Diamond); before, the level number was looked up in bc.game's captured ladder and printed bc.game's tier name. `services/vip.js` `getVipStanding` |
| `/vip-detail` | — | Marketing copy, no data to wire. `GET /user/vip/levels` still has no screen |
| `/promotions/daily-contest`, Home → Wager Contest | `GET /user/race`, `/user/race/daily/leaderboard`, `/user/race/history` | **Wired** (`services/contest.js`). Both races are `enabled: false` on this delivery, so the board answers 404 `RACE_NOT_RUNNING` and the widget renders its idle form: configured pool, Ended, 00:00:00, empty table. Running-race mapping checked against the service's own field names |
| `/promotions` + Archived | `GET /admin/promotions` (public) | **Wired** (`services/promotions.js`). Feed is empty on this delivery, so the page's Empty state renders. Tabs cut to All + Casino (`segment`); archived = `promoStatus: ended` or past `endsAt` |
| `/deposit-offer`, fiat tab bonus chips | `GET /user/bonus/first-deposit` | **Wired** (`services/bonus.js`). `enabled: false` here, so no offer and no chip bonus |
| `/free-plays` | `GET /casino/gis/freespins/mine` | Already wired; free bets have no provider |
| `/quests` | — | No backend (gap 5). Live mode now renders the empty states instead of bc.game's captured quests |
| `/promotions/weekly-raffle` | — | No backend (gap 6). Live mode keeps the copy but empties the ticker, tickets-sent count and past draws |
| Spin wheel | `/user/spin-wheel/*` | Backend complete, no screen in this UI |

Note: `GET /user/race/rewards` answers 403 `PROMOTIONS_NOT_FOR_AGENT_USERS` for agent-tree players such as `demo_player01`. That is by design and is not read by any screen.

## Part 2 — The backend has it, we are not using it yet

No backend work needed. Listed so nobody builds these twice.

| Route | What it could feed |
| --- | --- |
| `GET /admin/blogs`, `/admin/blogs/:id`, `/slug/:slug`, `/category/:cat`, `/:id/image` (public) | A blog with **3 real posts already seeded**. The sidebar's Blog row is an external link — this is the backend for an internal one |
| `GET /user/wager/progress` | Part of the Rollover page (see gap 14) |
| `GET /user/bank-details/:coin_type` | Saved payment methods. **It has a row now** (`INR`: bank name, account number, IFSC, UPI id), so the old note here — "wiring it would show nothing" — is out of date. What is missing is the pane's card TILE, which is front-end work; the payload is there and has been seen |
| `GET /user/swap/history`, `/user/bonus/history`, `/user/vault/transactions` | History lists we do not show yet. **Two of the three carry real rows now** — `swap/history` 5, `vault/transactions` 2, written by this project's own testing rather than by a seed. `bonus/history` is still empty |
| `POST /user/2fa/disable`, `/verify`, `GET /user/2fa/status` | What is LEFT of 2FA now that enrolment is wired. `disable` needs `{code, password}` and there is no unbind arm in the original's eight-way `:action` switch to port a screen from, so the tile's Disable label is still inert. `status` stays deliberately unread — the tile knows the answer from the profile |
| `GET /user/bonus/codes`, `/events`, `/games`, `/record` | What is LEFT of the redeem feature now the input is wired: the visitor's own code list and the campaign catalogue. `/record` answers `404 BONUS_NO_BONUS_RECORD` rather than an empty body, so it needs catching |
| `GET /user/affiliate/rewards/unclaimed`, `POST /user/affiliate/rewards/claim`, `POST /user/affiliate/team/join` | What is LEFT of the referral dashboard now that `claim-all` is wired. `claim` takes `{rewardId}` and claims ONE, which needs a per-row list this build does not draw; `unclaimed` duplicates a figure the summary already carries |
| `GET /user/payments/methods/:provider`, `/user/payments/orders`, `POST /user/payments/deposits`, `/user/payments/withdrawals`, `POST /user/deposits/fiat` | Deposit and withdraw. These exist and are correct; they answer nothing only because no provider is configured (Part 4). Read alongside gap 15 — that gap is smaller than it looks. Note `POST /user/deposits/fiat` is the one that MAKES a manual deposit request; the read side of it is wired |
| `GET /user/auth/me`, `/user/exchange-rate/convert`, `/user/wallet/history`, `/user/history` (combined), `/user/history/transfers`, `/user/swap/balances` | Declared in `src/services/endpoints.js` and deliberately not read — each duplicates something already fetched, or answers the wrong list. Listed so they are not mistaken for oversights |

**Site-config is no longer on this list either — it is wired**, and it is the flag map the
wallet now gates on. `GET /admin/site-config/public` answers **ONE FLAT OBJECT of 76 keys** —
about 72 booleans with the four decimal strings beside them — and NOT the `{flags, amounts}` an
earlier draft of this line claimed. Those are local variable names in `publicSettings()`, which
spreads them together before answering; the same mistake the banners note made, from reading a
service's variables instead of the wire. The group this build reads is one flag per wallet
currency, lower-cased
(`inr`, `aed`, `pkr`, `bdt`, `npr`, `mvr`, `eur`, plus `cryptocoin` as a master switch over every
crypto row), so an operator turning `pkr` off removes it from the wallet and the header dropdown.

**An absent flag means ON, and so does a failed read** — that rule is the backend's own
(`publicSettings()` defaults a missing row to `true`) and `services/siteConfig.js` extends it to
the harder case, because a 500 from a config route must never empty a wallet. Verified against a
real refusal: with `cryptocoin=false` in the database and the route answering `429`, all 28
currencies came back rather than the 6 fiats.

Still unread from that payload: the eleven `home_*` section switches (`home_heroSection`,
`home_latestwins`, `home_livecasino`, `home_popularslots`, `home_crashgames`, `home_leaderboard`,
`home_promocards`…), every game-category and provider flag, and the four `amounts`
(`registerbonus`, `affiliatebonus`, `comissionpercent`, `clubrake`). All of them are `true` on
this delivery, so gating on them is unobservable until an operator turns one off.

**The banners are no longer on this list — they are wired.** Worth reading before anything else
here is picked up, because the limit it ran into is the shape of the table rather than the route:
a `banners` row is an image and a unique `type`, and **none of its ten columns is text**. No
title, no description, no link, no tag, no sort. So the platform can choose a slide's artwork and
cannot supply the words on it; the captured text stays local and the read degrades to it
whenever the table is empty, which it is on this delivery. A row named `home_top_<n>` overrides
the nth hero slide's picture — a convention this front-end had to invent, since `type` carries no
server-side meaning and there were no rows to match. Full note in `docs/hero.md`.

**If banners are meant to be operator-driven end to end, that is a backend change**, and a small
one: `title`, `description`, `tag`, `link_url` and `sort` columns on `banners`, surfaced through
`#describe`. Until then the placement is all an operator controls.

### What is left after Part 2, and it is not nothing

Clearing the list above is not the same as wiring every route the platform answers. A sweep of all
**254 player-reachable routes** against `src/` left **51 that a built page could in principle call**
(56 before the deposit and withdrawal details were built), and they sort into three piles rather
than one:

> **RE-RUN 2026-09-04, and the numbers below are the old ones.** The census now reads:
>
> | | |
> | --- | --- |
> | modules with a `basePath` | 69 |
> | routes in total | 619 |
> | admin / internal / public / user | 307 / 35 / 105 / 172 |
> | **player-reachable (public + user)** | **277** |
> | player-facing modules | 50 |
> | **modules the front end never names** | **15, holding 78 routes** |
>
> **THE METHOD CHANGED, so do not compare 15 against the 51 below.** That figure was
> route-by-route; this one is module-by-module, against each module's REAL mount read from its own
> `index.js` rather than its folder name — `twofa` is served at `/2fa` and `withdrawal-whitelist`
> at `/withdrawals/whitelist`, so a folder-name match reports both as unwired when both are
> called. A module-level answer is also the more useful one: it says which whole FEATURES the
> client has never heard of, which is what the three piles below are actually about.
>
> The fifteen: `casino/seamless` (10), `casino/x-casino` (7), `casino/x-gaming` (3),
> `casino/aggregators` (3) — the unconfigured provider families of Part 4; `user/clubs` (14),
> `user/club-broadcasts` (11), `user/p2p` (11), `user/gift-cards` (4), `user/spin-wheel` (4) — the
> complete features this site has no page for; `user/payments` (6), `user/psp` (3) — the payment
> provider; `sports/results` (2), `sports/settlement` (1) — BetBy's own app owns that screen;
> `user/bank-details` (2) — the one whose card tile is not drawn; and `admin/locks` (1).
>
> **Every one of those is already named in the three piles below or in Part 4**, which is the
> useful result: the qualitative picture in this file was right and only the arithmetic had gone
> stale. Nothing unaccounted-for turned up.
>
> **DO NOT RUN `tools/route-inventory.js` TO REPRODUCE THIS.** It REGENERATES `docs/API-ROUTES.md`,
> `docs/ROUTE-PORT-CHECKLIST.md` and `docs/route-manifest.json` from the `legacy/` folder — which
> does not exist on this delivery (Part 5.1). Creating an empty stub to get past that emptied
> 8,273 lines out of those three tracked files in one run; they were restored from git. The census
> above was taken with a read-only script that writes nothing inside the repo.


- **Blocked on configuration, not on work — about 26 of the 51.** The catalogue, GIS, x-gaming,
  seamless, x-casino and js-games-v2 families answer `[]`, `503` or a validation refusal because no
  provider is configured (Part 4). Wiring them would render nothing until a key exists.
- **Answering, but empty on this delivery.** `payments/orders`, `withdrawals/crypto/summary`,
  `crypto/inr-history` and `casino/games/search` all answer `200` with nothing in them. Real
  routes, no data to show yet. (`bank-details/:coin` was in this pile and has left it — see below.
  The `history/*/stats` reads were listed here too and are a different thing again:
  `GET /user/history/deposits/stats` answers `404 NOT_FOUND`, so it is not an empty route, it is
  not a route.)
- **Answering WITH data, and genuinely unwired — FOUR of them now, and three are new.** Re-probed
  2026-09-04: `swap/history` returns **5 rows**, `vault/transactions` **2**, and
  `bank-details/INR` **1** — a complete record with `bankName`, a masked-able `accountNumber`,
  `ifscCode` and a `upiId`. **That data was not seeded; this project's own testing wrote it**, the
  swaps and vault transfers from Parts 1 and 4b and a bank detail beside them. Which makes them
  better evidence than the blog rather than worse: the shape on the wire has been seen with real
  values in it, so wiring any of the three is front-end work against a known payload. The history
  lists are the three screens Part 2 already names; `bank-details` is the one whose card TILE is
  not drawn, which is the remaining cost there.

  The fourth is `GET /admin/blogs` and its four siblings, carrying three seeded posts.
  Deliberately left: bc.game's Blog row is an external link to a
  separate site, so building a page for them would be the first invented screen in the project, for
  three paragraphs of self-described demo content. (The sweep's "is it mentioned in `src/`" test
  reports blogs as wired; it is matching the words in an `endpoints.js` COMMENT. Nothing calls it.)

`GET /user/deposits/fiat` used to be the second of those and is wired now. And the one member of
this set that was a defect rather than an integration — `GET /casino/bet-history/timed-rounds`,
which answered `500 DATABASE_ERROR` — is fixed; see Part 4b.3. It still answers `[]` for every
account because nothing writes its tables, which is a different gap.

The backend also has whole features this site has no page for: **clubs**, **P2P trading**,
**gift cards** and a **spin wheel**. They are complete and unused.

---

## Part 3 — Missing in the backend

This is the main list. Each item says what the page needs, what exists today, and what to add.
Ordered by how much it blocks: the first six are pages that already exist and are empty.

### 1. BUILT — Favourite games

**Done, and it is the first thing in this file to be closed by adding a feature rather than
fixing one.** `user_favourite_games` (migration 038) and three routes on casino-service; the
whole of it is Part 4b.7, including why the path is `/casino/games/favourites` and not the
`/user/favourites` this entry used to propose.

The original wording: the page needed a list of the player's favourite games, plus add and
remove, and there was nothing — no route, no table, and none in the legacy system either. Page:
`/favorite` in the Casino menu, built and always empty. It is not empty any more: the star in the
game page's toolbar, which had been drawn and inert since that page was built, is the control.

### 2. BUILT — Recently played games that include the house games

- **The page needs** the games this player opened lately.
- **Today** `GET /casino/games/recently-played` exists, but it only reads the **GIS aggregator**
  table, and only the GIS launch path writes to it (`recordPlay` in `games.service.js` is called
  from `gis.service.js` and nowhere else). The 20 in-house games record nothing. GIS itself is
  switched off, so this route returns an empty list for every player.
- **DONE — Part 4b.13.** The write is on `gameEngine.placeBet`, and `recentlyPlayed` resolves
  against both catalogues so a house game comes back named rather than as `game: null`. The
  original wording is kept below because the diagnosis is what made the second half necessary.
- **Add** a write from the in-house game launch too, and let the route return both kinds.
- Pages: `/recent`, **and now the home page**. The signed-in home has a Continue Playing /
  Favorites block (`docs/casino.md`), one section with a tab per list, and a list that answers
  empty gates its tab away entirely — so **the Continue Playing tab can never appear on this
  delivery** and the block renders as Favorites alone. That is the correct rendering rather than
  a placeholder, and it is the first place this gap is visible to a signed-in visitor who never
  opens `/recent`. It also means the write asked for above now finishes two pages, not one,
  which moves it up the list at the bottom of this file.

### 3. Promotions

- **The page needs** a list of promotion campaigns for this player: title, image, short text,
  category tab, and whether it has finished.
- **Today** there is nothing for players. Staff can manage **banners**, and the public banner read
  can carry an image, but there is no campaign list, no categories and no start/end dates.
- **Add** `GET /promotions` (list, with `category`, `page`, and an `archived` flag) and
  `GET /promotions/:id` for the detail page.
- Pages: `/promotions/promotion` and every promotion card on it.

### 4. BUILT - VIP club

- **The page needs** the level ladder: every level's name, tier (Bronze, Silver, Gold…), the XP or
  wager needed, and what each level unlocks. Plus this player's place in it.
- **Today** `GET /user/bonus` gives the player's own level, next level and progress percentage.
  That is enough for the small progress bar in the header and nothing else. There is no ladder
  table, no tier names, no perks, no level-up reward.
- **DONE - Part 4b.16.** `GET /user/vip/levels` and `GET /user/vip`. **No table was needed**:
  `packages/common/src/vipLevels.js` already held all 75 bands and `vipLevelFor()` already computed
  a player's standing - `bonus.service.js` has been using both since the port. The paths sit under
  `/user/` because every route on that service does, whatever the audience.
- Page: `/vip-detail`, plus the level card on the account page.

### 5. Quest Hub

- **The page needs** a list of tasks with progress and a reward, in three groups: in progress,
  completed, expired.
- **Today** there is nothing.
- **Add** `GET /user/quests` and `POST /user/quests/:id/claim`.
- Page: `/quests`.

### 6. Weekly raffle

- **The page needs** the current draw, the ticket count, the prize ladder, past winners and the
  player's own tickets.
- **Today** there is nothing.
- **Add** `GET /raffle/current`, `GET /raffle/:drawId/winners`, `GET /user/raffle/tickets`.
- Page: `/promotions/weekly-raffle`.

### 7. BUILT - Wager contest leaderboard

- **The page needs** a leaderboard: top players by amount wagered for a day, a week or a month,
  with the prize pool, plus the signed-in player's own position.
- **Today** there is nothing a player can call. There is an internal route
  (`/internal/casino/bet-history/top-winners`) but the gateway **blocks anything under
  `/internal/`**, so the site cannot reach it.
- **DONE - Part 4b.16.** `GET /casino/bet-history/leaderboard?period=` (public) and
  `/leaderboard/me` (the caller's own position). It reuses the operator panel's own `#rankUsers`
  aggregation, so the public board and the staff one cannot disagree; names are masked.
- Pages: `/promotions/daily-contest`, and the Wager Contest tab on the home page.

### 8. HALF BUILT — Free plays and free spins

- **The page needs** the free spins and free bets this player holds, and a way to use one.
- **Today** the FREE SPIN half is built and wired — Part 4b.18. **The free BET half cannot be**,
  and that is a vendor gap rather than a missing route: a free bet is a sports bonus carrying
  `provider: "bti" | "betby"`, neither is configured, and this platform has no sports free-bet
  table for one to be granted into. The dialog's Free Bet tab keeps its empty state, which is the
  honest rendering.
- **The finding that unblocked it**: the note here said the GIS free-spin routes were "aggregator
  plumbing, not a player's inventory". Half right. They are all STAFF routes — grant, fetch by
  campaign id, cancel — so there was indeed nothing a player could call; but the rows they write
  are OURS, in `gis_freespins`, and `getFreespin` already answered from the local row before ever
  reaching upstream. So a player-facing listing needed no provider and no new table, only a route
  that had never been written.
- **Still to add**: `POST /user/free-plays/:id/use`. Play Now navigates to `/game/:gameUnique`
  with the `fsId` on the query, which is what bc.game does — the campaign is consumed by PLAYING,
  not by a claim call, and the provider is what decrements `quantity_left`. With no provider that
  counter never moves, which is a staleness limit rather than a correctness one.
- Page: `/free-plays`.

### 9. Achievements and medals

- **The page needs** the medal catalogue (name, picture, how to earn it, how many players have it)
  and which ones this player has.
- **Today** there is nothing.
- **Add** `GET /achievements` (catalogue) and `GET /user/:id/achievements`.
- Pages: the profile dialog and the Master Medals dialog.

### 10. BUILT — Notifications for players

- **The page needs** a list of messages for this player, an unread count, and mark-as-read.
- **Today** staff can send notifications, and clubs have their own broadcasts, but a normal player
  has no inbox. The admin notification routes are under `/internal/` and are blocked at the edge.
- **DONE — Part 4b.10.** All four, as a user-service module proxying admin-service's own internal
  routes. No new table and no new logic: `user_notifications` was complete and `history`,
  `unreadCount` and `markRead` were already written. What was missing was a door.
- **Add** `GET /user/notifications` (with `unreadOnly`), `GET /user/notifications/unread-count`,
  `POST /user/notifications/:id/read`, `POST /user/notifications/read-all`.
- Feature: the bell in the header, and the `/notification` page on phones.

### 11. Chat over HTTP, and more than two rooms

- **The page needs** the room list, the recent messages of a room, and a way to post.
- **Today** chat works, but **only over the websocket** (`CHATS`, `ADD_CHAT`), and there are
  **two rooms**: `global` and `brazil` (`social.constants.js`). This site shows 21 rooms.
- **Add** either HTTP routes (`GET /chat/rooms`, `GET /chat/rooms/:room/messages`,
  `POST /chat/rooms/:room/messages`) or accept that the front-end must open a websocket. Rooms
  should come from a table rather than a fixed list of two, so new ones can be added without a
  code change.
- Feature: the chat drawer in the header.

### 12. BUILT — Register and reset password over HTTP

- **The page needs** to create an account and to reset a forgotten password.
- **Today** both exist **only as websocket events** (`REGISTER_USER`, `RESET_PASSWORD`). There is no
  HTTP route for either — checked across all routes, at every audience.
- **DONE — Part 4b.8.** All three exist. **The logic was already written** — `AuthService.register`,
  `.requestPasswordReset` and `.completePasswordReset` had only `sockets.js` as a caller — so this
  was three route files, not a feature. The reset arm still needs SMTP configured to deliver.
- **Add** `POST /user/auth/register`, `POST /user/auth/forgot-password`,
  `POST /user/auth/reset-password`.
- Feature: the Sign Up tab and the "forgot password" link in the sign-in box. Sign-up cannot work
  at all until this exists.

### 12b. Sign in with a one-time code

- **The page needs** to exchange a code e-mailed to the player for a session.
- **Today** `POST /user/email/otp` and `/otp/verify` exist and `login` is one of their purposes —
  but **verify only answers `{verified: true}`**. Nothing exchanges that proof for tokens, and no
  route accepts an OTP as a credential. So the code can be sent and checked and still cannot sign
  anybody in.
- **Add** either an OTP arm on `POST /user/auth/login`, or a `POST /user/auth/login/otp` that takes
  the verified proof and answers the same token pair.
- Feature: the "One-time Code" tab in the sign-in box.

### 13. BUILT - Top winners / recent big wins

- **The page needs** a short public list of recent large wins for the home page.
- **Today** the data exists (`/internal/casino/bet-history/top-winners` and `/recent`) but is
  internal only and blocked at the gateway.
- **DONE - Part 4b.16.** `GET /casino/bet-history/top-wins`, public, naming nobody at all -
  which is what `liveFeed` beside it already does and what the front-end's `HIDDEN_NAME` expects.

### 14. BUILT (differently) - Rollover: one number is not enough

- **The page needs** a **list** of bonus tasks. Each row: which bonus, the amount, the currency,
  how much has been wagered, how much is left, the status and the dates.
- **Today** `GET /user/wager/progress` gives **one** account-wide figure: multiplier, total
  deposited, target, wagered, remaining. Useful, but it cannot fill a table.
- **BUILT, BUT NOT AS THIS ASKED - Part 4b.16.** `GET /user/wager/tasks` exists and returns a
  list of ONE: this platform's requirement is account-wide (deposits x multiplier) and nothing
  attaches one to an individual bonus. `unlocked_rewards.wager_amount` is not it - that is the
  wager that UNLOCKED an affiliate commission. A per-bonus table would have been inventing a
  product concept rather than exposing one; read Part 4b.16 before building it.
- Page: `/wallet/rollover`.

### 15. Deposit: networks, addresses and fiat channels

- **The page needs**, for a chosen coin: which networks (chains) it supports, the minimum, the fee,
  and a deposit address with its QR code. For fiat: the list of payment channels and their limits.
- **Today** `GET /user/crypto/chains` and `/user/crypto/coins` exist but **crash with a 500** when no
  payment provider is configured (see Part 5). The five payment gateways answer a clean
  `503 PAYORDER_PROVIDER_DISABLED`. A deposit address is only obtainable over the websocket
  (`GET_ADDRESS`).
- **Add** (a) fix the crash so it refuses cleanly, (b) an HTTP route for the deposit address, and
  (c) configure at least one provider so real data exists.
- Pages: `/deposit` and `/wallet/deposit`. They currently show a captured table from the old site
  and a clearly fake address, on purpose.

### 16. BUILT - Withdrawal address book / whitelist

- **The page needs** saved withdrawal addresses, with add, edit, delete, and a master on/off switch.
- **Today** there is nothing. `bank-details` covers saved bank accounts, not crypto addresses.
- **DONE - Part 4b.16.** Migration 039, plus GET/POST/PATCH/DELETE and
  `PUT /user/withdrawals/whitelist/enforcement`. The toggle is `users.withdraw_whitelist_only`.
  **`isAllowed()` is written and deliberately not wired into a withdraw rail** - no provider is
  configured, so there is no reachable flow to enforce against.
- Page: Settings → Whitelist Management, and the address field on the withdraw form.
- **FULLY WIRED 2026-09-04 — Part 4b.17.** The pane had both reads and none of the writes for one
  pass; it now has all four, plus the two dialog routes bc.game puts the address form behind. The
  one thing this feature is still missing is the CODE STEP: every write on the original runs
  `new-verify` with `scenario: "WITHDRAW_ADDRESS_EDIT"` before it fires, and nothing here issues
  a code. Without it a stolen session can add its own address, which is the exact attack a
  whitelist exists to stop — so this is the most valuable single item on the OTP rail's list.

### 17. BUILT - Public profile of another player

- **The page needs**, for any player id: username, avatar, level, join date, and their public
  totals (bets, wins, amount wagered).
- **Today** `GET /user/profile` only returns **your own** profile. There is no route that takes an
  id.
- **DONE - Part 4b.16.** `GET /user/profile/:userId/public`, one route rather than two - the
  counts come from casino-service over the internal route and are folded in. No new table.
  **No privacy flag exists to honour**, which is recorded in Part 4b.16 rather than invented.
- Feature: clicking a name in chat or on a leaderboard.

### 18. BUILT - One bet's details

- **The page needs** a single bet by its id, so a row in bet history can open.
- **Today** only `/internal/casino/bet-history/player/:userId/bets/:betId`, which is blocked at the
  gateway.
- **DONE - Part 4b.16.** `GET /casino/bet-history/:betId`, with the ownership test in the query
  rather than a comparison after it, so a foreign bet and an absent one give the same 404.

### 19. TWO OF THREE BUILT — In-house play is invisible to three other features

Found by placing four real bets through the in-house socket games and re-reading everything that
should have moved. Three things did not:

- **`Userwager` is not updated**, so `GET /user/wager/progress` still reports `wagered: 0` — the
  wagering requirement can never be met by playing the platform's own games.
- **`users.games_played` is not updated**, so `profile.gamesPlayed` stays 0.
- **`gis_recently_played` is not written** (gap 2).

**DONE for two of the three — Part 4b.13.** `Userwager` and `gis_recently_played` are written now,
from `gameEngine.placeBet`. `users.games_played` is incremented there too, so all three of the
bullets above are addressed — what remains is that the FOUR SEEDED BETS predate the change, so
Statistics still reports `Total Wagered $0.00` for them until fresh bets are placed. The write
went on `placeBet` rather than the settle path: a wagering requirement measures turnover, so a bet
counts when it is placed.

### 20. FIXED — `profile.joinedAt` was a boolean, not a date

`GET /user/profile` mapped `created_estimated` — a **boolean** column — onto a field named
`joinedAt`, so it answered `false` for a seeded account.

**FIXED — Part 4b.** The column is `created` (`timestamp with time zone`); `created_estimated` sits
beside it and says whether that date is exact or was inferred during the legacy import. It is
fetched but not returned — import provenance, which no player-facing screen asks about — and left
in `attributes` so the next reader meets the pair and the comment rather than rediscovering it.

**IT NEEDED A FRONT-END CHANGE TOO, and the workaround was what broke it.** `services/auth.js` had
`Number(profile.joinedAt) || 0`, which was right for a boolean and gives `NaN` for an ISO string —
so fixing the server alone left the date at 0. Now `Date.parse(...) || 0`, which handles both. A
workaround for a backend defect is a thing to grep for when that defect is fixed.

### 21. Withdrawal needs KYC, and nothing says so before the form

`POST /user/withdrawals/fiat` answers `403 FIAT_WITHDRAW_KYC_REQUIRED` until the account is
Verified. That is a correct rule, and the front-end has no way to know it in advance — the withdraw
form has no KYC gate on it. **Add** the requirement to whatever config a client can read (the
public site config would do), so the form can send the visitor to verification instead of to an
error.

### 22. FIXED — a wrong password answered 401, so the client refreshed and sent it twice

`POST /user/auth/change-password` answers **401 `AUTH_CURRENT_PASSWORD_INCORRECT`** when the
current password is wrong. 401 is the status this project's transport reads as *"that access token
has expired"* — the rule every other authenticated read depends on — so it refreshes the session
and replays the request, which fails identically and then surfaces correctly.

The visitor sees the right thing. What it costs is invisible and worth naming: **every wrong
password reaches the server twice and rotates a refresh token on the way**, so any counter built on
those attempts (a lockout after N tries, a rate limit, an audit trail) counts double.

**Change** the status to `403` — or `422`, the platform already uses it for validation refusals.
A failed credential check *inside an already-authenticated request* is not an authentication
failure; the caller's token was perfectly good. The wire code and message can stay exactly as they
are. The fix belongs here rather than in the client, because teaching the transport to special-case
one path's 401 is how a retry rule stops being a rule.

Two smaller things on the same endpoint, neither a defect: its error keys are namespaced with
`AUTH_` on the way out, so the code on the wire is `AUTH_CURRENT_PASSWORD_INCORRECT` while
`auth.errors.js` declares it as `CURRENT_PASSWORD_INCORRECT` — only visible by calling it. And it
revokes every session on success, which the front-end relies on: it signs the visitor out
afterwards, exactly as bc.game's own flow does.

### 22b. FIXED — a wrong 2FA code answered 401 too, and cost the same

Found while wiring enrolment: `POST /user/2fa/disable` (and `/setup-verify`, and `/verify`) answer
**`401 TWOFA_INVALID_CODE`** for a code that is merely wrong. That is gap 22 again, on a second
endpoint family — 401 is the status this project's transport reads as *"that access token has
expired"*, so it refreshes the session and replays the request. Every mistyped 2FA code therefore
reaches the server twice and rotates a refresh token on the way.

**Change it to `403`** alongside gap 22's, and for the same reason: a failed second factor inside
an already-authenticated request is not an authentication failure, and the caller's token was
good. Both fixes are one decision, not two.

Worth knowing separately, and correct: **the service burns the TOTP step it accepts.** A code used
to sign in cannot then authorise a disable inside the same 30-second window. That is replay
protection working, not a bug — but it surfaces as the same `TWOFA_INVALID_CODE`, so it is easy to
mistake for a wrong secret when testing.

### 23. BUILT — Changing your e-mail address was websocket-only

- **The page needs** to change the address on the account, having proved the new one can receive
  mail.
- **Today** the logic is written and it is good — `ProfileService.changeEmail` requires a verified
  `change-email` code on the NEW address and spends it, so one verification authorises one change,
  and it fixes an off-by-one in the legacy uniqueness check that let two accounts share an address.
  But **it has no HTTP route**. The only caller is `profile/sockets.js`. `PUT /user/profile` accepts
  `username`, `country` and `avatar` and nothing else.
- **DONE — Part 4b.8.** `POST /user/profile/change-email`. It was a route file, exactly as this
  entry predicted. The code is now required rather than optional, which is the one place it differs
  from the socket.
- Feature: Settings → Security → Change Email.

### 24. Phone numbers are read-only, and nothing can verify one

- **The page needs** to bind a phone number, verify it with a code, and change it later.
- **Today** `users.phone` is a real column and `GET /user/profile` returns it, but there is **no
  phone route at any audience** — checked across every one of them. There is no SMS sender either; the OTP
  module is e-mail only (`/user/email/otp`).
- **Add** the phone equivalent of the e-mail OTP pair, then a bind and a change route. This one is
  a genuinely new feature, not a missing route file.
- Feature: Settings → Security → Verify / Change Phone Number.

### 25. BUILT — You could see your devices but not sign one out

- **The page needs** to end one session from the device list.
- **Today** `GET /user/auth/sessions` is the only route on that resource. There is no
  `DELETE /user/auth/sessions/:id` and no revoke-one route anywhere. The only thing that ends other
  sessions is `change-password`, which ends **all** of them.
- **DONE — Part 4b.9.** `DELETE /user/auth/sessions/:sessionId`. `revoke-all` was NOT added:
  `POST /logout` with `{allSessions: true}` already does exactly that and a second name for it
  would be two ways to spell one action.
- Feature: the Remove button on each row of Settings → Security.

Three more controls on that same pane have **no backend at all**, and are listed here only so
nobody looks for one: **anti-phishing code**, **passkey** and **close account**. Nothing in the
tree implements any of them. Close Account is hidden on bc.game's own live site too, so it is the
least urgent thing in this file.

### 26. TWO OF THREE FIXED — things the two withdrawal rails disagreed about

Found while building `/wallet/withdraw-detail`, which reads them. None is a crash; all three change
what a player can be told.

**The merged history hands out what the rail's own service withholds.** `FiatWithdrawService`
gates `accountNumber` and `ifscCode` behind `forStaff`, so `GET /user/withdrawals/fiat` does not
send them. `GET /user/history/withdrawals` puts both in `destination` for the same player on the
same record. They are the player's own bank details either way, so nothing leaks to a stranger —
but the two modules plainly disagree about whether a player should see them, and a reader of
either would draw the wrong conclusion about the other. **Decide once**, in whichever direction.

**A rejected crypto withdrawal cannot be explained to the player.** `note`, `decidedBy` and
`decidedAt` are `forStaff` on the crypto rail, so there is no route on which the reason reaches
the person it is about. A rejected fiat DEPOSIT explains itself through `adminComment`, which is
the same situation handled the opposite way. The dialog currently says the reason is not shown
rather than leaving a blank; **surfacing `note` to its owner** would close it.

**STILL OPEN — the merged history's `id` is ambiguous across rails.** Left alone deliberately: the
row already carries `method`, so the information a client needs is there and the pair `(id, method)`
is unambiguous. Changing the `id` itself would break every client reading it today for no gain the
`rail` parameter does not already give. Recorded so nobody reads the first two fixes as closing
this one.

The original wording: `withdrawals` and `fiat_withdrawals` have
independent sequences and `/user/history/withdrawals` merges them keyed on `id`, with `reference`
null on both — so two rows in one list can carry the same `id` and nothing in the row distinguishes
them but `method`. Confirmed by seeding a collision: crypto `id=2` and fiat `id=2` in the same
response. Any client linking on that id alone is ambiguous, which is why this build's detail link
adds a `rail` parameter the original does not have. **A prefixed or rail-qualified id** on the
merged shape would remove the need for it.

---

## Part 4 — Switched off, not missing

These need a key or a seed, not new code. Nothing here is a defect.

| What | Why it is empty | What to do |
| --- | --- | --- |
| The big game catalogue (thousands of slots) | `GIS_MERCHANT_ID` and `GIS_MERCHANT_KEY` are empty, so nothing has synced | Set the keys and run the sync |
| Casino Hub games | `CASINO_HUB_KEY` empty — it refuses by name, `CATALOGUE_NOT_CONFIGURED` | Set the key |
| All deposits and withdrawals | `CCPAYMENT_APP_ID`, `CCPAYMENT_APP_SECRET`, `APAY_API_KEY`, `UPI_API_KEY`, `WAYPAY_MERCHANT_KEY`, `CRICPAY_MERCHANT_CODE` all empty | Configure at least one provider |
| Vault deposit terms | `vault_lock_rates` has no rows, so there is nothing to lock money into | Seed the terms |
| Exchange rates | 25 placeholder rows, seeded once. There is no updater anywhere in the tree | Add a job that refreshes them |
| Opening a BC Original | `JSGAMES_V1_AGENCY_UID` and `JSGAMES_V1_AES_KEY` are empty, so `POST /casino/js-games/v1/launch` answers **`503 JSGAMES_NOT_CONFIGURED`** — a clean refusal by name, the same good behaviour Casino Hub shows and the opposite of Part 5.2. The 20 games LIST correctly (that part really is connected); none of them can be OPENED | Set the agency id and AES key |
| Staff login on a fresh demo setup | `admin@ibitplay.local` answers `403 STAFF_AUTH_TWO_FACTOR_ENROLMENT_REQUIRED`; enrolment must be started by another admin | Seed one admin with 2FA already set up |

---

## Part 4a — The missing DATA, censused rather than estimated

Part 4 says what is switched off. This says what is *empty*, which is a different question and the
one that decides whether a configured platform would actually show anything. Measured 2026-09-04
against the running `bc_games` database and `backend copy/.env`.

### The database is 84% empty

**164 tables. 26 have rows. 138 are empty.** Everything the site displays today comes out of those
26, and five of them only have rows because this project's own testing put them there
(`bets` 4, `swap_history` 5, `vault_transactions` 2, `fiat_deposits` 1, `fiat_withdrawals` 1).

The 26 that carry data:

```
288 auth_login_attempts   25 exchangerate      7 roles            5 staff_balances
209 auth_sessions         22 js_games          7 wallet_history   5 userconfig
 41 sequelize_meta        19 sports_config     5 credits          5 users
 13 staff_hierarchy       11 credits_ledger    5 staff            4 bets
  8 spin_wheel_slices      5 swap_history      3 blogs            2 vault_transactions
  1 currency_payment_details   1 fiat_deposits   1 fiat_withdrawals
  1 siteconfig             1 spin_wheel_config  1 user_kyc
```

**`wallets` is empty and that is not a bug** — balances are 28 fixed columns on `credits`, per
`wallet.constants.js`. The table is legacy and unused. Worth stating because an empty table named
`wallets` on a platform whose wallet works is exactly the kind of thing that gets "fixed".

### The single biggest data gap is the catalogue

**Every aggregator catalogue table is at zero**: `gisgamesnew`, `gis_games`, `gis_providers`,
`gis_providers_new`, `apigames`, `provider_games`, `live_casino`, `popular_slots`, `hot_games`,
`indian_games`, `prioritized_games`, `prioritized_gis_games`. The entire game library this site can
show is **`js_games`, and that is 22 rows of in-house games**. Nothing else. The Casino pages, the
category tabs, the provider filters and the search all have real routes and no rows behind them, so
configuring GIS (Part 4) and running the sync is not one improvement among many — it is the
difference between a casino with 22 games and a casino.

### Four provider families are ABSENT from `.env`, not empty in it

Part 4 describes these as "empty". They are not present at all — checked key by key:

| Key | In `.env`? |
| --- | --- |
| `GIS_MERCHANT_ID`, `GIS_MERCHANT_KEY` | **absent** |
| `CASINO_HUB_KEY` | **absent** |
| `CCPAYMENT_APP_ID`, `CCPAYMENT_APP_SECRET` | **absent** |
| `JSGAMES_V1_AGENCY_UID`, `JSGAMES_V1_AES_KEY` | **absent** |
| `APAY_API_KEY`, `UPI_API_KEY`, `WAYPAY_MERCHANT_KEY`, `CRICPAY_MERCHANT_CODE` | present, empty |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` | present, empty |
| `REDIS_URL` | present, empty |

Absent and empty behave identically — every one is `optionalStr()` in the service config, so both
land as undefined — but they are not the same for whoever has to fill them in: an empty key tells
you its own name and an absent one does not. **The names above are read out of
`services/casino/src/config.js` and `services/user/src/config.js`**, which is the only place they
exist. `.env` is 152 keys, 31 of them empty.

**The in-house launch has a constraint that is easy to miss.** `providers/huidu.js:45` requires
`baseUrl && agencyUid && aesKey && Buffer.byteLength(aesKey,'utf8') === 32` — **the AES key must be
exactly 32 bytes**, so a key of the wrong length fails the readiness check and the route keeps
answering `503 JSGAMES_NOT_CONFIGURED` with nothing to say it was the length.

### Tables whose PRODUCER does not exist — seeding these would not help

These are empty because nothing writes them, so no amount of configuration fills them. Each is a
read whose writer was never built:

| Table(s) | Read by | Gap |
| --- | --- | --- |
| `userwager`, `userwager_history` | `GET /user/wager/progress` | 19 — in-house play never records a wager |
| `gis_recently_played` | `GET /casino/games/recently-played` | 2 — only the GIS launch path writes it |
| `vault_interest_history` | vault, 3 call sites | Part 5.4 — no job, no cron, nothing credits interest |
| `bets_30s/1m/2m`, `session_*`, `windata_*`, `betoutcome_*` | `bet-history/timed-rounds` | Part 4b.3 — the crash is fixed, the producer is still absent |
| `user_notifications`, `notifications` | nothing player-facing | 10 |

**`user_notifications` is the cheapest thing in this file.** The table is already complete —
`id, user_id, title, body, type, additional_data, is_read, read_at, delivered, delivery_error,
created_at`. Gap 10 asks for four routes over a schema that exists and needs no migration. The
same is true of `vault_lock_rates` (`lock_period, label, days, rate, is_active`), which is Part 4's
"seed the terms" and amounts to about four INSERT statements.

### Two smaller data facts worth knowing

**Exchange rates are stale, not just placeholder.** All 25 rows carry `last_updated`
`2026-08-19T02:35Z` — seeded once, sixteen days before this census, and there is still no updater
anywhere in the tree. Every dollar figure on the site is computed from a rate that has not moved
since setup.

**`users.created_estimated` is `false` for all five demo accounts**, which is gap 20 seen from the
data side rather than the response side: the column `joinedAt` maps onto is a boolean and there is
no `created_at` beside it on the profile payload to fall back to.

### One thing that is NOT a backend gap — a front-end defect this census found

`GET /casino/js-games/v1/games` is **paginated, and this build takes the default page**. All 22
rows are `is_active: true`; the default `per_page` is 20; `?per_page=50` returns 22 and `?page=2`
returns the missing pair. So **Three Card Monte and Snakes and Ladders have never appeared** in BC
Originals here.

The comment at `src/services/originals.js:94` says the route "returns 20 of the table's 22" and
attributes it to server-side `is_active` filtering. That reading is wrong — nothing is
deactivated — and it is a good example of why this file prefers a probe to a plausible
explanation: the discrepancy was noticed, explained, and the explanation closed the question.
Fix is on the call site, not the backend.

## Part 4b — Changes made TO the backend from here

Seven so far. Two additive, four defect fixes, and one new feature; none changes anything a
visitor already saw, except where seeing it was the point.

**17 is front-end only** and is recorded here anyway, because it is what finally made 16's routes
reachable and because it corrected two things this file had said about them.

### 21. Recent Big Wins had one capture doing the work of four

**Reported from the running site**: the BC Originals tab under Recent Big Wins showed a couple of
games where bc.game shows twenty. So did Slots and Live Casino, less obviously.

**The cause was written down in the file it was in.** `data.js`'s own note said the mirror had
captured exactly one response — the All tab — and that "the real site issues a separate request
per tab, so its per-tab lists are longer than the subsets below". The tabs filtered that single
20-row snapshot by `gameTypeId`, which left **BC Originals on 3 rows, Slots on 6 and Live Casino
on 12**. A known limitation recorded honestly and then left, which is how it survived: nothing
re-reads a note that has already been written.

**Fixed by capture, not by code.** `/game/support/home/v3/recent-big-wins/?gameTypeId=<0..3>` is
a `game/support` path, so it answers UNAUTHENTICATED on hash.game — rung 4 of the recovery ladder
doing exactly what CLAUDE.md says it does. All four were fetched and each tab now holds its own
twenty rows, `.slice(0, 20)` being the live page's own cut. `getRecentBigWins({ tab })` re-keys
the read per tab rather than the component filtering one list.

**Twenty-four game covers came with it.** The new rows name current third-party games this build
had no artwork for; the response carries each one's `iconThreeFour` CDN URL, so they were fetched
from there. All twenty-four are genuine PNG bytes — worth checking rather than assuming, since
this CDN serves AVIF under a `.png` path elsewhere and the project's rule is that the extension
matches the bytes.

**And that exposed a second glob.** `data.js` resolved artwork with its own `import.meta.glob`
over `*.avif` ONLY, so a cover stored as `.png` was invisible to it while `GameTile` found it
perfectly well. It now uses `utils/gameArt`'s `assetExact`, which already globs `{avif,png,jpg}`
and already answers `undefined` for a miss. One resolver instead of two.

### 20. Three defects on the home page's bet ticker, and a route filed under the wrong reason

**Front-end only, and all three reported from the running site rather than found by a harness** —
which is worth recording, because between them the three harnesses that cover this page were all
green throughout.

**A crash.** `Uncaught TypeError: Cannot read properties of undefined (reading 'payout')`, taking
the home page down. `source[seq % source.length]` is `source[NaN]` when the feed is empty, which
is `undefined`, which reaches the row and throws. The clock made it worse rather than rarer:
`throttleMs(0)` returns `false` and `setTimeout(fn, false)` coerces to 0, so an empty feed pushed
an undefined row on every tick of a hot loop. The feed is empty whenever nobody has played
recently — which was ALWAYS true before Part 4b.13 started recording in-house bets. The ticker was
written against the 30-row fixture, which never runs dry.

**A panel that grew for twelve seconds.** Reported as "only 6 rows displaying". This delivery's
live feed holds FOUR bets, so the ticker opened four rows tall and added one every two seconds
until it reached ten; six is what that looks like six seconds in. On the original the case does
not arise — its source is a socket on a busy site. The initial list is now padded to capacity by
the same cycling the ticker already does, so it opens full. That also fixed the zebra striping,
which keyed on a sequence that started at 10 while the initial rows were numbered 0..3.

**Two tabs, one feed.** Latest Bet and High Roller rendered the identical component with the
identical source. On bc.game they are two feeds — `ThrowAndHighRolles-C7GElDRJ.js` keys the URL on
the tab, `highRoller` reading `/game/support/home/v2/high-rollers/` and `lastBet` reading
`/game/support/home/last-bet/`. `GET /casino/bet-history/top-wins` is the counterpart here and
needed nothing built.

**AND THAT ROUTE WAS SITTING IN "NOT WIRED, AND WHY" THE WHOLE TIME.** Its reason —
"Recent Big Wins draws a player NAME and a VIP TIER on every card and the public route carries
neither" — is true of that widget and false of this table, which has no VIP column and already
renders every player as `HIDDEN_NAME`. **A ROUTE WAS FILED UNDER A REASON BELONGING TO ONE
CALLER**, so the reason read as a property of the route and the second caller went unconsidered
for two passes. When a route is recorded as deliberately unwired, name the CONSUMER the objection
is about; the next consumer may not share it.

### 19. Every card on Settings → Security opens something — and only two can submit

**Six tiles, six modals, and the interesting half is which of them reach a route.** All recovered
off `hash.game/modules/account/assets/`: `Main-B0RluUp6.js` (the eight-arm `user-action` switch),
`index-BHHIYswL.js` (e-mail and phone bind), `index-CU_BJJlr.js` (the flow manager, which is where
the 2FA disable confirm lives), `Enter-DCwW2aqp.js` (passkey), and the phishing trio
`Enter-CKlrJB3N` / `Create-omu97aad` / `Detail-DzfqJDj3`. Verified by `verify-security.mjs` (12
assertions) and `shot-security.mjs` (16 observations, real Chrome).

| Tile | Modal | Backend |
| --- | --- | --- |
| Change Password | built earlier; the Account Restrictions confirm is 4b.18 | `POST /user/auth/change-password` |
| Email → **Change** | `email-change`, two steps | `POST /user/email/otp` + `POST /user/profile/change-email` — **blocked on SMTP** |
| Email → Verify | `email-bind` | **none.** `users` has NO `email_verified` column, so nothing could record the result |
| Phone → bind / change | `phone-bind`, `phone-change` | **none.** No SMS sender anywhere; `users.phone` is read-only (gap 24) |
| Two-factor → **Disable** | confirm, then a code-and-password form | `POST /user/2fa/disable` |
| Passkey | the intro arm of `DialogPasskey` | **none.** No WebAuthn routes, no credential table |
| Anti-Phishing | three dialog routes | **none.** No table, no column, no route |

**Each of the four with no backend DRAWS ITS FORM AND SAYS NOTHING ABOUT THE GAP.** They briefly
carried a sentence each explaining it — "This deployment has no SMS sender", and three like it —
and those sentences are not in the chunks, so they were removed on the same pass. **Nothing on
these screens is this build's own words.** The reason each control is inert lives in the
component's own note and in `docs/settings.md`, which is where a reader looking for it will be;
`shot-security.mjs` now asserts the removed copy stays removed.

That is a reversal of the position taken an hour earlier in this file, and the argument for it is
better: an invented sentence is still an invention, it is the only text on the screen bc.game
never wrote, and it dates badly — it describes a deployment rather than the product. The defect
this file keeps recording is a control that CLAIMS to do something and does not; a control that
claims nothing is the pane's existing and documented state for a dozen others.

Three smaller pieces of copy went with them: the whitelist edit form's "Only the name can be
changed" note (its three disabled fields are the honest signal on their own), the add form's
invented "This address is saved for X only." line — with the whole universal-address row it sat
in, since that row is about a feature this platform cannot store — and "This address is no longer
open." on an edit reached without a row, where the chunk simply navigates back. **And one piece of
copy was CORRECTED rather than removed**: the code step's resend button was written as "Resend
({n}s)" over a link, a guess at wording that is sitting in the mirror. `Resend-DzaleSlX.js` is one
disabled button reading `Resend in {n}s`, resetting to 60s where it opened on 59.

**THE 2FA DISABLE WAS NOT MISSING, IT WAS BEING LOOKED FOR IN THE WRONG PLACE.**
`services/twoFactor.js` said there was "no unbind arm in the original's `:action` switch to port a
dialog from" — true, and beside the point: disabling is a POPUP the flow manager raises (`ue()`),
not a route. Its confirm is ported verbatim; its `new-verify` second step becomes the
code-and-password form this platform's own route asks for, which is a shorter path rather than a
weaker one — both proofs are asserted independently.

**AND ITS FIRST BULLET WAS A SECOND FALSE PROMISE.** "Withdrawals will be disabled for 24 hours
after you disable the 2FA." Nothing did that, exactly as with the password change, so
`TwoFactorService.disable` now writes the same `withdraw_locked_until` migration 040 added, in the
same transaction that clears the secret. Same reasoning: removing a factor is either the owner
tidying up or an attacker who has just taken the account.

**`password-bind` IS THE ONE ARM STILL NOT BUILT, and it is unreachable rather than skipped.**
Every account here is created with a password and nothing can clear it, so `passwordExist` is
true for every real session and the tile never offers "Set Password". There is no route behind it
either: `change-password` requires the current password and refuses when the column is null.

### 18. Free spins a player can see, and a promise the platform had to start keeping

Three pieces, all 2026-09-04. `verify-freespins.mjs` (23 assertions) and `shot-freespins.mjs`
(15 observations, real Chrome at 1440 and 390).

**`GET /casino/gis/freespins/mine` — gap 8's first half, and no new table.** `gis_freespins` has
had three routes over it since migration 016 and every one is a STAFF route: grant a campaign,
fetch one by campaign id, cancel one. There has never been a way for the player a campaign belongs
to to learn it exists, which is why `/free-plays` has rendered "Free Spins 0" since it was built.
**It needs no provider**, which is what made it buildable while the rest of that module refuses
for want of `GIS_MERCHANT_KEY`: `setFreespin` writes the row locally after the provider confirms,
and `getFreespin` already reads local-first, so listing what we hold was always answerable. Rows
are filtered to `status: 'active'`, not cancelled, and inside `valid_from`/`valid_until` — each
exclusion is asserted, because a campaign that has expired sitting under a "Play Now" button is
the worst kind of empty promise. The game is resolved server-side across the aggregator catalogue
and `js_games`; on this delivery the aggregator half is empty, so in practice it names in-house
games and answers `null` otherwise, which is rendered rather than dropped.

The ARTWORK is resolved client-side and that is deliberate. `iconThreeFour` is a remote URL on
bc.game and there is no feed behind it here — `js_games.game_icon` is null for all twenty in-house
games. So the adapter resolves the cover out of `src/assets/games` by slug with `assetExact`, the
same fix `GameTile` needed; `assetFor` would have put ANOTHER game's cover on a free spin, which
is asserted in both directions.

**Migration 040 — `users.withdraw_locked_until`, and the reason it exists is a screen.** bc.game
puts an "Account Restrictions" confirm in front of Change Password (`account2.setting.protect
.tips`): "we will disable your withdrawals for 24 hours after you change your password". Porting
that dialog alone would have put the first FALSE PROMISE in this project on screen, about money.
So `AuthService.changePassword` now writes the window in the same transaction as the password and
the session revoke, and **both withdrawal rails refuse inside it** — the fiat `create` and the
crypto socket handler, which is the pairing Part 4b.5 and 4b.6 had to fix twice before. A
timestamp rather than a flag, so nothing has to sweep it: a past value is simply not a lock.

**The cooldown is checked BEFORE the KYC gate on the fiat rail**, which is an ordering choice
worth recording. Both refusals can be true at once, and they are not equally useful: "verify your
identity" is a thing the player can go and do, and when they come back the cooldown is still
there. Telling them the temporary blocker first is one round trip instead of two, and it is the
cheaper read.

**`RouteDialog` only ever drew the PHONE arm of the title bar.** Its own note said so — "the only
arm these two routes can reach, both are guarded to mobile" — and that stopped being true the day
a `dialog: !0` route used the shell. `/user-action/:action` and the whitelist's add/edit pair are
dialogs at EVERY width, so on a desktop they drew a phone's back arrow and no cross at all. The
original's rule is `c = !mobile` for the cross and `l = !(c && index === 1)` for the arrow, and
`enter === 'open'` is already exactly `index === 1` — `App.jsx` sets it when no dialog was on the
stack before. So both arms are drawn now with no new prop threaded through fifteen call sites.

### 17. The whitelist's write path, and a router bug the hit test found — gap 16

**No backend change.** The five routes from 4b.16 were built, verified and left with nothing
calling four of them; this is the half that calls them. `verify-whitelist.mjs` (20 assertions,
service level) and `shot-whitelist.mjs` (21 observations, real Chrome, both viewports).

`components/modals/WhitelistAddress` is `/settings/whitelist/add` and `/settings/whitelist/edit`,
recovered from `Add-b1yefrqj.js` and `Edit-B-e1jOSZ.js` off `hash.game/modules/account/assets/`;
the pane itself gained the delete confirm, the disarm confirm and the phone row with its
three-dot menu, all out of `index-D7PTq2J_.js`. **Three departures, each forced and each written
at its call site:** no `new-verify` code step, no universal address (`currency` is NOT NULL and
the unique key is `(user_id, currency, address)`), and Edit renames rather than re-points — the
platform refuses to move an address in place, so the form shows Currency, Network and Address
disabled and says why.

**TWO THINGS THIS FILE HAD WRONG, both found by building the caller.**

`toWhitelistRow` reported a row with a network as UNIVERSAL, under a note claiming that was what
"makes the table's type column show the chain rather than an empty cell". It was not: the cell
prints `label` on the Standard arm and `chain` on the Universal one, and both were assigned
`row.network`, so the branch decided nothing but a word — and the word was false. Every row is
Standard now, and `label` resolves through `data/currencyTokens.js`, so the Network column reads
"Tron (TRC20)" as bc.game's does rather than "TRON".

And the router: `element={null}` on a route WITH CHILDREN does not render nothing, it renders the
OUTLET — React Router's test is `match.route.element ? element : outlet`, and `null` is falsy. On
the seventeen leaf routes using that idiom it is harmless, because a leaf has no outlet. On
`/settings`, the only one here with children, it meant **every settings pane was mounted twice on
a phone** — once invisibly beneath the sheet and once inside it, each with its own reads, dialog
state and subscriptions. Pre-existing, unrelated to the whitelist, and found only because a
hit test for the row's three-dot button returned two of them 18px apart. An empty fragment is
truthy, so `<></>` renders nothing and the children go with it.

### 16. Tier 3, and the one gap whose answer was "the platform does not work that way"

**Gaps 4, 7, 13, 14, 16, 17 and 18.** Verified by `backend copy/verify-tier3.mjs`, 59 assertions.

**4 - the VIP ladder needed no table.** `packages/common/src/vipLevels.js` already holds all 75
bands (level, `minXp`, `maxXp`, card tier) lifted verbatim from `legacy/bonus/calculateVip.js`, and
`vipLevelFor(wager)` already returns level, card, next level and progress. `bonus.service.js` has
been calling it since the port and returning it INSIDE the bonus payload. So the new `vip` module
adds no migration and no arithmetic: `GET /user/vip/levels` (public) and `GET /user/vip`. The paths
are not gap 4's proposed `/vip/levels` - every route on user-service mounts under `/api/v1/user/`
whatever the audience, so a bare `/vip/...` is not reachable from here. The top band's `maxXp` is
published as `null` because `vipLevelFor` treats it as open-ended - that is the fix for legacy's
biggest-player-becomes-VIP-0 bug, and publishing a ceiling would describe behaviour the platform
does not have.

**7 - the leaderboard reuses the operator panel's own aggregation.** `#rankUsers`, extracted from
`#topUsers` so the board and a player's POSITION share one pass - a position cannot be read off a
top ten, because the whole point of asking is that you are not in it. Ranked by stake COUNT, which
has no currency and is exact across a mix of sources, money summed per source and the contributing
sources NAMED in `scope`; that reasoning was already written above `#topUsers` and applies
unchanged. Names are MASKED to `Player <last four of id>` - derived from the id and not the name,
because deriving it from the name leaks its length and prefix and collides players who share one.

**13 - public top wins, with no identity at all.** `liveFeed` is the precedent and names nobody;
the internal `/top-winners` does resolve names and correctly, being staff-facing. The front-end
already expects this: `HIDDEN_NAME` is `'****'` and `displayName` renders it as "Hidden".

**17 - the public profile, and a privacy gap worth naming.** Username, avatar, computed VIP level,
join date and the bet/win counts. NOT email, phone, country, balance, referral code or status - the
test applied was "would this appear next to a name in chat on the site being ported". The level is
the COMPUTED one rather than `users.level`, because the platform's own eligibility checks compare
against the computed one. The counts come from casino-service over the internal route and degrade
to `null` on failure, so a client can tell "none yet" from "could not read".

**There is no privacy setting to honour, and that is a gap rather than a decision.** `userconfig`
has `hide_balance` and nothing else; no "hide my stats" flag exists anywhere in the schema, so a
player cannot opt out of the counts. The front-end has a `hideGameData` field with nothing behind
it. Recorded rather than invented - adding a column would be this port making a product decision.

**16 - the whitelist, and the one way it could lock somebody out.** Migration 039 adds
`user_withdrawal_whitelist` and `users.withdraw_whitelist_only`. The switch is on `users` and not
`userconfig` because it is a security control, not a preference - `is_locked`, `casino_locked` and
`system_locked` are already there - and because two modules writing `userconfig` is how a
preference write and a security write end up racing.

Unique per `(user, currency, address)` and not per `(user, address)`: the same string is a valid
address on more than one chain. The address is BOUNDED, not validated - no checksum, no per-network
format rule, because 28 currencies across chains with different formats and no provider configured
to ask means a wrong address refused at withdrawal time beats one refused at save time by a rule
this port invented. Only the LABEL is mutable: editing an address in place is indistinguishable
from adding an attacker's, so changing a destination means delete-then-add, two deliberate acts.

**Turning enforcement on against an empty list is refused, and removing the last address turns it
off.** That is the same lockout arrived at from two directions - whitelist-only plus an empty
whitelist means no withdrawal can ever be made, and the pane that fixes it is the one that broke
it. `isAllowed()` is written for the withdraw rails to call and IS NOT WIRED INTO ONE, which is
stated in the code rather than hidden: `crypto-withdraw` builds on a provider that is unconfigured
here, so there is no reachable flow to enforce against and wiring it would be untestable.

**14 - gap 14 asked for something this platform does not have.** It wanted "one row per bonus with
a wagering requirement", which is bc.game's model. Here the requirement is ACCOUNT-WIDE and derived
from deposits (`target = approved deposits x wager_multiplier`); nothing attaches a requirement to
an individual bonus. `unlocked_rewards.wager_amount` looks like the missing piece and is not -
`affiliate.service.js` maps it to `tier`, the referred player's wagering that UNLOCKED a
commission, not a requirement on its holder.

So a per-bonus table would not expose something the platform has; it would invent a product concept
(who sets the requirement, per type or per award, what happens to a partly-wagered bonus on expiry)
and every one of those is an operator's decision. `GET /user/wager/tasks` therefore answers with the
requirement that IS real, in the shape the page needs: a list, of one, with `scope: 'account'` so a
client can tell it apart from bc.game's per-bonus list without reading this. **A zero target lists
NO task** rather than a completed one - a player who has never deposited has no requirement, which
is not the same as having satisfied one.

**`userwager_history` now has a writer.** `(uid, previous_wager, new_wager, updated_at)`, a designed
audit table with nothing writing it - the same shape as `gis_recently_played` before Part 4b.13.
`recordActivity` is now the only thing that moves `userwager`, so it is the natural writer, and a
rollover page that can show WHEN progress was made is worth the row. Best-effort like the rest of
that method.

### 15. Two model columns the database had and Sequelize did not - one of them mine

`packages/db/src/models/extensions.js` is where post-baseline columns are declared, and its own
header describes the failure mode exactly: *"a model missing a column fails at runtime in the worst
possible way - the INSERT succeeds and the column is quietly left null."* Both of these were that.

**`users.withdraw_whitelist_only` - mine, caught by a test.** Migration 039 created it; I did not
declare it. `Users.update({ withdraw_whitelist_only: true })` reported success, wrote nothing, and
the next GET answered `false` - the switch appeared to turn on and did not. It was only visible
because the test read the value back through a DIFFERENT route than the one that set it.

**And the route was echoing its argument, which is what let it hide.** `setEnforcement` returned
`{ whitelistOnly: enabled }` - the input - so the write's failure could not surface there. It reads
the row back now. **Echoing an argument is not a result.**

**`siteconfig.eur` - PRE-EXISTING, and it made Part 4b.1 a no-op for writes.** Migration 037 added
the column and `PUBLIC_FLAGS` lists it, so the flag READS (absent from a model read it defaults to
ON, which is the documented behaviour for a missing flag) - but `Siteconfig.update({ eur })`
silently dropped the key, so **an operator could not turn EUR off.** That is precisely the defect
037 was written to fix. Found by `node tools/verify-models.js`, which this file's header points at
and which reported it as the only mismatch platform-wide. Both are declared now and that tool
reports **"Every model matches the database."**

### 13. The three writes an in-house bet never performed — gaps 2 and 19, closed together

`GamesService.recordActivity({ userId, gameRef, wagered })`, called from
`in-house/engine/gameEngine.placeBet` and from the js-games v1 settle path.

**It nearly went in the wrong module.** `js-games` looks like the in-house games and is not — it is
the huidu provider, and it is unconfigured, so writes added there would never have run. The games
the platform actually serves settle through `in-house/engine/gameEngine.js`, which is what wrote
the four seeded bets. Both paths call the helper now; only the engine's can be exercised today.

**On `placeBet`, not `settle`, and outside the transaction.** A bet counts toward a wagering
requirement when it is PLACED — the requirement measures turnover, not outcome — and recording it
in `settle` would also miss a round that never settles. Outside the transaction because these are
bookkeeping ABOUT the bet: a failed counter must never roll back a debit that already happened,
so each write is caught and logged.

**`userwager.wager` IS A `text` COLUMN, and that made the first version silently wrong.**
Sequelize's `increment` emits `SET wager = wager + 10`, Postgres answers `operator does not exist:
text + unknown`, and because the failure is caught and logged the first bet created the row and
every bet after it left the total untouched. **Found only by asserting on a SECOND bet** — a
single-bet test passes against the broken version. It is now
`(COALESCE("wager",'0')::numeric + n)::text`, done in the database so two settlements landing
together both count, with the amount checked against a decimal pattern before it reaches the
literal. Same family as the varchar/bigint comparison in Part 4b.3, and a reminder that the
schema's types are not what their names suggest: `uid` here is a bigint, unlike `bets_30s.uid`.

**`recentlyPlayed` had to learn the second catalogue too**, or the whole thing would have been
half a fix: it matched `Gisgamesnew` alone, so an in-house `game_uid` came back as a row with
`game: null` — present in the list and unnamed. The dual-catalogue resolver the favourites list
already used is now extracted as `#resolveGames` and shared by both, which is this project's
second-call-site rule applied on the backend.

**What it closes:** `/recent` and the home and casino pages' Continue Playing tab (gap 2),
`GET /user/wager/progress` reporting a real wagered figure so a requirement can be met by playing
the platform's own games at all, and `profile.gamesPlayed` (both gap 19).

### 12. `unreadOnly` on the notifications history, and the boolean-query trap — gap 10

`notifications.service.history` gains an `unreadOnly` filter, additive and defaulting off so
every existing caller is unaffected. The panel has an unread tab, and filtering a page of 50 in
the client would page over rows it then discards and report a total that disagrees with what it
shows.

**The flag itself was nearly a defect, and the codebase had already written the warning twice.**
`z.coerce.boolean()` maps EVERY non-empty string to `true`, `"false"` included — `staff.validators.js`
and `games.validators.js` each say so at length. Both new validators used it, and because
user-service forwards the flag to the internal route as a query STRING, `unreadOnly=false`
arrived as `true`: after `read-all`, a plain `GET /user/notifications` returned **zero rows** and
the notifications looked deleted. Caught by asserting `unreadOnly=false` explicitly rather than
only the absent case. Both sides now use the `flag()` shape those two files already use — an
explicit `z.enum(['true','false'])` and a transform.

Worth knowing that this is not the only place: `banners`, `blogs`, `marketing` and the device
list all still take a query boolean through `z.coerce.boolean()`.

### 11. The internal client drops `meta`, so a paginated internal route cannot be proxied — gap 10

`serviceClient.request` unwraps the standard envelope so callers get the payload directly:

```js
return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
```

`meta` is not carried with it. So `response.paginated` on an internal route arrives at the calling
service as a bare array with the total gone, and the caller cannot tell a full page from the last
one. `/internal/admin/notifications/history` now answers `response.ok` with
`{ rows, total, limit, offset }` in `data` instead, and user-service rebuilds the envelope. It had
no callers before this work, so the shape could be settled rather than worked around — **anything
else paginated that a service means to proxy has the same problem**, and the alternative fix is a
client that preserves `meta`.

### 10. A player's notification inbox — four routes over logic that already existed — gap 10

`services/user/src/modules/notifications/` — a module that owns no table and reads none. It proxies
`/internal/admin/notifications` through `clients.admin`, which is the seam the platform had already
chosen: admin-service owns the sending side, and the internal routes' own file opens *"What a
PLAYER does with their own notifications … user-service proxies the three player-facing actions"*.
**That proxy was never written**, so the routes, the table and the service all existed and a player
still had no inbox — `/internal/` is blocked at the edge and nothing on this side reached it.

`GET /user/notifications` (with `unreadOnly`, `limit`, `offset`), `GET /unread-count`,
`POST /:id/read`, `POST /read-all`. **`read-all` is declared BEFORE `/:id/read`** or Express matches
the literal against the parameter and a read-all arrives as a request to mark a notification called
"read-all". No new admin route was needed for it: `markRead` already treats an absent
`notificationIds` as "every unread one".

**One ACL line was required** — `'/internal/admin/notifications'` on `user-service` in
`packages/common/src/internalAcl.js`. Without it the call answered
`403 FORBIDDEN "This service is not permitted to call that endpoint"`, which is the ACL working.

### 9. Sign one device out — gap 25

`AuthService.revokeSession(userId, sessionId)` and `DELETE /user/auth/sessions/:sessionId`. The
device list has been readable since the port with nothing able to act on it; `change-password`,
which ends ALL sessions, was the only thing in the module that revoked anything.

**It walks the forward chain.** A refreshed session lives on as a NEW row with the old one pointing
at it through `replaced_by`, so revoking only the row the client listed would leave the device
signed in under its successor. Same traversal `#revokeChain` does — **without** its second
statement, which then revokes everything else the player has. That statement is right for a
token-reuse alarm and would be a bug here: removing one device must not sign you out of the one you
are asking from.

**A new error, `AUTH_DEVICE_NOT_FOUND`, at 404.** `SESSION_NOT_FOUND` already existed and is a 401
meaning *the caller's own* session is dead — reusing it would sign the player out, and 401 is what
this project's transport reads as "refresh and replay", which is gaps 22 and 22b on a third
endpoint. Same 404 for "not yours" as for "does not exist", so ids cannot be probed.

**Revocation stops the REFRESH, not the access token** — measured, and it is platform-wide rather
than anything this route does: `logout` behaves identically, an already-issued access token keeps
working until it expires. Worth recording as a property of the platform; it is not a defect of
this route and fixing it would mean checking the session row on every authenticated request.

### 8. Register, password reset and change e-mail over HTTP — gaps 12 and 23

**Three route files over methods that were already written, tested and unreachable.**
`AuthService.register`, `.requestPasswordReset` and `.completePasswordReset` had only `sockets.js`
as a caller; `ProfileService.changeEmail` had only `EDIT_ACCOUNT`. Nothing about the logic changed.

`POST /user/auth/register`, `/forgot-password`, `/reset-password` on the public router, and
`POST /user/profile/change-email` on the user router.

- **Registration mints no session.** The service answers `{id, name, email}` and the client calls
  `login` next, which is what the socket flow did. `id` is serialised as a string — it is a bigint,
  and `JSON.stringify` turns a number past 2^53 into something that is not the id.
- **Reset answers identically for a registered and an unregistered address**, and the service
  computes that reply before it branches so the two cost the same. Nothing in the route shapes it;
  a 404 for an unknown address would rebuild the enumeration oracle the service is avoiding.
- **`change-email` requires the code rather than treating it as optional.** The socket verified one
  only `if (code !== undefined)` and leaned on `proveEmail` to refuse otherwise, which makes "no
  code" and "wrong code" two paths to one refusal. The two-step split is kept exactly: the code is
  VERIFIED in the controller and the proof is SPENT inside `changeEmail`, so one verification
  authorises one change.
- **Both are metered at 5/hour**, the budget the socket handlers carried — `forgot-password`
  unmetered is a way to have the platform email somebody repeatedly, and `register` unmetered is a
  way to fill `users`. One limiter shared by the two reset routes, since they are halves of one
  flow.

**The reset arm needs SMTP, which is four empty keys.** The mailer exists
(`packages/common/src/mailer.js`) and reports failure rather than throwing, so the routes work and
the email does not arrive. Verified end to end by planting a token hashed the way `hashToken` does.

### 7. Favourite games — a table, a model and three routes — gap 1

**The only entry in this list that ADDS A FEATURE.** Everything above it fixes or exposes
something the platform already had. This one had nothing to expose: no `favourites` table, no
route at any audience, no column on `users`, and none in the legacy system this was ported from
either. The front-end's `/favorite` page has therefore been correctly empty since it was built,
and the star in the game page's toolbar was drawn and inert.

**What was added**

- `packages/db/migrations/038-user-favourite-games.js` — `user_favourite_games`
  (`id, user_id, game_ref, source, created_at`), unique on `(user_id, game_ref)` so a repeated
  star is idempotent, plus a `(user_id, created_at DESC)` index for the one read.
- `packages/db/src/models/extended/UserFavouriteGames.js` — hand-written, in `extended` beside the
  other post-baseline tables, so a model regeneration never touches it. The registry discovers it
  by directory scan; no index file to edit.
- `services/casino/src/modules/games/` — `favourites`, `addFavourite` and `removeFavourite` on the
  service, their validators, controllers, one error (`TOO_MANY_FAVOURITES`, 422 at 500 rows) and
  three routes. The module's `models:` line gains `extended`, which is documentation rather than
  wiring — three sibling modules already declared it, so the domain was loaded either way.

**`GET /casino/games/favourites`, `PUT` and `DELETE` on `/:gameRef`** — not the `/user/favourites`
this file used to propose. Resolving a favourite means reading `gisgamesnew` and `js_games`, which
are in the `casino` domain; user-service does not load it, and the model registry's own note says a
read crossing a domain boundary goes over HTTP. Mounting the list on user-service would mean an
internal HTTP hop on every render of the page for data casino-service already has in hand. The
resource lives with the catalogue it is about, next to `recently-played`, which is the same kind of
thing.

**PUT rather than POST, and DELETE that does not 404.** Starring is a state, not an event: pressing
the star twice is the same fact stated twice, and un-starring something already gone is the state
the caller asked for. Both answer 200. A 409 or a 404 here would make the client handle a race it
cannot avoid — two tabs, one star.

**THE REFERENCE IS OPAQUE, AND THAT IS THE ONE DECISION WORTH ARGUING WITH.** There are three names
for a game in play — `gisgamesnew.uuid`, `js_games.game_uid`, and the front-end's own slug — so
`game_ref` is stored as the client gave it and resolved against both catalogues on read, answering
`game: null` for one that matches neither. That follows `recentlyPlayed` one method up, which keeps
a play whose game has left the catalogue and returns it with `game: null`, as legacy's LEFT JOIN
did. The alternative — refusing a reference that does not join today — would have left the page
exactly as empty as it was, because the aggregator catalogue is unsynced on this delivery (Part 4)
and only the twenty in-house games resolve. A favourite is a bookmark, not a foreign key; the same
reasoning is why there is no real FK, which would silently empty a list when a provider retired a
game. The cost is that a typo is storable, bounded rather than prevented: 190 characters, a
character-class check on the way in, and 500 rows per player.

**Verified against the running platform**, eleven behaviours: the empty read, a star, the same star
again, a second game, the two-row read resolving `crash` and `limbo` to their in-house names, a
delete, the same delete again, a rejected reference containing a space (422), a rejected `source`
(422), `limit=0` (422), and an unauthenticated read (401). Then through a real browser as
`demo_player03`: star two games from the game page, reload to prove it came back from the server,
see both on `/favorite` newest-first with their artwork, un-star one and watch the grid shrink, and
sign out to find the star inert rather than empty-and-clickable. The rows were removed afterwards.

**The star's own styling is the original's, and getting it took rung 3 of the recovery ladder.**
`/game/:gameUnique` resolves to `X("GameLayout")`, and `X` imports `/modules/games/remoteEntry.js`
— so the game page is in the federated `games` remote and NOTHING about it is in the mirror. A
first pass read the mirror's stylesheet, found no favourite rule, and concluded the original had
none. It has all of it: `remoteEntry` → `manifest-kUovHkMN.js` → `GameLayout: np` →
`Layout-DI8MpYIQ.js`, where the toolbar hands the icon
`K("size-5 mb-0.5", e.isFavorite ? "fill-warning" : "fill-secondary")` with
`component: e.isFavorite ? ol : ll`. So the engaged colour is `--warning`, the icon SWAPS between
a solid star and an outline rather than being recoloured, and `handleFavorite` opens with
`if (!z.login) { X.emit("navigate", "/login/signin") }` — the control is live when signed out.
All three are now what this build does. The press animation is not in the original's CSS or in any
of the 75 remote chunks and remains this build's.

**British spelling in the table and the routes, `/favorite` in the URL.** The front-end route is
bc.game's own and this port does not change URLs; the backend follows its own convention. Noted so
neither looks like a typo.

### 6. `note` reaches the owner of a rejected crypto withdrawal — gap 26

`cryptoWithdraw.service.js`, `#present`. `note` moved out of the `forStaff` block. A player could
see `status: "rejected"` and no reason, while a rejected fiat DEPOSIT explained itself through
`adminComment` on its own list — the same situation handled opposite ways. `decidedBy` and
`decidedAt` stay internal: WHO decided and WHEN is process, WHY is the only one of the three the
player can act on.

### 5. The two withdrawal rails stop disagreeing about bank details — gap 26

`transactionHistory.constants.js`, the fiat withdrawal source. `FiatWithdrawService` gates
`account_number` and `ifsc_code` behind `forStaff`, and this source handed both to the same player
on the same record. Settled towards the narrower reading, which is also what the crypto rail beside
it already does: the account number is masked to `••••7890` in `destination` and in the `details`
string, and `ifscCode` is dropped. A masked tail is what a player needs to recognise which account
they used.

### 4. `/user/crypto/chains` and `/coins` refuse instead of crashing — Part 5.2

`crypto.errors.js` gains `PROVIDER_DISABLED` (503, the same status and shape as `payment-orders`'
error of that name), and `#ccpayment` checks for the client and both credentials before reaching
for `this.http.raw`. `http` is not injected when no provider is configured, so both routes died on
a `TypeError` and answered 500 where every other provider on the platform refuses politely and by
name. Verified: both now answer `503 CRYPTO_PROVIDER_DISABLED`.

### 3b. Three refusals inside authenticated requests move from 401 to 403 — gaps 22 and 22b

`auth.errors.CURRENT_PASSWORD_INCORRECT`, and `twofa.errors.INVALID_CODE` and `PASSWORD_REQUIRED`.
Each is raised when the caller's bearer token was perfectly good and a credential check ON TOP of
it failed, which is not an authentication failure — and 401 is the status this project's transport
reads as "the access token expired", so it refreshed the session and REPLAYED the request. Every
wrong password and every mistyped six digits reached the server twice and rotated a refresh token
on the way, so any lockout, rate limit or audit trail built on those attempts counted double.

**`auth.errors.TWO_FACTOR_REQUIRED` and `TWO_FACTOR_INVALID` stay 401 on purpose.** They are raised
during LOGIN, where there is no session yet and a failed factor really is the authentication.
Confirmed both ways: a wrong sign-in still answers `401 AUTH_INVALID_CREDENTIALS`, while
change-password answers `403` and `2fa/setup-verify` answers `403 TWOFA_INVALID_CODE`.

Measured in the browser, which is where the cost was: a wrong current password now produces
**one** request rather than two, and the dialog still shows "Sorry. Invalid old password, please
try again."


### 3. Two fixes on `GET /casino/bet-history/timed-rounds`

`services/casino/src/modules/bet-history/betHistory.service.js`, `myTimedRounds`. The route
answered `500 DATABASE_ERROR` for `30s`, `1m` and `2m` alike, and there were **two** causes — the
second invisible until the first was fixed, which is worth knowing before calling a 500 diagnosed.

- **`order: [['id','DESC']]` named a column that does not exist.** The three tables are each
  `uid, value, amount, sessionid, status, cointype`, and their generated models call
  `removeAttribute('id')` with the note "This table has no primary key in the schema". So the
  ordering named a column the model had explicitly dropped. It is now `sessionid`, the only column
  identifying a round — a LEXICAL sort, so a writer storing bare counters would need zero-padding
  or a real ordering column, but deterministic, which beats the arbitrary order no ORDER BY gives
  a LIMIT.
- **`where: { uid: userId }` compared varchar to bigint.** `uid` is `varchar(250)` and
  `req.user.id` is a bigint, so Postgres refused with `operator does not exist: character varying
  = bigint`. Now `String(userId)`, which is what the KYC module already does for the same reason.

Verified with seeded rounds: three answer newest-first (`S-0003, S-0002, S-0001`) and `limit=2`
returns the first two. The rows were removed afterwards.

**It still answers `[]` for every real account, and that is a separate gap.** Nothing in the
delivery writes `bets_30s`, `bets_1m` or `bets_2m` — checked across `services/` — so this is the
same shape as `gis_recently_played` and `VaultInterestHistory`: a read whose producer does not
exist. Fixing the crash makes the route honest, not useful.

### 2. `kycId` on the KYC status response

`services/user/src/modules/kyc/kyc.service.js` — one field added to what `GET /user/kyc/status`
returns.

**Without it `GET /user/kyc/documents/:kycId/:field` was unreachable from any client.** That route
takes a kycId, resolves the row, and refuses unless the caller owns it — answering the same `404`
for "not yours" as for "not found", so ids cannot be enumerated. All of that is right. But the
status read was the ONLY player-facing read of a KYC record, and it returned the status, the
dates, the document type and which documents exist while never saying WHICH RECORD. A player had
no way to learn their own id, and the ownership check correctly stopped them guessing, so the
route could only ever be exercised by staff.

Additive, no migration, no schema change: the row is already loaded. Named `kycId` rather than
`id` because that is what the route parameter, the service argument and every log line in the
module already call it.

### 1. `siteconfig.eur`

Migration `packages/db/migrations/037-siteconfig-eur-flag.js`, plus `'eur'`
added to `PUBLIC_FLAGS` in `services/admin/src/modules/site-config/siteConfig.service.js`.

`wallet.constants.js` declares 28 currency columns and the public flag list carried 27. EUR was
the only currency a player can hold that an operator could not switch off — it looks like a
transcription gap rather than a decision, since the six fiats are listed together and EUR simply
is not among them. It became worth fixing the moment the front-end started gating its wallet on
these flags: an absent flag has to default to ON, so EUR would have been permanently visible
while every other currency was switchable.

`boolean DEFAULT true NOT NULL`, idempotent, no `down()` — the shape migrations 034 and 035 use
for exactly this. Existing rows keep EUR on, so nothing a visitor sees changes until an operator
decides otherwise. `OPERATOR_FLAGS` is `[...PUBLIC_FLAGS, 'sports', 'home_livesports']`, so the
one-line allow-list edit is also what makes the staff screen able to write it — the column and
the allow-list entry have to land together, which is the defect 035 describes.

---

## Part 5 — Problems found in the backend

Real defects, not configuration.

1. **The sports service cannot start.** `services/sports/src/modules/bets/bets.service.js` requires
   `./legacy/oddsGuard`, `./legacy/marketName` and `./legacy/markets`, and that `legacy/` folder is
   **not in the delivery**. The worker exits at boot, and `scripts/dev.js` stops every other service
   with it — so it looks like "the whole platform will not start" when it is one missing folder.
   Work around it by naming the services: `npm run dev user admin casino gateway`.

2. **FIXED (Part 4b.4) — `/user/crypto/chains` and `/user/crypto/coins` returned 500 instead of
   refusing.** With no
   provider configured they throw `TypeError: Cannot read properties of undefined (reading 'raw')`
   at `crypto.service.js:376`. The five payment gateways handle the same situation correctly with a
   `503`, and so does the in-house game launch in Part 4. These two should do the same.
   (`/casino/gis/game-tags` is a third variant again — it answers `502 GIS_UPSTREAM_FAILED`,
   reaching for an upstream it has no keys for rather than refusing by name.)

   To reproduce `coins` you must pass its required parameter — `/user/crypto/coins?symbol=USDT`.
   Without it the validator answers `422` first and hides the crash, which is easy to mistake for
   the route behaving.

3. **FIXED — `GET /casino/bet-history/timed-rounds` returned 500 for every interval.** Two
   defects, and the second only appeared once the first was gone. **Fix 3 in Part 4b**; the
   diagnosis is kept below because the shape of it generalises — a 500 can have a second cause
   hiding behind the first, and the first fix will look like it failed.

   ~~**`GET /casino/bet-history/timed-rounds` returns 500 for every interval.**~~ `myTimedRounds`
   (`betHistory.service.js:597`) orders by `id`:

   ```js
   return model.findAll({ where: { uid: userId }, order: [['id', 'DESC']], limit, raw: true });
   ```

   **None of the three tables it queries has an `id` column.** `bets_30s`, `bets_1m` and `bets_2m`
   are each `uid, value, amount, sessionid, status, cointype` — checked in `information_schema`,
   and `select * from bets_30s order by "id" desc` fails with `column "id" does not exist`. So the
   route answers `500 DATABASE_ERROR` for `30s`, `1m` and `2m` alike; there is no argument that
   works. **Order by `sessionid`** (or add the column), and note the same three tables have no
   timestamp either, so "most recent" needs deciding rather than assuming.

4. **Nothing ever credits vault interest.** `VaultInterestHistory` is read in three places in
   `vault.service.js` and written in none. There is no job, no cron and no service that adds
   interest. So "yesterday's return" is truly zero, not just unread.

5. **`scripts/setup.js` fails on Windows.** `run()` and `capture()` spawn `process.execPath`
   (`C:\Program Files\nodejs\node.exe`) with `shell: true`, so the command splits at the space and
   every database step fails with `'C:\Program' is not recognized`. Harmless on Linux and macOS.

   **`backend copy/` is patched** — both functions now `JSON.stringify(command)` when
   `process.platform === 'win32'`, read out of the file rather than remembered. **The second
   delivery is not**, and `setup.js` is the only source file that differs between the two trees,
   so the patch has to be carried across by hand. Re-apply it if either folder is replaced.

6. **Do not put a space in `DB_NAME`.** It half-works, and `scripts/seed-test-logins.js` refuses any
   name that does not match `/(test|restore|dev|local|sandbox|staging)/i` — six alternatives, read
   off the regex at `seed-test-logins.js:40`. An earlier draft of this file listed five of them and
   left out `restore`.

---

## Part 6 — Small differences to keep in mind

Not missing features, but they change what the site can show.

- **There is no BCD.** The wallet has **28 fixed currency columns** (`wallet.constants.js`) and BCD,
  the coin the old site used as its default, is not one of them. This site's sample data is
  denominated in BCD, so the two do not line up until the fixtures come off.
- **28 currencies against 148 on the old site.** The coin list is genuinely shorter. That is the
  backend being smaller, not something dropping out.
- **Currency codes are bare.** The backend says `INR`; this site's code says `INRFIAT` for the same
  thing. The translation is done in one place in the front-end.
- **KYC has one status and no levels.** `NotSubmitted`, `Unverified`, `Pending`, `Verified`,
  `Rejected` for the whole account. The old site had a Basic and an Advanced level. Basic is mapped
  onto the one status; Advanced stays empty.
- **Swap's `feePercentage` is a fraction, not a percent.** `0.15` means 15%. It also refuses a swap
  from a currency to itself with a `422`, which the old site allowed.
- **The wallet ledger has no date filter.** Deposits, withdrawals and bet history do take `from` and
  `to`; the ledger does not, so the time filter on that one tab cannot reach the server.
- **Two VIP levels disagree.** `GET /user/profile` returns `level` (a stored column an operator
  sets) and `GET /user/bonus` returns `vip.level` (worked out from lifetime wager). The front-end
  trusts the second, because that is the one the backend's own eligibility checks compare against.

---

## How this was checked

**SEVENTEEN harnesses now, not two.** This section said "two" for a long time after it stopped
being true. All are throwaway and none is imported by `src/`.

```bash
cd "backend copy" && npm run dev user admin casino gateway    # never bare `npm run dev`
```

**Front-end, in the project root** — all need the backend running; the happy-dom ones need
`HAPPY_DOM=<scratchpad>/node_modules/happy-dom`:

| File | What it covers |
| --- | --- |
| `verify-services.mjs` | every `live: true` read and the adapter behind it |
| `verify-pages.mjs` | mounts the real `App` at 13 routes and asserts on the settled DOM. `FIXTURES=1` runs the same pass with the seam back on captured payloads — that arm is the regression check |
| `verify-wiring.mjs` | the 2026-09-04 adapters (Part 1b). Needs `RATE_LIMIT_ENABLED=false` |
| `verify-favorites-home.mjs` | the Continue Playing / Favorites block, end to end |
| `verify-tile-navigation.mjs` | that a game tile navigates the ROUTER rather than reloading the document |
| `verify-whitelist.mjs` | gap 16's four writes at the service level, and the two server-side rules that guard the money. **Destructive — snapshots and restores, and points at `demo_player05`** |
| `verify-freespins.mjs` | gap 8's free-spin listing and its adapter, plus migration 040's freeze end to end — register, change the password, watch the rail refuse, watch the window expire. **Destructive**, same precautions |
| `verify-security.mjs` | the two Security modals that can submit — the e-mail change (including that its OTP is blocked on SMTP) and the 2FA disable, both proofs asserted separately. Runs entirely on throwaway accounts; **needs `RATE_LIMIT_ENABLED=false`** |
| `shot-wiring.mjs`, `shot-wiring-seeded.mjs`, `shot-drawer.mjs` | real Chrome via playwright-core against the dev server on 5173, screenshotting each wired surface |
| `shot-whitelist.mjs` | the whole whitelist feature walked as a visitor does — add, rename, arm, disarm, delete — at 1440 and again at 390, where the delete goes through the phone row's three-dot menu. Same destructive precautions as `verify-whitelist.mjs` |
| `shot-freespins.mjs` | `/free-plays` with a real row, the Account Restrictions confirm INCLUDING its five-second countdown (the one thing here no service call can assert), and the dialog title bar at both widths. Cancels rather than confirms, so it changes no password |
| `shot-security.mjs` | all six Security tiles opened in turn. Four of the six are UI-only, which is exactly the kind of screen that ships broken without a picture; it also checks the anti-phishing rules arm and disarm the Create button as you type |

**Backend, in `backend copy/`:**

| File | What it covers |
| --- | --- |
| `verify-new-routes.mjs` | gaps 12, 10, 20, 23, 25. Needs `RATE_LIMIT_ENABLED=false` |
| `verify-tier2.js` | gaps 2 and 19, driving the real `GameEngine` |
| `verify-tier3.mjs` | gaps 4, 7, 13, 14, 16, 17, 18 |

**AND THE PLATFORM SHIPS SIX OF ITS OWN, under `backend copy/tools/`, which this file had never
mentioned and which found two things nothing else did.** `verify-models.js` compares every model
against the live schema — it is what caught both undeclared columns in Part 4b.15.
`verify-internal-acl.js` checks that every inter-service call the code makes is actually granted;
it confirmed the ACL line Part 4b.10 adds, and caught a false positive described below.
`verify-authz.js`, `verify-modules.js`, `verify-security.js` and `verify-frontend-routes.js` are
the others. Run them; they are cheap and they know things the throwaways do not.

**Three of them fail on this delivery and all three are ONE pre-existing cause** — the missing
`services/sports/src/modules/bets/legacy/` folder of Part 5.1. `verify-modules` reports
`✗ sports: Cannot find module './legacy/oddsGuard'`, and `verify-security` and
`verify-frontend-routes` both invoke it and inherit the failure. Nothing to fix here; recorded so
the next reader does not chase it.

**A DOC COMMENT CAN FAIL THE ACL TOOL.** `verify-internal-acl.js` scans every file for an internal
path inside quotes *or backticks* and treats each hit as a call the enclosing service makes. A
JSDoc comment in `betHistory.service.js` quoted one to explain what gap 18 replaced, and the tool
duly reported that casino-service calls itself and is not permitted to. The comment now names the
path in prose. The regex skipping comments would be the better half of that fix and is not done.

**AND A HARNESS CAN BE KILLED BEFORE ITS CLEANUP RUNS.** `node shot-whitelist.mjs | head -22`
closes the pipe as soon as `head` has its lines; node takes SIGPIPE and dies **before `finally`**,
so the snapshot-and-restore never happens. It left one address on `demo_player05` — caught only
because the label carries the run's own random stamp, which is the reason that convention exists.
Use `tail`, redirect to a file, or let it print. The three `shot-*.mjs` files say so at the top.

**A HARNESS DESTROYED A REAL PERSON'S DATA, TWICE.** `verify-tier2.js` cleaned up with
`where: { uid, game: 'limbo' }` and took a pre-existing seeded bet with it (see the previous run
log). Worse, `verify-favorites-home.mjs` opened by deleting EVERY favourite on `demo_player03` —
the account the browser is signed into — so each regression run silently removed the user's own
starred games. It surfaced days later as *"the Favorites section disappears after restarting the
dev server"*, with nothing connecting the symptom to the cause; the restart was simply when they
next looked. Both are fixed: delete by the ids the run created, snapshot anything you clear and
restore it in `finally`, and point a destructive harness at `demo_player05` rather than the account
a human browses with. **A cleanup phrased as a predicate will eventually match a row somebody cares
about.**

The test data behind those numbers was created against the dev database, not invented: four
in-house bets over the casino socket, one fiat deposit request, and one KYC submission approved
through a demo staff account so a withdrawal could be raised.

**Three of those live assertions expire after a day.** The `/wallet/bet-history` checks — rows
present, a game name in the Type column, a winning multiplier — read the pane at its DEFAULT time
filter, which is "Past 24 hours". The four seeded bets are dated 2026-09-02 07:40 UTC, so from
about 26 hours later the pane is correctly empty and those three fail while
`verify-services.mjs` still reports all four rows, because the service call carries no date
range. Seen on 2026-09-03 and confirmed not to be a regression by re-running against a stashed
tree; seen again on 2026-09-04, which is the point — **this will recur on every run from now on**,
and a reader who has not read this paragraph will diagnose it as a regression each time. If you
want them green again, place fresh bets rather than changing the assertions.

### Last full run — 2026-09-04, the closing analysis

**Everything green except the three known ones.** `verify-services` **41/41**, `verify-pages`
**46/49 live** and **49/49 with `FIXTURES=1`**, `verify-whitelist` **20/20**, `verify-freespins`
**23/23**, lint clean, build clean. The three live failures are the long-standing
`/wallet/bet-history` expiry and have been identical since before this run's work, confirmed
against a stashed tree in an earlier pass.

**The platform's own tools:** `verify:models` clean, `verify:internal-acl` clean, `verify:authz`
clean. `verify:routes` and `verify:frontend` fail on the one pre-existing sports `legacy/` folder
of Part 5.1, as they always have.

**The route sweep was finally re-run** — see the box under "What is left after Part 2". The
qualitative picture in this file held; only the arithmetic was stale.

**A tool run nearly destroyed three tracked platform docs**, which is recorded in that same box:
`tools/route-inventory.js` regenerates them from `legacy/`, and an empty stub created to get past
the missing folder emptied 8,273 lines. Restored from git. That folder's absence is a known
delivery gap, not something to work around.

### Previous full run — 2026-09-04, after the six Security modals

**Front-end:** `verify-security.mjs` **12/12**, `shot-security.mjs` **16/16 observations**,
`verify-freespins.mjs` **23/23**, `verify-whitelist.mjs` **20/20**, `verify-services.mjs`
**41/41**, `verify-pages.mjs` **46/49**, lint clean, build clean. The three `verify-pages`
failures are the long-standing `/wallet/bet-history` expiry.

**TWO CORRECTIONS CAME OUT OF THIS RUN, both from assertions that expected success and got a
refusal.** The mailer does not degrade, it throws (see the correction box under gap 12), so the
e-mail change is blocked on SMTP rather than working; and `totp.currentCode` refuses a code whose
30-second step was already spent, so the harness has to wait for the next window before disabling
2FA — which is the replay guard working, not a defect.

**`verify-security.mjs` NEEDS `RATE_LIMIT_ENABLED=false`** and the flag was put back afterwards.

### Previous full run — 2026-09-04, after gap 8's free spins and migration 040

**Front-end:** `verify-freespins.mjs` **23/23**, `shot-freespins.mjs` **15/15 observations**,
`verify-whitelist.mjs` **20/20**, `verify-services.mjs` **41/41**, `verify-pages.mjs` **46/49**,
lint clean, build clean. The three `verify-pages` failures are the long-standing
`/wallet/bet-history` expiry, confirmed identical against a stashed tree in the previous run.

**The platform's own tools:** `verify:models` clean (**after** migration 040 — the new column was
declared in `extensions.js` in the same pass, which is the lesson Part 4b.15 paid for),
`verify:internal-acl` clean, `verify:authz` clean. `verify:routes`, `verify:modules`,
`verify:security` and `verify:frontend-routes` all fail on the one pre-existing sports `legacy/`
folder of Part 5.1.

**THE BACKEND HAS NO WATCHER.** `scripts/dev.js` does not restart on a file change, so a new route
answers 404 until the services are restarted — which cost one confusing harness run here. Restart
after touching anything under `services/`.

**A TEST THAT PASSED FOR THE WRONG REASON, caught by the assertion beside it.** The freeze harness
registered a throwaway account, changed ITS password, and then asserted against `demo_player05`'s
column — but `auth.register` signs the new account in, so every request was going out as the
probe. The refusal assertion passed (the probe really was frozen) and only the expiry assertion
failed, which is what exposed it. Assert against the account you are actually authenticated as.

### Previous full run — 2026-09-04, after wiring gap 16's write path

**Front-end:** `verify-whitelist.mjs` **20/20**, `shot-whitelist.mjs` **21/21 observations**,
`verify-services.mjs` **41/41**, `verify-pages.mjs` **46/49**, lint clean, build clean. The three
`verify-pages` failures are the long-standing `/wallet/bet-history` expiry and were confirmed
identical against a stashed tree — they pre-date this change rather than being caused by it.

**No backend change in this pass**, so the backend harnesses were not re-run; the figures from
the previous run below still stand.

**The two harnesses added here are DESTRUCTIVE and are written the way the fidelity rule now
demands:** they run against `demo_player05` rather than the account a human browses with, they
delete only rows they created (by id, then by their own random stamp), and they snapshot both the
pre-existing addresses and the enforcement flag and restore them in `finally`. Both print what
they restored, so a run that cleaned up too much would say so.

### Previous full run - 2026-09-04, after building Tier 1, Tier 2 and Tier 3

**Front-end:** verify-services **41/41**, verify-pages **46/49 live** / **49/49 fixtures**,
verify-favorites-home **23/23**, verify-tile-navigation **8/8**, **verify-wiring 40/40**, lint
clean. `verify-wiring.mjs` is the front-end half of Part 1b and needs the same
`RATE_LIMIT_ENABLED=false` the register route does. The three live
failures are the long-standing `/wallet/bet-history` expiry.

**The platform's own tools:** `verify-models.js` **clean** ("Every model matches the database" —
it did not before this run, see Part 4b.15), `verify-internal-acl.js` **clean** (no denied calls),
`verify-authz.js` **clean**. `verify-modules`, `verify-security` and `verify-frontend-routes` all
fail on the one pre-existing sports `legacy/` folder of Part 5.1.

**Backend:** `verify-new-routes.mjs` **48/48** (gaps 12, 10, 20, 23, 25), `verify-tier2.js`
**12/12** (gaps 2, 19, and the new `userwager_history` write), `verify-tier3.mjs` **59/59**
(gaps 4, 7, 13, 14, 16, 17, 18). `node tools/verify-models.js` reports **"Every model matches the
database"** - it did not before this run; see Part 4b.15.

**`verify-new-routes.mjs` still needs `RATE_LIMIT_ENABLED=false`**; the other two do not.

### Previous full run - 2026-09-04, after building Tier 1 and Tier 2

**Front-end:** verify-services **41/41**, verify-pages **46/49 live** and **49/49 with
`FIXTURES=1`**, verify-favorites-home **23/23**, verify-tile-navigation **8/8**, lint clean. The
three live failures are the long-standing `/wallet/bet-history` expiry.

**Backend:** two new harnesses in `backend copy/`. `verify-new-routes.mjs` **48/48** — register,
the full reset round trip, the notification inbox, device sign-out and change-email.
`verify-tier2.js` **9/9** — the three writes, driven through the real `GameEngine`.

**`verify-new-routes.mjs` NEEDS `RATE_LIMIT_ENABLED=false`.** It makes about seven registration
calls against a 5/hour budget, so with limits on, nine assertions fail together as `429`. That is
the limiter working. The file says so at the top; put the flag back afterwards.

**One assertion changed meaning and was tightened rather than left passing.** verify-services had
`createTime === 0 || createTime > 9e11` — the `=== 0` was the allowance for gap 20, where "no join
date" was the correct answer. Both halves of that gap are closed, so it now asserts a real date;
0 would mean one of the two has regressed.

**I DESTROYED A SEEDED BET AND HAD TO RECONSTRUCT IT.** `verify-tier2.js`'s first cleanup was
`destroy({ where: { uid, game: 'limbo' } })`, which matched a pre-existing seeded bet as well as
the two it had created. Nothing carries a trace of the original — the in-house engine writes only
`bets` and `credits`, and `house`, `credits_ledger` and `wallet_history` are all silent on it — so
the row now in the table is a RECONSTRUCTION: a limbo loss of 10 INR, dated with the other three,
which restores the counts the harness asserts (4 bets, 2 wins) but is not the original stake. The
harness now records the ids it creates and deletes exactly those. **A cleanup must never be written
as a predicate that could match somebody else's row.**

### Previous full run — 2026-09-04, a full re-audit against the running backend

**verify-services 41/41**, **verify-pages 41/44 live**, **verify-pages 44/44 with `FIXTURES=1`** —
identical to 2026-09-03's numbers, and the three live failures are the same three, for the same
reason. The seeded bets are dated 2026-09-02 07:40 UTC and `/wallet/bet-history` reads at its
"Past 24 hours" default, so the pane is correctly empty two days on while `verify-services` still
reports all four rows. **Nothing has regressed; the assertions have expired a second time.** They
will keep expiring. If they are wanted green, place fresh bets — do not loosen them.

**Thirty-seven routes were re-probed rather than re-read**, because reading source tells you a
route is declared and not that it answers. Every standing claim in Part 3 held unchanged: gaps 12,
23, 24, 25, 14, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17 and 18 all answer `404 NOT_FOUND` at the audience
this front-end can reach, including `/internal/casino/bet-history/top-winners` refused at the edge.
Both Part 4b fixes still hold: `/user/crypto/chains` and `/coins?symbol=USDT` answer
`503 CRYPTO_PROVIDER_DISABLED` rather than the 500 of Part 5.2, and `bet-history/timed-rounds`
answers `200 []` rather than `500 DATABASE_ERROR`. Part 4's configuration gaps are unchanged:
`catalogue/games` and `vault/lock-options` both `200 []`.

**Gaps 19 and 20 were re-confirmed on the same response and are the two cheapest things still
open.** `GET /user/profile` answers `joinedAt: false` — the boolean column of gap 20, with no
`createdAt` or `created_at` beside it to fall back to — and `gamesPlayed: 0` after four real bets,
which is gap 19. One is a wrong column name, the other three missing writes.

**Coverage, counted rather than estimated.** `grep -c 'live: true' src/services/*.js` gives **63
live reads across 21 service modules**; **17 modules carry none** — `bonus`, `buyCrypto`,
`catalog`, `chat`, `contest`, `freePlay`, `help`, `notification`, `promotions`, `quest`, `raffle`,
`rollover`, `sports`, `tokens`, `vip`, `withdraw` and `withdrawal`'s siblings. That list is
almost exactly Part 3: those modules are on fixtures because there is nothing to call, not because
nobody has got to them. `auth` alone carries 11 of the 63.

**One harness defect found and fixed.** `verify-services.mjs` printed
`collection.getFavoriteGames (fixture)` — a label written before the favourites work of Part 4b.7
and never updated. The read has been live since (`collection.js:88`, `live: true` behind the
signed-in arm), so the harness was reporting the project's newest live integration as a fixture.
Label corrected; the assertion itself was always right.

### Previous full run — 2026-09-03, against the running backend

**verify-services 41/41**, **verify-pages 41/44 live**, **verify-pages 44/44 with `FIXTURES=1`**.
Four services up on ports 4000-4003, no startup errors. Re-run unchanged after the favourites work
(Part 4b.7), including migration 038.

**One thing that failed first and was not a regression: the harness could not sign in.**
`demo_player03` had been RENAMED to `DemoPlayer3` by an earlier session's Edit Profile test and
never put back, and the harness signs in by username. Restored. Worth knowing because it presents
as `AUTH_INVALID_CREDENTIALS` — indistinguishable from a wrong password — and the account is still
there under a different name. If the harness ever fails at step one, check `select name from users
where email like '%demo%'` before touching anything else.

**The three live failures are the expiry described just above, not a regression** — the
`/wallet/bet-history` assertions read the pane at its "Past 24 hours" default and the seeded bets
are older than that now. An earlier line here recorded 44/44 live; that was true on the morning of
the same day and stopped being true about twenty-six hours after the bets were placed. Confirmed
against a stashed tree at the time. Place fresh bets to make them green; do not loosen them.

Several claims in this file were re-checked by CALLING the routes rather than reading them, because
reading source tells you a route is declared and not that it answers. What the responses confirmed
— **every row below was re-probed on 2026-09-04 and still holds**, except the two marked FIXED
since, which now answer as Part 4b describes:

| Claim | Observed |
| --- | --- |
| 2FA routes answer (Part 2) | `GET /user/2fa/status` → `200 {isEnabled:false, hasInitiated:false}` |
| KYC submit is real (Part 2) | `POST /user/kyc/submit` → `422` listing `firstName`, `lastName` … — a validator, so the route is wired |
| In-house launch is off (Part 4) | `503 JSGAMES_NOT_CONFIGURED` |
| crypto 500 (Part 5.2) | `500` + `TypeError … reading 'raw'`, on BOTH chains and `coins?symbol=USDT` |
| No revoke-one-session (gap 25) | `DELETE /user/auth/sessions/1` → `404 Route does not exist` |
| No change-email route (gap 23) | `POST /user/profile/change-email` → `404`; `PUT /user/profile` → `422 "Nothing to update"` |
| No phone route (gap 24) | `GET /user/phone` → `404`, while `POST /user/email/otp` → `422` (so the contrast is the route, not the auth) |
| Internal blocked (gaps 7/10/13/18) | `/internal/casino/bet-history/top-winners` → `404 Route not found` at the edge |
| No register route (gap 12) | `POST /user/auth/register` → `404` |
| Rollover is one number (gap 14) | `wager/progress` → one object; `wager/tasks` → `404` |
| In-house play is invisible (gap 19) | after four real bets, `wager/progress` still reports `wagered: "0.00000000"`, `met: true` |
| `joinedAt` is a boolean (gap 20) | the harness prints `createTime=0` — the coerced `false` |
| Catalogues are empty, not broken (Part 4) | `/casino/catalogue/games` and `/casino/games` → `200` with `[]` |

### Browser pass — same date, Chrome via playwright-core against the dev server

Nineteen routes were signed into as `demo_player03` and screenshotted at 1440x900 with the live
backend behind them. **All 19 render, none logged a console error, and none printed `NaN`,
`Invalid Date`, `undefined` or `1970`.** The figures on screen agree with the API: the header pill
and wallet both read `9,769.30` INR, and Total Balance `$119.58` is that times the seeded 0.012
rate plus 2.346 USDT.

What the screenshots add over the DOM harness is *which controls lie*. Three pages show a
prominent, enabled-looking button with nothing behind it:

- **Settings → Security** drew five green call-to-action buttons — Verify Email, Verify Phone
  Number, Enable 2FA, Enable Passkey, Enable Anti-Phishing Code — and **every one was inert**.
  **Enable 2FA works now.** The other four remain: Verify Email is gap 23, Verify Phone is gap 24,
  and Passkey and Anti-Phishing have no backend at all.
- **Settings → Account Info**'s **Edit** button and **`/bonus`**'s **Redeem** input were the other
  two, and both are wired now — see Part 1.

So of the seven controls that pointed at nothing when this was written, three have been given
their destination and four are waiting on a backend that does not have them.

The pages that are *correctly* empty look right and should be left alone: `/wallet/rollover` draws
the site's own "Stay tuned" empty state (gap 14), and `/wallet/deposit` shows
`not-a-real-address-eth-ethereum` (gap 15), which is the honest placeholder rather than a bug.

Two harness lines are worth reading as evidence in their own right: `vault.getVaultAmountList`
returns 28 rows at `apr=0` (Part 4's unseeded terms plus Part 5.3's absent accrual), and
`/user/statistics` renders `Total Bets 4 / Total Wins 2 / Total Wagered $0.00` — gap 19 visible on
a page rather than in a response body.

---

## How much already EXISTS behind each gap — the buildable list, 2026-09-04

Part 3 says what is missing. It does not say how much of each is already written, and that turns
out to be the difference between an afternoon and a fortnight. Checked by reading the services,
not the routes.

### Tier 1 — the logic is written, only a route file is missing

No schema change, no new logic. A route here is a validator, a controller method and one line in
an existing `routes/*.js`; the shape is `auth/routes/public.routes.js`, which is 34 lines.

| Gap | What already exists | What is missing |
| --- | --- | --- |
| **12 — register, password reset** | `AuthService.register` (`auth.service.js:335`), `.requestPasswordReset` (:430), `.completePasswordReset` (:503) — all complete, all called ONLY from `sockets.js` | three routes on `auth/routes/public.routes.js` |
| **10 — player notifications** | `notifications.service.js` has `history` (:201), `unreadCount` (:227), `markRead` (:241). `user_notifications` is a complete table (`title, body, type, is_read, read_at, delivered, created_at`) | a `user.routes.js` on admin-service's notifications module, reading `req.user.id`. The module has `admin` and `internal` files and no `user` one — which is the whole reason this reads as absent |
| **23 — change e-mail** | `ProfileService.changeEmail` (`profile.service.js:127`), verified-code flow and all | one route |
| **18 — one bet, 13 — public top winners** | `betHistory.service` has `listForUser` (:131) and `liveFeed` (:571); the module already ships all four audience route files | expose at the right audience |
| **20 — `joinedAt` is a boolean** | — | one line: map `created_at`, not `created_estimated` |
| **25 — revoke one session** | `logout({ refreshToken, allSessions })` (:219) | a `DELETE /sessions/:id` and the service method under it |

**Gap 12 is the single biggest unblock in this file and it is not a feature.** "Nobody can create
an account" has read like a build-it item since this document was written; it is three route lines
over methods that were ported months ago. **Its reset arm depends on SMTP**, which is four empty
keys — the mailer itself exists (`packages/common/src/mailer.js`), so the routes can land before
the credentials do.

> **CORRECTION, 2026-09-04.** This said the mailer "degrades by reporting failure rather than
> throwing". It reports failure BY throwing: `EmailService.requestOtp` writes the OTP row and then
> calls the mailer, and a failed send raises `SEND_FAILED` — after the code already exists. So any
> flow that issues a code is BLOCKED, not degraded: the caller gets a refusal rather than a code
> step it can never complete. That is arguably the better behaviour ("we sent it" when we did not
> is what makes a player wait for mail that is not coming, as the service's own comment says), but
> it is not what this line claimed. Found by wiring the e-mail change (Part 4b.19) and asserting
> the send actually succeeded — it does not.

### Tier 2 — not a route, three missing WRITES, and it closes four things at once

`games.service.recordPlay({ userId, gameUuid })` (:601) exists and is called from exactly one
place: `gis.service.js:581`. The in-house settle path — `jsGames.service.js`, the `#applyMovement`
block around :178 — writes `JsGameTransactions` and nothing else.

Adding **three writes** there (`recordPlay`, `Userwager`, `users.games_played`) closes **gap 2 and
gap 19 together**, and makes four surfaces work that are correctly empty today: `/recent`, the home
and casino pages' Continue Playing tab, `wager/progress`, and Statistics' Total Wagered. One
function, four features, no new table.

### Tier 3 — needs a table, but the shape is known

**4** VIP ladder (`/user/bonus` already computes the player's level from lifetime wager; the ladder
is what is absent) · **14** rollover task list (`userwager` is `(uid, wager)` — one row per player,
so a per-bonus table is the gap) · **16** withdrawal whitelist (table plus CRUD) · **7** contest
leaderboard (the data is in bet history; it needs aggregation and a public route) · **17** public
profile (no new table — derive from `users`, but someone must decide what is public).

### Tier 4 — genuinely new features

**3** promotions · **5** quests · **6** raffle · **8** free plays · **9** achievements ·
**11** chat over HTTP with a rooms table.

### Cannot be built here — these need a vendor, not code

Every provider key in Part 4 (payments, GIS catalogue, in-house launch), and **gap 24, phone
verification**, which needs an SMS sender: the OTP module is e-mail only and there is no SMS
provider anywhere in the tree. The exchange-rate updater is buildable but needs a rate source to
point at.

---

## Suggested order of work

If the backend team asks what to do first:

**Items 1, 4 and 5 below are DONE** — gaps 12, 23, 25, 10, 2 and 19, plus 20. What is left is
configuration (2, 3) and then the feature work. The order is kept with the closures marked, because
the reasoning for the ordering is still what it was.

1. ~~**Register and reset password** (gap 12)~~ — **DONE**, Part 4b.8. It was three route files
   over methods that already existed, not a feature. Its reset arm still needs SMTP configured
   before an email actually arrives.
2. **Configure one payment provider** (Part 4) — without it no money can come in or out. The crypto
   500 that used to sit beside this is fixed (Part 4b.4); those two routes now refuse by name, so
   the only thing left here is the key.
3. **Configure the in-house game launch** (Part 4) — two keys, and without them the 20 house games
   can be listed but not played.
4. ~~**Three route files over logic that already exists** (gaps 23 and 25)~~ — **DONE**,
   Part 4b.8 and 4b.9. Both were an afternoon, as predicted.
5. ~~**Notifications** (gap 10) and **recently played** (gap 2)~~ — **DONE**, Part 4b.10 and
   4b.13. Both finished pages that already existed, and gap 2's write closed most of gap 19 with
   it. The three of them were the last of the "small, finishes a page" items.
6. ~~**VIP ladder** (gap 4) and **rollover task list** (gap 14)~~ — **DONE**, Part 4b.16. Both
   had more than half their data: the ladder was already a 75-band constant, and the rollover
   requirement was already computed. Gap 14 is built but NOT as this file asked — read Part 4b.16,
   because the shape it proposed does not exist on this platform.
7. **Promotions, quests, contest, raffle, free plays, achievements** (gaps 3, 5, 6, 7, 8, 9) — these
   are new features, each needing its own table.
8. **Chat over HTTP and more rooms** (gap 11), and **phone verification** (gap 24) — the two items
   here that are genuinely new features rather than new routes over existing logic.

Nothing in **Part 2** is on this list, on purpose: those routes are finished and the work there is
front-end only. The two biggest pieces of it — the 2FA enrolment flow and the KYC submission form —
are both built now, along with Edit Profile, the redeem field, the two Transaction detail screens,
the Claim buttons, the affiliate claim and the Vault transfers.

**What is left in Part 2 is no longer the interesting half of this file.** It is the history lists
(swap, bonus, vault transactions — two of which now hold real rows), `bank-details/:coin` whose
card tile is not drawn though its row exists, 2FA disable
which has no screen in the original to port, the redeem-code catalogue, and the blog — which has
been declined twice, deliberately, and should be read as a decision rather than a backlog item.
Everything with real weight left in it is in Part 3.

**And one item has left that list.** The whitelist's four writes were the last case of a route
this project built, verified and then could not reach from the screen it was built for; they are
wired as of 2026-09-04 (Part 4b.17). What is now the largest remaining piece of front-end-only
work is `/login/forgot` — `requestPasswordReset` and `completePasswordReset` are wired at the
seam, the link that should reach them is a bare `<a href>` to a path that is not a route, and
building it means designing a form the capture does not contain.
