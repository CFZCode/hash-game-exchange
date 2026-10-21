import React from 'react';
import { useNavigate } from 'react-router-dom';
import Select from '../../../components/shared/Select';
import Table, {
  HEAD,
  HEAD_CENTER,
  HEAD_END,
  CELL,
  CELL_START,
  CELL_CENTER,
} from '../../../components/shared/Table';
import { useSelectedCurrency } from '../../../hooks/useSelectedCurrency';
import EmptyPlaceholder from '../../../components/shared/EmptyPlaceholder';
import WalletFilterProvider from '../../../context/WalletFilterProvider';
import useResource from '../../../hooks/useResource';
import { useWalletFilter } from '../../../context/walletFilter';
import {
  getRolloverTasks,
  getRolloverTypes,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  TYPE,
  statusColor,
  statusLabel,
  getWagerProgress,
} from '../../../services/rollover';

/* `/wallet/rollover` — the seventh wallet pane, and the wagering-requirement ledger: every bonus
 * that has a rollover attached, with how much of it is still to be wagered.
 *
 * `DialogTurnover` resolves to `index-N228sAQi.js` (5 KB) over `Details-DZ3wUplM.js` (13.5 KB, the
 * API namespace, the four enums, the status badge and the detail dialog). Both off
 * `hash.game/assets/`. It reuses the transaction pane's card shell, filter store and table
 * wholesale — `index-DP7RdwkJ.js`, `CurrencyAmount-CcsyxXsB.js` and `Table-Cyxc_MMr.js` are the
 * same three files — which is what moved those out of `/wallet/transaction` and into
 * `context/WalletFilterProvider.jsx`, `components/shared/Table` and
 * `components/shared/CurrencyAmount`. The transaction pane's rendered markup was diffed before and
 * after that move and is byte-identical.
 *
 * `DialogTurnover2` resolves to the SAME chunk. Two exports, one file; only `DialogTurnover` is
 * routed, at `/rollover`.
 *
 * ── ANOTHER EMPTY STATE, AND `types` IS THE ONE WORTH KNOWING ABOUT ───────────────────────────
 *
 * All four endpoints answer 6002. `/balance-controller/wager/task/types/` was worth probing rather
 * than assuming, because a list of bonus categories looks exactly like the catalogues the
 * `game/support` family has handed out four times now — `usdPrice`, `index/minimal`,
 * `currencyTokens`, `swap/config`. It is not one: the types are scoped to the account's own tasks.
 * So the Bonus Type filter keeps its seeded first entry, which is what the original shows until
 * that fetch lands, and the list renders the site's own empty state. That is the capture.
 *
 * ── NOT BUILT, each inert at its call site ────────────────────────────────────────────────────
 *
 *   the row detail   a row navigates to `/wallet/roll-detail?taskId=…` carrying itself as router
 *                    state. That dialog is the larger half of `Details-DZ3wUplM.js` — progress
 *                    bars, a cancel action, a help popover — and needs a `detail` response.
 *   the mobile arm   `mobile || narrow` collapses the four columns to two (Rollover Type / Amount)
 *                    with the timestamp stacked under the type. The columns are written for both,
 *                    since that branch is one ternary, but the pane is desktop-only here.
 *   the pager        20 rows a page off `totalPage`, with nothing to page.
 */

const STORAGE_KEY = 'wallet:rollover-filter';

const optionLabel = (option) => (
  <div className="ellipsis w-0 flex-auto text-left">{option.label}</div>
);

/* `Q` — Status. `n("status")` holds the number as a STRING (or `""` for unset), which is why every
   read goes through `Number()` and why the body drops the key when it is empty: `0` is the
   AllStatus member and would be a filter rather than the absence of one. */
function StatusFilter() {
  const { get, set } = useWalletFilter();
  const current = Number(get('status') || '');
  const value = STATUS_OPTIONS.find((o) => o.value === current) ?? STATUS_OPTIONS[0];

  return (
    <Select
      className="text-base"
      title="Status"
      value={value}
      options={STATUS_OPTIONS}
      onChange={(option) => set('status', String(option.value))}
    >
      {optionLabel}
    </Select>
  );
}

/* `X` — Type. Unlike the transaction pane's Type filter this one clears nothing on change; the
   Bonus Type filter below reads `type` directly and simply stops rendering. */
function TypeFilter() {
  const { get, set } = useWalletFilter();
  const current = Number(get('type') || '');
  const value = TYPE_OPTIONS.find((o) => o.value === current) ?? TYPE_OPTIONS[0];

  return (
    <Select
      className="text-base"
      title="Rollover type"
      value={value}
      options={TYPE_OPTIONS}
      onChange={(option) => set('type', String(option.value))}
    >
      {optionLabel}
    </Select>
  );
}

/* `G` — Bonus Type, and it renders ONLY when Type is Bonus, which is why the capture shows two
 * filters and not three.
 *
 * Its options are SEEDED WITH ONE ENTRY AND APPENDED TO, not replaced: the store starts at
 * `[{label: "Bonus Type", value: 0}]` and `getTypes(true)`'s rows are pushed after it. So the
 * label you see before the fetch resolves is a placeholder that stays as the "all" option once it
 * does. With a 6002 there is nothing to append and the seed is the whole list.
 */
function BonusTypeFilter() {
  const { get, set } = useWalletFilter();
  /* `/balance-controller/wager/task/types/` — 6002, so the seed below is the whole list. While
     it is in flight the Select simply has its one seeded option, which is what the original shows
     until the fetch lands: the store starts at that literal and PUSHES the rows onto it.
     Read ABOVE the visibility test, because a hook cannot sit after an early return — and the
     original fetches it once at store creation rather than when the filter appears anyway. */
  const { data: typeRows } = useResource(getRolloverTypes);
  if (Number(get('type') || '') !== TYPE.Bonus) return null;

  const rows = typeRows ?? [];
  const options = [
    { label: 'Bonus Type', value: 0 },
    ...rows.map((row) => ({ label: row.taskTypeDesc ?? '', value: row.taskType ?? 0 })),
  ];

  const current = Number(get('bonusType') || '');
  const value = options.find((o) => o.value === current) ?? options[0];

  return (
    <Select
      className="text-base"
      title="Bonus type"
      value={value}
      options={options}
      onChange={(option) => set('bonusType', String(option.value))}
    >
      {optionLabel}
    </Select>
  );
}

/* `w`/`q` — the status badge. A dot in the status's colour, the label, and a help icon the two
 * wallet call sites suppress. The dot is `D` in `Image-D1QE7fNY.js`: an `<svg fill=currentColor>`
 * holding one 8-radius circle at `size-4`, which is why colouring it is a TEXT class.
 *
 * `.status` on the label div is a DEAD CLASS — it generates nothing in any of the mirror's six
 * stylesheets nor in the current deploy's `index-DGr5jguQ.css`, both checked. Kept, like
 * `header-nav-item` and `page-container`.
 */
function StatusBadge({ status, isSystemCancel }) {
  if (!status) return '-';
  return (
    <div className="flex items-center justify-end">
      <svg fill="currentColor" viewBox="0 0 32 32" className={`size-4 ${statusColor(status)}`}>
        <path d="M16 8 a8 8 0 1 0 0.0001 0" />
      </svg>
      <div className="status">{statusLabel(status, isSystemCancel)}</div>
    </div>
  );
}

const COLUMNS = [
  ['Type', HEAD],
  ['Time', HEAD_CENTER],
  /* "Turnover", not bc.game's "Amount" (user's request, 2026-10-16): the platform's requirement is
     a turnover — wagered so far against the target — so that is what the column shows. */
  ['Turnover', HEAD_CENTER],
  ['Status', HEAD_END],
];

/* `A(isBuy, taskType, taskTypeDesc)` — `isBuy && taskType === 1 ? t("Buy") : taskTypeDesc`, and the
   `1` is a bare literal on the original, not a member of the `TaskType` enum (which carries only
   DepositBonus 3 and SpecialDepositBonus 11). Left as the literal rather than dressed up as an
   enum lookup it does not belong to. Both call sites in this chunk pass `false` for `isBuy`, so
   the first arm is unreachable and the cell is always the server's own description; the other
   caller lives in the detail dialog, which is not built. */
const rolloverTypeLabel = (isBuy, taskType, taskTypeDesc) =>
  isBuy && taskType === 1 ? 'Buy' : taskTypeDesc;

/* The turnover cell: wagered so far / the target, and a progress bar under it. `originalAmount`
   is the target (services/rollover.js); `wagered` rides along on the row. */
function Turnover({ item }) {
  const cur = useSelectedCurrency();
  const target = Number(item.originalAmount) || 0;
  const wagered = Math.max(0, Number(item.wagered) || 0);
  const pct = target > 0 ? Math.min(100, (wagered / target) * 100) : 100;
  return (
    <div className="flex w-full flex-col items-center gap-1">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-x-1 text-xs sm:text-sm">
        <span className="text-primary">{short(usd(wagered, cur))}</span>
        <span className="text-secondary">/ {short(usd(target, cur))}</span>
      </div>
      <div className="h-1 w-full max-w-28 overflow-hidden rounded-full bg-layer6">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* Text-only money — a coin mark beside every figure crowded a phone row. The platform's turnover
   figures are USD (`userwager` is kept in USD, user-service wager module); they are printed in the
   player's SELECTED currency (`useSelectedCurrency`, the selected-currency skill). */
const usd = (amount, cur) => cur.show(Number(amount) || 0, 'USDFIAT');

/* "31.58055 USDT" with the coin code hidden on a phone, where the Turnover column has no room
   for it (the Required figure above the table names the currency). */
const short = (text) => {
  const [num, ...code] = String(text).split(' ');
  return code.length ? (
    <>
      {num}
      <span className="max-sm:hidden"> {code.join(' ')}</span>
    </>
  ) : (
    text
  );
};

/* The account's turnover at a glance (user's request, 2026-10-16), above the table and shown even
   before a deposit: wagered so far, the required turnover (deposits x multiplier) and what is left. */
function TurnoverSummary() {
  const cur = useSelectedCurrency();
  const { data } = useResource(getWagerProgress);
  if (!data) return null;
  const target = Number(data.target) || 0;
  const wagered = Number(data.wagered) || 0;
  const pct = target > 0 ? Math.min(100, (wagered / target) * 100) : wagered > 0 ? 100 : 0;
  const cell = (label, amount) => (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="text-xs text-secondary">{label}</span>
      <span className="truncate text-primary">{usd(amount, cur)}</span>
    </div>
  );
  return (
    <div className="mb-4 rounded-lg bg-layer5 p-3 font-semibold">
      <div className="grid grid-cols-3 gap-2">
        {cell('Wagered', wagered)}
        {cell('Required', target)}
        {cell('Remaining', Number(data.remaining) || 0)}
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-layer6">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      {data.multiplier != null && (
        <p className="mt-2 text-center text-xs text-tertiary">Wager {Number(data.multiplier)}x your deposits to clear the rollover.</p>
      )}
    </div>
  );
}

/* `te` — the list. */
function RolloverList() {
  const navigate = useNavigate();
  const { get } = useWalletFilter();

  const status = get('status');
  const type = get('type');
  const bonusType = get('bonusType');
  const read = React.useCallback(
    () =>
      getRolloverTasks({
        status: status ? Number(status) : undefined,
        type: Number(type || 0),
        bonusType: Number(bonusType || 0),
      }),
    [status, type, bonusType],
  );
  const { data: page, loading } = useResource(read);
  const rows = page?.list ?? [];

  return (
    <Table columns={COLUMNS} loading={loading}>
      {rows.length === 0 ? (
        <EmptyPlaceholder />
      ) : (
        rows.map((item) => (
          <div
            key={item.taskId}
            className="flex cursor-pointer items-center justify-between border-b border-third"
            onClick={() => navigate(`/wallet/roll-detail?taskId=${item.taskId}`, { state: item })}
          >
            <div className={`${CELL_START} min-w-0`}>
              <span className="line-clamp-2 w-full whitespace-normal break-words">{rolloverTypeLabel(false, item.taskType, item.taskTypeDesc)}</span>
            </div>
            {/* Date over time, so the cell fits a phone column instead of running into its neighbours. */}
            <div className={`${CELL_CENTER} min-w-0 flex-col text-sm text-secondary`}>
              {item.createTime ? (
                <>
                  <span>{new Date(Number(item.createTime)).toLocaleDateString()}</span>
                  <span className="text-xs">{new Date(Number(item.createTime)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </>
              ) : null}
            </div>
            <div className={CELL_CENTER}>
              <Turnover item={item} />
            </div>
            <div className={`${CELL} justify-end`}>
              <StatusBadge
                status={item.status}
                isSystemCancel={item.remark === 'cancel_by_system'}
              />
            </div>
          </div>
        ))
      )}
    </Table>
  );
}

export default function Rollover() {
  /* `defaults` on the original are all empty strings — there is no "past 24 hours" equivalent
     here, so an unset filter means "everything" and the body sends 0 or omits the key. */
  const defaults = React.useMemo(() => ({ type: '', status: '', bonusType: '' }), []);

  return (
    <WalletFilterProvider storageKey={STORAGE_KEY} defaults={defaults}>
      {/* The same `w`/`K` card shell the transaction pane uses, written out for the reason that one
          is: `PageLayout title="Rollover"` above it puts the title into the dialog context and
          renders bare children on a page, so there is no heading. Two filters in a three-column
          grid, so the row is not full — which is the capture. */}
      <div className="sm:mx-0 flex-auto rounded-xl bg-layer4 lg:px-8">
        <div className="sticky top-15 z-10 grid grid-cols-2 gap-2 bg-[inherit] py-4 sm:grid-cols-3 [&>button]:bg-input_bright">
          <StatusFilter />
          <TypeFilter />
          <BonusTypeFilter />
        </div>

        <TurnoverSummary />
        <RolloverList />
      </div>
    </WalletFilterProvider>
  );
}
