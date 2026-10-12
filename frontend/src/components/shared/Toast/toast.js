/* The toast queue — `Br` in index-BsFv7ByC.js (exported as `F`, and handed to the federated
 * remotes as `_bc.hswzj.toast`), with its store `Dx`/`s3`, its push `Ix` and its dismiss `jg`.
 * A store outside React, because the things that raise a toast are not always components.
 *
 * READ OFF THE CURRENT DEPLOY, NOT THE MIRROR. `hash.game/assets/index-BsFv7ByC.js` was fetched
 * with a browser user-agent and the toast was raised on the live page through
 * `_bc.hswzj.toast`, so every default below was observed, not inferred:
 *
 *   Br(message, { duration = 7, onClick, system = false, type = "error", countdown = true,
 *                 icon, class })
 *
 *   THE DEFAULT TYPE IS "error". A bare `F(o("Copied"))` — which is how the clipboard helper,
 *   the Refer dialog and the referral tabs all confirm a copy — is an error-TYPED toast with no
 *   icon. The type is only a dedupe key: the icon comes from the `.success` / `.error` /
 *   `.warning` wrappers, never from the type. Raising "Copied" on the live page replaced an
 *   `F.error(...)` already on screen, which is the proof.
 *
 *   DURATION IS IN SECONDS and defaults to 7 — the countdown ring is a `motion` animation over
 *   `duration` seconds. `0` means no ring and no timer: the toast waits for its cross.
 *
 *   NEWEST FIRST, ONE PER TYPE. `s3(e => [t, ...e.filter(r => r.type !== t.type)])`.
 *
 *   DISMISS TAKES THE TOAST OR THE LAST ONE — `jg(t)` defaults to `n[n.length - 1]`, the oldest.
 *
 *   AN ERROR OBJECT IS UNWRAPPED. `t instanceof Error` goes to `Br.error(t.message)`, unless its
 *   `code` is one of `Nx` — the KYC / verification gates, which open their own dialog instead.
 *
 *   DO NOT DISTURB SILENCES EVERYTHING BUT AN ERROR. `if (xe.setting.noDisturb && e?.type !==
 *   "error") return` — and it tests the type the CALLER passed, before the "error" default is
 *   applied, so a bare `F("Copied")` is silenced too. Only `.error` (and an explicit
 *   `{ type: "error" }`) gets through.
 *
 * Not reproduced: `Lx`'s obfuscated anti-tamper snippet, and `system`, which nothing reads.
 */

/* `Nx` — the codes whose Error is swallowed rather than toasted. */
const SILENT_CODES = [6008, 6101, 6102, 6103, 6104, 6105, 6106, 6107, 6108, 6109, 6110, 6111, 6114, 6115, 6116, 6012];

let toasts = [];
const listeners = new Set();

/* Monotonic, so React has a stable key even when two toasts carry the same message. */
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

/* `xe.setting.noDisturb` — the header's Do Not Disturb switch, which lives in the session's
   persisted `account` record. Read straight off that record because this store sits outside
   React and must not import the session provider. Any failure reads as "not set". */
function noDisturb() {
  try {
    const raw = localStorage.getItem('account');
    return Boolean(raw && JSON.parse(raw)?.setting?.noDisturb);
  } catch {
    return false;
  }
}

/**
 * Raise a toast — `F(message, options)` on the original.
 *
 * @param {string|Error} message
 * @param {object}  [options]
 * @param {number}  [options.duration=7]     seconds; 0 keeps it until its cross is pressed
 * @param {string}  [options.type="error"]   dedupe key — a new toast replaces one of the same type
 * @param {boolean} [options.countdown=true] draw the ring (the timer runs either way)
 * @param {Function}[options.onClick]
 * @param {string}  [options.class]          extra class on `.toast`
 */
export function toast(message, options = {}) {
  if (message instanceof Error) {
    return SILENT_CODES.includes(message.code) ? '' : toast.error(message.message, options);
  }
  if (noDisturb() && options.type !== 'error') return undefined;

  const { duration = 7, onClick, type = 'error', countdown = true, variant, class: className } = options;

  const id = nextId;
  nextId += 1;

  toasts = [
    { id, message, type, duration, countdown, onClick, variant, className },
    ...toasts.filter((t) => t.type !== type),
  ];
  emit();
  return id;
}

/* The three wrappers. Each forces its own `type` (`ue(U({}, e), { type: "success" })`) and puts
   its icon in front of the message; the icon itself is drawn by the layer. */
toast.error = (message, options) => toast(message, { ...options, type: 'error', variant: 'error' });
toast.success = (message, options) => toast(message, { ...options, type: 'success', variant: 'success' });
toast.warning = (message, options) => toast(message, { ...options, type: 'warning', variant: 'warning' });

/* `toast-BuAidQS6.js` — the bonus pages' wrapper (redeem, claim, Claim All). The same three
   variants with the ring switched off and the toast tinted, so its cross is always showing:
   `countdown: !1, class: "bonus-scope toast-gradient [&>div]:items-center"`. Its success and
   warning carry a brand-coloured icon of their own on the original; `.error` keeps the shared
   one, and its Error unwrap is `e[0] instanceof Error ? e[0].message : e[0]`. */
const BONUS = { countdown: false, class: 'bonus-scope toast-gradient [&>div]:items-center' };
export const bonusToast = (message, options) => toast(message, { ...options, ...BONUS });
bonusToast.error = (message, options) =>
  toast.error(message instanceof Error ? message.message : message, { ...options, ...BONUS });
bonusToast.success = (message, options) => toast.success(message, { ...options, ...BONUS });
bonusToast.warning = (message, options) => toast.warning(message, { ...options, ...BONUS });

/**
 * The older entry point, kept so existing call sites keep working.
 *
 * `{ type: 'success' | 'error' | 'warning' }` meant "that kind of message" here, so it maps to
 * the matching wrapper and its icon. Any other `type` is a plain dedupe key, as on the original.
 * `duration` was milliseconds in this signature and is converted.
 */
export function showToast(message, { type, duration, ...rest } = {}) {
  const options = { ...rest };
  if (duration != null) options.duration = duration / 1000;
  if (type === 'success' || type === 'error' || type === 'warning') return toast[type](message, options);
  return toast(message, type ? { ...options, type } : options);
}

/* `F(e)` with an API failure — `services/client.js` rejects with a plain object carrying the
   server's `code` and `message`, not an Error, so this is the same unwrap for that shape. */
export function toastError(failure, fallback) {
  if (failure && typeof failure === 'object' && SILENT_CODES.includes(failure.code)) return '';
  const message = failure?.message || fallback;
  return message ? toast.error(String(message)) : undefined;
}

export function dismissToast(id) {
  /* `jg`'s default is the LAST entry, which in a newest-first list is the oldest one on screen. */
  const target = id ?? toasts[toasts.length - 1]?.id;
  if (target == null) return;

  toasts = toasts.filter((t) => t.id !== target);
  emit();
}
