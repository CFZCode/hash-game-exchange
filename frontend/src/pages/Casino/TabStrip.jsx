import { NavLink } from 'react-router-dom';
import ScrollTabs, { ACTIVE } from '../../components/shared/ScrollTabs';
import {
  AllGamesIcon,
  OriginalsIcon,
  HotIcon,
  SlotsIcon,
  LiveCasinoIcon,
  TableGameIcon,
  NewReleasesIcon,
  BurstGamesIcon,
  PokerIcon,
  FeatureBuyInIcon,
  ProvidersIcon,
} from '../../components/Explore/icons';
import { TABS } from './catalogue';
import { useSettings } from '../../context/settings';
import { useGates } from '../../context/gates';
import './Casino.css';

/* The casino page's tab strip.
 *
 * The same `fe` scroller and the same tab chrome as the Explore panel's — measured off the
 * live page rather than assumed: the selected pill samples #3A4142, which is `tab_selected`
 * exactly, its icon samples #24EE89, which is `brand` exactly, and the pill is 40px tall,
 * which is the `h-10` the Explore tabs already carry. So this is `ye` with a different list,
 * and it is built from the same parts.
 *
 * The one structural difference is that these tabs are ROUTES, not component state: the page
 * is `/casino/:tab?` (Enter-MsmOuq5R.js:8669), so a tab is a NavLink and the active one is
 * decided by the URL.
 */

/* Eleven of the sixteen have a real SVG in the mirror. `AllGamesIcon` is the house glyph out
   of Filter-BJdLcmkK.js — labelled All Games there, but it is the shape the Lobby tab shows. */
const SVG_ICONS = {
  '': AllGamesIcon,
  brand: OriginalsIcon,
  hot: HotIcon,
  slots: SlotsIcon,
  live: LiveCasinoIcon,
  'table-game': TableGameIcon,
  new: NewReleasesIcon,
  'crash-games': BurstGamesIcon,
  poker: PokerIcon,
  'feature-buy-in': FeatureBuyInIcon,
  provider: ProvidersIcon,
};

/* The other five are sprite cells, masked so they take a colour like the SVGs do — see the
   note in Casino.css. */
const SPRITE_ICONS = {
  'game-shows': 'game_shows',
  blackjack: 'blackjack',
  roulette: 'roulette',
  baccarat: 'baccarat',
  themes: 'themes',
};

/* THE SELECTED ICON IS GREEN IN DARK AND INHERITS THE LABEL'S COLOUR IN LIGHT, which is the
   chunk's own conditional and not a simplification of it:

     a() === l.value ? (D.darken ? "fill-brand" : "") : "fill-secondary"

   In the light theme the selected branch is the EMPTY STRING — no fill utility at all — so the
   glyph falls through to `.icon`'s `fill: currentColor` and takes the anchor's inline
   `color: rgb(var(--alw_white))`. White on the near-black `tab_selected` pill, which is what the
   live site renders and what a sample of it confirms.

   `icon` IS LOAD-BEARING HERE AND WAS MISSING. It was inert for as long as a fill utility was
   written unconditionally, so dropping it cost nothing; without it the light selected branch has
   no fill from anywhere and an SVG's initial `fill` is BLACK, not `currentColor`. The original
   carries it on every one of these icons.

   This build wrote a flat `fill-brand` for the selected state, which was right in the dark theme
   and turned the light one green where the original has it white. */
function TabIcon({ tab, selected }) {
  const { darken } = useSettings();
  const fill = selected ? (darken ? 'fill-brand' : '') : 'fill-secondary';
  const Svg = SVG_ICONS[tab];
  if (Svg) {
    return <Svg className={`icon size-5 flex-none ${fill}`} />;
  }
  return (
    <div
      className={`casino-tab-sprite flex-none ${SPRITE_ICONS[tab]}`}
      {...(selected ? { 'data-selected': '' } : {})}
    />
  );
}

export default function CasinoTabStrip({ active, compact = false, tight = false, linkTab = false }) {
  const gates = useGates();
  return (
    /* mb-2 is the strip's own, NOT the first section header's. Measured at a matched 1530px
       viewport against the reference: header-to-header pitch is 262px here and 262.5px there,
       so `mt-6` is right and every row below the first is already in place — but the gap from
       this strip's bottom edge to the first header is 24px here against 30px there. The 8px
       therefore belongs to the thing that only appears once. Putting it on SectionHeader
       instead would have shifted every row on this page and on the home page.

       The bar is the tab buttons' own 40px plus `py-2`, so 56px overall. No `h-10` alongside
       it: Tailwind's preflight makes everything border-box, so `h-10 py-2` would pin the
       total at 40 and squeeze the 40px buttons into a 24px content box. Height comes from the
       buttons; the padding adds to it.

       Both gaps around the bar are MARGINS, `compact` halves them, and BELOW `sm` BOTH ARE
       TIGHTER STILL — requested, and written as `phone sm:desktop` throughout so that nothing
       in this block reaches 640 and up. The lobby needs the looser desktop pair because what
       follows the bar there is a section HEADER, which carries 32px of its own leading; a tab
       page drops straight into a grid of cards and reads as one block with the bar, so it
       wants the bar tucked up under the search field:

         below   lobby `mb-1 sm:mb-6` is adjacent to the first section header's `mt-3 sm:mt-6`,
                 so the result is max(), NOT the sum: the phone arm lands on the HEADER's 12px
                 rather than its own 4, and the desktop arm now TIES with the header's 24. Read
                 these as "the gap is 12/24", never as "add 4/24".

                 BOTH ARMS ARE AT THEIR FLOOR, and that is the thing to know before trying to
                 tighten either again. `sm:mb-6` was `sm:mb-8` (32px) and came down on request;
                 `sm:mb-5` and anything below it renders the same 24, because the header's own
                 `sm:mt-6` then wins the collapse. Likewise the phone arm is pinned at the
                 header's `mt-3`. Going tighter at EITHER width now means editing SectionHeader
                 — which is also the home page's, so it is not a casino-page change.

                 Compact is the tab pages, where what follows is a GRID rather than a header, so
                 the thing being collapsed against is its `mt-4`. ANYTHING AT OR UNDER `mb-4`
                 THERE IS INVISIBLE — which is why the tight arm can say `mb-0` and mean 16px,
                 and why this arm has a floor of 16 however far it is wound down (`mb-5` is 20,
                 `mb-4` and below are all 16).

                 `mb-8 sm:mb-8` — 32px at every width, and THE PAIR IS WRITTEN OUT EVEN THOUGH
                 THE TWO HALVES NOW AGREE. The phone's 32 came from the mobile pass ("increase
                 the space between the cards and the tabs" on BC Originals); the desktop arm was
                 tuned separately and later, from a desktop, and went 32 -> 24 -> 28 -> 32 before
                 converging back on it. Collapsing this to a bare `mb-8` would render the same
                 today and would hide which half a future edit is touching — this file has
                 already had one desktop request silently take the phone down with it
                 (`mb-6 sm:mb-6`), and keeping the arms explicit is what makes that impossible to
                 repeat by accident.

                 It is one branch, so every tab that opens straight onto cards moves with it,
                 which is right: they are the same layout.
         above   `mt-0` at EVERY width. The gap from the search field is that box's own `mb-1`
                 plus this bar's `pt-2` — 12px, and 8px above the pills once pinned, since the
                 margin leaves the flow when the bar sticks. See the note further down for why
                 the 4px sits on the search box rather than here. The two `sm:mt-*` arms that
                 used to sit here are gone, so desktop and phone are one figure now.

       Sticky, so the strip stays reachable while the rows scroll past it:
         - `top` is the fixed header's own height, which .main-layout-wrapper publishes as
           --header-h (3.5rem below lg, 60px from lg up). Hard-coding 60 would tuck the strip
           under the taller mobile header.
         - bg-layer2 is the page fill, so the bar is opaque; nothing in this build renders
           outside .main-layout-container, so it does not need to bleed full-width.
         - It must stay a DIRECT child of the page container. Wrapping it in a spacer div
           would make that div its containing block, and a 40px bar in a 48px parent unsticks
           after 8px of scroll.
       Sticky works here only because no ancestor scrolls: .main-layout-content/-container
       and .main-layout-wrapper all leave overflow visible. Adding overflow to any of them
       silently turns this back into a static row. */
    <ScrollTabs
      /* EVERY GAP HERE IS A COLLAPSE, NOT A SUM, and that is what makes the numbers below read
         oddly. What follows the strip is a div whose first child carries a top margin, and that
         margin collapses THROUGH the parent's open top edge to sit beside this one — adjacent
         margins take the larger, so `mb-8` against a `mt-4` is 32px and `mb-1` against the same
         `mt-4` is still 16. Read each pair as "the gap is N", never as "add N".

         Off the Lobby the two are now EQUAL — `sm:mb-6` against the first section header's
         `sm:mt-6` — so 24px is the gap whichever of them is read as owning it.

         `tight` is for the tabs that open on the Sort By / Providers bar rather than straight
         onto cards — it hands the gap back to that bar's own `mt-4`, i.e. 16px, which is what
         the live page shows there (its filter row sits in a `py-4` wrapper). Expressed as
         `mb-0` and not `mb-4` on purpose: both render 16px today, but `mb-4` would be a second
         claim on the same gap, and whichever of the two was edited later would silently lose
         the collapse. Only one side owns it.

         `linkTab` is Providers and Themes, which open onto a grid of LINKS rather than of game
         cards, and it hands the phone gap back the same way `tight` does while leaving desktop
         at 32. It exists because those two would otherwise share the game tabs' arm, and they
         do not measure the same: `ProviderGrid` carries a `pt-2` of its own that PADDING rather
         than margin, so it never collapses and simply adds — the providers grid sat 8px lower
         than every other tab's for that reason alone. With `mb-0` the two land at 24 and 16
         where they were 32 and 24. The `pt-2` is the Explore chunk's own and is left alone. */
      /* `px-4 sm:px-0` IS THE CHUNK'S, and without it the tabs were the one block on the page
         not inset on a phone. `index-DTOmRFSX.js` writes the bar as
         `S.mobile ? "sticky left-0 top-14 z-10 -mx-4 bg-layer2 px-4 py-2"
                   : "sticky left-0 top-15 z-10 w-full bg-layer2 py-2"`
         — the mobile arm cancels the page gutter with `-mx-4` so the opaque bar reaches the
         viewport edges, then puts the 16px back INSIDE it so the tabs line up with everything
         above and below. This build's column has no inset below `sm` and each block adds its
         own `px-4 sm:px-0`, so the `-mx-4` half is already true structurally and only the
         padding was missing: the bar bled correctly and the Lobby tab sat hard against the
         left edge while the search field above it and the cards below it were 16px in.

         The two `top` values in that pair are this project's `--header-h` — 3.5rem below `lg`,
         60px from `lg` up — which is what the inline style already reads, so `S.mobile` there
         is the 1024 line and not the 640 one. */
      /* THE PHONE MARGINS ARE TIGHTER THAN THE DESKTOP ONES AND EVERY PAIR IS WRITTEN
         `phone sm:desktop`, so nothing here reaches 640 and up. Requested: the strip sat too
         far from the search field above it and from the first section heading below.

           above   `mt-2` -> 0 below sm, and later -> 0 at every width. What remains is the
                   search box's `mb-1` over this bar's `pt-2`, so the gap is 12px.
           below   `mb-5` -> `mb-1`. This one has a floor that is not ours: the gap is
                   max(this margin, the first SectionHeader's `mt-3`) because adjacent margins
                   collapse to the larger, so anything under 12px lands on the header's 12 and
                   the total is `py-2` + 12 = 20px, down from 28. Going below that means
                   editing SectionHeader, which is also the home page's.

         The `sm:` halves were untouched by that pass — `mt-2`, `mb-5 sm:mb-8` and `mt-1`/`mb-8`
         — so the desktop strip came out of it byte-identical. It has moved SINCE, on its own
         requests and only ever inside `sm:` variants: the two `sm:mt-*` arms are gone and both
         `sm:mb-8`s are now `sm:mb-6`. Every one of those edits is invisible below 640, which is
         the standing rule for this file in both directions. */
      /* THE BAR'S OWN PADDING IS SYMMETRIC — `py-2`, the chunk's own — AND THE EXTRA GAP ABOVE
         IT LIVES ON THE SEARCH BOX INSTEAD. That split is the whole of what this block is
         about, and it took three passes to land on:

           1. `pt-3` + `sm:mt-2` (lobby) / `sm:mt-1` (compact) — 12px from the search field on a
              phone, 20 on a desktop.
           2. cut to the chunk's bare `py-2` with no margin — 8px everywhere, which is exactly
              what `index-DTOmRFSX.js` writes (`... top-14 z-10 -mx-4 bg-layer2 px-4 py-2` /
              `... top-15 z-10 w-full bg-layer2 py-2`).
           3. asked to come back up a little, so `pt-3` returned with the sticky offset pulled
              up 4px to compensate — and that made the bar 12 top / 8 bottom, which sits the
              PILLS 2px below the bar's own centre. Invisible in isolation (the bar is
              `bg-layer2`, the page colour, so it has no edges to judge it against) but it is
              real, and it is the kind of thing that reads as "the tabs are not centred".

         So the 4px is a `mb-1` on the SEARCH BOX now (see Casino/index.jsx) and the bar is back
         to a symmetric `py-2`. Same 12px gap, pills centred in their own bar, and the sticky
         offset is a plain `--header-h` again with no `calc()` to keep in sync with the padding.

         WHY THE MARGIN GOES ON THE SEARCH BOX AND NOT ON THIS BAR, which is the obvious place
         for it: sticky constrains the element's MARGIN box to `top`, so an `mt-1` here would
         hold the margin box at the header's bottom edge and drop the BORDER box 4px below it —
         opening a 4px window between the fixed header and the bar for page content to scroll
         through while pinned. A margin on the element ABOVE has no such effect, because it is
         gone from the flow the moment this bar sticks.

         One `top` value, no `sm:` arm: with the margins gone the stuck geometry is identical at
         every width, which is what removed the second figure that used to need keeping in sync.

         A utility rather than the inline `style` this once carried: an inline style cannot hold
         a media query and beat any rule that tried to override it. */
      className={`sticky top-[var(--header-h)] z-20 bg-layer2 px-4 py-2 sm:px-0 ${
        compact
          ? `mt-0 ${tight ? 'mb-0' : linkTab ? 'mb-0 sm:mb-8' : 'mb-8 sm:mb-8'}`
          : 'mt-0 mb-1 sm:mb-6'
      }`}
      /* NO `arrows` PROP, so this takes `ScrollTabs`'s own default of `!m.mobile` — chevrons on a
         desktop, none below `lg`. That default IS `fe`'s: it wraps each button in
         `<Show when={E(() => !x.mobile)() && o()}>`, i.e. a desktop AND something to scroll to in
         that direction, which is exactly the "hide the left one at the first tab, the right one
         at the last" behaviour asked for — it was already implemented and this strip was simply
         opting out of it.

         This file carried `arrows={false}` for a while, on a request to drop the chevrons and
         drag the strip instead. That is reversed for the desktop half and kept for the phone by
         the same default, since below `lg` the arrows do not render and `ScrollTabs` hands the
         strip back to `useDragScroll`. The two are mutually exclusive there by construction —
         see the note at the top of that component. */
    >
      {TABS.filter(({ tab }) => tab !== 'brand' || gates.on('originals')).map(({ label, tab }) => {
        const selected = tab === active;
        return (
          <NavLink
            key={tab || 'lobby'}
            to={tab ? `/casino/${tab}` : '/casino'}
            className={`flex h-10 flex-none items-center justify-center rounded-lg px-2 py-0 sm:hover:bg-layer3 ${
              selected ? `${ACTIVE} bg-tab_selected sm:hover:bg-tab_selected` : ''
            }`}
            style={selected ? { color: 'var(--color-alw_white)' } : undefined}
          >
            <TabIcon tab={tab} selected={selected} />
            {/* The unselected labels are `font-semibold`, which is where this strip parts
                company with the Explore panel's — `ye` leaves them at the body weight and the
                live casino strip does not. Read off the reference: at the same scale its
                unselected labels carry visibly more ink than the selected one carries extra,
                i.e. 600 against the selected 800, not 400 against 800. */}
            <span
              className={`ml-1 whitespace-nowrap ${
                selected ? 'font-extrabold' : 'font-semibold text-secondary'
              }`}
            >
              {label}
            </span>
          </NavLink>
        );
      })}
    </ScrollTabs>
  );
}
