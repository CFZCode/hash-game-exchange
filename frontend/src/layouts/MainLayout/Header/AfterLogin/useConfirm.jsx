import React from 'react';
import { createPortal } from 'react-dom';
import ConfirmDialog from './ConfirmDialog';

/* `Pt.confirm`'s calling convention, kept intact so the call site reads like the chunk's:
 *
 *   Pt.confirm(t, e) { return new Promise(n => { ... push(tS, {children: t, onConfirm: i =>
 *                                                             { n(i); Pt.pop(r) }}) }) }
 *
 * A promise of a boolean, with the message as the first argument and the options as the second.
 * Returns that `confirm` plus the node to render — the caller has to place the node, which is
 * the price of not having the app-root host `u3()` provides. Portalled to `<body>` for the reason
 * every other dialog in this project is: `.pop-overlayer` is `position: fixed`, but it would
 * still be inside the header's `z-[99]` stacking context and could not paint over anything
 * layered above it.
 *
 * IN ITS OWN FILE for the reason `useSession` is not in SessionContext.jsx: `react-refresh`
 * rejects a module that exports both a component and a hook, and this one has to sit beside a
 * component it renders. Same split, same cause.
 */
export function useConfirm() {
  const [request, setRequest] = React.useState(null);
  const pending = React.useRef(null);

  const confirm = React.useCallback(
    (children, options = {}) =>
      new Promise((resolve) => {
        pending.current = resolve;
        setRequest({ children, ...options });
      }),
    [],
  );

  const settle = React.useCallback((answer) => {
    const resolve = pending.current;
    pending.current = null;
    setRequest(null);
    if (resolve) resolve(answer);
  }, []);

  /* `G(() => t.onConfirm(!1))` — the original's onCleanup, which answers "no" if the dialog is
     torn down without being answered. Here that is the owner unmounting (a sign-out while the
     confirm is up); a Promise settles once, so this cannot undo a real answer. */
  React.useEffect(
    () => () => {
      if (pending.current) pending.current(false);
    },
    [],
  );

  const dialog = request
    ? createPortal(<ConfirmDialog {...request} onResolve={settle} />, document.body)
    : null;

  return [confirm, dialog];
}
