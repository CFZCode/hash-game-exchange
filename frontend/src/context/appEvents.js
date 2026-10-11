import React from 'react';

/* The app-wide event bus — `E`/`B` in `index-BsFv7ByC.js`, which every remote imports as `emit`
 * and `on` off the host. The original uses it for exactly one thing this build needs: telling a
 * page that a DIALOG ROUTE has changed something the page is showing.
 *
 *   E().post("/payment/withdraw/address/add/", g).then(() => {
 *     p(-1), B.emit("add-white-addresss"), A(t("You have successfully added new address."))
 *   })
 *
 * ── WHY A CALLBACK PROP CANNOT DO THIS JOB ────────────────────────────────────────────────────
 *
 * A dialog route in this build is matched on the pathname in `App.jsx` and mounted BESIDE
 * `<Routes>` — so the dialog and the page it changed are siblings, not parent and child, and
 * there is nothing to hand a callback down.
 *
 * The location cannot stand in for one either, and that is worth writing down because it looks
 * like it can. `<Routes location={pageLocation}>` provides its own `LocationContext` to the whole
 * subtree, so a page under an open dialog reads the FROZEN location from `useLocation()`, not the
 * live one — and `navigate(-1)` is a POP, which restores the previous entry's original `key`. So
 * neither the pathname nor the key changes in a way the page can see. Both were tried.
 *
 * ── WHAT THIS IS NOT ──────────────────────────────────────────────────────────────────────────
 *
 * Not a state container and not a replacement for one. Nothing here holds a value: a listener is
 * told THAT something happened and re-reads its own service, which keeps the server as the single
 * answer to what is true. That is what the original does with these too.
 */

const listeners = new Map();

export function subscribe(name, fn) {
  const set = listeners.get(name) ?? new Set();
  set.add(fn);
  listeners.set(name, set);
  return () => {
    set.delete(fn);
    if (set.size === 0) listeners.delete(name);
  };
}

export function emit(name) {
  /* Copied before iterating: a listener that unsubscribes itself in its handler would otherwise
     mutate the set mid-loop. */
  [...(listeners.get(name) ?? [])].forEach((fn) => fn());
}

/* Revisions rather than a callback prop, because that is the shape `useResource` wants: it reads
 * once per distinct reader and has no refetch, so a page re-runs a read by re-keying it. This
 * hands back a number that goes up on every `emit(name)`, which is exactly that key.
 *
 *   const revision = useEventRevision('whitelist-changed');
 *   const read = React.useCallback(() => getWhitelist({ reloads: revision }), [revision]);
 *
 * `useSyncExternalStore` rather than `useState` in an effect: it subscribes during the commit
 * React itself controls, so an event fired between render and effect is not lost, and it is the
 * API that exists for precisely this.
 */
export function useEventRevision(name) {
  /* One counter per event name, module-scope, so every subscriber to the same name agrees on the
     value and `getSnapshot` can be a plain read. Returning a fresh object here instead is what
     makes `useSyncExternalStore` loop forever. */
  const store = React.useMemo(() => revisions(name), [name]);
  return React.useSyncExternalStore(store.subscribe, store.get, store.get);
}

const counters = new Map();
const stores = new Map();

function revisions(name) {
  const existing = stores.get(name);
  if (existing) return existing;

  counters.set(name, 0);
  const store = {
    get: () => counters.get(name) ?? 0,
    subscribe: (fn) =>
      subscribe(name, () => {
        counters.set(name, (counters.get(name) ?? 0) + 1);
        fn();
      }),
  };
  stores.set(name, store);
  return store;
}

/* The names in use. Kept here rather than as string literals at four call sites, for the reason
   `endpoints.js` collects paths: a typo in one of them is a listener that never fires and nothing
   at all to see. */
export const WHITELIST_CHANGED = 'whitelist-changed';
