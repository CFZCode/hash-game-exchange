import React from 'react';
import Select from '../../../components/shared/Select';
import PageCard from '../../../components/shared/PageCard';
import Notice from '../../../components/shared/Notice';
import { IconArrow, IconAddressBook, IconSearch, IconClose, IconInform } from '../../../components/shared/icons';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../context/session';
import { getCurrency } from '../../../data/currencies';
import { getAlias, printCurrency } from '../../../utils/currency';
import { coinIcon } from '../../../utils/coinArt';
/* The captured token table cut to the owner's enabled networks (identity in fixture mode). */
import { tokensFor } from '../../../services/currencies';
import {
  getWithdrawFee,
  getUnlockedBalance,
  CRYPTO_WITHDRAW_AVAILABLE,
} from '../../../services/withdraw';
import { WithdrawConfirm, WithdrawResult } from './Confirm';
import FiatForm from './FiatForm';
import { withdrawNotices } from './withdraw.jsx';
import { useIsDialog } from '../../../context/dialogRoute';
import useResource from '../../../hooks/useResource';
import Loading from '../../../components/shared/Loading';

/* `/wallet/withdraw` — the crypto withdraw form.
 *
 * WHERE IT CAME FROM. `DialogWithdraw` resolves to `Withdraw-Cm5hmogC.js`, which is a decoy in
 * the same way the deposit entry point is: 3.5 KB of white-label switch (`config.type === "mx"`)
 * in front of the real thing. The UI is `index-B3pypdyg.js`, 62 KB, holding the crypto form, the
 * fiat form, the lightning form and every notice between them. Both came off `hash.game/assets/`;
 * neither is in the mirror. So the class lists below are the Solid templates' own.
 *
 * IT IS A PANE HERE AND A DIALOG ELSEWHERE, exactly as deposit is. `/wallet/withdraw` carries
 * `info.dialog = mobile` (a DEVICE test, false on the desktop this build targets) while
 * `/withdraw` sits in the dialog group `{dialog: !0, guards: [ce]}`. Only the pane is routed
 * today; the body is split out of the shell for the day the dialog is. It does not read the
 * dialog context directly — `PageCard` and `CwalletRow` each read it for themselves, which is
 * where the original's two branches on this page live. See context/dialogRoute.js.
 *
 * `/withdraw`'s own guard is `Pe.isFiat && !H.bcmx && "/deposit?type=withdraw"`, and bc.game is
 * not an `isFiat` deploy, so it never fires. Not reproduced.
 *
 * THERE IS NO HEADING ABOVE THE CARD, AND THAT IS THE ORIGINAL'S DOING RATHER THAN AN OMISSION.
 * The chunk's root is `<PageLayout title={t("Withdraw")}>`, and `w3` (PageLayout-CcB1ecIM.js) is
 *
 *   if (oa()) { ...push the props into the dialog context... }   // a DIALOG gets a title bar
 *   return t.children                                            // a PAGE renders children only
 *
 * so "Withdraw" is the dialog's title bar and nothing at all on the pane. The rail row already
 * says Withdraw; a second heading would be this build's invention. Hence no `<PageLayout>`
 * component here — it would be an empty wrapper.
 *
 * ── THE DATA IS REAL, WHICH IS UNUSUAL FOR A PAGE BEHIND A LOGIN ───────────────────────────────
 *
 * Every chain, label, minimum and fee below comes from `data/currencyTokens.js`, a live answer to
 * `/game/support/system/conf/currencyTokens` — a `system/conf` path, and that family answers
 * unauthenticated on hash.game. It reproduces the capture's "Min: 204 BCD" to the digit from two
 * fields fetched with no knowledge of the screenshot (BCD/ETHEREUM `withdrawLimitAmount` 200 plus
 * `minFee` 4). See services/withdraw.js for the argument. Contrast `/deposit`, whose equivalent
 * table had to be written from nothing.
 *
 * ── NOT BUILT, each inert at its call site rather than removed ─────────────────────────────────
 *
 *   the whitelist arm      `/payment/withdraw/address/check/` decides whether the address field
 *                          is free text or a picker over saved addresses. No response, so the
 *                          free-text arm renders — which is the capture's.
 *   the address book       the button in the field's trailing square. Needs
 *                          `/payment/withdraw/address/list/`.
 *   "Fee-free withdrawal"  the VIP 8+ checkbox, behind `/payment/withdraw/fee/deduction/`.
 *   Preview                BUILT: opens the confirm dialog (`WithdrawConfirm-CIsgiYKs.js`,
 *                          see Confirm.jsx). Live, the form is replaced by a "not available"
 *                          notice — the platform files a crypto withdrawal only over a socket.
 *   the SATS arm           `hr` in the same chunk, reached by picking SATS; renders the crypto
 *                          arm here. The FIAT arm `Wa` IS built — FiatForm.jsx.
 */

/* `xa` — the Currency block. `wa` is `mb-1 text-secondary`, and note that is `mb-1` where the
   Network label one component over is `mb-1.5`; the two really do differ by 2px in the original
   and it is visible if you look for it. Do not normalise them. */
function CurrencyField({ value, onChange, options }) {
  /* `P(item, needle)` in utils-CG1cE_om.js — the layer's own search, on ticker and full name.
     Held here rather than inside Select because it narrows the OPTIONS the component is given;
     the search box that drives it goes in through `layerRender`, as the deposit tab does. */
  const [needle, setNeedle] = React.useState('');
  const query = needle.toLocaleLowerCase();
  const matches = query
    ? options.filter(
        (name) =>
          name.toLocaleLowerCase().includes(query) ||
          (getCurrency(name)?.fullName ?? '').toLocaleLowerCase().includes(query),
      )
    : options;

  return (
    <>
      <div className="mb-1 text-secondary">Currency</div>
      <Select
        value={value}
        options={matches}
        onChange={onChange}
        title="Select Currency"
        /* `!ps-2` IS A CORRECTION, NOT A PREFERENCE, and the reason is that this control is not
           a Select on the original at all. `xa` renders `zn` — a POPOVER (`mt`) wrapping a plain
           `<Button class="not-full w-full border border-input bg-input_bright">` — so its class
           list is `button button-m not-full w-full …` and its left padding is `.button`'s own
           0.5rem. This build reaches the same appearance through the shared `Select`, which
           always emits `.select`, and `.select` sets `padding-inline-start: 0.75rem`. That is
           the extra 4px. The `!` is needed because both rules are inside `@layer components`,
           where `.select` wins on source order; a bang lifts the utility clear of the layer.
           The Network select one component down IS `nO`, so it keeps the 12px.

           `not-full` is one of the original's dead classes — it generates nothing in any of the
           six mirrored stylesheets nor in the current deploy's. Kept for the reason the referral
           page's copy of it is. */
        className="not-full w-full border border-input bg-input_bright !ps-2"
        optionsClassName="w-100 min-h-[80vh] sm:min-h-100"
        labelRender={(name) => (
          <div className="flex w-full items-center">
            <img className="size-6" alt="coin icon" src={coinIcon(name)} />
            <div className="mx-2 text-base">{getAlias(name)}</div>
            {/* `$a` = `button-input center ml-auto size-6 rounded-lg` with a `size-3 -rotate-90`
                chevron. Note `rounded-lg` and `size-3` here where the deposit tab's identical-
                looking square is `rounded-md` and `size-4` — two different components that
                happen to land in the same place.

                THE CHEVRON CARRIES NO FILL UTILITY, and it is deliberate on the original's part:
                `s(r, t(xe, {class: "size-3 -rotate-90"}))` — that is the whole class list. `.icon`
                is `fill: currentColor`, so it takes the BUTTON'S text colour, which is white. It
                was written `fill-secondary` here and rendered a step too dark. The same trap the
                Explore panel's type dropdown documents; only `nO`/`FA`'s own chevron — the one in
                the Network select below, from `Select`'s `defaultLabel` — really is
                `fill-secondary`, which is why the two differ on this page. */}
            <div className="button-input center ml-auto size-6 rounded-lg">
              <IconArrow className="icon size-3 -rotate-90" />
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
            {/* `matches.length`, NOT `rows.length` — see the note at the same spot in
                pages/Deposit/CryptoTab.jsx: `layerRender` is handed the rows as a single React
                element, so testing its `length` sent every open into the not-found arm and the
                coin list never rendered. */}
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
        {(name) => (
          <span className="flex items-center">
            <img className="mr-2 size-6" alt="" src={coinIcon(name)} />
            <span className="font-extrabold">{getAlias(name)}</span>
          </span>
        )}
      </Select>
    </>
  );
}

/* `ea` in Banner-TuTj1pp2.js — `Pr` is `<div><div class="mb-1.5 text-secondary">Network</div>…`.
 *
 * TWO ARMS, AND THE SECOND ONE EXISTS FOR EXACTLY ONE COIN. When a currency has a single token
 * and that token carries `addrTypes`, the select lists the ADDRESS TYPES instead of the networks.
 * Across all 186 tokens in the feed precisely one qualifies: BTC on BITCOIN, whose `addrTypes` is
 * `[{label:"Segwit", value:"P2WPKH"}]`. So picking BTC swaps this control's contents, and nothing
 * else does. It would be easy to write this off as dead and it is not.
 *
 * The trigger is the plain shared Select with no `class` of its own — `ea` passes only value,
 * options and children — so it renders `.button.button-m.select.bg-input_bright` with the
 * default chevron tail. `De` is the label: `ellipsis w-0 flex-auto text-left`, which is what
 * keeps a long chain name from pushing the chevron out of the box. */
function NetworkField({ tokens, chain, onChain, addrType, onAddrType }) {
  const addrTypes = tokens.length === 1 ? (tokens[0].addrTypes ?? []) : [];
  const useAddrTypes = addrTypes.length > 0;

  const options = useAddrTypes ? addrTypes.map((t) => t.value) : tokens.map((t) => t.chain);
  const labelOf = (value) =>
    useAddrTypes
      ? addrTypes.find((t) => t.value === value)?.label
      : tokens.find((t) => t.chain === value)?.label;

  return (
    <div className="mt-5">
      <div className="mb-1.5 text-secondary">Network</div>
      <Select
        value={useAddrTypes ? addrType : chain}
        options={options}
        onChange={useAddrTypes ? onAddrType : onChain}
        title="Network"
        className="w-full border border-input bg-input_bright"
        labelFormat={(value) => (
          <div className="ellipsis w-0 flex-auto text-left">{labelOf(value)}</div>
        )}
      >
        {(value) => labelOf(value) ?? value}
      </Select>
    </div>
  );
}

/* `ln` — the Withdrawal Address field.
 *
 * `Xr` is the label, `mb-1.5 mt-5 block text-secondary`, and the input is the site's `.input`
 * with a trailing button. THE TRAILING SQUARE HAS NO VISIBLE BACKGROUND: `rn` writes
 * `center mr-1 flex size-6 rounded-md bg-layerx sm:cursor-pointer`, and `--layerx` is declared
 * only inside `.light-layer2-tabs` in index-DxOqNczA.css, which is nowhere near this page. So
 * `bg-layerx` resolves to nothing and the icon sits straight on the field — which is what the
 * capture shows, and it is the same dead token the Balance summary card documents. Kept as
 * written rather than swapped for a real one.
 *
 * The placeholder is the i18n string with its placeholder intact:
 * "Please enter a __currencyName__ wallet address". Note it interpolates `currencyName`, the
 * wallet id, NOT the alias — so a KLAY withdrawal reads "Please enter a KLAY wallet address"
 * even though every figure beside it prints KAIA. That asymmetry is the original's. */
function AddressField({ currencyName, value, onChange }) {
  return (
    <>
      <label htmlFor="address" className="mb-1.5 mt-5 block text-secondary">
        Withdrawal Address
      </label>
      <div className="relative w-full">
        <div className="input text-base">
          <input
            id="address"
            name="address"
            required
            autoComplete="off"
            placeholder={`Please enter a ${currencyName} wallet address`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          {/* THIS BUILD'S, NOT THE ORIGINAL'S — a one-line revert, and the note above says what
              the source has. `rn` writes `bg-layerx`, a dead token that paints nothing, so on
              the live site this icon sits bare on the field and takes `.icon`'s inherited
              secondary grey. Asked for as a filled square instead: `bg-input_button` is #3A4142
              exactly, the same token every Select's chevron square uses, and dropping the fill
              utility lets `.icon`'s `fill: currentColor` take `.input`'s own `--color-primary`,
              which is #FFFFFF. To go back to the capture, restore `bg-layerx` and
              `fill-secondary`. */}
          <button
            type="button"
            aria-label="Saved addresses"
            className="button-input center mr-1 flex size-6 rounded-md sm:cursor-pointer"
          >
            <IconAddressBook className="icon size-4" />
          </button>
        </div>
      </div>
    </>
  );
}

/* `xn` — the memo / destination-tag field, shown only for a token that carries a `tagName`. Ten
 * of the feed's 186 do (XLM and EOS want a "Memo", XRP a "Tag", and so on), so this is live for a
 * handful of coins and absent for the rest — BCD included, which is why the capture has no such
 * field.
 *
 * Two arms. XRP gets the NUMBER input (`_e`, `min: 0`) with a fixed placeholder; everything else
 * gets a text input whose placeholder is the tag name itself. The "(Required)" suffix is dropped
 * for TRTL alone — `N(() => e.currencyName !== "TRTL")`, a coin this wallet does not even list.
 * Both quirks are the original's and both are cheap to keep. */
function MemoField({ currencyName, tagName, value, onChange }) {
  if (!tagName) return null;
  const required = currencyName !== 'TRTL';

  if (currencyName === 'XRP') {
    return (
      <>
        <label htmlFor="memo" className="mb-1.5 mt-5 flex items-center text-secondary">
          <span>{tagName}</span>
          <span className="text-error">({required && 'Required'})</span>
        </label>
        <div className="input mt-1 text-base">
          <input
            id="memo"
            name="memo"
            required
            autoComplete="off"
            inputMode="decimal"
            min={0}
            placeholder="Please enter a tag (digital numbers)"
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <label htmlFor="memo" className="mb-1.5 mt-5 block text-secondary">
        <span>{tagName}</span>
        {required && <span className="ml-1 text-error">(Required)</span>}
      </label>
      <div className="input text-base">
        <input
          id="memo"
          name="memo"
          required
          autoComplete="off"
          placeholder={tagName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </>
  );
}

/* `it` — the Withdraw Amount label row, the number field and the four quick buttons.
 *
 * THE LABEL ROW IS TWO CELLS, AND ONLY HALF THE RIGHT-HAND ONE TURNS RED. `vr` is
 * `<div class="mb-1.5 mt-5 flex justify-between text-secondary"><div>{title}</div><div>Min:<span
 * class={below && "text-error"} + "ml-1">{figure}</span></div>`, so "Min:" stays secondary and
 * only the figure takes the error colour. The capture agrees, and it is the sort of thing a
 * screenshot rebuild would have painted the whole phrase red for.
 *
 * `below` is `balance < min`, which is also what drives every other number here:
 *
 *   lowest  = below ? balance : min                  the Min button's target
 *   highest = below ? balance : min(balance, max)    the Max button's target — and since `max` is
 *                                                    `Math.max(balance, min)`, this is just
 *                                                    `balance` in both arms. Written out the long
 *                                                    way because that is how the original reads
 *                                                    and collapsing it hides the intent.
 *   25% / 50%  never go below `lowest`, so on a short balance all four buttons agree.
 */
export function AmountField({ amount, onAmount, min, balance, currency, precision }) {
  const below = balance < min;
  const lowest = below ? balance : min;
  const highest = below ? balance : Math.min(balance, Math.max(balance, min));

  const round = (value) => {
    const factor = 10 ** (precision ?? 8);
    return Math.floor(value * factor) / factor;
  };

  const quick = [
    { label: 'Min', to: () => lowest },
    { label: '25%', to: () => Math.max(lowest, round(highest * 0.25)) },
    { label: '50%', to: () => Math.max(lowest, round(highest * 0.5)) },
    { label: 'Max', to: () => highest },
  ];

  return (
    <>
      <div className="mb-1.5 mt-5 flex justify-between text-secondary">
        <div>Withdraw Amount</div>
        <div>
          Min:
          <span className={`${below ? 'text-error ' : ''}ml-1`}>
            {printCurrency(min, currency, { target: currency })}
          </span>
        </div>
      </div>

      {/* `_e` (`uT` in index-BsFv7ByC.js) — the same `.input` shell as the text fields, with
          `inputmode="decimal"` and a clamp to [min, max] on commit. `todp(precision, ROUND_DOWN)`
          is the token's own `decimals`. */}
      <div className="input text-base">
        <input
          name="amount"
          required
          autoComplete="off"
          inputMode="decimal"
          value={amount}
          onChange={(event) => onAmount(event.target.value)}
          onBlur={(event) => {
            const parsed = Number(event.target.value);
            onAmount(Number.isNaN(parsed) ? 0 : round(Math.min(Math.max(parsed, 0), highest)));
          }}
        />
      </div>

      {/* `br` is `mt-1 flex justify-between gap-1`; each button is `type="second"` with
          `h-8 flex-1 bg-layer6 text-secondary`. `preventDefault` because they sit inside the
          form and would otherwise submit it. */}
      <div className="mt-1 flex justify-between gap-1">
        {quick.map((item) => (
          <button
            key={item.label}
            type="button"
            className="button button-second button-m h-8 flex-1 bg-layer6 text-secondary"
            onClick={(event) => {
              event.preventDefault();
              onAmount(item.to());
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
}

/* `ut` over `Sr` — the Available row. The `@container` / `@[420px]:` pair is the original's own
   and lays the row out horizontally once the CARD is 420px wide, which on this pane it always is.
   `hasAlias: !1` is why the figure prints bare — "Available: 0", not "Available: 0 BCD". */
export function AvailableRow({ currencyName, unlocked, className = '' }) {
  return (
    <div className={`@container ${className}`}>
      <div className="flex flex-col items-end gap-y-1 @[420px]:flex-row @[420px]:items-center @[420px]:justify-between @[420px]:gap-x-2 @[420px]:gap-y-0">
        <div className="text-right @[420px]:ml-auto">
          <span className="mr-1 text-secondary">Available:</span>
          <span>
            {printCurrency(unlocked, currencyName, { target: currencyName, hasAlias: false })}
          </span>
        </div>
      </div>
    </div>
  );
}

/* `ye` over `sn` — one line of the fee breakdown. `brand` turns BOTH cells green and is passed
 * only by the first of the three.
 *
 * UNREACHABLE WITH THE CURRENT FIXTURE, AND KEPT ANYWAY. `vn` renders the block behind
 * `unlockedBalance > minWithdraw + fee`; this wallet's only non-zero row is BCD at 128.4032
 * against a 204 minimum, and every other row is 0, so the condition is false everywhere. It is
 * implemented because the alternative is a form that silently loses three rows the moment a
 * fixture balance is raised — and because the branch is cheap and its markup is recovered. */
function BreakdownRow({ title, amount, currencyName, brand }) {
  return (
    <div className="my-1 flex min-h-6 items-center justify-between text-base sm:text-sm">
      <div className={`flex items-center text-secondary${brand ? ' text-brand' : ''}`}>{title}</div>
      <div className={`center text-right leading-4${brand ? ' text-brand' : ''}`}>
        {printCurrency(amount, currencyName, { target: currencyName, hasAlias: false })}{' '}
        {currencyName}
      </div>
    </div>
  );
}

/* `tl` -> `Aa` -> `yt` -> `ht` -> `Fn` -> `Wn`, flattened. Six wrappers on the original, and five
 * of them are gates this build has nothing to gate on: the KYC check (`Kt`), the closed-user-group
 * variant, the `ErrorRest` retry boundary, the token-loading suspense and the white-label switch.
 * Flattening them is the one structural departure on this page and it is recorded here rather
 * than reproduced as five components that each render their only child.
 */
export function WithdrawPanels() {
  const { session, balances, updateBalance } = useSession();
  const navigate = useNavigate();
  /* The confirm dialog's state — the original's router `state` for `/wallet/withdraw/confirm` —
     and the order its submit returned, which swaps the confirm for the result card. */
  const [confirm, setConfirm] = React.useState(null);
  const [placed, setPlaced] = React.useState(null);

  /* `a = () => e.currencyName ?? W.state.cryptoCurrency` — the wallet store's crypto selection,
     seeded from the account's own currency. A FIAT wallet takes the fiat arm (`tl` picks `Wa`
     on `W.state.isFiat`) — see FiatForm.jsx. A coin with no withdraw tokens falls back to BTC. */
  const walletCurrency = session.setting.currencyName;
  const isFiatName = (name) => getCurrency(name)?.currencyType === 'FIAT';
  const initial =
    isFiatName(walletCurrency) || tokensFor(walletCurrency).length > 0 ? walletCurrency : 'BTC';

  const [currency, setCurrency] = React.useState(initial);
  const tokens = tokensFor(currency);
  /* `Kr`'s arrival effect is `y(tokens[0])` — the FEED'S FIRST ROW, not the cheapest one. For BCD
     that is Ethereum at a 200 minimum rather than BSC at 5, and the capture shows Ethereum. */
  const [chain, setChain] = React.useState(tokens[0]?.chain);
  const [addrType, setAddrType] = React.useState(tokens[0]?.addrTypes?.[0]?.value);
  const [address, setAddress] = React.useState('');
  const [memo, setMemo] = React.useState('');
  /* `null` MEANS "NOT TYPED IN YET", and the seed below is what renders instead. The original
     does this with an effect —
       createEffect(on(() => token && unlockedBalance,
                       () => unlockedBalance && setAmount(Math.min(min, Number(unlockedBalance)))))
     — which re-runs whenever the token or the balance changes. An effect that calls setState is
     the cascading render this project's lint rejects, and the sentinel gets the same result by
     deriving during render: reset it to `null` in the two setters (as they already do) and the
     displayed value follows the new token's seed with nothing to synchronise.
     One deliberate difference: once a figure HAS been typed, a balance arriving late no longer
     overwrites it. The original's effect would. That only matters when the API flag is on, and
     clobbering what someone has typed is the worse of the two behaviours. */
  const [amount, setAmount] = React.useState(null);

  /* Re-seeding in an effect is the cascading render the lint rule rejects, so every dependent
     piece of state is reset in the setter — the same call the deposit tab and every paging
     control in this project make. `ue(() => { a.token; d("") })` in `ln` is the original's own
     reset of the address on a token change, reproduced in both setters below. */
  const pickCurrency = (name) => {
    const next = tokensFor(name);
    setCurrency(name);
    setChain(next[0]?.chain);
    setAddrType(next[0]?.addrTypes?.[0]?.value);
    setAddress('');
    setMemo('');
    setAmount(null);
  };

  const pickChain = (value) => {
    setChain(value);
    setAddress('');
    setMemo('');
    setAmount(null);
  };

  const token = tokens.find((row) => row.chain === chain) ?? tokens[0];

  /* Two reads, and both are `useResource` rather than direct calls: `request()` answers with a
     Promise now (see services/client.js), so the fee range and the unlocked balance each have a
     pending frame. `readFee` and `readBalance` are memoised on what they actually depend on,
     which is the hook's own contract — an inline arrow would be a new reader every render and
     would refetch forever.

     WHAT THE ORIGINAL DRAWS WHILE THEY ARE IN FLIGHT is the token-loading suspense named in the
     header note above — one of the five wrappers `WithdrawPanels` flattens. It is an INNER
     boundary, below the Currency select and inside the card, which is why it is not
     `MenuPageLayout`'s `PaneLoading`: that one is the shell's and replaces the whole pane, fill
     and radius included, and nesting it inside a `PageCard` would paint layer4 on layer4. So the
     box here carries no surface of its own. Its height is this build's; only the boundary's
     existence and its position are read. The fee and the balance feed the same arithmetic, so
     half a form is not a state this page has and one arm covers both. */
  const readFee = React.useCallback(() => {
    /* Keyed on the two PRIMITIVES rather than on `token` itself: `tokensFor` hands back a fresh
       array each call, so a `[token]` dependency is a new reader every render and the read never
       settles. The token is recomputed inside instead, which is the same object either way. */
    const rows = tokensFor(currency);
    return getWithdrawFee(rows.find((row) => row.chain === chain) ?? rows[0]);
  }, [currency, chain]);
  const readBalance = React.useCallback(
    () => getUnlockedBalance(currency, balances),
    [currency, balances]
  );
  const { data: feeData, loading: feeLoading } = useResource(readFee);
  const { data: balanceData, loading: balanceLoading } = useResource(readBalance);
  const pending = feeLoading || balanceLoading;

  const { fee, isSvip } = feeData ?? { fee: 0, isSvip: false };
  const { unlockedBalance } = balanceData ?? { unlockedBalance: '0' };

  const balance = Number(unlockedBalance) || 0;
  /* `n = x(() => new p(e.checked || e.isSvip ? 0 : e.fee))` — the fee is ZERO when the fee-free
     checkbox is ticked or the account is SVIP, and `e.fee` otherwise. The checkbox is not built
     (see the header note), so only the SVIP arm can zero it, and this fixture is not SVIP.
     `minWithdraw` is then `o = new Decimal(minWithdrawLimitAmount).add(n())` — the "204". */
  const effectiveFee = isSvip ? 0 : Number(fee) || 0;
  const minWithdraw = Number(token?.withdrawLimitAmount ?? 0) + effectiveFee;

  /* `_()` — `unlockedBalance > minTotal`. It gates the breakdown block AND disables Preview, so
     with a balance under the minimum the button is dead and the three fee rows are absent. Both
     are true of the capture, whose account had nothing in it. */
  const clearsMinimum = balance > minWithdraw;

  /* The seed the `null` sentinel above stands in for: `Math.min(min, unlockedBalance)`, and only
     when the balance is truthy — a zero balance leaves the field at 0, which is what the capture
     shows. With this wallet's 128.4032 BCD against a 204 minimum it opens at 128.4032. */
  const shownAmount = amount ?? (balance ? Math.min(minWithdraw, balance) : 0);
  const receive = Math.max(shownAmount - effectiveFee, 0);

  const notices = withdrawNotices(currency, token);
  /* Every currency the Currency select lists. `orderBy(wallet, "sort")` filtered to the crypto
     half — a coin whose tokens are all unavailable stays in the list and renders the
     not-supported state inside the form, which is the original's arrangement. */
  const options = balances
    .filter((coin) => tokensFor(coin.currencyName).length > 0 || isFiatName(coin.currencyName))
    .map((coin) => coin.currencyName);
  const fiat = isFiatName(currency);

  const allUnavailable = tokens.length > 0 && tokens.every((row) => !row.canWithdraw);

  /* `m.mobile` on the original; the dialog context is this build's proxy for it — see the
     `mt-4` note at the card. */
  const dialog = useIsDialog();

  return (
    <>
      {/* `<PageLayout class={clsx(mobile && "mt-4")}>`. The margin is a DEVICE test, and it used
          to be unreachable here — this file's own note said "absent on every width this build
          renders at", which was true while only the pane existed. The dialog IS the mobile arm,
          so it is reachable now, and `useIsDialog()` is the right proxy: `/wallet/withdraw`
          installs the dialog context exactly when `info.dialog = m.mobile` is true.

          It is what puts the 16px between the title bar and the card. The margin belongs to the
          layout wrapper on the original, which is the same pixels as putting it on the first
          child here — everything below the card is spaced by its own margins. */}
      <PageCard className={dialog ? 'mt-4' : ''}>
        <CurrencyField value={currency} onChange={pickCurrency} options={options} />

        {/* `Fn`'s suspense fallback. The Currency select stays above it — on the original it is
            outside the boundary too, since changing the coin is what triggers the next read and
            a control you cannot reach while its own result loads would be a trap. */}
        {fiat ? (
          <FiatForm key={currency} currencyName={currency} />
        ) : pending ? (
          <div className="center h-80">
            <Loading />
          </div>
        ) : (
          <>

        {tokens.length > 0 && (
          <NetworkField
            tokens={tokens}
            chain={chain}
            onChain={pickChain}
            addrType={addrType}
            onAddrType={setAddrType}
          />
        )}

        {/* `Vt` — every token for this coin is switched off. `Se` is the same shell with a
            different string when only the SELECTED token is. Neither is reachable with the
            current feed (174 of 186 tokens are withdrawable, and no coin is entirely off), but
            both are one field away from being reachable and the branch is the chunk's own. */}
        {allUnavailable ? (
          <div className="mt-5 py-10 text-center text-secondary">
            Withdrawal is not supported for this currency
          </div>
        ) : token && !token.canWithdraw ? (
          <div className="mt-5 py-10 text-center text-secondary">Under Maintenance</div>
        ) : !CRYPTO_WITHDRAW_AVAILABLE ? (
          /* LIVE MODE: NO RAIL TO SUBMIT TO. The platform files a player's crypto withdrawal only
             through the `SUBMIT_NEW_WITHDRAWL` socket event (no HTTP route — checked against
             crypto-withdraw/routes/user.routes.js and API-ROUTES.md), this build has no socket
             client, and CCPayment answers 503 CRYPTO_NOT_CONFIGURED besides. So the address and
             amount are not offered at all: the crypto deposit tab's own unavailable box, same
             markup, in their place. */
          <div className="my-4 flex rounded-xl bg-warning/10 p-2 text-secondary">
            <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-warning" />
            <div>
              Sorry, crypto withdrawals are not currently available. Please try again later or
              contact support.
            </div>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              /* `ht`'s handler: navigate to `/wallet/withdraw/confirm` with the whole form as
                 router state — `{address, amount, showAmount, fee, memo, checked, currencyName,
                 receiveAmount, token}`. `showAmount` is what was typed, `amount` what is sent. */
              event.preventDefault();
              if (!clearsMinimum || shownAmount < minWithdraw || !address.trim()) return;
              setConfirm({
                address: address.trim(),
                amount: shownAmount,
                showAmount: shownAmount,
                fee: effectiveFee,
                memo,
                currencyName: currency,
                receiveAmount: receive,
                token,
              });
            }}
          >
            <AddressField currencyName={currency} value={address} onChange={setAddress} />

            {/* `MiddleNotice` — a `warning`-typed notice with no icon, and the only currency in
                the table that has one is anything on the SOLANA chain. */}
            {notices.middle && (
              <Notice type="warning" className="mt-2">
                {notices.middle}
              </Notice>
            )}

            <MemoField
              currencyName={currency}
              tagName={token?.tagName}
              value={memo}
              onChange={setMemo}
            />

            <AmountField
              amount={shownAmount}
              onAmount={setAmount}
              min={minWithdraw}
              balance={balance}
              currency={currency}
              precision={token?.decimals}
            />

            {shownAmount < minWithdraw && (
              /* `mn`, a hidden input the submit handler reads back out of the FormData and turns
                 into a toast. Kept as a hidden field rather than rendered, which is what it is. */
              <input
                type="hidden"
                name="error_amount"
                value="Withdrawal amount should be greater than the minimum amount."
              />
            )}

            <AvailableRow currencyName={currency} unlocked={balance} className="mt-5" />

            {clearsMinimum && (
              <>
                <div className="mt-5 border-t border-third pt-4" />
                <BreakdownRow
                  brand
                  title="Withdraw Amount"
                  amount={receive}
                  currencyName={currency}
                />
                <BreakdownRow title="Fee:" amount={effectiveFee} currencyName={currency} />
                <BreakdownRow
                  title="Total Withdraw Amount"
                  amount={shownAmount}
                  currencyName={currency}
                />
              </>
            )}

            {/* `submitBtn(o || c.loading)` where `o` is `!clearsMinimum || rateError`. A brand
                button at `my-4 w-full`.

                `button-m` IS THE COMPONENT'S, NOT THE CALL SITE'S, and leaving it off is what
                made this render 48px tall instead of 40. `ot` builds
                `Y("button", zx[type], s() && \`button-${s()}\`, t.class)` with
                `s = size || !mobile && "m"`, so every button on a desktop is `.button-m` unless
                it asks otherwise — and `.button`'s own fallback height is 3rem. Exactly the trap
                `components/shared/Select` documents having been bitten by at four call sites;
                written out here because this is a bare `<button>` rather than that component.
                The four quick-amount buttons above carry it too, where it is inert: their `h-8`
                is a utility and beats the layered rule. */}
            <button
              type="submit"
              disabled={!clearsMinimum}
              className="button button-brand button-m my-4 w-full"
            >
              Preview
            </button>
          </form>
        )}
          </>
        )}
      </PageCard>

      {/* `Ca` — `<div id="withdraw-crypto-notice">`, an EMPTY SLOT on the original that `Wn`
          portals its BottomNotice into from four components deeper. React does not need the
          portal: the notice is computed from the token, and the token is already state up here.
          The id is kept because it is the original's markup and because the portal is the only
          reason the notice sits outside the card at all. */}
      {fiat ? (
        /* `Wa`'s two empty slots — the Cwallet fiat band and `zr`'s per-channel notice, which
           has a row for none of this platform's methods. */
        <>
          <div id="cwallet-withdraw-fiat" />
          <div className="mt-4" id="withdraw-fiat-notice" />
        </>
      ) : (
      <div id="withdraw-crypto-notice">
        {/* THE MARGIN BELONGS TO THE WRAPPER AND IS UNCONDITIONAL. `BottomNotice` builds
            `pn` = `<div class="mt-4 space-y-2">` around a bare `<Notice type="info">`, so the
            gap above the band is 16px on both the pane and the dialog. This was first written
            as `mt-2` on the Notice itself, conditional on `useIsDialog()` — the CwalletRow's
            rule, applied to the wrong element. `space-y-2` is what separates the notices when a
            token produces more than one; no row in `Nn` does today, so it is inert. */}
        <div className="mt-4 space-y-2">
          <Notice>{notices.bottom}</Notice>
        </div>
      </div>
      )}

      {/* `da` — the divider is the withdraw wrapper's, not the row's. The second arm (withdraw
          straight to a linked Cwallet) needs a `cwallet.state.cwalletId` this build has no feed
          for; the unlinked row is what both captures show. */}
      {/* The Cwallet band is not drawn: BC.GAME's partner wallet, no Jumbo Flush equivalent. */}

      {confirm && !placed && (
        <WithdrawConfirm
          order={confirm}
          onClose={() => setConfirm(null)}
          onSubmitted={(result) => {
            /* `k.emit("withdraw-submit-reset")` clears the form; the held amount leaves the
               withdrawable balance at once, which is the platform's own behaviour (the fiat rail
               debits on request). Only the fixture path reaches here — see services/withdraw.js. */
            const row = balances.find((coin) => coin.currencyName === confirm.currencyName);
            if (row) {
              updateBalance(confirm.currencyName, {
                amount: Math.max(Number(row.amount) - confirm.amount, 0),
                generalAmount: Math.max(Number(row.generalAmount) - confirm.amount, 0),
              });
            }
            setAddress('');
            setMemo('');
            setAmount(null);
            setPlaced(result);
          }}
        />
      )}
      {placed && (
        <WithdrawResult
          order={placed}
          onDone={() => {
            /* `B.pop(), l("/wallet/transaction?type=withdraw")` — Done goes to the history. */
            setPlaced(null);
            setConfirm(null);
            navigate('/wallet/transaction?type=withdraw');
          }}
        />
      )}
    </>
  );
}

export default WithdrawPanels;
