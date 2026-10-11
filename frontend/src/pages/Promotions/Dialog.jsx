import React from 'react';
import RouteDialog from '../../components/shared/RouteDialog';
import { DialogRouteContext } from '../../context/dialogRoute';
import Promotions from './index';
import ArchivedPromotions from './Archived';
import { IconArchive } from './icons';

/* `/promotions/promotion` ON A PHONE — the same component the desktop renders as a page, shown
 * as a full-screen dialog instead.
 *
 * THE ROUTER SAYS SO, and it is a DEVICE test rather than a layout choice:
 *
 *   { path: "/promotions/promotion", component: c(() => L.Promotion()), info: { dialog: m.mobile } }
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
 * inferred: "Promotion" is the word already in the page.
 *
 * `pageGutter` because this page carries `px-4 sm:px-0` for its desktop arm — see the note on that
 * prop; the shell gives up its own inset rather than the page giving up the original's.
 */
export default function PromotionsDialog({ onClose, onBack, enter }) {
  const [archived, setArchived] = React.useState(false);

  return (
    <>
      <RouteDialog
        title="Promotion"
        onClose={onClose}
        onBack={onBack}
        enter={enter}
        pageGutter
        /* THE ARCHIVED BUTTON IS A TITLE-BAR ACTION ON A PHONE AND A TEXT BUTTON ON A DESKTOP,
           and both arms are the chunk's. Mobile is `actions: [{icon: Ne, label: b("Archived"),
           onClick: ae}]` on the dialog; desktop is `qe`, a `<Button type="input" size="s"
           class="border border-third bg-transparent px-2 text-sm text-secondary">Archived</Button>`
           rendered inside `<Show when={!x.mobile}>` at `absolute right-0 top-1` on the tab row.
           Only the mobile arm is built — this project's desktop promotions page predates the
           chunk and has no such button, and adding one is a change to a desktop that was asked to
           stay put. The handler is shared either way and it opens ./Archived.jsx. */
        actions={[
          { icon: IconArchive, label: 'Archived', onClick: () => setArchived(true) },
        ]}
        /* `[&_.dialog-title]:bg-layer3` in the chunk's class list, delivered through the
           manager's own `--bg` channel instead — 41 45 46 is `--color-layer3`'s #292D2E as the
           triple `rgb()` needs. It cannot be the utility the chunk writes: the shell's
           `.dialog-title` rule is unlayered and a Tailwind variant is not, so the utility would
           lose the cascade outright. See the note in RouteDialog.css.

           Two more of that class list are deliberately not copied. `bg-layer2` is already the
           shell's own `.dialog-overlayer` fill, so it would restate what is there.
           `text-transparent` relies on every descendant setting its own colour and would blank
           anything here that inherits one, and `[&_.scroll-y]:[scrollbar-width:none]` hides a
           scrollbar this build shows deliberately — see the notification drawer's scroller. */
        /* layer3 as the themed triple (`index.css`); a spelled-out `41 45 46` held the dark
           value in both themes. */
        titleColor="var(--layer3-rgb)"
      >
        <DialogRouteContext.Provider value>
          <Promotions />
        </DialogRouteContext.Provider>
      </RouteDialog>
      <ArchivedPromotions open={archived} onClose={() => setArchived(false)} env="H5" />
    </>
  );
}
