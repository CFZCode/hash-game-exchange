import React from 'react';
import { ArrowIcon } from '../../Explore/icons';
import useDragScroll from '../../../hooks/useDragScroll';
import { useIsDesktop } from '../../../hooks/useMediaQuery';

/* `fe`, the site's ScrollTabs (index-DrTwTnbT.js).
 *
 * A horizontal scroller with a button at each end that appears only when there is something
 * to scroll to in that direction, scrolling by half a viewport per press. On first render it
 * also pulls the active child roughly a third of the way in — that is the
 * `n.offsetLeft - (i / 3 - v / 3)` line, and it runs once (`t && (t = !1, g())`).
 *
 * It started life inside Explore/TabStrip and moved here when the casino page's own tab strip
 * became a second consumer. The two differ in what a tab IS — Explore's set component state,
 * the casino page's are links — so only the scroller is shared, which is exactly the split
 * the original makes: `fe` takes arbitrary children and knows nothing about tabs.
 *
 * `scroll-button-active` carries no styles. It is only how `fe` finds the active child to
 * scroll it into view, so a caller must put it on whichever child is selected.
 */

export const ACTIVE = 'scroll-button-active';

/* One arrow's footprint: the `size-8` button plus the `ml-2`/`mr-2` beside it. */
const ARROW_SPACE = 40;

/* `arrows` — THE DEFAULT IS `!m.mobile`, WHICH IS THE ORIGINAL'S OWN GATE and not a guess.
 * `fe` wraps each button in
 *
 *   <Show when={E(() => !x.mobile)() && o()}>   left
 *   <Show when={E(() => !x.mobile)() && y()}>   right
 *
 * so the two conditions are ANDed: a desktop, and something to scroll to in that direction.
 * This defaulted to a flat `true` under a note in Explore/TabStrip saying the mobile half of
 * that test could be skipped because the panel was desktop-only — true when it was written and
 * no longer, since `/explore` is now a page below `lg`, where the arrows had started showing.
 * Same invalidated assumption the `Select` size default carried.
 *
 * An explicit prop still wins at both ends. `??`, not `||`, so a passed `false` is honoured
 * rather than falling through to the default — the casino strip relied on exactly that for a
 * while, to drop the chevrons on desktop as well, and has since been put back on the default.
 * NOTHING PASSES THE PROP TODAY; it is kept because the escape hatch is the point.
 *
 * ARROWS AND GRAB-TO-SCROLL ARE MUTUALLY EXCLUSIVE, and the drag is the one that gives way:
 * `useDragScroll(scrollerRef, !showArrows)`. So a strip has exactly one pointer affordance —
 * chevrons where they are shown, a grab where they are not — rather than two that fight. They
 * genuinely do fight: an arrow scrolls half a viewport with `behavior: smooth`, and a press
 * partway through that animation stops it dead and hands the strip to the pointer.
 *
 * Requested for the desktop casino strip, and it lands the whole component back on the
 * original's own behaviour there, since `fe` has arrows and no drag at all. What it leaves is
 * the case the drag was added for: below `lg`, where `fe` shows no arrows either. GRAB-TO-SCROLL
 * IS STILL MOUSE-ONLY, so a phone keeps the native scroll with its momentum and rubber-banding
 * — which a `pointermove` handler cannot match — and only a narrow desktop window gets the grab.
 */
export default function ScrollTabs({ children, className = '', style, arrows }) {
  const isDesktop = useIsDesktop();
  const showArrows = arrows ?? isDesktop;

  const scrollerRef = React.useRef(null);
  const [ends, setEnds] = React.useState({ left: false, right: false });
  const centred = React.useRef(false);
  const dragScroll = useDragScroll(scrollerRef, !showArrows);

  /* `s(n)` — recomputed from a candidate scrollLeft so the arrows update at the moment of the
   * programmatic scroll rather than a frame later, which is what the original does.
   *
   * The right end-stop is measured against the width the scroller would have WITHOUT the right
   * arrow, and that is not a refinement — it is what keeps this from oscillating.
   *
   * The arrows are flex siblings, so mounting one takes 40px off the scroller. Test the plain
   * `scrollLeft < scrollWidth - clientWidth` and the answer depends on whether the arrow is
   * already there: in the last 40px of travel, "shown" and "hidden" are BOTH self-consistent,
   * because showing the arrow shrinks the scroller by exactly enough to justify showing it.
   * Anything that re-measures inside that band flips the state, which re-measures, which flips
   * it back — the strip visibly scrolls back and forth on its own. Adding the arrow's own
   * width back before comparing removes the band: the arrow appears only when there is content
   * past the edge even with the arrow gone. */
  const sync = React.useCallback((next) => {
    const el = scrollerRef.current;
    if (!el) return;
    const at = next === undefined ? el.scrollLeft : next;

    setEnds((prev) => {
      /* No arrows, no 40px to add back — the oscillation the compensation exists to prevent
         cannot happen when nothing mounts to shrink the scroller. */
      const bare = el.clientWidth + (showArrows && prev.right ? ARROW_SPACE : 0);
      const max = Math.max(0, el.scrollWidth - bare);
      return { left: at > 2, right: at < max - 2 };
    });
  }, [showArrows]);

  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    sync();

    /* The one-shot "pull the active tab a third of the way in".
     *
     * It has to wait for the webfont. Averta Std arrives via @font-face, and on a cold load
     * this effect runs while the fallback metrics still apply — every tab measures narrower,
     * so the active tab's offsetLeft is short and the strip stops before it. With sixteen
     * tabs that is visible: landing on /casino/themes scrolled to 523 when the correct answer
     * was 651, leaving the selected tab clipped by the right edge. It never showed with the
     * Explore panel's ten tabs because its active tab is the first one, at offsetLeft 0.
     *
     * `document.fonts.ready` settles after the face is applied, which is exactly the moment
     * the measurements become real. Guarded for absence, and cancelled on unmount so a late
     * resolution cannot scroll a strip that is gone.
     *
     * It runs ONCE, and it must stay that way. An earlier version re-ran it from the resize
     * observer to iterate towards a stable answer; with the end-stop hysteresis described on
     * `sync` above there was no stable answer, so it alternated between two values for as long
     * as the strip was mounted and fought the user's own scrolling. The observer now only
     * updates the arrows. */
    let cancelled = false;

    const centre = () => {
      if (cancelled || centred.current) return;
      const active = el.querySelector(`.${ACTIVE}`);
      if (!active) return;
      centred.current = true;

      /* Measured at scrollLeft 0, where the right arrow is showing and the left is not — which
         is the same 40px of chrome the strip ends up with at the far end, left arrow showing
         and right not. So this max is already the correct end value; no second pass needed. */
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const left = Math.max(
        Math.min(active.offsetLeft - (el.clientWidth / 3 - active.offsetWidth / 3), max),
        0,
      );

      sync(left);
      el.scrollTo({ left, behavior: 'smooth' });
    };

    const fonts = typeof document === 'undefined' ? null : document.fonts;
    if (fonts && fonts.status !== 'loaded') fonts.ready.then(centre);
    else centre();

    const onScroll = () => sync();
    el.addEventListener('scroll', onScroll, { passive: true });

    /* The strip's scrollWidth changes with the panel width, so a resize can move an end-stop
       with no scrolling at all. The original listens on `scrollend` and touchend instead; a
       ResizeObserver covers the case those two miss. */
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => sync());
    observer?.observe(el);

    return () => {
      cancelled = true;
      el.removeEventListener('scroll', onScroll);
      observer?.disconnect();
    };
  }, [sync]);

  const nudge = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    const half = el.clientWidth / 2;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const left =
      direction === 'left' ? Math.max(el.scrollLeft - half, 0) : Math.min(el.scrollLeft + half, max);
    sync(left);
    el.scrollTo({ left, behavior: 'smooth' });
  };

  return (
    /* `style` was added for the casino strip's sticky `top`, on the belief that Tailwind could
       not put a custom property inside an arbitrary value. v4 can — an arbitrary `top` takes
       both a bare custom property and a calc over one, with `_` for the spaces calc needs — so
       that call site writes utilities now and this prop has no consumer. It is kept because it
       is the right escape hatch for a genuinely computed value, but reach for the utility
       first: an inline style cannot carry a media query and outranks any rule that tries to
       override it, which is what forced the casino strip off it once its stuck and unstuck
       offsets had to differ by breakpoint.

       The class names are described rather than spelled out on purpose. Tailwind scans comments
       as readily as markup, so writing them here emits real rules for them — the casino strip's
       superseded 0.5rem offset survived in the built CSS that way until this was reworded. Same
       trap the dropped `w-30` in the signed-in header documents. */
    <div className={`flex w-full items-center ${className}`} style={style}>
      {showArrows && ends.left && (
        <button type="button" className="button size-8 bg-layer4 p-0" onClick={() => nudge('left')}>
          <ArrowIcon className="size-4 fill-primary" />
        </button>
      )}

      <div
        ref={scrollerRef}
        style={{ scrollPaddingInline: '1rem' }}
        {...dragScroll.props}
        /* `dragScroll.className` carries the grab cursor and, while a drag is in flight,
           `scroll-auto` — which has to override the `scroll-smooth` above it. Both are plain
           utilities on one element, so Tailwind's own order settles it and `scroll-auto` wins;
           see the note in the hook for why the smooth behaviour cannot stay on during a drag.
           It is the EMPTY STRING wherever the arrows are showing, so no grab cursor appears on a
           strip that is scrolled by chevrons. Where it does apply, the cursor is shown
           unconditionally rather than only when there is somewhere to scroll: `ends` is
           measured, and gating on it made the cursor flicker at the stops. */
        className={`hide-scroll smooth-scroll relative flex w-full snap-x snap-mandatory gap-0.5 overflow-x-auto overflow-y-hidden scroll-smooth ${
          showArrows && ends.left ? 'ml-2' : ''
        } ${showArrows && ends.right ? 'mr-2' : ''} ${dragScroll.className}`}
      >
        {children}
      </div>

      {showArrows && ends.right && (
        <button type="button" className="button size-8 bg-layer4 p-0" onClick={() => nudge('right')}>
          <ArrowIcon className="size-4 rotate-180 fill-primary" />
        </button>
      )}
    </div>
  );
}
