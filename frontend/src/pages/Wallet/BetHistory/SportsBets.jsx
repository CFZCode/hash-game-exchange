import React from 'react';
import EmptyPlaceholder from '../../../components/shared/EmptyPlaceholder';
import Loading from '../../../components/shared/Loading';
import Pagination from '../../../components/shared/Pagination';
import Select from '../../../components/shared/Select';
import { SportIcon } from '../../../components/exchange/icons';
import { useWalletFilter } from '../../../context/walletFilter';
import useResource from '../../../hooks/useResource';
import { useSelectedCurrency } from '../../../hooks/useSelectedCurrency';
import { getSportsBets } from '../../../services/exchange/history';
import { clampStatementWindow, getSportsStatement, getStatementBets, getStatementKind, STATEMENT_MAX_DAYS } from '../../../services/sportsStatement';
import { resolveRange } from '../../../services/transaction';
import { isFiatCode } from '../../../utils/currency';
import { SIDE_OPTIONS, STATUS_OPTIONS, buildRows, filterRows, formatBetDate, isBackSide } from './sportsBets';

/* Bet History → Type = Sports. Exchange bets are not casino rounds — they have a side, odds, a
 * liability and a settled market — so they get their own list in place of the casino table, under
 * the same filter row (plus Status and Side, below). Presentation after TENEXCH's account statement
 * (see sportsBets.js).
 *
 * SETTLED rows are the point ledger's statement, one line per market with the money that moved —
 * `account-statement-direct` for a player who signed up on the site, `account-statement-v2` for
 * one who came through an agent (services/sportsStatement.js has the rule). Expanding one reads that
 * market's bets (`account-statement-v2/bets`). OPEN bets come from the bets feed
 * (`sports-bets/user`), since the ledger only knows settled markets; the same feed fills in what a
 * ledger line lacks (league, selection, side, stake). If the statement cannot be read, the feed's
 * settled bets stand in with computed figures, so the list still works.
 *
 * Amounts print in the selected coin from each row's own currency. Both statements cap the window
 * at 31 days, so a longer Time filter is clamped and the view says so.
 */
const FEED_LIMIT = 100;
const PAGE_SIZE = 20;

/* Wallet filter keys for the two extra dropdowns ('' = all, the provider's default). */
export const SPORTS_STATUS_KEY = 'sstatus';
export const SPORTS_SIDE_KEY = 'side';

const walletCode = (code) => (isFiatCode(code) ? `${code}FIAT` : code);

const optionLabel = (option) => <div className="ellipsis w-0 flex-auto text-left">{option.label}</div>;

/** The Status and Side dropdowns, in the pane's filter row while Type is Sports. */
export function SportsFilters() {
  const { get, set } = useWalletFilter();
  const status = STATUS_OPTIONS.find((o) => o.value === (get(SPORTS_STATUS_KEY) || 'all')) ?? STATUS_OPTIONS[0];
  const side = SIDE_OPTIONS.find((o) => o.value === (get(SPORTS_SIDE_KEY) || 'all')) ?? SIDE_OPTIONS[0];
  return (
    <>
      <Select
        className="text-base"
        title="Bet status"
        value={status}
        options={STATUS_OPTIONS}
        onChange={(o) => set(SPORTS_STATUS_KEY, o.value === 'all' ? '' : o.value)}
      >
        {optionLabel}
      </Select>
      <Select
        className="text-base"
        title="Bet side"
        value={side}
        options={SIDE_OPTIONS}
        onChange={(o) => set(SPORTS_SIDE_KEY, o.value === 'all' ? '' : o.value)}
      >
        {optionLabel}
      </Select>
    </>
  );
}

const STATUS = {
  open: { label: 'Open', className: 'bg-layer5 text-secondary' },
  won: { label: 'Won', className: 'bg-success/15 text-success' },
  lost: { label: 'Lost', className: 'bg-error/15 text-error' },
  void: { label: 'Void', className: 'bg-layer5 text-tertiary' },
};

function SideChip({ side }) {
  if (!side) return null;
  const back = isBackSide(side);
  return (
    <span
      className={`flex-none rounded px-1 py-0.5 text-[0.625rem] font-extrabold uppercase leading-none text-alw_dark ${
        side === 'mixed' ? 'bg-layer6 text-primary' : back ? 'bg-back' : 'bg-lay'
      }`}
    >
      {side === 'mixed' ? 'Back + Lay' : side}
    </span>
  );
}

function StatusChip({ status }) {
  const s = STATUS[status] ?? STATUS.open;
  return <span className={`rounded px-2 py-0.5 text-xs font-extrabold ${s.className}`}>{s.label}</span>;
}

/* A signed amount: profit green with "+", loss red with "−", nothing moved in the normal colour. */
function Signed({ value, code, cur }) {
  const n = Number(value) || 0;
  if (n > 0) return <span className="text-success">+{cur.show(n, code)}</span>;
  if (n < 0) return <span className="text-error">−{cur.show(Math.abs(n), code)}</span>;
  return <span className="text-primary">{cur.show(0, code)}</span>;
}

/* An open bet has no P&L yet: what it risks instead. */
function Pnl({ row, cur }) {
  const code = walletCode(row.currency);
  if (row.pnl == null) {
    return (
      <span className="flex flex-col items-end leading-tight">
        <span className="text-secondary">—</span>
        <span className="text-xs font-semibold text-tertiary">Exposure {cur.show(row.liability, code)}</span>
      </span>
    );
  }
  return <Signed value={row.pnl} code={code} cur={cur} />;
}

function Event({ row }) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-tertiary">
        {row.sportIcon && <SportIcon sport={row.sportIcon} className="size-4 flex-none [&_svg]:size-full [&_svg]:fill-current" />}
        <span>{row.sportName}</span>
        <span>·</span>
        <span className="truncate">{formatBetDate(row.at)}</span>
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-secondary" title={row.breadcrumb}>
        {row.breadcrumb}
      </p>
      <p className="mt-1 flex min-w-0 items-center gap-1.5">
        <SideChip side={row.side} />
        <span className="truncate text-base font-extrabold text-primary">{row.selection}</span>
      </p>
    </div>
  );
}

/* One settled market's bets, as the statement's result modal lists them: side, selection, odds,
   stake and what each won or lost. */
function MarketBets({ drill, cur }) {
  const read = React.useCallback(() => getStatementBets(drill), [drill]);
  const { data, loading, error } = useResource(read);
  if (loading) {
    return (
      <div className="center h-12">
        <Loading />
      </div>
    );
  }
  if (error) return <p className="py-3 text-center text-sm text-error">Could not load this market&apos;s bets.</p>;
  return (
    /* Inside a mobile card the whole card toggles: a tap in here must not close it. */
    <div className="mt-3 rounded-lg bg-layer2 p-3 text-sm" onClick={(e) => e.stopPropagation()} role="presentation">
      {data?.winner && (
        <p className="mb-2 text-xs text-tertiary">
          Result <span className="font-extrabold text-primary">{data.winner}</span>
        </p>
      )}
      {(data?.bets ?? []).map((b) => {
        const code = walletCode(String(b.original_currency || 'INR').toUpperCase());
        return (
          <div key={b.id} className="flex items-center gap-2 border-t border-third py-2 first:border-t-0">
            <SideChip side={String(b.side || b.bet_type || '').toLowerCase()} />
            <span className="min-w-0 flex-1 truncate font-semibold text-primary">{b.selection_name || b.fancy_name}</span>
            <span className="w-14 text-right text-secondary">{Number(b.odds) || '—'}</span>
            <span className="w-24 text-right text-secondary">{cur.show(Number(b.stake_amount) || 0, code)}</span>
            <span className="w-24 text-right font-extrabold">
              {b.deleted ? (
                <span className="text-tertiary">Void</span>
              ) : b.win == null ? (
                <span className="text-secondary">—</span>
              ) : (
                <Signed value={b.win} code={code} cur={cur} />
              )}
            </span>
          </div>
        );
      })}
      {!data?.bets?.length && <p className="text-center text-tertiary">No bets on this market.</p>}
    </div>
  );
}

const ExpandIcon = ({ open }) => (
  <svg viewBox="0 0 32 32" className={`size-4 flex-none fill-secondary transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true">
    <path d="M12.31 5.6L22.71 16L12.31 26.4L9.29 23.38L16.67 16L9.29 8.62Z" />
  </svg>
);

async function loadSportsHistory(time) {
  const [begin, end] = resolveRange(time);
  const window = clampStatementWindow(begin, end);
  const [kind, feed] = await Promise.all([getStatementKind().catch(() => null), getSportsBets({ page: 1, limit: FEED_LIMIT, status: 'all' })]);
  // A statement that cannot be read is `null`: the feed's settled bets stand in (buildRows).
  const statement = await getSportsStatement({ kind: kind ?? 'direct', from: window.from, to: window.to }).catch(() => null);
  return { window, kind, statementOk: Array.isArray(statement), rows: buildRows({ statement, bets: feed.rows }) };
}

export default function SportsBets() {
  const { get } = useWalletFilter();
  const time = get('time');
  const assets = get('assets');
  const status = get(SPORTS_STATUS_KEY) || 'all';
  const side = get(SPORTS_SIDE_KEY) || 'all';
  const cur = useSelectedCurrency();
  const [page, setPage] = React.useState({ key: '', n: 1 });
  const [openKey, setOpenKey] = React.useState(null);

  const read = React.useCallback(() => loadSportsHistory(time), [time]);
  const { data, loading, error } = useResource(read);

  const rows = React.useMemo(
    () =>
      data
        ? filterRows(data.rows, { status, side, currency: assets && assets !== 'all' ? assets : '', from: data.window.from, to: data.window.to })
        : [],
    [data, status, side, assets],
  );

  /* A filter change starts again from page 1, derived during render rather than reset in an effect. */
  const key = `${time}|${assets}|${status}|${side}`;
  const current = page.key === key ? page.n : 1;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  /* Sums are taken per row in its own currency and converted once into the selected coin. */
  const totalStake = rows.reduce((sum, r) => sum + cur.convert(r.stake, walletCode(r.currency)), 0);
  const totalPnl = rows.reduce((sum, r) => sum + (r.pnl == null ? 0 : cur.convert(r.pnl, walletCode(r.currency))), 0);

  if (loading) {
    return (
      <div className="center h-[72px]">
        <Loading />
      </div>
    );
  }
  if (error) return <p className="py-10 text-center text-sm text-error">Could not load your sports bets. Please try again.</p>;

  const toggle = (row) => row.kind === 'settled' && row.drill && setOpenKey((k) => (k === row.key ? null : row.key));

  return (
    <div className="pb-4">
      {data?.window.clamped && (
        <p className="mt-1 text-xs text-tertiary">Sports history covers at most the last {STATEMENT_MAX_DAYS} days.</p>
      )}
      {!rows.length ? (
        <EmptyPlaceholder />
      ) : (
        <>
          <p className="mt-1 text-sm text-secondary">
            {rows.length} {rows.length === 1 ? 'bet' : 'bets'} · Total stake{' '}
            <span className="font-extrabold text-primary">{cur.show(totalStake, cur.code)}</span> · P&amp;L{' '}
            <span className="font-extrabold">
              <Signed value={totalPnl} code={cur.code} cur={cur} />
            </span>
          </p>

          {/* sm and up: a table. */}
          <div className="mt-3 hidden rounded-xl bg-layer2 px-4 py-3 text-sm sm:flex">
            <div className="flex-[3]">Bet</div>
            <div className="flex-1 text-right">Odds</div>
            <div className="flex-1 text-right">Stake</div>
            <div className="flex-1 text-right">Liability</div>
            <div className="flex-1 text-center">Status</div>
            <div className="flex-1 text-right">P&amp;L</div>
          </div>
          <div className="hidden sm:block">
            {shown.map((row) => {
              const code = walletCode(row.currency);
              const expandable = row.kind === 'settled' && row.drill;
              return (
                <div key={row.key} className="border-b border-third px-4 py-3">
                  <div
                    role={expandable ? 'button' : undefined}
                    tabIndex={expandable ? 0 : undefined}
                    onClick={() => toggle(row)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(row)}
                    className={`flex items-center gap-3 text-base font-extrabold ${expandable ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex min-w-0 flex-[3] items-center gap-2">
                      {expandable && <ExpandIcon open={openKey === row.key} />}
                      <Event row={row} />
                    </div>
                    <div className="flex-1 text-right">{row.odds ?? '—'}</div>
                    <div className="flex-1 text-right">{cur.show(row.stake, code)}</div>
                    <div className="flex-1 text-right">{cur.show(row.liability, code)}</div>
                    <div className="flex flex-1 justify-center">
                      <StatusChip status={row.status} />
                    </div>
                    <div className="flex flex-1 justify-end text-right">
                      <Pnl row={row} cur={cur} />
                    </div>
                  </div>
                  {openKey === row.key && <MarketBets drill={row.drill} cur={cur} />}
                </div>
              );
            })}
          </div>

          {/* Below sm: one card per bet. */}
          <div className="mt-3 flex flex-col gap-2 sm:hidden">
            {shown.map((row) => {
              const code = walletCode(row.currency);
              const expandable = row.kind === 'settled' && row.drill;
              return (
                <div
                  key={row.key}
                  role={expandable ? 'button' : undefined}
                  tabIndex={expandable ? 0 : undefined}
                  onClick={() => toggle(row)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(row)}
                  className="rounded-xl bg-layer5 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Event row={row} />
                    <StatusChip status={row.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-tertiary">
                    <div>
                      Odds
                      <p className="text-sm font-extrabold text-primary">{row.odds ?? '—'}</p>
                    </div>
                    <div>
                      Stake
                      <p className="text-sm font-extrabold text-primary">{cur.show(row.stake, code)}</p>
                    </div>
                    <div>
                      Liability
                      <p className="text-sm font-extrabold text-primary">{cur.show(row.liability, code)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-third pt-2 text-sm font-extrabold">
                    <span className="flex items-center gap-1 text-xs font-semibold text-tertiary">
                      {expandable && <ExpandIcon open={openKey === row.key} />}
                      P&amp;L
                    </span>
                    <Pnl row={row} cur={cur} />
                  </div>
                  {openKey === row.key && <MarketBets drill={row.drill} cur={cur} />}
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <Pagination page={current} pages={pages} onChange={(n) => setPage({ key, n })} />
          </div>
        </>
      )}
    </div>
  );
}
