import RouteDialog from '../../components/shared/RouteDialog';
import { DialogRouteContext } from '../../context/dialogRoute';
import ReferralDashboard from './Dashboard';

/* `/referral` AS A DIALOG, which is what the route says it is on a phone:
 *
 *   { path: "/referral", component: c(() => L.AffiliatePage()),
 *     info: { dialog: m.mobile, guards: [() => !b.login && "/referral-exhibition"] },
 *     children: [{ path: "" }, { path: "/my-rewards/:tab" },
 *                { path: "/refer/:tab" }, { path: "/rules" }] }
 *
 * `info.dialog = m.mobile` is the same DEVICE test `/wallet/withdraw` carries, so the same
 * component is a page on a desktop and a full-screen dialog on a phone. The children ride the
 * same dialog — they are tabs of one page, not separate routes with their own chrome — which is
 * why App matches the whole `/referral/…` prefix rather than the bare path.
 *
 * THE TITLE IS THE CHUNK'S, AND ITS PAGE ARM IS A DIFFERENT ELEMENT ENTIRELY. `g2`, the default
 * export of `index-CgFyS3aK.js`, is the whole of the branch:
 *
 *   function g2() {
 *     return <Show when={T.mobile} fallback={<Page/>}>
 *              <PageLayout title={t("Referral")}><Page/></PageLayout>
 *            </Show>
 *   }
 *
 * and inside `Page` the visible `<h2>Referral</h2>` is itself wrapped in `<Show when={!T.mobile}>`.
 * So the string does not disappear on a phone, it MOVES: heading on a desktop, title bar on a
 * phone, never both and never neither. The heading half is gated in Dashboard.jsx.
 *
 * `guards` are not reproduced here — the dashboard answers the sign-in one itself, with the
 * `<Navigate to="/referral-exhibition">` the exhibition page's mirror guard pairs with. App only
 * mounts this dialog for a signed-in visitor, so a logged-out one falls through to the plain
 * route and redirects there instead of redirecting from inside a dialog.
 */
export default function ReferralDialog({ onClose, onBack, enter }) {
  return (
    <RouteDialog title="Referral" onClose={onClose} onBack={onBack} enter={enter}>
      <DialogRouteContext.Provider value>
        <ReferralDashboard />
      </DialogRouteContext.Provider>
    </RouteDialog>
  );
}
