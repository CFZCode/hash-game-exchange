import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { WalletFilterContext } from './walletFilter';

/* `N` in `CurrencyAmount-CcsyxXsB.js`, verbatim — the filter store behind two wallet panes.
 *
 * WHERE EACH KEY COMES FROM IS THE WHOLE POINT, and the precedence is the original's:
 *
 *   1. the SEARCH PARAMS      so a link can arrive pre-filtered
 *   2. sessionStorage         under the pane's own `storageKey`
 *   3. the pane's defaults
 *
 * and the whole set is written back to sessionStorage on every change. That is what makes the
 * Vault card's History button work — `/wallet/transaction?type=bill&billType=Vault` lands with the
 * Bill Type filter already set — and it is why a pane remembers your filters for the tab's
 * lifetime but not beyond it. SESSION, not local: the original picked the storage that forgets.
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
export default function WalletFilterProvider({ storageKey, defaults, children }) {
  const [searchParams] = useSearchParams();

  const [state, setState] = React.useState(() => {
    let stored = {};
    try {
      stored = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
    } catch {
      /* `sessionStorage` THROWS rather than returning null in a private window and with site data
         switched off. Same swallow as context/persist.js, and for the same reason: a filter that
         does not stick beats a pane that cannot render. */
    }
    const seeded = {};
    for (const key of Object.keys(defaults)) {
      seeded[key] = searchParams.get(key) || stored[key] || defaults[key] || '';
    }
    return seeded;
  });

  React.useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* as above */
    }
  }, [storageKey, state]);

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
