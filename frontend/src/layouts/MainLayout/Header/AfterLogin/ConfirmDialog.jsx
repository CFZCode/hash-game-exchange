import React from 'react';
import useDialogScrollLock from '../../../../hooks/useDialogScrollLock';
import { IconClose } from './icons';
import './AfterLogin.css';

/* The site's generic confirm dialog — `Pt.confirm(children, opts)` in index-BsFv7ByC.js, which
 * pushes `tS` into the popup stack wrapped in `cl`, the `.pop-*` shell. Both are transcribed
 * below; the CSS they need (`.pop-overlayer`, `.pop-center`, `.pop-title`, `.pop-content`,
 * `.pop-close`) was already in index.css from the region-block and language panels.
 *
 *   function tS(t) {
 *     return G(() => { t.onConfirm(!1) }),                       // onCleanup — see DISMISSAL
 *       C(cl, { title: t.title || ft("Confirm"), close: !1, children: [
 *         <div class="text-base text-secondary">{t.children}</div>,
 *         <div class="flex mt-8 mb-2">
 *           <Button class="flex-1 mr-3 text-lg" type="second" onClick={() => t.onConfirm(!1)}>
 *             {t.cancel || ft("Cancel")}</Button>
 *           <Button class="flex-1 text-lg" type="brand" onClick={() => t.onConfirm(!0)}>
 *             {t.confirm || ft("Confirm")}</Button>
 *         </div>] })
 *   }
 *
 * `ft("Confirm")` / `ft("Cancel")` are both in the main i18n bundle (index-Dn9m_cUp.js, `$e`
 * and `pe`), so the three defaults are verbatim en-US and not guesses.
 *
 * NOT THE FULL POPUP STACK. The original's `Pt` is a global list rendered by `u3()` at the app
 * root, with a shared scrim, one gsap tween per entry and a `head-shake` on the topmost; this
 * renders one dialog from `useConfirm`'s state instead. That is enough for one call site and is
 * the same call the rest of this project makes — `Select` and `GameTile` were only lifted out of
 * their pages once a second page rendered them. Move this to `components/shared` the day
 * something else confirms.
 *
 * WHERE `useConfirm` IS CALLED IS LOAD-BEARING, and this is the part the shortcut above cannot
 * be careless about. Being a global list is what keeps the original's dialog alive when the
 * thing that opened it goes away: clicking inside the confirm satisfies the account dropdown's
 * own click-outside, so the dropdown closes underneath it and the row that called `confirm`
 * unmounts — while the popup, which was never in the dropdown's tree, stays up. So the hook is
 * called in `AccountMenu`, which renders the panel conditionally and therefore outlives it,
 * NOT in the row. Called from the row it would take the row's lifetime, and the dialog would
 * vanish on its own first click.
 *
 * THE BACKDROP DOES NOT CLOSE IT, and that is not an omission. `Pt.confirm` pushes with
 * `{close: !1}`, and the overlayer's click handler reads that flag:
 *
 *   qe(o, "click", l => { if (l.target !== o) return;
 *                         const u = e(); u && (u.close ? Pt.pop() : c()) })
 *
 * where `c()` toggles `head-shake` on the topmost popup and removes it on `animationend`. So a
 * click outside shakes the dialog rather than dismissing it — a confirm has to be answered. The
 * class and its keyframes are index-DxOqNczA.css's own and are in AfterLogin.css.
 *
 * DISMISSAL RESOLVES FALSE. `G(() => t.onConfirm(!1))` is an onCleanup: whatever unmounts the
 * dialog — the close button, the caller, a route change — answers "no" on the way out. Cancel
 * and the X are therefore the same path, which is why the X below just calls `onResolve(false)`
 * rather than needing a separate close prop.
 */
export default function ConfirmDialog({
  title = 'Confirm',
  cancel = 'Cancel',
  confirm = 'Confirm',
  children,
  onResolve,
}) {
  useDialogScrollLock(true);

  /* ONE animation slot, not two flags, and that is a correctness point rather than tidiness.
     `.head-shake` and the enter tween both set `animation` on the same element, so they cannot
     both be present — and if the enter class were left on permanently, dropping `head-shake`
     after a shake would hand the element back an `animation` it had already finished and REPLAY
     the scale-in. The slot empties itself on `animationend` instead, so each animation runs
     exactly once. */
  const [anim, setAnim] = React.useState('in');

  /* `l.target !== o` — the original's own guard. The overlayer is the flex container that
     centres the panel, so it is the event target only for clicks that land beside the panel. */
  const onBackdrop = (e) => {
    if (e.target !== e.currentTarget) return;
    /* `if (l.className.indexOf(Zu) === -1)` — a second click mid-shake is ignored rather than
       restarting it, which is what setting an already-set value does here. */
    setAnim('shake');
  };

  return (
    /* `.pop-overlayer` carries no background in the stylesheet — the original writes it per
       frame from the tween: `rgba(16, 18, 18, ${v * .8})`. Here the container's opacity is
       animated instead, which resolves to the same two things at once: the scrim reaches
       .8 alpha and the panel inside reaches full opacity, both on the tween's own curve. */
    <div className="pop-overlayer after-login-pop-scrim" onClick={onBackdrop}>
      <div
        /* `bg-layer3 dark:bg-layer2`, the original's own pair — both arms written now that
           `dark:` keys off the `.dark` class rather than the visitor's OS. */
        className={`pop-center bg-layer3 dark:bg-layer2 ${anim === 'in' ? 'after-login-pop-in' : ''} ${
          anim === 'shake' ? 'head-shake' : ''
        }`}
        /* Guarded, because `animationend` bubbles — anything animated inside the panel would
           otherwise clear the slot on the panel's behalf. */
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget) setAnim('');
        }}
      >
        <div className="pop-title">
          {title}
          {/* `C(Te.Close, {})` — no props at all on the original, because `.pop-close svg` sizes
              and fills it (.875rem, `secondary`). `icon` is what the chunk's own icon wrapper
              prepends; it loses to `.pop-close svg` on specificity either way. */}
          <button
            type="button"
            className="button button-m pop-close !p-0"
            onClick={() => onResolve(false)}
            aria-label="Close"
          >
            <IconClose className="icon" />
          </button>
        </div>

        <div className="pop-content">
          <div className="text-base text-secondary">{children}</div>
          <div className="mb-2 mt-8 flex">
            <button
              type="button"
              className="button button-second button-m mr-3 flex-1 text-lg"
              onClick={() => onResolve(false)}
            >
              {cancel}
            </button>
            <button
              type="button"
              className="button button-brand button-m flex-1 text-lg"
              onClick={() => onResolve(true)}
            >
              {confirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
