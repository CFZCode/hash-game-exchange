import React from 'react';
import { createPortal } from 'react-dom';
import useDialogScrollLock from '../../../hooks/useDialogScrollLock';
import { IconClose, IconArrow } from '../icons';
import '../../modals/Auth/Auth.css';
import './DialogShell.css';

/* THE DESKTOP-CARD ARM of the router's dialog shell — a centred `.dialog-list` with a title, a
 * close square and, when it sits on top of another dialog, a back arrow.
 *
 * **`components/shared/RouteDialog` IS THE PHONE ARM OF THE SAME THING, and the pair should be read
 * together.** Both are `FS` in `index-BsFv7ByC.js`, whose title bar branches on device rather than
 * on the dialog: `c = () => !mobile` decides whether the cross renders at all, and a phone gets a
 * back arrow and no cross while a desktop gets the cross and shows the arrow only off the stack's
 * depth. `RouteDialog` also owns `transparent-title` and the scroll-driven fill, which no desktop
 * dialog here uses. Merge them the day one route needs both arms; until then each is complete for
 * the routes it serves, and neither is a copy of the other.
 *
 * On the original neither is a component a page reaches for: `/deposit`, `/free-plays`,
 * `/user/profile/:id` and the rest declare `info.dialog` on their route and the router renders the
 * shell for them, which is why `PageLayout` (`w3`) is three lines that push a title into a context
 * and return their children. This project matches dialog paths in `App.jsx` instead, so each dialog
 * was writing the shell itself. The profile family made that six copies, so the desktop arm moved
 * here — Auth and Deposit still carry their own, each for a reason (a `transparent-title` bar with
 * the content pulled up under it, and a per-route `size` class plus a shared Panels split). Those
 * two are the next to migrate, not duplicates to keep.
 *
 * ── WHAT THE MANAGER DOES THAT IS WORTH KNOWING ───────────────────────────────────────────────
 *
 * `.dialog-item` NESTS INSIDE `.dialog-overlayer`; they are not siblings. The overlayer is the
 * card's opaque fill and carries `z-index: 1000` against the item's `0`, so side by side it paints
 * straight over the content and the dialog renders as an empty rectangle at exactly the right size.
 *
 * THE BACK ARROW IS THE DIALOG STACK'S DEPTH, not a per-dialog flag. `FS` computes
 * `l = () => !(isDesktop && stacks.index() === 1)` — so the first dialog in a stack has no arrow and
 * every one pushed on top of it does, and clicking it pops back to the previous dialog rather than
 * closing. This build has no stack, but every one of these dialogs is a real route, so `navigate(-1)`
 * lands in the same place: `onBack` is passed only by the dialogs that are reached from another one.
 * The class list around the arrow is the manager's own, and note `.dialog-back` positions ITSELF
 * (`position: absolute; bottom: 1rem; left: 1rem`) where `.dialog-close` is positioned by a wrapper
 * — see the note in Auth.css.
 *
 * `size` is what the router's `info.dialog.size` writes inline onto `.dialog-list`. Omitting it is
 * meaningful rather than lazy: it takes the manager's own 30rem x 40rem default, which is a real
 * `.dialog-list` rule in Auth.css.
 */
export default function DialogShell({
  title,
  onClose,
  onBack,
  size,
  className = '',
  children,
  lock = true,
  /* `info.titleColor` on the route — the manager writes it onto the bar as an inline `--bg`
     (`Rt(u, "--bg", t.titleColor)`) and `.dialog-title` reads `rgb(var(--bg) / …)` off it. Its
     DEFAULT is layer4, which is #323738; the deposit route is the one that overrides it, to
     layer2, and the Free Plays dialog opts out of the fill altogether with a class instead.

     Written as a plain `backgroundColor` here rather than through `--bg`, because the shared
     `.dialog-title` rule in Auth.css deliberately paints nothing: the original's fill is
     scroll-driven (transparent at rest, fading to `--bg` as content passes under an ABSOLUTE bar)
     and only `/user/enter` needed that, where it is transcribed scoped. This bar is a static flex
     sibling above the scroller, so it wants the end state and nothing to animate. Keeping it
     inline is also what stops it reaching the deposit and auth dialogs, which write their own
     shells and have each been checked as they are. */
  titleColor = 'var(--color-layer4)',
  /* Which of the manager's three enter animations to run — see DialogShell.css, and see the note
     in App.jsx for why this is handed down rather than derived from `onBack`. `open` is the
     default so a dialog that does not thread it through still animates in. */
  enter = 'open',
}) {
  useDialogScrollLock(lock);

  /* Escape closes, as on every dialog route here — the original's router pops the history entry
     itself. */
  React.useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* THE ENTER MOTION IS THE TRANSITION'S, NOT THE DIALOG'S — see DialogShell.css. Entering the
     stack from a page scales the card up behind a fading scrim; moving between dialogs leaves both
     of those alone and slides one item instead, from the right on a push and from -17% on a pop. */
  const cx = (...parts) => parts.filter(Boolean).join(' ');

  return createPortal(
    <div className={cx('dialog-root', 'dialog-visible', enter === 'open' && 'dialog-scrim-in')}>
      <div
        className={cx('dialog-list', size, enter === 'open' && 'dialog-card-in')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className={cx(
            'dialog-overlayer',
            enter === 'push' && 'dialog-slide-in',
            enter === 'pop' && 'dialog-slide-back',
          )}
        >
          <div className={`dialog-item ${className}`.trim()}>
            <div className="dialog-title relative" style={{ backgroundColor: titleColor }}>
              {onBack && (
                <button
                  type="button"
                  aria-label="Back"
                  className="dialog-back center"
                  onClick={onBack}
                >
                  {/* `Te.Arrow` with no rotation — the chevron is drawn pointing left already, and
                      the manager only rotates it for a right-to-left locale (`by() &&
                      "rotate-180"`). */}
                  <IconArrow />
                </button>
              )}
              {title}
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

            {/* No `px-4` at the call site: `.dialog-content` carries `padding-inline: 1rem` in the
                shell itself, which is where the original puts it. */}
            <div className="dialog-content scroll-y">
              <div className="scroll-container">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
