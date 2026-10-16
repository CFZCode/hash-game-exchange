---
name: hash-ui-fidelity
description: The UI rule for hash-game-exchange — the frontend is an exact copy of the hash-games (bc.game rebuild) UI and must stay pixel-identical through every change (the Next.js migration, backend wiring, rebranding). Read before touching anything in frontend/, before migrating or moving a file, and before wiring a page to the backend. Covers the reference copy, the pixel-compare check, what may and may not change, and the Next.js migration rules.
---

# hash-ui-fidelity

**The one rule: the client gets the hash-games UI exactly as it is. No change may move a pixel unless the user asked for that specific change.** Data may change (fixtures → the real backend); markup, CSS, class lists, assets, breakpoints, animations and copy may not.

## Where things are

| what | path |
|---|---|
| This project (repo `CFZ-Technologies/hash-game-exchange`) | `/Users/apple/Developer/cfz/client-projects/hash-game-exchange` |
| Its frontend | `frontend/` |
| **The reference UI** (never edit it) | `/Users/apple/Developer/cfz/hash-games` (Vite + React), copied at commit `ed2bece109e1dfde2ada15f4773466b8d8411ad2` |
| The page-by-page notes | `frontend/CLAUDE.md` and `frontend/docs/*.md` — they record which values are evidence from bc.game and which are invention. Read the page's doc before touching that page. |
| The pixel check | `tools/ui-compare.mjs` |

The copy was made with everything except `node_modules`, `dist`, `admin`, `backend`, `backend copy`, `.git` and `.env.local`, and checked identical with `diff -rq`. Dependencies come from the same `package-lock.json` (`npm ci`).

## Proving nothing broke

Run the reference and the build under test side by side, then compare:

```bash
cd /Users/apple/Developer/cfz/hash-games && npx vite --port 5191 --strictPort        # reference
cd <this repo>/frontend && <its dev command on 5190>                                   # under test
node /Users/apple/Developer/cfz/admins/agents/qa-browser.mjs start                     # shared QA Chrome
node tools/ui-compare.mjs http://localhost:5191 http://localhost:5190
```

- It checks ~19 routes at 1440×900 and 390×844 with animations frozen, prints the share of differing pixels, saves both shots for anything over 0.5 %, and exits 1 on a difference.
- **Both sides must use the same data source.** Either both on fixtures (`VITE_USE_FIXTURES` unset) or both on the same backend. Otherwise you are comparing data, not UI.
- `/help/*` is a federated remote served live by hash.game and can show its region pop-up on one load and not the next: compare it by eye.
- A difference is a bug in the change, not in the reference. Fix the change. Never "fix" it by editing the reference.
- Also check signed-in screens (wallet, settings, header) once the backend is wired. They aren't in the default route list because they need a session.

Port 5174 on this machine is another project (PageBook admin), not hash-games. Don't compare against it.

## What may change

- `src/services/` and `.env`: where data comes from (fixtures → backend), endpoints and response mapping. Keep the shape each component already receives.
- Branding values the owner panel supplies (title, logo file), when the user asks for them.
- Build tooling (Vite → Next.js), as long as the rendered output is identical.

## What may not change without the user asking

- JSX structure, class names, CSS (`src/**/*.css`, Tailwind `@theme`, `@layer` placement). The cascade-layer placement is load-bearing, see `frontend/CLAUDE.md`.
- Assets in `public/` and `src/assets/`, fonts, icon sprites.
- Breakpoints, including the deliberate 640 vs 1024 `mobile` split on `/vip-detail`.
- Copy and i18n strings.
- Route paths and which routes open as dialogs.

## Deliberate departures

Changes the user asked for, so the pixel check WILL show them against the reference. Expect diffs only in these regions; anything else is still a bug.

- **Predictions removed**: the sidebar group row (`/predictions`). No route existed.
- **Crypto Futures removed**: the sidebar group and its four rows (`/trading/contract`, `/trading`, `/trading/up-down`, `/trading/spread`, `/trading/tap`) and the home page's UPDOWN category card (`/trading/up-down`). The four remaining cards share the row. On a home diff this shows as the card row reflowing.
- **Forum removed**: the sidebar bottom group's external row (`forum.hash.game`).
- **Lottery removed**: the sidebar group and its five rows (`/lottery`, My bets, All lotteries, Favorites, BC Lottery, Popular), the home page's LOTTERY category card (the three remaining cards share the row, so a home diff shows the card row reflowing), the home page's "Upcoming Lottery Draw" section (everything below it moves up), the Explore panel's Lottery search type and the footer's Lottery link. No `/lottery` route existed; those URLs fall to the catch-all.

- **Home Highlights on the exchange feed** (2026-10-16): live builds fill the row from the exchange's cricket, soccer and tennis boards, in that order (`services/home.js` `readLiveHighlights`). The feed has no crests or flags, so a card prints each team's name in the badge slot and drops the name row under it; an in-play card with no score shows `VS` / `In-Play`; a card opens its `/sports/match/:sid/:gmid`. The fixture build still renders the three captured matches unchanged.
- **Viewport meta = bc.game's own** (2026-10-16): `width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover` (`frontend/app/layout.tsx`). The copy had only `width=device-width, initial-scale=1`, so any overflowing element widened Chrome's mobile layout viewport and the page rendered zoomed and cut off, and iOS zoomed into sub-16px inputs. No layout pixels change in the normal case.
- **Weekly Raffle removed** (2026-10-16): the Promotions group's row (`/promotions/weekly-raffle`), its route and phone dialog, and its card in `pages/Promotions/promotions.js`. `pages/WeeklyRaffle` stays on disk, unrouted; the URL falls to the catch-all.
- **BC Originals moved out of Casino** (2026-10-16): the row (same icon, flyout and `/casino/brand` link) is its own sidebar unit between Casino and Sports instead of the third Casino child. A sidebar diff shows the Casino group one row shorter and a new unit below it.
- **Promotions: a Sports tab and a detail page** (2026-10-16): live builds show All / Casino / Sports on `/promotions/promotion` (`SPORTS_TAB`, `segment=sports`; bc.game's strip has no Sports). Every card is now a `<Link>` to `/promotion/:segment/:slug` (`pages/PromotionDetail`, a page on desktop, a `PageDialog` titled with the promotion below `lg`), built from bc.game's own `detail-Bn5sXbpM.js` markup over `GET /admin/promotions/slug/:segment/:slug`. This build's arms there: Terms & Conditions in the shared Accordion (the original prints them inline), the countdown box shown without artwork, a "Play now"/"Bet now" CTA, the sports events as `layer4` cards (the original mounts BetBy), and the empty state for a miss (the original redirects to `/`). The fixture build's cards link to an assembled fixture detail.
- **Latest round & Race on bc.game's current markup** (2026-10-16, user-supplied live DOM capture): `pages/Home/LatestBets` no longer matches the reference's older chunk. A `relative mt-6` block now holds a page-size picker (`absolute end-0 top-0 hidden sm:block`, 10 by default, 10/20; the option list under the trigger is this build's since the capture shows it closed), the tab strip on the LEFT (`scroll-x tabs-title hide-scroll mr-auto max-w-100`, `tabs-btn-group`, `tabs-btn btn-like`, an inert `tabs-indicator`) instead of lifted onto the header line, and a `tabs-content` panel in `bg-layer4_alt` with a `bg-layer2` column-header row (Game / Player / Bet Amount / Multiplier / Profit) over 48px rows alternating `bg-layer2` / `bg-layer3_alt` (no per-cell labels). Amounts print in USD (`$22.45`, `-$22.45`, `+$2,075.77`, brand green on wins) beside the coin icon. Below `lg` the row keeps the older four-column template (Bet Amount dropped). Every source (live, static showcase, fixture) goes through `toTableRow` / `isAdvertised` in `bets.js`, so un-offered Originals never appear; the static showcase's Originals are now Limbo / Plinko / Mines / Keno (this also changes Recent Big Wins' static cards).

- **`/sports` replaced by the native exchange** (2026-10-13): the BetBy widget lobby (`pages/Sports`, kept on disk, no longer routed) is replaced by the back/lay exchange in `pages/Exchange` — lobby, match page, My Bets, Statement. The look is kept to hash.game: same tokens, the BetBy rail bar (`.sports-rail`), BetBy's sport/chrome SVGs, the site's tabs, MenuPageLayout and dialogs. A pixel diff of any `/sports` route against the reference will differ throughout; judge it against the tokens and icons, not the BetBy layout.
- **Blog is internal** (2026-10-16): bc.game's Blog row and footer News link go to the external blog.bc.game; here they are `<Link>`s to this build's own `/blog` (category tabs over cover cards, `Pagination`) and `/blog/:slug` (cover, chip, date, sanitised body in a `PageCard`) — `pages/Blog`, `services/blog.js`, over admin-service `GET /admin/blogs`. The sidebar row is back in the bottom group after Responsible Gambling (no external arrow), and the footer's "About Us" column returns with News as its only row; both are gated by the OWNER's `blog` feature (`gates.js` `blog: { feature: 'blog', notAgentPlayer: true }`, `['/blog', 'blog']`), so with the feature off the row, the column and the routes are gone. A sidebar or footer diff shows them only when the owner has the blog on.

- **Referral unlock table from the site admin** (2026-10-16): `/referral/rules`' Friend's Level / Total Wager / Unlock Amount rows come from `site-config/public` → `referralUnlocks` (migration 106) on live builds. Same markup; once the backend serves the key, wagers print grouped ("1,000,000", not the capture's "1000,000") and each amount's coin is the reward currency's (USDT) rather than bc.game's gold coin. Fixture builds and a backend without the key still render the capture. See `frontend/docs/referral.md` › Rate & Rules.

- **Signed-out home hero art is Parker567's** (bc.game's esports banner is another brand): desktop `public/brand/parker567-hero.jpg` covers the panel; phone `parker567-hero-mobile.jpg` sits bottom-right at 86% height, 4% past the right edge, left/top edges faded. The copy column keeps the original's `w-1/2 min-w-[11.25rem]`, so text matches the reference exactly; only the art region differs.

- **Home Highlights card**: cricket uses a colour icon (`assets/sports/sport-cricket-color.svg`); the sport/tournament line is left-aligned with `pr-16` clear of the Live badge.
- **Game page**: the info card is replaced by the Recommended Games row (`pages/GameCollection/RecommendList`); the play overlay card is `w-full max-w-[30rem]` in a `px-4` overlay.
- **Rollover**: the Amount column is "Turnover" — wagered / target with a progress bar.
- **Account menus**: Free Plays and Do Not Disturb are hidden (hidden-features skill).

The sidebar is therefore shorter than the reference, so everything below the removed rows in the sidebar shifts up. Details are in `frontend/docs/architecture.md` under Sidebar. Left as they were on purpose: the Sports lobby's own Predictions tab (BetBy's), the Trading and Lottery options in the bet-history type filter, the slot theme tag "Lottery" in the casino catalogue's tag list, the footer's "Crypto trading is not gambling" licence line, and the `detrade:trading` game redirects in FreePlay and Profile.

## Next.js migration rules

1. **First make it run unchanged.** Mount the existing React Router app client-only in Next.js: an App Router optional catch-all `app/[[...slug]]/page.tsx` that renders the existing `<App/>` inside `BrowserRouter` with `ssr: false`, and the same global CSS imported once in `app/layout`. This is the official incremental path from Vite. Pass the pixel check before doing anything else.
2. `import.meta.env.VITE_*` → `process.env.NEXT_PUBLIC_*` (`VITE_API_BASE`, `VITE_USE_FIXTURES`, `VITE_FIXTURE_DELAY`). Keep the same defaults: fixtures stay ON unless set to `"false"`.
3. `import.meta.glob(...)` is Vite-only and is used for art (`utils/gameArt.js`, `coinArt.js`, `channelArt.js`, `pages/**`). Replace each one with an explicit generated import map (a small script that writes the same keys → URLs) so every key resolves to the same file. Check the keys match one for one.
4. `index.html` head content (fonts, meta, theme colour, favicon) moves to `app/layout` metadata and `<head>` unchanged.
5. Tailwind 4: `@tailwindcss/vite` → `@tailwindcss/postcss`, same CSS entry, same `@theme`.
6. Moving a route to a real Next page (server-rendered) is a later, per-page step, and each one passes the pixel check on its own.
7. Keep the Vite setup until the Next.js build passes the check on every route, then remove it in its own commit.

## Hand-over

Before the client gets it:
- run the pixel check on all routes, plus the signed-in screens by eye;
- run `npm run build`;
- leave no bc.game trademarks the client may not ship. The bc.game name and logo are in the copied UI; whether to rebrand is the user's call, so ask.
