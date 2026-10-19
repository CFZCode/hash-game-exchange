/* The Referral page's copy, and the one payload behind it.
 *
 * EVERY STRING HERE IS THE ORIGINAL'S OWN. The page's chunk (`index-ve9CyRhD.js`) and its FAQ /
 * live-rewards / affiliate-program chunk (`Questions-dsRHzmFN.js`) were both pulled off the
 * deploy's second origin — see services/referral.js for the method — so these are verbatim
 * `t("…")` arguments and `<T i18nKey=…>` defaults, cross-checked against the saved translation
 * bundle `index-Dn9m_cUp.js`. Nothing on this page was read off a screenshot except the four
 * live-reward rows at the bottom of this file, which are the only part with no chunk to recover.
 *
 * PLACEHOLDERS ARE LEFT IN. The original interpolates at render time and so does the page:
 *
 *   __local_amount__ / __localAmountStr__  →  printCurrency(new Decimal(1000)), i.e. "$1,000.00".
 *                                            `printCurrency`'s currency argument DEFAULTS to
 *                                            "USDFIAT" (index-BsFv7ByC.js), so this figure is
 *                                            dollars regardless of the session's display
 *                                            currency — it is not the wallet's BTC.
 *   __email__                              →  `ee.email.business`. The runtime config in the
 *                                            saved bundle says `jonata@bcgame.com`, which is
 *                                            what the capture shows; the build-time default a
 *                                            few hundred bytes earlier is `business@bcgame.com`
 *                                            and is NOT what ships.
 *   __ENV_HOST__                           →  `ee.license.host.toUpperCase()` = "BC.GAME".
 *
 * That last one is the pair `/vip-detail` had to get right: `__ENV_HOST__` is the HOST
 * upper-cased, `__ENV_SITE__` is the short name "BC", and they are different strings. Only
 * `__ENV_HOST__` appears on this page, so every expansion below is "BC.GAME".
 *
 * TWO ORIGINAL TYPOS ARE PRESERVED, both verbatim in the translation bundle and both visible in
 * the capture: the DOUBLE SPACE in "There is  __local_amount__", and the missing full stop in
 * "…you bring to __ENV_HOST__ This USD reward…". Do not tidy either — they are what the live
 * page renders.
 */
import { brandName } from '../../services/siteBranding';

/* The one substitution the page performs. Kept next to the strings it fills rather than in the
   component, because which token maps to what is a property of this copy. */
/* Parker567's printed name (owner-panel branding), never the original's "BC.GAME". There is no
   business mailbox to print (the original's was bc.game's), so `__email__` reads as Live Support. */
export const HOST = brandName();
export const BUSINESS_EMAIL = '';

/* `new Decimal(1e3)` in both chunks, printed through `printCurrency` with its default
   "USDFIAT". The commission rate beside it is a literal `25%` in the markup, not a value. */
export const REFERRAL_AMOUNT = 1000;
export const COMMISSION_RATE = '25%';

export const HERO = {
  title: 'Invite Friends to Earn',
  /* The middle line is assembled from three nodes, not one string: the amount is inserted
     before the template's own " + 25% " text node and "Commission" is appended after it. */
  plus: ' + 25% ',
  commission: 'Commission',
  cta: { label: 'Sign up & Earn', href: '/login/regist' },
  terms: { label: 'Referral Terms & Conditions', href: '/referral-terms' },
};

/* The two reward cards. `title` is a `<T>` whose default carries inline markup — `<1>` is the
   brand-green span and `<2>` is a `<br>` — so it is modelled as segments rather than a string.
   Card one breaks after the amount; card two has no break and wraps on its own. */
export const CARDS = [
  {
    key: 'referral',
    art: 'referral',
    title: [
      { text: 'Get your ' },
      { text: '__localAmountStr__', brand: true },
      { br: true },
      { text: 'referral rewards' },
    ],
    desc: 'Every friend you invite, will get you __localAmountStr__, the more you invite, the more you will get!',
    cta: { label: 'View Details', href: '/referral-terms' },
    alt: 'referral rewards illustration',
  },
  {
    key: 'commission',
    art: 'commission',
    title: [
      { text: 'Get your ' },
      { text: '25%', brand: true },
      { text: ' commission rewards' },
    ],
    desc: 'You will receive commission rewards every time your friends place wager based on the games.',
    cta: { label: 'View Details', href: '/commission-rule' },
    alt: 'commission rewards illustration',
  },
];

/* The affiliate-program band. Its heading is a `<T>` whose default is
   "Learn more about our <2>affiliate program</2>" over the children
   `["Learn more about our", " ", <span class=text-brand>affiliate program</span>]` — so the wide
   gap in the capture is not a wide space, it is the heading's own `sm:flex gap-3` putting 12px
   between two anonymous flex items. */
export const PROGRAM = {
  lead: 'Learn more about our',
  accent: 'affiliate program',
  paragraphs: [
    'If you have a large audience and followers. We have special conditions for you to customize your referral program!',
    'If you can invite players and their wager amount reaches a billion dollars and above, you will get your own customized casino! You can set up a casino website with your domain and design style.',
  ],
  /* Lower-case "for", which is the original's — the Korean-locale arm of the same `Show` uses
     "For more details, please contact Us" with a capital F. This build only ever renders the
     fallback arm, since the language is fixed to en. */
  contact: 'for more details, please contact Us',
  send: 'Send Now',
};

export const FAQ_TITLE = 'Frequently Asked Questions';

/* Seven rows, each its own Collapsible. `answer` is a string, or segments where a segment is
   plain text, `{ plain: true }` for the bare `<span>` around __ENV_HOST__, or `{ action }` for
   the brand-green `ml-1 cursor-pointer` span the original wires to a click handler. */
export const FAQ = [
  {
    question: 'How does the referral system work?',
    answer:
      'When you share your referral link with any of your friends, family or advertise the link and a player signs up at our site that player becomes your referral and they will earn you commission & extra rewards by playing at __ENV_HOST__.',
  },
  {
    question: 'How much can I earn from my referral?',
    answer: 'You can earn 25% of their wager + __local_amount__ per referral.',
  },
  {
    question: 'What is USD reward and how does it work?',
    answer:
      'There is  __local_amount__ USD reward for each referral you bring to __ENV_HOST__ This USD reward is given in 10 parts when your referral level up from VIP4 til VIP 70.',
  },
  {
    question: 'I have big audience, how I can get special deals?',
    answer:
      'If you have a website with good traffic or a social media account with a large audience, please contact Live Support.',
  },
  {
    question: 'How many referral links can I create if I have different websites/accounts?',
    answer: 'You can create up to 20 unique codes for different source of traffic.',
  },
  {
    question: 'Can I see the data of my referral?',
    /* Note the segment before the link ends "in your" with NO trailing space. The gap is the
       link's own `ml-1`; adding a space here would double it. */
    answer: [
      { text: 'Yes, ' },
      { text: '__ENV_HOST__', plain: true },
      {
        text: ' believes in total transparency and offers all data to the users like username, total wager and commission earned, date of registration and referral link applied. You can see all of this information in your',
      },
      { text: 'Affiliate Dashboard.', action: 'dashboard' },
    ],
  },
  {
    question: 'Can I send tip or reward to my referrals?',
    answer: [
      { text: 'Yes, you can send your referrals tips in any supported coins.', plain: true },
      { text: 'Click here', action: '/referral/refer/code' },
    ],
  },
];

/* --------------------------------------------------------------------------- live rewards
 *
 * THE ONE PART OF THIS PAGE WITH NO CHUNK BEHIND IT. `Questions-dsRHzmFN.js` gave the markup and
 * `servers-O8_t7p5g.js` gave the path (`/agent/affiliate/history/`) and the field names, but no
 * `agent/` response was ever captured — there is no `bc.game/bc.game/api/agent/` directory — so
 * these four rows are read off the capture instead.
 *
 * ONLY THE SUM IS RECOVERABLE. The widget prints `commissionUsd + rewardUsd`, so the capture's
 * "$25,616,501.58" pins the total and says nothing about the split. The two fields are kept
 * because they are the response's real shape; the whole figure sits in the first one and the
 * second is zero. The printed headline is identical either way — do not read the split as data.
 *
 * `currencyName` decides the format, and the rows here exercise both branches of
 * `printCurrency`: a `*FIAT` target goes through `Intl.NumberFormat(style: "currency")`, which
 * is why IDR prints its code ("IDR 268") and INR prints its symbol ("₹1.26") off the same code
 * path; a crypto target prints a bare number with trailing zeros trimmed ("0.1", "12"). */

/* The four the capture holds, and the only rows on this page that are evidence. The window
   shows one row of four; the red mark under the Hindi name is part of that glyph, not a fifth
   entry. Do not add to this array — put anything invented in FILLER_ROWS below. */
const CAPTURED_ROWS = [
  { userName: 'KAYARAYA2026', amount: '268', currencyName: 'IDRFIAT' },
  { userName: 'Hskcqhmyqxcc', amount: '0.1', currencyName: 'USDT' },
  { userName: 'जय श्री अम्बे', amount: '1.26', currencyName: 'INRFIAT' },
  { userName: 'jioo7skq9u62', amount: '12', currencyName: 'USDT' },
];

/* INVENTED. NOT DATA. Requested so the ticker has enough rows to actually scroll — with only
 * the four above the grid is ~40px inside a 48px window, nothing is ever hidden, and the
 * overflow gate in index.jsx correctly holds the animation still.
 *
 * Kept in its own array rather than merged into CAPTURED_ROWS so that deleting it is one edit
 * and the evidence stays separable from the filler. This is the only invented payload in the
 * project — every other fixture is a captured response or recovered i18n — so it is worth
 * removing the moment `/agent/affiliate/history/` is connected, not left to rot.
 *
 * Shaped to look like the captured rows and nothing more: opaque handles rather than anything
 * resembling a real person, small amounts, and only currencies that have an icon in
 * `src/assets/coins/`. Sixteen of them puts the grid at five rows of four on a desktop
 * container, which is ~184px crawling past a 48px window over the animation's 30s. */
const FILLER_ROWS = [
  /* Nothing below 0.01 in a crypto row: the ticker prints at `precision: 2`, so a realistic
     0.00042 BTC would render as a bare "+0" — which is what the original does too, and looks
     like a bug either way. */
  { userName: 'mk7zqp2wvx', amount: '0.06', currencyName: 'BTC' },
  { userName: 'Th3QuietFox', amount: '5', currencyName: 'USDC' },
  { userName: 'p9vnc4xrta', amount: '128', currencyName: 'TRX' },
  { userName: 'zolaBearing', amount: '0.08', currencyName: 'ETH' },
  { userName: 'q2w8ehrkzm', amount: '340', currencyName: 'KESFIAT' },
  { userName: 'NovaDrift77', amount: '62.5', currencyName: 'DOGE' },
  { userName: 'bx4tlm9scv', amount: '1.8', currencyName: 'SOL' },
  { userName: 'kestrelNine', amount: '0.24', currencyName: 'BNB' },
  { userName: 'r6yhdn3qwp', amount: '2.05', currencyName: 'USDT' },
  { userName: 'amberCoil', amount: '96', currencyName: 'ADA' },
  { userName: 'v8kzxr0tme', amount: '410', currencyName: 'INRFIAT' },
  { userName: 'GlassHarbour', amount: '14.7', currencyName: 'MATIC' },
  { userName: 'w3jqpsn7bd', amount: '0.75', currencyName: 'TON' },
  { userName: 'lunarPitch', amount: '33', currencyName: 'XRP' },
  { userName: 'c5nmv2xtqz', amount: '0.31', currencyName: 'AVAX' },
  { userName: 'driftwoodEcho', amount: '820', currencyName: 'BCD' },
];

export const LIVE = {
  commissionUsd: '25616501.58',
  rewardUsd: '0',
  list: [...CAPTURED_ROWS, ...FILLER_ROWS],
  title: 'Live Rewards',
  totalLabel: 'Total Rewards Sent To-Date',
};

/* ------------------------------------------------------------------ the signed-in dashboard */

/* `m` in `servers-O8_t7p5g.js` — the module's OWN default dashboard object, verbatim.
 *
 * Same finding as the bonus page's `initialValue`, and the second time it has paid: the response
 * behind `/agent/affiliate/dashboard/` is auth-gated and `hash.game` answers every `/agent/`
 * route 6002, but the request module declares the value the store falls back to, and that value
 * is exactly what the capture renders — every figure $0.00 and no friends. So the whole
 * right-hand stat column and the Rewards Activities empty state are RECOVERED rather than
 * reconstructed.
 *
 * Six of the ten fields are unread by the dashboard tab (`commissionUsd`, `ratio`, `maxRatio`,
 * `remainingRewardUsd`, `todayCommissionUsd`, `todayWagerUsd`) and are kept because the module
 * declares them and the Rate & Rules tab will want them. */
export const DASHBOARD = {
  availableCommissionUsd: '0',
  availableRewardUsd: '0',
  commissionUsd: '0',
  /* Ours, not bc.game's: what was actually CLAIMED, for My Rewards' "Total Received" lines.
     `commissionUsd`/`rewardUsd` stay the earned totals (claimed + still available). */
  commissionReceivedUsd: '0',
  rewardReceivedUsd: '0',
  friendNumber: 0,
  ratio: '0',
  maxRatio: '0',
  remainingRewardUsd: '0',
  rewardUsd: '0',
  todayCommissionUsd: '0',
  todayWagerUsd: '0',
};

/* `topCommissions` drives the Rewards Activities list and `topRewards` is fetched beside it and
   read by nothing on this tab. Both empty is what the capture shows — the crocodile with
   "No info yet / Invite friends to join you now!". */
export const DASHBOARD_INFO = { dashboard: DASHBOARD, topCommissions: [], topRewards: [] };

/* The dashboard's own copy, verbatim i18n. `__friendAmount__` is filled with the same
   `printCurrency(1000)` the headline figure uses, which is why the sentence and the green figure
   above it always agree. */
export const INVITE = {
  title: 'Invite a Friend to Get',
  rewardsLabel: 'Referral Rewards',
  commissionLabel: 'Commission Rewards',
  commissionRate: '25%',
  description:
    'Get __friendAmount__ for each friend you invite, plus up to 25% commission on their wagers. Enjoy consistent commission, whether they win or lose, in our Casino and Sports. Start earning now!',
  linkLabel: 'Referral Link',
  codeLabel: 'Referral Code',
  copy: 'Copy',
  copied: 'Copied',
  share: 'Share via socials',
  terms: 'Referral Terms & Conditions',
};

export const DASHBOARD_COPY = {
  totalReward: 'Total Reward',
  totalFriends: 'Total Friends',
  referralRewards: 'Referral Rewards',
  commissionRewards: 'Commission Rewards',
  activities: 'Rewards Activities',
  emptyTitle: 'No info yet',
  emptyBody: 'Invite friends to join you now!',
};

/* `A` in index-CgFyS3aK.js is `["referral","my-rewards","refer","rules","banners"]` — the URL
   segment per tab — and the strip renders the first four. `path` is the chunk's own `p(r)`
   switch, which is why My Rewards and Referral Codes each carry a default sub-tab in the URL
   while Dashboard is the bare `/referral`.

   ONLY THE DASHBOARD PANE IS BUILT. The other three are separate features with their own chunks
   (`index-Deo68lWp.js` for My Rewards, `index-CC3wjKfm.js` for Referral Codes & Friends,
   `index-B5gBp3du.js` for Rate & Rules), each with its own auth-gated tables; they route, light
   their tab and render the site's empty state. Same arrangement as the wallet rail's nine rows
   and the quest registry's ten handlers.

   `paneClass` is the per-tab half of `P`'s `L(i.class, "mb-4 mt-4 flex-1 bg-transparent
   font-semibold")` — and it lands on the CONTENT PANEL, not on the tab button. Only My Rewards
   passes one, and it reaches inside that pane's own horizontal strip, which is not built; it is
   recorded because it is the chunk's and costs nothing. See the long note at the strip in
   Dashboard.jsx for why the other half of that call is easy to put in the wrong place. */
export const TABS = [
  { id: 'referral', label: 'Dashboard', path: '/referral' },
  {
    id: 'my-rewards',
    label: 'My Rewards',
    path: '/referral/my-rewards/commission',
    paneClass: '[&_.scroll-x>button]:flex-none [&_.scroll-x]:w-auto',
  },
  { id: 'refer', label: 'Referral Codes & Friends', path: '/referral/refer/code' },
  { id: 'rules', label: 'Rate & Rules', path: '/referral/rules' },
];

/* ----------------------------------------------------------------------- the My Rewards tab */

/* `C` in index-Deo68lWp.js is `["friends","commission","referral"]` — the URL segment per inner
   tab, in the order the three `TabItem`s are declared, and `_()` is simply `C.indexOf(<last path
   segment>)`.

   THE SEGMENT NAMES DO NOT MATCH THE LABELS and it is a real trap: `commission` is Commission by
   CURRENCY while `friends` is Commission by FRIENDS, and `referral` is Level Up Rewards, which
   contains neither word. Reading the path is not enough to know which pane is open. `TABS`'s
   default sub-tab above is `commission`, which is the pane the capture has open. */
export const MY_REWARDS_TABS = [
  { id: 'friends', label: 'Commission by Friends' },
  { id: 'commission', label: 'Commission by Currency' },
  { id: 'referral', label: 'Level Up Rewards' },
];

/* `ve` — the two ⓘ popups on the summary card, and both bodies are RECOVERED VERBATIM rather
   than transcribed. Each is one i18n value with the headings and paragraphs as numbered slots
   (`bonus.affiliate.rewardtip1` and `rewardtip2` in `index-Dn9m_cUp.js`, which is in the mirror),
   and the chunk hands `<Trans>` the six templates in the order the slots fall — so the array
   order below IS the display order and nothing about the pairing is inferred.

   Note the second popup reuses the FIRST one's "The rewards you can withdraw to your wallet."
   under a different heading; that repetition is the bundle's own. */
export const REWARD_TIPS = {
  commission: {
    title: 'Commission Rewards',
    rows: [
      { heading: 'Available Commission Rewards' },
      { body: 'The rewards you can withdraw to your wallet.' },
      { heading: 'Total received' },
      {
        body:
          'The rewards you have received up to now. It includes the rewards already withdrawn ' +
          'and the available commission rewards.',
      },
    ],
  },
  referral: {
    title: 'Referral Rewards',
    rows: [
      { heading: 'Available Referral Rewards' },
      { body: 'The rewards you can withdraw to your wallet.' },
      { heading: 'Total received' },
      { body: 'All unlocked rewards received so far, including withdrawn and available for withdrawal.' },
      { heading: 'Locked Rewards' },
      {
        body:
          "The rewards that you will receive in the future when your friends' VIP level " +
          'increases.',
      },
    ],
  },
};

/* ---------------------------------------------------------------------- the Rate & Rules tab */

/* `s` in index-B5gBp3du.js — the Unlock Amount table, and it is a HARDCODED ARRAY in the chunk
   rather than a feed. Ten rows, and the level numbers are not contiguous: 1, 2, 4, 5, 7, 8, 9,
   10, 12, 14.

   ONLY THE NUMBER IS HERE. The chunk stores a bare `Level` and looks the printed name and the
   icon's colour up through the VIP ladder (`u1` is `vipLevelRow(n).tier` plus
   `tierColor(tier.base)`), which `src/data/vipConfig.js` already carries as the captured
   `/game/support/vip-v2/config/` response — so "Bronze I … Platinum II" is derived rather than
   copied, and cannot drift from the Bonus page's level card. `wager` keeps the chunk's own
   formatting, including the un-grouped "1000,000" on the ninth row. */
export const LEVEL_UNLOCKS = [
  { level: 1, wager: '1,000', amount: '+0.50' },
  { level: 2, wager: '3,000', amount: '+2.50' },
  { level: 4, wager: '15,000', amount: '+5.00' },
  { level: 5, wager: '30,000', amount: '+12.00' },
  { level: 7, wager: '120,000', amount: '+25.00' },
  { level: 8, wager: '240,000', amount: '+50.00' },
  { level: 9, wager: '500,000', amount: '+80.00' },
  { level: 10, wager: '1000,000', amount: '+120.00' },
  { level: 12, wager: '3,500,000', amount: '+205.00' },
  { level: 14, wager: '8,500,000', amount: '+500.00' },
];

/* `c` — the calculator's Game dropdown. FOUR OPTIONS AND ONLY THREE RATES: 3rd Party Slots and
   Live Casino are separate entries both at 0.6, which is also how the rate boxes above group them
   ("3rd Party Slots, Live Casino" under one 60% box). The percentage is printed in the label as
   well as applied, both out of the chunk. `key`/`name` let `toCommissionRates` rebuild the label
   from the site admin's `gameRates` (keys as on `site-config/public`). */
export const GAME_RATES = [
  { key: 'originals', name: 'Original Games', label: 'Original Games (28%)', pct: 28, rate: 0.28 },
  { key: 'live', name: 'Live Casino', label: 'Live Casino (60%)', pct: 60, rate: 0.6 },
  { key: 'slots', name: '3rd Party Slots', label: '3rd Party Slots (60%)', pct: 60, rate: 0.6 },
  { key: 'sports', name: 'Sport Games', label: 'Sport Games (100%)', pct: 100, rate: 1 },
];

/* `me` — the four rule paragraphs, verbatim `t("…")`. `__ENV_HOST__` expands to "BC.GAME"
   through `fill`, the same substitution the Buy Crypto disclaimer makes. */
export const RULES = [
  'In any public environment (eg, universities, schools, libraries, and office spaces), only one commission can be paid to each user, IP address, electronic device, home, phone number, billing method, email address, and computer and IP address shared with others.',
  'Our decision to draw a bet will be based entirely on our discretion after a deposit is made and a bet is successfully placed.',
  'We support the majority of currencies on the market. Commissions can be withdrawn into our internal __ENV_HOST__ wallet at anytime. (View your commission extraction in the dashboard and view the balance in the wallet).',
  'The system calculates the commission every 24 hours.',
];

/* `bonus.affiliate.step1/2/3` out of `index-Dn9m_cUp.js`, recovered rather than transcribed.
   Each is `<0>lead</0><1>tail</1><2></2><3>body</3>`, where slot 2 is the `<br>` that breaks the
   heading from its body — so the two-span split and which half is green are the bundle's, not a
   reading of the screenshot. Step 1 greens the LEAD ("Share") and steps 2 and 3 the TAIL
   ("$1000", "Receive"), which is the asymmetry a transcription would most likely miss. */
export const HOW_TO_STEPS = [
  {
    lead: 'Share',
    leadBrand: true,
    tail: 'to friends',
    body: 'Share your referral link or code to your friends',
  },
  {
    lead: 'Get',
    tail: '$1000',
    /* `REFERRAL_AMOUNT` in USD: RateRules prints it in the selected currency instead of `tail`. */
    tailAmountUsd: REFERRAL_AMOUNT,
    tailBrand: true,
    body: 'Your awards will be locked for now',
  },
  {
    lead: 'Level Up &',
    tail: 'Receive',
    tailBrand: true,
    body: "Your friend's VIP level will unlock your awards (see rules below)",
  },
];
