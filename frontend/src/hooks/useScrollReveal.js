import React from 'react';

/* Reveal-on-scroll — each card plays THE SITE'S OWN entrance the first time it reaches the
 * fold, instead of having played it unseen at page load.
 *
 * THE MOTION IS NOT THIS BUILD'S AND MUST NOT BE INVENTED. `io` in Enter-MsmOuq5R.js gives
 * every tile past the first
 *
 *   e.index > 0 && "game-tile-animate"
 *   `--game-tile-animation-delay: ${Math.min(e.index, 11) * 15}ms`
 *
 * and `.game-tile-animate` in index-DxOqNczA.css is `game-tile-fade-slide .3s backwards` on
 * `linear(0, .08, .32, .62, .9, 1.12, 1.15, 1.08, 1.02, 1)` — a 30px rise that OVERSHOOTS to
 * 1.15 and settles back. That ramp, that duration and that 15ms-per-index step (capped at 11)
 * are what the rules in Home.css reproduce; only the TRIGGER is this build's. A plain ease-out
 * over a longer duration reads as a different site, which is the whole of what was wrong with
 * the first pass here.
 *
 * A target is what gets OBSERVED; the items are what get REVEALED. Handing a row as the target
 * and its cards as the items is what makes a strip ramp its tiles left to right the moment it
 * arrives — which is exactly what the live page does at mount. Pass no `itemSelector` and a
 * target reveals itself, which is what a whole panel wants.
 *
 * Classes are written ONTO THE NODE rather than held in state — the same call the promotions
 * tab indicator, the hero dots and the referral ticker make; a revealed-set in state would
 * re-render the page on every scroll step and the value is never read during render. That is
 * safe here because every element it touches carries a className React recomputes to the same
 * string on every render, so React never patches the attribute and never wipes what this adds.
 * Check that before pointing it at markup whose class list is derived from state.
 *
 * The hidden state goes on in a LAYOUT effect: an item already in view at first paint would
 * otherwise render solid, get hidden a frame later and fade back in, which reads as a flicker
 * on load rather than as an entrance.
 *
 * `ready` IS NOT OPTIONAL FOR A DATA-DRIVEN PAGE, and the reason is what this hook does at the
 * moment it runs: it queries the DOM ONCE, hides what it finds and observes it. Run against a
 * page whose rows are still skeletons — which is every cold load now that `request()` takes time
 * (see services/client.js) — it hides the PLACEHOLDERS and never sees the cards that replace
 * them, so the entrance is skipped entirely and the effect's cleanup is the only thing that ever
 * touches them again. Passing the page's own "has the data landed" flag re-runs the whole pass
 * against the settled markup. It is a value, not a boolean, so a call site can key it on anything
 * whose change means "the tree underneath me is different now".
 */

/* Read once. A visitor who turns the OS setting on mid-session gets it on the next reload,
   which is what the CSS-only opt-outs elsewhere in this project do too. */
const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/* `io`'s own two numbers. The cap is why the twelfth card onwards all start together. */
const STAGGER_MS = 15;
const MAX_STAGGER = 11;

export default function useScrollReveal({
  selector,
  itemSelector = null,
  /* One viewport-tenth of overlap before a target counts as arrived, so a row starts moving as
     it clears the fold rather than the instant its top edge crosses it. */
  rootMargin = '0px 0px -10% 0px',
  threshold = 0.05,
  ready,
} = {}) {
  const ref = React.useRef(null);

  React.useLayoutEffect(() => {
    const root = ref.current;
    if (!root || reduced() || typeof IntersectionObserver === 'undefined') return undefined;

    /* `:has()` is in the page selector, and a browser without it throws on the whole query
       rather than matching nothing — which inside a layout effect would take the page down.
       Anything old enough to fail here simply gets the page with no reveal at all. */
    let targets;
    try {
      targets = Array.from(root.querySelectorAll(selector));
    } catch {
      return undefined;
    }
    const itemsOf = (el) =>
      itemSelector ? Array.from(el.querySelectorAll(itemSelector)) : [el];

    const touched = [];
    targets.forEach((target) =>
      itemsOf(target).forEach((el) => {
        el.classList.add('scroll-reveal');
        touched.push(el);
      }),
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          /* Once only. Unobserving here rather than testing the class keeps the observer's own
             list shrinking as the page is read. */
          observer.unobserve(entry.target);
          itemsOf(entry.target).forEach((el, i) => {
            el.style.setProperty(
              '--scroll-reveal-delay',
              `${Math.min(i, MAX_STAGGER) * STAGGER_MS}ms`,
            );
            el.classList.remove('scroll-reveal');
            el.classList.add('scroll-reveal-in');
          });
        });
      },
      { rootMargin, threshold },
    );

    targets.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      /* Leave nothing hidden behind: this effect re-runs on a hot reload and under a StrictMode
         double-invoke, and an item still carrying `scroll-reveal` with no observer watching it
         would be invisible for good. */
      touched.forEach((el) => {
        el.classList.remove('scroll-reveal', 'scroll-reveal-in');
        el.style.removeProperty('--scroll-reveal-delay');
      });
    };
  }, [selector, itemSelector, rootMargin, threshold, ready]);

  return ref;
}
