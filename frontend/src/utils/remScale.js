/* Root font-size, ported from the original (index-BsFv7ByC.js):
 *
 *   const m1 = 430, _5 = 640;
 *   const f = document.documentElement.clientWidth;
 *   const h = f < _5 ? f : m1;          // clientWidth below 640, else 430
 *   remScale = h / m1;                   // not capped at 1
 *   document.documentElement.style.fontSize = remScale * 16 + "px";
 *
 * index.css carries the same formula as `--u`, but a stylesheet has no way to read
 * clientWidth, so it uses 100vw — and 100vw counts a classic scrollbar where clientWidth
 * does not. On a desktop window under 640px wide that inflates every rem in the page: at
 * a 426px client width with a 15px scrollbar the hero's Google/Telegram buttons came out
 * 90.25 x 32.82 instead of 87.18 x 31.70, and the mobile banner (whose width at h-full
 * equals the panel width to within 0.0000rem) tripped `max-width: 100%` and shrank.
 *
 * Reading clientWidth removes the discrepancy entirely. The CSS rule stays as the
 * pre-script fallback and for anything that renders before this runs; the inline style
 * set here outranks it.
 */
const BASE_WIDTH = 430;
const SM_BREAKPOINT = 640;

export function applyRemScale() {
  const clientWidth = document.documentElement.clientWidth;
  const basis = clientWidth < SM_BREAKPOINT ? clientWidth : BASE_WIDTH;
  document.documentElement.style.fontSize = (basis / BASE_WIDTH) * 16 + 'px';
}

/* The original debounces its resize handler at 100ms; kept the same so the steady-state
   value and the settle behaviour both match. Returns a teardown for symmetry — nothing
   unmounts the root today, so main.jsx ignores it. */
export function watchRemScale() {
  applyRemScale();

  let timer;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(applyRemScale, 100);
  };

  window.addEventListener('resize', onResize);

  /* A `resize` listener alone is not enough. A classic scrollbar appearing narrows
     clientWidth by ~15px WITHOUT firing a window resize event, so the root font-size stays
     at the value computed before the page had grown tall enough to scroll. That was
     invisible while the home page fit on one screen; once it did not, every rem below 640
     came out ~4% too large (a 390px window kept the 390/430 scale instead of 375/430).
     Observing the root element catches the layout change the resize event misses. */
  const observer =
    typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
  observer?.observe(document.documentElement);

  return () => {
    window.removeEventListener('resize', onResize);
    observer?.disconnect();
    clearTimeout(timer);
  };
}
