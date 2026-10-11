/* The promotions list.
 *
 * Transcribed from the live page's rendered markup, so every string, every end date and every
 * progress percentage below is exact — the bars really are 12%, 31%, 52%, 10%, 83%, 10%, 66%,
 * 43%, 20%, 20%, 20%.
 *
 * ELEVEN PROMOTIONS, NINE PER PAGE. That is the page's own pagination — its readout says
 * "01 of 02" and page two holds the last two — so `PAGE_SIZE` is 9 rather than a round number
 * someone picked.
 *
 * `image` is the basename of the artwork on bc.game's CDN (`imgxcut.com/bc_event/<hash>.png`).
 * All eleven are downloaded and live in `src/assets/promotions/` under those same hashes, so
 * this field doubles as the local filename and needs no lookup table. Nothing under
 * `bc_event/` is in the saved mirror — these came from the live CDN.
 *
 * `categories` IS CAPTURED, not inferred. All four tabs were rendered and read, and between
 * them they account for only four of the eleven promotions:
 *
 *   Casino        100x Multiplier Challenge, Free Spins Giveaway
 *   BC Exclusive  Knockoin
 *   Deposit       August Madness Draw
 *
 * The other seven appear under All and nowhere else — that is the page's own behaviour, not a
 * gap in the capture. So an empty `categories` here means "captured as belonging to no filter
 * tab", which is why it is not a guess even though it looks like one.
 *
 * The `tag` on the 100x Multiplier Challenge card reads "Slots". That is a badge printed on the
 * card, unrelated to which tab it files under — it happens to be a Casino promotion, but the
 * two are separate fields.
 */

export const TABS = [
  { id: 'all', label: 'All' },
  { id: 'casino', label: 'Casino' },
  { id: 'exclusive', label: 'BC Exclusive' },
  { id: 'deposit', label: 'Deposit' },
];

/* THE PHONE GETS THREE TABS, AND IT IS THE FEED THAT DIFFERS RATHER THAN THE UI.
 *
 * The tab strip is built from the response's own `categoryList` (`index-CMExrEqM.js`, the page
 * chunk, recovered off `hash.game/assets/` — see icons.jsx for how it was found), and the request
 * that fetches it carries the device in the body:
 *
 *   post("/home/main/event-pageList/", { areaCode, env: isAPP ? "APP" : mobile ? "H5" : "WEB",
 *                                        level, vip, lang, archived, page, pageSize })
 *
 * So `env` is a REQUEST parameter and the categories come back per device. `TABS` above is the
 * WEB answer, captured from the rendered desktop page; this is the H5 one, read off a capture of
 * the live phone page, which shows All / Casino / Deposit and no BC Exclusive.
 *
 * Written as a filter of `TABS` rather than a second literal so the two cannot drift in label or
 * order — the H5 list is the WEB list minus one entry in the capture, not a different ordering.
 * `/api/home/main/event-pageList/` answers 403 on `hash.game` for both `env` values (probed, both
 * ways), so the capture is the only evidence there is and no fourth tab can be checked for.
 */
export const TABS_H5 = TABS.filter((t) => t.id !== 'exclusive');

export const PAGE_SIZE = 9;

export const PROMOTIONS = [
  {
    id: 'august-madness-draw',
    headline: '$6,000 POOL',
    title: 'August Madness Draw',
    description: 'Deposit $50 daily for a chance to win from a $6,000 pool!',
    image: '6fbbcc02d7',
    endsLabel: 'Aug 21',
    progress: 12,
    categories: ['deposit'],
  },
  {
    id: 'weekly-croco-leaderboard',
    headline: 'RP. 25.1M PRIZE POOL',
    title: 'Weekly Croco Leaderboard',
    description: 'Total Monthly prize pool more than Rp. 100M',
    image: '7f54f7a09a',
    endsLabel: 'Aug 30',
    progress: 31,
    categories: [],
  },
  {
    id: '100x-multiplier-challenge',
    tag: 'Slots',
    headline: 'SHARE $11,900',
    title: '100x Multiplier Challenge',
    /* The full-width exclamation is the original's own — the string mixes a CJK "！" with an
       ASCII "!" and both are kept rather than normalised. */
    description: 'Hit the 100 multipliers to get FREE SPINS & CASH DROP！!',
    image: '52531fd3b3',
    endsLabel: 'Aug 18',
    progress: 52,
    categories: ['casino'],
  },
  {
    id: 'weekly-raffle',
    headline: '$5,000 PRIZE',
    title: 'Weekly Raffle',
    description: 'Join and get up to $5,000 weekly',
    image: 'd3b95bcea3',
    endsLabel: 'Jan 02',
    progress: 10,
    categories: [],
  },
  {
    id: 'soccer-party-bet-and-win',
    headline: '$18,000 PRIZE',
    title: 'Soccer Party Bet & Win',
    description: 'Bet $30, win up to $500 Soccer Freebet',
    image: 'cadb5d7ce6',
    endsLabel: 'Aug 16',
    progress: 83,
    categories: [],
  },
  {
    id: 'daily-contest',
    headline: '$50,000 POOL',
    title: 'Daily Contest',
    description: 'Race for $50,000 Prize Pool daily',
    image: '87c478999c',
    endsLabel: 'Jan 02',
    progress: 10,
    categories: [],
  },
  {
    id: 'free-spins-giveaway',
    headline: '20 FREE SPINS',
    title: 'Free Spins Giveaway',
    /* Two spaces after "Bet" in the original. Kept — it is what the page renders. */
    description: 'Bet  €10 every day and get 20 Free Spins daily!',
    image: 'e8e1f766e7',
    endsLabel: 'Aug 13',
    progress: 66,
    categories: ['casino'],
  },
  {
    id: 'knockoin',
    headline: '120 FREE SPINS',
    title: 'Knockoin',
    description: 'Complete daily tasks for 7 days & win up to 120 FREE SPINS',
    image: '46a61beedc',
    endsLabel: 'Aug 17',
    progress: 43,
    categories: ['exclusive'],
  },
  {
    id: 'provably-fair',
    headline: '100% VERIFIABLE',
    title: 'Provably fair',
    description: 'Verify every outcome yourself with our provably fair algorithm',
    image: 'a124bb9b5d',
    endsLabel: 'Jan 02',
    progress: 20,
    categories: [],
  },

  /* ------------------------------------------------------------------------------- page two */
  {
    id: 'certified-security',
    headline: '100% PROTECTED',
    title: 'CERTIFIED SECURITY',
    description: 'ISO 27001 & SOC 2 certified, with 24/7 fraud monitoring',
    image: 'a9c0c18d86',
    endsLabel: 'Jan 02',
    progress: 20,
    categories: [],
  },
  {
    id: 'bc-engine',
    headline: 'STAKE & EARN',
    title: 'BC ENGINE',
    description: 'Stake $BC and earn rewards across the whole ecosystem',
    image: '00c0b22a90',
    endsLabel: 'Jan 02',
    progress: 20,
    categories: [],
  },
];

export default PROMOTIONS;
