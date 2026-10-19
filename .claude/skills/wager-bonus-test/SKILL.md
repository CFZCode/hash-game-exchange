---
name: wager-bonus-test
description: Test the hash.game formulas on Parker567 — VIP ladder (Beginner, Bronze I … Eternal X), referral locked rewards ($1,000 per friend in 10 steps), affiliate commission (wager × 1% × 25% × game rate), locked deposit bonus (4 a month, gradual unlock, claim), wager contribution, rakeback + daily/weekly/monthly, 3x rollover on every deposit rail, currency conversion and INR format. Local suite first, then the live URL through CDP inside the betting budget. Use when the user says "wager / bonus / lock / unlock test kar", "hash.game jaisa chal raha hai check kar", "referral reward test", "commission sahi hai?", "live pe formulas check kar".
---

# Wager, bonus, referral and VIP — hash.game formula tests

The rules and their sources are in `docs/BONUS-WAGER-FIX-PLAN.md` and the Docs plan
(https://claude.ai/code/artifact/c80c92fc-c29f-419e-82f4-5f52b3ca703c). This skill checks that the
code does what that plan says. Report PASS / FAIL per row, with the figure seen and the figure
expected.

## 0. Before anything

- **Migrations:** 132–138 must be applied where you test (`npm run migrate:status --workspace @ibitplay/db`).
  - Live: `./restart.sh --pull` runs them before the restart.
- **Money rules:** `.claude/skills/qa-betting-budget` is the hard limit on live.
  - Provider games: Aviator only, ₹10 a round, ₹20 a session.
  - No live sports bets.
  - Every number below that needs more wager than that is proven on the local suite instead. Say so in the report.
- **Live settings:** read the current value first, change it with the transaction password, and put it back in the same run (the `live-qa` skill rules).

## 1. Local suite (deterministic — run first, always)

```bash
cd backend
export TEST_DB_NAME=parker567_test   # migrated to 138
(cd services/user && node --test --test-concurrency=1 \
  src/modules/wager/__tests__/*.test.js \
  src/modules/affiliate/__tests__/*.test.js \
  src/modules/player-bonuses/__tests__/*.test.js \
  src/modules/bonus/__tests__/*.test.js \
  src/modules/vip/__tests__/*.test.js \
  src/modules/rakeback/__tests__/*.test.js \
  src/modules/withdraw-requirements/__tests__/*.test.js)
node --test packages/common/__tests__/vipLadders.test.js
(cd services/admin && node --test --test-concurrency=1 src/modules/vip-branding/__tests__/*.test.js src/modules/site-config/__tests__/*.test.js src/modules/turnover-report/__tests__/*.test.js)
(cd services/casino && node --test --test-concurrency=1 src/modules/games/__tests__/recordActivity.test.js src/modules/original-games/__tests__/*.test.js)
(cd services/sports && node --test src/modules/wager-report/__tests__/sportsWagerSync.test.js)
```

Known failures that were there before this work (not regressions):

- user: "per currency: an INR deposit, INR sports and staff money never raise the USDT cap"
- admin site-config: 2 failures
- sports: "sports profile stats"
- casino: "in-house engine: a new stake is refused when originals is off"

What the suite pins:

| Area | Test | Expected |
|---|---|---|
| VIP ladder | `vipLadders.test.js`, `bonus.test.js` | 999 → Beginner, 1,000 → Bronze I, 15,000 → Bronze IV, 120,000 → Silver III, 10 bn → Eternal X; admin threshold moves a band, a non-climbing set is ignored |
| Referral | `affiliate.test.js` | 6,000 → steps 1,000 + 3,000 once each; 1,500 → 20,000 pays 2.50 + 5.00; 30,000 pays 0.50 + 2.50 + 5 + 12, locked 980 of 1,000 |
| Commission | `affiliate.test.js`, `rewardsUsd.test.js`, `wagerPipeline.test.js` | $100: slots 0.15, originals 0.07, sports 0.25; ₹1,000 slots → $0.018 |
| Category | `describeStake.test.js`, `recordActivity.test.js`, `sportsWagerSync.test.js` | inhouse → originals 1%, sports → sports + odds, gis → slots 4% |
| Locked bonus | `playerBonuses.test.js` (hash.game block) | deposit 10 → 18 locked (180%); 2nd needs 10 → 24; 5th → MONTHLY_LIMIT_REACHED; $1,000 slots unlocks 0.40, claim once; sports odds 1.4 → 0, odds 2 → +0.10; never blocks a withdrawal; full unlock pays the rest |
| Rakeback / periodic | `hashRewardFormula.test.js` | UTC windows; daily 1000 × 4% × 4% = 1.60; weekly + 1% of net loss 400; instant 1000 × 4% × 10% = 4.00 |
| Rollover | `wager.test.js` | a pay-in (UPI) deposit counts; 2.5x stays 2.5x |

## 2. Live — admin settings (site admin, `localhost:3080` → live API)

Open ONE background page in the signed-in admin context and use `evaluate_script` against `/api/gw/api/v1/…`.

| Check | Call | Expected |
|---|---|---|
| VIP ladder | `GET user/vip/levels` | 33 levels, `Bronze I` at 1000, `Eternal X` at 10000000000, unranked `Beginner` |
| VIP edit | `PUT admin/vip-branding/levels/1 {name, minXp}` | Refused 422 `VIP_BRANDING_BAD_THRESHOLD` when `minXp` ≥ L2's. A valid edit shows on `user/vip/levels`. **Put it back.** |
| Referral table | `GET admin/site-config/referral-unlocks` | 10 rows: Bronze I 1000/0.50 … Platinum II 8500000/500 |
| Commission | `GET admin/site-config/affiliate` | `commissionRate` 25, `gameRates` {originals 28, slots 60, live 60, sports 100} |
| Deposit program | `GET admin/site-config/welcome-bonuses` | `depositProgram` mode / unlockMode / unlockRate / 4-row schedule (180/240/300/360) |
| Contribution | `GET admin/site-config/wager-contribution` | category rows (originals 80, slots 100, live 10, sports 50), providers, originals by game |
| Reward formula | `GET admin/site-config/reward-formula` | mode `hash`: 10 / 4 / 4+1 / 3.5+1.5 |

The UI shows the same values:

- Admin → Bonus → tabs **Welcome bonuses / Wager contribution / Rakeback formula**
- Affiliate → **Rates**
- VIP Club → **Ladder** (pencil = name + USD threshold)

## 3. Live — player flows (CDP, player site `localhost:5190`)

Use a NEW isolated context per player (see `live-qa`).

1. **Referral display.** On `/referral/rules`, the unlock table shows Bronze I … Platinum II. INR is in lakh grouping (₹83,333.33 at a 0.012 rate; ₹94,889 needs the INR rate at 0.01054).
2. **Referral payout.**
   - P1 refers P2 (`/referal/<code>`).
   - After P2's wager reaches $1,000 (local only; on live it is out of budget), `GET /user/affiliate/rewards/unclaimed` shows a tier row of 0.50 USDT.
   - `GET /user/affiliate` → `lockedRewards.lockedUsd` = `1000 − unlocked`.
   - On live, check only `lockedRewards.perFriendUsd = 1000` and `lockedUsd = 1000` for a fresh friend.
3. **Commission on a live bet.**
   - P2 plays Aviator ₹10.
   - Then `GET /user/affiliate/rewards` (as P1) has a commission of ₹10 × rate(USD) × 1% × 25% × 60%, e.g. $0.00018 at 0.012.
   - Not 5% (₹0.50).
4. **Monthly deposit bonus.** Admin turns the program on: `PUT welcome-bonuses {firstDepositBonus:{enabled:true}, depositProgram:{mode:'monthly', unlockMode:'gradual'}}`. **Note the old values first.**
   - P3 deposits ₹1,000 (manual, admin approves with the transaction password).
     - `GET /user/bonus-balance` → one active row: `unlockMode: 'gradual'`, amount = 180% of the deposit in USDT, `locked` = amount, `claimable` 0.
     - The deposit dialog / wallet shows Locked Bonus.
   - P3 plays Aviator ₹10 → `claimable` = ₹10 × rate × contribution(slots 100%) × house edge(4%) × 1%. It is tiny; just check that it is > 0.
   - `POST /user/bonus-balance/claim` → 200 and cash up by `claimable`. A second claim → 409 `PLAYER_BONUS_NOTHING_TO_CLAIM`.
   - Withdrawal is NOT blocked by this bonus: no `BONUS_FORFEIT_REQUIRED`.
   - **Restore the program to its old values.**
5. **Rakeback.** After P3's bet, `GET /user/vip` / the rakeback read shows an accrual = stake USD × house edge × 10%. Beginner accrues 0, because rakeback starts at Bronze I.
6. **Rollover.**
   - `GET /user/wager/progress` (or Wallet → Rollover): `totalDeposited` includes a USDT / UPI deposit, not only fiat.
   - `target` = deposits × multiplier.
   - An admin TargetX 2.5 in the Turnover Report shows 2.5 here.
7. **Currency.**
   - Switch the selected currency INR ↔ USDT: the referral table, bonus balance and wallet all redraw in the new unit.
   - INR uses ₹x,xx,xxx.xx.

## 4. Report

- **Table:** area · check · expected · seen · PASS/FAIL · evidence (screenshot in `logs/qa/wager-bonus/`, or the API body).
- **Live writes:** every setting changed and restored, every test player (username, id, balance), every deposit approved.
- **Out of budget:** whatever was proven only locally, with the local test that proves it.

## Scripts that go with this

- `backend/scripts/reset-player-wager.js` — every player's wager to 0 and level to Beginner.
  - Dry run by default; `--apply` makes a backup first; `--restore=<stamp>` undoes it.
  - Resetting also resets the 3x rollover progress.
- `backend/scripts/recalc-unclaimed-commission.js` — re-prices UNCLAIMED old flat-% commission to the hash.game formula.
  - Dry run by default; `--apply` makes a backup first.
