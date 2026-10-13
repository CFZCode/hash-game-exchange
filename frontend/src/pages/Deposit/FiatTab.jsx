import React from 'react';
import Select from '../../components/shared/Select';
import { useSession } from '../../context/session';
import { getCurrency } from '../../data/currencies';
import { getAlias, printCurrency, toFiatStr } from '../../utils/currency';
import { coinIcon } from '../../utils/coinArt';
import { useIsDialog } from '../../context/dialogRoute';
import SevenDayBanner from './SevenDayBanner';
import HowToDeposit from './HowToDeposit';
import { channelIcon } from '../../utils/channelArt';
import {
  IconArrow,
  IconCheck,
  IconClose,
  IconEyeClose,
  IconInform,
  IconLink,
  IconSearch,
  IconDeposit,
} from '../../components/shared/icons';
/* `W1` — the same `IconBuycrypto-DVCGQYOc.js` the wallet rail and the account dropdown draw, which
   is why it is imported from the dropdown's module rather than copied. See the note at the head of
   `pages/Wallet/index.jsx` on that import. */
import tagArt from '../../assets/deposit/chip_tag.png';
import Skeleton from '../../components/shared/Skeleton';
import useResource from '../../hooks/useResource';
import { getRechargeBonusConfig } from '../../services/bonus';
import {
  depositDefault,
  channelsFor,
  chipBonusConfig,
  depositNotes,
  extraBonusAmount,
  groupInt,
  initialAmount,
  isMaintained,
  quickAmounts,
  rangeText,
} from './deposit';

/* `xw` / `DepositFiatPage` in index-C1xohM7W.js, over `UD` -> `DD` -> `ID` -> `SD` -> `ot`, plus
 * `yD` -> `E1` -> `bC` for the amount form. All of that is recovered — the 734KB chunk came off
 * `hash.game/assets/` along with `Banner-TuTj1pp2.js`, `utils-BRLjIBPE.js`,
 * `HowToDepositFiat-UEEoyF-D.js`, `SevenDayPayBanner-BD56xym6.js` and `api-B_IcOSNp.js` — so the
 * class lists below are the Solid templates' own and every string is verbatim i18n.
 *
 * THIS PAGE WAS BUILT FROM SCREENSHOTS FIRST AND REWRITTEN FROM THE CHUNKS LATER, and the diff
 * is the same lesson /deposit-offer and /promotions/weekly-raffle both taught. What survived:
 * the skeleton, the six channel names, the 100–50,000 range, the three quick amounts. What did
 * NOT:
 *
 *   - The method tile is a LOGO PLATE over a name, not a two-line name card: a
 *     `bg-layer3_alt` box holding an `h-6 sm:h-9` image, with the name below it.
 *   - The quick amounts are GENERATED, not listed. `lC` walks down from the maximum by powers
 *     of ten above a floor that is the deposit BONUS's minimum, not the channel's. That is why
 *     the ladder starts at 1,000 when the channel accepts 100 — and the recovered arithmetic
 *     reproduces the capture's three chips exactly from an independently fetched payload,
 *     which is the strongest check available on any of this. See deposit.js.
 *   - The corner tag on a chip is a background IMAGE (`sC`, a base64 PNG inlined in the chunk
 *     and extracted to assets/deposit/chip_tag.png), not a coloured box.
 *   - The 7-Day Deposit Guarantee pill is a real component with four PNGs, not the emoji
 *     gradient a screenshot suggested. See SevenDayBanner.jsx.
 *   - "How to make deposit?" and its instructions dialog exist at all.
 *
 * THE SUBMIT IS INERT. `/payment/deposit/fiat/create/` is the real path and it is authenticated;
 * beyond it sit KYC field lists, registration polling, an iframe checkout and a payment window,
 * none of which has a response here. Left enabled rather than disabled because the original's
 * is enabled at this point too.
 */

/* `ot` with `itemType: "row"`, inside `sa`. TWO LAYOUTS EXIST AND `isSmartRoute` PICKS:
 *
 *   Show when={!isSmartRoute} fallback={<ID/>} children={<xD/>}
 *
 * `xD` is the grouped one — categories under collapsible headings, and nothing below the grid
 * until you choose, because the amount form is inside `<Show when={method}>`. `ID` is this one:
 * sort by `sort`, select the first immediately, and show the grid with `hideRange` so the tiles
 * are logo-over-centred-name. The capture shows six tiles AND the amount form together, which
 * is what settles it as `ID`; the fixture's channels are marked accordingly.
 *
 * The grouped arm is not built. Worth knowing it also swaps the tile: `ED` passes
 * `itemType: currencyName === "INRFIAT" ? "col" : "row"`, and the `col` tile is a wide row with
 * a `h-12 w-20 sm:w-32` logo plate, capped at three with a View more/less toggle.
 *
 * `!p-2` beating the wrapper's own `px-4` is the original's; both are written. */
function MethodList({ channels, selected, onSelect }) {
  return (
    <div className="@container divide-y divide-third rounded-xl bg-input_bright px-4 !p-2">
      <div className="grid grid-cols-3 gap-x-1.5 gap-y-2 @[700px]:grid-cols-4">
        {channels.map((channel) => (
          <MethodTile
            key={channel.channel}
            channel={channel}
            selected={selected?.channel === channel.channel}
            onSelect={onSelect}
            /* `ID` passes it; `ED` does not, so the grouped arm shows "100 ~ 50,000" under
               each name and this one does not. */
            hideRange
          />
        ))}
      </div>
    </div>
  );
}

/* `an`. `hideRange` is passed by `ID`, so the range line is suppressed and the name takes
 * `text-center` — that pair is a single decision on the original and is reproduced as one.
 *
 * THE LOGO PLATE PRINTS THE CHANNEL NAME. On the live site the `<img>` takes `nightIcon` or
 * `lightIcon` off the channel payload, which is authenticated and not recoverable; the marks are
 * third-party payment brands, so sourcing them separately would be inventing assets rather than
 * recovering them. The plate keeps its box and its height either way, so the geometry is the
 * original's and only the ink differs. The day a real response exists this becomes the `<img>`
 * the chunk writes and the name below stops being a duplicate.
 *
 * `bg-layer4_alt` and `bg-layer3_alt` both resolve to their unsuffixed twins in the dark theme
 * and are separate tokens in the light one; written as the chunk has them. */
function MethodTile({ channel, selected, onSelect, hideRange }) {
  const maintained = isMaintained(channel);
  const range = hideRange ? '' : rangeText(channel);
  const eta = Number(channel.avgMinutesSpent) > 0 && !maintained;

  return (
    <div
      role="button"
      tabIndex={0}
      className={`relative cursor-pointer overflow-hidden rounded-xl bg-layer4_alt p-2 hover:opacity-90 ${
        selected ? 'border border-brand' : 'border border-transparent'
      }`}
      onClick={() => !maintained && onSelect(channel)}
      onKeyDown={(event) => {
        if (!maintained && (event.key === 'Enter' || event.key === ' ')) onSelect(channel);
      }}
    >
      {selected && (
        <div className="center absolute right-1 top-1 z-10 size-4 rounded-full bg-brand">
          <IconCheck className="icon size-3 fill-primary_brand" />
        </div>
      )}

      {/* `lt` — the corner ribbon a promoted channel carries. None of the fixture's rows does;
          the shape is `absolute left-0 top-0 z-10 rounded-br-xl rounded-tl-xl bg-gradient-to-tr
          from-[#E15A0F] to-[#F7931A] px-2 py-0.5 text-xs text-alw_white`. */}
      {!!channel.tag && (
        <div className="absolute left-0 top-0 z-10 rounded-br-xl rounded-tl-xl bg-gradient-to-tr from-[#E15A0F] to-[#F7931A] px-2 py-0.5 text-xs text-alw_white">
          {channel.tag}
        </div>
      )}

      {/* `ae` — the mask over a channel that is down, and the live DOM has it on the sixth
          tile: `bg-black_alpha20` over the whole card with the slashed eye in an
          `absolute-center`. The click is swallowed on the original and answered with a toast;
          there is no toast in this build, so it is swallowed silently. */}
      {maintained && (
        <div className="center absolute inset-0 z-10 flex size-full">
          <div className="size-full rounded-lg bg-black_alpha20" />
          <div className="absolute-center">
            <IconEyeClose className="icon size-6 fill-alw_white" />
          </div>
        </div>
      )}

      {/* The chunk's `<div class>` — an empty class attribute, which React drops. Kept as a
          wrapper because it is what groups the plate with the name under the masks above. */}
      <div>
        <div className="center relative rounded-lg bg-layer3_alt p-1">
          <img className="h-6 w-auto sm:h-9" alt="logo" src={channelIcon(channel.nightIcon)} />

          {/* `en` — the USDT ribbon on a channel with its own bonus ratio, drawn over the
              plate's left edge on a stretched background image. No channel here carries one. */}
        </div>

        {/* `text-center` rides on `hideRange` rather than being a second decision — the chunk
            writes `clsx("ellipsis mt-2", e.hideRange && "text-center")`. */}
        <div className={`ellipsis mt-2 ${hideRange ? 'text-center' : ''}`}>
          {channel.showName ?? channel.name}
        </div>

        {!!range && <div className="text-xs text-secondary">{range}</div>}

        {eta && (
          <div className="text-xs text-secondary">
            ETA: {Number(channel.avgMinutesSpent)} min
          </div>
        )}
      </div>
    </div>
  );
}

/* `cC` — the orange corner tag on a quick-amount chip. It is an absolutely positioned strip
   with a background IMAGE filling it (`<img class="absolute left-0 top-0 h-full w-full">`)
   under the text, not a coloured box; that art is `sC`, a base64 PNG inlined in the chunk and
   extracted whole. The `+` sits in the template, outside the interpolation. */
function BonusTag({ percent }) {
  return (
    <div className="absolute -right-[3px] -top-[2px] h-4.5 w-14 font-semibold">
      <img className="absolute left-0 top-0 h-full w-full" alt="tag" src={tagArt} />
      <div className="ellipsis relative text-xs text-alw_white">+{percent}%</div>
    </div>
  );
}

/* `dC` — the chips. The label is `toFiatStr` directly rather than `printCurrency`, which is why
   `utils/currency.js` exports it: the chunk branches on the currency type itself and picks
   between the fiat and crypto formatters.
   `Ot type="second"` is `.button.button-second`, over which the call site writes `bg-layer5`. */
function QuickAmounts({ amounts, amount, currencyName, loading, onChange }) {
  /* THE LADDER IS GENERATED FROM THE BONUS CONFIG, so until that read lands there is no chip row
     to draw — and drawing one anyway would be worse than drawing nothing, because `_l`'s floor
     defaults to 0 without it and the ladder comes out with rungs the real one does not have.
     Three placeholders at the chip's own size, so nothing below moves when they resolve.
     `Skeleton` is the site's own and it WRAPS rather than replaces (see its header), which is
     exactly what is wanted here: the buttons are real and correctly sized, and the pulse is
     painted over them. */
  if (loading) {
    return (
      <div className="mt-1 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((slot) => (
          <Skeleton key={slot} className="block" radius={0}>
            <div className="button button-second button-m relative border border-white_alpha5 bg-layer5" />
          </Skeleton>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-1 grid grid-cols-3 gap-2">
      {amounts.map((value) => {
        const bonus = chipBonusConfig(value, currencyName);
        return (
          <button
            key={value}
            type="button"
            className={`button button-second button-m relative border bg-layer5 ${
              Number(amount) === value ? 'border-brand' : 'border-white_alpha5'
            }`}
            onClick={(event) => {
              event.preventDefault();
              onChange(value);
            }}
          >
            {/* The chunk nests a second `<button type=button>` in here to hold the label, which
                is invalid markup a browser silently unnests; a span does the same job. */}
            <span>{toFiatStr(value, currencyName)}</span>
            {bonus && <BonusTag percent={Math.round(bonus.ratio * 100)} />}
          </button>
        );
      })}
    </div>
  );
}

/* `uT` — the site's number Input, ported down to what this tab uses. Two behaviours are the
 * original's and both matter: a value above `max` or below `min` is CLAMPED rather than
 * rejected, and a comma is read as a decimal point before parsing. The clamp runs on change
 * rather than in an effect, which is the same call every paging control in this project makes.
 *
 * `.input` is the shared primitive; `bg-input_bright text-base` is the call site's. */
function AmountInput({ value, min, max, onChange, children }) {
  const [text, setText] = React.useState(String(value));

  /* The box follows the chips: picking one has to rewrite the field. Held as a render-time
     comparison rather than an effect — `last` is state, so the reconciliation happens during
     the render that observes the new prop and never schedules a second pass. */
  const [last, setLast] = React.useState(value);
  if (last !== value) {
    setLast(value);
    setText(String(value));
  }

  /* `l` in `uT`, and it runs on every keystroke rather than on blur: a comma is read as a
     decimal point, a value past either bound is CLAMPED and the field rewritten to the clamped
     figure, and anything unparseable puts the last good value back. So typing 60000 into a
     50,000 box lands on 50,000 as you pass it. Partial input ("", "12.") is held in `text`
     without being pushed up, which is the one thing the original gets for free by writing to
     the DOM node directly. */
  const commit = (raw) => {
    const cleaned = String(raw).replace(/[^0-9.,]/g, '');
    setText(cleaned);
    if (cleaned === '' || cleaned.endsWith('.') || cleaned.endsWith(',')) return;

    const next = Number(cleaned.replace(',', '.'));
    if (Number.isNaN(next)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(Math.max(next, min), max);
    if (clamped !== next) setText(String(clamped));
    onChange(clamped);
  };

  return (
    <div className="input bg-input_bright text-base">
      <input
        inputMode="decimal"
        name="amount"
        value={text}
        onChange={(event) => commit(event.target.value)}
      />
      {children}
    </div>
  );
}

/* `MD` — the out-of-channels state: a warning over two rows that offer the ways round it.
 *
 *   [{ label: t("Buy Crypto"),     desc: t("Buy Crypto Instantly - Credit/Debit Card Accepted"),
 *      filter: routes.buy,         icon: <IconBuycrypto class="mt-1 size-6 flex-none self-start"/>,
 *      onClick: () => navigate("/wallet/buy"),                       button_label: t("Buy") },
 *    { label: t("Deposit Crypto"), desc: t("Deposit Crypto - Transfer from External Wallet"),
 *      filter: type === "normal",  icon: <IconDeposit    class="mt-1 size-6 flex-none self-start"/>,
 *      onClick: () => wallet.updateCurrency(wallet.state.cryptoCurrency),
 *                                                                    button_label: t("Deposit") }
 *   ].filter(r => r.filter)
 *
 * BOTH FILTERS PASS ON THIS DEPLOY, which is why both rows render. `routes.buy` is the wallet's
 * own routes profile — bc.game takes `main`, which lists `buy` (see pages/Wallet/menu.js) — and
 * `type === "normal"` is the deposit channel's, which nothing here sets away from its default.
 *
 * THE ROWS USED TO BE OMITTED and the note here said neither destination was built. That has been
 * false since the wallet's Buy Crypto pane landed: `/wallet/buy` is a real route, and the second
 * row does not navigate at all — `updateCurrency(cryptoCurrency)` switches the store's selected
 * currency to the crypto one, which is what flips the panel back to its Crypto tab. This build has
 * no such store, so the tab index is lifted to `Panels` and handed down as `onDepositCrypto`; the
 * observable behaviour is the same.
 *
 * Every fiat currency but INR lands here, because INR is the only one the capture holds channels
 * for. The `isMaintain` arm has its own wording and is unreachable without a maintenance payload;
 * it is written out because it is one line and the two strings are both verbatim i18n. */
function NoChannels({ onDepositCrypto, isMaintain = false }) {
  const rows = [
    {
      label: 'Deposit Crypto',
      desc: 'Deposit Crypto - Transfer from External Wallet',
      Icon: IconDeposit,
      onClick: onDepositCrypto,
      button: 'Deposit',
    },
  ];

  return (
    <>
      <div className="my-4 flex rounded-xl bg-warning/10 p-2 text-secondary">
        <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-warning" />
        <div>
          {isMaintain
            ? 'Our fiat deposit channels are currently under maintenance. Please use cryptocurrency deposits instead during this time.'
            : "Sorry, it is not currently supported to directly deposit this currency. Don't worry! You can still buy crypto by using your credit/debit card or deposit your existing crypto assets."}
        </div>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between border-b border-third py-4"
        >
          {/* `self-start` with a `mt-1` is what keeps the mark on the label's line when the
              description wraps to two, which it does at the dialog's width. */}
          <row.Icon className="icon mt-1 size-6 flex-none self-start" />
          <div className="mx-3.5 flex-auto">
            <div className="text-base">{row.label}</div>
            <div className="mt-1.5 text-tertiary">{row.desc}</div>
          </div>
          <button
            type="button"
            className="button button-brand button-m h-10 min-w-20 sm:min-w-28"
            onClick={row.onClick}
          >
            {row.button}
          </button>
        </div>
      ))}
    </>
  );
}

export default function FiatTab({ onDepositCrypto }) {
  const { session, balances } = useSession();
  const dialog = useIsDialog();

  /* `G1(currencyName, isFiat, !isFiat)` the other way round — the fiat half of the wallet.
     Seeded from the account's own currency when that is a fiat, which it is not in this
     fixture (BCD), so it falls to the first row. */
  const fiatOptions = balances
    .filter((coin) => getCurrency(coin.currencyName)?.currencyType === 'FIAT')
    .map((coin) => coin.currencyName);

  /* A fiat site default coin comes first for a player who has not picked one (`depositDefault`). */
  const siteDefault = depositDefault(session);
  const [currency, setCurrency] = React.useState(
    siteDefault && getCurrency(siteDefault)?.currencyType === 'FIAT' && fiatOptions.includes(siteDefault)
      ? siteDefault
      : getCurrency(session.setting.currencyName)?.currencyType === 'FIAT'
        ? session.setting.currencyName
        : (fiatOptions.find((name) => channelsFor(name).length > 0) ?? fiatOptions[0]),
  );

  const channels = channelsFor(currency);

  /* `ID`'s own effect: keep the current method if it is still in the list, else the
     `preSelectChannel`, else the first row. Nothing here sets a preselect. */
  const [channelId, setChannelId] = React.useState(channels[0]?.channel);
  const channel = channels.find((item) => item.channel === channelId) ?? channels[0];

  /* `/activity/recharge-bonus/config/current/`. Nothing on this tab renders the payload itself —
     it is read for the ladder, the corner tag and the Extra line, all of which go through
     `services/bonus.js`'s cache (see the note there). Mounting the resource is what STARTS that
     read and what re-renders this tab when it lands; the tab is the only place that does it. */
  const { loading: bonusLoading } = useResource(getRechargeBonusConfig);

  const amounts = channel && !bonusLoading ? quickAmounts(channel, currency) : [];
  /* `null` MEANS "NOT TYPED IN YET" — the same sentinel the withdraw and swap pages use, and here
     it is load-bearing rather than a style: `initialAmount` raises the seed to the ladder's first
     rung (500 to 1,000 for INR), the ladder needs the bonus config, and a `useState` initialiser
     runs once. Seeded eagerly, an INR box would open at 500 and stay there when the config landed.
     Derived during render it simply follows. */
  const [amount, setAmount] = React.useState(null);
  const shownAmount = amount ?? (channel ? initialAmount(channel, currency) : 0);

  const pickCurrency = (name) => {
    const next = channelsFor(name);
    setCurrency(name);
    setChannelId(next[0]?.channel);
    setAmount(null);
  };

  const pickChannel = (next) => {
    setChannelId(next.channel);
    setAmount(null);
  };

  const extra = extraBonusAmount(shownAmount, currency);
  /* The target is forced to the currency being deposited rather than the account's display one:
     what this figure promises is what will be credited in the currency you are paying in. */
  const money = (value) =>
    printCurrency(value, currency, { target: currency, settings: session.setting });

  /* `s()` in `yD`: modes 0/6/8/10 open a payment window and 5/15 an iframe; either way the
     button announces the destination. Anything else is a plain "Deposit". */
  const newWindow = channel && [0, 5, 6, 8, 10, 15].includes(channel.mode);

  const [needle, setNeedle] = React.useState('');
  const query = needle.toLocaleLowerCase();
  const matches = query
    ? fiatOptions.filter(
        (name) =>
          name.toLocaleLowerCase().includes(query) ||
          (getCurrency(name)?.fullName ?? '').toLocaleLowerCase().includes(query),
      )
    : fiatOptions;

  return (
    /* `vl` — PageLayout-CcB1ecIM.js, the whole of which is
       `clsx("rounded-xl bg-layer4 p-4", !isDialog && "lg:px-8", class)`. `xw` wraps the entire
       fiat tab in it, where the crypto tab writes its own card with `pt-1` instead. The `lg:`
       arm is gated in JS on being a page, not left as a bare utility, for the reason spelled
       out at the same spot in CryptoTab. */
    <div className={`rounded-xl bg-layer4 p-4 ${dialog ? '' : 'lg:px-8'}`}>
      <SevenDayBanner currencyName={currency} className="ml-auto mt-3" />

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="relative mr-0 flex flex-auto cursor-pointer items-center justify-between">
          {/* `mb-1.5` is the shared `vw` template's — the same label div the crypto tab uses,
              where it sits above the select rather than beside it. Here the row is
              `items-center`, so the margin lifts the word 6px off centre; that is the
              original's, not a slip. */}
          <div className="mb-1.5 text-secondary">Currency</div>
          {/* `sy` again, with the layer geometry `zn` gives it — 400px wide with a 400px floor
              from `sm` up, both beating `.dropdown-layer`'s own 20rem max-height.
              `w-full` UNDER `max-w-44`: the trigger fills its box and then stops at 176px,
              which is what the rendered DOM carries and what keeps the pill off the label. */}
          <Select
            value={currency}
            options={matches}
            onChange={pickCurrency}
            title="Select Currency"
            className="flex w-full max-w-44 items-center justify-between rounded-lg border border-input pe-2 ps-3"
            optionsClassName="w-100 min-h-[80vh] sm:min-h-100"
            labelRender={(value) => (
              <div className="flex w-full items-center">
                <img className="h-6 w-6" alt="coin icon" src={coinIcon(value)} />
                <div className="mx-2 font-semibold">{getAlias(value)}</div>
                <div className="button-input center ms-auto h-6 w-6 rounded-md">
                  <IconArrow className="icon size-4 -rotate-90 fill-secondary" />
                </div>
              </div>
            )}
            layerRender={(rows) => (
              <>
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
      </div>

      {!channel ? (
        <NoChannels onDepositCrypto={onDepositCrypto} />
      ) : (
        <>
          <div className="mb-1 mt-5 text-secondary">Deposit Method</div>
          <MethodList channels={channels} selected={channel} onSelect={pickChannel} />

          {/* Renders nothing for any channel here — none carries a guide, which the live DOM
              confirms by having no link between the grid and the form. Kept wired because the
              component and its copy are recovered; see HowToDeposit.jsx. */}
          <HowToDeposit channel={channel} className="ml-auto" />

          {/* `E1`'s own `<form>`. It wraps the amount block AND the submit, because on the
              original the KYC fields the channel asks for are rendered inside it too and the
              submit reads them back with `new FormData(e.currentTarget)`. No channel here has
              a `kycRequirement`, so the form holds only the amount — but it is what makes
              Enter in the box submit rather than doing nothing. */}
          <form onSubmit={(event) => event.preventDefault()}>
            <div className="mb-1 mt-5 flex items-start justify-between gap-2 text-secondary">
              <div className="min-w-0">
                Deposit Amount ({channel.minDepositAmount} - {groupInt(channel.maxDepositAmount)}{' '}
                {getAlias(currency)})
              </div>
            </div>

            <AmountInput
              value={shownAmount}
              min={0}
              max={Number(channel.maxDepositAmount)}
              onChange={setAmount}
            >
              {/* `iC` — zero below the bonus minimum rather than a smaller bonus, so the line
                  disappears entirely if you type 500 into an INR box. */}
              {extra > 0 && (
                <div className="px-2 font-extrabold text-success">Extra +{money(extra)}</div>
              )}
            </AmountInput>

            <QuickAmounts
              amounts={amounts}
              amount={shownAmount}
              currencyName={currency}
              loading={bonusLoading}
              onChange={setAmount}
            />

            {/* `tC` over `O1`. Inert — see the header note. The mark carries NO fill utility;
                `.icon` is `fill: currentColor`, so it takes the button's own ink. */}
            <button type="submit" className="button button-brand button-m my-5 w-full">
              {newWindow ? `Deposit Via ${channel.name}` : 'Deposit'}
              {newWindow && <IconLink className="icon ml-1 size-4" />}
            </button>
          </form>

          {/* `hD`'s BottomNotice — `<div class="space-y-2">` around the KYC banner (no
              requirement here), the numbered notes, and the per-region extras (none for INR).
              The daily-limit block that follows it on the original sits behind `when={!1}`. */}
          <div className="space-y-2">
            <div className="flex rounded-xl bg-success/10 p-2 text-secondary">
              <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-success" />
              <div>
                {depositNotes(channel).map((note) => (
                  <div key={note}>{note}</div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
