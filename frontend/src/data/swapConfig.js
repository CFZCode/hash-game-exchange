/* GENERATED — do not hand-edit. Regenerate from the live response; the recipe is at the bottom.
 *
 * `GET /game/support/swap/config/` — and it ANSWERS UNAUTHENTICATED on hash.game, which is the
 * whole reason `/wallet/swap` could be built on evidence. That is the `game/support` family again
 * (`usdPrice`, `index/minimal`, `currencyTokens` are the others), and it now has a fourth member.
 * The path is read out of `api-CW_rj_H1.js`, the page's own request module.
 *
 * The chunk's resource declares its `initialValue` as
 * `{exchangeMaxUsd, exchangeMinUsd, exchangeTrade, list, specialExchange}` — five keys. The real
 * response carries TWO MORE, `fee` and `exchangeToCurrency`, and both are kept below: `fee` is the
 * base rate every pair falls back to, and without it the fee row could not be derived at all.
 *
 * ── WHAT EACH PIECE IS ────────────────────────────────────────────────────────────────────────
 *
 *   list                43 currencies the swap desk deals in. The page does NOT show all of them —
 *                       it intersects this with the wallet (`config.list.filter(c => wallet[c] &&
 *                       wallet[c].amount >= 0)`), so a coin you cannot hold is not offered.
 *   fee                 "0.015", the base rate.
 *   exchangeMinUsd/Max  "1" / "100000". The form's minimum and maximum are these
 *                       DIVIDED BY the from-currency's USD price, floored at 8dp — so they are a
 *                       dollar band, not a coin count.
 *   exchangeTrade       per-PAIR fee overrides, `FROM_TO`. Note the fiat rows are written
 *                       `"RUBFIAT_"` with an empty TO half, i.e. "from this currency to anything".
 *   exchangeToCurrency  a per-currency min/max override. One entry, BCL, which drops the floor
 *                       from $1 to $0.10.
 *   specialExchange     per-currency `{toMinUsd, toMaxUsd, supportFrom, supportTo, fee}`. Note
 *                       BTC's fee is 0.03 against the 0.015 base, and INRFIAT's is 0.3.
 *
 * ── THE ONE THING THAT IS INFERRED ────────────────────────────────────────────────────────────
 *
 * Which of the three fee sources wins. The server resolves it and returns the answer as `f` on
 * `/swap/price/`, which is authenticated — so the VALUES here are all live and only the PRECEDENCE
 * is this project's reading. `services/swap.js` applies most-specific-first (exact pair, then
 * `FROM_`, then the from-currency's `specialExchange`, then the base) and says so at the call site.
 * The capture's own pair does not discriminate between them: USDT_BCD is 0 in `exchangeTrade`, and
 * the capture's swap amount is 0 anyway, so every ordering prints "0 USDT".
 */

export const SWAP_CONFIG = {
  fee: "0.015",
  exchangeMinUsd: "1",
  exchangeMaxUsd: "100000",

  list: [
    "SHIB",
    "NEAR",
    "FDUSD",
    "BCD",
    "BCH",
    "SUI",
    "CAKE",
    "BCL",
    "POL",
    "BTC",
    "SC",
    "WBTC",
    "S",
    "ADA",
    "DOGE",
    "XRP",
    "ENA",
    "AAVE",
    "UNI",
    "HYPE",
    "AXS",
    "AVAX",
    "XAUT",
    "SATS",
    "DAI",
    "SOL",
    "ETC",
    "BNB",
    "ETH",
    "USDT",
    "WBNB",
    "TRX",
    "LTC",
    "USDC",
    "KAS",
    "XLM",
    "LINK",
    "OP",
    "KSM",
    "OKB",
    "WETH",
    "APE",
    "XMR"
  ],

  exchangeTrade: [
  { tradePair: "BCL_BCD", fee: 0 },
  { tradePair: "RUBFIAT_", fee: 0.1 },
  { tradePair: "GHSFIAT_", fee: 0.1 },
  { tradePair: "CLPFIAT_", fee: 0.1 },
  { tradePair: "EURFIAT_", fee: 0.1 },
  { tradePair: "VNDFIAT_", fee: 0.1 },
  { tradePair: "TZSFIAT_", fee: 0.1 },
  { tradePair: "PHPFIAT_", fee: 0.1 },
  { tradePair: "JPYFIAT_", fee: 0.1 },
  { tradePair: "BRLFIAT_", fee: 0.1 },
  { tradePair: "BCD_BCL", fee: 0 },
  { tradePair: "NGNFIAT_", fee: 0.1 },
  { tradePair: "BDTFIAT_", fee: 0.1 },
  { tradePair: "USDT_BCL", fee: 0 },
  { tradePair: "THBFIAT_", fee: 0.1 },
  { tradePair: "AZNFIAT_", fee: 0.1 },
  { tradePair: "PKRFIAT_", fee: 0.1 },
  { tradePair: "CADFIAT_", fee: 0.1 },
  { tradePair: "MYRFIAT_", fee: 0.1 },
  { tradePair: "USDT_BCD", fee: 0 },
  { tradePair: "ARSFIAT_", fee: 0.1 },
  { tradePair: "KRWFIAT_", fee: 0.1 },
  { tradePair: "EGPFIAT_", fee: 0.1 },
  { tradePair: "BCD_USDT", fee: 0 },
  { tradePair: "MXNFIAT_", fee: 0.1 },
  { tradePair: "KESFIAT_", fee: 0.1 },
  { tradePair: "IDRFIAT_", fee: 0.1 },
  { tradePair: "INRFIAT_", fee: 0.1 },
  { tradePair: "GBPFIAT_", fee: 0.1 },
  { tradePair: "AUDFIAT_", fee: 0.1 },
  { tradePair: "COPFIAT_", fee: 0.1 },
  ],

  exchangeToCurrency: [
  { currencyName: "BCL", exchangeMinUsd: 0.1, exchangeMaxUsd: 100000 },
  ],

  specialExchange: [
  { currencyName: "COPFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "APT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "UAHFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "PLNFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "MMKFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "GBPFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.1 },
  { currencyName: "USDT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: true, fee: 0.015 },
  { currencyName: "KESFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "XOFFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "TZSFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "VNDFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "RUBFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "IDRFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "GNFFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "EGPFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.1 },
  { currencyName: "TRX", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: true, fee: 0.015 },
  { currencyName: "AZNFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.1 },
  { currencyName: "JPYFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "MYRFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "GHSFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: false, fee: 0.1 },
  { currencyName: "BCD", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: true, fee: 0.015 },
  { currencyName: "AUDFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.1 },
  { currencyName: "BCL", toMinUsd: 0.1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0 },
  { currencyName: "BRLFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "BDTFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: false, fee: 0.065 },
  { currencyName: "BTCB", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: true, fee: 0.015 },
  { currencyName: "CHFFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "UGXFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "THBFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "BTC", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: true, fee: 0.03 },
  { currencyName: "PENFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "XAFFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "UZSFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "KHRFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "DKKFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "AEDFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: false, fee: 0.015 },
  { currencyName: "CLPFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.1 },
  { currencyName: "SEKFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "KRWFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "NGNFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "UNI", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "CADFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "PHPFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "INRFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.3 },
  { currencyName: "EURFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: false, fee: 0.1 },
  { currencyName: "SATS", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: false, fee: 0.015 },
  { currencyName: "ARSFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.1 },
  { currencyName: "MXNFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  { currencyName: "RWFFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "ZMWFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "BUSD", toMinUsd: 1, toMaxUsd: 100000, supportFrom: true, supportTo: false, fee: 0.015 },
  { currencyName: "CZKFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "ADA", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.015 },
  { currencyName: "PKRFIAT", toMinUsd: 1, toMaxUsd: 100000, supportFrom: false, supportTo: false, fee: 0.065 },
  ],
};

/* ── HOW TO REGENERATE ──────────────────────────────────────────────────────────────────────────
 *
 *   $wc = New-Object System.Net.WebClient
 *   $wc.Encoding = [System.Text.Encoding]::UTF8
 *   $wc.DownloadString('https://hash.game/api/game/support/swap/config/')
 *
 * Unwrap the `{code, msg, data}` envelope and re-emit `data` verbatim. Note the saved file picks
 * up a BOM from WebClient; strip it before JSON.parse.
 */
