import React from 'react';
import { useSession } from '../../context/session';
import { useConfirm } from '../../layouts/MainLayout/Header/AfterLogin/useConfirm';
import LanguageCurrencyModal from '../../components/modals/LanguageCurrencyModal';
import PopCenter from '../../components/shared/PopCenter';
import RouteDialog from '../../components/shared/RouteDialog';
import Refer from '../../components/modals/Refer';
import Panels from './Panels';
import './UserEnter.css';

/* The mobile account page — `/user/enter`, which is what the mobile header's avatar navigates to
 * and what the desktop header opens as a dropdown instead.
 *
 * IT IS A DIALOG ROUTE, not a page, and the route says so:
 *
 *   { path: "/user/enter",
 *     component: w("DialogUserEnter"),
 *     info: { guards: [() => !m.mobile && "/"],
 *             dialog: { behavior: "transparent-title" } } }
 *
 * inside a group carrying `{ dialog: !0, guards: [ce] }` — `ce` being the sign-in guard the
 * wallet layout also uses. Both guards are reproduced in App.jsx, where the route is matched.
 *
 * `DialogUserEnter` is a FEDERATED component — `Enter-MsmOuq5R.js` resolves it through the
 * `account` remote, whose `manifest-zssWG_dx.js` maps the expose to `Enter-LgsyJFjc.js`. The
 * mirror saved that remote without its lazy chunks, so the file (62 KB) came off
 * `hash.game/modules/account/assets/`, along with `Tool-iuNkSQmo.js`, `CopyInput-B_53zFi6.js`,
 * `Signout-CdJMMBfB.js`, `Status-DpPfKxTy.js`, `IconSetting-*`, `IconLight-*`, `IconAttention-*`
 * and the page's own stylesheet `Enter-CtHSAdBf.css`. That is the Help Center's finding one
 * directory up, and it means NOTHING ON THIS PAGE IS READ OFF A SCREENSHOT: every class list is
 * the Solid template's own and every string is verbatim `t("…")`.
 *
 * The shell around it is `components/shared/RouteDialog`, which was extracted here and is now
 * also `/wallet/withdraw`'s. Everything inside the scroller is Panels.jsx; the four things the
 * rows open are mounted beside the dialog below, each of which portals itself.
 */
export default function UserEnter({ onClose, onBack, enter }) {
  const { signOut } = useSession();

  const [referOpen, setReferOpen] = React.useState(false);
  const [langTab, setLangTab] = React.useState(null);
  const [signOutOpen, setSignOutOpen] = React.useState(false);

  /* Called from the Do Not Disturb row, and OWNED HERE rather than inside it — the same
     placement `AccountMenu` documents. The confirm has to outlive whatever opened it. */
  const [confirm, confirmDialog] = useConfirm();

  return (
    <>
      {/* No `title`: the route sets none, so `dialogProps().title` is undefined and the bar's
          only content is the back arrow. */}
      <RouteDialog transparent label="Account" onClose={onClose} onBack={onBack} enter={enter}>
        <Panels
          confirm={confirm}
          onRefer={() => setReferOpen(true)}
          onLanguage={() => setLangTab('language')}
          onCurrency={() => setLangTab('currency')}
          onSignOut={() => setSignOutOpen(true)}
        />
      </RouteDialog>

      {confirmDialog}

      {/* `J.emit("open-refer")` and `J.emit("open-language")` / `"open-fiat"` — the three events
          the settings rows fire instead of navigating. The first two already have a listener in
          this build (the sidebar's), so the same two components are mounted here rather than
          hoisted; lift them to the layout the day a third surface fires them.

          `open-fiat` is the one that is not quite its own: on the original it opens the "View in
          currency" panel, which is what turns `enableLocaleCurrency` on. That panel is not built —
          it is listed as unbuilt inside the currency dropdown too — so this row opens the
          language/currency modal on its currency tab, which is the nearest thing that exists and
          is what the sidebar's own Currency row does.

          All three of these portal themselves, and `.pop-overlayer`'s `z-index: 1100` clears the
          dialog's own 1000, so they render above it wherever they sit in the tree. */}
      <Refer open={referOpen} onClose={() => setReferOpen(false)} />
      <LanguageCurrencyModal
        isOpen={langTab !== null}
        onClose={() => setLangTab(null)}
        initialTab={langTab ?? 'language'}
      />

      {/* `T1`, `Signout-CdJMMBfB.js` — three lines over the shared popup card, pushed onto the
          popup stack by the Sign Out row. Both strings are verbatim.

          `sm:mb-0` on the button row is the chunk's own and does nothing at this width; kept.
          Signing out navigates nowhere on the original — the account store empties and every
          surface re-renders — but this dialog is guarded on `login`, so closing it is what has to
          happen next, and `onClose` is the same "go back to where you came from" the arrow
          performs. */}
      <PopCenter
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Signing Out"
        className="min-h-6"
      >
        <p className="my-3 text-center text-secondary">
          Are you sure you want to log out? Check our great promotions and bonuses before you
          leave!
        </p>
        <div className="my-4 flex w-full items-center justify-between gap-3 sm:mb-0">
          <button
            type="button"
            className="button button-second flex-1"
            onClick={() => setSignOutOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-brand flex-1"
            onClick={() => {
              setSignOutOpen(false);
              signOut();
              onClose();
            }}
          >
            Sign Out
          </button>
        </div>
      </PopCenter>
    </>
  );
}
