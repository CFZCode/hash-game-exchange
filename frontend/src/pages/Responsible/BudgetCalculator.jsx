import React from 'react';
import usdIcon from '../../assets/icons/USD.png';

/* Budget Calculator — the last rail row, and the only one that computes anything.
 *
 * Structure and labels from `index-CdxGH7-n.js` (`It`/`Mt`/`ue`): a `w-full rounded-lg bg-layer4
 * p-4` card holding two columns, a `h-[1px] bg-third` rule, and a `rounded-md bg-layer5 p-3`
 * total. Each row is `mt-3 flex h-5 w-full items-center justify-between font-semibold
 * text-secondary` with the label and the formatted figure as two spans, and the input sits under
 * it with the coin icon pulled to the front by `-order-1`.
 *
 * The arithmetic is the chunk's own and entirely client-side — no endpoint, nothing persisted:
 *
 *   totalIncome   = wages + pensions + benefits + other
 *   totalExpenses = rent + utility + loans + other
 *
 * The two totals are rows like any other but with `isTotal`, which in the chunk passes an
 * `onChange` that discards its argument. Reproduced as `readOnly` so the field still renders
 * identically but cannot be typed into.
 *
 * Disposable income is not in either list — it is the card below the rule, and the capture shows
 * income minus expenses.
 */

const CARD = 'Budget Calculator';

const INCOME = [
  { key: 'wages', label: 'Wages after deductions' },
  { key: 'pensions', label: 'Pensions' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'other', label: 'Other income' },
];

const EXPENSES = [
  { key: 'rent', label: 'Rent/mortgage' },
  { key: 'utility', label: 'Utility bills' },
  { key: 'loans', label: 'Loans/credit' },
  { key: 'other', label: 'Other expenses' },
];

/* The figure beside each label. Always two decimals with a leading `$`, which is what the
   capture shows on every row including the untouched ones ("$0.00"). */
const money = (n) =>
  `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* The coin is remote on the original (`imgxcut.com/coin/USD.rect.png`); the local
   `assets/icons/USD.png` is the same mark and is what the rest of this project already uses.
   `-order-1` puts it visually first while the input stays first in the DOM for tab order. */
const CoinIcon = () => <img className="-order-1 w-6" src={usdIcon} alt="" />;

function Row({ label, value, onChange, readOnly }) {
  return (
    <>
      <div className="mt-3 flex h-5 w-full items-center justify-between font-semibold text-secondary">
        <span>{label}</span>
        <span>{money(value)}</span>
      </div>
      {/* `.input mt-1.5 w-full` — the site's own input shell, which already supplies the flex
          row, the border and the `input_bright` fill, and `.input[data-disabled]` already dims
          the totals. Nothing here needs its own box styling. */}
      <div className="input mt-1.5 w-full" {...(readOnly ? { 'data-disabled': 'true' } : {})}>
        <input
          className="h-full min-w-0 flex-1 bg-transparent font-semibold text-primary outline-none"
          inputMode="decimal"
          /* `placeholder="0.00"` is the original's, but it is never seen: the field always holds
             a real value, and an untouched one is `0`. Binding `value` straight through is what
             shows the "0" the capture has — blanking it at zero would reveal the placeholder
             instead and print "0.00" in the box. */
          placeholder="0.00"
          value={value}
          disabled={readOnly}
          onChange={(e) => {
            const next = e.target.value.replace(/[^0-9.]/g, '');
            onChange(next === '' ? 0 : Number(next));
          }}
        />
        <CoinIcon />
      </div>
    </>
  );
}

function Column({ title, rows, values, onChange, totalLabel, total, className }) {
  return (
    <div className={className}>
      <p className="font-semibold">{title}</p>
      {rows.map((row) => (
        <Row
          key={row.key}
          label={row.label}
          value={values[row.key]}
          onChange={(v) => onChange(row.key, v)}
        />
      ))}
      <Row label={totalLabel} value={total} onChange={() => {}} readOnly />
    </div>
  );
}

export default function BudgetCalculator() {
  const [income, setIncome] = React.useState({ wages: 0, pensions: 0, benefits: 0, other: 0 });
  const [expenses, setExpenses] = React.useState({ rent: 0, utility: 0, loans: 0, other: 0 });

  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const totalIncome = sum(income);
  const totalExpenses = sum(expenses);

  const set = (setter) => (key, value) => setter((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="rounded-xl bg-layer4">
      {/* No `help-center-box` and no `<h2>` — unlike every other row on this page the title here
          is a plain `<p class="font-extrabold text-secondary">` inside the calculator's own card,
          and the shared document shell is not involved at all. */}
      <div className="w-full rounded-lg bg-layer4 p-4">
        <p className="font-extrabold text-secondary">{CARD}</p>
          <div className="w-full sm:mt-4 sm:flex sm:gap-8">
            <Column
              className="flex-1"
              title="Income"
              rows={INCOME}
              values={income}
              onChange={set(setIncome)}
              totalLabel="Total income"
              total={totalIncome}
            />
            <Column
              className="mt-4 flex-1 sm:mt-0 sm:w-1/2 sm:flex-none"
              title="Expenses"
              rows={EXPENSES}
              values={expenses}
              onChange={set(setExpenses)}
              totalLabel="Total expenses"
              total={totalExpenses}
          />
        </div>

        <div className="mt-4 h-[1px] w-full bg-third" />

        <div className="mt-4 w-full rounded-md bg-layer5 p-3">
          <p className="font-semibold">Disposable income</p>
          <div className="mt-2 flex items-center">
            <CoinIcon />
            <span className="ml-2 text-lg font-extrabold">{totalIncome - totalExpenses}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
