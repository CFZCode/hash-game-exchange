# Slotegrator: GIS casino (`gis`) and the betting book (`sportsbook`)

`M` = `backend/services/casino/src/modules`. Routes are given as mounted by the gateway (public and user audiences are both on `/api/v1/casino/<basePath>`; admin is on `/api/v1/admin/casino/<basePath>`).

## 1. GIS: Slotegrator casino games (`M/gis`)

Slotegrator's Game Integration Service is a seamless wallet. They host the games; every bet, win, refund and rollback is a signed callback to us. The module covers the callback, launch and demo, the lobby proxy, freespins and vouchers (admin, house only), and the catalogue sync.

### Env (`services/casino/src/config.js`)

| Key | Default | Note |
|---|---|---|
| `GIS_BASE_URL` | `https://gis.slotegrator.com/api/index.php/v1` | |
| `GIS_MERCHANT_ID`, `GIS_MERCHANT_KEY` | none | Missing either key gives every route `503 GIS_NOT_CONFIGURED` and every callback a refusal. The legacy pair was hard-coded in `legacy/gis/controller.js`, is in git history and must be rotated (`backend/docs/ROTATION.md` §8). |
| `GIS_MAX_SKEW_SECONDS` | 300 | Age limit for the inbound `X-Timestamp`. 0 turns the check off. |
| `GIS_RATE_LIMIT_MS` | 1100 | Gap between outbound calls. Slotegrator allows about 1 request per second. |
| `GIS_TIMEOUT_MS` | 15000 | |
| `GIS_RETURN_URL` | none | Where a player lands on exit. Legacy hard-coded `https://addaplay.com/game-exit.html`. |

### Outbound (`gis/provider/slotegrator.js`, `SlotegratorClient`)

- **Headers:** `X-Merchant-Id`, `X-Timestamp` (unix seconds), `X-Nonce` (16 random bytes as hex) and `X-Sign`.
- **`X-Sign`:** HMAC-SHA1 hex, keyed by the merchant key. It is computed over the params merged with those three headers:
  - flattened PHP-bracket style (`a[b]`, `c[0]`);
  - numbers made canonical (`1.50` becomes `1.5`);
  - sorted by key;
  - encoded with `URLSearchParams` (a space becomes `+`, as PHP's `http_build_query` does).

  This must match byte for byte. Do not "simplify" it.
- **Requests:** a GET carries its params in the query string. A POST is `application/x-www-form-urlencoded`.
- **One client per container:** `gis.factory.js` keeps a WeakMap keyed by deps, so every router shares one rate gate. The gate is a promise chain that waits `GIS_RATE_LIMIT_MS` between calls.
- **Paging:** `getAllPages(path, params)` uses `per_page=50` and stops at `_meta.pageCount` or on a short page, with a cap of 500 pages.
- **Upstream errors:** a 4xx becomes `GIS_UPSTREAM_REJECTED` (502). Anything else becomes `GIS_UPSTREAM_FAILED` (502).
- **No `Accept` or `User-Agent` header is sent.** That is irrelevant to the 406 described below, which is an IP whitelist.

### Inbound wallet callback

`POST /api/v1/casino/gis/callback/transactions` (public audience, limited to 6000/min). The gateway rewrites the legacy path `POST /api/gis/callback/transactions` to this one, and the legacy path is the one registered with Slotegrator. The route **always answers HTTP 200**: a 4xx makes Slotegrator retry forever.

**Verification** (`gis.service.js` `#verify`):
- The signature is recomputed over the urlencoded body plus the request's `X-Merchant-Id`, `X-Timestamp` and `X-Nonce`, and compared with `x-sign`. The compare is timing-safe, over the SHA-256 of each value.
- A stale `X-Timestamp` (more than `GIS_MAX_SKEW_SECONDS`), or one that is not a number, is refused as `Invalid X-Sign`.
- `X-Merchant-Id` is not compared with the configured id; it only feeds the HMAC.

**Body checks:**
- `action`, `player_id` and `currency` are required.
- `player_id` must be all digits.
- `currency` must be in `SETTLEMENT_CURRENCY`.
- The player must have a wallet; a 404 from the wallet means `Player not found`.

**Errors:** `{ error_code: 'INTERNAL_ERROR'|'INSUFFICIENT_FUNDS', error_description }`. Balances are strings with 4 decimals.

| action | money | ledger reason | storage id in `gis_transactions` |
|---|---|---|---|
| `balance` | none. If the body has a non-zero `amount` above the balance, answers `INSUFFICIENT_FUNDS` | | |
| `bet` | debit. Refused when the account is `casino_locked` or `system_locked`. Feeds the wager count (`recordActivity`, source `gis`) | `BET_STAKE` | provider `transaction_id` |
| `win` | credit. A casino lock does not block a win | `BET_PAYOUT` | provider `transaction_id` |
| `refund` | credit of the bet named by `bet_transaction_id`. An unknown bet moves nothing. Uncounts the wager through the outbox | `BET_REFUND` | `rf:<betId>`, so a retry under a fresh id collapses onto the same row |
| `rollback` | for each `rollback_transactions[]`: reverses OUR stored amount (a bet is credited back; a win or refund is debited). Unknown ids are skipped. An unfundable debit is logged `NEEDS MANUAL RECONCILIATION` and acknowledged | `BET_ROLLBACK` | `rb:<originalId>` |

**Idempotency** (`#apply`): one DB transaction does three things:
1. `GisTransactions.create`. `gis_transactions.transaction_id` is UNIQUE, so a duplicate returns the current balance and moves nothing.
2. The WalletClient call: ref `{type:'GIS', id: storageId}`, key `casino-service:<REASON>:GIS:<storageId>`.
3. Store `balance_after`.

The response's `transaction_id` is a deterministic uuid-v5 of the provider's id (`gis/responseId.js`). The namespace in `gis.constants.js` must never change.

### Launch

All launch routes need a player token and pass through `refuseCustomCurrencies('GAMES')` and `requireGameEntitled({uid: gameUuid})`.

- **`POST /api/v1/casino/gis/launch`**
  - Body (strict): `{ gameUuid, playerName, currency: USDT|USD|INR|PKR, device: desktop|mobile, returnUrl?, language?, lobbyData? }`.
  - It writes a `gis_sessions` row, records the play, then calls `POST /games/init`. `player_id` comes from the token.
  - Answers `201 { url, sessionId }`.
  - Legacy path: `POST /api/gis/games/init`.
- **`POST /api/v1/casino/gis/launch-demo`**
  - Body: `{ gameUuid, device, returnUrl?, language? }`. Calls `/games/init-demo` and answers `201 { url }`.
  - It still needs a token and the entitlement guard.
- **`GET /api/v1/casino/gis/lobby`**: proxies `/games/lobby`. It has no entitlement guard.
- **Other upstream proxies:** `game-tags`, `limits`, `limits/freespin`, `jackpots`, `freespins/bets`. `freespins/mine` reads the local `gis_freespins` table.
- **The unified route** `POST /api/v1/casino/games/launch` calls `GisService.launch` for a row with `aggregator='slotegrator'`, using `users.name` as `playerName`. It answers `{ gameLaunchUrl, via:'slotegrator', sessionId }`.

### Currencies (`gis.constants.js`)

| Accepted | Settles to wallet coin | Sent to Slotegrator as |
|---|---|---|
| `USDT`, `USD` | `USDT` | `USD` |
| `INR`, `PKR` | `INR` | `PKR` |

There is no FX conversion; the mapping is the legacy `CUR2COL`. Freespin and voucher admin bodies accept USDT or INR only.

### Catalogue sync

**Admin routes** (`gis/routes/admin.routes.js:71,73`). Each needs a staff token with `casino:manage` (SUPER_ADMIN and ADMIN hold it) and an empty body (`noBody()`). The legacy paths were `GET /api/gis/sync/gamesnew` and `GET /api/gis/sync/providersnew`.
- `POST /api/v1/admin/casino/gis/sync/games` answers `{ written, skipped, fetched, table }`.
- `POST /api/v1/admin/casino/gis/sync/providers` answers `{ providers, notSeenUpstream }`.

**`syncGames()`** (`gis.service.js` around line 1066):
1. Pages `GET /games?expand=tags,parameters,images,related_games`. A full crawl is many pages at about 1.1 s each, so it takes minutes and one HTTP request can hit a proxy timeout. Prefer the node one-liner in SKILL.md.
2. Chooses the target table:
   - the owner's `casino_aggregator` is `slotegrator`: write to `gisgamesnew`;
   - otherwise: write to `gisgamesnew_parked`.
3. `#upsertSlotegratorGame` writes each game. It uses raw SQL because the generated `Gisgamesnew` model has no `aggregator` attribute.
   - It first UPDATEs the game in the OTHER table if it is there, so a game is never in both tables.
   - Otherwise it INSERTs into the target table with `ON CONFLICT (uuid) DO UPDATE`.
   - It always sets `aggregator='slotegrator'`.
   - It uses `image = COALESCE(image, :image)`, so artwork we replaced is kept.
4. It never truncates and never deletes.

On a database without migration 097 it falls back to `Gisgamesnew.upsert` without the column.

**`syncProviders()`:**
- Crawls `/games` a second time (a full second crawl).
- Runs `findOrCreate` on `gis_providers_new` by provider name, so the `enabled` flags survive.
- Only counts names no longer seen upstream; it does not mark or delete them.
- Nothing reads `gis_providers_new.enabled` any more. The real switch is `casino_provider_settings`.

`GIS_SYNC_IN_PROGRESS` exists in `gis.errors.js` but is never thrown, so two syncs can run at once. The rate gate still serialises their calls.

### Tests

- **`M/gis/__tests__/gis.test.js`:** about 30 cases against a real test DB (`ibitplay_test`). They cover:
  - signature: tampered amount, stale timestamp, unconfigured;
  - retries and concurrency pay once;
  - refund under a fresh id pays once; unknown refund and rollback do nothing;
  - rollback uses our amount;
  - balance probe;
  - PKR settles to INR;
  - casino lock blocks bets but lets wins settle;
  - uuid-v5 response ids;
  - PHP-bracket signing;
  - sync upserts and keeps `enabled`.

  They do not assert the `aggregator` column or the parked table. Those are in `M/games/__tests__/catalogueSwitch.test.js`.
- **`M/gis/__tests__/gisAgentTree.test.js`:** freespins, vouchers and self-validate refuse the agent tree.

### Gotchas

- **406 with an empty body is an IP whitelist.** Slotegrator's CDN answers it to any IP it has not whitelisted, signed or not. See SKILL.md. Launch and sync only work from a whitelisted server.
- The sportsbook comment in `gis.service.js` says the book "settles through this same callback". It cannot: `#verify` signs with the GIS key, and the book has its own merchant key.
- Default policy `js_games` sends a sync into `gisgamesnew_parked`, which the lobby never shows. That is by design.

## 2. Slotegrator betting book (`M/sportsbook`)

A third-party sportsbook from the same vendor with the same signing (`SlotegratorClient`), but on a **different merchant account**, so it has its own client instance. The legacy module was never mounted.

- **Env:** `SPORTSBOOK_BASE_URL` (no default; legacy pointed at the STAGING host `gis-betting-stage.stgr.pw` with staging keys), `SPORTSBOOK_MERCHANT_ID`, `SPORTSBOOK_MERCHANT_KEY`, `SPORTSBOOK_RATE_LIMIT_MS` (1100), `SPORTSBOOK_TIMEOUT_MS`, `SPORTSBOOK_RETURN_URL`. With these unset, every route answers `503 SPORTSBOOK_NOT_CONFIGURED`.
- **Upstream:** `GET /sportsbooks`, `POST /sportsbooks/init`, `POST /sportsbooks/logout`.
- **Public route:** `GET /api/v1/casino/sportsbook` returns the book list. It is cached 5 minutes per container and limited to 300/min.
- **Player routes** (`refuseCustomCurrencies('SPORTS')`, limited to 20/min):
  - `POST /api/v1/casino/sportsbook/init`
    - Body: `{ sportsbookUuid, currency: USDT|USD|INR|PKR, language?, returnUrl? }`. Answers `201 { sessionId, url, token }`.
    - The `sportsbook_sessions` row is written before the upstream call. One open session is allowed per player per book (409 otherwise), and a session expires after 12 h.
    - Outbound currency: only USDT is renamed (to `USD`); INR stays INR, unlike GIS.
  - `POST /refresh`: takes `{ sessionId }` and keeps the same id.
  - `POST /logout`: closes the session locally first, then logs out upstream (best effort).
  - `GET /sessions`: the last 20 sessions, without token or URL.
- **Entitlement:** `entitlements.requireFlag('sports')` on init and refresh. There is no game entitlement and no provider switch.
- **Money:** none. **There is no wallet callback at all**, so turning the keys on without backend work gives bets with no wallet side. The frontend uses the JSGames books (LuckySports and the esports books) instead.
- **Table:** `sportsbook_sessions` (migration 031). It has UNIQUE(`session_id`) and a partial UNIQUE(`user_id`, `sportsbook_uuid`) WHERE `status='open'`.
- **Tests:** `M/sportsbook/__tests__/sportsbook.test.js`, 18 cases. They cover: the player id comes from the token; another player's session cannot be touched; no URL-fetch endpoint (SSRF); a failed init does not strand an open row; lock, unconfigured and currency refusals; the cached list; the hidden token.
- **Not ported on purpose:** `GET /sportsbooks/launch?url=` (SSRF).
