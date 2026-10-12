import { request, USE_FIXTURES } from './client';
import ENDPOINTS from './endpoints';
import { GAMES } from '../data/games';
import { PROVIDERS } from '../data/providers';

/* The game catalogue, shared by the Explore panel and the casino page.
 *
 * TWO ENDPOINTS HERE ARE GUESSES, and it is worth being blunt about which. `src/data/games.js`
 * was GENERATED from two captured game feeds whose request URLs were never recorded, so
 * `ENDPOINTS.games` and `ENDPOINTS.providers` are placeholders shaped like their neighbours.
 * The payloads are real — 118 games deduplicated by `gameUrl`, carrying the feed's own
 * `providerName` / `categoryName` / `tags` — but the paths will need correcting. They live in
 * endpoints.js under a heading that says so, so correcting them is one edit in one file.
 *
 * `providerLogo` and `canonicalProvider` stay in `data/providers.js` and are still imported
 * directly: they resolve a local asset and normalise a name, neither of which a backend does.
 */
export const getGames = () => request(ENDPOINTS.games, { fixture: GAMES });

export const getProviders = () => request(ENDPOINTS.providers, { fixture: PROVIDERS });

/* ── THE SMARTBET CATALOGUE ────────────────────────────────────────────────────────────────────
 *
 * With fixtures off, every casino list (the lobby rows, each `/casino/:tab`, `/gamelist`,
 * `/section`, `/tagname`, the Explore panel and the search boxes) reads the platform's own
 * aggregator catalogue: `GET /casino/games` (~2000 rows, public; `.strict()` query of
 * `page, limit <= 100, provider, sort, type, category, search, ...`) and the curated lists under
 * `/casino/games/collections/:collection`. The paths are kept here, not in endpoints.js, so this
 * area's wiring is one file.
 *
 * A row is `{uuid, name, provider, type, image, tags, slug}`. `slug` is the platform's own
 * `<name>-by-<provider>` page slug (the same form bc.game's urls use), and `/game/:gameUnique`
 * resolves it with `/casino/games/slug/:slug`. `image` is a full URL, or null and the tile draws
 * its own no-art state. No row carries a player count, so `players` is 0 and the tile omits it.
 *
 * Sets with no platform source (New Releases, Feature Buy-in, BC Exclusive) answer `[]` and
 * render the page's own empty state: nothing transcribed from bc.game is shown on the live path.
 */
const API = {
  games: '/api/v1/casino/games',
  collection: (name) => `/api/v1/casino/games/collections/${encodeURIComponent(name)}`,
  providers: '/api/v1/casino/games/providers',
  bySlug: (slug) => `/api/v1/casino/games/slug/${encodeURIComponent(slug)}`,
  byUuid: (uuid) => `/api/v1/casino/games/detail/${encodeURIComponent(uuid)}`,
};

/* The route's own cap. A tab grid pages client-side over the first hundred. */
export const LIVE_LIMIT = 100;

/* Which platform query feeds each casino set key (the keys `pages/Casino/catalogue.js` uses).
   `category` values are the import's normalised tags plus the name-matched categories in the
   backend's `games.constants.js` (`NAME_CATEGORIES`). `null`: the platform has nothing for it. */
const SET_QUERY = {
  all: {},
  hot: { collection: 'hot' },
  slots: { category: 'slots' },
  live: { category: 'live' },
  'game-shows': { category: 'game-shows' },
  'table-game': { category: 'table' },
  blackjack: { category: 'blackjack' },
  roulette: { category: 'roulette' },
  baccarat: { category: 'baccarat' },
  poker: { category: 'poker' },
  'crash-games': { category: 'crash' },
  fishing: { category: 'fishing' },
  bingo: { search: 'bingo' },
  new: null,
  feature: null,
  'feature-buy-in': null,
  exclusive: null,
};

/* Whether the live path owns this set key (so a pending read is a skeleton, not a fallback). */
export const isLiveSet = (key) => !USE_FIXTURES && Object.prototype.hasOwnProperty.call(SET_QUERY, key);

const SORT_PARAM = { 'a-z': 'az', 'z-a': 'za' };

export function toCatalogGame(row) {
  return {
    slug: row.slug || row.uuid,
    name: row.name ?? '',
    provider: row.provider ?? '',
    category: row.type ?? '',
    players: 0,
    sections: [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    image: row.image || undefined,
    uuid: row.uuid,
    source: 'aggregator',
  };
}

const toGames = (rows) => (Array.isArray(rows) ? rows : []).filter(Boolean).map(toCatalogGame);

/* One set, live. `null` in fixture mode (the caller keeps its transcription), `[]` for a set the
   platform cannot feed. `providers`, `sort` and `search` go to the server so the hundred rows
   asked for are the right hundred; a curated collection takes none of them and keeps its order. */
export function getCasinoSet(key, { limit = LIVE_LIMIT, providers = [], sort = '', search, category } = {}) {
  if (USE_FIXTURES) return null;
  const spec = SET_QUERY[key];
  if (!spec) return [];

  if (spec.collection && !search && !category && !providers.length && !SORT_PARAM[sort]) {
    return Promise.resolve(
      request(API.collection(spec.collection), { live: true, params: { limit }, fixture: [] }),
    ).then(toGames);
  }

  const params = {
    limit,
    category: category || spec.category,
    search: search || spec.search,
    provider: providers.length ? providers.join(',') : undefined,
    sort: SORT_PARAM[sort],
  };
  return Promise.resolve(request(API.games, { live: true, params, fixture: [] })).then(toGames);
}

/* Several sets at once, as a map: the casino lobby's rows. A failed set reads as empty rather
   than taking the whole lobby down with it. */
export function getCasinoSets(keys, options) {
  if (USE_FIXTURES) return null;
  return Promise.all(
    keys.map((key) => Promise.resolve(getCasinoSet(key, options)).catch(() => [])),
  ).then((lists) => Object.fromEntries(keys.map((key, i) => [key, lists[i] ?? []])));
}

/* The provider list, live: `{rows: [{name, displayName, logoUrl}]}` -> names, an operator's
   display name winning. `null` in fixture mode. A name with no local mark renders as text
   (`ProviderLogo`'s own fallback). */
export function getLiveProviders() {
  if (USE_FIXTURES) return null;
  return Promise.resolve(request(API.providers, { live: true, fixture: { rows: [] } })).then((data) =>
    (data?.rows ?? []).map((row) => row.displayName || row.name).filter(Boolean),
  );
}

/* One game for `/game/:gameUnique`: by page slug, then by uuid (a recently-played row links by
   uuid). `null` when neither knows it; a 404 or 422 is "not in the catalogue", not a failure. */
export async function getLiveGame(ref) {
  const read = (path) =>
    Promise.resolve(request(path, { live: true, fixture: null })).catch((error) => {
      if (error?.status === 404 || error?.status === 422) return null;
      throw error;
    });
  const bySlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ref) ? await read(API.bySlug(ref)) : null;
  const row = bySlug ?? (/^[A-Za-z0-9._:-]+$/.test(ref) ? await read(API.byUuid(ref)) : null);
  return row ? toCatalogGame(row) : null;
}
