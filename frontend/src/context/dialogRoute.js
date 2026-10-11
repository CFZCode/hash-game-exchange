import React from 'react';

/* "Am I being rendered as a dialog, or as a page?" — and on the original this is not a prop, it
 * is the ROUTER'S OWN CONTEXT.
 *
 * `Go()` in the deposit chunk is `bb` in index-BsFv7ByC.js, which is `oa()`, which is
 * `useContext(h3)`. `h3` is provided in exactly one place, and the guard beside it is the whole
 * story:
 *
 *   children: (P, z) => {
 *     if (P.type !== Le.DIALOG) return null;      // <- page routes get NO provider
 *     ...
 *     return C(h3.Provider, { value: { route: P, index: z, stacks: f, navDepth: D }, ... })
 *   }
 *
 * where `Le` is the route-type enum `{ BASE: 0, DIALOG: 1, SHALLOW: 2 }`. So a component mounted
 * by a dialog route reads a value and one mounted by a plain page route reads `undefined`.
 *
 * THIS LIVED IN `pages/Deposit/dialogContext.js` UNTIL THE WITHDRAW PAGE ARRIVED, and it moved
 * for the reason `Select` and `GameTile` moved: it now has two consumers. It was never really the
 * deposit page's own — it is the router's, and the wallet's Deposit / Withdraw / Buy / Swap /
 * Vault panes are all mounted by BOTH a dialog route and a `/wallet/*` page route, so every one
 * of them will read it as it is built. `/deposit` carries `info.dialog = {size:[30,44]}` while
 * `/wallet/deposit` carries none; `/withdraw` is in the same dialog group (`{dialog: !0}` on the
 * group, in Enter-MsmOuq5R.js) while `/wallet/withdraw` carries `info.dialog = mobile`, a DEVICE
 * test that is false on the desktop this build targets.
 *
 * THE BRANCHES IT DRIVES, all verified in the chunks rather than inferred from the captures:
 *
 *   `NN`  the deposit tabs   divider={!!e}, type={e ? "indicator" : undefined}, and the whole
 *                            `sticky top-[-1px] z-30 -mx-4 mb-0 bg-layer4 sm:bg-layer2
 *                            [&_.tabs-btn-group]:px-4` class list, which only exists when `e`
 *                            does. So the dialog gets a pinned strip with a green underline and
 *                            the page gets plain filled tabs on the page background.
 *   `J0`  the quick picks    `const m = i ? 4 : 6` — four coin chips in the dialog, SIX on the
 *                            page, with the next three going into the "More" stack either way.
 *   `P`   the card           `clsx("rounded-xl bg-layer4 p-4", !t && "lg:px-8", class)` in
 *                            PageLayout-CcB1ecIM.js — a page's cards get wider side padding from
 *                            `lg` up. Now `components/shared/PageCard`.
 *   `w3`  the page title     `if (oa()) { ...writes the title into the dialog context }; return
 *                            t.children` — so `<PageLayout title="Withdraw">` puts "Withdraw" in
 *                            a DIALOG'S TITLE BAR and renders nothing at all on a page. That is
 *                            why the withdraw pane's capture has no heading above its card, and
 *                            it is one more thing that would have read as a missing element.
 *   `Sn`  the Cwallet row    `class: isDialog ? "mt-4" : ""` over its own `mt-2`.
 *
 * Defaulting to `false` is deliberate: a page is the plain case, and a component rendered outside
 * either route should look like a page rather than like half a dialog.
 */
export const DialogRouteContext = React.createContext(false);

export const useIsDialog = () => React.useContext(DialogRouteContext);
