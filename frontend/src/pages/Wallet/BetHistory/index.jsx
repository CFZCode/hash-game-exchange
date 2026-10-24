import React from 'react';
import Select from '../../../components/shared/Select';
import Table, {
  HEAD,
  HEAD_CENTER,
  HEAD_END,
  CELL,
  CELL_CENTER,
  CellTime,
} from '../../../components/shared/Table';
import CurrencyAmount from '../../../components/shared/CurrencyAmount';
import EmptyPlaceholder from '../../../components/shared/EmptyPlaceholder';
import Pagination from '../../../components/shared/Pagination';
import { AssetsFilter, TimeFilter } from '../../../components/shared/WalletFilters';
import { useSession } from '../../../context/session';
import WalletFilterProvider from '../../../context/WalletFilterProvider';
import useResource from '../../../hooks/useResource';
import { useWalletFilter } from '../../../context/walletFilter';
import { defaultRange, resolveRange } from '../../../services/transaction';
import {
  getBetHistory,
  BET_TYPE_OPTIONS,
  linksToGameDetail,
} from '../../../services/betHistory';
import SportsBets, { SPORTS_SIDE_KEY, SPORTS_STATUS_KEY, SportsFilters } from './SportsBets.jsx';
import { filterRows, loadSportsHistory, toCasinoRow } from './sportsBets';

/* Type = Sports (value "4"): the exchange's bets, drawn by SportsBets instead of the casino table. */
const SPORTS_TYPE = '4';

/* `/wallet/bet-history` — the ninth and last wallet pane. `DialogBetHistory` resolves to
 * `index-D5N4LJZ-.js` (6.4 KB) and that one file is the whole page; every other module it needs is
 * one this project already has, which is what nine panes of extraction buys.
 *
 * ── ANOTHER EMPTY STATE, WITH A DIFFERENT FLAVOUR OF 403 ──────────────────────────────────────
 *
 * Both feeds answer `{"msg":"Request 403 error.","code":4001}` — bc.game's own envelope with an
 * application code, where the transaction pane's 403 is a Spring error page. Worth noting only
 * because it means the rejection is deliberate rather than a gateway rule. Either way the list is
 * empty and the pane renders the site's own "Stay tuned-something's coming!", which is the capture.
 *
 * ── THREE THINGS THE CHUNK SETTLES ────────────────────────────────────────────────────────────
 *
 * PAYOUT IS A MULTIPLIER STORED x10000. The cell is `payout / 1e4` with a literal "x" after it, so
 * a 2.5x bet arrives as 25000. Print it raw and every row reads as a jackpot.
 *
 * THE ROW IS ALWAYS AN ANCHOR, EVEN WHEN IT DOES NOT LINK. Only Original, Live and Slots (types
 * 1, 3, 5) have a `/game-detail/<distributeId>` to open; the rest keep the `<a>` and take
 * `pointer-events-none`. The same test also decides whether the little arrow shows at the end of
 * the Profit cell — so the arrow is the affordance, and its absence is the whole visual difference
 * between a live row and a dead one.
 *
 * THE TYPE FILTER SPANS TWO COLUMNS BELOW `sm` (`col-span-2 sm:col-auto`), which is the one filter
 * in any wallet pane that does. With three controls in a 2-column grid it would otherwise sit alone
 * on the second row; spanning puts it on its own first row and pairs the other two.
 *
 * ── NOT BUILT, each inert at its call site ────────────────────────────────────────────────────
 *
 *   the `center` slot   `U("ProviderBalanceList")` — a lazily-resolved component between the
 *                       filters and the table, listing unsettled balances held with game
 *                       providers. It needs `/platform-japarot/user-provider-balance-list/`, which
 *                       has no captured response (the currency dropdown's unsettled-bets banner is
 *                       blocked on the same feed). It renders nothing in the capture either.
 *   the pager           cursor paging off `minDistributeId`, with nothing to page. The caps and
 *                       their `hasMore` rule are ported in services/betHistory.js anyway, because
 *                       they are the kind of thing that is wrong for a long time before anyone
 *                       notices.
 *   `/game-detail/:id`  not a route in this build, so a linkable row falls through to the
 *                       catch-all. Left as the original's href rather than disabled, since the
 *                       path is right and only the page is missing.
 */

const STORAGE_KEY = 'wallet:bethistory-filter-v2';

const optionLabel = (option) => (
  <div className="ellipsis w-0 flex-auto text-left">{option.label}</div>
);

/* `le` — the Type filter. Eight options with a gap at 2; see the note in services/betHistory.js. */
function TypeFilter() {
  const { get, set } = useWalletFilter();
  const value = BET_TYPE_OPTIONS.find((o) => o.value === get('type')) ?? BET_TYPE_OPTIONS[0];

  return (
    <Select
      /* The one wallet filter that spans two grid columns on a narrow screen. */
      className="col-span-2 text-base sm:col-auto"
      title="Bet type"
      value={value}
      options={BET_TYPE_OPTIONS}
      onChange={(option) => set('type', option.value)}
    >
      {optionLabel}
    </Select>
  );
}

const COLUMNS = [
  ['Type', HEAD],
  ['Time', HEAD_CENTER],
  ['Payout', HEAD_CENTER],
  ['Profit', HEAD_END],
];

/* `P` — `a5` in the main bundle, the shared chevron. `rotate-180` points it right, which is the
   same closed-state rotation the Accordion documents. */
const ArrowIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

/* `de` — the list. */
const CASINO_ROWS = 200;
const ROWS_PER_PAGE = 20;

function BetList({ settings }) {
  const { get } = useWalletFilter();
  const type = get('type');
  const assets = get('assets');
  const time = get('time');

  /* Page 1 posts to `bet-history-first/`; the cursor pages that follow are not built, so this is
     always the first read — which is exactly the arm the table's 72px spinner belongs to.

     The range is resolved INSIDE the reader for the reason the transaction pane records at
     length: `resolveRange` goes through `Date.now()`, so a pair computed during render is a new
     pair every render and the resource would never settle. Key on the filter string. */
  const read = React.useCallback(() => {
    const [beginTime, endTime] = resolveRange(time);
    // shortcut: the newest CASINO_ROWS rounds of the window, paged here; page the server instead if a window holds more.
    const casino = Promise.resolve(getBetHistory({ beginTime, endTime, currencyName: assets, type, page: 1, limit: CASINO_ROWS }));
    if (type !== '') return casino;
    // All: the exchange's bets too (the Sports type's rows), which the casino feed does not carry.
    return Promise.all([casino, loadSportsHistory(time).catch(() => null)]).then(([casinoPage, sports]) => {
      if (!sports) return casinoPage;
      const coin = assets && assets !== 'all' ? assets : '';
      const extra = filterRows(sports.rows, { currency: coin, from: sports.window.from, to: sports.window.to }).map(toCasinoRow);
      const resList = [...(casinoPage?.resList ?? []), ...extra].sort((a, b) => Number(b.time) - Number(a.time));
      return { ...casinoPage, resList };
    });
  }, [time, assets, type]);
  const { data: page, loading } = useResource(read);

  const all = (page?.resList ?? []).filter((row) => !!row.time);
  const linkable = linksToGameDetail(type);

  // Page by hand, 20 a page as the Sports tab; a new filter goes back to page 1.
  const key = `${time}|${assets}|${type}`;
  const [at, setAt] = React.useState({ key: '', n: 1 });
  const pages = Math.max(1, Math.ceil(all.length / ROWS_PER_PAGE));
  const current = at.key === key ? Math.min(at.n, pages) : 1;
  const rows = all.slice((current - 1) * ROWS_PER_PAGE, current * ROWS_PER_PAGE);

  return (
    <>
    <Table columns={COLUMNS} loading={loading}>
      {rows.length === 0 ? (
        <EmptyPlaceholder />
      ) : (
        rows.map((item) => (
          <a
            key={item.distributeId}
            href={`/game-detail/${item.distributeId}`}
            className={`flex max-w-full items-center justify-between border-b border-third ${
              linkable ? '' : 'pointer-events-none'
            }`}
          >
            <div className={CELL}>{item.type}</div>
            <div className={`${CELL_CENTER} flex-col text-secondary`}>
              <CellTime at={item.time} />
            </div>
            {/* `payout / 1e4` then a literal "x" — a multiplier, not an amount. */}
            <div className={CELL_CENTER}>{Number(item.payout ?? 0) / 1e4}x</div>
            <div className={`${CELL} justify-end`}>
              {/* `color="auto"` and NO `sign` — the profit's minus is already in the number and the
                  original does not add a `+` to a win here, unlike the transaction pane's Amount. */}
              <CurrencyAmount
                amount={Number(item.profit)}
                currency={item.currencyName ?? ''}
                color="auto"
                settings={settings}
              />
              {linkable && <ArrowIcon className="ml-1 size-4 rotate-180 fill-secondary" />}
            </div>
          </a>
        ))
      )}
    </Table>
    {all.length > ROWS_PER_PAGE && (
      <div className="mt-4">
        <Pagination page={current} pages={pages} onChange={(n) => setAt({ key, n })} />
      </div>
    )}
    </>
  );
}

/* Status and Side, only while Type is Sports. */
function SportsOnlyFilters() {
  const { get } = useWalletFilter();
  return get('type') === SPORTS_TYPE ? <SportsFilters /> : null;
}

function BetBody({ settings }) {
  const { get } = useWalletFilter();
  return get('type') === SPORTS_TYPE ? <SportsBets /> : <BetList settings={settings} />;
}

export default function BetHistory() {
  const { session } = useSession();
  const settings = session.setting;

  const defaults = React.useMemo(
    () => ({ type: '', assets: '', time: defaultRange(), [SPORTS_STATUS_KEY]: '', [SPORTS_SIDE_KEY]: '' }),
    [],
  );

  return (
    <WalletFilterProvider storageKey={STORAGE_KEY} defaults={defaults}>
      {/* The same `w`/`V` card shell the transaction and rollover panes use. `PageLayout
          title={t("BetHistory")}` above it — note the key is one word, unlike every other pane's —
          writes into the dialog context and renders bare children on a page, so there is no
          heading. */}
      <div className="sm:mx-0 flex-auto rounded-xl bg-layer4 lg:px-8">
        <div className="sticky top-15 z-10 grid grid-cols-2 gap-2 bg-[inherit] py-4 sm:grid-cols-3 [&>button]:bg-input_bright">
          <TypeFilter />
          <AssetsFilter />
          <TimeFilter />
          <SportsOnlyFilters />
        </div>

        {/* The `center` slot sits here on the original — `ProviderBalanceList`, which is not built.
            See the header note; it renders nothing in the capture either. */}

        <BetBody settings={settings} />
      </div>
    </WalletFilterProvider>
  );
}
