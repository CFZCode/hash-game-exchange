# TENEXCH parity — issue tracker

Source doc: "BC games Sports issues" (Google Doc 196pz43bVWQRtBUdT8J8gcpEkMwJydcxbj9j5Cv9Oo2A,
readable without sign-in via `/export?format=txt`; screenshots via `/export?format=zip`). Its
screenshots predate commit 17ef1b7e for #1–#3, so those were re-checked on the current code.
Checked 2026-10-21 on live feed: cricket 787917680 (pre-match) / 600716118 (in-play), horse
838641327, badminton 764090418.

| # | Issue | Source | Status |
|---|---|---|---|
| 1 | Bhav / limits print 100,000 instead of 1L | doc | **Fixed before this pass** (17ef1b7e: `compactAmount`). Verified: Bookmaker "Min: 100 · Max: 1L", fancy rows "Max: 2L" |
| 2 | Bookmaker has no bhav (size) under its prices | doc | **Fixed before this pass**. Verified: BM 57 / 1L, 163 / 25K |
| 3 | Normal and fancy1 always BALL RUNNING / suspended while the reference is open | doc | **Fixed before this pass** (`section.br` no longer read; feed sends `br:true` on every live fancy row). Verified open |
| 4 | Pre-match MO shows Min 0 Max 1 and the bet fails with "exceeds maximum range" | doc | **Fixed 41f24bc0**: header "Max: 1" (TENEXCH reads umaxbof pre-match) and the slip answers `Game Not Active2.` like the reference |
| 5 | Khado and odd/even rows have no Min / Max | doc | **Fixed 41f24bc0**: "Min: 100 · Max: 1L" / "Min: 10 · Max: 1L" per row (also fancy1 rows "Max: 25K", found by comparison) |
| 6 | Header shows Min 0, a stake of 10 says min 50 | doc | **Fixed 41f24bc0**: Min hidden unless the market quotes one; floor is TENEXCH's ₹100 (`Check Minimum Bet Limit.`) |
| 7 | Max differs; the reference refuses a bet ours accepts | doc | **Fixed 41f24bc0 (client)**: TENEXCH cap (in-play maxb, pre-match umaxbof) for header and slip. ⚠ server `backend/services/sports/src/lib/helper/feedStakeLimit.mjs` still caps on `max` first (2000) — OPEN, needs the owner's OK to change a live stake cap |
| 8 | Odds delayed / still suspended when the reference is open | doc | **Fixed 41f24bc0 for racecards** (the screenshot is a horse race: market SUSPENDED, runners trading). Cricket uses TENEXCH's market rule already; the 1s poll (gateway 429 limit) is the only remaining delay — OPEN by design |
| 9 | Greyhound bet 2h before the off refused ("Bet will be accepted 5 minutes before…"); the reference took it | doc | **OPEN**: the 5-minute window is TENEXCH-rebuild code (racingUtils `isRaceBettingOpen`) AND our server (`sportbetscontroller.mjs:705`, `RACE_BET_WINDOW_MINUTES`). The live reference accepting it means the window should be dropped or the env raised — owner decision + backend change, not done here |
| 10 | Horse racing odds always suspended | doc | **Fixed 41f24bc0**: dtype 12 racecard ignores the market status, locks per runner only |
| 11 | Horse racing Max mismatched (ours 2K, reference 10K / 25K) | doc | **Fixed 41f24bc0 (client)**: pre-off umaxbof (10K), in-play maxb flag (1) as the reference. Same server caveat as #7 |
| 12 | Badminton scoreboard shows the vendor's 404 | doc | **OPEN (backend / vendor)**: `GET cricket/score-url` answers 502 "Scorecard host did not return an animation url" for badminton, and the `scorecard.daimond-api.site` fallback renders the provider's 404. Client already mounts once per match (sticky gtv). Needs a score source for sid 22 |
| 13 | Odds printed 2-dp (3.60) where the reference prints the feed value (3.6) | comparison | **Fixed 41f24bc0** (`formatOdd`) |
| 14 | Lay slip showed the liability as the profit (Addaplay) | comparison / user | **Fixed 41f24bc0**: TENEXCH `calcPL` — lay profit = stake, liability = (odds−1)×stake; any match1 market prices as a percent |
| 15 | Horse racecard listed "Top N Finish" markets the reference hides | comparison | **Fixed 41f24bc0**: sid 10 shows dtype 12 / 15 only |
| 16 | Horse racecard slip computes a profit; TENEXCH's horse slip prints 0 | comparison | **Fixed 41f24bc0** (greyhound still computes, as TENEXCH) |
| 17 | Session fancy (Normal) slip prints a profit on the rate; TENEXCH prints a fixed 0 | comparison | **OPEN by choice**: c6aab7ae made it pay on the rate deliberately; flip `slipFigures` only if the user asks |
| 18 | Slip P/L preview rows (projected book) only on MO/BM (Addaplay) vs all markets (TENEXCH) | comparison | **OPEN, low**: display-only, kept |
