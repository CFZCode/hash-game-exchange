import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { WalletFilterContext } from './walletFilter';

/* `N` in `CurrencyAmount-CcsyxXsB.js`, verbatim — the filter store behind two wallet panes.
 *
 * WHERE EACH KEY COMES FROM IS THE WHOLE POINT, and the precedence is the original's:
 *
 *   1. the SEARCH PARAMS      so a link can arrive pre-filtered
 *   2. the pane's defaults
 *
 * That is what makes the Vault card's History button work — `/wallet/transaction?type=bill&
 * billType=Vault` lands with the Bill Type filter already set. The original also restored the
 * last filters from sessionStorage; this site deliberately does NOT (user's request, 2026-10-17):
 * every page load starts from the defaults, so a reload never opens on yesterday's "Won · Lay"
 * and an empty list. `storageKey` is kept in the signature for the call sites.
 *
 * SEEDED ONCE. Each key becomes its own signal at provider mount on the original, so editing the
 * URL afterwards does not re-seed; a `useState` initialiser reproduces that exactly. Which also
 * means the key SET is fixed by `defaults` — pass a stable object (a module constant or a memo),
 * since a fresh one every render would not change the seeded state but would churn the memo below.
 *
 * `setMany` is this build's addition and not a new capability: the Type filter's own handler calls
 * `set` three times in a row (`set("type", …), set("status",""), set("billType","")`), which in
 * React would be three queued updates off one stale closure. One call with a patch is the same
 * intent expressed once.
 */
// eslint-disable-next-line no-unused-vars -- `storageKey` stays in the call sites' signature (see above)
export default function WalletFilterProvider({ storageKey, defaults, children }) {
  const [searchParams] = useSearchParams();

  const [state, setState] = React.useState(() => {
    const seeded = {};
    for (const key of Object.keys(defaults)) {
      seeded[key] = searchParams.get(key) || defaults[key] || '';
    }
    return seeded;
  });

  const value = React.useMemo(
    () => ({
      get: (key) => state[key] ?? '',
      set: (key, next) => setState((prev) => ({ ...prev, [key]: next })),
      setMany: (patch) => setState((prev) => ({ ...prev, ...patch })),
    }),
    [state],
  );

  return <WalletFilterContext.Provider value={value}>{children}</WalletFilterContext.Provider>;
}
