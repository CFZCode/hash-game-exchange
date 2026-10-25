import { useNavigate } from 'react-router-dom';
import Loading from '../../components/shared/Loading';
import { useSession } from '../../context/session';
import { useGates } from '../../context/gates';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useResource } from '../../hooks/useResource';
import { getConnections } from '../../services/settings';
import { useButtonSize } from './buttonSize';
import {
  IconGoogle,
  IconTelegram,
  IconLine,
  IconTwitter,
  IconSteam,
} from './icons';
import { avatarSrc } from '../../services/avatars';
/* `F.tips` — the green tick beside a verified field, and it is an IMAGE rather than an icon
   component on the original: the remote's asset map (`index-DCuiUMn6.js`, which IS in the mirror)
   holds sixteen entries, fifteen of them base64 data URIs and this one a real file at
   `/modules/account/assets/tips-BrCxPSw3.png`. Fetched under the plain name. Using `IconSuccess`
   instead would have been the obvious substitution and would have been a different drawing. */
import tipsMark from '../../assets/settings/tips.png';
import { toast } from '../../components/shared/Toast/toast';
import { copyToClipboard } from '../../utils/clipboard';

/* `/settings/account-info` — `index-baue7lPM.js`, 28 KB, and the rail's first row.
 *
 * Five cards on the original, three of which can render here:
 *
 *   Profile Info          avatar, name, User ID, an Edit button        — the session's own
 *   Contact Info          e-mail and phone, each with a state button   — the session's own
 *   Linked Accounts       `/account/link/list/`      6002 -> no card
 *   Exclusive Communities `/agent/affiliate/community-links` 6002 -> no card
 *   Account Connections   `/account/open/info/list/` 6002 -> the six rows off the capture
 *
 * The middle two are `<Show when={list.length}>`, so a shut feed is not an empty card but no card
 * at all — which is exactly what the desktop capture shows, and is why nothing was invented for
 * either. See settings.js for the probe.
 */

/* `o1` — the connection row's mark, a switch across fourteen `openName` values of which this
   deploy's feed uses six. Note the switch tests both cases for four of them ("line"/"LINE",
   "telegram"/"Telegram", …), which is the SERVER being inconsistent rather than the component
   being defensive; the fixture keeps the lower-case spelling the capture shows. */
const CONNECTION_ICON = {
  google: IconGoogle,
  telegram: IconTelegram,
  Telegram: IconTelegram,
  line: IconLine,
  LINE: IconLine,
  twitter: IconTwitter,
  Twitter: IconTwitter,
  steam: IconSteam,
};

/* `te` — the connected account's masked address: everything before the `@` past the fourth
   character becomes a star. Unreachable while nothing is connected, and ported because it is four
   lines and is the row's only piece of logic. */
function maskEmail(value) {
  const parts = value.split('@');
  if (parts.length !== 2) return value;
  const [name, host] = parts;
  return `${name.length > 4 ? name.slice(0, 4) + '*'.repeat(name.length - 4) : name}@${host}`;
}

/* `ee` — Account Connections. `mb-4 mt-4` on the card is the chunk's own, which is why this one
   card carries a bottom margin where the two above it do not. */
function Connections() {
  const isDesktop = useIsDesktop();
  const buttonSize = useButtonSize();
  const { data } = useResource(getConnections);

  return (
    <div className="mb-4 mt-4 w-full rounded-lg bg-layer4 p-3 sm:px-6 sm:py-4">
      <div className="flex h-11 items-center border-b border-solid border-third pb-3">
        <span className="text-base font-extrabold">Account Connections</span>
      </div>

      {!data ? (
        /* `h-100` — 25rem, and a real class on this deploy rather than the `w-30` trap: the remote
           ships its own Tailwind build, which generates it. Unreachable while fixtures answer
           synchronously. */
        <div className="center flex h-100 w-full">
          <Loading />
        </div>
      ) : (
        data.map((row) => {
          const Mark = CONNECTION_ICON[row.openName];

          return (
            <div
              key={row.openName}
              className="flex items-center border-b border-solid border-third"
            >
              <div className="flex w-full items-center justify-between py-4">
                <div className="relative flex items-start">
                  <div className="center flex size-6">
                    {Mark ? <Mark className="size-6 flex-none fill-secondary" /> : null}
                  </div>
                  <div className="ml-3">
                    {/* `capitalize` is what turns the feed's own lower-case `openName` into
                        "Cwallet" / "Google" / "Telegram" — the row prints the raw field. */}
                    <span className="relative text-base font-semibold capitalize">
                      {row.openName}
                    </span>
                    {/* A PHONE PUTS THE STATE UNDER THE NAME AND A DESKTOP PUTS IT THERE TOO —
                        the difference is that the phone's arm also carries the connected
                        account's own address inline, where the desktop lifts that into its own
                        column between the name and the button. */}
                    {!isDesktop ? (
                      <div className="mt-2 flex items-center text-tertiary max-sm:font-semibold">
                        {row.connected ? (
                          <img alt="tips" className="size-6 flex-none" src={tipsMark} />
                        ) : null}
                        <p className={row.connected ? 'text-secondary' : ''}>
                          {row.connected
                            ? row.gmail || row.openUserName
                            : 'Not Connected'}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-secondary max-sm:font-semibold">
                        {row.connected ? 'Connected' : 'Not Connected'}
                      </p>
                    )}
                  </div>
                </div>

                {row.connected && isDesktop ? (
                  <div className="flex items-center">
                    <img alt="tips" className="size-7 flex-none" src={tipsMark} />
                    <p className="ml-2 font-semibold text-secondary">
                      {row.gmail ? maskEmail(row.gmail) : (row.openId ?? row.openUserName)}
                    </p>
                  </div>
                ) : null}

                {row.connected ? (
                  <div className="flex flex-col items-center gap-2">
                    <button type="button" className={`button button-second ${buttonSize} min-w-[110px]`}>
                      Disconnect
                    </button>
                  </div>
                ) : (
                  /* `min-w-[110px]` on both arms, so a Connect button and a Disconnect one are
                     the same width and the column does not jump as rows settle. */
                  <button type="button" className={`button button-brand ${buttonSize} relative min-w-[110px]`}>
                    Connect
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function SettingsAccountInfo() {
  const { session } = useSession();
  const navigate = useNavigate();
  const buttonSize = useButtonSize();
  // An agent's player: no email, phone or Google here (user, 2026-10-25) — their agent owns the account.
  const { agentPlayer } = useGates();

  const emailVerified = Boolean(session.emailVerified && session.email);

  return (
    <>
      {/* Profile Info. `sm:mt-0` on the first card and `mt-4` below it — the phone gets the
          margin, the desktop gets none because the pane column starts here. */}
      <div className="mt-4 w-full rounded-lg bg-layer4 p-3 sm:mt-0 sm:px-6 sm:py-4">
        <div className="flex h-11 items-center border-b border-solid border-third pb-3">
          <span className="text-base font-extrabold">Profile Info</span>
        </div>
        <div className="mt-3 flex items-center">
          {/* The ring is `bg-layer5` showing through a `p-1` inset, not a border — so the avatar
              is 56px inside a 64px disc. `j.avatar(userId)` is the CDN path on the original; this
              account has no live avatar, so it is the same local default the header uses. */}
          <div className="size-16 rounded-full bg-layer5 p-1">
            <div className="h-full w-full overflow-hidden rounded-full">
              <img alt="avatar" className="h-full w-full" src={avatarSrc(session?.avatar)} />
            </div>
          </div>
          <div className="ml-2.5">
            <p className="text-base">{session.name}</p>
            <p className="mt-1 text-secondary max-sm:font-semibold">
              <span>User ID:</span>
              {/* `T = c => { try { h1.copyToClipboard(c ? c + "" : "-"), V.success("Copied") }
                  catch {} }` in the account-info chunk — a SUCCESS toast here, unlike the bare
                  "Copied." the profile dialog raises, and the string is untranslated. */}
              <span
                className="ml-0.5 cursor-pointer"
                onClick={() => {
                  copyToClipboard(session.userId ? String(session.userId) : '-');
                  toast.success('Copied');
                }}
              >
                {session.userId || '-'}
              </span>
            </p>
          </div>
{/* The site admin edits an agent player's profile, not the player. */}
          {!agentPlayer && (
          <button
            type="button"
            className={`button button-brand ${buttonSize} ml-auto h-8 min-w-24 overflow-hidden sm:h-10 sm:min-w-24`}
            onClick={() => navigate('/settings/edit-profile')}
          >
            <span className="ml-0.5 whitespace-nowrap">Edit</span>
          </button>
          )}
        </div>
      </div>

      {/* Contact Info, gated on `isOfflineAgent` like the rail's bottom three rows.

          THE TWO ROWS ARE THE SAME SHAPE AND NEITHER IS A FLEX ROW BELOW `sm`: `sm:flex
          sm:items-center` is what puts the field and its button side by side on a desktop, where a
          phone stacks them and the button goes `w-full`. */}
      {!agentPlayer && (
      <div className="mt-3 w-full rounded-lg bg-layer4 p-3 sm:mt-4 sm:px-6 sm:py-4">
        <div className="flex h-11 flex-col items-start justify-center border-b border-solid border-third pb-3">
          <span className="text-base font-extrabold">Contact Info</span>
        </div>
        <div className="mt-3">
          {/* See the note in Security.jsx on `max-sm:font-semibold`; it is the same departure,
              applied to every secondary line in this card. */}
          <p className="flex h-4.5 items-center text-secondary max-sm:font-semibold">
            E-mail Verification
          </p>
          <div className="sm:flex sm:items-center">
            {session.email ? (
              <div className="mt-1.5 flex h-12 w-full items-center rounded-lg border border-solid border-input bg-input_bright px-4 sm:h-10">
                {/* `noline` is `text-decoration: none !important` out of the remote's own bootstrap
                    CSS — an address that would otherwise be underlined by a UA stylesheet. */}
                <span className="noline text-base text-secondary">{session.email}</span>
                {emailVerified ? (
                  <div className="ml-auto flex items-center">
                    <img alt="tips" className="h-6 w-6" src={tipsMark} />
                    <span className="ml-1 text-xs font-extrabold text-brand">Verified</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-1.5 text-secondary max-sm:font-semibold sm:flex-1">
                Verify your email address is valid and accessible by you.
              </p>
            )}
            <button
              type="button"
              className={`button button-brand ${buttonSize} mt-3 w-full flex-none sm:ml-2 sm:mt-1.5 sm:w-auto sm:min-w-24`}
            >
              {/* `text-primary_brand` on the label — the brand button's own ink, written on the
                  span rather than inherited, which is the chunk's. */}
              <span className="ml-1 text-primary_brand">
                {emailVerified ? 'Change' : session.email ? 'Verify' : 'Add'}
              </span>
            </button>
          </div>

          <p className="mt-4 flex h-4.5 items-center text-secondary max-sm:font-semibold">
            Phone Number
          </p>
          <div className="sm:flex sm:items-center">
            {session.hasPhone ? (
              /* `B1` — the verified-phone row, `(+<areaCode>) <phone>` with a Verified mark. It
                 reads the phone store rather than the account, and this build's account has no
                 phone, so the arm below is the one that renders. */
              <div className="mt-3 flex h-12 w-full items-center rounded-lg border border-solid border-input bg-input_bright px-4 sm:h-10">
                <span className="text-base text-secondary">
                  {`(+${session.areaCode ?? ''}) ${session.phone ?? ''}`}
                </span>
                <div className="ml-auto flex items-center">
                  <img alt="tips" className="h-6 w-6" src={tipsMark} />
                  <span className="ml-1 text-xs font-extrabold text-brand">Verified</span>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-secondary max-sm:font-semibold sm:flex-1">
                Verify your phone number and you can use the phone as your second login method.
              </p>
            )}
            <button
              type="button"
              className={`button button-brand ${buttonSize} mt-3 w-full flex-none sm:ml-2 sm:mt-1.5 sm:w-auto sm:min-w-24`}
            >
              <span className="ml-1 text-primary_brand">{session.hasPhone ? 'Change' : 'Add'}</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {!agentPlayer && <Connections />}
    </>
  );
}

/* THE EDIT BUTTON NOW OPENS SOMETHING — `/settings/edit-profile`, `DialogEditProfile`, whose
   dialog is `components/modals/EditProfile`. It navigated there already; what was missing was a
   dialog on the other end, so the route fell to the catch-all and rendered the pane shell.

   Still not built, each inert at its call site: every Connect and Disconnect (each opens a
   `payment-gateway.html` popup or a `new-verify` flow and then POSTs
   `/account/open/<name>/bind|unbind/`), the Cwallet row's own two-step bind and its "Go to
   Cwallet" link, the Telegram login widget the Connect button embeds for that one row, and the
   `user-action` flows behind Contact Info's two buttons. The Linked Accounts and Exclusive
   Communities cards are BUILT on the original and are absent here only because their feeds are
   shut — see settings.js. */
