import RouteDialog from '../../components/shared/RouteDialog';
import Bonus from './index';

/* `/bonus` AS A DIALOG, which is what the route says it is on a phone:
 *
 *   { path: "/bonus", component: c(() => L.BonusV5Page()),
 *     info: { guards: [() => b.login ? !1 : "/"],
 *             dialog: m.mobile ? { behavior: "no-title" } : !1 } }
 *
 * The same DEVICE test `/wallet/withdraw` and `/referral` carry — page on a desktop, full-screen
 * dialog on a phone — with one difference that is the whole reason this file is three lines and
 * not one: `behavior: "no-title"` means the manager draws NO title bar. `Te`, the mobile layout
 * inside the page, supplies its own sticky Rewards/VIP strip and hangs the back arrow off it as
 * the Tabs component's `tabTitlePrefix`. So the arrow below is the page's, not the shell's, and
 * `onBack` is threaded down to it.
 *
 * `bonus-v5-dialog bonus-scope mt-st` is `PageLayout`'s own class list, verbatim. The first has
 * real rules (Bonus.css); the second is the token scope, which the page's root carries as well —
 * doubled on the original too, exactly as the promotions page's is. `mt-st` is
 * `margin-top: var(--safe-top)` and is inert here for the reason the desktop arm's `pt-st` is:
 * this build declares no `--spacing-st`, so Tailwind emits nothing for it.
 *
 * No guard is reproduced here. The page answers the sign-in one itself with the `<Navigate to="/">`
 * the route's own guard means, and App only mounts this dialog for a signed-in visitor — so a
 * logged-out one falls through to the plain route and redirects from there rather than from
 * inside a dialog. Same arrangement `/referral` uses.
 */
export default function BonusDialog({ onClose, onBack, enter }) {
  return (
    <RouteDialog
      noTitle
      label="Bonus"
      className="bonus-v5-dialog bonus-scope mt-st"
      onClose={onClose}
      onBack={onBack}
      enter={enter}
    >
      <Bonus mobile onBack={onBack || onClose} />
    </RouteDialog>
  );
}
