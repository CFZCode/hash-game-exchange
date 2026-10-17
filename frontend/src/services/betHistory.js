import { requestPage } from './client';
import { PLATFORM } from './endpoints';
import { isFiatCode } from '../utils/currency';

/* `/wallet/bet-history` — the last of the nine wallet panes. `_` in `index-D5N4LJZ-.js` is its
 * whole request module: two paths, and the split between them is the interesting part.
 *
 * TWO ENDPOINTS FOR ONE LIST, AND IT IS CURSOR PAGING RATHER THAN A SECOND FEED. Page 1 goes to
 * `bet-history-first/` with the filters; every page after it goes to `bet-history/` with the same
 * filters PLUS `minDistributeId`, which the previous response handed back. So the list is keyed on
 * a cursor, not an offset — a bet placed while you are reading page 3 cannot shift page 4 under
 * you, which an offset would.
 *
 * BOTH ANSWER 403 with `{"msg":"Request 403 error.","code":4001}` — and that is a different 403
 * from the transaction pane's, which returns a Spring error page. This one is bc.game's own
 * envelope with an application code, so it is a deliberate rejection rather than a gateway one.
 * Either way the list is empty and the pane renders the site's own empty state, which is the
 * capture. Nothing here is invented.
 *
 * The row fields are the renderer's own accesses: `type`, `time`, `payout`, `profit`,
 * `currencyName`, `distributeId`, plus `minDistributeId` on the envelope. `resList` rather than
 * `list` — the one wallet feed that does not use the shared name.
 */

const EMPTY_PAGE = { resList: [], minDistributeId: undefined };

/* The pane's own page size, and the platform's `limit` cap is 100 so it is well inside. */
const PAGE_SIZE = 20;

/* `r.getFirstPage` / `r.getNextPage`. `resList` is defaulted to `[]` by the module itself, which is
 * why the fixture carries the key rather than leaving it undefined.
 *
 * ── CURSOR PAGING MEETS OFFSET PAGING, AND THE CURSOR STAYS ───────────────────────────────
 *
 * bc.game pages by cursor: page 1 goes to `bet-history-first/` and every page after it carries the
 * `minDistributeId` the previous response handed back. The platform pages by `page`/`limit`. The
 * COMPONENT is written against the cursor and is left alone — it keeps threading `minDistributeId`
 * through, and this function keeps answering with one, because a cursor a caller never has to
 * understand costs nothing and the day a real cursor endpoint is behind this the call site is
 * already correct.
 *
 * Under the platform the cursor is simply not consulted: `page` is what is sent. The value handed
 * back is the last row's `distributeId`, which is what the component stores and passes on, so the
 * contract holds even though only one side of it is load-bearing.
 *
 * ── TWO FILTERS REACH THE SERVER AND ONE DOES NOT ─────────────────────────────────────────
 *
 *   time      → `from`/`to`, as ISO strings. THIS ONE WORKS, unlike the transaction pane's, because
 *               bet-history takes a window where the wallet ledger takes none.
 *   currency  → the platform's listing has no currency parameter; the four sources it merges are
 *               keyed by game rather than by coin. Not sent.
 *   type      → its axis is `source` (which aggregator), where this filter's values are bc.game's
 *               game CATEGORIES, 1..8 with a gap at 2. Different question. Not sent.
 */
/* ── THE ROW ADAPTER, AND WHY THE PANE WAS EMPTY WITHOUT IT ───────────────────────────────────
 *
 * The pane reads bc.game's own field names — `type`, `time`, `payout`, `profit`, `currencyName`
 * and `distributeId` — and the platform answers with `transaction_timestamp`, `amount`,
 * `currency_code`, `game_title` and `id`. Only `profit` is spelled the same in both.
 *
 * That was invisible for as long as the feed was empty, and it does NOT surface as a row of
 * blanks: `truncateBetPage` drops any row with no `time`, so every live bet was filtered out and
 * the pane rendered its empty state exactly as it does with no bets at all. Found by placing four
 * real in-house bets against the running platform rather than by reading the code.
 *
 * Four of the six need a decision:
 *
 *   `time`     the pane does `new Date(Number(item.time))`, so it wants epoch MILLISECONDS where
 *              the platform sends ISO-8601. `Date.parse` rather than `new Date(...).getTime()`
 *              because an unparseable value gives NaN either way and `truncateBetPage`'s own
 *              `!!row.time` then correctly drops the row.
 *
 *   `payout`   bc.game stores it as the multiplier × 10 000 (the pane divides by 1e4 and appends
 *              an "x"), and the platform sends a stake and a profit. The multiplier is therefore
 *              `(stake + profit) / stake` — which is 0 for a total loss, since `profit` is `-stake`
 *              there. That matches bc.game's own convention exactly: every losing row in the
 *              captured Latest Bets feed carries `payout: 0`, and a 50-stake bet returning 80
 *              carries 160.
 *
 *   `type`     the pane prints this string in a column headed "Type". On bc.game it is the game
 *              CATEGORY (Original, Live, Slots — the same 1..8 axis the filter uses); the platform
 *              has no such axis, and its nearest honest answer is which game was played. So the
 *              game's own title is printed, which is the same choice the filter note above
 *              records for the other direction — a category filter that cannot be sent because the
 *              platform's axis is `source`.
 *
 *   `currencyName`  bare code to this build's wallet key, `INR` → `INRFIAT`, the same one-line
 *              conversion `services/transaction.js` and `services/auth.js` each make.
 *
 * `distributeId` prefers `transaction_id`, which identifies the ROUND and is what a game-detail
 * link would want; `id` is the merge's own row number and is the fallback. Neither reaches a page
 * that exists — `/game-detail/:id` is not a route here — so this only has to be stable and unique
 * enough to key a list.
 */
const GAME_LABEL = (value) =>
  String(value ?? '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

export function toBetRow(row) {
  /* Already in this build's shape — the fixture arm, and any future cursor endpoint that answers
     bc.game's own fields. Left alone rather than re-derived. */
  if (row && row.time !== undefined && row.currencyName !== undefined) return row;

  const stake = Number(row.amount ?? 0);
  const profit = Number(row.profit ?? 0);
  /* UPPERCASED FIRST. `isFiatCode` uppercases for its own lookup but the KEY is built from what is
     passed, and the two feeds disagree on case: bet history sends `INR`, the public live feed
     sends `inr`. Without this the second becomes `inrFIAT`, which matches no coin, no icon and no
     wallet row. */
  const code = String(row.currency_code ?? row.currency ?? '').toUpperCase();

  /* TWO FEEDS, TWO SPELLINGS. The pane's own `GET /casino/bet-history` sends the merged row in
     full (`transaction_id`, `game_title`, `transaction_timestamp`); the public live ticker behind
     the home page sends a trimmed one (`reference`, `game`, `at`). Same three values, so both
     spellings are read here rather than in two adapters — `services/home.js` maps its rows
     through this one. */
  return {
    distributeId: String(row.transaction_id ?? row.round_id ?? row.reference ?? row.id ?? ''),
    type: GAME_LABEL(row.game_title ?? row.game_uid ?? row.game ?? row.source_key ?? ''),
    time: Date.parse(row.transaction_timestamp ?? row.created_at ?? row.at ?? '') || undefined,
    payout: stake > 0 ? Math.round(((stake + profit) / stake) * 1e4) : 0,
    profit: row.profit ?? '0',
    currencyName: code ? (isFiatCode(code) ? `${code}FIAT` : code) : '',
  };
}

/* ── The pane's filters ─────────────────────────────────────────────────────────────────────
 *
 * Type → `?category=original|live|slots` and Assets → `?currency=<code>` on the casino route
 * (casino bet-history `myHistory`; the rule for each category is `categoryOf` there). Sports is a
 * different service: Type = Sports is drawn by BetHistory/SportsBets from the exchange's own bets.
 *
 * AN OLDER BACKEND REFUSES THE TWO PARAMS — its validator is strict, so an unknown key is a 422,
 * not an ignored one. On that answer the read is repeated without them and the rows are filtered
 * here (`filterLocally`), and the fallback is remembered for the rest of the page's life so every
 * later read does not pay for a refused one first. */
const CATEGORY_OF_TYPE = { 1: 'original', 3: 'live', 5: 'slots' };
const SPORTS_TYPE = '4';
let serverFilters = true;

/* `INRFIAT` (this build's wallet key for a fiat coin) → `INR`; '' / 'all' → no filter. */
const bareCode = (assets) => {
  const code = String(assets ?? '').toUpperCase().replace(/FIAT$/, '');
  return code && code !== 'ALL' ? code : '';
};

/* The casino route's live providers and live types, mirrored for the old-backend fallback only
   (games.constants.js LIVE_PROVIDERS / LIVE_TYPES). The server's answer wins whenever it has one. */
const LIVE_VENDORS = ['evolution gaming', 'pragmaticplaylive', 'ezugi', 'sa gaming', 'iconic21', 'vivogaming', 'xprogaming', 'betgames'];
export function categoryOfRow(row) {
  if (row?.game_category) return row.game_category;
  const vendor = String(row?.game_vendor ?? '').trim().toLowerCase();
  if (row?.source_key === 'inhouse' || vendor === 'in-house') return 'original';
  return LIVE_VENDORS.includes(vendor) ? 'live' : 'slots';
}

function filterLocally(rows, { category, currency }) {
  return (rows ?? []).filter(
    (row) =>
      (!category || categoryOfRow(row) === category) &&
      (!currency || String(row.currency_code ?? row.currency ?? '').toUpperCase() === currency),
  );
}

/* A strict validator's refusal of a key it does not know. */
const isRefusedParam = (error) => error?.status === 422 || error?.status === 400 || error?.code === 'VALIDATION_ERROR';

/* `minDistributeId` is still PASSED by the pane and not destructured: the cursor is answered rather
   than consumed (see `toPage`). */
export function getBetHistory({ beginTime, endTime, page = 1, type = '', currencyName = '' }) {
  /* Sports is not a casino read: the pane draws the exchange's bets itself (BetHistory/SportsBets). */
  if (String(type) === SPORTS_TYPE) return Promise.resolve({ ...EMPTY_PAGE, totalPage: 0, first: true });

  const first = page === 1;
  const category = CATEGORY_OF_TYPE[type] ?? '';
  const currency = bareCode(currencyName);
  const filters = { category, currency };

  const read = (withFilters) =>
    requestPage(PLATFORM.casino.betHistory, {
      live: true,
      params: {
        page,
        limit: PAGE_SIZE,
        /* ISO-8601; the pane holds epoch ms. NOTE the player route is `myHistory`, which carries
           the window but NOT the `to >= from` refine — that guard is on the STAFF listing only, so
           an inverted range is accepted here and simply matches nothing. Checked against the
           running server rather than read off the schema, which is what made the difference. */
        from: beginTime ? new Date(Number(beginTime)).toISOString() : undefined,
        to: endTime ? new Date(Number(endTime)).toISOString() : undefined,
        ...(withFilters ? { category: category || undefined, currency: currency || undefined } : {}),
      },
      /* bc.game's own pair, recorded at `ENDPOINTS.betHistory.*` and both answering 403:
         `POST bet-history-first/` then `POST bet-history/` with
         `{beginTime, endTime, pageSize, currencyName, type, page, minDistributeId}`. */
      fixture: EMPTY_PAGE,
    });

  const toPage = ({ rows, pagination }, local) => {
    const resList = (local ? filterLocally(rows, filters) : rows ?? []).map(toBetRow);
    return {
      resList,
      /* The cursor the component will send back on the next page. Answered from the last row rather
         than left undefined, so the caller's own paging logic is exercised rather than bypassed.
         Read off the MAPPED row, since that is where `distributeId` exists. */
      minDistributeId: resList.length ? resList[resList.length - 1].distributeId : undefined,
      /* Carried so the pager has a total; bc.game's response has no such field and the component
         falls back to its own "did this page fill" test, which still works. */
      totalPage: pagination?.totalPages ?? 0,
      /* `first` is the arm the component chooses on; kept in the answer so a reader can tell which
         call produced it without recomputing from `page`. */
      first,
    };
  };

  const filtered = Boolean(category || currency);
  const useServer = filtered && serverFilters;
  const answer = read(useServer);

  /* BOTH ARMS GO THROUGH THE MAPPER. `requestPage` normalises its FIXTURE as well — it answers
     `{rows, pagination}` either way — so handing the fixture back untouched would give the pane
     `rows` where it reads `resList`, and an empty table with no error to explain it. Caught by the
     fixtures-on pass, which is what that pass exists for. */
  if (!answer || typeof answer.then !== 'function') return toPage(answer, filtered);
  return answer.then(
    (out) => toPage(out, filtered && !useServer),
    (error) => {
      if (!useServer || !isRefusedParam(error)) throw error;
      serverFilters = false;
      return read(false).then((out) => toPage(out, true));
    },
  );
}

/* `x` — the Type filter's options, with bc.game's values kept ("" then 1, 3, 4, 5; there never was
   a 2). Horse (6), Trading (7) and Lottery (8) are products this site does not run, so they are
   gone from the list (the hidden-features inventory); a stored "6"–"8" from an older visit falls
   back to All in the pane. */
export const BET_TYPE_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Original', value: '1' },
  { label: 'Live', value: '3' },
  { label: 'Sports', value: '4' },
  { label: 'Slots', value: '5' },
];

/* `y = () => [1, 3, 5].includes(Number(type))` — Original, Live and Slots. It gates TWO things at
   once: whether a row links to `/game-detail/<distributeId>` (the others get
   `pointer-events-none` on the same anchor rather than being rendered as a div) and whether the
   little arrow appears at the end of the Profit cell. A sports or lottery bet has no game detail
   to open, so the row stays an anchor and simply stops responding. */
export const linksToGameDetail = (type) => [1, 3, 5].includes(Number(type));

/* The list's own truncation, and it is the original's rather than a UI choice:
 *
 *   const rows = resList.filter(row => !!row.time)          // drop rows with no timestamp
 *   const more = page === 1 ? resList.length > 50 : resList.length > 500
 *   resList = page === 1 ? rows.slice(0, 50) : rows.slice(0, 500)
 *   noMore   = more ? Infinity : page
 *
 * So page one shows at most 50 and later pages at most 500, and OVERFLOWING THE CAP IS WHAT KEEPS
 * PAGING ALIVE — `Infinity` means "there is more", the current page number means "stop here". A
 * response that exactly fills the cap therefore ends the list, which is the original's own edge.
 * The `!!row.time` filter runs BEFORE the slice but the cap test runs on the UNFILTERED length,
 * so a page of 51 rows where two have no timestamp yields 49 rows and still reports more.
 */
export const PAGE_CAP_FIRST = 50;
export const PAGE_CAP_NEXT = 500;

export function truncateBetPage(resList, page) {
  const rows = resList.filter((row) => !!row.time);
  const cap = page === 1 ? PAGE_CAP_FIRST : PAGE_CAP_NEXT;
  return { rows: rows.slice(0, cap), hasMore: resList.length > cap };
}
