import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { SWAP_CONFIG } from '../data/swapConfig';
import { getUsdPrice } from '../data/usdPrice';
import { getCurrency } from '../data/currencies';
import { walletCode } from '../utils/currency';
import { isCurrencyListed, enabledCurrencies } from './currencies';

/* `/wallet/swap`. `api-CW_rj_H1.js` is the page's whole request module and is barely minified, so
 * the four paths and their POST bodies are the chunk's own.
 *
 *   config   GET  /game/support/swap/config/   ANSWERS UNAUTHENTICATED -> data/swapConfig.js
 *   price    POST /game/support/swap/price/    403
 *   trade    POST /game/support/swap/trade/    authenticated; not called
 *   history  POST /game/support/swap/history/  paged; this page never calls it
 *
 * `config` is a `game/support` path, which is the family that keeps answering — `usdPrice`,
 * `index/minimal`, `currencyTokens` and now this. It carries the coin list, the base fee, the USD
 * band and three tiers of fee override, all live.
 *
 * ── THE PRICE RESPONSE IS 403 AND IS RECONSTRUCTED RATHER THAN INVENTED ───────────────────────
 *
 * That is the part worth reading, because it came out better than the buy-crypto quote did. The
 * page reads exactly three fields off `/price/`:
 *
 *   const { fromCurrencyPrice: D, toCurrencyPrice: P, f: k } = response
 *   const rate = new Big(D).div(P).toNumber()
 *
 * — two USD prices and a fee rate. Both halves already exist here as real data:
 *
 *   fromCurrencyPrice / toCurrencyPrice   `data/usdPrice.js`, the live `system/conf/usdPrice`
 *                                         table. Every one of the 43 swappable coins is in it.
 *   f                                     the config's own fee tables, below.
 *
 * SO THE RATE IS NOT A GUESS. And it is checkable: the capture reads "1 USDT ≈ 1 BCD" with a swap
 * fee of "0 USDT", and the table prices USDT at 1 and BCD at exactly 1 while `exchangeTrade`
 * carries `{tradePair: "USDT_BCD", fee: 0}`. Both halves of the capture fall out of two live
 * responses fetched with no reference to the screenshot — the same kind of confirmation the
 * withdraw page's "Min: 204 BCD" gave.
 *
 * The one caveat is the one `usdPrice.js` already documents: every crypto row is a spot price
 * frozen on the day it was pulled, so a BTC/ETH rate here is that day's, not today's.
 */

export function getSwapConfig() {
  return request(ENDPOINTS.swap.config, { fixture: SWAP_CONFIG });
}

/* ── RESOLVING `f`, AND THE ONE THING THAT IS INFERRED ─────────────────────────────────────────
 *
 * The config offers three sources for a pair's fee and the server picks between them:
 *
 *   exchangeTrade   `{tradePair: "USDT_BCD", fee: 0}` — an exact FROM_TO pair. The fiat rows are
 *                   written `"RUBFIAT_"` with an empty TO half, which can only mean "from this
 *                   currency to anything", so the table is matched twice: exact, then FROM_.
 *   specialExchange `{currencyName: "BTC", fee: 0.03, …}` — per currency, and note it also
 *                   carries `supportFrom`/`supportTo`, so it is a record about a currency rather
 *                   than about a direction.
 *   fee             "0.015", the base.
 *
 * WHICH ORDER THEY RESOLVE IN IS THIS PROJECT'S READING, and it is the only inferred thing on the
 * page — the server does the resolution and returns the answer, and `/price/` is shut. Most
 * specific first is the obvious reading and is what is implemented. The capture cannot arbitrate:
 * USDT_BCD is 0 in `exchangeTrade`, USDT's `specialExchange` fee is the base 0.015, and the
 * capture's swap amount is 0, so every ordering prints "0 USDT" either way.
 *
 * `specialExchange` is keyed on the FROM currency here. It could as easily be the TO currency —
 * `toMinUsd`/`toMaxUsd` sit in the same record — but the fee is charged on what you spend, and
 * `Sw`'s own fee row multiplies the rate by `fromAmount` in the FROM currency, so the from side
 * is the reading that matches how the figure is displayed.
 */
export function swapFeeRate(from, to) {
  const exact = SWAP_CONFIG.exchangeTrade.find((row) => row.tradePair === `${from}_${to}`);
  if (exact) return exact.fee;

  const anyTo = SWAP_CONFIG.exchangeTrade.find((row) => row.tradePair === `${from}_`);
  if (anyTo) return anyTo.fee;

  const special = SWAP_CONFIG.specialExchange.find((row) => row.currencyName === from);
  if (special) return special.fee;

  return Number(SWAP_CONFIG.fee);
}

/* The platform keys its money by BARE code where this shell keys fiats with the suffix, so every
   currency crossing the seam is stripped. `aliasCurrencyName` on a wallet row is the same value;
   this is the string form, for a page that holds `currencyName` and nothing else. */
const bare = (currency) => String(currency || '').replace(/FIAT$/, '');

export function getSwapPrice(from, to) {
  /* THE ESTIMATE IS PRICED ON AN AMOUNT AND THIS ASKS FOR ONE, which is a smaller thing than it
     looks. The rates and the fee rate do not vary with the size of the swap — `feeRateFor` is a
     per-currency table and the rates are the FX table — so a nominal 1 buys the three fields this
     function has always returned, and the page goes on doing its own arithmetic from them.

     Passing the TYPED amount instead would be more faithful to the endpoint and worse here: the
     read is keyed on the pair, so threading the amount through would refetch on every keystroke
     for a quote whose rate cannot have moved. The estimate's own `converted` and `feeAmount` are
     therefore unused; they were checked against the page's arithmetic and agree
     (1000 INR at 0.012, 15% off, into BTC at 65000 gives the response's own 0.00015692).

     A SELF-SWAP IS A 422 THERE, where bc.game's `/price/` answers happily. The page cannot open on
     one — `Ye` picks the TO side as the first coin that is not the FROM one — but a wallet with a
     single currency has no second coin to pick, so the guard is here rather than left to the
     server: the same-pair read answers the null quote the page already renders as "no rate yet". */
  if (!from || !to || bare(from) === bare(to)) {
    return { fromCurrencyPrice: '0', toCurrencyPrice: '0', f: '0' };
  }

  /* THE PATH IS THE PLATFORM'S AND THE FIXTURE IS bc.game-SHAPED, which is the first place in this
     wiring where one `request` cannot serve both: bc.game's is
     `POST /game/support/swap/price/ {fromCurrencyName, toCurrencyName, swapType}` answering three
     fields, and the platform's is a GET with query parameters answering nine. The path recorded in
     `ENDPOINTS.swap.price` is still the original's and is still what that map is for.

     `toQuote` normalises, and the branch on `.then` is the same one `getSessions` makes — with
     fixtures on the answer is already in this shell's shape and must not be run through it. */
  const answer = request(PLATFORM.user.swap.estimate, {
    live: true,
    params: { fromCurrency: bare(from), toCurrency: bare(to), amount: '1' },
    fixture: {
      fromCurrencyPrice: String(getUsdPrice(from)),
      toCurrencyPrice: String(getUsdPrice(to)),
      f: String(swapFeeRate(from, to)),
    },
  });

  return answer && typeof answer.then === 'function' ? answer.then(toQuote) : answer;
}

/** The platform's estimate onto the three fields this page has always read. */
function toQuote(estimate) {
  if (!estimate) return { fromCurrencyPrice: '0', toCurrencyPrice: '0', f: '0' };

  return {
    fromCurrencyPrice: String(estimate.usdRateFrom ?? 0),
    toCurrencyPrice: String(estimate.usdRateTo ?? 0),
    /* Already a fraction on both sides — bc.game's `f` is `0.015` for 1.5% and the platform's
       `feePercentage` is `0.15` for 15%, so nothing is scaled here. The name is the trap: a field
       called `feePercentage` holding 0.15 reads as a sixth of a percent. */
    f: String(estimate.feePercentage ?? 0),
  };
}

/* `exchangeToCurrency` — a per-currency override of the USD band, one entry (BCL, floor $0.10
   against the global $1). The chunk reads only `config.exchangeMinUsd` / `exchangeMaxUsd` when it
   computes the form's limits, so this table is not consulted anywhere on the page and the helper
   exists so the data is not silently dropped. `specialExchange`'s `toMinUsd`/`toMaxUsd` are a
   third band and are likewise unread by the page. */
export const usdBandFor = (currencyName) => {
  const row = SWAP_CONFIG.exchangeToCurrency.find((entry) => entry.currencyName === currencyName);
  return {
    min: Number(row?.exchangeMinUsd ?? SWAP_CONFIG.exchangeMinUsd),
    max: Number(row?.exchangeMaxUsd ?? SWAP_CONFIG.exchangeMaxUsd),
  };
};

/* `He` in the chunk, and the whole of the form's arithmetic. The band is in DOLLARS and is turned
 * into a coin count by dividing by the from-currency's USD price, floored at 8dp:
 *
 *   const balance = wallet[from]?.generalAmount ?? 0
 *   const min = Big(exchangeMinUsd).div(fromPrice).toDP(8, ROUND_DOWN)
 *   let   max = Big(exchangeMaxUsd).div(fromPrice).toDP(8, ROUND_DOWN)
 *   balance <= min ? amount = balance
 *   : amount <= min ? amount = min
 *   : amount > max  ? amount = max
 *   : amount > balance && (amount = balance)
 *   max = Math.min(balance, max)
 *
 * THE FIRST BRANCH IS WHY THE CAPTURE SHOWS ZERO IN BOTH BOXES: a balance at or under the minimum
 * clamps the amount to the balance itself rather than to the minimum, so an empty wallet opens at
 * 0 and the Swap Now button is disabled. Note `max` is also floored at the balance, which is what
 * makes the 25/50/75/100% buttons percentages OF THE BALANCE rather than of the $100,000 ceiling.
 */
export function swapLimits({ amount, from, fromPrice, balance }) {
  const price = Number(fromPrice) || 0;
  const band = usdBandFor(from);

  /* At the coin's own places, min rounded UP so it still clears the band: ₹83.34, not 83.33333333. */
  const scale = 10 ** Math.min(getCurrency(walletCode(from))?.precisionUnit ?? 8, 8);
  const min = price ? Math.ceil(Number(((band.min / price) * scale).toFixed(6))) / scale : 0;
  let max = price ? Math.floor(Number(((band.max / price) * scale).toFixed(6))) / scale : 0;

  let next = amount;
  if (balance <= min) next = balance;
  else if (next <= min) next = min;
  else if (next > max) next = max;
  else if (next > balance) next = balance;

  max = Math.min(balance, max);
  return { min, balance, max, amount: next };
}

/* `K.swapSubmit(from, to, fromAmount)` -> POST `/game/support/swap/trade/` -> the completed order,
   which the page turns into a "Swap Completed" popup. Authenticated, and the button that would
   call it is disabled with this wallet in any case. The seam exists; see the call site. */
export function submitSwap(from, to, fromAmount) {
  return request(PLATFORM.user.swap.trade, {
    live: true,
    method: 'POST',
    /* The platform's body, and the bc.game one it replaces is
       `{fromCurrencyName, toCurrencyName, fromCurrencyAmount}` at `ENDPOINTS.swap.trade`. Bare
       codes, and `amount` as a decimal string — the validator is `.strict()`, so an extra field
       is a 422 rather than something quietly ignored. */
    json: {
      fromCurrency: bare(from),
      toCurrency: bare(to),
      amount: String(fromAmount),
    },
    fixture: null,
  });
}

/**
 * Which currencies the page offers, on both sides of the pair.
 *
 * ── THE PLATFORM PUBLISHES NO LIST, AND `swap/balances` IS NOT ONE ────────────────────────
 *
 * bc.game answers `/swap/config/` with 43 swappable coins and the page shows their intersection
 * with the wallet — `config.list.filter(c => wallet[c] && wallet[c].amount >= 0)`, and note the
 * `>= 0`: a coin you hold NONE of is still offered, because you have to be able to swap INTO it.
 *
 * The platform has no config endpoint at all. It does have `GET /user/swap/balances`, which is
 * the obvious candidate and is the wrong one — it returns only the currencies you actually hold
 * (`{INR: "10000.00000000"}` on the demo account), so wiring it would drop every coin you could
 * swap into and leave a one-row picker. What the platform really allows is its `currency`
 * validator's allow-list, which is the same 28 codes its wallet carries. So THERE, THE WALLET IS
 * THE LIST.
 *
 * That is why this branches on the flag rather than intersecting: bc.game's list is crypto-only
 * and shares few codes with the platform's 28, so an intersection would hide **INR** — the demo
 * account's only funded currency and the one coin the page must be able to spend.
 */
export function swapOptions(config, balances) {
  const wallet = new Map(balances.map((coin) => [coin.currencyName, coin]));

  if (!USE_FIXTURES) return balances.map((coin) => coin.currencyName);

  /* And the owner's coin list (`services/currencies.js`), which is `null` — every coin — in
     fixture mode; the live arm above already reads a wallet that list has cut. */
  const listed = enabledCurrencies();
  return config.list.filter(
    (code) => wallet.has(code) && Number(wallet.get(code).amount) >= 0 && isCurrencyListed(listed, code),
  );
}
