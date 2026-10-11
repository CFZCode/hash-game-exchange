import React from 'react';
import { useNavigate } from 'react-router-dom';
import Select from '../../../components/shared/Select';
import { showToast } from '../../../components/shared/Toast/toast';
import NumberInput from '../../../components/shared/NumberInput';
import { Accordion, AccordionItem } from '../../../components/shared/Accordion';
import { useSession } from '../../../context/session';
import { getCurrency } from '../../../data/currencies';
import { getAlias, printCurrency, convertCurrency, amount2usd } from '../../../utils/currency';
import { coinIcon } from '../../../utils/coinArt';
/* `IconHistory-CjLCSLET.js` is filed under `IconBetHistory` in that module — it was extracted for
   the account dropdown's Bet History row and named after the row rather than after the file. Same
   drawing, three consumers now (the dropdown, the wallet rail, this card); renaming it is a
   separate pass. `IconInform-Dfks8fNQ.js` is the same file the chunk imports. */
import {
  IconInform,
  IconBetHistory as IconHistory,
} from '../../../layouts/MainLayout/Header/AfterLogin/icons';
import {
  getVaultAmountList,
  getVaultLockOptions,
  getVaultDeposits,
  vaultTransferIn,
  vaultTransferOut,
  getVaultUnlockedBalance,
  vaultMinimum,
  dailyReturn,
} from '../../../services/vault';
import vCoin from '../../../assets/wallet/v-coin.png';
import useResource from '../../../hooks/useResource';
import Loading from '../../../components/shared/Loading';
import { PaneLoading } from '../../../components/shared/MenuPageLayout';

/* `/wallet/vault` — Vault Pro, the fifth wallet pane. `DialogVault` resolves to
 * `index-CrIWzX37.js` (9.5 KB), and unusually the page is spread over three chunks rather than
 * one: `useVaultPageRefresh-BbAisGjV.js` (20 KB — the summary card, the transfer panel, the FAQ
 * and the rules popup) and `useVaultTransfer-DALUu4Bx.js` (7.5 KB — the store, the amount field
 * and all the arithmetic), plus `PillTab-DPOiLQ1O.js`. All four off `hash.game/assets/`, so every
 * class list and string below is the Solid template's own.
 *
 * ── THE DATA IS NOT RECOVERABLE, WHICH IS A FIRST FOR THE WALLET PANES ────────────────────────
 *
 * Withdraw had `currencyTokens`, Buy Crypto had `fiats`/`coins`, Swap had `swap/config/`. This one
 * has nothing: `/vault/amount/list/` answers 6002 and there is no public config sibling (both
 * `/game/support/vault/config/` and `/vault/config/` 404). The one number that has to be invented
 * is `returnRatio` — the capture evidences 5% for USD and `services/vault.js` applies it to every
 * coin, flagged there as the single line to delete.
 *
 * ── TWO THINGS THE CHUNKS SETTLE THAT A SCREENSHOT WOULD HAVE GOT WRONG ───────────────────────
 *
 * `amountList` IS NOT "the coins you hold in the vault". It is a row per supported currency, and
 * the "No Asset yet" state comes from `filter(amount > 0)` rather than from an empty array. That
 * is why the capture can show an empty vault AND "APR 5%" at the same time: the transfer panel
 * finds its row, the asset table finds nothing to list. Building it the other way round — an
 * empty list for an empty vault — would print APR 0% and look like a bug in the fixture.
 *
 * THE HEADER IS ONE ROW, NOT TWO CARDS SIDE BY SIDE BY ACCIDENT. `<div class="justify-between
 * sm:flex">` with a fixed `sm:w-[523px] sm:shrink-0` summary and a `flex-1` transfer panel, so
 * below 640 they stack and the transfer panel is replaced by two buttons that push a dialog.
 *
 * ── NOT BUILT, each inert at its call site ────────────────────────────────────────────────────
 *
 *   the transfers    `/vault/amount/recharge/` and `/withdraw/`, both authenticated. The service
 *                    seams exist; the button carries the original's own disabled gate and stops.
 *   the mobile arm   `lt` (two buttons) and `se` (the transfer dialog), plus the per-row Transfer
 *                    In/Out popover. All behind `q.mobile`, a DEVICE test this build cannot make.
 *   Vault Pro Rules  `Je`, a popup that `PageLayout` only offers as a mobile header action.
 *   /wallet/interest the Interests button's destination, and the Vault filter on the transaction
 *                    pane. Both route to the rail's empty pane.
 *   the sort arrows  the asset table's four sortable columns. Written, but the table itself is
 *                    unreachable while every row is zero — see the note at `AssetTable`.
 *
 * Deliberately NOT ported: `ht` carries an obfuscated anti-tamper snippet (a `TextDecoder` over
 * hex-XOR'd bytes comparing `document.domain`, fired on a 27s timer). It is anti-tampering, not
 * UI, and reproducing it in a rebuild would be pure noise.
 */

/* `Le`/`Ie` — the Interests glyph, a $ inside a circle. Inlined in the chunk rather than shipped
   as its own icon module, unlike the History and Inform marks beside it, which are the same two
   files the wallet rail and the account dropdown already use. */
const IconInterests = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className}>
    <path d="M16.0004 4.19043C22.5223 4.19043 27.8094 9.47748 27.8094 15.9994C27.8094 22.5214 22.5223 27.8084 16.0004 27.8084C9.47846 27.8084 4.19141 22.5214 4.19141 15.9994C4.19141 9.47748 9.47846 4.19043 16.0004 4.19043ZM16.0004 6.72093C10.8761 6.72093 6.7219 10.8752 6.7219 15.9994C6.7219 21.1237 10.8761 25.2779 16.0004 25.2779C21.1247 25.2779 25.2789 21.1237 25.2789 15.9994C25.2789 10.8752 21.1247 6.72093 16.0004 6.72093ZM16.6684 9.25143V11.1544C17.7616 11.2623 18.8143 11.6402 19.5971 12.1531L18.7738 13.921C17.7751 13.3272 16.5875 12.9493 15.8317 12.9493C15.1164 12.9493 14.6306 13.2057 14.6306 13.7186C14.6306 15.4596 19.6646 14.4879 19.6511 17.8889C19.6511 19.5219 18.3959 20.4936 16.6684 20.696V22.7069H15.0489V20.669C13.8208 20.4936 12.6466 19.9672 11.7829 19.2385L12.6331 17.4975C13.6049 18.3612 14.9814 18.9146 15.9802 18.9146C16.8574 18.9146 17.3837 18.5907 17.3837 18.0103C17.3837 16.2289 12.3497 17.268 12.3497 13.921C12.3497 12.477 13.4024 11.4783 15.0489 11.2083V9.25143H16.6684Z" />
  </svg>
);

/* `b` in `PillTab-DPOiLQ1O.js`, its own chunk on the original. Two pills in a rounded track; the
   active one takes `bg-layer3_alt` and extra-bold. Kept local rather than shared because this is
   its only call site in the project so far — lift it the day a second one appears, as everything
   else in components/shared was lifted. */
function PillTab({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 rounded-lg p-1 ${className}`}>
      {tabs.map((label, index) => (
        <div
          key={label}
          className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-center text-sm transition-colors cursor-pointer ${
            value === index ? 'bg-layer3_alt font-extrabold text-primary' : 'font-semibold text-secondary'
          }`}
          onClick={() => onChange(index)}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

/* `_` in `rt` — the big figures, and they are SPLIT INTO SYMBOL AND NUMBER because the two render
 * at different sizes (a `text-lg` "$" beside a `text-[52px]` "0.00"). The original does that with
 * `Intl.formatToParts`, filtering the currency part out into one span and everything else into
 * the other, with a regex fallback that finds the first and last digit and slices around them.
 *
 * Reproduced through `formatToParts` only — the fallback exists on the original to catch a locale
 * whose parts it cannot classify, and there is no such locale in this build's single `en-US`.
 */
function splitCurrency(usdValue, settings) {
  const target = settings.enableLocaleCurrency ? settings.localeCurrencyName : 'USDFIAT';
  const value = target === 'USDFIAT' ? usdValue : convertCurrency(usdValue, 'USDFIAT', target);
  const format = new Intl.NumberFormat(settings.lang || 'en-US', {
    style: 'currency',
    currency: target.replace(/FIAT$/, ''),
  });
  const parts = format.formatToParts(Number(value) || 0);
  const symbol = parts
    .filter((part) => part.type === 'currency')
    .map((part) => part.value)
    .join('')
    .trim();
  const number = parts
    .filter((part) => ['integer', 'group', 'decimal', 'fraction', 'minusSign'].includes(part.type))
    .map((part) => part.value)
    .join('');
  return { symbol: symbol || '$', number };
}

/* `rt` — the summary card. Three figures, each the sum of one field across the vault rows,
 * CONVERTED TO THE DISPLAY CURRENCY COIN BY COIN before adding: `reduce((total, row) =>
 * total.add(convertCurrency(row[field], row.currencyName)))`. Summing raw amounts across coins
 * would be meaningless, and the original does not.
 *
 * The three buttons in the corner are `Interests` (-> /wallet/interest), `History` (-> the
 * transaction pane filtered to Vault) and a bare ⓘ that opens the rules popup. `History` is
 * `<Show when={!singleMode}>`, and the page passes `singleMode: false`, so it renders here — it
 * is the `/bc/vault` single-coin variant that hides it.
 */
function SummaryCard({ rows, settings, onRules }) {
  const navigate = useNavigate();

  /* `f()` in non-single mode: only funded rows count toward the totals. With this fixture that is
     none of them, so all three read zero — which is the capture. */
  const funded = rows.filter((row) => Number(row.amount) > 0);
  const total = (field) =>
    funded.reduce((sum, row) => sum + amount2usd(row[field] ?? 0, row.currencyName), 0);

  const figure = (field) => splitCurrency(total(field), settings);
  const value = figure('amount');
  const yesterday = figure('yesterdayReturn');
  const accumulated = figure('accumulatedReturn');

  const pill = 'flex h-6 w-24 items-center justify-center rounded-md border border-third bg-button_bright px-3 py-0 text-xs dark:bg-card dark:text-secondary/50';
  const glyph = 'size-4 dark:fill-secondary/50';

  return (
    <div className="w-full rounded-2xl border border-third bg-card p-4 sm:w-[523px] sm:shrink-0 sm:p-6">
      <div className="flex items-end justify-end space-x-1">
        <button type="button" className={pill} onClick={() => navigate('/wallet/interest')}>
          <IconInterests className={`icon ${glyph}`} />
          <span className="ml-1.5">Interests</span>
        </button>
        <button
          type="button"
          className={pill}
          onClick={() => navigate('/wallet/transaction?type=bill&billType=Vault')}
        >
          <IconHistory className={`icon ${glyph}`} />
          <span className="ml-1.5">History</span>
        </button>
        <div
          className="center h-6 w-6 cursor-pointer rounded-md border border-third bg-button_bright dark:bg-card"
          onClick={onRules}
        >
          <IconInform className={`icon ${glyph}`} />
        </div>
      </div>

      <div>
        <p className="text-base uppercase text-tertiary">Total Value</p>
        <div className="mt-3 flex items-end gap-2">
          {/* `font-semibold` IS THIS BUILD'S; the chunk says `font-bold`. THE REASON IS THE FONT
              SET, NOT TASTE. This project ships Averta at 400/600/800 only, and CSS font matching
              for a desired weight ABOVE 500 searches weights >= desired in ascending order first
              — so 700 finds 800 and `font-bold` renders the ExtraBold face, the very same one the
              digits beside it get from `font-extrabold`. The symbol and the number came out at
              identical weight, where the original has a real 700 against an 800 and the symbol
              reads a step lighter. 600 is a real face and is the only step below that exists, so
              it is the honest stand-in for a 700 this build cannot render.
              Same family of trap as the missing rupee glyph at 800 — see the note on the bare
              `font-family` declaration in index.css. The colour stays `text-primary`, the
              chunk's own. */}
          <span className="font-semibold translate-y-0 text-lg text-primary sm:translate-y-1 sm:text-2xl">
            {value.symbol}
          </span>
          <span className="text-[28px] font-extrabold leading-8 tracking-[2.6px] text-primary sm:text-[52px] sm:leading-[40px]">
            {value.number}
          </span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2">
        {[
          ['Last Day Return', yesterday],
          ['Total Return', accumulated],
        ].map(([label, parts]) => (
          <div key={label}>
            <p className="text-base uppercase text-tertiary">{label}</p>
            <div className="mt-3 flex items-end gap-1">
              {/* These two are already `font-semibold` in the chunk, which is why only the Total
                  Value symbol above needed changing — it was the one asking for a 700 that does
                  not exist. Nothing here is a departure. */}
              <span className="translate-y-0 pb-0 text-sm font-semibold text-primary sm:translate-y-[2px] sm:pb-0.5 sm:text-lg">
                {parts.symbol}
              </span>
              <span className="text-[20px] font-extrabold leading-6 text-primary sm:text-[28px] sm:leading-[34px]">
                {parts.number}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* `Et` in useVaultTransfer — the amount field. Same `uT` + Select pairing the Buy Crypto and Swap
 * pages use, with one addition of its own: a `Max` button in front of the Select, rendered only
 * when `max` is truthy. Note `precision` IS passed here (`b.getPrecision(currency)`) where the
 * other two pages leave it undefined — the shared NumberInput does not port the rounding step, so
 * it is inert either way and the note lives there.
 *
 * `Show when={pathname.includes("/bc/vault")}` swaps the Select for a static, unclickable label:
 * the BC-token vault deals in one coin. That route is not built and the arm is not reproduced.
 */
function VaultAmountField({ currency, options, value, min, max, onChange, onChangeCurrency, rows, isTransferIn, settings }) {
  return (
    <div>
      <NumberInput className="text-base" value={value} min={min} max={max} onChange={onChange}>
        {max ? (
          <button
            type="button"
            className="button button-second button-m button-input relative left-1 h-8 bg-none text-sm"
            onClick={() => onChange(max)}
          >
            Max
          </button>
        ) : null}
        <Select
          className="button-input border-none [&>*]:bg-transparent"
          size="s"
          title="Select Coin"
          value={currency}
          onChange={onChangeCurrency}
          options={options}
          search={(option, term) => option.toLocaleLowerCase().includes(term.toLocaleLowerCase())}
          optionRender={(code, selected) => {
            const meta = getCurrency(code);
            /* `t.isTransferIn ? [wallet[code]] : currencyList.filter(...)` — TRANSFERRING OUT
               shows the VAULT's holding of a coin, transferring in shows the wallet's. Two
               different numbers behind one row, and the fixture makes them both zero. */
            const vaultRow = rows.find((row) => row.currencyName === code);
            const shown = isTransferIn ? null : vaultRow;
            const amount = shown ? shown.amount : (vaultRow?.amount ?? '0');
            return (
              <div
                className={`mb-1 flex min-h-12 items-center rounded-lg px-2 py-1 ${
                  selected ? 'scroll-target bg-layer4' : ''
                }`}
              >
                <img className="h-6 w-6" alt="coin icon" src={coinIcon(code)} />
                <div className="ml-2">
                  <div className="flex items-center text-base font-extrabold">
                    {meta?.aliasCurrencyName ?? code}
                  </div>
                </div>
                <div className="ml-auto text-right">
                  <div>{printCurrency(amount, code, { settings })}</div>
                  {settings.enableLocaleCurrency && (
                    <div className="text-second">
                      {printCurrency(amount, code, { settings, target: code, hasAlias: false })}
                    </div>
                  )}
                </div>
              </div>
            );
          }}
        >
          {(option) => (
            <div className="flex flex-auto items-center rounded-lg">
              <img className="mr-1 h-5 w-5" alt="coin icon" src={coinIcon(option)} />
              <div className="text-left text-sm">{getCurrency(option)?.aliasCurrencyName ?? option}</div>
            </div>
          )}
        </Select>
      </NumberInput>
    </div>
  );
}

/* `Ke` — the desktop transfer panel, and `qe` the pill strip above it. Both live inside
 * `<div class="ml-6 flex flex-1 flex-col gap-4 …">`, which is the card in the capture's top right.
 *
 * The three rows under the input BRANCH ON DIRECTION, which is easy to miss because only one of
 * them is ever in a screenshot: Transfer In shows "Available" plus "Daily real-time return / APR",
 * Transfer Out shows a single "Vault Balance" line instead.
 */
function TransferPanel({ rows, balances, settings, options }) {
  const [tab, setTab] = React.useState(0);
  const isTransferIn = tab === 0;

  const walletCurrency = settings.currencyName;
  /* THE SELECTED COIN IS DERIVED DURING RENDER, NOT SEEDED INTO STATE, and the difference is a
     crash rather than a preference. A live session's wallet arrives from `/user/wallet/balances`
     a beat AFTER the shell mounts, so `options` is empty on the first paint — until it lands every
     row carries the visitor list's own `display: false`. A `useState` initialiser captures that
     empty moment and never corrects, which left `currency` as `undefined` for the life of the
     panel and threw inside `getAlias(undefined)` as soon as the amounts rendered.
     This is the trap the loading notes describe ("a `useState` seeded from a read breaks the
     moment the read is asynchronous") and this is the fix they prescribe: a `null` sentinel plus a
     derivation. It also fixes the quieter half — a panel that opened on `options[0]` because the
     wallet had not arrived yet now moves to the visitor's own selected coin when it does. */
  const [picked, setCurrency] = React.useState(null);
  const currency =
    (picked && options.includes(picked) ? picked : null) ??
    (options.includes(walletCurrency) ? walletCurrency : options[0]);
  const [amount, setAmount] = React.useState(0);

  /* The platform's two extra inputs, and the reads behind them. Both lists answer `[]` today —
     unseeded terms and no open deposits — so both selects stay unrendered and the panel is
     unchanged until an operator seeds. */
  const [terms, setTerms] = React.useState([]);
  const [deposits, setDeposits] = React.useState([]);
  const [term, setTerm] = React.useState(null);
  const [deposit, setDeposit] = React.useState(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [transferError, setTransferError] = React.useState('');
  const [transfers, setTransfers] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    Promise.all([getVaultLockOptions(), getVaultDeposits()]).then(([options, open]) => {
      if (!live) return;
      setTerms(options);
      setDeposits(open);
    });
    return () => {
      live = false;
    };
  }, [transfers]);

  const submitTransfer = async () => {
    if (submitting) return;
    const chosenTerm = term ?? terms[0];
    const chosenDeposit = deposit ?? deposits[0];
    setSubmitting(true);
    setTransferError('');
    try {
      if (isTransferIn) {
        /* `lockPeriod` is the term's `value`. With no terms seeded the platform refuses with
           `VAULT_LOCK_PERIOD_NOT_FOUND`, which is shown as it comes rather than pre-empted —
           a refusal that names the missing seed is more use than a disabled button. */
        await vaultTransferIn(currency, amount, chosenTerm?.value);
      } else {
        await vaultTransferOut(currency, amount, chosenDeposit?.depositId);
      }
      showToast(isTransferIn ? 'Transferred to Vault Pro.' : 'Withdrawn to your wallet.');
      setAmount(0);
      setDeposit(null);
      setTransfers((n) => n + 1);
    } catch (failure) {
      setTransferError(failure?.message || 'That transfer could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  const row = rows.find((entry) => entry.currencyName === currency);
  /* `/balance-controller/balance/unlocked/<currency>/` — a read of its own, refetched every time
     the coin changes, which is why it is `useResource` on a memoised reader rather than a direct
     call. While it is in flight the Available figure is the site's 12px inline spinner: the
     `[&>.loading]:size-3` variant in index-DxOqNczA.css exists for exactly this shape of slot,
     a figure that has not arrived yet inside a row that has. */
  const readBalance = React.useCallback(
    () => getVaultUnlockedBalance(currency, balances),
    [currency, balances],
  );
  const { data: balanceData, loading: balanceLoading } = useResource(readBalance);
  const { unlockedBalance } = balanceData ?? { unlockedBalance: '0' };

  /* `J` — the balance the form works against is the WALLET's unlocked amount when transferring
     in and the VAULT row's amount when transferring out. */
  const balance = isTransferIn ? Number(unlockedBalance) : Number(row?.amount ?? 0);
  const min = isTransferIn ? vaultMinimum(currency, balance) : 0;
  /* `aprPercentage` is `returnRatio * 100` and the chunk prints the product raw, which is fine
     for every value bc.game's own server sends — `0.05 * 100` is exactly 5 in IEEE754. It stops
     being fine the moment the rate is not a round hundredth: against the platform the ratio is
     built from a percentage (`3.5` -> `0.035`) and `0.035 * 100` is 3.5000000000000004, which
     this would print in full. The rate is `DECIMAL(10,4)` at source, so four places is the whole
     of its precision and rounding there cannot lose a digit — and it leaves every figure the
     original produces byte-identical, 5 included. */
  const apr = Number((((Number(row?.returnRatio) || 0) * 100).toFixed(4)));

  const pick = (next) => {
    setCurrency(next);
    setAmount(0);
  };

  const switchTab = (index) => {
    setTab(index);
    setAmount(0);
  };

  return (
    /* The chunk's `ml-6` is the parent row's `sm:gap-6` now, and `sm:min-w-[22rem]` is what makes
       the row wrap instead of squeezing this panel below its own content — see the row. */
    <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-third bg-card px-6 pb-6 pt-4 sm:min-w-[22rem]">
      <PillTab
        className="h-10 w-full border border-third"
        tabs={['Transfer In', 'Transfer Out']}
        value={tab}
        onChange={switchTab}
      />

      <div className="rounded-xl">
        <div className="mb-1.5 text-sm font-semibold text-secondary">Amount</div>

        <VaultAmountField
          currency={currency}
          options={options}
          value={amount}
          min={min}
          max={balance}
          onChange={setAmount}
          onChangeCurrency={pick}
          rows={rows}
          isTransferIn={isTransferIn}
          settings={settings}
        />

        {/* `min-h-[72px]` on the wrapper holds the panel's height steady across the two arms,
            which differ by a row. The colons are text nodes in the templates with the label
            inserted before them. */}
        <div className="min-h-[72px]">
          {isTransferIn ? (
            <>
              <div className="mb-3 mt-4 flex items-center">
                <span className="mr-2 text-sm font-semibold leading-6 text-tertiary">Available:</span>
                <span className="text-base font-extrabold text-primary [&>.loading]:size-3">
                  {balanceLoading ? (
                    <Loading className="inline-block align-middle" />
                  ) : (
                    printCurrency(unlockedBalance, currency, {
                      settings,
                      target: currency,
                      hasAlias: false,
                    })
                  )}
                </span>
              </div>
              <div className="mb-3 flex justify-between">
                <span className="text-sm font-semibold leading-6 text-tertiary">
                  Daily real-time return
                </span>
                <div className="text-sm font-semibold text-primary">
                  {/* `le(dailyReturnAmount())` then `getAlias(currency)` — two inserts with no
                      separator, which is why the capture reads "0USD" run together. Not a bug. */}
                  <span className="ml-1 text-base font-semibold text-secondary">
                    {dailyReturn(amount, row?.returnRatio)}
                    {getAlias(currency)}
                  </span>
                  <span className="ml-1 rounded-md bg-white_alpha5 px-1.5 py-0.5 text-base font-semibold text-brand">
                    <span className="mr-1">APR</span>
                    {apr}%
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-4 flex items-center">
              <span className="mr-2 text-sm font-semibold leading-6 text-tertiary">Vault Balance:</span>
              <span className="font-semibold text-primary">
                {printCurrency(balance, currency, { settings, target: currency })}
              </span>
            </div>
          )}
        </div>

        {/* THE TWO CONTROLS THE PLATFORM NEEDS AND bc.game DOES NOT, each drawn only when it has
            something to offer. bc.game's vault is instant at one published APR, so its panel is a
            coin and an amount; this one is a fixed-term deposit, so transferring IN needs a term
            and transferring OUT names a whole deposit rather than an amount. Neither select is
            rendered empty: `vault_lock_rates` is unseeded on this delivery (Part 4) and there are
            no open deposits, so today the panel looks exactly as it did — the difference appears
            when an operator seeds terms. */}
        {isTransferIn && terms.length > 0 ? (
          <div className="mt-3">
            <p className="input-label">Lock period</p>
            <Select
              className="mt-1.5 w-full bg-layer3"
              title="Lock period"
              value={term ?? terms[0]}
              options={terms}
              onChange={setTerm}
            >
              {(option) => (
                <span className="font-extrabold">
                  {option.label} · {option.rate}%
                </span>
              )}
            </Select>
          </div>
        ) : null}

        {!isTransferIn && deposits.length > 0 ? (
          <div className="mt-3">
            <p className="input-label">Deposit to close</p>
            <Select
              className="mt-1.5 w-full bg-layer3"
              title="Deposit"
              value={deposit ?? deposits[0]}
              options={deposits}
              onChange={setDeposit}
            >
              {(option) => (
                <span className="font-extrabold">
                  {option.amount} {option.coin} · ends {option.endTime ? String(option.endTime).slice(0, 10) : '—'}
                </span>
              )}
            </Select>
          </div>
        ) : null}

        <div>
          {/* `disabled = login && (loading || amount === 0)` — the original's own gate, and the
              transfer now runs behind it. Transferring OUT closes a whole deposit, so its arm is
              gated on having one picked rather than on the amount. */}
          <button
            type="button"
            disabled={submitting || (isTransferIn ? amount === 0 : !(deposit ?? deposits[0]))}
            onClick={submitTransfer}
            className="button button-brand button-m h-12 w-full rounded-[10px] text-base font-extrabold"
          >
            {isTransferIn ? 'Transfer to Vault Pro' : 'Withdraw to Wallet'}
          </button>
          {transferError ? <p className="mt-2 text-xs text-error">{transferError}</p> : null}
        </div>
      </div>
    </div>
  );
}

/* `he` — the empty state. `v-coin-DgGfa56b.png` is the deploy's own file, pulled off
   `hash.game/assets/`; the chunk imports it twice under two names and picks between them with a
   theme helper, and both names resolve to the same path in this build's release. */
const EmptyAssets = () => (
  <div className="rounded-2xl border border-third bg-card p-5 text-center sm:mt-5">
    <img alt="" className="mx-auto mb-4 h-12 w-12" src={vCoin} />
    <div>
      <div className="text-lg font-extrabold text-primary">No Asset yet</div>
      <div className="text-base text-secondary">Start earning by transferring assets to Vault Pro</div>
    </div>
  </div>
);

/* `w` — a stacked pair of chevrons beside a column heading, the active direction in brand green.
   Declared at module scope rather than inside `AssetTable`: a component defined during another
   component's render is remounted on every pass, which React's lint rejects outright and which
   would also drop any state it held. */
function Sorter({ field, className = '', sortField, sortOrder, onSort }) {
  return (
    <div
      className={`absolute -right-1 top-1/2 flex -translate-y-1/2 cursor-pointer flex-col ${className}`}
      onClick={() => onSort(field)}
    >
      {['asc', 'desc'].map((direction) => (
        <span key={direction} className={direction === 'desc' ? '-mt-1' : undefined}>
          <svg
            viewBox="0 0 32 32"
            className={`size-3 ${direction === 'asc' ? '-rotate-90' : 'rotate-90'} ${
              sortField === field && sortOrder === direction ? 'fill-brand' : 'fill-secondary'
            }`}
          >
            <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

/* `_e` — the asset table, or the empty state when nothing is funded. Its four columns each carry
 * a sort control, and the sort is not the obvious one: `currencyName` sorts on the FIRST
 * CHARACTER only (`(d[l]?.[0] || "").toUpperCase()` then `localeCompare`), while the three amount
 * columns convert to USD before comparing so a big holding of a cheap coin does not outrank a
 * small holding of an expensive one.
 *
 * WITH THIS FIXTURE THE TABLE NEVER RENDERS — every row is zero and the `> 0` filter empties it,
 * which is exactly the capture. The header and the sort are written out anyway because they are
 * one function each and because the day a funded row exists they are what has to be right.
 */
function AssetTable({ rows }) {
  const [sortField, setSortField] = React.useState(null);
  const [sortOrder, setSortOrder] = React.useState('asc');

  const funded = rows.filter(
    (row) => row.currencyName != null && row.amount != null && Number(row.amount) > 0,
  );

  if (funded.length === 0) return <EmptyAssets />;

  const usd = (value, currencyName) =>
    value == null || currencyName == null ? 0 : amount2usd(value, currencyName);

  const sorted = !sortField
    ? funded
    : [...funded].sort((a, b) => {
        if (sortField === 'currencyName') {
          const left = (a.currencyName?.[0] || '').toUpperCase();
          const right = (b.currencyName?.[0] || '').toUpperCase();
          return sortOrder === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
        }
        const left = usd(a[sortField], a.currencyName);
        const right = usd(b[sortField], b.currencyName);
        return sortOrder === 'asc' ? left - right : right - left;
      });

  const sortBy = (field) => {
    setSortOrder(sortField === field && sortOrder === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  const sorter = (field, className = '') => (
    <Sorter
      field={field}
      className={className}
      sortField={sortField}
      sortOrder={sortOrder}
      onSort={sortBy}
    />
  );

  return (
    <div className="rounded-2xl border border-third bg-card max-sm:pt-0 sm:mt-5 sm:pb-6 sm:pt-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-none justify-between rounded-xl bg-layer3 px-4 py-3">
          <div className="relative sm:w-24">
            <span className="relative">
              Assets
              {sorter('currencyName', '!-right-5')}
            </span>
          </div>
          {[
            ['Total Amount', 'amount'],
            ["Last Day's Return", 'yesterdayReturn'],
            ['Total Return', 'accumulatedReturn'],
          ].map(([label, field]) => (
            <div key={field} className="relative flex-1 text-right">
              <span className="relative inline-block pr-4">
                {label}
                {sorter(field)}
              </span>
            </div>
          ))}
          <div className="flex-1 text-right">Actions</div>
        </div>
      </div>
      {sorted.map((row) => (
        <AssetRow key={row.currencyName} item={row} />
      ))}
    </div>
  );
}

/* `I` in index-CrIWzX37.js — one figure in a row: the coin amount over its dollar value, with
   `"--"` rather than `"0"` when the amount is exactly the string "0". */
const AmountCell = ({ amount = '0', currencyName }) => (
  <div className="flex-1 max-sm:mt-2 max-sm:flex max-sm:justify-between">
    <div className="text-right">
      <div className="text-sm font-extrabold text-primary">
        {amount !== '0' ? printCurrency(amount, currencyName, { target: currencyName, hasAlias: false }) : '--'}
      </div>
      <div className="text-xs text-secondary">
        <span className="mr-1">≈</span>
        {printCurrency(convertCurrency(amount, currencyName), 'USDFIAT')}
      </div>
    </div>
  </div>
);

/* `me` — one funded coin. Unreachable with this fixture; see AssetTable. */
const AssetRow = ({ item }) => (
  <div className="rounded-lg text-sm">
    <div className="items-center justify-between border-b border-third p-3 pt-4 sm:flex">
      <div className="flex justify-between max-sm:mb-1 sm:w-24">
        <div className="center flex justify-start">
          <img className="h-5 w-5" alt="coin icon" src={coinIcon(item.currencyName)} />
          <div className="ml-1.5 font-extrabold leading-normal text-primary">{item.currencyName}</div>
        </div>
      </div>
      <AmountCell amount={item.amount} currencyName={item.currencyName} />
      <AmountCell amount={item.yesterdayReturn} currencyName={item.currencyName} />
      <AmountCell amount={item.accumulatedReturn} currencyName={item.currencyName} />
      <div className="flex flex-1 justify-end">
        <div className="center mr-1 cursor-pointer rounded-lg text-xs">Transfer In</div>
        <div className="center ml-1 cursor-pointer rounded-lg text-xs text-brand">Transfer Out</div>
      </div>
    </div>
  </div>
);

/* `Be`/`bt` — two questions, both verbatim en-US, and `__ENV_HOST__` expands through
   `license.host.toUpperCase()` as it does in the Buy Crypto disclaimer. */
const FAQ_ITEMS = [
  {
    question: 'When is the daily interest calculated, and how is it determined?',
    answer:
      'The daily interest is calculated every day on the amount that remains not withdrawn from ' +
      '00:00 to 23:59 (UTC+0). The interest is calculated at 02:00 (UTC+0), precisely 24 hours ' +
      'after the fund is deposited.',
  },
  {
    question: 'Can I trust that my funds in Vault Pro are safe?',
    answer:
      'Absolutely! BC.GAME ensures that the funds (cryptos) in Vault Pro are safeguarded and will ' +
      'not be accessed by anyone other than the depositor. Your funds are entirely yours, and they ' +
      'will always remain secure for your use.',
  },
];

function Faq() {
  const [open, setOpen] = React.useState(null);

  return (
    <div className="mt-5 w-full rounded-2xl border border-third bg-card px-4 py-6 lg:px-8">
      <div className="mx-auto w-full max-w-full">
        {/* `text-white` IS THE CHUNK'S OWN AND IS A LIGHT-THEME BUG ON THE LIVE SITE — kept, like
            `f-ull`, `texxt-sm` and the missing `dice` sprite. Verified rather than assumed:
            `useVaultPageRefresh-BbAisGjV.js` writes this `<p>` as
            `text-white mb-0 text-left text-lg font-extrabold`, and it is the only `text-white` in
            the whole 20 KB module. The card around it is `bg-card`, which is #FFFFFF in the light
            theme, so on bc.game itself this heading is white on white. `text-primary` is plainly
            what was meant and is one word away; it is not written, because reproducing the
            original includes reproducing what it gets wrong. */}
        <p className="text-white mb-0 text-left text-lg font-extrabold">Frequently Asked Questions</p>
        <div className="w-full">
          {/* `!space-y-0` beats the Accordion root's registered `space-y-4`; the rows are
              separated by their own `py-3` instead. */}
          <Accordion className="!space-y-0">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={item.question}
                open={open === index}
                onToggle={() => setOpen(open === index ? null : index)}
                itemClassName="overflow-hidden rounded-xl"
                triggerClassName="w-full rounded-b-none py-3 pl-0"
                contentClassName="rounded-b-xl pl-0 text-sm"
                trigger={<span className="mr-2 text-sm">{item.question}</span>}
              >
                <div className="flex flex-col gap-y-3 pb-3">
                  <div className="text-sm text-tertiary">{item.answer}</div>
                </div>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}

export default function VaultPro() {
  const { session, balances } = useSession();
  const settings = session.setting;
  /* `/vault/amount/list/` — the read the whole page is built on: the summary card's three totals,
     the transfer panel's APR and the asset table all reduce over it. So the pending arm is one
     boundary around all three rather than three placeholders, which is also why the FAQ below is
     outside it — it is copy compiled into the chunk and has nothing to wait for. */
  const readRows = React.useCallback(() => getVaultAmountList(balances), [balances]);
  const { data: rowData, loading } = useResource(readRows);
  const rows = rowData ?? [];

  /* `partition(orderBy(wallet, "sort"), display)` then grouped, fiat first — the same wallet list
     the Balance pane and the header dropdown build, and NOT `amountList`. A coin with no vault row
     is still offered; it simply reports no APR. */
  const options = React.useMemo(
    () =>
      balances
        .filter((coin) => coin.display)
        .map((coin) => coin.currencyName),
    [balances],
  );

  /* `PageLayout title="Vault"` writes into the dialog context and renders bare children on a
     page, so there is no heading above the card — the same helper that explains the missing
     headings on the deposit and withdraw panes. The `Vault Pro Rules` action it also takes is
     `mobile`-only and is not built. */
  return (
    <div className="max-sm:py-4">
      {loading || options.length === 0 ? (
        /* `options.length === 0` is the same wait one step earlier, and it belongs here rather
           than inside the panel: on a live session the wallet lands after the first paint, so for
           a frame there is no coin for the transfer form to open on. Mounting a form only once its
           data has arrived is the second idiom the loading notes prescribe. It cannot hold a real
           account open on the spinner — every row this build's wallet adapter produces carries
           `display: true` — and with fixtures the account is restored synchronously, so this arm
           is only ever the live cold load.

           `fO`'s own pane fallback — `h-96 center rounded-xl bg-layer4` around the spinner, read
           out of the shell's Suspense rather than chosen here; see `PaneLoading`. It stands for
           the summary card, the transfer panel and the asset table together, which is right
           because all three reduce over the one `amountList` read. The FAQ below stays: it is
           copy compiled into the chunk and has nothing to wait for. */
        <PaneLoading />
      ) : (
        <>
          {/* `sm:flex-wrap sm:gap-6` IS THIS BUILD'S, and the panel's `ml-6` moved into that gap.
              The chunk writes a bare `justify-between sm:flex` over a `shrink-0` 523px summary and
              a `flex-1` panel, which only fits once the pane is ~900px wide — on this build's
              1280 desktop the pane is 752, and the panel's content (its two tabs, the amount box,
              the `Transfer to Vault Pro` button) was cut off past the viewport's right edge, with
              the whole document scrolling sideways. Wrapping puts the panel under the summary at
              full width whenever it cannot sit beside it, and changes nothing from ~1440 up, where
              the row fits as the chunk lays it out. The gap replaces `ml-6` so a wrapped panel does
              not carry a stray 24px indent, and so the phone — where the row already stacks — no
              longer gets that margin either. */}
          <div className="justify-between sm:flex sm:flex-wrap sm:gap-6">
            <SummaryCard rows={rows} settings={settings} onRules={() => {}} />
            <TransferPanel rows={rows} balances={balances} settings={settings} options={options} />
          </div>
          <AssetTable rows={rows} />
        </>
      )}
      <Faq />
    </div>
  );
}
