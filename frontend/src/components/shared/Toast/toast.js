/* The toast queue — a store outside React, because the things that raise a toast are not always
 * components and never want to own the list.
 *
 * THIS BUILD HAS PUT ONE OFF THREE TIMES, and the note deferring it said to lift one the day a
 * second thing needed to say something. The Refer dialog's Copy confirmation is on the button
 * because of it, and the Referral tab's two Copy buttons write to the clipboard silently. The
 * Privacy rows are the third, and unlike the other two the toast is not a nicety there: the
 * switch and the message are one gesture on the original, and a switch that moves with no
 * confirmation is how a control that did nothing would also look.
 *
 * `Dx`/`s3` in index-BsFv7ByC.js is the same shape — a signal holding an array, with `push` and
 * `dismiss` as free functions rather than methods on a component. Two of its behaviours are
 * reproduced and are worth naming:
 *
 *   NEWEST FIRST. `s3(e => { const n = e.filter(r => r.type !== t.type); return [t, ...n] })` —
 *   a new toast goes to the FRONT, and one carrying the same `type` replaces the one already
 *   there rather than stacking beside it. That is what stops a switch flipped four times leaving
 *   four messages on screen.
 *
 *   DISMISS TAKES THE TOAST OR THE LAST ONE. `jg(t)` filters out the row it is given, defaulting
 *   to `n[n.length - 1]` — the OLDEST, since the list is newest-first.
 *
 * Not reproduced: `Lx`'s obfuscated anti-tamper snippet (a `TextDecoder` over XOR'd bytes
 * comparing `document.domain` on an idle callback), which is the same call Vault Pro's `ht` got.
 */

let toasts = [];
const listeners = new Set();

/* Monotonic, so React has a stable key even when two toasts carry the same message. Not a
   timestamp: two raised in the same millisecond would collide. */
let nextId = 1;

function emit() {
  for (const fn of [...listeners]) fn(toasts);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getToasts() {
  return toasts;
}

/**
 * Raise a toast.
 *
 * @param {string} message
 * @param {object} [options]
 * @param {string} [options.type]      replaces an existing toast of the same type, as `s3` does
 * @param {number} [options.duration]  ms before it dismisses itself; 0 keeps it until closed
 */
export function showToast(message, { type, duration = 3000 } = {}) {
  const id = nextId;
  nextId += 1;

  /* The same filter the original applies, and only when a type is given — an untyped toast
     stacks, which is what makes two unrelated confirmations both visible. */
  const rest = type ? toasts.filter((t) => t.type !== type) : toasts;
  /* An ABSOLUTE instant rather than a remaining duration, because the ring that counts it down
     is a one-shot to a point in time (`CircleCountdown`'s `endTime` mode) and a re-render must
     not restart it. Stamped once, here. */
  const expiresAt = duration > 0 ? Date.now() + duration : 0;
  toasts = [{ id, message, type, duration, expiresAt }, ...rest];
  emit();

  return id;
}

export function dismissToast(id) {
  /* `jg`'s default is the LAST entry, which in a newest-first list is the oldest one on screen. */
  const target = id ?? toasts[toasts.length - 1]?.id;
  if (target == null) return;

  toasts = toasts.filter((t) => t.id !== target);
  emit();
}
