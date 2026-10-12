import { Navigate, Outlet } from 'react-router-dom';
import MenuPageLayout from '../../components/shared/MenuPageLayout';
import { useSession } from '../../context/session';
import { useGates } from '../../context/gates';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { SETTINGS_MENU } from './menu';
import { useRedDot } from './strength';
import Status from './Status';
import './Settings.css';

/* `/settings/*` — Global Settings, six panes behind one rail.
 *
 * THE WHOLE FEATURE IS IN THE `account` FEDERATED REMOTE, which is the Help Center's finding
 * paying out for the third time (after `/user/enter` and My Profile). `Enter-MsmOuq5R.js` resolves
 * every one of these through `w`, whose `moduleName` is `account`, so none of them is in
 * `/assets/` at all — and the mirror saved that remote WITHOUT its lazy chunks. All seven came off
 * `hash.game/modules/account/assets/`, under the hashes the remote's own
 * `manifest-zssWG_dx.js` (which IS in the mirror) already lists:
 *
 *   index-B0Ab1fJ8.js   the layout + the phone's menu page   6.5 KB
 *   index-baue7lPM.js   Account Info                          28 KB
 *   index-DA-0gLy9.js   Security                              23 KB
 *   index-BgFc4GKH.js   Preferences                          8.1 KB
 *   index-DUZ1QIOc.js   Personal Verification                 40 KB
 *   index-0oESBrPp.js   Payment Methods                       11 KB
 *   index-D7PTq2J_.js   Whitelist Management                  13 KB
 *
 * plus `Privacy-ydLbf0kB.js`, `Status-DpPfKxTy.js`, `Tools-DlgQcNJh.js`, `index-DnPIrd_m.js` (the
 * anti-phishing card) and a dozen icon chunks. So every class list here is a Solid template's own,
 * every string is verbatim `t("…")`, and nothing on any of the six panes is read off a screenshot.
 *
 * The route, out of `Enter-MsmOuq5R.js`:
 *
 *   { path: "/settings", component: w("PageSettingLayout"),
 *     info: { dialog: m.mobile, guards: [ce] },
 *     children: [ { path: "", component: w("DialogPageSetting"),
 *                   info: { guards: [() => !m.mobile && "/settings/account-info"] } },
 *                 { path: "/account-info" }, { path: "/security" }, { path: "/preferences" },
 *                 { path: "/verification" }, { path: "/payment" }, { path: "/whiteList" } ] }
 *
 * A LAYOUT ROUTE, as `/wallet` is, and both of its flags are reproduced. `ce` is `authGuard`, so a
 * logged-out visitor gets the sign-in dialog rather than a redirect — wired in `App.jsx` where the
 * path is matched, the same shape `/user/enter` and `/favorite` take. `dialog: m.mobile` is the
 * DEVICE test, read as the 1024 line as everywhere here, and BOTH arms are built: rail-and-pane in
 * the layout column on a desktop, a full-screen dialog below it.
 *
 * THE BARE `/settings` CHILD IS TWO DIFFERENT THINGS, which is the part worth knowing before
 * reading `App.jsx`'s routes. Its own guard is `!mobile && "/settings/account-info"`, so on a
 * desktop it REDIRECTS onto the first pane and never renders; on a phone it is `DialogPageSetting`,
 * a full-page list of the six rows — see MenuPage.jsx. The rail and that list are the same six
 * entries rendered two ways, which is why `menu.js` holds the data and neither owns it.
 *
 * `SettingLayout` itself is `<Show when={!mobile} fallback={props.children}>`, i.e. below the
 * device line the layout draws NOTHING and the pane stands alone inside the dialog. Reproduced
 * exactly: this component returns a bare `<Outlet/>` there.
 */
export default function SettingsLayout() {
  const { session } = useSession();
  const isDesktop = useIsDesktop();
  const [redDot] = useRedDot();
  /* A pane whose section is off (Personal Verification: KYC off, or an agent's player) is not listed. */
  const { routeOn } = useGates();

  /* `guards: [ce]`. `App.jsx` raises the sign-in dialog over the page you came from, which is what
     the original's `"/login/signin?redirect=…"` does; this catches a sign-out performed while the
     page is already open. */
  if (!session.login) return <Navigate to="/" replace />;

  if (!isDesktop) return <Outlet />;

  return (
    <MenuPageLayout
      title="Global Settings"
      menu={SETTINGS_MENU.filter((row) => routeOn(row.href)).map((row) => ({
        key: row.key,
        href: row.href,
        title: (
          <>
            {/* `<r.iconName class="size-5 flex-none"/>` — NO fill anywhere in the chunk, because
                the remote's icon wrapper prepends `icon` (`fill: currentColor`) and the mark then
                takes the row's own text colour: `text-secondary` on the rail, `text-primary` on
                the active row. This project's icons are the bare `<svg>`, so `icon` is written at
                the call site. Same trap `AfterLogin/icons.jsx` warns about. */}
            <row.icon className="icon size-5 flex-none" />
            <span className="overflow-hidden whitespace-nowrap">{row.label}</span>
            {/* The red dot, drawn only while `exclusive_communities` is the string "false" — see
                the note on `useRedDot`. Never today, since this build's account has no
                communities. `bg-[red]` is the chunk's own arbitrary value rather than a token. */}
            {redDot === 'false' && row.href === '/settings/account-info' ? (
              <div className="ml-2 size-2 rounded-full bg-[red]" />
            ) : null}
            {row.haveDont ? <Status withImg /> : null}
          </>
        ),
      }))}
    >
      <Outlet />
    </MenuPageLayout>
  );
}
