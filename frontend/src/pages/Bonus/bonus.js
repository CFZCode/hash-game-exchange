/* The Bonus page's data — `/bonus`, `bonus-v5-page-dF3gugl8.js` and `index-CUb2-xA-.js`, both
 * off `hash.game/assets/`.
 *
 * THE FIXTURE IS NOT INVENTED AND IT IS NOT A CAPTURE EITHER — IT IS THE SERVICE'S OWN DEFAULT,
 * and that is the finding worth carrying forward from this page. `rewards-service-CxFWsPYn.js`
 * (which IS in the mirror) wraps `POST /activity/bonus/v2/` in a resource whose `initialValue`
 * is the value a LOGGED-OUT visitor gets:
 *
 *   { unclaimedCount: 0, rewards: { instant_bc, rakeback, month_bonus, weekly_bonus,
 *                                   level_up_bonus, daily_bet_back_bonus } }
 *
 * — six reward types, each holding one empty entry built by the same factory. That is exactly
 * the six rows the capture shows, in the two sections the capture shows, with the same
 * `unclaimedCount: 0` behind its greyed-out Claim All. The account in the capture is a fresh one
 * with nothing earned, so the real response and the logged-out default happen to render
 * identically. So the shape below is recovered rather than reconstructed, and the endpoint being
 * unreachable costs nothing here.
 *
 * ONE FIELD IS THIS BUILD'S: `extra.nextClaimTime` on the three recurring rows. The default
 * factory carries `extra: { end: true }` and no timestamp, which would send those rows down the
 * "amount" arm instead of the "In Progress" arm the capture shows — so the live response plainly
 * did carry one. Its VALUE is not recoverable, because "In Progress" wins the switch before the
 * countdown arm ever runs and nothing prints it. Rather than pin an invented instant, it is
 * DERIVED from each bonus's own stated rule — the same "computed, not pinned" treatment
 * /deposit-offer's month reset and /promotions/weekly-raffle's draw clock get, and here the rules
 * are written on the cards themselves: "Drops the next day UTC", "Drops every Friday UTC",
 * "Drops every 15th UTC".
 */

import { RewardType } from './rewardTypes';

/* `f2` in index-CUb2-xA-.js — the sections, in their own order, each pulling its members out of
   the registry below by `tabCategory`.
 *
 * `layout` DECIDES WHICH OF THE TWO LIST SHAPES A SECTION TAKES, and for Recurring it is a
 * device test rather than a constant — the chunk writes it as a getter, which is the tell:
 *
 *   { sectionName: i("Recurring"), tabCategory: "recurring",
 *     get layout() { return we.mobile ? "row" : "grid" }, ... }
 *
 * `row` is the `row-group`: every row full-bordered, square-cornered, pulled up 1px into its
 * neighbour so adjacent borders overlap into one hairline, with only the outer corners rounded —
 * i.e. the four rows read as ONE box. `grid` is the `card-group`, each row separately bordered
 * and rounded, two columns from `@lg`. So Recurring is a connected list on a phone and a grid of
 * cards on a desktop, and rendering the desktop shape at phone width is what left the Recurring
 * rows visibly detached from each other. Realtime is `row` at every width.
 *
 * Expressed as a function of the same flag the page's own arm is chosen by, so the two cannot
 * disagree; `groupRewards` resolves it. */
export const SECTIONS = [
  { id: 'vip', sectionName: 'VIP Rewards', tabCategory: 'vip', layout: 'row' },
  { id: 'realtime', sectionName: 'Realtime', tabCategory: 'realtime', layout: 'row' },
  {
    id: 'recurring',
    sectionName: 'Recurring',
    tabCategory: 'recurring',
    layout: (mobile) => (mobile ? 'row' : 'grid'),
  },
];

/* `Dn` — the reward-type registry, verbatim titles and descriptions. `icon` is resolved at the
   call site rather than stored here, because a data module cannot hold JSX.
 *
 * `preferConfigTitle` on the level-up family is the original's own: every other row prefers the
 * server's `rewardTypeName` over the registry title when it has one, and that family does not.
 *
 * `formula` marks the rows that carry a ƒ(x) chip. Each opens a different popup and none of
 * those popups is built, so the flag only decides whether the chip is drawn.
 *
 * `mergeGroup` collapses several entries of the same reward type into one row — the level-up
 * family folds its three types together, and the VIP types group by their item signature. Only
 * the level-up one can fire with this fixture. */
export const REWARD_TYPES = {
  [RewardType.WELCOME_SHIELD]: {
    title: 'Welcome Shield',
    description: 'The party starts now.',
    icon: 'welcomeShield',
  },
  [RewardType.INSTANT_BONUS]: {
    title: 'Instant Rakeback',
    description: 'Every bet pays you back.',
    icon: 'instant',
    formula: true,
    tabCategory: 'realtime',
  },
  [RewardType.INSTANT_BC]: {
    title: 'Instant $BC',
    description: 'Play, earn $BC, collect earnings.',
    icon: 'instant',
    formula: true,
    moneyResultVariant: 'staking',
    tabCategory: 'realtime',
  },
  [RewardType.BC_ENGINE_GRANT]: {
    title: 'Bonus',
    description: 'Ready to claim',
    icon: 'instant',
    moneyResultVariant: 'staking',
    tabCategory: 'realtime',
  },
  [RewardType.DEPOSIT_RAKEBACK]: {
    title: 'Deposit Rakeback',
    description: 'Deposit more, play more, earn more.',
    icon: 'depositRakeback',
    formula: true,
    tabCategory: 'realtime',
  },
  [RewardType.LEVEL_UP]: levelUp(),
  [RewardType.VIP_GIVE_LEVEL_UP]: levelUp(),
  [RewardType.EARLY_LEVEL_UP]: levelUp(),
  [RewardType.DAILY]: {
    title: 'Daily Bonus',
    description: 'Drops the next day UTC.',
    icon: 'D',
    formula: true,
    tabCategory: 'recurring',
  },
  [RewardType.DAILY_US_SITE]: {
    title: 'Daily Bonus',
    description: 'Drops the next day UTC.',
    icon: 'D',
    formula: true,
    tabCategory: 'recurring',
  },
  [RewardType.WEEKLY]: {
    title: 'Weekly Bonus',
    description: 'Drops every Friday UTC.',
    icon: 'W',
    formula: true,
    tabCategory: 'recurring',
  },
  [RewardType.MONTHLY]: {
    title: 'Monthly Bonus',
    description: 'Drops every 15th UTC.',
    icon: 'M',
    formula: true,
    tabCategory: 'recurring',
  },
  [RewardType.WELCOME_BONUS]: {
    title: 'Welcome Bonus',
    description: 'The party starts now.',
    icon: 'welcomeShield',
    formula: true,
    tabCategory: 'vip',
  },
  [RewardType.LOSSBACK]: {
    title: 'Lossback',
    description: "Mojo's back. Now go win big.",
    icon: 'lossback',
    tabCategory: 'vip',
    mergeGroup: true,
  },
  [RewardType.WEEKLY_FREE_SPIN]: {
    title: 'Free Spins',
    description: 'Spinnn. Big win awaits.',
    icon: 'freeSpin',
    tabCategory: 'vip',
    mergeGroup: true,
  },
  [RewardType.RELOAD]: {
    title: 'Reload',
    description: 'Vibes kicking in, daily!',
    icon: 'reload',
    formula: true,
    tabCategory: 'vip',
  },
  [RewardType.TOP_PLAYER]: {
    title: 'Top Player Bonus',
    description: 'Exclusive for the chosen few.',
    icon: 'topPlayer',
    tabCategory: 'vip',
    mergeGroup: true,
  },
  [RewardType.GAMEPLAY_BONUS]: {
    title: 'Gameplay Bonus',
    description: 'Juices coming.',
    icon: 'gameplay',
    tabCategory: 'vip',
    mergeGroup: true,
  },
  [RewardType.RAFFLE_BONUS]: {
    title: 'Raffle Bonus',
    description: 'Lucky you!',
    icon: 'gameplay',
  },
};

/* `gr` — one object shared by all three level-up types, which is why they collapse to a single
   row. Its description is a FUNCTION of `canClaim`, the only one in the registry that is. */
function levelUp() {
  return {
    title: 'Level Up Bonus',
    preferConfigTitle: true,
    description: ({ canClaim }) =>
      canClaim ? 'Your level-up bonus is ready.' : 'Available upon reaching the next level.',
    icon: 'levelUp',
    tabCategory: 'recurring',
    mergeGroup: true,
  };
}

/* `Ao` / `g2` — the four types whose right-hand column reads "In Progress" rather than a figure
   while a next-claim time is pending. */
const RECURRING = new Set([
  RewardType.MONTHLY,
  RewardType.WEEKLY,
  RewardType.DAILY,
  RewardType.DAILY_US_SITE,
]);

export const isRecurringReward = (type) => RECURRING.has(type);

/* `dt` in redeem-M5TwYr_j.js — which types carry a countdown, where its instant comes from, and
   what colour it prints in. Only the timestamp lookup and the colour matter with this fixture;
   the countdown itself is unreachable, because a recurring type takes the "In Progress" arm of
   the same switch first. */
export const COUNTDOWN = {
  [RewardType.MONTHLY]: { units: 2, className: 'text-secondary-light' },
  [RewardType.WEEKLY]: { units: 2, className: 'text-warning_brighter' },
  [RewardType.DAILY]: { units: 2, className: 'text-brand' },
  [RewardType.DAILY_US_SITE]: { units: 2, className: 'text-brand' },
  [RewardType.RELOAD]: { units: 3, className: 'text-brand' },
  [RewardType.WELCOME_BONUS]: { units: 3, className: 'text-brand' },
};

/* The three drop rules, stated on the cards themselves and derived here rather than pinned.
   All UTC, as the copy says. */
function nextDailyUtc(now) {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

function nextFridayUtc(now) {
  const d = new Date(now);
  /* 5 is Friday. `|| 7` is what keeps a Friday from resolving to itself at zero days out. */
  const ahead = (5 - d.getUTCDay() + 7) % 7 || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ahead);
}

function nextFifteenthUtc(now) {
  const d = new Date(now);
  const month = d.getUTCDate() < 15 ? d.getUTCMonth() : d.getUTCMonth() + 1;
  return Date.UTC(d.getUTCFullYear(), month, 15);
}

/* `d(type)` in rewards-service-CxFWsPYn.js — the empty entry every key of the default payload
   holds. Reproduced field for field so a real response drops straight in. */
const emptyEntry = (rewardType, extra = { end: true }) => ({
  canClaim: false,
  rewardId: '',
  userId: '',
  rewardType,
  rewardTypeName: '',
  relatedId: 0,
  createTime: 0,
  updateTime: 0,
  extra,
  items: [],
});

/* `y` — the payload itself. Built as a function rather than a constant because the three
   recurring rows carry a derived timestamp; see the header note. */
export function buildRewards(now = Date.now()) {
  return {
    unclaimedCount: 0,
    rewards: {
      [RewardType.INSTANT_BC]: [emptyEntry(RewardType.INSTANT_BC)],
      [RewardType.DEPOSIT_RAKEBACK]: [emptyEntry(RewardType.DEPOSIT_RAKEBACK)],
      [RewardType.MONTHLY]: [
        emptyEntry(RewardType.MONTHLY, { end: true, nextClaimTime: nextFifteenthUtc(now) }),
      ],
      [RewardType.WEEKLY]: [
        emptyEntry(RewardType.WEEKLY, { end: true, nextClaimTime: nextFridayUtc(now) }),
      ],
      [RewardType.LEVEL_UP]: [emptyEntry(RewardType.LEVEL_UP)],
      [RewardType.DAILY]: [
        emptyEntry(RewardType.DAILY, { end: true, nextClaimTime: nextDailyUtc(now) }),
      ],
    },
  };
}

/* The store's own grouping (`Q2`'s inner memo): for each section, gather every entry whose type
   belongs to it, then fold the ones the registry says to merge into a single row carrying the
   rest as extras. A section with nothing in it does not render — which is why VIP Rewards is
   absent from the capture and from this build. */
export function groupRewards(payload, { mobile = false } = {}) {
  const rewards = payload?.rewards ?? {};

  return SECTIONS.map((section) => {
    const types = Object.keys(REWARD_TYPES).filter(
      (t) => REWARD_TYPES[t].tabCategory === section.tabCategory
    );
    const entries = types.flatMap((t) => rewards[t] ?? []);

    const rows = [];
    const merged = new Map();
    for (const entry of entries) {
      const config = REWARD_TYPES[entry.rewardType];
      /* The original keys the merge on the entry's ITEM SIGNATURE (`rewardItemType:currency`
         pairs, deduplicated and sorted) for the VIP types, and on the constant "level-up" for
         the level-up family. Only the second can fire here — every entry in this fixture has an
         empty `items`, so a signature key would collapse unrelated VIP rows into one. */
      const key = config?.mergeGroup
        ? mergeKey(entry, config)
        : undefined;
      if (key === undefined) {
        rows.push({ primary: entry, extras: [] });
        continue;
      }
      const existing = merged.get(key);
      if (existing) existing.extras.push(entry);
      else {
        const row = { primary: entry, extras: [] };
        merged.set(key, row);
        rows.push(row);
      }
    }

    /* The getter resolved. A string section is a constant on the original too; only Recurring
       carries the device test, and only it is written as a function above. */
    const layout = typeof section.layout === 'function' ? section.layout(mobile) : section.layout;

    return { ...section, layout, rows };
  }).filter((section) => section.rows.length > 0);
}

/* `Vt` — the item signature, and the level-up family's constant key. */
function mergeKey(entry, config) {
  if (config.title === 'Level Up Bonus') return 'level-up';
  const signature = [
    ...new Set((entry.items ?? []).map((i) => `${i.rewardItemType}:${i.currencyName}`)),
  ]
    .sort()
    .join('+');
  return `${entry.rewardType}-${signature}`;
}
