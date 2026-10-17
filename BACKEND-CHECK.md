# Backend check: FEATURES.md audit (2026-10-17)

Every item in `FEATURES.md` was checked against the backend code, the local DB and the **live** API (`https://api.parker567.com`, GET only, no writes). This file lists what the backend dev needs to fix or confirm, most important first. Items that check out are summarised at the end.

Labels: **MISSING** means no route, storage or enforcement exists. **BUG** means it exists but behaves wrongly. **SECURITY** means a permission or abuse gap. **CONFIG** means the code is fine and only keys or settings are missing. **DOC** means FEATURES.md is wrong (fix the doc, no backend change).

---

## P0: money and risk

### 1. Sports stakes never count for rollover, bonus wagering, VIP, rakeback or affiliate commission (MISSING)
- **Expected:** FEATURES.md has Bonus (wagering lock), VIP, Affiliate and Sports all ON, which implies a sports stake counts like a casino stake.
- **Actual:**
  - Every one of these runs off the wager pipeline in `services/user/src/modules/wager/wagerActivity.service.js` (≈ lines 43–47, 390–407). That pipeline updates `userwager` and calls `vip.onWager`, `affiliate.onWager`, `rakeback.accrue` and `playerBonuses.onStake`.
  - Only `POST /internal/user/wager/record` feeds it, and only casino calls that (`services/casino/src/modules/games/games.service.js:1256` and gis). `services/sports` never calls user-service.
  - The deposit rollover reads `userwager` only (`wager/wager.service.js:320–331`).
- **Repro:** a player who only bets on sports (e.g. testerqa) sees Rollover "Wagered $0", the first-deposit bonus never unlocks, VIP and rakeback don't move, and the referrer earns nothing. Races are the exception: they read sports turnover directly (`race/race.service.js:1022`).
- **Fix:**
  - When an exchange bet is matched or settled (follow the casino rule), post the stake to `/internal/user/wager/record` with the INR amount, `source: 'sports'` and the bet id as `ref`. Make it idempotent per bet.
  - On void or cancel, post to `/internal/user/wager/reverse`.
  - Add `/internal/user/wager` to the sports-service entry in `packages/common/src/internalAcl.js`.
  - Backfill existing settled bets without spamming level-up rewards.
- **Status: fixed locally, not committed or deployed yet.**
  - `services/sports/src/modules/settlement/sportsWagerSync.js` runs every 30 s (`SPORTS_WAGER_SYNC_MS`). It posts each settled won or lost bet once (`sports:<betId>`, `rakeback: false`) and reverses one that is later voided.
  - Its cursor is migration **117** `mssports.sports_wager_sync`.
  - The first start backfills every settled bet. Level-up rewards fire once per level crossed.
  - Also fixed: the VIP progress bar showed 0% for every unranked player (`packages/common/src/vipLadder.js`). `/user/vip` now returns `currency`, `wagerInCurrency` and `wagerToNextLevelInCurrency` in the owner's default coin.
- **Open risk:** on the exchange, a back and a lay on the same runner inflate wager at near-zero risk. That can farm VIP level-up rewards and affiliate commission. Rakeback is already off for sports stakes; the other two are not guarded. Count only the net exposure per market, or exclude hedged pairs.

### 2. A 490.00 MATCH_ODDS bet was accepted and settled as a win on live (BUG, verify)
- **Actual:**
  - Bet placement checks a max-odds rule (`sports/src/modules/bets/controllers/sportbetscontroller.mjs:718`, `getMaxOddsRule`) built from `max_odds_configs` (`lib/services/BettingConfigService.mjs:154–179`).
  - That table does not exist in the local DB, so enforcement could not be verified.
  - On live, testerqa bet **#17** (MATCH_ODDS, odds 490.00, ₹2,000 stake) was accepted, settled "won" (₹9,80,000 credit) and later voided (₹9,78,000 debit). The ledger now reconciles.
- **Fix:**
  - Confirm `max_odds_configs` exists on live (migration or sync).
  - Confirm the rule rejects over-cap odds on MATCH_ODDS.
  - Check how a 490 price passed the bet buffer's live-price check (`bets/buffer/betBuffer.mjs`).
  - Audit bet #17: who placed it, the market price at that moment, the settlement, and who voided it.

### 3. The daily withdrawal limit can be bypassed with tips (SECURITY)
- **Actual:** the new owner daily limit, the deposit cap and the KYC/wager requirements are enforced on the fiat, crypto, gateway and P2P rails (`withdraw-requirements/withdrawRequirements.js`, `p2p/p2p.service.js`). Tips (`tip/tip.service.js:91`) check only `withdraw_locked`.
- **Repro:** with `tips` entitled, a capped or limited player tips the money to a second account that has headroom, then withdraws from that account.
- **Fix:** apply the withdraw requirements to outgoing tips, or at least count tips sent against the daily limit.

### 4. A disabled coin can be deposited or withdrawn when the coin registry is unreadable (BUG)
- **Actual:** `packages/common/src/currencyRegistry.js:133–157` (`isEnabled` / `assertCurrencyEnabled`) treats the coin as enabled when the registry read fails or the coin is unknown. The money rails use it: `fiatDeposit.service.js:89`, `fiatWithdraw.service.js:76`, `cryptoWithdraw.service.js:93`.
- **Repro:** while admin-service is down, a player can move PKR, AED or any other coin the owner turned off.
- **Fix:** fail closed (`CURRENCY_DISABLED` or 503) for money in and money out. Keep fail-open only for display.

### 5. KYC feature switch is not enforced, and the `kyc` withdrawal policy ignores it (BUG)
- **Actual:** the KYC user routes have no `requireFeature('kyc')` (`kyc/routes/user.routes.js:34–46`). `withdrawRequirements.js:172–174` requires KYC from the `withdrawal_requirements` policy alone.
- **Repro:** the owner turns KYC OFF while the policy is still `kyc`. Players can no longer see KYC, yet every direct player's withdrawal is refused as "KYC not verified", and the submit route still accepts documents.
- **Fix:**
  - Gate the KYC routes with `requireFeature('kyc')`.
  - Require KYC for withdrawals only while the KYC feature is entitled, or refuse the owner save that turns KYC off while the policy is `kyc` / `kyc_and_wager`.

### 6. Affiliate commission is 5% of stake turnover, paid on every stake (business decision)
- **Actual:** `affiliate.service.js:105–117` pays the referrer `5% × the referred player's increase in USD wager`, win or lose.
- **Impact:** a referred player who stakes $10,000 earns the referrer $500, whatever the house made. Industry practice is a % of GGR/NGR, or a fraction of a percent of turnover.
- **Fix:** confirm the intended base and rate, change the calculation or the default, and write the base into FEATURES.md.

---

## P1: security and permissions

### 6b. Skipping a VIP card skips its rank-up reward (BUG, decide)
- On the local stack, a player who jumped from L0 straight to L2 in one wager got the L2 level-up (1 USDT) and the Bronze rank-up (5 USDT). They did not get the Wood rank-up (1 USDT) for the card they passed.
- **Fix:** when one wager crosses several cards, pay the rank-up for every card crossed. Each payout already has an idempotency key per card, so this is safe. Or state that only the card reached is paid.

### 7. Points settle runs without a transaction password for a Super Admin who never set one (SECURITY, low)
- `admin/src/modules/exchange/exchange.service.js:177–180` uses `assertTransactionPassword(..., { required: !actor.canIssueFunds })`. Every other money route (`exchange.service.js:117,134`, `direct-wallet/directWallet.service.js:153–154`) uses `required: true`.
- **Fix:** use `required: true` here too.

### 8. Crypto deposit errors leak env variable names to anonymous callers (BUG, minor)
- `services/user/src/modules/crypto/crypto.service.js:414–417`: live `GET /api/v1/user/crypto/coins?symbol=USDT` returns `"missing":["CCPAYMENT_BASE_URL","CCPAYMENT_APP_ID","CCPAYMENT_APP_SECRET"]`.
- **Fix:**
  - Log the missing names on the server and drop them from the public body.
  - Publish a `cryptoDepositAvailable` flag so the site can hide the crypto deposit tab until it works.
  - Set the CCPayment keys on live.

### 9. Duplicate JILI provider flag (`jili` and `jilli`) (BUG, low)
- Live `site-config/public` returns both `jili: true` and `jilli: true`. If they are toggled separately, one can keep JILI games open after the other is turned off.
- **Fix:** confirm which key `games/gameEntitlement.js` PROVIDER_FLAGS reads, migrate the other one away, and remove it.

---

## P2: features shown to players that have no backend

### 10. Challenges / Quest Hub (MISSING)
- ON in the owner plan and live `features/public`, and the sidebar shows Quest Hub (`/quests`). There is no quest module in user-service or admin-service. Live `GET /api/v1/user/quests` returns 404, and the frontend's live branch returns `{}` (`frontend/src/services/quest.js:26`).
- **Fix:** build `GET /user/quests` and `POST /user/quests/:id/claim` behind `requireFeature('challenges')`, with progress from wager activity and the claim paid in the reward currency. Otherwise turn the feature OFF in the owner plan.

### 11. Chat (MISSING over HTTP)
- The drawer shows bc.game's captured 21-room list (`frontend/src/services/chat.js:18–19`), messages are always empty, and nothing can be sent. The backend has chat only over websocket (`CHATS` / `ADD_CHAT`), with two hardcoded rooms (`social.constants.js`). Live `GET /api/v1/chat/rooms` returns 404.
- **Fix:** build HTTP chat (rooms table, `GET /chat/rooms`, `GET/POST /chat/rooms/:room/messages`), or the frontend wires the socket events. Until then, hide chat.

### 12. Google sign-in (MISSING)
- The button is shown (`SOCIAL_LOGINS = ['Google']` in `frontend/src/config/hiddenFeatures.js`), but no OAuth route exists anywhere in the backend.
- **Fix:** add Google OAuth start and callback routes that issue the platform token pair. Or the frontend empties `SOCIAL_LOGINS`.

### 13. Welcome pack flag does nothing (MISSING or DOC)
- `welcomepack` is only stored and listed (`site-config/siteConfig.service.js:144`). Nothing in the backend or frontend reads it.
- **Fix:** define it (e.g. gate the first-deposit bonus and its banner in `firstDepositBonus.service.js`), or remove the flag.

### 14. Raffles (MISSING, and the doc is wrong)
- FEATURES.md says ✅, but live `features/public` doesn't list `raffles` and no backend code exists. The Weekly Raffle page shows a "$1,000 jackpot" that nothing pays out (`frontend/src/services/raffle.js:52–66`).
- **Fix:** mark it ❌ in the doc. If raffles are wanted, they need a full module: tickets from wager, a weekly draw worker and payout.

---

## P3: configuration (code is OK, keys or settings missing)

- **Crypto deposit (CCPayment):** set `CCPAYMENT_*` on live. The webhook already fails closed without the secret (`crypto.service.js:377–381`).
- **Gateways (A-Pay, UPI, CricPay, WayPay):** callbacks are refused while the keys are empty (`psp/psp.service.js:72,266`, `providers/index.js`). Before adding keys:
  - whitelist the server IP;
  - make sure the CricPay payload-digest table (migration 012) is migrated, because it is CricPay's only replay guard.
- **JSGames keys:** empty (already flagged in FEATURES.md).
- **Not deployed yet (local or uncommitted only):** migrations **110–117** (117: the sports wager sync cursor) (turnover targets, manual payment control, cashier limits, realtime notify, fiat deposit `claimed_amount`, avatars), the daily withdrawal limit, `agentTree` on `/user/auth/me`, and the sports statement controller fix (`UserStatementController.mjs`: `users.user_id`, not `id`, because live `/account-statement-direct` returns 500).
  - **Deploy:** run `db:migrate`, then restart the user, admin, casino, sports and gateway services.

---

## FEATURES.md corrections (no backend change)

- §4: remove "Indian games" (no such flag; removed in `casino/.../games.constants.js:14`). Add `welcomepack`. The lobby count is ≈1,975, not 1,980.
- §6: add cashier min/max per currency (Super Admin only), the owner's daily withdrawal limit per currency, and the KYC / wager / deposit-cap switches.
- §1: add "Daily withdrawal limit per currency — OFF".
- §2: Raffles is ❌, not ✅. Challenges has no backend (item 10).
- Default currency: it is the coin screens open on (deposit dialog, admin reports). A new player is not given a default wallet.
- §8: "Sports switch" is owner panel only (§9); the admin route was removed. Add admin Content → Avatars and Super Admin cashier limits.
- §9: add the daily withdrawal limit (Withdrawals tab). The owner Cashier tab was removed.
- Deposit fiats are hard-coded to INR on the player site (`frontend/src/config/hiddenFeatures.js:18`, `pages/Deposit/FiatTab.jsx:402`). That is a frontend item, but say so in the doc.

---

## Checked and OK

- **Business model, region, aggregator:** public sign-up is enforced (`auth.service.js:453`). Region restriction notice/block works. The aggregator is `js_games` (`catalogueSwitch.js:30`).
- **Deposit and withdrawal modes, global switch:** deposit/withdrawal mode `both` is enforced on every rail. The global withdrawal switch is enforced on fiat, crypto, P2P and gateway (`packages/common/src/withdrawBlock.js:48`, `cryptoWithdraw.service.js:506`), needs `WALLET_ADJUST` plus the owner and password, and is audited.
- **Manual payments:** the manual deposit and withdrawal switches are enforced. A bank reference cannot be reused (unique index), and crypto `txid` has a partial unique index. A deposit approval never credits more than was claimed, and crediting less needs a reason.
- **Withdrawal rules and limits:** KYC is enforced for direct users only. Withdrawal requirements and the deposit cap match the code. Agent-tree players are kept off the player deposit and withdraw rails.
- **Feature gates:** VIP, Promotions, Bonus, Affiliate, Races, Vault and Swap are gated with `requireFeature`. The OFF features (Tips, P2P, Spin wheel, Gift cards, Club, Chat, Blog) are gated too. The provider and product flags are enforced server-side, and the sports kill switch works (`sports/src/lib/sportsEnabled.js`).
- **Bonuses:** the first-deposit bonus tiers and caps are correct, with a 30-day expiry job. Register bonus is OFF and that is respected. The affiliate bonus of 20 is paid only after the referred player deposits.
- **Staff money and admin routes:** direct-wallet adjust and owner add-balance require `WALLET_ADJUST`, Super Admin (non-executive), a transaction password and an audit entry. Staff, locks, player patch/delete and KYC have proper permissions and audit entries.
- **Live coins and flags:** live coins are INR, USDT on TRC20 and BTC. The other coins are off. Live flags match the doc for products, providers and home sections.
