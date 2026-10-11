import RouteDialog from '../../components/shared/RouteDialog';
import { DialogRouteContext } from '../../context/dialogRoute';
import DailyContest from './index';

/* `/promotions/daily-contest` ON A PHONE — the same component the desktop renders as a page, shown
 * as a full-screen dialog instead.
 *
 * THE ROUTER SAYS SO, and it is a DEVICE test rather than a layout choice:
 *
 *   { path: "/promotions/daily-contest", component: c(() => L.DailyContest()), info: { dialog: m.mobile } }
 *
 * out of `Enter-MsmOuq5R.js`, which is in the mirror. `m.mobile` is read as the `lg` line here, as
 * everywhere else in this project — see hooks/useMediaQuery for why one answer is used for a flag
 * the original derives from screen size.
 *
 * THE TITLE IS THE PAGE'S OWN HEADING, not a string invented for the bar. On the original a page
 * root is `<PageLayout title="…">` and `w3` is three lines that push that title into the router's
 * dialog context and return bare children — so the same string is an `<h1>` on a page and a title
 * bar in a dialog, and exactly one of the two ever renders. This build's port of that context
 * carries the flag rather than the string, so the title is written at the mount and the page hides
 * its own heading when the flag is set. Same value either way, and it is why nothing here is
 * inferred: "Daily Contest" is the word already in the page.
 *
 * `pageGutter` because this page carries `px-4 sm:px-0` for its desktop arm — see the note on that
 * prop; the shell gives up its own inset rather than the page giving up the original's.
 */
export default function DailyContestDialog({ onClose, onBack, enter }) {
  return (
    <RouteDialog title="Daily Contest" onClose={onClose} onBack={onBack} enter={enter} pageGutter>
      <DialogRouteContext.Provider value>
        <DailyContest />
      </DialogRouteContext.Provider>
    </RouteDialog>
  );
}
