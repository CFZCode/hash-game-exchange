---
name: casino-providers
description: Every casino game provider and aggregator in the Parker567 backend (casino-service modules gis/Slotegrator, js-games V1 huidu + V2 xgames, sportsbook, seamless, x-casino, x-gaming, aggregators, catalogue) — env keys, outbound signing, wallet callbacks and how they are verified, launch routes and bodies, the catalogue tables and how they are filled, currencies, the entitlement guard, how money moves (WalletClient, ledger reasons, refunds/rollbacks, the reverse outbox), tests and gotchas — plus the owner's JSGames/Slotegrator aggregator switch (casino_aggregator, gisgamesnew.aggregator, gisgamesnew_parked). Use it for any work on casino game providers, aggregators, Slotegrator/GIS, JSGames, game launch, catalogue sync or import, provider callbacks, gisgamesnew/js_games, or the JSGames/Slotegrator switch — even if the user only says "the games", "the lobby" or "a provider".
---

# Casino providers and aggregators

This copy is for hash-game-exchange (DB `parker567`). Here the aggregator migration is **097**, and `game_transactions` is keyed per user (migration 095). The frontend launches through `frontend/src/services/game.js` (catalogue games) and `src/services/sports.js` (books, via `/casino/js-games/v2/launch`). The source of this skill is casino-sportsbook's `.claude/skills/casino-providers`.

All of it lives in casino-service: `backend/services/casino/src/modules/` (written `M/` below). The config is `backend/services/casino/src/config.js`. Every folder with an `index.js` is auto-mounted by `app.js`:

| Audience | Mounted at | Guard |
|---|---|---|
| public | `/api/v1/casino/<basePath>` | none |
| user | `/api/v1/casino/<basePath>` (same path) | player token |
| admin | `/api/v1/admin/casino/<basePath>` | staff token |
| internal | `/internal/casino/<basePath>` | internal key |

The gateway forwards the path unchanged. `gateway/src/legacyRoutes.js` rewrites the old provider paths (`/api/gis/...`, `/jsGamesv2/...`, `/gold_api`, …) in place.

Per-provider detail is in `references/`:
- `slotegrator.md`: GIS and the betting book.
- `jsgames.md`: V1 and V2.
- `other-modules.md`: x-casino, x-gaming, seamless, aggregators, catalogue, in-house, house, wager-report, bet-history and the reverse outbox.

The frontend side of a launch (iframe, exit bridge) and owner policies in general are covered by casino-sportsbook's `cfz-iframe-launch` and `owner-panel` skills.

## The providers at a glance

| Module | Vendor | State | Launch | Wallet callback | Catalogue |
|---|---|---|---|---|---|
| `js-games` V2 | JSGames / ibitplay xgames (`gamesv2.ibitplay.com`) | **Live. Serves the whole lobby and the sports/esports books.** INR launches only | `POST /casino/games/launch` (or `/casino/js-games/v2/launch`) | `/casino/js-games/v2/bet-callback`, HMAC-SHA256 headers | seeded CSV into `js_games` and `gisgamesnew`; no sync |
| `js-games` V1 | huidu.bet | Configurable, not used by the lobby | `/casino/js-games/v1/launch` | `/casino/js-games/v1/bet-callback`, AES-256-ECB payload | `js_games` |
| `gis` | Slotegrator GIS | Code ready; **merchant keys unset, server IP not whitelisted** | `POST /casino/games/launch` routes here for `aggregator='slotegrator'` rows; also `/casino/gis/launch` | `/casino/gis/callback/transactions`, X-Sign HMAC-SHA1 | `POST /admin/casino/gis/sync/games` into `gisgamesnew` (live) or `gisgamesnew_parked` |
| `sportsbook` | Slotegrator betting (separate merchant) | Unconfigured; **no wallet callback exists** | `/casino/sportsbook/init` | none | upstream list, cached |
| `seamless` | GSI operator (`gsimw.com`, staging by default) | Dead until `SEAMLESS_*` is set | `/casino/seamless/launch` | `/casino/seamless/*`, md5 or sha256 | live upstream reads |
| `x-casino` | XGaming / GamingHub360 | **Dead: `XCASINO_*` is not declared in config.js** | `/casino/x-casino/launch` | `/casino/x-casino/*`, sha1 | `apigames` |
| `x-gaming` | `apigames` listing | Read-only, 0 rows on dev | none | none | `apigames` (no import) |
| `aggregators` | Asia, Nexus `gold_api`, EVO | Dead until `AGGREGATOR_*_SECRET` is set | none | `/casino/aggregators/{asia,nexus,evo}`, `x-aggregator-key` | none |
| `catalogue` | Nexus and GamingHub360 reads | **Dead: keys undeclared, no http client** | `/casino/catalogue/launch` | none | `apigames` |

Not providers: `in-house` (the 20 originals over sockets), `house`, `wager-report`, `bet-history`. See `references/other-modules.md`.

**Config trap.** `loadEnv` drops every key `config.js` does not declare, so a provider key that is only in `.env` reads as `undefined`. Declare it in `config.js` first.

**Env key names** (never print the values):

| Provider | Keys |
|---|---|
| GIS | `GIS_BASE_URL`, `GIS_MERCHANT_ID`, `GIS_MERCHANT_KEY`, `GIS_MAX_SKEW_SECONDS`, `GIS_RATE_LIMIT_MS`, `GIS_TIMEOUT_MS`, `GIS_RETURN_URL` |
| Slotegrator book | `SPORTSBOOK_BASE_URL`, `SPORTSBOOK_MERCHANT_ID`, `SPORTSBOOK_MERCHANT_KEY`, `SPORTSBOOK_RATE_LIMIT_MS`, `SPORTSBOOK_TIMEOUT_MS`, `SPORTSBOOK_RETURN_URL` |
| JSGames V1 | `JSGAMES_V1_BASE_URL`, `JSGAMES_V1_AGENCY_UID`, `JSGAMES_V1_AES_KEY`, `JSGAMES_V1_PLAYER_PREFIX` |
| JSGames V2 | `JSGAMES_V2_BASE_URL`, `JSGAMES_V2_USER_BASE_URL`, `JSGAMES_V2_API_KEY`, `JSGAMES_V2_API_SECRET` |
| JSGames, both | `JSGAMES_CALLBACK_URL`, `JSGAMES_HOME_URL`, `JSGAMES_REQUIRE_BET_FOR_WIN`, `JSGAMES_MAX_SKEW_SECONDS`, `JSGAMES_TIMEOUT_MS` |
| seamless | `SEAMLESS_SECRET_KEY`, `SEAMLESS_OPERATOR_CODE`, `SEAMLESS_*` |
| aggregators | `AGGREGATOR_{ASIA,NEXUS,EVO}_SECRET` |
| sports books | `SPORTS_BOOK_GAME_UIDS` |

In `backend/.env.example` only `SEAMLESS_*` and the shared `JSGAMES_*` keys are listed.

## The aggregator switch (commit e64f6c5)

The owner picks whose catalogue the lobby serves: **JSGames or Slotegrator, one at a time.**

- **The policy:** `casino_aggregator`, with variants `js_games` (the default) and `slotegrator`. It has no `none`.
  - It is defined as `CASINO_AGGREGATOR_POLICY` in `backend/packages/common/src/featureCatalogue.js`. Its default is in `POLICY_DEFAULTS` in `packages/common/src/sitePolicy.js`. The owner-panel mirror is `owner-panel/src/configs/entitlementCatalogue.ts`.
  - It behaves like every other policy: always on, only the owner sets it, and a staff change gets `403 OWNER_MANAGED`.
  - It is stored as the `site_features` row `feature='casino_aggregator'`. **No row means `js_games`.**
- **Migration 097** (`packages/db/migrations/097-casino-aggregator.js`; it is 094 in casino-sportsbook and the hub) adds two things:
  - `gisgamesnew.aggregator VARCHAR(20) NOT NULL DEFAULT 'js_games'`;
  - `gisgamesnew_parked`, created `LIKE gisgamesnew INCLUDING DEFAULTS`, with a unique `uuid`.
  - `down` moves parked rows back first.
- **`M/games/catalogueSwitch.js` `applyAggregator`:**
  - It moves rows of the other aggregator `gisgamesnew → gisgamesnew_parked`, and rows of the chosen one back. The ids move with them (`DELETE … RETURNING *` then `INSERT … SELECT *`), so favourites and artwork survive.
  - It is stateless: whether the switch is applied is read from the rows themselves, so a crash halfway is finished by the next run.
  - It runs in one transaction under `pg_advisory_xact_lock(940094)`.
  - `startAggregatorSwitch` runs it at boot and **every 15 s** (`services/casino/src/index.js`). A DB without the migration is skipped.
- **Sync:** `gis.service.js` `syncGames()` writes `aggregator='slotegrator'` rows to `gisgamesnew` when the policy is `slotegrator`, otherwise to `gisgamesnew_parked`. A game already in the other table is updated there, so it is never in both. Details are in `references/slotegrator.md`.
- **Launch:** `POST /api/v1/casino/games/launch` (`M/games/gameLauncher.js`).
  - Body (strict): `{ gameUuid, currencyCode: INR|USDT|USD, device: desktop|mobile, language? }`.
  - `aggregatorOf()` reads the row's `aggregator`. A `slotegrator` row goes to `GisService.launch` (`playerName` = `users.name`). Anything else, **including a uid that is not in the lobby**, goes to JSGames V2 `launchV2`.
  - It answers `201 { gameLaunchUrl, via: 'slotegrator'|'jsgames-v2', sessionId? }`. The frontend calls it from `frontend/src/services/game.js` (`AGGREGATOR_LAUNCH`).
  - **The sportsbook and esports books are always JSGames uids**, whatever the lobby serves.
- **Rule: anything that INSERTs into `gisgamesnew` or `gisgamesnew_parked` must set `aggregator`.**
  - The generated `Gisgamesnew` model has no `aggregator` attribute, so use raw SQL as `#upsertSlotegratorGame` does.
  - Seeder 004 relies on the `'js_games'` default, which is right only for JSGames rows.
  - Image-only UPDATEs (`fix-game-artwork.js`, migration 092, admin image replace) don't need it.
- **Never delete JSGames rows.** Park them (see the 10004 gotcha).
- **Tests:** `M/games/__tests__/catalogueSwitch.test.js` (6 cases on `ibitplay_test`). They cover park/restore with ids, idempotence, the sync writing live vs parked, and `aggregatorOf`.

## What is in the catalogue now

Checked read-only on 2026-10-14.

**`cfz_casino_sportsbook`** (and `cfz_addaplay` and `cfz_roobet`, which have no aggregator migration yet):
- `gisgamesnew` holds 1,980 rows, all `aggregator='js_games'`. **This is JSGames V2.**
- `gisgamesnew_parked` is empty. There is no `casino_aggregator` row, so the policy is `js_games`.
- `js_games` holds 2,002 rows: the same 1,980 plus 22 in-house games.
- `gis_providers_new` holds the 14 JSGames vendor keys: `2j`, `bgaming`, `evolution`, `ezugi`, `hacksaw`, `ideal`, `jili`, `km`, `microgaming`, `netent`, `pgsoft`, `pragmatic`, `pragmaticlive`, `spribe`.

**`parker567`:**
- Live: the same 1,980 JSGames rows.
- `gisgamesnew_parked` holds **1,710 Slotegrator games from 17 providers**, imported from the dump `cfz/inhouse/gis.txt` (a pg INSERT dump whose truncated last row was skipped):

  | Provider | Games |
  |---|---|
  | PragmaticPlayLive | 394 |
  | Hacksaw Gaming | 360 |
  | Evolution Gaming | 213 |
  | Playtech | 141 |
  | PGSoft | 133 |
  | Platipus2 | 121 |
  | BGaming | 120 |
  | Ezugi | 66 |
  | SA Gaming | 42 |
  | SevenMojos Slots | 26 |
  | InOut | 23 |
  | ICONIC21 | 23 |
  | Spribe | 18 |
  | Betgames | 13 |
  | Vivogaming | 8 |
  | XProgaming | 7 |
  | SmartBet | 2 |

- No uuid overlaps the JSGames rows.
- Setting the owner policy to `slotegrator` there swaps the two sets within 15 s.

**Telling a JSGames row from a Slotegrator row:**
- **Do it by `aggregator`.** Uuid length is NOT a signal: JSGames uids are 32-hex, and Slotegrator uuids are mostly 32-hex too (1,575 of the 1,710; 135 are 40-hex).
- Provider naming is a good second signal:

  | | JSGames | Slotegrator |
  |---|---|---|
  | `provider` | short lowercase keys (`evolution`, `pragmatic`) | long-form names (`Evolution Gaming`, `SevenMojos Slots`) |
  | `label` | | a short label (`7Mojos`) |

- Artwork hosts are only a hint:
  - Fresh Slotegrator art is on `gis-static.com`, but the imported rows also point at mirrors.
  - JSGames rows point at `cdn.softswiss.net`, `coincasino.com`, `imgxcut.com`, `rajabet.fun` and others.
- **"gis" in a name does not mean Slotegrator data.** `/api/gis/gamesgis` (a legacy path, rewritten to `/api/v1/casino/games`), the `gis_providers_new` table and the Addaplay frontend's `src/services/api/gamesService.js` (`fetchGisGames`) all serve the JSGames catalogue.

```bash
q(){ psql -h 127.0.0.1 -U postgres -d cfz_casino_sportsbook -Atc "$1"; }   # SELECT only
q "select aggregator, count(*) from gisgamesnew group by 1"
q "select aggregator, count(*) from gisgamesnew_parked group by 1"
q "select variant, updated_by from site_features where feature='casino_aggregator'"   # empty = js_games
q "select provider, count(*) from gisgamesnew group by 1 order by 2 desc"
```

## Entitlement and provider switch (every launch route)

`M/games/gameEntitlement.js` `requireGameEntitled(deps, pick)` sits in front of every launch route: games, gis, gis demo, js-games v1/v2, x-casino, seamless and catalogue.

1. It looks the uid up in `gisgamesnew.uuid`, then in `js_games.game_uid`.
2. It works out the flags the game needs:
   - **A book** (`KNOWN_BOOK_UIDS`, `SPORTS_BOOK_GAME_UIDS`, provider `sports`/`esports`, or a type matching `/sport/`) needs `sports` only.
   - **Anything else** needs `casino`, plus the provider flag from `PROVIDER_FLAGS`, plus a category flag (`crash`, `livegames` or `slotsgames`).
   - **An unknown game** still needs `casino`.
3. `entitlements.assertFlagEntitled` refuses a missing flag with `403 NOT_ENTITLED`.
4. Then `M/games/providerSwitch.js` `isProviderDisabled` reads the site admin's `casino_provider_settings` (migration 067), matched loosely on lowercase alphanumerics. A disabled provider gets `PROVIDER_DISABLED`.

`gis_providers_new.enabled` is no longer read by anything.

`PROVIDER_FLAGS` keys are JSGames-style short names. A Slotegrator provider such as `Evolution Gaming` normalises to `evolutiongaming`, which is not in the map, so it gets only `casino` and its category flag. **Add the long-form names before relying on the per-provider flags under Slotegrator.**

Player routers also run `refuseCustomCurrencies('GAMES')`: an owner-created coin gets `CURRENCY_NOT_SUPPORTED_FOR_GAMES`.

## Money: the rules every provider follows

- **WalletClient only.** `packages/common/src/walletClient.js` posts `/internal/user/wallet/{debit,credit}`. The idempotency key is `casino-service:<REASON>:<ref.type>:<ref.id>`. **Exceptions:** x-casino and in-house write `credits` directly.
- **Ledger reasons:** `BET_STAKE`, `BET_PAYOUT`, `BET_REFUND`, `BET_ROLLBACK`. The JSGames V1 transfer also uses `TRANSFER_OUT` and `TRANSFER_IN`.
- **The transaction row comes first.** Insert the provider transaction row with a UNIQUE key, in the same DB transaction as the wallet call. A unique violation is a duplicate: answer with the current balance and move nothing.

  | Table | Unique key | Provider |
  |---|---|---|
  | `gis_transactions` | `transaction_id` | gis |
  | `game_transactions` | (`external_transaction_id`, `transaction_type`); per user in hash-game-exchange (migration 095) | JSGames V2 |
  | `js_game_transactions` | `serial_number`, partial | JSGames V1 |
  | `seamless_transactions` | (`transaction_id`, `action`) | seamless |
  | `aggregator_transactions` | (`aggregator`, `transaction_id`) | aggregators |
  | `transactionscasino` | `transaction_id` | x-casino |
- **Refund and rollback use OUR stored amount,** never the one in the request.
- **Callbacks always answer HTTP 200** in the provider's own envelope. A 4xx makes the provider retry forever against a money endpoint.
- **Wager feed:** a stake calls `games.recordActivity` (VIP, rakeback, races, wagering). A reversal calls `games.reverseActivity(..., {outbox:true})`; if that call fails, the reversal is queued in `wager_reverse_outbox` (migration 090) and retried by user-service.
  - gis, seamless, x-casino and in-house reverse.
  - js-games and aggregators never do.
- **Currencies:**

  | Provider | Accepts | Settles to |
  |---|---|---|
  | GIS | USDT, USD | USDT (sent as `USD`) |
  | GIS | INR, PKR | INR (sent as `PKR`) |
  | JSGames V2 | INR, USDT, USD | USD settles to USDT; upstream launches INR only |
  | JSGames V1 | INR, BDT, USDT, IDR | IDR settles to USDT |
  | seamless | anything | USDT |
  | aggregators | anything | USDT |
  | x-casino | any `COIN_COLUMNS` coin | the same coin |

  `games/launch` accepts `INR|USDT|USD`, the currencies both aggregators settle in.

## Operational gotchas

- **Slotegrator answers 406 with an empty body to any IP it has not whitelisted.** It answers that way to signed and unsigned requests alike, at the CDN.
  - Diagnose it with `curl -s -o /dev/null -w "%{http_code}" https://gis.slotegrator.com/api/index.php/v1/games`. From this dev machine it answers `406`; anything else (typically an auth error for the unsigned request) means the IP gets through.
  - The fix is to have Slotegrator whitelist the server's IP. Nothing in code fixes it.
  - **A sync, or a launch, only works from a whitelisted server.**
- **JSGames V2 refuses `/games` and `/games/search` for our key** (400, code 10004). A deleted JSGames catalogue cannot be re-fetched, so rows are parked, never deleted, and the CSV seed (`packages/db/seeders/004-provider-game-catalogue.js`, `seeders/data/js-games.csv`) is the only rebuild path.
- **JSGames V2 launches only in INR.** USDT or USD fails with `Game launch failed (10004)`.
- **Some Slotegrator uuids are 40-hex** (135 of the parked 1,710). The backend accepts any 1-190 character id. casino-sportsbook's frontend matches ids with `/^[0-9a-f]{32}$/i`, so check this frontend's game routes with one of the 40-hex games after switching.
- **Legacy credentials are in git history and must be rotated** (`backend/docs/ROTATION.md`): GIS, the Slotegrator book (staging), JSGames V1 and V2, seamless and x-casino.

## Running a Slotegrator sync

This needs `GIS_MERCHANT_ID` and `GIS_MERCHANT_KEY` in `backend/.env`, and a whitelisted server. Under the default policy the games land in `gisgamesnew_parked`; set the owner's `casino_aggregator` to `slotegrator` to put them in the lobby.

**Over HTTP** (`M/gis/routes/admin.routes.js:71,73`): staff token with `casino:manage`, empty body.
- `POST /api/v1/admin/casino/gis/sync/games` answers `{ written, skipped, fetched, table }`.
- `POST /api/v1/admin/casino/gis/sync/providers` answers `{ providers, notSeenUpstream }`.

Each sync is a full crawl at about 1.1 s per page, so it takes minutes and may outlive a proxy timeout.

**From the server** (no HTTP timeout), run in `backend/services/casino`:

```bash
node -e "const {createContainer}=require('./src/container');const {buildGisService}=require('./src/modules/gis/gis.factory');(async()=>{const c=await createContainer();try{console.log(await buildGisService(c).syncGames());console.log(await buildGisService(c).syncProviders());}finally{await c.close();}})().catch(e=>{console.error(e);process.exit(1)})"
```

`GIS_NOT_CONFIGURED` means the keys are missing. `GIS_UPSTREAM_REJECTED {status:406}` means the IP is not whitelisted.

## Tests

`cd backend/services/casino && npm test` runs `node --test` over `src/modules/*/__tests__/*.test.js`. The DB-backed suites use `ibitplay_test` (`TEST_DB_NAME`) and skip without it.

| File | Cases | Covers |
|---|---|---|
| `games/__tests__/catalogueSwitch.test.js` | 6 | the switch |
| `games/__tests__/games.test.js` | 27 | lobby reads |
| `games/__tests__/providerSettings.test.js` | 16 | the provider switch |
| `games/__tests__/recordActivity.test.js` | 10 | wager feed |
| `gis/__tests__/gis.test.js` | about 31 | callback, signing, sync |
| `gis/__tests__/gisAgentTree.test.js` | 3 | house-only admin |
| `js-games/__tests__/jsGames.test.js` | about 36 | V1, V2, transfer, client |
| `js-games/__tests__/jsCuration.test.js` | 8 | curation |
| `sportsbook/__tests__/sportsbook.test.js` | 19 | |
| `seamless/__tests__/seamless.test.js` | about 28 | |
| `x-casino/__tests__/xCasino.test.js` | about 36 | |
| `aggregators/__tests__/aggregators.test.js` | about 24 | |
| `in-house/__tests__/inHouse.test.js` | 51 | |
| `bet-history/__tests__/*` | | |

catalogue and x-gaming have no tests.
