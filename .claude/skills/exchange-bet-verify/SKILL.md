---
name: exchange-bet-verify
description: Place (or preview) sports-exchange bets on Parker567 with a test player and verify every number against TENEXCH's formulas — slip profit / liability, projected and booked per-runner book ("-11 / 20 / 4,500"), exposure, wallet change, Open Bets / My Bets / Statement rows and settlement P&L — for Match Odds, Bookmaker, Tied Match, Normal / Ball By Ball / Over By Over, fancy1, khado, meter, odd/even, line, cricket-casino Number grids and racecards. Use when the user says "sports bet laga ke sab verify kr", "exposure / book / liability tenexch jaisa check kr", "ek user ke sath bet lagake sab check kr", "sare markets logic wise tenexch jaise bound hone chahiye", or after any change to the exchange calc code or the sports server's exposure walk.
---

# Exchange bets ↔ TENEXCH, verified with numbers

Pairs with `exchange-tenexch-parity` (display parity). This one checks the MONEY: what the slip
promises, what the server books, and what the page, the API and TENEXCH's formulas each say.

Ground truth: TENEXCH server `tenexch-new/server/sportsbet/sportbetscontroller.js` STEP 5
(`calculateRunnerExposure`, `normalizeOdds`, the session ladder `worstCase`, oddeven/fancy1 two
buckets) and frontend `utils/betHelpers.js calculateSingleBetPLValue` + `placeBetRules.showsZeroProfit`.
Ours is a port: `backend/services/sports/src/modules/bets/controllers/sportbetscontroller.mjs`,
`frontend/src/pages/Exchange/Match/useMatchSlip.js` (`slipFigures`, `projectedBook`).

## Budget first

Read `qa-betting-budget` and log the run there before any bet. Real bets need the user's explicit
go-ahead in THIS session (the auto-mode classifier refuses a Place Bet otherwise — then do the
read-only half below and hand back). Slip minimum ₹100, INR only, keep each player's exposure small
(low-odds lays), never press Place on a test whose refusal you are not sure is client-side.

## Scripts (this folder)

| File | What |
|---|---|
| `tenexch-calc.mjs` | TENEXCH formulas, written independently of our code: `slip`, `runnerBook` (BM floored like the server), `sessionWorst`, `twoBucket`, `evaluate(bets)` → books + total exposure, `formatBook`. `node tenexch-calc.mjs --test`; `node tenexch-calc.mjs '<bets json>'` prints what the server should book |
| `slip-probe.tpl.js` | READ-ONLY: sed `__CASES__` (`[[card title, runner prefix, back\|lay], …]`) and `__STAKE__`; opens each slip on the best price, types the stake, reads Profit / Liability / range / projected book, presses Cancel. Never Place |
| `compare.mjs` | `node compare.mjs <probe output file>` → PASS/FAIL per case against `tenexch-calc.mjs` (+ a NOTE where TENEXCH's own preview and server book differ) |
| `bet-state.js` | After a bet: header balance, every card's text (book under each runner), Open Bets panel, and the API side — wallet INR, `matchexposures/match` rows (the booked per-runner book), `user-open-bets-grouped` |
| `toast-watch.js` + `place.js` | Records toasts; `place.js` presses Place Bet and returns the toast (refusal text or success). Real money — budget rules apply |

Run them with chrome-devtools `evaluate_script` + `sourcePath`; the MCP only reads files inside the
repo, so put sed'd copies in `logs/qa/exchange-bets/tmp/` (git-ignored).

## Flow

1. Login with the API (`POST /api/v1/user/auth/login {identifier,password}` — password from the user,
   never written to a file), open ONE new page in an isolatedContext, set `localStorage['api-session']`
   to `{accessToken, refreshToken, expiresAt, tokenType}`, load `/sports/match/<sid>/<gmid>`.
   If the header coin is not INR the page asks "Sports betting is in INR" → Switch to INR.
2. Pick markets from the live feed (`exchange-tenexch-parity/feed-expect.mjs <sid> <gmid>`): an in-play
   cricket match has MO, BM, Tied, Normal / BBB / OBO, fancy1, khado, meter, oddeven, line, Number grids.
3. Read-only pass: `slip-probe.tpl.js` on every open market, `compare.mjs`.
4. Refusals (client-side, no money): stake 50 → `Check Minimum Bet Limit.`; stake above max →
   `Check Maximum Bet Limit1.`; pre-match cricket MO shows `Max: 1` and range `100–1` → `Game Not Active2.`
5. Real bets (only with go-ahead): `bet-state.js` before, open slip, `fill` the Stake textbox (uid from
   `take_snapshot`), `place.js`, `bet-state.js` after. Expected: `tenexch-calc.mjs evaluate` of every
   open bet on the match → `api.exposureRows` (team_name → exposure_amount) must equal its books, the
   page's book line under each runner must equal `formatBook` of the same, and the wallet must drop by
   the exposure increase (server: balanceChange = newMax − oldMax of the negative book).
6. Settlement: fancy / ball markets settle within minutes — `/sports/my-bets` (Settled), `/sports/statement`,
   `/wallet/bet-history` (Sports) and the wallet: P&L = the runner's book at the result.
7. Close your page. Results → `logs/qa/exchange-bets/<date>.md`.

## Known TENEXCH quirks (match them, do not "fix")

- fancy1 / khado / meter slip = TENEXCH `FANCY`: profit stake × odds / 100 and liability = stake on both
  sides (fancy1 100 @ 1.4 prints 1.40; its server books 40 on a win).
- Bookmaker preview is unfloored o/100 (lay 100 @ 32.5 → -32.5); the server books `normalizeOdds`
  (floored 1.32 → -32). Half-point BM rates differ by ₹0.50 on both TENEXCH and ours.
- Normal / BBB / OBO and oddeven print Profit 0; horse racecard prints 0, greyhound computes.
- oddeven LAY books -stake (two buckets), not stake × (odds − 1).
