import React from 'react';
import { createPortal } from 'react-dom';
import { subscribe, getToasts, dismissToast } from './toast';
import CircleCountdown from '../CircleCountdown';
import './Toast.css';

/* The toast layer — `o3` in index-BsFv7ByC.js, which portals `.toast-layer` to the overlay root
 * and renders one `Lx` per entry.
 *
 * The structure is the original's own templates:
 *
 *   Ax = <div class=toast-layer>
 *   Px = <div class="overflow-hidden flex"><div><div class="pl-2 pr-4 flex">
 *   Ox = <button>                                       ← the close, when there is no countdown
 *
 * so each row is a wrapper, the `.toast` pill inside it, and the message in a `pl-2 pr-4` box.
 * The wrapper is what the entrance animates — see `Toast.css` for why that is a keyframe here and
 * a measured height tween on the original.
 *
 * IT IS A CONTENT-WIDTH PILL AT THE RIGHT, not a full-width bar, and `Toast.css` carries the
 * argument for why — `.toast`'s own `align-self: end` and `flex: 1` are inert unless its parent
 * is a column flex container, and both stylesheets declare them.
 *
 * THE RING AND THE CROSS ARE ONE CONTROL, AND HOVER SWAPS THEM — which is `Lx`'s own arrangement
 * rather than an addition. Its close button is rendered INSIDE the ring's box, absolutely, with
 * `size-6 flex center absolute top-0 left-0`, behind `<Show when={!n() || r()}>` where `n()` is
 * "this toast has a countdown" and `r` is the pause signal that `s` flips on `mouseenter` and
 * `mouseleave`. So: no countdown, or paused — and paused means hovered. A timed toast shows its
 * ring at rest and its cross under the pointer.
 *
 * Mounted once, from `MainLayout`, beside the Explore and notification portals — the same place
 * and for the same reason: it is `position: fixed` at `z-index: 10000` and must not sit inside
 * the layout's stacking or scroll context.
 */
/* One toast. Its own component because the hover state is per-row — the layer renders several and
 * a single flag on the layer would pause all of them together. */
function ToastRow({ toast }) {
  const timed = toast.duration > 0;

  /* THE PAUSE IS A REAL PAUSE, not a restart, and it is why the deadline is state rather than the
     value stamped in the store. `s` in `Lx` emits `toast-pause` and the ring stops where it is; the
     shared `CircleCountdown` has no pause of its own, so the ring is UNMOUNTED while the pointer is
     over the row and remounted on the way out against a deadline pushed forward by exactly how
     long the hover lasted. The remaining time is preserved to the millisecond, and nothing can
     dismiss the toast while somebody is reaching for its cross — which is the whole point of the
     original pausing at all.

     Unmounting is also what stops the ring's `onComplete` firing behind the cross. On the original
     the close is drawn OVER a ring that is still there but frozen; here it replaces it. The box is
     the same 24px either way, so the two render identically. */
  const [endsAt, setEndsAt] = React.useState(toast.expiresAt);
  const [hovered, setHovered] = React.useState(false);
  const hoverStart = React.useRef(0);

  const onEnter = () => {
    if (!timed) return;
    hoverStart.current = Date.now();
    setHovered(true);
  };

  const onLeave = () => {
    if (!timed) return;
    setEndsAt((current) => current + (Date.now() - hoverStart.current));
    setHovered(false);
  };

  /* `!n() || r()` — no countdown, or paused. */
  const showCross = !timed || hovered;

  return (
    <div className="toast-row">
      <div className="toast" onMouseEnter={onEnter} onMouseLeave={onLeave}>
        {/* NO TYPE UTILITIES ON THE MESSAGE. `Px`'s inner box is `pl-2 pr-4 flex` and nothing
            else, so it inherits `.app-root`'s own .875rem at the body weight — a `text-sm
            font-semibold` here made it heavier than the site's. */}
        <div className="flex pl-2 pr-4">{toast.message}</div>

        {/* `kx` — the `ml-auto relative size-6` box both arms live in. `ml-auto` has nothing to
            push against on a content-width pill, which is the point: it is what would separate
            the two if the toast were ever stretched. */}
        <div className="relative ml-auto size-6">
          {showCross ? (
            <button
              type="button"
              aria-label="Dismiss"
              /* `o(!0)`'s own class list — the overlay arm, `absolute top-0 left-0` filling the
                 ring's box, which is what makes the whole 24px square the hit target. */
              className="center absolute left-0 top-0 size-6 cursor-pointer"
              onClick={() => dismissToast(toast.id)}
            >
              {/* `Te.Close` at `size-4 fill-secondary` — the same cross the dialogs draw. */}
              <svg viewBox="0 0 32 32" className="icon size-4 fill-secondary">
                <path d="M7.15445 7.40846C6.3734 8.18951 6.3734 9.45584 7.15445 10.2369L12.9175 15.9999L7.15445 21.7629C6.3734 22.544 6.3734 23.8103 7.15445 24.5914L7.40846 24.8454C8.18951 25.6264 9.45584 25.6264 10.2369 24.8454L15.9998 19.0825L21.7631 24.8458C22.5441 25.6269 23.8104 25.6269 24.5915 24.8458L24.8455 24.5918C25.6265 23.8108 25.6265 22.5444 24.8455 21.7634L19.0825 16.0003L24.8455 10.2373C25.6265 9.45627 25.6265 8.18994 24.8455 7.40889L24.5915 7.15488C23.8104 6.37383 22.5441 6.37383 21.7631 7.15488L16.0002 12.9177L10.2369 7.15445C9.45584 6.3734 8.18951 6.3734 7.40846 7.15445L7.15445 7.40846Z" />
              </svg>
            </button>
          ) : (
            /* The shared ring, `C` from `CircleCountdown-C0Wkxy5W.js`. `endTime` is its one-shot
               mode, which is exactly a toast's life. ONE DIFFERENCE recorded rather than papered
               over: the toast template draws `<circle r=8>` where the swap page's component is
               `r=12`, so the arc here is a little fatter than the original's. */
            <CircleCountdown
              endTime={endsAt}
              onComplete={() => dismissToast(toast.id)}
              className="w-6 h-6 flex-none -mt-0.5"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ToastLayer() {
  /* `useSyncExternalStore` rather than an effect-plus-state pair: the store lives outside React,
     and this is the hook that exists for exactly that. It also means no toast can be missed
     between the first render and an effect firing. */
  const toasts = React.useSyncExternalStore(subscribe, getToasts, getToasts);

  /* NO TIMER HERE. The countdown ring is the clock — it calls `onComplete` when it empties,
     which is the same arrangement `Lx` has (`onEnd: () => jg(t.toastData)`). A `setTimeout`
     beside it would be a second one racing the first. An untimed toast has no ring and no timer
     and waits for its cross. */

  if (!toasts.length) return null;

  return createPortal(
    <div className="toast-layer">
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </div>,
    document.body,
  );
}
