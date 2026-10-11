/* `lk` in index-BsFv7ByC.js — the site's Accordion, and the classes below are its REGISTERED
 * styles, i.e. the ones the primitive itself writes before a call site adds anything. It was
 * transcribed inline on the VIP page first; `/wallet/vault` is the second call site of the same
 * primitive, so it moves here under the rule `Select`, `GameTile`, `PageCard`, `Notice`,
 * `LocalAmountItem` and `NumberInput` moved under.
 *
 * NOT EVERY COLLAPSING THING IN THIS PROJECT IS THIS COMPONENT — that is the first thing to check
 * before adding a third consumer. The referral page's FAQ is `pl`, the bare **Collapsible**, whose
 * rows open independently; the Help Center and the weekly raffle each roll their own. Only VIP and
 * Vault use `lk`. The difference that matters is here in `Accordion`: `ck` defaults to
 * `bh.Single`, so opening a row CLOSES the last one, and neither call site passes `multiple`.
 *
 * A closed row renders no content element at all rather than hiding one — which is what both
 * captures show, and it is why there is no `max-height` transition anywhere in this file.
 *
 * The chevron is the shared `Te.Arrow`, drawn pointing LEFT, so `rotate-180` is the CLOSED state
 * and `rotate-[270deg]` (pointing down) is open. Getting those the wrong way round is the easy
 * mistake; the capture has every row closed with the chevron pointing right.
 */

/* `Y` in the original — `clsx`, minus everything this file does not need. It matters only that
   an absent call-site class leaves no trailing space and no empty `class=""`, so that swapping a
   hand-written accordion for this component is a byte-identical change to the rendered markup. */
const cx = (...parts) => parts.filter(Boolean).join(' ');

/* `Te.Arrow`. Written here rather than imported from `components/shared/icons.jsx` because that
   module's set was extracted from the deposit dialog's chunk and this glyph belongs to the
   Accordion's own; they happen to be the same drawing, and merging the two icon sets is a
   separate pass with its own hazard (see the note at the head of that file). */
const ChevronIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <path d="M19.6912 5.6L9.2912 16L19.6912 26.4L22.7088 23.3824L15.3264 16L22.7088 8.6176L19.6912 5.6Z" />
  </svg>
);

/* The root. `w-full space-y-4` is the registered style; Vault overrides the gap with
   `!space-y-0`, which needs the bang because both are the same utility. */
export function Accordion({ className = '', children }) {
  return <div className={cx('w-full space-y-4', className)}>{children}</div>;
}

/* One row. The original splits this into `Item` / `ItemTrigger` / `ItemContent` and threads the
 * open state through a context keyed on `value`; with Single mode and two call sites that both
 * render a flat list, one component holding all three is the same markup with less machinery.
 * Split it the day something needs to put its own element between the trigger and the content.
 *
 * `itemClassName` / `triggerClassName` / `contentClassName` are the three seams the call sites
 * actually use — Vault passes all three (`overflow-hidden rounded-xl`, `w-full rounded-b-none
 * py-3 pl-0`, `rounded-b-xl pl-0 text-sm`) and VIP passes only the trigger's.
 */
export function AccordionItem({
  open,
  onToggle,
  trigger,
  children,
  itemClassName = '',
  triggerClassName = '',
  contentClassName = '',
}) {
  return (
    <div className={itemClassName || undefined}>
      <div
        className={cx(
          'w-full cursor-pointer px-3 flex justify-between items-center rounded-md text-sm font-extrabold',
          triggerClassName,
        )}
        onClick={onToggle}
      >
        {trigger}
        <div className="flex-none size-6 flex items-center justify-center bg-button_bright rounded-md">
          <ChevronIcon
            className={`icon transition-all size-4 duration-300 fill-secondary ${
              open ? 'rotate-[270deg]' : 'rotate-180'
            }`}
          />
        </div>
      </div>
      {open && (
        <div className={cx('px-3 text-base font-semibold text-secondary', contentClassName)}>
          <div className="pt-2">{children}</div>
        </div>
      )}
    </div>
  );
}
