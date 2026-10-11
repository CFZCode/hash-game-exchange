import React from 'react';
import SectionHeader from '../../components/shared/SectionHeader';
import { Controller } from '../Home/GameSection';
import ProviderLogo from '../../components/shared/ProviderLogo';

/* The two rows on the lobby that hold links rather than games — Game Providers and Themes.
 *
 * The casino chunk is not in the mirror, so the geometry below is MEASURED off the live page
 * in the reference screenshot rather than transcribed. Calibrating on the sidebar's known
 * 240px gives that capture a scale of 0.4167, and against it:
 *
 *   chip height      20-21px  ->  48px      h-12
 *   chip width       55-58px  ->  132-139   w-[8.25rem] (uniform within measurement noise)
 *   gap               5px     ->  12px      gap-3
 *   providers fill    41,45,46 -> #292D2E   layer3
 *   themes fill       50,55,56 -> #323738   layer4
 *
 * The two fills really are different — that is not a sampling error, they were read from flat
 * areas of both rows. Everything else about the row is the same SectionHeader and the same
 * arrow Controller the game rows use, which is what the screenshot shows.
 */

/* Shape only — each row brings its own size, fill and weight, because the two are not the
   same box. The reference has the theme chips slightly larger than the provider ones. */
const CHIP = 'button flex-none rounded-xl p-0';

export default function ChipRow({ title, href, items, renderItem, chipClass, gapClass = 'gap-3' }) {
  const scrollerRef = React.useRef(null);

  return (
    <>
      <SectionHeader
        className="px-4 sm:px-0"
        href={href}
        controller={<Controller scrollerRef={scrollerRef} />}
      >
        {title}
      </SectionHeader>

      <div
        ref={scrollerRef}
        className={`hide-scroll smooth-scroll flex ${gapClass} overflow-x-auto overflow-y-hidden scroll-smooth px-4 pt-3 sm:px-0`}
      >
        {items.map((item) => (
          <a key={item.key} href={item.href} className={`${CHIP} ${chipClass}`}>
            {renderItem(item)}
          </a>
        ))}
      </div>
    </>
  );
}

/* `/provider/:provider` is the site's own route for one provider's catalogue
   (Enter-MsmOuq5R.js:8693), and the Explore panel's provider grid already targets it. */
export function ProviderRow({ providers }) {
  return (
    <ChipRow
      title="Game Providers"
      href="/casino/provider"
      /* EIGHT ACROSS ON A DESKTOP, AND THE WIDTH IS DERIVED RATHER THAN MEASURED. The capture
         shows exactly eight chips filling the content column with the eighth flush against its
         right edge, which a fixed width cannot hold: `w-[8.25rem]` (132px) fits 8.5 of them in a
         1254px column, so the ninth showed as a sliver and nothing lined up with the edge.

         `calc((100% - 5.25rem) / 8)` is that constraint written out — eight chips and the SEVEN
         gaps between them, `7 x gap-3` being 84px, i.e. 5.25rem. The percentage resolves against
         the scroller's content box, so it tracks the column at any width instead of pinning a
         number that is only right at one. Note it is seven gaps and not eight: the eighth gap
         begins after the last visible chip, which is what leaves it flush.

         THE UNDERSCORES ARE NOT OPTIONAL. `calc()` requires whitespace around `-`, and without
         it `100%-5.25rem` parses as `100%` followed by a negative length — a syntax error, so
         Tailwind emits no rule at all and the class silently does nothing. `_` is v4's stand-in
         for a space inside an arbitrary value. Written without them first; the tell was that the
         class was absent from the built CSS entirely rather than present and losing a cascade.

         `lg:` only. Below 1024 the row keeps its measured 132px — eight across a phone would be
         40px a chip, and the row is a scroller precisely so it can overflow there. */
      chipClass="h-12 w-[8.25rem] bg-layer3 font-extrabold lg:w-[calc((100%_-_5.25rem)/8)]"
      items={providers.map((name) => ({
        key: name,
        href: `/provider/${encodeURIComponent(name)}`,
        name,
      }))}
      renderItem={(item) => <ProviderLogo name={item.name} />}
    />
  );
}

/* `/tagname/:tag` — the same route the home page's All Bingo Games row links to.
 *
 * 160 x 53px, expressed as rem the way every other measured value in this project is
 * (design px / 16) so the chip scales with the root font-size below sm: 10rem x 3.3125rem,
 * both exact. The label is font-semibold here rather than the providers' extrabold.
 *
 * `gap-2`, against the providers' gap-3. Measured off the live Themes grid: its chips are
 * 206px wide with 12px between them, which against the 160px box above is a capture scale of
 * ~1.29 and so a real gap of ~9px. 8px is the nearest step, and it is visibly tighter than
 * the 12 this row had.
 *
 * `text-sm` pins the label at 14px. It already computed to 14px — body sets .875rem and
 * nothing between here and it declares a size — so this only makes it explicit and immune to
 * a future change to that inherited base. It moves line-height 21px -> 20px, which is
 * invisible: the label is one line, flex-centred in a fixed-height box.
 *
 * `min-w-`, not `w-`, plus `whitespace-nowrap`: all but one of the ninety-four labels measure
 * under the 160px, so those chips come out at exactly 160 and the row is uniform. "Buy Extra
 * Ball Feature" does not fit — at 14px it needs about 155px of text against 144px of usable
 * width — so with a fixed width it wrapped to two lines. It sets the width of its own chip
 * instead. Keeping every chip at 160 AND that label on one line is not possible without
 * shrinking its type below the 14px this row is specified at; the Themes TAB, whose grid
 * tracks cannot grow, truncates it with an ellipsis exactly as the live grid does. */
export function ThemeRow({ themes }) {
  return (
    <ChipRow
      title="Themes"
      href="/themes"
      gapClass="gap-2"
      chipClass="h-[3.3125rem] min-w-[10rem] whitespace-nowrap bg-layer4 text-sm font-semibold text-primary"
      items={themes.map((label) => ({
        key: label,
        href: `/tagname/${encodeURIComponent(label)}`,
        label,
      }))}
      renderItem={(item) => <span className="px-2 text-center">{item.label}</span>}
    />
  );
}
