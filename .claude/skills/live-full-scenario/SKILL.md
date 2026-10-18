---
name: live-full-scenario
description: Full real-life scenario on LIVE Parker567 (https://parker567.com, admin https://admin.parker567.com) — register 10 players through a referral chain, manual INR deposits approved in the admin, wager across originals, slots and sports, climb VIP levels, then check every hash.game change (VIP ladder, referral locked rewards, commission, locked deposit bonus + claim, contribution, rakeback, rollover, currency) and write an outcome report. Use when the user says "10 users register karke full real life scenario", "live pe sab changes test kar", "outcome ka report bana".
---

# Live full scenario — 10 players, every hash.game change

## Credentials

- **File:** `.claude/skills/live-full-scenario/credentials.local.md`. It is git-ignored: `credentials.local.md` matches `CREDENTIALS.local.md` in `.gitignore`.
  - Fallback: the repo's `CREDENTIALS.local.md`, section "LIVE".
  - It holds the admin email, admin password and the transaction password.
- **Read it at run time.** Never copy a password into this file, a commit, a report, a screenshot name or a chat message.
- **Admin login:** https://admin.parker567.com/login. Deposit approval asks for the transaction password (`TXN_PASSWORD_REQUIRED` without it).

## Before you start (stop if any fails)

1. **Live runs the new code.**
   - `GET https://api.parker567.com/api/v1/user/vip/levels` must give 33 levels, with Bronze I at `minXp` 1000.
   - `GET /api/v1/admin/site-config/public` must have `commissionRate`.
   - If not, the server needs `./restart.sh --pull` (migrations 132–138). Testing old code proves nothing.
2. **Money limits:** `.claude/skills/qa-betting-budget`, word for word, unless the owner has logged an override there for this run.
   - Provider games (slots): Aviator only, ₹10 a round, ₹20 a session.
   - In-house originals: ₹10 / 1 USDT a round, about 20 rounds.
   - Sports: ₹10 maximum, and the slip minimum is ₹50, so it is a finding, not a bet.
   - Callbacks we sign to our own backend (the original-games sandbox secret) cost no provider money. They are the allowed way to move wager for wallet / wager / reward tests.
3. **The VIP ladder cannot be climbed to the top on live.**
   - Eternal X is $10,000,000,000 of wager. Bronze I is $1,000 ≈ ₹83,333.
   - Climb on live only as far as the budget / owner override allows.
   - Prove the full ladder on the local stack: `node scripts/e2e-player-journey.mjs`, `backend/scripts/qa/wagering-ladder.mjs`, and the `wager-bonus-test` local suite.

## Players

`fs<run>p01` … `fs<run>p10`, where `<run>` is a short stamp.

- p01 signs up directly.
- p02–p10 sign up through p01's link `https://parker567.com/referal/<CODE>`, so p01 is the referrer of nine.
- Each sign-up is a NEW isolated CDP context: `/login/regist` → username + password → tick 18+ → Sign Up.
- Keep the passwords in the run's scratch notes only.

## Steps

1. **Register** p01–p10.
   - Check: `GET /user/affiliate/team` (as p01) → total 9.
   - Check: `GET /user/affiliate` → `lockedRewards.perFriendUsd` 1000, `lockedUsd` 9000.
2. **Deposit (manual INR).**
   - Each player submits ₹500 (or the budget's amount) on Deposit → Fiat, with a UTR and a test screenshot.
   - Admin → Manual deposits → approve with the transaction password.
   - Check: the wallet balance.
   - Check: the deposit bonus (first-deposit tiers, or the monthly program "Deposit bonus 1/4 · +180%" when the owner turned it on).
   - Check: `GET /user/bonus-balance` (gradual: locked = 180% in USDT, claimable 0).
3. **Wager.**
   - **Originals:** signed sandbox callbacks bet + win of the same amount, so the balance is unchanged and the wager grows. Or real in-house rounds within the limit.
   - **Slots:** Aviator ₹10 (at most 2 rounds in total).
   - **Sports:** open a market, try ₹10, and record the ₹50 minimum.
   - After each, check:
     - `wager_activity`, through the admin balance sheet / reports: the category is originals / slots / sports.
     - The VIP level from `GET /user/vip`: Beginner → Bronze I at $1,000 …
     - p01's commission row, which must be wager × 1% × 25% × 28 / 60 / 100% by game, not 5%.
     - p01's referral steps unlocked as each friend passes Bronze I / Bronze II …
     - Rakeback = stake USD × house edge × 10% (Bronze I and up).
     - The locked-bonus `claimable` grows, `POST /user/bonus-balance/claim` pays it, and a 2nd claim is refused.
4. **Withdrawal / rollover.**
   - `/wallet/rollover`: target = all deposits × multiplier.
   - Admin Turnover Report TargetX 2.5 → the same 2.5 shows on the player side.
   - A gradual bonus does not block a withdrawal.
5. **Currency.** Switch INR ↔ USDT: every amount redraws in the new unit, and INR uses ₹x,xx,xxx.xx.
6. **Admin screens.** Open each and screenshot it:
   - VIP Club → Ladder
   - Affiliate → Rates (commission rate + game rates, unlock table)
   - Bonus → Welcome bonuses (deposit program)
   - Bonus → Wager contribution
   - Bonus → Rakeback formula

## Report (Claude Docs doc, outcome per check)

- One table per area (Registration, Deposit, Wager & VIP, Referral, Commission, Locked bonus, Rakeback, Rollover, Currency, Admin): check · expected · seen · PASS/FAIL · evidence (screenshot in `logs/qa/live-full-<run>/` or the API body).
- Every live write: players (username, id, balance), deposits approved, settings changed and restored.
- The spend: provider games (game, stake, result), in-house rounds, and the simulated-callback wager total.
- What was proven only locally, and why (budget / ladder size).
