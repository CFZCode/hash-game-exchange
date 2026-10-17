---
name: vip-progress
description: Track one Parker567 player's VIP level, wager, distance to the next level, bonus (daily / weekly / monthly) eligibility and claimables, rakeback and locked bonus balance, all valued in the OWNER's default currency (owner panel `default_currency`, e.g. USDT). Read-only. Use after any change to wager / VIP / bonus / rakeback / sports settlement, when the user says "VIP level nahi badh raha", "level 2 tak pahuncha", "claimable kya hai", "bonus kyu nahi aa raha", "VIP track kar", or before claiming VIP or bonus work is done.
---

# VIP and bonus progress

One command prints a player's whole VIP and bonus picture, in the owner's default coin.

```bash
# live (default)
node .claude/skills/vip-progress/check.mjs <username-or-email> '<password>'
# local stack
API=http://127.0.0.1:4700 node .claude/skills/vip-progress/check.mjs qa1ee3ad 'Qa!E3k5D-VK9a'
```

The script logs in, then only reads (GET). It never claims, bets or writes.

**Admin side too (welcome bonuses):** add a staff login, and the script reads the site admin's Site config → Welcome bonuses (`GET /admin/site-config/welcome-bonuses`). It compares that with what the player site is served (`GET /user/bonus/first-deposit`) and prints `MATCH` or `MISMATCH`:

```bash
STAFF_EMAIL=<admin email> STAFF_PASSWORD='<pw>' node .claude/skills/vip-progress/check.mjs <user> '<pw>'
```

- When the bonus is switched off, the player is served no tiers, so only the on/off switch is compared.
- Tier amounts are in the reward currency (`rewardCurrency`). The report converts them to the owner's default coin, and adds a NOTE line when the two currencies differ.
- Check the same values on screen as well:
  - admin: `/site-config/welcome-bonuses`;
  - player site: Deposit Bonus / the deposit dialog's first-deposit offer.

## Full journey test (local only)

`node scripts/e2e-player-journey.mjs` (repo root, local stack running) runs the whole player path and prints PASS/FAIL per check. It exits 1 on any failure.
- **Setup:** turns the first-deposit bonus on.
- **Signup** a fresh player.
- **Deposit:** a manual ₹1,000 INR deposit, approved as admin. Checks: the wallet gets the exact amount, the first-deposit bonus is paid at its tier, and history lists both.
- **VIP 2:** settled sports bets (₹85,000) are counted by the real wager sync up to VIP 2. Checks: level-up and rank-up credits, and rollover progress.
- **Claims:** daily and weekly claims (credited once, refused the second time), then ₹200 of in-house stakes for rakeback.
- **Report:** this skill's report for the new player.
- **Cleanup:** restores the welcome-bonus config and voids and deletes the inserted bets. The e2e player stays, and its id is printed.
- No provider money is used. The real ₹50-minimum sports bet is skipped under `qa-betting-budget`.

## What it reads, and the rules behind each figure

| Line | Source | Rule |
|---|---|---|
| Currency | `GET /admin/site-config/public` → `defaultCurrency` | Every amount is shown in this coin. When the owner changes it, the report follows. |
| VIP level, progress, wagered, to next | `GET /user/vip` | The level is decided on the stored USD wager. `wagerInCurrency` and `wagerToNextLevelInCurrency` give the same figures in the default coin. A WARN line means the API's `currency` differs from the owner default. |
| Ladder near the player | `GET /user/vip/levels` | Bands are in USD (`minXp`) and converted at today's rate (`/user/exchange-rate/rates`). |
| Daily / weekly / monthly bonus | `GET /user/bonus` → `types` | `locked (VIP n+)` means the level is too low. Today daily and weekly need VIP 2 and monthly needs VIP 7. `eligible` means the level is met but the bonus is not ready to claim. `CLAIMABLE` means it can be claimed now. |
| Rakeback | `GET /user/rakeback` | `rate` is a fraction: 0.002 means 0.2%. It accrues on casino stakes. Sports stakes are excluded on purpose (`rakeback: false`). |
| First deposit bonus (player) | `GET /user/bonus/first-deposit` | ON or OFF, whether this player is eligible (only before their first credited deposit; never for agent-tree players), and the tiers: deposit from, %, up to. `already claimed` shows once it has been paid. |
| Welcome bonuses (admin) | `GET /admin/site-config/welcome-bonuses` (staff) | Compared with the player's figures, giving MATCH or MISMATCH. Also shows the register bonus. |
| Bonus balance | `GET /user/bonus-balance` | Active bonus money held apart from the wallet until it is wagered off. The wallet's Bonus Balance card shows the same figure. |

## How wager reaches VIP (check this when a level doesn't move)

- **Casino:** casino-service posts every stake to `/internal/user/wager/record`.
- **Sports:** sports-service's wager-report sync (`services/sports/src/modules/wager-report/sportsWagerSync.js`, every `SPORTS_WAGER_SYNC_INTERVAL_MS`, default 60 s) posts each bet settled won or lost, once, with ref `<betId>`; its cursor is `wager_activity` itself. Open bets don't count. A voided bet is reversed. (A second job that used `sports:<betId>` double-counted every bet and was removed on 2026-10-18; the same sync now reverses those `sports:` duplicates.)
- **No USD rate** for the stake's currency: the stake is not counted yet. It is retried on the next tick.
- **Level-up reward:** paid once per level crossed (`vip:level_up:<user>:<level>`).

## Doing it right

- **Moving a player up a level to test rewards:** do it on the LOCAL stack. Insert settled bets for a dedicated test player and let the sync count them, then clean up. Live betting is capped by the `qa-betting-budget` skill (₹10 per sports bet), so it can't push a level.
- **Report:** paste the script output, and say which API (live or local) and which player.
- **Never print the password** in a report. If a login fails with 429, the gateway is rate-limiting this IP. Wait, don't retry in a loop.
