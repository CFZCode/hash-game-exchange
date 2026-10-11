import { request } from './client';
import { PLATFORM } from './endpoints';
import { setUsdPrices } from '../data/usdPrice';
import { isFiatCode } from '../utils/currency';

/* The FX table, and the one read in this project whose result does not go to a component.
 *
 * ── WHY IT IS NOT A `useResource` ─────────────────────────────────────────────────────────
 *
 * `printCurrency` is a PURE FUNCTION called during render from most of the shell — the header
 * pill, every wallet row, the bet feed, the contest board. It cannot await a rate, and threading
 * one through as a prop would mean touching every one of those call sites. So the rate table is
 * a module cache that the formatter reads synchronously, and this module's job is to fill it
 * before anything needs it.
 *
 * That is the ORIGINAL'S OWN arrangement rather than a workaround. `index-BsFv7ByC.js` does
 * exactly this: `mt().get("/game/support/system/conf/usdPrice").then(s => n(qg(o)))` fills a
 * store, and `getUsdPrice` reads it for the rest of the page's life. `services/bonus.js` already
 * carries the same read-plus-store shape here, for the same reason — the deposit page's chip
 * ladder is computed in pure functions too.
 *
 * ── THE TABLE IS A MIXTURE WHILE THE WIRING IS PARTIAL, AND THAT IS DELIBERATE ────────────
 *
 * `setUsdPrices` OVERLAYS rather than replaces. Replacing is the cleaner shape and is what this
 * should become; it cannot be that yet because `services/swap.js` and `services/buyCrypto.js`
 * price their own fixtures through the same accessor, against catalogues of 43 and 38 coins that
 * this backend's 25 rows do not cover. Replacing would take every quote on two unwired pages to
 * zero. The note at `setUsdPrices` carries the same warning.
 *
 * ── THREE OF THE WALLET'S CURRENCIES HAVE NO RATE ─────────────────────────────────────────
 *
 * The backend answers 25 rows and its wallet is 28 columns: `NC`, `SC` and `BJB` — its own
 * platform tokens — are priced by nothing. They are left unpriced rather than given a value,
 * which is `getUsdPrice`'s own documented behaviour for an unknown currency (it answers 0, and
 * every caller is written to survive that) and is what the original does for a coin its table
 * has never heard of. The visible result is a converted line reading `$0.00` beside a real
 * balance, which is the honest rendering of "no rate" — inventing one would be the only
 * alternative, and a wrong exchange rate is the one kind of wrong number that looks right.
 */

/* Shape of a row: `{currency: "INR", usdRate: "0.01200000", lastUpdated}`.
 *
 * `usdRate` is the PRICE IN USD PER UNIT, which is the same thing bc.game's `usdPrice` carries —
 * checked against known values rather than assumed, since the two could easily have been
 * reciprocals of each other: BTC 65000, ETH 3200, INR 0.012, AED 0.27, USDT 1.
 *
 * A FIAT IS FILED UNDER BOTH KEYS. The backend answers `INR` and this shell asks for `INRFIAT`
 * — its wallet rows, its `localeCurrencyName` and `printCurrency`'s own default all use the
 * suffixed form. Writing both means a lookup from either side finds the rate, and neither
 * consumer has to know which vocabulary produced it. `isFiatCode` is the shared answer to which
 * codes get the second key; see the note there for why it is not a list kept in this file.
 */
export function toPriceTable(rows) {
  const table = {};
  for (const row of rows ?? []) {
    const code = String(row?.currency || '').toUpperCase();
    if (!code || row?.usdRate == null) continue;

    const rate = String(row.usdRate);
    table[code] = rate;
    if (isFiatCode(code)) table[`${code}FIAT`] = rate;
  }
  return table;
}

/**
 * Read the table.
 *
 * The fixture is `null` rather than the captured snapshot: with fixtures on, `usdPrice.js` IS
 * already the table, so there is nothing to overlay and `primeUsdPrices` below has nothing to do.
 * Handing back the snapshot would only mean copying it onto itself.
 */
export const getExchangeRates = () =>
  request(PLATFORM.user.exchangeRate.rates, { live: true, fixture: null });

/**
 * Fill the table, once.
 *
 * Answers whether anything changed, so a caller can re-render on the strength of it — which
 * `SessionProvider` does, because a rate that lands after the first paint reaches components
 * that have already formatted their numbers and React has no way to know the cache moved.
 *
 * A failure is swallowed. The snapshot in `usdPrice.js` is a complete, working table; falling
 * back to it is strictly better than an error boundary over the whole shell because an FX read
 * timed out, and it is what the page renders today anyway.
 */
export async function primeUsdPrices() {
  try {
    const rows = await getExchangeRates();
    if (!rows?.length) return false;

    const table = toPriceTable(rows);
    if (!Object.keys(table).length) return false;

    setUsdPrices(table);
    return true;
  } catch {
    return false;
  }
}
