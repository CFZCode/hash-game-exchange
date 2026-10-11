import Loading from '../Loading';

/* `E` and `d` in `Table-Cyxc_MMr.js` — the wallet panes' list table, and its own chunk on the
 * original. Two consumers here, `/wallet/transaction` and `/wallet/rollover`, which is what moved
 * it out of the first of them.
 *
 * IT IS NOT A `<table>`. Every row is `flex justify-between` over four `flex-1` cells, which is
 * what puts the first column's text at the left of its quarter, the middle two centred and the
 * last right-aligned — and it is why a row can be an `<a>` when it links somewhere, which two of
 * the five transaction lists need.
 *
 * The header's default class is `mt-3 flex flex-none justify-between rounded-xl px-4 py-3` over
 * `isDialog ? "bg-layer3" : "bg-layer2"`. Both wallet consumers are only ever a page on a desktop,
 * so `bg-layer2` is what renders — DARKER than the `bg-layer4` card it sits in, which reads as
 * inverted until you notice the card is the lighter surface here. A call site can replace the
 * whole thing with `headerClass`, as the original's `headerClass ?? clsx(...)` allows.
 *
 * Partly ported: the infinite-scroll body. `E` wraps its rows in the site's paging list, with a
 * `Loading` at 72px for the FIRST page and a `noMore` sentinel at the end. Neither wallet pane can
 * page anything — every feed behind them is authenticated — so the pager and the sentinel go in
 * when a feed does, but the first-page arm is real and is the `loading` prop below: 72px is the
 * original's own height for it, which is also close enough to one row's 56 that a table whose
 * feed answers with a single row barely moves when it lands.
 */

/* `d`, `d.Start`, `d.End`, `d.Center` — one cell, and the four variants are the original's own
   compositions rather than free-form classes. `Start`/`End` add `flex-col` because a cell that
   stacks two lines (a type over its timestamp) has to align them as a column. */
export const CELL = 'ellipsis flex flex-1 items-center p-4 text-base font-extrabold';
export const CELL_START = `${CELL} flex-col !items-start`;
export const CELL_END = `${CELL} flex-col !items-end`;
export const CELL_CENTER = `${CELL} justify-center`;

/* The header cells. Three widths, and which one a column takes is read off each list's own desktop
   header arm rather than assumed from the first — the transaction pane's Swap list, for one, ends
   on `Swap To` where its siblings end on `Status`. */
export const HEAD = 'flex-1';
export const HEAD_CENTER = 'flex-1 text-center';
export const HEAD_END = 'flex-1 text-right';

export default function Table({ columns, headerClass, loading, children }) {
  return (
    <>
      <div
        className={
          headerClass ??
          'mt-3 flex flex-none justify-between rounded-xl bg-layer2 px-4 py-3'
        }
      >
        {columns.map(([label, cls]) => (
          <div key={label} className={cls}>
            {label}
          </div>
        ))}
      </div>
      {/* The first page in flight. It replaces the body rather than sitting under it, which is
          what the original does — its paging list renders the spinner INSTEAD of the row list
          until the first response lands, and only appends it below the rows for page two on. */}
      {loading ? (
        <div className="center h-[72px]">
          <Loading />
        </div>
      ) : (
        children
      )}
    </>
  );
}
