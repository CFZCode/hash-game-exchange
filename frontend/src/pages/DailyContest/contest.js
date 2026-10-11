import { HIDDEN_NAME } from '../../context/account';

/* The daily contest standings behind `/promotions/daily-contest`.
 *
 * TWO CAPTURES OF ONE CONTEST. `pages/Home/LatestBets/contest.js` holds the other, and the
 * difference between them is only the day they were taken and the display currency in force at
 * the time — the prize ladder is identical (50 / 25 / 12 / 6 / 3 / 1.5 / 0.9 / 0.7 / 0.5 / 0.4
 * per cent of a 50,000 pool) because it is the same contest. They are kept apart rather than
 * merged because merging would mean inventing one of them: the home widget was captured on
 * 8/2-8/3 with a USD display currency and nine visible rows, this page on 8/10-8/11 with BCD
 * and ten. (This one is now PRINTED as USD — see the note on `currency` below; the capture is
 * still the BCD one and no figure in it has moved.) When a real feed lands, both call sites
 * read the same endpoint and one of these files goes away.
 *
 * Transcribed from the rendered page, so every figure is exact — including the wagers' ragged
 * precision (91,735,608 against 2,253,306.2), which is what a trimmed crypto amount looks like
 * and not a rounding slip. It is the STORED values that are ragged; printed as USD they take
 * `money`'s fixed 2dp, which is the fiat arm doing what it does on the home tab already.
 *
 * `player: HIDDEN_NAME` is the site's own `****` sentinel, not the literal string "Hidden" —
 * the widget maps it, and renders it a step dimmer, exactly as the bet feed does.
 */

export const CONTEST = {
  title: 'Daily Contest',
  /* USD AT REQUEST, AND NOT A RE-DENOMINATION. The capture was taken with BCD as the display
     currency, which is the only thing separating it from the home one; this renders the same
     figures under the other one, so the pool reads `$50,000.00` as the reference page does.
     No amount below changes and none needs to: `data/usdPrice.js` quotes BCD at exactly 1, so
     every one of these is already its own dollar value and the two spellings differ by the
     ticker alone. It is ONE field because it is one field on the original — the payload names
     the currency and `money`/`poolMoney` print every figure on the page in it, so the standings,
     the champion's bonus and the My Position row move with the pool. A page mixing the two is
     not a state the live site can produce. */
  currency: 'USD',
  prizePool: 50000,

  /* THE PRIZE LADDER, and it is a LIVE answer rather than a reading of the rows below.
     `GET /activity/contest/infos/` on hash.game is one of the three contest calls that answer
     unauthenticated, and it returns this array verbatim beside `winnerNumber: 10`. It is the
     same ten fractions each standing already carries as its own `rate`, which is the useful
     part: two independent sources agreeing, one captured off the rendered page and one fetched
     without reference to it.

     Kept as its own field rather than derived from the rows because the ORIGINAL keeps it
     apart — `userBonusRate` comes from `api_info` and `activeList` from `api_list`, and the
     signed-in row's "To reach Top N" reads the LADDER's length, not the number of players who
     happen to be listed. The two coincide here and need not: see the note at MyStanding in
     components/shared/Contest, where the home fixture's nine rows against this ten-entry ladder
     exercise the chunk's own out-of-range guard. */
  userBonusRate: [0.5, 0.25, 0.12, 0.06, 0.03, 0.015, 0.009, 0.007, 0.005, 0.004],
  active: true,

  /* Captured as a remaining duration, not an end time — see the note at the countdown in
     components/shared/Contest. */
  hours: 4,
  minutes: 57,
  seconds: 23,

  start: '8/10/2026',
  end: '8/11/2026',

  /* The Last Champion card. `rate` is the same fraction the standings use, so the card's
     "(50%)" is the first-place share rather than a separate figure. */
  champion: { player: 'Billioner_man', rate: 0.5, totalBonus: 25000 },
};

export const STANDINGS = [
  { rank: 1, player: '4b1zs59n8uh5', wager: 91735608, bonus: 25000, rate: 0.5 },
  { rank: 2, player: 'Deejayz85', wager: 35243879, bonus: 12500, rate: 0.25 },
  { rank: 3, player: 'Billioner_man', wager: 5735926, bonus: 6000, rate: 0.12 },
  { rank: 4, player: 'POKER4LIFE', wager: 2253306.2, bonus: 3000, rate: 0.06 },
  { rank: 5, player: 'ThePlayer1', wager: 2200933.1, bonus: 1500, rate: 0.03 },
  { rank: 6, player: 'Joshnakp', wager: 2024546.1, bonus: 750, rate: 0.015 },
  { rank: 7, player: HIDDEN_NAME, wager: 1982996.1, bonus: 450, rate: 0.009 },
  { rank: 8, player: HIDDEN_NAME, wager: 1640363.3, bonus: 350, rate: 0.007 },
  { rank: 9, player: 'BoyakBiy', wager: 1581998.2, bonus: 250, rate: 0.005 },
  { rank: 10, player: 'jvihb2hzfq8u', wager: 1423700, bonus: 200, rate: 0.004 },
];

export default STANDINGS;
