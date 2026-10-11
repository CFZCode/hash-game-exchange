import React from 'react';
import PopCenter from '../../shared/PopCenter';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import actionArt from '../../../assets/account-action.png';

/* "Account Restrictions" — the confirm bc.game puts in front of a password, e-mail or phone
 * change, and the only screen in this project that states a security measure the server has to
 * then actually take.
 *
 * ── WHERE IT COMES FROM ───────────────────────────────────────────────────────────────────────
 *
 * `E` in `index-CU_BJJlr.js` — the account remote's `userAction` FLOW MANAGER, not a route.
 * `ze([action, resolve])` switches over the eight `user-action` segments and each arm is a
 * promise; the password one is three lines:
 *
 *   function pe(r) {
 *     return !c.login || !c.passwordExist ||
 *       (C.bcke || await new Promise(t => { … push(E, {type:"password", onConfirm:t}) }))
 *       && r("/user-action/password-change"), !1
 *   }
 *
 * so the dialog is raised BY THE TILE and the route is only reached once it resolves true. That
 * is why this build raises it from `pages/Settings/Security` rather than from inside
 * `components/modals/UserAction`: a pasted `/user-action/password-change` URL skips it on the
 * original too, and moving the guard onto the route would be stricter than the thing it ports.
 *
 * `C.bcke` short-circuits the whole confirm — an app-shell flag, false on the web deploy.
 *
 * ── THE COPY IS THE i18n BUNDLE'S, TEMPLATE AND ALL ───────────────────────────────────────────
 *
 *   "account2.setting.protect.tips": "In order to protect your account safety,<1>we will disable
 *    your withdrawals for __restime__ hours</1>after you change your <3>__restype__</3>."
 *
 * `<1>` is `mx-1 font-semibold text-primary` and `<3>` is a bare `<span>`, which is what makes
 * the middle clause read white and semibold against the paragraph's secondary — exactly as the
 * reference shows. Note there is no space around either slot in the template: the `mx-1` on the
 * bold span IS the spacing, and "after you change your " carries its own trailing one.
 *
 * `ee(type)` is the hours: **48 for an e-mail or phone change, 24 for a password.** Only the
 * password arm is reachable in this build, because the other two flows need a code-issuing
 * endpoint that does not exist; `HOURS` below carries both so the day they land is a one-line
 * change rather than a rediscovery.
 *
 * ── AND IT IS TRUE HERE, WHICH TOOK A MIGRATION ───────────────────────────────────────────────
 *
 * The platform behind this build had no such rule — nothing froze withdrawals after a password
 * change, so porting this dialog alone would have put the first false promise in the project on
 * screen, about money. Migration 040 adds `users.withdraw_locked_until`, `AuthService
 * .changePassword` writes it in the same transaction as the password and the session revoke, and
 * BOTH withdrawal rails refuse inside the window. A dead CSS class is worth reproducing
 * faithfully; a lie about whether an attacker can drain the account is not.
 */

/* `ee(r)` — `r === "phone" || r === "email" ? "48" : "24"`. */
const HOURS = { password: 24, email: 48, phone: 48 };

/* The countdown on the Confirm button, so the dialog cannot be dismissed by reflex.
 *
 * `N(5e3)` and `<Countdown endTime={t()} onEnd={() => a(-1)}>` — the remote's `Countdown`
 * (`Countdown-D5Brw23E.js`) counts UP by 1000ms and reports `(endTime - elapsed) / 1000` split
 * into days/hours/minutes/seconds, so a 5000 `endTime` prints 5, 4, 3, 2, 1 and then fires
 * `onEnd`. This build's shared `CircleCountdown` is a different component — it draws a ring
 * around an absolute instant — so the five ticks are local here rather than forced through it.
 * Lift it the day a second call site wants a plain "(Ns)".
 */
function useCountdown(ms) {
  const [left, setLeft] = React.useState(ms);

  React.useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setTimeout(() => setLeft((value) => value - 1000), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  return Math.ceil(left / 1000);
}

export default function AccountRestrictions({ type = 'password', onCancel, onConfirm }) {
  const isDesktop = useIsDesktop();
  const seconds = useCountdown(5000);
  /* `s = (endTime - elapsed) / 1000` on the original, i.e. still counting while it is above zero
     — the button is `disabled: t() > 0` against the same signal. */
  const counting = seconds > 0;

  /* `size` is the Button component's job and not the call site's on the original
     (`t.size || !mobile && "m"`), so this is `.button`'s own 3rem on a phone and `.button-m`'s
     2.5rem from lg up — the same rule `Dropdown` and the whitelist form resolve. */
  const size = isDesktop ? 'button-m ' : '';

  return (
    /* `type: "center"` — centred at EVERY width, so it is not a bottom sheet on a phone. Its
       `close: !1` is not reproduced: on the original that stops a scrim click popping the dialog,
       and here dismissing is already the same outcome as Cancel (`onCleanup(() =>
       onConfirm(false))` is the chunk's own line), so the extra prop would buy one call site a
       distinction with no consequence. */
    <PopCenter open type="center" title="Account Restrictions" onClose={onCancel}>
      <div className="flex w-full flex-col items-center justify-center">
        <img alt="action" className="h-36 w-40" src={actionArt} />
        <p className="text-center text-secondary">
          In order to protect your account safety,
          <span className="mx-1 font-semibold text-primary">
            we will disable your withdrawals for {HOURS[type] ?? HOURS.password} hours
          </span>
          after you change your <span>{type}</span>.
        </p>
        <div className="mt-9 flex w-full items-center gap-3">
          <button
            type="button"
            className={`button button-second ${size}flex-1`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`button button-brand ${size}flex-1`}
            disabled={counting}
            onClick={onConfirm}
          >
            <span>Confirm</span>
            {/* `<span>(<!>s)</span>` — the chunk's own template, so the parentheses and the `s`
                are part of the label rather than a formatted duration. */}
            {counting && <span>({seconds}s)</span>}
          </button>
        </div>
      </div>
    </PopCenter>
  );
}
