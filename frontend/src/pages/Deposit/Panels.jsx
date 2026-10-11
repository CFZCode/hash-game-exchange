import React from 'react';
import CryptoTab from './CryptoTab';
import FiatTab from './FiatTab';
import CwalletRow, { OrDivider } from '../../components/shared/CwalletRow';
import { useIsDialog } from '../../context/dialogRoute';

/* `NN` in index-C1xohM7W.js — the DEFAULT deposit channel, which is what bc.game's own deploy
 * renders. `DialogChannelDeposit` (index-mhz6A6Ma.js) is only the switch in front of it, picking
 * between five regional arms (`kes`/`mx`/`fiat`/`us`/`jb`) and falling through to this one.
 *
 * Everything here is shared by the two routes that mount it — `/deposit`, a dialog, and
 * `/wallet/deposit`, a pane in the wallet layout. What differs between them is not a second
 * component but the router's dialog context; see context/dialogRoute.js for the proof and for all
 * three branches. The chunk's own line:
 *
 *   G(Yc, { divider: !!e,
 *           value: Number(wallet.state.isFiat),
 *           type: e ? "indicator" : void 0,
 *           class: clsx(!!e && "sticky top-[-1px] z-30 -mx-4 mb-0 bg-layer4 sm:bg-layer2
 *                               [&_.tabs-btn-group]:px-4"),
 *           onChange: n, children: [ TabItem "Crypto" ..., Show when={channel.type !== "crypto"}
 *                                    TabItem "Fiat" ... ] })
 *
 * Two things fall out of that which are easy to get wrong. The strip's ENTIRE class list is
 * inside the `!!e &&`, so on the page it has no sticky, no negative margin and no background —
 * it is a bare strip on the page. And `type` decides how the selected tab is drawn: with
 * `data-type="indicator"` the fill is removed (`background-color: unset`) and a 0.15rem brand bar
 * is shown; without it, `.tabs-btn[aria-selected]` paints `--color-tab_selected` and the tab
 * reads as a filled segment. The wallet capture shows a filled segment and no bar, which is what
 * settled this independently of the source.
 *
 * The Fiat tab is behind `channel.type !== "crypto"`. Nothing in this build sets a channel, so
 * the default applies and both tabs render.
 *
 * Not built, and each is a real component: the recent-wallet strip (`M1`/`RN`, which needs a
 * deposit history), and the four regional channel arms.
 */

const TABS = ['Crypto', 'Fiat'];

/* The button group's horizontal padding, which the indicator's two custom properties have to
   subtract. `[&_.tabs-btn-group]:px-4` -> 1rem a side -> 2rem total. The Manage Assets sheet uses
   `px-6` and so resolves its own percentages against a different box; see the note there. */
const GROUP_PADDING = '2rem';

/* `st`/`xn`/`Sn` were all inlined here until `/wallet/withdraw` arrived, and they moved to
   `components/shared/CwalletRow` when it turned out to render the identical pair (`da` in
   Banner-TuTj1pp2.js falls through to the same `Sn`). `P`, the page card, moved to
   `components/shared/PageCard` with them — see the note in each. */

export default function DepositPanels() {
  const dialog = useIsDialog();

  /* `value: Number(wallet.state.isFiat)` — the tab IS the wallet store's crypto/fiat flag on the
     original, and switching tabs calls `wallet.switchCurrencyType`. That store is not built here
     (see the note in Wallet/Balance), so the strip owns the state instead. The visible behaviour
     is the same; what is lost is that the choice would survive leaving the page. */
  const [tab, setTab] = React.useState(0);

  return (
    <>
      <div
        role="tablist"
        {...(dialog ? { 'data-type': 'indicator', 'data-divider': '' } : {})}
        className={`scroll-x tabs-title hide-scroll ${
          dialog ? 'sticky top-[-1px] z-30 -mx-4 mb-0 bg-layer4 sm:bg-layer2 [&_.tabs-btn-group]:px-4' : ''
        }`}
        style={
          dialog
            ? {
                '--tabs-width': `calc((100% - ${GROUP_PADDING}) / ${TABS.length})`,
                '--tabs-indicator-position': `calc(${GROUP_PADDING} / 2 + ${tab * 100}%)`,
              }
            : undefined
        }
      >
        <div className="tabs-btn-group">
          {TABS.map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              /* `flex-auto bg-transparent` is the TabItem's class and belongs to the CONTENT
                 panel below, not to the button — `G(Yc.TabItem, {class: "flex-auto
                 bg-transparent", title: "Crypto", children})` passes it through to the pane.
                 Put on the button it replaces `.tabs-btn`'s own `flex: 1` with `flex: 1 1 auto`,
                 which sizes each tab from its LABEL: "Crypto" is wider than "Fiat", so the
                 divider between them slides right and both labels sit off centre. */
              className="tabs-btn btn-like"
              aria-selected={tab === index ? 'true' : undefined}
              onClick={() => setTab(index)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="tabs-indicator" />
      </div>

      <div className="tabs-content flex-auto bg-transparent">
        {tab === 0 ? (
          <>
            <CryptoTab />
            <OrDivider />
            <CwalletRow />
          </>
        ) : (
          /* `lt.updateCurrency(lt.state.cryptoCurrency)` — the fiat tab's "Deposit Crypto" row
             switches the wallet store's currency to the crypto one, and the tab index IS that
             flag on the original (`value: Number(wallet.state.isFiat)`). With no such store here,
             the index is this component's and the row is handed the setter. */
          <FiatTab onDepositCrypto={() => setTab(0)} />
        )}
      </div>
    </>
  );
}
