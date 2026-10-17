import React from 'react';
import PopCenter from '../../shared/PopCenter';
import useResource from '../../../hooks/useResource';
import { useSelectedCurrency } from '../../../hooks/useSelectedCurrency';
import { getInvitationCode } from '../../../services/referral';
import referralArt from '../../../assets/refer.png';
import Loading from '../../shared/Loading';
import { toast } from '../../shared/Toast/toast';
import { copyToClipboard } from '../../../utils/clipboard';

/* The Refer and Earn dialog — what the sidebar's Refer row opens.
 *
 * RECOVERED WHOLE, and it is a small enough chunk to be worth quoting. `Refer-DVueC7AK.js` is
 * 2.5 KB off `hash.game/assets/`; `Enter-MsmOuq5R.js` reaches it as `$a = () => import(...)`,
 * fired by the `open-refer` event the sidebar row emits. Its default export is three lines —
 * `b.push(() => c(Z, {}))` — so the dialog is pushed onto the popup stack imperatively rather
 * than routed, which is why there is no `/refer` path anywhere.
 *
 * Nothing here is inferred except the link itself. The template is the chunk's:
 *
 *   <div class="flex flex-col gap-4">
 *     <div class="flex gap-4 rounded-lg bg-layer1 px-2 py-4">
 *       <img class="h-auto w-32 object-contain" alt=referral>
 *       <div class="text-xl font-extrabold">
 *         <p class="mb-4"></p>
 *         <p class="text-sm font-normal text-brand"></p>
 *
 * with the Copy button appended as the column's last child (`i(a, <Button .../>, null)`), so the
 * `gap-4` sits between the card, the link block and the button. All five strings are verbatim
 * en-US out of `index-Dn9m_cUp.js`, which IS in the mirror — check it before transcribing copy
 * off a screenshot, the same lesson `/promotions/weekly-raffle` records.
 *
 * THE HEADLINE IS ONE i18n VALUE WITH FIVE SLOTS, not five strings laid out by hand:
 *
 *   "bonus.mainpage.refer.desc":
 *     "<0>REFER A FRIEND AND GET</0><1>__number__</1><2>+</2><3>15%</3><4>COMMISSION</4>"
 *
 * and the chunk hands `<Trans>` a `number` prop of `printCurrency(new Decimal(1000))`. Slots 0
 * and 4 carry `block`, so the figure line sits between two full-width lines — which is what puts
 * "COMMISSION" on its own row rather than trailing the 15%. Reproduced as five spans in that
 * order rather than as a translation runtime, since this build has no i18n layer; the class list
 * on each is the chunk's own, `text-warning` and `text-brand` included.
 *
 * `__number__` resolving to $1,000.00 is not a constant in disguise — `printCurrency` reads the
 * account's display currency, so the same 1000 prints as the visitor's own currency the moment
 * `enableLocaleCurrency` points somewhere else. Now shown in the selected currency (useSelectedCurrency).
 *
 * ONE THING IS THIS BUILD'S, flagged at its call site below: where the logged-out branch lives.
 * The copy confirmation is the original's own toast again — it sat on the button while this
 * build had no toast system.
 */

/* `$1,000.00` — the `number` slot. `new I(1e3)` is a Decimal on the original; a plain 1000 is the
   same value to `printCurrency`, which coerces with `Number()` before it does anything. */
const REWARD = 1000;

export default function Refer({ open, onClose }) {
  const cur = useSelectedCurrency();

  /* GATED ON `open`, because the original fetches from the dialog's own mount — `k(() => ...)`
     inside `Z`, which the popup manager only ever constructs on a push. This component stays
     mounted across the closed state (the `open`/`onClose` pair every PopCenter call site here
     uses), so an ungated read would fire the request on page load instead. That USED to cost
     nothing, because `client.js` answered fixtures synchronously; it costs a real request the
     moment the delay is non-zero, which is exactly the class of thing that is invisible until it
     is not — and the gate is why opening the dialog is what starts the read rather than loading
     the page. */
  const read = React.useCallback(() => (open ? getInvitationCode() : undefined), [open]);
  const { data, loading } = useResource(read);

  const link = data?.invitationUrl ?? '';

  /* `r = () => { P(n()); m(o("Copied")) }` — the clipboard write (`be`, which falls back to
     `execCommand` when the async API refuses) and then a bare `F("Copied")`, unconditionally.
     The button keeps saying "Copy link"; the toast is the confirmation. */
  const copy = () => {
    copyToClipboard(link);
    toast('Copied');
  };

  return (
    /* `type="bottom"` IS WHAT MAKES THIS A SHEET ON A PHONE, and it restores the original's own
       default rather than inventing a variant. `cl` picks with
       `n = () => mobile ? t.type : "center"` and `r = L(() => n() !== "center")`, so on the live
       site a popup that names NO type is a bottom sheet below the device line and a centred card
       above it. `PopCenter` here inverts that default (`type && type !== 'center'`) so the three
       dialogs that predate any mobile work kept their card; naming a type is how a call site opts
       back into the original's behaviour, and this is the first to do it.

       `w-fit` stays for the desktop card and is inert on the sheet — `.pop-bottomsheet` carries
       `width: 100% !important`. The slide-in, the drag handle and the missing close button all
       come with the arm; see PopCenter. */
    <PopCenter
      open={open}
      onClose={onClose}
      label="Refer and Earn"
      className="w-fit"
      type="bottom"
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 rounded-lg bg-layer1 px-2 py-4">
          <img className="h-auto w-32 object-contain" alt="referral" src={referralArt} />
          <div className="text-xl font-extrabold">
            <p className="mb-4">
              <span className="block">REFER A FRIEND AND GET</span>
              <span className="text-3xl text-warning">
                {/* USD-designed, shown in the selected currency. */}
                {cur.show(REWARD, 'USDFIAT')}
              </span>
              <span className="mx-1">+</span>
              <span className="text-3xl text-brand">15%</span>
              <span className="block">COMMISSION</span>
            </p>
            <p className="text-sm font-normal text-brand">Invite friends, earn money.</p>
          </div>
        </div>

        <div>
          <p className="text-secondary">referral link</p>
          {/* `justify-between` with a single child does nothing — the chunk's own, and kept for
              the reason `f-ull` and `texxt-sm` are kept elsewhere. It is the row that would hold
              a copy glyph if this dialog had one; it does not, the button below is the copy. */}
          <div className="mt-2 flex w-full items-center justify-between rounded-xl border border-input bg-layer3 px-3 py-2 [&>.loading]:size-3">
            {/* The field is the only thing on the dialog that waits — the headline is one i18n
                value with a constant in it and the artwork is local. The row keeps its box, so
                the 12px inline spinner goes where the link will be rather than replacing it. */}
            {loading ? <Loading /> : <p className="text-brand">{link}</p>}
          </div>
        </div>

        {/* `button-m` is not written by the call site on the original — `ot` appends
            `button-${size}` with `s = size || !mobile && "m"`, so every trigger on a desktop
            carries it. Written out here for the reason the account dropdown's rows write it. */}
        <button type="button" className="button button-brand button-m w-full" onClick={copy}>
          Copy link
        </button>
      </div>
    </PopCenter>
  );
}
