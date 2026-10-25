import { request, API_BASE, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { TOP_BANNERS, FALLBACK_BANNERS } from '../pages/Home/Hero/banners';
import { underAgentBase } from './agentBase';

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
/* The site admin's Banners page names slides `slider-1` … `slider-6` (admin/src/views/content/
   Banners.tsx); `home_top_<n>` is this build's older name. Both are slides, so an upload from the
   admin reaches the strip whichever it used. */
const SLIDE_PLACEMENT = /^(slider-|home_top_)\d+$/;
/* Agent mode (/agent) has its own slides, `agent-slider-<n>` in the site admin: game banners into
   the casino and sports, never a promotion (user, 2026-10-25). */
const AGENT_SLIDE_PLACEMENT = /^agent-slider-\d+$/;
/* Until the admin uploads agent slides, the four banners from the user's Figma (public/brand/agent),
   with game copy rather than offers. */
const AGENT_DEFAULT_SLIDES = [
  ['1', '/sports', 'Sports', 'Cricket, football & more', 'Live odds on every match', 'Bet now'],
  ['2', '/casino', 'Casino', 'Crash games', 'Cash out in time', 'Play now'],
  ['3', '/sports', 'Sports', 'Back your team', 'Back or lay, in-play', 'Bet now'],
  ['4', '/casino', 'Casino', 'Slots & live casino', 'Thousands of games', 'Play now'],
].map(([n, linkUrl, tagName, title, description, buttonContent]) => ({
  bannerId: `agent-slider-${n}`,
  tagName,
  title,
  description,
  buttonContent,
  linkUrl,
  imageUrl: `/brand/agent/slide-${n}.webp`,
}));

/* LIVE MODE BUILDS THE STRIP FROM THE PLATFORM'S ROWS ONLY. The captured slides in `banners.js`
 * are bc.game's own campaigns (Soaked by Sea Men, €20/€10 free spins, Knockoin, a $500 soccer
 * freebet) — another brand's marketing in another currency — so they must never reach Parker567's
 * players. A `home_top_<n>` row is one slide: its image, plus the copy migration 037 added
 * (`title`, `subtitle`, `cta`). No rows, a 500 or a refused fetch is an EMPTY strip, and the
 * carousel then renders nothing (Banner's `if (!count) return null`). Fixture mode keeps the
 * capture, which is the pixel reference. */
const platformSlides = (answer, placement = SLIDE_PLACEMENT) => {
  const rows = Array.isArray(answer) ? answer : (answer?.rows ?? []);
  return rows
    .filter((row) => typeof row?.type === 'string' && placement.test(row.type) && row.active !== false)
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
    const agent = underAgentBase();
    // Agent mode asks the backend for its own placements; the site keeps the plain list (and filters).
    return Promise.resolve(request(agent ? `${PLATFORM.site.banners}?mode=agent` : PLATFORM.site.banners, { live: true, fixture: null }))
      .then((answer) => {
        const rows = platformSlides(answer, agent ? AGENT_SLIDE_PLACEMENT : SLIDE_PLACEMENT);
        return agent && !rows.length ? AGENT_DEFAULT_SLIDES : rows;
      })
      .catch(() => (agent ? AGENT_DEFAULT_SLIDES : []));
  }

  return request(ENDPOINTS.homeMainBanner({ bannerType, areaCode, uid, level, vip }), {
    fixture: slides,
  });
};

/* THE SIGNED-OUT HERO'S ARTWORK, from the site admin's Banners (user's request, 2026-10-16):
 * placement `home` (the admin's "Home · hero banner") is the desktop art, `home_mobile` the phone
 * art (falls back to the desktop one). Same rows and image route as the slides above; `null` with fixtures on, with no
 * row, or on a failed read — the hero then keeps the owner's mark. */
export const SIGNUP_HERO_PLACEMENTS = { desktop: 'home', mobile: 'home_mobile' };

export const getSignupHeroArt = () => {
  if (USE_FIXTURES) return null;
  return Promise.resolve(request(PLATFORM.site.banners, { live: true, fixture: null }))
    .then((answer) => {
      const rows = Array.isArray(answer) ? answer : (answer?.rows ?? []);
      const url = (type) => {
        const row = rows.find((r) => r?.type === type && r.active !== false);
        return row ? `${API_BASE}${row.url ?? PLATFORM.site.bannerImage(row.type)}` : null;
      };
      const desktop = url(SIGNUP_HERO_PLACEMENTS.desktop);
      const mobile = url(SIGNUP_HERO_PLACEMENTS.mobile) ?? desktop;
      return desktop || mobile ? { desktop: desktop ?? mobile, mobile } : null;
    })
    .catch(() => null);
};

/* Not a call — the chunk's own hardcoded trio, exported through here so a component never
   reaches into a fixture directly. See banners.js for why it does not render today. */
export const getFallbackBanners = () => FALLBACK_BANNERS;

export default getHomeBanners;
