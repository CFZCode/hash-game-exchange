import { IconInform } from '../icons';

/* `UA` in index-BsFv7ByC.js (`Dn` where the deposit chunk imports it, `te` where the withdraw one
 * does), verbatim:
 *
 *   class: clsx("p-2 flex text-secondary rounded-xl",
 *               type === "warning" ? "bg-warning/10"
 *             : type === "error"   ? "bg-error/10"
 *                                  : "bg-success/10", t.class)
 *   <Show when={type === "info"}>
 *     <Attention class="flex-none -mt-0.5 size-6 mr-1.5 fill-success"/>
 *
 * `p-2` and `rounded-xl`, not the `p-3 rounded-lg` this was first written with — the box is
 * tighter than it looks, and the extra 4px a side is what made it read as over-padded. The icon
 * carries its own `mr-1.5` rather than the row using a gap, and the `-mt-0.5` is what lines a
 * 24px mark up with the first line of a 20px body.
 *
 * ONLY THE `info` TYPE DRAWS THE MARK. `warning` and `error` tint the box and print bare text —
 * which is what the withdraw form's middle notice is (the SOL case-sensitivity line), so the
 * branch is live rather than defensive.
 *
 * `mt-4` is NOT part of the original's class list; every call site passes its own margin. It was
 * baked in while this lived in `pages/Deposit/CryptoTab.jsx` as a one-consumer local, and is a
 * prop now that the withdraw form needs `mt-2` for its middle notice and no margin at all for the
 * one it portals under the card.
 */
const TINT = {
  info: 'bg-success/10',
  warning: 'bg-warning/10',
  error: 'bg-error/10',
};

export default function Notice({ type = 'info', className = '', children }) {
  return (
    <div className={`flex rounded-xl p-2 text-secondary ${TINT[type] ?? TINT.info} ${className}`}>
      {type === 'info' && (
        <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-success" />
      )}
      <div>{children}</div>
    </div>
  );
}
