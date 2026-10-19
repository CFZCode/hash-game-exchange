/* The Quest Hub's data — `/quests`, `index-TGm-4VyO.js` off `hash.game/assets/`.
 *
 * THE CHUNK IS REAL AND THE PAYLOAD IS NOT, and the split between those two is the thing to
 * hold on to before changing anything here. The page's markup, its class lists, its copy, its
 * group headings and its quest titles are all verbatim out of the recovered chunk. The three
 * responses behind it are login-gated: `hash.game` answers `/activity/quest/list/`,
 * `/activity/quest/completed/list/` and `/activity/quest/expired/list/` with 403 to a logged-out
 * request — checked, not assumed — so unlike `usdPrice` or `currencyTokens` there was no way to
 * fetch the real thing. What is below is the SHAPE from `quest-service-Cob0DDxX.js` (which IS in
 * the mirror) filled with what the capture renders and nothing more.
 *
 * The list response is an object keyed by quest kind, one key per handler:
 *
 *   { mxLuckyScratchBonus, instantCashback, appLoginBonus, instantDepositTask, instantWagerTask,
 *     cWalletConnectionBonus, cWalletWithdrawBonus, attendanceBonus, welcomeCashback,
 *     newcomerQuest, verification }
 *
 * — that object is `p`, the service's own `initialValue`, so the eleven names and the fact that
 * an absent quest is `undefined` rather than an empty array are the original's. Each present
 * value is `{ first, second }`: `first` is the quest's own payload and `second` is the group tag
 * the heading is looked up from.
 */

/* `Ta` in the chunk — the group tag → heading map, verbatim, thirteen tags into six headings.
   `Ea` is the lookup: trim, lowercase, and fall through to the tag itself if it is not in the
   table, which is why an unrecognised tag prints rather than disappearing. */
export const GROUP_LABELS = {
  special: 'DEPOSIT & WAGER',
  deposit: 'DEPOSIT & WAGER',
  wager: 'DEPOSIT & WAGER',
  wallet: 'GETTING STARTED',
  verify: 'GETTING STARTED',
  verification: 'GETTING STARTED',
  welcomecashback: 'GETTING STARTED',
  apploginbonus: 'GETTING STARTED',
  attendance: 'GETTING STARTED',
  social: 'COMMUNITY',
  newcomerquest: 'NEWCOMER QUEST',
  dailyquest: 'DAILY QUESTS',
  weeklyquest: 'WEEKLY QUESTS',
};

/* `ir` in the chunk — `YYYY-MM-DD HH:mm` in LOCAL time, hand-rolled rather than through Intl, so
   it does not follow the display language. Reproduced as written. It lives here rather than in
   QuestCard.jsx because `react-refresh/only-export-components` forbids a module that exports a
   component from exporting anything else — the same reason `useSession` is not in
   SessionContext.jsx. */
export function formatQuestTime(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const groupLabel = (tag) => {
  const t = typeof tag === 'string' ? tag.trim() : '';
  if (!t) return '';
  return GROUP_LABELS[t.toLowerCase()] ?? t;
};

/* `B` in the chunk — every quest's title and one-line description, all verbatim `t("…")`. Not
   all eleven are reachable today (see QUEST_HANDLERS below); the map is transcribed whole
   because it costs nothing and the next handler built will want its row. */
export const QUEST_COPY = {
  specialCashback: { title: 'Exclusive Cashback', subtitle: 'Wager to unlock in real time.' },
  appExclusiveCashback: {
    title: 'APP Exclusive Cashback',
    subtitle: 'Wager to unlock in real time',
  },
  playEarnCash: { title: 'Play & Earn Cash', subtitle: 'Earn cash reward when wager target is met' },
  playEarnFreebet: {
    title: 'Play & Earn Freebet',
    subtitle: 'Earn freebet when wager target is met.',
  },
  depositEarnCash: {
    title: 'Deposit & Earn Cash',
    subtitle: 'Earn cash reward when deposit target is met',
  },
  depositEarnFreebet: {
    title: 'Deposit & Earn Freebet',
    subtitle: 'Earn freebet when deposit target is met',
  },
  connectCwallet: { title: 'Connect Cwallet', subtitle: 'Instant Payment. Zero Fee. VIP Card.' },
  cwalletWithdrawal: {
    title: 'Cwallet Withdrawal',
    subtitle: 'Earn reward on every Cwallet withdrawal.',
  },
  inviteScratch: { title: 'Invite & Scratch', subtitle: 'Invite friends to unlock cash reward' },
  depositCheckIn: { title: 'Deposit & Check-In', subtitle: 'Deposit and claim daily rewards' },
  welcomeCashback: { title: 'Welcome Cashback', subtitle: 'Wager to unlock in real time' },
};

/* `Ke` in the chunk — the handler registry, IN ITS OWN ORDER, which is what decides the order
   the group headings come out in: the store walks this array, buckets each quest under its
   heading, and the map's insertion order is the render order. Keep the array even for the nine
   handlers that are not built, because deleting one would silently reorder the page the day it
   IS built. */
export const QUEST_HANDLERS = [
  /* This platform's own (live only): today's wager / bet targets, see `extract`. */
  'dailyQuest',
  'instantCashback',
  'appLoginBonus',
  'instantWagerTask',
  'instantDepositTask',
  'attendanceBonus',
  'cWalletConnectionBonus',
  'cWalletWithdrawBonus',
  'mxLuckyScratchBonus',
  'welcomeCashback',
  'verification',
];

/* ONE HANDLER IS BUILT: `cWalletConnectionBonus` (`Hi`/`zi`/`ji` in the chunk), because it is
 * the only quest the capture shows. The other nine each have a renderer of their own with its
 * own progress bar, countdown, claim flow and ƒ(x) popup, and building them would mean
 * inventing nine payloads — this file would stop being a record of what the page returned and
 * start being fiction. Their chunk symbols are listed above so the next pass is mechanical.
 *
 * `newcomerQuest` is not in the registry at all: it drives the Lucky Rookie Quest banner above
 * the tabs (`oc` → `sc`), which is gated on `isVisible()` and is absent from the capture.
 */

/* `/activity/quest/list/`. One entry, matching the capture exactly.
 *
 * `second: 'wallet'` is the ONE INFERRED VALUE here. The capture puts this quest under GETTING
 * STARTED, and of the six tags that map to that heading `wallet` is the only one that names a
 * wallet-connection quest — but the tag itself is server-side and was never seen. Any of
 * `verify` / `verification` / `attendance` would render identically.
 *
 * Everything else is read off the render through the chunk's own logic. `bound: false` with no
 * `boundAmount` is what `ji` needs to label the button "Connect" rather than "Claim", and it is
 * also why NO reward figure appears on the card: `rewardAmount` is `boundAmount ? printCurrency
 * (…) : undefined`, and the lock glyph beside it (`rewardPrefix`) only renders inside that same
 * `Show`. An empty `rewards` array is what makes `isClaim` false. The extractor's own guard,
 * `!(bound && !boundAmount)`, is what would drop the row entirely once you connect without
 * earning anything.
 */
export const QUEST_LIST = {
  mxLuckyScratchBonus: undefined,
  instantCashback: undefined,
  appLoginBonus: undefined,
  instantDepositTask: undefined,
  instantWagerTask: undefined,
  cWalletConnectionBonus: {
    second: 'wallet',
    first: {
      questName: 'cWalletConnectionBonus',
      bound: false,
      boundAmount: null,
      boundAmountCurrencyName: 'BCD',
      rewards: [],
    },
  },
  cWalletWithdrawBonus: undefined,
  attendanceBonus: undefined,
  welcomeCashback: undefined,
  newcomerQuest: undefined,
  verification: undefined,
};

/* `/activity/quest/completed/list/` and `/activity/quest/expired/list/`. BOTH EMPTY, and that is
   the capture rather than a gap — screenshots two and three are the site's own empty state under
   each tab. The service's `initialValue` for both is `[]`, so an empty array is also what a
   logged-out visitor gets, which is the same thing this build renders.

   The row shape is read off the two renderers (`or` and `si`) rather than off a response, and it
   is recorded here so that connecting the real endpoint is a delete rather than a rewrite:

     completed  { questNames, subtitles, amount, currencyName, completedTime, createTime,
                  rewardString }
     expired    { questNames, subtitles, amount, currencyName, expireTime, unLockRate }

   `createTime` on a completed row is not decoration — the tab splits on it at 30 days and puts
   anything older behind a "Quests completed over 30 days ago" toggle. */
export const COMPLETED_QUESTS = [];
export const EXPIRED_QUESTS = [];

/* The store's `b` memo (`no()` in the chunk), which is the whole of how a keyed response becomes
   the rendered list: walk the registry in order, skip a key the response does not carry, run the
   handler's extractor, and bucket what comes back under `groupLabel(entry.second)`.
   `[...map.entries()]` is what turns the buckets back into an ordered array.

   The `bcmx` arm of the original's loop — which drops both Cwallet quests for that white label —
   is not reproduced: this build has one host and `we.bcmx` is false on it, the same reading the
   wallet page's route profile documents. */
export function groupQuests(list) {
  const groups = new Map();

  for (const key of QUEST_HANDLERS) {
    const entry = list?.[key];
    if (!entry) continue;

    const items = extract(key, entry.first);
    if (!items.length) continue;

    const label = groupLabel(entry.second);
    const bucket = groups.get(label) ?? [];
    bucket.push(...items);
    groups.set(label, bucket);
  }

  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

/* `et(component, mapper, guard)` in the chunk builds one of these per handler. Only the Cwallet
   one exists here; anything else returns nothing rather than a placeholder card, which is what
   `fallback: null` on the original's own `<ErrorBoundary>` around each row amounts to. */
function extract(key, payload) {
  if (key === 'dailyQuest') return dailyQuests(payload);
  if (key !== 'cWalletConnectionBonus' || !payload) return [];

  /* `!(bound && !boundAmount)` — the handler's own guard. */
  if (payload.bound && !payload.boundAmount) return [];

  const isClaim = (payload.rewards?.length ?? 0) > 0;

  return [
    {
      questKey: key,
      questName: payload.questName || key,
      title: QUEST_COPY.connectCwallet.title,
      description: QUEST_COPY.connectCwallet.subtitle,
      formula: true,
      /* `Ze` with `variant: "active", unLockRate: null` — which is what puts the "One-step task"
         line there rather than a progress figure, since the footer draws that row when the prop
         is PRESENT and falsy. No `expireTime`, so no countdown. */
      footer: { variant: 'active', unLockRate: null },
      /* `boundAmount` is null here, so both of these are undefined and the card's right-hand
         column collapses to just the button — see the note on the fixture above. */
      rewardAmount: payload.boundAmount,
      rewardCurrency: payload.boundAmountCurrencyName,
      locked: !payload.bound,
      isClaim,
      actionLabel: isClaim ? 'Claim' : 'Connect',
      /* `Hi.action` emits `open-cwalletbind`, which opens the Cwallet binding dialog. That
         dialog is not built, so the button is inert — flagged at the call site too. */
      actionType: 'connect',
    },
  ];
}

/* The platform's daily quests (services/quest.js): one card each, a progress bar in the
   viewer's currency (wager) or as a count (bets), "Ends in" to the day's end, and no reward
   column — nothing is paid for them yet, so the button only says whether it is done. */
function dailyQuests(payload) {
  const endsAt = Date.parse(payload?.endsAt ?? '') || 0;
  return (payload?.quests ?? []).map((q) => ({
    questKey: 'dailyQuest',
    questName: q.key,
    title: q.title,
    description: q.description,
    formula: false,
    footer: { variant: 'active', expireTime: endsAt },
    progress: { value: Number(q.progress) || 0, target: Number(q.target) || 0, unit: q.unit },
    actionLabel: q.completed ? 'Completed' : 'In Progress',
    disabled: true,
  }));
}
