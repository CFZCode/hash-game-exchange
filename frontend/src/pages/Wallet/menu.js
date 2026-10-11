import {
  IconWallet,
  IconDeposit,
  IconWithdraw,
  IconBuyCrypto,
  IconSwap,
  IconVault,
  IconTransaction,
  IconRollover,
  IconBetHistory,
} from './icons';

/* The wallet rail — `e` in index-nvcIJcIg.js (WalletLayout), which is recovered rather than read
 * off the screenshot: neither that chunk nor the Balance page's is in the mirror, and both came
 * from `hash.game/assets/`.
 *
 * THE RAIL IS NOT THIS LIST; IT IS THIS LIST FILTERED BY THE DEPLOY. The chunk declares TEN rows
 * and then does
 *
 *   Object.keys(config.routes).filter(k => !!config.routes[k]).map(k => entries[k])
 *
 * where `config` comes from `index-VjGkjkMa.js` — a table of six white-label profiles picked by
 * host and by the `isFiat`/`isOfflineAgent`/`bcke`/`bcmx` build flags. bc.game's own deploy takes
 * the `main` profile:
 *
 *   main: { routes: { balance, deposit, withdraw, buy, swap, vault, transaction, rollover,
 *                     betHistory } }
 *
 * Nine keys, and `annualReport` is in none of the six profiles' `routes` — which is why the tenth
 * entry the chunk declares (Annual Report, `/wallet/annual-report`, its own bar-chart icon) never
 * appears in the capture. So the nine below are the deploy's own list, in the chunk's own order,
 * and the missing tenth is accounted for rather than unexplained. The other profiles are recorded
 * here in prose instead of in code because nothing in this build can select one: `fiat` and `kes`
 * show only transaction/rollover/betHistory, `mx` swaps balance for deposit-first, and
 * `offlineAgent` drops everything between balance and transaction.
 *
 * The ORDER of the object's keys is what orders the rail — `Object.keys` on the profile, not on
 * the entry table — and both happen to agree here.
 *
 * Only `/wallet/balance` is built. The other eight are `Dialog*` components on the original
 * (DialogChannelDeposit, DialogWithdraw, DialogBuyCrypto, DialogSwap, DialogVault,
 * DialogTransaction, DialogTurnover, DialogBetHistory), each a feature in its own right; they
 * route and light their rail row here and render the empty pane. That is the same call the Help
 * Center's rail makes for its sixteen unbundled documents.
 */
export const WALLET_MENU = [
  { key: 'balance', title: 'Balance', icon: IconWallet, href: '/wallet/balance' },
  { key: 'deposit', title: 'Deposit', icon: IconDeposit, href: '/wallet/deposit' },
  { key: 'withdraw', title: 'Withdraw', icon: IconWithdraw, href: '/wallet/withdraw' },
  { key: 'buy', title: 'Buy Crypto', icon: IconBuyCrypto, href: '/wallet/buy' },
  { key: 'swap', title: 'Swap', icon: IconSwap, href: '/wallet/swap' },
  { key: 'vault', title: 'Vault Pro', icon: IconVault, href: '/wallet/vault' },
  { key: 'transaction', title: 'Transaction', icon: IconTransaction, href: '/wallet/transaction' },
  { key: 'rollover', title: 'Rollover', icon: IconRollover, href: '/wallet/rollover' },
  { key: 'betHistory', title: 'Bet History', icon: IconBetHistory, href: '/wallet/bet-history' },
];
