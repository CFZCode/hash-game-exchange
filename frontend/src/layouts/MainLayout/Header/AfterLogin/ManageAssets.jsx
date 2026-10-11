import React from 'react';
import { createPortal } from 'react-dom';
import useDialogScrollLock from '../../../../hooks/useDialogScrollLock';
import { useSession } from '../../../../context/session';
import { getCurrency } from '../../../../data/currencies';
import { coinIcon } from '../../../../utils/coinArt';
import { IconSearch, IconClose } from './icons';

/* Manage Assets — the sheet behind the `+` beside the currency dropdown's search box.
 *
 * `yt` in `SelectLayer-CwsGOFvY.js`, the same recovered chunk the dropdown itself came out of,
 * so the class lists below are the Solid template's own and the two strings are its i18n. It is
 * pushed imperatively rather than routed: `re.push(yt)` on the `+` button, where `re` is the
 * popup manager, which is why it is local state on the wallet pill rather than a path.
 *
 * The shell is `cl`, the same `.pop-center` the deposit-offer detail dialog and the region-block
 * panel ride on:
 *
 *   <div class="bg-layer3 dark:bg-layer2 pop-center {class}">
 *     <div class="pop-title">{title}<Button class="pop-close !p-0"><Close/></Button></div>
 *     <ScrollView class="pop-content">{children}</ScrollView>
 *
 * — and unlike the deposit-offer dialog this one SHOWS that title bar, close square and all,
 * which is what the capture has. `.pop-content` gets its `scroll-y` from the ScrollView, which
 * is what the call site's `[&_.scroll-y]:p-0` is reaching for: it strips the shell's own
 * `0 1rem 1rem` so the rows run edge to edge and the sticky search bar spans the full width.
 *
 * PORTALLED TO <body>, where the deposit-offer dialog renders in place. `.pop-overlayer` is
 * `position: fixed; z-index: 1100`, and z-index is resolved against the nearest stacking
 * context rather than the page — this one is mounted from inside the header, which is itself
 * fixed and z-indexed, so left in place it would be trapped under the header's own layer.
 *
 * ONE BRANCH IS NOT REPRODUCED: `re.push(yt).then(() => mobile && onReopen?.())` reopens the
 * currency dropdown underneath once the sheet is dismissed, but only on a phone — and only the
 * dropdown's desktop arm is built (see CurrencySelect). Closing here therefore returns you to
 * the page, as it does on a desktop.
 */

/* `ks`, the site's Empty. Defined here rather than imported from CurrencySelect because that
   file imports THIS one — see the note on the `+` button there. */
const Empty = ({ children }) => (
  <section className="center flex-col py-10 text-center">
    <div className="mt-4 leading-5 text-secondary">{children}</div>
  </section>
);

/* `l = C((prev = "") => i() ? s() : prev)` over `De(r => Ge(r, 300))` — the search box updates
   as you type and the LIST follows 300ms later. Worth keeping rather than filtering live: the
   Crypto tab is 89 rows and the Fiat tab 59, and re-running the filter on every keystroke over
   both is the sort of thing that only shows up on a slow machine. */
function useDebounced(value, ms) {
  const [settled, setSettled] = React.useState(value);

  React.useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);

  return settled;
}

/* `ge(We(O, "sort"), r => { const a = getCurrency(r.currencyName)?.currencyType;
                             return a === "CHAIN" || a === "VIRTUAL" ? "CHAIN" : a })`
 *
 * The same CHAIN/VIRTUAL fold the dropdown's grouping does, and for the same reason: BCD, BC and
 * BCL are the site's own tokens rather than chain coins, and nobody thinks of them as a separate
 * category. Anything that is neither — mNFT, 3RD — lands in a group with no tab, so it simply
 * does not appear here. That is the original's behaviour, not an omission. */
function groupByType(coins) {
  const groups = { CHAIN: [], FIAT: [] };
  [...coins]
    .sort((a, b) => a.sort - b.sort)
    .forEach((coin) => {
      const type = getCurrency(coin.currencyName)?.currencyType;
      const key = type === 'CHAIN' || type === 'VIRTUAL' ? 'CHAIN' : type;
      if (groups[key]) groups[key].push(coin);
    });
  return groups;
}

/* `ae` — one tab's list. The filter matches on `currencyName` and `fullName` and NOT on the
   alias, which is a real difference from the dropdown's own filter three files over: searching
   "kaia" finds nothing here while it finds KLAY there. The original's two filters differ in
   exactly that way and both are transcribed as written. */
function CoinList({ list, search }) {
  const needle = search.toLocaleLowerCase();
  const rows = needle
    ? list.filter((coin) => {
        const meta = getCurrency(coin.currencyName);
        return (
          coin.currencyName.toLocaleLowerCase().includes(needle) ||
          (meta?.fullName?.toLocaleLowerCase().includes(needle) ?? false)
        );
      })
    : list;

  if (rows.length === 0) return <Empty>Stay tuned-something&apos;s coming!</Empty>;

  return rows.map((coin) => <AssetRow key={coin.currencyName} coin={coin} />);
}

/* `ft` — one row. `mr-auto` on the label block is what pushes the switch to the end; there is no
   `justify-between` and no `items-center` on the row, and none is needed: the image, the single
   line of `text-base` and the `switch-xs` are all 24px tall, so stretch and centre agree. */
function AssetRow({ coin }) {
  const { updateBalance } = useSession();
  const meta = getCurrency(coin.currencyName);

  return (
    <div className="relative flex px-2 py-4">
      <img className="size-6" alt={coin.currencyName} src={coinIcon(coin.currencyName)} />
      <div className="ml-2 mr-auto text-base">
        <span>{coin.aliasCurrencyName}</span>
        <span className="ml-2 text-secondary">{meta?.fullName}</span>
      </div>
      {/* `j(currencyName, c => ({ display: !c.display }))` — the switch IS the `display` flag the
          currency dropdown filters on, so turning one off here removes that row from the wallet
          pill's list and turning it on puts it back. `size="small"` is `.switch-xs`. */}
      <button
        type="button"
        role="switch"
        aria-checked={!!coin.display}
        aria-label={coin.aliasCurrencyName}
        className="switch switch-xs flex items-center"
        onClick={() => updateBalance(coin.currencyName, { display: !coin.display })}
      >
        <div />
      </button>
    </div>
  );
}

/* THE INDICATOR IS THE BUTTON'S WIDTH, NOT HALF THE STRIP, and the difference is the `px-6` this
 * call site puts on the button group. `.tabs-indicator` is absolutely positioned against
 * `.tabs-title`, so a bare `50%` measures the whole strip — 24px too wide, starting 24px too far
 * left, which is what a plain copy of the auth dialog's percentages produced here. That dialog
 * gets away with them because its strip has no padding; the original measures real tab widths
 * and lands where the calc below does.
 *
 * The two units are NOT the same reference and that is the part to get right. `width` resolves
 * its percentage against `.tabs-title`, so the padding comes off there:
 *
 *     --tabs-width: calc((100% - 3rem) / 2)
 *
 * while `transform: translate()` resolves ITS percentage against the indicator's own box — so
 * one tab's step is a clean `100%`, and only the leading gutter needs a length:
 *
 *     --tabs-indicator-position: calc(1.5rem + {index * 100}%)
 *
 * Measured off the Manage Assets capture at dpr 1.25: a 416px dialog puts the bar at x=24 and
 * 184 wide, which is exactly (416 - 48) / 2. */
const GROUP_PADDING = '3rem';
const TABS = [
  { key: 'CHAIN', label: 'Crypto' },
  { key: 'FIAT', label: 'Fiat' },
];

export default function ManageAssets({ open, onClose }) {
  const { balances } = useSession();
  const [needle, setNeedle] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [tab, setTab] = React.useState(0);
  const search = useDebounced(needle, 300);

  useDialogScrollLock(open);

  const groups = React.useMemo(() => groupByType(balances), [balances]);

  if (!open) return null;

  return createPortal(
    <div
      className="pop-overlayer"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage Assets"
        /* `!pb-0` is the shell's, and dead: `.pop-center` declares no padding-bottom to cancel.
           The three arbitrary variants below it are not — they strip `.pop-content`'s padding
           and hide the scrollbar in both engines. Kept verbatim, dead class included. */
        className="pop-center bg-layer2 h-full overflow-hidden !pb-0 [&_.scroll-y::-webkit-scrollbar]:hidden [&_.scroll-y]:p-0 [&_.scroll-y]:[scrollbar-width:none]"
      >
        <div className="pop-title">
          Manage Assets
          <button type="button" className="button button-m pop-close !p-0" onClick={onClose}>
            <IconClose className="icon" />
          </button>
        </div>

        <div className="scroll-y pop-content">
          <div className="scroll-container">
            <div className="bg-layer2">
              {/* `Qa`, the sticky wrapper — `<div class={clsx("sticky", class)}>` and nothing
                  else that matters here. `-top-[1px]` is written `top-[-1px]` by the original;
                  same declaration. */}
              <div className="sticky top-[-1px] z-10 bg-layer2 px-3 py-1 pb-2">
                <div
                  className="input text-base"
                  {...(focused ? { 'data-focus': '' } : {})}
                >
                  <input
                    placeholder="Search"
                    value={needle}
                    onChange={(event) => setNeedle(event.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                  />
                  {/* `text-secondary` rather than `fill-secondary`, unlike the dropdown's copy of
                      the same icon: `.icon` is `fill: currentColor`, so both land in the same
                      place by different routes. Transcribed as written. */}
                  <IconSearch className="icon -order-1 mr-2 size-4 text-secondary" />
                  {!!needle && (
                    <button type="button" aria-label="Clear" onClick={() => setNeedle('')}>
                      <IconClose className="icon size-4" />
                    </button>
                  )}
                </div>
              </div>

              <div
                role="tablist"
                data-type="indicator"
                data-divider=""
                className="scroll-x tabs-title hide-scroll bg-layer2 [&_.tabs-btn-group]:px-6"
                style={{
                  '--tabs-width': `calc((100% - ${GROUP_PADDING}) / ${TABS.length})`,
                  '--tabs-indicator-position': `calc(${GROUP_PADDING} / 2 + ${tab * 100}%)`,
                }}
              >
                <div className="tabs-btn-group">
                  {TABS.map((item, index) => (
                    <button
                      key={item.key}
                      type="button"
                      role="tab"
                      className="tabs-btn btn-like"
                      aria-selected={tab === index ? 'true' : undefined}
                      onClick={() => setTab(index)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="tabs-indicator" />
              </div>

              <div className="tabs-content bg-transparent px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                <CoinList list={groups[TABS[tab].key] ?? []} search={search} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
