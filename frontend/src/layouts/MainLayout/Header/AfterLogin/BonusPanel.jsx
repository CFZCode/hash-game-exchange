import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../../../context/session';
import useMediaQuery from '../../../../hooks/useMediaQuery';
import BonusCurrencyAmount from '../../../../components/shared/BonusCurrencyAmount';
import { layerPosition } from '../../../../components/shared/Select/position';
import { claimableRows, totalClaimable, displayCurrency } from '../../../../pages/Bonus/claimAll';

/* Where the layer sits for the one frame between mounting and being measured — `Dropdown`'s own
   constant, and the same reasoning. */
const UNPLACED = { left: 0, top: 0, visibility: 'hidden' };

/* `yt` in `notification-shell-BOaO8MP0.js` — what the gift opens once something is claimable.
 *
 * Three blocks in one `bonus-scope flex flex-col` column, and the two outer ones are STICKY
 * against the layer's own scroll: a header carrying Total Claimable and the Claim All button, the
 * rows between them, and a "View All Bonuses ›" footer. Both sticky bars are `bg-layer1`, which
 * is why the layer paints layer1 on a desktop and nothing at all on a phone — the bars supply it.
 *
 * `onClick={e => e.stopPropagation()}` on the root is not decoration. The gift's outside-click
 * listener runs in the CAPTURE phase on `document` and closes the panel for any click that is in
 * neither the trigger nor the layer; the layer is portalled, so without this a click on a row
 * would also reach the header's own handler underneath and toggle the panel shut.
 */

/* `V` — a row opens the claimable-item detail flow, which walks the payload for the item with
   that id and hands it to `startFlow`. Not built: that flow is `claimable-item-detail`'s popup
   over the shared stack this build does not have. The row keeps its `cursor-pointer` and its
   `active:opacity-70`, because both are the chunk's and describe a control that does exist. */

/* `Z` — the popover the shell wraps the panel in, which on the original is the site's generic
 * Dropdown with `dropdownType: "dropdown"`. Only the positioned arm is needed, so this is that
 * arm over `Select/position.js`'s own placer rather than a second copy of the component.
 *
 * Every class here is the chunk's:
 *
 *   !z-[98] !w-screen px-5 sm:!z-[1001] sm:max-h-[21rem] sm:!w-[26rem]
 *   + (mobile ? "!bg-transparent !shadow-none" : "!bg-layer1")
 *   style={{ box-shadow: "0 4px 24px 0 rgba(0, 0, 0, 0.30)" }}
 *   space={mobile ? 16 : 30}
 *
 * The two z-indexes are not a typo: below `sm` the panel sits UNDER the header (98) and above it
 * on a desktop (1001). And the phone arm paints nothing — no fill, no shadow — because the
 * panel's own sticky bars carry `bg-layer1` and its wrapper adds the rounding there.
 *
 * The `!` prefixes are the call site beating `.dropdown-layer`'s own width, fill and z-index, and
 * they are written out because this build's layer rule is that class. The layer is measured and
 * placed in a LAYOUT effect for the reason `Dropdown`'s note gives: it has to be in the DOM to
 * have a height, and it must not be seen at the wrong place while it is.
 */
export const BonusLayer = React.forwardRef(function BonusLayer({ trigger, isDesktop, children }, ref) {
  const [position, setPosition] = React.useState(UNPLACED);
  const own = React.useRef(null);

  React.useLayoutEffect(() => {
    const anchor = trigger.current;
    const layer = own.current;
    if (!anchor || !layer) return;
    setPosition(
      layerPosition(
        anchor.getBoundingClientRect(),
        layer.offsetHeight,
        layer.offsetWidth,
        anchor.clientWidth,
        isDesktop ? 30 : 16,
      ),
    );
  }, [trigger, isDesktop]);

  return createPortal(
    <div
      ref={(node) => {
        own.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={`dropdown-layer scroll-y !z-[98] !w-screen px-5 sm:!z-[1001] sm:max-h-[21rem] sm:!w-[26rem] ${
        isDesktop ? '!bg-layer1' : '!bg-transparent !shadow-none'
      }`}
      style={{ ...position, boxShadow: '0 4px 24px 0 rgba(0, 0, 0, 0.30)' }}
    >
      {children}
    </div>,
    document.body,
  );
});

/* The real export. `rewards` is passed in rather than read here, because the shell already holds
   it — one resource, so the badge and the panel cannot disagree, which is the arrangement the
   gift's own note describes. */
export default function BonusPanel({ rewards, onClose }) {
  const { session } = useSession();
  const navigate = useNavigate();
  /* `v.mobile` is a DEVICE test on the original and is read as the 640 line here rather than this
     project's usual 1024, because what it decides is the layer's own `sm:` pair — `sm:!w-[26rem]`
     against `!w-screen`, and the fill that goes with them. The shell reads it the same way. */
  const isDesktop = useMediaQuery('(min-width: 640px)');

  const currency = displayCurrency(session);
  const rows = claimableRows(rewards);
  const total = totalClaimable(rewards, currency);

  /* `j(() => { !g().length && !n() && w(!1) })` — the panel CLOSES ITSELF once nothing is left to
     claim, which on the original is what happens after a successful Claim All. Here it is what
     happens if the payload refetches to nothing while the panel is open. `n()` is `claiming`,
     which cannot be true in this build, so only the first half is written. */
  React.useEffect(() => {
    if (rows.length === 0) onClose();
  }, [rows.length, onClose]);

  return (
    <div
      className={`bonus-scope flex flex-col ${
        isDesktop ? '' : 'rounded-lg bg-layer1 px-3 shadow-md'
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="sticky top-0 flex items-center justify-between gap-4 bg-layer1 pb-3 pt-3">
        <div>
          <p className="text-sm text-tertiary">Total Claimable</p>
          <p className="text-2xl font-extrabold text-brand">
            <BonusCurrencyAmount currency={currency} amount={total} target={currency} />
          </p>
        </div>
        {/* `disabled={unclaimedCount === 0 || claiming}` — the chunk's own gate, and it is the
            whole of what this button does here: `handleClaimAll` posts
            `/activity/bonus/v2/batch-claim/` and then pushes an "ALL COLLECTED!" popup, neither
            of which is built. Stopping at the original's own disabled test is the same call the
            vault transfers and the rakeback claim make. */}
        <button
          type="button"
          className="button button-brand h-8 flex-none text-sm"
          disabled={(rewards?.unclaimedCount ?? 0) === 0}
        >
          Claim All
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex min-h-10 cursor-pointer select-none items-center justify-between rounded-xl bg-layer2 px-3 active:opacity-70"
          >
            <span className="text-sm font-semibold text-primary">{row.title}</span>
            <span className="text-sm text-brand">
              {/* `El` — a free spin or a lottery ticket prints its COUNT in a brand square before
                  the figure; everything else is the figure alone. Neither of those two item types
                  can reach this build, so only the second arm renders — written as the switch it
                  is rather than collapsed, because the first is what the square is for. */}
              {row.type === 'FreeSpin' || row.type === 'Lottery' ? (
                <span className="inline-flex items-center gap-1">
                  <span className="flex size-4 items-center justify-center rounded-md bg-brand text-xs font-extrabold text-primary_brand">
                    {row.quantity}
                  </span>
                  <BonusCurrencyAmount currency={row.currency} amount={row.amount} />
                </span>
              ) : (
                <BonusCurrencyAmount currency={row.currency} amount={row.amount} />
              )}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="sticky bottom-0 bg-layer1 pb-3 pt-3 text-center text-xs font-extrabold text-tertiary"
        onClick={() => {
          onClose();
          navigate('/bonus');
        }}
      >
        View All Bonuses ›
      </button>
    </div>
  );
}
