import { emptyIfAgentBlocked, request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { buildRewards } from '../pages/Bonus/bonus';
import RewardType from '../pages/Bonus/rewardTypes';
import { rewardTypeName } from '../pages/Bonus/claimAll';

/* The Bonus page's one read — `/bonus`.
 *
 * `POST /activity/bonus/v2/` is the whole page: the level card reads the account, the VIP panel
 * reads the vip service, and everything between the two — Total Claimable, the Realtime and
 * Recurring sections, every row and its right-hand figure — comes out of this single payload.
 *
 * IT IS LOGIN-GATED and answers nothing useful to a logged-out caller, but unlike the quest
 * feeds that costs this page almost nothing: `rewards-service-CxFWsPYn.js` is in the mirror and
 * declares the resource's `initialValue` inline, which is the payload a logged-out visitor
 * renders — and the capture's account is fresh enough that the real response looks the same.
 * `buildRewards()` is that value; see pages/Bonus/bonus.js for the one field in it that is
 * derived rather than recovered.
 *
 * It is a FUNCTION rather than a constant because three of its rows carry a next-claim instant
 * computed from each bonus's own drop rule, so the payload has to be built at read time. `now`
 * is threaded in rather than read inside, so a caller can pin it.
 */

/* ── LIVE: FOUR OF THE SIX ROWS ARE REAL, AND THE OTHER TWO STAY AT THE DECLARED DEFAULT ───────
 *
 * bc.game's payload is one map keyed by reward type. The platform splits the same ground across
 * two modules — `GET /user/bonus` for the three recurring ones and `GET /user/rakeback` for the
 * fourth — so the live arm reads both and fills them into the shape `buildRewards()` already
 * produces. That is deliberate rather than convenient: the two types with no platform equivalent
 * (`instant_bc` and `level_up_bonus`) then keep the service module's OWN declared default, which
 * is the same thing they render today and the same thing the capture shows.
 *
 *   daily_bet_back_bonus  <- types.daily      month_bonus  <- types.monthly
 *   weekly_bonus          <- types.weekly     rakeback     <- GET /user/rakeback
 *
 * ── WHAT DECIDES WHETHER A ROW READS "In Progress" OR A FIGURE ────────────────────────────────
 *
 * `RewardStatus`'s arm order is the whole of that behaviour and it is the chunk's: a recurring
 * type carrying `extra.nextClaimTime` prints "In Progress" and the amount arm never runs. So the
 * timestamp is not decoration — it IS the "still accruing" state, and the mapping has to place it
 * deliberately:
 *
 *   claimable: false -> KEEP the derived drop instant. The bonus is accruing and not yet due,
 *                       which is exactly what that arm means.
 *   claimable: true  -> DROP it, so the figure and the Claim affordance can show.
 *
 * The instant itself stays derived from each bonus's own stated rule ("Drops the next day UTC",
 * "every Friday UTC", "every 15th UTC") because the platform publishes no next-claim time at all
 * — see the note at `buildRewards`. `eligible` answers "does your VIP level reach `minVipLevel`";
 * bc.game renders an ineligible row like an empty one, but here an ineligible row carries
 * `extra.lockedVip` and the /bonus page reads "Unlocks at VIP n" (user's request, 2026-10-18).
 *
 * ── THE ITEM ──────────────────────────────────────────────────────────────────────────────────
 *
 * An entry's `items` is a list on the original and a single amount here, because that is all the
 * platform holds — one figure in one currency per type, with `award: null` beside it. Two fields
 * are the chunk's own names (`currencyName` is what `mergeKey` reads, `amount` is what the row
 * prints); `rewardItemType` is deliberately ABSENT rather than invented, since the only reader is
 * that same merge key and it is consulted for the VIP types alone — which none of these four is.
 *
 * A ZERO AMOUNT PRODUCES NO ITEM AT ALL, and that is load-bearing beyond this page: the account
 * dropdown's gift counts `canClaim ? items.length : 0` and branches on it, so an empty-but-
 * claimable row would light the badge for nothing to claim.
 */
const RECURRING = {
  daily: RewardType.DAILY,
  weekly: RewardType.WEEKLY,
  monthly: RewardType.MONTHLY,
};

const positive = (value) => Number(value) > 0;

/* One live figure folded onto the entry `buildRewards` already made, so anything the fixture
   carries that the platform has no opinion about survives untouched. */
function fill(entry, { amount, currency, claimable, eligible, minVipLevel }) {
  const canClaim = Boolean(claimable);
  const extra = { ...entry.extra };
  if (canClaim) delete extra.nextClaimTime;
  // Below the VIP gate the row says so ("Unlocks at VIP 2") instead of an "In Progress" that can't pay.
  if (eligible === false && minVipLevel != null) extra.lockedVip = Number(minVipLevel);

  return {
    ...entry,
    canClaim,
    extra,
    /* `rewardTypeName` IS THE LABEL THE GIFT PANEL PRINTS, and the platform does not send one —
       the live payload carries it beside every entry, the declared default leaves it empty, and
       an empty string would give the panel a row with no name. `REWARD_TYPES[type].title` is the
       chunk's OWN i18n title for exactly this type ("Daily Bonus", "Deposit Rakeback"), which is
       what the server would have sent, so this is recovery rather than invention. The `/bonus`
       page reads the same map directly and so cannot disagree with the panel. */
    rewardTypeName: rewardTypeName(entry.rewardType),
    items: positive(amount) ? [{ currencyName: currency, amount: String(amount) }] : [],
  };
}

function merge(payload, summary, rakeback) {
  const rewards = { ...payload.rewards };
  const currency = summary?.currency;

  for (const [key, type] of Object.entries(RECURRING)) {
    const row = summary?.types?.[key];
    if (!row || !rewards[type]?.[0]) continue;
    rewards[type] = [fill(rewards[type][0], { ...row, currency })];
  }

  const rakebackEntry = rewards[RewardType.DEPOSIT_RAKEBACK]?.[0];
  if (rakeback && rakebackEntry) {
    rewards[RewardType.DEPOSIT_RAKEBACK] = [fill(rakebackEntry, rakeback)];
  }

  /* `unclaimedCount` is the payload's own field and is NOT the gift's count — that one is the
     header's separate reduce over `items.length`. Only the panel's Claim All button reads this,
     and the panel is not built, so it is filled for consistency rather than for a consumer. */
  const claimable = Object.values(rewards)
    .flat()
    .filter((entry) => entry.canClaim);

  /* THE TOTAL AND THE TYPES THE CLAIM BUTTONS NEED. `items[0].amount` is what `fill` wrote from
     the platform's own figure, so this sums the same numbers the rows print rather than a second
     opinion about them. `claimableTypes` is what Claim All iterates: the platform has no
     batch-claim route (bc.game's is `POST /activity/bonus/v2/batch-claim/`), so "claim all" is
     one call per claimable reward, which is also why the order is stable and not a Promise.all —
     each credits a wallet, and a partial failure should stop rather than race. */
  const claimableTotal = claimable.reduce(
    (sum, entry) => sum + Number(entry.items?.[0]?.amount ?? 0),
    0,
  );

  return {
    ...payload,
    unclaimedCount: claimable.length,
    claimableTotal,
    claimableTypes: claimable.map((entry) => entry.rewardType),
    rewards,
  };
}

/* `reloads` is not read — it is part of the reader's identity so a claim can re-run this. See
   `pages/Bonus/index.jsx`. */
// eslint-disable-next-line no-unused-vars
export function getRewards({ now, reloads } = {}) {
  const payload = buildRewards(now);
  if (USE_FIXTURES) return request(ENDPOINTS.bonus.rewards, { fixture: payload });
  /* "Instant $BC" is bc.game's own token reward; this platform has no $BC and no such type, so
     the live page does not draw the row at all. */
  delete payload.rewards[RewardType.INSTANT_BC];

  return Promise.all([
    request(PLATFORM.user.bonus.summary, { live: true }).catch(emptyIfAgentBlocked(null)),
    request(PLATFORM.user.rakeback.summary, { live: true }).catch(emptyIfAgentBlocked(null)),
  ]).then(([summary, rakeback]) => merge(payload, summary, rakeback));
}

/* `POST /user/bonus/redeem` — the Redeem input on `/bonus`, and the last of the six routes
 * `endpoints.js` declared for that feature.
 *
 * `{code}`, `.strict()`, 4..40 characters over `/^[A-Z0-9-]+$/`. The server TRIMS AND UPPER-CASES
 * before it looks up — "so a player typing a code from a screenshot in lower case still matches",
 * in its own words — so nothing needs normalising here and the raw field value is sent.
 *
 * ── A CODE BELONGS TO AN ACCOUNT, WHICH IS NOT WHAT A PROMO CODE USUALLY MEANS ────────────────
 *
 * The lookup is `where: {userid: userId, code}`. So these are codes ISSUED TO A PLAYER, not
 * campaign codes a stranger can type: another account's code answers `404` exactly as a made-up
 * one does, and there is no route that mints one player-side. `GET /user/bonus/codes` is the
 * visitor's own list of them, paginated and empty on this delivery.
 *
 * Two refusals, and the messages below are the platform's own:
 *
 *   404 CODE_NOT_FOUND   "That redeem code is not valid"
 *   409 CODE_NOT_ACTIVE  "That redeem code has already been used or has expired" — also the arm
 *                        for a code whose value is zero, and for losing the update race, since
 *                        the UPDATE is guarded on `status = active`.
 *
 * Answers `{code, amount, currency, newBalance}` on success — ONE amount in the bonus currency,
 * where bc.game's own dialog lists a row per reward with a type each (Lottery, Lucky Spin, …).
 * `pages/Bonus/Rewards.jsx` says what that costs the result screen.
 */
export function redeemBonusCode({ code }) {
  return request(PLATFORM.user.bonus.redeem, {
    live: true,
    method: 'POST',
    json: { code },
  });
}

/* ── THE CLAIM BUTTONS ─────────────────────────────────────────────────────────────────────────
 *
 * Three routes, three modules, and no batch. bc.game's own Claim All is
 * `POST /activity/bonus/v2/batch-claim/`; this platform has none, so claiming everything is one
 * call per reward — see `claimableTypes` in `merge` for why that is a sequence rather than a race.
 *
 * `POST /user/bonus/claim/:type` takes `daily`, `weekly` or `monthly` and CHECKS THE VIP GATE ON
 * THE CLAIM, not only on the read: the three need level 20, 25 and 30, and a claim below that
 * answers `VIP_LEVEL_TOO_LOW` even though the row rendered. Legacy checked it only on the read,
 * which is the bug this closes — so the button can be enabled and the claim still refused, and
 * the message is the platform's own.
 *
 * `NOT_CLAIMABLE` is the other refusal, and it is the honest one: the row said claimable, the
 * award had already been taken, and the second claim loses. Rakeback is its own module with its
 * own rate limit — a claim moves money, so it is limited per route rather than per account.
 *
 * THE AFFILIATE REWARD IS NOT ONE OF THESE and is deliberately not exported here. It is a
 * different module, it is not a `rewardType` the Bonus page groups on, and its claim lives with
 * the rest of the referral dashboard in `services/referral.js` (`claimAllAffiliateRewards`).
 * An earlier draft did export one from this file, pointed at `/affiliate/rewards/claim` with no
 * body — that route validates `{rewardId}` and would have answered 422. Nothing called it.
 */

/** `daily` | `weekly` | `monthly`. */
export const claimBonus = (type) =>
  request(PLATFORM.user.bonus.claim(type), { live: true, method: 'POST', fixture: null });

export const claimRakeback = () =>
  request(PLATFORM.user.rakeback.claim, { live: true, method: 'POST', fixture: null });

export default getRewards;
