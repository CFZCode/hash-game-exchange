import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../../../context/session';
import { useGates } from '../../../context/gates';
import { requestPasswordReset, completePasswordReset } from '../../../services/auth';
import { readPendingReferral, clearPendingReferral } from '../../../services/referralCapture';
import useDialogScrollLock from '../../../hooks/useDialogScrollLock';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import Loading from '../../shared/Loading';
import Input from '../../shared/Input';
import PopCenter from '../../shared/PopCenter';
import { IconTwoFactor } from '../../../pages/Settings/icons';
import googleImg from '../../../assets/google.png';
import {
  ArrowIcon,
  CloseIcon,
  MailIcon,
  EyeIcon,
  GoogleIcon,
  LineIcon,
  UserIcon,
  MetaMaskIcon,
  PasskeyIcon,
  SteamIcon,
  TelegramIcon,
  WalletConnectIcon,
  XIcon,
} from './icons';
import './Auth.css';
/* The dialog manager's own animations. Imported rather than copied for the reason `RouteDialog`
   imports them: the motion belongs to the router's shell, and this dialog is one more of its
   arms. */
import '../../shared/DialogShell/DialogShell.css';
import { PASSKEY_ENABLED, SOCIAL_LOGINS } from '../../../config/hiddenFeatures';

/* The sign-in / sign-up dialog.
 *
 * NOT from the bundle. `AfterLogin`, the auth chunk and the wallet widget were all lazily
 * loaded and never saved into the mirror, so unlike every other component here this one could
 * not be lifted from source. The Sign In tab's class lists below are transcribed from the live
 * dialog's rendered DOM — so they are the original's own classes, exactly as the footer's were.
 * All three tabs are now captures: Sign In / Password, Sign In / One-time Code, and Sign Up.
 * The only pieces still reconstructed are noted where they appear.
 *
 * The CSS it leans on IS in the mirror: `.dialog-*` and `.input` and the `data-type="indicator"`
 * tab variant all come out of index-DxOqNczA.css. See Auth.css and the shared primitives in
 * index.css.
 *
 * Two conventions carried over from the rest of the project:
 *
 *  - `dark:` variants are dropped and their dark value written directly. This build has no
 *    light theme and no `dark` class on the root, so `dark:bg-[#373E3F]` would never match.
 *    RegionBlock already does this.
 *  - The dialog is route-driven, because it is on the original: its header buttons navigate to
 *    `/login/signin` and `/login/regist`, and its own "Forgot your password?" is an <a> to
 *    `/login/forgot`. App renders this when the path matches, so the tabs navigate rather than
 *    setting state, and the URL is shareable exactly as the real one is.
 */

const SIGN_IN = 'signin';
const SIGN_UP = 'regist';

/* bc.game's own wording for a refused sign-in, keyed on the platform's stable error code.
 *
 * ON THE LIVE SITE THIS STRING COMES FROM THE SERVER, not from the client — it is in none of the
 * saved i18n bundle, which was checked before this map was written (`index-Dn9m_cUp.js` carries
 * "Invalid Link" and "Invalid payment request." and nothing about a password). So the original
 * prints whatever its API answered with, exactly as this build does, and the two APIs simply word
 * it differently: "Invalid login or password." against "Invalid username or password".
 *
 * That makes this an OVERRIDE rather than a translation, and it is worth naming as one. The
 * honest alternative is to change the message on the backend, where it belongs — one line in
 * `services/user/src/modules/auth/auth.errors.js` — and this map exists instead only because
 * that backend is being delivered elsewhere and its copy is not ours to edit.
 *
 * Keyed on `code`, never on the message, which is the platform's own rule (API-ROUTES.md §5 says
 * the message is written for a human and may be reworded). Anything unmapped falls through to
 * whatever the server said, so a failure this build has never seen still says something true.
 *
 * ONE CODE COVERS "no such user" AND "wrong password" on purpose, on their side: distinguishing
 * them turns the login form into a user-enumeration oracle. So there is one string here and not
 * two, and there should stay one.
 */
const AUTH_MESSAGES = {
  AUTH_INVALID_CREDENTIALS: 'Invalid login or password.',
  /* Sign Up's own. The server names which field collided; the wording stays vague on purpose,
     because saying WHICH one is registered turns this form into an account-enumeration oracle —
     the same reason `forgot-password` answers identically for a known and an unknown address. */
  AUTH_ALREADY_REGISTERED: 'That email or username is already registered.',
  TOO_MANY_REQUESTS: 'Too many attempts. Please try again later.',
};

/* The site itself refusing a sign-up rather than the form's values: a B2B (agent-only) site
   (`SITE_POLICY_CHANNEL_CLOSED`, backend sitePolicy.js), the owner's region block
   (`REGION_RESTRICTED`), or the plan (`NOT_ENTITLED`). The Sign Up tab has no error slot of its
   own, so these move to Sign In and print the server's message in ITS slot. */
const SIGNUP_REFUSALS = new Set(['SITE_POLICY_CHANNEL_CLOSED', 'REGION_RESTRICTED', 'NOT_ENTITLED']);

/* The platform's answer to a password that was right for an account with 2FA on: a 401 with this
   code, and nothing else happens until the same login is sent again with `twoFactorCode`. A wrong
   code is `AUTH_TWO_FACTOR_INVALID` and reads well as the server words it, so it is not mapped. */
const TWO_FACTOR_REQUIRED = 'AUTH_TWO_FACTOR_REQUIRED';

/* One resolver for every refusal this dialog prints: our wording for a code we recognise, then —
   for a 422 — the first offending field's own message, then the server's message, then a generic
   only when it answered with neither (a network failure has no envelope to read).

   The 422 arm is what makes a weak password readable: the envelope's top-level message is just
   "Validation failed", and the sentence the visitor needs ("password must be at least 10
   characters") is in `details.fields`, which `ApiError` already lifts onto `fields`. */
const messageOf = (failure, fallback) =>
  AUTH_MESSAGES[failure?.code] ||
  (failure?.code === 'VALIDATION_ERROR' && failure?.fields?.[0]?.message) ||
  failure?.message ||
  fallback;

/* The strip's indicator is positioned by two custom properties that the original computes in
 * JS from measured tab widths — the capture had `--tabs-width: 188px` with
 * `--tabs-indicator-position: 0px`, which is exactly half of that strip and no offset.
 *
 * Percentages give the identical result without measuring: the bar is half the strip, and
 * `translate(100%)` moves it by its OWN width, i.e. one tab. It also survives the dialog
 * changing width, which the px values would not.
 */
const indicatorVars = (index, count) => ({
  '--tabs-width': `${100 / count}%`,
  '--tabs-indicator-position': `${index * 100}%`,
});

/* `!h-[52px]` and `bg-input_darken` are the dialog's own overrides on the `.input` primitive:
   a taller box than the 3rem default, filled with layer1 rather than layer3. The bracketed
   placeholder/text rules are Tailwind arbitrary variants targeting the <input> inside. */
/* WITHOUT THE LEADING `input`, which `components/shared/Input` now writes itself. The rest is
   the auth dialog's own half of the class list, unchanged. */
const FIELD_CLASS =
  '!h-[52px] bg-input_darken [&>input::placeholder]:text-tertiary [&>input]:text-base [&>input]:font-semibold';

/* The two tabs label their fields DIFFERENTLY, and both captures are explicit about it:
     Password tab   <div class="mt-4"><label class="mb-1 block text-sm font-semibold text-secondary">
     One-time Code            <label class="mb-1 mt-4 block text-sm text-secondary">
   The gap moves from a wrapper onto the label, and the weight drops. Passed in rather than
   guessed at. */
const Label = ({ className = 'mb-1 font-semibold', children }) => (
  <label className={`block text-sm text-secondary ${className}`}>
    {children} <span className="text-error">*</span>
  </label>
);

/* `[data-focus]` on the WRAPPER is how the original drives the green ring — the border belongs
   to the box, not to the <input> inside it, so :focus-within on the box would style the right
   element but by a different mechanism than the markup describes. Tracked in state so the
   attribute is present exactly as captured. */
/* NOW A WRAPPER AROUND `components/shared/Input`, and the rendered DOM is unchanged — the box,
   its `data-focus` ring and the `off` autocomplete trade all moved there with their notes. The
   extraction happened because the account remote's `PasswordInput` became the second call site,
   and on the original those two are already one component: both wrap the host's `Input`, which is
   why the class list here and the remote's agree to the character. */
function Field({ type = 'text', value, onChange, trailing, className = '', autoFocus = false, autoComplete, onFocus }) {
  return (
    <Input
      type={type}
      value={value}
      onChange={onChange}
      trailing={trailing}
      className={`${FIELD_CLASS} ${className}`}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      onFocus={onFocus}
    />
  );
}

/* The seven-button row under Passkey, in the capture's own left-to-right order. Telegram's
   button wraps an <iframe> to auth.bc.game on the live site; that is an external request to a
   third party, so only the icon is reproduced. */
const THIRD_PARTY = [
  { label: 'Google', Icon: GoogleIcon },
  { label: 'X', Icon: XIcon },
  { label: 'Telegram', Icon: TelegramIcon },
  { label: 'MetaMask', Icon: MetaMaskIcon },
  { label: 'WalletConnect', Icon: WalletConnectIcon },
  { label: 'LINE', Icon: LineIcon },
  { label: 'Steam', Icon: SteamIcon },
];

/* Only the social logins this site offers (config/hiddenFeatures.js SOCIAL_LOGINS). */
const SHOWN_THIRD_PARTY = THIRD_PARTY.filter((item) => SOCIAL_LOGINS.includes(item.label));

/* `labelled`: a lone button spans the row, so it carries its name beside the icon. */
const ThirdPartyButton = ({ label, Icon, labelled = false }) => (
  <button
    type="button"
    aria-label={label}
    className="button button-m h-11 flex-1 rounded-lg border border-solid border-third p-0 shadow-[0px_2px_4px_rgba(0,0,0,0.10)]"
  >
    <Icon className="size-5 fill-secondary" />
    {labelled && <span className="ml-2 text-base font-extrabold text-primary">{label}</span>}
  </button>
);

/* Divider, Cwallet and Passkey — identical on both tabs apart from the wording, which is
   "Log in directly with" on Sign In and "Sign up directly with" on Sign Up.
 *
 * The captured class list ends `bg-layer4 ... bg-[#373E3F]` — two background utilities on one
 * button, equal specificity, so whichever the stylesheet emits LAST wins. In the original's own
 * CSS `.bg-\[\#373E3F\]` sits at byte 196310 and `.bg-layer4` at 201695, so layer4 wins and
 * `bg-[#373E3F]` never paints. These buttons are #323738, not #373E3F — writing the arbitrary
 * value here is what made ours read a shade light. The close button IS #373E3F: its class is
 * `dark:bg-[#373E3F]` with nothing competing. */
function DirectRow({ heading, children }) {
  return (
    <div className="mb-10 mt-8 sm:mb-0">
      <div className="flex h-4 w-full items-center">
        <div className="h-[0.5px] flex-1 bg-third" />
        <p className="mx-3 flex-none font-semibold text-secondary">{heading}</p>
        {/* 0.5px on the left and 1px on the right. That asymmetry is in the captured markup,
            not a transcription slip. */}
        <div className="h-[1px] flex-1 bg-third" />
      </div>
      {children}
    </div>
  );
}

function SignInForm({ onSubmit, pending, error, onForgot }) {
  /* Username vs Email — THIS BUILD'S TABS (user's request, 2026-10-16), in place of bc.game's
     Password / One-time Code: the platform has no one-time code, and its login takes either an
     email or a username in the same `identifier` field. Both tabs are the Password capture's form;
     only the field's label, input type and autofill hint change. The default `tabs-title` variant —
     no `data-type` — so the selected tab is a raised pill on a tab_nopadding track. */
  const [method, setMethod] = React.useState(0);
  const [account, setAccount] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [revealed, setRevealed] = React.useState(false);

  /* Username first (user's request), Email second. */
  const byUsername = method === 0;
  /* The captured submit carries `disabled`, on a dialog that had just opened with both fields
     empty — so the button is gated on the form, not permanently dead. `pending` joins it once a
     submit is in flight, which is this build's rather than the capture's: the original has a
     backend and a request that takes time, and a second click on a login form is a second login
     attempt against a rate limiter that counts them. */
  const ready = account.trim().length > 0 && password.length > 0 && !pending;

  return (
    <>
      <div
        role="tablist"
        className="scroll-x tabs-title hide-scroll"
        style={indicatorVars(method, 2)}
      >
        <div className="tabs-btn-group">
          {[
            { label: 'Username', Icon: UserIcon },
            { label: 'Email', Icon: MailIcon },
          ].map((item, index) => (
            <button
              key={item.label}
              type="button"
              role="tab"
              className="tabs-btn btn-like"
              aria-selected={method === index ? 'true' : undefined}
              onClick={() => setMethod(index)}
            >
              <div className="flex items-center justify-center">
                <item.Icon className="size-4" />
                <p className="ml-1 font-extrabold">{item.label}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="tabs-indicator" />
      </div>

      <div className="tabs-content bg-transparent">
        {/* One form for both tabs — the Password capture's structure. bc.game's One-time Code
            arm is gone with the tab. */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              /* `identifier` is the platform's own field name and it takes a username, an email
                 or a phone — which is exactly what this label offers. */
              if (ready) onSubmit({ identifier: account.trim(), password });
            }}
          >
            <div className="mt-4">
              <Label>{byUsername ? 'Username' : 'Email'}</Label>
              <div className="relative">
                <Field
                  key={byUsername ? 'username' : 'email'}
                  autoFocus
                  type={byUsername ? 'text' : 'email'}
                  autoComplete={byUsername ? 'username' : 'email'}
                  value={account}
                  onChange={setAccount}
                />
              </div>
            </div>

            <div className="mt-6">
              <Label>Password</Label>
              <Field
                type={revealed ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                className="!pr-3"
                trailing={
                  /* One glyph, not two — the original does not swap the eye for a
                     struck-through variant while the password is showing. */
                  <div
                    className="center h-8 w-8 cursor-pointer"
                    onClick={() => setRevealed((value) => !value)}
                  >
                    <EyeIcon className="size-6 fill-tertiary" />
                  </div>
                }
              />

              {/* A FIELD-LEVEL REFUSAL, so it belongs to the password block rather than sitting
                  between "Forgot your password?" and the submit — which is where this build put
                  it before the live dialog's own refusal state was captured.
                  ---------------------------------------------------------------------------
                  Three things about it are read off that capture rather than chosen. It sits
                  INSIDE this `mt-6` wrapper, directly under the box and ABOVE the Forgot row.
                  It is left-aligned on the field, not centred under the dialog. And it takes the
                  Label's own `text-sm` at the body weight — a step smaller and a step lighter
                  than the "Password" label above it.

                  `mt-1` is cross-checked rather than measured off the pixels: it is the same 4px
                  the `Label` already puts between itself and its box (`mb-1`), and solving the
                  capture's line box back from its baseline lands within two pixels of it. See the
                  measurement note in CLAUDE.md — a figure with nothing of known size to check it
                  against is not a measurement.

                  The STRING is resolved through `AUTH_MESSAGES` at the top of this file — bc.game's
                  own wording for the codes we recognise, the server's own for the rest. */}
              {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
            </div>

            <div className="flex w-full justify-end">
              <a
                href="/login/forgot"
                onClick={(event) => {
                  /* In-app, so the dialog swaps screens instead of reloading the page. */
                  event.preventDefault();
                  onForgot?.();
                }}
                className="mt-2 font-extrabold text-secondary hover:text-primary hover:underline"
              >
                <span>Forgot your password?</span>
              </a>
            </div>

            <button
              type="submit"
              disabled={!ready}
              className="button button-brand button-l mt-6 h-14 w-full rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.10)]"
            >
              {/* THE SITE'S OWN SPINNER, replacing the label rather than sitting beside it. The
                  live dialog's in-flight state was never captured, so the arrangement is this
                  build's; what is not ours is the glyph — `Loading` is `sa` from the main bundle,
                  the same 20px `.loading` the pager buttons and the swap Rate row draw.

                  `text-current` is doing real work: the component forces `text-brand` UNLESS the
                  call site names a colour of its own, and brand green on a `button-brand` fill is
                  green on green. Naming `text-current` satisfies that test and lets the button's
                  own `color: rgb(0,0,0)` through, so the spinner is the label's colour by
                  construction rather than by a literal repeated here.

                  `dark:text-alw_white` is a requested departure from that: in the dark theme the
                  spinner is white on the brand fill rather than the label's black, which is what
                  was asked for. The light theme keeps the label's colour. */}
              {pending ? (
                <Loading className="text-current dark:text-alw_white" />
              ) : (
                <span className="text-base">Sign In</span>
              )}
            </button>
          </form>
      </div>

      <DirectRow heading="Log in directly with">
        {/* Cwallet (BC.GAME's partner wallet) sign-in is not drawn — no Parker567 integration. */}
        {/* Hidden: no WebAuthn on the platform (config/hiddenFeatures.js). */}
        {PASSKEY_ENABLED && (
          <button
            type="button"
            className="button button-m mt-4 h-12 w-full border border-third bg-black_alpha5 shadow-[0px_2px_4px_rgba(0,0,0,0.10)]"
          >
            <PasskeyIcon className="size-5 fill-secondary" />
            <span className="ml-2 text-base font-extrabold text-primary">Sign In with Passkey</span>
          </button>
        )}

        <div className="third-group-wrap mt-6 flex h-11 w-full items-center gap-2">
          {SHOWN_THIRD_PARTY.map((item) => (
            <ThirdPartyButton key={item.label} {...item} labelled={SHOWN_THIRD_PARTY.length === 1} />
          ))}
        </div>
      </DirectRow>
    </>
  );
}

/* Transcribed from the live dialog's rendered DOM, like the Sign In tab. */
function SignUpForm({ onSubmit, error, onClearError }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [revealed, setRevealed] = React.useState(false);
  /* A code the visitor arrived with on a referral link (services/referralCapture.js) starts in
     the field, with the panel open so they can see it is applied. */
  const [referral, setReferral] = React.useState(readPendingReferral);
  const [referralOpen, setReferralOpen] = React.useState(() => Boolean(readPendingReferral()));
  /* A refusal about the password belongs under the password box, not the email one. */
  const passwordError = Boolean(error) && /password/i.test(error);
  /* Pre-ticked on the live dialog — `aria-selected="true"` on a freshly opened one. */
  const [agreed, setAgreed] = React.useState(true);
  const [moreOpen, setMoreOpen] = React.useState(false);

  const ready = email.length > 0 && password.length > 0 && agreed;

  return (
    <>
      {/* No `tabs-content` wrapper, and NO top margin on the first label: the form is the
          direct child of the body, so the only gap above "Email" is the body's own
          `sm:pt-12`. The Sign In tab differs because it opens with the Password /
          One-time Code strip instead of a field. */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          {
            /* THIS REACHES THE PLATFORM NOW. It used to send no `password` deliberately, because
               registration was a socket event there (`REGISTER_USER`) with no HTTP route at all
               and the form could only swap a fixture. `POST /user/auth/register` exists as of
               2026-09-04, so the tab sends what it collected.

               `signUp: true` is what tells `submit` to register rather than sign in — the two
               arms take different fields and answer the same shape, so one flag beats a second
               handler. The referral is passed only when the visitor opened that panel and typed
               one; an empty string would be stored as a referrer who does not exist. */
            if (ready) onSubmit({ signUp: true, email, password, referral: referral || undefined });
          }
        }}
      >
        <Label>Email</Label>
        {/* Two nested `relative` wrappers in the capture. Kept — that is presumably where a
            validation popover anchors, and dropping them is a change, not a tidy-up. */}
        <div className="relative">
          <div className="relative">
            <Field
              autoFocus
              type="email"
              value={email}
              onChange={setEmail}
              /* `J(t.errorMsg && "border-error", "!mt-0")` on the original's EmailPhoneInput: the
                 box turns red while a refusal is showing, and focusing it clears the refusal —
                 `onFocus: () => { …; t.errorMsg && t.setStore({errorMsg: ""}) }`. */
              className={error && !passwordError ? 'border-error' : ''}
              onFocus={error && !passwordError ? onClearError : undefined}
            />
          </div>
        </div>

        {/* THE SIGN UP FORM'S ERROR SLOT, and where it sits is the chunk's, not a choice.
            ---------------------------------------------------------------------------------
            `Enter-S9f2xlL8.js` (the account remote's sign-up, off `hash.game/modules/account/`)
            inserts `ce = <p class="mt-1 text-xs text-error">` as the form's own child directly
            after the email field's `div.relative` and before the `mt-6` password block, shown
            under `<Show when={!!errorMsg}>`. Same element, same classes as the Sign In tab's slot
            under the password box — the two forms were always one convention.

            The original fills it from `te(code)` for its 4xxx account codes and ALSO toasts the
            server's message (`x(a)`) for every failure. This platform's codes are strings, so
            there is no 4xxx range to branch on: every refusal that keeps the visitor on this tab
            prints here, through the same `messageOf` the Sign In tab uses, and no toast doubles
            it. The three site-level refusals still move to Sign In (`SIGNUP_REFUSALS`). */}
        {error && !passwordError ? <p className="mt-1 text-xs text-error">{error}</p> : null}

        <div className="mt-6">
          <Label>Password</Label>
          <Field
            type={revealed ? 'text' : 'password'}
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (passwordError) onClearError();
            }}
            className={`w-full !pr-3 ${passwordError ? 'border-error' : ''}`}
            trailing={
              <div
                className="center h-8 w-8 cursor-pointer"
                onClick={() => setRevealed((value) => !value)}
              >
                <EyeIcon className="size-6 fill-tertiary" />
              </div>
            }
          />
          {passwordError ? <p className="mt-1 text-xs text-error">{error}</p> : null}
        </div>

        {/* The referral row is NOT a field — it is a layer3 panel with a 38px header and a
            collapsible body, and the input lives inside it. The expander is the
            grid-template-rows 0fr -> 1fr trick over an `overflow-hidden` child, which animates
            to the content's natural height without anyone measuring it. */}
        <div
          className="mt-7 rounded-lg bg-layer3 px-3 py-2 sm:cursor-pointer"
          onClick={() => setReferralOpen((open) => !open)}
        >
          <div className="flex h-[38px] items-center justify-between text-secondary">
            <span className="text-base text-secondary">
              Enter Referral / Promo Code<span className="ml-1 font-normal">(More)</span>
            </span>
            <ArrowIcon
              className={`mr-[7px] size-5 transition ease-out ${
                referralOpen ? 'rotate-90' : '-rotate-90'
              }`}
            />
          </div>

          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: referralOpen ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <div
                className="input mt-2 bg-input_darken pl-3 pr-2 [&>input]:font-semibold sm:pr-1"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="text"
                  value={referral}
                  onChange={(event) => setReferral(event.target.value)}
                />
                {/* Reads the clipboard on the live site; same here, guarded — the API is
                    permission-gated and rejects outside a user gesture. */}
                <button
                  type="button"
                  className="button button-s bg-input_darken px-2 py-0 text-xs"
                  onClick={() => {
                    navigator.clipboard?.readText().then(setReferral).catch(() => {});
                  }}
                >
                  Paste
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* A <button> carrying `.checkbox`, not an <input type="checkbox">. The resting box and
            the tick are two layers that cross-fade, so the control has to be an element the CSS
            can drive off `aria-selected` — see the .checkbox rules in index.css. */}
        <div className="relative mt-4 flex items-center">
          <button
            type="button"
            role="checkbox"
            aria-checked={agreed}
            onClick={() => setAgreed((value) => !value)}
            className="checkbox btn-like mr-1.5 scale-[90%]"
          >
            <div className="checkbox-ico" {...(agreed ? { 'aria-selected': 'true' } : {})}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                shapeRendering="geometricPrecision"
              >
                <path
                  d="M7.77637 0.450195H10.2236C11.592 0.450195 12.592 0.450279 13.3799 0.514648C14.1622 0.5786 14.6969 0.703566 15.1426 0.930664C15.9721 1.35341 16.6466 2.02793 17.0693 2.85742C17.2965 3.30322 17.4214 3.83851 17.4854 4.62109C17.5497 5.40886 17.5498 6.4083 17.5498 7.77637V10.2236C17.5498 11.592 17.5497 12.592 17.4854 13.3799C17.4214 14.1622 17.2964 14.6969 17.0693 15.1426C16.6466 15.9721 15.9721 16.6466 15.1426 17.0693C14.6968 17.2965 14.1615 17.4214 13.3789 17.4854C12.5911 17.5497 11.5917 17.5498 10.2236 17.5498H7.77637C6.4083 17.5498 5.40886 17.5497 4.62109 17.4854C3.83851 17.4214 3.30322 17.2965 2.85742 17.0693C2.02793 16.6466 1.35341 15.9721 0.930664 15.1426C0.70352 14.6968 0.578588 14.1615 0.514648 13.3789C0.450319 12.5911 0.450195 11.5917 0.450195 10.2236V7.77637C0.450195 6.40801 0.450279 5.40796 0.514648 4.62012C0.5786 3.83779 0.703567 3.30313 0.930664 2.85742C1.35341 2.02793 2.02793 1.35341 2.85742 0.930664C3.30322 0.70352 3.83851 0.578588 4.62109 0.514648C5.40886 0.450319 6.4083 0.450195 7.77637 0.450195Z"
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth="1.5"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M14.0382 6.8489L8.53208 12.5169C8.16569 12.8941 7.57165 12.8941 7.20526 12.5169L3.96191 9.1782C4.40027 8.64081 5.14907 7.94804 5.54815 7.60893L7.86867 9.94581C7.86867 9.94581 11.4664 6.12162 12.3331 5.22949C12.7841 5.63746 13.5819 6.31045 14.0382 6.8489Z"
                  fill="var(--color-brand)"
                />
              </svg>
            </div>
          </button>
          <span className="font-semibold text-secondary">
            I am 18+ and agree to the
            <a
              target="_blank"
              rel="noreferrer"
              href="/help/terms-service"
              className="mx-1 font-semibold text-primary underline"
            >
              Terms and Conditions
            </a>
            <span className="text-error">*</span>
          </span>
        </div>

        <button
          type="submit"
          disabled={!ready}
          className="button button-brand button-l mt-8 h-14 w-full rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.10)]"
        >
          <span className="text-base">Sign Up</span>
        </button>
      </form>

      <DirectRow heading="Sign up directly with">
        <div>
          {/* Three across, `gap-3`, all h-11 — one step shorter than the Sign In tab's stacked
              pair. Cwallet and Google share a class list apart from Google's missing
              `text-base`; reproduced as written. */}
          <div className="mt-4 flex items-center gap-3">
            {/* Cwallet sign-up is not drawn (BC.GAME's partner wallet). */}
            <button
              type="button"
              className="button button-m h-11 flex-1 bg-layer4 shadow-[0px_2px_4px_rgba(0,0,0,0.10)]"
            >
              {/* An <img>, not an SVG — the original inlines the four-colour mark as a 40x40
                  base64 PNG, and it decodes byte-for-byte to the google.png this project
                  already ships for the hero. Same file, reused. */}
              <img alt="google" className="size-[0.875rem] sm:size-4" src={googleImg} />
              <span className="ml-2 text-base font-extrabold text-primary">Google</span>
            </button>

            {SHOWN_THIRD_PARTY.some((item) => item.label !== 'Google') && (
            <button
              type="button"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
              className="button button-m h-11 flex-none gap-1 border border-solid border-third px-3 text-sm font-semibold text-secondary shadow-[0px_2px_4px_rgba(0,0,0,0.10)]"
            >
              More
              <ArrowIcon
                className={`size-4 fill-primary transition-transform ${
                  moreOpen ? 'rotate-90' : '-rotate-90'
                }`}
              />
            </button>
            )}
          </div>

          {/* Always rendered, never unmounted — the row fades and slides rather than appearing,
              so it has to be in the DOM in both states. */}
          <div
            className={`transition-[opacity,transform] duration-300 ease-out ${
              moreOpen
                ? 'visible translate-y-0 opacity-100'
                : 'invisible -translate-y-1 opacity-0'
            }`}
          >
            <div className="third-group-wrap mt-4 flex h-11 w-full items-center gap-2">
              {/* Six, not seven: Google has its own button above. */}
              {SHOWN_THIRD_PARTY.filter((item) => item.label !== 'Google').map((item) => (
                <ThirdPartyButton key={item.label} {...item} />
              ))}
            </div>
          </div>
        </div>
      </DirectRow>
    </>
  );
}

/* "Forgot your password?" — ask for a reset link. The reply is the same for a registered and an
   unregistered address (see `requestPasswordReset`), so success always reads "if that address is
   registered…". Built from the Sign In tab's own pieces: Label, Field, the error slot, the brand
   submit. */
function ForgotForm({ onBack }) {
  const [email, setEmail] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState('');

  const ready = email.length > 0 && !pending;

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready) return;
        setError('');
        setPending(true);
        try {
          await requestPasswordReset({ email });
          setSent(true);
        } catch (failure) {
          setError(messageOf(failure, 'Could not send the reset link. Please try again.'));
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="mb-4 text-base font-extrabold text-primary">Reset your password</p>
      {sent ? (
        <p className="font-semibold text-secondary">
          If that address is registered, a link to reset your password is on its way. Check your email.
        </p>
      ) : (
        <>
          <Label>Email</Label>
          <Field autoFocus type="email" value={email} onChange={setEmail} />
          {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
          <button
            type="submit"
            disabled={!ready}
            className="button button-brand button-l mt-6 h-14 w-full rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.10)]"
          >
            {pending ? <Loading className="text-current dark:text-alw_white" /> : <span className="text-base">Send Reset Link</span>}
          </button>
        </>
      )}
      <div className="mt-4 flex w-full justify-center">
        <button type="button" onClick={onBack} className="font-extrabold text-secondary hover:text-primary hover:underline">
          Back to Sign In
        </button>
      </div>
    </form>
  );
}

/* The emailed link's screen: `/login/reset?token=…` — a new password, twice. */
function ResetForm({ token, onDone }) {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [revealed, setRevealed] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState('');

  const mismatch = confirm.length > 0 && password !== confirm;
  const ready = Boolean(token) && password.length > 0 && password === confirm && !pending;
  const eye = (
    <div className="center h-8 w-8 cursor-pointer" onClick={() => setRevealed((value) => !value)}>
      <EyeIcon className="size-6 fill-tertiary" />
    </div>
  );

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!ready) return;
        setError('');
        setPending(true);
        try {
          await completePasswordReset({ token, newPassword: password });
          setDone(true);
        } catch (failure) {
          setError(messageOf(failure, 'Could not reset your password. Please try again.'));
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="mb-4 text-base font-extrabold text-primary">Set a new password</p>
      {!token ? (
        <p className="font-semibold text-error">This reset link is incomplete. Request a new one from Sign In.</p>
      ) : done ? (
        <p className="font-semibold text-secondary">Your password has been changed. You can sign in with it now.</p>
      ) : (
        <>
          <Label>New Password</Label>
          <Field autoFocus type={revealed ? 'text' : 'password'} value={password} onChange={setPassword} className="!pr-3" trailing={eye} />
          <div className="mt-6">
            <Label>Confirm Password</Label>
            <Field type={revealed ? 'text' : 'password'} value={confirm} onChange={setConfirm} className={`!pr-3 ${mismatch ? 'border-error' : ''}`} />
            {mismatch ? <p className="mt-1 text-xs text-error">The passwords do not match.</p> : null}
            {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}
          </div>
          <button
            type="submit"
            disabled={!ready}
            className="button button-brand button-l mt-6 h-14 w-full rounded-xl shadow-[0px_2px_4px_rgba(0,0,0,0.10)]"
          >
            {pending ? <Loading className="text-current dark:text-alw_white" /> : <span className="text-base">Reset Password</span>}
          </button>
        </>
      )}
      <div className="mt-4 flex w-full justify-center">
        <button type="button" onClick={onDone} className="font-extrabold text-secondary hover:text-primary hover:underline">
          Back to Sign In
        </button>
      </div>
    </form>
  );
}

/* The original's code length, `_t` in the chunk — Confirm is armed at exactly this many digits. */
const TWO_FACTOR_LENGTH = 6;

/* THE SIGN-IN 2FA STEP, ported from the account remote's `Login-DOwjxTVG.js` (off
 * `hash.game/modules/account/assets/`, under the hash the remote's manifest lists). The auth
 * dialog was recorded as having "no chunk at all"; this one does — `DialogSignin2FA` resolves to
 * that file's export `S`, and the in-dialog step is `xr` beside it.
 *
 * ── WHAT THE ORIGINAL DOES ────────────────────────────────────────────────────────────────────
 *
 * After a sign-in whose answer carries `twoStepVerifyTypes` including `google_2fa`, `Le()` calls
 * `Pr()`, which is `pop.push(() => <xr …/>, {close: false})` — a POP stacked over the auth
 * dialog, not a screen inside it. `xr` is
 *
 *   <Pop>                                    no title, so an empty title bar holding the cross
 *     <div class="special-tabs-change w-full">
 *       <Tabs value={stage}>                 three title-less TabItems: 2FA / phone / email
 *         <TabItem><yr/></TabItem> …
 *
 * and `yr` hands `pr` the 2FA submit. `pr`, in order: the IconTwofactor mark (`size-8
 * fill-secondary`) centred, "Enter the code generated by your Google Authenticator App.",
 * an `input-label` "Verification Code", `PasteInput` with "6-digit verification code", `Tip2FA`
 * ("Don't have access to these?"), a brand Confirm (`mt-4 h-12 w-full`, disabled until six
 * digits), then the footer — a `mt-6` row of "Switch to phone / email" links, EMPTY when the
 * account has neither, which is always the case here.
 *
 * `special-tabs-change` has no rule in either stylesheet (the deploy's or the remote's), so the
 * host Tabs draws its strip as it always does: `.tabs-title` with three empty `.tabs-btn`s, the
 * first raised, over a `.tabs-content` panel. Reproduced as the chunk renders it. The two other
 * tabs are inert: phone and e-mail verification have no sender on this platform.
 *
 * ── WHAT IS THIS PLATFORM'S ───────────────────────────────────────────────────────────────────
 *
 * The original verifies the code with a second call (`/account/verify/verifyCodeForLogin/`
 * keyed by a `verifyFlowId`). SmartBet has no flow id: `POST /user/auth/login` answers
 * `AUTH_TWO_FACTOR_REQUIRED`, and the code goes back on THE SAME LOGIN REQUEST as
 * `twoFactorCode`. So the parent keeps the credentials and resends them.
 *
 * A refusal is printed in the Sign In form's own error slot markup (`mt-1 text-xs text-error`)
 * under the field, where the original toasts it. That is this build's — the toast would land
 * over the pop and vanish, and a wrong code is a field-level refusal like a wrong password.
 *
 * `Tip2FA` is drawn and inert. On the original it opens the lost-2FA flows (an advanced-KYC ID
 * check, or a confirm that says to e-mail a recovery address), and neither has a backend or an
 * address here — a screen with no backend is drawn and says nothing (CLAUDE.md). */
function TwoFactorStep({ onConfirm, onClose, pending, error, onClearError }) {
  const isDesktop = useIsDesktop();
  const [code, setCode] = React.useState('');
  const ready = code.length === TWO_FACTOR_LENGTH && !pending;

  /* `PasteInput`'s type defaults to "tel", and both of its writers strip non-digits:
     `onChange: e => setValue(e.replace(/\D/g, ""))` and the Paste button's clipboard read. */
  const update = (next) => {
    setCode(next.replace(/\D/g, ''));
    if (error) onClearError();
  };

  /* The host Button's own size rule, `size || !mobile && "m"` — same resolution as the other
     ports that have no shared Button. */
  const size = isDesktop ? 'button-m ' : '';

  return (
    /* `type="sheet"`: the pop is pushed with no `type`, and `cl` makes that a bottom sheet on a
       phone (`mobile ? t.type : "center"`). `PopCenter` defaults the other way, see its note.
       `dismissible={false}` is `{close: false}` on the push. */
    <PopCenter open type="sheet" dismissible={false} label="Verify 2FA" onClose={onClose}>
      <div className="special-tabs-change w-full">
        <div
          role="tablist"
          className="scroll-x tabs-title hide-scroll"
          style={indicatorVars(0, 3)}
        >
          <div className="tabs-btn-group">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                type="button"
                role="tab"
                className="tabs-btn btn-like"
                aria-selected={index === 0 ? 'true' : undefined}
              />
            ))}
          </div>
          <div className="tabs-indicator test-indicator-tab" />
        </div>

        <div className="tabs-content">
          <form
            /* `PasteInput`'s `onKeyDown`: Enter submits whatever is typed (`t.value && submitFn`),
               without the six-digit gate the button has — the server answers a short code. A
               form is how this build gets Enter without a key handler on the shared Input. */
            onSubmit={(event) => {
              event.preventDefault();
              if (code && !pending) onConfirm(code);
            }}
          >
            <div className="flex items-center justify-center">
              <IconTwoFactor className="icon size-8 fill-secondary" />
            </div>
            <p className="mt-3 px-2 text-center text-secondary">
              Enter the code generated by your Google Authenticator App.
            </p>
            <p className="mt-5 input-label">Verification Code</p>
            {/* `PasteInput`: the host Input with `pl-3 pr-2 sm:pr-1 [&>input]:font-semibold`, and
                a `button-s` Paste inside it carrying `px-2 py-0 text-xs fix-light-hover
                bg-layer6` (its default `buttonClass`). */}
            <Input
              type="tel"
              value={code}
              onChange={update}
              autoFocus
              autoComplete="one-time-code"
              placeholder="6-digit verification code"
              className="pl-3 pr-2 sm:pr-1 [&>input]:font-semibold"
              trailing={
                <button
                  type="button"
                  className="button button-s fix-light-hover bg-layer6 px-2 py-0 text-xs"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    navigator.clipboard?.readText().then(update).catch(() => {});
                  }}
                >
                  Paste
                </button>
              }
            />
            {error ? <p className="mt-1 text-xs text-error">{error}</p> : null}

            {/* `Tip2FA` — `cr`, verbatim. Inert; see the note above. */}
            <div className="center mt-4">
              <p className="cursor-pointer font-extrabold text-secondary sm:cursor-pointer">
                Don&apos;t have access to these?
              </p>
            </div>

            <button
              type="submit"
              disabled={!ready}
              className={`button button-brand ${size}mt-4 h-12 w-full`}
            >
              Confirm
            </button>

            {/* `yr`'s footer: the "Switch to phone / email" row, empty with neither, but the
                element and its `mt-6` are still there. */}
            <div className="mt-6 flex flex-row-reverse items-center justify-center" />
          </form>
        </div>
      </div>
    </PopCenter>
  );
}

export default function Auth({ mode: requested, onClose, enter = 'open' }) {
  const navigate = useNavigate();
  /* A B2B (agent-only) site has no public sign-up (services/gates.js `canSignUp`): the dialog
     has the Sign In tab alone, and `/login/regist` (or anything that asks for the Sign Up tab)
     opens it on Sign In. Always open with fixtures. */
  const gates = useGates();
  const signUpClosed = gates.ready && !gates.canSignUp();
  const mode = signUpClosed && requested === SIGN_UP ? SIGN_IN : requested;
  const { pathname, search } = useLocation();
  React.useEffect(() => {
    if (signUpClosed && pathname === '/login/regist') navigate('/login/signin', { replace: true });
  }, [signUpClosed, pathname, navigate]);
  const { signIn, authenticate, signUp } = useSession();
  /* The manager's own `ee.mobile`, which decides WHICH animation this dialog gets rather than
     how big it is — see the note over the render. `lg` is the line this project maps that flag
     to everywhere else, and it is the same line `.dialog-list`'s card treatment sits behind in
     Auth.css, so the geometry and the motion cannot disagree about which arm is showing. */
  const isDesktop = useIsDesktop();

  const tabs = [
    { key: SIGN_IN, label: 'Sign In', path: '/login/signin' },
    { key: SIGN_UP, label: 'Sign Up', path: '/login/regist' },
  ].filter((tab) => !(signUpClosed && tab.key === SIGN_UP));
  /* `forgot` and `reset` are Sign In's own sub-screens, so its tab stays selected. */
  const active = Math.max(
    0,
    tabs.findIndex((tab) => tab.key === (mode === 'forgot' || mode === 'reset' ? SIGN_IN : mode)),
  );

  /* Handed down from App so that closing returns to the page the dialog opened OVER rather
     than to Home — see the background-location note there. The fallback keeps this component
     usable on its own. */
  const dismiss = () => (onClose ? onClose() : navigate('/'));

  /* PLAY THE ENTER BACKWARDS ON THE WAY OUT, THEN navigate — the same ordering trick
     `RouteDialog` makes, and here it is not optional the way it is there.
     ---------------------------------------------------------------------------------------
     The manager's close is `N()` run with `H` false: the scrim's keyframes reversed, the card's
     reversed beside them on a desktop, and `.dialog-visible` taken off only when the scrim's
     animation FINISHES. So the dialog is still mounted and still painted for the whole 300ms.
     This build mounts it off the pathname instead, so the instant a close handler navigates the
     component is gone and there is nothing left to animate. The way round it is to own the
     order: raise `leaving`, let the reverse keyframes run, and fire the real handler on a timer.

     A timer rather than an `animationend` listener because the reduced-motion arm shortens every
     one of these to 0.01ms, and a listener attached after that has already fired never resolves.
     The ref is what makes a second click a no-op — the first has already started the tween — and
     the cleanup drops a pending handler if the route changes under us anyway. */
  const [leaving, setLeaving] = React.useState(false);
  const leaveTimer = React.useRef(0);
  React.useEffect(() => () => clearTimeout(leaveTimer.current), []);

  const runClose = (handler) => {
    if (leaveTimer.current) return;
    setLeaving(true);
    leaveTimer.current = window.setTimeout(handler, 300);
  };

  const close = () => runClose(dismiss);

  /* This dialog is in the shared popup list too. It matters most here: below lg the dialog is
     a full-screen sheet, so a scrollable page behind it means two nested scrollers fighting
     over the same drag. Touch-only and 160ms-settled like every other dialog — see
     hooks/useDialogScrollLock.js. Unconditional because Auth is only mounted while its route
     matches; App unmounts it otherwise. */
  useDialogScrollLock(true);

  /* AUTHENTICATE, THEN ANIMATE, THEN COMMIT — and that order is forced from both ends.
     ---------------------------------------------------------------------------------------
     Committing a session is what makes `depositNeedsAuth` and its three siblings false in App,
     so a commit up front unmounts this dialog mid-tween and the cleanup above then drops the
     queued navigation with it — the dialog would vanish and the route would never move. That is
     why the commit is deferred into `runClose`'s timer, and it is the same ordering this handler
     has always had.

     What is new is the step in FRONT of it. With a backend the credentials can be refused, and
     a dialog that plays its exit before it knows the answer has to play an entrance again to
     show the error. So the request goes first, and only a resolved one starts the animation.

     `authenticate` is the transport arm; with fixtures on it resolves immediately with the
     signed-in fixture and nothing about the timing changes. The typed account name is still
     carried across on that arm, so the shell shows what was entered rather than the fixture's
     own — which is why `signIn` takes overrides at all. */
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState('');

  /* THE 2FA STEP'S STATE. `twoFactor` holds the credentials the platform accepted up to the
     second factor — non-null is what raises the step — because the code is sent back on the same
     login request rather than against a flow id. Its error is its own: the step sits over the
     Sign In form, and a refusal printed in the form's slot behind the scrim would not be seen. */
  const [twoFactor, setTwoFactor] = React.useState(null);
  const [twoFactorError, setTwoFactorError] = React.useState('');
  const [twoFactorPending, setTwoFactorPending] = React.useState(false);

  /* The cross (or a phone's drag) on the step is `xr`'s `onCleanup(() => onSubmit(undefined))`:
     the sign-in resolves as not signed in and the dialog stays on its form, password intact. */
  const cancelTwoFactor = () => {
    setTwoFactor(null);
    setTwoFactorError('');
    setTwoFactorPending(false);
  };

  const confirmTwoFactor = async (twoFactorCode) => {
    if (!twoFactor || twoFactorPending) return;
    setTwoFactorError('');
    setTwoFactorPending(true);
    try {
      const session = await authenticate({ ...twoFactor, twoFactorCode });
      /* `pop.pop()` then the sign-in's own exit, as `Pr` resolves before `Le` returns. */
      setTwoFactor(null);
      runClose(() => {
        signIn(session);
        dismiss();
      });
    } catch (failure) {
      setTwoFactorPending(false);
      setTwoFactorError(messageOf(failure, 'Could not sign in. Please try again.'));
    }
  };

  const submit = async (credentials) => {
    if (pending) return;
    setError('');

    /* ── THE SIGN UP ARM ──────────────────────────────────────────────────────────────────
       Same shape out as `authenticate`, so everything below the request is shared: the request
       goes first, only a resolved one starts the exit animation, and a refusal keeps the dialog
       open with the server's message under the form.

       The errors differ from sign-in's and are worth naming rather than falling through to the
       generic: `AUTH_ALREADY_REGISTERED` is a 409 that means the derived username or the email
       is taken, and a 429 means the 5-an-hour budget on this route is spent. */
    if (credentials?.signUp) {
      setPending(true);
      try {
        const session = await signUp(credentials);
        clearPendingReferral();
        runClose(() => {
          signIn(session);
          dismiss();
        });
      } catch (failure) {
        setPending(false);
        setError(messageOf(failure, 'Could not create your account. Please try again.'));
        if (SIGNUP_REFUSALS.has(failure?.code)) navigate('/login/signin', { replace: true });
      }
      return;
    }

    /* The one arm this dialog still cannot send — the One-time Code tab — carries no `password`,
       for the reason written at its own form. It keeps the fixture path, which is also what
       every arm does while `VITE_USE_FIXTURES` is on. */
    if (!credentials?.password) {
      const typed = credentials?.identifier;
      runClose(() => {
        signIn(typed ? { name: typed.split('@')[0] } : undefined);
        dismiss();
      });
      return;
    }

    setPending(true);
    try {
      const session = await authenticate(credentials);
      /* Only now is it safe to leave. `signIn` takes what `authenticate` answered — see the
         two shapes it accepts in SessionContext. */
      runClose(() => {
        signIn(session);
        dismiss();
      });
    } catch (failure) {
      setPending(false);
      /* Right password, second factor on: not a refusal, so nothing goes in the slot — the
         credentials are kept and the 2FA step is raised over the form. */
      if (failure?.code === TWO_FACTOR_REQUIRED) {
        setTwoFactor({ identifier: credentials.identifier, password: credentials.password });
        return;
      }
      /* Our wording for a code we recognise, the server's for one we do not, and a generic only
         when it answered with neither — a network failure has no envelope to read. */
      setError(messageOf(failure, 'Could not sign in. Please try again.'));
    }
  };

  const cx = (...parts) => parts.filter(Boolean).join(' ');

  /* THE OPEN AND CLOSE MOTION, and WHICH of it runs is a DEVICE test rather than a width one —
   * this is the first shell in the project that has to make that test at runtime, because it is
   * the only one mounted at both widths from one component. `DialogShell` is the desktop arm of
   * the manager and animates three things; `RouteDialog` is the phone arm and animates one; the
   * auth dialog is both, so the branch that lives in `N()` and `BS` on the original has to live
   * here. The keyframes themselves are `DialogShell.css`'s, imported above.
   *
   *   N()  scrim + card   `[...ae ? [Qu[0], Qu[0]] : Qu]` and `if (!ae) { P.animate(…) }`
   *
   * `ae` is `ee.mobile`, so on a phone the scrim tween is handed two IDENTICAL keyframes and the
   * card scale is skipped outright: a phone gets the slide and nothing else. On a desktop it is
   * the reverse — the scrim fades, the card scales from 0.92, and `BS`'s `!ee.mobile && !E` arm
   * means the item does NOT slide when the dialog is opening over a page. Both directions are the
   * same pair of tweens reversed, which is why `leaving` picks the arm rather than a second set.
   *
   * `enter` is threaded down from App because it is a property of the TRANSITION, not of this
   * dialog — see the note there. `push`/`pop` reach this dialog when it opens over another one,
   * which is what the `needLogin` guards do from `/deposit` and `/user/enter`. */
  const opening = enter === 'open';
  const rootClass = cx(
    'dialog-root',
    'dialog-visible',
    isDesktop && (leaving ? 'dialog-scrim-back' : opening && 'dialog-scrim-in'),
  );
  const listClass = cx(
    'dialog-list',
    'login-layout-dialog-size',
    isDesktop && (leaving ? 'dialog-card-out' : opening && 'dialog-card-in'),
  );
  /* Both slides sit on the OVERLAYER rather than on the card, and that placement is load-bearing:
     `.dialog-list` carries `overflow: hidden`, so a translate from 100% is clipped to the card's
     own edges instead of sweeping across the page. */
  const overlayerClass = cx(
    'dialog-overlayer',
    leaving
      ? !isDesktop && 'dialog-slide-out'
      : enter === 'pop'
        ? 'dialog-slide-back'
        : (enter === 'push' || (!isDesktop && opening)) && 'dialog-slide-in',
  );

  return (
    <div className={rootClass}>
      <div className={listClass}>
        <div className={overlayerClass}>
          <div className="dialog-item dialog-transparent-title dialog-no-title login-layout-dialog">
            {/* THE DIALOG SCROLLS AND SHOWS NO BAR FOR IT, which is the live dialog's own
                behaviour and is easy to read as a bug in either direction.
                ---------------------------------------------------------------------------
                `.scroll-y` alone paints the site's 4px thumb — `.app-root ::-webkit-scrollbar`
                is a descendant rule and `app-root` sits on <body>, so every scroller inside the
                page inherits it. That is right for most of them and wrong here: the card is
                sized to its content, so anything that grows it by a line — a refused sign-in
                adding its message under the password box is exactly the case — tips it into
                overflow and a bar appears down the side of a dialog that had none a moment ago.

                The site's own idiom for this is an arbitrary variant on the dialog's class list,
                `[&_.scroll-y]:[scrollbar-width:none]`, which is what `/promotions/promotion`
                passes. This dialog has no chunk to read that list off, so the equivalent class
                goes straight on the element — `.hidden-scroll-bar` is the original's own and
                covers WebKit as well, where the bare property does not.

                DO NOT COPY THIS TO THE NOTIFICATION DRAWER. That one deliberately shows its bar
                (`_e` hands its scroller exactly `class: "h-full"`, where the Explore overlay two
                functions up gets `hidden-scroll-bar`), and it carried this class for one revision
                by mistake. Each scroller's evidence is its own. */}
            <div className="scroll-y hidden-scroll-bar dialog-content">
              <div className="scroll-container">
                <div dir="ltr" className="contents">
                  {/* The tab bar is sticky INSIDE the scroller rather than fixed outside it,
                      which is why it carries its own layer2 background and bottom border. */}
                  <div className="sticky left-0 top-0 flex h-14 w-full items-center overflow-hidden border-b border-solid border-third bg-layer2 px-4 py-3">
                    <div className="ml-8 w-[86%] text-lg font-extrabold">
                      <div
                        role="tablist"
                        data-type="indicator"
                        className="scroll-x tabs-title hide-scroll h-14"
                        style={indicatorVars(active, tabs.length)}
                      >
                        <div className="tabs-btn-group">
                          {tabs.map((tab, index) => (
                            <button
                              key={tab.key}
                              type="button"
                              role="tab"
                              className="tabs-btn btn-like"
                              aria-selected={active === index ? 'true' : undefined}
                              /* The refusal belongs to the form it was raised on; carried across
                                 a tab switch, a Sign Up error would print under the Sign In
                                 password. The site-level refusals move tabs by `navigate`, not
                                 here, so they keep theirs. */
                              onClick={() => {
                                setError('');
                                navigate(tab.path, { replace: true });
                              }}
                            >
                              <span className="text-sm font-extrabold">{tab.label}</span>
                            </button>
                          ))}
                        </div>
                        <div className="tabs-indicator" />
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Close"
                      onClick={close}
                      className="button button-m ml-auto size-6 rounded-lg bg-[#373E3F] p-0"
                    >
                      <CloseIcon className="size-3.5 fill-secondary" />
                    </button>
                  </div>

                  <div className="px-6 pt-14 sm:px-9 sm:pt-12">
                    {mode === SIGN_UP ? (
                      <SignUpForm onSubmit={submit} error={error} onClearError={() => setError('')} />
                    ) : mode === 'forgot' ? (
                      <ForgotForm onBack={() => navigate('/login/signin', { replace: true })} />
                    ) : mode === 'reset' ? (
                      <ResetForm
                        token={new URLSearchParams(search).get('token') || ''}
                        onDone={() => navigate('/login/signin', { replace: true })}
                      />
                    ) : (
                      <SignInForm
                        onSubmit={submit}
                        pending={pending}
                        error={error}
                        onForgot={() => {
                          setError('');
                          navigate('/login/forgot', { replace: true });
                        }}
                      />
                    )}
                    <div className="mt-auto px-6 sm:px-8" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {twoFactor ? (
        <TwoFactorStep
          onConfirm={confirmTwoFactor}
          onClose={cancelTwoFactor}
          pending={twoFactorPending}
          error={twoFactorError}
          onClearError={() => setTwoFactorError('')}
        />
      ) : null}
    </div>
  );
}
