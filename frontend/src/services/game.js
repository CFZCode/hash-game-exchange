import { request, USE_FIXTURES, getAccessToken } from './client';
import { getOriginals, slugFor } from './originals';
import { publicGates } from './gates';
import { ORIGINAL_GAMES } from '../pages/Casino/originalGames';
import { getLiveGame } from './catalog';

/* Every catalogue game launches through `POST /casino/games/launch`: the backend reads the row and
   opens it through Slotegrator (GIS) or JSGames V2, whichever the owner's casino aggregator put in
   the lobby (casino-service games/gameLauncher.js). */
const AGGREGATOR_LAUNCH = '/api/v1/casino/games/launch';
import { GAME_DETAIL, PLATFORM } from './endpoints';
import { GAMES } from '../data/games';

/* `/game/:gameUnique` — the game page's two reads.
 *
 * ── THE GAME ITSELF IS NOT HERE, AND THAT IS THE PLATFORM RATHER THAN THIS BUILD ─────────────
 *
 * On bc.game the page mounts the game's own client — for a BC Original bc.game's in-house UI,
 * for a third-party title the provider's iframe. Here BOTH are a provider iframe: the platform
 * relays a launch URL from js-games v1 (the in-house games, an external game-client host) or v2
 * (the catalogue). Neither is configured on this delivery (`JSGAMES_V1_AGENCY_UID/_AES_KEY`,
 * `JSGAMES_V2_API_KEY/_SECRET` empty, 503 `JSGAMES_NOT_CONFIGURED`), so a press of Play opens the
 * page's "Under Maintenance" dialog until the keys are set — and frames the URL the day they are,
 * with no code change. `launchGame` below is the whole contract.
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
  /* BC Originals switched off: an in-house game's page (a bookmark, an old link) is "not in the
     catalogue", never a lookup elsewhere that could dress it up as another game. The backend
     refuses its launch too. */
  const gates = await publicGates();
  if (!gates.on('originals') && isHouseGame(gameUnique)) return null;
  const originals = await Promise.resolve(getOriginals()).catch(() => []);
  const house = (originals ?? []).find((game) => game.slug === gameUnique || game.uid === gameUnique);
  /* An in-house game the aggregator does not offer: not in the catalogue either. */
  if (!house && isHouseGame(gameUnique)) return null;
  if (house) {
    return { ...house, provider: 'BC Originals', ref: house.uid ?? gameUnique, source: 'in-house', launch: 'in-house' };
  }
  /* Casino switched off (owner or Super Admin): a catalogue game's page is not in it either. */
  if (!gates.on('casino')) return null;
  const game = await getLiveGame(gameUnique);
  return game ? { ...game, ref: game.uuid ?? gameUnique, launch: 'aggregator' } : null;
}

/* An in-house game by this build's slug or the platform's uid (`mine`, `classic_dice`). */
const HOUSE_SLUGS = new Set([
  ...GAMES.filter((game) => game.provider === 'BC Originals').map((game) => game.slug),
  ...ORIGINAL_GAMES.filter((game) => !game.slug.endsWith('-by-croco-gaming')).map((game) => game.slug),
]);
export const isHouseGame = (ref) => HOUSE_SLUGS.has(ref) || HOUSE_SLUGS.has(slugFor(ref));

/* ── THE LAUNCH ─────────────────────────────────────────────────────────────────────────────
 *
 * BC Originals go to `POST /casino/original-games/launch` (the Original Games Aggregator), catalogue games to
 * `POST /casino/games/launch` (JSGames V2 or Slotegrator, by the game's row). Both answer `{gameLaunchUrl, sessionToken}` and the URL goes
 * into the frame UNCHANGED (it carries the provider's session). How hash.game does the same job,
 * and why this is the shape it is, is in `docs/casino.md` under "Opening a game".
 *
 * THE TWO BODIES ARE NOT THE SAME, and both validators are `.strict()`, so a key the other route
 * takes is a 422 here:
 *   lobby {gameUuid, currencyCode, language, device}  no return URL, no demo flag
 *   originals {gameCode, currencyCode, language, device}  `gameCode` is the in-house `game_uid`
 *                                                     (`crash`, `classic_dice`) and must match
 *                                                     the aggregator's `GET /v1/games` code
 * `gameUuid` is the catalogue row's `uuid` (which IS `js_games.game_uid`, the provider's own id).
 *
 * THE CURRENCY IS THE PLAYER'S SELECTED WALLET, not a constant. `session.setting.currencyName`
 * is a wallet row's name (`INRFIAT`, `USDT`), so the `FIAT` suffix comes off and the code must be
 * one the route settles. v2's validator takes INR/USDT/USD, but the live operator refuses
 * everything but INR — a SmartBet launch with the same keys on 2026-10-12 answered 201 for INR and
 * `502 JSGAMES_UPSTREAM_REJECTED` (provider HTTP 400) for USDT — so offering USDT would only turn
 * a Play press into an error. The originals settle INR and USDT only. A wallet the
 * route cannot take is reported to the page (`launchCurrency` → null) and the overlay says so in
 * the original's own words, rather than silently launching in a currency the player did not pick.
 *
 * Signed out there is nothing to launch, and with fixtures on there is no host: both resolve to
 * `null` and the page renders its own failure dialog. A refusal rejects with the transport's
 * `ApiError` and the caller decides what the player sees. */
const LAUNCH_CURRENCIES = {
  /* Slotegrator: INR launches as PKR, PKR as INR, USDT as USD (the backend swaps). shortcut: a JSGames-lobby USDT/PKR launch fails upstream (INR only), split by row aggregator if JSGames comes back. */
  aggregator: ['INR', 'PKR', 'USDT'],
  /* The Original Games Aggregator settles INR and USDT only (agreed at onboarding). */
  'in-house': ['INR', 'USDT'],
};

const routeOf = (game) => (game?.launch === 'aggregator' ? 'aggregator' : 'in-house');

/** The provider code a wallet row launches in on this game's route, or null if it cannot. */
export function launchCurrency(game, currencyName) {
  const code = String(currencyName ?? '').replace(/FIAT$/, '').toUpperCase();
  return LAUNCH_CURRENCIES[routeOf(game)].includes(code) ? code : null;
}

/** The wallet codes (bare, `INR`) this game's route launches in — the overlay's picker. */
export const launchCurrencies = (game) => LAUNCH_CURRENCIES[routeOf(game)];

const deviceOf = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches ? 'mobile' : 'desktop';

export function launchGame(game, { currencyName, language = 'en' } = {}) {
  if (USE_FIXTURES || !getAccessToken() || !game) return null;
  const currencyCode = launchCurrency(game, currencyName);
  if (!currencyCode) return null;
  /* `en-US` -> `en`: the validators cap it at ten characters and providers take the bare tag. */
  const lang = String(language || 'en').split(/[-_]/)[0].slice(0, 10) || 'en';
  const json =
    game.launch === 'aggregator'
      ? { gameUuid: game.ref, currencyCode, language: lang, device: deviceOf() }
      : { gameCode: game.ref, currencyCode, language: lang, device: deviceOf() };
  return Promise.resolve(
    request(game.launch === 'aggregator' ? AGGREGATOR_LAUNCH : PLATFORM.casino.originalsLaunch, {
      live: true,
      method: 'POST',
      json,
      fixture: null,
    }),
  ).then((answer) => answer?.gameLaunchUrl ?? null);
}
