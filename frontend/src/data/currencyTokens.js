/* GENERATED — do not hand-edit. Regenerate from the live feed; see the recipe at the bottom.
 *
 * `/game/support/system/conf/currencyTokens?currencyName=<COIN>` — the path `Dr` in
 * `Banner-TuTj1pp2.js` calls, and it is a **`system/conf`** path, which is the whole finding
 * here: that family answers UNAUTHENTICATED on `hash.game`, exactly as `usdPrice` and
 * `index/minimal` do. So the withdraw page's per-chain data is a REAL RESPONSE rather than a
 * reconstruction — 89 coins, 186 tokens, fetched one call per coin.
 *
 * That matters because the page it feeds is otherwise the kind that cannot be recovered. Every
 * OTHER number on /wallet/withdraw is per-account and behind auth: the balance, the fee actually
 * charged, the address whitelist. This table is the part that is not, and it turns out to carry
 * the two figures the form is built around.
 *
 * ── IT REPRODUCES THE CAPTURE EXACTLY, WHICH IS THE CHECK ON ALL OF IT ────────────────────────
 *
 * The capture's Withdraw Amount row reads "Min: 204 BCD". Nothing in it is a round number, and
 * nothing in this file says 204. It falls out of two fields that were fetched independently of
 * the screenshot:
 *
 *   o = new Decimal(minWithdrawLimitAmount).add(fee)          // `vn` in index-B3pypdyg.js
 *     = BCD/ETHEREUM withdrawLimitAmount  200
 *     + the fee                             4                 // = BCD/ETHEREUM minFee
 *     = 204
 *
 * So `minFee` IS what `/payment/withdraw/fee/range/<coin>/` answers as `normalFee`, at least at
 * rest — see services/withdraw.js, which is where that substitution is made and argued. Two
 * fields from a public config landing on a figure read off a screenshot is the strongest
 * confirmation available for any of this, and it also settles that ETHEREUM is the token the
 * form opens on (the store takes `tokens[0]`, and 200/4 is the first row, not the BSC row's 5).
 *
 * ── WHAT IS IN A ROW ──────────────────────────────────────────────────────────────────────────
 *
 *   chain / chainName / label   the Network select. `label` is what it prints — the chain's full
 *                               name with the token standard in brackets, "Ethereum (ERC20)".
 *   decimals                    the amount input's `precision`.
 *   addrTypes                   a sub-select under Network. Exactly ONE token in all 186 has any:
 *                               BTC on BITCOIN, `[{label:"Segwit",value:"P2WPKH"}]`. The chunk
 *                               swaps the Network select for an address-type select when a
 *                               currency has a single token that carries them, which is why that
 *                               arm exists at all for one coin.
 *   withdrawLimitAmount         the minimum, before the fee is added.
 *   depositLimitAmount          the deposit minimum — see the note on pages/Deposit below.
 *   minFee / maxFee             the fee range. Note ROSE has minFee 1 and maxFee 0.1, i.e. the
 *                               feed's own rows are not always ordered; do not "fix" it.
 *   tagName                     the memo/tag field's label. Ten tokens carry one (XLM "Memo",
 *                               EOS "Memo", XRP "Tag", …); the rest render no second input.
 *   canDeposit / canWithdraw    174 of the 186 can be withdrawn to. A coin whose tokens ALL say
 *                               false renders the not-supported state; a single false token
 *                               renders "Under Maintenance" when it is the selected one.
 *
 * Nine fields of the feed's twenty-two are dropped as unused here: tokenId, tokenType,
 * tokenFullName, blockExplorer, queryTxPath, queryTokenPath, status, depositConfirmTimes,
 * walletVersion. The first six belong to the transaction-detail page, which is not built; add
 * them back to the KEEP list when it is.
 *
 * ── SCOPE, AND WHAT SHOULD MOVE ONTO THIS ─────────────────────────────────────────────────────
 *
 * The 89 coins are `CRYPTO_ROWS` in context/account.js, i.e. the wallet's own crypto list, in the
 * wallet's own order. A FIAT currency has no tokens at all — `Dr` returns `[]` without calling —
 * so the fiat rows are absent by the original's own rule rather than by omission.
 *
 * `pages/Deposit/deposit.js`'s `NETWORKS` WAS a hand-written table of ten coins that said of
 * itself "Everything else is made up". It was deliberately not migrated here along with the
 * withdraw build — that would have changed which chains and minimums an already-built page shows,
 * in a change asked to be about withdraw — and `depositLimitAmount` and `canDeposit` were carried
 * above precisely so the pass would be a data swap and not another fetch. **That pass has now
 * happened**: `networksFor` reads this file, the invented table is deleted, and the one row that
 * had a capture behind it agreed to the digit (VTHO, 360).
 *
 * ── REGENERATE ────────────────────────────────────────────────────────────────────────────────
 *
 * For each coin in CRYPTO_ROWS, GET
 *   https://hash.game/api/game/support/system/conf/currencyTokens?currencyName=<COIN>
 * and keep `data`, dropping the nine fields listed above plus any empty `addrTypes`/`tagName`.
 * Use System.Net.WebClient with UTF8 — PowerShell's Invoke-WebRequest decodes JSON as Latin-1.
 */
export const CURRENCY_TOKENS = {
  "BCD": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":6,"withdrawLimitAmount":"200","depositLimitAmount":"1","minFee":"4","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.1","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "BTC": [
    {"chain":"BITCOIN","chainName":"Bitcoin","label":"Bitcoin","decimals":8,"addrTypes":[{"label":"Segwit","value":"P2WPKH"}],"withdrawLimitAmount":"0.0008","depositLimitAmount":"0.00001","minFee":"0","maxFee":"0.005","canDeposit":true,"canWithdraw":true},
  ],
  "BC": [
    {"chain":"SOLANA","chainName":"Solana","label":"Solana","decimals":6,"withdrawLimitAmount":"500","depositLimitAmount":"100","minFee":"5","maxFee":"10000","canDeposit":true,"canWithdraw":true},
  ],
  "SATS": [
    {"chain":"SATS","chainName":"SATS","label":"LND","decimals":0,"withdrawLimitAmount":"20000","depositLimitAmount":"100","minFee":"20","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "ETH": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"0.02","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"0.05","canDeposit":true,"canWithdraw":true},
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet","decimals":18,"withdrawLimitAmount":"0.01","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"BASE","chainName":"Base","label":"Base","decimals":18,"withdrawLimitAmount":"0.01","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"ARETH","chainName":"Arbitrum","label":"Arbitrum One","decimals":18,"withdrawLimitAmount":"0.01","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"0.05","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":0,"withdrawLimitAmount":"0.01","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"0.05","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":0,"withdrawLimitAmount":"0.01","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"ZKSYNC","chainName":"ZKSYNC","label":"zkSync Era","decimals":18,"withdrawLimitAmount":"0.01","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"STARKNET","chainName":"STARKNET","label":"Starknet","decimals":18,"withdrawLimitAmount":"0.005","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"LINEA","chainName":"LINEA","label":"Linea","decimals":9,"withdrawLimitAmount":"0.02","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"ROBINHOOD","chainName":"ETH","label":"Robinhood","decimals":9,"withdrawLimitAmount":"0.02","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"0.001","canDeposit":true,"canWithdraw":true},
  ],
  "DOGE": [
    {"chain":"DOGE","chainName":"Dogecoin","label":"Doge Coin","decimals":8,"withdrawLimitAmount":"95","depositLimitAmount":"1","minFee":"0.5","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":6,"withdrawLimitAmount":"50","depositLimitAmount":"1","minFee":"0.5","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "XRP": [
    {"chain":"RIPPLE","chainName":"XRP","label":"Ripple","decimals":6,"withdrawLimitAmount":"22","depositLimitAmount":"0.5","minFee":"0.1","maxFee":"1000","tagName":"Tag","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"20","depositLimitAmount":"0.5","minFee":"0.1","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"100","depositLimitAmount":"0.5","minFee":"0.25","maxFee":"10000","canDeposit":true,"canWithdraw":true},
  ],
  "BNB": [
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"Binance Coin(BEP20)","decimals":0,"withdrawLimitAmount":"0.05","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"0.01","canDeposit":true,"canWithdraw":true},
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"0.2","depositLimitAmount":"0.0002","minFee":"0.005","maxFee":"10","canDeposit":true,"canWithdraw":false},
    {"chain":"OPBNB","chainName":"BNB","label":"opBNB","decimals":18,"withdrawLimitAmount":"0.1","depositLimitAmount":"0.0002","minFee":"0.0001","maxFee":"100","canDeposit":true,"canWithdraw":false},
  ],
  "USDT": [
    {"chain":"TRON","chainName":"Tron","label":"Tron (TRC20)","decimals":6,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"1","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":0,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":6,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"0.25","maxFee":"10000","canDeposit":true,"canWithdraw":true},
    {"chain":"SOLANA","chainName":"Solana","label":"Solana","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.25","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"TON","chainName":"TON","label":"The Open Network","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","tagName":"Memo","canDeposit":true,"canWithdraw":true},
    {"chain":"AVAX","chainName":"AVAX","label":"AVAX C-Chain","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"ARETH","chainName":"Arbitrum","label":"Arbitrum One","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"OPBNB","chainName":"BNB","label":"opBNB","decimals":18,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"CELO","chainName":"CELO","label":"CELO","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet(USD₮0)","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"1000","canDeposit":true,"canWithdraw":false},
    {"chain":"PLASMA","chainName":"PLASMA","label":"Plasma","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"1000","canDeposit":false,"canWithdraw":false},
    {"chain":"BASE","chainName":"Base","label":"(BASE) Bridged Tether","decimals":6,"withdrawLimitAmount":"100","depositLimitAmount":"1","minFee":"0.05","maxFee":"1000","canDeposit":true,"canWithdraw":false},
    {"chain":"POLKADOT","chainName":"Polkadot","label":"Asset Hub Polkadot","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"XLAYER","chainName":"XLAYER","label":"X Layer USD₮0","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "LTC": [
    {"chain":"LITECOIN","chainName":"Litecoin","label":"Litecoin","decimals":8,"withdrawLimitAmount":"0.1","depositLimitAmount":"0.009","minFee":"0.002","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"0.1","depositLimitAmount":"0.005","minFee":"0.001","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "BCH": [
    {"chain":"BITCOINCASH","chainName":"Bitcoin Cash","label":"Bitcoin Cash","decimals":8,"withdrawLimitAmount":"0.05","depositLimitAmount":"0.002","minFee":"0.001","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":8,"withdrawLimitAmount":"0.02","depositLimitAmount":"0.002","minFee":"0.001","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "TRX": [
    {"chain":"TRON","chainName":"Tron","label":"TRON","decimals":6,"withdrawLimitAmount":"20","depositLimitAmount":"2","minFee":"0.1","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BEP20","decimals":6,"withdrawLimitAmount":"20","depositLimitAmount":"2","minFee":"1","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":6,"withdrawLimitAmount":"100","depositLimitAmount":"2","minFee":"3","maxFee":"1000","canDeposit":true,"canWithdraw":false},
  ],
  "XLM": [
    {"chain":"STELLAR","chainName":"Stellar","label":"Stellar","decimals":7,"withdrawLimitAmount":"50","depositLimitAmount":"2","minFee":"0","maxFee":"1000","tagName":"Memo","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"200","depositLimitAmount":"2","minFee":"1","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "EOS": [
    {"chain":"EOS","chainName":"EOS","label":"EOS","decimals":4,"withdrawLimitAmount":"5","depositLimitAmount":"0.5","minFee":"0.01","maxFee":"1000","tagName":"Memo","canDeposit":true,"canWithdraw":true},
  ],
  "DOT": [
    {"chain":"POLKADOT","chainName":"Polkadot","label":"Asset Hub Polkadot","decimals":10,"withdrawLimitAmount":"2","depositLimitAmount":"0.2","minFee":"0","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"2","depositLimitAmount":"0.2","minFee":"0.05","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "LINK": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"2","depositLimitAmount":"0.01","minFee":"0","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":0,"withdrawLimitAmount":"1","depositLimitAmount":"0.01","minFee":"0.1","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":0,"withdrawLimitAmount":"1","depositLimitAmount":"0.01","minFee":"0.1","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet","decimals":18,"withdrawLimitAmount":"2","depositLimitAmount":"0.01","minFee":"1","maxFee":"10","canDeposit":true,"canWithdraw":true},
  ],
  "DAI": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"0.25","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":0,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.25","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.25","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"ARETH","chainName":"Arbitrum","label":"Arbitrum One","decimals":18,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.25","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet","decimals":18,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.25","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"BASE","chainName":"Base","label":"Base","decimals":18,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.25","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "USDC": [
    {"chain":"BASE","chainName":"Base","label":"Base","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"20","canDeposit":true,"canWithdraw":true},
    {"chain":"SOLANA","chainName":"Solana","label":"Solana","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.25","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":6,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"0.25","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"AVAX","chainName":"AVAX","label":"AVAX C-Chain","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"ARETH","chainName":"Arbitrum","label":"Arbitrum One","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"20","canDeposit":true,"canWithdraw":true},
    {"chain":"RONIN","chainName":"RON","label":"Ronin","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"CELO","chainName":"CELO","label":"CELO","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.05","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"SONIC","chainName":"S","label":"Sonic Network","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.1","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"WLD","chainName":"WLD","label":"World Chain","decimals":6,"withdrawLimitAmount":"100","depositLimitAmount":"1","minFee":"0.05","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"POLKADOT","chainName":"Polkadot","label":"Asset Hub Polkadot","decimals":6,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"0.05","maxFee":"1000","canDeposit":true,"canWithdraw":false},
    {"chain":"ZKSYNC","chainName":"ZKSYNC","label":"ZkSync Era","decimals":6,"withdrawLimitAmount":"10","depositLimitAmount":"1","minFee":"0.05","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"SUI","chainName":"Sui","label":"SUI","decimals":6,"withdrawLimitAmount":"10","depositLimitAmount":"1","minFee":"0.05","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "XMR": [
    {"chain":"MONERO","chainName":"Monero","label":"Monero","decimals":0,"withdrawLimitAmount":"0.12","depositLimitAmount":"0.005","minFee":"0","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "BSV": [
    {"chain":"BITCOINSV","chainName":"Bitcoin SV","label":"Bitcoin SV","decimals":8,"withdrawLimitAmount":"0.5","depositLimitAmount":"0.01","minFee":"0.00002","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "UNI": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"2","depositLimitAmount":"0.01","minFee":"0","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":0,"withdrawLimitAmount":"2","depositLimitAmount":"0.01","minFee":"0.1","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"2","depositLimitAmount":"0.01","minFee":"0.1","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "KSM": [
    {"chain":"KUSAMA","chainName":"Kusama","label":"Kusama","decimals":10,"withdrawLimitAmount":"0.4","depositLimitAmount":"0.01","minFee":"0.01","maxFee":"0.02","canDeposit":true,"canWithdraw":true},
  ],
  "SUSHI": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"20","depositLimitAmount":"0.5","minFee":"0.01","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":0,"withdrawLimitAmount":"20","depositLimitAmount":"0.5","minFee":"1","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"10","depositLimitAmount":"0.5","minFee":"0.01","maxFee":"10","canDeposit":true,"canWithdraw":true},
  ],
  "WBTC": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"0.0005","depositLimitAmount":"0.00001","minFee":"0.0004","maxFee":"0.01","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":0,"withdrawLimitAmount":"0.0005","depositLimitAmount":"0.00001","minFee":"0.00001","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet","decimals":8,"withdrawLimitAmount":"0.0005","depositLimitAmount":"0.00001","minFee":"0.00001","maxFee":"0.002","canDeposit":true,"canWithdraw":true},
    {"chain":"ARETH","chainName":"Arbitrum","label":"Arbitrum One","decimals":8,"withdrawLimitAmount":"0.0005","depositLimitAmount":"0.00001","minFee":"0.00001","maxFee":"0.002","canDeposit":true,"canWithdraw":true},
  ],
  "AAVE": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"0.15","depositLimitAmount":"0.0029","minFee":"0.01","maxFee":"0.4","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":0,"withdrawLimitAmount":"0.1","depositLimitAmount":"0.002","minFee":"0.04","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"0.1","depositLimitAmount":"0.002","minFee":"0.04","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "YFI": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"0.002","depositLimitAmount":"0.0001","minFee":"0.0004","maxFee":"0.01","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"0.002","depositLimitAmount":"0.0001","minFee":"0.00004","maxFee":"0.01","canDeposit":true,"canWithdraw":true},
  ],
  "CRO": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"500","depositLimitAmount":"5","minFee":"200","maxFee":"10000000","canDeposit":true,"canWithdraw":true},
  ],
  "ATOM": [
    {"chain":"COSMOS","chainName":"Cosmos","label":"Cosmos","decimals":6,"withdrawLimitAmount":"2","depositLimitAmount":"0.1","minFee":"0.01","maxFee":"1","tagName":"Memo","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"2","depositLimitAmount":"0.1","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "MANA": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"50","depositLimitAmount":"2","minFee":"0","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":0,"withdrawLimitAmount":"30","depositLimitAmount":"2","minFee":"0.5","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"10","depositLimitAmount":"2","minFee":"2","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "DASH": [
    {"chain":"DASH","chainName":"Dash","label":"Dash","decimals":8,"withdrawLimitAmount":"0.5","depositLimitAmount":"0.01","minFee":"0.001","maxFee":"0.002","canDeposit":true,"canWithdraw":true},
  ],
  "BAT": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"60","depositLimitAmount":"5","minFee":"0","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"20","depositLimitAmount":"5","minFee":"2","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "APT": [
    {"chain":"APTOS","chainName":"APT","label":"APTOS","decimals":8,"withdrawLimitAmount":"2","depositLimitAmount":"0.1","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "ENJ": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"50","depositLimitAmount":"5","minFee":"0","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "CRV": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"50","depositLimitAmount":"1","minFee":"3","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":0,"withdrawLimitAmount":"50","depositLimitAmount":"1","minFee":"0.3","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet","decimals":18,"withdrawLimitAmount":"10","depositLimitAmount":"1","minFee":"1","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "WLD": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"50","depositLimitAmount":"0.5","minFee":"5","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet","decimals":18,"withdrawLimitAmount":"50","depositLimitAmount":"0.5","minFee":"1","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"WLD","chainName":"WLD","label":"World Chain","decimals":9,"withdrawLimitAmount":"100","depositLimitAmount":"0.5","minFee":"1","maxFee":"1000","canDeposit":false,"canWithdraw":false},
  ],
  "HNT": [
    {"chain":"SOLANA","chainName":"Solana","label":"Solana","decimals":6,"withdrawLimitAmount":"10","depositLimitAmount":"1","minFee":"0.1","maxFee":"10","canDeposit":true,"canWithdraw":true},
  ],
  "BTCB": [
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"0.0005","depositLimitAmount":"0.00001","minFee":"0.00008","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "ARB": [
    {"chain":"ARETH","chainName":"Arbitrum","label":"Arbitrum One","decimals":18,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"1","maxFee":"200","canDeposit":true,"canWithdraw":true},
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"2","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "GMX": [
    {"chain":"ARETH","chainName":"Arbitrum","label":"Arbitrum One","decimals":18,"withdrawLimitAmount":"1","depositLimitAmount":"0.03","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "ALGO": [
    {"chain":"ALGO","chainName":"ALGO","label":"Algorand","decimals":6,"withdrawLimitAmount":"50","depositLimitAmount":"2","minFee":"1","maxFee":"10","canDeposit":true,"canWithdraw":true},
  ],
  "ICP": [
    {"chain":"ICP","chainName":"ICP","label":"Internet Computer","decimals":8,"withdrawLimitAmount":"2","depositLimitAmount":"0.05","minFee":"0.001","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "BLUR": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"20","depositLimitAmount":"3","minFee":"2","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "HBAR": [
    {"chain":"HBAR","chainName":"HBAR","label":"Hedera","decimals":8,"withdrawLimitAmount":"20","depositLimitAmount":"3","minFee":"1","maxFee":"100","tagName":"Memo","canDeposit":true,"canWithdraw":true},
  ],
  "PEPE": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"4000000","depositLimitAmount":"50000","minFee":"1200000","maxFee":"120000000000","canDeposit":true,"canWithdraw":true},
  ],
  "NANO": [
    {"chain":"NANO","chainName":"NANO","label":"Nano","decimals":30,"withdrawLimitAmount":"5","depositLimitAmount":"0.5","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "KAVA": [
    {"chain":"KAVA","chainName":"KAVA","label":"kava","decimals":6,"withdrawLimitAmount":"20","depositLimitAmount":"2","minFee":"0.1","maxFee":"1","tagName":"Memo","canDeposit":true,"canWithdraw":true},
  ],
  "THETA": [
    {"chain":"THETA","chainName":"THETA","label":"Theta Network","decimals":18,"withdrawLimitAmount":"10","depositLimitAmount":"0.5","minFee":"0.05","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "NEXO": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"200","depositLimitAmount":"0.5","minFee":"5","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "TFUEL": [
    {"chain":"THETA","chainName":"THETA","label":"Theta Fuel","decimals":18,"withdrawLimitAmount":"100","depositLimitAmount":"15","minFee":"2","maxFee":"10","canDeposit":true,"canWithdraw":true},
  ],
  "LUNA": [],
  "RUNE": [
    {"chain":"THORCHAIN","chainName":"RUNE","label":"THORChain","decimals":8,"withdrawLimitAmount":"2","depositLimitAmount":"0.2","minFee":"0.1","maxFee":"1","tagName":"Memo","canDeposit":true,"canWithdraw":true},
  ],
  "OP": [
    {"chain":"OPTIMISM","chainName":"OPTIMISM","label":"OP Mainnet","decimals":18,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.5","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "FIL": [
    {"chain":"FILECOIN","chainName":"FIL","label":"FileCoin","decimals":18,"withdrawLimitAmount":"1","depositLimitAmount":"0.1","minFee":"0.05","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"2","depositLimitAmount":"0.1","minFee":"0.01","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "DGB": [
    {"chain":"DGB","chainName":"DigiByte","label":"DigiByte","decimals":8,"withdrawLimitAmount":"200","depositLimitAmount":"80","minFee":"4","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "XTZ": [
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"5","depositLimitAmount":"0.5","minFee":"0.5","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"TEZOS","chainName":"XTZ","label":"TEZOS","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"0.5","minFee":"0.5","maxFee":"10","canDeposit":true,"canWithdraw":true},
  ],
  "WBNB": [
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"0.02","depositLimitAmount":"0.001","minFee":"0.001","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "ROSE": [
    {"chain":"OASIS","chainName":"OASIS","label":"ROSE","decimals":9,"withdrawLimitAmount":"5","depositLimitAmount":"12","minFee":"1","maxFee":"0.1","canDeposit":true,"canWithdraw":true},
  ],
  "WAXP": [
    {"chain":"WAX","chainName":"WAX","label":"WAXP","decimals":4,"withdrawLimitAmount":"50","depositLimitAmount":"20","minFee":"1","maxFee":"10","tagName":"Memo","canDeposit":true,"canWithdraw":true},
  ],
  "CAKE": [
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":0,"withdrawLimitAmount":"5","depositLimitAmount":"0.1","minFee":"0.01","maxFee":"0.1","canDeposit":true,"canWithdraw":true},
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"20","depositLimitAmount":"0.5","minFee":"2","maxFee":"100","canDeposit":true,"canWithdraw":false},
  ],
  "TWT": [
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":0,"withdrawLimitAmount":"10","depositLimitAmount":"0.5","minFee":"0.1","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "KLAY": [
    {"chain":"KLAYTN","chainName":"KLAY","label":"Klaytn","decimals":18,"withdrawLimitAmount":"10","depositLimitAmount":"5","minFee":"0.5","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "TON": [
    {"chain":"TON","chainName":"TON","label":"Toncoin","decimals":9,"withdrawLimitAmount":"2","depositLimitAmount":"1","minFee":"0.02","maxFee":"1","tagName":"Comment","canDeposit":true,"canWithdraw":true},
  ],
  "BANANO": [
    {"chain":"BANANO","chainName":"Banano","label":"Banano","decimals":0,"withdrawLimitAmount":"50","depositLimitAmount":"200","minFee":"2","maxFee":"10","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":0,"withdrawLimitAmount":"20","depositLimitAmount":"250","minFee":"1","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "VTHO": [
    {"chain":"VET","chainName":"Vechain","label":"VTHO","decimals":18,"withdrawLimitAmount":"100","depositLimitAmount":"360","minFee":"10","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "YGG": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"30","depositLimitAmount":"2","minFee":"0.5","maxFee":"8","canDeposit":true,"canWithdraw":true},
  ],
  "GODS": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"100","depositLimitAmount":"4","minFee":"1","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "MATIC": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"ERC20 (Old Matic)","decimals":18,"withdrawLimitAmount":"50","depositLimitAmount":"5","minFee":"500","maxFee":"1000000","canDeposit":true,"canWithdraw":true},
  ],
  "IOTX": [
    {"chain":"IOTX","chainName":"IOTX","label":"IoTeX","decimals":18,"withdrawLimitAmount":"50","depositLimitAmount":"100","minFee":"0.5","maxFee":"10000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"100","depositLimitAmount":"100","minFee":"0.5","maxFee":"10000","canDeposit":true,"canWithdraw":true},
  ],
  "SHIB": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"1000000","depositLimitAmount":"50000","minFee":"20000","maxFee":"20000000000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":0,"withdrawLimitAmount":"500000","depositLimitAmount":"50000","minFee":"2000","maxFee":"20000000000","canDeposit":true,"canWithdraw":true},
  ],
  "NEAR": [
    {"chain":"NEAR","chainName":"NEAR","label":"NEAR","decimals":24,"withdrawLimitAmount":"2","depositLimitAmount":"0.1","minFee":"0.1","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"2","depositLimitAmount":"0.1","minFee":"0.05","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "ADA": [
    {"chain":"ADA","chainName":"Cardano","label":"Cardano","decimals":6,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.5","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"5","depositLimitAmount":"1","minFee":"0.5","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "RVN": [
    {"chain":"RVN","chainName":"RVN","label":"Ravencoin","decimals":8,"withdrawLimitAmount":"20","depositLimitAmount":"50","minFee":"2","maxFee":"10","canDeposit":false,"canWithdraw":false},
  ],
  "WAVES": [
    {"chain":"WAVES","chainName":"WAVES","label":"Waves","decimals":8,"withdrawLimitAmount":"2","depositLimitAmount":"0.5","minFee":"0.05","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "SAND": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"30","depositLimitAmount":"1","minFee":"1","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"POLYGON","chainName":"Polygon","label":"Polygon POS","decimals":18,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"0.5","maxFee":"10","canDeposit":true,"canWithdraw":true},
  ],
  "TUSD": [
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"1","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"20","depositLimitAmount":"1","minFee":"10","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "AXS": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":0,"withdrawLimitAmount":"2","depositLimitAmount":"0.1","minFee":"0.2","maxFee":"1.4","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":0,"withdrawLimitAmount":"2","depositLimitAmount":"0.1","minFee":"0","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"RONIN","chainName":"RON","label":"Ronin","decimals":18,"withdrawLimitAmount":"2","depositLimitAmount":"0.1","minFee":"1","maxFee":"100","canDeposit":true,"canWithdraw":true},
  ],
  "ZIL": [
    {"chain":"ZILLIQA","chainName":"Zilliqa","label":"Zilliqa","decimals":0,"withdrawLimitAmount":"200","depositLimitAmount":"20","minFee":"2","maxFee":"1000","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":12,"withdrawLimitAmount":"200","depositLimitAmount":"20","minFee":"2","maxFee":"0","canDeposit":true,"canWithdraw":true},
  ],
  "AVAX": [
    {"chain":"AVAX","chainName":"AVAX","label":"AVAX C-Chain","decimals":18,"withdrawLimitAmount":"0.2","depositLimitAmount":"0.02","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"0.2","depositLimitAmount":"0.02","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "SOL": [
    {"chain":"SOLANA","chainName":"Solana","label":"Solana","decimals":9,"withdrawLimitAmount":"0.1","depositLimitAmount":"0.005","minFee":"0.001","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"0.2","depositLimitAmount":"0.005","minFee":"0.001","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"SOLANA","chainName":"Solana","label":"Wrapped SOL","decimals":9,"withdrawLimitAmount":"0.1","depositLimitAmount":"0.005","minFee":"0.01","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"BASE","chainName":"Base","label":"Base","decimals":9,"withdrawLimitAmount":"0.1","depositLimitAmount":"0.01","minFee":"0.001","maxFee":"100","canDeposit":true,"canWithdraw":false},
  ],
  "ETC": [
    {"chain":"ETC","chainName":"ETC","label":"Ethereum Classic","decimals":18,"withdrawLimitAmount":"0.5","depositLimitAmount":"0.03","minFee":"0.02","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"0.5","depositLimitAmount":"0.03","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "UST": [
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"10","depositLimitAmount":"50","minFee":"5","maxFee":"1","canDeposit":true,"canWithdraw":false},
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"50","depositLimitAmount":"50","minFee":"10","maxFee":"10000","canDeposit":true,"canWithdraw":true},
  ],
  "CELO": [
    {"chain":"CELO","chainName":"CELO","label":"Celo","decimals":18,"withdrawLimitAmount":"10","depositLimitAmount":"1","minFee":"0.1","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "TOMO": [
    {"chain":"TOMO","chainName":"TOMO","label":"Viction","decimals":18,"withdrawLimitAmount":"10","depositLimitAmount":"2","minFee":"1","maxFee":"10","canDeposit":true,"canWithdraw":true},
  ],
  "VET": [
    {"chain":"VET","chainName":"Vechain","label":"VET","decimals":18,"withdrawLimitAmount":"50","depositLimitAmount":"20","minFee":"5","maxFee":"100","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"100","depositLimitAmount":"20","minFee":"5","maxFee":"1000","canDeposit":true,"canWithdraw":true},
  ],
  "DCR": [
    {"chain":"DCR","chainName":"DCR","label":"Decred","decimals":8,"withdrawLimitAmount":"2","depositLimitAmount":"0.05","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "EGLD": [
    {"chain":"EGLD","chainName":"EGLD","label":"Elrond","decimals":18,"withdrawLimitAmount":"0.5","depositLimitAmount":"0.02","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
    {"chain":"BSC","chainName":"Smart Chain Legacy","label":"BNB Smart Chain (BEP20)","decimals":18,"withdrawLimitAmount":"0.2","depositLimitAmount":"0.02","minFee":"0.01","maxFee":"1","canDeposit":true,"canWithdraw":true},
  ],
  "QTUM": [
    {"chain":"QTUM","chainName":"QTUM","label":"Qtum","decimals":8,"withdrawLimitAmount":"10","depositLimitAmount":"0.5","minFee":"0.1","maxFee":"10","canDeposit":true,"canWithdraw":true},
  ],
  "APE": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"10","depositLimitAmount":"0.5","minFee":"0.8","maxFee":"20","canDeposit":true,"canWithdraw":true},
  ],
  "PEOPLE": [
    {"chain":"ETHEREUM","chainName":"Ethereum","label":"Ethereum (ERC20)","decimals":18,"withdrawLimitAmount":"1000","depositLimitAmount":"20","minFee":"200","maxFee":"100000","canDeposit":true,"canWithdraw":true},
  ],
};

/* `Dr` returns `[]` for a FIAT currency without making the call, so a fiat wallet falls through
   to the fiat withdraw arm rather than showing an empty Network select. Reproduced here. */
export const tokensFor = (currencyName) => CURRENCY_TOKENS[currencyName] || [];

/* `Kr`'s own arrival effect: `y(tokens[0])`. The first row is what the form opens on — NOT the
   cheapest or the lowest-minimum one, which for BCD would be the BSC row at 5 rather than the
   ETHEREUM row at 200. The capture shows Ethereum (ERC20), so the feed's order is the answer. */
export const defaultToken = (currencyName) => tokensFor(currencyName)[0];

/* `minWitdhrawAllTokens` in `Kr` — the original's own spelling, kept. `minBy(tokens, t =>
   Number(t.withdrawLimitAmount))`, and it is read ONLY when a call site passes
   `lowestWithdrawLimit`; the crypto form does not, so it takes the selected token's own limit.
   Ported because the fiat/SATS arms do pass it and would otherwise silently differ. */
export const lowestWithdrawLimit = (currencyName) => {
  const rows = tokensFor(currencyName);
  if (rows.length === 0) return '0';
  return rows.reduce(
    (low, row) => (Number(row.withdrawLimitAmount) < Number(low) ? row.withdrawLimitAmount : low),
    rows[0].withdrawLimitAmount,
  );
};
