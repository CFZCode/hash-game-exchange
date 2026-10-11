import { createPortal } from 'react-dom';
import useDialogScrollLock from '../../../hooks/useDialogScrollLock';
import useSheetDrag from '../../../hooks/useSheetDrag';
import { useIsDesktop } from '../../../hooks/useMediaQuery';
import { IconClose } from '../icons';

/* `cl` in index-BsFv7ByC.js — the site's generic popup card, and the shell behind both dialogs
 * the fiat deposit tab can open (the 7-Day guarantee explainer and the how-to-deposit guide).
 *
 * Transcribed verbatim, which settles two things a screenshot cannot:
 *
 *   const [, e] = we(t, ["type","title","children","class","close"]),
 *         n = () => mobile ? t.type : "center",
 *         r = L(() => n() !== "center")
 *   class: clsx("bg-layer3 dark:bg-layer2", r() ? "pop-bottomsheet" : "pop-center", t.class)
 *
 * — a DESKTOP always gets `pop-center` regardless of the `type` prop, so the bottom-sheet arm
 * is unreachable here exactly as it is in the currency dropdown; and the `.pop-title` bar is
 * ALWAYS rendered, even with no title, because the close button lives inside it. That is why
 * the 7-Day dialog, whose call site passes no title, still has a cross in an otherwise empty
 * bar. Do not collapse the bar when the title is absent.
 *
 * The scrim is on `.pop-overlayer` itself — the popup manager writes it inline on the original
 * (`rgba(16,18,18, a() * .8)`, tweened over 0.35s), which is why four dialogs in this project
 * had each arrived at the same value separately before it was hoisted into index.css.
 *
 * PORTALLED TO <body> for the reason Manage Assets is: `.pop-overlayer` is fixed with
 * `z-index: 1100`, and z-index resolves against the nearest stacking context. Mounted inside
 * the deposit dialog — which is itself fixed and z-indexed — it would be trapped under it.
 *
 * Not built: the popup STACK. `Pt` is a global list with one shared scrim and a head-shake on
 * the topmost entry; this renders one card from local state. Same rule the confirm dialog was
 * left under — lift it the day three things need to stack.
 */
export default function PopCenter({
  open,
  onClose,
  title,
  label,
  className = '',
  type,
  children,
}) {
  useDialogScrollLock(open);
  const isDesktop = useIsDesktop();

  /* `n = () => mobile ? t.type : "center"`, `r = L(() => n() !== "center")` — a desktop is
     ALWAYS centred whatever `type` says, and on a phone anything other than an explicit
     "center" is a sheet. So the sheet needs both a narrow viewport and a call site that opted
     in; every existing consumer passes no `type` and keeps the card it has.

     THE ORIGINAL'S DEFAULT IS THE OTHER WAY ROUND — `t.type` undefined means sheet there, so
     the deposit-offer detail dialog, the 7-Day explainer and Manage Assets would all be sheets
     on a phone. Inverting it is one word (`type !== 'center'`), and it is left alone only
     because those three have not been looked at below `lg` yet. */
  const sheet = !isDesktop && type && type !== 'center';

  const { panelRef, handlers } = useSheetDrag({ enabled: sheet, onClose });

  /* THE GESTURE MOVED TO `hooks/useSheetDrag` when the language/currency panel became its second
     consumer — that panel predates this component and writes its own markup, since its title bar is
     a tab strip rather than a title, but the drag is the manager's and is identical for both. The
     whole of `Vx` and why each of its four parts is there is documented at the hook. */
  if (!open) return null;

  return createPortal(
    <div
      className="pop-overlayer"
      /* CLICK, NOT POINTERDOWN, and it is the original's own event — `qe(o, "click", l => { if
         (l.target !== o) return; … })` on the overlayer. The difference is not stylistic: the
         scrim covers the whole viewport including whatever opened the dialog, so closing on
         POINTERDOWN unmounts it between mousedown and mouseup, and the click that follows is
         then delivered to the element underneath. For a dropdown that element is the trigger,
         whose handler toggles — so tapping the trigger of an open sheet closed it and
         immediately reopened it. On click the event's target IS this overlayer, the handler
         runs here, and nothing beneath ever sees it. */
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label || title || 'Dialog'}
        className={`${sheet ? 'pop-bottomsheet' : 'pop-center'} bg-layer2 ${className}`}
        {...handlers}
      >
        {/* THE TITLE BAR'S CONTENTS BRANCH, NOT JUST ITS POSITION. `cl` renders the title and
            the close square on a desktop, and on a phone renders `Kx` instead — a drag handle
            over a centred title, WITH NO CLOSE BUTTON at all:

              <div class="flex flex-col w-full">
                <div class="w-11 h-1 rounded-sm bg-layer6 mx-auto mb-2.5"></div>
                <div class="text-center"></div>

            The handle is an affordance rather than the control: the gesture is bound to the
            whole panel (`useSheetDrag`), exactly as `Vx` binds it, so a drag started anywhere
            that is not a scrolled list dismisses the sheet. The handle marks that it can be. */}
        <div className="pop-title">
          {sheet ? (
            /* `touch-action: none` ON THE TITLE BAR ONLY. A drag that starts over the content
               works without it — `.scroll-y` is `overscroll-behavior: contain` and the gesture
               only arms when that scroller is already at its top, so the browser has nothing to
               scroll and never claims the pointer. A drag that starts on the handle has no such
               guarantee, and on a phone the browser would take it for a page pan and cancel our
               pointer stream mid-gesture. Scoped here rather than to the panel because putting
               it on the panel would kill scrolling inside the sheet's own list. */
            <div className="flex w-full flex-col" style={{ touchAction: 'none' }}>
              <div className="mx-auto mb-2.5 h-1 w-11 rounded-sm bg-layer6" />
              <div className="text-center">{title}</div>
            </div>
          ) : (
            <>
              {title}
              <button type="button" className="button button-m pop-close !p-0" onClick={onClose}>
                <IconClose className="icon" />
              </button>
            </>
          )}
        </div>

        <div className="scroll-y pop-content">
          <div className="scroll-container">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
