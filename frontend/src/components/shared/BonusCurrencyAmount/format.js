import { getCurrency } from '../../../data/currencies';
import { getAlias, convertCurrency } from '../../../utils/currency';

/* `X` (exported `B`) in `bonus-currency-amount-CgQhatqc.js` — the bonus family's money component,
 * and it is NOT `CurrencyAmount`. That one (`R` in claimable-item-detail) is a coin mark beside a
 * figure; this one is the figure alone, SPLIT INTO THREE SPANS so the digits can truncate while
 * the symbol and the ticker stay legible.
 *
 * `Y` is the split and is ported whole, because every part of it is load-bearing:
 *
 *   · THE TARGET IS THE ACCOUNT'S DISPLAY CURRENCY unless the call site names one, so a figure
 *     stored in one currency is converted before it is formatted. `e === r` short-circuits the
 *     conversion, which is the same guard `printCurrency` needed.
 *   · PRECISION IS DECIDED BY THE TARGET, not by the source: a fiat target takes CLDR's own
 *     `maximumFractionDigits` for that code (2 for most, 0 for IDR — and node's ICU disagrees
 *     with Chrome about that one; trust the browser, as `utils/currency.js` records), a crypto
 *     target takes 7.
 *   · `formatToParts` is what makes the split possible. The first and last parts that are
 *     NUMERIC (`integer`, `group`, `decimal`, `fraction`, the two signs) bound the digits;
 *     everything before them is the prefix — a currency symbol — and everything after is the
 *     suffix. A crypto target has no symbol either side, so the ticker is appended by hand.
 *   · ROUNDING IS TRUNCATION throughout, and a non-zero amount that truncates to nothing prints
 *     `< 0.0000001` rather than `0` — the prefix carries the `<` so the sign never gets separated
 *     from its number by the truncation.
 *
 * NOT PORTED: the ResizeObserver that measures the digits against their box and, when they
 * overflow, wraps the whole thing in the site's tooltip showing the full string. This build has
 * no tooltip primitive, and the visible result is identical until an amount is wide enough to
 * clip — at which point the original offers the full figure on hover and this does not. The
 * `truncate` that does the clipping is the same either way.
 */

const NUMERIC = ['integer', 'group', 'decimal', 'fraction', 'minusSign', 'plusSign'];

const fiatDigits = (code, lang) => {
  try {
    return (
      new Intl.NumberFormat(lang, { style: 'currency', currency: code.replace('FIAT', '') })
        .resolvedOptions().maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
};

export function splitAmount(currency, amount, target, lang = 'en-US') {
  try {
    const to = target ?? currency;
    const isFiat = getCurrency(to)?.currencyType === 'FIAT';

    const digits = isFiat ? fiatDigits(to, lang) : 7;
    const smallest = 10 ** -digits;
    const smallestText = digits === 0 ? '1' : `0.${'0'.repeat(digits - 1)}1`;

    const raw = Number(amount) || 0;
    const converted = currency === to ? raw : convertCurrency(raw, currency, to);
    const factor = 10 ** digits;
    const value = Math.trunc(converted * factor) / factor;

    const formatter = isFiat
      ? new Intl.NumberFormat(lang, {
          style: 'currency',
          currency: to.replace('FIAT', ''),
          roundingMode: 'trunc',
        })
      : new Intl.NumberFormat(lang, {
          style: 'decimal',
          roundingMode: 'trunc',
          maximumFractionDigits: digits,
        });

    const parts = formatter.formatToParts(value);
    const first = parts.findIndex((part) => NUMERIC.includes(part.type));
    let last = -1;
    parts.forEach((part, index) => {
      if (NUMERIC.includes(part.type)) last = index;
    });

    const text = (slice) => slice.map((part) => part.value).join('');
    const prefix = first <= 0 ? '' : text(parts.slice(0, first));
    const digitsText = first === -1 ? text(parts) : text(parts.slice(first, last + 1));
    let suffix = first === -1 ? '' : text(parts.slice(last + 1));
    if (!isFiat) suffix += ` ${getAlias(to)}`;

    if (Math.abs(raw) > 0 && Math.abs(value) < smallest) {
      return { prefix: `< ${prefix}`, amount: smallestText, suffix };
    }
    return { prefix, amount: digitsText, suffix };
  } catch {
    return { prefix: '', amount: '0', suffix: '' };
  }
}
