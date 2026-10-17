# Sports exchange — data + logic layer

Part of the bc.game rebuild notes. Index: [../CLAUDE.md](../CLAUDE.md). Screens first (below), then
the layer they build on.

- **Backend**: mssports (TENEXCH's sports server) in `backend/services/sports`, through the gateway
  at `${NEXT_PUBLIC_API_BASE}/api/v1/sports/user/...` (TENEXCH served the same handlers at
  `/api/user/...`). Auth = the platform access token (`services/tokens.js`), `Bearer`.
- **Transport**: `services/exchange/api.js` `exchangeRequest()` — NOT `request()`: it returns the
  parsed body and throws `ExchangeError {status, code, message, body, pending}`. Always live (the
  fixture switch does not apply). 401 → client.js's single-flight refresh, then one replay.
- **Logic sources**: Addaplay (`admins/frontend-kit/main/Addaplay`) for every calculation it has,
  TENEXCH (`tenexch-new/frontend`) for the rest — marked in each file. Import from
  `utils/exchange` (index), `services/exchange`, `hooks/exchange`.
- `npm test` — 120 vitest cases (`src/utils/exchange/*.test.js`) + 7 for the screens' view model (`src/pages/Exchange/model.test.js`).

## Screens — lobby, My Bets, Statement (routing in `src/App.jsx`)

`/sports` replaced the BetBy-style lobby (`pages/Sports`, kept, unrouted) at the user's request; the
look stays hash.game's (the hash-ui-fidelity skill lists it under Deliberate departures). The
`sports` site gate still covers the whole prefix.

| Route | File | What it reads |
|---|---|---|
| `/sports` (`?sport=inplay\|cricket\|soccer\|tennis`, default cricket) | `pages/Exchange/Lobby/index.jsx` | `useSportsList(sid)` per board on screen (In-Play polls 4, 1 and 2; a sport view only its own), `useLatestEvents`. The sports tree is the main sidebar's Sports group (`layouts/MainLayout/Sidebar/SportsMenu.jsx`, `useSportsTree`), not a column on this page |
| `/sports/live` | redirect | → `/sports?sport=inplay` (the footer's link) |
| `/sports/match/:sid/:gmid` | `pages/Exchange/Match/index.jsx` (match agent) | `React.lazy` inside a `LazyRouteBoundary` keyed on the path |
| `/sports/my-bets` | `pages/Exchange/MyBets/index.jsx` | `getSportsBets({status, betType, search, page})`, Matched / Settled (no Unmatched: the site only takes matched bets), Matched every 10s, amounts in the header wallet's coin |
| `/sports/statement` | `pages/Exchange/Statement/index.jsx` | `getAccountStatement` (≤ 31 days, checked client-side first), row → `MarketBetsDialog` (`getStatementMarketBets`) |
| any other `/sports/*` | lobby | |

- **Price click** → `/sports/match/:sid/:gmid?market=<mid>&runner=<section sid>&side=back|lay`
  (`matchPath` in `pages/Exchange/model.js`); a row or tree link → the bare match path.
- **Board → row** (`toLobbyMatch`): section[0] = 1, section[1] = 2, the "The Draw" runner = X, no
  draw runner → `draw: null` (locked "—"); `oname` is `back1` or `BACK1` depending on the board; a
  0 price is "no price"; a non-ACTIVE/OPEN runner gets no prices; a non-OPEN event locks the row.
  `stime` ("10/9/2026 10:30:00 AM") is read as the wall clock it prints. Tested in `model.test.js`.
- **Frame** (`ExchangeFrame.jsx`, `ExchangeRail.jsx`): the BetBy rail bar (`.sports-rail*` from
  `pages/Sports/Sports.css`) with Exchange / My Bets / Statement cells (BetBy's `ic-home`,
  `ic-navbar-mybets`, `ic-stat`) and, signed in, the Stake buttons action (kit `StakeButtonsModal`,
  `useStakeButtons` + `saveStakeButtons`, labels "1k"/"1L" like the server's seed) and the kit
  no balance badge (removed at the user's request; the header balance is the one shown). My Bets / Statement use
  `MenuPageLayout` from `lg` up (tools at the heading's right), the frame + a heading below it.
- **Signed out**, `/sports/my-bets` and `/sports/statement` raise the sign-in dialog over the page
  you came from (`sportsAccountNeedsAuth`, the `/favorite` pattern).
- **Settled has no server filter** — see the exchange row in `docs/backend-gaps.md`.
- The In-Play pill has no glyph: `SportTabs` draws sport art only and there is no "live" sport SVG.

## Endpoint → service → hook → shape

| Endpoint (`/api/v1/sports/user` +) | Service | Hook | Returned shape |
|---|---|---|---|
| `POST /cricket/all-data {id:sid}` | `getSportEvents(sid)` | `useSportsList(sid)` 5s | `{t1, t2, events}` — EventRow[]; `events` = both, deduped, in-play first |
| `GET /all/sports/tree` | `getSportsTree()` | `useSportsTree()` 60s, one shared poll for every caller (`hooks/exchange/sharedSportsTree.js`) | `{sports:[{name, etid, children:[{name, cid, children:[{name, gmid, etid, iscc}]}]}], racing:[…sdatetime]}` |
| `GET /v1/sports-get_latest_events` | `getLatestEvents()` | `useLatestEvents()` 30s | `[{id, lid, name, sportId}]` |
| `POST /cricket/get-match-private-data {gmid,sid}` | `getMatchMarkets(gmid,sid)` | `useMatchMarkets(gmid,sid)` 1s (not 300ms: gateway 429), watchdog, paused hidden | service `{state:'ok'\|'no_record'\|'gone'\|'empty', markets}`; hook `{markets (shaped), loading, error, noMarkets, roundGone, matchGone, getMarkets(), refresh}` |
| `GET /v1/sports-gamedetailPrivate?gmid&etid` | `getMatchHeader(gmid,sid)` | `useMatchHeader(gmid,sid)` 5s | `{gmid, cname, ename, stime, iplay, iscc, tv, scard, bm, …}` or null |
| `GET /cricket/score-url?gmid&etid` | `getScoreUrl` | — | `string\|null` (single-use token: once per card) |
| `GET /virtual/event-media?gmid&etid` | `getVirtualEventMedia` | — | `{gmid, etid, stream, score}\|null` |
| `GET /betting-config` | `getBettingConfig()` (60s cache) + `getSportsBufferSeconds`, `getSportsMaxOddsRule`, `peekVirtualLimit`, `applyVirtualLimits` | `useBettingConfig()` | `{buffers:{global, grid, sports}, max_odds, virtual_limits, leagues}` |
| `GET /bet-limits/:eventId` | `fetchEventLimits`, `peekEventLimits`, `applyEventLimits` | applied inside `useMatchMarkets` | `{[mid]: {min?, max?}}` |
| `POST /place` | `placeBet(payload)` | — | `{ok, odds, stake, balanceDelta, oldBalance, newBalance, totalExposure, exposure, duplicate, raw}` |
| `POST /place-combined {bets}` | `placeCombinedBet` | — | same + `legs` |
| `GET /bet-result/:clientRef` | `getBetResult`, `reconcilePendingBets(onOutcome)` | — | `{state:'pending'\|'accepted'\|'rejected'\|'unknown', message, odds, stake}` |
| `POST /matchexposures/match {match_id}` | `getMatchExposure(gmid)` | `useMatchExposure(gmid, markets)` 2s + `bet:placed` | rows `[{match_id, event_id, team_name, exposure_amount:number, game_type, …}]`; hook adds `book` `{'<mid>:<runner lc>': n}` |
| `GET /cricket/user-open-bets-grouped?eventid` | `getOpenBets(gmid)` | `useOpenBets(gmid)` 5s + `bet:placed` | `{matched, unmatched}` of Addaplay `normaliseBet` rows |
| `GET /fancy-bets?runner&match_id&event_id&sport_id&market_type` | `getFancyBets` | — | `[{bet_type, stake_amount, odds, size, liability, market_type, fancy_name, badlo}]` |
| `GET /cricket/sports-bets/user?page&limit…` | `getSportsBets` | — | `{rows: normaliseBet[], pagination:{total, page, limit, total_pages, total_stake}}` |
| `POST /account-statement-v2` | `getAccountStatement` | — | `{rows:[{date, credit, debit, closing (2-dp strings or '-'), description, betId, eventId, matchId, marketType, gameType, fancyName…}], total, totalPages, page}` |
| `POST /account-statement-v2/bets` | `getStatementMarketBets` | — | `{header, winner, description, settledAt, totalBets, totalWin, bets}` |
| `GET/POST /stake-button-values` | `getStakeButtons`, `saveStakeButtons` | `useStakeButtons()` | `[{label, value}]` |
| `GET /buttonlist`, `POST /updatebuttonlist` | `getOneClickButtons`, `saveOneClickButtons` | `useStakeButtons()` (`oneClick`) | `number[3]` |

### Real responses (trimmed, :4700, 2026-10-13)

```jsonc
// POST cricket/all-data {id:4}  → body.data.data = {t1:[17], t2:[12]}
{"gmid":640154297,"etid":4,"cid":6499977,"cname":"Test Matches","ename":"Afghanistan v Bangladesh",
 "stime":"10/9/2026 10:30:00 AM","iplay":false,"gtype":"match","mname":"MATCH_ODDS","section":[
 {"sid":889410,"nat":"Afghanistan","gstatus":"ACTIVE","odds":[{"odds":120,"oname":"back1","otype":"back","size":2.52,"tno":0}]}]}
// GET all/sports/tree → body.data.data.data = {t1:[sports], t2:[racing]}
{"name":"Cricket","etid":4,"children":[{"name":"T5 XI","cid":"46201121","children":[{"gmid":"84360973","etid":4,"iscc":1,"name":"TKR XI v BT XI"}]}]}
// GET v1/sports-get_latest_events
[{"id":"640154297","lid":"640154297_4","name":"Afghanistan v Bangladesh","sportId":4}]
// POST cricket/get-match-private-data {gmid:640154297,sid:4} → body.data.data = Market[6]
{"mid":6637445342984,"mname":"MATCH_ODDS","gtype":"match","dtype":4,"status":"OPEN","min":0,"max":2000,"maxb":1,"umaxbof":1,"iplay":false,
 "section":[{"sid":889410,"nat":"Afghanistan","gstatus":"ACTIVE","br":false,"min":0,"max":0,"odds":[{"odds":95,"oname":"back3","otype":"back","size":6.01,"tno":2}]}]}
{"mid":444459252243,"mname":"Normal","gtype":"fancy","section":[{"nat":"55 over run AFG 2","gstatus":"","br":true,"min":100,"max":25000,
 "odds":[{"odds":146,"oname":"back1","otype":"back","size":100},{"odds":144,"oname":"lay1","otype":"lay","size":100}]}]}
// … with no args → 400 {"success":false,"error":"Game ID || sid is required to fetch match private data"}; bogus gmid → state 'gone'
// GET v1/sports-gamedetailPrivate?gmid=640154297&etid=4 → body.data.data[0]
{"gmid":640154297,"cname":"Test Matches","ename":"Afghanistan v Bangladesh","stime":"10/9/2026 10:30:00 AM","iplay":false,"iscc":0,"tv":false,"scard":1,"bm":true}
// GET cricket/score-url → 502 {"success":false,"error":"Scorecard host did not return an animation url"}  (service → null)
// GET virtual/event-media?gmid=84360973&etid=4
{"success":true,"data":{"gmid":"84360973","etid":"4","stream":"https://stream-…/casino-stream?id=cricketv","score":"https://scorecard…/?etid=4&gmid=84360973"}}
// GET betting-config (no `data` envelope)
{"success":true,"buffers":{"global":0,"grid":{},"sports":{}},"max_odds":{},"virtual_limits":{},"leagues":{"4":[{"key":"t10xi","patterns":["t10 xi"]}]}}
// GET bet-limits/640154297 → {"success":true,"limits":{}}
// GET stake-button-values → {"success":true,"data":{"game_buttons":[{"label":"1k","value":1000}, …6]}}
// GET buttonlist → {"success":true,"data":{"buttons":[100,200,300]}}
// GET cricket/sports-bets/user → {"success":true,"data":[],"pagination":{"total":0,"page":1,"limit":20,"total_pages":0,"total_stake":0}}
// POST account-statement-v2 → {"success":true,"data":[{"date":"…","credit":"0.00","debit":"-","closing":"0.00","description":"Opening pts","isOpening":true}],"total":1,…}
// GET bet-result/<uuid> → {"success":true,"state":"unknown"}
// socket balanceUpdate → {"userId":4828458566,"balance":{"inr_balance":0},"timestamp":"…"}
```

**Backend used as is**: `POST matchexposures/match` and `GET cricket/user-open-bets-grouped` read
`user_id` from the request (400 without it), so `services/exchange/positions.js` sends the platform user
id from the access token's `sub` (`currentUserId()`), which is the id mssports keys its users on.
`exposure` is omitted from `balanceUpdate` while the player has none.

## Odds scales and money rules

| Family | gtype | `odds` means | Profit (back/yes) |
|---|---|---|---|
| Decimal | `match` (+ `oddeven`, `fancy1`, `cricketcasino`) | decimal odds | `stake × (odds − 1)` |
| Percent | `match1` (Bookmaker, Bookmaker 2, Tied Match) | percent | `stake × odds / 100`, unfloored |
| Run line | `fancy`, `khado`, `meter` | the run line; the RATE is `size` | `stake × size / 100` |

- `market_type` in the payload is the feed `mname` VERBATIM; `classifyMarket` is UI-only.
- The server runs the bet buffer, final suspension, fancy drift and bookie favour itself from
  `server_buffer` (`buildPlaceRequest`) — the client checks are previews and pre-validation.
- After a placed bet: close slip → toast → `announceBetPlaced()` (250 ms later `bet:placed`, which
  refreshes `useMatchExposure` / `useOpenBets`).
- A refused bet (client pre-validation or the server's message, e.g. "Bet not confirm check
  balance."): close slip → `toast.error(message)` — TENEXCH `handleClose(); bToastError(msg)`, no
  inline slip error. One-click goes through the same submit. Stake-button saves toast TENEXCH's
  `Update Button Value` / `Failed to update button values`; cancels toast `BET_CANCELLED` /
  `CANCEL_FAILED` (or the server's message).
- Ball running (`section.br`) suspends a runner — an improvement over TENEXCH, which never read it.
- Back/lay colours: `bg-back`, `bg-back-hover`, `bg-lay`, `bg-lay-hover`, `bg-back-muted`,
  `bg-lay-muted`, `text-exchange-ink` (both themes; templates inherit).

## Addaplay vs TENEXCH — calculation differences

| Calculation | Addaplay | TENEXCH | Used |
|---|---|---|---|
| Global min stake | 50 (`betValidation.js:17`) | 100 (virtual 200) | **Addaplay** (`MIN_BET_AMOUNT = 50`); virtual 200 kept but unreachable |
| Stake min/max | `runner.min \|\| market.min`, `runner.max \|\| market.max`, max 0 = no ceiling | `max(100, min_stake\|\|section.min\|\|market.min)`; `maxb>0 ? maxb : max`, else 100000 | **Addaplay** — on markets already shaped by TENEXCH `applyMatchOddsLimits` (maxb folded into `max`) |
| Absurd stake (≥1e12 / ≥1e16) | — | `Bet Not Valid..` / `Server Error` | TENEXCH (no Addaplay equivalent) |
| Virtual events | refused (`Betting not allowed on virtual events`) | allowed, floor 200 | **Addaplay** |
| Slip profit | MO `s(o−1)`, BM `s·o/100`, TIED_MATCH `o/100·s`, else `s` | decimal `(o−1)s`, BM `o/100·s`, FANCY/TIED `s·o/100` | **Addaplay** (`slipProfitLoss`) |
| Slip loss on LAY | `loss = profit` (e.g. lay 1000@2.5 → profit 1500, loss 1500) | profit = stake, loss = `(o−1)s` | **Addaplay** — ⚠ shows the liability as the profit too; TENEXCH `calcPL` stays exported |
| Feed "Tied Match" scale | `'tied match'` → MATCH_ODDS (decimal); only `'tied_match'` is percent | percent (`o/100`) | **Addaplay** — ⚠ mssports books "Tied Match" as percent, so a Tied slip preview (e.g. 0.75 → negative profit) will not match the booked exposure |
| P/L row visibility | only mname `MATCH_ODDS` / `BOOKMAKER` | all markets (Normal/BBB/OBO/oddeven/horse show 0) | **Addaplay** (`slipProfitLoss().show`) |
| Runner exposure preview | `calculateExposurePerSelection` (unrounded), hidden on FANCY | `calculateRunnerPL` (2 dp) | **Addaplay** (`slipExposureRows`); same maths otherwise |
| Bookie favour eligibility | every market except gtype `fancy`/`fancy1` | MO / Bookmaker / Bookmaker 2 / Tied only | **Addaplay** (`isFavourEligible`) — server decides anyway |
| Bookie favour, no live price | accept at X | `blocked` (Game Not Active) | **Addaplay** (`evaluateBookieFavour`) |
| Fancy drift | any tier, either side, ±0.01 | closest tier on the bet's side, ±0.01 | **Addaplay** (`isFancyDriftAcceptable`) |
| Manual odds edit | strict: back `E ≥ X` / lay `E ≤ X` refused | `E > X+ε` / `E < X−ε` refused; `|E−X| ≤ ε` = auto | **Addaplay** (`validateUnmatchedOdds`) |
| Rate cap | fixed 4.00, cricket MATCH_ODDS, cname contains "test" exempt | owner `max_odds` from betting-config, Test/Ashes/first-class… regex | **Addaplay** (`violatesRateCap`); TENEXCH `maxOddsBlockScope` kept, server enforces owner caps |
| Anti-spam | one in-flight submit per `marketId\|runner` | 7 attempts / 60s per selection | **Addaplay** (`beginBetSubmit`/`endBetSubmit`); TENEXCH `registerBetAttempt` kept |
| Buffer | client countdown, default 3s | server-side, owner grid | **TENEXCH** for this backend (server buffer); Addaplay `getBufferSeconds` exported for a countdown |
| Odds display | integers bare, else 2 dp (`formatOddAddaplay`) | value as-is | **Addaplay** for cells |
| Settled bet profit | `betProfit` (fancy per 100) | — | Addaplay |
| `/place` payload | legacy body for another server (`game_type` MO/BM/FAN, no `selection_id`) | `prepareBetPayload` + `server_buffer` | **TENEXCH** — it is mssports' contract |
| Cashout, exposure mapping, fancy/tied books, liability, toss, tick ladder, classifier | — | full | TENEXCH (no Addaplay equivalent) |
