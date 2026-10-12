import React from 'react';
import { MarketFilterTabs, formatAmount, formatStartTime } from '../../../components/exchange';
import Select from '../../../components/shared/Select';
import Input from '../../../components/shared/Input';
import Loading from '../../../components/shared/Loading';
import EmptyPlaceholder from '../../../components/shared/EmptyPlaceholder';
import Pagination from '../../../components/shared/Pagination';
import PopCenter from '../../../components/shared/PopCenter';
import { toast } from '../../../components/shared/Toast/toast';
import { usePolling } from '../../../hooks/exchange';
import { getSportsBets, cancelBet } from '../../../services/exchange';
import { ExchangeAccountPage } from '../ExchangeFrame';

/* `status` is mssports' own vocabulary (CricketService.getSportsBetsByUserId): `matchbet` = open
   and matched, `unmatchbet` = open and unmatched, `deletebet` = cancelled, `all` = every bet.
   THERE IS NO SETTLED FILTER — Settled reads `all` and drops the open rows here, so a page can
   hold fewer than PAGE_SIZE rows and the pager counts open bets too (docs/backend-gaps.md). */
const TABS = [
  { id: 'matched', label: 'Matched', status: 'matchbet' },
  { id: 'unmatched', label: 'Unmatched', status: 'unmatchbet' },
  { id: 'settled', label: 'Settled', status: 'all' },
];
const SIDES = [
  { value: 'all', label: 'All' },
  { value: 'back', label: 'Back' },
  { value: 'lay', label: 'Lay' },
];
const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

const backish = (side) => side === 'back' || side === 'yes';
const SIDE_LABEL = { back: 'Back', lay: 'Lay', yes: 'Yes', no: 'No' };
const RESULT_LABEL = { won: 'Won', win: 'Won', lost: 'Lost', loss: 'Lost', void: 'Void', refund: 'Void', cancelled: 'Cancelled' };
const money = (n) => `₹${formatAmount(n)}`;

function BetRow({ bet, tab, cancelling, onCancel }) {
  const side = bet.side;
  const market = bet.fancyName || bet.marketType;
  const rate = bet.raw?.size ?? bet.raw?.user_rate_size;
  const result = String(bet.resultStatus || '').toLowerCase();

  return (
    <div className={`flex items-stretch gap-3 border-b border-third py-3 ${cancelling ? 'opacity-60' : ''}`}>
      <span className={`w-1 flex-none rounded-full ${backish(side) ? 'bg-back' : 'bg-lay'}`} />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5">
          <span
            className={`flex-none rounded px-1 py-0.5 text-[0.625rem] font-extrabold uppercase leading-none text-alw_dark ${
              backish(side) ? 'bg-back' : 'bg-lay'
            }`}
          >
            {SIDE_LABEL[side] ?? side}
          </span>
          <span className="truncate text-sm font-extrabold text-primary">{bet.selection || market || '—'}</span>
        </p>
        <p className="mt-1 truncate text-xs text-secondary">
          {bet.matchTitle}
          {market ? ` · ${market}` : ''}
        </p>
        <p className="mt-0.5 truncate text-xs text-tertiary">
          {bet.createdAt ? formatStartTime(bet.createdAt) : ''}
          {bet.id != null ? ` · #${bet.id}` : ''}
        </p>
      </div>
      <div className="flex-none text-right text-xs leading-5">
        <p className="text-secondary">
          <span className="font-extrabold text-primary">{bet.odds}</span>
          {rate != null && (side === 'yes' || side === 'no') && <span className="text-tertiary">@{rate}</span>}
          <span className="mx-1 text-tertiary">×</span>
          <span className="font-extrabold text-primary">{money(bet.stake)}</span>
        </p>
        {tab === 'settled' ? (
          <p>
            {RESULT_LABEL[result] && <span className="mr-1.5 text-tertiary">{RESULT_LABEL[result]}</span>}
            {bet.profit != null && (
              <span className={bet.profit > 0 ? 'font-extrabold text-success' : bet.profit < 0 ? 'font-extrabold text-error' : 'text-secondary'}>
                {bet.profit > 0 ? '+' : bet.profit < 0 ? '−' : ''}
                {formatAmount(Math.abs(bet.profit))}
              </span>
            )}
          </p>
        ) : (
          bet.liability > 0 && (
            <p className="text-tertiary">
              Liability <span className="font-extrabold text-error">−{formatAmount(bet.liability)}</span>
            </p>
          )
        )}
        {tab === 'unmatched' && (
          <button
            type="button"
            aria-disabled={cancelling || undefined}
            onClick={cancelling ? undefined : () => onCancel(bet)}
            className="button button-s mt-1 h-7 rounded-md bg-layer5 px-2.5 text-xs font-semibold text-error hover:bg-layer6 aria-disabled:cursor-wait"
          >
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
}

function CancelConfirm({ bet, onClose, onConfirm }) {
  return (
    <PopCenter open onClose={onClose} title="Cancel bet">
      <p className="mt-4 text-center text-secondary">
        Cancel your unmatched {SIDE_LABEL[bet.side] ?? bet.side} bet on{' '}
        <span className="font-extrabold text-primary">{bet.selection || bet.matchTitle}</span> at {bet.odds} for{' '}
        {money(bet.stake)}?
      </p>
      <div className="mt-8 flex w-full items-center justify-between gap-3">
        <button
          type="button"
          className="button button-m button-second h-12 flex-1 text-lg font-extrabold text-primary"
          onClick={onClose}
        >
          Keep
        </button>
        <button
          type="button"
          className="button button-m button-brand h-12 flex-1 text-lg font-extrabold text-primary_brand"
          onClick={onConfirm}
        >
          Cancel bet
        </button>
      </div>
    </PopCenter>
  );
}

/**
 * `/sports/my-bets` — the player's exchange bets: Matched / Unmatched / Settled
 * (`GET cricket/sports-bets/user`), All / Back / Lay, search, 20 a page. Open tabs re-read every
 * 10s; an unmatched row can be cancelled after a confirm. Signed out never reaches here — App.jsx
 * raises the sign-in dialog over the route instead.
 */
export default function ExchangeMyBets() {
  const [tab, setTab] = React.useState('matched');
  const [side, setSide] = React.useState('all');
  const [draft, setDraft] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [confirming, setConfirming] = React.useState(null);
  const [cancelling, setCancelling] = React.useState([]);

  React.useEffect(() => {
    const t = setTimeout(() => setQuery(draft.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [draft]);

  /* The page belongs to the filter it was chosen under; any filter change reads page 1 again
     without an effect resetting it. */
  const filterKey = `${tab}|${side}|${query}`;
  const [pageState, setPageState] = React.useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;

  const status = TABS.find((t) => t.id === tab).status;
  const fetcher = React.useCallback(
    () => getSportsBets({ page, limit: PAGE_SIZE, search: query || undefined, betType: side, status }),
    [page, query, side, status],
  );
  const { data, error, refresh } = usePolling(fetcher, {
    intervalMs: tab === 'settled' ? 0 : 10000,
    key: `${filterKey}|${page}`,
  });

  const rows = (data?.rows ?? []).filter((b) => (tab === 'settled' ? !b.isOpen : true));
  const pages = Number(data?.pagination?.total_pages) || 0;

  const confirmCancel = async () => {
    const bet = confirming;
    setConfirming(null);
    setCancelling((ids) => [...ids, bet.id]);
    try {
      const res = await cancelBet(bet.id);
      toast.success(res.message || 'Bet cancelled');
      refresh();
    } catch (e) {
      toast.error(e?.message || 'The bet could not be cancelled.');
    } finally {
      setCancelling((ids) => ids.filter((id) => id !== bet.id));
    }
  };

  const sideOption = SIDES.find((o) => o.value === side);

  return (
    <ExchangeAccountPage title="My Bets">
      <div className="rounded-xl bg-layer4 px-4 pb-4 lg:px-8">
        <MarketFilterTabs className="pt-2" tabs={TABS} active={tab} onChange={setTab} />
        <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] [&>button]:bg-input_bright">
          <Select title="Side" value={sideOption} options={SIDES} onChange={(o) => setSide(o.value)}>
            {(o) => <div className="ellipsis w-0 flex-auto text-left">{o.label}</div>}
          </Select>
          <Input value={draft} onChange={setDraft} placeholder="Search event, runner or market" required={false} />
        </div>

        {data === undefined ? (
          error ? (
            <p className="py-10 text-center text-sm text-tertiary">
              {error.status === 401 ? 'Please sign in again.' : 'Bets could not be loaded. Retrying…'}
            </p>
          ) : (
            <div className="flex h-[72px] items-center justify-center">
              <Loading />
            </div>
          )
        ) : rows.length === 0 ? (
          <EmptyPlaceholder>
            {tab === 'settled' ? 'No settled bets' : tab === 'unmatched' ? 'No unmatched bets' : 'No matched bets'}
          </EmptyPlaceholder>
        ) : (
          <>
            {data.pagination?.total_stake != null && tab !== 'settled' && (
              <p className="pb-1 text-xs text-tertiary">
                {data.pagination.total} bets · total stake{' '}
                <span className="font-extrabold text-primary">{money(data.pagination.total_stake)}</span>
              </p>
            )}
            {rows.map((bet) => (
              <BetRow
                key={bet.id}
                bet={bet}
                tab={tab}
                cancelling={cancelling.includes(bet.id)}
                onCancel={setConfirming}
              />
            ))}
          </>
        )}

        <Pagination page={page} pages={pages} onChange={(p) => setPageState({ key: filterKey, page: p })} />
      </div>
      {confirming && <CancelConfirm bet={confirming} onClose={() => setConfirming(null)} onConfirm={confirmCancel} />}
    </ExchangeAccountPage>
  );
}
