import React from 'react';

/* DRAG-TO-DISMISS — `Vx`, the helper the popup manager wires onto any panel that is not
 * `.pop-center` and has not asked for `disableDragClose`. Four things in it are the design rather
 * than the polish, and all four are ported:
 *
 *   THE NEAREST SCROLLABLE ANCESTOR DECIDES WHETHER THIS IS A DRAG AT ALL. `Vx` walks up from the
 *   touched element looking for something with `scrollHeight - clientHeight > 1`, and only drags
 *   the sheet when that scroller is within 16px of its top. Without it a sheet holding a long list
 *   can never be scrolled — the first downward swipe drags the whole panel away.
 *
 *   PULLING UP RESISTS. `u(b) = (1 - 1/(b*.54/a + 1)) * a` is asymptotic, so upward travel
 *   approaches the sheet's own height and never exceeds it. Its shape is what makes a sheet feel
 *   attached rather than loose.
 *
 *   DISMISS IS VELOCITY *OR* DISTANCE: `n(b > .3 || c() > a / 2)` — a flick faster than 0.3px/ms
 *   closes it however short, and past halfway closes it however slow. Distance alone makes a quick
 *   flick feel ignored.
 *
 *   AND IT SNAPS BACK. The other arm is `ane.animateTo(1)`, the same 0.35s power3.out tween the
 *   enter uses, which is why the transition below names that pair.
 *
 * Not ported: the horizontal arm bound to `document` — that is the back-swipe gesture off the
 * screen edge (`b.begin.clientX <= ud`), which belongs to the router rather than the sheet.
 *
 * EXTRACTED FROM `components/shared/PopCenter` under the second-call-site rule that `Select`,
 * `GameTile`, `PageCard` and `RouteDialog` moved under: the language/currency panel is the second
 * sheet in this build and predates `PopCenter`, so it writes its own markup — its title bar is a
 * tab strip rather than a title — but the gesture is the manager's and is identical for both.
 *
 * It is `pointer` events throughout rather than `touch`, so a MOUSE drags a sheet as well as a
 * finger does. That is not the original's arrangement — `Vx` binds `touchstart`/`touchmove` — and
 * it is deliberate here, because every one of these sheets is reachable in a desktop browser at a
 * narrow width, where a touch-only gesture would leave the panel with no way to dismiss it once
 * the close button is gone.
 */
export default function useSheetDrag({ enabled, onClose }) {
  const panelRef = React.useRef(null);
  const drag = React.useRef(null);

  const resist = (px, height) => (1 - 1 / ((px * 0.54) / height + 1)) * height;

  const settle = (panel, to, after) => {
    panel.style.transition = 'transform .35s cubic-bezier(0.165, 0.84, 0.44, 1)';
    panel.style.transform = `translate3d(0, ${to}, 0)`;
    window.setTimeout(() => {
      panel.style.transition = '';
      if (after) after();
      else panel.style.transform = '';
    }, 350);
  };

  const onPointerDown = (event) => {
    const panel = panelRef.current;
    if (!enabled || !panel) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    let node = event.target;
    while (node && node !== panel) {
      if (node.scrollHeight - node.clientHeight > 1) break;
      node = node.parentElement;
    }
    const scroller = node && node !== panel ? node : null;
    if (scroller && scroller.scrollTop > 16) return;

    panel.style.transition = '';
    drag.current = {
      y: event.clientY,
      at: event.timeStamp,
      height: panel.offsetHeight || 1,
      offset: 0,
      moved: false,
      scroller,
      id: event.pointerId,
    };
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    const panel = panelRef.current;
    if (!state || !panel) return;

    /* The list scrolled out from under the gesture — hand it back rather than fighting it. */
    if (state.scroller && state.scroller.scrollTop > 16) {
      drag.current = null;
      panel.style.transform = '';
      return;
    }

    let dy = event.clientY - state.y;
    if (dy < 0) dy = -resist(-dy, state.height);
    if (!state.moved) {
      if (Math.abs(dy) < 4) return;
      state.moved = true;
      panel.setPointerCapture?.(event.pointerId);
    }

    state.offset = dy;
    state.lastY = event.clientY;
    state.lastAt = event.timeStamp;
    panel.style.transform = `translate3d(0, ${dy}px, 0)`;
  };

  const endDrag = () => {
    const state = drag.current;
    const panel = panelRef.current;
    drag.current = null;
    if (!state || !panel) return;
    if (panel.hasPointerCapture?.(state.id)) panel.releasePointerCapture(state.id);
    if (!state.moved) return;

    const elapsed = Math.max(1, (state.lastAt ?? state.at) - state.at);
    const velocity = ((state.lastY ?? state.y) - state.y) / elapsed;

    if (velocity > 0.3 || state.offset > state.height / 2) settle(panel, '100%', onClose);
    else settle(panel, '0');
  };

  /* Spread onto the panel. Undefined when disabled, so a centred card carries no listeners at all
     rather than four that return early. */
  const handlers = enabled
    ? {
        onPointerDown,
        onPointerMove,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
      }
    : {};

  return { panelRef, handlers };
}
