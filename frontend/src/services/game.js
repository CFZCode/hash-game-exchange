import { request, USE_FIXTURES, getAccessToken } from './client';
import { getOriginals } from './originals';
import { getLiveGame } from './catalog';

const AGGREGATOR_LAUNCH = '/api/v1/casino/js-games/v2/launch';
import { GAME_DETAIL, PLATFORM } from './endpoints';
import { GAMES } from '../data/games';

/* `/game/:gameUnique` — the game page's two reads.
 *
 * ── THE GAME ITSELF IS NOT HERE, AND THAT IS THE PLATFORM RATHER THAN THIS BUILD ─────────────
 *
 * On bc.game the page mounts the game's own client — for a BC Original that is bc.game's
 * in-house game UI (the Crash chart, the bet panel, the players table), for a third-party title
 * the provider's iframe. Neither exists on this side. The iBitPlay platform this build is wired to
 * does have the twenty in-house games and a launch route for them (`POST
 * /casino/js-games/v1/launch`), but that route only RELAYS a launch URL from an external
 * game-client host — `JSGAMES_V1_BASE_URL`, `_AGENCY_UID`, `_AES_KEY` in its config — and none of
 * those is set (`docs/backend-gaps.md`, Part 4). So a launch here cannot succeed, and the page
 * renders the frame's own connecting state — which is literally what the live page shows before
 * its client is ready — rather than an iframe pointed at nothing.
 *
 * `launchGame` goes through the seam anyway, `live: true`, so the day the host is configured the
 * page frames what comes back with no code change: the response is `{gameLaunchUrl, sessionToken}`
 * and the frame takes the first. With fixtures on it resolves to `null`, which is the same
 * "nothing to frame" the failed live call produces.
 *
 * `getGame` is the catalogue lookup — `data/games.js`, 118 rows generated from the two captured
 * feeds — behind `request()` like every other read, so the info card below the frame is fed the
 * way a real `/game/detail` would feed it. An unknown slug resolves to `null` and the page shows
 * the site's own empty state with the slug as its title, which is the list pages' fallback chain
 * one route over.
 */
export function getGame(gameUnique) {
  const row = GAMES.find((game) => game.slug === gameUnique) ?? null;
  if (USE_FIXTURES) {
    return request(GAME_DETAIL, {
      params: { gameUnique },
      fixture: row,
    });
  }
  return readLiveGame(gameUnique);
}

/* Live: an in-house game first (the twenty BC Originals, matched on this build's slug), then the
   aggregator catalogue by page slug or uuid (`services/catalog.js`). `ref` and `source` are what
   the favourite store and the launch key on; `launch` names the route. */
async function readLiveGame(gameUnique) {
  const originals = await Promise.resolve(getOriginals()).catch(() => []);
  const house = (originals ?? []).find((game) => game.slug === gameUnique || game.uid === gameUnique);
  if (house) {
    return { ...house, provider: 'BC Originals', ref: house.uid ?? gameUnique, source: 'in-house', launch: 'in-house' };
  }
  const game = await getLiveGame(gameUnique);
  return game ? { ...game, ref: game.uuid ?? gameUnique, launch: 'aggregator' } : null;
}

/* The launch. In-house games go to `POST /casino/js-games/v1/launch`, catalogue games to
   `POST /casino/js-games/v2/launch` (the aggregator route that is live on SmartBet sites when its
   keys are set); both take `{gameUid, currencyCode}` and answer `{gameLaunchUrl, sessionToken}`.
   The provider is INR-only upstream. Signed out there is nothing to launch, so no call is made.
   A refusal (`JSGAMES_NOT_CONFIGURED` 503 on this delivery) rejects, and the page renders its own
   "not available" state. */
export function launchGame(gameUnique, { currencyCode = 'INR', game = null } = {}) {
  if (!USE_FIXTURES && !getAccessToken()) return null;
  const aggregator = game?.launch === 'aggregator';
  return request(aggregator ? AGGREGATOR_LAUNCH : PLATFORM.casino.inHouseLaunch, {
    live: true,
    method: 'POST',
    json: { gameUid: game?.ref ?? gameUnique, currencyCode },
    fixture: null,
  });
}
