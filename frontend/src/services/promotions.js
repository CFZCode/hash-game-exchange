import { request, API_BASE, USE_FIXTURES } from './client';
import { publicGates } from './gates';
import ENDPOINTS from './endpoints';
import { PROMOTIONS, TABS, TABS_H5, SPORTS_TAB, PAGE_SIZE } from '../pages/Promotions/promotions';

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
 * entries cut to the ones the platform can answer — All and Casino (`segment=casino`) — plus
 * Sports (`segment=sports`), which bc.game's strip does not have and is this build's, on request
 * (2026-10-16). It has no Deposit or Exclusive category.
 *
 * Each card opens `/promotion/:segment/:slug` (bc.game's own family is `/promotion/:id`; the
 * segment is in the path because the platform's slug is unique per segment, not globally). */
const ENDPOINTS_LIVE = {
  promotions: '/api/v1/admin/promotions',
  bySlug: (segment, slug) =>
    `/api/v1/admin/promotions/slug/${encodeURIComponent(segment)}/${encodeURIComponent(slug)}`,
};

const LIVE_TABS = [...TABS.filter((t) => t.id === 'all' || t.id === 'casino'), SPORTS_TAB];
const LIVE_SEGMENTS = new Set(['casino', 'sports']);

/** The detail page's path for a promotion — one place, so the card and anything else agree. */
export const promotionHref = (segment, slug) =>
  segment && slug ? `/promotion/${encodeURIComponent(segment)}/${encodeURIComponent(slug)}` : undefined;

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
    segment: row.segment ?? '',
    slug: row.slug ?? '',
    href: promotionHref(row.segment, row.slug),
  };
}

export const isEnded = (row, now = Date.now()) =>
  row.promoStatus === 'ended' || (row.endsAt ? new Date(row.endsAt).getTime() < now : false);

function livePromotions({ page, tab, archived }) {
  const now = Date.now();
  return Promise.all([
    request(ENDPOINTS_LIVE.promotions, {
      live: true,
      params: { page: 1, limit: 100, ...(LIVE_SEGMENTS.has(tab) ? { segment: tab } : null) },
    }),
    publicGates(),
  ]).then(([rows, gates]) => {
    // A casino / sports offer goes with its section when the owner or Super Admin switches it off.
    const matching = (rows ?? []).filter(
      (row) => isEnded(row, now) === Boolean(archived) && gates.routeOn(promotionHref(row.segment, row.slug)),
    );
    const start = (page - 1) * PAGE_SIZE;
    return {
      tabs: LIVE_TABS.filter((t) => !LIVE_SEGMENTS.has(t.id) || gates.routeOn(`/promotion/${t.id}`)),
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
      promotions: matching.slice(start, start + PAGE_SIZE).map(withFixtureHref),
      page,
      pageSize: PAGE_SIZE,
      total: matching.length,
    },
  });
};

/* ── ONE PROMOTION — `/promotion/:segment/:slug` ───────────────────────────────────────────────
 *
 * `GET /admin/promotions/slug/:segment/:slug` is public like the list and answers the full row:
 * `{…the list's fields, description (HTML), termsHtml, imageAlt, viewAllHref, qualifyingGames[]
 * {href,name,img,color?,indicator?}, sportEvents[] {label,href,icon?,sportAlt?}, tags[],
 * leaderboard, tournamentPanel}`. A miss is `404 PROMOTIONS_NOT_FOUND`, which resolves to `null`
 * here so the page draws its not-found state instead of throwing; anything else re-throws.
 *
 * `imageUrl` and a game's `img` come back RELATIVE to the gateway (`/api/v1/…`), so they are made
 * absolute against API_BASE the way the list's card art is. */
const absolute = (url) => (url && url.startsWith('/') && !url.startsWith('//') ? `${API_BASE}${url}` : url || undefined);

/** Exported for the verification script. */
export function toPromotionDetail(row) {
  return {
    id: String(row.id),
    segment: row.segment ?? '',
    slug: row.slug ?? '',
    title: row.title ?? '',
    summary: row.summary ?? '',
    description: row.description ?? '',
    termsHtml: row.termsHtml ?? null,
    image: row.image,
    imageUrl: absolute(row.imageUrl),
    imageAlt: row.imageAlt ?? '',
    endsAt: row.endsAt ?? null,
    promoStatus: row.promoStatus ?? 'live',
    viewAllHref: row.viewAllHref ?? null,
    // No image (an Original game): the tile draws this site's own art for the /game/<slug>.
    qualifyingGames: (row.qualifyingGames ?? []).map((game) => ({
      ...game,
      img: absolute(game.img),
      slug: game.img ? undefined : /^\/game\/([^/?#]+)/.exec(game.href ?? '')?.[1],
    })),
    sportEvents: (row.sportEvents ?? []).map((event) => ({ ...event, icon: absolute(event.icon) })),
    tags: row.tags ?? [],
    leaderboard: row.leaderboard ?? null,
    tournamentPanel: row.tournamentPanel ?? null,
  };
}

/* THE FIXTURE BUILD'S SEGMENT AND DETAIL. bc.game's cards carry no segment — `categories` is its
   tab membership — so a fixture card files under `casino` unless it is the one sports campaign
   in the capture. The detail below is ASSEMBLED, not captured: the card's own strings, a summary
   paragraph made of them, and six BC Originals that already have local art. Nothing here reaches
   a live build. */
const FIXTURE_SPORTS = new Set(['soccer-party-bet-and-win']);
const fixtureSegment = (promo) => (FIXTURE_SPORTS.has(promo.id) ? 'sports' : 'casino');

function withFixtureHref(promo) {
  const segment = fixtureSegment(promo);
  return { ...promo, segment, slug: promo.id, href: promotionHref(segment, promo.id) };
}

const FIXTURE_GAMES = [
  ['crash', 'Crash'],
  ['limbo', 'Limbo'],
  ['keno', 'Keno'],
  ['hilo', 'Hilo'],
  ['tower-legend', 'Tower Legend'],
  ['classic-dice', 'Classic Dice'],
];

function fixtureDetail(segment, slug) {
  const promo = PROMOTIONS.find((p) => p.id === slug && fixtureSegment(p) === segment);
  if (!promo) return null;
  const sports = segment === 'sports';
  return toPromotionDetail({
    id: promo.id,
    segment,
    slug: promo.id,
    title: promo.title,
    summary: promo.description,
    description: `<h2>${promo.headline}</h2><p>${promo.description}</p>`,
    termsHtml:
      '<ol><li>The promotion is open to every verified account.</li>' +
      '<li>Only settled bets count towards the promotion.</li>' +
      '<li>The operator may amend or end the promotion at any time.</li></ol>',
    image: promo.image,
    imageUrl: null,
    endsAt: null,
    promoStatus: 'live',
    qualifyingGames: sports
      ? []
      : FIXTURE_GAMES.map(([gameSlug, name]) => ({ href: `/game/${gameSlug}`, name, slug: gameSlug })),
    sportEvents: sports ? [{ label: 'Soccer', href: '/sports', sportAlt: 'Soccer' }] : [],
  });
}

export const getPromotionBySlug = (segment, slug) => {
  if (!USE_FIXTURES) {
    return request(ENDPOINTS_LIVE.bySlug(segment, slug), { live: true }).then(
      (row) => (row ? toPromotionDetail(row) : null),
      (error) => {
        if ([400, 404, 422].includes(error?.status)) return null;
        throw error;
      },
    );
  }
  return request(ENDPOINTS.promotions, { params: { segment, slug }, fixture: fixtureDetail(segment, slug) });
};
