import React from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../../../../context/session';
import { useGates } from '../../../../context/gates';
import { walletCoins } from '../../../../services/gates';
import { getCurrency } from '../../../../data/currencies';
import { printCurrency, getAlias, amount2usd } from '../../../../utils/currency';
import { coinIcon } from '../../../../utils/coinArt';
import { layerPosition, scrollParent } from '../../../../components/shared/Select/position';
import PopCenter from '../../../../components/shared/PopCenter';
import { useIsDesktop } from '../../../../hooks/useMediaQuery';
import {
  IconSearch,
  IconClose,
  IconInform,
  IconAddCurrency,
  IconSettings,
  IconLoading,
} from './icons';

/* The wallet pill's currency picker — what clicking the coin, the amount or the chevron opens.
 *
 * BUILT FROM THE REAL CHUNKS, not from the rendered DOM. `index-C2VSp-Vh.js` (the pill) names
 * its layer as a lazy import of `SelectLayer-CwsGOFvY.js`, and both came off `hash.game/assets/`
 * — the route CLAUDE.md describes near the top. So the class lists below are the Solid
 * templates' own, the copy is the chunk's `y("…")` i18n, and every branch this file does not
 * take is recorded rather than guessed at. The pasted capture agrees with all of it and settles
 * the one thing a chunk cannot carry: which coins the wallet holds and in what order (see
 * `context/account.js`).
 *
 * THE STRUCTURE, from `Jt`, the chunk's default export:
 *
 *   <Show when={currencyStore.init} fallback={<div class="center min-h-[500px]"><Loading/></div>}>
 *     <Tabs type="inner" value={currencyBonusType ? 1 : 0}
 *           class={bonus ? "sticky top-[-1px] z-20 sm:!bg-layer2" : "hidden"}>
 *       <TabItem title="Deposit Balance"> {_t}  <- the search bar, the groups, the footer
 *       <TabItem title="Bonus Balance">   {it}  <- the same groups over sports/free-play amounts
 *
 * `bonus` is true only when some coin carries a sports or free-play balance, and no row in this
 * wallet does — so the strip renders `hidden`, exactly as the capture shows it, and the Bonus
 * Balance panel is unreachable. It is not built. The strip itself IS built, dead classes and
 * all, because leaving it out would be a second departure on top of the first: the capture has
 * those two buttons in the DOM.
 *
 * THE POPOVER IS THE DESKTOP ARM ONLY. `Qe` in the pill chunk hands its layer to `aR`, which
 * picks between `wS` (a portalled `.dropdown-layer`, positioned from the trigger's box) and
 * `CS` (a full `.pop` dialog with a title bar) on a DEVICE test. Only `wS` is reproduced here,
 * so a phone gets the dropdown where the original gives it a sheet. Flagged rather than faked:
 * the sheet is a different component, and the pill is the same either way.
 *
 * FOUR THINGS INSIDE IT ARE NOT BUILT, each inert at its call site rather than removed:
 *
 *  - the `+` button's Manage Assets sheet (`yt` — Crypto/Fiat tabs over a switch per coin),
 *  - "View in currency", which emits `open-fiat` and opens the display-currency dialog,
 *  - the unsettled-bets banner, which is a second request (`/platform-japarot/
 *    user-provider-balance-list/`) with no captured response and nothing to show at zero,
 *  - the mobile-only Deposit button under the footer row, which belongs to the sheet arm above.
 */

/* --------------------------------------------------------------------------------------- */
/* Grouping and filtering — `xt` and `H` in the chunk.                                       */
/* --------------------------------------------------------------------------------------- */

/* `["FIAT","CHAIN","mNFT"].indexOf(key)`, ascending — so a type NOT in the list sorts to -1 and
   leads, which is the original's behaviour rather than an oversight and is why this is written
   as an indexOf rather than a lookup table. The live catalogue has two such types, `3RD` and
   `VIRTUAL`, and VIRTUAL never reaches here because it is folded into CHAIN first. */
const GROUP_ORDER = ['FIAT', 'CHAIN', 'mNFT'];

/* `at(key)`, verbatim including the missing space in the HIDE label. */
function groupTitle(key) {
  switch (key) {
    case 'mNFT':
      return 'NFT';
    case 'FIAT':
      return 'Cash';
    case 'HIDE':
      return 'Other Supported Coin(Click to add and use Coins)';
    case 'CASINOBONUS':
      return 'Bonus in Casino';
    case 'SPORTSBONUS':
      return 'Bonus in Sports';
    default:
      return 'Cryptocurrency';
  }
}

/* `xt(coins)`:
 *
 *   groupBy(orderBy(coins, c => amount2usd(c.generalAmount, c.currencyName), "desc"),
 *           c => { const t = getCurrency(c.currencyName)?.currencyType;
 *                  return t === "CHAIN" || t === "VIRTUAL" ? "CHAIN" : t ?? "CHAIN" })
 *
 * ROWS ARE ORDERED BY WHAT THEY ARE WORTH, not by ticker and not by the wallet's `sort`.
 * `amount2usd` multiplies through the rate table `/game/support/system/conf/usdPrice` fills,
 * which `data/usdPrice.js` now carries as a live answer — so this is the original's own
 * comparison rather than a stand-in for it.
 *
 * Ties fall back to the wallet's own `sort`, which is the captured order. That is not an
 * addition either: lodash `orderBy` is stable, so the original lands in the same place by doing
 * nothing, and `Array.prototype.sort` is specified stable too. Written out because 89 of these
 * 90 rows are worth exactly zero, which makes the tiebreak the thing doing all the work.
 */
function groupWallet(coins) {
  const ordered = [...coins].sort(
    (a, b) =>
      amount2usd(b.generalAmount, b.currencyName) - amount2usd(a.generalAmount, a.currencyName) ||
      a.sort - b.sort,
  );

  const groups = new Map();
  ordered.forEach((coin) => {
    const type = getCurrency(coin.currencyName)?.currencyType;
    const key = type === 'CHAIN' || type === 'VIRTUAL' ? 'CHAIN' : (type ?? 'CHAIN');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(coin);
  });

  return [...groups.entries()].sort(
    (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]),
  );
}

/* `H(coin)`. Three tests in order, and the middle one is the interesting one: A SEARCH BEATS
 * "Hide Small". Type something and every match shows whatever it is worth, which is what makes
 * the feature usable on a wallet of ninety mostly-empty coins.
 *
 * `hideSmallCurrency` keeps a row when it is either PINNED (`displayStatus === 1`, which the
 * original stamps on any coin picked out of a search) or worth more than $0.10 — and worth is
 * `convertCurrency(amount, currency)` with the target left at its default, i.e. plain USD. The
 * pin is the whole reason Cash / INR survives the filter in the capture while the other 88 empty
 * rows go: at a zero balance nothing clears ten cents, so `displayStatus` is the only way
 * through. See the note on it in `context/account.js`.
 *
 * The mNFT tail is the original's own and never fires in this build — no mNFT coin is in the
 * wallet — but it is what stops an empty NFT group appearing beside the two real ones.
 */
function matchesFilter(coin, search, settings) {
  const query = search.toLocaleLowerCase();
  const meta = getCurrency(coin.currencyName);

  const hit =
    coin.currencyName.toLocaleLowerCase().includes(query) ||
    (meta?.fullName ?? '').toLocaleLowerCase().includes(query) ||
    getAlias(coin.currencyName).toLocaleLowerCase().includes(query);
  if (!hit) return false;
  if (query) return true;

  const kept = settings.hideSmallCurrency
    ? coin.displayStatus === 1 || amount2usd(coin.generalAmount, coin.currencyName) > 0.1
    : true;
  if (!kept) return false;

  return meta?.currencyType?.toLocaleLowerCase() === 'mnft'
    ? Number(coin.generalAmount) > 0
    : true;
}

/* --------------------------------------------------------------------------------------- */

/* `ks`, the site's Empty. Redefined rather than imported from `components/Explore/GameGrid`,
   which is where this project's other copy lives: pulling it in from there would hang the whole
   Explore grid module — and the 118-game catalogue behind it — off the header. */
const Empty = ({ children, className = '' }) => (
  <section className={`center flex-col py-10 text-center ${className}`}>
    <div className="mt-4 leading-5 text-secondary">{children}</div>
  </section>
);

/* `rt` — the amount at the end of a row, and its three arms are a single Switch in the chunk:
 *
 *   isFiat                      -> `${printCurrency(amount, currencyName)}`
 *   !isFiat && localeCurrency   -> the converted figure, then the raw one in `.text-second`
 *   !isFiat && !localeCurrency  -> the raw figure alone, `hasAlias: false`
 *
 * ONLY THE FIRST AND THIRD ARE REACHABLE HERE. The capture was taken with `enableLocaleCurrency`
 * on — which is why every crypto row in it reads "$0.00" over a dim "0" — and this build keeps
 * that switch off, because converting needs an FX rate it has no feed for. `context/account.js`
 * records the same departure for the pill. The middle arm is written out anyway: it is the one
 * that renders the day a rate endpoint lands, and it is the only place `.text-second` is used.
 *
 * `hasAlias: false` on the third arm is what drops the ticker — the row already prints it in
 * bold two columns to the left. `De`, the floor at zero, is the pill's own helper. */
function RowAmount({ coin, settings }) {
  const isFiat = getCurrency(coin.currencyName)?.currencyType === 'FIAT';
  /* `De(e) { return e.isNegative() ? new Big(0) : e }` — a negative balance prints as 0. */
  const amount = Math.max(0, Number(coin.generalAmount));

  return (
    /* `clsx("ms-auto", !isRtl() && "text-right")`. This build has no RTL switch, so the second
       half always applies. */
    <div className="ms-auto text-right">
      <div dir="ltr">
        {isFiat && printCurrency(amount, coin.currencyName, { settings })}

        {!isFiat && settings.enableLocaleCurrency && (
          <>
            <div>{printCurrency(amount, coin.currencyName, { settings })}</div>
            <div className="text-second">
              {printCurrency(amount, coin.currencyName, {
                settings,
                target: coin.currencyName,
                hasAlias: false,
              })}
            </div>
          </>
        )}

        {!isFiat && !settings.enableLocaleCurrency && (
          <div>{printCurrency(amount, coin.currencyName, { settings, hasAlias: false })}</div>
        )}
      </div>
    </div>
  );
}

/* The three coins that carry an explainer link beside the ticker — `c()` in `nt`, a switch with
   no default, so every other row renders nothing. BCL is in the switch and not in this wallet. */
const ABOUT_LINKS = {
  BCD: '/wallet/about-bonuscoin',
  BCL: '/wallet/about-ticketcoin',
  BC: '/wallet/about-bccoin',
};

/* `nt` — one coin. `settings` is threaded down rather than read from context here: ninety rows
   means ninety context subscriptions for a value the panel already has in hand. */
function CoinRow({ coin, selected, settings, onPick, onClose }) {
  const meta = getCurrency(coin.currencyName);
  const rowRef = React.useRef(null);
  const about = ABOUT_LINKS[coin.currencyName];

  /* `Y(() => r() && setTimeout(() => s && s.offsetTop > 0 && l(s.offsetTop)))`, where `l` is
     `scroller.scrollTo(0, offsetTop - scroller.clientHeight / 2)` — the selected coin is
     centred in the panel when it opens. A layout effect rather than the original's deferred
     one, so it lands before the first paint instead of after it; ninety rows means the panel
     otherwise opens at the top and jumps. */
  React.useLayoutEffect(() => {
    const node = rowRef.current;
    if (!selected || !node) return;
    const scroller = node.closest('.scroll-y');
    if (scroller && node.offsetTop > 0) {
      scroller.scrollTo(0, node.offsetTop - scroller.clientHeight / 2);
    }
  }, [selected]);

  return (
    /* `scroll-target` is a DEAD CLASS in this build and is kept anyway: the original paints it
       through `.app-root:not(.dark) .fix-light-hover.scroll-target`, a light-theme-only rule
       (see the note beside `.fix-light-hover` in index.css). What colours the selected row here
       is the `bg-layer4` beside it, which is a utility and applies in both themes. */
    <div
      ref={rowRef}
      className={`fix-light-hover mb-1 flex cursor-pointer items-center rounded-lg px-2 py-3 !leading-5 hover:bg-layer4 ${
        selected ? 'scroll-target bg-layer4' : ''
      }`}
      onClick={() => onPick(coin)}
    >
      <img className="h-6 w-6" alt="coin icon" src={coinIcon(coin.currencyName)} />
      <div className="ml-2">
        <div className="flex items-center text-base font-extrabold">
          {/* The row's OWN alias, not the catalogue's — `/user/amount/` sends one per row and
              the two can drift apart (LUNA/LUNC; see data/currencies.js). */}
          {coin.aliasCurrencyName}
          {about && (
            /* `onClick={f => { a(currentCurrencyName); f.stopPropagation() }}` — the original
             * passes the WALLET'S current coin, not this row's, so the pick is a no-op and the
             * only thing it does is `hide()`: the panel closes and the link navigates, without
             * the row underneath switching the wallet to whichever coin you clicked the `(i)`
             * on. Reduced to `onClose()` here, which is that call's whole effect.
             *
             * `inactive` is the same dead class the VIP page's hero link carries. Neither
             * `/wallet/about-bonuscoin` nor `/wallet/about-bccoin` is a route in this build, so
             * both currently fall through to the catch-all — the same position every row of the
             * account dropdown is in.
             *
             * The captured anchor also carries a bare `link=""`. That is not a class or a data
             * attribute to copy: it is Solid Router's `use:link` DIRECTIVE, the marker that
             * tells the router to intercept the click instead of letting the browser navigate.
             * `<Link>` is what does that job here, so the attribute has no counterpart and is
             * deliberately not reproduced — it would be an empty attribute meaning nothing. */
            <Link
              to={about}
              className="ml-2 text-brand inactive"
              onClick={(event) => {
                onClose();
                event.stopPropagation();
              }}
            >
              <IconInform className="icon size-4" />
            </Link>
          )}
        </div>
        {/* `currencyFullName` is off in the account fixture, as it is in the capture, so this
            second line never renders today. It is the setting that turns "BTC" into "BTC /
            Bitcoin". */}
        {settings.currencyFullName && meta && (
          <div className="text-sm text-secondary">{meta.fullName}</div>
        )}
      </div>
      <RowAmount coin={coin} settings={settings} />
    </div>
  );
}

/* `fe` — the group list. A group prints its heading only when the panel has more than one group
 * TO BEGIN WITH (`e.groups.length`, before the filter runs, so a search that leaves one group
 * standing keeps its heading), and it disappears entirely when the filter empties it.
 *
 * `showTitles` is that unfiltered count; `visible` is what survived. */
function CoinGroups({ visible, showTitles, settings, onPick, onClose }) {
  const selectedName = settings.currencyName;
  const bonusType = settings.currencyBonusType;

  return visible.map(([key, coins]) => (
    <React.Fragment key={key}>
      {showTitles && (
        /* `bg-layer3 dark:bg-layer2 sm:dark:bg-layer3`, the chunk's own and now written in full
           — the light arm was dropped while `dark:` still keyed off the OS rather than off the
           `.dark` class. Note the light half has no `sm:` step of its own: layer3 at every
           width, where the dark theme steps from layer2 to layer3 at 640.

           The sticky offset pairs with the search bar above it: `top-14 sm:top-12` clears a
           56/48px header row, and the `bonus` variant's `top-24 sm:top-[5.5rem]` clears the tab
           strip too, which cannot happen here. */
        <div className="list-title sticky top-14 z-10 bg-layer3 py-2 pl-1 font-extrabold leading-6 text-secondary dark:bg-layer2 sm:top-12 sm:dark:bg-layer3">
          {groupTitle(key)}
        </div>
      )}
      {coins.map((coin) => (
        <CoinRow
          key={coin.currencyName}
          coin={coin}
          settings={settings}
          /* `r()` in `nt`: which row is lit depends on which balance the wallet is spending.
             With `currencyBonusType` empty — its value in this fixture, and the only value
             anything here can set — it reduces to a name match, because the casino/sports
             flags belong to the Bonus Balance panel that is not built. */
          selected={
            !bonusType && key !== 'CASINOBONUS' && key !== 'SPORTSBONUS'
              ? coin.currencyName === selectedName
              : false
          }
          onPick={onPick}
          onClose={onClose}
        />
      ))}
    </React.Fragment>
  ));
}

/* `Ce` — the sticky footer.
 *
 * `-mx-4` against the layer's `padding: 0 .5rem` overshoots by 8px a side, and that is the
 * point: `.scroll-y` clips the overflow, so the bar bleeds to the layer's edges instead of
 * sitting inside its gutter. Do not "fix" it to `-mx-2`. */
function Footer({ settings, setSetting, sheet, onDeposit }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-third bg-layer4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      <div className="flex flex-none items-center justify-between">
        {/* `Be.emit("open-fiat")` then close — the display-currency dialog, which is what turns
            `enableLocaleCurrency` on and is not built. Left as a cursor and no handler rather
            than wired to a route: there is no route, it is an imperative popup. */}
        <div className="flex cursor-pointer items-center text-secondary">
          <IconSettings className="icon mr-1" /> View in currency
        </div>
        <div className="ml-auto flex items-center text-secondary">
          <button
            type="button"
            role="switch"
            aria-checked={!!settings.hideSmallCurrency}
            aria-label="Hide Small"
            className="switch switch-xs mr-1 flex items-center"
            onClick={() => setSetting('hideSmallCurrency', !settings.hideSmallCurrency)}
          >
            <div />
          </button>
          <span className="ml-2">Hide Small</span>
        </div>
      </div>
      {/* `<Show when={mobile}>` — the bottom-sheet arm's full-width Deposit button under the row,
          as bc.game draws it on a phone. */}
      {sheet && (
        <button type="button" className="button button-m button-second mt-3 w-full font-extrabold" onClick={onDeposit}>
          Deposit
        </button>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------------------- */

/* `_t` — everything inside the layer.
 *
 * A SEPARATE COMPONENT SO THAT CLOSING RESETS IT. The original mounts its panel lazily inside
 * `<Show when={visible}>`, so the search box starts empty every time the pill is clicked. Kept
 * in the outer component the `search` signal would survive a close and the panel would reopen
 * mid-filter. Clearing it on close instead would be a setState in an effect — the cascading
 * render `react-hooks/set-state-in-effect` rejects, and the same reason the promotions tab
 * indicator measures onto its node. Unmounting is what the original does anyway. */
function Panel({ onClose, onManageAssets, sheet = false }) {
  const navigate = useNavigate();
  const { session, balances, setSetting, updateBalance } = useSession();
  /* An agent's player picks from the agent currency only (services/gates.js `walletCoins`). */
  const { agentPlayer, on: gateOn } = useGates();
  const [search, setSearch] = React.useState('');
  const [focused, setFocused] = React.useState(false);

  /* `l = partition(coins, d => d.display)` — the wallet holds a row for every currency the
   * account CAN hold, and `display` is which of them this panel lists. Everything above the fold
   * is `r()`, the displayed half; `a()` is the hidden half and it appears in exactly one place.
   *
   * This used to group `balances` whole, which was invisible while every row in the fixture was
   * displayed and stopped being invisible the moment the Manage Assets sheet needed 58 switched
   * off — they all turned up under Cash. */
  const [shown, hidden] = React.useMemo(() => {
    const displayed = [];
    const rest = [];
    walletCoins(balances, agentPlayer).forEach((coin) => (coin.display ? displayed : rest).push(coin));
    return [displayed, rest];
  }, [balances, agentPlayer]);

  /* `E = f() ? [...o, ["HIDE", a()]] : o`, where `f()` is `!isFiat && !!search`. THE HIDDEN
     COINS ONLY EXIST WHILE YOU ARE SEARCHING, under "Other Supported Coin(Click to add and use
     Coins)" — which is how you turn one back on without opening the sheet, since picking a row
     there flips its `display` as well as selecting it. Appended raw rather than run through
     `groupWallet`: the original does not sort or subdivide this one. */
  const groups = React.useMemo(() => {
    const displayed = groupWallet(shown);
    return search ? [...displayed, ['HIDE', hidden]] : displayed;
  }, [shown, hidden, search]);

  /* `a(currencyName)` in `nt`, in its own order: close first, then stamp the row, then commit
     the pair of settings. The `displayStatus` stamp is what pins a coin found through a search
     so that Hide Small stops hiding it again the moment the search clears. */
  const pick = React.useCallback(
    (coin) => {
      onClose();
      if (search) updateBalance(coin.currencyName, { displayStatus: 1 });
      if (coin.display === false) updateBalance(coin.currencyName, { display: true });
      setSetting('currencyBonusType', '');
      setSetting('currencyName', coin.currencyName);
    },
    [search, onClose, setSetting, updateBalance],
  );

  /* Filtered once, here, because two things read the result: the list, and the decision about
     which of the panel's two empty states to show instead of it. */
  const visible = React.useMemo(
    () =>
      groups
        .map(([key, coins]) => [
          key,
          coins.filter((coin) => matchesFilter(coin, search, session.setting)),
        ])
        .filter(([, coins]) => coins.length > 0),
    [groups, search, session.setting],
  );

  return (
    <>
      {/* The tab strip, `hidden` because no coin in this wallet carries a bonus balance. Both
          custom properties are the capture's; `.tabs-indicator` reads them, and at 0px it has
          nothing to draw even if the strip were shown. */}
      <div
        role="tablist"
        data-type="inner"
        className="scroll-x tabs-title hide-scroll hidden"
        style={{ '--tabs-width': '0px', '--tabs-indicator-position': '0px' }}
      >
        <div className="tabs-btn-group">
          <button type="button" role="tab" aria-selected="true" className="tabs-btn btn-like">
            Deposit Balance
          </button>
          <button type="button" role="tab" className="tabs-btn btn-like">
            <div className="relative">Bonus Balance</div>
          </button>
        </div>
        <div className="tabs-indicator test-indicator-tab" />
      </div>

      <div className="tabs-content mt-0 min-h-[500px] flex-auto bg-transparent sm:min-h-0">
        {/* `bg-layer3 dark:bg-layer2 sm:dark:bg-layer3`, both arms — see the group heading above,
            which carries the same trio for the same reason. */}
        <div className="search-input sticky -top-[1px] z-20 flex items-center justify-between bg-layer3 pt-3 dark:bg-layer2 sm:dark:bg-layer3">
          <div
            className="input flex-auto bg-layer3 text-base font-semibold"
            {...(focused ? { 'data-focus': '' } : {})}
          >
            <input
              placeholder="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <IconSearch className="icon -order-1 fill-secondary" />
            {!!search && (
              <button type="button" aria-label="Clear" onClick={() => setSearch('')}>
                <IconClose className="icon fill-secondary" />
              </button>
            )}
          </div>
          {/* `onClick={() => { onClose(); popupManager.push(ManageAssets).then(() => mobile &&
              onReopen?.()) }}` — the sheet is pushed AFTER this dropdown closes, which is why it
              is mounted from the wallet pill rather than from in here: it has to outlive the
              layer that opened it. `button-m` is what `ot` writes for every desktop button, and
              `aspect-square` is what makes this one a 40px square beside a 40px field.
              `light-darkness` is dead in the dark theme; kept, like the row's `scroll-target`. */}
          <button
            type="button"
            className="button button-m fix-light-hover light-darkness center ml-2 aspect-square rounded-lg bg-layer4"
            aria-label="Manage assets"
            onClick={() => {
              onClose();
              onManageAssets();
            }}
          >
            <IconAddCurrency className="icon" />
          </button>
        </div>

        <div className="my-1 flex-auto">
          {visible.length > 0 && (
            <CoinGroups
              visible={visible}
              showTitles={groups.length > 1}
              settings={session.setting}
              onPick={pick}
              onClose={onClose}
            />
          )}

          {/* TWO empty states, and which one shows depends on whether anything is typed — `fe`
              takes a `fallback` prop and `_t` only passes one `when(!isFiat && !!search)`. With
              a search that found nothing you get the not-found block; with no search at all (a
              wallet whose every row Hide Small has swallowed) you get the site's bare Empty. */}
          {visible.length === 0 && !search && <Empty>Stay tuned-something&apos;s coming!</Empty>}

          {visible.length === 0 && !!search && (
            /* The middle third of this block is a Swap Coin button pointing at `/wallet/swap`,
               a route this build does not have — it would fall through to the catch-all and
               silently show the home page, so it is left out and said so here rather than wired
               up. The trailing sentence carries `__ENV_SITE__` in the bundle, a build-time
               placeholder the deploy substitutes the site name into. */
            <>
              <Empty className="min-h-24">Coin or token not found</Empty>
              <div className="mt-4 text-center text-secondary">
                For unsupported coins and tokens, try the BC.GAME Swap feature to exchange for
                supported coins and tokens
              </div>
            </>
          )}
        </div>

        <Footer
          settings={session.setting}
          setSetting={setSetting}
          sheet={sheet && gateOn('deposit')}
          onDeposit={() => {
            onClose();
            navigate('/deposit');
          }}
        />
      </div>
    </>
  );
}

/* `wS` — the popover shell: a portalled `.dropdown-layer` placed against the trigger's box,
   closed by an outside pointerdown, by Escape, or by the trigger's nearest scrollable ancestor
   moving. All of it is the shared Select's, because the original hands both layers to this same
   component. The only difference is the width `layerPosition` clamps against: `.currency-select`
   is 24rem where every other dropdown on the site is 18. */
/* THE LOADING STATE IS REAL ON THE ORIGINAL AND HAS TO BE STAGED HERE, which makes it the one
 * piece of this file that is timing rather than markup. Two things gate the panel there:
 * `SelectLayer-CwsGOFvY.js` is a LAZY chunk the pill only imports when you first click it, and
 * `Jt` then holds the content behind `<Show when={currencyStore.init}>` until the currency
 * catalogue has arrived. Both are network. So the first open shows the spinner and every open
 * after it does not — the chunk is cached and the store stays initialised.
 *
 * Here the catalogue is a module constant and there is no chunk to fetch, so the honest way to
 * reproduce that shape is to stage it: one delay, once per page load, then never again. The
 * module-level flag is what makes it once — deliberately not state, because it has to outlive
 * the component the way a loaded chunk outlives the layer that pulled it in.
 *
 * `LAYER_LOAD_MS` is the only invented number in this file. Set it to 0 to take the whole thing
 * out; nothing else has to change. */
const LAYER_LOAD_MS = 300;
let layerLoaded = false;

export default function CurrencySelect({ triggerRef, open, onClose, onManageAssets }) {
  const [position, setPosition] = React.useState(null);
  const [ready, setReady] = React.useState(layerLoaded);
  const layerRef = React.useRef(null);
  /* THE SHEET ARM (`CS`), built 2026-10-16 on the user's report: below `lg` the popover was a
     fixed 24rem x 36rem box hanging off the pill, half of it empty. The original hands a phone a
     `.pop` sheet instead; here that is PopCenter's sheet, with the same Panel inside it. The
     popover's placement and outside-click effects stand down while the sheet is used. */
  const isDesktop = useIsDesktop();

  React.useEffect(() => {
    if (!open || ready) return undefined;
    const id = setTimeout(() => {
      layerLoaded = true;
      setReady(true);
    }, LAYER_LOAD_MS);
    return () => clearTimeout(id);
  }, [open, ready]);

  React.useLayoutEffect(() => {
    if (!open || !isDesktop) return undefined;
    const place = () => {
      const trigger = triggerRef.current;
      const layer = layerRef.current;
      if (!trigger || !layer) return;
      setPosition(
        layerPosition(
          trigger.getBoundingClientRect(),
          layer.offsetHeight,
          /* Was a hardcoded `24 * 16` for `.currency-select`'s width; measured now, for the
             reason the shared Select documents — the figure feeds the end-align branch. */
          layer.offsetWidth,
          trigger.clientWidth,
        ),
      );
    };
    place();

    /* SCROLLING CLOSES THE LAYER; it does not drag it along — `qe(() => t.visible ? c() : void 0,
       "scroll", () => t.setVisible(!1))`, bound to `Ni()`, the trigger's nearest scrollable
       ancestor. Bound there and not to the window, which is what lets the ninety-row list inside
       this layer scroll without closing the layer you are reading. */
    const scroller = scrollParent(triggerRef.current);
    const onScroll = () => onClose();
    const onResize = () => place();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [open, onClose, triggerRef, isDesktop]);

  React.useEffect(() => {
    if (!open || !isDesktop) return undefined;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (event.target.closest?.('.dropdown-layer')) return;
      onClose();
    };
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, triggerRef, isDesktop]);

  if (!open) return null;

  if (!isDesktop) {
    return (
      <PopCenter open onClose={onClose} title="Select Currency" type="sheet" closable>
        {/* bc.game's sheet: 80% of the screen tall whatever the list holds, the footer pinned. */}
        <div dir="ltr" className="currency-select currency-select-sheet flex h-[calc(80vh-4rem)] flex-col overflow-y-auto overflow-x-hidden px-2">
          <div className="scroll-container">
            {ready ? (
              <Panel onClose={onClose} onManageAssets={onManageAssets} sheet />
            ) : (
              <div className="center min-h-[50vh]">
                <IconLoading className="size-4" />
              </div>
            )}
          </div>
        </div>
      </PopCenter>
    );
  }

  return createPortal(
    <div
      ref={layerRef}
      dir="ltr"
      /* Hidden for the one frame between mounting and being measured — it has to be in the DOM
         to have a height, and the layout effect above places it before the browser paints. */
      style={position || { left: 0, top: 0, visibility: 'hidden' }}
      className="scroll-y dropdown-layer dropdown-enter bg-layer3 currency-select mt-1 !pb-0 [&_.pop-content]:pb-0"
    >
      {/* `.scroll-container` — `display: flex; flex-direction: column; min-height: 100%`, which
          is what gives the footer's `mt-auto` something to push against. Already declared
          globally in `components/modals/Auth/Auth.css`; it is the original's own global rule,
          not that dialog's, and this is its fourth consumer. */}
      <div className="scroll-container">
        {/* `<Show when={currencyStore.init} fallback={...}>` — `St` in the chunk, verbatim. The
            `min-h-[500px]` is what keeps the spinner centred in a panel that is 576px tall
            before it has any rows to fill it. */}
        {ready ? (
          <Panel onClose={onClose} onManageAssets={onManageAssets} />
        ) : (
          <div className="center min-h-[500px]">
            <IconLoading className="size-4" />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
