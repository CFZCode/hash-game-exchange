---
name: live-e2e-run
description: Automated live end-to-end run of Parker567 in Chrome over CDP — register 5 players through a referral chain, manual deposits approved in the site admin, Slotegrator casino / Original games / sports bets inside the owner's budget, then verify bonus, rollover, VIP, affiliate commission + claim, race leaderboard, KYC + withdrawal, and crawl every site-admin page and tab. Use when the user says "promotion, bonus, affiliate, race, deposit withdrawal ka full test automate kar", "5 user bana ke sab check kar", "admin ke saare reports tab click karke verify kar".
---

# Live E2E run (first run: 20 Oct 2026, players parkertest01–05)

Everything here writes to **live** (the local apps on :5190 / :3080 / :3085 call https://api.parker567.com).
Read `.claude/skills/qa-betting-budget` first and log the owner's limits for the run there.

## Credentials

Admin, transaction password and the test-player password live only in the git-ignored
`.claude/skills/live-full-scenario/credentials.local.md`. Fill the `__PASS__` placeholder at run time;
never write a password into this folder, a commit or the report.

## Browser setup

- CDP Chrome on port 9333 (`--user-data-dir=$HOME/.chrome-cdp-9333`). One isolated context per player
  (`new_page` with `isolatedContext: "ptNN"`), plus the signed-in local admin tab on :3080.
- Run scripts with `evaluate_script` + `sourcePath` (they are `async () => {…}` functions).
  Player scripts use `api-prelude.js`, which refreshes the 15-minute access token the same way the app does.
- Keep player tabs on a light page (`/help/faq`) when not in use: several sports/game tabs at once trip
  the API rate limit (429) for the whole IP.

## Steps and scripts

| Step | How | Script |
| --- | --- | --- |
| Register | p01 direct on `/login/regist`; p02–p04 via p01's `/referal/<CODE>`; p05 via p04's link | `register-ui.js` (sed `__USER__`, `__PASS__`) |
| Deposit | `/wallet/deposit` → Fiat: amount, UTR, generated receipt image, Submit | `deposit-ui.tpl.js` (sed `__AMOUNT__`, `__UTR__`) |
| Approve | admin `/transactions/deposit` → Manual → Approve → transaction password | inline (see `logs/qa/live-e2e-pt` run) |
| Player state | wallet, first-deposit bonus, bonus balance, wager progress (rollover), VIP, KYC, affiliate | `player-state.js` → `summarize.cjs NN…` |
| Slotegrator game | `/game/<uuid>` → `open-game.js` → snapshot → click the bet button | `open-game.js`, `balance.js` |
| Original game | `/game/<slug>` → `select-currency.tpl.js` (sed `__CUR__` INR/USDT) → fill BET AMOUNT → BET | `select-currency.tpl.js` |
| Sports | `/sports/match/4/<gmid>` → click odds → fill Stake → Place Bet; verify | `open-bets.js` |
| Affiliate | team, rewards, commission, referral history, site rates | `affiliate-state.js`, `claim-all.js` |
| Race | `/user/race` config + `/user/race/daily/leaderboard` | `race-state.js` |
| KYC + withdraw | `/settings/verification` → Basic → India → form + two TEST images; admin `/kyc` approve; `/wallet/withdraw` UPI; admin `/transactions/withdraw` → Fiat → Decide Approved → Paid | inline |
| Admin crawl | every page in `admin/src/configs/navConfig.tsx`, every tab, flags NaN / undefined / Invalid Date / error toasts | `admin-crawl.tpl.js` (sed `__PAGES__` with a JSON list) → `admin-crawl-show.cjs` |

Exchange admin reports (Current Bets etc.) list nothing until **Load** is pressed.

## Games that automate cleanly

Spribe Dice, Plinko, Keno, Hotline, Aviator (bet only — cash-out needs timing). Mini Roulette and Hilo's
Low/High are canvas-only (no accessible controls). All Original games expose BET AMOUNT + BET/DRAW/SHOOT.

## Report

Write it as a Claude Docs doc, one section per area (users, deposit/withdrawal, bonus, affiliate, race,
games + spend vs budget, admin crawl, findings, live writes). The 20 Oct run's doc:
https://claude.ai/code/artifact/d2536c04-ffcc-402c-9b1f-fb42990d2afc
