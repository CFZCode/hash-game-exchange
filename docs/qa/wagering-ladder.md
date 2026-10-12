# Wagering ladder: QA run, level 0 to Diamond 5

Run on 2026-10-12 against the local stack (gateway :4700, DB `cfz_hash_game_exchange`), API and DB only.
Script: `backend/scripts/qa/wagering-ladder.mjs` (re-runnable; prints the table below and every check).

```bash
cd backend
QA_CREDS_FILE=<path to a mode-600 json> node scripts/qa/wagering-ladder.mjs            # qa_wager_max, continue to the top
node scripts/qa/wagering-ladder.mjs --player qa_other --until 12 --no-deposit-bonus    # a partial ladder on another player
```

## Setup

| Item | Value |
|---|---|
| Test player | `qa_wager_max` (id 2737540332), direct (no `parent_staff_id`), registered through `POST /user/auth/register`. It is **left in place at Diamond 5** as top-level test data. |
| Referrer | `qa_wager_max_ref` (id 3575112797), direct; `qa_wager_max` signed up with its referral code, so commission could be checked without touching a demo account. |
| Second player | `qa_wager_check` (+ `qa_wager_check_ref`), a fresh run to Gold 1 after the fix below. |
| Ladder | `vip` variant `ring_panel`, so the platform ladder applies (`packages/common/src/vipLevels.js`): 41 levels, Wood 500 to Diamond 5 37,000,000 USD. Rewards from `vipRewards.js`. |
| Reward currency | USDT (owner policy). Every VIP, periodic, rakeback and bonus credit landed in USDT. |
| KYC | Player submitted KYC (`POST /user/kyc/submit`), staff set it Verified (`PUT /admin/user/kyc/review`). |
| Bankroll | Staff wallet adjust (`POST /admin/user/wallet/adjust`, demo_admin), topped up only when a stake did not fit: 1,078,935.94 USDT over 10 credits. |

### How the fake wager got in

No casino provider is configured on this stack. `SEAMLESS_SECRET_KEY` and `SEAMLESS_OPERATOR_CODE` are
empty, so seamless answers "Product under maintenance", and there are no GIS or js-games keys. The owner
plan also refuses the in-house games (`NOT_ENTITLED`), and the plan was not changed. So each stake took
the settlement steps a casino callback performs, called as casino-service:

1. `POST /internal/user/wallet/debit`, reason `BET_STAKE`.
2. `POST /internal/user/wager/record` with `source: qa-ladder`.
3. For a win, `POST /internal/user/wallet/credit`, reason `BET_PAYOUT`.

Step 2 is the same `wagerActivity.record` that every provider path ends in, so everything downstream ran
for real: userwager in USD, bonus wagering, `vip.onWager` (rakeback rate plus level-up and rank-up
credits), affiliate commission and rakeback accrual.

If the seamless keys are set, the script switches by itself to signed seamless callbacks through the
gateway.

**Outcomes.** Stakes followed a fixed pattern: loss, ×2, loss, ×1.96 (RTP 99%). Across all runs that came
to 280 stakes (139 wins, 141 losses), 38,500,010 USD staked and 37,869,768.11 paid back, so the player's
P&L is −630,241.89.

### Test-only shortcuts

- **Periodic awards.** These are due once per 24 h, 7 d or 30 d. To see them at every card in one run, the
  script moves the player's own `bonus_history.created_at` back 31 days, then calls
  `POST /internal/user/vip/award-periodic`.
- **First-deposit bonus.** It is off on this site. It was switched on through
  `PUT /admin/site-config/welcome-bonuses` (10× wagering) only for the one deposit approval, and the
  saved settings were put back straight after. The current state was checked: `enabled=false`, same
  tiers and expiry.

## Per-level table (`qa_wager_max`)

- Level-up and rank-up are paid in USDT, automatically, once each.
- Periodic awards (d/w/m) are awarded when the player enters a card that pays them. The claimed column
  is what was claimed through `POST /user/bonus/claim/:type`.
- RB = rakeback. RB on $10 is the accrual on a probe stake placed right after the crossing.
- Every row: `GET /user/vip` level = expected, `nextLevel` = level+1, and
  `GET /admin/user/wallet/:id/reconcile` reported balanced.

| Lv | Name | From (USD) | Level-up | Rank-up | RB rate | RB on $10 | Periodic awarded | Claimed | RB claimed |
|---|---|---:|---:|---:|---:|---:|---|---|---:|
| 1 | Wood | 500 | 0.5 | — | 0.10% | 0.01 | — (Wood pays none) | | |
| 2 | Bronze 1 | 1,000 | 1 | 5 | 0.20% | 0.02 | d1 w5 | d1 | 1.52 |
| 3 | Bronze 2 | 2,000 | 1 | — | 0.20% | 0.02 | | | |
| 4 | Bronze 3 | 3,000 | 1 | — | 0.20% | 0.02 | | | |
| 5 | Bronze 4 | 4,000 | 1 | — | 0.20% | 0.02 | | | |
| 6 | Bronze 5 | 5,000 | 1 | — | 0.20% | 0.02 | | | |
| 7 | Silver 1 | 10,000 | 2 | 25 | 0.25% | 0.025 | d2 w10 m25 | d2 | 19.25 |
| 8 | Silver 2 | 20,000 | 2 | — | 0.25% | 0.025 | | | |
| 9 | Silver 3 | 30,000 | 2 | — | 0.25% | 0.025 | | | |
| 10 | Silver 4 | 40,000 | 2 | — | 0.25% | 0.025 | | | |
| 11 | Silver 5 | 50,000 | 2 | — | 0.25% | 0.025 | | | |
| 12 | Gold 1 | 100,000 | 5 | 75 | 0.30% | 0.03 | d5 w25 m75 | d5 w25 m75 | 237.50 |
| 13 | Gold 2 | 150,000 | 5 | — | 0.30% | 0.03 | | | |
| 14 | Gold 3 | 200,000 | 5 | — | 0.30% | 0.03 | | | |
| 15 | Gold 4 | 250,000 | 5 | — | 0.30% | 0.03 | | | |
| 16 | Gold 5 | 300,000 | 5 | — | 0.30% | 0.03 | | | |
| 17 | Platinum 1 | 450,000 | 10 | 150 | 0.35% | 0.035 | d10 w50 m150 | d10 w50 m150 | 1,087.50 |
| 18 | Platinum 2 | 600,000 | 10 | — | 0.35% | 0.035 | | | |
| 19 | Platinum 3 | 750,000 | 10 | — | 0.35% | 0.035 | | | |
| 20 | Platinum 4 | 900,000 | 10 | — | 0.35% | 0.035 | | | |
| 21 | Platinum 5 | 1,050,000 | 10 | — | 0.35% | 0.035 | | | |
| 22 | Jade 1 | 1,200,000 | 15 | 250 | 0.40% | 0.04 | d15 w75 m250 | d15 w75 m250 | 2,662.50 |
| 23 | Jade 2 | 1,350,000 | 15 | — | 0.40% | 0.04 | | | |
| 24 | Jade 3 | 1,500,000 | 15 | — | 0.40% | 0.04 | | | |
| 25 | Jade 4 | 1,650,000 | 15 | — | 0.40% | 0.04 | | | |
| 26 | Jade 5 | 1,800,000 | 15 | — | 0.40% | 0.04 | | | |
| 27 | Sapphire 1 | 2,300,000 | 25 | 400 | 0.45% | 0.045 | d25 w100 m400 | d25 w100 m400 | 4,525.00 |
| 28 | Sapphire 2 | 2,800,000 | 25 | — | 0.45% | 0.045 | | | |
| 29 | Sapphire 3 | 3,300,000 | 25 | — | 0.45% | 0.045 | | | |
| 30 | Sapphire 4 | 3,800,000 | 25 | — | 0.45% | 0.045 | | | |
| 31 | Sapphire 5 | 4,300,000 | 25 | — | 0.45% | 0.045 | | | |
| 32 | Ruby 1 | 5,800,000 | 40 | 600 | 0.50% | 0.05 | d40 w150 m600 | d40 w150 m600 | 15,875.00 |
| 33 | Ruby 2 | 7,300,000 | 40 | — | 0.50% | 0.05 | | | |
| 34 | Ruby 3 | 8,800,000 | 40 | — | 0.50% | 0.05 | | | |
| 35 | Ruby 4 | 10,300,000 | 40 | — | 0.50% | 0.05 | | | |
| 36 | Ruby 5 | 11,800,000 | 40 | — | 0.50% | 0.05 | | | |
| 37 | Diamond 1 | 17,000,000 | 60 | 1,000 | 0.60% | 0.06 | d60 w250 m1,000 | d60 w250 m1,000 | 56,247.63 |
| 38 | Diamond 2 | 22,000,000 | 60 | — | 0.60% | 0.06 | | | |
| 39 | Diamond 3 | 27,000,000 | 60 | — | 0.60% | 0.06 | | | |
| 40 | Diamond 4 | 32,000,000 | 60 | — | 0.60% | 0.06 | | | |
| 41 | Diamond 5 | 37,000,000 | 60 | — | 0.60% | 0.06 | | | |

The weekly and monthly awards left unclaimed at Bronze and Silver were claimed later at Gold. A second
`claim/:type` pays the next older unclaimed award of that type, never the same one twice.

### Bonus wagering and rollover

| Step | Result |
|---|---|
| Deposit 200 USDT (fiat, staff-approved) | First-deposit bonus 100 USDT, **locked**, wagering requirement 1,000 (10×) |
| Withdraw while locked | `409 BONUS_FORFEIT_REQUIRED` (pass) |
| Rollover task (`/user/wager/tasks`) | Created from the deposit: 200 × 3 = 600. `complete` once wagered |
| Bonus progress | Moved with each stake. Released to cash (`player-bonus:3`, BONUS 100) during the Bronze 3 ramp |
| Withdraw after release | 201 accepted. The 5 USDT test withdrawal was then rejected by staff and refunded (pass) |

## Totals that reconcile

| Check | Result |
|---|---|
| `userwager.wager` = Σ `wager_activity.usd_amount` | 38,500,010 = 38,500,010 |
| VIP credits | 49 ledger rows (41 level-up + 8 rank-up), no key twice, Σ 3,295.50 = table total |
| Periodic awards | 23 claimed `bonus_history` rows ↔ 23 `bonus:<id>` ledger rows, Σ 3,323 both sides |
| Rakeback | 280 accruals (one per stake), Σ 209,655.92. Claimed 80,655.92 in 8 claims. Open 128,999.9988, which equals accrued − claimed |
| Affiliate commission | 280 `rewards` rows for the referrer, one per stake, 5% of the USD wager delta = 1,925,000.50 USDT (unclaimed) |
| Ledger → balance | ADMIN_CREDIT 1,078,935.94 + payouts 37,869,768.11 − stakes 38,500,010 + BONUS 6,718.50 + deposit 200 + rakeback claims 80,655.92 = **536,268.47**, the USDT balance. Reconcile balanced at every level |
| `GET /user/profile/turnover` | totalWager 38,500,010 = userwager |
| Admin `GET /admin/reports/players/:id` | wager 38,500,010, VIP 41 Diamond 5 |
| Admin `GET /admin/reports/players/:id/stats` | wagered 38,500,010, won 37,869,768.11, GGR 630,241.89 (from the ledger) |

## At the top (Diamond 5)

| Check | Result |
|---|---|
| Further 500,000 of wager counted, three times | pass |
| `GET /user/vip` | level 41, `progressPct` 100.00, `nextLevel` / `wagerToNextLevel` null |
| No VIP credit for wager above the top | 49 → 49 rows |
| Provider retry of the same stake (same idempotency key) | no second debit, no second count |
| `/internal/user/wager/record` replay of the same `(source, ref)` | `duplicate: true`, total unchanged |
| `award-periodic` called again inside the period | `awarded: 0` |
| Rakeback rate | stays 0.006 |

Score: the final ladder run passed 352 of 355 checks. The 3 failures came from a faulty check in the
script, which counted a legitimate claim of an older award as a double claim. The check was fixed and
re-checked on `qa_wager_check` (138/139 there, then 12/12). Re-runs on `qa_wager_max` pass everything
except the pre-fix data noted under bug 1.

## Bugs found and fixed

1. **An Unranked stake earned Bronze rakeback** (`9c566cb`).
   - **Cause.** `vip.onWager` syncs `users.rakeback` to `0` for a player below Wood. `rakeback.accrue` then
     read that `0` as "rate not synced" and fell back to `DEFAULT_RAKEBACK_RATE` (0.2%).
   - **Effect.** A player's first $499 earned twice the Wood rate (0.1%). `vipRewards` gives Unranked 0.
   - **Fix.** `wagerActivity.service.js` skips the accrual when the rate `onWager` just synced is 0.
   - **Test.** `services/user/src/modules/wager/__tests__/unrankedRakeback.test.js` fails before the fix and
     passes after. The wager, rakeback and VIP suites passed (89/89). user-service was restarted.
   - **Pre-fix data.** `qa_wager_max` still carries the 12 Unranked accruals it earned before the fix (all
     at the start of its ladder), so the script's "Unranked stakes accrued nothing" check reports them on
     that player. `qa_wager_check` (after the fix) shows 0.

## Open issues (not fixed: not small, or owned elsewhere)

1. **Seamless stakes are missing from most turnover reports.** Seamless writes `seamless_transactions`
   and records the wager, but these do not read that table:
   - casino race points (`/internal/casino/wager/race-points`)
   - `GET /admin/reports/wager-stats` and `pnl-stats`
   - `/user/profile/stats` (casino `profileStats.js`)
   - the turnover endpoint

   So a seamless-only player wagers toward VIP, rakeback and affiliate, but scores no race points and is
   absent from GGR. This internal-mode run shows the same gap, since none of these reports read
   `wager_activity`.
2. **Admin player report: stale and INR-only figures.**
   - `level` comes from the legacy `users.level` (shows 1 for a Diamond 5 player). The site admin's VIP
     Club list prints `L{user.level}` (`admin/src/views/promotions/VipClub.tsx:149`).
   - `balance`, `totalDeposited` and `totalWithdrawn` are INR-only: 0 for this USDT player, who holds
     536k USDT and deposited 200 USDT. The Risk view (`user-risk`) is also INR-only.
3. **Risk tab has no casino play.** It shows `gamesPlayed` from `users.games_played`, which only
   `games.recordActivity` increments (0 here; the player report counts 280 from the ledger). There is no
   wager line.
4. **Affiliate commission of 5% of turnover outruns the house edge.** The referrer earned 1,925,000 USDT
   (unclaimed) on a player whose GGR was 630,242. That is the operator's `comissionpercent` = 5 (demo
   seed), not code, but at 5% of wager every referred player costs the house money. Worth a look before
   handover.
5. **Races.** `races` is on (`daily_contest`), but no race row exists, so no race is running and scores
   could not be watched. The owner plan was not touched.
6. **Periodic claim order.** `claim/:type` pays the newest unclaimed award first. Older ones stay
   claimable until their deadline, which is correct, but a player who skipped a week collects them one by
   one.

## Test data left behind

- **`qa_wager_max`**: Diamond 5, about 536k USDT and 129k USDT of open rakeback. Kept as top-level test
  data.
- **`qa_wager_max_ref`**: about 1.93M USDT of unclaimed commission.
- **`qa_wager_check`**: Gold 1.
- **`qa_wager_check_ref`**: holds that player's commission.
- **Credentials**: in the QA creds file (mode 600), not in the repo.
