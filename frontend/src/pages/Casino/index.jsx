import React from 'react';
import useResource from '../../hooks/useResource';
import { getOriginals } from '../../services/originals';
import { getCasinoPage, getCasinoSets, getLiveProviders, isLiveSet } from '../../services/catalog';
import { USE_FIXTURES } from '../../services/client';
import { useGates } from '../../context/gates';
import { useParams } from 'react-router-dom';
import RecentFavorites from '../Home/RecentFavorites';
import Hero from '../Home/Hero';
import GameSection from '../Home/GameSection';
import LatestBets from '../Home/LatestBets';
import SectionHeader from '../../components/shared/SectionHeader';
import CasinoTabStrip from './TabStrip';
import { ProviderRow, ThemeRow } from './ChipRow';
import GameGrid, { Empty, ProviderGrid } from '../../components/Explore/GameGrid';
import FilterBar from '../../components/Explore/FilterBar';
import PokerTab from './PokerTab';
import ShowBlocked from './ShowBlocked';
import Pagination from '../../components/shared/Pagination';
import { SearchIcon, CloseIcon } from '../../components/Explore/icons';
import { searchGames, sortGames } from '../../components/Explore/catalogue';
import { canonicalProvider } from '../../data/providers';
import {
  TABS,
  ROWS,
  LINK_TABS,
  FILTER_TABS,
  PROVIDERS,
  ALL_PROVIDERS,
  THEMES,
  GRID_PAGE_SIZE,
  gamesFor,
  rowGames,
  LOBBY_KEYS,
} from './catalogue';
import './Casino.css';

/* The casino page — `/casino` and `/casino/:tab`.
 *
 * Route from Enter-MsmOuq5R.js:8669 (`path: "/casino/:tab?"`), which is also where the home
 * page's CASINO category card points (`wn` with `href: "/casino"`, line 4693).
 *
 * NONE OF THIS PAGE'S OWN CODE IS IN THE MIRROR, BUT ALL OF IT IS ON `hash.game`, and that
 * changes what this file is. Its chunk, its filter chunk and its stylesheet were lazily loaded
 * and never saved, so the page was originally transcribed from the live rendered page the way
 * the footer was — screenshot structure, measured geometry, and every part with a saved
 * counterpart built from that counterpart rather than a lookalike. All three are fetchable
 * under the hashes `Enter-MsmOuq5R.js` already lists for `path: "/casino/:tab?"`:
 *
 *   assets/index-DTOmRFSX.js    the page          39.6 KB
 *   assets/Filter-CB8e5Rdj.js   its own filter     1.8 KB
 *   assets/index-CflFQ6HO.css   its stylesheet     422 B  (`.grid-editor`, and nothing else)
 *
 * plus `IconBaccarat-BVqEdz90.js` and the other four tab icons this page draws from the
 * greyscale sprite because their chunks "were never saved" — see Casino.css, which is now a
 * standing TODO rather than a limitation.
 *
 * SO CHECK THE CHUNK BEFORE MEASURING ANYTHING HERE. It is mostly composition — six tiny Solid
 * templates over shared components — but the composition is exactly what a screenshot cannot
 * give you, and the first audit against it found two divergences that a desktop capture could
 * never have shown: the Poker tab's panel layout (see PokerTab.jsx) and the tab strip's phone
 * padding (see TabStrip.jsx). Both were right at the width the reference was captured at.
 *
 * The rows themselves are ordered as the screenshot has them; where each one's games come
 * from is documented in catalogue.js.
 */

/* Above the tabs. `.input` at its own defaults, which is what the live bar samples as:
   #292D2E fill (`input_bright`) and 40px tall, i.e. the `.pc .input` height. The magnifier is
   `order-first` for the same reason the Explore panel's is — the original puts the trailing
   slot in DOM order and re-orders visually.

   `font-semibold` is on the wrapper, not the <input>, so the placeholder inherits it — the
   Explore panel's box carries the same class in the same place. Without it the field renders
   at the body's 400 and the placeholder reads visibly lighter than the live one.

   `mt-3` over `mb-1`, so the box sits 12px under the hero and hands 4px to the tab strip below
   it — which adds its own `pt-2` for a 12px gap there too. THE `mb-1` BELONGS HERE RATHER THAN
   ON THE STRIP because the strip is sticky, and a top margin on a sticky element drops its
   border box below the offset and opens a see-through window under the fixed header while it
   is pinned. A margin on this box cannot: it leaves the flow the moment the strip sticks. See
   the long note in TabStrip.jsx.

   It was briefly mt-2: the reference puts 3 rows of a 0.4x capture between the hero's bottom
   edge and this box's top border, and since both are hard edges rather than text that reads
   as 7.5px. But 3 rows at that scale carries a +/-2.5px error either way, so 12px is equally
   consistent with the capture — and it is the value chosen here. Do not "correct" it back to
   8px on the strength of that measurement alone. */
function SearchBar({ query, setQuery }) {
  const [focused, setFocused] = React.useState(false);

  return (
    <div className="mb-1 mt-3 w-full px-4 sm:px-0">
      <div className="input w-full px-2 font-semibold" {...(focused ? { 'data-focus': '' } : {})}>
        <SearchIcon className="order-first size-6 fill-secondary" />
        <input
          type="text"
          placeholder="Search games"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {query && (
          <button
            type="button"
            className="button mr-1 flex size-6 items-center justify-center rounded-md bg-layer6 p-0"
            onClick={() => setQuery('')}
          >
            <CloseIcon className="size-4 fill-secondary" />
          </button>
        )}
      </div>
    </div>
  );
}

/* The lobby: the twelve rows of the default tab. A row with no games still renders — the
   empty state under its own header is the site's behaviour and the only honest thing to show
   for New Releases, whose selection the mirror never captured. */
/* The Themes chips, less "BC Originals" when Originals is switched off. */
const themesFor = (gates) => (gates.on('originals') ? THEMES : THEMES.filter((label) => label !== 'BC Originals'));

function Lobby({ originals, live, providerRow }) {
  const gates = useGates();
  return [
    /* THE SAME BLOCK THE HOME PAGE CARRIES, and the casino page really does mount it — its
       chunk imports it by name. `index-DTOmRFSX.js` (off `hash.game/assets/`, not in the
       mirror) opens with `import{ … ao as H1 … }from"./Enter-MsmOuq5R.js"`, and `ao` is `wu`
       in Enter's export map — the Continue Playing / Favorites wrapper. Its placement is the
       lobby's first child, ahead of the ordered rows:

         d(l, e(H1, {}), null), d(l, e(F, { each: o(), … }), null)

       which is the same position `ng()` gives it on home. LOBBY ONLY: it sits in the section
       list, so the Slots, Poker, Themes and Providers tabs never show it — and it carries its
       own login and empty-list gates, so it renders nothing here for a visitor with neither
       favourites nor history. */
    <RecentFavorites key="recent-favorites" />,
    /* BC Originals switched off: its row goes, nothing in its place. */
    ...ROWS.filter((row) => row.key !== 'brand' || gates.on('originals')).map((row) => {
    if (row.type === 'providers') return <ProviderRow key="providers" providers={providerRow} />;
    if (row.type === 'themes') return <ThemeRow key="themes" themes={themesFor(gates)} />;

    const games = rowGames(row.key, originals, live);
    return games === undefined || games.length ? (
      <GameSection key={row.key} title={row.title} games={games} href={row.href} />
    ) : (
      <EmptyRow key={row.key} title={row.title} href={row.href} />
    );
    }),
  ];
}

/* The Themes tab's body: the same chips the lobby's Themes row holds, wrapped instead of
   scrolled. The template mirrors ProviderGrid's, which is the original's own for the
   equivalent tab — a 2-column grid below sm, auto-filled above it.
   Same 160 x 53 box and same 8px gap as the row, so the two views agree. The auto-fill floor
   is the chip's own 10rem; at the 1216px content width that yields seven columns, which is
   what the live grid shows.
   One label will not fit — "Buy Extra Ball Feature" — and it TRUNCATES rather than wrapping,
   which is what the live grid does with that exact label ("Buy Extra Ball Fea…"). `min-w-0` is
   what makes that work: a flex item's automatic minimum size is its content, so without it the
   span refuses to shrink and overflows the chip instead of ellipsing. */
function ThemeGrid({ themes }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]">
      {themes.map((label) => (
        <a
          key={label}
          href={`/tagname/${encodeURIComponent(label)}`}
          className="button h-[3.3125rem] overflow-hidden rounded-xl bg-layer4 p-0 text-center text-sm font-semibold text-primary"
        >
          <span className="min-w-0 truncate px-2">{label}</span>
        </a>
      ))}
    </div>
  );
}

/* GameSection owns its own header, so a row with nothing to scroll needs one on its own. No
   controller is passed: there is no strip for it to drive. */
function EmptyRow({ title, href }) {
  return (
    <>
      <SectionHeader className="px-4 sm:px-0" href={href}>
        {title}
      </SectionHeader>
      <Empty />
    </>
  );
}

export default function Casino() {
  const { tab = '' } = useParams();
  const gates = useGates();

  /* BC ORIGINALS IS THE ONE TAB THE PLATFORM CAN FEED, and it feeds three surfaces from here: the
     lobby's own BC Originals row, the `/casino/brand` tab's grid, and the search's "narrow within
     this tab" set. `undefined` while the read is in flight, which `gamesFor` treats as "no
     override" and answers from the transcription — so the tab is never momentarily empty. With
     fixtures on the read IS the transcription, so nothing about this page changes. See
     `services/originals.js` for why the other eleven tabs stay transcribed. */
  const { data: originals } = useResource(getOriginals);

  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState('');
  const [providers, setProviders] = React.useState([]);

  /* The filter tabs' Show Blocked switch. Held here rather than beside the control so it
     survives a tab change, which is what the two selects beside it already do — the Poker tab
     keeps its own copy because that one belongs to `PokerTab`'s own filter row. Inert until a
     feed carries a blocked flag; see the note on the component. */
  const [showBlocked, setShowBlocked] = React.useState(false);

  /* The tab strip is route-driven, so an unknown segment is possible — `/casino/anything`
     still matches. Fall back to the lobby rather than rendering a strip with nothing lit. */
  const known = TABS.some((entry) => entry.tab === tab);
  const active = known ? tab : '';

  const searching = query.trim().length > 0;
  const tooShort = searching && query.trim().length < 2;

  /* Searching narrows within the tab you are on, which is what the Explore panel does with
     its own tabs (`gt` in index-BChnjnW3.js). On the lobby there is no tab to narrow to, so
     it searches the whole catalogue. */
  /* LIVE (fixtures off): the lobby's rows read the SmartBet catalogue (services/catalog.js), and
     the browse grid, a tab or a search, asks the server for EXACTLY the page it shows, with the
     real total behind the pager, so the whole catalogue is reachable. Each reader answers `null`
     with fixtures on, so the transcribed path below is untouched. Tabs with the filter bar send
     their provider and sort with it. BC Originals keeps its in-house read. */
  const pageKey = `${active}|${query.trim()}|${sort}|${providers.join(',')}`;
  const [pageBox, setPageBox] = React.useState({ key: pageKey, page: 1 });
  const requestedPage = pageBox.key === pageKey ? pageBox.page : 1;

  const readLobby = React.useCallback(() => (active ? null : getCasinoSets(LOBBY_KEYS, { limit: 10 })), [active]);
  const { data: liveLobby } = useResource(readLobby);
  const liveGrid = !USE_FIXTURES && active !== 'brand' && (searching ? !tooShort : isLiveSet(active));
  const gridKey = liveGrid
    ? JSON.stringify([
        searching ? active || 'all' : active,
        searching ? query.trim() : '',
        FILTER_TABS.has(active) && !searching ? providers : [],
        FILTER_TABS.has(active) && !searching ? sort : '',
        requestedPage,
      ])
    : '';
  const readGrid = React.useCallback(() => {
    if (!gridKey) return null;
    const [set, search, chosen, order, at] = JSON.parse(gridKey);
    return getCasinoPage(set, { search: search || undefined, providers: chosen, sort: order, page: at, limit: GRID_PAGE_SIZE });
  }, [gridKey]);
  const { data: livePage } = useResource(readGrid);
  const { data: liveProviders } = useResource(getLiveProviders);
  const live = active ? { [active]: livePage?.games } : liveLobby;
  const liveSearch = livePage?.games;

  const results = React.useMemo(() => {
    if (!searching || tooShort) return [];
    if (!USE_FIXTURES) {
      if (active !== 'brand') return liveSearch ?? [];
      const needle = query.trim().toLowerCase();
      return gamesFor('brand', originals).filter((game) => game.name.toLowerCase().includes(needle));
    }
    const found = searchGames(query);
    if (!active) return found;
    const inTab = new Set(gamesFor(active, originals).map((game) => game.slug));
    return found.filter((game) => inTab.has(game.slug));
  }, [searching, tooShort, query, active, originals, liveSearch]);

  const base = searching ? results : gamesFor(active, originals, live);

  /* Only three tabs carry the Sort By / Providers bar — see FILTER_TABS. Everywhere else the
     grid shows the tab's set in feed order, so the sort and the provider selection are simply
     not applied rather than being applied as no-ops. */
  const filtered = FILTER_TABS.has(active) && !searching;

  /* The filter offers EVERY provider, in the site's own order, not only those present in the
     current result set. That is what the live filter does — its rendered list is all
     forty-six, several of which have nothing under the tab you are on. It used to intersect
     against the tab's games, which is why the Poker tab's filter showed three. */
  const available = USE_FIXTURES ? ALL_PROVIDERS : liveProviders ?? [];

  /* Provider comparison goes through `canonicalProvider` rather than Explore's
     `filterByProvider`, which compares the raw strings. The two lists spell the house studio
     differently — `BC Originals` on a game, `BC.GAME` in the filter — so a raw match would
     quietly return nothing for the provider with the most games in the catalogue. */
  const games = React.useMemo(() => {
    if (!filtered) return base;
    const wanted = new Set(providers.map(canonicalProvider));
    const narrowed = wanted.size
      ? base.filter((game) => wanted.has(canonicalProvider(game.provider)))
      : base;
    return sortGames(narrowed, sort);
  }, [filtered, base, providers, sort]);

  /* The browse grid pages at GRID_PAGE_SIZE. The page number RESETS whenever the thing being
     paged changes — a different tab, a different search, a different sort or provider set —
     otherwise switching from page 2 of BC Originals to a nine-game tab lands on an empty grid.
     That reset is derived during render, keyed on those inputs, rather than done in an effect:
     `react-hooks/set-state-in-effect` forbids the effect, and the derived form has no
     intermediate frame showing the stale page. */
  /* Live, the grid already holds one server page: the pager counts the real total and nothing is
     sliced. While a page is in flight the pager keeps the page asked for. */
  const pages = liveGrid
    ? Math.max(1, requestedPage, Math.ceil((livePage?.total ?? 0) / GRID_PAGE_SIZE))
    : Math.max(1, Math.ceil(games.length / GRID_PAGE_SIZE));
  /* Clamped as well as reset: a set can shrink under the current page without the key moving
     (it cannot today, but the clamp is what makes that safe). */
  const page = Math.min(requestedPage, pages);
  const setPage = (next) => setPageBox({ key: pageKey, page: next });

  const pageGames = React.useMemo(
    () => (liveGrid ? games : games.slice((page - 1) * GRID_PAGE_SIZE, page * GRID_PAGE_SIZE)),
    [liveGrid, games, page],
  );

  /* Only the lobby, and only when nothing is being searched, shows the row layout. Everything
     else is the browse grid — one tab's games, or a search's results. */
  const showLobby = !searching && !active;

  /* Providers and Themes hold links, not games, so their bodies are their own grid. A search
     overrides them, exactly as it does in the Explore panel. */
  const linkTab = !searching && LINK_TABS.has(active);

  return (
    /* pb-12 = 48px from `sm` up, so the last row of cards clears the footer. The layout's own
       bottom padding only clears the fixed tabbar, and the footer is a SIBLING of this container
       rather than inside it, so nothing else puts space between them.

       ZERO BELOW `sm`, MEASURED AGAINST THE LIVE PAGE. Between the bottom of the Latest round &
       Race card and the top of the tabbar the original leaves 14px; this build was leaving 69,
       measured off two crops at the same scale (their tabbar bands match row for row). The 55px
       is this padding plus `.footer-bg`'s `margin-block: 1rem 0`, and only the first of those is
       the page's to give up — the footer margin reaches every route. Dropping it lands the gap
       on that 16px, which is the original's 14 to within a pixel of measurement error.

       Nothing was lost by removing it there: it existed to keep cards off the footer, and at
       the time the footer's own top margin did that.

       `lg:pb-4` IS THE DESKTOP HALF, AND THE BREAKPOINT IS `lg` RATHER THAN `sm` FOR A REASON
       THAT IS NOT ABOUT THIS PAGE. `.main-layout-container > :last-child` carries
       `margin-bottom: var(--content-gap-y)` — 16px — but only inside `@media (max-width: 1023px)`
       (see MainLayout.css, where it is scoped that way because from 1024 up the tabbar is gone
       and the footer owns the space). That last child IS this page root. So:

         below 1024   the layout already gives 16px and the page needs nothing.
         1024 and up  nothing does, and the page ends flush against the footer.

       Only the second is the gap that was missing. A first pass wrote `sm:pb-6`, which fixed
       desktop but ALSO stacked 24px on top of the layout's existing 16 through the whole
       640–1023 band — 40px there, which is what read as too much. At `lg` the two never overlap.

       8px, arrived at by asking for less three times from 24. It sits deliberately one step UNDER
       `--content-gap-y`'s 16, which is the layout's own value for this gap below 1024 — so the
       desktop footer runs slightly tighter than the tablet one. That is defensible rather than
       sloppy: below 1024 the 16px is clearing a fixed tabbar as well, and from 1024 up there is
       nothing there. `lg:pb-1` is 4px if it wants to go tighter still; `lg:pb-0` returns it to
       flush, which is what the chunk itself does.

       WHY THE PAGE AND NOT THE FOOTER. `.footer-bg` was `margin-block: 1rem 0` from `sm` up and
       both arms are `0` now, so a page ends flush unless it says otherwise. Restoring it there
       would reach EVERY route, including ones tuned against a capture that has the footer butted
       straight on. This padding is page-local and does not collapse — padding never does, so no
       adjacent margin can swallow it.

       The chunk carries no bottom padding at any width — `index-DTOmRFSX.js` writes the casino
       content wrapper as `-mx-4 min-h-screen bg-layer2 px-4` — so this whole line is this
       build's, on both arms, and both are requested rather than transcribed. */
    <div className="casino-page w-full pb-0 lg:pb-2">
      {/* The banner belongs to the Lobby only — every other tab opens straight onto the search
          field and its strip. `active` is the empty string on /casino and on any unknown
          segment, so a bad URL still falls back to the full lobby rather than a headless one.
          A search does not hide it: the tab is still Lobby, and the results replace the rows
          below rather than the page. */}
      {!active && <Hero />}
      <SearchBar query={query} setQuery={setQuery} />
      {/* `tight` where a filter bar follows the strip instead of a grid — that bar brings its
          own 16px and does not need the strip's 32 on top of it. */}
      <CasinoTabStrip active={active} compact={!showLobby} tight={filtered} linkTab={linkTab} />

      {showLobby ? (
        <Lobby originals={originals} live={liveLobby} providerRow={USE_FIXTURES ? PROVIDERS : (liveProviders ?? []).slice(0, 8)} />
      ) : linkTab ? (
        <div className="mt-4 w-full px-4 sm:px-0">
          {active === 'provider' ? (
            <ProviderGrid providers={available} />
          ) : (
            <ThemeGrid themes={themesFor(gates)} />
          )}
        </div>
      ) : active === 'poker' && !searching ? (
        <PokerTab
          games={games}
          sort={sort}
          setSort={setSort}
          providers={available}
          selectedProviders={providers}
          setSelectedProviders={setProviders}
        />
      ) : (
        <div className="w-full px-4 sm:px-0">
          {/* THE SWITCH IS THE FILTER ROW'S THIRD CHILD, NOT A SIBLING UNDER IT, which is the
              original's own structure and is what a capture of the Slots tab shows: the two
              pills at the left of the content column and Show Blocked hard against its right
              edge, all on one line.

              It used to render as a block below the bar carrying `mt-2`, which was a
              reconstruction of a gap it should never have lost — as a flex item it picks up the
              row's `gap-2` when it wraps, and 8px of row gap over its own `py-2` is the same
              16px that `mt-2` was restating. So the phone is unchanged by construction and only
              the desktop line moves.

              Its own `sm:ml-auto` is what pushes it right, and that class has been sitting in
              the markup since it was transcribed — inert for as long as the element was not a
              flex item of this row. The fragment that used to wrap these two went with it. */}
          {filtered && (
            <FilterBar
              sort={sort}
              setSort={setSort}
              providers={available}
              selectedProviders={providers}
              setSelectedProviders={setProviders}
              trailing={<ShowBlocked on={showBlocked} setOn={setShowBlocked} />}
            />
          )}

          {tooShort ? (
            <div className="mt-4 flex h-16 w-full items-center justify-center px-4">
              <span className="text-center font-semibold text-error">
                Search requires at least 2 characters
              </span>
            </div>
          ) : (
            <>
              {/* `exactArt` for the reason the list pages and the Explore panel pass it: a game
                  with no cover of its own must draw the placeholder rather than borrow a
                  neighbour's. Reachable since the BC Originals tab went live — five of the
                  platform's twenty have no bc.game original of that name. No transcribed tab
                  loses a single image to it, checked across all twelve. */}
              <GameGrid games={pageGames} exactArt />
              <Pagination page={page} pages={pages} onChange={setPage} />
            </>
          )}
        </div>
      )}

      {/* The bet table belongs to the Lobby alone; every other tab ends on its own grid. Keyed
          on `active` rather than `showLobby`, so searching from the Lobby keeps it — the tab is
          still the Lobby, only the body below the strip has changed. */}
      {!active && <LatestBets />}
    </div>
  );
}
