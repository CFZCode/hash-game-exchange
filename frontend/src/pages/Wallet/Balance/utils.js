import { getCurrency } from '../../../data/currencies';
import { getAlias, amount2usd } from '../../../utils/currency';

/* `utils-CG1cE_om.js` — the pure half of the wallet's currency list: how rows are grouped, what a
 * group is called, and which rows a search or the "Hide 0 balance" switch leaves standing. The
 * components that render them are in CurrencyList.jsx, which is the original's own file boundary
 * (`utils-CG1cE_om.js` vs `SelectCurrencyContent-Dr60XagM.js`) and is also what `react-refresh`
 * wants: a module may export components or plain functions, not both.
 *
 * Both files came off `hash.game/assets/`; neither is in the mirror.
 */

/* `W` in utils-CG1cE_om.js. Three cases and a default — note this version has no `mNFT` or bonus
   arms, unlike the dropdown's `at`, and the missing space in the HIDE label is the original's. */
function groupTitle(key) {
  switch (key) {
    case 'FIAT':
      return 'Cash';
    case 'HIDE':
      return 'Other Supported Coin(Click to add and use Coins)';
    default:
      return 'Cryptocurrency';
  }
}

/* `re`:
 *
 *   orderBy(list, [c => amount2usd(c.amount, c.currencyName).toNumber(), c => c.display],
 *                 ["desc", "desc"])
 *     .filter(c => getCurrency(c.currencyName))
 *     |> groupBy(c => { const t = getCurrency(c.currencyName)?.currencyType;
 *                       return t === "CHAIN" || t === "VIRTUAL" ? "CHAIN" : t ?? "CHAIN" })
 *     |> orderBy(([k]) => { const i = ["FIAT","CHAIN"].indexOf(k); return i === -1 ? 999 : i })
 *
 * Two things worth reading twice. The `.filter` DROPS any wallet row the currency catalogue does
 * not know — a real guard here, since `getCurrency` is what the group key is read from. And the
 * final sort sends an unknown type to 999, i.e. LAST; the dropdown's version uses a bare `indexOf`
 * and sends it to -1, i.e. FIRST. Same shape, opposite answer, and this file follows this chunk.
 *
 * Ties fall back to the wallet's own `sort`, because the caller hands the list in that order and
 * both lodash `orderBy` and `Array.prototype.sort` are stable. With 90 rows at zero that tiebreak
 * is doing nearly all of the work.
 */
function groupWallet(list) {
  const ordered = [...list]
    .filter((coin) => getCurrency(coin.currencyName))
    .sort(
      (a, b) =>
        amount2usd(b.amount, b.currencyName) - amount2usd(a.amount, a.currencyName) ||
        Number(b.display) - Number(a.display),
    );

  const groups = new Map();
  ordered.forEach((coin) => {
    const type = getCurrency(coin.currencyName)?.currencyType;
    const key = type === 'CHAIN' || type === 'VIRTUAL' ? 'CHAIN' : (type ?? 'CHAIN');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(coin);
  });

  const rank = (key) => {
    const i = ['FIAT', 'CHAIN'].indexOf(key);
    return i === -1 ? 999 : i;
  };
  return [...groups.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
}

/* `ee` — the plain keyword test, run by `SelectCurrencyContent` itself before it defers to the
   caller's `filter`. Ticker, alias and full name, all lower-cased. */
function matchesKeyword(coin, query) {
  if (!query) return true;
  const meta = getCurrency(coin.currencyName);
  return (
    coin.currencyName.toLocaleLowerCase().includes(query) ||
    getAlias(coin.currencyName).toLocaleLowerCase().includes(query) ||
    (meta?.fullName ?? '').toLocaleLowerCase().includes(query)
  );
}

/* `te` — the Balance page's own `filter` prop, run after the keyword test above.
 *
 *   if (keyword && !matches) return false          // already done by matchesKeyword
 *   if (keyword && !isFiat) return true            // A SEARCH BEATS "Hide 0 balance"
 *   if (hideSmallCurrency) return displayStatus === 1 || convertCurrency(amount) > .1
 *   return true
 *
 * `isFiat` is a white-label BUILD flag and is false on bc.game's deploy, so the second line is an
 * unconditional early return whenever anything is typed — which is what makes the search usable on
 * a wallet of ninety mostly-empty coins. `displayStatus === 1` is the pin the original stamps on
 * any coin picked out of a search; it is the only way a zero balance survives the switch, and it
 * is why Cash / INR stays listed in this build with Hide 0 balance on. See context/account.js.
 *
 * `convertCurrency(amount, name)` with the target left at its default is plain USD, which is
 * `amount2usd`. Note this reads `amount`, where the dropdown's copy reads `generalAmount`.
 */
function passesHideSmall(coin, query, settings) {
  if (query) return true;
  if (!settings.hideSmallCurrency) return true;
  return coin.displayStatus === 1 || amount2usd(coin.amount, coin.currencyName) > 0.1;
}

export { groupTitle, groupWallet, matchesKeyword, passesHideSmall };
