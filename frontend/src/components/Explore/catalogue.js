import { brandLabel } from '../../services/siteBranding';
import { GAMES } from '../../data/games';
import {
  AllGamesIcon,
  OriginalsIcon,
  HotIcon,
  SlotsIcon,
  LiveCasinoIcon,
  TableGameIcon,
  NewReleasesIcon,
  PokerIcon,
  FeatureBuyInIcon,
  ProvidersIcon,
} from './icons';

/* `i1` in Filter-BJdLcmkK.js, in its own order, with its own icons. Two entries there are
 * conditional and both resolve to shown for this locale: `hidden: !1` on Live Casino and on
 * Feature Buy-in, and the Hot Games label swaps to "Popular in Mexico" only when `M.bcmx`.
 * `__ENV_SITE__ Originals` is the site name substituted at render time (`P5`), which for
 * bc.game is "BC".
 */
export const TABS = [
  { label: 'All Games', value: 'allgames', Icon: AllGamesIcon },
  { label: brandLabel('BC Originals'), value: 'original', Icon: OriginalsIcon },
  { label: 'Hot Games', value: 'hot', Icon: HotIcon },
  { label: 'Slots', value: 'slots', Icon: SlotsIcon },
  { label: 'Live Casino', value: 'live', Icon: LiveCasinoIcon },
  { label: 'Table Game', value: 'table', Icon: TableGameIcon },
  { label: 'New Releases', value: 'newreleases', Icon: NewReleasesIcon },
  { label: 'Poker', value: 'poker', Icon: PokerIcon },
  { label: 'Feature Buy-in', value: 'feature', Icon: FeatureBuyInIcon },
  { label: 'Providers', value: 'providers', Icon: ProvidersIcon },
];

/* `D` in Filter-BJdLcmkK.js. "Popular" is the empty value — it means "however the feed
   ordered it", which for us is catalogue order. */
export const SORTS = [
  { label: 'Popular', value: '' },
  { label: 'Newest', value: 'new' },
  { label: 'A-Z', value: 'a-z' },
  { label: 'Z-A', value: 'z-a' },
];

/* Every distinct provider in the catalogue, alphabetical. The live filter builds this from
   the feed's `providerList`, which is an empty array in both captured responses — so it is
   derived from the games themselves instead. */
export const PROVIDERS = [...new Set(GAMES.map((game) => game.provider))].sort((a, b) =>
  a.localeCompare(b),
);

/* Browse mode: no query, so each tab is its own feed request on the live site. The mapping
 * below is what those selections contain, taken from the captured responses:
 *
 *   allgames     every game the mirror captured
 *   original     categoryName "Original Casino"
 *   hot          the `hot_games` selection
 *   slots        categoryName "Slots"
 *   live         categoryName "Live Casino"
 *   table        the `table_games` selection
 *   poker        tagged Poker
 *   feature      tagged "Feature buy-in"
 *   newreleases  NOTHING — the site has a `new` selection and the mirror did not capture it,
 *                so this tab renders the empty state rather than inventing a list.
 *   providers    handled separately; it is a provider grid, not a game grid.
 */
export function browseTab(tab) {
  switch (tab) {
    case 'allgames':
      return GAMES;
    case 'original':
      return GAMES.filter((game) => game.category.includes('Original'));
    case 'hot':
      return GAMES.filter((game) => game.sections.includes('hot_games'));
    case 'slots':
      return GAMES.filter((game) => game.category.includes('Slots'));
    case 'live':
      return GAMES.filter((game) => game.category.includes('Live'));
    case 'table':
      return GAMES.filter((game) => game.sections.includes('table_games'));
    case 'poker':
      return GAMES.filter((game) => game.tags.includes('Poker'));
    case 'feature':
      return GAMES.filter((game) => game.tags.includes('Feature buy-in'));
    default:
      return [];
  }
}

/* The live search is a POST to /game/home/recommend/search/ with the raw keyword; the
   matching is the server's. Name first, then provider and tags, so typing "evolution" or
   "bingo" finds the rows a player would expect — the live endpoint does the same, which is
   why searching a provider name there returns that provider's catalogue. */
function matches(game, needle) {
  if (game.name.toLowerCase().includes(needle)) return true;
  if (game.provider.toLowerCase().includes(needle)) return true;
  return game.tags.some((tag) => tag.toLowerCase().includes(needle));
}

/* `me` in index-DrTwTnbT.js only fires above one character, and `ot` prints "Search requires
   at least 2 characters" below that — so the threshold lives in the caller, not here. */
export function searchGames(query) {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  return GAMES.filter((game) => matches(game, needle));
}

/* Search mode: the tab narrows the result set rather than fetching. Verbatim from `gt` in
 * index-BChnjnW3.js, including the parts that return nothing —
 *
 *   default: return []
 *
 * is the original's own last case, so Table Game / Poker / Feature Buy-in genuinely show the
 * empty state over a search there too. `hot` and `newreleases` filter on `retrieveId`, which
 * the search response populates and the selection responses do not; `hot` uses the captured
 * selection instead and `newreleases` has nothing to fall back on.
 */
export function narrowResults(results, tab) {
  switch (tab) {
    case 'allgames':
      return results;
    case 'original':
      return results.filter((game) => game.category.includes('Original'));
    case 'slots':
      return results.filter((game) => game.category.includes('Slots'));
    case 'live':
      return results.filter((game) => game.category.includes('Live'));
    case 'hot':
      return results.filter((game) => game.sections.includes('hot_games'));
    default:
      return [];
  }
}

/* `Popular` and `Newest` both fall through to catalogue order: the feed sorts server-side
   and neither capture carries a release date, so there is nothing here to sort `new` by.
   A-Z and Z-A are real. */
export function sortGames(games, sort) {
  if (sort === 'a-z') return [...games].sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'z-a') return [...games].sort((a, b) => b.name.localeCompare(a.name));
  return games;
}

export function filterByProvider(games, providers) {
  if (!providers.length) return games;
  return games.filter((game) => providers.includes(game.provider));
}
