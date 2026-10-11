/* `T` in `table-DWtoUmQ7.js` — the affiliate tables' column-driven table, its own chunk on the
 * original and recovered off `hash.game/assets/` with the My Rewards pane.
 *
 * IT IS NOT `components/shared/Table`, AND THE TWO MUST NOT BE MERGED. That one is
 * `Table-Cyxc_MMr.js`, the wallet panes' list: a stack of `flex justify-between` rows whose cells
 * are written out at the call site, so a row can be an `<a>`. This one is a real `<table>` driven
 * by a `columns` array of `{title, dataIndex, render}` against a `data` array. Same word, two
 * chunks, two APIs — the same trap `IconInform` and Vault Pro's icon are documented for.
 *
 * Kept in `pages/Referral/` rather than lifted to `components/shared`, for the reason `PillTab`
 * is: the original gives it its own chunk and imports it from TWO places, but only one of those —
 * this pane — is built. `index-CC3wjKfm.js`, the Referral Codes & Friends tab, is the second
 * consumer and the day it lands this moves.
 *
 * Three things the source settles:
 *
 * - ALIGNMENT IS POSITIONAL, not per-column. `p(i)` gives the first column `text-left`, the last
 *   `text-right` and everything between `text-center`, on the header and the body alike. So a
 *   column's place in the array decides how it reads, which is why the Earned / Total Commission
 *   columns land right-aligned without asking for it.
 * - A COLUMN WITH NO `title` RENDERS NO `<th>` AT ALL — `<Show when={e.title}>` wraps the cell
 *   rather than its contents, so the header row comes up one cell short rather than blank. Every
 *   column on this pane has one; reproduced because a later one might not.
 * - `bordered` DEFAULTS TRUE and is the hairline under the header AND under every row, the same
 *   `border-b-third` on both.
 *
 * ONE DIVERGENCE, and it is React rather than taste: the original's empty state is a bare `<td
 * colspan=N>` sitting directly inside `<table>` with no row around it, which the browser renders
 * through anonymous table-box fixup. React validates DOM nesting and would warn on every render,
 * so the `<tbody><tr>` the browser would have inferred is written out. Identical rendering.
 */

const cx = (...parts) => parts.filter(Boolean).join(' ');

/* `p(t)` — and note the middle arm tests BOTH ends, so a single-column table gets `text-left`
   from the first arm and `text-right` from the last, in that source order. */
const align = (index, count) =>
  index === 0 ? 'text-left' : index === count - 1 ? 'text-right' : 'text-center';

/* NO COLUMN WIDTHS, WHICH IS THE CHUNK'S OWN STATE and is worth defending, because two attempts
 * at overriding it have been made and reverted. The table is `w-full` with no `table-layout`, so
 * Chrome sizes every column from its content and then distributes the leftover — unequally, and by
 * a rule that depends on each cell's exact text. That makes the layout a pure function of the row
 * data, which is a good property: a call site whose rows match the capture's matches the original
 * without anything here being tuned.
 *
 * Do not "fix" a column that sits a few pixels off by widening the cell padding or by pinning a
 * `<colgroup>`. The first moves the middle columns by an amount that is itself content-dependent,
 * so it approximates rather than matches. The second is exact but needs percentages measured off
 * a screenshot, and that measurement did not survive checking — see the note at the Referral Codes
 * call site. Correct the ROW instead; that is where any real difference lives.
 */
export default function DataTable({ columns, data, empty, bordered = true, className = '' }) {
  const rule = bordered ? 'border-b border-solid border-b-third' : '';

  return (
    <table className={cx(className, 'w-full')}>
      <thead>
        <tr className={rule}>
          {columns.map((column, index) =>
            column.title ? (
              <th
                key={column.dataIndex}
                className={cx(
                  'px-3 py-2 align-middle text-xs font-semibold leading-none text-secondary',
                  column.class,
                  align(index, columns.length)
                )}
              >
                {column.title}
              </th>
            ) : null
          )}
        </tr>
      </thead>

      {data?.length > 0 ? (
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex} className={rule}>
              {columns.map((column, index) => (
                <td
                  key={column.dataIndex}
                  className={cx(
                    'px-3 py-2 align-middle leading-none',
                    align(index, columns.length)
                  )}
                >
                  {column.render ? column.render(row[column.dataIndex], row) : row[column.dataIndex]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      ) : (
        <tbody>
          <tr>
            <td colSpan={columns.length}>{empty}</td>
          </tr>
        </tbody>
      )}
    </table>
  );
}
