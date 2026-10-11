import { request } from './client';
import ENDPOINTS from './endpoints';
import { BUY_FIATS, BUY_COINS } from '../data/buyCrypto';
import { getUsdPrice } from '../data/usdPrice';

/* `/wallet/buy` — Buy Crypto. `api-C3PVkuGZ.js` is the page's whole request module and is barely
 * minified, so every path and body below is the chunk's own.
 *
 * THE DATA SPLITS CLEANLY IN TWO, and where the split falls is the interesting part:
 *
 *   the catalogues  REAL. `/fiats/` and `/coins/` answer unauthenticated on hash.game, so all 42
 *                   fiats and 38 coins are a live response. See data/buyCrypto.js.
 *   the QUOTE       NOT recoverable. `/prices/` is a POST and answers 403 — a quote is priced for
 *                   the account placing the order, so unlike `currencyTokens` there was never any
 *                   chance of it being public. This is the one derived number on the page and the
 *                   rest of this file is about how it is derived.
 */

/* `B.getConfig` — `Promise.all([get(fiats), get(coins)])` then a `filter` on each for a truthy
   code. Both responses already satisfy the filter, so it is not repeated here; it is quoted in
   data/buyCrypto.js because it is the reason those keys can be trusted to exist.

   Returned as the chunk's own `[fiats, coins]` PAIR rather than an object, because that shape is
   what the page destructures (`a = () => config()[0]`, `o = () => config()[1]`) and because it is
   what a real answer will arrive as. */
export function getBuyCryptoConfig() {
  return request(ENDPOINTS.buyCrypto.fiats, { fixture: [BUY_FIATS, BUY_COINS] });
}

/* ── THE QUOTE ────────────────────────────────────────────────────────────────────────────────
 *
 * `B.getPriceList(source, sourceAmount, target)` -> POST `/payment/buy-crypto/prices/` -> a LIST,
 * one row per payment method, of
 *
 *   { coinAmount, spotPrice, paymentMethod, paymentMethodTitle, iconUrl, minAmount, maxAmount }
 *
 * and the page reads `[0]` and nothing else. Three of those seven fields are recovered rather than
 * invented, which is worth being precise about:
 *
 *   minAmount "30" / maxAmount "100000000"   the chunk's OWN `initialValue` for the resource. Real
 *                                            values, and the reason the field opens at 30 — the
 *                                            page seeds `sendAmount: 30`, which is that minimum.
 *   paymentMethod / Title / iconUrl ""       also the chunk's `initialValue`. Nothing on this page
 *                                            renders them; `makeOrder` is the only reader.
 *   coinAmount                               the one derived value. Below.
 *
 * HOW `coinAmount` IS DERIVED, AND WHAT IS ACTUALLY INVENTED IN IT. The capture is a single quote:
 * 30 USD buys 27.79 USDT. Both sides of that are worth $1 apiece in `data/usdPrice.js`, so the
 * pair fixes one number and one only — the provider's all-in take, 1 - 27.79/30 = 7.37%. Every
 * other pair is then that same ratio applied through the price table:
 *
 *   coinAmount = usd(sourceAmount, source) * RATE / usdPrice(target)
 *
 * So the INVENTION is the assumption that the take is flat across currencies and coins. It is
 * certainly not — a card rail charges differently per country, and a thin-book coin carries a
 * wider spread — but a flat ratio calibrated on the one observation reproduces the capture exactly
 * and stays the right order of magnitude everywhere else, which is more than a hard-coded 27.79
 * would do. One constant to delete when `/prices/` is reachable.
 *
 * `spotPrice` is the target's real USD price out of the table rather than the provider's own
 * quoted price, which the capture does not contain. Nothing renders it; it is here so the row has
 * the response's shape and not a placeholder in it.
 *
 * THE SOURCE CODE IS BARE. `sendCurrency` is "USD", not "USDFIAT" — the page strips the suffix in
 * its own `onChangeCurrency` — so the price lookup has to put it back. `printCurrency` at the call
 * site is handed the same bare code and gets away with it only because source equals target there;
 * see the note on that short-circuit in utils/currency.js.
 */
const CAPTURED_QUOTE = { source: 'USD', sourceAmount: 30, target: 'USDT', coinAmount: 27.79 };

const RATE =
  (CAPTURED_QUOTE.coinAmount * getUsdPrice(CAPTURED_QUOTE.target)) /
  (CAPTURED_QUOTE.sourceAmount * getUsdPrice(`${CAPTURED_QUOTE.source}FIAT`));

const usdValue = (amount, fiatCode) => (Number(amount) || 0) * getUsdPrice(`${fiatCode}FIAT`);

/* Eight decimal places, and this is not cosmetic. A quote is a figure the provider computed and
   sent; float noise is an artefact of computing it here, and it SHOWS — the receive box prints
   its value verbatim (`e.value = f.toFixed()` in `uT`), so 30 x 0.92633… / 1 would render as
   "27.789999999999996" in the field even though `printCurrency` tidies it to "27.79" two lines
   below in the summary. Eight is satoshi resolution, which is as fine as any row here needs. */
const quantise = (value) => Number(value.toFixed(8));

export function getBuyCryptoPrices(source, sourceAmount, target) {
  const spotPrice = getUsdPrice(target);
  const coinAmount = spotPrice ? quantise((usdValue(sourceAmount, source) * RATE) / spotPrice) : 0;

  return request(ENDPOINTS.buyCrypto.prices, {
    fixture: [
      {
        coinAmount,
        spotPrice,
        paymentMethod: '',
        paymentMethodTitle: '',
        iconUrl: '',
        minAmount: '30',
        maxAmount: '100000000',
      },
    ],
  });
}

/* `B.makeOrder(amount, chain, paymentMethod, source, target)` -> POST `/payment/buy-crypto/order/`
   -> `{ redirectUrl }`, which the page opens in the Onramper iframe popup. Authenticated, and
   there is nothing to authenticate against, so the seam exists and the button that would call it
   does not (see the note at its call site). Argument order is the chunk's. */
export function makeBuyCryptoOrder({ amount, chain, paymentMethod, source, target }) {
  return request(ENDPOINTS.buyCrypto.order, {
    method: 'POST',
    body: JSON.stringify({ amount, chain, paymentMethod, source, target }),
    fixture: null,
  });
}
