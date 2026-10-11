import React from 'react';
import Select from '../../../components/shared/Select';
import Table, {
  HEAD,
  HEAD_CENTER,
  HEAD_END,
  CELL,
  CELL_CENTER,
} from '../../../components/shared/Table';
import CurrencyAmount from '../../../components/shared/CurrencyAmount';
import EmptyPlaceholder from '../../../components/shared/EmptyPlaceholder';
import { AssetsFilter, TimeFilter } from '../../../components/shared/WalletFilters';
import { useSession } from '../../../context/session';
import WalletFilterProvider from '../../../context/WalletFilterProvider';
import useResource from '../../../hooks/useResource';
import { useWalletFilter } from '../../../context/walletFilter';
import { defaultRange, resolveRange } from '../../../services/transaction';
import {
  getBetHistory,
  truncateBetPage,
  BET_TYPE_OPTIONS,
  linksToGameDetail,
} from '../../../services/betHistory';

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
    return getBetHistory({ beginTime, endTime, currencyName: assets, type, page: 1 });
  }, [time, assets, type]);
  const { data: page, loading } = useResource(read);

  const { rows } = truncateBetPage(page?.resList ?? [], 1);
  const linkable = linksToGameDetail(type);

  return (
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
            <div className={`${CELL_CENTER} text-secondary`}>
              {new Date(Number(item.time)).toLocaleString()}
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
  );
}

export default function BetHistory() {
  const { session } = useSession();
  const settings = session.setting;

  const defaults = React.useMemo(() => ({ type: '', assets: '', time: defaultRange() }), []);

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
        </div>

        {/* The `center` slot sits here on the original — `ProviderBalanceList`, which is not built.
            See the header note; it renders nothing in the capture either. */}

        <BetList settings={settings} />
      </div>
    </WalletFilterProvider>
  );
}
