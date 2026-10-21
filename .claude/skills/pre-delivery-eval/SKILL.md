---
name: pre-delivery-eval
description: The release gate for Parker567 before anything is handed to the client. It runs every QA skill in order (code checks, logged-out guard, mobile fit, admin crawl, owner policies, money flows with real players, sports parity and bets, casino/originals, rewards: bonus, rollover, VIP, affiliate, race, promotions, medals) and writes a scored report. Nothing ships unless every gate is PASS or has a named, accepted exception. Use when the user says "client ko dene se pehle sab evaluate kr", "delivery se pehle poora check", "complete satisfaction report bana", "release ready hai kya".
---

# Pre-delivery evaluation (release gate)

**Output:** one report doc (Claude Docs) with a scorecard and evidence per gate, plus `logs/qa/release/<date>/`.

**Verdict:**
- **READY** only when every gate is PASS, or SKIPPED with an exception the owner accepted in writing in the chat.
- A FAIL blocks delivery.
- An unverified gate is never called a PASS.

## Before you start

1. **What exactly will be handed over?** Note the `git log origin/main -1` hash and confirm that the server runs it (deploy done: `./restart.sh --pull`, plus the frontend build and restart). Everything below tests that hash.
2. **Budget:** read `qa-betting-budget` and log this run's limits.
   - Real bets and games run from the main session with the owner approving each one; a sub-agent's bet is refused by the safety classifier.
   - Run with auto mode off when bets are due.
3. **Players:** make fresh test players with `live-e2e-run` (5 in a referral chain: A → B, C, D; D → E). Never reuse a player from an earlier run for money checks.
4. **Credentials:** they live only in the git-ignored files.
   - Never print them, never put them in a script.
   - Type the transaction password inline in the admin dialog.

## Gates (run in this order; each names the skill that does it)

| # | Gate | Skill / tool | PASS means |
|---|---|---|---|
| G1 | Code health | `no-regression` | frontend vitest + eslint, admin tsc, owner-panel tests, touched backend module tests: no new failure against the baseline |
| G2 | UI fidelity | `hash-ui-fidelity` | key pages match hash.game at 360 / 390 / 1280 |
| G3 | Signed-out guard | `logged-out-guard` (`guard-audit.mjs`) | ALL OK at phone and desktop; public pages open without a wall |
| G4 | Mobile fit and sheets | `mobile-sheet-scroll` (`audit.mjs`, `fit-audit.mjs`, `table-check.js`) | every sheet and dialog scrolls; no cut text or side-scroll in the wallet tables, bet history, rollover or sports pages |
| G5 | Admin crawl | `live-e2e-run` (`admin-crawl.tpl.js`) + `admin-user-audit` on 2 players | every page and tab renders; no NaN / undefined / Invalid Date / error toast; the numbers reconcile (balance sheet, P&L, dashboard, GGR, win/loss) |
| G6 | Owner policies | live owner panel (Features & plan, Policies) | cashier limits, withdrawal requirements, deposit/withdrawal modes and reward currency are set as the owner wants, and the admin shows them read-only |
| G7 | Money in and out | `live-e2e-run` deposit/KYC/withdraw steps | deposit approve and reject; first-deposit bonus once; min/max refused in the form AND by the API; KYC; withdrawal refused while the rollover is open; after the rollover is met: Approved → Paid; ledger, history and balance sheet agree |
| G8 | Sports parity | `exchange-tenexch-parity` (`feed-expect.mjs`, `dom-read.js`) | odds, sizes, Min/Max, locks, suspension and racecards match TENEXCH on the live board |
| G9 | Sports money | `exchange-bet-verify` (`bet.tpl.js`, `bet-loop.tpl.js`, `bet-state.js`, `tenexch-calc.mjs`) | per bet, page = API = formula for slip / exposure / book / balance; refusals carry the right message; settlement P&L is right; statement and bet history show one honest row per move |
| G10 | Casino and originals | `casino-providers`, `live-e2e-run` game steps | inside the budget: launch, bet, win/loss in history and ledger; a provider refund is reversed everywhere |
| G11 | Rewards | `wager-bonus-test`, `vip-progress`, `live-e2e-run` affiliate/race steps | rollover counts settled wager; VIP progress; affiliate commission = wager × 1% × 25% × game rate; tier and locked rewards unlock and are claimable; race window closes (End & pay) with prizes claimable, Last Champion and History right |
| G12 | Promotions and medals | admin promotions (short windows), medals vs hash.game | each promotion opens and closes on time and pays per its rules; medals' list, conditions, progress and chest rewards match the reference |
| G13 | Cleanup | admin | test players locked, or their balances reclaimed, as the owner chooses; any config changed for the test is restored and re-read |

## Report

- **Scorecard:** gate, verdict, evidence (screenshot or the API line), and the commit of any fix.
- **Findings:** each FAIL with file:line, its fix commit, and the re-test result.
- **Live writes:** every config change with before and after, plus the players created and their final balances.
- **Open items:** what was not verified and why, written as exceptions for the owner to accept or reject.

## Rules learned the hard way

- **Auto mode:** the safety classifier refuses real bets from sub-agents and from auto mode. Plan the money gates for the owner to approve.
- **Login rate limit:** about 7 logins per IP per 15 minutes. Log each player in once and reuse the token (`api-prelude.js`).
- **Pages:** use your own isolated CDP contexts only, and never touch the user's pages. Keep at most one sports page open (429). Close your pages at the end.
- **Settlement lag:** sports wager reaches the rollover a few minutes after settlement (a worker). Wait before you judge it.
- **Session markets:** they suspend every ball. `bet.tpl.js` waits up to 60 s for a row to open; a refusal while suspended is correct behaviour, not a bug.
