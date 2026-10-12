import { request, API_BASE, USE_FIXTURES } from './client';
import ENDPOINTS from './endpoints';
import { PROMOTIONS, TABS, TABS_H5, PAGE_SIZE } from '../pages/Promotions/promotions';

/* The promotions list.
 *
 * `ENDPOINTS.promotions` is a PLACEHOLDER — no promotions request was captured, so the path is
 * shaped like its neighbours and grouped in endpoints.js under a heading that says so. The
 * payload below, on the other hand, is transcribed from the rendered page and is exact.
 *
 * Paged here rather than in the component, so the page keeps working unchanged when a real
 * backend does the paging. The tab is passed through as a parameter for the same reason: today
 * it filters an array, tomorrow it is a query string, and the call site does not care which.
 */
/* ── LIVE: THE PLATFORM'S PROMOTIONS ──────────────────────────────────────────────────────────
 *
 * `GET /admin/promotions` is PUBLIC despite the prefix (it is the admin service's public
 * audience) and lists published campaigns: `{id, segment: casino|sports, slug, title, summary,
 * promoStatus: live|ended, endsAt, publishedAt, imageUrl}`. The validator is strict —
 * `page`, `limit`, `segment`, `search` only — so the tab and the archived flag are applied here,
 * over one page of up to 100, and the 9-a-page paging is this build's own as it is today.
 *
 * Onto the card's fields:
 *   headline     <- title        the big line; the platform has one title and no headline
 *   title        <- segment      the small uppercase line ("CASINO" / "SPORTS")
 *   description  <- summary
 *   imageUrl     <- the gateway's image route, absolute; `image` stays undefined so the card's
 *                   art map misses and falls back to it
 *   endsLabel    <- endsAt as "Aug 21" (UTC), empty when the campaign has no end
 *   progress     <- the share of publishedAt..endsAt already elapsed, 0 with no end
 *
 * Archived is `promoStatus: "ended"` or an `endsAt` in the past. The tabs are the fixture's own
 * entries cut to the two the platform can answer — All, and Casino (`segment=casino`); it has
 * no Deposit or Exclusive category. */
const ENDPOINTS_LIVE = { promotions: '/api/v1/admin/promotions' };

const LIVE_TABS = TABS.filter((t) => t.id === 'all' || t.id === 'casino');

const endsLabel = (instant) =>
  instant
    ? new Date(instant).toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })
    : '';

function elapsed(from, to, now) {
  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (!from || !to || !(end > start)) return 0;
  return Math.round(Math.min(1, Math.max(0, (now - start) / (end - start))) * 100);
}

/** Exported for the verification script. */
export function toPromotionCard(row, now = Date.now()) {
  return {
    id: String(row.id),
    headline: row.title ?? '',
    title: row.segment ?? '',
    description: row.summary ?? '',
    image: undefined,
    imageUrl: row.imageUrl ? `${API_BASE}${row.imageUrl}` : undefined,
    endsLabel: endsLabel(row.endsAt),
    progress: elapsed(row.publishedAt ?? row.createdAt, row.endsAt, now),
    categories: row.segment ? [row.segment] : [],
  };
}

export const isEnded = (row, now = Date.now()) =>
  row.promoStatus === 'ended' || (row.endsAt ? new Date(row.endsAt).getTime() < now : false);

function livePromotions({ page, tab, archived }) {
  const now = Date.now();
  return request(ENDPOINTS_LIVE.promotions, {
    live: true,
    params: { page: 1, limit: 100, ...(tab === 'casino' ? { segment: 'casino' } : null) },
  }).then((rows) => {
    const matching = (rows ?? []).filter((row) => isEnded(row, now) === Boolean(archived));
    const start = (page - 1) * PAGE_SIZE;
    return {
      tabs: LIVE_TABS,
      promotions: matching.slice(start, start + PAGE_SIZE).map((row) => toPromotionCard(row, now)),
      page,
      pageSize: PAGE_SIZE,
      total: matching.length,
    };
  });
}

export const getPromotions = ({ page = 1, tab = 'all', env = 'WEB', archived = false } = {}) => {
  if (!USE_FIXTURES) return livePromotions({ page, tab, archived });

  /* `env` AND `archived` ARE THE REQUEST'S OWN FIELDS, not this build's parameters — the page
     chunk posts `{areaCode, env: isAPP ? "APP" : mobile ? "H5" : "WEB", level, vip, lang,
     archived, page, pageSize}`. `env` is what makes the phone's tab strip three entries and the
     desktop's four (see TABS_H5), and `archived` is the whole of what the Archived button does:
     the same list, the same endpoint, one flag flipped.

     NOTHING IS CAPTURED BEHIND `archived: true` and the endpoint answers 403 to everyone, so the
     archived list is empty and the popup renders the site's own empty state. That is the
     Transaction pane's finding again — being locked out is the correct rendering — rather than a
     stub, and it is why the button is wired to real data instead of being left inert. */
  const source = archived ? [] : PROMOTIONS;
  const matching = tab === 'all' ? source : source.filter((p) => p.categories.includes(tab));
  const start = (page - 1) * PAGE_SIZE;

  return request(ENDPOINTS.promotions, {
    params: { page, tab, env, archived },
    fixture: {
      tabs: env === 'H5' ? TABS_H5 : TABS,
      promotions: matching.slice(start, start + PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      total: matching.length,
    },
  });
};
