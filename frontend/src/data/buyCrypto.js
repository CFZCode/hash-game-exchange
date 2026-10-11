/* GENERATED — do not hand-edit. Regenerate from the two live responses; the recipe is at the
 * bottom of this file.
 *
 * The Buy Crypto page's whole catalogue, and BOTH HALVES ARE A LIVE ANSWER rather than a capture.
 * `api-C3PVkuGZ.js` names the pair:
 *
 *   getConfig = () => Promise.all([ GET /payment/buy-crypto/fiats/,
 *                                   GET /payment/buy-crypto/coins/ ])
 *                       .then(([f, c]) => [f.filter(r => !!r.fiatCode),
 *                                          c.filter(r => !!r.coinCode)])
 *
 * and both answer UNAUTHENTICATED on hash.game — they are catalogues the provider supports, not
 * anything about an account. That is the `system/conf` finding one family over: before writing a
 * fixture for something merely RENDERED on a page behind a login, try the path. Three of the five
 * buy-crypto paths answer; only `/prices/` and `/order/` are gated (see services/buyCrypto.js).
 *
 * The two `filter` calls in `getConfig` are the reason every row below has its key: the server
 * can return blanks, and neither response did.
 *
 * ORDER IS THE RESPONSE'S OWN and is what the dropdowns list. The fiats are alphabetical by code
 * for the first 36 and then are not (TZS, MDL, XAF, RWF, UGX, BDT trail the sorted block, which is
 * the order they were added in); the coins are alphabetical for the first 26 and then likewise
 * (ICP, USDC, AVAX, BTC, … TRUMP). Neither list is re-sorted here — the original does not sort
 * them either, so reordering the arrays is what would change the page.
 *
 * `fiatSymbol` is null on all 42 and nothing reads it. Kept because it is the response's shape.
 *
 * WHAT IS MISSING RELATIVE TO THE REST OF THIS PROJECT: `chain` on a coin row is the deposit
 * network the provider will send on, and it is the ONE field `makeOrder` sends
 * (`chain: coin.chain`). It is not the same axis as `data/currencyTokens.js` — that table lists
 * every chain bc.game will RECEIVE a coin on, while this names the single chain Onramper sends it
 * over. USDC is the clearest case: the tokens table carries several, and this says BSC.
 */

export const BUY_FIATS = [
  { fiatCode: "ARS", fiatName: "Argentina Peso", fiatSymbol: null },
  { fiatCode: "AUD", fiatName: "Australia Dollar", fiatSymbol: null },
  { fiatCode: "BOB", fiatName: "Bolivia Bolíviano", fiatSymbol: null },
  { fiatCode: "BRL", fiatName: "Brazil Real", fiatSymbol: null },
  { fiatCode: "CAD", fiatName: "Canada Dollar", fiatSymbol: null },
  { fiatCode: "CLP", fiatName: "Chile Peso", fiatSymbol: null },
  { fiatCode: "COP", fiatName: "Colombia Peso", fiatSymbol: null },
  { fiatCode: "CZK", fiatName: "Czech Republic Koruna", fiatSymbol: null },
  { fiatCode: "DKK", fiatName: "Denmark Krone", fiatSymbol: null },
  { fiatCode: "EUR", fiatName: "Euro Member Countries", fiatSymbol: null },
  { fiatCode: "GHS", fiatName: "Ghana Cedi", fiatSymbol: null },
  { fiatCode: "INR", fiatName: "India Rupee", fiatSymbol: null },
  { fiatCode: "IDR", fiatName: "Indonesia Rupiah", fiatSymbol: null },
  { fiatCode: "JPY", fiatName: "Japan Yen", fiatSymbol: null },
  { fiatCode: "KES", fiatName: "Kenyan Shilling", fiatSymbol: null },
  { fiatCode: "KZT", fiatName: "Kazakhstan Tenge", fiatSymbol: null },
  { fiatCode: "KRW", fiatName: "Korea (South) Won", fiatSymbol: null },
  { fiatCode: "MYR", fiatName: "Malaysia Ringgit", fiatSymbol: null },
  { fiatCode: "MXN", fiatName: "Mexico Peso", fiatSymbol: null },
  { fiatCode: "NZD", fiatName: "New Zealand Dollar", fiatSymbol: null },
  { fiatCode: "NGN", fiatName: "Nigeria Naira", fiatSymbol: null },
  { fiatCode: "NOK", fiatName: "Norway Krone", fiatSymbol: null },
  { fiatCode: "PKR", fiatName: "Pakistan Rupee", fiatSymbol: null },
  { fiatCode: "PEN", fiatName: "Peru Sol", fiatSymbol: null },
  { fiatCode: "PHP", fiatName: "Philippines Peso", fiatSymbol: null },
  { fiatCode: "PLN", fiatName: "Poland Zloty", fiatSymbol: null },
  { fiatCode: "ZAR", fiatName: "South Africa Rand", fiatSymbol: null },
  { fiatCode: "SEK", fiatName: "Sweden Krona", fiatSymbol: null },
  { fiatCode: "CHF", fiatName: "Switzerland Franc", fiatSymbol: null },
  { fiatCode: "TWD", fiatName: "Taiwan New Dollar", fiatSymbol: null },
  { fiatCode: "THB", fiatName: "Thailand Baht", fiatSymbol: null },
  { fiatCode: "TRY", fiatName: "Turkey Lira", fiatSymbol: null },
  { fiatCode: "AED", fiatName: "UAE-Dirham", fiatSymbol: null },
  { fiatCode: "GBP", fiatName: "United Kingdom Pound", fiatSymbol: null },
  { fiatCode: "USD", fiatName: "United States Dollar", fiatSymbol: null },
  { fiatCode: "VND", fiatName: "Viet Nam Dong", fiatSymbol: null },
  { fiatCode: "TZS", fiatName: "Tanzanian Shilling", fiatSymbol: null },
  { fiatCode: "MDL", fiatName: "Moldovan Leu", fiatSymbol: null },
  { fiatCode: "XAF", fiatName: "CFA Franc BEAC", fiatSymbol: null },
  { fiatCode: "RWF", fiatName: "Rwanda Franc", fiatSymbol: null },
  { fiatCode: "UGX", fiatName: "UGX", fiatSymbol: null },
  { fiatCode: "BDT", fiatName: "Bangladeshi Taka", fiatSymbol: null },
];

export const BUY_COINS = [
  { coinCode: "ADA", coinName: "Cardano", chain: "CARDANO" },
  { coinCode: "APE", coinName: "ApeCoin", chain: "ETHEREUM" },
  { coinCode: "APT", coinName: "Aptos", chain: "APTOS" },
  { coinCode: "AXS", coinName: "Axie Infinity", chain: "ETHEREUM" },
  { coinCode: "BNB", coinName: "Binance Coin", chain: "BSC" },
  { coinCode: "CELO", coinName: "Celo native asset", chain: "CELO" },
  { coinCode: "CHZ", coinName: "Chiliz", chain: "ETHEREUM" },
  { coinCode: "DAI", coinName: "Dai Stablecoin", chain: "ETHEREUM" },
  { coinCode: "DOGE", coinName: "DogeCoin", chain: "DOGECOIN" },
  { coinCode: "DOT", coinName: "Polkadot", chain: "POLKADOT" },
  { coinCode: "ETC", coinName: "Ethereum Classic", chain: "ETHEREUMCLASSIC" },
  { coinCode: "ETH", coinName: "Ethereum", chain: "ETHEREUM" },
  { coinCode: "HBAR", coinName: "Hedera Hashgraph", chain: "HEDERA" },
  { coinCode: "LINK", coinName: "ChainLink", chain: "BSC" },
  { coinCode: "LTC", coinName: "Litecoin", chain: "LITECOIN" },
  { coinCode: "NEAR", coinName: "NEAR Protocol", chain: "NEAR" },
  { coinCode: "RUNE", coinName: "THORChain", chain: "THORCHAIN" },
  { coinCode: "SAND", coinName: "The Sandbox", chain: "ETHEREUM" },
  { coinCode: "SHIB", coinName: "Shiba Inu", chain: "ETHEREUM" },
  { coinCode: "SOL", coinName: "Solana", chain: "SOLANA" },
  { coinCode: "TRX", coinName: "TRON", chain: "TRON" },
  { coinCode: "UNI", coinName: "Uniswap", chain: "ETHEREUM" },
  { coinCode: "USDT", coinName: "Tether", chain: "ETHEREUM" },
  { coinCode: "WBTC", coinName: "Wrapped Bitcoin", chain: "ETHEREUM" },
  { coinCode: "XLM", coinName: "Stellar Lumens", chain: "STELLAR" },
  { coinCode: "XRP", coinName: "XRP (Ripple)", chain: "RIPPLE" },
  { coinCode: "ICP", coinName: "Internet Computer", chain: "ICP" },
  { coinCode: "USDC", coinName: "USD Coin", chain: "BSC" },
  { coinCode: "AVAX", coinName: "Avalanche", chain: "AVAXC" },
  { coinCode: "BTC", coinName: "Bitcoin", chain: "BITCOIN" },
  { coinCode: "CRO", coinName: "Cronos", chain: "CRONOS" },
  { coinCode: "ATOM", coinName: "Cosmos", chain: "COSMOS" },
  { coinCode: "AAVE", coinName: "Aave", chain: "BSC" },
  { coinCode: "KSM", coinName: "Kusama", chain: "KUSAMA" },
  { coinCode: "CAKE", coinName: "PancakeSwap", chain: "BSC" },
  { coinCode: "PEPE", coinName: "Pepe", chain: "ETHEREUM" },
  { coinCode: "SUI", coinName: "Sui", chain: "SUI" },
  { coinCode: "TRUMP", coinName: "Official Trump", chain: "SOLANA" },
];

/* `Ce(list, want)` — the opening fiat. `want` is the `?from=` search param when there is one and
   `setting.localeCurrencyName` otherwise, and the test is `want.startsWith(row.fiatCode)`, which is
   how "USDFIAT" finds "USD". Falls back to USD, then to the first row. */
export const defaultFiat = (want) =>
  BUY_FIATS.find((row) => String(want ?? '').startsWith(row.fiatCode)) ||
  BUY_FIATS.find((row) => row.fiatCode === 'USD') ||
  BUY_FIATS[0];

/* `ve(list, want)` — the opening coin, from `?to=`, defaulting to USDT at the call site. An exact
   uppercase match or the first row; note this one does NOT fall back to a named coin the way the
   fiat side falls back to USD. */
export const defaultCoin = (want) =>
  BUY_COINS.find((row) => row.coinCode.toUpperCase() === want) || BUY_COINS[0];

/* ── HOW TO REGENERATE ──────────────────────────────────────────────────────────────────────────
 *
 *   $wc = New-Object System.Net.WebClient
 *   $wc.Encoding = [System.Text.Encoding]::UTF8          # Invoke-WebRequest decodes as Latin-1,
 *                                                        # and "Bolivia Bolíviano" has an accent
 *   $wc.DownloadString('https://hash.game/api/payment/buy-crypto/fiats/')
 *   $wc.DownloadString('https://hash.game/api/payment/buy-crypto/coins/')
 *
 * Both come back in bc.game's `{code, msg, data}` envelope; `data` is the array. Drop any row with
 * a falsy `fiatCode`/`coinCode`, keep the order, and re-emit the two arrays above.
 */
