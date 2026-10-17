import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import useDialogScrollLock from '../../../hooks/useDialogScrollLock';
import useResource from '../../../hooks/useResource';
import EmptyPlaceholder from '../../shared/EmptyPlaceholder';
import { IconClose } from '../../shared/icons';
import { useSession } from '../../../context/session';
import { useSelectedCurrency } from '../../../hooks/useSelectedCurrency';
import { walletCode } from '../../../utils/currency';
import { coinIcon } from '../../../utils/coinArt';
import { getFreePlays, freePlayTabs, freePlayPanel } from '../../../services/freePlay';
import btiIcon from '../../../assets/freeplay/bti.png';
import betbyIcon from '../../../assets/freeplay/betby.png';
import '../Auth/Auth.css';
import Loading from '../../shared/Loading';

/* `/free-plays` — the Free Plays dialog, and what the account dropdown's Free Plays row opens.
 *
 * IT IS A DIALOG ROUTE, not a popup: `{ path: "/free-plays", component: c(() => L.FreePlay()),
 * info: { dialog: !0 } }` in `Enter-MsmOuq5R.js`, inside a group (`Fg`) that is spread flat into
 * the route table with no guards of its own. So there is no login guard on the path — the row that
 * opens it carries `needLogin`, and the resource behind it simply does not fetch when logged out,
 * which renders the same empty dialog either way. Both are reproduced by doing nothing.
 *
 * `dialog: !0` with NO `size`, which is the interesting half: the dialog manager's own default is
 * 30rem x 40rem, and that pair is now a real `.dialog-list` rule in Auth.css rather than something
 * this file restates. See the note there — hoisting it is what this dialog triggered.
 *
 * `free-play-DOTFWZ2M.js` is 6 KB and holds the whole thing; it is not in the mirror and came off
 * `hash.game/assets/`, with `claimable-item-detail-DA9ukfTK.js` for the row's detail popup and
 * `index-C4dmninU.js` (which IS in the mirror) for the two sports provider marks. So every class
 * list below is the Solid template's own and every string is verbatim `t("…")`. Nothing on this
 * dialog is read off a screenshot.
 *
 * ── THE PAYLOAD IS ABSENT AND THAT IS THE CORRECT RENDERING ───────────────────────────────────
 *
 * `/activity/bonus/freeplays/unused-rewards/` answers 403 with an empty body, and the resource
 * declares no `initialValue`, so `data` is `undefined` — which every read in the original guards
 * for. All 0 / Free Spins 0 / Free Bet 0 over "No Free Plays Yet" is the capture, reached without
 * inventing anything. See services/freePlay.js.
 *
 * The ROW is built anyway, because the chunk gives it in full and both provider marks were
 * recoverable; it is simply unreachable while the feed is shut.
 *
 * ── THREE THINGS THE CHUNK SETTLES ────────────────────────────────────────────────────────────
 *
 * THE ROOT IS `PageLayout` (`w3`), WHICH DRAWS NOTHING. It is three lines: inside a dialog route
 * it pushes its own props — minus children — into the router's dialog context and then returns
 * `t.children`. So `title` becomes the manager's title bar and `class` lands on `.dialog-item`,
 * the dialog panel. That is why `bonus-scope` and `bg-layer1` reach the whole dialog and why
 * `[&_.dialog-title]:bg-transparent` is a DESCENDANT selector that resolves at all.
 *
 * `[&_.dialog-title]:bg-transparent` IS INERT IN THIS BUILD, and knowing why matters more than
 * the class does. On the original `.dialog-title` carries
 * `--bg: var(--layer4); --tw-bg-opacity: calc((var(--scroll) * 100 / 15) - 50%)`, so the bar is
 * transparent at rest and fades to layer4 as the content scrolls under it; this dialog opts out of
 * that so the bar stays transparent over its layer1 panel. Here that fill is transcribed SCOPED —
 * `.user-enter-dialog .dialog-title` in UserEnter.css, the one route that needed it — and the
 * shared `.dialog-title` in Auth.css paints nothing at all. So the bar is already transparent and
 * the class changes nothing. Kept, like `f-ull` and `texxt-sm`.
 *
 * Worth knowing before anyone hoists that fill onto the shared rule: it would NOT then be
 * cancelled by this class. A plain `.dialog-title` in an unlayered CSS file beats a Tailwind
 * arbitrary variant no matter the specificity — the cascade hazard in its usual direction — so the
 * opt-out would have to move into CSS alongside it.
 *
 * THE THREE BLOCKS ARE SIBLINGS IN THE SCROLL CONTAINER, and `flex-1` on the middle one is what
 * pins the footer to the bottom: `.scroll-container` is `flex flex-col` with `min-height: 100%`,
 * the list grows to fill whatever is left, and the button's own `sticky bottom-0` holds it there
 * once the list is long enough to scroll. The `bg-layer1` on that footer is not decoration — it is
 * what stops rows showing through the sticky strip, and it has to match the panel's own fill.
 *
 * ── NOT BUILT, each inert at its call site ────────────────────────────────────────────────────
 *
 *   the detail popup   clicking a row's title calls `at(list, index, !0)` in
 *                      `claimable-item-detail-DA9ukfTK.js` — a `.pop` holding a CAROUSEL over the
 *                      whole list, which is why the list and the index are passed rather than the
 *                      one row. `toClaimableItem` (its `rt`) is ported in the service because the
 *                      mapping is this dialog's, but the popup is a shared bonus component with
 *                      a per-type rules table and belongs with the rest of that family.
 *   Play Now           two navigations that have no page here — see the handler.
 *   ErrorBoundary      `Is` with `fallback: null` around a `mr` Suspense. A synchronous fixture
 *                      cannot trip either, and there is no lazy chunk to wait on.
 */

/* `p` — a tab, and it is a `<div>` with an `onClick` rather than a `<button>` on the original.
   Kept as written; `cursor-pointer` is doing the affordance. */
function Tab({ name, count, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer flex-row items-center gap-1 rounded-lg px-3 py-2 ${
        isActive ? 'bg-layer4' : ''
      }`}
    >
      <span
        className={`text-sm ${
          isActive ? 'font-extrabold text-primary' : 'font-semibold text-tertiary'
        }`}
      >
        {name}
      </span>
      {/* The original composes this list in exactly this order, with the conditional pair in the
          middle — so the radius and the padding come after the colours. */}
      <span
        className={`text-xs font-extrabold ${
          isActive ? 'bg-brand text-primary_brand' : 'bg-layer4 text-tertiary'
        } rounded-md px-1`}
      >
        {count}
      </span>
    </div>
  );
}

/* `pk` — the shared chevron, `a5` in the main bundle. The same drawing the bet-history rows use;
   `rotate-180` points it right. It takes `text-*` rather than `fill-*` because the icon wrapper
   the original passes it through is `fill: currentColor`. */
const IconChevron = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={`icon ${className}`} aria-hidden="true">
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

/* `ne` — one row.
 *
 * ONE OBJECT READ TWO WAYS. The minified source declares `r = () => n.item` and `o = () => n.item`
 * — two aliases for the same value, which is a TypeScript cast surviving minification: `r` is the
 * row as a free spin, `o` as a sports free bet, and `bonusType === "Free Spin"` picks. So there is
 * no second shape to look for; the fields simply differ per branch.
 *
 * The icon box branches three ways and only the class list changes: a free spin shows its own 3:4
 * game art at full height, while a free bet shows a 36px provider mark inside a tinted 60px square
 * — brand green at 5% for BTi, `rgba(133,103,255,0.05)` for BetBy, which is a literal in the chunk
 * and not one of this project's tokens.
 */
function FreePlayRow({ item }) {
  const navigate = useNavigate();
  const { session, setSetting } = useSession();
  const cur = useSelectedCurrency({ site: true });

  const isFreeSpin = item.bonusType === 'Free Spin';
  const isBti = item.provider === 'bti';
  const isBetby = item.provider === 'betby';

  /* `b` — Play Now, and the free-spin arm has a bug in it that is reproduced rather than tidied:
   * `C() && m("/trading")` has no early return, so a `detrade:trading` free spin navigates to
   * `/trading` and then straight on to `/game/detrade:trading?…` in the same handler. The second
   * call wins. Left as written.
   *
   * Neither destination exists in this build — `/game/:slug` and `/trading` both fall to the
   * catch-all, as `/bti` does — so the button is effectively inert here. The currency write is
   * real: `Y("setting","currencyName", …)` is this project's `setSetting`, the same setter the
   * wallet pill uses. */
  const play = () => {
    if (isFreeSpin) {
      if (item.gameUnique === 'detrade:trading') navigate('/trading');
      navigate(`/game/${item.gameUnique}?fsId=${item.fsId}&currency=${session.bonusCurrencyName}`);
      return;
    }
    setSetting('currencyName', item.currencyName ?? session.setting.currencyName);
    if (isBti) navigate('/bti');
    if (isBetby) navigate('/sports');
  };

  const amount = (
    <>
      {/* `mt-[1px]` is the chunk's own — a 12px coin next to 14px extrabold text sits a pixel
          high without it. */}
      {/* The free play's value in its own coin, shown in the selected currency (icon to match). */}
      <img className="mx-1 mt-[1px] size-3" alt="" src={coinIcon(cur.code)} />
      {cur.show(item.amount, walletCode(item.currencyName))}
    </>
  );

  return (
    <div className="flex flex-row items-center justify-between gap-2 rounded-lg border border-fourth/5 bg-layer3 p-3">
      <div className="flex min-w-0 flex-1 flex-row items-center gap-2">
        {/* `U("flex size-15 items-center justify-center", isBti && "…", isBetby && "…")` — clsx,
            which drops the falsy arms rather than joining empty strings, so a free spin's box gets
            no trailing whitespace. Joined the same way here for the same reason. */}
        <div
          className={[
            'flex size-15 items-center justify-center',
            isBti && 'rounded-lg bg-brand/5 p-3',
            isBetby && 'rounded-lg bg-[rgba(133,103,255,0.05)] p-3',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isFreeSpin ? (
            /* The original uses its CDN `Image` component here, which appends `?_v=4,dpr=…` and
               shows a 100px blurred copy until the real file preloads. `iconThreeFour` is a
               remote URL off the feed rather than one of this build's local covers, so there is
               nothing to glob and a plain `<img>` is the honest stand-in. */
            <img className="h-full w-auto rounded-md" alt="" src={item.iconThreeFour} />
          ) : (
            <img
              className="size-9"
              alt="sports provider icon"
              src={isBetby ? betbyIcon : btiIcon}
            />
          )}
        </div>
        <span className="flex min-w-0 flex-col gap-1">
          {/* The original hangs `at(list.map(rt), index, !0)` off this span — the claimable-item
              detail popup, and it opens over a CAROUSEL of the whole list rather than this one
              row, which is why it takes the list and an index. That popup is not built, so the
              span keeps its markup and its `cursor-pointer` and does nothing; the row does not
              take `list`/`index` props it cannot use, and the parent has both when it needs them.
              `toClaimableItem` in services/freePlay.js is `rt`, ported because the mapping belongs
              to this dialog even though the popup it feeds does not. */}
          <span className="flex min-w-0 cursor-pointer flex-row items-center">
            <span className="truncate text-base font-extrabold">
              {isFreeSpin ? item.bonusSource : item.title}
            </span>
            <IconChevron className="size-5 flex-none rotate-180 text-secondary" />
          </span>
          {/* A free spin names the game it is for, in `mail` — a token the original declares only
              inside `bonus-scope`. A free bet has no second line. */}
          {isFreeSpin && (
            <span className="text-sm font-semibold text-mail">{item.fullName}</span>
          )}
          <span className="flex items-center text-sm font-extrabold text-brand">
            {isFreeSpin ? (
              <>
                {item.quantity} x {amount}
              </>
            ) : (
              amount
            )}
          </span>
        </span>
      </div>
      {/* `type="input"` is one of the four button types and `bg-button_bright` is written over its
          fill at the call site; `size="m"` is what every trigger on a desktop gets anyway, so both
          classes are the component's rather than the template's. No width and no `flex-none` — the
          button is sized by its label and by `.button`'s own 8px padding. */}
      <button
        type="button"
        onClick={play}
        className="button button-input button-m bg-button_bright"
      >
        Play Now
      </button>
    </div>
  );
}

export default function FreePlay({ onClose }) {
  useDialogScrollLock(true);
  const navigate = useNavigate();
  const [tab, setTab] = React.useState(0);

  const { data, loading } = useResource(getFreePlays);
  const tabs = freePlayTabs(data);
  const panel = freePlayPanel(data, tab);

  /* Escape closes, as on every dialog route here — the original's router pops the history entry
     itself. The refetch pair the chunk carries (`onMount(refetch)` plus
     `createEffect(on(useIsActive(), a => a && refetch(), {defer: true}))`) is not reproduced: the
     second exists to re-read the feed when a kept-alive dialog comes back to the top of the
     stack, and this build mounts and unmounts instead, so mounting IS becoming active. */
  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="dialog-root dialog-visible">
      <div className="dialog-list" role="dialog" aria-modal="true" aria-label="Free Plays">
        {/* Four nested boxes, and `.dialog-item` nests INSIDE `.dialog-overlayer` rather than
            beside it — the overlayer is the opaque frame and carries `z-index: 1000` against the
            item's `0`, so as siblings it paints straight over the content. Same as the deposit and
            auth dialogs; see Auth.css. */}
        <div className="dialog-overlayer">
          <div className="dialog-item bonus-scope bg-layer1 [&_.dialog-title]:bg-transparent">
            <div className="dialog-title relative">
              Free Plays
              <div className="absolute right-4 top-0 ml-auto flex h-full items-center">
                <button
                  type="button"
                  aria-label="Close"
                  className="dialog-close center"
                  onClick={onClose}
                >
                  <IconClose />
                </button>
              </div>
            </div>

            {/* No `px-4`: `.dialog-content` carries `padding-inline: 1rem` in the shell itself,
                which is where the original puts it. */}
            <div className="dialog-content scroll-y">
              <div className="scroll-container">
                <div className="mb-4 flex flex-row">
                  {tabs.map((entry, i) => (
                    <Tab
                      key={entry.name}
                      name={entry.name}
                      count={entry.count || 0}
                      isActive={tab === i}
                      onClick={() => setTab(i)}
                    />
                  ))}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  {/* The chunk wraps the list in `<Suspense fallback={null}>`, which draws nothing
                      at all — and `null` is the wrong reading to port literally here, because the
                      three tab counts above are read off the SAME payload and would sit at 0/0/0
                      over a blank panel. The site's spinner in the panel says the same thing the
                      Suspense boundary means. The feed answers 403 with an empty body and the
                      resource declares no `initialValue`, so what lands under it is the crocodile
                      — which is the capture, a beat later. */}
                  {loading ? (
                    <div className="center min-h-40 flex-1">
                      <Loading />
                    </div>
                  ) : panel.data.length > 0 ? (
                    panel.data.map((item, i) => (
                      <FreePlayRow key={item.rewardItemId ?? i} item={item} />
                    ))
                  ) : (
                    /* `ks` with `type="empty"` — the crocodile, and the per-tab message rather
                       than the default "Stay tuned-something's coming!". */
                    <EmptyPlaceholder>{panel.emptyText}</EmptyPlaceholder>
                  )}
                </div>

                {/* `Get More Free Plays` goes to the promotions page. No `type` on the Button, so
                    it takes no colour from the type map at all — a bare `.button` with the border
                    written at the call site, which is what makes it read as an outline. */}
                <div className="sticky bottom-0 bg-layer1 py-2">
                  <button
                    type="button"
                    onClick={() => navigate('/promotions/promotion')}
                    className="button button-m w-full border border-third font-extrabold"
                  >
                    Get More Free Plays
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
