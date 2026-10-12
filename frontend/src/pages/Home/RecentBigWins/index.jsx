import React from 'react';
import VipTierIcon from './VipTierIcon';
import { getRecentBigWins } from '../../../services/home';
import { useResource } from '../../../hooks/useResource';
import { useGates } from '../../../context/gates';
import './RecentBigWins.css';
import Skeleton from '../../../components/shared/Skeleton';

/* Recent Big Wins — the auto-scrolling strip of winners under the hero.
 *
 * Source: `Ao` / `Ou` / `$u` in bc.game/bc.game/assets/Enter-MsmOuq5R.js, with the section
 * header from `ot` (`showController: false`, no `href`, so neither the All button nor the
 * arrow controls render) and the animation from `.recent-big-win` in index-DxOqNczA.css.
 * Class lists below are the original's verbatim; see the notes where they are not.
 */

/* Tab index doubles as the API's gameTypeId, which is why filtering by it is exact rather
   than a mapping. 0 means "no filter". */
const TABS = [
  { tab: 0, title: 'All' },
  { tab: 1, title: 'BC Originals' },
  { tab: 2, title: 'Slots' },
  { tab: 3, title: 'Live Casino' },
];

/* Every card position must be filled, so a short list is repeated until it reaches 20 and
   the whole run is then duplicated. Taken from `Ou`:
     Array(Math.ceil(20 / list.length)).fill(list).flat().slice(0, 20)  ->  .concat(itself)
   The count of 20 is what --move-x in the stylesheet is derived from — changing it here
   without changing that breaks the seam. */
const STRIP_LENGTH = 20;

function buildStrip(list) {
  if (!list.length) return [];
  const filled = Array(Math.ceil(STRIP_LENGTH / list.length))
    .fill(list)
    .flat()
    .slice(0, STRIP_LENGTH);
  return filled.concat(filled);
}

/* The dot is two stacked circles: a solid one and a second that pings out from underneath
   it. Same markup for both, so it lives in one place. */
const Dot = ({ className }) => (
  <div className={`absolute left-0 top-0 h-full w-full rounded-full bg-success ${className}`} />
);

function TabButton({ title, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      /* `center` in the original; spelled out as utilities because a plain `.center { display:
         flex }` is unlayered and would outrank any responsive display utility later added
         here (CLAUDE.md, cascade hazard). */
      className={`button h-auto flex-1 items-center justify-center whitespace-nowrap rounded-none border-b-2 p-1 text-xs ${
        active
          ? 'border-b-brand font-semibold text-primary'
          : 'border-b-transparent font-normal text-secondary'
      }`}
    >
      {title}
    </button>
  );
}

function WinCard({ win }) {
  return (
    /* href is "#" until the app has a router; the real target is
       `/game-detail/${win.distributeId}`, which is kept on the data for that day. */
    <a
      href="#"
      className="flex h-28 w-14 flex-none flex-col items-center text-xs hover:opacity-80 sm:h-[106px]"
    >
      {/* pt-[133%] is the 3:4 portrait art (the source files are 400x533), so the tile's
          height comes from its own width and no image dimension is hardcoded. */}
      <div className="relative mb-1 w-full rounded-lg pt-[133%]">
        <img
          className="absolute left-0 top-0 w-full rounded-lg"
          src={win.icon}
          alt={win.gameUnique}
        />
      </div>

      {/* w-[118%] is the inverse of `.text-xxs`'s scale(.833): the label is laid out at 12px
          in a box 18% wider than the card, then visually shrunk to ~10px inside the card's
          width. `items-center` on the parent keeps the overhang even on both sides. The two
          lines together overflow the 106px card by ~4px, which the strip's py-2 absorbs —
          that is the original's behaviour, not a miscalculation. */}
      <div className="w-[118%]">
        <div className="flex items-center justify-center font-extrabold text-secondary">
          <VipTierIcon tier={win.tier} className="size-[0.875rem] flex-none" />
          <span className="text-xxs ellipsis -ml-0.5">{win.name}</span>
        </div>
        <div className="text-xxs whitespace-nowrap text-center font-extrabold text-brand">
          {win.amount}
        </div>
      </div>
    </a>
  );
}

/* The pending arm of `WinCard`, and it is DELIBERATELY THE SAME MARKUP.
 *
 * `Skeleton` WRAPS its children rather than replacing them — `.skeleton` covers them with two
 * pseudo-elements — so a placeholder built out of the real elements is automatically the exact
 * size and shape of what is coming, and nothing reflows when the data lands. That is the whole
 * design of the component and the reason this does not hardcode a single height: the two text
 * lines get their boxes from `text-xxs` and from the VIP mark's own `size-[0.875rem]`, exactly
 * as the loaded card does.
 *
 * IT COVERED ONLY THE ARTWORK BEFORE. The `h-28` box was right, so the strip did not collapse
 * and the section below it did not jump — but the bottom ~30px of every placeholder was empty
 * where the name and the amount were about to appear, so the card grew two lines of text out of
 * blank space when the feed landed. The three blocks are covered now.
 *
 * `&nbsp;` and not an empty string: an empty inline box is zero-height, which would put the
 * lines back to nothing. A non-breaking space gives the line its real height and is invisible
 * under the skeleton's own fill.
 */
function WinCardSkeleton() {
  return (
    <div className="flex h-28 w-14 flex-none flex-col items-center text-xs sm:h-[106px]">
      <Skeleton className="mb-1 block w-full rounded-lg pt-[133%]" radius={0}>
        <div className="size-full" />
      </Skeleton>

      {/* `w-[118%]` and its overhang are the loaded card's — see the note there. */}
      <div className="w-[118%]">
        <Skeleton className="block">
          <div className="flex items-center justify-center font-extrabold text-secondary">
            {/* The VIP mark's box without the mark: it is what sets this line's height. */}
            <div className="size-[0.875rem] flex-none" />
            <span className="text-xxs ellipsis -ml-0.5">&nbsp;</span>
          </div>
        </Skeleton>
        <Skeleton className="mt-0.5 block">
          <div className="text-xxs whitespace-nowrap text-center font-extrabold text-brand">
            &nbsp;
          </div>
        </Skeleton>
      </div>
    </div>
  );
}

export default function RecentBigWins() {
  const [tab, setTab] = React.useState(0);
  const gates = useGates();
  /* ONE READ PER TAB — see services/home.js. `useResource` reads once per distinct reader, so
     the reader is re-keyed on the tab; each tab has its own twenty rows, and filtering a single
     list is what left BC Originals showing three of them. */
  const read = React.useCallback(() => getRecentBigWins({ tab }), [tab]);
  const { data: recentBigWins } = useResource(read);
  const [visible, setVisible] = React.useState(true);
  const stripRef = React.useRef(null);

  const items = React.useMemo(() => buildStrip(recentBigWins ?? []), [recentBigWins]);

  /* Pause the animation while the strip is off screen, as the original does
     (`ft({ rootMargin: "100px" })`). */
  React.useEffect(() => {
    const el = stripRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '100px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* `ot` with showController: false. h-8 and the mt are the section-header defaults
          shared by every panel below this one. */}
      <div className="mt-3 flex h-8 items-center sm:mt-6">
        <h2 className="flex items-center text-base font-extrabold text-primary">
          {/* `mx-4 mr-2` in the original, which resolves to ml-4 mr-2 only because Tailwind
              emits mr after mx. Written out so it does not depend on that ordering. The
              header carries no padding of its own, so this ml-4 is what lines the dot up
              with the strip below it. */}
          <div className="relative ml-4 mr-2 h-2 w-2">
            <Dot className="z-10" />
            <Dot className="animate-ping" />
          </div>
          <div>Recent Big Wins</div>
          <div className="ml-2 hidden gap-2 lg:!flex">
            {/* BC Originals switched off: its tab goes. */}
            {TABS.filter(({ tab: value }) => value !== 1 || gates.on('originals')).map(({ tab: value, title }) => (
              <TabButton
                key={value}
                title={title}
                active={tab === value}
                onClick={() => setTab(value)}
              />
            ))}
          </div>
        </h2>
      </div>

      {/* The clipping box. From sm up it becomes the panel itself (layer3, rounded-xl); below
          that it is transparent and only supplies the 16px gutter. The cards are wider than
          this box by design and overflow-hidden is what makes the marquee a marquee — note
          that padding does not clip, so a card can sit flush against the panel edge
          mid-scroll exactly as it does on the live site. */}
      <div ref={stripRef} className="overflow-hidden px-4 sm:rounded-xl sm:bg-layer3 sm:px-3">
        <div
          className={`recent-big-win inline-flex items-center gap-3 py-2 sm:gap-3.5 ${
            visible ? '' : 'marquee-paused'
          }`}
        >
          {/* The marquee's pending arm. A `WinCard` is `h-28 w-14 flex-none` (`sm:h-[106px]`), so
              the placeholders are that box exactly and the panel keeps its height while the feed
              is out — without them the strip collapses to its own `py-2` and the section below it
              jumps up by ~112px when the wins land. Twelve fills a desktop row; the strip is
              duplicated content anyway, so the count is a width rather than a quantity. */}
          {recentBigWins
            ? items.map((win, i) => (
                // Duplicated entries are the point of the strip, so the index is the only key.
                <WinCard key={i} win={win} />
              ))
            : Array.from({ length: 12 }, (unused, i) => (
                <WinCardSkeleton key={`skeleton-${i}`} />
              ))}
        </div>
      </div>
    </>
  );
}
