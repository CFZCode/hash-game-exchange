import RouteDialog from '../../components/shared/RouteDialog';
import Help from './index';

/* `/help/:helpId` AS A DIALOG, which is what the route says it is on a phone. The `/help` entry
 * is a LAYOUT route and the flag sits on the layout rather than on either child:
 *
 *   { component: h("Layout"), path: "/help", info: { dialog: m.mobile },
 *     children: [{ path: "/", component: HelpCenter }, { path: "/:helpId", component: HelpCenter },
 *                { path: "/check/one_dollar_check", info: { dialog: !0 } }, … ] }
 *
 * so both `/help` and `/help/<topic>` ride one sheet, and switching topics inside it never
 * remounts the shell. That is why App matches the whole `/help` prefix rather than the bare path,
 * as it does for `/referral`.
 *
 * `dialog: m.mobile` is a BARE flag — no `behavior` — so this is the ordinary opaque title bar,
 * not the `transparent-title` one `/vip-detail` asks for and not `/bonus`'s `no-title`. All three
 * arms of that switch now have a consumer here.
 *
 * `h("Layout")` itself draws NOTHING: `Layout-BSXc1KNv.js` in the `static` remote is
 * `function e(t) { return t.children }`, one line. The "Help Center" string in the bar comes from
 * the PAGE — `o2` wraps its two blocks in `<PageLayout title={t("Help Center")}>` — which is the
 * same arrangement `/vip-detail` and the wallet panes have, and the reason the desktop arm draws
 * its own `<h1>` instead.
 */
export default function HelpDialog({ onClose, onBack, enter }) {
  return (
    <RouteDialog title="Help Center" onClose={onClose} onBack={onBack} enter={enter}>
      <Help mobile />
    </RouteDialog>
  );
}
