import { request, USE_FIXTURES } from './client';
import { getOriginals as getHouseGames } from './originals';
import ENDPOINTS from './endpoints';
import { GAMES } from '../data/games';

/* The Help Center's one data need: the Provably Fair dropdown's game list.
 *
 * THE PATH IS REAL AND SO IS THE BODY. `ProvablyFair-CJEm-Nog.js` posts to
 * `/game/home/recommend/selection/` with `{ areaCode, distinctId, showingBlocked: 0, bcLang,
 * browserLang, isBrazil: false, selectionName: "originals", page: 1, pageSize: 100 }` and reads
 * `gameList` off the response. That is the same selection endpoint the home page already uses —
 * `ENDPOINTS.homeSelection` — with `selectionName: "originals"` rather than a home rail's name,
 * which is why this reuses it instead of inventing a path.
 *
 * TWO FILTERS ARE THE CHUNK'S OWN, and they are not cosmetic: it drops any row whose `gameUrl`
 * contains "trenball" and any whose `gameName` contains a colon. Both are reproduced below.
 * Trenball is a Crash side-bet rather than a game of its own, and the colon rows are the
 * multi-table variants that share a parent's fairness document.
 *
 * The fixture is `src/data/games.js` filtered to BC Originals rather than a captured response —
 * no `selection` call with `selectionName: "originals"` was captured, and games.js is itself
 * GENERATED from two captured game feeds, so the rows are real even though this particular
 * request's envelope is not. The label is the feed's own `fullName` and the value its `gameUrl`,
 * matching the `{ label, value }` pair the chunk builds. */

const isOriginal = (game) => /^BC(\s|$)|originals?$/i.test(game.provider ?? '');

/* LIVE (fixtures off): the platform's own in-house games (services/originals.js), the games a
   provably-fair check applies to. */
export const getOriginals = () =>
  !USE_FIXTURES
    ? Promise.resolve(getHouseGames()).then((games) => (games ?? []).map((g) => ({ label: g.name, value: g.slug })))
    : request(ENDPOINTS.homeSelection, {
    fixture: GAMES.filter(isOriginal)
      .filter((g) => !g.slug.includes('trenball') && !g.name.includes(':'))
      .map((g) => ({ label: g.name, value: g.slug })),
  });

/* `vt` in the games remote's `config-_uy-5Kfj.js`. The verifier is a GitHub Pages site on its
   own origin, which is why the Validate button opens a new tab rather than routing. */
const VERIFY_BASE = 'https://game-verify.github.io/public';

/* Read out of the same config: forty entries carry a `validateLink`, and the mapping is not a
   rename — `cave` verifies against `slots.html`, `keno` against `keno_single` while
   `keno-multiplayer` takes plain `keno`, and several games share one verifier. Games absent
   here have no Validate button at all, which is the chunk's `Show when={!!config}`. */
const VALIDATE = {
  baccarat: 'baccaratsingle',
  'classic-dice': 'classicdice_new',
  coinflip: 'coinflip_new',
  'ring-of-fortune': 'crash',
  crash: 'crash',
  fastparity: 'parity',
  parity: 'parity',
  'hash-dice': 'hashdice',
  hilo: 'hilo',
  'keno-multiplayer': 'keno',
  keno: 'keno_single',
  limbo: 'limbo',
  mines: 'mines',
  'claw-booster': 'claw_booster',
  plinko: 'plinko',
  roulette: 'roulettesingle_new',
  'tower-legend': 'tower',
  twist: 'twist',
  dice: 'dice',
  'video-poker': 'videopoker',
  wheel: 'wheel',
  'roulette-multiplayer': 'roulette',
  double: 'double',
  cave: 'slots',
  sword: 'sword',
  'oriental-beauties': 'oriental-beauties',
  blackjack: 'blackjack_new',
  'blackjack-single': 'blackjack_new',
  'stellar-rush': 'stellar_rush',
  'baccarat-multiplayer': 'baccarat',
  bingo: 'bingo',
  color: 'color',
  'fast-crash': 'fast_crash',
  patti: 'patti',
  jade: 'new_jade',
  'sicbo-multiplayer': 'sicbo-multiplayer',
  'fish-prawn-crab': 'sicbo-multiplayer',
  'bullet-spin': 'bullet',
  hotpot: 'hotpot',
  'bubble-shooter': 'bubble-shooter',
};

export const validateLinkFor = (slug) =>
  VALIDATE[slug] ? `${VERIFY_BASE}/${VALIDATE[slug]}.html` : null;

export default getOriginals;
