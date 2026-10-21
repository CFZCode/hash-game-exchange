# TENEXCH parity — issue tracker

Source doc: "BC games Sports issues" (Google Doc 196pz43bVWQRtBUdT8J8gcpEkMwJydcxbj9j5Cv9Oo2A,
readable without sign-in via `/export?format=txt`; screenshots via `/export?format=zip` →
images/: #1 image4, #2 image8, #3 image11, #4 image6, #5 image13 + image3, #6 image2, #7 image7,
#8 image5, #9 image1, #10 image9, #11 image12, #12 image10). The screenshots for #1–#3 predate
commit 17ef1b7e, so those were re-checked on the current code. Checked 2026-10-21 on the live
feed: cricket 787917680 / 600716118 / 740918504, horse 838641327, greyhound 885202128,
badminton 764090418 / 737345854.

"Pass 1" = 41f24bc0. "Pass 2" = the follow-up commit (git log -- .claude/skills/exchange-tenexch-parity).

## The doc's 12

| # | Issue | Status |
|---|---|---|
| 1 | Bhav / limits print 100,000 instead of 1L | **Fixed** (17ef1b7e `compactAmount`; verified BM "Min:100 Max:1L", rows "Max:2L") |
| 2 | Bookmaker has no bhav under its prices | **Fixed** before this pass (verified 57/1L, 163/25K) |
| 3 | Normal / fancy1 always BALL RUNNING | **Fixed** before this pass (`section.br` no longer read; verified open) |
| 4 | Pre-match MO "Min 0 Max 1" then "exceeds maximum range" | **Fixed pass 1**: "Max: 1" + `Game Not Active2.`; pass 2: server caps at the same 1 |
| 5 | Khado / odd-even rows have no Min / Max | **Fixed pass 1** (+ fancy1 rows); pass 2 text is TENEXCH's "Min:100 Max:1L" |
| 6 | Header Min 0, a stake of 10 says min 50 | **Fixed pass 1**: no "Min: 0" anywhere; ₹100 floor, `Check Minimum Bet Limit.` |
| 7 | Max differs; reference refuses a bet ours took | **Fixed pass 1 (page) + pass 2 (server)**: `feedStakeLimit.mjs` now uses the page's rule (in-play maxb‖max, pre-match umaxbof), so a pre-match MO is refused server-side too. Needs a sports-service deploy to reach api.parker567.com |
| 8 | Racecard odds suspended while the reference trades | **Fixed pass 1**: dtype 12 ignores the market SUSPENDED; per-runner/per-side locks only. The 1 s poll is the only delay left (gateway 429 floor) |
| 9 | Greyhound bet 2h before the off refused | **Fixed pass 2**: TENEXCH's server gates HORSE (sid 10) only (`tenexch-new/server/sportsbet/sportbetscontroller.js` STEP 4.55, "Greyhound (sid=65) is not affected"); ours now does the same in `sportbetscontroller.mjs` and `placeBetRules.isRaceBettingOpen`. Horse keeps the 5-minute window. Deploy needed for the server half |
| 10 | Horse racing odds always suspended | **Fixed pass 1** (same as #8) |
| 11 | Horse racing Max mismatched (2K vs 10K / 25K) | **Fixed pass 1 (page) + pass 2 (server)**: pre-off umaxbof (10K), in-play maxb flag (1) on both |
| 12 | Badminton scoreboard shows a 404 | **Fixed pass 2 (server, needs deploy)**. Root cause, proven: the scorecard host whitelists by Referer. `curl 'https://scorecard.daimond-api.site/?etid=2&gmid=782895154'` → `<title>Domain Not Whitelisted` (also with Referer example.com); with `Referer: https://parker567.com/` (or tenexch.codefactory.games / localhost:5190) → `<title>Live Cricket Scorecard` + `play.animationprovider.com/scoreanimationgraphic/<token>/6837434/5`. Our server sent no Referer, so every `score-url` answered 502 "Scorecard host did not return an animation url" (verified on soccer, tennis gtv 6837434, badminton), and the page fell back to loading the host in the browser, which shows its 404 image (`test.uhdmovies.online/5/404.webp`, the cones) for a match without coverage or a spent token. `ScoreAnimationService.mjs` now sends `SCORECARD_REFERER` (default https://parker567.com/); run locally, `getScoreUrl(22, 737345854)` returned `https://play.animationprovider.com/scoreanimationgraphic/7F29DE33-…/6843550/5` (badminton, gtv 6843550), and a first fetch of such a URL is `<title>Score Animation`. A badminton match with `gtv: 0` (e.g. 764090418) has no coverage on the host at all (it serves the 404 image) — TENEXCH hides the box for gtv 0 and so do we. The doc's gmid 652445510 is finished, so it cannot be re-run |

## Found by comparison (screenshots + TENEXCH source)

| # | Issue | Status |
|---|---|---|
| 13 | Odds printed 2-dp (3.60) vs the feed value (3.6) | **Fixed pass 1** (`formatOdd`) |
| 14 | Lay slip printed the liability as the profit (Addaplay) | **Fixed pass 1**: TENEXCH `calcPL` |
| 15 | Horse card listed "Top N Finish" markets the reference hides | **Fixed pass 1**: sid 10 shows dtype 12 / 15 |
| 16 | Horse slip computed a profit; TENEXCH's horse slip prints 0 | **Fixed pass 1** |
| 17 | Session fancy (Normal / BBB / OBO) slip profit on the rate vs TENEXCH's fixed 0 | **Fixed pass 2** (user's call, overrides c6aab7ae; liability still the real rate amount) |
| 18 | Projected P/L only on MO / BM (Addaplay) | **Fixed pass 2**: TENEXCH `runnerPL` on every MATCH_ODDS (all gtype match: Over/Under, racecards …), BOOKMAKER and CRICKET_CASINO market (the Number grids now show it too) |
| A | Racecards drew a 3-deep ladder (6 cells); TENEXCH one back + one lay | **Fixed pass 2** (`MarketBlocks racing`, verified greyhound 885202128) |
| B | Missing side drew "—"; TENEXCH a dark box with a lock, row still live | **Fixed pass 2** (`OddsCell` `IconLock` on market rows; lobby keeps "—"; a whole suspended row keeps its overlay, as TENEXCH). No one-sided live row was on the board at check time, so the lock was not seen live |
| C | Book under runner "+20.00", "-11.00", "+9,400.00" vs TENEXCH "20", "-11", "9,400" | **Fixed pass 2** (`formatBook`, en-IN grouping, green/red kept). Seen only signed in — covered by vitest, not seen live |
| D | Header / row limit text | **Fixed pass 2**: "Min:100 Max:1L", "Max: 1", "Max: 10K", rows "Min:100 Max:2L"; no "Min: 0" (verified on 787917680, 600716118, 885202128) |
| E | Racecard banner OPEN / SUSPENDED + "N Hours M Minutes Remaining" | **Fixed pass 2** (`Match/RaceStatus.jsx`, TENEXCH RaceTimer wording; verified "OPEN · 34 Minutes 26 Seconds Remaining") |
| F | Badminton live scoreboard | Same as #12 |

## Found by the 21 Oct non-cricket preview run

| # | Issue | Status |
|---|---|---|
| G | No wallet check in the page: an over-balance stake got a limit message (or went to the server); TENEXCH answers "Bet Not Confirm Check Balance." first (usePlaceBetPanel Step 0a, money needed = worst-after − worst-before on runner books, stake elsewhere) | Fixed — `useMatchSlip` submit: racing over-max → wallet (`moneyNeeded`, live INR balance) → race window, all before min/max; cashout exempt |
| H | Horse race-window message came after min/max (stake 50 five+ minutes out said "Check Minimum Bet Limit.") | Fixed — same reorder |
