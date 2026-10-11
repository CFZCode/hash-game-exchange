import { request } from './client';
import ENDPOINTS from './endpoints';
import {
  RAIL_ACTIONS,
  RAIL_SPORTS,
  EXPANDED_TABS,
  EXPANDED_SPORTS,
  LOBBY_TABS,
  FEATURED,
  BETS_FEED,
  SPORT_FILTERS,
  EVENTS,
  TOTAL_EVENTS,
  PAGE_SIZE,
} from '../pages/Sports/lobby';

/* The sportsbook's data.
 *
 * This is the domain most obviously destined for the API, and the one where the eventual swap
 * is least like a swap: none of these responses were ever captured, so every fixture here is a
 * reconstruction rather than a replayed payload. The paths are BetBy's own, read out of
 * `Com-8gtZ7Cmm.js`, but the SHAPES below are this project's — see CLAUDE.md. Expect to reshape
 * the fixtures when the real responses arrive, not just to delete them.
 *
 * `brand` is `betByBrand.brandFlag` from the one sports response that WAS captured
 * (`platform-sports/v14/home/sport/provider/support/`), so `getSportProviders` is the single
 * call here whose response shape is known.
 */
const BRAND = '2103509236163162112';

export const getSportProviders = () =>
  request(ENDPOINTS.sportProviders, {
    fixture: {
      sportProviders: [
        { name: 'betby', betByBrand: { brandFlag: BRAND }, btiBrand: null, bzBrand: null },
      ],
    },
  });

/* The rail and the panel behind its overflow arrow. One call, because they are one navbar on
   the live widget — the panel is the same list with counts and labels attached. */
export const getSportsNav = ({ brand = BRAND, lang = 'en' } = {}) =>
  request(ENDPOINTS.betby.feed('navbar', brand, lang, ''), {
    fixture: {
      actions: RAIL_ACTIONS,
      sports: RAIL_SPORTS,
      expandedTabs: EXPANDED_TABS,
      expandedSports: EXPANDED_SPORTS,
    },
  });

export const getLobbyTabs = () => request(ENDPOINTS.betby.promoWidget(BRAND, 'en'), {
  fixture: LOBBY_TABS,
});

/* ── THE PROMO SLOT IS EMPTY, WHICH IS WHAT THE LIVE LOBBY SHOWS ──────────────────────────────
 *
 * `FEATURED` is a real capture and is kept in `lobby.js` untouched — but it is a promo CAMPAIGN,
 * not furniture. BetBy serves this slot from `/api/v2/promo/banners/brand/{brand}/{lang}`, so
 * when no campaign is running there is simply no banner, and the bets feed follows the tabs
 * directly.
 *
 * That is what the live desktop lobby does now, in four captures across two days at 1280 (twice),
 * 1440 and 1600: the tab row ends and the feed cards begin about 36px later, with nothing
 * between them. Ours was rendering the captured campaign as though it were permanent — a
 * full-width 274px band that pushed the whole lobby down relative to the original.
 *
 * The phone is not an argument for keeping it either: the live mobile lobby currently shows a
 * DIFFERENT promo in that slot (a circular Play Tracker badge), not this tennis banner, so
 * showing the expired campaign there would be just as wrong.
 *
 * `FeaturedBanner` already returns null when there is no slide, so nothing else changes and no
 * layout rule had to move. Flip the flag to bring the captured campaign back — that is the whole
 * of what a running promo would do. */
const SHOW_FEATURED_PROMO = false;

export const getFeatured = ({ brand = BRAND, lang = 'en' } = {}) =>
  request(ENDPOINTS.betby.promoBanners(brand, lang), {
    fixture: SHOW_FEATURED_PROMO ? FEATURED : { slides: [], activeIndex: 0 },
  });

export const getBetsFeed = ({ brand = BRAND, lang = 'en' } = {}) =>
  request(ENDPOINTS.betby.feed('bets', brand, lang, ''), { fixture: BETS_FEED });

export const getSportFilters = () =>
  request(ENDPOINTS.betby.feed('sports', BRAND, 'en', ''), { fixture: SPORT_FILTERS });

/* Paged. The fixture only has page one — the pager's own readout says "1 - 12 of 15" — so
   anything past it comes back empty rather than repeating page one. */
export const getLobbyEvents = ({ page = 1, brand = BRAND, lang = 'en' } = {}) =>
  request(ENDPOINTS.betby.feed('events', brand, lang, `page/${page}`), {
    fixture: {
      events: page === 1 ? EVENTS : [],
      page,
      pageSize: PAGE_SIZE,
      total: TOTAL_EVENTS,
    },
    params: { page },
  });

/* ── PLACING A BET ────────────────────────────────────────────────────────────────────────────
 *
 * The one WRITE on this page, and it goes through the seam like every read: `request()` with a
 * fixture. What that buys is the behaviour a real placement has — the button goes pending for the
 * fixture delay and the slip then shows a receipt — with nothing invented about the SHAPE of that
 * receipt beyond what the slip already prints (stake, odds, potential win, the legs). The id is
 * a timestamp, which is what it will be replaced by rather than a number pretending to be one.
 *
 * There is nothing behind it: BetBy's placement call was never captured, and the iBitPlay
 * platform this build is wired to has a cricket exchange whose service cannot boot (see
 * `docs/backend-gaps.md`). So with fixtures ON this resolves to the receipt after the delay, and
 * with them OFF it would POST to the placeholder path and 404 — which is the correct thing for an
 * action with no backend to do, and is why the path is marked as a placeholder. */
export const placeBet = ({ selections = [], stake = 0 } = {}) => {
  const totalOdds = selections.reduce((product, pick) => product * Number(pick.value || 0), 1);
  const receipt = {
    id: `B${Date.now().toString(36).toUpperCase()}`,
    placedAt: Date.now(),
    stake: Number(stake),
    totalOdds,
    potentialWin: Number(stake) * totalOdds,
    legs: selections.map(({ id, team, outcome, market, event, value }) => ({
      id, team: team ?? outcome, market, event, value,
    })),
  };
  return request(ENDPOINTS.betby.placeBet, {
    method: 'POST',
    body: JSON.stringify({ stake, selections: selections.map((pick) => pick.id) }),
    fixture: receipt,
  });
};
