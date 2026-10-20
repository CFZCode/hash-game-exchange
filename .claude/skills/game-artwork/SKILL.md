---
name: game-artwork
description: Fix casino lobby tile images (gisgamesnew.image) that are missing, broken, on the bare-IP http host, or the wrong shape for the 3:4 tile. The script looks each game up first in our own DB's JSGames catalogue (js_games, parked js_games rows), then on reference lobbies (hash.game, shuffle, powbet; bitcasino is blocked and off), matching provider + name + live-or-not, then points the row at that art with a game_artwork backup for --revert. Use for "game images kharab hain", "images missing", "82.180.146.91 images", "reference site se game images lao", "image URL DB me update karo", or any work on gisgamesnew.image, game_artwork or fix-game-artwork.js.
---

# Game tile artwork (hash-game-exchange)

The lobby tile is **portrait 3:4**. `frontend/src/components/shared/GameTile/index.jsx` uses `aspect-[3/4]` with `object-cover`, and the grids (`GameSection`, `GameGrid`, `GameCollection`) set `--aspect-ratio: .75`. `gisgamesnew` holds the Slotegrator catalogue (`aggregator='slotegrator'`, 1,710 rows). `image` arrived as:

| Host | Rows (2026-10-14) | Problem |
|---|---|---|
| `http://82.180.146.91:12001/public/...` | 890 | Plain http on a bare IP: mixed content on an https site, and fragile. Loads from here, mostly portrait |
| `d3c3rwqla6qxaf.cloudfront.net` | 278 | 427x575, fine |
| empty | 214 | Nothing to show |
| `gis-static.com` | 148 | Slotegrator's own CDN; shapes vary |
| `luckmedia.link` (Playtech `thumb_3_4_custom.webp`), `static.crypto-games.io`, others | ~180 | Mixed |

## The script

`backend/scripts/fix-game-artwork.js`, with helpers `scripts/lib/artwork-sources.js` (sources and matcher) and `scripts/lib/image-size.js`. It reads the DB settings from `backend/.env` itself, so never open that file. Variables already set in the shell win over the file (`process.loadEnvFile` does not override), so a local run can point elsewhere: `DB_HOST=127.0.0.1 DB_NAME=<local db> DB_USER=postgres DB_PASSWORD=postgres node scripts/fix-game-artwork.js ...`. A worktree has no `node_modules`: add `NODE_PATH=<main checkout>/backend/node_modules`.

## On the server (live: casino_aggregator = slotegrator, ~9,550 lobby rows)

```bash
cd backend
set -a; . ./.env; set +a                     # only so pg_dump gets the same DB; never print it
# 1. backup
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -Fc -t gisgamesnew -f ~/gisgamesnew-before-artwork-$(date +%F).dump
# 2. dry run, read report.csv (status / source / matched / note)
node scripts/fix-game-artwork.js --aggregator=slotegrator --with-empty --with-broken --with-http --no-download --out=~/game-artwork
# 3. apply the reference / own-catalogue art
node scripts/fix-game-artwork.js --aggregator=slotegrator --with-empty --with-broken --with-http --no-download --out=~/game-artwork --apply
#    undo if needed (only rows still showing what the script set)
node scripts/fix-game-artwork.js --revert
# 4. the rest: misses that are empty / broken / wrong shape get a branded self-hosted tile
node scripts/fix-game-artwork.js --aggregator=slotegrator --with-empty --with-broken --brand --no-download --out=~/game-artwork-brand --apply
```

Restore the whole table instead: `pg_restore -h ... -U ... -d "$DB_NAME" --clean -t gisgamesnew ~/gisgamesnew-before-artwork-<date>.dump`.

```bash
cd backend
node scripts/fix-game-artwork.js --aggregator=slotegrator --with-empty --with-broken --with-http   # dry run, DB untouched
node scripts/fix-game-artwork.js --provider="Hacksaw Gaming",PGSoft --limit=20                   # narrow it (--uuid=a,b too)
node scripts/fix-game-artwork.js --aggregator=slotegrator --with-empty --with-broken --with-http --apply
node scripts/fix-game-artwork.js --revert [--uuid=...]                                          # put the previous images back
node scripts/fix-game-artwork.js --aggregator=slotegrator --with-empty --with-broken --brand --apply   # misses get a branded 3:4 tile
node scripts/fix-game-artwork.js --import=bitcasino.json ...                                     # a catalogue the user exported themselves
node scripts/fix-game-artwork.js --with-bitcasino ...                                           # also try bitcasino (blocked today)
```

- **Which rows:** wrong shape always (width/height outside `0.62–0.86`). `--with-empty` adds rows with no image, `--with-broken` adds rows whose image does not load (HTTP error, timeout, not an image), and `--with-http` adds rows on plain `http://` even when they load. The last one covers the 82.180.146.91 host.
- **Output:** `--out=<dir>` (default `~/Downloads/game-artwork`) gets `<category>/<provider>/<Game>.<ext>` and `report.csv`, with one row per game: status, old size, source, what matched, new URL and the miss reason. `--no-download` skips the image files.
- **Empty** includes the import's placeholder `/imagesv2/gamecard/earth-globe.png` (213 rows had it).
- **`--apply`** inserts a `game_artwork` row first, saving `previous_image` (the value before the FIRST replacement), and then sets `gisgamesnew.image` to the reference URL. The table comes from **migration `098-game-artwork-store.js`**, and the script also creates it if it is missing.
- **`--brand`:** a game that every source missed, and whose current image is empty, broken or the wrong shape, gets a branded 600x800 tile from `scripts/lib/branded-art.js`. That is the site's layer greys with the brand green #24EE89, a category label, the name, the provider and a PLAY chip. There is no wordmark, because the site name is set at runtime. Rendering needs sharp from `frontend/node_modules`. The tile is always self-hosted: the bytes go into `game_artwork` and `image` becomes `/api/v1/casino/games/image/<uuid>.png`, served by the casino public route `GET /games/image/:name` (`games.service.artwork`). The frontend's `apiAsset()` (`services/catalog.js`) puts `NEXT_PUBLIC_API_BASE` in front of any `/api/` image. A row whose current image loads and is portrait is **kept**, even on http.
- **`--revert`** restores `previous_image` only where `gisgamesnew.image` still equals what the script wrote. A later admin change is left alone.
- **Backup first:** `pg_dump -Fc -t gisgamesnew` to a scratch file before `--apply`.

## Matching: all three must hold, or the art is not used

1. **Provider**, through `PROVIDERS` in `artwork-sources.js`. It maps the Slotegrator name to hash.game slugs and every name the references use (compared as `nameKey`):

| Slotegrator | hash.game slugs | names accepted | live-only |
|---|---|---|---|
| PragmaticPlayLive | pragmatic-play-live, pragmatic-play | Pragmatic Play Live, Pragmatic Play | yes |
| Hacksaw Gaming | hacksaw-gaming, hacksaw | Hacksaw, Hacksaw Gaming | |
| Evolution Gaming | evolution-gaming, evolution | Evolution, Evolution Gaming, Evolution Hub Asia | yes |
| Playtech | playtech, playtech-live | Playtech, Playtech Live | |
| PGSoft | pg-soft, pgsoft | PG Soft | |
| Platipus2 | platipus, platipus-gaming | Platipus | |
| BGaming | bgaming | BGaming | |
| Ezugi | ezugi | Ezugi | yes |
| SA Gaming | sa-gaming | SA Gaming | yes |
| SevenMojos Slots | 7mojos, 7-mojos, seven-mojos | 7Mojos, SevenMojos | |
| InOut | inout, inout-games | InOut, InOut Games | |
| ICONIC21 | iconic21 | ICONIC21 | yes |
| Spribe | spribe | Spribe | |
| Betgames | betgames, betgames-tv | Betgames, BetGames.TV | yes |
| Vivogaming | vivo-gaming | Vivo Gaming | yes |
| XProgaming | xprogaming, xpro-gaming | XPro Gaming, XPG | yes |
| NetEnt | netent ✓ | NetEnt, Net Entertainment (shuffle, powbet, JSGames `netent`) | |

   Added 2026-10-20 for the live 79-provider Slotegrator lobby (hash.game slugs are its provider-list names slugged; ✓ = checked with a real game; `[]` = not on hash.game, so it is not asked):

| Slotegrator | hash.game | names accepted (where seen) |
|---|---|---|
| AmigoGaming | amigo-gaming ✓ | Amigo Gaming (hash, powbet) |
| Belatra Games | belatra ✓ | Belatra |
| Booongo | booongo ✓ | Booongo, BNG |
| Caleta | caleta-gaming ✓ | Caleta Gaming (hash), Caleta (powbet) |
| FaChai | fa-chai ✓ | FA CHAI |
| JDB | jdb ✓, jdb-gaming | JDB, JDB Gaming |
| No Limit City | nolimitcity ✓ | NoLimitCity (hash), Nolimit City (shuffle), nolimit (powbet) |
| OnlyPlay | onlyplay | OnlyPlay (hash, powbet) |
| PlayNGo | playngo ✓ | PlaynGo |
| PopiPlay | popiplay | Popiplay (hash, powbet) |
| Quickspin | quickspin ✓ | Quickspin (hash, powbet) |
| RTG SLOTS | real-time-gaming | Real Time Gaming, RTG |
| RubyPlay | ruby-play | Ruby Play (hash, powbet) |
| Skywind Slot | skywind | Skywind |
| Spadegaming | spadegaming ✓ | Spadegaming (hash, powbet) |
| Thunderkick | thunderkick ✓ | Thunderkick (hash, shuffle, powbet) |
| OneTouch, Relax Gaming | [] | shuffle (Relax Gaming / relax), powbet onetouch |
| Apparat, BarbaraBang, BFGames (beefee), CTInteractive (ct), EnjoyGaming, Fugaso, Gamebeat, HolleGames Standard (Hölle Games), PlayHub, Salsa (Salsa Technology), Turbogames, VibraGaming (vibra-aleaplay), Yggdrasil, Zillion Games (zillion-direct) | [] | powbet only |

   Not on hash.game, shuffle or powbet (2026-10-20), so not mapped (no guessing): Amarix, ApolloGames, Blueprint, Boldplay, Clawbuster, ConceptGaming, Dlv, Dragoon Soft, Elbet, Espressogames, Evoplay, ExcellentReel, FormulaSpin, FunkyGames, HoGaming, KAGaming, KajotGames, Kalamba, Lotto Instant Win, Lucksome, MacawGaming, MPlay, Nucleus, RevolverGaming, Rich88, RivalGames, SimplePlay, Spearhead Studios, TripleCherry, TripleProfitsGames, Wazdan, ZeusPlay. An unmapped provider still tries its own name slugged, so it is harmless. Live-only in the lobby: Betgames, Ezugi, ICONIC21, SA Gaming, Vivogaming, XProgaming (and PragmaticPlayLive, Evolution Gaming).

   JSGames vendor keys (own catalogue) sit in the same `names`: `evolution`, `pragmatic`, `pragmaticlive`, `bgaming`, `hacksaw`, `pgsoft`, `netent`, `spribe`, `ezugi`. `jili`, `microgaming`, `ideal`, `km` (KingMaker) and `2j` have no Slotegrator studio in the lobby, so they never match.

   SmartBet (house games) and `type='lobby'` rows are skipped. If a provider never matches, add it to this map first.
2. **Name:** `nameKey()` ignores case, ™ ® © and punctuation, and treats "&" and "and" as equal. `baseName()` also tries the name without an RTP or platform suffix, so "Gladiator Legends 96% Mobile" can match "Gladiator Legends". A number that belongs to the name ("Gates of Olympus 1000") stays.
3. **Live or not** (`rowIsLive`). Slotegrator's `type` is "blackjack", never "live blackjack". A row counts as live when its type says live or game show, or when its studio is live-only (the column above) and neither the type (slots, crash, scratch, instant…) nor the name ("First Person …", "RNG") says RNG. The reference must agree: hash.game's `categoryName`, powbet's `label`/categories, shuffle's `LIVE_CASINO`/`GAME_SHOWS`.

The art must also load, measure as portrait, and be over 2 KB.

## Sources (checked 2026-10-14)

| Site | API (plain Node fetch, read-only GET) | Art used |
|---|---|---|
| **own DB** (first, added 2026-10-20) | The JSGames catalogue already in this DB: `gisgamesnew` and `gisgamesnew_parked` rows with `aggregator='js_games'` (curated art, first), then `js_games` (`game_name`, `vendor`, `game_type`, `game_icon`). Read ONCE per run over the script's own connection (`ownCatalogue(db)` → `setOwnCatalogue(rows)`); a missing table is skipped. Live = the JSGames type says live (`CasinoLive`) | that row's image, absolute https only (relative `abc.png` and http are ignored). Most of it is softswiss / coincasino / imgxcut / rajabet; huidu's 520x520 squares fail the portrait check and fall through to hash.game |
| **hash.game** (second) | `GET https://hash.game/api/game/home/detail/?gameUrl=<name-slug>-by-<provider-slug>&areaCode=IN` | `iconThreeFour` + `?_v=4,dpr=1,width=480`, giving 480x640 (exactly 3:4). `.../common.png` means no art. Don't send `image/avif` in Accept |
| **shuffle** (third) | `GET https://shuffle.com/main-api/bp-storage/public-assets/games/games.json`, the whole lobby, once per run | imgix `?width=480&fm=jpg&q=85`, giving 480x672 |
| **powbet** (fourth) | `GET https://powbet.com/en/api/v2/game/list?page=1&count=30&search=<name>` | `imagex3`, 400x600. `image` is landscape and not used |
| **`--import=<file>`** | a JSON file the USER exported from their own browser, `[{ "name", "provider", "category", "image" }]` | `image` (must measure portrait). Same three checks. This is how bitcasino can be used: the user opens bitcasino.io in their own browser and saves its catalogue themselves. We don't script that |
| **bitcasino.io** (off, `--with-bitcasino`) | `POST https://bitcasino.io/graphql` `casinoGameInventory.searchGames` | **Blocked.** Cloudflare challenges every scripted request (403, `cf-mitigated: challenge`, on every path including robots.txt). The source does one plain fetch; after the 403 every row gets the miss "bitcasino blocks scripted access (Cloudflare)". Do NOT run its GraphQL from a browser tab to bulk-read it: that gets around the bot protection. Using bitcasino needs an official feed or their permission. For reference, its art is on `cdn.coingaming.io`/`cdn.hub88.io`; `thumbUrlTab` is portrait and `thumbUrl` is 490x368 landscape |

Provider lists used to build the map (read-only GET): hash.game `GET /api/game/home/provider/list/?areaCode=IN&categoryId=1` (slots, 66 providers) and `categoryId=4` (live, 8); it has no slug field, so slugs are checked with `.../home/detail/?gameUrl=<game>-by-<slug>`. shuffle: the `provider.name`/`slug` of games.json. powbet: `GET https://powbet.com/en/api/v2/brand/list?page=1..6` (`title`, `name` = the `brand_code` in game results).

To add a source, write `fromX(row)` in `artwork-sources.js` that returns `{ source, url, matched }` or `{ miss }` after all three checks, append it to `SOURCES`, and add a case to `scripts/__tests__/artwork-sources.test.js`.

## Status after the 2026-10-14 run

Backup before the run: `pg_dump -Fc -t gisgamesnew` (`gisgamesnew-before-artwork.dump` in that session's scratchpad). Of the 1,710 Slotegrator rows:

| Result | Rows |
|---|---|
| hash.game art | 817 |
| powbet art | 76 |
| shuffle art | 8 |
| branded tile (self-hosted) | 73 (Ezugi 27, Platipus 14, Playtech 12, 7Mojos 8, Evolution 4, Hacksaw 4, SA 2, PGSoft 1, Vivo 1) |
| kept as is | 737: 405 already good, 326 on `http://82.180.146.91:12001` that load and are portrait but had no reference art, 1 data: URI, 5 lobby/SmartBet rows |
| **left without art** | **0** |

By provider, reference art hit: PragmaticPlayLive 279/394, Hacksaw 330/360, Evolution 98/213, Platipus 96/121, Playtech 44/141. SA Gaming, XProgaming, Spribe (except Aviator), ICONIC21 and Betgames are barely on any reference, so they mostly keep their own art.

**Known misses** (`report.csv` `note` column): Pragmatic "Privé Lounge …", "Speed Baccarat N" and "Boom City"; Evolution "Salon Privé …" and numbered tables hash.game doesn't list; Playtech tables named differently ("Sky Queen" is "Fire Blaze: Sky Queen" on powbet, so it is rejected); all SA Gaming and XPG. The 326 http rows still need https art eventually: a browser on the https site may upgrade or block them. Re-run with `--with-http` when a source adds them.

## Rules

- Dry-run first, and read `report.csv`.
- Take a `pg_dump -Fc -t gisgamesnew` backup before `--apply`.
- Matching is strict. Never loosen it to take a similar game's art; a miss is better.
- The art belongs to the game studios. Hotlinking the reference CDNs (imgxcut.com, powbet.com, shuffle-com.imgix.net) is a stopgap; Slotegrator's or the studio's own asset pack is the clean source.
- Tests: `node --test scripts/__tests__/artwork-sources.test.js` (no DB, no network).
