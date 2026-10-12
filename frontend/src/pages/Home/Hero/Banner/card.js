import * as globMaps from './card.globs.js';
/* The banner card's shared parts, in their own module so the carousel and the deposit slide can
 * both have them without importing each other.
 *
 * The class lists below are byte-identical in two chunks from two different bundles — `he`/`ce`
 * in index-t-7F5FAB.js (the feed card) against `lr` in widget-entry-DTIkOyrt.js (the deposit
 * card). That is not a coincidence to be tidied away: the two cards are built by unrelated
 * teams to the same spec, and keeping one copy here is what stops them drifting apart in this
 * build the way they cannot on the original.
 */

/* One glob per module, as everywhere else here. A banner row's `image` is the basename in
   src/assets/banners/ — for a feed row that is the CDN's own content hash, for a fallback row
   the deploy's own filename with its build hash stripped. Neither needs a lookup table. */
const art = globMaps.art;

export const artFor = (name) => art[`../../../../assets/banners/${name}.png`];

/* `px-3` below `sm` is what separates the cards when the carousel's own spacing is 0; from `sm`
   up `!px-0` hands that job back to the 8px spacing. The `!` is the original's. */
export const SLIDE_PAD = 'px-3 pt-0.5 sm:!px-0';

export const CARD =
  'center flex size-full justify-between overflow-hidden rounded-xl bg-layer3 p-3';

/* `h-44` — 176px, and the reason the artwork was fetched at 392x352: that is this box at 2x.
   The card's own height is this plus `p-3` twice plus `pt-0.5`, which is 202px, which is
   exactly the `h-[12.625rem]` the site's own loading skeleton reserves. */
export const CARD_BODY =
  'flex h-44 w-full flex-col bg-contain bg-right-top bg-no-repeat font-semibold';

/* `bg-[#E6E9EB]` is a literal on the original too — a near-white chip that carries
   `text-primary_brand` (pure black) whatever the theme. */
export const CARD_TAG =
  'my-1 flex h-5 w-fit items-center rounded bg-[#E6E9EB] px-1.5 text-xs font-extrabold uppercase text-primary_brand';

/* `<Button size="s">`, hence `.button.button-s`; every box value after that is a utility the
   call site writes over the primitive, which is why `.button-s` has to stay layered. */
export const CARD_BUTTON =
  'button button-s mb-1 flex h-9 w-fit min-w-0 max-w-full items-center justify-center rounded-lg border border-third px-3 text-sm uppercase text-secondary backdrop-blur-sm hover:text-primary';

/* `Te.Arrow`, the site's one chevron — the same glyph the game rows and the wallet pill use.
   It points LEFT as drawn; every other direction is a rotation of it. */
export const ARROW_PATH =
  'M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z';
