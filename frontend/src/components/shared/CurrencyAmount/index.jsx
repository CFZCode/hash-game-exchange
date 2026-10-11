import { printCurrency } from '../../../utils/currency';
import { coinIcon } from '../../../utils/coinArt';

/* `k` in `CurrencyAmount-CcsyxXsB.js` — an amount, its coin mark, and two optional decorations.
 * Shared because both `/wallet/transaction` and `/wallet/rollover` put one in their Amount column.
 *
 * `sign` and `color` are each either a literal or the string `"auto"`, and `"auto"` means the same
 * test in both cases — `amount > 0`:
 *
 *   sign  "auto"  ->  a leading "+" when positive, NOTHING when negative. The minus is already in
 *                     the formatted number, so prefixing one would double it.
 *   color "auto"  ->  `text-success` when positive, `text-error` otherwise. Note the negative arm
 *                     is the FALLBACK, so a zero prints red — which is the original's behaviour and
 *                     is only reachable on a zero-value ledger row.
 *
 * `iconClass` exists so a call site can resize the mark; neither of the two does, and the default
 * `ml-1 size-4` is the template's.
 */
export default function CurrencyAmount({
  amount,
  currency,
  sign,
  color,
  className = '',
  iconClass = '',
  settings,
}) {
  const positive = Number(amount) > 0;
  const tone =
    color === 'auto'
      ? positive
        ? 'text-success'
        : 'text-error'
      : color === 'success'
        ? 'text-success'
        : color === 'error'
          ? 'text-error'
          : '';
  const prefix = sign === 'auto' ? (positive ? '+' : '') : (sign ?? '');

  return (
    <span className={`inline-flex items-center ${tone} ${className}`}>
      {prefix}
      {printCurrency(amount, currency, { settings })}
      <img className={`ml-1 size-4 ${iconClass}`} alt="coin icon" src={coinIcon(currency)} />
    </span>
  );
}
