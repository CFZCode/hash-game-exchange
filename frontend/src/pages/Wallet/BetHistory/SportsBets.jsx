import React from 'react';
import EmptyPlaceholder from '../../../components/shared/EmptyPlaceholder';
import Loading from '../../../components/shared/Loading';
import Pagination from '../../../components/shared/Pagination';
import { SportIcon } from '../../../components/exchange/icons';
import { useWalletFilter } from '../../../context/walletFilter';
import useResource from '../../../hooks/useResource';
import { useSelectedCurrency } from '../../../hooks/useSelectedCurrency';
import { getSportsBets } from '../../../services/exchange/history';
import { resolveRange } from '../../../services/transaction';
import { formatBetDate, toSportsBet } from './sportsBets';

/* Bet History → Type = Sports. The exchange's bets are not casino rounds — they have a side, odds,
 * a liability and a settled result — so they get their own list in place of the casino table, under
 * the same filter row. Presentation after TENEXCH's account statement (see sportsBets.js).
 *
 * mssports has no date filter on `sports-bets/user`, so the newest FEED_LIMIT bets are read, the Time
 * filter is applied here and the list is paged here; "Total stake" is the stake of the bets shown
 * (the feed's own `total_stake` counts every bet ever, whatever the window). Every exchange bet is in
 * INR: an Assets filter naming another coin is an empty list, and amounts print in the selected coin.
 */
const FEED_LIMIT = 100;
const PAGE_SIZE = 20;

const STATUS = {
  open: { label: 'Open', className: 'bg-layer5 text-secondary' },
  won: { label: 'Won', className: 'bg-success/15 text-success' },
  lost: { label: 'Lost', className: 'bg-error/15 text-error' },
  void: { label: 'Void', className: 'bg-layer5 text-tertiary' },
};

function SideChip({ bet }) {
  return (
    <span
      className={`flex-none rounded px-1 py-0.5 text-[0.625rem] font-extrabold uppercase leading-none text-alw_dark ${
        bet.back ? 'bg-back' : 'bg-lay'
      }`}
    >
      {bet.side}
    </span>
  );
}

function StatusChip({ status }) {
  const s = STATUS[status] ?? STATUS.open;
  return <span className={`rounded px-2 py-0.5 text-xs font-extrabold ${s.className}`}>{s.label}</span>;
}

/* P&L: won/lost signed and coloured like a statement's credit/debit; void reads "Void"; an open
   bet shows what it risks. */
function Pnl({ bet, cur }) {
  if (bet.status === 'void') return <span className="text-tertiary">Void</span>;
  if (bet.pnl == null) {
    return (
      <span className="flex flex-col items-end leading-tight">
        <span className="text-secondary">—</span>
        <span className="text-xs font-semibold text-tertiary">Exposure {cur.show(bet.liability, 'INRFIAT')}</span>
      </span>
    );
  }
  const sign = bet.pnl > 0 ? '+' : '';
  return <span className={bet.pnl > 0 ? 'text-success' : 'text-error'}>{sign}{cur.show(bet.pnl, 'INRFIAT')}</span>;
}

function Event({ bet }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-tertiary">
        {bet.sportIcon && <SportIcon sport={bet.sportIcon} className="size-4 flex-none [&_svg]:size-full [&_svg]:fill-current" />}
        <span>{bet.sportName}</span>
        <span>·</span>
        <span className="truncate">{formatBetDate(bet.at)}</span>
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-secondary" title={bet.breadcrumb}>
        {bet.breadcrumb}
      </p>
      <p className="mt-1 flex min-w-0 items-center gap-1.5">
        <SideChip bet={bet} />
        <span className="truncate text-base font-extrabold text-primary">{bet.selection}</span>
      </p>
    </div>
  );
}

const HEAD = 'flex-1 text-right';

export default function SportsBets() {
  const { get } = useWalletFilter();
  const time = get('time');
  const assets = String(get('assets') ?? '').toUpperCase();
  const cur = useSelectedCurrency();
  const [page, setPage] = React.useState({ key: '', n: 1 });

  const read = React.useCallback(() => getSportsBets({ page: 1, limit: FEED_LIMIT, status: 'all' }), []);
  const { data, loading } = useResource(read);

  const bets = React.useMemo(() => {
    if (assets && assets !== 'INRFIAT' && assets !== 'INR') return [];
    const [from, to] = resolveRange(time);
    return (data?.rows ?? [])
      .map(toSportsBet)
      .filter((b) => b.time && (!from || b.time >= Number(from)) && (!to || b.time <= Number(to)))
      .sort((a, b) => b.time - a.time);
  }, [data, time, assets]);

  /* A filter change starts again from page 1, derived during render rather than reset in an effect. */
  const key = `${time}|${assets}`;
  const current = page.key === key ? page.n : 1;
  const pages = Math.max(1, Math.ceil(bets.length / PAGE_SIZE));
  const shown = bets.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const totalStake = bets.reduce((sum, b) => sum + b.stake, 0);

  if (loading) {
    return (
      <div className="center h-[72px]">
        <Loading />
      </div>
    );
  }
  if (!bets.length) return <EmptyPlaceholder />;

  return (
    <div className="pb-4">
      <p className="mt-1 text-sm text-secondary">
        {bets.length} {bets.length === 1 ? 'bet' : 'bets'} · Total stake{' '}
        <span className="font-extrabold text-primary">{cur.show(totalStake, 'INRFIAT')}</span>
      </p>

      {/* sm and up: a table. */}
      <div className="mt-3 hidden rounded-xl bg-layer2 px-4 py-3 text-sm sm:flex">
        <div className="flex-[3]">Bet</div>
        <div className={HEAD}>Odds</div>
        <div className={HEAD}>Stake</div>
        <div className={HEAD}>Liability</div>
        <div className="flex-1 text-center">Status</div>
        <div className={HEAD}>P&amp;L</div>
      </div>
      <div className="hidden sm:block">
        {shown.map((bet) => (
          <div key={bet.id} className="flex items-center gap-3 border-b border-third px-4 py-3 text-base font-extrabold">
            <div className="min-w-0 flex-[3]">
              <Event bet={bet} />
            </div>
            <div className="flex-1 text-right">{bet.odds}</div>
            <div className="flex-1 text-right">{cur.show(bet.stake, 'INRFIAT')}</div>
            <div className="flex-1 text-right">{cur.show(bet.liability, 'INRFIAT')}</div>
            <div className="flex flex-1 justify-center">
              <StatusChip status={bet.status} />
            </div>
            <div className="flex flex-1 justify-end text-right">
              <Pnl bet={bet} cur={cur} />
            </div>
          </div>
        ))}
      </div>

      {/* Below sm: one card per bet. */}
      <div className="mt-3 flex flex-col gap-2 sm:hidden">
        {shown.map((bet) => (
          <div key={bet.id} className="rounded-xl bg-layer5 p-3">
            <div className="flex items-start justify-between gap-2">
              <Event bet={bet} />
              <StatusChip status={bet.status} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-tertiary">
              <div>
                Odds
                <p className="text-sm font-extrabold text-primary">{bet.odds}</p>
              </div>
              <div>
                Stake
                <p className="text-sm font-extrabold text-primary">{cur.show(bet.stake, 'INRFIAT')}</p>
              </div>
              <div>
                Liability
                <p className="text-sm font-extrabold text-primary">{cur.show(bet.liability, 'INRFIAT')}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-third pt-2 text-sm font-extrabold">
              <span className="text-xs font-semibold text-tertiary">P&amp;L</span>
              <Pnl bet={bet} cur={cur} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Pagination page={current} pages={pages} onChange={(n) => setPage({ key, n })} />
      </div>
    </div>
  );
}
