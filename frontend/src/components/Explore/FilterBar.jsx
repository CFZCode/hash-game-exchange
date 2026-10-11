import React from 'react';
import Select, { MultiSelect } from '../shared/Select';
import { SearchIcon } from './icons';
import { SORTS } from './catalogue';
import ProviderLogo from '../shared/ProviderLogo';
import { useIsDesktop } from '../../hooks/useMediaQuery';

/* THE `stacked` PROP IS GONE, and its removal is a correction rather than a tidy-up. It put the
   two controls in a column for the casino page's Poker tab, on a screenshot reading that had the
   Show Blocked switch sitting opposite them. The capture of that section says otherwise: Sort By
   and Providers side by side exactly as on every other tab, with Show Blocked on its own line
   underneath — which is the arrangement the filter tabs already use. One layout, no prop. */
export default function FilterBar({
  sort,
  setSort,
  providers,
  selectedProviders,
  setSelectedProviders,
  search = false,
  /* Whether the provider rows show their MARK on a narrow viewport, where they otherwise show
     the bare name. It is a per-call-site question and not a preference, because it depends on
     the list: `ProviderLogo` falls back to the name for any studio with no local mark, so a
     sheet of the casino tabs' two dozen providers is a column of mismatched artwork with
     several text rows dropped into it, while the Poker tab's thirteen ALL resolve to a mark and
     read better as logos. Default off, so only a list known to be complete opts in. */
  providerLogos = false,
  /* An extra control rendered as the LAST CHILD OF THE FILTER ROW rather than as a sibling
     under it — the casino page's Show Blocked switch, and so far its only user.

     It is a slot rather than a fixed prop because the row is shared with the Explore panel,
     which has no such control, and because what goes in it brings its own alignment: the
     original writes that switch `flex items-center py-2 pl-2 sm:ml-auto`, and `ml-auto` is
     meaningless unless the thing is a flex ITEM of this row. Passing it as a child is what
     makes the class do its job.

     Its presence also drops `sm:w-auto` below — see the note on the row. */
  trailing = null,
  /* THE TWO SELECTS IN A COLUMN WITH THE TRAILING CONTROL OPPOSITE — the Poker tab's own
     arrangement, and its `stacked` prop is BACK after being removed as a supposed correction.
     The removal was made on the reading that Poker's capture matched every other filter tab; a
     later capture of that exact section shows otherwise, with Sort By over Providers at 288px
     each and Show Blocked hard right, centred against the pair. Evidence beats the tidier
     reading, which is the same call the invite host and the deposit-offer scroll lock document.

     `sm:` only. Below 640 the two pills are `flex-1` and share one line with the control wrapping
     under them, which is what every tab does there and what the mobile pass tuned. */
  stacked = false,
}) {
  const [needle, setNeedle] = React.useState('');
  const isDesktop = useIsDesktop();
  const [focused, setFocused] = React.useState(false);

  const visible = React.useMemo(() => {
    const q = needle.toLowerCase();
    return q ? providers.filter((name) => name.toLowerCase().includes(q)) : providers;
  }, [providers, needle]);

  const sortOption = SORTS.find((option) => option.value === sort) || SORTS[0];

  return (
    <div
      /* `mt-4` is KEPT ON PURPOSE, against the chunk. `K` in Filter-BJdLcmkK.js is
         `<div class="mt-2 flex w-full flex-wrap items-center gap-2 sm:w-auto">` — 8px, baked
         into the shared component where no call site can change it. This was briefly changed
         to match, on a wrong reading of a report that the filter's TEXT sat low: the row moved
         up 8px, the text sat exactly where it had, and the gap above the filters was the only
         casualty. Reverted. If the 8px is ever wanted, it is this one word — but it is not the
         fix for anything to do with where the label sits inside its pill. */
      /* `sm:w-auto` IS DROPPED WHENEVER THERE IS A TRAILING SLOT, and that is what puts the
         switch at the far right of the content column rather than tucked against the second
         pill. The chunk's own row is `mt-2 flex w-full flex-wrap items-center gap-2 sm:w-auto`,
         written for the Explore PANEL, where the row is the panel's full width anyway and
         shrinking it to content changes nothing. On the casino page the column is far wider
         than the two 288px pills, so `w-auto` would size the row to ~584px and `ml-auto` would
         have no free space to push into. Full width is what the capture shows. */
      className={`mt-4 flex w-full flex-wrap items-center gap-2 ${trailing ? '' : 'sm:w-auto'}`}
    >
      {/* `display: contents` IS WHAT MAKES THIS WRAPPER FREE, and it is why `stacked` needs no
          second branch of markup. Unstacked, the box generates no layout at all: the two selects
          stay direct flex items of the row above, so the Explore panel and every non-Poker
          casino tab render exactly as they did before this element existed.

          Stacked, `sm:flex` overrides `contents` from 640 up (both set `display`, and the
          media-query utility comes later in the layer) and the pair becomes a column that is one
          flex item of the row — so the row's `items-center` centres the trailing control against
          the PAIR rather than against either pill, which is what the capture shows.

          `sm:gap-3` is 12px, and it is the casino page's own figure rather than a guess: the
          Providers select ships in its own chunk (`Filter-CB8e5Rdj.js`) wrapped in
          `mt-3 flex w-full items-center gap-2 sm:w-1/4 sm:flex-none`, so stacked blocks there are
          separated by `mt-3`. */}
      <div
        className={
          stacked ? 'contents sm:flex sm:w-auto sm:flex-none sm:flex-col sm:gap-3' : 'contents'
        }
      >
      {!search && (
        <Select
          /* The chunk's own is `class: "flex-1 sm:w-[288px] sm:flex-none"`. The `!h-10 … text-sm`
             this used to carry was standing in for the `button-m` the shared Select was not
             emitting — see the note on the trigger there.

             `min-w-0 overflow-hidden` IS OURS, AND IT IS A HORIZONTAL-OVERFLOW GUARD. A flex
             item's automatic minimum size is its CONTENT, so `flex-1` alone cannot shrink either
             pill below the width of its own label — and the label holds `whitespace-nowrap`. Two
             of them side by side on a narrow viewport therefore push the row past its container,
             and because `.main-layout-content` leaves `overflow: visible` that becomes a
             horizontal scrollbar on the whole page. It is the same failure the footer's partner
             row documents. `min-w-0` lets the pill shrink; `overflow-hidden` keeps the nowrap
             label from leaking back out of the pill it no longer fits in.

             Inert wherever the row already fits, which is every width the reference was measured
             at — this only bites below the point where the two pills stop fitting side by side. */
          className="min-w-0 flex-1 overflow-hidden sm:w-[288px] sm:flex-none"
          /* The sheet's heading, and the trigger's tooltip with it. `title` defaults to the
             literal "Select" (`t.title || "Select"` in `CS`), which is what the sheet showed
             until each control named itself — the capture of the original's Sort By sheet reads
             "Sort By". Inert on a desktop, where the layer has no heading at all. */
          title="Sort By"
          value={sortOption}
          options={SORTS}
          onChange={(option) => setSort(option.value)}
          labelFormat={(option) => (
            <>
              <span className="whitespace-nowrap text-secondary">Sort By:</span>
              <span className="ml-1 font-semibold">{option.label}</span>
            </>
          )}
        >
          {(option) => option.label}
        </Select>
      )}

      {providers.length > 0 && (
        <MultiSelect
          className="min-w-0 flex-1 overflow-hidden sm:w-[288px] sm:flex-none"
          title="All Providers"
          value={selectedProviders}
          options={visible}
          onChange={setSelectedProviders}
          /* The layer below carries a search box, which is what earns the mobile sheet its
             `h-[90%]` — see the note at that branch in Select. Sort By, four fixed options and
             no search, keeps a sheet the height of its rows. */
          search
          labelFormat={(selected) => (
            <>
              <span className="mr-1 text-secondary">Providers:</span>
              <span>{selected.length > 0 ? `+${selected.length}` : 'All'}</span>
            </>
          )}
          layerRender={(rows) => (
            <div className="scroll-container">
              <div className="mb-1">
                {/* `lg:h-10`, NOT `h-10`. The 40px was pinned at every width, which overrode
                    `.input`'s own responsive pair — the primitive is 3rem and narrows to 2.5rem
                    only inside the `.pc` (lg) query, so a phone is meant to get a 48px field and
                    was getting a desktop-sized one. Same shape of bug as the `!h-10` that used
                    to sit on the Sort By trigger; see the note there. */}
                <div
                  className="input px-[8px] text-sm lg:h-10"
                  {...(focused ? { 'data-focus': '' } : {})}
                >
                  <input
                    type="text"
                    placeholder="Search Providers"
                    value={needle}
                    onChange={(event) => setNeedle(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                  {/* `d(x, {class: "order-first mr-2 h-6 w-6 fill-tertiary"})` — the same
                      glyph the panel's own search box uses, which is why it comes from
                      ./icons rather than being spelled out a second time here. */}
                  <SearchIcon className="icon order-first mr-2 h-6 w-6 fill-tertiary" />
                </div>
              </div>
              {/* Five providers at a time, then scroll. A row measures 40px with a 4px
                  bottom margin, so five of them is 5 x 44 = 220px = 13.75rem: the fifth row
                  ends flush at 216 and its margin fills the rest, which puts the sixth exactly
                  out of view.

                  The cap is on the ROWS, not on the layer. `.dropdown-layer` already carries
                  `max-height: 20rem` and `.scroll-y`, and scrolling there took the search box
                  and Clear All with it; scrolling here leaves both pinned, which is what the
                  original's `scroll-container` wrapper is for. */}
              {/* THE CAP IS THE POSITIONED LAYER'S AND MUST NOT REACH THE SHEET. A dropdown
                  hanging off its trigger has to stop somewhere, and five rows is where; a sheet
                  is already bounded by its own height, so capping the rows at 220px inside it
                  leaves a 90%-tall panel with a short list marooned at the top of it and its
                  own scrollbar. Below `lg` the cap comes off and `.pop-content`'s `.scroll-y`
                  does the scrolling, which also keeps the sticky Clear All pinned to the sheet
                  rather than to a nested scroller. */}
              <div className="max-h-[13.75rem] overflow-y-auto overscroll-contain max-lg:max-h-none max-lg:overflow-visible">
                {rows}
              </div>
              <div
                className="center sticky -bottom-2 left-0 z-30 flex h-10 w-full cursor-pointer border-t border-solid border-third bg-layer3"
                onClick={() => setSelectedProviders([])}
              >
                <svg viewBox="0 0 32 32" className="icon size-5 fill-brand">
                  <path d="M23.4576 12.8027C24.2971 12.8027 24.9774 13.4831 24.9774 14.3226C24.9774 14.4305 24.9661 14.5375 24.9435 14.6419L22.8712 24.2744C22.404 26.4467 20.4831 27.9988 18.2603 27.9988H12.6628C10.4399 27.9988 8.51988 26.4476 8.05183 24.2744L5.97952 14.6419C5.80292 13.8215 6.32491 13.0133 7.14531 12.8367C7.25057 12.814 7.35758 12.8027 7.46459 12.8027H23.4567H23.4576ZM17.9044 4.11679C20.825 4.63182 22.3257 6.46488 22.2517 9.28364L26.5486 10.0414C27.1898 10.1545 27.6178 10.7661 27.5047 11.4073L27.3864 12.078C27.2733 12.7192 26.6617 13.1472 26.0205 13.0341L5.89514 9.48548C5.25396 9.37238 4.82592 8.76078 4.93902 8.1196L5.05734 7.44884C5.17044 6.80766 5.78204 6.37962 6.42322 6.49272L12.0538 7.48451C12.9481 4.81104 14.9848 3.60176 17.9053 4.11592L17.9044 4.11679ZM14.3236 7.88557L19.9793 8.88258C19.928 7.40708 19.1433 6.64932 17.5077 6.36135C15.8721 6.07339 14.876 6.51621 14.3227 7.88557H14.3236Z" />
                </svg>
                <span className="font-semibold text-brand">Clear All</span>
              </div>
            </div>
          )}
        >
          {/* LOGO ON A DESKTOP, THE BARE NAME ON A PHONE — requested, and this build's rather
              than the original's; no capture of that sheet exists to check it against. The
              reason it reads better is real enough: `ProviderLogo` is a fixed-height image that
              falls back to the name for the seven providers with no known URL, so a sheet of
              them is a column of mismatched artwork at wildly different widths where a column
              of names is scannable. One expression to revert. */}
          {(name) =>
            isDesktop || providerLogos ? (
              <ProviderLogo name={name} />
            ) : (
              /* `font-semibold`, not `font-bold`, and that is the font set rather than taste:
                 this build ships Averta at 400/600/800 only, and CSS weight matching for a
                 desired weight above 500 searches upward first — so `font-bold` (700) resolves
                 to the 800 ExtraBold face, the same one `font-extrabold` gets. 600 is the only
                 real step between the body's 400 and that, so it is what "bold" means here. Use
                 `font-extrabold` if this wants to be heavier; there is nothing in between. */
              <span className="text-base font-semibold">{name}</span>
            )
          }
        </MultiSelect>
      )}

      </div>

      {/* LAST CHILD OF THE ROW, so below `sm` it WRAPS onto its own line and picks up this row's
          `gap-2` — 8px of row gap over its own `py-2`, which is the 16px it used to get from an
          `mt-2` written at the call site. Identical on a phone, by construction, stacked or not. */}
      {trailing}
    </div>
  );
}
