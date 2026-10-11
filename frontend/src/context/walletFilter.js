import React from 'react';

/* `l = w()` and `O`/`_` in `CurrencyAmount-CcsyxXsB.js` — the wallet panes' shared filter store.
 *
 * The context and the hook live here rather than beside the provider for the reason `useSession`
 * lives outside `SessionContext.jsx`: `react-refresh/only-export-components` rejects a module that
 * exports both a component and a hook. Same split, same rule.
 *
 * Two consumers: `/wallet/transaction` (`wallet:tx-filter-v2`, five keys) and `/wallet/rollover`
 * (`wallet:rollover-filter`, three). They share the store and nothing else — each declares its own
 * storage key and its own defaults, and the provider reads the key set off the defaults object.
 */
export const WalletFilterContext = React.createContext(null);

/* `O` — throws on the original when used outside the provider, and that is worth keeping rather
   than softening to a null return: every filter control is meaningless without a store behind it,
   so a missing provider is a wiring bug and should say so. */
export function useWalletFilter() {
  const store = React.useContext(WalletFilterContext);
  if (!store) throw new Error('useWalletFilter must be used within WalletFilterProvider');
  return store;
}
