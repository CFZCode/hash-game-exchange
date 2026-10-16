import { brandLabel } from '../../services/siteBranding';
import { assetExact } from '../../utils/gameArt';
import { isLiveSet } from '../../services/catalog';
import { PROVIDER_NAMES } from '../../data/providers';
import { POKER_GAMES, HOLDEM_ROW, TEEN_PATTI_ROW } from './pokerGames';
import { ORIGINAL_GAMES, ORIGINALS_PAGE_SIZE } from './originalGames';
import { isShownOriginal } from '../../services/originals';
import { HOT_GAMES } from './hotGames';
import { SLOT_GAMES } from './slotGames';
import { LIVE_GAMES } from './liveGames';
import { GAME_SHOW_GAMES } from './gameShowGames';
import { TABLE_GAMES } from './tableGames';
import { BLACKJACK_GAMES } from './blackjackGames';
import { ROULETTE_GAMES } from './rouletteGames';
import { BACCARAT_GAMES } from './baccaratGames';
import { NEW_GAMES } from './newGames';
import { CRASH_GAMES } from './crashGames';
import { FEATURE_BUY_GAMES } from './featureBuyGames';

/* What each row and each tab of the casino page contains.
 *
 * The casino page's own chunk is one of the pieces the mirror did NOT save: `/casino/:tab?`
 * loads `index-DTOmRFSX.js` (Enter-MsmOuq5R.js:8669) and neither it, its `Filter-CB8e5Rdj.js`,
 * nor its `index-CflFQ6HO.css` are in the save. Nor is there a captured feed for it —
 * bc.game/bc.game/api holds the HOME page's ten selections and nothing else.
 *
 * Every set below is therefore TRANSCRIBED from the live page's own rendered grid, one file
 * per tab, each carrying its own note on what that tab's DOM did and did not show. That was
 * not always true. The sets used to be derived from the 118-game capture in src/data/games.js
 * by filtering on the feed's `sections` / `categoryName` / `tags`, and the shape of the
 * capture showed through: Blackjack held two games where the live tab holds seventy-five,
 * Feature Buy-in held one, and New Releases held nothing at all because the site's `new`
 * selection was never captured. All twelve game tabs are now the live list.
 *
 * What this means for a change: DO NOT hand-edit these files. Each is generated from a
 * transcription of the page's markup, so a game added by hand has no artwork and no provenance.
 * Re-transcribe the tab instead. `src/data/games.js` is still the source for the LOBBY's rows
 * and for the Explore panel; it just no longer decides what a tab contains.
 */

/* Page 1 of a selection is ten games on the live site, which is what every home row holds.
   The same cap is applied here so `go`'s View All rule (a linked section with MORE than
   eight games gets the extra tile) fires the same way it does on the home page. */
const PAGE = 10;

/* GameSection speaks the home feed's field names (`fullName`, `icon`, `onlineUsers`); the
   catalogue speaks the search feed's (`name`, `players`) and carries no artwork. One adapter
   rather than a second GameSection. */
/* `assetExact` RATHER THAN `assetFor`, and the difference only started to matter once a row could
   be fed by the platform. `assetFor` falls back to keyword-and-hash matching and so always returns
   SOMETHING — which is fine for a transcribed set where every game has its own file, and wrong the
   moment a game arrives without one: the tile would wear another game's cover, which reads as
   correct and is not. That is the same reason the Explore grid passes `exactArt`. Checked against
   every tab before changing it: **not one transcribed game loses its artwork**, so this is a no-op
   for the twelve fixture tabs and a fix for the live one. `GameTile` draws the BC placeholder for a
   missing file, which is what a game this project has never seen should look like. */
function toRow(games) {
  return games.slice(0, PAGE).map((game) => ({
    slug: game.slug,
    fullName: game.name,
    icon: game.image ?? assetExact(game.slug),
    onlineUsers: game.players,
  }));
}

/* The sixteen tabs of the strip, in the order the live page shows them.
 *
 * The slugs are the site's own wherever the mirror names them. index-DuwOs_Mv.js:880 lists
 * `/casino/brand`, `/casino/hot`, `/casino/slots`, `/casino/live`, `/casino/game-shows`,
 * `/casino/new`, `/casino/table-game`, `/casino/crash-games` and `/casino/provider` against
 * exactly these labels, and `cu` in Enter-MsmOuq5R.js points its POKER category card at
 * `/casino/poker` — so ten of the sixteen are transcribed rather than guessed.
 *
 * Two notes on those:
 *   crash-games  the sidebar LABELS this entry "Crash Games" while the strip labels it
 *                "Burst Games". Same thing: that menu entry carries `icon: "burst_games"` and
 *                `buttonName: "sidebar_casino_burst_games"`, so burst is the internal name and
 *                the two labels are locale/brand variants of one route.
 *   themes       `/themes` is a real top-level route, but as a TAB it stays inside this page
 *                as `/casino/themes`, the same way Providers stays as `/casino/provider`.
 *
 * Blackjack, Roulette, Baccarat and Feature Buy-in appear in the strip but nowhere in the
 * saved bundle, so those four slugs are INFERRED: the route is `/casino/:tab?`, which takes
 * any single segment, and the label lowercased-and-hyphenated is the pattern the rest follow.
 * Correct them if the real chunk ever turns up.
 *
 * `tab` is the URL segment; the Lobby is the bare `/casino`, hence the empty string.
 */
export const TABS = [
  { label: 'Lobby', tab: '' },
  { label: brandLabel('BC Originals'), tab: 'brand' },
  { label: 'Hot Games', tab: 'hot' },
  { label: 'Slots', tab: 'slots' },
  { label: 'Live Casino', tab: 'live' },
  { label: 'Game Shows', tab: 'game-shows' },
  { label: 'Table Games', tab: 'table-game' },
  { label: 'Blackjack', tab: 'blackjack' },
  { label: 'Roulette', tab: 'roulette' },
  { label: 'Baccarat', tab: 'baccarat' },
  { label: 'New Releases', tab: 'new' },
  { label: 'Burst Games', tab: 'crash-games' },
  { label: 'Poker', tab: 'poker' },
  { label: 'Feature Buy-in', tab: 'feature-buy-in' },
  { label: 'Providers', tab: 'provider' },
  { label: 'Themes', tab: 'themes' },
];

/* Providers and Themes are not game lists — they are lists of links, so their tab bodies are
   a provider grid and a tag grid rather than a grid of tiles. The Explore panel makes the
   same split (`tab === "providers" ? ProviderGrid : GameGrid` in `wt`). */
export const LINK_TABS = new Set(['provider', 'themes']);

/* Tabs that carry the Sort By / Providers bar above their grid. Not every tab does — a set
   the feed already orders (Hot Games, New Releases) has nothing to sort by, and the link tabs
   have nothing to sort at all. Poker's bar is laid out differently; see POKER_PANELS. */
export const FILTER_TABS = new Set(['slots', 'live', 'poker']);

/* Poker opens on a row of variant panels above its own grid — a bordered card per variant
   holding a title, arrows and a short strip of that variant's games, then a "Browse All"
   heading and the full list.
 *
 * Both panels AND the grid below them now come from pokerGames.js, which is transcribed from
 * the live page's own rendered grid rather than derived from the capture. That replaces two
 * earlier stand-ins: the panels were read off a screenshot, and the grid filtered the capture
 * by its `Poker` tag and produced six games where the live tab holds thirty-eight. See the
 * note in that file for what is and is not recoverable. */
export const POKER_PANELS = [
  { title: "Hold'em", games: HOLDEM_ROW },
  { title: 'Teen Patti', games: TEEN_PATTI_ROW },
];

/* One place both the lobby rows and the tab pages read from, so a row and its own tab can
   never disagree about what belongs in it. */
const SETS = {
  /* The one set on this page that is transcribed rather than derived. `byCategory('Original')`
     found sixteen games in the 118-game capture; the live tab holds sixty-three. See
     originalGames.js, which also carries the page size its pager works at. */
  brand: () => ORIGINAL_GAMES.filter((game) => isShownOriginal(game.slug)),
  /* Also transcribed rather than derived. `bySection('hot_games')` found ten games in the
     capture — the home feed's hot selection, which is one page of a tab the live site pages
     into the thousands. See hotGames.js for what the 120 here do and don't cover. */
  hot: () => HOT_GAMES,
  /* Transcribed too — see slotGames.js for what the 97 do and don't cover. */
  slots: () => SLOT_GAMES,
  /* The next five are transcribed as well, so eight of the twelve tabs below now hold the
     live site's own list rather than a filter over the capture. Live Casino, Game Shows and
     Table Games render no pager at all on the live page, so those three are COMPLETE;
     Blackjack and Roulette are complete too, their pagers agreeing at "of 02". */
  live: () => LIVE_GAMES,
  'game-shows': () => GAME_SHOW_GAMES,
  'table-game': () => TABLE_GAMES,
  blackjack: () => BLACKJACK_GAMES,
  roulette: () => ROULETTE_GAMES,
  baccarat: () => BACCARAT_GAMES,
  poker: () => POKER_GAMES,
  /* `new` used to be deliberately absent, because the site's `new` selection was never
     captured and the tab rendered the empty state. It is transcribed now — see newGames.js. */
  new: () => NEW_GAMES,
  'crash-games': () => CRASH_GAMES,
  /* `feature` is the lobby row's key and `feature-buy-in` the tab's slug; both are the same
     set, so the row and its tab can never disagree. */
  feature: () => FEATURE_BUY_GAMES,
  'feature-buy-in': () => FEATURE_BUY_GAMES,
  /* An unknown tab falls through to an empty array, which is the original's own
     `default: return []`. */
};

/* How many tiles a tab's grid shows before it pages. Counted off the BC Originals tab, the
   only one the mirror caught a pager on — see originalGames.js. It is applied to every tab
   rather than that one, because the pager is the page's, not the tab's; the difference is
   invisible today since no other set here reaches forty and Pagination renders nothing at one
   page. */
export const GRID_PAGE_SIZE = ORIGINALS_PAGE_SIZE;

/* `originals` IS AN OPTIONAL LIVE OVERRIDE FOR ONE TAB, and threading it through here rather than
   special-casing at the call sites is what keeps the lobby row, the `/casino/brand` tab and
   `/gamelist/brand` reading one function. It is the platform's own in-house catalogue when the API
   is on and `undefined` otherwise, so with fixtures the transcribed set answers exactly as before —
   see `services/originals.js` for why this is the only tab the platform can feed. `undefined`
   rather than an empty array is the pending state, and it must fall through to the transcription:
   an empty array is a real answer and would blank the tab. */
export function gamesFor(tab, originals, live) {
  if (tab === 'brand' && originals) return originals;
  /* Fixtures off: every set but BC Originals is the SmartBet catalogue's answer, passed in by the
     caller as `{[tab]: games}` (see services/catalog.js). Pending or unfed reads as empty, never
     as the transcription. */
  if (isLiveSet(tab)) return live?.[tab] ?? [];
  const set = SETS[tab];
  return set ? set() : [];
}

/* The lobby, top to bottom. Poker and Feature Buy-in are rows without a tab, so they link to
   `/tagname/:tag` — the site's own route for a tag listing (Enter-MsmOuq5R.js:8697), and the
   one the home page's Bingo row already uses. */
export const ROWS = [
  { title: brandLabel('BC Originals'), key: 'brand', href: '/casino/brand' },
  { title: 'Hot Games', key: 'hot', href: '/casino/hot' },
  { title: 'Slots', key: 'slots', href: '/casino/slots' },
  { title: 'Live Casino', key: 'live', href: '/casino/live' },
  { title: 'Game Shows', key: 'game-shows', href: '/casino/game-shows' },
  { title: 'New Releases', key: 'new', href: '/casino/new' },
  { title: 'Poker', key: 'poker', href: '/tagname/Poker' },
  { type: 'providers' },
  { title: 'Feature Buy-in', key: 'feature', href: '/tagname/Feature%20buy-in' },
  { title: 'Blackjack', key: 'blackjack', href: '/casino/blackjack' },
  { type: 'themes' },
  { title: 'Table Games', key: 'table-game', href: '/casino/table-game' },
];

export function rowGames(key, originals, live) {
  /* `undefined` while a live row is in flight, which GameSection draws as its skeleton. */
  if (isLiveSet(key) && live?.[key] === undefined) return undefined;
  return toRow(gamesFor(key, originals, live));
}

/* The lobby's live rows, asked for in one go. */
export const LOBBY_KEYS = ROWS.filter((row) => row.key && row.key !== 'brand').map((row) => row.key);

/* The Poker tab's two panels. Fixtures: the transcription. Live: the tab's own games split by
   name, since the platform has no variant feed. */
export function pokerPanels(games) {
  if (!isLiveSet('poker')) return POKER_PANELS;
  const by = (re) => toRow((games ?? []).filter((game) => re.test(game.name)));
  return [
    { title: "Hold'em", games: by(/hold.?em/i) },
    { title: 'Teen Patti', games: by(/teen ?patti/i) },
  ];
}

/* The provider list and its order are the live site's, transcribed from its own rendered
   filter — see data/providers.js, which also holds each mark. This used to be a local array of
   twenty-four names reconstructed from the game catalogue; it is forty-six now and every one
   of them has a real logo. */
export const ALL_PROVIDERS = PROVIDER_NAMES;

/* EIGHT, not four. A capture of the live lobby shows the strip filling the content column with
   eight chips — BC.GAME, CROCO GAMING, JILI, FC, PRAGMATIC PLAY, PG, NOLIMIT CITY, HACKSAW
   GAMING — where this said four on an earlier reading of a narrower crop. The count is what the
   row's own width now assumes as well; see the `lg:w-[calc(...)]` note in ChipRow.jsx, which
   sizes a chip so exactly eight span the column.

   TWO OF THOSE EIGHT ARE NOT IN THIS BUILD'S PROVIDER LIST AT ALL, so the membership is close
   but not identical: `data/providers.js` is transcribed from the live FILTER, which carries
   forty-six studios and includes neither JILI nor Pragmatic Play. The first eight here come out
   BC.GAME / Croco Gaming / FA CHAI / PG Soft / TaDa / Nolimit City / Hacksaw Gaming / 1SPIN4WIN
   — six of the capture's eight, with TaDa and 1SPIN4WIN standing where JILI and Pragmatic Play
   are. Adding the missing two means their marks, and this build has no URL for either.

   It used to be "first two, skip one, next two": a correction for a DERIVED ranking that put
   Evolution Gaming third, because this catalogue is weighted towards its live-casino tables.
   With the real order in place that skip is gone and would now drop the wrong chip. */
export const PROVIDERS = ALL_PROVIDERS.slice(0, 8);

/* The site's ninety-four themes, in its own order, transcribed from the live Themes page.
 *
 * These are labels for links, not a data set — there is nothing here to derive, so unlike
 * every game row on this page the list is copied rather than computed. The lobby's Themes
 * strip and the Themes tab both read it; the strip scrolls, the tab wraps.
 *
 * NOTE THE CASING. The site title-cases these ("Provably Fair", "Crash Games") and uses "&"
 * where the game feed's own tags use lowercase and "and" ("Provably fair", "Crash games").
 * They are the same concepts spelled two ways, and the two are NOT interchangeable: these
 * strings go into /tagname/<label> hrefs, so a future tag page has to fold case and separator
 * before matching them against `tags` in data/games.js. Nothing does that today because
 * /tagname is not built.
 *
 * `Buy Extra Ball Feature` is written out in full. The live page shows it truncated with an
 * ellipsis because its grid cell is too narrow, which is a rendering result, not the label. */
export const THEMES = [
  'BC Originals',
  'Provably Fair',
  'Slots',
  'Crash Games',
  'Burst Games',
  'Dice',
  'Bonus Buy',
  'Multipliers',
  'Jackpots',
  'Pirates & Adventure',
  'Sweet Wins',
  'Wild Animals',
  'Oriental Fortune',
  'Football & Passion',
  'Treasures',
  'Mining',
  'Horror & Darkness',
  'Dragons & Fantasy',
  'Table Games',
  'Scatter Symbols',
  'Bonus Wheel',
  'Expanding Symbols',
  'Freespins',
  'Fishing',
  'Poker',
  'Wild West',
  'Feature Buy-In',
  'Cascading Reels',
  'Bonus Symbols',
  'Bingo',
  'Game Shows',
  'Asian Theme',
  'Beauties',
  'Roulette',
  'Respins',
  'BC Exclusive',
  'Blackjack',
  'Space & Future',
  'Diamonds',
  'Spin To Win',
  'Baccarat',
  'Hold & Win',
  'Food',
  'High Volatility',
  'Space',
  'Buy Extra Ball Feature',
  'Mystery Symbols',
  'Gamble Feature',
  'Animals',
  'Arcade',
  'Sic Bo',
  'Ancient',
  'Mythology',
  'Fruits',
  'Keno',
  'Sticky Symbols',
  'Money Symbols',
  'Gold',
  'Random Feature',
  'Teen Patti',
  'Bingo Jackpot',
  'Exploding Symbols',
  'Scratch Cards',
  'Rummy',
  'Ocean',
  'MTT',
  'Customized',
  'Candy',
  'Cluster Pays',
  'Megaways',
  'Action',
  'Dragons',
  'Egyptian',
  'Classic Slots',
  'Latino',
  "Hold'em",
  'Halloween',
  'Sports',
  'Lottery',
  'Classic',
  '777',
  'Magic',
  'Cricket',
  'Pick A Bonus',
  'Mayan',
  'Horror',
  'NFT',
  'Pirates',
  'Andar Bahar',
  'Fantasy',
  'Chinese',
  'Adventure',
  'Jokers',
  'Pachinko',
];
