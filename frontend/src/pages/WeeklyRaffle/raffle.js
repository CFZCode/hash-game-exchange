/* The weekly raffle's prose and prize model.
 *
 * WHERE THE COPY COMES FROM. The page's own chunk (`index-BLT5gN04.js`, named by
 * `Enter-MsmOuq5R.js` at `path: "/promotions/weekly-raffle"`) is NOT in the mirror, so
 * there is no markup to transcribe. The strings below are still the site's own: they are
 * lifted from `index-Dn9m_cUp.js`, the translation bundle, which IS saved and carries every
 * one of them as an en-US key/value pair. Headings, card lines, rule bodies and FAQ answers
 * are all verbatim from there — search that file for any sentence here and it comes back.
 *
 * THE RULE BODIES, THE FAQ ANSWERS AND THE PRIZE LADDER ARE NOW CAPTURED. All three used to be
 * inferred: the grouping of sentences under the headings was this project's reading of a flat
 * alphabetical bundle, and the ladder was reverse-engineered from the twenty winners on page 1,
 * because no capture showed an open accordion. Opened panels have since been captured, so the
 * arrangement is read rather than guessed. Four things the capture corrected that no amount of
 * reading the bundle could have:
 *
 * - "How to Enter" carries two sentences the bundle-reading had filed nowhere ("Every entry
 *   will correlate to an entry number." / "Your entry numbers can be found on the same page.")
 *   and "Weekly Raffle Draw" is a SINGLE sentence, not the three it had been given.
 * - The two sentences that had padded out that rule — the Monday-to-Sunday window and the
 *   winner-list update — are the LAST FAQ answer's. Sentences moved between sections in both
 *   directions, which is exactly what a flat alphabetical map cannot tell you.
 * - The first FAQ answer ends on "Ticket refresh every 10 mins, please check in 'My Tickets'
 *   section.", a string the earlier reading had dropped entirely.
 * - The ladder runs to 150 places, not 20. Places 21-50 ($50) and 51-150 ($20) pay out below
 *   the winner list's last visible row, so no amount of reading `winners.js` could have found
 *   them, and 6th-10th is printed as five separate rows rather than a range.
 *
 * `__ENV_HOST__` is the bundle's own placeholder for the site name and is substituted here.
 */
import { brandName } from '../../services/siteBranding';
const HOST = brandName();

/* The two "How to Earn Ticket" cards. `amount` is printed in brand green inside the line,
   which is why the line is split rather than stored as one string — the original's own
   `platform.trans.mainpage.log.wager` is "Log in & Wager <1>__amount__</1>Daily", where the
   <1> is exactly that span.

   THE TRAILING SPACE IN THE FIRST CARD'S `before` IS LOAD-BEARING AND THE SECOND CARD'S ABSENCE
   OF ONE IS TOO. `Tt` in index-BLT5gN04.js hands <Trans> its slots as
   `["Log in & Wager ", <span class="mx-1.5 text-brand">, "Daily"]` — space after "Wager", none
   before "Daily" — while the second card is three bare spans with no whitespace between them at
   all. Every visible gap comes from the span's own `mx-1.5`, so the space looks redundant and is
   not: it is the only BREAK OPPORTUNITY in the line. Without it "Wager$100.00Daily:" is one
   unbreakable word, so a column too narrow for it breaks at the last space it does have and the
   card reads "Log in &" / "Wager $100.00 Daily:" — which is a wrap in the wrong place, not a
   width bug, and it survived every attempt to fix it by moving the artwork or the padding.
   It matters here and nowhere else because the second card's line has no space to lose. */
export const EARN_METHODS = [
  { id: 'daily', art: 'ticket-daily', before: 'Log in & Wager ', amount: '$100.00', after: 'Daily:', reward: '+ 1 Ticket' },
  { id: 'wager', art: 'ticket-wager', before: 'Every wager', amount: '$1,000.00', after: ':', reward: '+ 1 Ticket' },
];

export const RULES = [
  {
    id: 'how-to-enter',
    title: 'How to Enter',
    body: [
      "'Daily login and wager $100' to earn 1 ticket and a maximum up to 7 tickets per week under this condition.",
      'For every $1000 USD you wager, you will receive one extra ticket. The number of tickets you will get increases with your wager amount.',
      'Every entry will correlate to an entry number.',
      'Your entry numbers can be found on the same page.',
      'Maximum tickets accumulated per user can be up to 100 tickets per week.',
    ],
  },
  {
    id: 'draw',
    title: 'Weekly Raffle Draw',
    /* One sentence, which is the panel's whole content — the other two draw-related strings in
       the bundle are the FAQ's, not this rule's. */
    body: [
      'Weekly raffle draws every Monday at 12:00:00 UTC; the winners will be announced on the same page.',
    ],
  },
  {
    id: 'terms',
    title: 'Terms and Conditions',
    body: [
      `You must have an account in ${HOST}.`,
      "The weekly raffle includes all types of wager in 'Casino' and 'Sports'.",
      `${HOST} reserves the right to hold void, suspend, cancel, or amend this promotion where it deems necessary to do so.`,
      'Entries will be declared void if the entrant is found engaging in fraud, misrepresentation, hacking, or exploitation.',
      `${HOST} reserves the right to perform additional KYC/AML checks as a condition of receiving the weekly raffle reward.`,
    ],
  },
  {
    id: 'prizes',
    title: 'Winning Prize Details',
    /* Rendered as the two-column table below rather than as sentences. */
    prizes: true,
  },
];

/* The ladder as the panel prints it, captured. 150 places over 13 rows: the top five are named
   individually, 6-10 each get their own row at the same $500 rather than being collapsed into a
   range, and the last three rows are ranges. `place` is the printed string — including the
   original's own spaced tilde — because the ranges are not derivable from a number. */
export const PRIZE_LADDER = [
  { place: 'No. 1', prize: 5000 },
  { place: 'No. 2', prize: 3500 },
  { place: 'No. 3', prize: 2000 },
  { place: 'No. 4', prize: 1500 },
  { place: 'No. 5', prize: 1000 },
  { place: 'No. 6', prize: 500 },
  { place: 'No. 7', prize: 500 },
  { place: 'No. 8', prize: 500 },
  { place: 'No. 9', prize: 500 },
  { place: 'No. 10', prize: 500 },
  { place: 'No. 11 ~ No. 20', prize: 100 },
  { place: 'No. 21 ~ No. 50', prize: 50 },
  { place: 'No. 51 ~ No. 150', prize: 20 },
];

export const FAQ = [
  {
    id: 'earn',
    title: "How to earn the 'ticket'? How many tickets can I collect?",
    body: [
      /* "wager $100 to in the same day" is the original's own wording, typo and all — the same
         kind of thing as `texxt-sm` in the markup. Do not tidy it. */
      'Log in daily and wager $100 to in the same day to earn 1 ticket and maximum 7 tickets per week.',
      'By every wager of $1,000, you will earn 1 extra ticket. The more wagers, the more tickets.',
      'Maximum number of tickets collected per user can be up to 100 tickets per week.',
      "Ticket refresh every 10 mins, please check in 'My Tickets' section.",
    ],
  },
  {
    id: 'announced',
    title: 'When the winner be announced?',
    body: [
      `Winners will be announced every Monday at 12:00:00 (UTC). The winner list will be available on this page. Raffle rewards will be credited to ${HOST} account within 48 hours. Rewards will be issued as real money in bonus currency.`,
    ],
  },
  {
    id: 'multiple',
    title: 'Can I win multiple rewards in a round of weekly raffle?',
    body: [
      'Unfortunately, no. One(1) user can win one(1) time per week. Collect more tickets to increase the winning chances.',
    ],
  },
  {
    id: 'old-ticket',
    title: "Can I join the next raffle with 'Old Ticket'?",
    body: [
      'Unfortunately, no. Users have to re-accumulate the new ticket(s) in order to join the new weekly raffle.',
    ],
  },
  {
    id: 'period',
    title: 'Can I know more about the time period?',
    /* The last two sentences are the ones an earlier pass had filed under the "Weekly Raffle
       Draw" RULE. They are this FAQ answer's, which is why that rule is a single sentence — the
       flat translation bundle gave no way to tell, and the opened panels did. */
    body: [
      "For 'Daily login and wager $100', users must complete the requirement between 00:00 UTC ~ 23:59 UTC in order to earn the ticket.",
      "For 'Every wager of $1,000 to earn extra tickets', there is no time limitation.",
      'The weekly raffle starts every Monday at 12:00:00 UTC to Sunday at 11:59:59 UTC. (All tickets accumulated in one week will not count in the next week.)',
      'The lucky winner list will be updated on the same page by every Monday at 12:00:00 UTC, and rewards will be distributed within 48 hours.',
    ],
  },
];

/* The headline prize, printed in the hero's gold gradient. Captured value. */
export const JACKPOT = 20000;

export default RULES;
