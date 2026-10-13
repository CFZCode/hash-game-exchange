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

/* ── THE PLATFORM'S OWN BANNERS ─────────────────────────────────────────────────────────────
 *
 * `GET /admin/banners` is public and answers the rows as `data`; a row is an image under a unique
 * `type` plus the optional slide copy (title, subtitle, cta, sortOrder). `home_top_<n>` is THIS
 * BUILD'S placement name for a hero slide. The image is a CSS `url()` on the gateway, so it needs
 * `API_BASE` in front and does not go through `request()`. */
const PLACEMENT_PREFIX = 'home_top_';

/* LIVE MODE BUILDS THE STRIP FROM THE PLATFORM'S ROWS ONLY. The captured slides in `banners.js`
 * are bc.game's own campaigns (Soaked by Sea Men, €20/€10 free spins, Knockoin, a $500 soccer
 * freebet) — another brand's marketing in another currency — so they must never reach Parker567's
 * players. A `home_top_<n>` row is one slide: its image, plus the copy migration 037 added
 * (`title`, `subtitle`, `cta`). No rows, a 500 or a refused fetch is an EMPTY strip, and the
 * carousel then renders nothing (Banner's `if (!count) return null`). Fixture mode keeps the
 * capture, which is the pixel reference. */
const platformSlides = (answer) => {
  const rows = Array.isArray(answer) ? answer : (answer?.rows ?? []);
  return rows
    .filter((row) => typeof row?.type === 'string' && row.type.startsWith(PLACEMENT_PREFIX) && row.active !== false)
    .sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0) || x.type.localeCompare(y.type, undefined, { numeric: true }))
    .map((row) => ({
      bannerId: row.type,
      tagName: '',
      title: row.title ?? '',
      description: row.subtitle ?? '',
      buttonContent: row.cta?.label ?? '',
      linkUrl: row.cta?.href ?? '',
      imageUrl: `${API_BASE}${row.url ?? PLATFORM.site.bannerImage(row.type)}`,
    }));
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
      .then(platformSlides)
      .catch(() => []);
  }

  return request(ENDPOINTS.homeMainBanner({ bannerType, areaCode, uid, level, vip }), {
    fixture: slides,
  });
};

/* Not a call — the chunk's own hardcoded trio, exported through here so a component never
   reaches into a fixture directly. See banners.js for why it does not render today. */
export const getFallbackBanners = () => FALLBACK_BANNERS;

export default getHomeBanners;
