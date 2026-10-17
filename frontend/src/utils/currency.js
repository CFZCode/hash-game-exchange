/* `printCurrency`, the site's own amount formatter, ported whole.
 *
 * The original is a method on the currency service in `index-BsFv7ByC.js`:
 *
 *   printCurrency(t, e = "USDFIAT", n) {
 *     const r = xe.setting.enableLocaleCurrency,
 *           i = typeof n == "number" ? { precision: n } : n || {},
 *           { precision: s = 7,
 *             target: o = r ? xe.setting.localeCurrencyName : e,
 *             hasAlias: a = !0,
 *             minDecimals: c } = i,
 *           l = a ? ` ${getAlias(o)}` : "",
 *           u = e === o ? t : this.convertCurrency(t, e, o),
 *           { num: f, exp: h, unit: d } = dd(u.toNumber(), s), p = new Big(f);
 *     if (o.endsWith("FIAT")) return this.toFiatStr(p, o, lang) + d;
 *     const g = h > 1 ? 2 : s;
 *     let m = h > 1  ? p.toFixed(2, ROUND_DOWN)
 *           : f < 1  ? trimZeros(p.toFixed(s, ROUND_DOWN))
 *                    : trimZeros(p.toPrecision(s + 1, ROUND_DOWN));
 *     return new Intl.NumberFormat(lang, { style: "decimal", roundingMode: "trunc",
 *              minimumFractionDigits: c ?? 0,
 *              maximumFractionDigits: Math.max(Math.min(g, 20), c ?? 0) }).format(Number(m))
 *            + (h > 1 ? d : "") + l
 *   }
 *
 * FOUR THINGS ABOUT IT THAT ARE EASY TO GET WRONG, all of them visible somewhere in this build:
 *
 * 1. THE SECOND ARGUMENT IS THE SOURCE, NOT THE DISPLAY CURRENCY. What gets printed is `target`,
 *    and `target` is `setting.localeCurrencyName` whenever `enableLocaleCurrency` is on — so an
 *    account holding BCD with that switch on prints dollars. That is exactly what the signed-in
 *    header capture shows: a BCD coin beside "$0.00", and this build reproduces it — see
 *    `convert` below, which stopped being a no-op once `data/usdPrice.js` landed.
 *
 * 2. A `*FIAT` TARGET GOES THROUGH `Intl.NumberFormat(style: "currency")` on the code with the
 *    suffix stripped, and DOES NOT PIN `maximumFractionDigits` — CLDR chooses. This is what makes
 *    the referral ticker's rows look inconsistent when they are not: en-US spells IDR as its code
 *    with no decimals and INR as its symbol with two. NODE DISAGREES WITH THE BROWSER HERE
 *    (node 24's ICU 77 answers 2 for IDR, Chrome answers 0), so a check run under node will read
 *    as a mismatch against the capture when the browser is right.
 *
 * 3. `hasAlias` DEFAULTS TO TRUE, so a crypto amount carries its ticker: "128.4032 BCD". Call
 *    sites that show a coin image instead pass `hasAlias: false` — the referral ticker does.
 *
 * 4. `roundingMode: "trunc"` throughout. The original never rounds a balance up.
 *
 * `dd`, the compact-notation splitter the `h > 1` branch turns on, is ported verbatim below.
 */

import { getCurrency } from '../data/currencies';
import { getUsdPrice } from '../data/usdPrice';

/* `O5`, the unit table, verbatim — and note it runs in BOTH directions. The three negative
   entries exist for the token prices this build never shows, but they are what makes the second
   element a POWER rather than an index, which matters: `printCurrency` tests `exp > 1`, and the
   no-compaction case returns `exp: 1`, not 0. */
const UNITS = [
  ['B', 9],
  ['M', 6],
  ['K', 3],
  ['', 1],
  ['m', -3],
  ['μ', -6],
  ['n', -9],
];

/* `dd(t, e = 6)`, verbatim:
 *
 *   const n = t.toExponential(e), [, r] = n.split("e").map(Number);
 *   if (r > e) { const i = Math.max(3 - Math.ceil((r - e) / 3), 0), [s, o] = O5[i];
 *                return { num: o === 1 ? t : t * 10 ** -o, exp: o, unit: s } }
 *   else return { num: t, exp: 1, unit: "" }
 *
 * THE THRESHOLD IS THE PRECISION, NOT A ROUND NUMBER OF DIGITS. Called from `printCurrency` with
 * its default `precision: 7`, nothing compacts until the decimal exponent passes 7 — so a balance
 * stays fully written out until 10^8, and 1,250,000 prints as "1,250,000" rather than "1.25M".
 * That reads like a bug and is not; it is what keeps a seven-significant-digit crypto balance
 * exact instead of rounding it to two decimals.
 */
function compact(value, precision) {
  const n = Number(value) || 0;
  const [, r] = n.toExponential(precision).split('e').map(Number);
  if (r > precision) {
    const i = Math.max(3 - Math.ceil((r - precision) / 3), 0);
    const [unit, power] = UNITS[i];
    return { num: power === 1 ? n : n * 10 ** -power, exp: power, unit };
  }
  return { num: n, exp: 1, unit: '' };
}

/* `Mo` — trailing-zero trim. `toFixed`/`toPrecision` pad, and the original strips the padding
   before handing the string to Intl. */
const trimZeros = (s) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);

/* `getAlias`, verbatim:
 *
 *   getAlias(t) { return fo.currency[t]?.aliasCurrencyName || t }
 *
 * — the ticker printed after a crypto amount, and it is a LOOKUP, not a transformation. This
 * used to be `currency.replace(/FIAT$/, '')`, which is right for every currency whose alias is
 * its own id and wrong for the four where it is not: KLAY prints KAIA, TON prints GRAM, UST
 * prints USTC, TOMO prints VIC. The catalogue that settles it arrived with the wallet dropdown
 * — see `data/currencies.js`. The old strip stays as the fallback for anything the catalogue
 * does not carry, which is one step kinder than the original's bare `|| t`. */
export const getAlias = (currency) =>
  getCurrency(currency)?.aliasCurrencyName || currency.replace(/FIAT$/, '');

/**
 * Is a BARE currency code one this site keys as a fiat?
 *
 * `isFiatCode('INR')` is true and its wallet row is `INRFIAT`; `isFiatCode('BTC')` is false and
 * its row is `BTC`. The answer comes from the catalogue's own `currencyType`, which is what the
 * currency dropdown groups on, rather than from a hand-kept list — 324 rows, generated from a
 * live response, and the one place this project already records what a currency IS.
 *
 * It lives here because two unrelated modules need the same answer and a second copy of it would
 * drift: `services/auth.js` turns a backend wallet's `INR` into an `INRFIAT` row, and
 * `services/exchangeRate.js` files that backend's `INR` rate under both keys so a lookup from
 * either side finds it. A backend that keys its money by bare code is why the question exists at
 * all — bc.game's own payloads never ask it, because they send `INRFIAT` already.
 */
export const isFiatCode = (code) =>
  getCurrency(`${String(code || '').toUpperCase()}FIAT`)?.currencyType === 'FIAT';

/* A bare API code ("INR", "usdt") → this build's wallet key ("INRFIAT", "USDT"); a key already
   in that shape is kept. The FX table is keyed by wallet keys, so a bare fiat code has no price
   and would convert to 0 (the `selected-currency` skill). Empty → USDT. */
export const walletCode = (code) => {
  const upper = String(code || '').trim().toUpperCase();
  if (!upper) return 'USDT';
  if (upper.endsWith('FIAT')) return upper;
  return isFiatCode(upper) ? `${upper}FIAT` : upper;
};

/* `toFiatStr`. Two things: deliberately no `maximumFractionDigits` (see note 2 above), and the
   ISO code comes from STRIPPING the suffix rather than from `getAlias` — `e = e.replace(/FIAT$/,
   "")` is what the original writes, and the two stopped being the same function the moment
   `getAlias` started reading the catalogue. Intl wants the code, not the display alias.

   Exported for the fiat deposit tab's quick-amount chips, which call `Ct.toFiatStr` directly
   rather than going through `printCurrency` — `dC` in index-C1xohM7W.js branches on the
   currency type and picks `toFiatStr` or `toCryptoStr` itself. */
export const toFiatStr = (value, target, lang = 'en-US') =>
  new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: target.replace(/FIAT$/, ''),
  }).format(Number(value));

/* `convertCurrency(t, e, n = "USD")`, verbatim:
 *
 *   const r = this.getUsdPrice(n) || Ju;
 *   return r.eq(0) ? Ju : t.mul(this.getUsdPrice(e)).div(r)
 *
 * THIS USED TO BE A DOCUMENTED NO-OP AND IS NOW THE REAL THING. It was the one part of
 * `printCurrency` that could not be ported: it multiplies through a live rate table, and there
 * was neither a feed nor a captured response to stand in — so a cross-currency call printed its
 * SOURCE amount under the TARGET's symbol, which is a lie that looks like a number, and the
 * account fixture kept `enableLocaleCurrency` off to avoid ever taking this path.
 * `data/usdPrice.js` closed that hole: the path is named in the same bundle and `hash.game`
 * answers it unauthenticated. Read the note there about the snapshot going stale.
 *
 * The unknown-currency behaviour is the original's and cuts both ways: an unpriced SOURCE
 * converts to 0, while an unpriced TARGET returns 0 rather than dividing by it. USD is only ever
 * a valid target because the fetch hook writes it into the table by hand. */
export const convertCurrency = (value, from, to = 'USD') => {
  const target = getUsdPrice(to);
  return target === 0 ? 0 : ((Number(value) || 0) * getUsdPrice(from)) / target;
};

const convert = convertCurrency;

/* `amount2usd(t, e) { return t.mul(this.getUsdPrice(e)) }` — the same multiplication with the
   division skipped. Exported because its two callers, the wallet dropdown's row sort and its
   Hide Small threshold, are both outside this file. */
export const amount2usd = (value, currency) => (Number(value) || 0) * getUsdPrice(currency);

export function printCurrency(amount, currency = 'USDFIAT', options = {}) {
  const opts = typeof options === 'number' ? { precision: options } : options || {};
  const {
    precision = 7,
    /* The caller may force a target; otherwise the account's own setting decides. `settings` is
       this port's one signature change — the original reads the global store directly, and a
       React component has to be handed it. */
    settings = {},
    hasAlias = true,
    minDecimals,
  } = opts;

  const target =
    opts.target ??
    (settings.enableLocaleCurrency ? settings.localeCurrencyName || 'USDFIAT' : currency);

  const lang = settings.lang || 'en-US';
  const alias = hasAlias ? ` ${getAlias(target)}` : '';
  /* `u = e === o ? t : this.convertCurrency(t, e, o)` — SOURCE EQUAL TO TARGET SKIPS THE TABLE
     ENTIRELY, and that short-circuit is not an optimisation. It was missing here and went
     unnoticed for as long as every call site passed a currency the price table happens to carry,
     where `v * p / p` is the identity. The buy-crypto page is the first that does not: its
     summary prints `printCurrency(amount, "USD", { target: "USD" })` with the BARE fiat code —
     the store keys fiats as `USDFIAT`, so `getUsdPrice("USD")` is 0 for every fiat but USD (which
     the fetch hook writes in by hand), the divide-by-zero guard returns 0, and "30 INR" rendered
     as "0 INR". Nothing converts when there is nothing to convert to. */
  const value = currency === target ? Number(amount) || 0 : convert(Number(amount) || 0, currency, target);
  const { num, exp, unit } = compact(value, precision);

  if (target.endsWith('FIAT')) return toFiatStr(num, target, lang) + unit;

  const max = exp > 1 ? 2 : precision;
  const text =
    exp > 1
      ? num.toFixed(2)
      : Math.abs(num) < 1
        ? trimZeros(num.toFixed(precision))
        : trimZeros(num.toPrecision(precision + 1));

  const min = minDecimals ?? 0;
  return (
    new Intl.NumberFormat(lang, {
      style: 'decimal',
      roundingMode: 'trunc',
      minimumFractionDigits: min,
      maximumFractionDigits: Math.max(Math.min(max, 20), min),
    }).format(Number(text)) +
    (exp > 1 ? unit : '') +
    alias
  );
}
