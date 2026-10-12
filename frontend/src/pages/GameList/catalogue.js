import { gamesFor } from '../Casino/catalogue';
import { getCasinoPage } from '../../services/catalog';
import { GRID_PAGE_SIZE as PAGE } from '../Casino/catalogue';
import { USE_FIXTURES } from '../../services/client';
import { exclusive, bingo } from '../Home/GameSection/sections';

/* The three list routes' titles and where each one's games come from.
 *
 * `/section/:section`, `/gamelist/:type` and `/tagname/:tag` are the original's own paths — the
 * destinations of every "All" pill on the home page and of two rows on the casino lobby — and each
 * is a four-line chunk over one shared grid. The title maps below are those chunks' own, verbatim:
 *
 *   SECTION_TITLES   `W` in index-BSVarTKc.js   21 entries
 *   TAG_TITLES       `f` in index-BaCzwozn.js   16 entries
 *
 * `__ENV_SITE__` EXPANDS TO "BC", NOT "BC.GAME" — `license.site` is the literal `"BC"` in
 * `index-BsFv7ByC.js`, where `license.host` is `"bc.game"`. So `t("__ENV_SITE__ Originals")` is
 * "BC Originals" and `t("__ENV_SITE__ Exclusive")` is "BC Exclusive", which is also what the
 * sidebar row, the casino tab and the home row each call them — three surfaces that would
 * otherwise disagree with their own All page. The Buy Crypto disclaimer's "BC.GAME" is a
 * different token, `__ENV_HOST__`, which is `license.host.toUpperCase()`.
 *
 * BOTH MAPS ARE A FALLBACK CHAIN, not a lookup: `searchParams.label ?? MAP[key] ?? key`. So a link
 * carrying its own `?label=` wins — which is what the home page's Bingo row
 * (`/tagname/bingo?label=All%20Bingo%20Games`) and the Recommended Games row
 * (`/section/hot_games?label=Recommended`) both rely on — and an unknown key prints itself rather
 * than 404ing. Reproduced exactly, including that a tag's title is `decodeURIComponent`d.
 */

export const SECTION_TITLES = {
  originals: 'BC Originals',
  exclusive: 'BC Exclusive',
  slots: 'Slots',
  live_casino: 'Live Casino',
  hot_games: 'Hot Games',
  game_shows: 'Game Shows',
  new: 'New Releases',
  providers: 'Providers',
  feature_buyin: 'Feature Buy-in',
  blackjack: 'Blackjack',
  themes: 'Themes',
  table_games: 'Table Games',
  top_picks: 'Top Picks',
  pachinko: 'Pachinko',
  fishing: 'Fishing',
  poker: 'Poker',
  bingo_all: 'All Bingo Games',
  burst_games: 'Burst Games',
  Crash_games: 'Crash Games',
  trending_games: 'Trending Games',
  spin_to_win: 'Spin To Win',
};

export const TAG_TITLES = {
  megaways: 'Megaways',
  hot: 'Hot Games',
  'new-releases': 'New Releases',
  exclusive: 'BC Exclusive',
  'feature-buy-in': 'Feature buy-in',
  'table-games': 'Table games',
  'high-volatility': 'High volatility',
  'buy-extrabal-feature': 'Buy extra ball feature',
  jackpot: 'Bingo jackpot',
  bingo: 'Bingo',
  'bingo-new-release': 'Bingo New Release',
  keno: 'Keno',
  'scratch-cards': 'Scratch cards',
  baccarat: 'Baccarat',
  roulette: 'Roulette',
  blackjack: 'Blackjack',
};

/* `/gamelist/:type` is the odd one out — a switch over four types rather than a map, each with its
   own title and its own source, and a `default` arm titled "Recommend" that renders the empty
   placeholder. `editor` is "Editor's Picks" and asks the `poker` SELECTION rather than a category,
   which is the chunk's own pairing and reads as a leftover; kept as it is. */
export const GAMELIST_TITLES = {
  brand: 'BC Originals',
  editor: "Editor's Picks",
  slots: 'Slots',
  live: 'Live',
};

/* WHICH GAMES A LIST SHOWS, and this is the one part of these pages that is this build's rather
 * than the chunks'. On the original each list is a `selection/sub-list/` POST that pages
 * server-side through thousands of games; here the catalogue is local, so a route resolves to one
 * of `pages/Casino/catalogue.js`'s sets — the same lists the casino tabs draw, most of them
 * transcribed off the live tabs rather than filtered out of the 118-game capture.
 *
 * An unmapped key resolves to nothing and the page renders the site's own empty state, which is
 * the original's `default: return []` and is what the Providers, Themes and the five
 * never-captured sections (Top Picks, Pachinko, Fishing, Trending, Spin To Win) get. That is
 * deliberate: inventing a set for a section this project has never seen would be worse than the
 * empty state the original itself shows for a section with nothing in it.
 */
const SECTION_SETS = {
  originals: 'brand',
  slots: 'slots',
  live_casino: 'live',
  hot_games: 'hot',
  game_shows: 'game-shows',
  new: 'new',
  feature_buyin: 'feature-buy-in',
  blackjack: 'blackjack',
  table_games: 'table-game',
  poker: 'poker',
  burst_games: 'crash-games',
  Crash_games: 'crash-games',
};

/* A tag is matched on its KEY or on its printed label, because both reach this page: the home
   row links `/tagname/bingo` (a key) while the casino lobby links `/tagname/Poker` and
   `/tagname/Feature%20buy-in` (labels, capitalised). Normalised the same way either side, so
   "Feature buy-in", "feature-buy-in" and "FEATURE_BUY_IN" are one entry. */
const TAG_SETS = {
  hot: 'hot',
  'new-releases': 'new',
  'table-games': 'table-game',
  baccarat: 'baccarat',
  roulette: 'roulette',
  blackjack: 'blackjack',
  'feature-buy-in': 'feature-buy-in',
  poker: 'poker',
  megaways: null,
  'high-volatility': null,
  'buy-extrabal-feature': null,
  jackpot: null,
  /* `bingo` resolves through the home row above rather than through a casino set. */
  'bingo-new-release': null,
  keno: null,
  'scratch-cards': null,
};

const normalise = (value) => decodeURIComponent(value || '').toLowerCase().replace(/[\s_]+/g, '-');

/* TWO DESTINATIONS HAVE NO CASINO SET AND ARE NOT EMPTY EITHER, because the live site has no tab
   for them — they are home ROWS. BC Exclusive and Bingo are each page 1 of their own selection out
   of the captured batch response, and both are already in this project as the home rows' fixtures,
   so a row and its All page cannot disagree. `withIcons` has already run on both there; only the
   field names differ from a casino set, which is what this maps. */
const fromHomeRow = (row) =>
  row.map((game) => ({ ...game, name: game.fullName, players: game.onlineUsers }));

export function sectionGames(section) {
  if (section === 'exclusive') return fromHomeRow(exclusive);
  const set = SECTION_SETS[section];
  return set ? gamesFor(set) : [];
}

export function tagGames(tag) {
  const key = normalise(tag);
  if (key === 'exclusive') return fromHomeRow(exclusive);
  if (key === 'bingo') return fromHomeRow(bingo);
  const set = TAG_SETS[key];
  return set ? gamesFor(set) : [];
}

/* `/gamelist/:type`. `brand` and `slots` and `live` are the catalogue's own; `editor` asks the
   poker selection, as the chunk does. */
export function gamelistGames(type, originals) {
  const set = { brand: 'brand', slots: 'slots', live: 'live', editor: 'poker' }[type];
  /* `originals` reaches `gamesFor` for the one type it can serve, which is `brand`; every other
     set ignores it. See the note at `gamesFor`. */
  return set ? gamesFor(set, originals) : [];
}

/* ── LIVE (fixtures off) ─────────────────────────────────────────────────────────────────────
 *
 * The same three routes read the SmartBet catalogue instead (services/catalog.js): a section or
 * tag that names a casino set reads that set; `exclusive` has no platform source and is empty; a
 * tag this file does not know is asked for as the platform's own `category` (the game page's tag
 * chips are the platform's tags: `slots`, `live`, `crash`, `table`, ...). `null` means "not the
 * live path": fixtures on, or `/gamelist/brand`, which keeps its in-house read. */
export function readLiveList(kind, raw, page = 1) {
  if (USE_FIXTURES) return null;
  const at = { page, limit: PAGE };
  const none = { games: [], total: 0, page: 1 };
  if (kind === 'gamelist') {
    const set = { slots: 'slots', live: 'live', editor: 'poker' }[raw];
    if (raw === 'brand') return null;
    return set ? getCasinoPage(set, at) : none;
  }
  if (kind === 'section') {
    if (raw === 'originals') return null;
    const set = raw === 'exclusive' ? 'exclusive' : raw === 'fishing' ? 'fishing' : SECTION_SETS[raw];
    return set ? getCasinoPage(set, at) : none;
  }
  const key = normalise(raw);
  if (key === 'exclusive' || key === 'bingo') return getCasinoPage(key, at);
  if (TAG_SETS[key]) return getCasinoPage(TAG_SETS[key], at);
  return key ? getCasinoPage('all', { ...at, category: key }) : none;
}

/* A provider's own page, `/provider/:name` (the Providers grid's links): every game the
   platform lists under that provider, paged. Live only. */
export function readProviderList(name, page = 1) {
  if (USE_FIXTURES) return null;
  return getCasinoPage('all', { page, limit: PAGE, providers: [name] });
}
