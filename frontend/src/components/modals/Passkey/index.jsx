import { useNavigate } from 'react-router-dom';
import RouteDialog from '../../shared/RouteDialog';
import { IconPasskey } from '../../../pages/Settings/icons';
import personArt from '../../../assets/passkey-person.png';

/* `/settings/passkey` — the Passkey tile's dialog, `Enter-DCwW2aqp.js` (12.9 KB) off
 * `hash.game/modules/account/assets/`, resolved through the account remote's manifest as
 * `DialogPasskey`.
 *
 * ── TWO STATES, AND ONLY ONE IS REACHABLE HERE ────────────────────────────────────────────────
 *
 * `Je` branches on `passkeyHasSet`: with passkeys it draws a LIST (each row's name, created and
 * last-used dates, a pencil that opens an Edit Name popup and a bin behind a "Remove Passkey"
 * confirm) plus an Add button in the title bar; without, it draws `Ce` — the intro below.
 *
 * The list arm is not built because it cannot be reached: enrolling needs
 * `navigator.credentials.create()` against a challenge from `/account/passkey/get_add_challenge/`,
 * and this platform has NO passkey feature at all — no credential table, no WebAuthn routes, no
 * column. `session.passkeyHasSet` is false for every account and nothing can make it true. So the
 * intro is the whole of what a visitor here can see, and its Enable Passkey button is inert —
 * silently, because nothing in the chunk explains an absent feature and a line of this build's own
 * invention would be the only text on the screen that bc.game never wrote.
 *
 * That is also why the TILE is still gated on `window.PublicKeyCredential`: the original's own
 * test is browser support rather than an account flag, so a browser without WebAuthn does not
 * show the tile at all — reproduced, and orthogonal to the platform gap.
 *
 * ── THE THREE BULLET ICONS ARE TRANSCRIBED, THE THIRD IS SHARED ───────────────────────────────
 *
 * `me` and `fe` are drawn inline in the chunk rather than imported, so their paths are below.
 * `re` is `IconTwofactor-C9swzrKQ.js`, which this project already carries as
 * `pages/Settings/icons`' `IconTwoFactor` — checked to be the same drawing rather than assumed,
 * which is the `IconInform`/`IconCopy` collision this codebase has hit three times.
 */

/* `me` — the face between brackets. */
const IconFaceScan = (props) => (
  <svg viewBox="0 0 32 32" {...props}>
    <path d="M13.221 5.07001H8.84909C7.03818 5.07001 5.57014 6.53804 5.57014 8.34895V11.6279H7.7561V8.34895C7.7561 7.74531 8.24545 7.25597 8.84909 7.25597H13.221V5.07001ZM20.8719 7.25597V5.07001H24.1508C25.9618 5.07001 27.4298 6.53804 27.4298 8.34895V11.6279H25.2438V8.34895C25.2438 7.74531 24.7545 7.25597 24.1508 7.25597H20.8719ZM20.8719 24.7437H24.1508C24.7545 24.7437 25.2438 24.2544 25.2438 23.6507V20.3718H27.4298V23.6507C27.4298 25.4617 25.9618 26.9296 24.1508 26.9296H20.8719V24.7437ZM7.7561 20.3718V23.6507C7.7561 24.2544 8.24545 24.7437 8.84909 24.7437H13.221V26.9296H8.84909C7.03818 26.9296 5.57014 25.4617 5.57014 23.6507V20.3718H7.7561ZM17.0468 11.6279C17.6504 11.6279 18.1398 12.1173 18.1398 12.7209V17.0928C18.1398 17.5633 17.8386 17.981 17.3924 18.1297L15.7529 18.6762C15.1803 18.867 14.5612 18.5576 14.3704 17.9849C14.1795 17.4123 14.489 16.7934 15.0616 16.6024L15.9538 16.305V12.7209C15.9538 12.1173 16.4431 11.6279 17.0468 11.6279ZM13.2256 19.5989C12.7987 19.1721 12.1066 19.1721 11.6799 19.5989C11.253 20.0257 11.253 20.7178 11.6799 21.1446C14.3422 23.807 18.6588 23.807 21.3212 21.1446C21.7481 20.7178 21.7481 20.0257 21.3212 19.5989C20.8944 19.1721 20.2023 19.1721 19.7755 19.5989C17.9668 21.4077 15.0343 21.4077 13.2256 19.5989ZM11.035 12.7209C11.035 12.1173 11.5244 11.6279 12.128 11.6279C12.7317 11.6279 13.221 12.1173 13.221 12.7209V13.8139C13.221 14.4175 12.7317 14.9068 12.128 14.9068C11.5244 14.9068 11.035 14.4175 11.035 13.8139V12.7209ZM20.8719 11.6279C20.2682 11.6279 19.7789 12.1173 19.7789 12.7209V13.8139C19.7789 14.4175 20.2682 14.9068 20.8719 14.9068C21.4755 14.9068 21.9648 14.4175 21.9648 13.8139V12.7209C21.9648 12.1173 21.4755 11.6279 20.8719 11.6279Z" />
  </svg>
);

/* `fe` — a phone overlapping a laptop, the "works across all devices" mark. */
const IconDevices = (props) => (
  <svg viewBox="0 0 32 32" {...props}>
    <path d="M24.3717 11.4014C26.4235 11.4014 28.0873 13.0645 28.0875 15.1162V22.5469C28.0875 24.5988 26.4236 26.2627 24.3717 26.2627H19.9137C18.7141 26.2627 17.6476 25.6938 16.9684 24.8115H16.9674C16.9638 24.8068 16.9602 24.8016 16.9567 24.7969C16.9102 24.7358 16.8656 24.6733 16.8229 24.6094C16.8141 24.5962 16.8061 24.5826 16.7975 24.5693C16.7659 24.5208 16.735 24.4719 16.7057 24.4219C16.6924 24.3992 16.6794 24.3765 16.6666 24.3535C16.5932 24.2218 16.5276 24.0853 16.4703 23.9443C16.4614 23.9223 16.4525 23.9002 16.444 23.8779C16.3898 23.7367 16.3441 23.5913 16.3073 23.4424C16.3001 23.4135 16.2932 23.3846 16.2867 23.3555C16.2727 23.2919 16.2604 23.2278 16.2496 23.1631C16.2482 23.1546 16.2471 23.1462 16.2457 23.1377C16.2332 23.059 16.223 22.9796 16.2155 22.8994C16.2149 22.893 16.2131 22.8863 16.2125 22.8799H16.2135C16.2038 22.7703 16.1979 22.659 16.1979 22.5469V15.1162C16.1981 13.0645 17.8619 11.4014 19.9137 11.4014H24.3717ZM15.0231 22.8799C15.0696 23.5728 15.2602 24.2271 15.5651 24.8115H5.42542C4.91649 24.8115 4.50359 24.3789 4.50354 23.8457C4.50354 23.3125 4.91647 22.8799 5.42542 22.8799H15.0231ZM19.9137 21.8047C19.5035 21.8047 19.1708 22.1367 19.1705 22.5469C19.1705 22.7458 19.2493 22.9262 19.3766 23.0596C19.5119 23.2014 19.7022 23.29 19.9137 23.29H24.3717C24.7821 23.29 25.1149 22.9574 25.1149 22.5469C25.1146 22.1367 24.7819 21.8047 24.3717 21.8047H19.9137ZM18.3268 5.7373C20.7594 5.73739 22.7519 7.7128 22.9225 10.2158H19.9137C17.2069 10.2158 15.0126 12.4095 15.0123 15.1162V21.1836H9.11096C6.56641 21.1834 4.50354 19.0223 4.50354 16.3564V10.5645C4.50354 7.89869 6.56641 5.73748 9.11096 5.7373H18.3268Z" />
  </svg>
);

/* `Ce` — the intro. `ge` is its template, and the whole block carries the type: `text-secondary
   text-base font-semibold py-8 leading-6 px-2`, so every line inherits rather than repeating it.
   `tracking-wider` on each paragraph is the chunk's own. */
const BULLETS = [
  [IconFaceScan, 'Log in without password, verify your identity easily.'],
  [IconPasskey, 'Improves security and keeps your account safe.'],
  [IconDevices, 'Quick and convenient, works across all devices.'],
];

export default function PasskeyDialog({ onClose, onBack, enter }) {
  const navigate = useNavigate();

  return (
    /* `U(() => !!passkeyHasSet)() ? "Passkey" : "Enable passkey"` — the lowercase `p` on the
       second one is the chunk's, not a slip here. Always the second arm on this build. */
    <RouteDialog title="Enable passkey" onClose={onClose} onBack={onBack} enter={enter}>
      <div className="px-2 py-8 text-base font-semibold leading-6 text-secondary">
        <div className="center flex">
          <img alt="person" className="h-24 w-auto" src={personArt} />
        </div>
        <p className="mt-4 tracking-wider">Passkey are easier and more secure than passwords.</p>
        {BULLETS.map(([Icon, text]) => (
          <div key={text} className="mt-2 flex items-center">
            <Icon className="size-8 fill-primary" />
            <p className="ml-2 tracking-wider">{text}</p>
          </div>
        ))}

        {/* `<Button class="w-full mt-6" type="brand" onClick={t.addPasskey}>Enable Passkey</Button>`
            — no `disabled` on the original, and none here. INERT: `addPasskey` runs `new-verify`,
            fetches a WebAuthn challenge and posts the credential back, three routes this platform
            does not have. Nothing is claimed on screen about that; the reason lives in the note at
            the head of this file and in docs/settings.md, with the rest of the pane's inert
            controls. */}
        <button type="button" className="button button-brand mt-6 w-full">
          Enable Passkey
        </button>
        {/* `s("/help/passkey")` — a Help Center article, and that route IS built here. */}
        <div className="center mt-4 flex">
          <button
            type="button"
            className="font-extrabold text-primary underline"
            onClick={() => navigate('/help/passkey')}
          >
            Learn More
          </button>
        </div>
      </div>
    </RouteDialog>
  );
}
