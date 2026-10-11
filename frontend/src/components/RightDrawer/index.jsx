import React from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from '../shared/icons';
import useMediaQuery from '../../hooks/useMediaQuery';
import NotificationPanel from '../Notification/Panel';
import Chat from '../Chat';
import './RightDrawer.css';

/* The right-hand drawer — ONE container, one close button, one transition, and three panels that
 * swap inside it.
 *
 * `Se` in `Header-CTF5n6al.js`, which IS in the saved mirror. Its shape is the whole of why this
 * component exists rather than each drawer owning its own shell:
 *
 *   <Portal ref={el => el.className = "chat-notice"}>
 *     <div class="right-slide-content relative h-full w-full">
 *       <Button class="absolute end-2 top-3.5 z-[101] size-8 rounded-lg bg-layer5 p-0"
 *               onClick={() => setRight("")}><IconClose/></Button>
 *       <Show when={right() !== ""}>
 *         <Transition name="fadeRight">
 *           <Show when={right() === "notice"}><NoticePanel/></Show>
 *           <Show when={right() === "chat"}><Chat/></Show>
 *           <Show when={right() === "private-chat"}><PrivateChat/></Show>
 *         </Transition>
 *       </Show>
 *     </div>
 *   </Portal>
 *
 * THE SIGNAL IS A STRING NAMING WHICH DRAWER IS OPEN, not a boolean per drawer — `""`, `"notice"`,
 * `"chat"`, `"private-chat"` — and it lives at the LAYOUT ROOT rather than here, which is the
 * original's arrangement: `ia` in `Enter-MsmOuq5R.js` creates it beside the sidebar's fold state
 * and hands the setter to the header. Three things hang off it there and two are the layout's
 * business (opening folds the sidebar under 1280; a resize closes it at 1024 and under), so
 * `MainLayout` owns it here too. This build had it as a boolean while `notice` was the only arm
 * built, with a note to widen it the day the chat landed; this is that day.
 *
 * TWO OF THE THREE ARE BUILT. `private-chat` is bc.game's TypeX private-messages panel
 * (`ChatTypeXSide-DUoEr9uF.js`), a third-party SDK behind an authenticated handshake, and it has
 * no entry point in this build either — the button that opens it is the one the signed-in header
 * documents as deliberately not rendered.
 *
 * THE CLOSE SQUARE IS OUTSIDE THE TRANSITION and is always mounted, because it belongs to
 * `.right-slide-content` and not to any panel — which is why it does not slide in with the
 * content, and why its `z-[101]` has to beat the chat header's `z-100` and the notice panel's
 * sticky tab strip alike. It is invisible when closed for the same reason the panels are: the
 * container is 0 wide with `overflow: hidden` until `<body>` takes `chat-unfold`.
 */

const PANELS = {
  notice: NotificationPanel,
  chat: Chat,
};

export default function RightDrawer({ right, onClose }) {
  /* Mounted while open OR while the exit tween is still running — the same shape
     `components/Explore` uses, and here it is load-bearing rather than a nicety: `fadeRight`'s
     `onExit` runs the enter tween backwards and defers the unmount until it finishes, which IS the
     slide-out. `exiting` is adjusted during render against the previous value, React's own
     "adjusting state when a prop changes" pattern — not an effect, which would be a cascading
     render, and not a ref, which may not drive output from render.

     `shown` is what the exit renders, and it has to be REMEMBERED rather than read: by the time
     the drawer is closing, `right` is already `""` and there would be nothing left to draw. */
  const open = right !== '';
  const [exiting, setExiting] = React.useState(false);
  const [wasRight, setWasRight] = React.useState(right);
  const [shown, setShown] = React.useState(right);

  if (wasRight !== right) {
    setWasRight(right);
    setExiting(wasRight !== '' && right === '');
    if (right !== '') setShown(right);
  }

  const present = open || exiting;
  const Panel = PANELS[shown];

  /* Not on the original, which has no keyboard affordance here at all — added for the reason
     Explore's is: this drawer covers a third of the window and its only other exit is a 32px
     square. Guarded against a dropdown being open above it (the chat's own channel picker is
     one), as Explore's is. */
  const hasDrawer = useMediaQuery('(min-width: 640px)');

  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (document.querySelector('.dropdown-layer')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /* NOT MOUNTED BELOW 640, AND THAT IS A BUG FIX AS WELL AS A FIDELITY ONE.
     ------------------------------------------------------------------
     Every rule in `RightDrawer.css` sits inside `@media (min-width: 640px)`, because that is
     where the original keeps them — under that line bc.game has no drawer at all, since
     `/notification` is a real dialog route there and the mobile bell navigates to it. The
     container was portalled to <body> unconditionally anyway, so below 640 it landed at the end
     of the document with NO rules on it: no `position: fixed`, no `width: 0`, no
     `overflow: hidden`. What that clips to nothing on a desktop is the close square, which is
     deliberately mounted outside the transition and so exists whether a panel does or not — and
     unclipped it painted as a loose ✕ tile under the last section of every mobile page.

     It cost layout too, which is the part that is easy to miss: `.right-slide-content` is
     `h-full` of an auto-height parent, i.e. zero, but an absolutely positioned descendant still
     contributes to the document's SCROLLABLE OVERFLOW — so `top-3.5` plus a `size-8` button
     added ~46px of empty scroll under the page. That is most of what read as the home page's
     bottom gap refusing to shrink, and no amount of margin trimming could have reached it.

     A JS gate rather than a `display: none` rule, on two counts: it matches the original, which
     does not render this tree on a phone at all, and a rendered-but-hidden button is still in
     the tab order. 640 rather than the drawer's own 1024 JS gate deliberately — this is the line
     the STYLESHEET stops at, and the two must not disagree about which widths are unstyled. */
  if (!hasDrawer) return null;

  return createPortal(
    <div className="chat-notice">
      <div className="right-slide-content relative h-full w-full">
        {/* `end-2 top-3.5`, and a `z-[101]` that sits above both panels' own sticky chrome —
            without it the notice tab strip's backdrop and the chat's `header-layer` would each
            scroll over the cross. `size-4.5` is a real class on the original (1.125rem), unlike
            the `h-13` the notice row asks for. */}
        <button
          type="button"
          className="button button-m absolute end-2 top-3.5 z-[101] size-8 rounded-lg bg-layer5 p-0"
          onClick={onClose}
          aria-label="Close"
        >
          <IconClose className="size-4.5 fill-secondary" />
        </button>

        {present && Panel && (
          /* The tween goes on the PANEL'S OWN ROOT, which is what `<Transition>` animates on the
             original — an extra wrapper here would break nothing visually but would put a second
             box between the drawer and the height chain each panel depends on. The notice panel
             takes the class as a prop for that reason; the chat panel's root is its own `size-full`
             div, so it is wrapped in a bare `h-full` carrier instead, which changes no geometry
             because the container it fills is the same box either way. */
          shown === 'notice' ? (
            <NotificationPanel
              className={open ? 'notice-enter' : 'notice-exit'}
              onAnimationEnd={() => {
                if (!open) setExiting(false);
              }}
            />
          ) : (
            <div
              className={`h-full ${open ? 'notice-enter' : 'notice-exit'}`}
              onAnimationEnd={() => {
                if (!open) setExiting(false);
              }}
            >
              <Panel />
            </div>
          )
        )}
      </div>
    </div>,
    document.body,
  );
}
