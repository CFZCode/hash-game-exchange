/* The wager contest as the home page's third tab captured it.
 *
 * Lifted out of WagerContest.jsx, which no longer exists — the widget itself is now
 * `components/shared/Contest`, since the `/promotions/daily-contest` page renders the identical
 * thing. Only the payload stayed behind, because this capture and the page's are two different
 * days of one contest and neither can be derived from the other; see the note at the top of
 * `pages/DailyContest/contest.js`.
 *
 * Two things here are this capture's and not the widget's: the display currency was USD, so
 * every figure prints with a leading `$` and a fixed 2dp, and only nine rows were visible.
 *
 * The contest feed has no captured endpoint, so these standings are transcribed from the live
 * page. Everything structural is the chunk's own markup, over in the shared component.
 */

export const CONTEST = {
  title: 'Daily Contest',
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
  hours: 0,
  minutes: 59,
  seconds: 0,
  start: '8/2/2026',
  end: '8/3/2026',
  champion: { player: 'Jaybindas', rate: 0.5, totalBonus: 25000 },
};

export const STANDINGS = [
  { rank: 1, player: 'Jaybindas', wager: 25281075.76, bonus: 25000, rate: 0.5 },
  { rank: 2, player: 'Hani01', wager: 11139753.78, bonus: 12500, rate: 0.25 },
  { rank: 3, player: 'SlimKG24', wager: 4969501.7, bonus: 6000, rate: 0.12 },
  { rank: 4, player: 'Lbtiubtohpac', wager: 4927403.51, bonus: 3000, rate: 0.06 },
  { rank: 5, player: 'uebraqroym4k', wager: 3641002.37, bonus: 1500, rate: 0.03 },
  { rank: 6, player: 'DHsrb', wager: 3420738.88, bonus: 750, rate: 0.015 },
  { rank: 7, player: '4b1zs59n8uh5', wager: 3352433.76, bonus: 450, rate: 0.009 },
  { rank: 8, player: 'Jlkgchoxcxcc', wager: 2745474.32, bonus: 350, rate: 0.007 },
  { rank: 9, player: 'misterh88', wager: 2151110.47, bonus: 250, rate: 0.005 },
];

export default STANDINGS;
