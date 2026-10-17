---
name: live-qa
description: Run real-life scenarios on the LIVE Parker567 site through Chrome DevTools (CDP) — the site admin at localhost:3080 and the player site at localhost:5190 both talk to api.parker567.com — e.g. sign up a player, manual INR deposit, admin approve with the transaction password, first-deposit bonus ON/OFF, wallet / bonus / VIP screens, balance sheet. Use when the user says "real life scenario", "live pe CDP se test kar", "admin se approve karke dekh", "bonus on/off karke check kar", or when an approval asks for TXN_PASSWORD.
---

# Live QA through CDP

## Credentials

- **Where they are:** `CREDENTIALS.local.md`, section "LIVE". It is git-ignored. Read it at run time.
- **Never** copy a password into this skill, a commit, a report or a screenshot name.
- **Live transaction password:** the super admin's. The admin asks for it on:
  - deposit approve
  - withdrawal decide
  - wallet adjust
  - points settle
  - money and config saves
- **Error codes:**
  - `TXN_PASSWORD_REQUIRED`: the password was left blank.
  - `TXN_PASSWORD_INVALID`: the password is wrong.
  - `TXN_PASSWORD_NOT_SET`: the staff account has none set. Set it under the admin's My account, then retry.

## Browser rules

- Start with `list_pages`. Never take over the user's own tabs.
- For a new player, open a NEW isolated context.
- For the admin, open one new background page in the already signed-in admin context.
- Keep at most one extra tab per signed-in context. Two tabs rotate the same refresh token and sign each other out.
- Screenshots go in `logs/qa/live-<scenario>/`.

## Money rules (`qa-betting-budget` is the hard limit)

- **Deposits:** a manual deposit is a bookkeeping credit, not provider money. Keep it to the smallest amount the check needs: about ₹840 clears the 10 USDT first-deposit tier at 0.012.
- **Bets:**
  - Sports bets are at most ₹10, and the slip minimum is ₹50, so live sports bets are skipped and recorded as a finding.
  - Provider games: Aviator only, ₹10 a round, ₹20 per session.
  - So **VIP levels cannot be raised on live.** Raise them on the local stack instead: `node scripts/e2e-player-journey.mjs`, or the `vip-progress` skill. Say so in the report.
- **Config changes on live** (e.g. the first-deposit bonus switch):
  - Read the current value first.
  - Change it through the admin UI with the transaction password.
  - Restore it exactly in the same run, even if a later step fails.
- **Cleanup:**
  - Test players keep what they were credited.
  - List each one (username, id, balance) in the report, so the owner can lock or reclaim it.

## Scenario: first-deposit bonus ON vs OFF

1. Admin → Site config → Welcome bonuses: note the current state.
2. **OFF:**
   - Switch the first-deposit bonus OFF and save (transaction password).
   - Sign up player A. Deposit ₹840+ INR manual, then approve it in admin → Manual deposits (transaction password).
   - Expect: the wallet has the deposit, no bonus credit, `/user/bonus/first-deposit` shows `enabled:false`, and the deposit dialog shows no offer.
3. **ON:**
   - Switch it back ON with the tiers.
   - Sign up player B. The deposit dialog shows "+100% on ₹840 or more, up to 100 USDT". Deposit the same amount and approve it.
   - Expect a bonus at the tier rate:
     - straight to the wallet when the wagering multiplier is blank;
     - locked in Bonus Balance when a multiplier is set.
   - It shows in Transaction history, the rollover target and the admin balance sheet ("All (in USDT)", reconciled).
4. Restore the original welcome-bonus config.
5. Run `node .claude/skills/vip-progress/check.mjs <player> '<pw>'` for A and B, plus STAFF_EMAIL / STAFF_PASSWORD for the admin↔player MATCH line.

## Automating it (proven on live 2026-10-18)

Run each admin step with `evaluate_script` on ONE new background admin page (`/site-config/welcome-bonuses`). It calls the admin's own proxy `/api/gw/api/v1/…`, which carries the staff session. Take the transaction password from `CREDENTIALS.local.md` at run time.

1. `GET admin/site-config/welcome-bonuses` and keep the result as the original.
2. In ONE script with `try … finally`:
   - `PUT admin/site-config/welcome-bonuses` with the same body but `firstDepositBonus.enabled: false`.
     - Body: `{ registerBonus: { enabled, amount }, firstDepositBonus: { enabled, tiers: [{ minDeposit, percent, maxBonus }], wagerMultiplier, expiryDays } }`.
     - No password is needed for this save.
   - `PUT admin/user/deposits/fiat/<id>/approve` with `{}`. Expect 403 `TXN_PASSWORD_REQUIRED`.
   - `PUT admin/user/deposits/fiat/<id>/approve` with `{ transactionPassword }`. Expect 200 and `firstDepositBonus.paid: false`.
   - In the `finally`: PUT the original config back, re-read it, and assert `enabled` and the tiers are identical.
3. Submit player B's deposit from node:
   - Log in at `POST /user/auth/login`.
   - `POST /user/deposits/fiat` as multipart: `amount`, `currency=INR`, `transactionId`, `screenshot`.
4. Approve B's deposit with the transaction password. Expect `firstDepositBonus.paid: true` with the tier amount, e.g. 12 USDT for ₹1,000.
5. Verify:
   - Player side: `/user/wallet/balances` (A has no USDT; B has +12) and `/user/bonus/first-deposit` (`claimed` only for B).
   - Admin side: `admin/reports/balance-sheet/<id>?currency=USDT` (B has the bonus row; A has none) and `admin/reports/players?channel=direct`.

## Report

- A PASS/FAIL table, with evidence and screenshots.
- Every live write made: config changes and their restore, players created, deposits approved.
- Anything skipped because of the budget.
