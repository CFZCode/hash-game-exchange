# The other provider modules, and the casino modules around them

`M` = `backend/services/casino/src/modules`. Every module is auto-loaded by `services/casino/src/app.js`, so all of them are **mounted**. Most are **dead in practice**: their keys are unset or undeclared.

> **Config trap:** `loadEnv` (`packages/common/src/env.js`) parses with zod and drops every key `config.js` does not declare. A key that is in `.env` but missing from `config.js` is always `undefined`. Tests inject their own config, so they never notice.

## x-casino: the XGaming / GamingHub360 seamless aggregator (`M/x-casino`)

- **Env:** `XCASINO_SECRET`, `XCASINO_ALLOW_LEGACY_HASH`, `XCASINO_GAMERUN_URL`, `XCASINO_GAMERUN_URL_ALT`, `XCASINO_PRIMARY_VENDORS`, `XCASINO_ALLOW_INSECURE` and `XCASINO_ID`.
  - **None of these is declared in `config.js`, so the module is dead.** Every callback is refused with code 60 ("no secret"), and every launch answers `503 XCASINO_NOT_CONFIGURED`. Fixing that means declaring the keys first.
  - The legacy secret `SECREATEkEYCASINO` is in git history and must be rotated (`docs/ROTATION.md`).
- **Outbound:** no server-to-server calls. Launch only builds a `gamerun` URL on the primary or alternate host (https only), with the query `mode, game_id, session, currency, language, casino_id, home_url, device`.
- **Callbacks:** public, always HTTP 200. The routes are `POST /api/v1/casino/x-casino/{authenticate,balance,changebalance,status,cancel}`; the legacy paths `/api/casino/*` are rewritten to them.
  - **Envelope:** `{command, request_timestamp, hash, data}`.
  - **New hash:** `sha1(command + request_timestamp + rawBody + SECRET)`. This scheme is ours, so the provider must agree to it.
  - **Legacy hash:** `sha1(command + request_timestamp + SECRET)` does not cover `data`. It is accepted only with `XCASINO_ALLOW_LEGACY_HASH`, which logs at WARN.
  - **Freshness:** at most 5 min old and at most 60 s in the future.
  - **Response hash:** `sha1(status + response_timestamp + SECRET)`.
  - **Error codes:** 60, 61, 70, 74, 75 and 90.
- **Launch:** `POST /api/v1/casino/x-casino/launch` (player token).
  - Body: `{ gameId:int, currency (a COIN_COLUMNS key), mode real|demo|fun, language, homeUrl, device, vendor, title }`. `user_id` is refused.
  - Guards: `refuseCustomCurrencies('GAMES')` and `catalogued` (gameId must be an enabled `apigames` row; the body `vendor` is overwritten with the row's) then `requireGameEntitled({provider, type})` from that row.
  - Writes a `game_runs` row (32-byte hex session, 12 h TTL) and answers `201 { gameRunUrl, session }`.
- **Other routes:** `GET /api/v1/casino/x-casino/balance?currency=`.
- **Catalogue:** none of its own. XGaming games live in `apigames` (see x-gaming).
- **Currencies:** the 21 `COIN_COLUMNS` (INR, PKR, USDT, USDC, BTC, ETH, …), each mapping to the `credits` column of the same name. A session currency mismatch is refused.
- **Money:** this module **bypasses WalletClient and writes `credits` directly**: a guarded `UPDATE … WHERE col >= amt` for a bet, `increment` for a win or refund. That means no user-service ledger row. Keep this in mind before going live.
  - Idempotency: `transactionscasino` UNIQUE(`transaction_id`) and `game_runs` UNIQUE(`session_id`), both from migration 028. A replay returns the stored `balance_after`.
  - `cancel` reverses a BET only (as a REFUND row with `cancel:<txid>`), then calls `reverseActivity(outbox:true)`.
  - The wager feed source is `xcasino`.
- **Tests:** `M/x-casino/__tests__/xCasino.test.js`, about 36 cases. They cover the signature (tamper, legacy flag, stale or future), validators (SQL in currency, `user_id`), idempotent and concurrent debits, overdraw, cancel, and the wager feed and outbox.

## x-gaming: the `apigames` listing (`M/x-gaming`)

- **What it does:** read-only public listing over the local `apigames` table. No env, no upstream, no money, no tests.
- **Routes:**
  - `GET /api/v1/casino/x-gaming/by-vendor`: lists `enabled=1` only.
  - `GET /api/v1/casino/x-gaming/vendors`.
  - `GET /api/v1/casino/x-gaming/games/search`: does NOT filter `enabled`, and ranks only within the current page.
  - Legacy paths `/xGaming/*`.
- **Data:** there is no import script for `apigames`; it holds whatever the DB dump had (0 rows on dev). Its games would launch through x-casino, which is dead.
- **No entitlement guard:** a non-entitled site still lists these games.

## seamless: the GSI operator at gsimw.com (`M/seamless`)

- **Env** (all declared):
  - `SEAMLESS_SECRET_KEY`, `SEAMLESS_OPERATOR_CODE`: empty means refuse. The legacy key was hard-coded at `legacy/index.js:2376`; rotate it.
  - `SEAMLESS_MAX_SKEW_SECONDS` (300).
  - `SEAMLESS_SIGN_MODE` (`legacy` | `full`).
  - `SEAMLESS_OPERATOR_BASE_URL`: the default is the **staging** host `https://staging.gsimw.com/api/operators`.
  - `SEAMLESS_TIMEOUT_MS`, `SEAMLESS_LAUNCH_CURRENCY` (`USD`) and `SEAMLESS_LOBBY_URL`.
- **Outbound** (`provider/operatorClient.js`):
  - **Sign:** `md5(request_time + SECRET + action + operator_code)`, with `request_time` in unix seconds.
  - **Calls:**
    - `GET /available-products`
    - `GET /provider-games`
    - `POST /launch-game`
  - **Launch password:** an HMAC-SHA256 of `launch:<member>` truncated to 32 hex. Legacy sent the user's bcrypt hash instead.
- **Callbacks:** `POST /api/v1/casino/seamless/{balance,withdraw,deposit,transfer,rollback,cancel,pushbet}`. Public, limited to 6000/min, always 200 `{code, message, before_balance, balance}`.
  - **Checks:**
    - `operator_code` must match.
    - `request_time` must be within the skew. It is a datetime string, while outbound uses unix seconds; check which one the provider really sends.
  - **Sign:**
    - `legacy`: `md5(operator_code + request_time + action + SECRET)`. It covers the action only, so a captured sign is good for any member or amount for 5 min.
    - `full`: `sha256(operator_code + request_time + action + member_account + sorted id:amount + SECRET)`.
  - **Compare:** constant-time.
  - **Idempotency:** `seamless_transactions` UNIQUE(`transaction_id`, `action`) (migration 015). The row is inserted before the wallet move, in one transaction.
- **Launch** (player token, `refuseCustomCurrencies('GAMES')`):
  - `POST /api/v1/casino/seamless/launch`
    - Body: `{ productCode, gameType, gameCode? }`.
    - Guard: `requireGameEntitled({uid: gameCode, provider: productCode, type: gameType})`.
    - Answers 201 with the **raw provider body**; there is no fixed URL field.
  - `GET /products` and `GET /games` are fetched live from upstream with no table and no cache.
- **Currencies:** about 70 codes are accepted, but **everything settles in USDT**. The thousands currencies (`IDR2`, `KRW2`, `VND2`, …) are scaled ×1000 inbound and ÷1000 on the quoted balance.
- **Money:** WalletClient with ref `{type:'SEAMLESS', id}`. Rollback and cancel use OUR stored amount, and a reversed stake goes through `reverseActivity(outbox:true)`.

  | action | wallet call | ledger reason |
  |---|---|---|
  | `withdraw`, `pushbet` | debit | `BET_STAKE` |
  | `deposit` | credit | `BET_PAYOUT` |
  | `transfer` | either direction | `BET_PAYOUT` |
  | `rollback` | opposite of the original | `BET_ROLLBACK` |
  | `cancel` | opposite of the original | `BET_REFUND` |
- **Tests:** `M/seamless/__tests__/seamless.test.js`, about 28 cases. They cover retries, a half-applied batch, every sign refusal, full mode, IDR2 scaling, rollback, and the wager feed. The operator client and launch have no tests.

## aggregators: Asia (asiaapi.net), Nexus (`gold_api`), EVO (`M/aggregators`)

- **Callbacks only:** no launch and no catalogue. Each call settles bet and win together as one net delta.
- **Env:** `AGGREGATOR_ASIA_SECRET`, `AGGREGATOR_NEXUS_SECRET`, `AGGREGATOR_EVO_SECRET`. An empty secret refuses every call.
- **Routes:** public, limited to 6000/min, always 200.

  | Route | Legacy path | Request | Idempotency key |
  |---|---|---|---|
  | `POST /api/v1/casino/aggregators/asia` | `/processRequest` | `cmd` `getBalance`\|`writeBet` | `tradeId` |
  | `POST /api/v1/casino/aggregators/nexus` | `/gold_api` | `method` `user_balance`\|`transaction` | `txn_id` |
  | `POST /api/v1/casino/aggregators/evo` | `/callback_evo` | flat bracketed keys such as `event[data][user][agregator_user_id]` | `round_id` |
- **Verification:** only a shared secret in the `x-aggregator-key` header, compared constant-time. There is no signature, no timestamp and no IP allow-list, and each provider must be told to send the header.
- **Idempotency:** `aggregator_transactions` UNIQUE(`aggregator`, `transaction_id`) (migration 017).
- **Money:** WalletClient with one call per transaction. A credit uses `BET_PAYOUT` and a debit `BET_STAKE`, with ref `{type:'AGGREGATOR', id:'<agg>:<txid>'}`.
  - Settled in USDT; Asia's responses say `USD` for display only.
  - The wager feed source is `agg-<name>`.
  - **No refund or rollback path, and no outbox.**
- **Gotcha (EVO):** the service reads flat bracketed keys. `express.urlencoded({extended:true})` parses a form post into nested objects, so a real form-encoded EVO callback would answer "bad payload". It only works if EVO posts JSON with literal bracketed keys. This is untested over HTTP.
- **Tests:** `M/aggregators/__tests__/aggregators.test.js`, about 24 cases. They call the service directly.

## catalogue: Nexus and GamingHub360 reads, plus the `apigames` lobby (`M/catalogue`)

- **Upstreams:**
  - **Nexus** (`nexusggreu`): `POST` with `{method: game_list|game_launch, agent_code, agent_token, …}` in the body.
  - **Hub** (GamingHub360): `GET /api/casino/games/list` and the jackpots endpoint with header `X-Auth`.
  - **Env:** `CASINO_NEXUS_URL`, `CASINO_NEXUS_AGENT`, `CASINO_NEXUS_TOKEN`, `CASINO_HUB_URL`, `CASINO_HUB_KEY`, `CASINO_ALLOW_INSECURE`.
  - **Dead:** none of these keys is declared in `config.js`, and the container injects no `http` client.
- **Routes:**
  - `GET /api/v1/casino/catalogue/{games,vendors}` read the local `apigames` table.
  - `/hub/*`, `/jackpots` and `/nexus/games` are the upstream reads.
  - `POST /api/v1/casino/catalogue/launch` (player): body `{providerCode, gameCode, language?}`, answers `{launchUrl}`.
  - `POST /api/v1/admin/casino/catalogue/images/sync` (`config:write`): copies artwork from `gis_games` to `gisgamesnew` by name.
- **Money:** none. The Nexus wallet is the `aggregators` `/nexus` callback.
- **Tests:** none.

## Casino modules that are not providers

- **in-house:** the 20 originals, socket only (`sockets.js`, `engine/`). This module **does not use WalletClient**:
  - It debits and credits `credits` directly inside a DB transaction and writes `bets`.
  - Its wager source is `inhouse`; a refund goes through `reverseActivity(outbox:true)`.
  - It still consults the legacy `house` "canProfit" rigging (`engine/gameEngine.js`).
  - Tests: `inHouse.test.js`, 51 cases.
- **house:** admin counters over the `house` table and the ticker, at `/api/v1/admin/casino/house`. No money.
- **wager-report:** internal only.
  - `GET /internal/casino/wager/race-points` (races): a UNION over `bets`, `gis_transactions`, `js_game_transactions` and `game_transactions`.
  - `GET /internal/casino/wager/turnover/:userId` (gift cards).
- **bet-history:** read-only history across `bets` (in-house), `gis_transactions`, `js_game_transactions` (V1) and `game_transactions` (V2). It does not read the seamless, aggregator or x-casino tables. Tests: `betHistory.test.js` and `profileStats.test.js`.

## The reverse outbox

`games.service.js` provides two calls into user-service:
- `recordActivity` posts `/internal/user/wager/record`. It counts the stake for VIP, rakeback, races and wagering.
- `reverseActivity` posts `/internal/user/wager/reverse`.

When `reverseActivity` is called with `outbox:true` and the call fails, the reversal is queued:
- It is inserted into `wager_reverse_outbox` (migration 090, UNIQUE(`source`,`ref`,`refund_ref`)).
- The user-service worker (`services/user/src/modules/wager/reverseOutbox.service.js`) retries it.

Which modules use the outbox:

| Use the outbox | Never reverse |
|---|---|
| gis, seamless, x-casino, in-house | js-games, aggregators |

A refund must never fail because the counter call failed.
