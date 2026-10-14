import { brandLabel } from '../../services/siteBranding';
import React from 'react';
import useResource from '../../hooks/useResource';
import { getOriginals } from '../../services/originals';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import PcNav from '../../components/shared/PcNav';
import GameGrid from '../../components/Explore/GameGrid';
import Pagination from '../../components/shared/Pagination';
import { GRID_PAGE_SIZE } from '../Casino/catalogue';
import {
  SECTION_TITLES,
  TAG_TITLES,
  GAMELIST_TITLES,
  sectionGames,
  tagGames,
  gamelistGames,
  readLiveList,
  readProviderList,
} from './catalogue';

/* THE FOUR LIST PAGES — `/section/:section`, `/gamelist/:type`, `/tagname/:tag` and
 * `/game-related`, all the original's own paths and all four the destination of an "All" pill.
 * They are where the home page's six rows point:
 *
 *   BC Originals   /gamelist/brand                         Slots        /gamelist/slots
 *   Hot Games      /section/hot_games                      Live Casino  /gamelist/live
 *   BC Exclusive   /section/exclusive                      Bingo        /tagname/bingo?label=…
 *
 * plus the casino lobby's Poker and Feature Buy-in rows (`/tagname/…`), the Recommended Games row
 * under `/favorite` and `/recent` (`/section/hot_games?label=Recommended`), and every "All" on the
 * casino page's own rows. Every one of those links was already written — the pills have always
 * pointed at these paths, because they are the feed's and the chunks' own — and every one landed
 * on the catch-all, which renders Home. So this is four pages built, not a link rewired.
 *
 * FOUR CHUNKS OFF `hash.game/assets/`, none in the mirror, all tiny:
 *
 *   index-BSVarTKc.js   /section/:section    3.1 KB   (also exports the Poker tab's filter row)
 *   index-BM71IaL0.js   /gamelist/:type      6.5 KB   (also exports Show Blocked and the provider filter)
 *   index-BaCzwozn.js   /tagname/:tag        1.6 KB
 *   index-BtGOZZxv.js   /game-related        1.1 KB
 *
 * and between them they are one shape: `<PageLayout title>` over `<PcNav title/>` and a grid, with
 * the title resolved `?label=` -> map -> the raw key. `PcNav` is already shared — `/favorite` and
 * `/recent` brought it in, and these are the other two of the four routes that mount it.
 *
 * WHAT IS NOT BUILT, and it is the same shortfall on all three: the original's grid asks
 * `selection/sub-list/` and pages SERVER-side through thousands of games, while this build slices a
 * local catalogue. So the pager is real but the pages behind it are this project's own lists — see
 * `catalogue.js`, and `pages/Casino/catalogue.js` for where each set came from. The two filter rows
 * the chunks carry (Sort By, All Providers, Show Blocked on `/gamelist/slots` and `/live`) are not
 * built either; they need `sortBy` / `providerNames` to reach a server that answers.
 */

/* One list. `py-4` IS THE GRID'S WRAPPER, NOT THE PAGE'S, and putting it on the page root is what
   opened an extra 16px above the heading: all four chunks pass `class="py-4"` to the LIST
   component (`c(m, {section_id, source, class: "py-4"})`), which sits below `PcNav`, so nothing on
   the original pads above the title at all. With it moved, the heading's top edge is the column's
   own padding-top — the same place `/favorite` puts it, where the stack was measured against the
   capture to the pixel. */
function GameListPage({ title, games, readLive }) {
  /* THE PAGE NUMBER RESETS WHEN THE LIST UNDER IT CHANGES, and it is tracked WITH the list rather
     than reset by an effect. A link from one section to another may not remount this component —
     `/section/slots` to `/section/new` is the same element with a different param — and landing on
     page 4 of a shorter list would render an empty grid. Keyed on the title, which is the cheapest
     identity of "a different list" and is what the casino grid keys on too.

     Adjusted during render rather than in an effect: this is the "adjust state when a prop changes"
     pattern React documents, and an effect here is the cascading render
     `react-hooks/set-state-in-effect` forbids — it would paint the old page's slice for a frame.
     The stale-key read below is what makes the discarded pass render page 1 rather than the old
     number. Note the project's own rule elsewhere is to reset in the SETTER (every casino filter
     does); there is no setter here, because the thing that changed is the route. */
  const [tracked, setTracked] = React.useState({ key: title, page: 1 });
  if (tracked.key !== title) setTracked({ key: title, page: 1 });

  const page = tracked.key === title ? tracked.page : 1;
  const setPage = (next) => setTracked({ key: title, page: next });

  /* LIVE (fixtures off): `readLive(page)` asks the SmartBet catalogue for exactly this page, and
     the pager counts the real total. `null` from it (fixtures on, or BC Originals' own read)
     keeps the list below, paged here as before. */
  const readPage = React.useCallback(() => (readLive ? readLive(page) : null), [readLive, page]);
  const { data: live } = useResource(readPage);
  const serverPaged = live !== null;
  const pages = serverPaged
    ? Math.max(1, page, Math.ceil((live?.total ?? 0) / GRID_PAGE_SIZE))
    : Math.max(1, Math.ceil(games.length / GRID_PAGE_SIZE));
  const shown = serverPaged ? live?.games ?? [] : games.slice((page - 1) * GRID_PAGE_SIZE, page * GRID_PAGE_SIZE);

  return (
    /* `px-4 lg:px-0` for the reason `/favorite` documents: the page arm only renders from `lg` up,
       so its own inset has to hold at every width below that, where the dialog shell has none. */
    <div className="px-4 lg:px-0">
      <PcNav title={brandLabel(title)} />
      {/* `pb-4` where the chunks pass `py-4` — a requested departure, one word, and the arithmetic
          is worth having because it is not the only term. The original stacks 56px between the
          heading's baseline box and the first row of cards: `PcNav`'s own `mb-6` (24) + this
          wrapper's `py-4` (16) + the grid's `mt-4` (16), and that last one is `so`'s own class
          list, `"mt-4 gap-2 grid-col-3"`, which is the same `mt-4` the shared GameGrid carries. So
          this is the only one of the three that can move without reaching another page: `mb-6`
          belongs to PcNav, which /favorite and /recent also mount, and `mt-4` belongs to the grid
          the Explore panel and the casino tabs also render. Dropping the top half takes it to
          40px; the next 24 is PcNav's `mb-6` if the heading should sit tighter everywhere. */}
      <div className="pb-4">
        {/* `exactArt`, as the Explore and casino grids pass — the keyword-and-hash fallback would
            hand a game another game's cover, which reads as correct and is not. */}
        <GameGrid games={shown} exactArt />
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>
    </div>
  );
}

/* THE ROUTE KEY IS READ OFF THE PATHNAME WHEN THERE IS NO MATCHED ROUTE TO READ IT FROM. `useParams`
   resolves against a matched `<Route>`, and below `lg` these four pages render inside
   `GameListDialog`, which `App.jsx` matches on the pathname and mounts BESIDE `<Routes>` — the
   route element itself is `null` there. So on a phone `useParams()` was `{}`, every key read as
   `''`, every resolver answered `[]`, and all four dialogs drew the empty state under a correct
   title (the dialog computes its title from the pathname). Same trap the profile dialogs record
   for their `:userId`; the second path segment is the key on all three parameterised routes. The
   router has already decoded a matched param and the callers decode once more, so the raw
   segment is returned here and the callers' decode is the one that applies to it. */
function useSegment(name) {
  const params = useParams();
  const { pathname } = useLocation();
  return params[name] ?? pathname.split('/')[2] ?? '';
}

/* `/section/:section` — `W` in index-BSVarTKc.js. */
export function SectionPage() {
  const section = useSegment('section');
  const [params] = useSearchParams();
  const key = decodeURIComponent(section);
  /* Fixtures off: the SmartBet catalogue, a page at a time (`readLiveList`). */
  const readLive = React.useCallback((page) => readLiveList('section', key, page), [key]);

  return (
    <GameListPage
      title={params.get('label') ?? SECTION_TITLES[key] ?? key}
      games={sectionGames(key)}
      readLive={readLive}
    />
  );
}

/* `/gamelist/:type` — `ye`. Four types and a default arm titled "Recommend" that draws the empty
   placeholder, which is what an unknown type gets here too (the grid renders it for an empty
   list). */
export function GameListRoute() {
  const type = useSegment('type');

  /* `/gamelist/brand` is BC Originals' own All page, so it reads the same live catalogue the
     casino tab does — one read, so the tab and the page it links to cannot list different games.
     Every other type falls through to its transcribed set inside `gamelistGames`; see
     `services/originals.js`. */
  const { data: originals } = useResource(getOriginals);
  const readLive = React.useCallback((page) => readLiveList('gamelist', type, page), [type]);

  return (
    <GameListPage
      title={GAMELIST_TITLES[type] ?? 'Recommend'}
      games={gamelistGames(type, originals)}
      readLive={readLive}
    />
  );
}

/* `/tagname/:tag` — `h` in index-BaCzwozn.js. Note the chunk resolves the TITLE through the map and
   then hands that title to the grid as the tag itself (`source={{tagNames: a()}}`), so the request
   carries "Bingo" rather than "bingo"; the resolver here accepts either. */
export function TagPage() {
  const tag = useSegment('tag');
  const [params] = useSearchParams();
  const key = decodeURIComponent(tag);
  const readLive = React.useCallback((page) => readLiveList('tag', key, page), [key]);

  return (
    <GameListPage
      title={params.get('label') ?? TAG_TITLES[key] ?? key}
      games={tagGames(key)}
      readLive={readLive}
    />
  );
}

/* `/game-related?game=<ids>` — "Related Games", the page behind a game's own recommend row. It asks
   the `recommended_games` selection with `relatedGameIds`, which is the arm `RecommendList`
   documents as unbuildable here: the ids are a live session's, and handing it another selection's
   games would print one list under another's name. So it renders its heading over the empty state,
   which is what the site shows for a related list with nothing in it. */
export function RelatedPage() {
  return <GameListPage title="Related Games" games={[]} />;
}

/* `/provider/:name`, the Providers grid's link: every game the platform lists under that studio,
   paged against the real total. Live only; with fixtures on the route is not mounted. */
export function ProviderPage() {
  const name = decodeURIComponent(useSegment('name'));
  const readLive = React.useCallback((page) => readProviderList(name, page), [name]);
  return <GameListPage title={name} games={[]} readLive={readLive} />;
}
