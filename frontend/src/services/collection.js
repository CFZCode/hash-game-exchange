import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { favorites, recent } from '../pages/GameCollection/collection';
/* `hot_games` is the filler for the home/casino strip's padding — see `pad` at the foot of this
   file. `home.js` does not import this module, so the pair does not cycle. */
import { getHomeSections } from './home';
import { GAMES } from '../data/games';

/* The Casino sidebar's two signed-in lists — `/favorite` and `/recent`.
 *
 * One POST each, both read out of the pages' own chunks:
 *
 *   post("/game/home/my-favorite/", { page: 1, pageSize: mobile ? 39 : 40, areaCode })
 *   post("/game/home/recent/",      { page: 1, pageSize: mobile ? 39 : 40, areaCode })
 *
 * `areaCode` comes from the bundle's `get_device_info` bridge (`Ee` in Enter-MsmOuq5R.js) rather
 * than from the caller, so it is defaulted here and the caller never sees it. `pageSize` is the
 * original's own device split: 39 on a phone, where the grid is three across, so the last row is
 * never a ragged pair, and 40 elsewhere, where every step of `.grid-col-3` divides it.
 *
 * `isRecItem` IS THE PAYLOAD'S OWN FIELD AND THE FILTER IS THE PAGE'S. `index-1jGOl_3-.js` hands
 * the grid `list.filter(i => i?.isRecItem === false)` — the history feed pads itself with
 * recommendations, and printing those as games you played would be a lie. The favourites page has
 * no such filter, and the difference is reproduced. It lives here rather than in the component
 * because it is a property of the response, not of the layout.
 *
 * Both answer 6002 unauthenticated; see pages/GameCollection/collection.js for the probe and for
 * why an empty list is the right fixture rather than a reconstruction. That note describes the
 * FIXTURE arm and is still true of it — both live arms are wired now, favourites against a store
 * that had to be built (see below) and recent against one that exists and stays empty (gap 2).
 */

const PAGE_SIZE = (mobile) => (mobile ? 39 : 40);

/* The home row asks for ten, which is `_u`'s own `pageSize` and not the pages' 40 — see
   `getRecentAndFavorites` at the bottom of this file. */
const HOME_ROW_SIZE = 10;

/* ── FAVOURITES IS THE FIRST FEATURE HERE WHOSE BACKEND HAD TO BE BUILT ───────────────────────
 *
 * Every other live read in this project points at a route that already existed. This one did not:
 * the platform had no favourites table, no route and no column, and neither did the legacy system
 * it was ported from — gap 1 in `docs/backend-gaps.md`, and the page has been correctly empty
 * since it was built. `user_favourite_games` (migration 038) and the three routes over it are
 * described in Part 4b.7, including why they hang off `/casino/games/` and not `/user/`.
 *
 * ── THE SERVER RESOLVES WHAT IT CAN AND THIS FILLS IN THE REST ────────────────────────────────
 *
 * A favourite is stored as WHATEVER STRING THE CLIENT USED TO NAME THE GAME, because there are
 * three such strings in play — the aggregator's `uuid`, the in-house `game_uid`, and this
 * front-end's own slug — and no single one of them is the identifier. The read asks both
 * catalogues and answers `game: null` for a reference that matches neither.
 *
 * ON THIS DELIVERY THAT IS THE COMMON CASE, NOT THE EDGE. The aggregator catalogue is unsynced
 * (Part 4), so the twenty in-house games are the only rows the server can resolve — `crash` and
 * `limbo` come back named, verified against the running platform, and a Pragmatic slot does not.
 * So this maps against `data/games.js`, the 118-row catalogue generated from the two captured
 * feeds that every other grid on this site is already drawn from. The server's row wins where it
 * has one; the local catalogue supplies the name and player count where it does not; and a slug in
 * neither still renders, as a tile carrying its own reference and the brand placeholder.
 *
 * The alternative — refusing to store a reference that does not join today — would have left this
 * page exactly as empty as it was before the table existed, which is the whole thing this was
 * meant to fix.
 */

const LOCAL = new Map(GAMES.map((game) => [game.slug, game]));

/* The grid's row shape, the same one the recommend feeds and `toPlayedGame` produce. `isRecItem`
   is stamped `false` because the filter above is the history page's and a favourite is never a
   recommendation — see the note on `played`. */
const toFavouriteGame = (row) => {
  const ref = row?.game_ref;
  if (!ref) return null;
  const server = row.game;
  const local = LOCAL.get(ref);

  return {
    slug: ref,
    fullName: server?.name || local?.name || ref,
    /* `undefined` rather than a URL means "use this build's own artwork", which is what the tile
       does with `assetExact(slug)`. The in-house rows carry `image: null` on this delivery. */
    icon: server?.image || undefined,
    /* The live count is the captured catalogue's; no route here carries a per-game one. Left
       undefined for a slug the catalogue does not know, so the tile omits the line rather than
       printing a zero it did not measure. */
    onlineUsers: local?.players,
    isRecItem: false,
  };
};

export const getFavoriteGames = ({ mobile = false, areaCode = '', limit } = {}) => {
  if (!USE_FIXTURES) {
    return Promise.resolve(
      request(PLATFORM.casino.favourites, {
        live: true,
        params: { limit: limit ?? PAGE_SIZE(mobile) },
        fixture: [],
      }),
    ).then((rows) => (rows ?? []).map(toFavouriteGame).filter(Boolean));
  }

  return request(ENDPOINTS.collection.favorite, {
    fixture: favorites,
    method: 'POST',
    body: JSON.stringify({ page: 1, pageSize: PAGE_SIZE(mobile), areaCode }),
  });
};

/* The two writes. Both are IDEMPOTENT on the server — starring twice is the same fact stated
   twice and un-starring something that is not there is the state the caller asked for — so a
   double tap needs no guard here and a toggle can be optimistic without a reconciliation step.

   `source` is what this client believes it is naming, and it is honest rather than confident: the
   slugs come from `data/games.js`, a bc.game capture, so `in-house` is claimed only where the
   platform's own list agrees. Everything else says `unknown`, which is what it is. The server
   ignores it on read; it is stored so a later move onto real foreign keys has something to work
   from instead of guessing. */
export const addFavoriteGame = (slug, source = 'unknown') =>
  request(PLATFORM.casino.favourite(slug), {
    live: true,
    method: 'PUT',
    json: { source },
    fixture: { game_ref: slug, favourite: true },
  });

export const removeFavoriteGame = (slug) =>
  request(PLATFORM.casino.favourite(slug), {
    live: true,
    method: 'DELETE',
    fixture: { game_ref: slug, favourite: false },
  });

/* Whether one slug is starred, for a page that shows a single game.

   THE WHOLE LIST, NOT A PER-GAME READ, and the limit is the server's cap rather than the grid's
   page size: there is no "is this one starred" route, and asking with the page's 40 would tell a
   player with 41 favourites that their 41st is not one. The cap is 500, the rows are four short
   fields each, and this runs once per game page. A `HEAD`-shaped route would be better and is not
   worth a seventh endpoint on a store this size.

   `false` on a failure, deliberately: an unreadable list must not draw a filled star, because the
   star is a control and a wrong one turns the next press into a remove. */
export const isFavoriteGame = (slug) =>
  Promise.resolve(getFavoriteGames({ limit: 500 }))
    .then((rows) => rows.some((row) => row.slug === slug))
    .catch(() => false);

/* The `isRecItem` filter is applied to whichever half answers — the fixture and the live list
   have the same shape, so the seam does not care which one it got. */
const played = (list) => (list || []).filter((row) => row?.isRecItem === false);

/* ── "CONTINUE PLAYING" IS LIVE, AND IT IS CORRECTLY EMPTY ────────────────────────────────────
 *
 * `GET /casino/games/recently-played` is the platform's own equivalent and is wired below — but
 * two things about it are worth knowing before an empty grid is read as a wiring fault:
 *
 *   IT ONLY EVER SEES AGGREGATOR GAMES. `recordPlay` writes `gis_recently_played` and its only
 *   caller in the whole tree is the GIS launch path (`gis.service.js`). The twenty in-house games
 *   record nothing — verified by playing four of them against the running platform and re-reading
 *   this route, which still answered `[]` — and GIS itself is unprovisioned, so there are no
 *   aggregator games to launch either. Both halves are in `docs/backend-gaps.md`.
 *
 *   A ROW CAN CARRY A NULL GAME. The service keeps a play whose game has since left the catalogue
 *   (legacy's LEFT JOIN did too) and answers `{game_uuid, played_at, game: null}`. Those are
 *   dropped here rather than drawn as a tile with no name and no artwork.
 *
 * Every mapped row is stamped `isRecItem: false` so the filter above stays a no-op rather than a
 * special case: bc.game's history feed pads itself with recommendations and marks them, and this
 * one does not pad at all, so everything it sends really was played.
 */
const toPlayedGame = (row) => {
  const game = row?.game;
  if (!game) return null;
  return {
    slug: game.uuid ?? row.game_uuid,
    fullName: game.name ?? '',
    /* The tile falls back to `assetExact(slug)` when `icon` is undefined, so a remote URL passes
       straight through and a missing one lands on this build's own artwork lookup. */
    icon: game.image ?? undefined,
    /* No live player count on a game row here; the tile omits the line when it is undefined,
       which is what an unknown count should look like rather than a zero. */
    onlineUsers: undefined,
    isRecItem: false,
  };
};

export const getRecentGames = ({ mobile = false, areaCode = '', limit } = {}) => {
  if (!USE_FIXTURES) {
    return Promise.resolve(
      request(PLATFORM.casino.recentlyPlayed, {
        live: true,
        /* `limit` overrides the page size for the home row, which asks for ten rather than a
           grid's forty — the same override `getFavoriteGames` above already takes, added here
           so the pair can be read with one argument. The two pages pass nothing and keep 40. */
        params: { limit: limit ?? PAGE_SIZE(mobile) },
        fixture: [],
      }),
    ).then((rows) => (rows ?? []).map(toPlayedGame).filter(Boolean));
  }

  const answer = request(ENDPOINTS.collection.recent, {
    fixture: recent,
    method: 'POST',
    body: JSON.stringify({ page: 1, pageSize: PAGE_SIZE(mobile), areaCode }),
  });

  return answer && typeof answer.then === 'function' ? answer.then(played) : played(answer);
};

/* ── The home page's pair, `[history, favorite]` ──────────────────────────────────────────────
 *
 * `_u` in `Enter-MsmOuq5R.js` — the read behind the signed-in home page's Continue Playing /
 * Favorites block:
 *
 *   function _u() {
 *     const { areaCode, distinctId } = await Ee();
 *     return post("/game/home/recent-and-like/", { areaCode: areaCode === "UNKOWN" ? "" : areaCode,
 *       distinctId, showingBlocked: 0, bcLang, browserLang, isBrazil: false, page: 1, pageSize: 10 })
 *   }
 *
 * ONE CALL THERE, TWO HERE, and the tuple is what the caller is written against — `vu` reads
 * `l()[0]` as the history list and `l()[1]` as the favourites one, so the shape is load-bearing
 * rather than incidental. This platform has no combined route; it has the two the `/recent` and
 * `/favorite` pages already use. Composing them here rather than in the component keeps that a
 * transport detail: if a `recent-and-like` equivalent ever lands, this function changes and
 * nothing above it does.
 *
 * `Promise.all` and not a sequence, because neither read depends on the other and the block is
 * gated on BOTH having settled — `yn` treats `undefined` as "still pending" and renders the
 * previous shape, so resolving them one at a time would show the first tab alone and then move
 * it sideways when the second arrived.
 *
 * `pageSize: 10` is the original's, and it is the one argument here that is not the pages' own:
 * `/favorite` and `/recent` ask for 40 (39 on a phone) because they draw a full grid, and this
 * row draws a strip that scrolls. Asking for 40 would work and would fetch four times what the
 * row can show before the View All tile takes over.
 *
 * A FAILED READ IS AN ABSENT SECTION, NOT AN ERROR. Both arms fall back to `[]`, which `yn`
 * turns into `undefined`, which drops that tab — and if both fail the block does not render at
 * all. That is the same degradation the original gets from a 6002 on a logged-out account, and
 * it is the right one for a row that is an accelerator rather than content: a home page that
 * still works minus one strip beats an error where a strip used to be.
 */
export const getRecentAndFavorites = () =>
  Promise.all([
    Promise.resolve(getRecentGames({ limit: HOME_ROW_SIZE })).catch(() => []),
    Promise.resolve(getFavoriteGames({ limit: HOME_ROW_SIZE })).catch(() => []),
    Promise.resolve(getHomeSections()).catch(() => null),
  ]).then(([history, favorites, sections]) => [
    pad(history, sections),
    pad(favorites, sections),
  ]);

/* ── The padding, and why a strip shows games you never starred ───────────────────────────────
 *
 * `recent-and-like` DOES NOT RETURN ONLY YOUR OWN ROWS. Both of its lists are padded out to the
 * page size with recommendations, and the padding is marked `isRecItem: true` — which is the
 * whole reason `GameTile`'s badge is gated on `!isRecItem`. So the original's Favorites tab is
 * a strip where the games you starred wear a star and the rest do not, and the history page
 * (`index-1jGOl_3-.js`) applies `list.filter(i => i?.isRecItem === false)` precisely because
 * printing padding as "games you played" would be a lie, while padding a FAVOURITES strip is
 * merely a suggestion and is left in. That asymmetry is already recorded at the top of this
 * file; what was missing here is the padding it describes.
 *
 * THE SOURCE OF THE PADDING IS THE DEPARTURE, AND IT IS THE SAME ONE `RecommendList` CARRIES.
 * bc.game pads from a recommendation engine keyed to the account. This platform has none —
 * `casino/games/recommended`, `/related`, `/popular` and `/hot` all answer `404`, probed
 * 2026-09-04 — so the filler is `hot_games`, the one selection this build has, and the rows are
 * a suggestion rather than a personalised one. The structure is the original's exactly: same
 * flag, same badge suppression, same cap. Only the choosing is not.
 *
 * `already` keeps a padded row from duplicating a starred one, which the server does for free
 * and a local pad does not. The pad is applied to a list that is EMPTY too — an account with no
 * favourites still gets `[]` back rather than ten suggestions, because `yn` reads an empty list
 * as "drop this tab entirely" and padding it would resurrect a tab the visitor has not earned.
 * That is the one place this must NOT follow the shape of a padded response.
 */
const pad = (rows, sections) => {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  if (rows.length >= HOME_ROW_SIZE) return rows;

  const already = new Set(rows.map((row) => row.slug));
  const filler = (sections?.hotGames?.games ?? [])
    .filter((game) => game?.slug && !already.has(game.slug))
    .slice(0, HOME_ROW_SIZE - rows.length)
    .map((game) => ({ ...game, isRecItem: true }));

  return rows.concat(filler);
};
