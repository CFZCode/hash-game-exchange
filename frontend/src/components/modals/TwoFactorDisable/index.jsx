import React from 'react';
import PopCenter from '../../shared/PopCenter';
import Input from '../../shared/Input';
import { showToast } from '../../shared/Toast/toast';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { useSession } from '../../../context/session';
import { disableTwoFactor } from '../../../services/twoFactor';
import actionArt from '../../../assets/account-action.png';

/* Turning the second factor OFF — the Security pane's Disable 2FA arm.
 *
 * ── IT IS NOT A `user-action` ROUTE, WHICH IS WHY IT LOOKED MISSING ───────────────────────────
 *
 * `services/twoFactor.js` used to say there was "no unbind arm in the original's `:action` switch
 * to port a dialog from", which is true and was the wrong place to look. Disabling is a POPUP
 * raised by the flow manager, not a route: `ue()` in `index-CU_BJJlr.js` (the account remote's
 * `userAction` module, off `hash.game`) is
 *
 *   if (!login || !google2StepAuth) return false
 *   if (bcke || await <the confirm below>) {
 *     const {flowId, types} = await promisify_new("new-verify")({scenario: "STOP_GOOGLE_2FA"})
 *     if (types.length) await post("/account/google/2-step-auth/stop/v3/", {verifyTypes, verifyFlowId})
 *   }
 *
 * So: a confirm, then a generic verification, then the call. The confirm is `fe`, ported verbatim
 * below — same illustration, same two bullets, same five-second countdown on Confirm, same
 * `onCleanup(() => onConfirm(false))` so dismissing is a Cancel.
 *
 * ── THE SECOND STEP IS A FORM HERE, AND THAT IS A SHORTER PATH RATHER THAN A WEAKER ONE ───────
 *
 * `new-verify` is bc.game's own multi-channel prover — a passkey, an e-mail code or the 2FA code,
 * whichever the account has — and this build has none of its infrastructure. The platform's route
 * asks for exactly two things instead: `POST /user/2fa/disable {code, password}`, a current
 * authenticator code AND the account password. That is stricter than enrolment, which is the
 * right way round: the value of a second factor is that taking it off is harder than putting it
 * on. Legacy took neither — `{"uid": 123}` with no authentication turned off any player's.
 *
 * So the two-step shape is the original's and the proof is this platform's. The second step's two
 * labels and placeholders are unavoidably this build's, because that step has no counterpart to
 * copy — but they are the vocabulary the rest of the pane already uses ("Verification Code" from
 * `EmailVerify`, "Password" from the set-password chunk) rather than anything written fresh.
 */

/* `fe`'s own strings, both of them, in its order. */
const WARNING = 'Withdrawals will be disabled for 24 hours after you disable the 2FA.';
const ADVICE =
  '2FA gives good protection to your account and asset. We recommend that you keep using passkeys.';

/* `N(5e3)` — the same five-second arming the Account Restrictions confirm uses, and the same
   `Countdown` component on the original. Local for the same reason it is local there: this
   build's shared `CircleCountdown` draws a ring around an absolute instant, not a plain "(Ns)". */
function useCountdown(ms) {
  const [left, setLeft] = React.useState(ms);

  React.useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setTimeout(() => setLeft((value) => value - 1000), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  return Math.ceil(left / 1000);
}

export default function TwoFactorDisable({ onClose }) {
  const isDesktop = useIsDesktop();
  const { setAccountField } = useSession();
  const [step, setStep] = React.useState('confirm');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);

  /* `t.size || !mobile && "m"` — the Button component's own rule, resolved here because this
     project has no shared Button. Same line as the whitelist form and Account Restrictions. */
  const size = isDesktop ? 'button-m ' : '';

  const submit = async () => {
    if (!code || !password || pending) return;
    setPending(true);
    try {
      await disableTwoFactor({ code, password });
      /* The chunk's own success line, and its own store write: `j({google2StepAuth: !1})`. */
      setAccountField('google2StepAuth', false);
      showToast('Secondary authentication is disabled.', { type: 'success' });
      onClose();
    } catch (failure) {
      setPending(false);
      /* THE SERVER'S OWN MESSAGE. Its two refusals here — a wrong code and a wrong password —
         both already read well, and the auth dialog's note on `AUTH_MESSAGES` records why
         overriding one is a last resort rather than a habit. */
      setError(failure?.message || 'That did not work. Please try again.');
    }
  };

  if (step === 'confirm') return <Confirm size={size} onCancel={onClose} onConfirm={() => setStep('verify')} />;

  return (
    /* `type: "center"` on both steps — centred at every width rather than a phone sheet, which is
       what `fe` passes and what the second step inherits by being the same dialog. */
    <PopCenter open type="center" title="Disable 2FA" onClose={onClose}>
      <div className="w-full">
        {/* THE WARNING IS ON THE CONFIRM AND ONLY THERE, which is where `fe` puts it. It was
            repeated here as a `Notice` and that placement was this build's invention, not the
            chunk's — the original's second step is `new-verify`, a different dialog entirely. */}
        <p className="input-label">Verification Code</p>
        <Input
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError('');
          }}
          placeholder="6-digit verification code"
          className="bg-layer3"
        />

        <p className="mt-4 input-label">Password</p>
        <Input
          type="password"
          value={password}
          onChange={(next) => {
            setPassword(next);
            if (error) setError('');
          }}
          placeholder="Password"
          className="bg-layer3"
          autoComplete="current-password"
        />
        {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}

        <div className="mt-6 flex w-full items-center gap-3">
          <button type="button" className={`button button-second ${size}flex-1`} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`button button-brand ${size}flex-1`}
            disabled={!code || !password || pending}
            onClick={submit}
          >
            Disable
          </button>
        </div>
      </div>
    </PopCenter>
  );
}

/* `fe` — `<div class="w-full flex flex-col items-center justify-center">` over a `w-40 h-36`
   illustration, a `text-secondary text-center` block holding a two-item `<ul>`, and the button
   row at `mt-9`. Note the bullets are real list items on the original, not two paragraphs, and
   the text block carries no top margin of its own — the image's own height is the whole gap. */
function Confirm({ size, onCancel, onConfirm }) {
  const seconds = useCountdown(5000);
  const counting = seconds > 0;

  return (
    <PopCenter open type="center" title="Disable 2FA" onClose={onCancel}>
      <div className="flex w-full flex-col items-center justify-center">
        <img alt="action" className="h-36 w-40" src={actionArt} />
        <div className="text-center text-secondary">
          <ul>
            <li>{WARNING}</li>
            <li>{ADVICE}</li>
          </ul>
        </div>
        <div className="mt-9 flex w-full items-center gap-3">
          <button type="button" className={`button button-second ${size}flex-1`} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`button button-brand ${size}flex-1`}
            disabled={counting}
            onClick={onConfirm}
          >
            <span>Confirm</span>
            {counting && <span>({seconds}s)</span>}
          </button>
        </div>
      </div>
    </PopCenter>
  );
}
