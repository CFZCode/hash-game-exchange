/* Where a `.dropdown-layer` goes, and when it closes.
 *
 * Both halves used to live in `Select/index.jsx` and were pulled out when the header's currency
 * dropdown became a second consumer. That layer is not a Select — its trigger is the whole
 * wallet pill rather than a `.button.select`, and it is 24rem wide rather than 18 — but the
 * original hands both of them to the same popover machinery (`wS` in index-BsFv7ByC.js), so
 * they place and dismiss identically and the width is the only thing that has to be a
 * parameter.
 */

/* `js` in index-BsFv7ByC.js — the popover's own placement, and the horizontal half below is now
 * transcribed from it rather than approximated.
 *
 *   const T = rtl
 *     ? Math.min(Math.max(0, d.right - p.width), Math.max(0, innerWidth - p.width))
 *     : d.x + p.width < innerWidth ? d.x : Math.max(0, d.x - p.width + f.clientWidth)
 *
 * where `d` is the TRIGGER's rect, `p` the LAYER's, and `f` the trigger element. So in LTR:
 *
 *   the layer fits to the right of the trigger's left edge  ->  START-align to the trigger
 *   it does not                                             ->  END-align to it, i.e. the two
 *                                                               right edges line up
 *
 * IT FLIPS SIDES, IT DOES NOT SLIDE. This build clamped the left edge into the viewport instead,
 * which is a different thing and looks wrong exactly where the two disagree: the Vault transfer
 * panel's coin Select is a ~110px pill at the right end of a ~450px card, so an 18rem layer
 * start-aligned to it overhangs the card by ~180px, the clamp shoves it left by whatever the
 * window happens to spare, and it lands under neither the pill nor the card. End-aligned it sits
 * inside the card with its right edge on the pill's. The narrower the trigger and the further
 * right it sits, the more the two rules diverge — which is why nothing caught this until a
 * trigger appeared that was both.
 *
 * `gap` is `xS = 8` scaled by `remScale` on the original (`(t.space ?? 8) * ee.remScale`) — so it
 * is a PROP with a default, not a constant, and the `space` parameter below is that prop. The
 * chat drawer's room picker is the first call site to set it (`space: 18`), which is what puts
 * its layer 18px under the trigger instead of 8. `remScale` is not applied: every consumer is a
 * desktop control and above 640 it is exactly 1.
 *
 * TWO PARTS OF `js` ARE DELIBERATELY NOT PORTED, both recorded here now that the real rule is
 * known rather than left to be rediscovered:
 *
 *   the inline width      `width: Math.max(p.width, f.clientWidth)` — a trigger wider than the
 *                         layer stretches it. Every layer in this build already carries a width
 *                         from its class and none of the five call sites has a trigger wider
 *                         than its layer, so writing it would change nothing today and would
 *                         quietly override `optionsClassName` on the deposit Currency select.
 *   the height clamp      when the layer does not fit, the original SHRINKS it (writing the
 *                         available space to both `min-height` and `max-height`) rather than
 *                         moving it. This file slides it and clamps into the viewport instead —
 *                         see the note on the final `top` clamp below. Porting the real rule
 *                         means inline min/max-height beating `.currency-select`'s 36rem floor
 *                         and the deposit select's `min-h-[80vh]`, which is three verified
 *                         pages' worth of risk for a case none of them reaches.
 *
 * Vertical placement, unchanged:
 *   fits below            -> below
 *   fits above only       -> above
 *   fits neither          -> the roomier side, then clamped into the viewport
 * `height` is the layer's real measured height, so this follows however many rows it has.
 *
 * The final clamp is not belt-and-braces. Without it the third case runs off the bottom of a
 * short window — a 320px layer under a trigger at y=240 in a 520px viewport ends at 568 — and a
 * dropdown half off screen is worse than one that overlaps its own trigger.
 *
 * Everything is viewport-relative because `.dropdown-layer` is `position: fixed`. */
export function layerPosition(rect, height, width = 18 * 16, triggerWidth = rect.width, space = 8) {
  const gap = space;

  /* `Math.max(0, …)`, not `Math.max(gap, …)`: the original lets an end-aligned layer sit flush
     against the viewport edge rather than insisting on the gap, and the gap is the distance from
     the TRIGGER, not from the window.

     `triggerWidth` is the trigger's `clientWidth` — the original's own `f.clientWidth`, which
     EXCLUDES the border where `rect.width` includes it. `.select` puts a 1px border on the
     trigger, so the two differ by 2px, and 2px is exactly the amount by which the two right
     edges would fail to line up. Defaulted to `rect.width` so a caller that has only a rect
     still gets the right side. */
  const left =
    rect.left + width < window.innerWidth
      ? rect.left
      : Math.max(0, rect.left - width + triggerWidth);

  const below = window.innerHeight - rect.bottom - gap;
  const above = rect.top - gap;
  const flip = height > below && (height <= above || above > below);

  const wanted = flip ? rect.top - gap - height : rect.bottom + gap;
  const top = Math.max(gap, Math.min(wanted, window.innerHeight - gap - height));

  return { left: `${left}px`, top: `${top}px` };
}

/* `Ni()` — the nearest ancestor that actually scrolls, falling back to the window. Walks
   computed `overflow-y` rather than looking for a class, because the scroller that matters
   differs per call site: `.scroll-y` inside the Explore overlay, the document on the casino
   page. `auto` and `scroll` both count; `hidden` does not, since a `hidden` box can be
   scrolled programmatically but never by the user, which is what this is watching for. */
export function scrollParent(node) {
  for (let el = node?.parentElement; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowY;
    /* Only an ancestor that really scrolls vertically: `overflow-x: auto` (a tab strip, the
       page row) computes `overflow-y` to `auto` too, and binding to that one meant the page's
       own scroll never closed the layer, which then floated over the grid. */
    if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return el;
  }
  return window;
}
