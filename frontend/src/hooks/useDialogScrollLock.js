import { useEffect } from 'react';

/* The page's scroll lock, ported from index-BsFv7ByC.js. It is ONE registry shared by every
 * dialog on the site, not a per-dialog effect, and the whole thing is written there as:
 *
 *   const [Ux, Wg] = B([]);                       // the list of currently-open popups
 *
 *   function a3(t, e = !1) {                      // every popup calls this
 *     zr(() => Wg(n => e ? [t, ...n] : [...n, t]));    // onMount    -> add
 *     G(() => Wg(n => n.filter(r => r !== t)));         // onCleanup -> remove
 *   }
 *
 *   jc && Se(() => {
 *     const t = cd(n => ad(n, 160)),
 *       e = L(n => { const r = Ux().length > 0; return t() ? r : n }, !1);
 *     re(() => document.body.classList.toggle("lock-scroll", e()));
 *   });
 *
 * Three things in there are load-bearing and none of them are obvious:
 *
 * 1. `jc` is `Object.prototype.hasOwnProperty.call(window, "ontouchstart")` — isSupportTouch,
 *    and the effect above is not merely SKIPPED without it, it is never created. Read straight
 *    off the minified source that says a desktop never locks and the page keeps its scrollbar
 *    under every dialog.
 *
 *    THE LIVE SITE DISAGREES. Open a dialog there on a desktop and the page behind it loses
 *    its scrollbar and visibly grows into that 15px strip — the lock is running, and nothing
 *    compensates for the reflow. So the gate above is not what it looks like: whatever `jc`
 *    resolves to in the shipped bundle, the observable behaviour is "always lock", and this
 *    build reproduces the behaviour rather than the reading. The `isSupportTouch` read is gone
 *    rather than left dangling — an unread module-scope constant is exactly the thing a later
 *    reader reinstates a gate around.
 *
 *    That reflow is deliberate here, not tolerated. A `scrollbar-gutter: stable` on the root
 *    scoped to the locked state removes it completely and stood in index.css for one revision;
 *    it was taken out because holding the width is precisely what the original does NOT do.
 *    There is a comment at the `.lock-scroll` rule saying so, so the fix is not re-derived and
 *    re-applied later.
 *
 * 2. `ad(fn, 160)` is a trailing debounce and `cd()` wraps it into a gate that reads false
 *    until 160ms of quiet have passed, re-arming the timer on every read. The memo therefore
 *    holds its PREVIOUS value (`return t() ? r : n`) while the list is still settling. Net
 *    effect: the lock follows "is any dialog open" only once that answer has been stable for
 *    160ms — in BOTH directions. A dialog that opens and closes inside the window never locks
 *    at all, and closing one dialog to open another does not flash the scrollbar back in
 *    between. A plain `count > 0` toggle gets the steady state right and both of those wrong.
 *
 * 3. It toggles a CLASS, `.lock-scroll` (`overflow: hidden`, declared in index.css), rather
 *    than writing `body.style.overflow`. That matters for more than tidiness: an inline style
 *    has to remember and restore a previous value, and with two dialogs open at once the
 *    second one captures the first one's `hidden` as its "previous" and restores it on the way
 *    out — the page stays locked with nothing on screen. A class has no such state.
 *
 * That last trap was live in this codebase: RegionBlock owned a private copy of this effect
 * that set `body.style.overflow` on MOUNT and held it for its whole lifetime, so on any
 * touch-capable machine the region-block dialog killed the page scrollbar and, sitting at
 * z-1000 directly behind the z-1100 language dialog, looked exactly like the language dialog
 * had done it. Both now go through this registry instead.
 */

const SETTLE_MS = 160;

const openDialogs = new Set();
let settleTimer = null;
let locked = false;

function settle() {
  if (typeof document === 'undefined') return;
  if (settleTimer !== null) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    settleTimer = null;
    const next = openDialogs.size > 0;
    if (next === locked) return;
    locked = next;

    document.body.classList.toggle('lock-scroll', next);
  }, SETTLE_MS);
}

/* Registers a dialog as open for as long as `active` is true, and locks the page behind it on
   touch devices. Every dialog that renders OVER the page should call this — the lock is a
   property of "something is open", not of any one dialog. */
export default function useDialogScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    /* Identity only. The original keys its list on the popup's own object; a fresh token per
       mount does the same job and keeps two instances of one dialog from colliding. */
    const token = {};
    openDialogs.add(token);
    settle();
    return () => {
      openDialogs.delete(token);
      settle();
    };
  }, [active]);
}
