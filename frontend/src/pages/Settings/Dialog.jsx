import { useLocation } from 'react-router-dom';
import RouteDialog from '../../components/shared/RouteDialog';
import { DialogRouteContext } from '../../context/dialogRoute';
import { PANE_TITLE } from './menu';
import MenuPage from './MenuPage';
import AccountInfo from './AccountInfo';
import Security from './Security';
import Preferences from './Preferences';
import Verification from './Verification';
import Payment from './Payment';
import Whitelist from './Whitelist';
import './Settings.css';

/* `/settings/*` ON A PHONE — the same six panes the desktop shows beside a rail, each as a
 * full-screen dialog instead, plus the menu list that stands in for the rail.
 *
 * THE ROUTER SAYS SO: `info: { dialog: m.mobile }` on the `/settings` layout route, a DEVICE test
 * read as the 1024 line here as everywhere. `SettingLayout` is
 * `<Show when={!mobile} fallback={props.children}>`, so below that line the layout draws nothing
 * at all and the pane stands alone — which is what this shell wraps.
 *
 * THE PANE IS RESOLVED FROM THE PATHNAME RATHER THAN FROM `<Outlet/>`, and that is forced rather
 * than chosen: a dialog route in this build is matched in `App.jsx` and mounted BESIDE `<Routes>`,
 * so there is no matched `<Route>` for an outlet to fill — the same reason the two profile dialogs
 * read their `:userId` off the pathname instead of through `useParams`.
 *
 * THE TITLE IS THE PANE'S OWN. Each chunk's root is `<PageLayout title={t("…")}>` and `w3` pushes
 * that string into the router's dialog context, so the same word is this bar's title and nothing
 * at all on a desktop, where the rail and the card headings carry it instead. The bare path takes
 * the layout's own "Global Settings".
 */
const PANES = {
  'account-info': AccountInfo,
  security: Security,
  preferences: Preferences,
  verification: Verification,
  payment: Payment,
  whitelist: Whitelist,
  /* The router's own spelling of the last child; the rail links to the lowercase one. Both are
     accepted here for the same reason React Router accepts both. */
  whiteList: Whitelist,
};

export default function SettingsDialog({ onClose, onBack, enter }) {
  const { pathname } = useLocation();
  const segment = pathname.replace(/^\/settings\/?/, '').replace(/\/$/, '');
  const Pane = PANES[segment];

  return (
    /* NO `pageGutter` HERE, unlike every other `dialog: m.mobile` route in this build — and that is
       the difference between a page that carries its own `px-4 sm:px-0` and one that does not. The
       six panes carry a VERTICAL rhythm of their own (`py-4 sm:py-0`) and no horizontal inset at
       all, because on the original the inset comes from `.dialog-content`'s own `padding-inline:
       1rem` on a phone and from the pane column on a desktop. Zeroing the shell's half would put
       every card flush against the screen edges. */
    <RouteDialog
      title={Pane ? PANE_TITLE[segment.toLowerCase()] : 'Global Settings'}
      onClose={onClose}
      onBack={onBack}
      enter={enter}
    >
      <DialogRouteContext.Provider value>
        {Pane ? <Pane /> : <MenuPage />}
      </DialogRouteContext.Provider>
    </RouteDialog>
  );
}
