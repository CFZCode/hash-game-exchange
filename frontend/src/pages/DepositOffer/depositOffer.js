/* The deposit-bonus payload.
 *
 * ROUTE. `/deposit-offer` — the original's own path, `component: c(() => L.DepositOffer())` in
 * Enter-MsmOuq5R.js, and what the sidebar's "Deposit Bonus" row (menuIcon `deposit_offer`)
 * points at. It carries `info: { dialog: m.mobile }`, the same flag the promotions page has:
 * a page on desktop, a dialog on a phone. Only the page side is built.
 *
 * WHERE THIS COMES FROM. The page chunk (`index-DcrUJi8K.js`) is NOT in the mirror and no
 * response was captured either, so the strings, percentages and minimums below are
 * transcribed from rendered markup and screenshots of the live page. What IS in the mirror is
 * the SERVICE: `index-CoOXrsZl.js` is saved and readable, and it names this feature's two
 * calls exactly —
 *
 *   getTimesDepositBonus:    GET  /activity-extension/times-deposit-bonus/list/
 *   receiveTimeDepositBonus: POST /activity-extension/times-deposit-bonus/claim/ {id, bonusType}
 *
 * "times", not "cycle": the sibling `cycle-deposit-bonus/*` trio is the WEEKLY deposit reward,
 * a different feature. This page's four numbered stages are the 1st/2nd/3rd/4th deposit of the
 * month, which is what a times-deposit bonus is. Both are in services/endpoints.js.
 *
 * WHAT IS DERIVED RATHER THAN COPIED, and why each is not a guess:
 *
 * - `match` is `bonus + rakeback`. DEPOSIT 1 is 180 + 40 and the page's own headline reads
 *   "220% Deposit Rakeback"; DEPOSIT 4 is 360 + 140 and the card's description reads "Up to
 *   500% bonus". Both ends check out, so the middle two are the same arithmetic.
 * - The reset instant is the END OF THE CURRENT MONTH IN UTC, computed in services/bonus.js
 *   rather than pinned. The page states the rule itself — "All 4 chances reset on the 1st of
 *   each month at 00:00 UTC" — and the captured `expiresinms` attribute, 1788220799999, is
 *   2026-08-31T23:59:59.999Z, which is that rule to the millisecond. Computing it keeps the
 *   countdown alive instead of freezing on the day the capture was taken.
 *
 * `image` is the basename of the artwork in src/assets/deposit-offer/, and it is the local
 * filename with no lookup table in between — the card and the dialog head both resolve it
 * through the same glob. On the live site the file is `/assets/monthly-BVEfL9VE.png`, bundled
 * into the missing chunk, so it could not be fetched (bc.game's origin times out from this
 * environment, unlike its CDNs) and was supplied directly instead: a 200x200 RGBA export for
 * two 48px slots, which is retina headroom to spare.
 */

/* Both inline on the original — a literal rgba/rgb pair written onto the badge rather than a
   token. #71E871 is NOT `brand_alt` (#9FE871), which is close enough to swap by accident, so
   it stays a literal here too. */
const BOOSTER_GREEN = '#71E871';

export const BONUSES = [
  {
    id: 'monthly-deposit-bonus',
    title: 'Monthly Deposit Bonus',
    image: 'monthly',
    description:
      'Up to 500% bonus, unlocked as you play. Every wager returns real, withdrawable cash.',

    /* The first tag doubles as the progress card's green pill; the rest are card-only. */
    tags: [
      { label: 'NEW USER BOOSTER', color: BOOSTER_GREEN },
      { label: 'DEPOSIT RAKEBACK' },
    ],

    /* Stage 1 of 4, unclaimed — the capture's own state. The stepper's fill is `width: 0%`
       and every stage carries `cursor-not-allowed`, which is the signed-out page: nothing is
       claimable because there is no account behind it. */
    currentStage: 1,
    progress: 0,

    stages: [
      { label: 'DEPOSIT 1', bonus: 180, rakeback: 40, minDeposit: 5 },
      { label: 'DEPOSIT 2', bonus: 240, rakeback: 60, minDeposit: 10 },
      { label: 'DEPOSIT 3', bonus: 300, rakeback: 100, minDeposit: 20 },
      { label: 'DEPOSIT 4', bonus: 360, rakeback: 140, minDeposit: 30 },
    ],
    minDepositCurrency: 'BCD',

    /* The four-line checklist beside the stepper. Deliberately the same four verbs as the
       dialog's How to Participate headings — that repetition is the page's, not a copy/paste
       slip, and the two lists are kept separate because only the dialog's carries bodies. */
    steps: [
      'Hit the Minimum Deposit',
      'Claim Your Locked Bonus',
      'Play and Unlock',
      'Collect Your Reward',
    ],

    overview:
      'Get 4 deposit bonuses every month. Each bonus starts locked and unlocks as you wager. ' +
      'All 4 chances reset on the 1st of each month at 00:00 UTC. Exclusive to new users - ' +
      'available for 24 hours only.',

    howTo: [
      {
        title: 'Make a Deposit',
        body: 'Deposit the minimum qualifying amount or more. You have up to 4 deposit bonus chances each month.',
      },
      {
        title: 'Claim Your Locked Bonus',
        body: 'After depositing, manually claim your bonus. It will be added to your locked balance as Deposit Rakeback.',
      },
      {
        title: 'Play and Unlock',
        body: 'Place bets as you normally would. Your locked bonus unlocks in real time as your wagers are settled.',
      },
      {
        title: 'Collect Your Reward',
        body: 'Claim your unlocked rewards from the Bonus page anytime - no expiration. All rewards are real cash and can be withdrawn immediately.',
      },
    ],
  },
];

/* The total percentage a stage pays — see the note above on why this is arithmetic and not a
   transcription. Exported because the dialog's calculator and the page's headline both need
   it and neither should re-derive it. */
export const stageMatch = (stage) => stage.bonus + stage.rakeback;

export default BONUSES;
