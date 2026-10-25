# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**These notes outgrew one file.** CLAUDE.md now holds the cross-cutting rules and an index; each page's own notes live under `docs/`, listed below. **Read the relevant doc before touching a page** — every one of them records which values are evidence and which are invention, and both are easy to undo by accident. Keep it that way: new page notes go in a `docs/` file with one index line here, not inline.

## What this project is

A React + Vite rebuild of the bc.game front-end UI, built to match the original layout at the pixel level across every breakpoint. The work is primarily CSS/markup fidelity and faithful *mechanism*, not application logic. **There is a data layer** — every payload goes through `src/services/` behind one seam, and most of it never reaches a backend: read `docs/data-layer.md` before writing a fixture.

State lives in `src/context/`:

- **Session** (`SessionContext.jsx`, `session.js`, `account.js`, `persist.js`) — the original's persisted `account` store (`NC` in `index-BsFv7ByC.js`) over its own `localStorage["account"]` key. Read it with `useSession()` from `context/session`, never from `SessionContext.jsx` (Fast Refresh forbids a file exporting both a component and a hook). The record holds only what a visitor can actually change and carries a **hash of `ACCOUNT_DEFAULTS`**, so changing that shape discards every saved copy with no version number to bump. What deliberately does not survive a reload is in `docs/overview.md`.
- **Settings** (`settings.js`, `SettingsContext.jsx`) — the theme, over the same `persist.js`. The state is `theme` and the boolean is `darken`; **three controls write it and none owns it** (see Light theme in `docs/architecture.md`).
- **Wallet filters** (`walletFilter.js`, `WalletFilterProvider.jsx`) — the type/status/time/currency set the transaction, rollover and bet-history panes share, seeded from the URL then `sessionStorage`.
- **Routing** (`react-router-dom`, mounted in `main.jsx` so the chrome can read the location). Dialog routes are matched on the pathname in `App.jsx` and mounted *beside* `<Routes>`, not inside it; see Routes and Layout shell below.

Three things are shells rather than pages and are documented where they are built: the route-driven **auth dialog** (`src/components/modals/Auth/` — the first shell here that has to pick its enter/exit arm at runtime), the desktop **Explore panel** (`src/components/Explore/`, portalled to `<body>`; below `sm` the original has no overlay and Explore is a route), both in `docs/overview.md`, and the **right-hand drawer** in `docs/drawer.md`. `src/data/games.js` is GENERATED from the two captured game feeds — regenerate rather than hand-edit.

**A component moves to `components/shared/` at its SECOND call site** — that is how `GameTile`, `Select`, `Skeleton`, `PageCard`, `Notice`, `Table`, `CurrencyAmount`, `MenuPageLayout`, `EmptyPlaceholder`, `Loading`, `Accordion`, `Switch`, `NumberInput`, `CircleCountdown`, `PcNav`, `SectionGroup`, `RouteDialog`, `DialogShell` and `WalletFilters` got there. Before extracting, check whether the original ships one component or two: the wallet's currency list, the two `LocalAmountItem`s and the two `table` chunks each look shared and are not. `Skeleton`'s own traps — it WRAPS content rather than replacing it, and must never be a `.grid-col-3 > div`'s direct child — are in `docs/overview.md`.

**Which side of `@layer components` a shared primitive lands on is load-bearing in both directions**: *layered* where call sites override it with utilities (`.button`, `.input`, `.button-l`, the `.tabs-*` family, `.select`/`.select-item`/`.radio`/`.dropdown-layer`), *unlayered* where it must beat them (`.hide-scroll`, `.hidden-scroll-bar`, `.smooth-scroll`, and the `.grid-col-2`/`.grid-col-3` presets — that last block was moved into a layer once, which let `relative` win and rendered every row of games about twice as tall as it should be; do not repeat it). See the cascade hazard below.

## Where the notes live

| doc | covers |
| --- | --- |
| `docs/overview.md` | The auth dialog, Explore, the shared primitives and `Skeleton`, the full recovery ladder, Sports (`/sports` is BetBy's app in a shadow root, not bc.game markup), and the asset loose ends |
| `docs/casino.md` | `/casino` and its tabs, the four list pages, `/favorite` and `/recent` |
| `docs/promotions.md` | `/promotions/promotion`, `/deposit-offer`, Daily Contest, Weekly Raffle |
| `docs/vip.md` | `/vip-detail` |
| `docs/referral.md` | `/referral-exhibition`, the Refer and Earn dialog, the dashboard and its four tabs |
| `docs/help.md` | `/help/:helpId` (a federated remote) and `/responsible/:responsibleId` |
| `docs/hero.md` | The signed-in home hero carousel — keen-slider reproduced, not wrapped |
| `docs/drawer.md` | The right-hand drawer container, the notification panel and global chat |
| `docs/header.md` | The signed-in header, the currency dropdown, bottom sheets, Manage Assets, `/user/enter` |
| `docs/settings.md` | `/settings/*` — six panes behind one rail |
| `docs/wallet.md` | `/wallet/*` — balance, deposit, withdraw, buy, swap, vault, transaction, rollover, bet history |
| `docs/bonus.md` | `/quests`, `/bonus`, `/free-plays` |
| `docs/profile.md` | `/user/profile/:id` and its two stacked dialogs |
| `docs/data-layer.md` | `services/`, the iBitPlay backend wiring, and every page's loading state |
| `docs/exchange.md` | The sports exchange (mssports): its screens and routes, then the data + logic layer — endpoint → service → hook → shape, odds scales, money rules, and the Addaplay-vs-TENEXCH calculation choices |
| `docs/architecture.md` | Layout shell, light theme, sidebar, icon sprites |
| `docs/backend-gaps.md` | What the iBitPlay backend answers today, and what is missing and has to be built. **Update it in the same pass as any change that moves a feature between its four states** — see "Keep this file current" at the top of it |

## Ground truth: the recovery ladder

**Not everything is in the saved mirror, but almost all of it is still reachable — read this before transcribing anything off a screenshot.** The deploy is served from a second origin, `hash.game`, and that one answers when `bc.game` times out: every file the mirror lacks sits at `hash.game/assets/<name>` under the identical content hashes `Enter-MsmOuq5R.js` already lists in `__vite__mapDeps`. **`hash.game` also answers the LIVE API, unauthenticated**, at `https://hash.game/api/…` — so a path read out of a chunk can be *answered* rather than merely recorded. The order of work is a ladder, and a screenshot is the last rung:

1. the mirror, `bc.game/bc.game/assets/`;
2. `hash.game/assets/<name>`, under the identical hashes `__vite__mapDeps` already lists;
3. `hash.game/modules/<remote>/` — if a route resolves through a federated remote (`account`, `static`, `games`) it is **not** in `/assets/` at all;
4. the live API at `https://hash.game/api/…`, where **a catalogue answers and a per-account read does not**. The `game/support` family (`system/conf/*`, `swap/config/`, `buy-crypto/fiats|coins`), `achievement/all/`, `user/game/summary/` and `chat/room/list/` all answer unauthenticated; anything keyed to the session gives 6001/6002 or a bare 403. An AGGREGATE over public data is public, the rows behind it are not;
5. the i18n bundle `index-Dn9m_cUp.js`, which is saved and outlives the chunks it was compiled into — every en-US string on a missing page is still in it;
6. the service module's own `initialValue`, which a login-gated resource often declares as exactly the payload a logged-out visitor renders. That has now supplied five fixtures with nothing invented;
7. only then a screenshot.

Four habits go with it. **Resolve a lazy route through the registry** rather than searching for a plausible chunk name — `Enter-MsmOuq5R.js` gives route → `L.Name` → registry entry → import, two hops, and the obvious candidate filename is often a decoy. **Re-read a recovered chunk for its API namespace before inventing a path**; several open with their own request module. **Check for chunk and data separately**, since they are independent. And **try the other verb before writing an endpoint off** — `rich-list/get/` answers GET where the chunk's own POST is refused.

**Before writing a fixture for anything behind a login, check whether the value is really per-account or merely rendered on a per-account page** — a config the server hands every visitor is often exactly the table you need. **Being locked out is often the correct rendering** rather than a compromise: probe the endpoint, record the result, and render the site's own empty state instead of inventing rows.

Two fetch caveats: source maps 403 (so you get minified code, not original source), and PowerShell's `Invoke-WebRequest` decodes JSON as Latin-1 — use `System.Net.WebClient` with `Encoding = UTF8` or non-ASCII copy arrives as mojibake. `curl` chokes on the CDN's comma-separated `?_v=` query where `Invoke-WebRequest` does not.

The full argument, and what each rung has actually recovered, is in `docs/overview.md`.

## Fidelity rules

The rules below are argued for at length in the page notes under `docs/` that discovered them; collected here because each one is cross-cutting and each has been got wrong at least once.

- **Dead classes are kept** (`f-ull`, `texxt-sm`, `test-base`, `bas`, `bg-from-special`, `page-main`, `header-nav-item`, `not-full`, `.status`, `sub-num`, `data`/`text`/`w`, `invite-top`…). Check the mirror's stylesheets **and** the current deploy's before calling one dead — and before "fixing" a typo, since several are load-bearing by accident.
- **Except the ones Tailwind v4 resurrects.** v3 generated only what its scale defined; v4 generates spacing on demand, so `w-30`, `h-22` and `h-13` — dead on the original — emit real rules here and must be dropped, with the chunk's line quoted at the call site. `h-15`, `h-18` and `size-4.5` really do exist. Check any `h-*`/`w-*` outside v3's scale against the deploy's CSS.
- **A measurement that cannot be cross-checked against something of known size is not a measurement.** Line-height pitch names a Tailwind step exactly; cap-height arithmetic does not. Fractional values are measurements, not mistakes.
- **`class` on a `TabItem` belongs to the CONTENT PANEL, not the button** — four pages have needed this said.
- **The size class is the `Select`'s job, not the call site's**; check any `.button` carrying none.
- **A dead class is not the same as an inert one.** `l` on the referral email exists, but is scoped to a component nowhere near that page, so the paragraph renders at full opacity — do not "restore" the 60% by hoisting the rule. `scroll-target` and `light-darkness` in the currency dropdown are a third case again: they are real and **light-theme-only**, so they were inert while this build was dark-only and are reachable now that it is not.
- Icons carry no `fill` of their own, strip any `<clipPath>` whose path equals the viewBox, and keep prose out of `.svg` files. Several glyph names are shared between icon modules while the drawings differ (`IconInform`, `IconCopy`, `IconBuy`, Vault Pro's) — check which chunk the page imports.
- **A declared `initialValue` is not a loading state.** Where a chunk's resource declares one, the original renders that default until the read lands — so a spinner there would be this build's invention, not a port. Check for one before adding a pending arm; see Loading states in `docs/data-layer.md`.
- **A `useState` seeded from a read breaks the moment the read is asynchronous** — an initialiser runs once and captures the empty state. Use a `null` sentinel derived during render, or a shell that mounts the form only once its data has landed. Both idioms are already in the project.
- **A component moves to `components/shared/` at its SECOND call site**, and before extracting, check whether the original ships one component or two: the wallet's currency list, the two `LocalAmountItem`s and the two `table` chunks each look shared and are not.
- **An internal destination is a `<Link>`, never a bare `<a href>`** — and the moment to fix one is when its route becomes real, not later. The original's every card and pill is `Te`/`rh`, the router's own link (a bare `<a>` cannot even take the `state` prop `sl` passes the game tile), so an anchor was never a port of anything. It cost a **full app reload on every game launch**: `GameTile` was an `<a>`, which was invisible while `/game/:gameUnique` fell to the catch-all and became a re-boot of React the day that route was built. `SectionHeader` records the identical correction for the All pill. Still open and deliberately: the Explore panel's provider chip (`Explore/GameGrid.jsx:91`), whose `/provider/:name` is not a route yet.
- **A LIST-DRIVEN ANIMATION MUST BE TESTED AGAINST AN EMPTY LIST.** The home page's Latest Bets ticker indexes its source with `source[seq % source.length]`, which is `source[NaN]` — `undefined` — when the list is empty, and the row then throws on `bet.payout` and takes the page down. Its clock made it worse: `throttleMs(0)` returns `false` and `setTimeout(fn, false)` coerces to 0, so an empty feed pushed an undefined row on every tick of a hot loop. It was written against the 30-row fixture, which never runs dry; the live feed is empty whenever nobody has played recently. Fixed by returning early from the effect, so the panel renders as the empty box it should be. Same family as the rule below — a branch the fixture cannot reach is untested.
- **A LIMITATION WRITTEN DOWN IS NOT A LIMITATION FIXED, and the note will not re-read itself.** `RecentBigWins/data.js` said in its own header that the mirror had captured only the All tab and that "the real site issues a separate request per tab, so its per-tab lists are longer than the subsets below" — an accurate description of a bug that then sat there, showing 3 rows under BC Originals against the real page's 20, until someone looked at the screen. When a note describes a shortfall the recovery ladder could close, close it or put it on a list; recording it in the file it is in is where it goes to be forgotten. (All four tabs answer unauthenticated on `hash.game`; capturing them was one command.)
- **A ROUTE RECORDED AS "DELIBERATELY UNWIRED" MUST NAME THE CONSUMER THE OBJECTION IS ABOUT.** `bet-history/top-wins` sat in that list for two passes under "Recent Big Wins draws a player name and a VIP tier and the public route carries neither" — true of that widget, false of the home page's High Roller table, which has no VIP column and already renders every player as `HIDDEN_NAME`. Filing a ROUTE under a reason belonging to one CALLER made the reason read as a property of the route, and the second caller went unconsidered while its tab showed another tab's data. The same shape as the rule below.
- **A guard whose branch is unreachable is untested theory, and it goes live the day the feed does.** `RecommendList` returned `null` when its list was non-empty — sound reasoning, written while both feeds answered 6002 so the list was always empty. Favourites returning rows made the branch live and starring a game then DELETED the Recommended Games row from `/favorite`. When a shut feed opens, grep for what was written assuming it stayed shut.
- **A harness cleanup must delete only what that run CREATED.** Twice this went wrong: `verify-tier2.js` cleaned up with `where: { uid, game: 'limbo' }` and took a pre-existing seeded bet with it, and `verify-favorites-home.mjs` cleared EVERY favourite on `demo_player03` — the account the browser is signed into — so each regression run silently removed the user's own starred games, surfacing later as "the Favorites section disappeared" with nothing to connect it to. Delete by the ids the run created, snapshot anything you clear and restore it in `finally`, and point destructive harnesses at `demo_player05` rather than the account a human browses with.
- **A test written from the PRODUCER's shape cannot catch a consumer mismatch.** `verify-wiring.mjs` asserted `originalCurrencyName === 'INR'` — what the platform sends — and passed while the rollover row drew a broken image, because this build keys money on the WALLET ROW (`INRFIAT`) and the coin-art lookup missed. Assert what the COMPONENT needs. The same boundary is why `isFiatCode` exists; use it on every bare code crossing the seam.
- **A comment asserting what a DIFFERENT file does is not a check.** `toFavouriteGame`'s note said `icon: undefined` means "use this build's own artwork, which is what the tile does with `assetExact(slug)`"; `GameTile` did `image || placeholderArt` and had never called it, so every locally-resolved row drew the brand placeholder. Verify the claim in the file it is about.
- **A SHELL THAT ONLY EVER DREW ONE ARM WILL BE ASKED FOR THE OTHER.** `RouteDialog`'s title bar drew the phone arm — a back arrow, no cross — under a note saying that was "the only arm these two routes can reach, both are guarded to mobile". True when written, and false the day a `dialog: !0` route used the shell: those are dialogs at every width, so `/user-action/:action` and the whitelist forms drew a phone's back arrow on a desktop and no cross at all. When a component is deliberately half-built, say which INPUT would make the other half reachable, not just that it is unreachable today. The same shape as the unreachable-guard rule below.
- **A SCREEN WITH NO BACKEND IS DRAWN, AND SAYS NOTHING ABOUT IT.** Four of the six Settings → Security modals have nothing behind them here (no `email_verified` column, no SMS sender, no WebAuthn table, no anti-phishing field). Each is built to the chunk's markup and left inert, with the reason in the component's note and in `docs/settings.md` — never on screen. A sentence explaining the gap was written for each and then removed: it is the only text on the page bc.game never wrote, and it describes a deployment rather than the product. **When a port needs an explanation the original does not carry, the explanation goes in the code, not in the UI.** (This is narrower than it sounds: a control that CLAIMS to do something and does not is still the defect below; a control that claims nothing is not.)
- **A CONFIRM THAT STATES A FACT NEEDS THE FACT TO BE TRUE.** The Account Restrictions dialog promises "we will disable your withdrawals for 24 hours after you change your password". Porting the screen alone would have been the first false promise in this project, about money — so migration 040 adds the column, `changePassword` writes it and both withdrawal rails refuse inside the window. A dead CSS class is worth reproducing faithfully; a claim about whether an attacker can drain the account is not. Check what a ported string ASSERTS before porting it.
- **`element={cond ? null : <Layout/>}` DOES NOT BLANK A ROUTE THAT HAS CHILDREN.** React Router picks a route's children with `match.route.element ? element : outlet` — a truthy test — so `null` renders the OUTLET, not nothing. On a leaf route that is the same thing, which is why the idiom is correct at the seventeen leaf call sites in `App.jsx`; on `/settings`, the one layout route using it, every pane was mounted TWICE on a phone — once bare and invisible under the sheet, once inside it, each with its own reads, dialog state and subscriptions. Use `<></>`, which is truthy and renders nothing. It survived unnoticed because both copies look identical and the visible one is the one you touch; it was found by hit-testing a button and getting two of them 18px apart.
- **A caller must not assume a service returned a thenable.** `services/client.js` answers a fixture SYNCHRONOUSLY, so `someRead().catch(...)` throws `Cannot read properties of null` the moment that read's fixture is `null` — which white-screened every game page in the fixture build. Wrap it: `Promise.resolve(read()).then/.catch`, the idiom `services/collection.js` already uses throughout. This is the same seam as the `useState`-seeded-from-a-read rule above, on the other side.

## The data layer, in one page

Full notes — including the iBitPlay backend wiring and every page's loading state — are in `docs/data-layer.md`. The parts that constrain any new code:

**Nothing renders from a fixture it imported itself.** Every payload goes through `src/services/`, and components read it with `useResource` (`src/hooks/useResource.js`); `services/client.js` is the only seam. `request(path, { fixture })` returns a Promise that settles after `VITE_FIXTURE_DELAY` (400ms by default), which is what makes loading states reachable — **set it to 0 before measuring a page against a reference capture**, and the old synchronous behaviour is restored exactly. `services/endpoints.js` holds every path, split into captured / read-from-saved-JS / not yet known.

**`VITE_USE_FIXTURES=false` does not mean "fetch everything", it means "fetch everything that has a route."** A call site declares `live: true` where a real endpoint exists behind it and keeps its fixture otherwise; a grep for `live: true` is the migration list. The alternative — flipping the whole build and falling back to a fixture on error — would hide a genuine 500 behind plausible data. **"Has a route" is not "has data" either**: several families answer 200 with nothing because the integration is unprovisioned, so probe before writing a fixture and probe again before believing a 200.

**Services return payloads, not behaviour.** View helpers that happen to live beside a fixture stay in their own modules; when the API lands it is the *imports* in `services/*.js` that get deleted, not the fixtures' provenance comments.

**There are four loading shapes and they are not interchangeable** — `components/shared/Loading` (a box with no contents), `Skeleton` (a grid of cards, because it wraps rather than replaces), `MenuPageLayout`'s `PaneLoading` (replaces a whole `/wallet/*` or `/settings/*` pane, fill and radius included, so never put it inside a `PageCard`), and `GameCollection`'s `Placeholder` (draws nothing for a full second). **A declared `initialValue` is not a loading state**: where a chunk's resource declares one the original renders that default until the read lands, so a spinner there would be this build's invention. Check for one before adding a pending arm.

Two structural traps that generalise: **a `useState` seeded from a read breaks the moment the read is asynchronous** (use a `null` sentinel derived during render, or a shell that mounts the form only once its data has landed — both idioms are already in the project), and **a length test must not run against a pending read** (`undefined` is not "a thin feed").

## Commands

```bash
npm run dev          # Next.js dev server (Turbopack) on :5190; regenerates the glob maps first
npm run build        # next build -> .next/ (also regenerates the glob maps)
npm run start        # serve the build on :5190
npm run check:globs  # prove the glob maps match the asset folders (pass a Vite origin to match Vite too)
npm run lint         # eslint (flat config, ignores dist/)
```

### Next.js, and what it replaced

The app moved from Vite to Next.js 16 with the UI unchanged; the React Router app is mounted
client-only by `app/[[...slug]]` (see `.claude/skills/hash-ui-fidelity`). What keeps it identical:

- **No `import.meta.glob`.** Each former glob is `globMaps.<name>` from a generated sibling
  `<file>.globs.js` (`scripts/gen-glob-maps.mjs`, config at its top). Keys are exactly Vite's.
  Adding an asset to a globbed folder needs `npm run gen:globs` (dev/build run it).
- **An image import is still its URL string.** `scripts/asset-url-loader.cjs` tags src/'s image
  imports with `?url` and `next.config.mjs` gives those the `asset` type; CSS `url()` keeps
  Next's own handling. `?raw` (SVG/HTML) is still the file's text.
- **Env is `process.env.NEXT_PUBLIC_*`** (`API_BASE`, `USE_FIXTURES`, `FIXTURE_DELAY`, `SITE_*`);
  the `VITE_*` names below and in `docs/` are still honoured as fallbacks by `next.config.mjs`.
- `turbopack.resolveExtensions` is Vite's order (`EditProfile/frames.js` beside `frames.jsx`),
  StrictMode is off as it was, and the empty top-level `pages/` stops Next reading `src/pages`
  as a Pages Router. Do not delete it.

`npm test` runs **vitest**, scoped to `src/**/*.test.js` — today only the exchange logic
(`src/utils/exchange`). Everything else is still checked by **seventeen**
throwaway harnesses, none imported by `src/`. The full inventory and what each covers is in
`docs/backend-gaps.md` under "How this was checked"; the ones run most:

```bash
node verify-services.mjs                    # every `live: true` read + the adapter behind it
HAPPY_DOM=… node verify-whitelist.mjs                              # gap 16's writes (destructive)
HAPPY_DOM=<path>/node_modules/happy-dom node verify-pages.mjs      # renders 13 routes, asserts the DOM
FIXTURES=1 HAPPY_DOM=… node verify-pages.mjs                       # the same pass with fixtures back on
HAPPY_DOM=… node verify-wiring.mjs                                 # the live service adapters
cd "backend copy" && node verify-tier3.mjs && node verify-tier2.js # the routes built here
PW=<path>/node_modules/playwright-core SHOTS=<dir> node shot-wiring.mjs   # real Chrome, real pixels
```

All need `backend copy` running (`npm run dev user admin casino gateway`, never bare `npm run
dev`). **`scripts/dev.js` HAS NO WATCHER** — a new or edited route answers its old shape until the
services are restarted, which has cost a confusing harness run at least once. Restart after
touching anything under `services/`. The `FIXTURES=1` arm is the regression check the loading notes prescribe.

**`verify-wiring.mjs` and `verify-new-routes.mjs` need `RATE_LIMIT_ENABLED=false` in
`backend copy/.env`** — they exceed the 5-an-hour registration budget, and repeated runs of
anything also exhaust the 20-per-15-minutes LOGIN budget, after which every harness fails at step
one with a 429. That is the limiter working; restore the flag afterwards.

**DO NOT RUN `tools/route-inventory.js`.** It REGENERATES `docs/API-ROUTES.md`,
`docs/ROUTE-PORT-CHECKLIST.md` and `docs/route-manifest.json` from the `legacy/` folder, which
does not exist on this delivery — creating an empty stub to get past that emptied 8,273 lines out
of those three tracked files in one run. The three tools that fail for want of that folder are
meant to be left failing.

**`backend copy/tools/` ships six verifiers of the platform's own** — `verify-models.js`,
`verify-internal-acl.js`, `verify-authz.js`, `verify-modules.js`, `verify-security.js`,
`verify-frontend-routes.js`. They are cheap and they know things the throwaways do not:
`verify-models` caught two columns the database had and Sequelize did not, one of which made an
operator switch silently do nothing. Three of them fail on the one pre-existing missing sports
`legacy/` folder; that is expected, not a regression.

**A harness cleanup must delete only what that run created** — see the fidelity rules above; this
went wrong twice and cost real data both times. **And do not pipe a destructive harness through
`head`**: the pipe closing kills node on SIGPIPE before `finally` runs, so the cleanup never
happens. Use `tail` or redirect to a file.

## Reference material (the ground truth)

Two non-source directories hold a saved copy of the live site and are the reference for all pixel work. They are **reference only** — never import from them, never ship them, and don't treat them as part of the build.

- `bc.game/` — full page save: `bc.game/bc.game/index.html` plus hashed `assets/*.js|css|png|woff2` (~11 MB). The original stylesheets here are the source of truth for exact values. `Enter-uT7xMZD7.css` and `NavItem-NXfL5xSI.css` in particular hold the icon sprite coordinates, and existing CSS in `src/` cites them by filename in comments.
- `bc images/` — the image assets from the same save, without the JS/CSS.

When implementing a new section, read the corresponding markup in the saved `index.html` and the matching hashed CSS file rather than guessing values. Assets that get used are copied into `src/assets/` under simplified names (`logo.png`, `coloricon.png`, `menuicon.png`, …).

## Architecture

Layout shell, light theme and sidebar are summarised here and argued in full in `docs/architecture.md`.

### Layout shell

`main.jsx` → `App.jsx` → `MainLayout`. `MainLayout` owns the signals the original's root owns — `sidebarExpanded`, `mobileMenuOpen`, `exploreOpen` and the right-hand drawer — and composes the chrome, each piece of which is **single-viewport**: `Header` is **two entirely separate trees** (desktop `hidden lg:flex` at 60px, mobile `flex lg:hidden` as `.page-header`), each with its own signed-in variant, so a change must be made in both; `Sidebar` is desktop-only, `Tabbar` mobile-only, `FloatingActions` desktop-only. `Explore` and `Notification` are mounted here and both portal to `<body>`. **The fixed elements and the content padding are coupled by hand in `MainLayout.css`** (header 56/60, sidebar 240/72, tabbar 72) — changing any chrome dimension means updating the matching padding.

**A dialog route renders over the page you came from, and mounting it outside `<Routes>` is only half of that.** `<Routes>` still matches the dialog path and falls to the catch-all, so the outlet is driven by the last **non-dialog** location, assigned during render rather than in an effect (the dialog and the page under it must agree on the first render). **The cross closes the whole stack; the back arrow pops one** — the same helper at two depths — so a jump of −N needs N, and the depth is tracked off `useNavigationType()` plus whether the new location is an overlay route. Both were replayed over real sequences before they were believed; the reasoning is in `docs/architecture.md`.

The `Footer` is mounted here, outside the 1248px container. Two things about it are this build's rather than the original's: its prose/feedback band is **home page only**, by an exact-match ALLOWLIST (`BLURB_SHOWN_ON = ['/']`) rather than a prefix denylist, so a page added later does not inherit it; and `.footer-bg` carries a 1rem top margin from `sm` up and none below. Sidebar collapse is purely visual — the container narrows to 72px with `overflow: hidden` and the inner content is clipped; no markup swaps. **Whether it is collapsed is decided by the WIDTH, at 1280**: measured on the live site, `.app-root` carries `side-unfold` with a 240px rail at 1280 and `side-fold` with a 72px one at 1279, and a resize re-derives it either way. It is the same 1280 `openRight` uses, and the same sum — 240 + the page + 380. Below it the page column takes the width the rail gave up (x = 88, a 16px right gutter), which reverses an earlier choice here to keep the column at its expanded width and centre it.

Empty files and directories mark the next pieces to build (`src/layouts/GameLayout/`, `src/components/ui/`, `src/styles/`, `src/context/LayoutContext.jsx`, `src/App.css`) — a placeholder, not a stub; nothing imports one. `src/layouts/MainLayout/GlobalChat/` is the exception: a dead leftover from before the drawer was shared, and the panel it was going to hold is `src/components/Chat/`.

### Routes

Built, and all of them the original's own paths: `/` and `/casino` (both Home's pair), `/casino/:tab`, `/favorite`, `/recent`, `/section/:section`, `/gamelist/:type`, `/tagname/:tag`, `/game-related`, `/explore`, `/chat-public` (phone-only, the tabbar's chat button — see `docs/drawer.md`), the sports exchange (`/sports`, `/sports/match/:sid/:gmid`, `/sports/my-bets`, `/sports/statement`, `/sports/live` → In-Play; any other `/sports/*` shows the lobby — replaces the BetBy page at the user's request, `docs/exchange.md`), `/promotions/promotion`, `/promotions/daily-contest`, `/promotions/weekly-raffle`, `/deposit-offer`, `/vip-detail` with `/vip` redirecting to it, `/quests`, `/bonus`, `/referral-exhibition` and `/referral` with `/referral/:section/*` and `/affiliate`, `/help/:helpId` with `/help` redirecting, `/responsible/:responsibleId`, `/wallet/*` as a layout route over its nine panes (balance, deposit, withdraw, buy, swap, vault, transaction, rollover, bet-history), and `/settings/*` as a second layout route over its six (account-info, security, preferences, verification, payment, whitelist).

Dialog routes, matched on the pathname in `App.jsx` and mounted beside `<Routes>` rather than inside it: `/login/signin`, `/login/regist`, `/deposit`, `/user/enter`, `/free-plays`, `/vip-level`, `/user/profile/:id`, `/user/medals/:id`, `/user/statistics`, and — below `lg` only, where the original's `info.dialog` is a device test — `/wallet/withdraw`, `/referral*`, `/favorite`, `/recent`, `/settings*` and the four list pages.

**The catch-all renders the 404 page** (`pages/NotFound`) at the user's request — except while an overlay route is up, when the page under a directly-loaded dialog (a pasted `/deposit`) is still Home. Unbuilt chrome links now land on the 404; they are listed under Sidebar as the rows to give a page next.

### Icon sprites

Icons are not individual files. Three sprite sheets are positioned with `background-position`: `.color_icon_img` (`assets/coloricon.png`, `background-size: 301px 256px`, 32px cells, coloured), `.menu_icon_img` (`assets/menuicon.png`, `352px 352px`, greyscale — the sidebar rows) and `.game_icon_img` (`assets/gameicon.png`, `352px 320px` — the BC Originals flyout). Base rules are split by who needs them: `.color_icon_img` lives in `index.css` because Header, Tabbar and Sidebar all use it; the other two stay in `Sidebar.css` with their positions.

**All the positions are transcribed, so adding an icon is a data edit and never a CSS one** — `menu_icon_img` and `game_icon_img` were copied whole from `NavItem-NXfL5xSI.css` and `OriginalsGames-zlYWkqQI.css` after checking every existing rule matched. Regenerate rather than hand-edit; only `color_icon_img`'s positions are still added one at a time. **Every state is a real sheet** (normal / hover / active-green, each with `_w` light and `_retina` twins), and the ACTIVE state is a class ON the icon rather than a descendant selector, so the markup swaps it. Which sheet is the light one is not derivable from its filename — see Light theme above. `menuicon.png` is now the true 352 sheet with `menuicon_retina.png` beside it; `coloricon.png` is still the retina file under the plain name and has no media block at all.

### Light theme

**The build is no longer dark-only** — anywhere in these notes that still says it is, is out of date. Nothing in the palette is sampled or chosen: the original ships the whole light theme in one block (bare `.app-root` against `.app-root.dark`), and `src/index.css` carries it converted from that block's `R G B` triples to hex. Exactly one value is invented and is flagged there, `--card_dark`.

**The polarity is inverted from the original, deliberately.** There, light is the base; here `@theme` already held the dark values every page was built against, so light arrives as an `.app-root:not(.dark)` override. One palette in `@theme`, one override block, no value written twice. It wins without a specificity argument because Tailwind emits `@theme` into `@layer theme` and the override block is unlayered — the cascade hazard below working in our favour. **So a colour added only to `@theme` is a colour that will not change when the theme does.**

**`dark:` keys off the class** — `@custom-variant dark (&:where(.dark, .dark *))` at the top of `index.css`. Without it the stock variant is `prefers-color-scheme`, which silently keyed every `dark:` utility in the project to the visitor's OS. The state is `theme`, the boolean is `darken` (`theme !== "light"`, so an unrecognised value reads as dark), and **the class is applied before the first paint** from `main.jsx`, not from a provider effect. That one class does three jobs: the palette, the `dark:` variant, and the pre-boot loader's rules in `index.html`.

**All three sprite families are themed, and which sheet is the light one is not derivable from the filename** — guessing it is what made the sidebar icons invisible in the light theme. The stylesheet says the light RESTING state of `menuicon` is the `w_h` sheet, while `gameicon` is arranged the other way round; measured luminance confirms it. The original picks the sprite class in JS and this build picks it in CSS, as selector pairs. Three PNGs are ink rather than artwork and vanish on white (`logo.png` has a `logo_w` twin picked in JS at three call sites). Known theme gaps, and the four close buttons that invert the usual token/literal arrangement, are in `docs/architecture.md`.

### Styling

Tailwind v4 through `@tailwindcss/postcss` (`postcss.config.mjs`) — there is **no `tailwind.config.js`**. Theme tokens live in the `@theme` block in `src/index.css`, and each layout component ships its own plain CSS file next to it.

The `@theme` block is the single source of truth for colors — every `bg-`/`text-`/`fill-`/`border-` utility is generated from it. Do not redeclare a token's value as a hand-written class in component CSS; that split is what previously made the layer names contradict each other. **It holds the DARK values and the light theme overrides them** — see the Light theme section above before adding a token, because a colour added only to `@theme` is a colour that will not change when the theme does.

The Tailwind import is scoped with `source("./")` so class scanning is limited to `src/`. Without it Tailwind also walks the `bc.game/` and `bc images/` mirrors and emits ~70 KB of utilities the app never uses. Keep the scope if you move or rename the CSS entry.

Brand palette in practice: page bg `#232626`, header/sidebar `#292D2E` (`layer3`), cards/units `#323738` (`layer4`), raised controls `#3A4142` (`layer5`/`layer6`, same value), brand green `#24EE89`, muted text `#B3BEC1` (`secondary`), dim text `#849194` (`tertiary`). Those last two were once written here as `#98a6b3` / `#6c7a85`; both were corrected in the `@theme` block to the original's own `.app-root.dark` values and this line had not kept up.

Sprite base rules are split by who needs them: `.color_icon_img` lives in `index.css` because the Header, Tabbar and Sidebar all use it, while `.menu_icon_img` stays in `Sidebar.css` as the only consumer. Positions sit with the component that uses them.

Fonts are the site's Averta Std woff2 files served locally from `src/assets/fonts/` (400/600/800), declared via `@font-face` in `index.css`.

**The family is declared BARE — `font-family: avertastd`, no fallback list — because that is what `.app-root` does, and the omission is load-bearing.** `avertastd-extrabold` has **no rupee sign**: decompress the three woff2 files and read their cmaps and U+20B9 is present at 400 and 600 and absent at 800 (so is U+20A9, won). Every 800-weight `₹` on this site is therefore a fallback glyph — on the live page as much as here — and the only lever over it is which family answers. This build carried `'avertastd', system-ui, -apple-system, sans-serif`, and `system-ui` on Windows 11 is Segoe UI Variable, which has a real 800; so the fiat deposit tab's chips rendered a genuinely extra-bold sans rupee sitting visibly heavier than the Averta digits beside it. Removing the tail hands the glyph to the browser's default family, which is what the original gets. Do not add a stack back "for safety". Same rule in `Sidebar.css` and on `--font-mono`.

### Sidebar

Widths are the original's: `w-60` (240px) expanded, `w-[72px]` collapsed — 72 is the `p-4` wrapper's 16px a side around a 40px icon box, and the header's left block folds to the same 72, so `.sidebar-container.collapsed`, `.main-layout-content.sidebar-collapsed`'s `padding-left` and that header block must move together.

**`index-DuwOs_Mv.js` is the sidebar's own menu definition and it IS in the mirror** — every row, label, link, icon and guard. The arrays in `Sidebar/index.jsx` were transcribed from rendered markup before anyone looked, so **check them against that module before adding or "correcting" a row**. Every row now carries its real path, including the eight Casino rows that are tabs of the built `/casino/:tab`; the rest keep their URL and render Home under the catch-all, and those are the rows to give a page next. The `needLogin` rows are wired to the session, and Refer and Earn is the one row whose `link` is a marker string rather than a path (`action: 'refer'`, opening the dialog).

**Icon states are separate sprite sheets, not opacity or filters** — normal, hover, active-green, each with `_w` light and `_retina` variants, and all of them are local now. Neither original stylesheet contains a single `opacity` declaration. Never dim or tint the normal sheet to fake a state.

**The BC Originals hover flyout is a SIBLING of the aside, and that is forced**: `.sidebar-container` carries the `overflow: hidden` its collapse animation depends on, so an absolute child would be clipped at the sidebar's edge and never paint. Its `-ml-4`/`pl-4` pair is not decorative — it opens a 16px transparent bridge so the pointer can cross from the row without passing over the page. Its list is a third feed (`originals.js`, 61 rows), neither the recommend selection nor `data/games.js`; do not merge them. `dice` has no sprite rule on the live site either and falls back to cell (0,0) — kept, like `f-ull`.

### Cascade hazard — plain CSS outranks Tailwind

Every `.css` file here is unlayered, while Tailwind's utilities live in `@layer utilities`. Unlayered CSS **always** beats layered CSS, so a plain rule silently defeats a utility no matter the source order. This is not a specificity problem and adding `!important` to the utility is not the fix.

It has already bitten once: `.center { display: flex }` in `index.css` overrode `lg:hidden` on the tabbar, so the mobile tabbar rendered on desktop. The rule of thumb: **never set `display` in a component CSS file on an element whose visibility is controlled by responsive utilities** — centre with `flex items-center justify-center` in the markup instead of the `center` helper.

### Responsive strategy — read this before changing any breakpoint

The original sets its root font-size from JS (`index-BsFv7ByC.js`) and sizes everything in rem — that is where every fractional value in this repo comes from (`56 * 0.7442 = 41.66` at 320px):

```js
const m1 = 430, _5 = 640;
const f = document.documentElement.clientWidth;
const h = f < _5 ? f : m1;                    // clientWidth below 640, else 430
remScale = h / m1;                             // NOT capped at 1
document.documentElement.style.fontSize = remScale * 16 + "px";
```

The scale is `clientWidth / 430` all the way to 639 — it passes through 1 at 430 and **keeps growing**, hitting 1.486 (a 23.78px root) at 639 — then snaps back to exactly 1 at 640. That discontinuity at `sm` is the original's behaviour.

`src/utils/remScale.js` ports that function and sets the root font-size inline before the first render (debounced at 100ms on resize, as the original does). `src/index.css` carries the same formula as a pre-script fallback:

```css
:root { --u: 1px; font-size: calc(16 * var(--u)); }   /* >= 640: remScale is 1 */
@media (width < 640px) { :root { --u: calc(100vw / 430); } }
```

**The JS is the authority, not the CSS.** A stylesheet cannot read `clientWidth`, and `100vw` counts a classic scrollbar where `clientWidth` does not — on a desktop window under 640px that inflates every rem by a few percent. It is not academic: it rendered the hero's Sign Up button at 139.5×32.8 instead of 134.73×31.70, and it tripped `max-width: 100%` on the mobile banner (whose width at `h-full` equals the panel width to within 0.0000rem), shrinking the artwork and leaving a strip of panel below it. Don't delete the JS and rely on the CSS alone.

**So express measured values in rem: `design px / 16`.** 72px becomes `4.5rem`, 56px becomes `3.5rem`. Tailwind's rem-based utilities (`text-xs`, `mt-0.5`, `px-1`, spacing, radii) then scale for free — prefer the utility the original itself uses over a hand-converted value. `--u` exists to drive the root font-size; you rarely need it directly.

This was previously written as `min(1px, 100vw / 430)` — capped at 1 — on the belief that only sub-430px viewports were affected. They are not: everything from 430 to 639 was rendering at a 16px root while the real site scaled up to 23.78px. **Do not reintroduce the cap.**

One more trap in this area: a value fed to `calc()` must carry a unit. `--header-mb: 0` made `calc(var(--header-h) + var(--header-mb))` a type error (length + number), so `padding-top` was invalid at computed-value time and fell back to `0` — the hero started at the top of the page and the fixed header covered its first 3.5rem. Write `0px`.

Two consequences worth knowing:

- Do **not** override a Tailwind `font-size` while leaving its paired `line-height` behind — `text-xs` sets both, and splitting them produced phantom vertical gaps on small screens.
- Sprites are deliberately **not** rem-based. The original pins `.color_icon_img` / `.menu_icon_img` to `32px`, so icon boxes stay constant at every width while the text around them scales.

Do not "tighten" spacing around a sprite icon without checking the reference first. `color_icon_img` is a 32px box shrunk by `scale-[80%]`; the transform leaves 3.2px of dead space top and bottom and the inline-block adds baseline descender space. **The original has both** — it renders the identical structure. Removing them pulls labels ~9px too high.

Where a component still hardcodes measured pixel values per breakpoint, the bands are taken from the real site at each viewport width:

- `≤350px` (320 viewport), `351–390px` (375), `391–639px` (425), `640–1023px` (tablet), `≥1024px` (desktop, Tailwind `lg`)

**Sub-640 bands are now a smell, not the pattern.** Since the root scales continuously below 640, a px value pinned inside one of those bands freezes while everything around it grows. Before adding one, divide the measurement at each sampled width by the root font-size there (`16 * width / 430`); if the same rem value comes out, it is one rule, not four.

Consequences:

- Fractional values like `41.66px` and `13.95px` are **measurements, not mistakes**. Do not round or "clean them up" — convert them to rem, which makes the media query unnecessary. `MainLayout.css`, `Tabbar.css` and `Header.css` have all been converted; the four Header bands collapsed to two rules once divided out (only the logo genuinely changes at `sm`: 10.125×2.25rem below, 9×2rem above).
- A value measured at one width must not be applied across a whole band. The tabbar used to pin its buttons to `85.11px` (a 425px measurement) for everything from 391–639px, which left gaps at the wider end.
- Breakpoint blocks lean on `!important` where they override Tailwind utilities that came from the original markup. Keep that pattern inside breakpoint blocks — but a rem rule outside one rarely needs it, since unlayered CSS already outranks the utilities layer. If a converted rule duplicates a utility the markup already carries (`px-4`, `ml-1`, `text-base`), delete the rule rather than restating it.
- Per-breakpoint sizing lives in `Header.css`, `Tabbar.css`, `MainLayout.css`, `Sidebar.css` — a new component that needs pixel parity gets its own CSS file following the same shape.
- The markup carries `sm:` variants copied from the original DOM. In `Sidebar` those effectively always apply, since the sidebar only renders at `lg` and up.

### Verifying a change

Run `npm run dev` and compare against the saved page (`bc.game/bc.game/index.html`) at each of the five widths above. Measure rather than approximate — the point of the project is exactness at every listed breakpoint, not just at desktop.

Both the Tailwind scope above and `globalIgnores` in `eslint.config.js` exclude the reference mirrors. Any new tool that walks the project (a formatter, a type checker, a bundler analyzer) needs the same exclusions, or it will chew through 11 MB of minified vendor code.

## Known loose ends

- `src/assets/` holds staged images for sections not built yet, plus a handful of files that are correct and unreachable — the bonus widget's casino/sport artworks, the deposit dialog's full-width 7-Day card, the three fallback hero banners. Each is kept rather than deleted because it came out of the same recovery pass as the files that are used and is already right for the day its arm is reachable. The inventory is in `docs/overview.md`.
- `main.jsx` renders `<App />` without `StrictMode`.
- **The project is under version control** — a `git` repo on `main`, with work since the last commit uncommitted. `git` is the undo, but only back as far as that commit, so anything newer has none. Claude Code's own `~/.claude/file-history/` keeps per-session snapshots of every file it edits, which is what these notes were recovered from after they were once deleted uncommitted.
