import React from 'react';
import { Link } from 'react-router-dom';
import SectionHeader from '../../../components/shared/SectionHeader';
import GameTile, { TILE_CLASS } from '../../../components/shared/GameTile';
import Skeleton from '../../../components/shared/Skeleton';
import { assetFor } from '../../../utils/gameArt';
import './GameSection.css';

/* A home game row — header, then a horizontally scrolling strip of 3:4 game tiles.
 *
 * Source: `de` / `go` / `io` / `yl` in bc.game/bc.game/assets/Enter-MsmOuq5R.js, with the
 * scroll container from `yO` and the arrow controller from `bO`, both in
 * index-BsFv7ByC.js. Every home section below the category cards is this same component
 * with different data, which is why it lives on its own rather than inside one section.
 */

/* `Te.Arrow` — the same chevron the sidebar uses for its dropdowns. Points left as drawn;
   the forward button rotates it. */
const ArrowIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

/* `yl`. Appended by `go` when a section has a link and more than 8 games. Note it has no
   scrim and no stagger class — it is the one tile that is always plain.
   The original hides the <img> on a load error rather than showing a broken-image glyph;
   that is reproduced here and is also what keeps the tile presentable while the artwork is
   still missing from the mirror. */
function ViewAllTile({ href }) {
  return (
    /* A router link for the reason the All pill beside it is one — `yl` is the same `rh` on the
       original, and this tile's destination is the same page. */
    <Link to={href} className={TILE_CLASS}>
      <img
        className="w-full"
        src={assetFor('gameViewAllCard')}
        alt="View All"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-primary">
        View All
      </span>
    </Link>
  );
}

/* `bO`. Scrolls by exactly one viewport of the strip; disabled at each end. The original
   finds its scroll container by proximity through a registry — here the caller passes the
   ref straight in, which is the same thing without the lookup. */
export function Controller({ scrollerRef, hideOnMobile = true }) {
  const [state, setState] = React.useState({ atStart: true, atEnd: true });

  const sync = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setState({
      atStart: el.scrollLeft <= 0,
      atEnd: el.scrollWidth - el.clientWidth - el.scrollLeft <= 1,
    });
  }, [scrollerRef]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    sync();
    el.addEventListener('scroll', sync, { passive: true });

    /* The strip's scrollWidth changes with the column count, so a resize can move an
       end-stop without any scrolling happening. */
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
    observer?.observe(el);

    return () => {
      el.removeEventListener('scroll', sync);
      observer?.disconnect();
    };
  }, [scrollerRef, sync]);

  const scrollBy = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollLeft + direction * el.clientWidth, top: 0, behavior: 'smooth' });
  };

  const button = 'button size-8 items-center justify-center rounded-md bg-layer5 !p-0 fill-primary';

  /* `hideOnMobile` — the HOME ROW's gate, not a property of the controller. `ot` renders this
     one only when `!m.mobile`, leaving just the All button, because a home row is swipeable and
     the arrows are a pointer affordance. The Poker tab's panels are a different call site in the
     chunk (`x1`, wired with a `smoothListSelector`) and carry NO such test, so their arrows show
     at every width — which is what the reference capture of Hold'em and Teen Patti shows. */
  return (
    <div className={`ml-2 gap-x-1 ${hideOnMobile ? 'hidden sm:flex' : 'flex'}`}>
      <button type="button" className={button} disabled={state.atStart} onClick={() => scrollBy(-1)}>
        <ArrowIcon className="size-4" />
      </button>
      <button type="button" className={button} disabled={state.atEnd} onClick={() => scrollBy(1)}>
        <ArrowIcon className="size-4 rotate-180" />
      </button>
    </div>
  );
}

/* `compact` is OURS, not the original's — every row there uses the same mt-3 / pt-3 pair.
   It exists for the Bingo row, which follows Pay Your Way: that panel is a fixed h-24 with
   its content centred, so below sm the empty strip under the title reads as part of the gap
   above the heading and the row looks lopsided against the gap beneath it.

   Both started at the Highlights strip's 8.186px and were opened back up to 12px by eye, so
   the heading is crowded against neither the panel above it nor the cards below. They are
   equal on purpose. 12px is close to what the default mt-3/pt-3 pair resolves to on a 430px
   phone; the difference is that these hold flat across 320-639 instead of growing with the
   root font-size. It changes nothing from sm up. */
const COMPACT_HEADER = 'max-sm:!mt-[12px]';
const COMPACT_STRIP = 'pt-[12px] sm:pt-3';

/* How many placeholder cards a pending row shows. Eight is the widest breakpoint's own visible
   count — the same number `go` uses to decide whether a View All tile is worth appending — so
   the strip is exactly full and has nothing to scroll while it waits. */
const SKELETON_TILES = 8;

export default function GameSection({ title, games, href, showController = true, compact = false }) {
  const scrollerRef = React.useRef(null);

  /* `games === undefined` IS the loading state — `useResource`'s own doc says so ("once
     fixtures are off, `data` is undefined for the first paint and each call site's `?? []` is
     where that section's skeleton belongs"). This is that skeleton, and it RENDERS now —
     `services/client.js` answers a fixture after `VITE_FIXTURE_DELAY`, so every row on the home
     page paints its eight placeholders first, which is what the live site does on a cold load.
     Set that variable to 0 to get the old behaviour back, where the row had its games on the
     very first paint. An empty ARRAY is a section with no games and correctly renders nothing. */
  const pending = !games;
  const rows = games ?? [];

  /* `go`: the View All tile is appended only when the section links somewhere AND has more
     than 8 games — an 8-or-fewer row is fully visible at the widest breakpoint, so there
     would be nothing to view. */
  const showViewAll = Boolean(href) && rows.length > 8;

  return (
    <>
      {/* px-4 sm:px-0 for the same reason the hero carries it: below sm the layout column
          has no inset, and unlike the strip the header has no --grid-padding of its own. */}
      <SectionHeader
        className={`px-4 sm:px-0 ${compact ? COMPACT_HEADER : ''}`}
        href={href}
        controller={showController ? <Controller scrollerRef={scrollerRef} /> : null}
      >
        {title}
      </SectionHeader>

      <div
        ref={scrollerRef}
        /* `max-sm:mb-6` — THE GAP BETWEEN ONE ROW'S CARDS AND THE NEXT ROW'S HEADING, and it
           has to live here rather than on SectionHeader. Sections are flat siblings (header,
           strip, header, strip …), so that gap is the collapse of this strip's bottom margin
           against the next header's `mt-3 sm:mt-6` — max, not sum. Raising the HEADER's margin
           would have worked too, and it would also have raised the gap above the FIRST header
           on the casino page, which is the one that was just tuned against the tab strip and
           is correct. A margin on this side is invisible to that first header, because nothing
           precedes it.

           24px, doubling the 12 the header's own `mt-3` was supplying. Phone only, so the
           desktop rows are untouched — from `sm` up the header's `mt-6` still owns the gap at
           24. One word (`mb-6`) extends it to every width.

           This is shared with the home page by construction: same component, same rows, and
           the complaint applies to both. */
        className={`grid-col-3 smooth-scroll smooth-list hide-scroll relative grid snap-x snap-mandatory grid-flow-col gap-2 overflow-x-scroll overflow-y-hidden scroll-smooth max-sm:mb-4 ${compact ? COMPACT_STRIP : 'pt-3'}`}
        /* --grid-padding is deliberately absent: it is responsive and lives in the
           stylesheet, where an inline value here would outrank the media query. */
        style={{
          '--grid-gap': '.5rem',
          '--aspect-ratio': 0.75,
        }}
      >
        {/* The spacer div is required, not cosmetic: `.grid-col-3 > div` is what turns the
            column width into a 3:4 height, and `> div > *` is what stretches the tile over
            it. A tile placed directly in the grid would collapse. */}
        {pending
          ? Array.from({ length: SKELETON_TILES }, (_, i) => (
              /* The spacer div is the same one a real tile gets, so the placeholders are
                 exactly the cards' size and nothing shifts when the feed lands.
                 `radius={0}` hands the corner to `rounded-lg`, which is what a tile uses.
                 The index is the key because these rows are identical and never reorder. */
              <div key={`skeleton-${i}`}>
                {/* THE SKELETON CANNOT BE THE GRID CHILD ITSELF. `.grid-col-3 > div > *` is
                    what stretches a tile over its spacer with `position: absolute; inset: 0`,
                    and `.skeleton` declares `position: relative` — both unlayered, both
                    specificity 0,1,0, and `.skeleton` is later in index.css, so it would win
                    and the placeholder would collapse to nothing. The plain div takes the
                    stretch and the skeleton fills it. */}
                <div className="size-full">
                  <Skeleton className="size-full rounded-lg" radius={0} />
                </div>
              </div>
            ))
          : rows.map((game, i) => (
              <div key={game.slug}>
                <GameTile
                  slug={game.slug}
                  name={game.fullName}
                  image={game.icon}
                  players={game.onlineUsers}
                  index={i}
                  /* Both carried by the ROW, not by this section — `yn` stamps `autoTag` when
                     it builds the home page's Continue Playing / Favorites tabs and nothing
                     else sets it, so every other strip passes `undefined` and draws no badge. */
                  autoTag={game.autoTag}
                  isRecItem={game.isRecItem}
                />
              </div>
            ))}
        {showViewAll && (
          <div>
            <ViewAllTile href={href} />
          </div>
        )}
      </div>
    </>
  );
}
