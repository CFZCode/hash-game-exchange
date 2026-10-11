import React from 'react';
import Select from '../Select';
import { useWalletFilter } from '../../../context/walletFilter';
import { useSession } from '../../../context/session';
import { getCurrency } from '../../../data/currencies';
import { coinIcon } from '../../../utils/coinArt';
import { TIME_RANGE, presetRange, resolveRange, clampRange } from '../../../services/transaction';

/* The two filter controls the wallet panes share — `Ce`/`ne` in `Assets-NsyfBPnl.js` and `x`/`se`
 * in `Time-Biy5hfP-.js`, each its own chunk on the original. Three consumers between them:
 * `/wallet/transaction`, `/wallet/rollover` (neither of these two, as it happens) and
 * `/wallet/bet-history`, which is what moved them out of the transaction pane.
 *
 * Two chunks, one module here, because they are always imported together, they are forty lines
 * apiece, and neither has a call site that wants one without the other. Split them the day one
 * does. Both read the filter store directly rather than taking props — that is the original's
 * arrangement, and it is what makes them drop-in: a pane composes them by listing them, not by
 * wiring them.
 *
 * The `optionLabel` helper is duplicated in each pane rather than exported from here, and that is
 * deliberate: `react-refresh/only-export-components` rejects a module that exports both a
 * component and a plain function, and three lines of JSX is cheaper than a third module.
 */

/* `Ce` — the Assets filter.
 *
 * THE WHOLE WALLET, not the displayed half: `orderBy(wallet, "sort")` with no `display` filter, so
 * all 148 rows are listed where the header dropdown shows 93. A ledger has to be filterable by a
 * coin you have since switched off.
 *
 * `"all"` is a SENTINEL, not a currency — it is mapped to `""` on the way into the store and back
 * to `"all"` on the way out, so the request body sends an empty string for "no filter". And the
 * original collapses the option away entirely when the wallet holds exactly one currency, writing
 * that one straight into the store; not reproduced, because this wallet holds 148 and a
 * single-currency deploy is a white-label case.
 *
 * Searches ticker OR full name, unlike the Vault and Buy Crypto selects, which match the raw
 * option only. Three call sites of one component, transcribed as each is written.
 */
export function AssetsFilter() {
  const { get, set } = useWalletFilter();
  const { balances } = useSession();

  const options = React.useMemo(
    () => ['all', ...[...balances].sort((a, b) => a.sort - b.sort).map((c) => c.currencyName)],
    [balances],
  );
  const value = get('assets') || 'all';

  return (
    <Select
      className="text-base"
      title="Assets"
      value={value}
      options={options}
      onChange={(next) => set('assets', next === 'all' ? '' : next)}
      search={(option, term) => {
        const needle = term.toLocaleLowerCase();
        if (option === 'all') return true;
        return (
          option.toLocaleLowerCase().includes(needle) ||
          (getCurrency(option)?.fullName ?? '').toLocaleLowerCase().includes(needle)
        );
      }}
    >
      {(option) => (
        <>
          {option !== 'all' && (
            <img className="mr-2 size-6" alt="coin icon" src={coinIcon(option)} />
          )}
          <div className="ellipsis w-0 flex-auto text-left">
            {option === 'all' ? 'All Assets' : (getCurrency(option)?.aliasCurrencyName ?? option)}
          </div>
        </>
      )}
    </Select>
  );
}

/* `x` — the Time filter. FOUR PRESETS PLUS A CONDITIONAL FIFTH: 90 days is dropped when the pane's
 * `type` filter is `withdraw` or `deposit`, whose window the server caps at 60.
 *
 * THAT TEST IS ON THE LITERAL STRINGS, which is why this component is portable across panes whose
 * `type` means completely different things. The transaction pane stores `"withdraw"`; the bet
 * history pane stores `""` or `"1".."8"`; the rollover pane stores `"0".."2"` and has no time
 * filter at all. Only the first can ever match, so only the first is ever capped — automatically,
 * with nothing passed in. Worth knowing before "fixing" the comparison to use an enum.
 *
 * The value stored is `preset:<ms>`; the selected preset is found by resolving the range back to a
 * span, so a custom range matches nothing and the trigger falls to "Custom". Only the presets are
 * built — the original puts a two-month calendar behind that entry.
 */
export function TimeFilter() {
  const { get, set } = useWalletFilter();
  const type = get('type');
  const capped = type === 'withdraw' || type === 'deposit';
  const max = capped ? TIME_RANGE.SIXTY_DAYS : TIME_RANGE.NINETY_DAYS;

  const options = React.useMemo(() => {
    const presets = [
      { label: 'Past 24 hours', value: String(TIME_RANGE.ONE_DAY) },
      { label: 'Past 7 days', value: String(TIME_RANGE.SEVEN_DAYS) },
      { label: 'Past 30 days', value: String(TIME_RANGE.THIRTY_DAYS) },
      { label: 'Past 60 days', value: String(TIME_RANGE.SIXTY_DAYS) },
    ];
    if (!capped) presets.push({ label: 'Past 90 days', value: String(TIME_RANGE.NINETY_DAYS) });
    return presets;
  }, [capped]);

  /* Clamped during render rather than written back in an effect. The original stores the clamped
     value; deriving it means a 90-day window survives a round trip through Withdraw instead of
     being flattened to 60 on the way past — the kinder of the two, and invisible until you switch
     back. */
  const [begin, end] = resolveRange(clampRange(get('time'), max));
  const span = String(end - begin);
  const value = options.find((o) => o.value === span) ?? { label: 'Custom', value: '' };

  return (
    <Select
      className="text-base"
      title="Select time range"
      value={value}
      options={options}
      onChange={(option) => set('time', presetRange(Number(option.value)))}
    >
      {(option) => <div className="ellipsis w-0 flex-auto text-left">{option.label}</div>}
    </Select>
  );
}
