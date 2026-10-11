import RouteDialog from '../shared/RouteDialog';
import NotificationPanel from './Panel';

/* `/notification` — the route the mobile account page's Notification row points at, and the
 * desktop header's bell's counterpart on a phone.
 *
 * THE ROUTE IS `dialog: !0`, i.e. a dialog at EVERY width and not a device test — out of
 * `Enter-MsmOuq5R.js`, where `/notification/*` sits with the other always-dialog routes. It is
 * matched below `lg` here anyway, because above it the bell opens the right-hand drawer instead
 * and the two would otherwise both be reachable.
 *
 * BUILDING IT IS THE SHELL, NOT THE BODY, which is why this file is four lines: the wrapper on
 * the original (`index-CwG2ydUc.js`) is `<PageLayout title="Notification" class="max-width-dialog">
 * <Main/></PageLayout>`, and `Main` is `Main-_tXJgJzI.js` — already built here as
 * `components/Notification/Panel`, because the desktop drawer renders the same component. So the
 * panel, its three tabs, its filters and its empty states are the ones already in the project and
 * nothing about them is duplicated for this route.
 *
 * `animateExit` — see the prop's note in RouteDialog. This is the first route to ask for the
 * outgoing half, so closing plays the enter backwards instead of the panel disappearing on the
 * frame the navigation lands.
 */
export default function NotificationDialog({ onClose, onBack, enter }) {
  return (
    <RouteDialog
      title="Notification"
      onClose={onClose}
      onBack={onBack}
      enter={enter}
      animateExit
      pageGutter
    >
      {/* `title={false}` — the bar above is this route's own `PageLayout title`, and the panel
          writes the drawer shell's identical one. On the original those are two different
          components (`_e` draws the drawer's, `w3` the route's) and only one is ever mounted;
          here one component serves both, so the route turns its copy off. */}
      <NotificationPanel title={false} />
    </RouteDialog>
  );
}
