# Frontend ↔ backend API contract

Checked on 2026-10-12. The frontend is `frontend/` (the hash-games UI). It was read, not edited.
The backend is `backend/` (SmartBet, casino-sportsbook `91c27d9`), running on the gateway at
`http://127.0.0.1:4700` against `parker567` with the standard seed
(`seed-data.js --demo`) and the owner plan for template `bcgame`.

**Method.** Every call site in `frontend/src/services/*.js` that passes `live: true` is listed below,
together with the token refresh in `client.js`, which also calls the backend. Each one was called on
:4700 with the body and query the service sends, signed in as a seeded demo player where the route
needs one (`demo_multicoin`, plus `demo_vault`, `demo_affiliate`, `demo_depositor` and `demo_bonus`
for rows the first one does not have). The answer was compared with the fields the service's mapper
reads. Writes that would move money were sent with values that cannot succeed, such as an amount
above the balance or an unknown id. If the answer is a business error (402/404/409) and not
`422 VALIDATION_ERROR`, the `.strict()` validator accepted the frontend's body. The frontend unwraps
the platform envelope `{success, data, meta}` in `client.js` (`unwrap`, `requestPage`), so "returns"
below means `data` (and `meta`).

**Old backend.** The frontend was wired to `cfz/hash-games/backend copy`, which is older than
SmartBet. I regenerated the route inventory of both trees with `tools/api-surface.js`: old 650
routes, new 762. **No non-internal route of the old backend is missing in SmartBet.** No
backward-compatible alias was needed, so none was added.

## Summary

- **64 rows checked (a few rows group a read with its writes, 70 calls in all): 63 OK, 1 MISMATCH.**
- MISMATCH: `GET /api/v1/casino/js-games/v1/games` (BC Originals list). Fix it in the services
  layer, see below.
- Some calls are OK on the contract but cannot succeed until provider credentials are set. They are
  marked *config* in the table: in-house game launch (`JSGAMES_*`) and e-mail OTP (SMTP).

## The mismatch

| endpoint | frontend expects | new backend returns | status | fix side |
|---|---|---|---|---|
| `GET /api/v1/casino/js-games/v1/games` (`services/originals.js` `getOriginals`) | All in-house originals (`js_games` rows `{game_uid, game_name, game_type, is_active}`) in one unparameterised call. The old DB's `js_games` held only the 22 in-house rows. | `200`, but `js_games` now also holds the imported provider catalogue (2002 rows, seeder `004-provider-game-catalogue`), and the route pages 20 at a time by id. Without parameters it returns 4 in-house games (dice, crash, limbo, coinflip) and 16 bgaming slots. The other 18 originals are on later pages. | **MISMATCH** | **Services layer**: call it with `params: { vendor: 'in-house', per_page: 100 }`. Checked: this returns all 22 in-house games in one page (`meta.pagination.total = 22`). The validator `listGames` is `.strict()` and accepts exactly `page`, `per_page` and `vendor`. No backend change is needed. |

## Every call

`P` = public, `U` = player token. Statuses are what :4700 answered.

| # | endpoint | caller | frontend expects | new backend returns | status | fix side |
|---|---|---|---|---|---|---|
| 1 | `GET /api/v1/admin/site-config/public` (P) | `siteConfig.js` | Flat flag map; reads the lower-cased currency flags (`inr`, `cryptocoin`, `btc`…), and a missing key means on | `200` flat object (casino… `inr`, `eur`, `cryptocoin`, `btc`… + amounts) | OK | — |
| 2 | `GET /api/v1/admin/banners` (P) | `banner.js` | Array of `{type, url, active}` | `200` `[]`, `meta.total = 0` (no banners uploaded yet) | OK | — |
| 3 | `GET /api/v1/casino/bet-history/live?limit=30` (P) | `home.js` `getLatestBets` → `toBetRow` | Rows `{reference, game, at, amount, profit, currency}` | `200` `[]` (the seed places no bets); `liveFeed()` builds rows with `reference`, `game`, `at`, `amount`, `profit` and `currency` | OK | — |
| 4 | `GET /api/v1/casino/bet-history/top-wins?limit=30` (P) | `home.js` `getHighRollers` | Same row shape as #3 | `200` `[]`; `topWins()` uses the same row shape | OK | — |
| 5 | `GET /api/v1/casino/js-games/v1/games` (P) | `originals.js` | See above | See above | **MISMATCH** | services |
| 6 | `GET /api/v1/user/profile/:userId/public` (P) | `profile.js` | `{username, avatar, level, card, joinedAt, bets, wins}` | `200` `{userId, username, avatar, joinedAt, level, card, gamesPlayed, bets, wins}` | OK | — |
| 7 | `POST /api/v1/user/auth/login` (P) `{identifier, password, twoFactorCode?}` | `auth.js` `login` | `{accessToken, refreshToken}` → `setTokens` | `200` `{accessToken, refreshToken, expiresAt, tokenType, user}` | OK | — |
| 8 | `POST /api/v1/user/auth/refresh` (P) `{refreshToken}` | `client.js` `refreshSession` | `{accessToken, refreshToken}`; a replayed token is refused | `200` new pair; a replay gets `401 AUTH_REFRESH_TOKEN_REUSED` | OK | — |
| 9 | `POST /api/v1/user/auth/register` (P) `{username, email, password, referredBy?}` | `auth.js` `register` | Body accepted, then login | The validator accepts this body (`.strict()`). A duplicate gets `409 AUTH_ALREADY_REGISTERED` | OK | — |
| 10 | `POST /api/v1/user/auth/forgot-password` (P) `{email}` | `auth.js` | Success | `200` `{requested}` | OK | — |
| 11 | `POST /api/v1/user/auth/reset-password` (P) `{token, newPassword}` | `auth.js` | Success / error code | Bad token → `400 AUTH_RESET_TOKEN_INVALID` (body accepted) | OK | — |
| 12 | `POST /api/v1/user/email/otp` (P) `{email, purpose:'change-email'}` | `auth.js` `requestEmailOtp` | Success | `502 EMAIL_SEND_FAILED`: the body is accepted, but SMTP is not configured (`SMTP_HOST` is empty) | OK (*config*) | Set SMTP in `backend/.env` |
| 13 | `GET /api/v1/user/profile` (U) | `auth.js` `loadAccount` | `{id, username, email, avatar, country, level, referralCode, referralLink, twoFactorEnabled, joinedAt}` | `200` with all of these, plus `phone`, `status`, `gamesPlayed`, `lastLoginAt`, `joinedAtEstimated` | OK | — |
| 14 | `GET /api/v1/user/wallet/balances` (U) | `auth.js` `toWalletRows` | Map of currency code → decimal string | `200` `{BTC: "…", …, INR, EUR, BDT}` (27 coins) | OK | — |
| 15 | `GET /api/v1/user/preferences` (U) | `auth.js`, `settings.js` | `{emailNotifications, …}` | `200` `{uid, theme, language, emailNotifications, pushNotifications, hideBalance, updatedAt}` | OK | — |
| 16 | `PATCH /api/v1/user/preferences` (U) `{<field>: value}` | `settings.js` | The updated preferences | `200`, same shape as #15 | OK | — |
| 17 | `GET /api/v1/user/bonus` (U) | `auth.js` (VIP ring), `rewards.js` | `{vip:{level, progressPct}, currency, types:{daily,weekly,monthly:{amount, claimable, …}}}` | `200` same (`types.*` also carry `minVipLevel`, `eligible`, `award`, `nextClaimAt`, `totalPaid`) | OK | — |
| 18 | `POST /api/v1/user/bonus/claim/:type` (U) | `rewards.js` | Success / error code | `403 BONUS_VIP_LEVEL_TOO_LOW` for a VIP-0 player (route and `noBody()` accept the call) | OK | — |
| 19 | `POST /api/v1/user/bonus/redeem` (U) `{code}` | `rewards.js` | Success / error code | `404 BONUS_CODE_NOT_FOUND` for an unknown code (body accepted) | OK | — |
| 20 | `GET /api/v1/user/rakeback` (U) | `rewards.js` | `{amount, currency, claimable, minimum, rate}` | `200` same, plus `amountUsd` | OK | — |
| 21 | `POST /api/v1/user/rakeback/claim` (U) | `rewards.js` | Success / error code | `409 RAKEBACK_NOTHING_TO_CLAIM` | OK | — |
| 22 | `GET /api/v1/user/auth/sessions` (U) | `auth.js`, `settings.js` | Rows `{id, ip_address, user_agent, device_label, last_used_at}` | `200` same, plus `created_at`, `expires_at` | OK | — |
| 23 | `DELETE /api/v1/user/auth/sessions/:id` (U) | `auth.js` `revokeSession` | Success | `200` `{revoked}` | OK | — |
| 24 | `POST /api/v1/user/auth/logout` (U) | `auth.js` `logout` | Success, or ignored | `200` `{revokedSessions}` | OK | — |
| 25 | `POST /api/v1/user/auth/change-password` (U) `{currentPassword, newPassword}` | `auth.js` | Success / error code | Wrong current password → `403 AUTH_CURRENT_PASSWORD_INCORRECT` (body accepted) | OK | — |
| 26 | `PUT /api/v1/user/profile` (U) `{username}` | `auth.js` | The profile | `200`, same shape as #13 | OK | — |
| 27 | `POST /api/v1/user/profile/change-email` (U) `{email, code}` | `auth.js` | Success / error code | Bad code → `400 EMAIL_OTP_INVALID` (body accepted) | OK | — |
| 28 | `GET /api/v1/user/exchange-rate/rates` (P/U) | `exchangeRate.js` | Rows `{currency, usdRate}` | `200` 25 rows `{currency, usdRate, lastUpdated}` | OK | — |
| 29 | `GET /api/v1/user/wallet/ledger?currency&limit&offset` (U) | `transaction.js` `getBillRecords` | Rows `{id, amount, balance, created_at, currency, description, reason}` + `meta.pagination` | `200` same (+ ledger columns), `meta.pagination` | OK | — |
| 30 | `GET /api/v1/user/history/deposits?limit&offset&from&to&currency&status` (U) | `transaction.js` | Rows `{id, reference, amount, currency, status, date, method}` + `meta.pagination` | `200` same (+ `details`, `kind`, `type`, `userId`) | OK | — |
| 31 | `GET /api/v1/user/history/withdrawals?…` (U) | `transaction.js` | Same as #30 | `200` same (+ masked `destination`) | OK | — |
| 32 | `GET /api/v1/casino/bet-history?page&limit&from&to` (U) | `betHistory.js` | Rows `{transaction_id, game_title, transaction_timestamp, amount, profit, currency}` + `meta.pagination.totalPages` | `200` `[]` + `meta.pagination` (no bets seeded); `myHistory` row builder uses these field names | OK | — |
| 33 | `GET /api/v1/casino/bet-history/stats` (U) | `profile.js` | `{bets, wins}` | `200` `{bets, wins, bySource}` | OK | — |
| 34 | `GET /api/v1/user/swap/estimate?fromCurrency&toCurrency&amount` (U) | `swap.js` | `{usdRateFrom, usdRateTo, feePercentage, converted, feeAmount}` | `200` same (+ `amountAfterFee`) | OK | — |
| 35 | `POST /api/v1/user/swap` (U) `{fromCurrency, toCurrency, amount}` | `swap.js` `submitSwap` | The completed order / error code | Over balance → `402 SWAP_INSUFFICIENT_BALANCE` (body accepted) | OK | — |
| 36 | `GET /api/v1/user/notifications?unreadOnly&limit=50` (U) | `notification.js` | Rows `{id, type, title, body, read, createdAt}` + `meta.total` | `200` same (+ `data`, `readAt`, `delivered`); `meta {total, limit, offset, page}`. New `type`s (e.g. `tip_received`) fall into the frontend's "system" bucket. | OK | — |
| 37 | `POST /api/v1/user/notifications/read-all` (U) | `notification.js` | Success | `200` `{marked}` | OK | — |
| 38 | `POST /api/v1/user/notifications/:id/read` (U) | `notification.js` | Success | `200` `{marked}` | OK | — |
| 39 | `GET /api/v1/user/wager/tasks` (U) | `rollover.js` | `{multiplier, tasks:[{id, label, since, target, currency, status, wagered, remaining, locked}]}` | `200` same. Note: `currency` is now `"USD"` (SmartBet counts the requirement in USD), where it used to be the deposit currency. The frontend maps it to `USDFIAT`, which has coin art. | OK | — |
| 40 | `GET /api/v1/user/kyc/status` (U) | `kyc.js`, `settings.js` | `{kycId, status ('Pending'/'Verified'/'Rejected'/…), documents, rejectionReason}` | `200` same (+ dates, `documentType`, `submitted`) | OK | — |
| 41 | `GET /api/v1/user/kyc/documents/:kycId/:field` (U), field `idFront`/`idBack`/`passport` | `kyc.js` | Image bytes, 404 when absent | Bytes, or 404. The field enum is exactly `idFront`/`idBack`/`passport`, which matches `filesFor()` | OK | — |
| 42 | `POST /api/v1/user/kyc/submit` (U) multipart: 8 text fields + files | `kyc.js` | Success / error code | `409 KYC_ALREADY_PENDING` for a pending player (fields accepted by the `.strict()` validator; `gender`/`documentType` enums match) | OK | — |
| 43 | `GET /api/v1/user/withdrawals/fiat?limit=100` (U) | `withdrawal.js` | Rows `{withdrawalId, …}` | `200` rows `{withdrawalId, amount, currency, accountHolderName, bankName, upiId, status, requestedAt}` | OK | — |
| 44 | `GET /api/v1/user/withdrawals/crypto?limit=100` (U) | `withdrawal.js` | Rows `{id, txid, …}` | `200` `[]` (crypto provider not configured), `meta.pagination` | OK | — |
| 45 | `GET /api/v1/user/deposits/fiat?limit` (U) | `fiatDeposit.js` | Rows `{depositId, transactionId, …}` | `200` same (+ amount, currency, bank, status, `hasScreenshot`) | OK | — |
| 46 | `GET /api/v1/user/deposits/fiat/:id/screenshot` (U) | `fiatDeposit.js` | Bytes, 404 when none | `404 FIAT_DEPOSIT_SCREENSHOT_NOT_FOUND` for a deposit without proof | OK | — |
| 47 | `GET /api/v1/user/affiliate` (U) | `referral.js` | `{referralCode}` (link built locally) | `200` `{referralCode, referralLink}` (link on `PUBLIC_SITE_URL`, http://localhost:5190) | OK | — |
| 48 | `GET /api/v1/user/affiliate/team` (U) | `referral.js` | `{total, members}` | `200` `{referralCode, total, totalWager, wagerCurrency, members[]}` | OK | — |
| 49 | `GET /api/v1/user/affiliate/rewards` (U) | `referral.js` | `{totalAmount, rows}` | `200` `{total, totalAmount, rows[]}` | OK | — |
| 50 | `GET /api/v1/user/affiliate/rewards/unclaimed` (U) | `referral.js` | Array or `{rows}` | `200` `{total, commissionTotal, claimedTotal, currency, rows[]}` | OK | — |
| 51 | `POST /api/v1/user/affiliate/rewards/claim` (U) `{rewardId}` | `referral.js` | Success / error code | `404 AFFILIATE_NOT_YOUR_REWARD` for a foreign id (body accepted) | OK | — |
| 52 | `POST /api/v1/user/affiliate/rewards/claim-all` (U) | `referral.js` | Success / error code | `409 AFFILIATE_NOTHING_TO_CLAIM` | OK | — |
| 53 | `GET /api/v1/user/withdrawals/whitelist` (U) | `settings.js` | `{whitelistOnly, addresses:[{id, label, currency, network, address, memo, createdAt}]}` | `200` same | OK | — |
| 54 | `POST /api/v1/user/withdrawals/whitelist` (U) `{label, currency, address, network?, memo?}` | `settings.js` | The new row | `201` row | OK | — |
| 55 | `PATCH /api/v1/user/withdrawals/whitelist/:id` (U) `{label}` | `settings.js` | The row | `200` row | OK | — |
| 56 | `DELETE /api/v1/user/withdrawals/whitelist/:id` (U) | `settings.js` | Success | `200` `{removed, remaining, whitelistOnly}` | OK | — |
| 57 | `PUT /api/v1/user/withdrawals/whitelist/enforcement` (U) `{enabled}` | `settings.js` | Success | `200` `{whitelistOnly}` | OK | — |
| 58 | `GET /api/v1/user/vault` + `GET /api/v1/user/vault/lock-options` (U) | `vault.js` | `{totals, deposits[]}`; options `[{value, label, days, rate}]` | `200` same (deposit rows `{depositId, coin, balance, principal, lockPeriod, interestRate, startTime, endTime, status, locked, …}`); 4 options | OK | — |
| 59 | `POST /api/v1/user/vault/transfer-in` (U) `{coin, amount, lockPeriod}` / `transfer-out` `{coin, depositId}` | `vault.js` | Success / error code | `402 VAULT_INSUFFICIENT_BALANCE` / `404 VAULT_DEPOSIT_NOT_FOUND` (bodies accepted) | OK | — |
| 60 | `GET /api/v1/casino/games/favourites?limit` (U), `PUT …/favourites/:ref` `{source:'in-house'\|'unknown'}`, `DELETE …/favourites/:ref` | `collection.js`, `pages/Game` | Rows `{game_ref, game:{name, image}\|null}`; PUT/DELETE succeed | `200` rows `{game_ref, source, created_at, game}`; PUT/DELETE `200` `{game_ref, favourite}` | OK | — |
| 61 | `GET /api/v1/casino/games/recently-played?limit` (U) | `collection.js` | Rows like favourites | `200` `[]` (only GIS launches record plays) | OK | — |
| 62 | `GET /api/v1/casino/gis/freespins/mine` (U) | `freePlay.js` | `{total, freespins:[{id, freespinId, gameUuid, game, quantityLeft, currency}]}` | `200` `{total: 0, freespins: []}`; the service's row builder uses these names | OK | — |
| 63 | `POST /api/v1/casino/js-games/v1/launch` (U) `{gameUid, currencyCode}` | `game.js` `launchGame` | Launch URL, or an error the page shows | `503 JSGAMES_NOT_CONFIGURED`. The body is accepted, but the `JSGAMES_V1_*` provider keys are empty, as on the old backend | OK (*config*) | Set the provider keys in `backend/.env` |
| 64 | `POST /api/v1/user/2fa/enable`, `/2fa/setup-verify` `{code}`, `/2fa/disable` `{code, password}` (U) | `twoFactor.js` | `{qrCode, secret}`; then success or error codes | `200` `{qrCode, secret}`; `409 TWOFA_NOT_INITIATED` / bad code; wrong password → `403 TWOFA_PASSWORD_REQUIRED` (bodies accepted) | OK | — |

## Notes for the services layer (not mismatches)

- **Entitlements.** The owner plan for this site, the `bcgame` template, switches **off** spin wheel,
  gift cards, tips, club membership, push notifications and analytics. None of the `live: true`
  calls above hits those, but their player routes answer `403 NOT_ENTITLED`.
  `GET /api/v1/admin/features/public` lists what is on. The services can read it to hide those
  entry points.
- **Origins.** CORS and socket origins allow `http://localhost:5190` and `http://127.0.0.1:5190`
  (preflight checked: `204`, `Access-Control-Allow-Origin: http://localhost:5190`).
  `NEXT_PUBLIC_API_BASE` should be `http://127.0.0.1:4700`, or the frontend can proxy `/api` to it.
- **Demo data.** The probe touched `demo_multicoin`. Its notifications are marked read and it holds
  a started but never-enabled 2FA setup. It also added and then deleted one whitelist address.
  Nothing else changed.
