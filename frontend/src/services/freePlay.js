import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { isFiatCode } from '../utils/currency';
import { assetExact } from '../utils/gameArt';

/* `/free-plays` — the Free Plays dialog. `ws` in `Enter-MsmOuq5R.js` is the whole request layer,
 * and it is worth reading rather than summarising:
 *
 *   const ws = Wo(() => {
 *     const [e, n] = S(0), t = he(() => ["/activity/bonus/freeplays/unused-rewards/", {
 *       login: b.login, _v: e()
 *     }], ([i, s]) => {
 *       if (s.login) return U().post(i, {
 *         brandFlags: [m.config.betby_brand_id, m.config.bti_config.primary.light]
 *       })
 *     }, { expires: 1e4 });
 *     return Object.assign(t, { refetch: () => n(i => i + 1) });
 *   });
 *
 * FOUR THINGS IN THERE.
 *
 * `Wo` is `createRoot`-with-a-cache: one resource shared by every consumer, which matters because
 * there are two — this dialog and `FreePlayDot`, the unread badge on the account dropdown's own
 * Free Plays row. They read the same signal, so the badge and the dialog's tab counts can never
 * disagree.
 *
 * THE FETCHER RETURNS `undefined` WHEN LOGGED OUT, and there is NO `initialValue` on the resource.
 * That is why every read in the dialog is `?.`-guarded down to `0` or `[]` — the payload being
 * absent is a state the original renders, not an error. It is also why this file needs no fixture:
 * `hash.game` answers the path **403 with an empty body** (checked; not the 6002 the payment paths
 * give, and not the transaction pane's Spring page either), so there is nothing to capture and
 * nothing to invent. The dialog renders All 0 / Free Spins 0 / Free Bet 0 over "No Free Plays
 * Yet", which is exactly the capture.
 *
 * `brandFlags` comes from the runtime env store, whose defaults are empty strings — the real
 * values arrive with the deploy's own config and are not in the saved page. They are passed
 * through as the store has them rather than being invented, since the body only matters the day
 * the request is actually made.
 *
 * `expires: 1e4` is a 10s cache on the resource itself. Not reproduced: `request()` answers
 * fixtures synchronously, so there is nothing to cache. It is one line at the seam whenever the
 * flag flips.
 */

/* The shape, from the component's accesses rather than from a response:
 *
 *   { totalCount, freeSpinCount, freeBetCount, freeSpins: [...], freeBets: [...] }
 *
 * and a row, read as a Free Spin when `bonusType === "Free Spin"` and as a sports free bet
 * otherwise — one object, two views, which is why the minified source aliases `item` twice:
 *
 *   free spin   iconThreeFour, bonusSource, fullName, quantity, amount, currencyName,
 *               gameUnique, fsId, rollover, rewardItemId
 *   free bet    provider ("bti" | "betby"), title, amount, currencyName,
 *               amountRequireWagerTimes, maxWithdrawalAmount, rewardItemId
 */
/* ── The platform's own free spins, wired 2026-09-04 ──────────────────────────────────────────
 *
 * `GET /casino/gis/freespins/mine` — one campaign per row, built for this. `gis_freespins` had
 * three routes over it and all three were staff ones, so this dialog's Free Spins tab has been
 * correctly empty rather than broken; the read it needed simply did not exist.
 *
 * THE FREE BET HALF IS NOT WIRED AND CANNOT BE. A free bet is a SPORTS bonus carrying
 * `provider: "bti" | "betby"`, and neither is configured on this delivery (Part 4 of
 * docs/backend-gaps.md) — nor does this platform have a sports free-bet table for one to be
 * granted into. So `freeBetCount` stays 0 and the Free Bet tab keeps its empty state, which is
 * the honest rendering rather than a gap.
 */
const toFreeSpinRow = (row) => {
  /* `iconThreeFour` IS A REMOTE URL ON THE ORIGINAL and there is no feed behind it here: the
     aggregator catalogue is empty and `js_games.game_icon` is null for all twenty in-house games.
     So the artwork is resolved the way `GameTile` resolves a locally-known game — by slug, out of
     `src/assets/games` — and left undefined when there is no file, which is what makes the row's
     `<img>` fall back rather than draw a broken mark. `assetExact` and not `assetFor`: the fuzzy
     one always returns SOMETHING, which would put another game's cover on a free spin. */
  const slug = row.gameUuid;

  return {
    bonusType: 'Free Spin',
    rewardItemId: row.id,
    fsId: row.freespinId,
    gameUnique: slug,
    iconThreeFour: assetExact(slug),
    /* `bonusSource` names WHERE a bonus came from on bc.game — "Weekly Bonus", a promotion's
       name. A campaign here carries no such field: `freespin_id` is an operator-chosen id and
       putting a raw id in a title would read as a bug. The feature's own name is used instead,
       which is also what the tab above the row says; the informative half is `fullName` below,
       which names the game. Replace this the day campaigns carry a source. */
    bonusSource: 'Free Spins',
    fullName: row.game?.name ?? slug,
    /* What is LEFT to play, not what was granted — the row prints "N x amount" and a campaign
       half spent should not still offer its original count. */
    quantity: row.quantityLeft,
    /* Bare code to this build's wallet key. Every campaign is crypto today, where the two
       spellings agree, so this guards the fiat case rather than fixing a visible one — the same
       crossing `toWhitelistRow` and the rollover row both need. */
    currencyName: row.currency
      ? (isFiatCode(row.currency) ? `${row.currency}FIAT` : row.currency)
      : '',
    /* The per-spin stake, null when the campaign was created against a `total_bet_id` and the
       provider owns the amount. `printCurrency` renders a null as zero, which is the honest
       reading of "we were not told". */
    amount: row.denomination,
    /* Not carried by a campaign. Only `toClaimableItem` reads it, for a detail popup that is not
       built; left undefined rather than invented as 0, which would print a real-looking rule. */
    rollover: undefined,
  };
};

export function getFreePlays({ brandFlags = ['', ''] } = {}) {
  if (!USE_FIXTURES) {
    return Promise.resolve(
      request(PLATFORM.casino.myFreespins, { live: true, fixture: { total: 0, freespins: [] } }),
    ).then((answer) => {
      const freeSpins = (answer?.freespins ?? []).map(toFreeSpinRow);
      return {
        totalCount: freeSpins.length,
        freeSpinCount: freeSpins.length,
        /* See the note above — no sports provider, so no free bets exist to count. */
        freeBetCount: 0,
        freeSpins,
        freeBets: [],
      };
    });
  }

  return request(ENDPOINTS.bonus.freePlays, {
    method: 'POST',
    body: JSON.stringify({ brandFlags }),
    /* Deliberately absent. `undefined` IS the payload — see the note above. */
    fixture: undefined,
  });
}

/* `C` — the tab strip. Three entries whose counts come off the envelope, so all three read 0
   while the feed is shut. */
export function freePlayTabs(data) {
  return [
    { name: 'All', count: data?.totalCount },
    { name: 'Free Spins', count: data?.freeSpinCount },
    { name: 'Free Bet', count: data?.freeBetCount },
  ];
}

/* `b` — the panel behind the active tab, and note the tab ORDER is not the branch order: the
   memo tests 0, then 2, then 1. All is spins-then-bets concatenated; each of the other two is one
   list. The `emptyText` differs per tab and is what the empty state prints. */
export function freePlayPanel(data, index) {
  if (index === 0) {
    return {
      data: [...(data?.freeSpins || []), ...(data?.freeBets || [])],
      emptyText: 'No Free Plays Yet',
    };
  }
  if (index === 2) return { data: [...(data?.freeBets || [])], emptyText: 'No Free Bets Yet' };
  if (index === 1) return { data: [...(data?.freeSpins || [])], emptyText: 'No Free Spins Yet' };
  return { data: [], emptyText: '' };
}

/* `rt` in `claimable-item-detail-DA9ukfTK.js` — a free-play row mapped into the shared claimable
 * item shape, which is what the detail popup carousel is built over. Ported because the row's
 * title click passes the WHOLE list through it (`at(list, index, true)`), so the mapping is part
 * of this dialog's behaviour even though the popup it feeds is not built.
 *
 * `claimable: false` is hardcoded — a free play is already granted, so the popup shows its terms
 * rather than a Claim button. `rollover` is spelled two different ways by the two row types.
 */
export function toClaimableItem(row) {
  const isFreeSpin = row.bonusType === 'Free Spin';
  return {
    id: row.rewardItemId,
    type: isFreeSpin ? 'FreeSpin' : 'SportsFreeBet',
    title: isFreeSpin ? row.bonusSource : row.title,
    amount: row.amount,
    quantity: row.quantity,
    currency: row.currencyName,
    claimable: false,
    rollover: isFreeSpin ? Number(row.rollover) : row.amountRequireWagerTimes,
    maxWithdrawal: row.maxWithdrawalAmount,
  };
}
