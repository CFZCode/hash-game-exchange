import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Select from '../../../components/shared/Select';
import NumberInput from '../../../components/shared/NumberInput';
import LocalAmountItem from '../../../components/shared/LocalAmountItem';
import CircleCountdown from '../../../components/shared/CircleCountdown';
import { useSession } from '../../../context/session';
import { getCurrency } from '../../../data/currencies';
import { getAlias, printCurrency } from '../../../utils/currency';
import { coinIcon } from '../../../utils/coinArt';
import { getSwapConfig, getSwapPrice, swapLimits, swapOptions } from '../../../services/swap';
import useResource from '../../../hooks/useResource';
import Loading from '../../../components/shared/Loading';
import { PaneLoading } from '../../../components/shared/MenuPageLayout';

/* `/wallet/swap` — the fourth wallet pane, and the second in a row whose entry point is the real
 * component rather than a white-label decoy. `DialogSwap` resolves to `index-CAixXPRC.js` (12 KB,
 * off `hash.game/assets/`), with `api-CW_rj_H1.js`, `CircleCountdown-C0Wkxy5W.js`,
 * `Image-D1QE7fNY.js` and the shared `LocalAmountItem` beside it. Every class list below is the
 * Solid template's own.
 *
 * ONE ROUTE, like Buy Crypto: `/swap` inside the `/wallet` layout, guard `Pe.isFiat && "/deposit"`
 * which never fires on this deploy. No dialog path of its own, so nothing to split out.
 *
 * ── THE DATA IS REAL ON BOTH SIDES, WHICH IS NEW ──────────────────────────────────────────────
 *
 * `GET /game/support/swap/config/` answers unauthenticated — the `game/support` family again — so
 * the coin list, the fee tables and the $1–$100,000 band are a live response (`data/swapConfig.js`).
 * `/swap/price/` is 403, but the page reads only `fromCurrencyPrice`, `toCurrencyPrice` and `f`
 * off it, and all three come out of live data: the first two from `data/usdPrice.js` and the
 * third from the config's own fee tables. So unlike the buy-crypto quote there is no calibration
 * constant here.
 *
 * AND IT CHECKS OUT AGAINST THE CAPTURE ON TWO INDEPENDENT FIGURES. The screenshot reads
 * "1 USDT ≈ 1 BCD" and "Swap fee 0 USDT"; the price table has USDT at 1 and BCD at exactly 1, and
 * `exchangeTrade` carries `{tradePair: "USDT_BCD", fee: 0}`. Neither was looked up with the
 * screenshot in view. The one inferred thing on the page is which of the three fee tiers wins,
 * argued in `services/swap.js`.
 *
 * ── WHY THE FORM OPENS EMPTY, AND WHY THAT IS CORRECT ─────────────────────────────────────────
 *
 * `He`'s first branch is `balance <= min ? amount = balance`. USDT's balance in this wallet is 0
 * against a $1 floor, so both boxes open at 0 and `Swap Now` is disabled — exactly the capture,
 * whose account was also empty. The button's disabled arm is the base reset's `opacity: .4`, which
 * is why it reads as a muted green there.
 *
 * ── NOT BUILT, each inert at its call site ────────────────────────────────────────────────────
 *
 *   the trade        `POST /game/support/swap/trade/`, authenticated. The service seam exists and
 *                    the button cannot reach it with this wallet anyway.
 *   "Swap Completed" `Qe`, a `.pop` with a 56px animated tick, "You've swapped __from__ to __to__"
 *                    and a "Play with __coin__ now" button that flips the wallet's selected
 *                    currency and navigates to /casino. Unreachable without the trade.
 *   `useSwap`        `/game/support/swap/history/`, which belongs to the transaction pane.
 *   the retry arm    the button becomes "Retry" and re-fetches the price when a quote failed. A
 *                    synchronous fixture cannot fail, so only the "Swap Now" label renders — the
 *                    branch is written out below because it is one expression.
 */

/* `Me` — `S` in `Image-D1QE7fNY.js`, the two-arrow swap glyph. Three paths: a down-arrow and an
   up-arrow in brand green (`#31EE88`, and note that is NOT `--brand`'s #24EE89 — it is the logo's
   own green, hard-coded in the chunk) either side of the `#C5DADE` curve. `opacity=0.94` on all
   three is the file's. The original wraps it in a <div> and binds an onClick it is never given
   here; the button around it owns the click. */
const SwapArrows = ({ className = '' }) => (
  <div className={className}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        opacity="0.94"
        d="M6.69357 15.0562H5.17314H3.11055H1.57834C1.43691 15.0562 1.29547 15.1034 1.16582 15.1741C0.776879 15.4216 0.647231 15.9638 0.871169 16.3881L3.46414 21.1615C3.53486 21.2911 3.62915 21.3972 3.74701 21.4679C4.12417 21.7036 4.61919 21.5622 4.84313 21.1615L7.41253 16.3881C7.48324 16.2584 7.5186 16.1052 7.5186 15.9402C7.5186 15.4569 7.15323 15.0562 6.69357 15.0562Z"
        fill="#31EE88"
      />
      <path
        opacity="0.94"
        d="M18.8218 9.88197V14.0307C18.8218 16.1287 17.8554 17.1541 15.9342 17.1541C14.013 17.1541 13.0348 16.1051 13.0348 14.0307V8.63263C13.0348 5.37963 11.0783 3.28168 8.061 3.28168C5.04373 3.28168 3.099 5.39141 3.099 8.63263V13.2057H5.16159V8.63263C5.16159 6.61718 6.18699 5.50927 8.061 5.50927C9.39285 5.50927 10.9604 6.07501 10.9604 8.63263V14.0307C10.9604 17.3309 12.8698 19.3699 15.9342 19.3699C18.9986 19.3699 20.908 17.3191 20.8844 14.0307V9.88197H18.81H18.8218Z"
        fill="#C5DADE"
      />
      <path
        opacity="0.94"
        d="M23.1357 7.58353L20.6016 2.86904C20.5309 2.7276 20.4248 2.62153 20.2952 2.53902C19.8944 2.29151 19.3759 2.43295 19.1401 2.86904L16.5943 7.54817C16.5236 7.6896 16.4764 7.84283 16.4764 7.99605C16.4764 8.49107 16.8418 8.90359 17.3133 8.90359H20.8963H22.1456H22.4167C22.5581 8.90359 22.6996 8.86823 22.8292 8.78572C23.2182 8.53821 23.3596 7.99605 23.1239 7.58353H23.1357Z"
        fill="#31EE88"
      />
    </svg>
  </div>
);

/* `ie` — one of the two amount blocks. The From and To halves are the same component; `isFrom`
 * decides the `≈$0.00` readout, the four percentage buttons, and nothing else. Whatever the call
 * site passes as `children` renders under all of it, which is how the balance row below ends up
 * inside the To block rather than beside it.
 */
function AmountBlock({
  className = '',
  label,
  isFrom,
  currency,
  options,
  value,
  min,
  max,
  disabled,
  readOnly,
  onChange,
  onChangeCurrency,
  settings,
  wallet,
  children,
}) {
  /* `d`/`u` in the chunk, and it drives the box's whole fill rather than just a ring: blurred is
     `bg-[#FAFAFA] dark:bg-[#363B3C]`, focused is `!border-brand bg-alw_white dark:bg-[#313637]`.
     None of the three literals is a token — #363B3C sits between layer4 and layer5, #313637 just
     under layer4, and #FAFAFA just off the light theme's layer2. Both arms of each pair are
     written; only the dark halves were, back when `dark:` still keyed off the visitor's OS. */
  const [blurred, setBlurred] = React.useState(true);

  /* `f = createMemo(() => [...list].sort((a, b) => wallet[b].amount - wallet[a].amount))` — the
     dropdown is ordered by BALANCE DESCENDING, not by the config's list order and not
     alphabetically. With one funded coin in this fixture that puts BCD on top and leaves the
     other thirty in the config's order, since Array#sort is stable. */
  const sorted = React.useMemo(
    () => [...options].sort((a, b) => Number(wallet[b]?.amount ?? 0) - Number(wallet[a]?.amount ?? 0)),
    [options, wallet],
  );

  return (
    <div className={className}>
      <div className="mb-2 flex justify-between text-secondary">
        {label}
        {/* `≈` is a text node in the template and the figure is appended after it. The default
            target applies here — no `target` override — so with `enableLocaleCurrency` on this is
            the converted dollar value, which is what "≈$0.00" in the capture is. */}
        {isFrom && settings.enableLocaleCurrency && (
          <div className="text-secondary">≈{printCurrency(value, currency, { settings })}</div>
        )}
      </div>

      {/* THE TWO PADDING VALUES HERE ARE THIS BUILD'S, NOT THE CHUNK'S — one-word reverts, and
          both were asked for. The original writes `p-1 pl-2.5`, i.e. 10px in front of the figure
          and 4px behind the coin pill (the utilities beat `.input`'s own `padding-inline: .75rem
          .5rem`, which is layered). `pl-1.5` takes the figure's side to 6px; the 4px behind the
          pill stays, because it is also what insets the 40px trigger inside the 48px box and
          zeroing it would sit a filled pill flush against the border. The pill's OWN trailing
          padding is trimmed at the Select below instead, which is where the rest of the gap on
          that side actually comes from. */}
      <NumberInput
        className={`!h-12 pl-2 text-xl text-primary hover:border-second ${
          blurred
            ? 'bg-[#FAFAFA] dark:bg-[#363B3C]'
            : '!border-brand bg-alw_white dark:bg-[#313637]'
        }`}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        readOnly={readOnly}
        onChange={onChange}
        onFocus={() => setBlurred(false)}
        onBlur={() => setBlurred(true)}
      >
        <Select
          className="center h-10 cursor-pointer rounded-lg border-none bg-input_button ps-3 pr-2 [&>*]:bg-transparent"
          title="Select Coin"
          value={currency}
          onChange={onChangeCurrency}
          options={sorted}
          /* Ticker OR full name, which is a real difference from the Buy Crypto page's selects —
             those match the raw option only. Two call sites of one component, transcribed as
             each is written. */
          search={(option, term) => {
            const needle = term.toLocaleLowerCase();
            return (
              option.toLocaleLowerCase().includes(needle) ||
              (getCurrency(option)?.fullName ?? '').toLocaleLowerCase().includes(needle)
            );
          }}
          optionRender={(code, selected) => {
            const item = wallet[code];
            return (
              /* `min-h-12` here where the Buy Crypto row is `h-12`, and the selected row takes
                 `bg-layer4` with no `scroll-target` — the two pages' rows are near-identical and
                 differ in exactly those two places. */
              <div
                className={`fix-light-hover mb-1 flex min-h-12 cursor-pointer items-center rounded-lg px-2 py-1 hover:bg-layer4 ${
                  selected ? 'bg-layer4' : ''
                }`}
              >
                <img className="h-6 w-6" alt="coin icon" src={coinIcon(code)} />
                <div className="ml-2">
                  <div className="flex items-center text-base font-extrabold">
                    {item.aliasCurrencyName}
                  </div>
                  {settings.currencyFullName && (
                    <div className="text-sm text-secondary">
                      {getCurrency(item.currencyName)?.fullName}
                    </div>
                  )}
                </div>
                <LocalAmountItem item={item} settings={settings} />
              </div>
            );
          }}
        >
          {/* The trigger. Note it reads the BLOCK's currency rather than the render argument, so
              it always shows the committed coin. */}
          {() => (
            <div className="flex items-center">
              {currency && <img className="h-5 w-5" alt="coin icon" src={coinIcon(currency)} />}
              <span className="ml-1 mr-2 text-base font-extrabold">{getAlias(currency)}</span>
            </div>
          )}
        </Select>
      </NumberInput>

      {/* `max` is already floored at the balance by `He`, so these are percentages OF WHAT YOU
          HOLD, not of the $100,000 ceiling. `type="second"` is `.button-second`, which this
          project added for the referral page. */}
      {isFrom && (
        <div className="mt-1 flex justify-between gap-1">
          {[0.25, 0.5, 0.75, 1].map((part) => (
            <button
              key={part}
              type="button"
              disabled={disabled}
              className="button button-second button-m h-8 flex-1 border border-third"
              onClick={() => onChange((Number(max) || 0) * part)}
            >
              {part * 100}%
            </button>
          ))}
        </div>
      )}

      {children}
    </div>
  );
}

/* `GET /game/support/swap/config/` is the page's one blocking read: the offered list, the fee
 * tables and the $1..$100,000 band all come out of it, and the opening pair is seeded from that
 * list into `useState`. So the form cannot be mounted before it lands — a seed taken from an
 * empty list would stick, since a `useState` initialiser runs once. That is why the boundary is
 * a SHELL around the form rather than a branch inside it, which is also how the original is
 * arranged: `ErrorRest` wraps the whole panel and the chunk's own `Suspense` is outside `Ne`.
 *
 * The retry arm of `ErrorRest` is still not built — a synchronous fixture could not trip it and
 * a delayed one cannot either; only a real fetch can fail.
 */
export default function Swap() {
  const { data: config, loading } = useResource(getSwapConfig);

  if (loading || !config) {
    /* `PaneLoading` — `fO`'s own Suspense fallback for a `/wallet/*` pane, read out of the shell
       (see its note). It carries `bg-layer4` unconditionally even though THIS pane has no card
       below 640, and that is right rather than an oversight: on the original the boundary belongs
       to the shell, not to the pane, so it draws the same box whatever the pane inside it would
       have drawn. `my-4` is the pane's own outer margin, kept so nothing shifts when it settles. */
    return <PaneLoading className="my-4 sm:mt-0" />;
  }

  return <SwapForm config={config} />;
}

function SwapForm({ config }) {
  const { session, balances } = useSession();
  const [searchParams] = useSearchParams();
  const settings = session.setting;

  const wallet = React.useMemo(
    () => Object.fromEntries(balances.map((coin) => [coin.currencyName, coin])),
    [balances],
  );

  /* `s()` — THE OFFERED LIST IS THE CONFIG'S INTERSECTED WITH THE WALLET, which is the original's
     own filter (`config.list.filter(c => wallet[c] && wallet[c].amount >= 0)`, inside a try/catch
     that swallows a missing row). It matters here: 43 coins come back from the config and this
     build's wallet fixture holds 31 of them, so 31 are offered. On a real session, whose wallet
     carries 251 crypto rows, all 43 would be. Nothing needs inventing for the other twelve —
     the original would not show them either without a wallet row.

     The filter moved into `swapOptions` when the page went live, because the rule is not the same
     against a backend that publishes no swappable list — see the note there, and in particular
     why `/user/swap/balances` is NOT it. */
  const options = React.useMemo(() => swapOptions(config, balances), [config, balances]);

  /* `Ye(list, want, otherWant)` — the opening pair, from `?from=`/`?to=` defaulting to USDT/BCD.
     The FROM side falls back to the first offered coin; the TO side falls back to the first coin
     that is not already the FROM one, which is what stops the page opening on a self-swap. */
  const initial = React.useMemo(() => {
    const from = options.find((c) => c === (searchParams.get('from') || 'USDT')) ?? options[0] ?? '';
    const wantTo = searchParams.get('to') || 'BCD';
    const to = options.find((c) => c === wantTo) ?? options.find((c) => c !== from) ?? '';
    return { from, to };
  }, [options, searchParams]);

  const [fromCurrency, setFromCurrency] = React.useState(initial.from);
  const [toCurrency, setToCurrency] = React.useState(initial.to);
  const [amount, setAmount] = React.useState(null);
  /* The arrow spins 180° on every press and stays there — `c(l => !l)`, a parity flag, not a
     one-shot animation. Two presses put it back at 0. */
  const [flipped, setFlipped] = React.useState(false);
  /* `expiredTime = Date.now() + 30_000`, re-seeded whenever the pair changes and when the ring
     empties. Held in state so `onComplete` can restart it; the ring itself is uncontrolled. */
  const [quotedAt, setQuotedAt] = React.useState(() => Date.now());

  /* `/swap/price/` is re-read on every pair change and on every re-quote, so it is its own
     resource keyed on the pair. It is NOT part of the shell above: the rate arriving late leaves
     the two amount boxes at 0 for a beat, which is what the live page does between quotes, and
     the Swap Now button's own `!ready` gate already covers it. */
  const readPrice = React.useCallback(
    () => getSwapPrice(fromCurrency, toCurrency),
    [fromCurrency, toCurrency],
  );
  const { data: price, loading: priceLoading } = useResource(readPrice);
  const fromPrice = Number(price?.fromCurrencyPrice) || 0;
  const toPrice = Number(price?.toCurrencyPrice) || 0;
  const feeRate = price?.f;

  /* `new Big(fromCurrencyPrice).div(toCurrencyPrice)` — how many TO you get for one FROM. */
  const rate = fromPrice && toPrice ? fromPrice / toPrice : 0;

  const balance = Number(wallet[fromCurrency]?.generalAmount ?? 0);
  const limits = swapLimits({ amount: amount ?? 0, from: fromCurrency, fromPrice, balance });

  /* `null` means "not typed in yet", the same sentinel the withdraw page uses and for the same
     reason: the original re-seeds through an effect on every quote, which is the cascading render
     this project's lint rejects. Deriving during render gets the same figure, and the two setters
     below reset it so a new pair re-seeds. */
  const fromAmount = amount ?? limits.amount;
  const toAmount = Math.floor(fromAmount * rate * 1e8) / 1e8;

  const ready = !!fromCurrency && !!toCurrency && rate > 0;
  const outOfRange = fromAmount <= 0 || fromAmount < limits.min || fromAmount > limits.max;

  const repick = (next) => {
    setFromCurrency(next.from);
    setToCurrency(next.to);
    setAmount(null);
    setQuotedAt(Date.now());
  };

  /* `onChangeCurrency` on either block: PICKING THE COIN THE OTHER SIDE ALREADY HOLDS SWAPS THEM
     rather than creating a self-swap. Both blocks do it, in opposite directions. */
  const pickFrom = (next) =>
    repick(next === toCurrency ? { from: toCurrency, to: fromCurrency } : { from: next, to: toCurrency });
  const pickTo = (next) =>
    repick(next === fromCurrency ? { from: toCurrency, to: fromCurrency } : { from: fromCurrency, to: next });

  return (
    /* `sm:bg-layer4 sm:p-6` — BELOW 640 THIS PAGE HAS NO CARD AT ALL, just the controls on the
       page background. That is a real difference from every other wallet pane, which carry
       `PageCard`'s unconditional `rounded-xl bg-layer4 p-4`. Written as the chunk has it. */
    <div className="relative my-4 rounded-xl sm:mt-0 sm:bg-layer4 sm:p-6 lg:px-8">
      <AmountBlock
        isFrom
        label="From"
        currency={fromCurrency}
        options={options}
        value={fromAmount}
        min={Math.min(limits.balance, limits.min)}
        max={limits.max}
        onChange={setAmount}
        onChangeCurrency={pickFrom}
        settings={settings}
        wallet={wallet}
      />

      {/* The rule with the swap button centred on it. The `<div>` is the line and
          `.absolute-center` puts the 40px square over it — that helper was added to index.css for
          the deposit dialog and is the original's own. */}
      <div className="center relative my-3 h-10">
        <div className="absolute left-0 right-0 top-1/2 border-t border-third" />
        <div className="center absolute-center size-10 rounded-lg border border-third bg-layer5">
          <button
            type="button"
            aria-label="Swap direction"
            className="center flex h-full w-full"
            onClick={() => {
              repick({ from: toCurrency, to: fromCurrency });
              setFlipped((value) => !value);
            }}
          >
            <SwapArrows
              className={`ease-in text-primary duration-300 ${flipped ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
        </div>
      </div>

      <AmountBlock
        label="To"
        currency={toCurrency}
        options={options}
        value={toAmount}
        /* `ge(v, rate)` — typing in the TO box divides back through the rate and re-multiplies,
           so the pair stays consistent and the FROM figure is the one that moves. */
        onChange={(next) => {
          if (!rate) return;
          setAmount(Math.floor((next / rate) * 1e8) / 1e8);
        }}
        onChangeCurrency={pickTo}
        settings={settings}
        wallet={wallet}
      >
        {/* Both figures are the FROM currency's wallet row — the To block renders them, but they
            describe what you are spending. `hasAlias: false` drops the ticker; the labels' colons
            are text nodes in the template with the label inserted before them. */}
        <div className="mb-4 mt-3 flex justify-between rounded-md py-2">
          <div className="flex">
            <div className="mr-1 whitespace-nowrap text-secondary">Deposit Balance:</div>
            <div>
              {wallet[fromCurrency]
                ? printCurrency(wallet[fromCurrency].generalAmount, fromCurrency, {
                    settings,
                    target: fromCurrency,
                    hasAlias: false,
                  })
                : '-'}
            </div>
          </div>
          <div className="flex">
            <div className="mr-1 whitespace-nowrap text-secondary">Bonus Balance:</div>
            <div>
              {wallet[fromCurrency]
                ? printCurrency(wallet[fromCurrency].bonusAmount, fromCurrency, {
                    settings,
                    target: fromCurrency,
                    hasAlias: false,
                  })
                : '-'}
            </div>
          </div>
        </div>
      </AmountBlock>

      <div className="border-t border-third pt-4 text-base sm:text-sm">
        <div className="mb-1 flex justify-between rounded py-1">
          <span className="text-secondary">Rate</span>
          <span className="flex items-center text-primary">
            {/* Thirty seconds a quote. `onComplete` re-fetches on the original; here the price is
                a module-constant derivation, so re-seeding the clock is the whole of it and the
                ring simply starts again. */}
            <CircleCountdown endTime={quotedAt + 30 * 1000} onComplete={() => setQuotedAt(Date.now())} />
            <span className="ml-1 [&>.loading]:size-3">
              {/* Three states, not two. `inputLoading` is the quote in flight and the site's own
                  12px inline spinner is what stands in for the rate — the `[&>.loading]:size-3`
                  variant in index-DxOqNczA.css is written for a figure-sized slot like this one.
                  The dash is the arm for a pair that has no rate at all. */}
              {priceLoading ? (
                <Loading className="inline-block align-middle" />
              ) : !ready ? (
                '-'
              ) : (
                `1 ${getAlias(fromCurrency)} ≈ ${printCurrency(rate, toCurrency, {
                  settings,
                  target: toCurrency,
                })}`
              )}
            </span>
          </span>
        </div>
        <div className="mb-1 flex justify-between rounded py-1">
          <span className="text-secondary">Estimated Time</span>
          {/* "30 " is a literal in the template and only the word is translated. */}
          <span className="text-primary">30 Seconds</span>
        </div>
        <div className="mb-1 flex justify-between rounded py-1">
          <span className="text-secondary">Swap fee</span>
          <span className="text-primary">
            {feeRate === undefined || feeRate === '-' || Number.isNaN(Number(feeRate))
              ? '-'
              : printCurrency(Number(feeRate) * fromAmount, fromCurrency, {
                  settings,
                  target: fromCurrency,
                })}
          </span>
        </div>
      </div>

      {/* `disabled = inputLoading || btnLoading || (ready && outOfRange)`. `inputLoading` IS
          reachable now — it is the quote in flight — and it is the first term, so the button is
          dead and spinning while a new pair is priced rather than briefly reading "Retry". With
          a zero USDT balance `fromAmount` is then 0, which fails the range test and leaves it
          disabled, as the capture shows. `btnLoading` is the trade itself and is not built.
          `button-m` is the Button component's own, not the call site's. */}
      <button
        type="button"
        disabled={priceLoading || (ready && outOfRange)}
        className="button button-brand button-m center mx-auto mt-4 w-full sm:mt-3"
        onClick={() => setQuotedAt(Date.now())}
      >
        {priceLoading ? <Loading className="text-current" /> : ready ? 'Swap Now' : 'Retry'}
      </button>
    </div>
  );
}
