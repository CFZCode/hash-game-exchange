import { useIsDialog } from '../../../context/dialogRoute';

/* `P` in `PageLayout-CcB1ecIM.js`, verbatim — the site's page card, and the only thing in that
 * 931-byte module besides `w3`:
 *
 *   clsx("rounded-xl bg-layer4 p-4", !isDialog && "lg:px-8", t.class)
 *
 * `lg:px-8` IS IN THE ORIGINAL'S CLASS LIST BUT MUST NOT BE WRITTEN AS A BARE UTILITY. The wider
 * padding is gated in JS on being a page, and only THEN by the viewport. Written flat it would
 * fire inside the 480px deposit dialog too — `lg:` measures the window, not the card — and pad a
 * narrow dialog by 32px a side. Hence the branch rather than the utility.
 *
 * Measured off the wallet capture at dpr 1.25 the deposit pane's chips start 32 CSS px inside the
 * card, which is the `lg:px-8` arm.
 *
 * Lifted out of `pages/Deposit/Panels.jsx` when `/wallet/withdraw` became the second caller —
 * that page renders it three times over (the form card, the notice band's own wrapper is not one,
 * the Cwallet row is). The Balance pane writes the same class list by hand and predates this; it
 * is left alone because it is not a `PageLayout` call on the original either, it is the Balance
 * chunk's own div that happens to agree.
 */
export default function PageCard({ className = '', onClick, children }) {
  const dialog = useIsDialog();
  return (
    <div
      className={`rounded-xl bg-layer4 p-4 ${dialog ? '' : 'lg:px-8'} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
