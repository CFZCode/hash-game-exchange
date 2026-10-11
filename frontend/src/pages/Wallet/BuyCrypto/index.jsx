import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Select from '../../../components/shared/Select';
import Notice from '../../../components/shared/Notice';
import PopCenter from '../../../components/shared/PopCenter';
import LocalAmountItem from '../../../components/shared/LocalAmountItem';
import NumberInput from '../../../components/shared/NumberInput';
import { useSession } from '../../../context/session';
import { getCurrency } from '../../../data/currencies';
import { printCurrency } from '../../../utils/currency';
import { coinIcon } from '../../../utils/coinArt';
import { BUY_FIATS, BUY_COINS, defaultFiat, defaultCoin } from '../../../data/buyCrypto';
import { getBuyCryptoConfig, getBuyCryptoPrices } from '../../../services/buyCrypto';
import useResource from '../../../hooks/useResource';
import Loading from '../../../components/shared/Loading';

/* `/wallet/buy` — Buy Crypto, the third of the nine wallet panes.
 *
 * WHERE IT CAME FROM. `DialogBuyCrypto` resolves to `index-rDeBgnOO.js`, 8.7 KB, off
 * `hash.game/assets/` — and unlike deposit and withdraw the entry point is NOT a decoy: this one
 * file is the entire page, all 550 lines of it beautified. Its request module `api-C3PVkuGZ.js`
 * came with it. So every class list below is the Solid template's own and every string is
 * verbatim `t("…")`; nothing on this page is read off the screenshot.
 *
 * IT IS ONLY EVER A PANE ON A DESKTOP. There is exactly one route — `/buy` inside the `/wallet`
 * layout, whose `info.dialog = m.mobile` — so unlike `/deposit` and `/withdraw` there is no
 * second, top-level dialog path. Its own guard is `Pe.isFiat && "/deposit"`, which never fires on
 * this deploy. Hence no `Panels` split: there is no shell to split it out of.
 *
 * THE CARD IS WRITTEN OUT RATHER THAN BEING `PageCard`, AND THAT IS THE CHUNK'S DOING. `Te`
 * renders `<div class="mt-4 rounded-xl bg-layer4 p-4 sm:mt-0 lg:px-8">` inline — same three
 * classes as `P` in PageLayout-CcB1ecIM.js, plus a top margin below `sm`, and with `lg:px-8`
 * UNCONDITIONAL where `PageCard` drops it inside a dialog. The two agree in practice (this page
 * is a dialog only on a phone, where `lg:` cannot apply), but reaching for the shared component
 * would be substituting a lookalike for markup that was recovered. Written as the chunk has it.
 *
 * THE DATA. Both catalogues are a live unauthenticated answer — 42 fiats, 38 coins, see
 * `data/buyCrypto.js`. The quote is not: `/payment/buy-crypto/prices/` is a POST and answers 403,
 * so `coinAmount` is derived from one captured pair through `data/usdPrice.js`. That derivation,
 * and exactly which part of it is invented, is argued in `services/buyCrypto.js`.
 *
 * ── NOT BUILT, each inert at its call site rather than removed ─────────────────────────────────
 *
 *   the order          `makeOrder` -> `{redirectUrl}` -> `me`, a `.pop` holding a 600px Onramper
 *                      IFRAME with a "Content not loading? Click Here" link under it. The POST is
 *                      authenticated and there is nothing to authenticate against, so the Buy
 *                      Crypto button stops at the checkbox gate. The service seam exists.
 *   `useBuyHistory`    `/payment/buy-crypto/history/`, a paged POST this page never calls — it
 *                      belongs to the transaction pane.
 *   the payment method the price list is one row PER METHOD and the page reads `[0]`. With one
 *                      fixture row there is nothing to choose between; `paymentMethodTitle` and
 *                      `iconUrl` are rendered nowhere on this page in any case.
 *   `ErrorRest`        the retry boundary around the summary, whose `onError` sets `error: true`
 *                      and disables the button. Flattened — the fixture cannot throw.
 */

/* `P` — a label over an amount box with a currency Select in its trailing slot. Both rows on the
 * page are this component; `isFiat` is the only thing that differs between them, and it decides
 * three things at once: whether the Select's value carries the `FIAT` suffix, whether the rows get
 * the rich `optionRender` below, and (through the caller) which catalogue fills the list.
 *
 * `showAmount: true` is passed by the receive row and READ BY NOTHING — `P` never destructures it.
 * A dead prop, kept out of the signature rather than accepted and ignored.
 */
function AmountField({
  className = '',
  label,
  currency,
  isFiat,
  options,
  value,
  min,
  max,
  readOnly,
  loading,
  onChange,
  onChangeCurrency,
  settings,
  wallet,
}) {
  /* The trigger's label AND, for the fiat select, its rows — `nO` uses `children` for both unless
     `optionRender` overrides the rows. The coin mark is fetched under the option's own key, so a
     fiat renders `USDFIAT.png` and a coin renders `BTC.png`; all 42 and 35 of 38 were already in
     `assets/coins`, and CHZ, SUI and TRUMP were pulled from the same CDN for this page.

     `M[value]?.aliasCurrencyName || value.replace(/FIAT$/, "")` — the WALLET's alias with the
     suffix strip as the fallback, and note the optional chaining, which the row render below
     pointedly does not have. */
  const format = (option) => (
    <div className="flex flex-auto items-center rounded-lg">
      {option && <img className="mr-1 size-5" alt="coin icon" src={coinIcon(option)} />}
      <div className="text-left">
        {wallet[option]?.aliasCurrencyName || option.replace(/FIAT$/, '')}
      </div>
    </div>
  );

  /* The coin rows only. `const t = M[r()]` with no guard on the original — it assumes every coin
     the provider sells is in the wallet, which is true of a real session's 251 crypto rows and
     not of this build's 89 (see context/account.js, where the tail is deliberately not invented).
     CHZ, SUI and TRUMP are the three that fall through. Rather than crash or drop them, they get
     the row a real wallet would give them: the catalogue's alias and a zero balance, which is what
     every other coin in this fixture carries anyway. Nothing is invented by that; the zero is the
     fixture's own convention. */
  const rowFor = (code) =>
    wallet[code] || {
      currencyName: code,
      aliasCurrencyName: getCurrency(code)?.aliasCurrencyName || code,
      amount: '0',
    };

  return (
    <div className={`relative ${className}`}>
      {label && <div className="mb-1.5 text-secondary">{label}</div>}
      {/* The quote in flight. The input keeps its box and its currency select — only the figure
          is missing — so the spinner is absolutely positioned over where the digits sit rather
          than replacing the control, which would collapse the row and move the Select. */}
      {loading && (
        <div className="absolute bottom-0 left-3 flex h-12 items-center">
          <Loading />
        </div>
      )}
      {/* `uT`, now shared — the Swap page mounts the same control. `text-base` is `P`'s own,
          passed through to `$3`'s wrapper. */}
      <NumberInput
        className="text-base"
        value={loading ? '' : value}
        min={min}
        max={max}
        readOnly={readOnly}
        onChange={onChange}
      >
        <Select
          /* `border-none bg-input [&>*]:bg-transparent` — the trigger loses the Select's border
             because it is sitting INSIDE an `.input` that already has one, and the arbitrary
             child variant is what strips the chevron square's `bg-input_button`. `size="s"` is
             the one place in this project a Select is not `.button-m`.

             `bg-input` IS INERT, and it is inert on the live site too rather than only here. The
             Select writes `Y("select bg-input_bright", t.class)`, so both utilities land on the
             element and the emitted stylesheet decides — `.bg-input_bright` follows `.bg-input`
             in index-DxOqNczA.css (156899 against 156850) and again in this build's own CSS, so
             the trigger keeps the brighter fill either way. Checked in both stylesheets rather
             than assumed, because a class that loses a cascade race is exactly the kind of thing
             that would quietly start winning if the token order in `@theme` were reshuffled. */
          className="border-none bg-input [&>*]:bg-transparent"
          size="s"
          title={isFiat ? 'Select Currency' : 'Select Coin'}
          value={isFiat ? `${currency}FIAT` : currency}
          onChange={onChangeCurrency}
          options={options}
          /* `(r, t) => r.toLocaleLowerCase().includes(t.toLocaleLowerCase())` — the RAW option
             value and nothing else, so the fiat list matches on "USDFIAT" and neither list
             matches on a full name. The withdraw page's Currency select does search full names;
             these two are different components and are transcribed as written. */
          search={(option, term) =>
            option.toLocaleLowerCase().includes(term.toLocaleLowerCase())
          }
          optionRender={
            isFiat
              ? undefined
              : (code, selected) => {
                  const item = rowFor(code);
                  return (
                    <div
                      className={`fix-light-hover mb-1 flex h-12 cursor-pointer items-center rounded-lg px-2 py-1 hover:bg-layer4 ${
                        selected ? 'scroll-target bg-layer4' : ''
                      }`}
                    >
                      <img className="h-6 w-6" alt="coin icon" src={coinIcon(code)} />
                      <div className="ml-2">
                        <div className="flex items-center text-base font-extrabold">
                          {item.aliasCurrencyName}
                        </div>
                        {/* `currencyFullName` is off in the account fixture, as it is in the
                            capture, so this second line does not render. */}
                        {settings.currencyFullName && (
                          <div className="text-sm text-secondary">
                            {getCurrency(item.currencyName)?.fullName}
                          </div>
                        )}
                      </div>
                      <LocalAmountItem item={item} settings={settings} />
                    </div>
                  );
                }
          }
        >
          {format}
        </Select>
      </NumberInput>
    </div>
  );
}

/* `ne` — the two summary lines under a rule. Both go through `printCurrency` with `target` pinned
 * to the row's own currency, i.e. no conversion however `enableLocaleCurrency` is set: the point
 * of this block is to restate what you are paying and what you are getting in their own units.
 *
 * THE SOURCE CODE IS BARE HERE ("USD", not "USDFIAT") and that is what exposed the missing
 * source-equals-target short-circuit in `printCurrency` — see the note there. With it, "30 USD"
 * for any of the 42; without it, "0 INR" for 41 of them.
 *
 * The class is `Y("mt-4 text-base sm:text-sm", e.class)` over a call site passing
 * `mt-6 border-t border-third pt-6`. Both margins are in the list; `mt-6` is emitted later in the
 * spacing scale and wins, so the gap is 24px. Written out as the two the original produces. */
function Summary({ sendAmount, sendCurrency, coinAmount, receiveCurrency }) {
  return (
    <div className="mt-4 mt-6 border-t border-third pt-6 text-base sm:text-sm">
      <div className="flex items-center justify-between py-1">
        <div className="text-secondary">Estimate Total (including fee)</div>
        <div>{printCurrency(sendAmount, sendCurrency, { target: sendCurrency })}</div>
      </div>
      <div className="flex items-center justify-between py-1">
        <div className="text-secondary">Estimate to obtain</div>
        <div className="text-brand">
          {printCurrency(coinAmount, receiveCurrency, { target: receiveCurrency })}
        </div>
      </div>
    </div>
  );
}

/* `MA` — the site's checkbox, and it is a `<button>` wrapping a `.checkbox-ico` div that carries
   the `aria-selected` the CSS keys off. The tick SVG is always in the DOM at `opacity: 0` and
   cross-fades with the `::before` border; do not conditionally render it. Same markup as the
   MultiSelect rows in `components/shared/Select`. */
function Checkbox({ value, onChange, className = '' }) {
  return (
    <button
      type="button"
      className={`checkbox btn-like ${className}`}
      onClick={() => onChange(!value)}
    >
      <div className="checkbox-ico" {...(value ? { 'aria-selected': 'true' } : {})}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" shapeRendering="geometricPrecision">
          <path
            d="M7.77637 0.450195H10.2236C11.592 0.450195 12.592 0.450279 13.3799 0.514648C14.1622 0.5786 14.6969 0.703566 15.1426 0.930664C15.9721 1.35341 16.6466 2.02793 17.0693 2.85742C17.2965 3.30322 17.4214 3.83851 17.4854 4.62109C17.5497 5.40886 17.5498 6.4083 17.5498 7.77637V10.2236C17.5498 11.592 17.5497 12.592 17.4854 13.3799C17.4214 14.1622 17.2964 14.6969 17.0693 15.1426C16.6466 15.9721 15.9721 16.6466 15.1426 17.0693C14.6968 17.2965 14.1615 17.4214 13.3789 17.4854C12.5911 17.5497 11.5917 17.5498 10.2236 17.5498H7.77637C6.4083 17.5498 5.40886 17.5497 4.62109 17.4854C3.83851 17.4214 3.30322 17.2965 2.85742 17.0693C2.02793 16.6466 1.35341 15.9721 0.930664 15.1426C0.70352 14.6968 0.578588 14.1615 0.514648 13.3789C0.450319 12.5911 0.450195 11.5917 0.450195 10.2236V7.77637C0.450195 6.40801 0.450279 5.40796 0.514648 4.62012C0.5786 3.83779 0.703567 3.30313 0.930664 2.85742C1.35341 2.02793 2.02793 1.35341 2.85742 0.930664C3.30322 0.70352 3.83851 0.578588 4.62109 0.514648C5.40886 0.450319 6.4083 0.450195 7.77637 0.450195Z"
            fill="none"
            stroke="var(--color-brand)"
            strokeWidth="1.5"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M14.0382 6.8489L8.53208 12.5169C8.16569 12.8941 7.57165 12.8941 7.20526 12.5169L3.96191 9.1782C4.40027 8.64081 5.14907 7.94804 5.54815 7.60893L7.86867 9.94581C7.86867 9.94581 11.4664 6.12162 12.3331 5.22949C12.7841 5.63746 13.5819 6.31045 14.0382 6.8489Z"
            fill="var(--color-brand)"
          />
        </svg>
      </div>
    </button>
  );
}

/* `fe` — the Disclaimer popup, a `cl` at `h-1/3` over one paragraph. The copy is verbatim en-US,
 * and `__ENV_HOST__` in the bundle is a runtime placeholder the site expands through
 * `ee.license.host.toUpperCase()`, i.e. "BC.GAME". Substituted here rather than left as the token,
 * because there is no license object in this build to expand it with and shipping the placeholder
 * would put a build artefact on screen.
 *
 * `-mx-4 px-4` on the body cancels and reinstates `.pop-content`'s gutter, which lets the text's
 * own scrollbar sit at the card's edge. Kept as written. */
const DISCLAIMER =
  "You will be redirected to the Onramper payment service provided by a third party. Please read " +
  "and agree to the Onramper's Terms of Use before using their service. For any questions related " +
  "to payments, please contact Onramper's support team. BC.GAME is not responsible for any loss " +
  'or damage caused by the use of this payment service.';

export default function BuyCrypto() {
  const { session, balances } = useSession();
  const [searchParams] = useSearchParams();
  const settings = session.setting;

  /* `[fiats, coins]`, the chunk's own pair — two catalogues that answer unauthenticated. It is a
     `useResource` now that `request()` is asynchronous, and the fallback stays: the two module
     catalogues are the SAME data the fixture returns, so the two selects are populated on the
     first frame and only the option list can grow when the read lands. That is what lets this
     page have no shell of its own, unlike Swap next door, whose opening pair is seeded from its
     config and so cannot be chosen before it arrives. */
  const { data: config } = useResource(getBuyCryptoConfig);
  const [fiats, coins] = config ?? [BUY_FIATS, BUY_COINS];

  /* `createEffect(() => fiats.length && coins.length && setState({...}))` on the original, because
     its config arrives over the network. Here it is a module constant, so the same two calls seed
     `useState` and there is no effect — and `nO`'s own "value is not in options, select the first"
     guard, which exists to cover exactly that gap, never has anything to correct. */
  const [sendCurrency, setSendCurrency] = React.useState(
    () => defaultFiat(searchParams.get('from') || settings.localeCurrencyName).fiatCode,
  );
  const [receiveCurrency, setReceiveCurrency] = React.useState(
    () => defaultCoin(searchParams.get('to') || 'USDT').coinCode,
  );
  const [sendAmount, setSendAmount] = React.useState(30);
  const [checked, setChecked] = React.useState(false);
  /* Set by pressing Buy Crypto with the box unticked, cleared by ticking it. It turns the whole
     disclaimer row red and is the only thing that button does in this build. */
  const [checkTip, setCheckTip] = React.useState(false);
  const [disclaimer, setDisclaimer] = React.useState(false);

  /* `/payment/buy-crypto/prices/` — the quote, re-read on every change of the pair or the amount.
     It is 403 on hash.game (a price is struck for the account placing the order), so the fixture
     derives it; either way it is a real round trip and the "Estimate to obtain" figure has a
     pending state, which is where the spinner below goes. */
  const readPrices = React.useCallback(
    () => getBuyCryptoPrices(sendCurrency, sendAmount, receiveCurrency),
    [sendCurrency, sendAmount, receiveCurrency],
  );
  const { data: prices, loading: priceLoading } = useResource(readPrices);
  const priceItem = prices?.[0];

  /* The wallet, keyed by currency — `Ti` on the original, which is the store the coin rows read
     their alias and balance out of. */
  const wallet = React.useMemo(
    () => Object.fromEntries(balances.map((coin) => [coin.currencyName, coin])),
    [balances],
  );

  const fiatOptions = React.useMemo(() => fiats.map((row) => `${row.fiatCode}FIAT`), [fiats]);
  const coinOptions = React.useMemo(() => coins.map((row) => row.coinCode), [coins]);

  return (
    <div className="mt-4 rounded-xl bg-layer4 p-4 sm:mt-0 lg:px-8">
      <AmountField
        label="You pay with"
        isFiat
        currency={sendCurrency}
        options={fiatOptions}
        value={sendAmount}
        min={Number(priceItem?.minAmount)}
        max={Number(priceItem?.maxAmount)}
        onChange={setSendAmount}
        /* `n => m("sendCurrency", n.replace("FIAT", ""))` — the state holds the BARE code, which
           is why every read of it has to put the suffix back. */
        onChangeCurrency={(option) => setSendCurrency(option.replace('FIAT', ''))}
        settings={settings}
        wallet={wallet}
      />

      {/* The read-only receive box is the one field a quote actually fills, so it is where the
          site puts its spinner while one is in flight — the same `[&>.loading]:size-3` inline
          slot the Swap pane's Rate row uses, over the figure rather than beside it. */}
      <AmountField
        className="mt-3"
        label="Estimate to obtain"
        currency={receiveCurrency}
        options={coinOptions}
        value={priceItem?.coinAmount || 0}
        loading={priceLoading}
        readOnly
        onChange={() => {}}
        onChangeCurrency={setReceiveCurrency}
        settings={settings}
        wallet={wallet}
      />

      <Summary
        sendAmount={sendAmount}
        sendCurrency={sendCurrency}
        coinAmount={priceItem?.coinAmount || 0}
        receiveCurrency={receiveCurrency}
      />

      <Notice className="my-4">
        Depending on the blockchain, the deposit may take a few minutes to 1 hour to arrive.
      </Notice>

      {/* `[&>*]:text-error` beside `text-error` because the disclaimer link sets its own
          `text-primary`, which a colour on the parent alone could not beat. */}
      <div
        className={`flex h-6 items-center ${
          checkTip ? 'text-error [&>*]:text-error' : 'text-secondary'
        }`}
      >
        <Checkbox
          className="mr-1"
          value={checked}
          onChange={(next) => {
            setChecked(next);
            setCheckTip(false);
          }}
        />
        {/* `<Trans i18nKey="wallet.buycrpto.disclaimer">` — the key's own misspelling, and the two
            children are the sentence and the link. `ge` is a `<span>`, not an anchor: it pushes a
            popup rather than navigating. */}
        I have read and agree to the
        <span
          className="ml-1 cursor-pointer text-primary underline"
          onClick={() => setDisclaimer(true)}
        >
          disclaimer.
        </span>
      </div>

      {/* `disabled: info.loading || info.error` — both are the price resource's, and neither can
          be true against a synchronous fixture, so the button is live. What it cannot do is place
          the order: `makeOrder` is authenticated. It reproduces the gate in front of that (tick
          the box or the row turns red) and stops there.

          `button-m` is the Button component's, not the call site's — `ot` appends it on every
          desktop. Leaving it off is what rendered the withdraw page's Preview at 48px. */}
      <button
        type="button"
        className="button button-brand button-m center mt-8 w-full"
        onClick={() => {
          if (!checked) setCheckTip(true);
        }}
      >
        Buy Crypto
      </button>

      <PopCenter
        open={disclaimer}
        onClose={() => setDisclaimer(false)}
        title="Disclaimer"
        className="h-1/3"
      >
        <div className="-mx-4 px-4 text-secondary">{DISCLAIMER}</div>
      </PopCenter>
    </div>
  );
}
