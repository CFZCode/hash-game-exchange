import { getCurrency } from '../../../data/currencies';
import { printCurrency } from '../../../utils/currency';

/* `h` in `LocalAmountItem-DPF-Z1TQ.js` — the figure at the end of a coin row. Its own chunk on the
 * original, which is why it is shared here: `/wallet/balance` imports it through
 * `SelectCurrencyContent-Dr60XagM.js` and `/wallet/buy` imports it directly, two call sites of one
 * file. It lived inside the Balance pane as `RowAmount` until the second appeared, and moving it
 * is the same second-call-site rule `Select`, `GameTile`, `PageCard` and `Notice` moved under.
 *
 * THE HEADER DROPDOWN'S VERSION IS NOT THIS COMPONENT AND MUST NOT BE FOLDED IN. `rt` inside
 * `SelectLayer-CwsGOFvY.js` is a separate implementation of the same three arms — `ms-auto`
 * instead of `ml-auto`, an inner `dir="ltr"` wrapper, and `generalAmount` where this reads
 * `amount`. Same release, two files; see the note at the head of Balance/CurrencyList.jsx.
 *
 * Three arms, one Switch:
 *
 *   isFiat                     -> printCurrency(amount, name)
 *   !isFiat && localeCurrency  -> the converted figure, then the raw one in `.text-second`
 *   !isFiat && !localeCurrency -> the raw figure alone, hasAlias false
 *
 * `enableLocaleCurrency` is ON in this build, so the middle arm is what renders — which is what
 * both captures show: "$0.00" over a dim "0" on every crypto row, a single "$0.00" on a Cash row.
 *
 * BOTH CALL SITES PASS `class="ml-auto text-right"` AND BOTH ARE IGNORED — the chunk hardcodes
 * that string on its own root and never reads the prop. Written once, here, and no `className`
 * prop is offered, because offering one would invent a seam the original does not have. */
export default function LocalAmountItem({ item, settings }) {
  const isFiat = getCurrency(item.currencyName)?.currencyType === 'FIAT';
  const amount = item.amount;

  return (
    <div className="ml-auto text-right">
      {isFiat && printCurrency(amount, item.currencyName, { settings })}

      {!isFiat && settings.enableLocaleCurrency && (
        <>
          <div>{printCurrency(amount, item.currencyName, { settings })}</div>
          <div className="text-second">
            {printCurrency(amount, item.currencyName, {
              settings,
              target: item.currencyName,
              hasAlias: false,
            })}
          </div>
        </>
      )}

      {!isFiat && !settings.enableLocaleCurrency && (
        <div>{printCurrency(amount, item.currencyName, { settings, hasAlias: false })}</div>
      )}
    </div>
  );
}
