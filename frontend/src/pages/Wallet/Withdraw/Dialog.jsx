import RouteDialog from '../../../components/shared/RouteDialog';
import { DialogRouteContext } from '../../../context/dialogRoute';
import WithdrawPanels from './index';

/* `/wallet/withdraw` AS A DIALOG, which is what the route says it is on a phone:
 *
 *   { path: "/withdraw", component: c(() => O.DialogWithdraw()) }        <- group { dialog: !0 }
 *   { path: "/wallet/withdraw", ... info: { dialog: m.mobile } }         <- inside WalletLayout
 *
 * `info.dialog = m.mobile` is a DEVICE test, so the same component is a pane on a desktop and a
 * full-screen dialog on a phone. Only the pane arm existed here — `WithdrawPanels` was already
 * split out of a shell it did not yet have, exactly for this — and the dialog arm is now built on
 * `components/shared/RouteDialog`, extracted from `/user/enter` for it.
 *
 * THE TITLE COMES FROM THE PANEL, NOT FROM HERE, on the original: the pane's root is
 * `<PageLayout title="Withdraw">` and `w3` is three lines that push that string into the router's
 * dialog context and return bare children — so it is a dialog's title bar and nothing at all on a
 * page. `DialogRouteContext` is this project's port of that context and carries the flag rather
 * than the string, so the title is written at the mount instead. Same value either way.
 *
 * The context provider is what makes the panels render their dialog arm — `PageCard` and
 * `CwalletRow` each read it for themselves; see `context/dialogRoute.js` for the five branches
 * the original hangs off it.
 *
 * WHAT IS *NOT* DONE HERE: the rest of `/wallet/*`. The wallet LAYOUT carries the same
 * `info.dialog = m.mobile`, so on the original every pane is a full-screen dialog on a phone and
 * the rail never renders there at all. Withdraw is done because it is what the account page's
 * button reaches; Buy, Swap, Vault, Transaction, Rollover and Bet History still render inside the
 * layout's horizontal strip below 1100. They each want this same three-line file.
 */
export default function WithdrawDialog({ onClose, onBack, enter }) {
  return (
    <RouteDialog title="Withdraw" onClose={onClose} onBack={onBack} enter={enter}>
      <DialogRouteContext.Provider value>
        <WithdrawPanels />
      </DialogRouteContext.Provider>
    </RouteDialog>
  );
}
