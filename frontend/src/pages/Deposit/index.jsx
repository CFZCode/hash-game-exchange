import React from 'react';
import { createPortal } from 'react-dom';
import useDialogScrollLock from '../../hooks/useDialogScrollLock';
import DepositPanels from './Panels';
import { DialogRouteContext } from '../../context/dialogRoute';
import { IconClose } from '../../components/shared/icons';
import './Deposit.css';

/* The deposit dialog — `/deposit`, and it is a ROUTE rather than a popup. Enter-MsmOuq5R.js:
 *
 *   { path: "/deposit",
 *     component: c(() => O.DialogChannelDeposit()),
 *     info: { dialog: m.mobile || { size: [30, 44] },
 *             guards: [() => !b.login && "/login/regist", () => !1],
 *             titleColor: m.mobile ? "var(--layer4)" : "var(--layer2)" },
 *     preload: ... emit("track", { event: "deposit_page_open" }) }
 *
 * Four things in there are reproduced. It is a dialog route, so it renders OVER the page rather
 * than replacing it — the same arrangement the auth dialog uses, matched on the pathname in
 * App.jsx rather than sitting inside <Routes>. `size: [30, 44]` is 30rem x 44rem, written
 * inline on `.dialog-list` exactly as the manager writes it. The first guard sends a
 * logged-out visitor to `/login/regist`, which is the sign-up tab. And the second guard
 * returning `!1` is not a block: in that router a guard returning false means "no redirect".
 *
 * `DialogChannelDeposit` is only a switch — `index-mhz6A6Ma.js` picks between five regional
 * channels (`kes`/`mx`/`fiat`/`us`/`jb`) and falls through to the default, which is what this
 * file is. The regional arms are not built; nothing in this app sets a channel.
 *
 * The tab strip is `NN`'s own, verbatim:
 *
 *   <Tabs divider={isDesktop} value={Number(state.isFiat)} type={isDesktop ? "indicator" : undefined}
 *         class="sticky top-[-1px] z-30 -mx-4 mb-0 bg-layer4 sm:bg-layer2 [&_.tabs-btn-group]:px-4">
 *     <TabItem class="flex-auto bg-transparent" title="Crypto">   ...
 *     <Show when={channel.type !== "crypto"}>
 *       <TabItem class="flex-auto bg-transparent" title="Fiat">   ...
 *
 * Note `px-4` on the button group, where the Manage Assets sheet uses `px-6` — the indicator's
 * two custom properties have to come off THAT number, and the two panels genuinely differ. See
 * the note on `GROUP_PADDING` in ManageAssets.jsx for why the width and the offset resolve
 * their percentages against different boxes.
 *
 * THE TABS AND THE PANELS MOVED TO Panels.jsx, because the same component is also the wallet's
 * Deposit pane (`/wallet/deposit`, which carries no dialog flag and so renders inline). This file
 * is now only the dialog SHELL — portal, scrim, title bar, scroll lock, Escape — and the content
 * it wraps is shared. What differs between the two presentations is the router's dialog context;
 * see context/dialogRoute.js.
 *
 * Not built, and each one is a real component rather than a stub: the recent-wallet strip
 * (`M1`/`RN`, which needs a deposit history) and every regional channel arm above. The Cwallet
 * promo row (`C1`, `Banner-TuTj1pp2.js`) used to be on this list and is now built — see
 * Panels.jsx.
 */

export default function Deposit({ onClose }) {
  useDialogScrollLock(true);

  /* Escape closes, as it does on every dialog route here. The router does this itself on the
     original — a dialog route pops the history entry. */
  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    /* `.dialog-*` is the site's own shell and is generic — it lives in Auth.css only because
       the auth dialog was the first thing here to need it. Below lg it is a full-screen sheet
       with no scrim; from lg up a centred card over `#000a`. */
    <div className="dialog-root dialog-visible">
      <div
        className="dialog-list deposit-dialog-size"
        role="dialog"
        aria-modal="true"
        aria-label="Deposit"
      >
        {/* `.dialog-item` NESTS INSIDE `.dialog-overlayer`; they are not siblings. The overlayer
            is the card's opaque `layer2` fill and carries `z-index: 1000` against the item's
            `z-index: 0`, so side by side it paints straight over the content and the dialog
            renders as an empty rectangle at exactly the right size. The auth dialog has the
            same three-deep nesting, which is what settled it. */}
        <div className="dialog-overlayer">
          <div className="dialog-item">
            {/* `l1` / PageLayout does NOT draw this — it only pushes `title` up into the dialog
                context (`w3` is three lines and returns `t.children`). The bar belongs to the
                dialog manager, and its close button is wrapped in `ml-auto absolute right-4
                top-0 flex items-center h-full`: centred against the bar's FULL height rather
                than pinned near the top, which is what `.pop-close` would have done. */}
            <div className="dialog-title relative">
              Deposit
              <div className="absolute right-4 top-0 ml-auto flex h-full items-center">
                <button
                  type="button"
                  aria-label="Close"
                  className="dialog-close center"
                  onClick={onClose}
                >
                  <IconClose />
                </button>
              </div>
            </div>

            {/* No `px-4` here: `.dialog-content` carries `padding-inline: 1rem` in the shell
                itself, which is where the original puts it. */}
            <div className="dialog-content scroll-y">
              <div className="scroll-container">
                {/* The panels are shared with `/wallet/deposit`, which mounts the same component
                    as a page. Everything that differs between the two is read from the context
                    below rather than passed down — that is the original's own mechanism, and
                    context/dialogRoute.js has the proof and the three branches it drives. */}
                <DialogRouteContext.Provider value>
                  <DepositPanels />
                </DialogRouteContext.Provider>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
