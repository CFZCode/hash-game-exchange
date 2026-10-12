import React from 'react';
import { cx, formatAmount as defaultFormatAmount, formatStartTime } from './utils';

const SIDE = { back: 'Back', lay: 'Lay', yes: 'Yes', no: 'No' };
const backish = (s) => s === 'back' || s === 'yes';

/**
 * OpenBetsPanel — the user's open bets on this match: Matched / Unmatched tabs (the site's
 * `.tabs-title` strip), unmatched rows carry Cancel.
 *
 * Bet shape: `{ id, runnerName, marketName?, side:'back'|'lay'|'yes'|'no', price, stake,
 *               rate?, profit?, liability?, placedAt? }` — profit/liability optional (shown when given).
 *
 * @param {object}   props
 * @param {object[]} [props.matched]
 * @param {object[]} [props.unmatched]
 * @param {'matched'|'unmatched'} [props.tab]      Controlled tab; omit for internal state.
 * @param {(tab)=>void} [props.onTabChange]
 * @param {(bet)=>void} [props.onCancel]            Unmatched row Cancel.
 * @param {()=>void}    [props.onCancelAll]         Shows "Cancel all" on the Unmatched tab.
 * @param {Array<string|number>} [props.cancellingIds]  Rows showing a pending Cancel.
 * @param {boolean}  [props.loading]                Muted "Loading…" in place of rows.
 * @param {string}   [props.currency]
 * @param {(n)=>string} [props.formatAmount]
 * @param {(t)=>string} [props.formatTime]
 * @param {string}   [props.className]
 */
export default function OpenBetsPanel({
  matched = [],
  unmatched = [],
  tab,
  onTabChange,
  onCancel,
  onCancelAll,
  cancellingIds = [],
  loading = false,
  currency = '',
  formatAmount = defaultFormatAmount,
  formatTime = formatStartTime,
  className = '',
}) {
  const [ownTab, setOwnTab] = React.useState('matched');
  const current = tab ?? ownTab;
  const setTab = (t) => {
    onTabChange?.(t);
    if (tab === undefined) setOwnTab(t);
  };
  const rows = current === 'matched' ? matched : unmatched;
  const money = (n) => `${currency}${formatAmount(n)}`;

  return (
    <section className={cx('rounded-xl bg-layer3 p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-primary">Open Bets</h3>
        {current === 'unmatched' && onCancelAll && unmatched.length > 0 && (
          <button
            type="button"
            onClick={onCancelAll}
            className="button button-s button-second h-7 px-2.5 text-xs"
          >
            Cancel all
          </button>
        )}
      </div>

      <div className="tabs-title mt-2" role="tablist">
        {[
          ['matched', 'Matched', matched.length],
          ['unmatched', 'Unmatched', unmatched.length],
        ].map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="tabs-btn"
            aria-selected={current === id ? 'true' : undefined}
            onClick={() => setTab(id)}
          >
            <span className="font-semibold">{label}</span>
            <span className="ml-1 text-xs opacity-70">{n}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-col gap-1.5">
        {loading ? (
          <p className="py-6 text-center text-xs text-tertiary">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-xs text-tertiary">
            {current === 'matched' ? 'No matched bets' : 'No unmatched bets'}
          </p>
        ) : (
          rows.map((bet) => {
            const cancelling = cancellingIds.includes(bet.id);
            return (
              <div
                key={bet.id}
                className={cx(
                  'flex items-stretch gap-2 overflow-hidden rounded-lg bg-layer4',
                  cancelling && 'opacity-60',
                )}
              >
                <span className={cx('w-1 flex-none', backish(bet.side) ? 'bg-back' : 'bg-lay')} />
                <div className="min-w-0 flex-1 py-2">
                  <p className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={cx(
                        'flex-none rounded px-1 py-0.5 text-[0.625rem] font-extrabold uppercase leading-none text-alw_dark',
                        backish(bet.side) ? 'bg-back' : 'bg-lay',
                      )}
                    >
                      {SIDE[bet.side] ?? bet.side}
                    </span>
                    <span className="truncate text-sm font-semibold text-primary">{bet.runnerName}</span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-tertiary">
                    {bet.marketName}
                    {bet.placedAt ? ` · ${formatTime(bet.placedAt)}` : ''}
                  </p>
                </div>
                <div className="flex-none py-2 text-right text-xs leading-5">
                  <p className="text-secondary">
                    <span className="font-extrabold text-primary">{bet.price}</span>
                    {bet.rate != null && <span className="text-tertiary">@{bet.rate}</span>}
                    <span className="mx-1 text-tertiary">×</span>
                    <span className="font-semibold text-primary">{money(bet.stake)}</span>
                  </p>
                  {(bet.profit != null || bet.liability != null) && (
                    <p>
                      {bet.profit != null && <span className="text-success">+{formatAmount(bet.profit)}</span>}
                      {bet.liability != null && (
                        <span className="ml-1.5 text-error">{'−'}{formatAmount(bet.liability)}</span>
                      )}
                    </p>
                  )}
                </div>
                {current === 'unmatched' && onCancel ? (
                  <div className="flex flex-none items-center pr-2">
                    <button
                      type="button"
                      aria-disabled={cancelling || undefined}
                      onClick={cancelling ? undefined : () => onCancel(bet)}
                      className="button button-s h-7 rounded-md bg-layer5 px-2.5 text-xs font-semibold text-error hover:bg-layer6 aria-disabled:cursor-wait"
                    >
                      {cancelling ? 'Cancelling…' : 'Cancel'}
                    </button>
                  </div>
                ) : (
                  <span className="w-1 flex-none" />
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
