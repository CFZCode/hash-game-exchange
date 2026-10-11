import RouteDialog from '../RouteDialog';
import { DialogRouteContext } from '../../../context/dialogRoute';

/* A PAGE ROUTE SHOWN AS A DIALOG — the `info.dialog = m.mobile` case, which is a DEVICE test in
 * the original's router rather than a layout choice. The same component is a page inside the
 * layout column on a desktop and a full-screen dialog on a phone, and this is the phone half.
 *
 * It is three things over `RouteDialog`, all of which every such route wants and none of which a
 * page should have to know about:
 *
 *   - `DialogRouteContext` — the router's own "am I a dialog" context, which is what a page reads
 *     to drop the heading that has become the title bar (see pages/Promotions).
 *   - `pageGutter` — the shell gives up its 1rem inset because these pages already carry the
 *     original's `px-4 sm:px-0` for their desktop arm. See the prop's note.
 *   - the rest of RouteDialog's props passed straight through, so a route with a title, an action
 *     or a `transparent-title` behaviour says so at the mount.
 *
 * WHICH ROUTES, and the flags are the router's own out of `Enter-MsmOuq5R.js` — the titles too,
 * which is the part that cannot be guessed: a page's bar shows a string only if the page pushes
 * one, and most of these do not.
 *
 *   /promotions/promotion       title "Promotion", + an Archived action     (its own Dialog.jsx)
 *   /promotions/daily-contest   title from the page's own heading
 *   /quests                     title "Quests", layer1 body, clear bar      (chunk, verbatim)
 *   /promotions/weekly-raffle   title "Weekly Raffle"        — OURS, see below
 *   /deposit-offer              title "Deposit Offer"        — OURS, and CHOSEN, see below
 *   /referral-exhibition        title "Referral"             — OURS, see below
 *   /responsible[/:id]          title "Responsible Gambling" — OURS, see below
 *   /vip-detail, /vip           no title, `behavior: "transparent-title"`
 *
 * THE ORIGINAL PUTS NO TITLE ON THOSE FOUR AND THIS BUILD DOES — a deliberate departure, asked
 * for, and checked rather than assumed: each chunk was fetched and its root read, and none mounts
 * a dialog wrapper or pushes a title the way the promotions and quests chunks do. `index-DcrUJi8K.js`
 * is the clearest case, its root returning a bare context provider over three sections. So a bar
 * with only a back arrow is faithful, and a named one is not.
 *
 * The strings are nonetheless the ORIGINAL'S OWN NAMES for those routes rather than chosen words —
 * three come from the sidebar menu module `index-DuwOs_Mv.js` (in the mirror), and Referral's is
 * corroborated by a lone `get title(){return c("Referral")}` in the exhibition chunk itself. The
 * exception is Deposit Offer, which is a requested wording rather than a recovered one — the menu
 * calls that route Deposit Bonus. See
 * the note at the mounts in App.jsx. `/vip-detail` keeps its bare arrow because its bar is
 * transparent and floats over the hero artwork, where a title would print across the banner.
 */
export default function PageDialog({ children, ...props }) {
  return (
    <RouteDialog pageGutter {...props}>
      <DialogRouteContext.Provider value>{children}</DialogRouteContext.Provider>
    </RouteDialog>
  );
}
