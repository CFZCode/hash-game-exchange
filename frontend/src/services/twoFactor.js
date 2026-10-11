import { request } from './client';
import { PLATFORM } from './endpoints';

/* Two-factor enrolment.
 *
 * `endpoints.js` has carried these five paths since the platform was first mapped, with a note
 * saying they were DECLARED AND DELIBERATELY NOT READ because the Security tile already knows the
 * on/off state from the profile. That note stays true of `status`. The four writes are a
 * different matter and this module is what finally calls two of them.
 *
 * ── WHAT THE PLATFORM ASKS FOR, WHICH IS LESS THAN THE ORIGINAL ───────────────────────────────
 *
 *   POST /user/2fa/enable          no body  ->  {qrCode, secret}
 *   POST /user/2fa/setup-verify    {code}   ->  {enabled: true}
 *
 * `qrCode` is a `data:image/png;base64,…` URI, ~3 KB, so it goes straight into an `<img src>`
 * with nothing to fetch. `secret` is the bare base32 the authenticator app would take typed in.
 * Read off the running server rather than the source, because the two differ elsewhere in this
 * module family.
 *
 * `code` is validated as `/^\d{6}$/` and refused otherwise, and `setup-verify` carries a rate
 * limiter of its own — so a wrong code is a refusal to show, not a field to pre-validate into
 * silence.
 *
 * THE ORIGINAL'S FLOW HAS TWO STEPS THIS ONE DOES NOT, and both are absent for the same reason
 * the password flow's are (see `modals/UserAction`):
 *
 *   `new-verify`     bc.game gates the secret behind an e-mail or phone code
 *                    (`scenario: "START_GOOGLE_2FA"`) and carries a `flowId` into the enable
 *                    call. Nothing on this platform issues that code, so the secret is handed
 *                    over on the first call instead. Inventing a code step with nothing behind
 *                    it would be a dead end rather than a port.
 *   the password     bc.game's `/2-step-auth/start/v2/` takes `{code, timestamp, password}` and
 *                    its dialog gates the button on both fields. `setup-verify` takes ONLY the
 *                    code — `.strict()`, so sending a password is a 422, not a no-op. The field
 *                    is therefore not rendered: a required input whose value is discarded is a
 *                    worse lie than an absent one, and this build already follows the platform's
 *                    contract over the original's shape wherever the two disagree.
 *
 * `disable` IS WIRED NOW (2026-09-04). The note here said there was "no unbind arm in the
 * original's `:action` switch to port a dialog from", which is true and was the wrong place to
 * look: disabling 2FA is not a `user-action` route on bc.game, it is a POPUP raised by the flow
 * manager — `ue()` in `index-CU_BJJlr.js`, which shows a "Disable 2FA" confirm and then runs the
 * generic `new-verify` before calling `/account/google/2-step-auth/stop/v3/`. The confirm is
 * ported verbatim; the verify step becomes a code-and-password form, because that is what this
 * platform's own route asks for and it is the same proof by a shorter path.
 */

/**
 * Begin enrolment: ask the platform for a secret and its QR.
 *
 * Answers `{qrCode, secret}`. Calling it again before finishing is safe and idempotent from the
 * caller's side — the platform re-issues, and `status.hasInitiated` flips true on the first call
 * whether or not the visitor ever completes it.
 */
export const beginTwoFactorSetup = () =>
  request(PLATFORM.user.twoFactor.enable, { live: true, method: 'POST', fixture: null });

/**
 * Finish enrolment with the six digits from the authenticator app.
 *
 * Answers `{enabled: true}`; a wrong or stale code rejects, and the dialog shows the refusal on
 * the code field rather than swallowing it.
 */
export const completeTwoFactorSetup = ({ code }) =>
  request(PLATFORM.user.twoFactor.setupVerify, {
    live: true,
    method: 'POST',
    json: { code },
    fixture: null,
  });

/**
 * Turn the second factor off.
 *
 * TWO PROOFS, AND THE PLATFORM ASKS FOR BOTH: a current authenticator code AND the account
 * password. That is stricter than enrolment, which is the right way round — the whole value of a
 * second factor is that removing it is harder than adding it. Legacy took neither: `POST
 * /2fa/disable {"uid": 123}` had no authentication at all and turned off any player's.
 *
 * The original reaches the same place through `new-verify` with `scenario: "STOP_GOOGLE_2FA"`,
 * which can be satisfied by a passkey or an e-mail code as well. Only the code-and-password arm
 * exists here; see the dialog for why that is a shorter path rather than a weaker one.
 */
export const disableTwoFactor = ({ code, password }) =>
  request(PLATFORM.user.twoFactor.disable, {
    live: true,
    method: 'POST',
    json: { code, password },
    fixture: null,
  });

export default beginTwoFactorSetup;
