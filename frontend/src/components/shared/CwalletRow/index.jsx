import PageCard from '../PageCard';
import { IconArrow } from '../icons';
import { useIsDialog } from '../../../context/dialogRoute';
import cwalletLogo from '../../../assets/deposit/cwallet.png';
import cwalletLogoLight from '../../../assets/deposit/cwallet_w.png';
import { useSettings } from '../../../context/settings';

/* The Cwallet band — the rule/or/rule divider and the "Connect Cwallet to earn bonus" row that
 * sits under both the deposit and the withdraw card. Three components in Banner-TuTj1pp2.js, and
 * the withdraw page is what proved they are one thing rather than two lookalikes:
 *
 *   `st`  over `zr`   the divider
 *   `xn`               the row itself
 *   `Sn`               `<Show when={supported && !cwalletId}><xn class={isDialog && "mt-4"}/>`
 *   `da`               the WITHDRAW wrapper: `<Show when={supported}>[<st/>, cwalletId ? <a row
 *                      that withdraws TO the linked wallet> : <Sn/>]</Show>`
 *
 * So the deposit page and the withdraw page render the identical `Sn`, and the withdraw page adds
 * a second arm for an account that has already linked a Cwallet. That arm is not built — it needs
 * a `cwallet.state` payload to distinguish the two cases, and there is none (see below) — so the
 * unlinked row is what renders, which is what both captures show.
 *
 * GATED ON A PAYLOAD THIS BUILD DOES NOT HAVE, AND RENDERED ANYWAY. Every branch above tests
 * `cwallet.state.supported` / `.cwalletId`. There is no captured cwallet response and no endpoint
 * answering for one, so there is nothing to gate on; both captures show the row, so the row
 * renders unconditionally. Wrap it the day that feed exists rather than inventing a flag now.
 *
 * `open-cwalletbind` is an event opening the bind dialog, which is not built, so the row is inert.
 *
 * The logo is a `darken ? dark : light` PAIR and both halves are local: `cwallet-CIDMlLxn.png`
 * and `cwallet_w-CnOXM19u.png`, both off `hash.game`. The light twin was skipped while this build
 * was dark-only and that arm was unreachable; it is reachable now.
 */

/* `st` over `zr`, verbatim. `h-[.5px]` alongside `border-t-[0.5px]` is the original's own
   belt-and-braces: the border draws the line and the height stops the `<hr>`'s own box rounding
   up to 1px. */
export const OrDivider = ({ className = '' }) => (
  <div className={`center relative flex px-3 py-1 ${className}`}>
    <hr className="h-[.5px] flex-1 border-t-[0.5px] border-third" />
    <span className="mx-2 flex-none text-secondary">or</span>
    <hr className="h-[.5px] flex-1 border-t-[0.5px] border-third" />
  </div>
);

/* `xn`. Its own class list is `mt-2 flex cursor-pointer items-center py-3`; the `mt-4` on top of
   it is `Sn`'s, and only in a dialog. Note the two stack rather than replace — `mt-4` wins by
   source order in the generated sheet, which is what the original relies on too. */
export default function CwalletRow() {
  const dialog = useIsDialog();
  const { darken } = useSettings();
  return (
    <PageCard className={`mt-2 flex cursor-pointer items-center py-3 ${dialog ? 'mt-4' : ''}`}>
      <div className="flex h-full flex-none items-center overflow-hidden rounded-lg bg-layer3_alt">
        <div className="py-1">
          <img className="h-7 min-w-24" alt="crypto wallet" src={darken ? cwalletLogo : cwalletLogoLight} />
        </div>
      </div>
      <div className="ml-2.5 mr-4 line-clamp-2 text-secondary">Connect Cwallet to earn bonus</div>
      {/* `rotate-180` in LTR — the site's one chevron points left as drawn, so half a turn is
          the "go on" arrow. Not `-rotate-90`, which would be a dropdown caret. */}
      <IconArrow className="ml-auto size-6 flex-none rotate-180 fill-secondary" />
    </PageCard>
  );
}
