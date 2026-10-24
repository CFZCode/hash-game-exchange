import React from 'react';
import Select from '../../components/shared/Select';
import { useSession } from '../../context/session';
import { getCurrency } from '../../data/currencies';
import { getAlias } from '../../utils/currency';
import { coinIcon } from '../../utils/coinArt';
import QrCode from './QrCode';
import { useIsDialog } from '../../context/dialogRoute';
import { IconCopy, IconArrow, IconSearch, IconClose } from '../../components/shared/icons';
import useResource from '../../hooks/useResource';
import { USE_FIXTURES } from '../../services/client';
import { depositQuickPicks, inWallet, ownerKind } from '../../services/currencies';
import Notice from '../../components/shared/Notice';
import {
  depositDefault,
  DEFAULT_CURRENCIES,
  networksFor,
  placeholderAddress,
  depositNotice,
  readCcpaymentCoins,
  createCcpaymentDeposit,
  readF2payMethods,
} from './deposit';
import { copyWithToast } from '../../utils/clipboard';
import ManualDeposit from './ManualDeposit';
import AutoDeposit from './AutoDeposit';
import { useGates } from '../../context/gates';
import { toastError } from '../../components/shared/Toast/toast';

/* `Ew` / `DepositCryptoPage` in index-C1xohM7W.js. Its body is four blocks in one card:
 *
 *   <div class="mt-1 rounded-xl bg-layer4 px-4 pb-4 pt-1 lg:px-8">
 *     {J0}                                  <- the quick-pick chips and "Add here"
 *     <div class="mt-3 flex items-center justify-between gap-3">
 *       <div class="relative flex-1 cursor-pointer">
 *         <div class="mb-1.5 text-secondary">Currency</div>{sy}
 *       {A1 class="!mt-0 ml-1.5 flex-1"}    <- the Network select, same shape
 *     {W8}                                  <- QR, address, notice
 *
 * The `lg:px-8` arm only applies when the page is NOT in a dialog (`!n` is `Go()`, the
 * is-desktop-dialog flag), and here it always is — so the card stays at `px-4`.
 */

/* `J0` — the quick-pick row.
 *
 * `const m = isDesktop ? 4 : 6` chips, then `crypto.slice(m, m + 3)` stacked inside the More
 * button. On the live site the list comes from `/payment/deposit/recently/currencies/` — the
 * coins you have deposited before — with `DEFAULT_CURRENCIES` as its initial value. No response
 * was captured, so the default renders, which is also what a first-time depositor sees.
 *
 * The overlap is `-ml-3` from the second image on with a DESCENDING z-index, so each coin sits
 * under the one before it rather than over it. Written as `length - index` exactly as the
 * original does; reversing it stacks the pile the wrong way and reads as a different control.
 */
function QuickPick({ currency, onPick, onOpenSelect }) {
  /* `const m = i ? 4 : 6` in `J0`, where `i` is the router's dialog context — FOUR chips in the
     dialog, SIX on the wallet page, with the next three going into the "More" stack either way.
     The wallet capture shows six (ETH BTC USDT USDC DOGE SOL) over a three-icon stack, which is
     how this was caught. See context/dialogRoute.js. */
  const count = useIsDialog() ? 4 : 6;
  /* Only the defaults the wallet carries — the wallet is already cut to the coins the owner
     enabled (services/currencies.js). Fixture mode keeps all ten. */
  const { balances } = useSession();
  const picks = depositQuickPicks(DEFAULT_CURRENCIES, balances);
  const chips = picks.slice(0, count);
  const rest = picks.slice(count, count + 3);

  return (
    /* `hide-scroll overflow-x-auto` + `flex-none` chips: six chips and the More pile are wider
       than a 390px phone, and a non-wrapping row pushed the whole page to 431px. */
    <div className="hide-scroll mt-2 flex items-center overflow-x-auto text-secondary">
      {chips.map((name) => (
        <button
          key={name}
          type="button"
          className={`button center mr-1 h-9 flex-none rounded-l-full rounded-r-full border bg-layer5 ${
            currency === name ? 'border-brand' : 'border-input'
          }`}
          onClick={() => onPick(name)}
        >
          <img className="mr-1 h-5 w-5" alt="" src={coinIcon(name)} />
          {getAlias(name)}
        </button>
      ))}

      {/* `notranslate` is the original's own — it stops a browser translating the ticker pile
          into something that no longer lines up. */}
      <button
        type="button"
        className="button notranslate center flex h-9 flex-none items-center rounded-l-full rounded-r-full border border-input bg-layer5"
        onClick={onOpenSelect}
      >
        {rest.length > 0 && (
          <div className="ellipsis mr-1 flex items-center">
            {rest.map((name, index) => (
              <img
                key={name}
                alt=""
                className={`relative size-5 ${index > 0 ? '-ml-3' : ''}`}
                style={{ zIndex: rest.length - index }}
                src={coinIcon(name)}
              />
            ))}
          </div>
        )}
        <span>More</span>
        {/* `rotate-180` in LTR: the chevron points left as drawn, so half a turn points it
            right. Not `-rotate-90` — this one is a "go on" arrow, not a dropdown caret. */}
        <IconArrow className="icon size-4 rotate-180 fill-current" />
      </button>
    </div>
  );
}

/* `sy` and its `A1` sibling. Both are the site's Select over a trigger whose whole label is
   custom: coin image, alias, then the chevron in its own `button-input` square — which is
   `FD`'s markup, not the Select's default tail, so both go through `labelRender`. */
function CoinTrigger({ currencyName }) {
  return (
    <div className="flex w-full items-center">
      <img className="h-6 w-6" alt="coin icon" src={coinIcon(currencyName)} />
      <div className="mx-2 font-semibold">{getAlias(currencyName)}</div>
      <div className="button-input center ms-auto h-6 w-6 rounded-md">
        <IconArrow className="icon size-4 -rotate-90 fill-secondary" />
      </div>
    </div>
  );
}

/* `fg` — the address box (`Address-C1AQxsEX.js`). Copy goes through `clipboard-Bk_Cr50k.js`,
   which writes and raises a bare "Copied" toast. The icon does not change; an earlier pass here
   flipped it green for 1.5s while there was no toast to confirm the copy. */
function AddressBox({ address }) {

  return (
    <div className="mt-1 flex min-h-10 items-center break-all rounded-lg border border-input bg-input_bright p-2">
      <span className="flex-auto">{address}</span>
      <button
        type="button"
        aria-label="Copy deposit address"
        className="ms-2 flex-none"
        onClick={() => copyWithToast(address)}
      >
        <IconCopy className="icon size-5 fill-secondary" />
      </button>
    </div>
  );
}

/* `Dn` (`UA` in index-BsFv7ByC.js) moved to `components/shared/Notice` when the withdraw form
   became its second consumer; `mt-4` was baked into it here and is a prop there, because the
   withdraw form needs `mt-2` on one of its two notices and no margin at all on the other. */

/* The CCPayment deposit — THIS BUILD'S: amount first, then the address CCPayment minted for that
   order, with the QR and the exact amount to send. The balance is credited by CCPayment's webhook
   (what arrived, once confirmed), so nothing is submitted after paying. Classes are the manual
   form's and this tab's own. Keyed on coin + network, so changing either starts a new order. */
function CcpayDeposit({ currency, network }) {
  const alias = getAlias(currency);
  const [amount, setAmount] = React.useState('');
  const [order, setOrder] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  const create = async (event) => {
    event.preventDefault();
    if (!(Number(amount) > 0) || busy) return;
    setBusy(true);
    try {
      setOrder(await createCcpaymentDeposit({ currency, amount, chain: network.chain }));
    } catch (failure) {
      toastError(failure, 'Could not create the deposit address');
    } finally {
      setBusy(false);
    }
  };

  if (!order?.details?.address) {
    return (
      <form onSubmit={create}>
        <div className="mb-1 mt-5 text-secondary">Deposit Amount ({alias})</div>
        <div className="input bg-input_bright text-base">
          <input inputMode="decimal" name="amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
        </div>
        <button type="submit" className="button button-brand button-m my-5 w-full" disabled={!(Number(amount) > 0) || busy}>
          {busy ? 'Loading…' : 'Get Deposit Address'}
        </button>
      </form>
    );
  }

  const { address, memo, amount: toSend, confirmsNeeded } = order.details;
  return (
    <>
      <div className="mt-4 @container">
        <div className="flex flex-col items-center @2xl:flex-row @2xl:items-center @2xl:gap-6">
          <div className="flex-none rounded-xl bg-layer3_alt p-2">
            <QrCode value={address} logo={coinIcon(currency)} className="block" />
          </div>
          <div className="mt-4 w-full @2xl:mt-0 @2xl:flex-1">
            <div className="flex items-center justify-between text-secondary">
              <span>
                Send exactly: <span className="font-extrabold text-primary">{toSend ?? order.amount} {alias}</span>
              </span>
              <button type="button" className="text-brand" onClick={() => setOrder(null)}>
                Change
              </button>
            </div>
            <div className="mt-3 text-secondary">Deposit address</div>
            <AddressBox address={address} />
            {memo && (
              <>
                <div className="mt-3 text-secondary">Memo</div>
                <AddressBox address={memo} />
              </>
            )}
          </div>
        </div>
      </div>
      <Notice className="mt-4">
        {depositNotice(alias, network.minDeposit)} Use the {network.label} network. Your balance is credited automatically
        {confirmsNeeded ? ` after ${confirmsNeeded} confirmation${confirmsNeeded === 1 ? '' : 's'}` : ' once the transfer is confirmed'}.
      </Notice>
    </>
  );
}

export default function CryptoTab() {
  const { session, balances } = useSession();
  const dialog = useIsDialog();

  /* The dialog tracks its own crypto selection (`state.cryptoCurrency`) separately from the
     wallet's, but seeds it from the account's currency — so opening the dialog on a fiat wallet
     still lands on a coin. BCD is not depositable, so a wallet sitting on it falls to the first
     quick-pick. */
  /* The site's default coin comes first for a player who has not picked one (`depositDefault`). */
  const siteDefault = depositDefault(session);
  const seed = siteDefault && getCurrency(siteDefault)?.currencyType !== 'FIAT' ? siteDefault : session.setting.currencyName;
  /* A fiat wallet (INR in the header) or an undepositable coin lands on the SITE'S default coin
     (the owner's `default_currency`, USDT) — not the quick-pick list's first entry, which is
     ETH and is the original's order, not this site's default. */
  /* `inWallet`: the fallback must be a coin the owner enabled, i.e. one the (cut) wallet carries —
     always true in fixture mode. Failing all named ones, the wallet's first crypto row. */
  const cryptoOk = (name) => Boolean(name) && name !== 'BCD' && getCurrency(name)?.currencyType !== 'FIAT' && ownerKind(name) !== 'fiat' && Boolean(networksFor(name)) && inWallet(balances, name);
  const initial = cryptoOk(seed)
    ? seed
    : [session.defaultCurrency, 'USDT', DEFAULT_CURRENCIES[0], ...balances.map((coin) => coin.currencyName)].find(cryptoOk) ?? DEFAULT_CURRENCIES[0];

  const [currency, setCurrency] = React.useState(initial);
  const networks = networksFor(currency);
  const [chain, setChain] = React.useState(networks[0].chain);

  /* Re-seeding on a currency change is a setState in an effect, which is the cascading render
     the lint rule rejects — so the network is reset in the setter instead, the same call every
     paging control in this project makes. */
  const pickCurrency = (name) => {
    setCurrency(name);
    setChain(networksFor(name)[0].chain);
  };

  const network = networks.find((item) => item.chain === chain) || networks[0];
  /* Fixture mode keeps its deliberately-fake placeholder. Live mode only ever shows an address
     CCPayment issued for an order (`CcpayDeposit`), for the coins it is set up for. */
  const gates = useGates();
  const { data: ccpayCoins, loading: ccpayLoading } = useResource(readCcpaymentCoins);
  const ccpay = !USE_FIXTURES && gates.autoDeposit() && (ccpayCoins ?? []).includes(currency);
  const address = USE_FIXTURES ? placeholderAddress(currency, network.chain) : null;
  /* No CCPayment for this coin: the manual transfer to the house's own addresses
     (admin → Bank details), whose networks replace the captured Network select. */
  const manual = !USE_FIXTURES && !ccpayLoading && !ccpay;
  /* F2Pay's crypto payin for this coin (USDT on TRON) beside the coin's own deposit, the player picking
     one like the Fiat tab's Manual / Automatic — THIS BUILD'S. Paid on F2Pay's page, credited in the coin. */
  const { data: f2payMethods } = useResource(readF2payMethods);
  const coinMethods = (f2payMethods ?? []).filter((m) => m.currency === currency);
  const auto = !USE_FIXTURES && !ccpayLoading && gates.autoDeposit() && coinMethods.length > 0;
  const [mode, setMode] = React.useState('own');
  const shownMode = auto ? mode : 'own';
  const alias = getAlias(currency);

  /* Every depositable coin in the wallet, which is what the Currency select lists —
     `G1(currencyName, isFiat, !isFiat)` keeps the crypto half. */
  /* The owner's `kind` decides too: MVR, AED… are not in the local catalogue, so `getCurrency`
     alone let them through as crypto. */
  const options = balances
    .filter((coin) => getCurrency(coin.currencyName)?.currencyType !== 'FIAT' && ownerKind(coin.currencyName) !== 'fiat')
    .map((coin) => coin.currencyName);

  /* `P(item, needle)` in utils-CG1cE_om.js — the layer's own search, matching the ticker and the
     full name. Held here rather than inside Select because the filter narrows the OPTIONS the
     component is given; the layer header that drives it goes in through `layerRender`. */
  const [needle, setNeedle] = React.useState('');
  const query = needle.toLocaleLowerCase();
  const matches = query
    ? options.filter(
        (name) =>
          name.toLocaleLowerCase().includes(query) ||
          (getCurrency(name)?.fullName ?? '').toLocaleLowerCase().includes(query),
      )
    : options;

  const triggerRef = React.useRef(null);

  return (
    /* `lg:px-8` IS IN THE ORIGINAL'S CLASS LIST (quoted at the top of this file) BUT MUST NOT BE
       A PLAIN UTILITY HERE. On the original the card is `P` in PageLayout-CcB1ecIM.js, which
       writes `clsx("rounded-xl bg-layer4 p-4", !isDialog && "lg:px-8", class)` — the wider padding
       is gated in JS on being a page, and only THEN by the viewport. As a bare `lg:px-8` it would
       fire inside the 480px dialog too, because `lg:` measures the window and not the card, and
       pad a narrow dialog by 32px a side. Hence the branch. Measured off the wallet capture at
       dpr 1.25 the pane's chips start 32 CSS px inside the card, which is the `lg:px-8` arm. */
    <div className={`mt-1 rounded-xl bg-layer4 px-4 pb-4 pt-1 ${dialog ? '' : 'lg:px-8'}`}>
      <QuickPick
        currency={currency}
        onPick={pickCurrency}
        /* `g.stopPropagation(); selectEl.click()` — the More chip does not open a list of its
           own, it clicks the Currency select's trigger below. */
        onOpenSelect={() => triggerRef.current?.querySelector('button')?.click()}
      />

      <div className="relative mt-3 pr-14 text-secondary">
        Didn&apos;t see your currency?
        {/* Opens the Manage Assets sheet on the original, which this build mounts from the
            wallet pill rather than from here — so the link is inert for now. */}
        <span className="cursor-pointer text-brand">Add here</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="relative flex-1 cursor-pointer" ref={triggerRef}>
          <div className="mb-1.5 text-secondary">Currency</div>
          {/* THE LAYER IS 400px WIDE AND AT LEAST 400 TALL, not `.dropdown-layer`'s default
              18rem. `zn` in Banner-TuTj1pp2.js hands the popover
              `class: clsx("min-h-[80vh] w-100 sm:min-h-100", e.class)` — so a phone gets four
              fifths of the viewport and everything from `sm` up gets a 25rem floor. Both beat
              `.dropdown-layer`'s own `max-height: 20rem` the same way `.currency-select` does:
              a min-height wins against a max-height.

              Its contents are `SelectCurrencyContent` — a sticky search bar over coin rows,
              which is why this call site supplies a `layerRender` header rather than using the
              bare option list. */}
          <Select
            value={currency}
            options={matches}
            onChange={pickCurrency}
            title="Select Currency"
            className="flex w-full items-center justify-between rounded-lg border border-input pe-2 ps-3"
            optionsClassName="w-100 min-h-[80vh] sm:min-h-100"
            labelRender={(value) => <CoinTrigger currencyName={value} />}
            layerRender={(rows) => (
              <>
                {/* `sticky top-[-1px] z-20 flex items-center justify-between pb-2 pt-1 sm:pt-4
                    bg-layer3` — the search bar's own class list, and the Input inside it is
                    `flex-auto text-base` with a `-order-1 size-6 fill-secondary` magnifier. */}
                {/* `sm:pt-2` where the chunk has `sm:pt-4` — a requested departure, one word, and the only
                    term that can move: the desktop layer is `.dropdown-layer`, whose padding is
                    `0 .5rem`, so the whole gap above this row IS this padding. (The phone arm
                    adds 8px of its own, since the bottom sheet takes `.select-options`'s
                    `padding: .5rem`.) Kept off `pt-1` so the sticky row does not collide with the
                    layer's own corner radius. */}
                <div className="search-input sticky top-[-1px] z-20 flex items-center justify-between bg-layer3 pb-2 pt-1 sm:pt-2">
                  <div className="input flex-auto bg-layer3 text-base">
                    <input
                      placeholder="Search"
                      value={needle}
                      onChange={(event) => setNeedle(event.target.value)}
                    />
                    <IconSearch className="icon -order-1 size-6 fill-secondary" />
                    {!!needle && (
                      <button type="button" aria-label="Clear" onClick={() => setNeedle('')}>
                        <IconClose className="icon size-6 fill-secondary" />
                      </button>
                    )}
                  </div>
                </div>
                {/* `matches.length`, NOT `rows.length` — `layerRender` is handed the rendered rows
                    as a single React ELEMENT, so `rows.length` is `undefined` and `undefined > 0`
                    is false: this tested itself into the not-found arm on every open and the coin
                    list never appeared at all. The count has to come from the filtered array the
                    call site already owns and passes as `options`. */}
                {matches.length > 0 ? (
                  rows
                ) : (
                  <div className="py-10 text-center leading-5 text-secondary">
                    Coin or token not found
                  </div>
                )}
              </>
            )}
          >
            {(value) => (
              <span className="flex items-center">
                <img className="mr-2 size-6" alt="" src={coinIcon(value)} />
                <span className="font-extrabold">{getAlias(value)}</span>
              </span>
            )}
          </Select>
        </div>

        {!manual && shownMode === 'own' && <div className="relative !mt-0 ml-1.5 flex-1 cursor-pointer">
          <div className="mb-1.5 text-secondary">Network</div>
          <Select
            value={network.chain}
            options={networks.map((item) => item.chain)}
            onChange={setChain}
            title="Network"
            className="flex w-full items-center justify-between rounded-lg border border-input pe-2 ps-3"
            labelRender={(value) => (
              <div className="flex w-full items-center">
                <div className="mx-2 font-semibold">
                  {networks.find((item) => item.chain === value)?.label}
                </div>
                <div className="button-input center ms-auto h-6 w-6 rounded-md">
                  <IconArrow className="icon size-4 -rotate-90 fill-secondary" />
                </div>
              </div>
            )}
          >
            {(value) => networks.find((item) => item.chain === value)?.label ?? value}
          </Select>
        </div>}
      </div>

      {/* `k8` verbatim. The `@container` pair puts the QR beside the address from `@2xl` (672px)
          up — the dialog is 480 wide, so it never fires and the code stays centred above. Kept
          because the same component renders full-width on the wallet page. */}
      {auto && (
        <>
          <div className="mb-1 mt-5 text-secondary">Deposit Method</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['own', ccpay ? 'Deposit Address' : 'Manual'],
              ['auto', 'Automatic'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`button button-m h-10 ${shownMode === value ? 'button-brand' : 'button-second'}`}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {shownMode === 'auto' ? (
        <AutoDeposit key={currency} currency={currency} methods={coinMethods} crypto />
      ) : ccpay ? (
        <CcpayDeposit key={`${currency}-${network.chain}`} currency={currency} network={network} />
      ) : !address ? (
        manual && <ManualDeposit key={currency} currency={currency} crypto />
      ) : (
        <div className="mt-4 @container">
          <div className="flex flex-col items-center @2xl:flex-row @2xl:items-center @2xl:gap-6">
            <div className="flex-none rounded-xl bg-layer3_alt p-2">
              <QrCode value={address} logo={coinIcon(currency)} className="block" />
            </div>
            <div className="mt-4 w-full @2xl:mt-0 @2xl:flex-1">
              <div className="text-secondary">Deposit address</div>
              <AddressBox address={address} />
            </div>
          </div>
        </div>
      )}

      {address && <Notice className="mt-4">{depositNotice(alias, network.minDeposit)}</Notice>}
    </div>
  );
}
