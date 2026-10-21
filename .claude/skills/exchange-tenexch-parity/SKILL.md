---
name: exchange-tenexch-parity
description: Make the Parker567 sports exchange (frontend /sports, React kit in src/components/exchange + src/utils/exchange) show the SAME values and behave the SAME as the TENEXCH reference (local rebuild /Users/apple/Developer/cfz/tenexch-new/frontend, live tenexch.codefactory.games) — odds and bhav (size) format, back/lay ladders, Min/Max limits, suspended / ball-running / racecard states, stake validation toasts, slip profit/liability, market visibility. Use when the user says "sports exchange ko tenexch jaisa same 2 same kar", "odds / bhav value reference jaisi dikhe", "min max galat hai", "odds suspended dikh rahe hai reference me open hai", "horse racing max range match nahi", "BC games sports issues doc", or hands over a TENEXCH-vs-ours bug sheet.
---

# Sports exchange ↔ TENEXCH parity

Ours: `frontend/` (Next on :5190, live API `https://api.parker567.com`, mssports at
`/api/v1/sports/user/...`). Reference: `/Users/apple/Developer/cfz/tenexch-new/frontend`
(Vite on :3091, proxies `apitenexch.codefactory.games`; check `lsof -iTCP:3091 -sTCP:LISTEN`
before starting it — `npm run dev` there) and the live reference `tenexch.codefactory.games`
(needs its own login). The TENEXCH rebuild's source is the spec: its comments quote the
reference's minified render functions. Both feeds are the same provider, so the same
`gmid` can be compared side by side.

Read first: `frontend/docs/exchange.md` (the Addaplay-vs-TENEXCH table — every row says
which side we follow) and `issues.md` in this folder (the tracked bug sheet).

## Run and test

```bash
cd frontend && npx vitest run                         # calc + shape tests (src/utils/exchange, pages/Exchange)
npx eslint src/components/exchange src/pages/Exchange src/utils/exchange
cd ../backend/services/sports && node --test --test-force-exit src/modules/bets/__tests__/feedStakeLimit.test.js
# full sports suite: DB_NAME=parker567_test DB_USER=postgres DB_PASSWORD=postgres DB_HOST=127.0.0.1 node --test --test-force-exit --test-concurrency=1 src/modules/*/__tests__/*.test.js
#   (pre-existing: tenexchApi "every route mounted", toInr x3, profileStats — test DB lacks mssports.SportsBet — fail before any change)
curl -s -H 'Referer: https://parker567.com/' 'https://scorecard.daimond-api.site/?etid=22&gmid=<gmid>'   # host page; without the Referer: "Domain Not Whitelisted"
node ../.claude/skills/exchange-tenexch-parity/feed-expect.mjs 4 <gmid>   # what TENEXCH prints, from the live feed
```

Find gmids: `curl -s -X POST https://api.parker567.com/api/v1/sports/user/cricket/all-data
-H 'content-type: application/json' -d '{"id":4}'` (4 cricket, 1 soccer, 2 tennis, 22 badminton,
10 horse, 65 greyhound; racing lists are nested `t1[].children[].children[]`).

Browser (CDP Chrome on 9333, chrome-devtools MCP): open ONE new page in an isolatedContext
(e.g. `exch-parity`), never touch other tabs, load `/sports/match/<sid>/<gmid>` and run
`dom-read.js` through `evaluate_script` (`sourcePath`). Compare its lines with
`feed-expect.mjs`. Logged out is enough for every display check. Never place a bet here
(qa-betting-budget skill); stake-validation is covered by vitest. Close the page after. Many
sports tabs at once → gateway 429.

## Parity checklist (ours → TENEXCH source)

| What | TENEXCH rule | Ours (file) |
|---|---|---|
| Odds cell text | feed value as-is, `formatOdd` (3.6 not 3.60) | `pages/Exchange/Match/MarketBlocks.jsx` `price` → `utils/exchange/oddsHelpers.js formatOdd` |
| Bhav / size | `formatSize`: K from 1000, L from 1,00,000, `toFixed(2)` (2.10K) | `oddsHelpers.formatSize`, passed to every block |
| Header limits | `compactAmount` (100 · 25K · 1L); "Min:100 Max:1L" with a min, "Max: 10K" alone, never "Min: 0" | `components/exchange/MarketHeader.jsx` |
| Match-type cap | in-play `maxb>0 ? maxb : max`, pre-match `umaxbof` → pre-match cricket MO "Max: 1", race pre-off 10K, in-play race 1 | `oddsHelpers.feedMaxStake` / `applyMatchOddsLimits`; the SERVER mirrors it in `backend/services/sports/src/lib/helper/feedStakeLimit.mjs` (keep both in step) |
| Row limits | fancy, fancy1, meter, khado, oddeven rows print `Min:100 Max:2L` | `FancyBlock.jsx`, `OddEvenBlock.jsx`, `MarketBlocks.jsx` (khado `SingleMarket`, fancy1 subline), text from `components/exchange/utils.js limitsText` |
| Stake range | min `max(100, feedMin)` (meter: feed min), cashout 0; max `bv.max`, 0 → 100000 | `utils/exchange/betFlow.js stakeLimits` (slip line + `useMatchSlip.slipLimitsInr`) |
| Toasts | pre-match MO cap ≤1 → `Game Not Active2.`; `Check Minimum Bet Limit.`; `Check Maximum Bet Limit1.`; racing at cap 1 → `Check Maximum Bet Limit.` | `betFlow.prevalidateBet`, strings in `betToastMessages.js` |
| Slip profit | `calcPL` by `classifyMarket` (gtype first: match1 = percent); LAY profit = stake, liability `(o−1)s`; line = stake; Normal/BBB/OBO/oddeven/horse = 0 | `pages/Exchange/Match/useMatchSlip.js slipFigures` |
| Projected book | `calculateRunnerPL` on every MATCH_ODDS / BOOKMAKER / CRICKET_CASINO market | `useMatchSlip.projectedBook` |
| Book text | `formatBookValue`: -11 · 20 · 4,500 (en-IN, no +, no .00), green / red | `components/exchange/utils.js formatBook`, `RunnerRow.jsx` |
| Empty side | dark box with a lock; the row stays live | `OddsCell.jsx` (`IconLock`) |
| Ball running | status text only; `section.br` ignored (true on every live fancy row) | `oddsHelpers.isBallRunning` / `isSectionSuspended` |
| Market suspended | `isMarketSuspended` (match1 ignores it) | `shape.rowStatus` |
| Racecard | dtype 12 ignores the market's SUSPENDED; sid 10 shows dtype 12 + 15 only; one back + one lay per runner; OPEN/SUSPENDED + "N Hours M Minutes Remaining" strip | `shape.rowStatus`, `Match/index.jsx visible`, `MarketBlocks racing`, `Match/RaceStatus.jsx` |
| Race bet window | HORSE (sid 10) only, 5 min before the off; greyhound until the off (TENEXCH server STEP 4.55) | `placeBetRules.isRaceBettingOpen` + `sportbetscontroller.mjs` |
| Score iframe | non-cricket only when the feed `gtv > 0`, sticky per match, `score-url` then `SCORECARD_BASE`. The host whitelists by **Referer** — the server sends `SCORECARD_REFERER` | `Match/index.jsx`, `backend/.../odds-events/services/ScoreAnimationService.mjs` |

## Changing a rule

1. Find the TENEXCH function (grep its `src/utils`, `components/betting/placeBet`, `pages/GameDetails.jsx`, `pages/RacingDetails.jsx`).
2. Change the ONE shared function on our side (above), never a call site copy; update `docs/exchange.md`'s table row.
3. Add a vitest case with the live numbers from `feed-expect.mjs`.
4. vitest + eslint, then `dom-read.js` on a live match. Record the row in `issues.md` with the commit.
5. A server-side rule (stake cap, race window, score host) lives in `backend/services/sports` — say so in issues.md instead of faking it client-side.
