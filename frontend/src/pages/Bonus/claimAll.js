import { REWARD_TYPES } from './bonus';
import { getCurrency } from '../../data/currencies';
import { convertCurrency } from '../../utils/currency';

/* `Se` in `use-claim-all-Dbi11oaE.js` — the read half.
 *
 * That hook returns six things and this file is the four the GIFT PANEL renders from:
 * `groupedByRewardItemType`, `totalAmount`, `totalAmountCurrency`, and the `unclaimedCount` test
 * behind the Claim All button. `handleClaimAll` and `claiming` are the write and are not ported —
 * `POST /activity/bonus/v2/batch-claim/` is authenticated, its success popup (`ye`, "ALL
 * COLLECTED!") is a `.pop` this build has no stack for, and the button already carries the
 * original's own disabled gate. See the note at the button.
 *
 * A plain module rather than a hook: nothing here holds state, and the panel already has the
 * payload from `useResource`. The original is a hook only because it also owns `claiming`.
 */

/* `w` — WHICH CURRENCY THE TOTAL IS PRINTED IN, and it is a three-way test rather than the
   account's bonus currency:

     enableLocaleCurrency ? localeCurrencyName
       : getCurrency(bonusCurrencyName)?.currencyType === "FIAT" ? bonusCurrencyName
       : "USDFIAT"

   So a crypto bonus currency is shown converted to dollars while a fiat one is left in its own
   unit. Against the platform `bonusCurrencyName` is `BJB`, which the catalogue does not carry at
   all — `getCurrency` returns undefined, the FIAT arm is false, and the total prints in USDFIAT.
   That is the same arm a BCD account takes on the live site. */
export function displayCurrency(session) {
  if (session.setting?.enableLocaleCurrency) return session.setting.localeCurrencyName;
  return getCurrency(session.bonusCurrencyName)?.currencyType === 'FIAT'
    ? session.bonusCurrencyName
    : 'USDFIAT';
}

/* `ie` — an item's EFFECTIVE amount. A free spin is worth its bet times its count; everything
   else is worth its amount. Written out because the claim handler computes the same thing and
   the two must not disagree, even though no free spin can reach this build. */
const effectiveAmount = (item) =>
  item.type === 'FreeSpin'
    ? (Number(item.amount) || 0) * (Number(item.quantity) || 0)
    : Number(item.amount) || 0;

/* `groupedByRewardItemType` — every ITEM of every CLAIMABLE entry, keyed by the item's type.
 *
 * Two things worth knowing before reading the panel against it. The row carries the ENTRY's
 * `rewardTypeName` as its `title`, not the item's — an entry is "Daily Bonus" and its items are
 * the individual grants inside it. And the grouping is invisible in the panel: `yt` does
 * `o().flatMap(a => a.data)`, so the groups exist for the claim-all SUCCESS popup, which is not
 * built. That is why an item with no `rewardItemType` costs nothing here.
 */
export function claimableGroups(payload) {
  const groups = new Map();

  const claimable = Object.values(payload?.rewards ?? {})
    .flat()
    .filter((entry) => entry.canClaim);

  for (const entry of claimable) {
    for (const item of entry.items ?? []) {
      const type = item.rewardItemType;
      if (!groups.has(type)) groups.set(type, { name: type ?? '', data: [] });
      groups.get(type).data.push({
        /* `rewardItemId` on the original. The platform issues no item id — it reports one figure
           per reward type — so the row is keyed on the reward type instead, which is unique for
           the same reason. Only a React key and the detail flow's lookup read it, and that flow
           is not built. */
        id: item.rewardItemId ?? entry.rewardType,
        type,
        rewardType: entry.rewardType,
        title: entry.rewardTypeName,
        amount: item.amount,
        quantity: item.quantity,
        currency: item.currencyName,
        claimable: entry.canClaim,
      });
    }
  }

  return [...groups.values()];
}

/** `g()` — the panel's flat list. The groups are a detail of the popup, not of this list. */
export const claimableRows = (payload) => claimableGroups(payload).flatMap((group) => group.data);

/* `T` — every claimable item converted into the display currency and added up. `Decimal` on the
   original; plain arithmetic here for the reason `printCurrency`'s port gives, and the figure is
   truncated for display by the formatter rather than by this. */
export const totalClaimable = (payload, currency) =>
  claimableRows(payload).reduce(
    (total, row) => total + convertCurrency(effectiveAmount(row), row.currency, currency),
    0,
  );

/* Not the hook's, but its natural home: the label a row prints. On the live site the server sends
   `rewardTypeName` with the payload; against the platform it is filled from `REWARD_TYPES`, which
   is the chunk's own i18n title for that type — recovery rather than invention. Exported so
   `services/rewards.js` fills the same string the page would have printed. */
export const rewardTypeName = (type) => REWARD_TYPES[type]?.title ?? '';
