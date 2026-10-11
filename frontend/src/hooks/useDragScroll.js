import React from 'react';

/* Grab-to-scroll for a horizontal strip — press, drag, release.
 *
 * THIS BUILD'S, NOT THE ORIGINAL'S. The site scrolls its strips with the two chevron buttons and
 * nothing else; dragging was asked for on the casino tab strip and then on the Poker tab's game
 * panels, and this is the second call site, which is the rule `Select`, `GameTile`, `PopCenter`
 * and `ShowBlocked` all moved under.
 *
 * MOUSE-ONLY ON PURPOSE, and this is the part not to "improve". A touch pointer already scrolls
 * these natively, with momentum and rubber-banding no `pointermove` handler will match, so
 * taking it over would be strictly worse on exactly the devices a horizontal strip matters most
 * on. The gesture arms only for `pointerType === "mouse"`.
 *
 * Three things it has to get right, each of which showed up as a bug before it was handled:
 *
 *   THE CLICK SWALLOWER IS NOT OPTIONAL. Every child of these strips is a link or a tile, so a
 *   drag that ends over one would navigate on release. `onClickCapture` runs before React's own
 *   click on the child and is the only place to stop it without each call site knowing.
 *
 *   POINTER CAPTURE IS TAKEN LATE — only once the press has travelled past `SLOP` — so an
 *   ordinary click never has the pointer pulled off the child it landed on.
 *
 *   `scroll-smooth` HAS TO COME OFF FOR THE DURATION. It applies to programmatic `scrollLeft`
 *   writes as well as to `scrollTo`, so with it on, each pointermove eases toward its target:
 *   the strip lags the pointer and keeps gliding after release. `scroll-auto` while grabbing
 *   turns it off for exactly as long as the drag lasts, leaving any arrow buttons' own smooth
 *   scrolls alone.
 *
 * Returns the props to spread on the scroller plus its class fragment:
 *
 *   const scroller = React.useRef(null);
 *   const drag = useDragScroll(scroller);
 *   <div ref={scroller} {...drag.props} className={`… ${drag.className}`}>
 */

/* How far the pointer must travel before a press counts as a drag rather than a click. Three
   pixels is the usual figure and it earns its keep here: too low and a slightly unsteady click
   on a tile becomes a swallowed navigation. */
const SLOP = 3;

/* `enabled` — OFF WHEREVER SOMETHING ELSE ALREADY SCROLLS THE STRIP. The one caller that passes
   it is `ScrollTabs`, which turns the drag off exactly when its chevrons are showing, so a strip
   always has precisely one pointer affordance rather than two competing ones. Requested for the
   desktop casino strip and correct generally: the arrows scroll by half a viewport with
   `behavior: smooth`, and a grab that fights that mid-animation is the worst of both.

   The hooks below still run when it is false — they must, unconditionally — and only the
   returned props and class fragment go empty, so nothing is bound and nothing is styled. */
export default function useDragScroll(scrollerRef, enabled = true) {
  const drag = React.useRef(null);
  const swallowClick = React.useRef(false);
  const [grabbing, setGrabbing] = React.useState(false);

  const onPointerDown = (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    swallowClick.current = false;
    drag.current = { x: event.clientX, left: el.scrollLeft, moved: false, id: event.pointerId };
  };

  const onPointerMove = (event) => {
    const state = drag.current;
    const el = scrollerRef.current;
    if (!state || !el) return;

    const dx = event.clientX - state.x;
    if (!state.moved) {
      if (Math.abs(dx) < SLOP) return;
      state.moved = true;
      setGrabbing(true);
      el.setPointerCapture?.(event.pointerId);
    }
    el.scrollLeft = state.left - dx;
  };

  /* Takes no event: the pointer id it needs to release is the one recorded on pointerdown, not
     whatever the ending event carries — pointercancel in particular can arrive for a different
     pointer than the one being tracked. */
  const endDrag = () => {
    const state = drag.current;
    if (!state) return;
    drag.current = null;

    if (state.moved) {
      swallowClick.current = true;
      setGrabbing(false);
      const el = scrollerRef.current;
      if (el?.hasPointerCapture?.(state.id)) el.releasePointerCapture(state.id);
    }
  };

  const onClickCapture = (event) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  if (!enabled) return { grabbing: false, props: {}, className: '' };

  return {
    grabbing,
    props: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
      /* A mouse drag on an <a> or an <img> starts the browser's own drag, ghost image and all,
         which fights the scroll and leaves the pointer captured by the drag source. */
      onDragStart: (event) => event.preventDefault(),
    },
    /* `snap-none` alongside `scroll-auto`, and for the same class of reason. These strips are
       `snap-x snap-mandatory` over children that `.smooth-scroll > *` gives a
       `scroll-snap-align`, so every tab is a snap target — and mandatory snapping does not just
       act on flings, it re-snaps the scroller whenever the browser recomputes it. During a drag
       that means the strip is pulled toward the nearest tab boundary while the pointer is still
       moving, so it fights the hand holding it. Off for the duration, back on after. */
    className: grabbing ? 'cursor-grabbing select-none scroll-auto snap-none' : 'cursor-grab',
  };
}
