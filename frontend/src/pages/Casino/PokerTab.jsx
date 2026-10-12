import React from 'react';
import GameTile from '../../components/shared/GameTile';
import GameGrid, { Empty } from '../../components/Explore/GameGrid';
import FilterBar from '../../components/Explore/FilterBar';
import ShowBlocked from './ShowBlocked';
import { Controller } from '../Home/GameSection';
import useDragScroll from '../../hooks/useDragScroll';
import { pokerPanels } from './catalogue';

/* The Poker tab.
 *
 * THE CHUNK IS RECOVERABLE AND THIS IS NOW BUILT FROM IT. `index-DTOmRFSX.js` was on this
 * file's "missing along with the rest of the casino page" list for a long time; it is 39.6 KB
 * on `hash.game/assets/`, under the hash `Enter-MsmOuq5R.js` already lists for
 * `path: "/casino/:tab?"`, and so are its filter chunk (`Filter-CB8e5Rdj.js`) and its own
 * stylesheet (`index-CflFQ6HO.css`). The panel and its container are that chunk's `r2` and
 * `e2` verbatim:
 *
 *   <div class="mb-4 flex w-full flex-col gap-6">
 *     <div class="grid w-full grid-cols-1 gap-x-3 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
 *     <div class="text-xl font-extrabold">                        <- Browse All
 *
 *   <div class="flex h-fit w-full flex-col rounded-2xl border-[1px] border-solid border-input p-4">
 *     <div class="flex w-full justify-between">
 *       <div class="flex items-center text-base font-extrabold text-primary">
 *     <div class="size-full">
 *
 * WHAT THE SCREENSHOT REBUILD GOT WRONG WAS THE MECHANISM, WHICH IS THE USUAL STORY HERE. The
 * measurements were right — 396px panels, 16px padding, a 16px radius, a 12px gap, three tiles
 * across, `size-8` arrows — but they were expressed as `w-[24.75rem] flex-none` items in a
 * `flex-wrap` row, and the original is a ONE / TWO / THREE column grid of `w-full` panels. The
 * two agree at the desktop width the capture was taken at and nowhere else: below `sm` ours
 * rendered a 396px panel squeezed by `max-w-full` rather than a column that is simply full
 * width, and across the whole 640–1023 band it fitted one panel per row where the original
 * fits two.
 *
 * `h-fit` is the chunk's and it is not a no-op: a grid item stretches by default, so without it
 * an empty panel would match its neighbour's height. The original lets it be short.
 *
 * `border-input` (#3A4142) is also the chunk's, against the `border-third` this measured — and
 * `third` is `#e4eaf019`, an alpha token that composites to roughly the same #353C3D over
 * layer2. Same picture at the sampled spot, different colour behind a different fill.
 *
 * THE FILTER ROW UNDER "Browse All" IS THE ORDINARY ONE. It was built as a column of the two
 * selects with the Show Blocked switch opposite them, off the same screenshot, and FilterBar
 * carried a `stacked` prop for that one call site; the capture has Sort By and Providers side by
 * side exactly as on every other tab, with Show Blocked underneath. The prop is gone.
 */

/* One variant panel. The strip inside is a plain flex scroller rather than the `.grid-col-3`
   preset the page rows use: that preset derives a column width from the container and there
   are only ever a handful of tiles here, at a width the panel fixes. GameTile is `size-full`,
   so each tile needs a parent with a size — the `aspect-[3/4]` div is that parent.

   That width is derived, not measured: `(100% - 1rem) / 3` is the scroller's own content width
   less the two 0.5rem gaps, split three ways, so exactly three tiles fit with none left over.
   It was 7.25rem (116px), which is what the reference measures — but the panel's content box is
   396 - 32 padding - 2 border = 362px, and 3x116 + 2x8 = 364. Two pixels over, so a panel of
   three still scrolled. Deriving the width from the container means it can't drift again if the
   panel width, its padding or the gap changes. */
function VariantPanel({ title, games }) {
  const scrollerRef = React.useRef(null);
  const dragScroll = useDragScroll(scrollerRef);

  return (
    <div className="flex h-fit w-full flex-col rounded-2xl border border-solid border-input p-4">
      {/* `flex w-full justify-between` is the chunk's, with the title in its own
          `flex items-center` box and the arrows appended beside it. The `h-8` this used to
          carry is gone with the `ml-auto` spacer: the row's height came from the `size-8`
          arrows either way, and pinning it made a panel with no games 32px tall where the
          original leaves it at the title's own line box. */}
      <div className="flex w-full justify-between">
        <h2 className="flex items-center text-base font-extrabold text-primary">{title}</h2>
        {/* `hideOnMobile={false}` — the home row's controller hides below `sm` because `ot`
            renders it only when `!m.mobile`; the chunk wires THIS one (`x1`, with a
            `smoothListSelector`) with no such test, and the reference capture of Hold'em and
            Teen Patti has arrows at a width where a home row would have none. */}
        {games.length > 0 && <Controller scrollerRef={scrollerRef} hideOnMobile={false} />}
      </div>

      {games.length > 0 ? (
        <div
          ref={scrollerRef}
          {...dragScroll.props}
          className={`hide-scroll smooth-scroll flex gap-2 overflow-x-auto overflow-y-hidden scroll-smooth pt-3 ${dragScroll.className}`}
        >
          {games.map((game, i) => (
            <div key={game.slug} className="aspect-[3/4] w-[calc((100%-1rem)/3)] flex-none">
              <GameTile
                slug={game.slug}
                name={game.fullName}
                image={game.icon}
                players={game.onlineUsers}
                index={i}
              />
            </div>
          ))}
        </div>
      ) : (
        /* No `flex-1` any more. It stretched an empty panel to its neighbour's height, which
           only worked while the panels were flex items in a stretching row; the chunk's `h-fit`
           on a grid item says the original does not do that, so an empty panel is as tall as
           its own message. */
        <Empty className="!py-0">Stay tuned—something&apos;s coming!</Empty>
      )}
    </div>
  );
}

export default function PokerTab({ games, sort, setSort, providers, selectedProviders, setSelectedProviders }) {
  const [showBlocked, setShowBlocked] = React.useState(false);

  return (
    <div className="w-full px-4 sm:px-0">
      {/* `e2`'s inner grid — one column, two from `sm`, three from `lg`. This is the whole of
          the phone fix: as a `flex-wrap` row of 396px panels it put one panel per row all the
          way to 1023, which happens to look right on a phone and is a column short across the
          entire tablet band. `mt-4` is this build's own, standing in for the chunk's outer
          `mb-4 flex w-full flex-col gap-6` wrapper — that wrapper's only other job is to space
          the grid from the Browse All heading below, which this file already does with the
          heading's own `mt-5`. Where each panel's games come from is documented on
          POKER_PANELS. */}
      <div className="mt-4 grid w-full grid-cols-1 gap-x-3 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {pokerPanels(games).map((panel) => (
          <VariantPanel key={panel.title} title={panel.title} games={panel.games} />
        ))}
      </div>

      {/* 20px, measured. `text-xl` sets 20/28 together — never split a font-size from the
          line-height Tailwind pairs with it.

          `mb-5` and not `mb-1`: the gap below this heading is the collapse of its own bottom
          margin against the filter row's `mt-4`, so max(4, 16) meant the 4 was doing nothing
          and the whole gap was the row's 16. That 16 is also the FLOOR — anything at or under
          `mb-4` here renders identically — so the usable range starts at `mb-5`, which is where
          this sits. `mb-6` was one step too open. */}
      <h2 className="mt-5 mb-5 flex h-8 items-center text-xl font-extrabold text-primary">
        Browse All
      </h2>

      {/* NOT THE SAME ARRANGEMENT AS THE OTHER FILTER TABS, and this file has now said both.
          `stacked` was removed once on the reading that Poker matched Slots and Live; a capture
          of this exact section says otherwise — Sort By over Providers in a column at 288px
          each, with Show Blocked hard against the content column's right edge and centred
          against the pair. The prop is back and this is the one call site that passes it.

          Slots and Live keep the flat row (see the casino page's filtered branch): same two
          selects, same trailing control, different geometry. Do not re-unify them on the
          strength of one of the two captures. */}
      <FilterBar
        stacked
        trailing={<ShowBlocked on={showBlocked} setOn={setShowBlocked} />}
        /* Marks rather than names in the mobile sheet, and this tab can afford them: all
           thirteen of its providers resolve to a local logo, where the casino tabs' two dozen
           include several that fall back to text. See the prop's note in FilterBar. */
        providerLogos
        sort={sort}
        setSort={setSort}
        providers={providers}
        selectedProviders={selectedProviders}
        setSelectedProviders={setSelectedProviders}
      />

      <GameGrid games={games} exactArt />
    </div>
  );
}
