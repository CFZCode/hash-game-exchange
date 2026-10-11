import React from 'react';
import TabStrip from './TabStrip';
import FilterBar from './FilterBar';
import GameGrid, { Empty, ProviderGrid } from './GameGrid';
import Pagination from '../shared/Pagination';
import {
  browseTab,
  narrowResults,
  searchGames,
  sortGames,
  filterByProvider,
  PROVIDERS,
} from './catalogue';

/* The Casino side of the panel — `wt` in index-BChnjnW3.js, which is really two components
 * sharing a tab strip:
 *
 *   no query   `bt` : each tab is its own feed request, with a Sort By / Providers bar above
 *                     the grid. The Providers tab is a grid of providers instead.
 *   a query    `gt` : one search request, and the tab narrows the result set client-side.
 *                     Sort By disappears (the endpoint owns the ordering) and the tabs that
 *                     have no narrowing rule return nothing — that `default: return []` is
 *                     the original's, not a gap here.
 *
 * Both paths run through the same grid, so they are one component with one branch rather
 * than the original's two.
 */
/* The live grid's own page size, counted off the rendered DOM: the tiles run 89..128 before
   the pager, then 129..168, then 169..208 — forty each. The site pages SERVER-side (`page` and
   `pageSize` go into the `selection/sub-list/` POST) and its readout says "of 239" against a
   catalogue of ~9,500; this build holds its 118 in memory, so the same pager runs over a
   slice. Both are the same control with the same arithmetic. */
const PAGE_SIZE = 40;

export default function CasinoExplore({ query }) {
  const [tab, setTab] = React.useState('allgames');
  const [sort, setSort] = React.useState('');
  const [providers, setProviders] = React.useState([]);
  const [page, setPage] = React.useState(1);

  /* Every control that changes WHAT is listed also sends you back to page one — otherwise
     narrowing a 118-game list to nine while parked on page 3 shows an empty grid. Done in the
     setters rather than in an effect watching the filters: that shape is the cascading render
     `react-hooks/set-state-in-effect` rejects, and it is the same reason `changeType` in
     ../index.jsx clears its query inline. */
  const changeTab = (value) => {
    setTab(value);
    setPage(1);
  };
  const changeSort = (value) => {
    setSort(value);
    setPage(1);
  };
  const changeProviders = (value) => {
    setProviders(value);
    setPage(1);
  };

  const searching = query.length > 0;

  /* Below two characters the panel refuses to search at all rather than matching on one
     letter — `ot`'s fallback, and the same threshold the history dropdown announces. */
  const tooShort = searching && query.trim().length < 2;

  const games = React.useMemo(() => {
    if (!searching) return browseTab(tab);
    if (tooShort) return [];
    return narrowResults(searchGames(query), tab);
  }, [searching, tooShort, query, tab]);

  /* The filter offers the providers actually present in the current result set, not all of
     them — `f` in `ot`, which intersects the results against the feed's provider list. */
  const available = React.useMemo(() => {
    if (!searching) return PROVIDERS;
    return [...new Set(games.map((game) => game.provider))].sort((a, b) => a.localeCompare(b));
  }, [searching, games]);

  const shown = React.useMemo(
    () => sortGames(filterByProvider(games, providers), sort),
    [games, providers, sort],
  );

  /* Clamped rather than corrected: `page` only ever moves through the pager and the resets
     above, so the one way it can end up past the end is a list that shrank in the same commit
     that rendered it. Deriving the page in use costs nothing and keeps that out of an effect. */
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const at = Math.min(page, pages);
  const pageGames = shown.slice((at - 1) * PAGE_SIZE, at * PAGE_SIZE);

  return (
    <div className="casino-games-tab mt-4 w-full">
      <TabStrip tab={tab} setTab={changeTab} />

      {tab === 'providers' ? (
        <div className="mt-4 w-full">
          {searching ? <Empty /> : <ProviderGrid providers={PROVIDERS} />}
        </div>
      ) : (
        <div className="w-full">
          <FilterBar
            search={searching}
            sort={sort}
            setSort={changeSort}
            providers={available}
            selectedProviders={providers}
            setSelectedProviders={changeProviders}
          />

          {tooShort ? (
            <div className="mt-4 flex h-16 w-full items-center justify-center px-4">
              <span className="text-center font-semibold text-error">
                Search requires at least 2 characters
              </span>
            </div>
          ) : (
            <>
              {/* `exactArt`: every one of the 118 games now has its own cover in
                  src/assets/games, so the keyword-and-hash fallback in `assetFor` has nothing
                  left to do but hand a tile the WRONG game's artwork if a file ever goes
                  missing. Exact resolution makes that read as missing instead. */}
              <GameGrid games={pageGames} exactArt />
              <Pagination page={at} pages={pages} onChange={setPage} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
