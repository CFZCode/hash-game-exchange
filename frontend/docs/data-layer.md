# The data layer, the iBitPlay wiring and loading states

Part of the bc.game rebuild notes. Index and cross-cutting rules: [../CLAUDE.md](../CLAUDE.md).

## The data layer

Nothing renders from a fixture it imported itself. Every payload goes through `src/services/`, and components read it with `useResource` (`src/hooks/useResource.js`):

```js
const { data: draws } = useResource(getLotteryDraws);          // stable module fn
const read = React.useCallback(() => getLobbyEvents({ page }), [page]);
const { data } = useResource(read);                            // parameterised
```

`services/client.js` is the only seam. `request(path, { fixture })` returns a **Promise that settles after `VITE_FIXTURE_DELAY` milliseconds**, 400 by default. That REVERSES an earlier decision, and the earlier reasoning is worth keeping: it used to return the fixture itself, synchronously, because a resolved Promise settles a microtask later and would give every section one frame of empty state the live site does not have — and this project is judged on what it renders. What that reasoning missed is that it also made every loading state in the project unbuildable, since a pending arm that can never be reached cannot be checked against anything. **`VITE_FIXTURE_DELAY=0` restores the old behaviour exactly** — no Promise, no pending frame — and is what to set before measuring a page against a reference capture. `useResource` accepts a value *or* a Promise either way, so no call site cares which it gets. `VITE_USE_FIXTURES=false` plus `VITE_API_BASE` is the other switch (see `.env.example`) — config and a rebuild, not code.

`services/endpoints.js` holds every path, split into **captured** (a response exists under `bc.game/bc.game/api/`, so the shape is known), **read from saved JS** (BetBy's paths from `Com-8gtZ7Cmm.js`; URL known, shape not), and **not yet known at all** (the casino catalogue and promotions — placeholders that will need correcting). `client.js` unwraps bc.game's own envelope, `{code, msg, data}`, so a fixture and a live response look identical to a call site.

### Wiring it to the iBitPlay backend

`backend copy/` is the platform this build is being wired to — four Express services behind a gateway on `:4000`, whose whole HTTP surface is documented in `docs/API-ROUTES.md` and machine-generated into `docs/api-surface.json`. **It answers part of what this front-end renders and not the rest**, which is what shapes everything below: the wallet, swap, transaction history, bet history, affiliate, preferences, 2FA, sessions and KYC all have real routes, while VIP, Quest Hub, the weekly raffle, the daily contest, Free Plays, achievements, promotions, the notification drawer and favourites have none, and its Sports is a **cricket exchange** rather than BetBy. Its wallet is also 28 hardcoded currency COLUMNS (`credits.btc`, `.eth`, `.inr`, … — `CURRENCY_COLUMN` in `wallet.constants.js`) against this build's 148-row fixture, and **it has no BCD**, which is the fixture account's own balance currency.

**SO `VITE_USE_FIXTURES=false` NO LONGER MEANS "FETCH EVERYTHING" — IT MEANS "FETCH EVERYTHING THAT HAS A ROUTE."** A call site declares `live: true` when a real endpoint exists behind it and keeps its fixture otherwise:

```js
request(ENDPOINTS.wallet.balances, { live: true, fixture: WALLET })   // fetches
request(ENDPOINTS.quest.list,      { fixture: QUEST_LIST })           // still the fixture
```

The alternative was to flip the whole build and let the unbacked pages 404, falling back to a fixture on any error — which would hide a genuine 500 behind plausible-looking data, the one failure mode worth designing against here. **A grep for `live: true` is the migration list.**

**AND "HAS A ROUTE" IS NOT THE SAME AS "HAS DATA" — three families answer and answer nothing, which is a third state worth naming.** Every payment integration on that platform is an OUTBOUND PROXY and this delivery provisions none of them: `.env` ships `CCPAYMENT_APP_ID`, `APAY_API_KEY`, `UPI_API_KEY`, `WAYPAY_MERCHANT_KEY` and `CRICPAY_MERCHANT_CODE` all empty. The five PSP gateways handle that properly and answer `503 PAYORDER_PROVIDER_DISABLED`; `/user/crypto/chains` and `/user/crypto/coins` do not — they throw inside the signed-request helper and surface as a 500. So there is no chain, network, minimum or fiat-channel data available from the platform at all, which is why `/deposit` and `/wallet/withdraw` keep their captured `system/conf` tables. The vault is the same shape one level down: its routes all answer, `vault_lock_rates` is unseeded so there are no terms, and `VaultInterestHistory` is read in three places and **written in none** — no accrual job exists, so "Last Day's Return" is genuinely zero rather than unread. **THE CASINO CATALOGUE IS THE SAME SHAPE AND IT WAS MIS-READ ONCE**, which is the reason this rule is worth stating twice. `GET /casino/games/stats` answers `total_games: 0` and that was taken as "no game data on the backend" — true of ONE of its three catalogues. There are three: **in-house** (`js_games`, served at `/casino/js-games/v1/games`) is **seeded, 20 active games** — dice, crash, limbo, coinflip, keno, hilo, wheel, plinko, mine, tower, roulette, blackjack and the rest; **GIS/Slotegrator** (`gisgamesnew`, what `/casino/games` reads) is empty because `GIS_MERCHANT_ID`/`GIS_MERCHANT_KEY` are unset; and the **Casino Hub** refuses by name, `CATALOGUE_NOT_CONFIGURED`, for want of `CASINO_HUB_KEY`. So the thousands of aggregator slots are unprovisioned rather than unseeded, and the twenty in-house rows are real. **They now feed BC Originals** — the lobby row, the `/casino/brand` tab and `/gamelist/brand`, through `services/originals.js` — because bc.game's own split is the same one: Originals are the house's games and Slots, Live Casino and Game Shows are third-party, so this is exactly the half the platform has. `game_icon` is null on every row, so the covers come from this project's own files by slug: **15 of the 20 resolve**, three through an alias (`mine`→`mines`, `tower`→`tower-legend`, `videopoker`→`video-poker`), and the other five are deliberately NOT aliased — `single_keno`, `highlow` and `magic_wheel` would wear Keno's, Hilo's and Wheel's artwork, and `diamond` and `goal` have no bc.game original of that name at all. That also forced a real fix: the lobby row and the casino tab both resolved art through `assetFor`, which never returns nothing, so both now use the exact form the Explore grid and the list pages already did — checked first, and not one transcribed game loses an image to it. **Probe before writing a fixture, and probe again before believing a 200 — including a 200 that answers zero.**

Four things came with it, all inside the seam:

- **Two envelopes, detected by SHAPE rather than by a config flag.** bc.game's `{code, msg, data}` and the platform's `{success, data, meta}` / `{success:false, error:{code,message,details}}`. Both can answer in one session, so the transport reads both; `code` is tested only when `success` is absent, since the platform's error object also carries one. `ApiError` gained `status`, `details`, `fields` and a `requestId` getter — a 422 carries the offending fields, so a form marks them without parsing prose. **Branch on `error.code`, never on the message**, which API-ROUTES.md §5 says may be reworded.
- **`requestPage` is a second reader, not a flag on the first.** The platform puts a list's total under `meta.pagination` and has no top-level `meta.total` (§6), and `request` drops `meta` — right for every other route and wrong for a list. `requestPage` answers `{rows, pagination}` and normalises a fixture passed as a bare array or as `{rows|list, pagination}`, which is what lets one service adapt a single shape for both modes.
- **Bearer tokens with a single-flight refresh**, in `services/tokens.js`. bc.game authenticates with a COOKIE and this platform with `Authorization: Bearer`, plus a refresh token that ROTATES — so a 401 means "present the other one", not "signed out". Driven by the server's 401 rather than a timer, because the access token's expiry is inside a JWT this build does not parse. **Single-flight is not an optimisation**: a cold load fires a dozen reads that all 401 within a few milliseconds, and twelve concurrent refreshes would each present a token an earlier one had already retired, which the platform treats as a replay and answers by revoking the session. `notifyAuthExpired` is how a failed refresh reaches `SessionProvider`, since the read that triggered it may be nowhere near what the visitor is looking at.
- **204 and binary are branched on before the body is touched** — the platform sends zero bytes for a 204 and `JSON.parse('')` throws, and 18 of its routes answer with bytes and a detected content type.

The gateway's own `CORS_ORIGIN` already lists `http://localhost:5173`, so pointing `VITE_API_BASE` at `http://127.0.0.1:4000` is the whole of the client-side setup.

#### Signing in

`services/auth.js` is the first live service, and it is mostly an ADAPTER rather than a set of reads. Every component in this build reads bc.game's own account store — `session.login`, `session.vipLevel`, `session.setting.enableLocaleCurrency` — because the shell was transcribed from a site with that shape; the platform answers with a smaller object under different names. Renaming forty call sites to match a backend this project may not ship against would trade a documented, captured shape for one that is neither, so the shape stays and the translation happens once.

**WHAT THE PLATFORM DOES NOT CARRY KEEPS ITS DEFAULT RATHER THAN BEING INVENTED** — `redDot`, `chatRoomPermission`, `emailVerified`, `acceptPromotion` and the whole `setting` block. The XP band is the interesting case, and it has since been half-closed. `/user/profile` stores `users.level` and no XP at all, so the band comes out of the captured ladder in `data/vipConfig.js` (real) while the POSITION inside it did not exist and `currXP` sat at the floor (honest, and flat for every account on the platform). **`GET /user/bonus` answers the missing half** — `vip.progressPct` — and the percentage is used rather than the wager figure beside it, because the two sides measure in different units and a fraction of the way through a level is the one quantity both express. A fabricated figure would render as a plausible ring and be wrong every time; a measured fraction of a real band is neither.

**AND THAT READ SETTLED WHICH OF TWO DISAGREEING VIP LEVELS TO BELIEVE.** `/user/profile` answers `level: 1` for an account `/user/bonus` calls `vip.level: 0`, in the same second — `users.level` is a STORED column an operator sets, while the bonus module DERIVES its level from lifetime wager. The derived one is taken, for the band and for `vipLevel` itself: it is what the platform's own eligibility gates compare against (`vip.level >= minVipLevel`), so a badge reading the other column would promise a bonus the server declines — and it is the only one that comes with a position, so mixing them would draw a fraction of one level inside another's bounds.

Three things about the wallet. **There is no BCD** — this build's fixture account's own balance currency, the unit `/deposit-offer` is denominated in, and the coin the signed-in header capture shows. **A live wallet is 28 rows against this build's 148**, so the currency dropdown is genuinely shorter; that is the backend being smaller, not a mapping that dropped something. And **which codes are fiat is decided by asking this project's own captured list** — a code is fiat when `<CODE>FIAT` is a currency bc.game lists, which is what turns their `INR` into our `INRFIAT`/`INR` pair rather than inventing a second classification. MVR, BJB, NC and SC fall through to the crypto arm; MVR really is fiat and bc.game does not carry it, so there is nothing to map it onto.

**`pickCurrency` is what stops the header pill naming a coin the account cannot hold.** The persisted choice wins when a row exists for it; otherwise the largest balance, then the first row. The case that forces it is every first live sign-in on a browser that has used this build with fixtures: a saved `BCD` against a wallet with no such column, where the pill would print a zero for an account with money in it.

**AUTHENTICATE, THEN ANIMATE, THEN COMMIT.** `SessionContext` splits the old `signIn` in two, and the split is not tidiness. Committing a session makes `depositNeedsAuth` and its three siblings false in `App`, so a commit up front unmounts the auth dialog mid-tween and the cleanup drops the queued navigation with it — the documented ordering that predates all of this. What is new is the step in front: credentials can now be REFUSED, and a dialog that plays its exit before it knows the answer has to play an entrance again to show the error. So `authenticate()` requests, `runClose` animates, and `signIn()` commits inside the timer. `signIn` takes either `{account, balances}` or the old `{name}` overrides, discriminated on the `account` key.

**A third session state exists now: signed in, and knowing nothing yet.** A token that survived a reload means neither fixture is the truth — `SIGNED_IN` is somebody else's account and `VISITOR` is the wrong shell — so `restore()` returns the defaults with `login` raised and fills them from an effect. Two things there are load-bearing: the placeholder wallet is `VISITOR_BALANCES` and **not** `[]`, because the header pill reads `balances.find(…) || balances[0]` and then `current.generalAmount`, which is a crash on the first paint; and **with the API on, `login` in the persisted record is not authoritative — the token is**, since a record saying `login: true` beside no token is somebody who signed in against fixtures and then switched the build over.

**A failed account read does NOT sign anybody out.** A 401 already routes through the transport, which refreshes and only then fires `onAuthExpired`. What is left is a network error or a 500, and dropping the session for one would sign a visitor out because a server hiccuped.

Two arms deliberately do not reach the platform, each flagged at its own form: the **One-time Code** tab (`POST /user/email/otp` and its `/verify` sibling exist, but they are a two-step flow and this dialog has no screen to enter the code on) and the whole **Sign Up** tab — **registration is a SOCKET event there**, `REGISTER_USER`, with no HTTP route at all. Both keep the fixture path, which is also what every arm does while `VITE_USE_FIXTURES` is on.

One trap found while checking this, and it predates the wiring: **`persist.read()` returns `{...defaults, ...stored}`**, so a record with no `setting` key inherits `ACCOUNT_DEFAULTS`' BTC and overwrites `SIGNED_IN`'s BCD. The app never writes such a record — the provider's effect always includes `setting` — but a test harness that hand-writes one gets a wallet opening on BTC and reads as a bug in the restore logic.

#### The FX table

`services/exchangeRate.js` is the first read in this project whose result does not go to a component, and the reason is worth knowing before anyone tries to make it a `useResource`. **`printCurrency` is a pure function called during render from most of the shell** — the header pill, every wallet row, the bet feed, the contest board — so it cannot await a rate and threading one through as a prop means touching every one of those call sites. The table is a module cache the formatter reads synchronously, and that is the ORIGINAL'S own arrangement rather than a workaround: `mt().get("/game/support/system/conf/usdPrice").then(s => n(qg(o)))` fills a store `getUsdPrice` reads for the rest of the page's life. `services/bonus.js` already carries the same read-plus-store shape.

It is primed from `SessionProvider`, **unconditionally** — the route is `public` (checked against the running server, not read off the module map) and a signed-out home page converts too. Filling it bumps an `fxVersion` the context publishes, which is what re-renders figures that were formatted before the rates landed; nothing reads that number, and it is published rather than kept private because a memo dependency nothing in the value reads is one the linter is right to reject.

**A TICKER IS NOT AN ASSET, AND THE MERGE IS UNSOUND WITHOUT `dropUnpricedCodes`.** `setUsdPrices` overlays the live table onto bc.game's captured snapshot rather than replacing it, because `services/swap.js` and `services/buyCrypto.js` price their own fixtures through the same accessor against catalogues of 43 and 38 coins the platform's 25 rows do not cover — replacing would take every quote on two unwired pages to zero. The cost of merging is that the two tables describe **different worlds**, and this was found by testing rather than by reading: bc.game's snapshot prices **`SC` at $1**, and `SC` is also a column on the platform's wallet — a different token entirely, which the merge silently gave a dollar. `NC` and `BJB` are the same shape and are only invisible because bc.game happens not to carry them. So `loadAccount` hands the table the codes the account can actually hold, and any of those the live source did not quote loses its inherited price: `getUsdPrice` then answers 0, which is the original's own behaviour for an unknown currency and reads as `$0.00` — "no rate", rather than another asset's rate wearing the same three letters. **Re-check this for any backend whose currency set differs from bc.game's.**

`utils/currency.js` gained **`isFiatCode`** for this, and it is shared rather than duplicated: the platform keys its money by BARE code where this shell keys fiats as `INRFIAT`, so `services/auth.js` needs the answer to build a wallet row and `services/exchangeRate.js` needs the same answer to file a rate under both keys. It reads the catalogue's own `currencyType` — 324 rows generated from a live response — rather than a hand-kept list. bc.game's own payloads never ask the question, because they send `INRFIAT` already.

#### Running it

```bash
cd "backend copy"
node scripts/setup.js --demo      # .env, secrets, database, 33 migrations, seeds, demo accounts
npm run dev user admin casino gateway
```

Gateway on `http://127.0.0.1:4000`; `/api/v1` is the endpoint index and `/health` aggregates the services. Demo players are `demo_player01`..`05` with the `DEMO_PASSWORD` from the seed config, staff the seeded super admin. `npm run dev:test` is the same runner with `RATE_LIMIT_ENABLED=false`, which is what to use while hammering login.

**SPORTS IS NAMED OUT OF THAT COMMAND BECAUSE IT CANNOT BOOT.** `services/sports/src/modules/bets/bets.service.js` requires `./legacy/oddsGuard`, `./legacy/marketName` and `./legacy/markets`, and **that whole `legacy/` subfolder is absent from the delivery** — checked against the original checkout under `backend/test-automation-and-updated-admin/`, which is byte-identical, so it is missing there too rather than lost in a copy. The worker exits at boot and `scripts/dev.js` stops every other service with it, which reads as "the platform will not start" and is one module. Naming the four services works because `dev.js` takes a service list. Nothing here needs sports anyway — theirs is a cricket exchange and ours is BetBy.

Two things about setup on Windows, both recorded because they cost an hour:

- **`scripts/setup.js` was patched.** `run()` and `capture()` spawn `process.execPath` — `C:\Program Files\nodejs\node.exe` — with `shell: true` on Windows, so `cmd.exe` splits the command at the space and every database step fails with `'C:\Program' is not recognized`. The comment above `run()` says `shell: false` on purpose while the code says otherwise. Fixed by quoting the command when the shell is used; two lines, in their repo rather than ours.
- **Do not put a space in `DB_NAME`.** `CREATE DATABASE` quotes it and Sequelize takes it as a discrete field, so it half-works — but `scripts/seed-test-logins.js` refuses any name not matching `/(test|restore|dev|local|sandbox|staging)/i`, and every psql, adminer and backup invocation has to quote it. This checkout uses `ibitplay_dev` on port **5433** (the PostgreSQL 18 instance; 5432 is 17).

**Services return payloads, not behaviour.** `formatAmount`, `vipTier`, `gameIcon`, `themeFor`, `flagFor`, `providerLogo`, `sortGames` and friends stay in their own modules and are still imported directly — they are view logic that happens to live beside a fixture, and moving them would mean the API swap deletes code that has nothing to do with the API. The fixtures also stay where they are, because they carry provenance comments tying each one to the captured response it came from; when the API lands it is the *imports* in `services/*.js` that get deleted.

Two things are NOT converted yet: `components/Explore/catalogue.js` and `pages/Casino/catalogue.js` bind `GAMES` at module scope and derive constants from it (`export const PROVIDERS = [...new Set(GAMES.map(...))]`), so they cannot go through a hook as they stand. Those functions need `games` threaded in as an argument before the casino and Explore grids are API-backed.

**ONE TAB IS ALREADY THREADED, AND THAT IS THE PATTERN FOR THE REST.** `gamesFor(tab, originals)` takes an optional live override for `brand` — see `services/originals.js` — so the lobby's BC Originals row, the `/casino/brand` tab and `/gamelist/brand` all read one live catalogue while every other set answers from its transcription. **`undefined` falls through to the fixture and `[]` does not**: an empty array is a real answer, so the tab is never momentarily blank on a slow read and is correctly empty if the server ever returns nothing. Threading the rest is the same shape, one argument at a time.

## Loading states

Every page's pending arm, and **the first thing to know is that they render at all.** `request()`
answers a fixture after `VITE_FIXTURE_DELAY` (400ms, see The data layer), so what you see on a cold
load is each section's own loading treatment. Set that variable to **0** and the whole of this
section becomes unreachable again, which is exactly what to do before measuring a page against a
reference capture.

**THERE ARE FOUR SHAPES AND THEY ARE NOT INTERCHANGEABLE.** Picking the wrong one is the usual
mistake here, and each has a rule about where it may go:

- **`components/shared/Loading`** — `sa`, the site's 20px brand-green spinner over `.loading`. What
  a card, a pane or a panel shows when it has a box and no contents. `[&>.loading]:size-3` and
  `.pagination-button .loading` are the original's own two size overrides for it, and both are used
  here: the 12px inline form goes in a FIGURE-SIZED slot (the swap Rate row, Vault Pro's Available,
  the Refer dialog's link, the chat channel name), the 16px form in a pager button.
- **`components/shared/Skeleton`** — `v` in `skeleton-9E-gKDFG.js`. What a GRID OF CARDS shows,
  because it wraps rather than replaces and so is automatically the exact size of what is coming.
  Its own header records the trap; the one that bites in a game grid is that a skeleton must never
  be a `.grid-col-*  > div`'s direct child.
- **`MenuPageLayout`'s `PaneLoading`** — `h-96 center rounded-xl bg-layer4` around the spinner, and
  **this one is READ rather than inferred**: `fO` wraps its outlet in a `Suspense` whose fallback is
  exactly that div, with a `loadingClass` override. So every `/wallet/*` and `/settings/*` pane has
  the same pending state on the live site. It REPLACES the whole pane, fill and radius included, so
  a pane that draws its own `PageCard` must use this instead of putting a spinner inside that card
  — and conversely a loader for one region inside a settled pane must NOT use it, or it paints
  layer4 on layer4. Swap takes it even though that pane has no card below 640, and that is right:
  the boundary belongs to the shell, not to the pane.
- **`pages/GameCollection`'s `Placeholder`** — `et`, which draws nothing for a full second and only
  then paints flat `bg-layer5`. See that page's note; at the default delay it never reaches the grey.

**WHICH ONES ARE READ AND WHICH ARE THIS BUILD'S.** The distinction matters for the same reason it
does everywhere else here, and each inferred one says so at its call site:

- Read from a chunk or a stylesheet: `PaneLoading` (`fO`'s Suspense fallback), the shared `Table`'s
  72px first-page arm (`E`'s paging list), the pager buttons' 16px spinner (`.pagination-button
  .loading` exists for no other purpose), the withdraw form's inner token boundary (`Fn`, one of the
  five wrappers `WithdrawPanels` flattens — its existence and position are the chunk's, its height
  is not), the quest page's `min-h-40` spinner, `GameSection`'s eight cards, `et`, the hero
  carousel's `h-[12.625rem]` (which `CARD_BODY`'s own note works out independently), and the
  Free Plays dialog's `Suspense`.
- This build's, by the site's convention: everything on `/sports` (BetBy is a third-party widget in
  a shadow root — there is no bc.game chunk to read), the promotions grid, the deposit-offer cards,
  Highlights, the lottery draws, Recent Big Wins, the medal grid, and every page-level spinner that
  replaced a bare `return null`.

**A DECLARED DEFAULT IS NOT A LOADING STATE, and several reads here correctly have no loader.** The
rule is the one the fixtures already follow: where a chunk's resource declares an `initialValue`,
the original renders THAT until the read lands, not a spinner — so `undefined` resolving to the same
zeros is faithful and a spinner would not be. That covers the contest widget's My Position row
(`{rank: 0, wager: 0}`), Preferences' three privacy toggles, Security's anti-phishing code,
Whitelist's enable switch, Statistics' three `count || '0'` cells, the account dropdown's gift count,
and `/user/enter`'s referral ratio. Check for an `initialValue` before adding a spinner to a read.

**Three structural traps came out of building these, and all three generalise:**

- **A `useState` seeded from a read is a bug the moment the read is asynchronous.** An initialiser
  runs once, so it captures the empty state and never corrects. Three places hit it and all three
  are fixed the way this project already fixes it elsewhere — a `null` sentinel derived during
  render (the fiat deposit tab's amount, which is why an INR box opens at 1,000 rather than sticking
  at 500) or a SHELL that mounts the form only once its config has landed (`/wallet/swap`, whose
  opening pair is chosen from the config's own list).
- **A `<Show when={list.length < 3}>`-style test must not run against a pending read.** The hero
  carousel's padding arm is the case: `feed === undefined` is not "a thin feed", and treated as one
  it tops the strip up with three hardcoded fallback banners that are then swapped for five real
  ones, with `loop` flipping and the dots renumbering. Gate on the read having settled, not on the
  length.
- **A measured component must keep its measured box mounted while it loads.** The hero's
  placeholders render INSIDE `.carousels` rather than instead of it, so the `ResizeObserver` has
  already reported by the time the real slides mount — swapping the wrapper out would put the first
  painted frame back at `width = 0`, which is the reload jump documented at that component.

Two services changed shape for this. **`services/bonus.js` is a READ plus a STORE**
(`getRechargeBonusConfig` / `rechargeBonusConfigNow`), because `pages/Deposit/deposit.js` computes
the chip ladder in pure functions that cannot await anything — which is exactly how the original is
arranged, `xg` reading `bonusStore.rechargeConfig` synchronously while something else fills it. The
fiat tab mounts the resource, and that is what fills the cache. **Eight components moved off direct
service calls onto `useResource`**: the withdraw, vault, swap, buy-crypto, transaction, rollover and
bet-history panes, plus that deposit helper. Only two services post-process a `request()` result and
both already branched on `typeof .then`, so the service layer needed no changes at all.

Not covered, and each for a reason rather than an omission: the Explore and casino grids read
`data/games.js` through `catalogue.js` at module scope rather than through the seam (see the note at
the foot of The data layer), so they have nothing to wait for; `/sports`' own pager is BetBy's
markup and no evidence exists for its pending state, the grid skeleton standing in for it; and the
chat message feed is a websocket with no read to be pending on.



## The synchronous-fixture trap, and the white screen it caused

**`request(path, { fixture })` returns the fixture SYNCHRONOUSLY when `VITE_USE_FIXTURES` is on.** That is the whole reason `useResource` is written to take either a value or a Promise, and it is stated in that hook's own doc. What is easy to miss is that the *caller* has to hold the same discipline, and one did not:

```js
// src/pages/Game/index.jsx — as it was
() => (game ? launchGame(gameUnique).catch(() => null) : null)
```

`launchGame`'s fixture is `null`. So with fixtures on the call returned `null`, `.catch` threw `Cannot read properties of null (reading 'catch')` **during render**, and **every game page in the fixture build was a white screen**. The live build was fine, which is exactly why it survived: the arm that would have caught it is `FIXTURES=1`, and no page on `verify-pages.mjs`'s list reached `/game/:gameUnique`. The fix is the idiom `services/collection.js` already uses on every one of its reads:

```js
() => (game ? Promise.resolve(launchGame(gameUnique)).catch(() => null) : null)
```

**Two things generalise from it.** A read whose fixture is `null` or `[]` is the dangerous shape — a fixture that is an object still has no `.then`, but `.catch` is the call that actually appears at these sites, and a nullish fixture is what turns a missing method into a `TypeError` rather than a silent wrong answer. And **the regression arm only covers the routes it lists**: `/game/crash` is on that list now, asserting the page is not blank, precisely because its absence hid this for as long as the page had existed.

This is the same seam as the `useState`-seeded-from-a-read rule, approached from the other side. That one breaks when a read becomes asynchronous; this one breaks when it stays synchronous.

## Links are the data layer's problem too, once a route is real

Not a fixture issue, but it failed the same way — invisible until something else landed. **`GameTile` rendered a bare `<a href>`**, so opening a game performed a full document navigation: React re-booted, the entrypoint re-ran, every asset re-fetched, and all in-memory state was dropped (the session survived only because `persist.js` puts it in localStorage).

The original never did this. Its card is `Te` — the router's own link, the same component behind the header logo, the View All tile (`yl`) and every Recent Big Wins card — and `sl` hands it a `state` prop, which a bare anchor cannot take at all:

```js
r(Te, { class: "game-item group relative …", href: _(), state: g(), "data-tid": f, … })
```

**The trigger for fixing it is a route becoming real.** `SectionHeader` already carries this note for the All pill, in exactly these terms: an anchor and a `<Link>` are indistinguishable while every destination falls to the catch-all, and stop being indistinguishable the moment the destination is a page. `/game/:gameUnique` became a page (`App.jsx:582`) and the tile did not follow. So the rule is not "audit the anchors" but **"when you build a route, grep for what already points at it."**

Verified by `verify-tile-navigation.mjs`, and the discriminator is worth knowing because the obvious test does not work: `<Link>` renders an `<a href>`, so *inspecting the markup proves nothing*. The harness clicks a real tile and asserts the **router's** location moved, with a probe mounted beside `App` inside the same `MemoryRouter`. A first version asserted "the home page text is gone" and failed while the fix was working — "BC Originals" is a sidebar row and is on screen at every route.
