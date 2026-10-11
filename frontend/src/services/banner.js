import { request, API_BASE, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { TOP_BANNERS, FALLBACK_BANNERS } from '../pages/Home/Hero/banners';

/* The signed-in hero carousel's feed.
 *
 * `createBanner(type)` in `createBanner-4SczZOe8.js` is a `createResource` keyed on
 * `[path, {areaCode, lang, userId, vipLevel, vipUser}]`, so the account's own fields go into
 * the query and the answer is per-visitor. Three things it does to the response before the
 * component sees them are reproduced here, because they are filtering and defaulting rather
 * than view logic:
 *
 *   .filter(b => !b.isBg)                             drop background-only rows
 *   .filter(b => betby_brand_id ? true : !BLOCKED)    drop the five sports rows with no book
 *   .map(b => mobileBannerUrl ||= whiteMobileBannerUrl, and the reverse)
 *
 * The first and third are no-ops against the captured payload (`isBg` is false on all three
 * rows and every mobile url is empty, so the fallback resolves both to ""), and the second is
 * inert on this deploy, which does carry a `betby_brand_id` — the sports book is live, which
 * is exactly why the Soccer Party row is in the response at all. They are written out anyway
 * so the shape of the real call is on the record; strip them only when a live feed proves them
 * unnecessary, not because today's fixture happens not to exercise them.
 *
 * BLOCKED is `M` in the chunk, verbatim.
 */
const BLOCKED_WITHOUT_SPORTSBOOK = [1860, 1871, 1861, 1862, 1863];

const normalise = (rows, hasSportsbook) =>
  rows
    .filter((row) => !row.isBg)
    .filter((row) => hasSportsbook || !BLOCKED_WITHOUT_SPORTSBOOK.includes(row.bannerId));

/* ── THE PLATFORM'S OWN BANNERS, AND WHAT THEY CAN ACTUALLY REPLACE ─────────────────────────
 *
 * `GET /admin/banners` is public and answers `{total, rows}` where a row is an image and a
 * unique `type` — no title, no description, no link, no tag, no sort. The whole `banners` table
 * is ten columns and none of them is text. So a platform banner can only say WHICH ARTWORK a
 * slide shows; every word on the card, and where it goes when clicked, has nowhere to come from
 * but the capture in `banners.js`.
 *
 * This therefore OVERRIDES ART ON A KNOWN SLIDE rather than building slides out of the
 * response. A row whose `type` is `home_top_<n>` replaces the artwork of the nth slide, 1-based,
 * in the order `banners.js` lists them. That naming is THIS BUILD'S CONVENTION and not the
 * platform's: `type` is validated as `/^[a-z0-9][a-z0-9_-]{0,63}$/` and carries no meaning
 * server-side, and the table was empty when this was written, so there was no established
 * placement name to match. An operator uploading `home_top_2` changes the second card's
 * picture; a row naming anything else is ignored rather than guessed at.
 *
 * EVERY FAILURE PATH LANDS ON THE CAPTURED SLIDES, which is the point: no rows, all rows
 * inactive, a 500, a refused fetch, or fixtures mode all render exactly what this build
 * rendered before the platform was asked. The read cannot make the hero worse than not making
 * it — and the component's own `rows.length < 3` padding is still behind that.
 *
 * The image is a CSS `url()` on the gateway, so it needs `API_BASE` in front of the row's own
 * relative `url` and does NOT go through `request()`. `imageUrl` is the field the card prefers
 * over its `artFor(image)` glob lookup.
 */
const PLACEMENT_PREFIX = 'home_top_';

const withPlatformArt = (slides, answer) => {
  const rows = Array.isArray(answer) ? answer : (answer?.rows ?? []);
  const live = new Map(
    rows
      .filter((row) => row?.type && row.active !== false)
      .map((row) => [row.type, row]),
  );
  if (live.size === 0) return slides;

  return slides.map((slide, index) => {
    const row = live.get(`${PLACEMENT_PREFIX}${index + 1}`);
    if (!row) return slide;
    const path = row.url ?? PLATFORM.site.bannerImage(row.type);
    return { ...slide, imageUrl: `${API_BASE}${path}` };
  });
};

export const getHomeBanners = ({
  bannerType = 'top',
  areaCode = 'US',
  uid = 0,
  level = 0,
  vip = false,
  hasSportsbook = true,
} = {}) => {
  const slides = normalise(TOP_BANNERS, hasSportsbook);

  if (!USE_FIXTURES) {
    return Promise.resolve(request(PLATFORM.site.banners, { live: true, fixture: null }))
      .then((answer) => withPlatformArt(slides, answer))
      .catch(() => slides);
  }

  return request(ENDPOINTS.homeMainBanner({ bannerType, areaCode, uid, level, vip }), {
    fixture: slides,
  });
};

/* Not a call — the chunk's own hardcoded trio, exported through here so a component never
   reaches into a fixture directly. See banners.js for why it does not render today. */
export const getFallbackBanners = () => FALLBACK_BANNERS;

export default getHomeBanners;
