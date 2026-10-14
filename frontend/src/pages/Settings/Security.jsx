import { brandName } from '../../services/siteBranding';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/shared/Pagination';
import Loading from '../../components/shared/Loading';
import EmptyPlaceholder from '../../components/shared/EmptyPlaceholder';
import { useSession } from '../../context/session';
import AccountRestrictions from '../../components/modals/AccountRestrictions';
import TwoFactorDisable from '../../components/modals/TwoFactorDisable';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useResource } from '../../hooks/useResource';
import { getSessions, getAntiPhishingCode } from '../../services/settings';
import { securityStatus } from './strength';
import { useButtonSize } from './buttonSize';
import {
  IconSet,
  IconEmail,
  IconPhoneNumber,
  IconTwoFactor,
  IconPasskey,
  IconAntiPhishing,
  IconSuccess,
  IconAttention,
  IconMobile,
} from './icons';

/* `/settings/security` — `index-DA-0gLy9.js`, 23 KB, plus `index-DnPIrd_m.js` for the
 * anti-phishing card. Two cards: a grid of six security tiles under a strength badge, and the
 * Sessions table.
 *
 *   <PageLayout title={t("Security")}>
 *     <div class="w-full py-4 sm:py-0">
 *       <Show when={!isOfflineAgent}><SecuritySetup/></Show>
 *       <Sessions/>
 *
 * THE SIX TILES ARE SIX NEAR-IDENTICAL COMPONENTS IN THE CHUNK, not one driven by data, and the
 * differences between their class lists are real rather than transcription drift — see `Tile`.
 */

/* One tile. `He` / `ze` / `Ye` / `qe` / `Qe` / `q` all share this template:
 *
 *   <div class="relative mt-3 w-full dark:border-b border border-third p-4 pb-6 sm:rounded-lg
 *               sm:border-solid dark:sm:border-none dark:sm:bg-layer5 sm:bg-layer4">
 *     <div class="flex items-center[ justify-between]">{icon}{state}</div>
 *     <p class="mt-3 text-lg font-extrabold">{title}</p>
 *     <p class="mt-2 text-secondary">{desc}</p>
 *     <Show when={!mobile}><div class="mt-3 h-10 w-full"/></Show>
 *     <div class="mt-3 w-full sm:absolute sm:bottom-4 sm:left-0 sm:px-4">{button}</div>
 *
 * THE SPACER AND THE ABSOLUTE FOOTER ARE ONE MECHANISM. From `sm` up the button leaves the flow
 * and pins to the tile's bottom, and the `h-10` spacer is what reserves the height it left behind
 * — so every tile in a row ends up the same height with its button on the same line however long
 * its description wraps. Below `sm` neither applies and the button is simply the last child.
 *
 * ALL FOUR OF ITS SPACING NUMBERS ARE THE CHUNK'S, and the 20px between the description and the
 * button is the site's own rather than slack worth trimming: the reserve is 12 + 40 + 24 = 76px
 * while the button occupies only the last 56 (`bottom-4` plus its own 40). Measured against the
 * reference capture, where the description's ink ends 113.6 CSS into the tile and the button starts
 * at 136.8, against 110.4 and 158.4 here — the same gap. A tile that LOOKS looser than the capture
 * is the row stretching every tile to the tallest: this build's account has a verified e-mail, so
 * that tile takes the longer "To update your email address…" and wraps to two lines where the
 * captured account's is one. The pair was briefly tightened to `pb-4` / `mt-2` on request and is
 * reverted; anything below a 56px reserve hangs the button out of the tile.
 *
 * `justify-between` is on the Change Password and Two-factor tiles only; the other four leave the
 * row `flex items-center` and put `ml-auto` on the state mark instead. Same rendering, and both
 * are written as the chunk has them.
 *
 * The icon carries `fill-secondary` and NO size, so `.icon`'s own 2rem is what makes it 32px —
 * the one place on these pages where the wrapper's default size is load-bearing rather than
 * overridden.
 */
function Tile({ icon: Icon, done, title, desc, action, actionLabel, spread = false, dark = true }) {
  const isDesktop = useIsDesktop();
  const buttonSize = useButtonSize();

  return (
    <div
      className={
        dark
          ? 'relative mt-3 w-full border border-third p-4 pb-6 dark:border-b sm:rounded-lg sm:border-solid sm:bg-layer4 dark:sm:border-none dark:sm:bg-layer5'
          : /* The Passkey tile's own list, which carries no `dark:` variants at all — it is
               `sm:border-none sm:bg-layer5` unconditionally, so in the light theme it is the one
               tile filled layer5 where the other five are layer4. The chunk's, kept. */
            'relative mt-3 w-full border-b border-third p-4 pb-6 sm:rounded-lg sm:border-none sm:bg-layer5'
      }
    >
      {/* NEITHER MARK IN THIS ROW NAMES A SIZE, and both need `icon` for that to be survivable.
          The chunk writes them `<be class="fill-secondary"/>` and `<V class="ml-auto fill-brand"/>`
          — no width, no height — and gets away with it because the remote's icon wrapper prepends
          `icon`, which is `width: 2rem; height: 2rem; fill: currentColor`. This project's icons are
          the bare `<svg>`, and a bare `<svg>` with no dimensions stretches to fill its flex line:
          the tick came out the size of the card. Same trap as the solid-black one the icons module
          warns about, one property over. */}
      <div className={`flex items-center ${spread ? 'justify-between' : ''}`}>
        <Icon className="icon fill-secondary" />
        {done ? (
          <IconSuccess className={`icon fill-brand ${spread ? '' : 'ml-auto'}`} />
        ) : (
          <IconAttention className={`icon fill-setting-yellow ${spread ? '' : 'ml-auto'}`} />
        )}
      </div>
      <p className="mt-3 text-lg font-extrabold">{title}</p>
      {/* `max-sm:font-semibold` IS THIS BUILD'S, ASKED FOR — the chunk leaves every one of these
          lines at the body's 400 at both widths. Semibold rather than `font-bold`, and that is the
          font set rather than a hedge: this project ships Averta at 400/600/800 only, and CSS
          weight matching searches upward first, so 700 resolves to the 800 ExtraBold face — the
          trap the Vault Pro heading documents. 600 is the real step below it. One word to change
          if the heavier face is wanted. */}
      <p className="mt-2 text-secondary max-sm:font-semibold">{desc}</p>
      {isDesktop ? <div className="mt-3 h-10 w-full" /> : null}
      <div className="mt-3 w-full sm:absolute sm:bottom-4 sm:left-0 sm:px-4">
        {/* `type={done ? undefined : "brand"}` with `setting-button` in its place — so a settled
            tile gets the raised grey button and an unsettled one the brand fill, which is the
            whole of what the capture's mixed row of buttons is. The label span takes
            `font-extrabold text-primary` on the settled arm and nothing on the other, where
            `.button-brand` already supplies both. */}
        <button
          type="button"
          className={`button ${buttonSize} w-full ${done ? 'setting-button' : 'button-brand'}`}
          onClick={action}
        >
          <span className={done ? 'font-extrabold text-primary' : ''}>{actionLabel}</span>
        </button>
      </div>
    </div>
  );
}

/* `dt` — the tiles' card. `settings-security` and `settings-security-flex` are the account
   remote's own classes and only exist from 645px up; see Settings.css. */
function SecuritySetup() {
  const { session } = useSession();
  const navigate = useNavigate();
  /* The "Account Restrictions" confirm that stands in front of Change Password — the flow
     manager's own first step, see the tile below. */
  const [restricting, setRestricting] = React.useState(false);
  /* The Disable 2FA flow — a confirm and then a two-proof form, raised from the tile exactly as
     the flow manager raises it. See components/modals/TwoFactorDisable. */
  const [disabling2fa, setDisabling2fa] = React.useState(false);
  const { isWeak, isMedium, statusText } = securityStatus(session);
  const { data: phishingCode } = useResource(getAntiPhishingCode);

  const emailVerified = Boolean(session.emailVerified && session.email);

  return (
    <div className="w-full rounded-lg bg-layer4 p-3 sm:px-6 sm:py-4">
      <div className="flex h-11 items-center border-b border-third pb-3">
        <span className="text-base font-extrabold">Security Setup</span>
        {/* `text-alw_dark` on all three fills, so the badge's ink is the same near-black in both
            themes — `bg-setting-red` and `bg-setting-yellow` are flat literals rather than tokens
            and do not invert. */}
        <div
          className={`ml-auto flex h-5 items-center rounded-lg px-2.5 font-semibold text-alw_dark ${
            isWeak ? 'bg-setting-red' : isMedium ? 'bg-setting-yellow' : 'bg-brand'
          }`}
        >
          {statusText}
        </div>
      </div>

      <div className="settings-security">
        <div className="settings-security-flex">
          <Tile
            spread
            icon={IconSet}
            done={session.passwordExist}
            title={session.passwordExist ? 'Change Password' : 'Set Password'}
            desc={
              session.passwordExist
                ? 'Change your password regularly to keep it unique and secure.'
                : 'Create your own password for security.'
            }
            actionLabel={session.passwordExist ? 'Change Password' : 'Set Password'}
            /* THE FIRST TILE ON THIS PANE WITH A REAL DESTINATION. The chunk's handler is
               `b.passwordExist ? P.promisify_new("user-action")("password-change")
                                : (…)("password-bind")` — a flow manager that resolves to the same
               `/user-action/:action` dialog route this build navigates to directly, having no
               promise-returning dialog stack. `password-bind` is not built (it needs a
               code-issuing endpoint), so the unset-password arm still leads nowhere; the account
               this build signs in as has a password, which is the arm that matters.
               See components/modals/UserAction.

               THE FLOW MANAGER'S OWN FIRST STEP IS NOW HERE TOO. `pe(r)` in `index-CU_BJJlr.js`
               does not navigate straight away — it raises the "Account Restrictions" confirm and
               only routes once that resolves true. Raised from the TILE rather than from the
               route, which is where the original has it: a pasted `/user-action/password-change`
               skips it there as well. See components/modals/AccountRestrictions, and migration
               040, which is what makes the sentence it prints true. */
            action={session.passwordExist ? () => setRestricting(true) : undefined}
          />
          <Tile
            icon={IconEmail}
            done={emailVerified}
            title="Email Verification"
            desc={
              emailVerified
                ? 'To update your email address, please complete identity verification.'
                : 'Verify your email address is valid and accessible by you.'
            }
            actionLabel={emailVerified ? 'Change Email' : 'Verify Email'}
            /* Two of the eight `:action` arms, and the tile picks between them on the same test
               the label does. `email-change` is wired end to end; `email-bind` is drawn and says
               why it cannot record a result — `users` has no verified flag. See
               components/modals/UserAction. */
            action={() =>
              navigate(emailVerified ? '/user-action/email-change' : '/user-action/email-bind')
            }
          />
        </div>

        <div className="settings-security-flex">
          <Tile
            icon={IconPhoneNumber}
            done={session.hasPhone}
            title="Phone Number Verification"
            desc={
              session.hasPhone
                ? 'To update your phone number, please complete identity verification.'
                : 'Verify your phone number is valid and accessible by you.'
            }
            actionLabel={session.hasPhone ? 'Change Phone Number' : 'Verify Phone Number'}
            /* Both arms are drawn and neither can send a code: there is no SMS provider anywhere
               in the platform and `users.phone` is read-only (gap 24). */
            action={() =>
              navigate(session.hasPhone ? '/user-action/phone-change' : '/user-action/phone-bind')
            }
          />
          <Tile
            spread
            icon={IconTwoFactor}
            done={session.google2StepAuth}
            title="Two-factor authentication"
            desc="Enable Two-factor to protect your account from unauthorized access."
            actionLabel={session.google2StepAuth ? 'Disable 2FA' : 'Enable 2FA'}
            /* THE SECOND TILE ON THIS PANE WITH A REAL DESTINATION, and only on the Enable arm.
               `twofa-bind` is one of the eight `:action` arms `Main-B0RluUp6.js` switches over,
               so this navigates to the original's own route rather than to a shape invented
               here — see components/modals/UserAction.

               DISABLE IS WIRED NOW (2026-09-04). The note here said there was "no unbind arm in
               that switch to port a dialog from", which was true and was the wrong place to
               look: disabling is a POPUP the flow manager raises (`ue()` in `index-CU_BJJlr.js`),
               not a route. Confirm, then `POST /user/2fa/disable {code, password}`. See
               components/modals/TwoFactorDisable. */
            action={
              session.google2StepAuth
                ? () => setDisabling2fa(true)
                : () => navigate('/user-action/twofa-bind')
            }
          />
        </div>

        <div className="settings-security-flex">
          {/* `<Show when={ye()}>` — a WebAuthn support test rather than an account flag, so the
              tile is absent on a browser that cannot do passkeys. Reproduced with the same test
              the platform exposes. */}
          {typeof window !== 'undefined' && window.PublicKeyCredential ? (
            <Tile
              dark={false}
              icon={IconPasskey}
              done={session.passkeyHasSet}
              title="Passkey"
              desc="Using passkey to protect your account from unauthorized access."
              actionLabel={session.passkeyHasSet ? 'Edit Passkey' : 'Enable Passkey'}
              /* `DialogPasskey` — one dialog with two arms on the original, and only the intro
                 is reachable here: there is no WebAuthn support on the platform at all, so
                 `passkeyHasSet` can never become true. See components/modals/Passkey. */
              action={() => navigate('/settings/passkey')}
            />
          ) : null}
          {/* `__ENV_HOST__` in the i18n string, expanded through `license.host.toUpperCase()` —
              "BC.GAME", the same substitution the Buy Crypto disclaimer documents. */}
          <Tile
            icon={IconAntiPhishing}
            done={Boolean(phishingCode)}
            title="Anti-Phishing Code"
            desc={`This feature helps you verify the authenticity of communications from ${brandName()}`}
            actionLabel={phishingCode ? 'Change Anti-Phishing Code' : 'Enable Anti-Phishing Code'}
            /* THREE dialog routes, and the tile picks the entry point: a code already set goes
               straight to `detail`, and no code goes to `enter`, the explainer whose one button
               leads to `create`. See components/modals/AntiPhishing. */
            action={() =>
              navigate(phishingCode ? '/settings/phishing/detail' : '/settings/phishing/enter')
            }
          />
        </div>

        {/* The fourth row holds Close Account, behind `<Show when={!1}>` — dead on the live site
            too, so the row renders empty. Kept as the empty row it is rather than dropped, since
            `.settings-security-flex` is what would collapse if the count changed. */}
        <div className="settings-security-flex" />
      </div>

      {disabling2fa && <TwoFactorDisable onClose={() => setDisabling2fa(false)} />}
      {restricting && (
        <AccountRestrictions
          type="password"
          onCancel={() => setRestricting(false)}
          onConfirm={() => {
            setRestricting(false);
            navigate('/user-action/password-change');
          }}
        />
      )}
    </div>
  );
}

/* `_t` — the Sessions card. `POST /account/online/status/my/` answers 403, so the one row here is
 * the account's own current session; see settings.js.
 *
 * The list is PAGED CLIENT-SIDE in tens (`chunk(list, 10)` — lodash, inlined in the chunk), so the
 * pager changes nothing about what was fetched. Desktop draws a real `<table>`, a phone draws a
 * stack of rows with their own header line above it; the two are separate components on the
 * original and are separate here. */
function Sessions() {
  const isDesktop = useIsDesktop();
  const { data } = useResource(getSessions);
  const [page, setPage] = React.useState(1);

  const list = data ?? [];
  const pageRows = list.slice((page - 1) * 10, page * 10);

  /* `g` in `Tools-BOVtp0kN.js`: over 24h old prints a date, under it a time — and neither is
     reached for your own session, which short-circuits to the literal "Online".

     The original reads `ee.serverTime`, a store value, where this reads the clock — and it does so
     in a state INITIALISER rather than in the render body, which is what keeps the row stable
     across re-renders and what `react-hooks/purity` is asking for. One instant for the whole
     mount, which is also what a server time would be. */
  const [now] = React.useState(() => Date.now());

  const lastUsed = (row) =>
    row.myself
      ? 'Online'
      : now - row.lastTime > 86400000
        ? new Date(row.lastTime).toLocaleDateString()
        : new Date(row.lastTime).toLocaleTimeString();

  /* The chunk tests `device.includes("phone")` against bc.game's own labels. The platform's are
     parsed out of the user agent by `deviceLabel` and name the OS family — "iPhone", "Android" —
     so the test is widened to the words those labels can carry; a desktop label never has one. */
  const DeviceIcon = ({ device }) =>
    /iphone|ipad|android|phone|mobile/i.test(device) ? (
      <IconMobile className="size-5 flex-none fill-brand" />
    ) : (
      <IconMonitor className="size-5 flex-none fill-brand" />
    );

  return (
    <div className="mt-3 w-full rounded-lg bg-layer4 p-3 sm:mt-4 sm:px-6 sm:py-4">
      <div className="flex h-11 items-center border-b border-third pb-3">
        <span className="text-base font-extrabold">Sessions</span>
      </div>

      {!isDesktop ? (
        <div className="mt-3 flex h-4 items-center justify-between text-xs text-secondary">
          <span>Device</span>
          <span>Action</span>
        </div>
      ) : null}

      {!data ? (
        <div className="center h-40 w-full">
          <Loading />
        </div>
      ) : list.length === 0 ? (
        <div className="center h-40 w-full">
          <EmptyPlaceholder />
        </div>
      ) : (
        <div className="mt-3">
          {isDesktop ? (
            /* `setting-table` gives every `th`/`td` a flat 15% width and lets the `.left` column
               take the rest — one rule, and it is what stops the IP column from stretching the
               table. The header and the odd rows carry `rgba(0, 0, 0, 0.05)` inline, which is the
               chunk's own literal rather than `black_alpha5`; on a phone both go transparent. */
            <table className="setting-table mt-4 w-full text-secondary">
              <thead>
                <tr className="h-12" style={{ background: 'rgba(0, 0, 0, 0.05)' }}>
                  <th className="left pl-2 text-left">Device</th>
                  <th>Location</th>
                  <th>IP Address</th>
                  <th>Last Used</th>
                  <th className="pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr
                    key={row.deviceId}
                    className="h-12 text-center"
                    style={{ background: i % 2 === 1 ? 'rgba(0, 0, 0, 0.05)' : 'transparent' }}
                  >
                    <td className="left flex h-12 items-center pl-2 text-left">
                      <DeviceIcon device={row.device} />
                      <span className="ml-2 whitespace-nowrap font-semibold text-primary">
                        {row.device}
                      </span>
                    </td>
                    <td className="text-primary">
                      <span>{row.area || '-'}</span>
                    </td>
                    <td className="text-primary">
                      <span>{row.ip || '-'}</span>
                    </td>
                    <td className="text-primary">{lastUsed(row)}</td>
                    <td className="pr-2 text-right">
                      {row.myself ? (
                        <p className="text-primary">In Use</p>
                      ) : (
                        <button type="button" className="ml-auto text-error">
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            pageRows.map((row) => (
              <div
                key={row.deviceId}
                className="flex h-20 w-full items-center border-b border-solid border-third px-1 py-2"
              >
                <div>
                  <div className="flex items-center overflow-hidden">
                    <DeviceIcon device={row.device} />
                    <span className="whitespace-nowrap font-semibold">{row.device}</span>
                  </div>
                  <div className="my-1 flex items-center text-xs text-secondary">
                    <span>{row.area || '-'}</span>
                    <span className="px-1">|</span>
                    <span>{row.ip || '-'}</span>
                  </div>
                  <div className="text-xs text-secondary">{lastUsed(row)}</div>
                </div>
                <div className="ml-auto">
                  {row.myself ? (
                    <p className="text-secondary">In Use</p>
                  ) : (
                    <button type="button" className="ml-auto text-error">
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* `ae` on the original takes `current` / `pageSize` / `total` and derives the count;
              this build's shared Pagination takes the page count directly, and it returns null at
              one page — which is why the single-session capture shows no pager. `justify-end` is
              the chunk's own alignment and is the `end` arm the referral codes table added. */}
          <Pagination
            page={page}
            pages={Math.ceil(list.length / 10)}
            align="end"
            onChange={setPage}
          />
        </div>
      )}
    </div>
  );
}

/* `ee` in the Security chunk — the desktop icon beside a non-phone session. It is inline there
   rather than an icon chunk, so it is inline here: a monitor over a stand. */
const IconMonitor = (props) => (
  <svg viewBox="0 0 32 32" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M4 10.2227C4 6.95263 6.65088 4.30176 9.9209 4.30176H21.7627C25.0327 4.30176 27.6836 6.95263 27.6836 10.2227V17.3277C27.6836 20.5978 25.0327 23.2486 21.7627 23.2486H9.9209C6.65088 23.2486 4 20.5978 4 17.3277V10.2227ZM9.9209 6.67012C7.95889 6.67012 6.36836 8.26064 6.36836 10.2227V17.3277C6.36836 19.2897 7.95889 20.8803 9.9209 20.8803H21.7627C23.7247 20.8803 25.3152 19.2897 25.3152 17.3277V10.2227C25.3152 8.26064 23.7247 6.67012 21.7627 6.67012H9.9209ZM4 26.5136C4 25.8596 4.53018 25.3295 5.18418 25.3295H26.4994C27.1534 25.3295 27.6836 25.8596 27.6836 26.5136C27.6836 27.1676 27.1534 27.6978 26.4994 27.6978H5.18418C4.53018 27.6978 4 27.1676 4 26.5136Z"
    />
  </svg>
);

export default function SettingsSecurity() {
  return (
    <div className="w-full py-4 sm:py-0">
      <SecuritySetup />
      <Sessions />
    </div>
  );
}

/* Not built, each inert at its call site. Every tile's action opens a `user-action` verification
   flow — password / email / phone / 2FA / passkey — through a promise-returning dialog stack this
   build has no equivalent of, and ONE OF THE FIVE IS NOW WIRED: the password tile navigates
   straight to `/user-action/password-change` (see its own note above, and services/auth.js). The
   other four are still inert, and what each is waiting on is NOT the same thing:

     · email    — the platform implements the whole change (`ProfileService.changeEmail`, a spent
                  `change-email` proof on the NEW address) and exposes it ONLY over the socket.
                  `PUT /user/profile` takes username / country / avatar and nothing else, so there
                  is no HTTP route to call. docs/backend-gaps.md gap 23.
     · phone    — nothing to call at all: no phone route at any audience, and the OTP module is
                  e-mail only. That one is a feature, not a route file. Gap 24.
     · 2FA      — the ONLY tile here blocked purely on front-end work. All five routes exist and
                  answer (`/user/2fa/status|setup-verify|enable|verify|disable`); the tile already
                  shows the right state off `session.google2StepAuth`. Part 2 of the same doc.
     · passkey  — no backend anywhere in the delivery.

   Also inert: the anti-phishing routes behind its button (`/settings/phishing/enter` and
   `/detail`), which likewise have no backend; the Close Account tile and its two-step confirm
   (behind `<Show when={!1}>` on the live site as well); and a session's Remove, which POSTs
   `/account/online/status/my/<deviceId>/off/` behind a confirm — `GET /user/auth/sessions` is the
   only route on that resource, so there is nothing to revoke one session with. Gap 25. */
