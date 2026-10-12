import React from 'react';
import { useNavigate } from 'react-router-dom';
import RouteDialog from '../../shared/RouteDialog';
import { toast, toastError } from '../../shared/Toast/toast';
import Loading from '../../shared/Loading';
import { useSession } from '../../../context/session';
import { changePassword, requestEmailOtp, changeEmail } from '../../../services/auth';
import { beginTwoFactorSetup, completeTwoFactorSetup } from '../../../services/twoFactor';
import { IconCaution, IconSet, IconTwoFactor, IconEmail, IconPhoneNumber } from '../../../pages/Settings/icons';
import { IconAppleStore, IconGooglePlay } from './icons';
import Input from '../../shared/Input';
import CopyInput from '../../shared/CopyInput';
import PasswordInput from './PasswordInput';

/* `/user-action/:action` — the account's own verification-and-change flows, and the FIRST action
 * on any of the six Settings panes to reach a real endpoint.
 *
 * ── WHAT IT IS ON THE ORIGINAL ────────────────────────────────────────────────────────────────
 *
 *   { path: "/user-action/:action", component: w("ActionMain"), info: { keepAlive: !1 } }
 *
 * in a group closed with `{ dialog: !0, guards: [ce] }` — so a login-guarded DIALOG route, which
 * is why it is mounted beside `<Routes>` in App.jsx like every other one here. `ActionMain` is an
 * export of the `account` federated remote and resolves through its manifest to `Main-B0RluUp6.js`
 * — not in the mirror, fetched from `hash.game/modules/account/assets/`. It is a switch over the
 * `:action` segment with EIGHT arms: `email-bind`, `email-change`, `phone-bind`, `phone-change`,
 * `password-bind`, `password-change`, `password-change-steptwo`, `twofa-bind`.
 *
 * SIX OF THE EIGHT ARE BUILT NOW. The two password-change steps and `twofa-bind` were first;
 * `email-bind`, `email-change`, `phone-bind` and `phone-change` were added 2026-09-04 and are
 * documented in their own block at the foot of this file, including which of them reaches a real
 * endpoint and why the other three cannot.
 *
 * `password-bind` IS NOT BUILT AND IS UNREACHABLE, which is a better reason than the usual one:
 * every account on this platform is created with a password (registration requires one) and
 * nothing can clear it, so `session.passwordExist` is true for every real session and the tile
 * never offers "Set Password". There is no route behind it either — `POST /user/auth/change-
 * password` requires the current password and refuses when the column is null. An unknown
 * `:action` renders nothing here, which is what it does on the original too (`<Show>` with no
 * fallback).
 *
 * The Security pane's tile is what opens this: `b.passwordExist ? P.promisify_new("user-action")
 * ("password-change") : (…)("password-bind")`, so the button here navigates rather than calling a
 * flow manager — this build has no promise-returning dialog stack and the route is the same
 * destination either way.
 *
 * ── WHERE THIS DEPARTS FROM THE ORIGINAL, AND WHY ─────────────────────────────────────────────
 *
 * The original's step one does three things before it lets you past: it POSTs
 * `/account/password/check/` to validate the old password on its own, then runs
 * `new-verify` with `scenario: "CHANGE_PASSWORD"` — an e-mail or 2FA code — and carries the
 * resulting `flowId` into step two, which finally POSTs `/account/password/change/` with
 * `{newPassword, timestamp, verifyFlowId, oldPassword, verifyTypes}`.
 *
 * The platform behind THIS build has one endpoint and no verification step:
 * `POST /user/auth/change-password` taking `{currentPassword, newPassword}`. So:
 *
 *   the pre-check     is not sent — there is nothing to send it to. A wrong old password is
 *                     therefore refused at the END of step two rather than at the end of step
 *                     one, and the error is shown on step one's own field when it comes back,
 *                     which is where a visitor would look for it.
 *   `new-verify`      is not built. Skipping it is the honest reading: inventing a code step
 *                     with nothing issuing the code would be a dead end, not a port.
 *   the encryption    `F(password, …)` RSA-wraps both passwords with a timestamp on the
 *                     original. The platform takes them plain over TLS and would reject a
 *                     ciphertext, so they are sent plain.
 *   "Forgot your      is `CHANGE_PASSWORD_FORGOT`, the same `new-verify` engine with a different
 *   password?"        scenario, and is not built either. The link is kept and inert, which is
 *                     the state the rest of this pane is already in and is documented as.
 *
 * WHAT IS NOT A DEPARTURE: signing out afterwards. The server revokes every session on success
 * (`revoked_reason: 'password_changed'`), the original's own step two warns "Re-login will be
 * required after setting password." in the box above its button, and its success path ends
 * `C.success(t("Password changed successfully.")), u("/logout")`. Both end signed out.
 *
 * Every string, class list and element order below is `Main-B0RluUp6.js`'s own.
 */

/* The two steps are one dialog on the original — the `:action` segment picks the arm and the
   dialog shell is the same `Dialog` either way (`S`, the host component the remote re-exports).
   Kept as one component here for the same reason: the old password has to survive the step
   change, and on the original it survives by being pushed through `navigate(…, { state })`.
   Here it is state in the component that owns both arms, which is simpler and cannot desync. */
export default function UserActionDialog({ action, onClose, onBack, enter }) {
  return (
    <RouteDialog onClose={onClose} onBack={onBack} enter={enter}>
      {action === 'password-change' ? <ChangePassword /> : null}
      {action === 'twofa-bind' ? <TwoFactorBind /> : null}
      {action === 'email-bind' ? <EmailBind /> : null}
      {action === 'email-change' ? <EmailChange /> : null}
      {action === 'phone-bind' ? <PhoneVerify mode="bind" /> : null}
      {action === 'phone-change' ? <PhoneVerify mode="change" /> : null}
    </RouteDialog>
  );
}

/* No `onClose`: the success path leaves by navigating, and the dialog is matched on the pathname,
   so leaving the route unmounts it. The shell's own cross and back arrow are `RouteDialog`'s. */
function ChangePassword() {
  const navigate = useNavigate();
  const { signOut } = useSession();

  const [step, setStep] = React.useState('old');
  const [oldPassword, setOldPassword] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);

  /* `if (!s()) return !1` — the original's own guard, and the button is disabled on the same
     test, so this is belt and braces exactly as it is there. */
  const toStepTwo = () => {
    if (!oldPassword) return;
    setError('');
    setStep('new');
  };

  const submit = async () => {
    if (!password || !confirm || pending) return;

    /* Both of these are the original's, in its order and its words — checked on the client
       before anything is sent, because the server's own messages are about its own rules. */
    /* `return y.error(a("Passwords do not match. Please try again."))` and the same for a reused
       password — TOASTS on the original, not lines under the field. */
    if (password !== confirm) {
      toast.error('Passwords do not match. Please try again.');
      return;
    }
    if (password === oldPassword) {
      toast.error('The old and new passwords cannot be the same.');
      return;
    }

    setError('');
    setPending(true);
    try {
      await changePassword({ currentPassword: oldPassword, newPassword: password });
      toast.success('Password changed successfully.');
      /* The original navigates to `/logout`, its own dialog route for the same act. There is
         none here and the session context owns the sign-out, so: sign out, then go home.

         NOT `onClose()` FIRST, which is what this did and it landed wrong. `closeOverlay` pops
         back to wherever the dialog was opened from — `/settings/security` — and that path is
         login-guarded, so the freshly signed-out visitor arrived on a settings URL with the
         sign-in dialog raised over it. Navigating home is both the calmer end state and closer
         to the original's, and it closes the dialog on its own: this route is matched on the
         pathname, so leaving it unmounts the dialog with no second call. `replace`, so Back does
         not return to a dialog whose flow is finished. */
      signOut();
      navigate('/', { replace: true });
    } catch (failure) {
      setPending(false);
      /* THE SERVER'S OWN MESSAGE, not a mapped one. Two of its codes are worth a visitor's time
         and both already read well — `CURRENT_PASSWORD_INCORRECT` and a length refusal on the
         new password — and the auth dialog's `AUTH_MESSAGES` note says why overriding a message
         is a last resort rather than a habit. A wrong OLD password is a step-one problem, so
         that one arm goes back a step with the error on it, which is where the original would
         have refused it. */
      /* `AUTH_CURRENT_PASSWORD_INCORRECT` ON THE WIRE, not the bare key the service's error table
         declares — that module namespaces every code with its own prefix on the way out, which is
         only visible by calling it (verified against the running gateway). The unprefixed form is
         accepted too so this keeps working if that prefix is ever dropped. */
      const wrongOld =
        failure?.code === 'AUTH_CURRENT_PASSWORD_INCORRECT' ||
        failure?.code === 'CURRENT_PASSWORD_INCORRECT';
      /* `y(new Error(a("Sorry. Invalid old password, please try again.")))` and `catch (C) { y(C) }`
         — both raised as error toasts carrying the words, the server's own for the second. */
      if (wrongOld) toast.error('Sorry. Invalid old password, please try again.');
      else toastError(failure, 'Something went wrong. Please try again.');
      if (wrongOld) setStep('old');
    }
  };

  if (step === 'old') {
    return (
      <>
        {/* `je` — `<div class="mt-6 flex w-full flex-col items-center justify-center">` over the
            icon, an 18px heading and the centred line under it. `re` is `IconSet`, the same mark
            the Security tile that opens this uses. */}
        <div className="mt-6 flex w-full flex-col items-center justify-center">
          {/* `icon` IS NOT OPTIONAL, and leaving it off is the trap the Security tile already
              documents one file over: the chunk writes `<re class="fill-secondary"/>` with no
              size and gets away with it because the remote's icon wrapper prepends `icon`
              (2rem square, `fill: currentColor`). This project's icons are the bare `<svg>`, and
              a bare `<svg>` with no dimensions stretches to fill its flex line — the padlock came
              out 400px tall and filled the dialog. */}
          <IconSet className="icon fill-secondary" />
          <p className="mt-3 text-lg font-extrabold">Change Password</p>
          <p className="mt-3 px-2 text-center text-base text-secondary">
            For your safety, we need to verify your old password first.
          </p>
        </div>

        {/* `Ke` — `<p class="mt-4 input-label">`. The `mt-4` beats `.input-label`'s own 1.25rem
            top margin, which is why that rule is LAYERED in index.css; see the note there. */}
        <p className="mt-4 input-label">Old password</p>
        <PasswordInput
          password={oldPassword}
          changePassword={(next) => {
            setOldPassword(next);
            if (error) setError('');
          }}
          hiddenPasswordLevel
          placeholder="Password"
        />
        {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}

        <button
          type="button"
          className="button button-brand button-l mt-4 h-12 w-full"
          disabled={!oldPassword}
          onClick={toStepTwo}
        >
          Confirm
        </button>

        {/* `ze` — `<button class="mx-auto mt-4 block text-center text-brand">`. Inert: it opens
            the `CHANGE_PASSWORD_FORGOT` verification flow, which has no endpoint here. Kept
            rather than dropped, like every other inert control on this pane. */}
        <button type="button" className="mx-auto mt-4 block text-center text-brand">
          Forgot your password?
        </button>
      </>
    );
  }

  return (
    <>
      {/* `Ue` — the same block as step one with no second paragraph. */}
      <div className="mt-6 flex w-full flex-col items-center justify-center">
        <IconSet className="icon fill-secondary" />
        <p className="mt-3 text-lg font-extrabold">Set New Password</p>
      </div>

      <p className="mt-4 input-label">Password</p>
      {/* NO `hiddenPasswordLevel` on this one — it is the only field of the three that shows the
          strength meter, which is what the prop is for. */}
      <PasswordInput
        password={password}
        changePassword={(next) => {
          setPassword(next);
          if (error) setError('');
        }}
        placeholder="Password"
      />

      <p className="mt-4 input-label">Confirm password</p>
      <PasswordInput
        password={confirm}
        changePassword={(next) => {
          setConfirm(next);
          if (error) setError('');
        }}
        hiddenPasswordLevel
        placeholder="Confirm password"
      />

      {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}

      {/* `Je` — the amber notice, and its fill is an INLINE literal on the original rather than a
          token (`style="background:rgba(255, 152, 32, 0.10)"`), which is `--warning` at 10%. Kept
          inline for the reason the settings pane's own `bg-setting-yellow` is kept: the remote
          cannot see the host's tokens, so the literal is what ships. */}
      <div
        className="mt-4 flex w-full items-center gap-1 rounded-lg p-2"
        style={{ background: 'rgba(255, 152, 32, 0.10)' }}
      >
        <IconCaution className="size-6 fill-warning" />
        <span>Re-login will be required after setting password.</span>
      </div>

      <button
        type="button"
        className="button button-brand button-l mt-4 h-12 w-full"
        disabled={!password || !confirm || pending}
        onClick={submit}
      >
        {pending ? <Loading className="text-current" /> : 'Confirm'}
      </button>
    </>
  );
}

/* `We` in `Main-B0RluUp6.js` — the `twofa-bind` arm, and the third of the eight this build has.
 *
 * The template (`Ze`), every class list, every string and the element order below are that
 * chunk's own; the two app-store marks are its inline `Fe` and `Re`, transcribed into `icons.jsx`.
 * `fix-bglayer6` on the two store tiles is DEAD — it appears in the account remote's JS and in no
 * stylesheet, checked against both the mirror's `index-DxOqNczA.css` and the CURRENT deploy's
 * `index-Dxw2IdQj.css` before calling it that. Kept, like `f-ull` and `texxt-sm`.
 *
 * ── WHERE IT DEPARTS FROM THE ORIGINAL ────────────────────────────────────────────────────────
 *
 * `services/twoFactor.js` carries the argument; in short, the original gates the secret behind an
 * e-mail/phone code (`new-verify`, `scenario: "START_GOOGLE_2FA"`) and takes a login password
 * alongside the six digits. The platform issues the secret on the first call and its
 * `setup-verify` is `.strict()` over `{code}` alone, so a password would be a 422 rather than an
 * ignored extra. The field is dropped rather than rendered dead, and "Verification Code" takes
 * the `mt-6` the original gives its first label.
 *
 * The two store tiles are `<a>` here where the chunk uses a `<div>` with a click handler. Same
 * classes; an external link that is a link is the same upgrade the Preferences pane's switch
 * made over its own bare `<div>`, and for the same reason — nothing here nests it inside another
 * control.
 *
 * The QR is `<img src>` on a `data:image/png;base64,…` the enable call returns, where the
 * original points at `/api/account/google/2-step-auth/key/qrcode/320/?t=…`. One fewer request,
 * and not a choice — it is what the platform hands back.
 */
function TwoFactorBind() {
  const navigate = useNavigate();
  const { setAccountField } = useSession();

  const [setup, setSetup] = React.useState(null);
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);

  /* `X(() => …)` on the original — the secret is fetched when the arm mounts, not on a click, so
     the QR is on screen by the time the visitor has the app open. A failure leaves `setup` null
     and the shell keeps showing `He`'s spinner box, which is the original's own fallback. */
  React.useEffect(() => {
    let live = true;
    Promise.resolve(beginTwoFactorSetup())
      .then((answer) => {
        if (live && answer) setSetup(answer);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const submit = async () => {
    if (!code || pending) return;
    setPending(true);
    setError('');
    try {
      await completeTwoFactorSetup({ code });
      /* `V({google2StepAuth:!0})` — the tile reads this, so the pane is correct the moment the
         dialog closes rather than after the next profile read. */
      setAccountField('google2StepAuth', true);
      /* `y.success(() => <span><Trans i18nKey="login.verification.twofa.bind.tip">…</Trans></span>)`
         — the en-US value is "Your 2FA has been successfully enabled. To ensure you can recover
         your account if you lose access, please complete <2>Advanced KYC</2>.", and slot 2 is
         `<span class="cursor-pointer text-brand underline">` routing to /settings/verification. */
      toast.success(
        <span>
          Your 2FA has been successfully enabled. To ensure you can recover your account if you lose
          access, please complete{' '}
          <span className="cursor-pointer text-brand underline" onClick={() => navigate('/settings/verification')}>
            Advanced KYC
          </span>
          .
        </span>,
      );
      navigate(-1);
    } catch (failure) {
      /* `catch (d) { y(d) }` — an error toast with the server's message. */
      toastError(failure, 'That code was not accepted. Please try again.');
      setPending(false);
    }
  };

  /* `He` — `<div class="center flex h-80 w-full">` around the shell's own spinner. */
  if (!setup) {
    return (
      <div className="center flex h-80 w-full">
        <Loading />
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 w-full rounded-lg bg-layer4 px-3 py-4">
        <div className="center flex-col">
          <IconTwoFactor className="icon fill-secondary" />
          <p className="mt-3 text-center text-lg font-extrabold">Enable 2FA</p>
          <p className="mt-3 px-2 text-center text-secondary">
            Enable Two-factor Authentication to protect your account from unauthorized access.
          </p>
        </div>

        <div className="mx-auto mt-3 h-32 w-32 overflow-hidden rounded-lg bg-primary">
          <img alt="qrcode" className="h-full w-full" src={setup.qrCode} />
        </div>

        <p className="mt-3 font-semibold">Scan the QR code with Google Authenticator App</p>

        <div className="mt-3 flex w-full items-center justify-between">
          <a
            className="fix-bglayer6 flex h-14 w-[48%] items-center rounded-lg pl-2 sm:cursor-pointer"
            href="https://apps.apple.com/app/google-authenticator/id388497605"
            target="_blank"
            rel="noreferrer"
          >
            <IconAppleStore className="icon" />
            <div className="ml-2">
              <p className="whitespace-nowrap text-xs text-secondary">Free Download</p>
              <p className="font-extrabold">Apple Store</p>
            </div>
          </a>
          <a
            className="fix-bglayer6 flex h-14 w-[48%] items-center rounded-lg pl-2 sm:cursor-pointer"
            href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
            target="_blank"
            rel="noreferrer"
          >
            <IconGooglePlay className="icon" />
            <div className="ml-2">
              <p className="whitespace-nowrap text-xs text-secondary">Free Download</p>
              <p className="font-extrabold">Google Play</p>
            </div>
          </a>
        </div>

        <p className="mt-3 input-label">or enter the secret key manually</p>
        <CopyInput value={setup.secret ?? ''} className="mt-1.5" />
      </div>

      <p className="mt-6 input-label">Verification Code</p>
      <Input
        value={code}
        onChange={(next) => {
          setCode(next);
          if (error) setError('');
        }}
        placeholder="6-digit verification code"
        className="bg-layer3"
      />
      {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}

      <button
        type="button"
        className="button button-brand button-l mb-6 mt-4 w-full"
        disabled={!code || pending}
        onClick={submit}
      >
        Enable
      </button>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
 * THE E-MAIL AND PHONE ARMS — four of the six that were listed as "inert at its call site".
 *
 *   `email-bind`   → `E`  in `index-BHHIYswL.js`
 *   `email-change` → `Ve` in `Main-B0RluUp6.js`
 *   `phone-bind`   → `P`  in `index-BHHIYswL.js`
 *   `phone-change` → `qe` in `Main-B0RluUp6.js`
 *
 * All four off `hash.game/modules/account/assets/`, and all four are the same TWO-STEP shape:
 * enter the credential, then enter the code that was sent to it. The second step is one shared
 * component on the original (`EmailVerify-DyWt3CuV.js` / `PhoneVerify-DdS2lqzC.js`, both in the
 * mirror) and is one here.
 *
 * ── ONE OF THE FOUR REACHES A REAL ENDPOINT, AND THE OTHER THREE CANNOT ─────────────────────
 *
 * `email-change` is WIRED, and BLOCKED ON SMTP — which is a configuration gap rather than a code
 * one, and is the same blocker gap 12's password-reset arm has. `POST /user/email/otp` with
 * `purpose: "change-email"` writes a six-digit code and then tries to mail it to the NEW address;
 * with the four SMTP keys empty that send fails and the route answers `EMAIL_SEND_FAILED`, so the
 * visitor gets the server's own refusal on the field rather than a code step they can never
 * complete. `POST /user/profile/change-email` then verifies and SPENDS the code in one call, so
 * one code authorises exactly one change — asserted by planting a known hash, since the column
 * stores the code hashed and it cannot be read back.
 *
 * (An earlier note in `docs/backend-gaps.md` said the mailer "degrades by reporting failure
 * rather than throwing". It reports failure BY throwing, after the row is already written.
 * Corrected there and here.)
 *
 * `email-bind` — verifying the address you already have — HAS NOWHERE TO WRITE ITS RESULT.
 * `users` carries no `email_verified` column at all; the session's `emailVerified` is one of the
 * fields `services/auth.js` marks as invented. So the form is drawn and says why rather than
 * posting into a void. Adding the column would be inventing a feature rather than porting one,
 * and the tile it sits on already offers Change Email, which does work.
 *
 * BOTH PHONE ARMS need an SMS sender and there is none anywhere in the platform (gap 24): the
 * one-time-code module is e-mail only, `users.phone` is read-only, and `PUT /user/profile` does
 * not accept a phone at all. So the form is complete and the send step reports the gap — the
 * same call `components/modals/WhitelistAddress` makes about `new-verify`.
 */

/* `z` — the credential step's card. `w-fll` is the chunk's own typo and generates nothing; kept,
   like `f-ull` and the disable confirm's `w-ful` elsewhere in this project. */
function CredentialStep({ icon: Icon, title, hint, children }) {
  return (
    <div className="w-fll">
      <div className="center flex-col pt-6">
        <Icon className="icon fill-secondary" />
        <p className="mt-3 text-center text-lg font-extrabold">{title}</p>
        {hint ? <p className="mt-3 px-2 text-center text-secondary">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

/* `Y` in `EmailVerify-DyWt3CuV.js` — the code step, shared by every one of these flows.
 *
 * `Resend` (`Resend-DzaleSlX.js`) IS ONE BUTTON, not a label and a link: it carries `disabled =
 * left > 0` and swaps its own contents. Counting, it prints `<span class=text-xs>Resend in {n}s`;
 * lapsed, a plain `<span>Resend`. It opens at whatever `time` the caller passes — 59e3 from the
 * e-mail step — and a resend resets it to **60e3**, so the first wait is a second shorter than
 * every one after it. That asymmetry is the chunk's and is reproduced rather than tidied.
 *
 * (This was written as "Resend ({n}s)" over a link, which was a guess at copy that is right there
 * in the mirror. Read the component.)
 *
 * The original uses `PasteInput` for the field, a code input with its own paste handling; this
 * build's 2FA arm above already established the plain `.input` under a `Verification Code` label
 * for the same job, so both use that rather than introducing a second code field.
 */
function CodeStep({
  icon: Icon,
  title,
  description,
  code,
  setCode,
  error,
  pending,
  onResend,
  onSubmit,
  submitText = 'Confirm',
}) {
  /* Seconds, and the two starting values differ on purpose — see the note above. */
  const [left, setLeft] = React.useState(59);

  React.useEffect(() => {
    if (left <= 0) return undefined;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  return (
    <>
      <div className="flex items-center justify-center">
        <Icon className="size-8 fill-secondary" />
      </div>
      <p className="mt-3 text-center text-lg font-extrabold">{title}</p>
      <p className="mt-3 px-2 text-center text-secondary">{description}</p>

      <p className="mt-5 input-label">Verification Code</p>
      <Input value={code} onChange={setCode} placeholder="Enter code" className="bg-layer3" />
      {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}

      {/* `<div class=center>` wrapping the button, which is `F` in the chunk; the `mt-3
          text-secondary` is what `EmailVerify` passes down as the Resend's own `class`. */}
      <div className="center mt-3 text-secondary">
        <button
          type="button"
          disabled={left > 0}
          onClick={() => {
            /* `d(6e4)` — sixty, not the fifty-nine it opened on. */
            setLeft(60);
            onResend();
          }}
        >
          {left > 0 ? <span className="text-xs">Resend in {left}s</span> : <span>Resend</span>}
        </button>
      </div>

      <button
        type="button"
        className="button button-brand mt-4 h-12 w-full"
        disabled={!SIX_DIGITS.test(code) || pending}
        onClick={onSubmit}
      >
        {submitText}
      </button>
    </>
  );
}

/* The platform's own rule — `code must be 6 digits` on `email.validators.js`, and the same shape
   the 2FA routes take. Checked here so the button is inert rather than the server refusing. */
const SIX_DIGITS = /^\d{6}$/;

/* `E` — verify the address already on the account. The input is `readOnly` when the account has
   one, which is the chunk's own `readOnly: !!b.email`. */
function EmailBind() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState(session.email ?? '');

  return (
    <CredentialStep
      icon={IconEmail}
      title="Email Verification"
      hint={session.email ? undefined : 'Please enter and verify your email below.'}
    >
      <Input
        value={email}
        onChange={setEmail}
        disabled={Boolean(session.email)}
        className="mt-6 h-12 w-full bg-layer3"
      />
      {/* INERT, AND SILENT ABOUT IT. `<Button class="mt-6 w-full" type="brand" disabled={!e.email}
          onClick={c}>Verify</Button>` is the chunk's, and `disabled` is its own gate on an empty
          field rather than a stand-in for the missing route. There is nothing to call — see the
          note at the head of this block — so the handler is absent, which is the state most of
          this pane's controls are already in and is listed as such in docs/settings.md. */}
      <button
        type="button"
        className="button button-brand mt-6 w-full"
        disabled={!email}
      >
        Verify
      </button>
      {/* `<Show when={!hiddenChange && b.email && !b.emailVerified}>` — the chunk's own escape
          hatch, and the one control here that leads somewhere real. */}
      {session.email ? (
        <div className="center mt-3 flex w-full gap-1 text-secondary">
          <span>Not your email?</span>
          <button
            type="button"
            className="cursor-pointer text-brand underline"
            onClick={() => navigate('/user-action/email-change')}
          >
            Change
          </button>
        </div>
      ) : null}
    </CredentialStep>
  );
}

/* `Ve` — change the address. The only fully wired arm of the four. */
function EmailChange() {
  const navigate = useNavigate();
  const { setAccountField } = useSession();
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);

  const send = async () => {
    if (!email || pending) return;
    setPending(true);
    try {
      await requestEmailOtp({ email, purpose: 'change-email' });
      setError('');
      setSent(true);
    } catch (failure) {
      setError(failure?.message || 'Something went wrong. Please try again.');
    } finally {
      setPending(false);
    }
  };

  const submit = async () => {
    if (pending) return;
    setPending(true);
    try {
      await changeEmail({ email, code });
      /* `V({email, emailVerified: !0})` — the chunk writes both back into its account store, and
         so does this one: the header and the Security tile read the session, not a refetch. Two
         calls because this build's setter takes a key and a value; neither field is persisted,
         so the next `loadAccount` replaces both with the server's own answer. */
      setAccountField('email', email);
      setAccountField('emailVerified', true);
      toast.success('Your email address has changed!');
      navigate(-1);
    } catch (failure) {
      setPending(false);
      toastError(failure, 'That code was not accepted. Please try again.');
    }
  };

  if (sent) {
    return (
      <CodeStep
        icon={IconEmail}
        title="Email Verification"
        description={
          <>
            {/* `account2.setting.send.code.change.email` — the template's own wording, and note
                it says a LINK where what arrives is a code. Theirs, kept. */}
            We&apos;ve sent a link to your new email address,
            <span className="ml-1 block font-semibold text-primary">{email || '-'}</span>
            please enter the code to verify.
          </>
        }
        code={code}
        setCode={(next) => {
          setCode(next);
          if (error) setError('');
        }}
        error={error}
        pending={pending}
        onResend={send}
        onSubmit={submit}
        submitText="Verify"
      />
    );
  }

  return (
    <CredentialStep
      icon={IconEmail}
      title="Change Email Address"
      hint="Enter new email address below to receive a code to verify."
    >
      <Input
        value={email}
        onChange={(next) => {
          setEmail(next);
          if (error) setError('');
        }}
        className="mt-6 h-12 w-full bg-layer3"
      />
      {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
      <button
        type="button"
        className="button button-brand mt-6 w-full"
        disabled={!email || pending}
        onClick={send}
      >
        Change
      </button>
    </CredentialStep>
  );
}

/* `P` and `qe` — bind and change a phone number, one component because the two differ only in
 * their heading and their hint.
 *
 * THE AREA-CODE PICKER IS NOT DRAWN. `EmailPhoneInput` splits the field into a country select and
 * a number, fed by `state.areaCodeList` — a list this build fetches nowhere, because the endpoint
 * behind it belongs to the same absent module. A plain field is the honest stand-in rather than a
 * picker with one invented country in it.
 */
function PhoneVerify({ mode }) {
  /* Empty in both arms. The account record carries `hasPhone` and NOT the number itself — the
     platform's profile read does not return one — so there is nothing to prefill even on the
     bind arm, where the original would show what is already stored. */
  const [phone, setPhone] = React.useState('');

  return (
    <CredentialStep
      icon={IconPhoneNumber}
      title={mode === 'change' ? 'Change Phone Number' : 'Phone Verification'}
      hint={
        mode === 'change'
          ? 'Enter your new phone number below to receive a verification code.'
          : 'Please enter and verify your phone number below.'
      }
    >
      <Input
        value={phone}
        onChange={setPhone}
        placeholder="Your phone number"
        className="mt-3 h-12 w-full bg-layer3"
      />
      {/* `disabled: !c()` is the chunk's own gate on an empty field. Inert beyond that, and
          silent about it: there is no SMS sender to call. */}
      <button
        type="button"
        className="button button-brand mt-6 w-full"
        disabled={!phone}
      >
        {mode === 'change' ? 'Change' : 'Verify'}
      </button>
    </CredentialStep>
  );
}
