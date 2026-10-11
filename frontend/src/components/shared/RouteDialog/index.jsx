import React from 'react';
import { createPortal } from 'react-dom';
import useDialogScrollLock from '../../../hooks/useDialogScrollLock';
import { IconArrow } from '../../../layouts/MainLayout/Header/AfterLogin/icons';
import { IconClose } from '../icons';
import '../DialogShell/DialogShell.css';
import './RouteDialog.css';
import { useIsDesktop } from '../../../hooks/useMediaQuery';

/* The full-screen arm of the router's dialog shell — what `info.dialog` renders as on a phone.
 *
 * EXTRACTED UNDER THE SECOND-CALL-SITE RULE that `Select`, `GameTile`, `PageCard` and `Notice`
 * moved under. `/user/enter` was the first route to need it; `/wallet/withdraw` is the second,
 * and every other `/wallet/*` pane is a third the day its `info.dialog = m.mobile` is honoured.
 * The `/deposit` dialog predates it and still writes its own shell — it should move here, but it
 * renders a DESKTOP card as well and that arm is not modelled below, so the two are left apart
 * until desktop is in scope.
 *
 * THE TITLE BAR'S CONTENTS BRANCH ON DEVICE, NOT JUST ITS STYLE. `FS` in index-BsFv7ByC.js:
 *
 *   const c = L(() => !ho() && !ee.mobile),                  // desktop
 *         l = L(() => ho() ? !ee.app.isTgWebapp : !(c() && r.index() === 1))
 *   <Show when={l()}><Button class="dialog-back !p-0"><Arrow/></Button></Show>
 *   ... <Show when={c()}><Button class="dialog-close !p-0"><Close/></Button></Show>
 *
 * so a phone gets a BACK ARROW on the left and no close square at all, while a desktop gets the
 * cross and only shows the arrow when it is not the first dialog on the stack.
 *
 * BOTH ARMS ARE DRAWN NOW. Only the phone one was, under a note saying it was "the only arm these
 * two routes can reach — both are guarded to mobile", which was true of `/user/enter` and
 * `/wallet/withdraw` and stopped being true the moment a `dialog: !0` route used this shell:
 * `/user-action/:action` and the whitelist's add/edit pair are dialogs at EVERY width, so on a
 * desktop they were drawing a phone's back arrow and no cross at all.
 *
 * `enter === 'open'` IS `r.index() === 1`. `App.jsx` sets `open` exactly when `prev === 0`, i.e.
 * no dialog was on the stack before this one — the same signal it already reads to decide that a
 * desktop's first dialog does not slide. So there is no second prop to thread through fifteen
 * call sites; the one that is already there says it.
 *
 * `appbar` is the class the manager adds on a phone. It is what would normally size the arrow at
 * 2rem; see the note in RouteDialog.css for why this build takes the smaller pair instead.
 */
export default function RouteDialog({
  title,
  label,
  /* `info.dialog.behavior === "transparent-title"` — the bar floats over the content and fades
     its own background in as you scroll, instead of sitting above it opaquely. */
  transparent = false,
  /* `info.dialog.behavior === "no-title"` — the bar is not rendered AT ALL, and the page supplies
     its own chrome instead. The manager writes both halves of that in one line:

       I(x, !y && C(FS, {...}))                                  // y === behavior "no-title"
       Y("dialog-item", (v || y) && "dialog-transparent-title", y && "dialog-no-title", ...)

     so a no-title dialog is ALSO a transparent-title one — which is what zeroes the content's
     horizontal padding, since a page drawing its own bar draws its own gutters too. `/bonus`
     below lg is the first consumer: its back arrow lives inside the page's own sticky tab strip
     (see pages/Bonus), which is exactly why there is no bar for it to sit in. */
  noTitle = false,
  /* A PAGE ROUTE BEING SHOWN AS A DIALOG, rather than a dialog with a page inside it — the
     `info.dialog = m.mobile` case, where the SAME component is a page on a desktop and a
     full-screen dialog on a phone. The difference is only the gutter: every such page already
     carries the original's own `px-4 sm:px-0` on its root, because below 640 the layout column
     has none and each page supplies its own. Inside the shell that lands on top of
     `.dialog-content`'s own `padding-inline: 1rem` and the page renders at a 32px inset. This
     zeroes the shell's half and lets the page's own gutter be the whole of it, so the component
     is inset identically in both of its two homes and neither arm has to know about the other. */
  pageGutter = false,
  /* `info.dialog.actions` — the manager's own slot at the END of the title bar, opposite the back
     arrow. `FS` renders `t.dialogProps().actions`, and a page fills it the way the promotions one
     does: `actions: [{ icon: Ne, label: b("Archived"), onClick: ae }]` in `index-CMExrEqM.js`.
     An array of `{ icon, label, onClick }`; `icon` is a component, `label` is its accessible name
     and is not printed. Empty by default, which is every other dialog here. */
  actions = [],
  /* PLAY THE ENTER BACKWARDS ON THE WAY OUT, THEN close. Off by default and opt-in per route.
     ------------------------------------------------------------------------------------
     A dialog here is mounted by `App` off the pathname, so the instant a close handler navigates,
     the component is gone and there is nothing left to animate — which is why every dialog in
     this build has an enter and no exit, and why the note in DialogShell.css says the outgoing
     half needs the original's stack. The way round it is to own the ORDER: the close handler is
     wrapped, the panel and scrim run the reverse keyframes, and only when they finish does the
     real `onClose` fire and the route change. So the animation happens while the dialog is still
     legitimately mounted and no stack is needed.

     Opt-in because it delays a navigation by 300ms, which is a behaviour change for a route, not
     a decoration. `/notification` is the first to ask for it. */
  animateExit = false,
  /* `info.titleColor` — the title bar's fill, as an `R G B` TRIPLE (it is fed to `rgb()` with a
     scroll-driven alpha, so a hex cannot be used). The manager writes it as `--bg` and the bar
     reads it; defaults to layer4, which is what every route that names no colour gets. */
  titleColor,
  className = '',
  onClose,
  /* THE ARROW POPS ONE LEVEL; IT DOES NOT CLOSE THE STACK. `o()` in `FS` is
     `Bd(navigate, stacks.list[index() - 1], 1, navDepth())` — a jump of exactly 1 — against
     `_3()`'s jump by the whole depth, which is what the CROSS does. The two are different
     handlers on the original and have to be here too, or a dialog opened over another dialog
     dismisses both. Defaults to `onClose` so a single-level call site can pass one prop. */
  onBack,
  /* Which of the manager's enter animations to run. The keyframes are in `DialogShell.css` and
     are imported above rather than copied: `DialogShell` is the DESKTOP arm of this same shell,
     both are `FS`, and the motion belongs to the router's dialog manager rather than to either
     arm. See App.jsx for why the mode is handed down rather than derived here.
     `open` is the default so a call site that does not thread it still animates. */
  enter = 'open',
  children,
}) {
  useDialogScrollLock(true);

  /* `ee.mobile` in the manager. Only the slide branch reads it: a desktop opening its first
     dialog is the one transition that does not slide. */
  const isDesktop = useIsDesktop();

  const overlayerRef = React.useRef(null);

  /* `--scroll` IS WHAT FADES A TRANSPARENT BAR IN, and the manager writes it onto
     `.dialog-overlayer` as a percentage: `"--scroll": `${_()}%`` with `_()` = `100 * scrollTop /
     innerHeight`. The arithmetic that turns it into an alpha is in the stylesheet. `_()` starts
     at 100 and is only ever recomputed for a transparent bar, so an ordinary dialog leaves the
     CSS fallback in place and paints opaque from the first frame.

     Written onto the NODE rather than held in state, for the reason the promotions tab indicator,
     the hero dots and the referral ticker are: a value that changes on every scroll frame has no
     business re-rendering the tree under it. */
  const onScroll = React.useCallback((event) => {
    const node = overlayerRef.current;
    if (!node) return;
    node.style.setProperty(
      '--scroll',
      `${(100 * event.currentTarget.scrollTop) / window.innerHeight}%`,
    );
  }, []);

  /* One flag, read by three places: the panel's class, the scrim's, and the guard that stops a
     second click restarting the tween. A ref alongside it so the timer can be cleared without
     making the timeout depend on the render. */
  const [leaving, setLeaving] = React.useState(false);
  const leaveTimer = React.useRef(0);
  React.useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const runClose = React.useCallback(
    (handler) => {
      if (!animateExit) {
        handler();
        return;
      }
      if (leaveTimer.current) return;
      setLeaving(true);
      /* Matches `dialog-slide-out`'s own 0.3s. A timer rather than `animationend` because the
         reduced-motion arm shortens the animation to 0.01ms and a listener attached after that
         has already fired would never resolve. */
      leaveTimer.current = window.setTimeout(handler, 300);
    },
    [animateExit],
  );

  const close = React.useCallback(() => runClose(onClose), [runClose, onClose]);
  const back = React.useCallback(() => runClose(onBack || onClose), [runClose, onBack, onClose]);

  /* Escape closes, as on every dialog route here. The router pops the history entry itself on
     the original. It goes through `close` rather than `onClose` so the keyboard route out plays
     the same exit as the arrow — otherwise a dialog would slide away when dismissed one way and
     vanish the other. Declared after `close` for that reason; it used to sit above the render. */
  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [close]);

  return createPortal(
    /* `.dialog-*` is the site's own shell and lives in Auth.css only because the auth dialog was
       the first thing here to need it. Below lg it is a full-screen sheet with no scrim, which is
       the only arm either consumer can reach. */
    /* `N()` — THE SCRIM AND CARD PASS, and RouteDialog never ran it. Only the auth dialog applied
       `dialog-scrim-in` / `dialog-card-in`, so every OTHER dialog route opened from a page had no
       scrim fade and no card scale and was left with the slide alone. That is the whole of why
       these read as sliding in where the original's grow: the manager runs `N()` whenever the
       route type changes BASE <-> DIALOG (`if (W === H) return`, i.e. only on a type change) and
       `BS`'s slide separately, and this shell had half of it.

       Gated on `isDesktop` for the reason the auth dialog gates its own pair: the scrim exists
       only from lg up, and below it a dialog is a full-screen sheet that slides and does nothing
       else. `enter === 'open'` is the type change — `push` and `pop` are dialog -> dialog, where
       the original explicitly leaves the scrim lit and the card still. */
    <div
      className={`dialog-root dialog-visible${leaving ? ' dialog-scrim-out' : ''}${
        !leaving && isDesktop && enter === 'open' ? ' dialog-scrim-in' : ''
      }`}
    >
      <div
        className={`dialog-list route-dialog ${className}${
          !leaving && isDesktop && enter === 'open' ? ' dialog-card-in' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={label || title || 'Dialog'}
      >
        {/* `.dialog-item` NESTS INSIDE `.dialog-overlayer`; they are not siblings. The overlayer
            is the opaque layer2 fill and carries `z-index: 1000` against the item's `0`, so side
            by side it would paint straight over the content. */}
        {/* A PHONE SLIDES AND DOES NOTHING ELSE, and the two halves of that are decided in
            different places in the manager — which is why the desktop arm animates three things
            and this one animates one.

            `N()` is the scrim-and-card pass, and it reads the device twice:

              const ae = () => ee.mobile,
                    se = [...ae ? [Qu[0], Qu[0]] : Qu],     // scrim: #0000 -> #0000 on mobile
                    be = [...IS];
              const ce = O.animate(H ? se : se.reverse(), de);
              if (!ae) { P.animate(…be…, de) }              // card scale: SKIPPED on mobile

            So the scrim tween is deliberately given two identical keyframes and the 0.92 card
            scale never runs at all. `DialogShell` keeps both because it is the desktop arm; here
            they would be inventions.

            `BS` then decides the slide, and its test is the mirror image:

              x === "POP" && E ? c(S, 2, 1)
                               : (!ee.mobile && !E ? <no slide> : c(S, 0, 1))

            where `E` is "the route we came from was already a dialog". A desktop opening its
            FIRST dialog is the one case that does not slide — everything on a phone does. Hence
            `open` and `push` share a branch below; only a POP differs, and it comes back from
            -17% rather than 100%.

            BOTH SLIDES SIT ON THE OVERLAYER, not on the card, and that placement is what keeps
            them from looking wrong: `.dialog-list` carries `overflow: hidden`, so a translate
            from 100% is clipped to the sheet's own edges instead of sweeping across the page. */}
        <div
          className={`dialog-overlayer ${
            leaving
              ? 'dialog-slide-out'
              : enter === 'pop'
                ? 'dialog-slide-back'
                : enter === 'none'
                  ? ''
                  : /* `!ee.mobile && !E` — A DESKTOP OPENING ITS FIRST DIALOG IS THE ONE CASE
                       WITH NO SLIDE, and this branch used to miss it: `open` and `push` shared
                       the slide, so a dialog opened from a page swept in from the right where the
                       original only scales the card up from 0.92 behind a fading scrim.

                       `E` is "the route we came from was already a dialog", which is exactly what
                       `enter` distinguishes — `open` is `prev === 0`, i.e. from a page. So a
                       desktop `open` returns nothing and lets `dialog-card-in` be the whole
                       animation; everything on a phone still slides, because `ee.mobile` short-
                       circuits the test on the original too. */
                    enter === 'open' && isDesktop
                    ? ''
                    : 'dialog-slide-in'
          }`.trim()}
          ref={overlayerRef}
        >
          <div
            className={`dialog-item${
              transparent || noTitle ? ' dialog-transparent-title' : ''
            }${noTitle ? ' dialog-no-title' : ''}${pageGutter ? ' dialog-page-gutter' : ''}`}
            style={titleColor ? { '--bg': titleColor } : undefined}
          >
            {!noTitle && (
              <div className="dialog-title appbar">
                {/* `l = !(c() && r.index() === 1)` — a desktop hides the arrow on the FIRST dialog
                    of a stack, because there is no dialog behind it to go back to; the cross is
                    what closes it. A phone always shows the arrow, since it has no cross. */}
                {!(isDesktop && enter === 'open') && (
                  <button
                    type="button"
                    aria-label="Back"
                    className="dialog-back center"
                    onClick={back}
                  >
                    <IconArrow />
                  </button>
                )}
                {title}
                {/* `c = !ho() && !ee.mobile` — desktop only. The wrapper is `DialogShell`'s, and
                    it is what centres the cross against the bar's full height: `.dialog-close`
                    carries no position of its own, unlike `.dialog-back` which pins itself. */}
                {isDesktop && (
                  <div className="absolute right-4 top-0 ml-auto flex h-full items-center">
                    <button
                      type="button"
                      aria-label="Close"
                      className="dialog-close center"
                      onClick={close}
                    >
                      <IconClose />
                    </button>
                  </div>
                )}
                {/* `.dialog-action` is the manager's own class and is already in the shared
                    `.dialog-*` family — 2rem around a 1.25rem glyph on a phone, against the
                    back arrow's 1.5/0.875, which is why the two are not one rule. It is
                    absolutely positioned at the bar's end so it does not push the centred
                    title off centre. */}
                {actions.length > 0 && (
                  <div className="dialog-actions">
                    {actions.map(({ icon: Icon, label: actionLabel, onClick }) => (
                      <button
                        key={actionLabel}
                        type="button"
                        aria-label={actionLabel}
                        className="dialog-action center"
                        onClick={onClick}
                      >
                        <Icon />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No `px-4` here: `.dialog-content` carries `padding-inline: 1rem` in the shell
                itself, which is where the original puts it — and a transparent-title dialog
                cancels both sides, since its content draws its own gutters. */}
            <div className="dialog-content scroll-y" onScroll={transparent ? onScroll : undefined}>
              <div className="scroll-container">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
