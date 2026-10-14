# JSGames: V1 (huidu.bet) and V2 (xgames API), module `js-games`

`M` = `backend/services/casino/src/modules`. One module, `M/js-games` (basePath `/js-games`), holds two upstreams. `jsGames.factory.js` builds one `HuiduClient` (V1) and one `XGamesApiClient` (V2) per container.

**V2 is the live one.** It serves the whole current lobby, and also LuckySports, the TFGaming and DPEsports esports books and the live-casino lobbies.

## Shared env

- `JSGAMES_CALLBACK_URL`: where the provider sends its bet callbacks.
- `JSGAMES_HOME_URL`: where a player lands on exit.
- `JSGAMES_MAX_SKEW_SECONDS` (default 300).
- `JSGAMES_TIMEOUT_MS` (default 15000).
- `JSGAMES_REQUIRE_BET_FOR_WIN` (default true; V2 only).

## V2: gamesv2.ibitplay.com (`providers/xgamesApi.js`)

### Env

- `JSGAMES_V2_BASE_URL` (default `https://gamesv2.ibitplay.com/api/game`): the game API (launch, `/games`, `/games/search`).
- `JSGAMES_V2_USER_BASE_URL` (default `https://games.ibitplay.com/api/user`): the user API (history).
- `JSGAMES_V2_API_KEY`, `JSGAMES_V2_API_SECRET`. The legacy secret was committed in plain text and must be rotated.

### Outbound signing

- **Signature:** HMAC-SHA256 hex with the api secret, over the sorted `key=value&…` of the params. `undefined` and `null` values are dropped first, because they would break the signature.
- **Headers:** `x-api-key`, `x-timestamp` (epoch milliseconds) and `x-signature`.
- **What is signed:**
  - A GET signs only `{timestamp}`; its query string is not signed.
  - A POST signs its body fields plus `timestamp`.
- **Upstream error codes:**
  - `20001`: unknown key
  - `20004`: bad signature
  - `10003`: stale timestamp
  - `10004`: rejected request

### Inbound callback: `POST /api/v1/casino/js-games/v2/bet-callback`

- **Route:** public, limited to 6000/min. The legacy path `/jsGamesv2/bet-callback` is rewritten by the gateway. It always answers HTTP 200 `{ success, new_balance | error }`.
- **Verification** (`xgamesApi.js` `verify`):
  - All three `x-*` headers must be present.
  - The api key is compared constant-time.
  - The timestamp must be within the skew.
  - The signature is HMAC-SHA256 over `{...parsed body, timestamp}`.
  - `verify()` returns `null` on success. Never write `verify() ?? 'not configured'`.
- **Body checks** (`jsGames.service.js` `betCallbackV2`):
  - `user_id` must be a positive integer.
  - The currency must be on the allow-list.
  - `game_round` is required and must not be `'unknown'`; it is the idempotency key.
  - `bet_amount` and `win_amount` may be negative (corrections).
  - A `balance` in the body is ignored.
- **Settlement:** `delta = win - bet`, and the type comes from `settlementType()` (9 labels).
- **`JSGAMES_REQUIRE_BET_FOR_WIN`:** a pure win (bet 0, win > 0) needs an earlier stake row for the same user and round. Otherwise it is refused with "No matching bet for this round".
- **Idempotency:** `game_transactions` is UNIQUE (`external_transaction_id`, `transaction_type`) (migration 045). The wallet ref is `{type:'JSGAMES', id:'v2:<round>:<type>'}`. A duplicate answers `success` with `duplicate: true`. A second stake of the same type on the same round is swallowed as a duplicate.
- **Round ids are not unique across players.** Under the 045 key, player B's stake on a round id player A already used is answered `duplicate: true` and B's money does not move. This repo has fixed it: migration `095-game-transactions-per-user-key.js` re-keys the table to (`user_id`, `external_transaction_id`, `transaction_type`). casino-sportsbook and the hub still have the 045 key.
- **Stored amounts are signed deltas:** `bet` rows are negative and `win` rows positive (dev DB: 1,776 negative bet rows, 688 positive win rows).

### Launch

- **Route:** `POST /api/v1/casino/js-games/v2/launch` (player token).
  - Body (strict): `{ gameUid, currencyCode: INR|USDT|USD, language? }`.
  - Upstream body: `{game_uid, user_id, credit_amount (the real balance), currency_code, language, name}`.
  - Answers `201 { gameLaunchUrl, sessionToken }` and writes a `game_sessions` row.
  - It does **not** check that the uid is in `js_games`.
- **Currency in practice:** the upstream operator only takes INR. A USDT or USD launch fails with `Game launch failed (10004)`.
- **The lobby** launches through `POST /api/v1/casino/games/launch`, which routes non-Slotegrator rows here and answers `{ gameLaunchUrl, via:'jsgames-v2' }`.

### Lists and history

- `GET /api/v1/casino/js-games/v2/games` and `/games/search` are pass-through proxies to upstream `/games` and `/games/search`. **Upstream refuses both for our key: 400, code 10004.** This is why the catalogue cannot be re-fetched and why the aggregator switch parks rows instead of deleting them.
- `GET /api/v1/casino/js-games/v2/history` (player) and `GET /api/v1/admin/casino/js-games/v2/history` (`casino:read`) read the user API.

### Currencies

`V2_CURRENCIES = { INR: 'INR', USDT: 'USDT', USD: 'USDT' }`. The left side is what the provider sends; the right side is the wallet coin.

## V1: huidu.bet (`providers/huidu.js`)

### Env

- `JSGAMES_V1_BASE_URL` (default `https://huidu.bet`).
- `JSGAMES_V1_AGENCY_UID`.
- `JSGAMES_V1_AES_KEY`: must be exactly 32 bytes, or V1 counts as unconfigured.
- `JSGAMES_V1_PLAYER_PREFIX` (default `h24e9e`).

The legacy key was a static class property and must be rotated.

### Outbound

- **Request:** `POST {base}{path}` with body `{ agency_uid, timestamp, payload: base64(AES-256-ECB(JSON)) }`. There is no HMAC and no auth header.
- **Paths:**
  - `/game/v1`: launch
  - `/game/v2`: transfer
  - `/game/transaction/list`: reconciliation
- **Member account:** `<prefix>_<CURRENCY>_<userId>`.

### Inbound callback: `POST /api/v1/casino/js-games/v1/bet-callback`

- **Route:** public, limited to 6000/min. Legacy path `/jsGames/game/bet-callback`. It always answers 200 `{code, msg, payload}`.
- **Authentication:** being able to decrypt the payload is the only authentication. ECB is malleable and has no MAC.
- **Checks and error codes:**
  - The payload must decrypt (`10004`).
  - The timestamp skew is checked, but **a missing timestamp is accepted**.
  - `serial_number` is required (`10022`).
  - The member account must parse.
  - The currency must be on the allow-list (`10013`).
  - Insufficient funds answer `10025`.
- **Idempotency:** a partial UNIQUE index on `js_game_transactions.serial_number` (migration 016). Its rows are written with status `processed`.

### Launch and admin

- **Launch:** `POST /api/v1/casino/js-games/v1/launch`.
  - Body: `{ gameUid, currencyCode: INR|BDT|USDT|IDR, language?, homeUrl? }`. Answers `201 { gameLaunchUrl, sessionToken }`.
  - The game must be active in `js_games`.
- **Admin transfer:** `POST /api/v1/admin/casino/js-games/v1/transfer` (`wallet:credit`).
  - Our wallet moves first (`TRANSFER_OUT` or `TRANSFER_IN`, ref type `JSGAMES_TRANSFER`). If the provider call then fails, it is reversed with ref type `JSGAMES_TRANSFER_REVERSAL`.
  - The transfer id is deterministic (sha256 of userId:gameUid:type:amount:currency), so two identical legitimate transfers collide.
- **Admin transactions:** `POST /api/v1/admin/casino/js-games/v1/transactions` proxies `/game/transaction/list`.

### Currencies

`V1_CURRENCIES = { INR: 'INR', BDT: 'BDT', USDT: 'USDT', IDR: 'USDT' }`.

## Catalogue (no provider sync)

There is **no sync** for JSGames. The 1,980 games come from the seeder `backend/packages/db/seeders/004-provider-game-catalogue.js`, which reads `seeders/data/js-games.csv`. It writes:
- `js_games` (`ON CONFLICT (game_uid)`)
- `gisgamesnew`, with `uuid = game_uid`; `aggregator` takes its default `'js_games'`
- `gis_providers` and `gis_providers_new` (the 14 short vendor keys)
- the collection tables

`js_games` also holds the 22 in-house rows (seeder `002-inhouse-games.js`), which `gisgamesnew` does not have.

**Curation** (`jsCuration.*`, table `js_game_curation`, migration 040):
- Each row has a scope `vendor|type|collection` and a list of up to 500 uids; unknown uids are refused.
- Collections: `trending`, `hot`, `live-casino`, `popular-slots`, `crash`, `indian`.
- Admin routes are under `/api/v1/admin/casino/js-games/v1/` (`curation/:scope/:key`, `catalogue/search`, `catalogue/:gameUid/icon`, `vendors`, `types`, `collections`). The public route is `GET /api/v1/casino/js-games/v1/collections/:collection`.

## Money

- Everything goes through WalletClient. JSGames never writes `credits` itself.
- **Callbacks:** a debit uses `BET_STAKE` and a credit uses `BET_PAYOUT`, with ref type `JSGAMES` (`v1:<serial>` or `v2:<round>:<type>`). The `ledger_id` is written back onto the row.
- **Wager feed:** `games.recordActivity` (source `jsgames-v1` with ref = serial, or `jsgames-v2` with ref = round) after a fresh stake.
- **No `reverseActivity` and no outbox.** A V2 negative correction moves the wallet but does not un-count the wager or rakeback.

## Tests

- **`M/js-games/__tests__/jsGames.test.js`** (about 36 cases, needs the test DB):
  - V2:
    - body `balance` ignored; type named from the amounts
    - win without a bet refused, unless the flag is off
    - unsigned, tampered, replayed and `'unknown'`-round callbacks refused
    - retries and concurrent retries settle once
    - wager counted once per round
  - V1: decrypt, serial, account, currency and stale refusals; a retried win pays once.
  - Transfer: debits first and refunds on failure.
  - Client: AES round trip, a key that is not 32 bytes, HMAC properties.
- **`M/js-games/__tests__/jsCuration.test.js`** (8 cases).

## Gotchas

- **The V2 signature is computed over the PARSED body.** If the provider signed its raw JSON, number formatting (`10.50`) or nested objects would differ.
- **Race turnover may be missing JSGames stakes.** `wager-report/raceTurnover.service.js` keeps only `amount > 0` stake rows and filters V1 on status `completed`. Stored stakes are negative deltas and V1 rows are `processed`, so JSGames turnover probably adds nothing to races. Verify before relying on it.
- **Backend has no uid-format check.** It never checks a uid's format (any 1-190 character string). casino-sportsbook's frontend matches `/^[0-9a-f]{32}$/i`.
