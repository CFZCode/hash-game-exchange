import { CHAT_AVAILABLE } from '../../../../services/availability';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../../../../context/session';
import { useGates } from '../../../../context/gates';
import { useSettings } from '../../../../context/settings';
import { siteName, useSiteMark } from '../../../../services/siteBranding';
import useResource from '../../../../hooks/useResource';
import useMediaQuery from '../../../../hooks/useMediaQuery';
import { getRewards } from '../../../../services/rewards';
import { getUnreadCount, NOTICES_CHANGED } from '../../../../services/notification';
import { coinDecimals, printCurrency } from '../../../../utils/currency';
import { coinIcon } from '../../../../utils/coinArt';
import { ACCOUNT_MENU } from './menu';
import { DO_NOT_DISTURB_ENABLED, FREE_PLAYS_ENABLED } from '../../../../config/hiddenFeatures';
import CurrencySelect from './CurrencySelect';
import ManageAssets from './ManageAssets';
import DisturbSetting from './DisturbSetting';
import { useConfirm } from './useConfirm';
import BonusPanel, { BonusLayer } from './BonusPanel';
import { IconGift, IconArrow, IconAdd } from './icons';
import { avatarSrc } from '../../../../services/avatars';
import logoSmall from '../../../../assets/logo_small.png';
import './AfterLogin.css';

/* The signed-in header — `AfterLogin-Xr01UEkM.js`, recovered from `hash.game/assets/` along with
 * the wallet pill (`index-C2VSp-Vh.js`) and every icon chunk either of them imports. CLAUDE.md
 * lists both files under "not in the mirror"; they did not have to be, and this page is built
 * from the real chunks rather than from the screenshot.
 *
 * The desktop tree is the chunk's `s2`, whose whole body is four inserts into one template:
 *
 *   t = <div class="absolute left-0 top-0 flex size-full items-center justify-end px-3">
 *         <div class="ml-3 flex items-center">                                    <- l
 *           <div class="button center relative ml-3 h-auto rounded-lg bg-layer5   <- n  (gift)
 *                       p-0 text-secondary"></div>
 *           <div>                                                                 <- C  (chat/bell)
 *
 *   insert(t, Show(when: true, SearchButton), before l)
 *   insert(l, Wallet, before n)
 *   insert(n, Button(class="center relative size-10 p-0", Suspense(BonusNotifications)))
 *   insert(C, Show(when: !isOfflineAgent, [PrivateChat, divider, ChatButton]))
 *   insert(C, NoticeButton)
 *   insert(l, AccountMenu)
 *   effect: C.className = clsx("button relative ml-3 flex h-10 flex-none rounded-lg bg-layer5 p-0",
 *                             isOfflineAgent ? "w-10" : "w-30")
 *
 * The SEARCH BUTTON stays in Header/index.jsx rather than moving here. It is the same component
 * either way (`p1` is `S` from Header-CTF5n6al.js, which the signed-out header also renders) and
 * it sits OUTSIDE `l`, so hoisting it means one button instead of two identical ones behind a
 * branch. The 12px between it and the wallet is `l`'s own `ml-3`, which is why the gap does not
 * change when the branch flips.
 *
 * THREE DEAD CLASSES ARE KEPT, and the first is the one that decides the layout:
 *
 *  - `w-30` on the icon group DOES NOT EXIST in any of the fourteen stylesheets this deploy
 *    ships (the only "w-30" in index-DxOqNczA.css is inside `max-w-300`). So the group is not
 *    120px wide; it is `flex`, and its width is its content. The capture measures it at 80px —
 *    two 40px buttons — which is what settles the question the next paragraph asks.
 *  - `size-[26px] fill-secondary` on the chat and bell icons. Both are dead for the same
 *    reason: those elements are `<div>`s carrying a background-image sprite, so `fill` does
 *    nothing, and `.color_icon_img` pins them to 32px from an unlayered rule that outranks a
 *    `size-` utility. 32px at `scale-[80%]` is 25.6px, which is what "26px" was written to
 *    match. Kept, and harmless: our Tailwind generates the class, and it loses the same way.
 *  - `header-nav-item` on each dropdown row. Not in any stylesheet either, saved or fetched.
 *
 * THE PRIVATE-CHAT BUTTON IS NOT RENDERED, and that is a reading of the capture rather than a
 * choice. The chunk puts it behind a lazily-loaded gate (`Ih`, `index-CUBJDfzw.js`) and the
 * divider beside it carries `first:left-10` — a `:first-child` variant, so the divider sits at
 * 40px only when nothing precedes it and at `left-20` (80px) when the chat button does. The
 * capture has the divider at 40px inside an 80px group. Both measurements say the same thing.
 */

/* `Badge` with `type: "dot"` — `hh` in index-BsFv7ByC.js falls through to
   `<div class="h-2 z-50 w-2 -translate-y-1/2 rounded-full bg-brand {class}">`. Brand green and
   8px, NOT the red a notification dot is usually drawn as; the count never shows in dot mode. */
const Dot = ({ className }) => (
  <div className={`h-2 w-2 -translate-y-1/2 rounded-full bg-brand z-50 ${className}`} />
);

/* The bell's unread count: read on mount, every 30 s, when the tab regains focus and when the
   drawer marks something read. A failed read keeps the last count. */
const useUnreadNotices = () => {
  const [unread, setUnread] = React.useState(0);
  React.useEffect(() => {
    const load = () => getUnreadCount().then(setUnread, () => {});
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener('focus', load);
    window.addEventListener(NOTICES_CHANGED, load);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', load);
      window.removeEventListener(NOTICES_CHANGED, load);
    };
  }, []);
  return unread;
};

/* The gift — `we`, the default export of `notification-shell-BOaO8MP0.js` (off `hash.game/assets/`,
 * not in the mirror). It serves BOTH headers, since the desktop tree and `Cs` each render it inside
 * a Button that carries no handler of its own; the click lives here, on an `absolute inset-0` div
 * that fills that button and doubles as the dropdown's trigger ref.
 *
 * **THE GIFT NAVIGATES TO `/bonus` RATHER THAN OPENING THE PANEL WHENEVER NOTHING IS CLAIMABLE, so
 * that is the original's own arm and not a departure:**
 *
 *   o.$$click = n => (n.stopPropagation(),
 *                     O.emit("track", {event: "notify_click", data: {is_unread: u() > 0}}),
 *                     u() === 0 ? e("/bonus") : w(f => !f))     // e = useNavigate
 *
 * `u` is the claimable count over the same `/activity/bonus/v2/` payload the Bonus page reads —
 * note it is its OWN reduce and not the payload's `unclaimedCount`, which only the panel's Claim
 * All button consults:
 *
 *   u = createMemo(() => Object.values(p().rewards).flat()
 *                          .reduce((o, n) => (o += n.canClaim ? n.items.length : 0, o), 0))
 *
 * Every entry in this build's payload is the service's own `initialValue` — `canClaim: false` over
 * empty `items` — so the count is 0, the navigation is what a click does, and the panel is
 * unreachable. Reading the feed rather than hardcoding that zero is what keeps both the branch and
 * the dot honest the day a claimable fixture exists, and it is the arrangement `FreePlayDot` has
 * with the Free Plays dialog: one feed, so a badge and the thing it counts cannot disagree.
 *
 * Two consequences of reproducing the structure as written. The dot slot renders nothing, which was
 * already right and is now right for a known reason. And the hit target is the div rather than the
 * `<button>`, so a keyboard activation of the button does not reach it — true of the live site too,
 * since the handler is on the same descendant there.
 *
 * ── THE PANEL IS BUILT NOW, AND THE OTHER ARM OF THE CLICK WITH IT ───────────────────────────
 *
 * `yt` is `BonusPanel.jsx`; what stays here is the shell's own three jobs, each of which the
 * chunk does by hand rather than leaving to the Dropdown it renders:
 *
 *   · OUTSIDE-CLICK CLOSING IS THE SHELL'S, and it is a CAPTURE-phase listener on `document`
 *     that closes for any click in neither the trigger nor the layer. The layer is handed
 *     `setVisible: () => {}` — a deliberate no-op — so the popover cannot close itself; the one
 *     listener owns it. Capture rather than bubble because a row inside the layer stops
 *     propagation, and a bubble listener would then never see the clicks it is meant to ignore.
 *   · `lock-scroll` on `<body>` while the panel is open, on a phone only, and removed on unmount
 *     as well as on close — the chunk registers both.
 *   · the layer's own geometry: full-screen-width under `sm` and a 26rem card above it, 21rem
 *     tall at most, 16px from the trigger on a phone and 30px on a desktop.
 *
 * Not built: the `track` emit (`O.emit("track", {event: "notify_click", …})` — this build has no
 * event bus), and the claimable-item detail flow a row opens.
 */
const BonusNotifications = () => {
  const navigate = useNavigate();
  const { data: rewards } = useResource(getRewards);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef(null);
  const layerRef = React.useRef(null);
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const claimable = Object.values(rewards?.rewards ?? {})
    .flat()
    .reduce((total, entry) => total + (entry.canClaim ? (entry.items?.length ?? 0) : 0), 0);

  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    if (!open) return undefined;
    const onDocumentClick = (event) => {
      const trigger = triggerRef.current;
      const layer = layerRef.current;
      if (trigger?.contains(event.target) || layer?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [open]);

  /* `v.mobile && j(...)` plus an unconditional `L(...)` cleanup: the class is only ever added on
     a phone, and removed on unmount whichever width the panel was opened at. */
  React.useEffect(() => {
    if (isDesktop) return undefined;
    document.body.classList.toggle('lock-scroll', open);
    return () => document.body.classList.remove('lock-scroll');
  }, [open, isDesktop]);

  return (
    <div
      ref={triggerRef}
      className="absolute inset-0 flex items-center justify-center"
      onClick={(event) => {
        event.stopPropagation();
        if (claimable === 0) navigate('/bonus');
        else setOpen((was) => !was);
      }}
    >
      {claimable > 0 && <Dot className="absolute right-0 top-1" />}
      {open && (
        <BonusLayer ref={layerRef} trigger={triggerRef} isDesktop={isDesktop}>
          <BonusPanel rewards={rewards} onClose={close} />
        </BonusLayer>
      )}
      {/* The icon is the chunk's Suspense fallback, which is what the live site paints until the
          panel's chunk arrives — so it is the right glyph either way, not a stand-in. `text-*` and
          not `fill-*`, unlike its two sprite neighbours: this one really is an SVG and its path
          inherits `currentColor`. `text-primary dark:text-secondary` is the chunk's own pair and
          both arms are written now — the light theme's `--primary` is #070F0B, so dropping the
          light half would have left a mid-grey glyph where the original has near-black. */}
      <IconGift className="size-6 fill-current text-primary dark:text-secondary" />
    </div>
  );
};

/* ------------------------------------------------------------------------------------------ */
/* The wallet pill — `Qe`, the default export of index-C2VSp-Vh.js, which serves BOTH headers.  */
/* ------------------------------------------------------------------------------------------ */

/* Every number here is the chunk's, and the capture agrees with all of them at dpr 1.25: the
 * pill measures 264px (`sm:w-[16.5rem]`) by 40px (`h-10`), the coin 24px (`size-6`) with 4px
 * either side (`mx-1`), and the Deposit button 65.6px — which is `.button`'s own 8px of padding
 * around "Deposit" at 14px extrabold.
 *
 * `border-third bg-alw_white dark:bg-layer3` vs `border-input bg-layer3` is the chunk's own
 * `z.mobile` pair. `z.mobile` is a DEVICE test on the original and cannot be written as a media
 * query, so it is read as the 640 line here — the same call the VIP banner and the referral hero
 * make, and for the same reason: the width the pill changes at (`w-52` -> `sm:w-[16.5rem]`) is
 * `sm:` too, so the border has to move with it or the two disagree between 640 and the tablet.
 *
 * ONLY THE DARK ARM OF THAT PAIR IS WRITTEN. This build has no `.dark` class and no
 * `@custom-variant`, so a `dark:` utility resolves to `prefers-color-scheme` — which would hand
 * a light-OS visitor `bg-alw_white`, a white pill on a dark page. The project is dark-only
 * (there is no theme switch), so the light half is recorded in the comment and the dark value
 * used directly. Same call the VIP page's banner makes with `r[+S.mobile<<1 | +!W.darken]`,
 * where only the even entries are reachable.
 *
 * The Deposit button collapses to a bare `+` below that line, which is the chunk's
 * `Show when={hideAmount || !mobile} fallback={<IconAdd class="size-4"/>}`.
 */
function Wallet({ mobile = false }) {
  const { session, balances } = useSession();
  const depositOn = useGates().on('deposit');
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  /* The Manage Assets sheet is opened FROM the dropdown and outlives it — the `+` closes the
     layer and pushes the sheet in the same click — so its state has to sit out here rather than
     inside CurrencySelect, which is unmounted by then. */
  const [manageOpen, setManageOpen] = React.useState(false);
  const pillRef = React.useRef(null);
  const close = React.useCallback(() => setOpen(false), []);
  const closeManage = React.useCallback(() => setManageOpen(false), []);
  const openManage = React.useCallback(() => setManageOpen(true), []);

  const current =
    balances.find((b) => b.currencyName === session.setting.currencyName) || balances[0];

  /* `printCurrency(De(current.generalAmount), current.currencyName)` — `De` is
     `e.isNegative() ? new Big(0) : e`, a floor at zero, so a negative balance prints as 0. */
  const amount = printCurrency(Math.max(0, Number(current.generalAmount)), current.currencyName, {
    settings: session.setting,
    // 2 places for USDT, as the wallet and the game print it (31.57, not 31.5765).
    decimals: coinDecimals(current.currencyName),
  }).replace('₹', 'INR '); // owner asked for the code, not the rupee sign, in the header pill
  /* While the signed-in wallet is still loading the session holds the captured VISITOR row, a
     BCD (BC.GAME's own token) placeholder this platform never issues — so the pill drew
     "0 BCD" for a moment on every cold load. Until a real row lands, draw a placeholder. */
  const walletLoading = !current || current.currencyName === 'BCD';

  return (
    /* The dropdown is a SIBLING of the pill rather than a child of it, and that is a React
       constraint rather than a preference: it portals itself to <body>, but a portal still
       bubbles its events through the REACT tree, so mounted inside the pill every click on a
       coin row would also reach the pill's own toggle below and reopen what it just closed. */
    <>
      {/* THE WHOLE PILL IS THE TRIGGER, not the coin or the chevron — `Qe` passes this div as
          the popover's children, so a click anywhere in it opens the currency picker and the
          Deposit button has to `stopPropagation` to stay a Deposit button. That is the
          original's own arrangement, `<div onClick>` included; it is not turned into a <button>
          here because it already contains one. */}
      <div
        ref={pillRef}
        /* THE CHUNK'S TWO ARMS COINCIDE AND ONE CLASS IS WRITTEN FOR BOTH, which is worth
           stating rather than leaving as an apparent transcription slip. It writes
           `border-third bg-alw_white dark:bg-layer3` on the mobile side against
           `border-input bg-layer3` on the desktop one — but `--alw_white` and `--layer3` are the
           SAME colour in the light theme (both 255 255 255) and `dark:bg-layer3` is the same as
           `bg-layer3` in the dark one, so the fill is identical on both arms in both themes and
           only the BORDER actually branches. Checked against the palette rather than assumed. */
        className={`relative flex h-10 w-52 rounded-lg border-2 bg-layer3 p-0.5 sm:w-[16.5rem] ${
          mobile ? 'border-third' : 'border-input'
        }`}
        onClick={() => setOpen((value) => !value)}
      >
        <div className="mr-1 flex flex-auto cursor-pointer select-none items-center">
          {walletLoading ? (
            <span className="mx-1 flex size-6 flex-none animate-pulse rounded-full bg-layer5" aria-hidden="true" />
          ) : (
            <img className="mx-1 flex size-6 flex-none" alt="" src={coinIcon(current.currencyName)} />
          )}
          {/* `w-0 flex-auto truncate` rather than a max-width: the pill is fixed, so the amount
              gets whatever is left after the coin, the chevron and the Deposit button and
              ellipsises inside it. */}
          <div className="flex w-0 flex-auto items-center truncate font-extrabold">
            {walletLoading ? (
              <span className="h-4 w-20 animate-pulse rounded bg-layer5" aria-label="Loading balance" />
            ) : (
              <span>{amount}</span>
            )}
          </div>
          {/* The site's one chevron, a left-pointing `<` that every call site rotates.
              `-rotate-90` points it down. */}
          <IconArrow className="size-5 -rotate-90 fill-secondary" />
        </div>

        {/* `not-full` is the same dead class the referral page's Send Now button carries.
            Not drawn for an account with no deposit rail (an agent's player) — services/gates.js. */}
        {depositOn && (
        <button
          type="button"
          className="button button-brand not-full ml-auto h-8 flex-none rounded-md !bg-brand bg-none shadow-none"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
            navigate('/deposit');
          }}
        >
          {mobile ? <IconAdd className="size-4 fill-current" /> : 'Deposit'}
        </button>
        )}
      </div>

      <CurrencySelect
        triggerRef={pillRef}
        open={open}
        onClose={close}
        onManageAssets={openManage}
      />
      <ManageAssets open={manageOpen} onClose={closeManage} />
    </>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The avatar and its dropdown — `$1`.                                                          */
/* ------------------------------------------------------------------------------------------ */

/* THE PANEL'S HEIGHT IS COMPUTED, NOT LAID OUT: `(items.length + 1) * 44 + 8`, written straight
 * onto the class list as `h-[NNNpx]`. 44 is the row (`h-11`), 8 is the panel's `p-2`, and the
 * `+ 1` is the row the original appends after the list — `DialogDisturbSetting`, the federated
 * Do Not Disturb switch, which is now built (see DisturbSetting.jsx). Thirteen menu rows plus it
 * is 624, which is exactly the `h-[624px]` the rendered DOM carries. The arithmetic is the
 * chunk's own, so the `+ 1` stays a `+ 1` rather than becoming part of `rows.length`.
 *
 * `fadeUp2` is the transition it opens with: `{opacity: 0, y: 16} -> {opacity: 1, y: 0}` over
 * `{duration: .3, ease: "power2.out"}`, both read out of index-BsFv7ByC.js. It is in
 * AfterLogin.css because a keyframe cannot be written as a utility.
 *
 * `frameClass` / the VIP avatar frame is NOT drawn. `sE` in index-BsFv7ByC.js wraps the image in
 * a federated `Frame` whose type comes from `userAvatarFrameList`, and the account fixture's list
 * is empty — `t.id || -1` resolves to -1, which is the original's own "no frame". The purple ring
 * in the capture is not that: it sampled `#8100F8` at the image's own edge, inside `p-[3px]`,
 * and it is part of the avatar PNG. `105522617.png` is that exact avatar, already in this repo
 * from the weekly-raffle winner list, where it is the most common bc.game default.
 */
function AccountMenu() {
  const { session, signOut } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  /* `W(() => p, () => n(!1))` — the chunk's click-outside, which closes on any click that did
     not land inside the button. Capture phase, as the notification shell's own version is, so a
     child that stops propagation cannot leave the panel stuck open. */
  React.useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick, true);
    return () => document.removeEventListener('click', onDocClick, true);
  }, [open]);

  /* The original's own `.filter(t => !!t)` over deployment flags, here over the site's and the
     account's gates (services/gates.js): an agent's player loses Withdraw, Buy Crypto, VIP Club,
     Vault Pro and Referral. Every row stays with fixtures. */
  const { routeOn, demo } = useGates();
  const rows = ACCOUNT_MENU.filter(
    (row) => (!row.link || routeOn(row.link)) && (FREE_PLAYS_ENABLED || row.link !== '/free-plays') && Boolean(row.demoOnly) === demo,
  );
  /* `+ 1` is the Do Not Disturb row; with it hidden (config/hiddenFeatures) the panel is one row shorter. */
  const panelHeight = (rows.length + (DO_NOT_DISTURB_ENABLED ? 1 : 0)) * 44 + 8;

  /* CALLED HERE AND NOT IN THE ROW, deliberately — the panel below is conditional and this
     component is not, and the confirm dialog has to outlive the panel. The whole reason is at
     the top of ConfirmDialog.jsx; the short version is that clicking the dialog satisfies the
     click-outside above, so the dropdown closes underneath it. */
  const [confirm, confirmDialog] = useConfirm();

  const go = (row) => {
    if (row.label === 'Log Out') signOut();
    /* `d.link === "refer" ? emit("open-refer") : d.link ? navigate(d.link) : push(<PopSignout/>)`.
       No row carries `refer` today; the branch is the chunk's and is kept so the value has
       somewhere to go if one ever does. */
    else if (row.link === 'refer') { /* opens the refer dialog on the original */ }
    else if (row.link) navigate(row.link.replace(':userId', String(session.userId)));
    /* `setTimeout(() => n(!1), 100)` — the original lets the row's own press state paint. */
    setTimeout(() => setOpen(false), 100);
  };

  return (
    <div className="relative ml-3 flex-none" ref={ref}>
      <button
        type="button"
        className="button relative h-11 w-11 rounded-full bg-layer5 p-[3px]"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
      >
        <img className="size-full rounded-full" alt="avatar" src={avatarSrc(session?.avatar)} />
      </button>

      {open && (
        <div className="after-login-fade-up absolute end-0 top-full z-[112] pt-2">
          <div
            className="w-60 rounded-lg bg-layer3 p-2 text-secondary"
            style={{ boxShadow: '0px 4px 24px 0px rgba(0, 0, 0, 0.20)', height: `${panelHeight}px` }}
          >
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.label}
                  type="button"
                  /* `button-m` is the Button's own, not the call site's: `ot` builds
                     `Y("button", zx[type], s() && \`button-${s()}\`, t.class)` with
                     `s = size || !mobile && "m"`, so every trigger on a desktop carries it —
                     which is what the rendered DOM shows on all fourteen rows. Both of its
                     declarations are overruled here — `h-11` beats its 2.5rem, and its
                     `--radius-lg` never shows because no row paints a background — but it is
                     in the markup, so it is written. */
                  className="button button-m header-nav-item relative h-11 w-full justify-start hover:text-primary"
                  onClick={() => go(row)}
                >
                  {/* `icon` is the chunk's own icon wrapper prepending it (`d` in
                      Wrap-DblNcHvH.js: ``class={`icon${e.class?" "+e.class:""}`}``), and the
                      rendered DOM has it on all fourteen rows. It changes nothing — `.icon` is
                      layered, so `size-6` and `fill-secondary` both beat its 2rem and its
                      `currentColor` — but it is in the markup, so it is written. */}
                  <Icon className="icon size-6 flex-none fill-secondary" />
                  <span className="ms-2 overflow-hidden whitespace-nowrap font-semibold">
                    {row.label}
                  </span>
                  {/* `FreePlayDot` — a lazily loaded unread counter with no feed behind it here.
                      The span the original portals it into is kept so the slot is visible in the
                      markup rather than only in a comment. */}
                  {row.dot && <span className="absolute end-1 top-1/2 z-200" />}
                </button>
              );
            })}

            {/* `<For each={items}>` then the disturb row, in that order — the `+ 1` above. */}
            {DO_NOT_DISTURB_ENABLED && <DisturbSetting confirm={confirm} />}
          </div>
        </div>
      )}

      {confirmDialog}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */

/* The chat and bell icons are the COLOURED SPRITE, not SVGs — `Dh` and `un` in Enter both test
   `when: !1` and fall through to `<Icon name="chat" | "notice" select={false} />`, which renders
   `<div class="color_icon_img scale-[80%] ...">`. `.color_icon_img.notice` is
   `background-position: -192px -96px` in Enter-uT7xMZD7.css and is added to index.css beside the
   `.chat` rule that was already there. */
const SpriteIcon = ({ name }) => (
  <div className={`color_icon_img scale-[80%] size-[26px] fill-secondary ${name}`} />
);

/* `onToggleChat` opens the GLOBAL CHAT drawer — `setRight("chat")` on the original, and the same
   signal `onToggleNotice` moves. Both branches of the header carry a chat button and both are
   wired, which is the original's arrangement: `Se` hands its logged-out arm the identical setter,
   so the room is readable without an account. See components/Chat and components/RightDrawer. */
/* THIS BUILD'S — the sign that this is a demo account (Demo button; user, 2026-10-27). */
const DemoBadge = ({ className = '' }) => (
  <span className={`flex-none rounded-md bg-warning px-2 py-1 text-xs font-extrabold leading-none text-black ${className}`} title="Demo account: play money, sports only">
    DEMO
  </span>
);

export default function AfterLogin({ onToggleChat, onToggleNotice }) {
  /* The gift is the bonus section's door: gone when the site or the account has no bonus. */
  const { on, demo } = useGates();
  const bonusOn = on('bonus');
  const unread = useUnreadNotices();
  return (
    <div className="ml-3 flex items-center">
      {demo && <DemoBadge className="mr-3" />}
      <Wallet />

      {bonusOn && (
      <div className="button center relative ml-3 h-auto rounded-lg bg-layer5 p-0 text-secondary">
        {/* No handler on the Button — `insert(n, Button(class="center relative size-10 p-0",
            Suspense(BonusNotifications)))`. The click is inside; see BonusNotifications above. */}
        <button type="button" className="button center relative size-10 p-0" aria-label="Bonuses">
          <BonusNotifications />
        </button>
      </div>
      )}

      {/* `w-30` IS DROPPED, and it is the one class on this page that could not be kept.
          Tailwind v3 — which the original is on — has no `w-30` in its width scale, so the class
          resolves to nothing there and the group is sized by its content: 80px, which is what
          the capture measures. Tailwind v4 generates the whole spacing scale on demand, so
          writing it here emits `width: calc(var(--spacing) * 30)` = 120px and the group renders
          40px too wide with an empty slot. Every other dead class in this file is harmless and
          is kept verbatim; this one is not. The chunk's own line, for the record:
            clsx("button relative ml-3 flex h-10 flex-none rounded-lg bg-layer5 p-0",
                 isOfflineAgent ? "w-10" : "w-30") */}
      {/* A demo account gets no notifications (user, 2026-10-27), so no bell. */}
      {!demo && (
      <div className="button relative ml-3 flex h-10 flex-none rounded-lg bg-layer5 p-0">
        {/* First child, so `first:left-10` wins over `left-20` and the rule sits at 40px. */}
        {/* No chat on this platform (services/availability.js): the group drops to the bell
            alone — the original's own one-button arm, the `w-10` its chunk line names. */}
        {CHAT_AVAILABLE && (
          <>
            <div className="absolute left-20 top-2 h-6 w-[1px] bg-third first:left-10" />
            <button
              type="button"
              className="button size-10 p-0"
              onClick={onToggleChat}
              aria-label="Live chat"
            >
              <SpriteIcon name="chat" />
            </button>
          </>
        )}
        {/* `onClick: () => t.setRight("notice")` — the desktop bell does NOT navigate; it names
            which of the three right-hand drawers the layout should show. `onToggleNotice` is that
            setter here. Its mobile twin below really does navigate, to `/notification`, which is
            a dialog route on the original and falls to the catch-all in this build. */}
        <button
          type="button"
          className="button relative size-10 p-0"
          onClick={onToggleNotice}
          aria-label="Notifications"
        >
          <SpriteIcon name="notice" />
          {/* The original draws `<Dot/>` off `session.redDot.systemNotice`; here it is the live unread count. */}
          {unread > 0 && <Dot className="absolute right-0 top-1" />}
        </button>
      </div>
      )}

      <AccountMenu />
    </div>
  );
}

/* ------------------------------------------------------------------------------------------ */
/* The mobile/tablet header's signed-in tree — `Cs` in Enter-MsmOuq5R.js, the other arm of the   */
/* `Show when={b.login}` that `ks()` wraps `.page-header` in.                                    */
/* ------------------------------------------------------------------------------------------ */

/* It is NOT the desktop tree at a smaller size. The whole bar is
 * `flex size-full items-center justify-between px-3`, the logo swaps to the square
 * `logo_small.png` at `h-9 w-9` (which is why that file has been sitting unused in `assets/`),
 * and the chat button is gone — its slot on mobile is the notification bell, which NAVIGATES to
 * `/notification` rather than opening a side panel.
 *
 * The bell and the gift share one rounded box here (`f` in the chunk, classed
 * `center relative bg-alw_white text-secondary dark:bg-white_alpha5 rounded-lg`) and the avatar
 * is `bg-black_alpha5 p-1` rather than `bg-layer5 p-[3px]`, and goes to `/user/enter` instead of
 * opening the dropdown — there is no dropdown on mobile.
 */
export function MobileAfterLogin() {
  const unread = useUnreadNotices();
  const navigate = useNavigate();
  const { session } = useSession();
  const { on, demo } = useGates();
  const bonusOn = on('bonus');
  /* The owner panel's square mark (live mode) at h-10, the wallet pill's height; else the original at h-9. */
  const { darken } = useSettings();
  const mark = useSiteMark({ light: !darken });

  return (
    <div className="flex size-full items-center justify-between px-3">
      <Link to="/" className="flex-none text-[0]">
        <img alt={(mark && siteName()) || 'logo'} className={mark ? 'h-10 w-10 object-contain' : 'h-9 w-9'} src={mark ?? logoSmall} />
      </Link>

      <div className="flex items-center gap-2">
        {demo && <DemoBadge />}
        <Wallet mobile />

        {/* `bg-alw_white dark:bg-white_alpha5` on both boxes, and unlike the pill above these
            two arms genuinely differ: `--white_alpha5` is a 5% WHITE wash in the dark theme and a
            6% dark grey (#3036370f) in the light one, so writing only the dark half would have
            given a faint grey square where the original has a solid white one.

            The gift is the same component the desktop tree renders — `Cs` inserts the identical
            `Suspense(BonusNotifications)` into a Button with no handler, so a click here navigates
            to `/bonus` for exactly the same reason. */}
        {bonusOn && (
        <button
          type="button"
          className="button center relative size-10 bg-alw_white p-0 dark:bg-white_alpha5"
          aria-label="Bonuses"
        >
          <BonusNotifications />
        </button>
        )}

        {!demo && (
        <div className="center relative rounded-lg bg-alw_white text-secondary dark:bg-white_alpha5">
          <button
            type="button"
            className="button relative size-10 p-0"
            onClick={() => navigate('/notification')}
            aria-label="Notifications"
          >
            <SpriteIcon name="notice" />
            {unread > 0 && <Dot className="absolute right-1 top-1.5" />}
          </button>
        </div>
        )}

        <button
          type="button"
          className="button relative h-11 w-11 rounded-full bg-black_alpha5 p-1"
          onClick={() => navigate('/user/enter')}
          aria-label="Account"
        >
          <img className="size-full rounded-full" alt="avatar" src={avatarSrc(session?.avatar)} />
        </button>
      </div>
    </div>
  );
}
