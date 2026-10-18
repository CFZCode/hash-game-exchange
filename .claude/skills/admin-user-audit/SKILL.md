---
name: admin-user-audit
description: Audit one (or many) Parker567 players end to end from the ADMIN panel — open every tab of the player's admin page and recompute what it shows: balance sheet and ledger, VIP level and level-up bonuses, wager / turnover (3x rollover, TargetX), bonuses (first-deposit, monthly gradual: locked / unlocked / claimed), rakeback and daily / weekly / monthly, referral (steps, Locked Rewards, commission, 1 USDT joining bonus), withdrawal conditions (KYC, rollover, bonus forfeit, cap), and the player's bet history (game name, wager, win / loss for originals, casino and sports). Use when the user says "admin pe har user ka hisaab check kar", "user tracking", "calculation verify kar", "turnover / rakeback / bonus / withdraw condition check kar".
---

# Admin user audit

Every number an admin sees for a player has a formula behind it. This skill recomputes each one from the player's raw rows and marks PASS / FAIL. It is read-only unless a step says otherwise.

## Setup

- **Admin:** https://admin.parker567.com. Credentials are in `.claude/skills/live-full-scenario/credentials.local.md` (git-ignored). Never print them.
- **Browser:** CDP Chrome, ONE admin tab (a second tab rotates the refresh token and signs the first out).
- **Reads:** through the admin proxy from that tab: `fetch('/api/gw/api/v1/...')`.
- **Players:** a list of user ids. For each, open Users → the player, then go through the tabs below in order.
- **Money units:** wager, VIP, commission and rakeback are USD; deposits and the balance sheet are per currency. Rate = Admin → Exchange rates (`usd_rate`; INR 0.012 at the time of writing; USDT = 1).

## The formulas (hash.game, as built — plan: `docs/BONUS-WAGER-FIX-PLAN.md`)

| Thing | Formula / rule |
| --- | --- |
| Wager (USD) | Σ stake × rate at bet time (`wager_activity.usd_amount`), refunded / rolled-back stakes out |
| VIP level | 1,000 Bronze I · 3,000 II · 7,000 III · 15,000 IV · 30,000 Silver I · 60,000 II · 120,000 III · 240,000 IV · 500,000 Gold I … (admin VIP Club → Ladder may override) |
| Level-up bonus | per level reached, USDT: bronze 1, silver 2, gold 5, platinum 10, diamond 60, eternal 100; rank-up into a new card (not out of Beginner): silver 25, gold 75 … |
| Rakeback (instant) | stake USD × house edge × 10% (originals 1%, slots 4%, live / sports 2%); Beginner earns 0 |
| Daily / weekly / monthly | Σ(wager × house edge) in the closed UTC window × 4% / 4% + net loss × 1% / 3.5% + net loss × 1.5% |
| Commission (referrer) | friend's wager × 1% × 25% × game rate (originals 28%, slots / live 60%, sports 100%) |
| Referral steps | friend reaches Bronze I 0.50 · Bronze II 2.50 · Bronze IV 5 · Silver I 12 · Silver III 25 · Silver IV 50 · Gold I 80 · Gold II 120 · Gold IV 205 · Platinum II 500 (= $1,000) |
| Locked Rewards | per friend 1,000 − steps granted |
| Joining bonus | 1 USDT to the referrer on the friend's first credited deposit (Affiliate bonus setting) |
| Monthly deposit bonus | Nth deposit of the UTC month → 180 / 240 / 300 / 360% (min 5 / 10 / 20 / 30 USDT), when the program is on |
| Gradual unlock | per bet: stake × contribution × house edge × 1% (contribution: mines / dice / limbo / plinko 80%, crash 50%, providers 70–100%, live 10%, sports 50% at odds ≥ 1.5 only) |
| Bonus balance | Σ active (amount − claimed) |
| Rollover (withdraw) | required = Σ ALL credited deposits (USD) × multiplier (player's TargetX, else common, default 3) |
| Withdraw blocks | KYC (site policy), rollover not met, a ROLLOVER bonus active (gradual never blocks), daily limit, deposit cap |

## Tab by tab

| Tab | What to recompute | Expected |
| --- | --- | --- |
| Overview / profile | VIP level from wager | matches the ladder |
| Balance sheet (per currency + All) | running balance = Σ rows; casino bet / win rows have amounts (category Casino / Original Games); sports rows; deposits; adjustments; BONUS rows | closing = wallet balance, "unexplained" ≈ 0, every page reachable |
| Ledger | every BONUS row is one of: level-up / rank-up, first-deposit / monthly claim, rakeback claim, referral claim | no unexplained BONUS |
| Bonuses | each row: amount, mode (gradual: unlocked / claimed / locked; rollover: wagered / required), status | gradual unlocked = Σ unlocks per bet (formula above) |
| Wager / turnover (Turnover Report, TargetX) | wagered vs required | required = deposits × TargetX; same TargetX on the player side (`/wallet/rollover`) |
| Rakeback | accrued, claimed | formula above |
| Affiliate (if referrer) | team count, unclaimed tier rows, commission rows | steps / commission formulas; Locked Rewards |
| Withdrawals | can the player withdraw? | blocks exactly as listed above |
| Bet history (admin + player `/wallet/bet-history`) | each round: game NAME (not a code / uuid), stake, payout, WIN or LOSS, currency, time | originals: one row per round with Win (payout > 0) or Loss; sports: settled status |

## Bets to place before an audit (only within `qa-betting-budget` or a logged override)

- **Originals:** one WIN and one LOSS round on every game in `GET /api/v1/casino/original-games/games` (today: Arrow Bow, Diamonds, Keno, Limbo, Mines, Plinko), INR and USDT.
  - Production keys (`OG_ENV=production`): play through the UI.
  - Sandbox: signed callbacks with the CURRENT `OG_WEBHOOK_SECRET`; a 401 `INVALID_SIGNATURE` means the server's secret changed.
- **Sports:** INR only, one back bet per sport that has an open market (cricket, football, tennis …), at the slip minimum. Record each bet id and re-check after it settles: settled won / loss counts toward wager, void does not.
- **Third-party slots / live casino:** only after the real API is whitelisted.

## Report

- **Format:** a Claude Docs report, one table per player: tab · check · expected · seen · PASS / FAIL · evidence (screenshot `logs/qa/admin-audit-<run>/…` or the API body).
- **Then:** the list of bugs, each with the formula it breaks.
- **Live writes:** list every one (normally none, except the bets above).
