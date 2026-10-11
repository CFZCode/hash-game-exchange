import React from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../../../context/session';
import { getCurrency } from '../../../data/currencies';
import { printCurrency } from '../../../utils/currency';
import { coinIcon } from '../../../utils/coinArt';
import { groupTitle, matchesKeyword } from './utils';
import { IconInform, IconSearch, IconClose } from '../../../layouts/MainLayout/Header/AfterLogin/icons';

/* `SelectCurrencyContent-Dr60XagM.js` (`Q`, `V`) over `utils-CG1cE_om.js` (`Q` the row, plus the
 * grouping, title and filter helpers), both off `hash.game/assets/`.
 *
 * THIS IS NOT THE HEADER DROPDOWN'S LIST, AND THAT IS THE ORIGINAL'S OWN ARRANGEMENT RATHER THAN
 * a missed extraction. It is the first thing to check here, because the two look nearly identical
 * and this project's rule is to lift a component out the moment a second call site renders it.
 * `SelectLayer-CwsGOFvY.js` — the chunk `Header/AfterLogin/CurrencySelect.jsx` was built from — is
 * from the SAME release as this one (Sentry `e303d2e9`, checked, not assumed) and does not import
 * `SelectCurrencyContent` at all: it carries its own inline copy of the row. So the live site
 * genuinely ships two implementations, and they differ where it shows:
 *
 *   dropdown   `fix-light-hover ... hover:bg-layer4`, selected row lit `bg-layer4`, autoscrolls
 *              to the selected coin, `generalAmount` in the row and in its sort
 *   wallet     `cursor-default ... border-t border-transparent px-3 py-2`, no hover, no selection,
 *              no autoscroll, `amount` in the row and in its sort
 *
 * Merging them would mean inventing a third component that is neither. If they are ever unified,
 * unify them the way the original would — by parameterising the row on `itemClass` / `renderRight`
 * / `autoScroll`, which is exactly the seam `SelectCurrencyContent` already exposes below.
 *
 * `amount` vs `generalAmount` is the easiest of those to get wrong, so it is worth stating once:
 * this page prints and sorts on the FULL balance, the dropdown on the withdrawable part.
 */

/* --------------------------------------------------------------------------------------- */

/* `U` — the explainer link beside three tickers. A switch with no default, so every other row
   renders nothing. Neither `/wallet/about-bonuscoin` nor `/wallet/about-bccoin` is a route in this
   build; both fall through to the catch-all, as the account dropdown's rows do.

   `inactive` is Solid Router's inactive class and is dead here. The captured anchor also carries a
   bare `link=""` — that is the `use:link` DIRECTIVE, not an attribute to copy; `<Link>` is what
   does that job. Both notes are the ones CurrencySelect.jsx already carries for its own copy. */
const ABOUT_LINKS = {
  BCD: '/wallet/about-bonuscoin',
  BCL: '/wallet/about-ticketcoin',
  BC: '/wallet/about-bccoin',
};

function AboutLink({ currencyName }) {
  const href = ABOUT_LINKS[currencyName];
  if (!href) return null;
  return (
    <Link to={href} className="ml-2 text-brand inactive" onClick={(e) => e.stopPropagation()}>
      <IconInform className="icon size-4" />
    </Link>
  );
}

/* `V` in utils-CG1cE_om.js — the bonus lines, which REPLACE the row's second line rather than
   joining it (`<Show when={hasBonus} fallback={children}>`). Every row in this fixture is zero on
   both counts, so the fallback is what renders; the arm is written out because it is one field of
   real data away from being live. */
function RowSecondLine({ coin, showBonus, settings }) {
  const meta = getCurrency(coin.currencyName);
  const free = Number(coin.groupAmount?.free_amount ?? 0);
  const sports = Number(coin.groupAmount?.sports ?? 0);

  if (showBonus && (free > 0 || sports > 0)) {
    return (
      <div>
        {free > 0 && (
          <div>
            <span className="mr-1 text-secondary">Bonus in Casino:</span>
            {printCurrency(free, coin.currencyName, { settings })}
          </div>
        )}
        {sports > 0 && (
          <div>
            <span className="mr-1 text-secondary">Bonus in Sports:</span>
            {printCurrency(sports, coin.currencyName, { settings })}
          </div>
        )}
      </div>
    );
  }

  /* `currencyFullName` is off in the account fixture, as it is in the capture. */
  return settings.currencyFullName && meta ? (
    <div className="text-sm text-secondary">{meta.fullName}</div>
  ) : null;
}

/* `Q` in utils-CG1cE_om.js — one coin.
 *
 * The row class is `clsx("mb-1 flex cursor-pointer items-center rounded-lg px-2 py-3 !leading-5",
 * itemClass ? itemClass : clsx(selected && autoScroll !== false && "scroll-target bg-layer4",
 * "fix-light-hover"))`. The Balance page passes `itemClass`, so the whole default arm — the
 * selected highlight AND the light-theme hover — is replaced rather than extended. That is why
 * nothing on this page lights up: `cursor-default` even overrides the `cursor-pointer` in front of
 * it. The row is still clickable (see `onChange` on the page), it just does not advertise it.
 *
 * `autoScroll={false}` from the same call site is what switches off the "centre the selected coin"
 * effect the dropdown has. There is no selected coin to centre on here.
 *
 * The trailing space after the ticker is the template's own text node, not a typo. */
function CoinRow({ coin, settings, showBonus, itemClass, onChange, renderRight }) {
  return (
    <div
      className={`mb-1 flex cursor-pointer items-center rounded-lg px-2 py-3 !leading-5 ${itemClass}`}
      onClick={() => onChange(coin.currencyName)}
    >
      <img className="h-6 w-6" alt="coin icon" src={coinIcon(coin.currencyName)} />
      <div className="ml-2">
        <div className="flex items-center text-base font-extrabold">
          {/* The row's OWN alias, not the catalogue's — they can drift (LUNA/LUNC). */}
          {coin.aliasCurrencyName}{' '}
          <AboutLink currencyName={coin.currencyName} />
        </div>
        <RowSecondLine coin={coin} showBonus={showBonus} settings={settings} />
      </div>
      {renderRight(coin)}
    </div>
  );
}

/* `V` in SelectCurrencyContent — the groups.
 *
 * A group's HEADING appears only when there is more than one group to begin with (`groups.length`,
 * measured before the filter runs, so a search that leaves one group standing keeps its heading),
 * and the group itself disappears when the filter empties it.
 *
 * `sticky top-14` pairs with the search row's `sticky top-[-1px]` above it — but only when there
 * is a pane-local scroller for those offsets to measure against. See the `sticky` prop below. */
function CoinGroups({ visible, showTitles, settings, showBonus, itemClass, groupItemClass, bgClass, groupSticky, onChange, renderRight }) {
  return visible.map(([key, coins]) => (
    <div key={key}>
      {showTitles && (
        <div
          className={`${groupSticky} pb-2 pt-1 font-extrabold leading-6 text-secondary ${bgClass}`}
        >
          {groupTitle(key)}
        </div>
      )}
      <div className={groupItemClass}>
        {coins.map((coin) => (
          <CoinRow
            key={coin.currencyName}
            coin={coin}
            settings={settings}
            showBonus={showBonus}
            itemClass={itemClass}
            onChange={onChange}
            renderRight={renderRight}
          />
        ))}
      </div>
    </div>
  ));
}

/* `ks`, the site's Empty, at the size `V`'s fallback asks for. Redefined rather than imported from
   the Explore grid, for the reason CurrencySelect gives: that module drags the 118-game catalogue
   in behind it. */
const Empty = ({ children = "Stay tuned-something's coming!" }) => (
  <section className="center my-10 flex-col py-10 text-center">
    <div className="mt-4 leading-5 text-secondary">{children}</div>
  </section>
);

/* --------------------------------------------------------------------------------------- */

/* `Q` — the component itself. Its props are the original's names, and the ones this call site does
 * not pass are noted rather than implemented: `showFullName` (appends "- Bitcoin" to the ticker),
 * `autoScroll` (off here), `showSwap`/`onClose` (the "Coin or token not found" panel with its Swap
 * Coin button, which belongs to the deposit dialog's copy of this list), and `list` (the page
 * hands `groups` directly, so the internal grouping path is never taken).
 */
/* `stickyClasses` IS OURS, AND IT EXISTS BECAUSE THE ORIGINAL'S OFFSETS MEASURE A DIFFERENT BOX.
 *
 * The chunk pins the search row at `top-[-1px]` and each group heading at `top-14`, and both are
 * right there because the list lives inside a pane-local scroller — `#page-content` on the wallet
 * page, `.scroll-y` in the deposit dialog. `top` measures the nearest scrolling ancestor, so on
 * the original "0" is the top of the pane, just under the chrome, and the two rows pin tidily
 * inside it.
 *
 * THIS BUILD SCROLLS THE DOCUMENT INSTEAD. `.main-layout-content` clears the fixed header with
 * padding rather than owning a scroller, so the same offsets resolve against the VIEWPORT: the
 * search row would pin at -1px, behind a 60px fixed header, and the group headings at 56px,
 * likewise. Worse, the search row's `z-20` beats the wallet page's own pinned heading (`z-10`
 * over 60..120) and paints across it.
 *
 * So the OFFSETS are the call site's, not the component's. The wallet pane drops the search row's
 * pin entirely — it was the thing colliding, and nothing asked for it — and re-pins the group
 * headings at `top-30`, i.e. 120px, which is the wallet heading's bottom edge and the same line
 * the rail pins on. That restores the behaviour the chunk intends: each section's title holds at
 * the top of the pane while its own rows pass under it, and is pushed off by the next section's
 * title. THAT PART NEEDS NO CODE — sticky only holds within its containing block, and the heading
 * plus its rows already share one wrapper `<div>` per group, which is the chunk's own structure.
 *
 * DEFAULTS TO THE CHUNK'S VALUES, deliberately: the day this list renders inside a real scroller —
 * the deposit dialog is exactly that — the original's offsets are already correct and there is
 * nothing to remember. Pass `''` for either to switch that one off.
 *
 * These are whole class strings rather than a number because Tailwind scans source text: a
 * computed `top-${n}` would generate nothing. Both values below appear literally at their call
 * sites for the same reason. */
const CHUNK_STICKY = { header: 'sticky top-[-1px] z-20', group: 'sticky top-14 z-10' };

export default function SelectCurrencyContent({
  groups,
  header,
  filter,
  renderRight,
  showBonus = false,
  itemClass = '',
  groupItemClass = '',
  bgClass = 'bg-layer3',
  stickyClasses = CHUNK_STICKY,
  onChange,
  onSearchChange,
}) {
  const { session } = useSession();
  const [search, setSearch] = React.useState('');
  const [focused, setFocused] = React.useState(false);

  const query = search.toLocaleLowerCase();

  const setNeedle = (value) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  /* `$(t)`: the keyword test first, then the caller's filter — so a row has to clear both.
     Applied once here rather than inside the group list, which would otherwise run it a second
     time to decide whether the empty state shows. */
  const rowFilter = (coin) =>
    matchesKeyword(coin, query) ? (filter ? filter(coin, query) : true) : false;

  const visible = groups
    .map(([key, coins]) => [key, coins.filter(rowFilter)])
    .filter(([, coins]) => coins.length > 0);

  return (
    <>
      {/* `top-[-1px]` and not `top-0`: at exactly 0 a sub-pixel scroll position lets a hairline of
          the row behind show above the sticky bar. The original's own value — and see the
          `sticky` prop for why this page switches the whole thing off. */}
      <div
        className={`${stickyClasses.header ?? ''} flex items-center justify-between pb-2 pt-1 sm:pt-4 ${bgClass}`}
      >
        {header}
        {/* `max-w-[252px]` only applies when there IS a header — `clsx("flex-auto text-base",
            !!header && "max-w-[252px]")`. */}
        <div
          className={`input flex-auto text-base ${header ? 'max-w-[252px]' : ''}`}
          {...(focused ? { 'data-focus': '' } : {})}
        >
          <input
            placeholder="Search"
            value={search}
            onChange={(event) => setNeedle(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <IconSearch className="icon -order-1 size-6 fill-secondary" />
          {!!search && (
            <button type="button" aria-label="Clear" onClick={() => setNeedle('')}>
              <IconClose className="icon size-6" />
            </button>
          )}
        </div>
      </div>

      {visible.length > 0 ? (
        <CoinGroups
          visible={visible}
          /* The UNFILTERED count, so a search that leaves one group standing keeps its heading. */
          showTitles={groups.length > 1}
          settings={session.setting}
          showBonus={showBonus}
          itemClass={itemClass}
          groupItemClass={groupItemClass}
          bgClass={bgClass}
          groupSticky={stickyClasses.group ?? ''}
          onChange={onChange}
          renderRight={renderRight}
        />
      ) : (
        /* `fallback: e.fallback || <Empty class="my-10"/>`. The Balance page passes no
           `showSwap`, so the chunk's own fallback expression is `false` and the plain Empty is
           what shows — with the site's default copy, since no children are passed. */
        <Empty />
      )}
    </>
  );
}

