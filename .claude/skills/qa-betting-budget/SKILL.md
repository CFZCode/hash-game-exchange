---
name: qa-betting-budget
description: Hard money limits for any test that places a bet or plays a game on Parker567. Third-party provider games cost real money, so they have a fixed total budget. Read this before any casino, sports or wager test, manual or scripted, and pass the limits to every sub-agent that will play.
---

# Betting budget for tests

The owner set these limits. Never go above them, even when a test needs more data. When a test can't run within them, stop and say so instead.

## Third-party provider games (real money)

Third-party games are Spribe, Evolution, Pragmatic, Jili, Hacksaw, BGaming, NetEnt, PG Soft, Microgaming, Ezugi, and any other game that launches a provider's iframe. A round in one of these debits the provider's real balance.

- **Which game:** play only **Aviator (Spribe)**, one round of ₹10 per session, unless the user names another game. Other third-party games may be opened to check they load, but don't stake in them.
- **Total budget for one testing session: ₹20 INR across all third-party games together.**
- **Stake:** at most ₹10 per round.
- **Currency:** INR only. No USDT or other crypto rounds on third-party games.
- **Minimum above ₹10:** if a game's minimum stake is over ₹10, don't play it. Record the minimum as a finding.
- **Budget used up:** once ₹20 is spent, stop playing third-party games for the rest of the session.
- **Reporting:** every test report states the exact third-party spend, listing each game, stake and result.

## In-house games and our own backend

In-house games are our own engine, e.g. Limbo, Dice, Crash, Plinko, Mines (in-house) and Coinflip.

- **Stake:** at most ₹10 INR or 1 USDT per round.
- **Bulk rounds:** keep them small, at most about 20 rounds per test. The total must stay small and be returned at cleanup.

Callbacks you sign and send to our own backend (a test harness that simulates a provider) don't touch a provider's real balance. Use them for wallet, wager and reward testing.

## Sports exchange

- **Stake:** at most ₹10 per bet. The exchange is INR only.
- **Slip minimum above ₹10:** if the slip's minimum is higher (it is ₹50 today), don't raise the stake. Record the refusal as a finding.

## Always

- Fund only dedicated test players with small amounts: a few hundred INR at most, or 20 USDT. Return the remaining funds and close the test players at cleanup.
- Never place bets from the seeded accounts' real balances beyond these limits.
- When you hand testing to sub-agents, copy these limits into their instructions word for word.

## Owner overrides (logged)

- **2026-10-18 — live sports ledger test.** The owner lifted the limits for one test: deposit as much USDT as the test needs to a dedicated test player (`lcp2ctrpqb`) and place multiple sports bets (at the slip minimum or above, across several sports/matches) to check that the ledger, exposure, VIP wager and turnover are calculated correctly. This override covers that test only. It does not change the limits above for any other run.
- **2026-10-19 — live full scenario (run c99s, players fsc99sp01…p10).**
  - **What the owner allowed:** the admin may credit test players a self-used balance of up to 10,000 USDT each, so wager / VIP / referral / commission / bonus tests can reach real levels.
  - **Sports:** INR only.
  - **Originals:** INR and USDT, played as signed sandbox callbacks to our own backend.
  - **Third-party slots / casino:** not tested until the aggregator whitelists the real API.
  - **Scope:** this run and these players only.
- **2026-10-19 — live full scenario, second run (players Testuser01…Testuser05).** The owner asked to repeat the full scenario on five new players with everything deployed. Same terms as run c99s: up to 10,000 USDT self-used balance per player by admin credit, sports INR only, originals INR and USDT (played through the UI, since the live webhook secret is not ours), no third-party slots / casino until the aggregator whitelist. Scope: this run and these players only.
- **2026-10-19 — live operator audit, third run (players Testuser06 → Testuser07 → Testuser08, a referral hierarchy).** The owner asked for a 3-player hierarchy and a click-through of every admin and player tab, wager and currency-wise. Same terms as the second run: up to 10,000 USDT self-used balance per player by admin credit, sports INR only, originals INR and USDT through the UI, no third-party slots / casino. Scope: this run and these players only.
- **2026-10-19 — UI re-test after the fix batch (players Testuser09 → Testuser10 → Testuser11, a referral hierarchy).** Owner's limits: originals at most 10 USDT or ₹100 a round; sports INR only (₹100–₹200 a bet). Money comes from approved manual INR deposits and the player's own Swap (no admin self-used credit this run). Everything through the UI. Scope: this run and these players only.
