import React from 'react';
import { Navigate } from 'react-router-dom';
import PcNav from '../../components/shared/PcNav';
import GameTile from '../../components/shared/GameTile';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import RecommendList from './RecommendList';
import { useResource } from '../../hooks/useResource';
import { useSession } from '../../context/session';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { getFavoriteGames, getRecentGames } from '../../services/collection';
import { assetExact } from '../../utils/gameArt';

/* `/favorite` and `/recent` — the Casino group's two signed-in sidebar rows.
 *
 * ONE COMPONENT FOR BOTH, because the original is two chunks that are near-copies of each other:
 * `index-BtmCBJtH.js` (Favorites) and `index-1jGOl_3-.js` (Continue Playing), both off
 * `hash.game/assets/` under the hashes the route table already lists, neither in the mirror.
 * Between them they differ in exactly three things — the title, the path they POST to, and the
 * `isRecItem` filter the history one applies — and everything else, including the two chunks
 * they share (`PcNav-DkMNy63s.js` and `RecommendList-dzpmak7P.js`), is identical. So this file is
 * their shared body and the two exports at the bottom are the difference.
 *
 * The route entries, from `Enter-MsmOuq5R.js`:
 *
 *   { path: "/favorite", component: …, info: { dialog: m.mobile, guards: [ce] } }
 *   { path: "/recent",   component: …, info: { dialog: m.mobile, guards: [ce] } }
 *
 * `ce` is `authGuard` — `!login && "/login/signin?redirect=" + pathname` — so a logged-out
 * visitor gets the SIGN-IN dialog rather than a redirect home, which is the same shape
 * `/user/enter` takes and is wired the same way, in `App.jsx` where the path is matched. The
 * `dialog` flag is a DEVICE test, read as the 1024 line as everywhere in this project, and BOTH
 * arms are built: a page inside the layout column on a desktop, a full-screen dialog below it.
 *
 * WHICH IS ALSO WHY NEITHER PAGE HIDES ITS OWN HEADING BY HAND. `PcNav` is `<Show when={!mobile}>`
 * on the original — the title becomes the dialog's title bar at exactly the widths the heading
 * stops rendering — so the two are one flag and the component owns it. See components/shared/PcNav.
 *
 * The body is three siblings under the original's `PageLayout`, which draws nothing on a page
 * route (`w3` pushes its title into the router's dialog context and returns bare children):
 *
 *   <PcNav title=…/>
 *   <GameGrid list={loading ? Array(mobile ? 9 : 8) : list}/>     // `Cl` in Enter-MsmOuq5R.js
 *   <Suspense><Show when={!loading}><RecommendList list={list}/></Show></Suspense>
 *
 * BOTH FEEDS ANSWER 6002 AND THE EMPTY STATE IS THE CORRECT RENDERING — the fifth feature here
 * where being locked out is the answer rather than a compromise, and it is what both reference
 * captures show. See pages/GameCollection/collection.js for the probe.
 *
 * One piece of the chunks is reproduced as the dead code it is rather than tidied away: each
 * page opens `const [key, setKey] = createSignal(0)` and then
 * `createRenderEffect(() => isRouting() && key() > 0 && setKey(k => k + 1))`, which refetches on
 * navigation — except that `key` starts at 0 and nothing else ever increments it, so the guard
 * can never pass. It is a refetch-on-route-change that never fires, in the same family as
 * `defaultOpen` on the referral FAQ and the rate calculator's unreachable error messages. Not
 * ported; there is nothing for it to do.
 */

/* `et` — the per-card placeholder, and it is NOT `components/shared/Skeleton`: it draws nothing
   at all for a full second and only then paints a flat `bg-layer5` box, so a fast answer never
   flashes grey. `ll = 1e3` in Enter-MsmOuq5R.js.

   IT RENDERS NOW, and its one-second delay is the point rather than a detail: `request()` settles
   a fixture after `VITE_FIXTURE_DELAY` (400ms by default), which is INSIDE `ll`'s second — so what
   this page actually shows on a cold load is a blank grid that fills in, never a grey flash. That
   is exactly the behaviour `ll` exists to produce, and it is only visible now that the read takes
   any time at all. Raise the delay past 1000 to see the `bg-layer5` arm. */
function Placeholder() {
  const [late, setLate] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setLate(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return <div className={`size-full ${late ? 'overflow-hidden rounded-lg bg-layer5' : ''}`} />;
}

/* `Cl` in Enter-MsmOuq5R.js — the WRAPPING game grid, as opposed to `Oh`, which is the Explore
   results grid, and `go`, which is the home page's horizontally scrolling strip. Same preset and
   the same spacer-div-per-card structure as the other two:

     <Show when={list.length > 0}
           fallback={<div class="center w-full"><EmptyPlaceholder/></div>}>
       <div class="mt-4 grid gap-2 grid-col-3" style="--grid-gap:.5rem;--aspect-ratio:0.75">

   THE SPACER DIV IS REQUIRED, not cosmetic: `.grid-col-3 > div` is what turns a column width into
   a 3:4 height and `> div > *` is what stretches the tile over it. A tile placed straight into
   the grid collapses.

   Note the empty arm carries NO colour class, where the Explore grid's own `Empty` passes
   `text-secondary`. That difference is the chunks' rather than an oversight in either, which is
   why this is written out here instead of reusing `components/Explore/GameGrid`: the message
   takes the page's inherited `primary`, which is what both captures show.

   `mt-4` lands on the populated arm only, also the chunk's. */
function GameGrid({ games, pending, placeholders }) {
  if (!pending && !games.length) {
    return (
      <div className="center w-full">
        <EmptyPlaceholder />
      </div>
    );
  }

  return (
    <div
      className="mt-4 grid gap-2 grid-col-3"
      style={{ '--grid-gap': '.5rem', '--aspect-ratio': 0.75 }}
    >
      {pending
        ? Array.from({ length: placeholders }, (_, i) => (
            <div key={`pending-${i}`}>
              <Placeholder />
            </div>
          ))
        : games.map((game, i) => (
            <div key={game.slug}>
              {/* `assetExact` rather than `assetFor`, for the reason the Explore grid passes
                  `exactArt`: the keyword-and-hash fallback would hand a game another game's
                  cover, which reads as correct and is not. A row with no local art draws the
                  brand placeholder instead. */}
              <GameTile
                slug={game.slug}
                name={game.fullName ?? game.name}
                image={game.icon ?? assetExact(game.slug)}
                players={game.onlineUsers}
                index={i}
              />
            </div>
          ))}
    </div>
  );
}

function GameCollection({ title, read }) {
  const { session } = useSession();
  const isDesktop = useIsDesktop();

  const { data } = useResource(read);

  /* `guards: [ce]` — the auth guard. `App.jsx` raises the sign-in dialog over the page you came
     from, which is what the original's `"/login/signin?redirect=…"` does; this is what catches a
     sign-out performed while the page is already open. `/` rather than the dialog path, because
     navigating to `/login/signin` from inside the component being unmounted by it would fight
     App's own background-location tracking. */
  if (!session.login) return <Navigate to="/" replace />;

  const games = data ?? [];

  return (
    /* `px-4 lg:px-0`, AND THE BREAKPOINT IS THE DEVICE LINE rather than this build's usual
       `sm:px-0`. The page arm only ever renders from `lg` up — below that the route is a dialog —
       so the gutter has to hold at every width beneath it, where `.main-layout-content` has one
       and the dialog shell does not (it is mounted with `pageGutter`, which zeroes
       `.dialog-content`'s own 1rem so the page's is the whole of it). From `lg` the column
       supplies it and this stands down. A flat 16px inset at every width in both homes, which is
       what the original gets from `#page-content` alone. */
    /* `lg:pb-8` — THE GAP ABOVE THE FOOTER, and it is this build's rather than the original's.
       The chunk's own wrapper contributes no layout at all: `index-BtmCBJtH.js` renders
       `s(M, { title, children: [PcNav, grid, RecommendList] })` and `M` is export `p` of
       index-BsFv7ByC.js, which is `w3` — `return t.children` behind a metadata write. So there
       is nothing to transcribe here, and without a value of our own the Recommended Games strip
       ended flush against `.footer-bg`, whose only separation is its own 1rem top margin.

       `lg:` and no other arm, because THE PAGE ARM ONLY RENDERS FROM `lg` UP — below that the
       route is a dialog, which has no footer for anything to crowd. 2rem matches what the home
       page gives its own last row (`lg:pb-8`), and this page ends on the same component the
       home page does, so the two now end alike. Requested rather than measured, which is the
       same footing the casino page's `pb-0 lg:pb-2` is on and is noted there too. */
    <div className="px-4 pb-0 lg:px-0 lg:pb-8">
      <PcNav title={title} />

      <GameGrid games={games} pending={!data} placeholders={isDesktop ? 8 : 9} />

      {/* `-mx-4 sm:mx-0` — the original's own idiom for a strip that has to escape the page
          gutter, and here it is what keeps this row aligned with the grid above it. `GameSection`
          is built for the home column, which below 640 has NO inset: its header supplies its own
          `px-4` and its scroller its own `--grid-padding: 1rem`. Inside this page's gutter both
          would land on top of it and the row would sit 32px in while the grid sat at 16.
          Cancelling the gutter below `sm` leaves each piece contributing exactly one 16px again;
          from `sm` up the row's own halves are already zero and the page's gutter is the whole of
          it, so the negative margin has nothing to do and is not applied. */}
      <div className="-mx-4 sm:mx-0">
        <RecommendList list={games} />
      </div>
    </div>
  );
}

/* The two pages. `pageSize` follows the original's own device split — 39 on a phone, where the
   grid is three across, and 40 elsewhere. It changes nothing while the feed is shut and it is
   what the request carries. */

export function Favorites() {
  const isDesktop = useIsDesktop();
  const read = React.useCallback(() => getFavoriteGames({ mobile: !isDesktop }), [isDesktop]);

  return <GameCollection title="Favorites" read={read} />;
}

/* "CONTINUE PLAYING" IS THE PAGE'S OWN TITLE, not a word chosen for the row the sidebar calls
   Recent. `index-1jGOl_3-.js` mounts `<PageLayout title={t("Continue Playing")}>` and hands
   `PcNav` the same string, so it is the heading, the dialog's title bar, and nothing else — the
   menu's "Recent" is the row's label and stays as it is. Both captures show it. */
export function Recent() {
  const isDesktop = useIsDesktop();
  const read = React.useCallback(() => getRecentGames({ mobile: !isDesktop }), [isDesktop]);

  return <GameCollection title="Continue Playing" read={read} />;
}

export default GameCollection;
