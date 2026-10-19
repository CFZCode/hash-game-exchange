import { emptyIfAgentBlocked, request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import {
  HERO,
  CARDS,
  PROGRAM,
  FAQ,
  FAQ_TITLE,
  LIVE,
  DASHBOARD_INFO,
  LEVEL_UNLOCKS,
  GAME_RATES,
} from '../pages/Referral/referral';
import { SIGNED_IN } from '../context/account';
import { printCurrency } from '../utils/currency';

/* The referral programme's signed-out landing page.
 *
 * RECOVERED, NOT RECONSTRUCTED — the same route `/vip-detail` took, and the second page to take
 * it. None of these chunks are in the saved mirror; all four came off `hash.game`, which serves
 * the identical deploy under the identical content hashes that `Enter-MsmOuq5R.js` already lists
 * in its `__vite__mapDeps` table:
 *
 *   index-ve9CyRhD.js       the page      (mapDeps 131 — `NoLoginAffiliatePage`)
 *   Questions-dsRHzmFN.js   its three sub-blocks: Live Rewards, affiliate programme, FAQ
 *   servers-O8_t7p5g.js     the request module the paths in endpoints.js came out of
 *   utils-PrQ_cjrK.js       the dashboard redirect helper
 *
 * plus the nine PNGs under `src/assets/referral/`, saved under their own filenames with the
 * content hash stripped. Fetch with PowerShell's `Invoke-WebRequest`; `.js.map` still 403s, so
 * what you get is minified code rather than original source, which is enough — a Solid template
 * literal carries the class list verbatim.
 *
 * WHICH PAGE THIS IS, AND WHY IT IS THE SIGNED-OUT ONE. `/referral` in Enter-MsmOuq5R.js carries
 * `guards: [() => !b.login && "/referral-exhibition"]`, so a logged-out visitor never reaches it
 * — they are redirected to `/referral-exhibition`, which renders `NoLoginAffiliatePage`. The
 * captures show a "Sign up & Earn" button, which settles it: they are of the exhibition page.
 * The signed-in `AffiliatePage` (`index-CgFyS3aK.js`, with the dashboard, referral codes and
 * friend list) is a much larger page and is NOT built.
 *
 * ONE CALL, AND IT IS THE TICKER'S. The page's copy is i18n compiled into the chunk, so nothing
 * fetches it; the only request the signed-out page makes is `/agent/affiliate/history/` for the
 * Live Rewards strip. Everything else in the fixture below is static content passed through this
 * seam so the page reads it the same way every other page reads its data — when the real
 * endpoint lands, `live` starts arriving from the network and the rest stops travelling with it.
 */

/* The origin the invite link is built on, in one place because THREE surfaces print the same
 * string — the Refer and Earn dialog, the dashboard's invite card and the Referral Codes table —
 * and one of them measures it. See the long note on `getInvitationCode` for why the captured
 * value is `hash.game` and not `bc.game`.
 *
 * IT IS THIS APP'S OWN ORIGIN WHEN THE API IS ON, WHICH IS THE ORIGINAL'S OWN RULE RATHER THAN A
 * NEW ONE. bc.game builds the link from `location.host`, so on the live site it is simply whatever
 * origin served the page; the captures say `hash.game` because that is what answered when they
 * were taken. With fixtures on the captured value is kept, so the Referral Codes table's
 * content-sized columns render exactly as documented.
 *
 * THE PLATFORM'S OWN `referralLink` IS NOT USED, and that is the decision this step existed to
 * make. It answers `http://localhost:3000/referal/<code>` — its FRONT-END's origin, baked into its
 * config — so printing it would hand a friend a link into a different application. The CODE is
 * taken live and the LINK is built here, which keeps the three surfaces agreeing with each other
 * and pointing at the app the visitor is actually using.
 */
const INVITE_HOST = USE_FIXTURES ? 'https://hash.game' : window.location.origin;

const inviteUrl = (code) => `${INVITE_HOST}/i-${code}-n/`;

export const getReferral = () =>
  request(ENDPOINTS.referral.history, {
    fixture: {
      hero: HERO,
      cards: CARDS,
      program: PROGRAM,
      faq: { title: FAQ_TITLE, items: FAQ },
      /* NO-BACKEND: the platform has no feed of other players' referral rewards. LIVE's rows are
         bc.game's captured four plus invented filler and its total is bc.game's, so live mode
         keeps the strip's labels and empties the figures, as the raffle ticker does. */
      live: USE_FIXTURES ? LIVE : { ...LIVE, commissionUsd: '0', rewardUsd: '0', list: [] },
    },
  });

/* The Refer and Earn dialog's one call — `Refer-DVueC7AK.js` does nothing but
 * `http.get("/agent/invitation/code/custom/")` on mount and print `invitationUrl` into the
 * bordered field. `code` was already in `endpoints.js`, recorded off `servers-O8_t7p5g.js` when
 * the exhibition page was built; this is the first thing to call it.
 *
 * THE RESPONSE IS AUTH-GATED AND THIS FIXTURE IS THE ONLY INVENTED PART OF THE DIALOG. Everything
 * else on it — markup, class lists, all five copy strings, the $1,000 figure — is the chunk's or
 * the i18n bundle's. `hash.game` answers this path 6002 like every other `/agent/` route, so
 * there is no live value to copy the way `system/conf` supplied the withdraw form's.
 *
 * What IS known is the shape, off the rendered field: `https://<host>/i-<code>-n/`. So the code
 * is the fixture account's own `currentInvitationCode` rather than a made-up string, which keeps
 * this dialog, the dashboard's invite card and the Referral Codes table all printing one value.
 *
 * THE HOST IS `hash.game`, WHICH REVERSES AN EARLIER CHOICE. It was written as `bc.game` on the
 * reasoning that the two are the same deploy and this is a bc.game account, with the capture's
 * `hash.game` treated as an accident of which origin answered. That is defensible until something
 * MEASURES the string: the Referral Codes table prints this URL in an auto-layout column, so its
 * width is part of the page's geometry, and four missing characters visibly redistribute every
 * column in the table — the Code column moves right as the leftover pool grows, the three after
 * the link move left as it shrinks. The original builds this from `location.host`, so on the live
 * site it is whatever origin served the page; the captures are the only evidence available of
 * what it renders as, and both of them say `hash.game`. Evidence beats the tidier reading, which
 * is the same call the deposit-offer scroll lock documents.
 *
 * `invitationCode` is returned alongside because the response carries it and the APP branch reads
 * it directly: `isAPP && host.includes("bcgameapp")` swaps the whole URL for a landing-page one
 * built from the code. That branch is unreachable in a browser build and is not reproduced. */
export const getInvitationCode = () => {
  const answer = request(PLATFORM.user.affiliate.summary, {
    live: true,
    fixture: {
      invitationCode: SIGNED_IN.currentInvitationCode,
      /* `aliasCode` is what the dashboard's Referral Code field prints, where the dialog prints
         the URL. The response carries both and they are the same string in the capture
         (`98q7ntrof8` beside `…/i-98q7ntrof8-n/`), so it is derived rather than made up twice. */
      aliasCode: SIGNED_IN.currentInvitationCode,
      invitationUrl: inviteUrl(SIGNED_IN.currentInvitationCode),
    },
  });

  /* The live answer is `{referralCode, referralLink}`; only the code is taken, for the reason at
     `INVITE_HOST`. The fixture is already in this shell's shape, so as elsewhere the branch is on
     whether a Promise came back rather than on inspecting the object. */
  if (!answer || typeof answer.then !== 'function') return answer;

  return answer.catch(emptyIfAgentBlocked(null)).then((data) => ({
    invitationCode: data?.referralCode ?? '',
    aliasCode: data?.referralCode ?? '',
    invitationUrl: data?.referralCode ? inviteUrl(data.referralCode) : '',
  }));
};

/* The signed-in dashboard's second call — `/agent/affiliate/dashboard/`, out of the same
 * `servers-O8_t7p5g.js`. The store behind the page (`store-D8aGAuAj.js`) fires this and
 * `getInvitationCode` together in a `Promise.all` and hands both to `/referral`.
 *
 * AUTH-GATED LIKE EVERY `/agent/` ROUTE, and it costs nothing here for the reason the bonus page
 * documents: the request module declares the object the store falls back to, and that object is
 * exactly what the capture renders. See `DASHBOARD` in pages/Referral/referral.js. */
/* SIX OF TEN FIGURES ARE REAL (wired 2026-10-12 against SmartBet). bc.game's ten-field card is
 * filled from `team`, `rewards`, `rewards?filter=today` and `rewards/unclaimed`; see the mapping in
 * the function. `ratio`/`maxRatio`, `todayWagerUsd` and `remainingRewardUsd` have no source on the
 * platform and keep `DASHBOARD`'s declared zeros rather than a derived guess.
 */
/* `reloads` is not read — it is part of the reader's identity so a claim can re-run this. See
   `pages/Referral/MyRewards.jsx`. */
// eslint-disable-next-line no-unused-vars
export const getAffiliateDashboard = ({ reloads } = {}) => {
  const team = request(PLATFORM.user.affiliate.team, { live: true, fixture: null });

  if (!team || typeof team.then !== 'function') return DASHBOARD_INFO;

  const summary = Promise.resolve(request(PLATFORM.user.affiliate.summary, { live: true, fixture: null })).catch(() => null);

  return Promise.all([team.catch(emptyIfAgentBlocked(null)), readRewards(), readUnclaimed(), readTodayRewards(), summary]).then(
    ([members, earned, open, today, info]) => {
      const { tier, commission } = splitUnclaimed(open);
      /* Commission ever credited (claimed or not) is `rewards.totalAmount`; what is still open is
         the unclaimed list's `commission` rows; so what was already paid out is the difference.
         `claimedTotal` is tier + commission paid, so tier paid is what is left of it. Tier rows
         are the referral (joining / wager-tier) rewards bc.game calls "Referral Rewards". */
      const commissionEarned = num(earned?.totalAmount);
      const commissionPaid = Math.max(0, commissionEarned - commission);
      const tierPaid = Math.max(0, num(open?.claimedTotal) - commissionPaid);
      return {
        ...DASHBOARD_INFO,
        dashboard: {
          ...DASHBOARD_INFO.dashboard,
          friendNumber: Number(members?.total) || 0,
          availableCommissionUsd: String(commission),
          availableRewardUsd: String(tier),
          commissionUsd: String(commissionEarned),
          rewardUsd: String(tier + tierPaid),
          todayCommissionUsd: String(num(today?.totalAmount)),
          /* hash.game's "Locked Rewards": friends' referral steps not unlocked yet (USD), from
             `GET /user/affiliate` → `lockedRewards`. `ratio`/`maxRatio`/`todayWagerUsd` keep zeros. */
          remainingRewardUsd: String(num(info?.lockedRewards?.lockedUsd)),
        },
        /* Rewards Activities: one Commission Rewards line per credited commission, newest first. */
        topCommissions: (earned?.rows ?? []).map((row) => ({ commissionUsd: String(num(row.amount)) })),
      };
    },
  );
};

/* ── The platform's affiliate reads, shared by the dashboard and the three My Rewards tables. ──
 *
 * `rewards` is every commission credited to this account (`{total, totalAmount, rows:[{member,
 * amount, coin, referredAmount, createdAt}]}`); `rewards/unclaimed` is what is still claimable,
 * tier unlocks (`kind: 'tier'`) and commission (`kind: 'commission'`) together; `team` is the
 * referred players. The reward coin is the operator's reward currency (USDT on this delivery), so
 * the amounts are read as USD the way bc.game's `*Usd` fields are. */
const REWARDS_TODAY = { params: { filter: 'today' } };
const num = (value) => Number(value) || 0;
/* `team` and `rewards` are paged (default 50, at most 200 a page), so a per-friend or per-coin sum
   over the first page misses the rest. These walk every page into one envelope; `key` is its list. */
const PAGE_MAX = 200;
const readAll = (path, key) => {
  const page = (offset, acc) =>
    Promise.resolve(request(path, { live: true, fixture: null, params: { limit: PAGE_MAX, offset } })).then((data) => {
      const got = data?.[key] ?? [];
      const rows = acc.concat(got);
      if (got.length === PAGE_MAX && rows.length < num(data.total)) return page(offset + PAGE_MAX, rows);
      return data ? { ...data, [key]: rows } : null;
    });
  return page(0, []).catch(() => null);
};
const readRewards = () => readAll(PLATFORM.user.affiliate.rewards, 'rows');
const readTodayRewards = () =>
  Promise.resolve(
    request(PLATFORM.user.affiliate.rewards, { live: true, fixture: null, ...REWARDS_TODAY }),
  ).catch(() => null);
const readUnclaimed = () =>
  Promise.resolve(request(PLATFORM.user.affiliate.unclaimed, { live: true, fixture: null })).catch(() => null);
const readTeam = () => readAll(PLATFORM.user.affiliate.team, 'members');

/* A friend's VIP level NAME off their wager (USD, `team.members[].wager`) and the site's ladder
   (`GET /user/vip/levels`, bands by `minXp` in USD). `member.level` is not the VIP level. */
const readVipNamer = () =>
  Promise.resolve(request(PLATFORM.user.vip.levels, { live: true, fixture: null }))
    .catch(() => null)
    .then((ladder) => {
      const bands = [...(ladder?.levels ?? [])].sort((a, b) => num(a.minXp) - num(b.minXp));
      return (wager) => {
        const band = bands.filter((b) => num(wager) >= num(b.minXp)).pop();
        return band?.name ?? ladder?.unranked?.name ?? '';
      };
    });

function splitUnclaimed(open) {
  let tier = 0;
  let commission = 0;
  for (const row of open?.rows ?? []) {
    if (row.kind === 'commission') commission += num(row.amount);
    else tier += num(row.amount);
  }
  return { tier, commission };
}

/* The tables print `createDate` as text; bc.game's own is the en-US short date. */
const shortDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-US') : '');
const usd2 = (value) => (Math.floor(num(value) * 100) / 100).toFixed(2);

/* ------------------------------------------------------------------- the My Rewards tab
 *
 * FOUR FEEDS AND ALL FOUR ARE SHUT, WHICH IS WHY THE TAB IS COMPLETE RATHER THAN PARTIAL. This is
 * the transaction pane's situation again: being locked out is the CORRECT rendering, not a
 * compromise. The capture shows every figure at $0.00 over an empty list with the crocodile, and
 * that falls straight out of two things this project already had — `DASHBOARD` (the request
 * module's own default, see referral.js) for the summary card, and an empty list for the tables.
 * Nothing here is read off the screenshot and nothing is invented.
 *
 * Probed rather than assumed, and the two answers differ: `/agent/commission/list/` returns
 * bc.game's 6002 envelope, while the three POSTs return a bare gateway 403. See endpoints.js.
 *
 * The three table feeds take filters the page can set (a code, a username, two date ranges, a
 * page) and are written to accept them, so the seam is already the right shape — but with a
 * fixture there is nothing to filter, so the argument is accepted and ignored. */

/* `g` in servers-O8_t7p5g.js — Commission by Currency. One row per coin the account has earned
   in, and the page ALSO folds `availableRewardUsd` into a synthetic USDT row when that figure is
   non-zero. It is zero here, so the list stays empty. */
// `reloads` is not read — like getAffiliateDashboard's, it lets a claim re-run this.
// eslint-disable-next-line no-unused-vars
export const getCommissionList = ({ reloads } = {}) => {
  if (USE_FIXTURES) return request(ENDPOINTS.referral.commission, { fixture: [] });
  /* One row per reward coin: Available is what is still claimable in it (tier + commission —
     which is the page's own fold of the referral rewards into the coin's row), Total Received is
     every commission credited in it. */
  return Promise.all([readRewards(), readUnclaimed()]).then(([earned, open]) => {
    const byCoin = new Map();
    const at = (code) => {
      if (!byCoin.has(code)) byCoin.set(code, { currencyName: code, availableUsd: 0, commissionUsd: 0 });
      return byCoin.get(code);
    };
    for (const row of earned?.rows ?? []) if (row.coin) at(row.coin).commissionUsd += num(row.amount);
    for (const row of open?.rows ?? []) if (row.currency) at(row.currency).availableUsd += num(row.amount);
    return [...byCoin.values()]
      .filter((row) => row.availableUsd > 0 || row.commissionUsd > 0)
      .map((row) => ({ ...row, availableUsd: String(row.availableUsd), commissionUsd: String(row.commissionUsd) }));
  });
};

/* Stamped once at module load — see the `createTime` note below. */
const CREATED_AT = Date.now();

/* The table payloads all share the page/total envelope the chunk unwraps
   (`{list, page, pageSize, total, totalPage}`), which is why one empty shape serves all three. */
const EMPTY_PAGE = { list: [], page: 0, pageSize: 10, total: 0, totalPage: 0 };

/* `Ut`'s own `POST /agent/information/list/` — Commission by Friends. */
export const getFriendCommissions = () => {
  if (USE_FIXTURES) return request(ENDPOINTS.referral.friendList, { method: 'POST', fixture: EMPTY_PAGE });
  /* One row per referred player, off `team.members`, with that player's commission summed from
     `rewards.rows`. The rate is the site's configured commission rate (as hash.game's column
     prints it), a fraction like bc.game's `ratio`. `team` sends each member's id and approved
     deposits of the last 7 days in USD; an older backend sends neither, and those cells print a dash. */
  return Promise.all([readTeam(), readRewards(), getCommissionRates()]).then(([team, earned, rates]) => {
    const paid = new Map();
    for (const row of earned?.rows ?? []) paid.set(row.member, (paid.get(row.member) ?? 0) + num(row.amount));
    const list = (team?.members ?? []).map((member) => {
      const amount = paid.get(member.name) ?? 0;
      return {
        id: member.name,
        userName: member.name,
        userId: member.id ?? '-',
        commissionRate: rates.commissionRate / 100,
        // USD; null from an older backend that does not send it.
        day7TotalDeposits: member.deposits7dUsd ?? null,
        createDate: shortDate(member.joinedAt),
        commissionUsd: usd2(amount),
      };
    });
    return { ...EMPTY_PAGE, list, page: 1, total: list.length, totalPage: list.length ? 1 : 0 };
  });
};

/* `Rt` / `R` — `/agent/invitation/code/list/`, and the ONE `/agent/` payload here that is not
 * empty, because its contents are already known from somewhere else.
 *
 * The response is one entry per invite code the account has created, and this account has created
 * exactly one — the same code the Dashboard's invite card and the Refer and Earn dialog both
 * print. So the row is derived from `SIGNED_IN.currentInvitationCode` through the same `i-<code>-n`
 * shape `getInvitationCode` uses, and the three surfaces cannot disagree.
 *
 * `createdNum: 1` against `totalCodeNum: 20` is the capture's own pair, and the second figure is
 * the CAP rather than a count — the card reads "1/20". `ratio` 0.25 is the 25% the invite card
 * states and the Rate & Rules calculator opens on. `registerNum: 0` agrees with `friendNumber: 0`
 * in the dashboard default.
 *
 * `createTime` is the one field with no source. It is stamped at module load rather than pinned
 * to the capture's instant, on the same reasoning as the deposit bonus's month reset and the
 * raffle's draw clock: a date that is simply wrong reads worse than one that is merely today's,
 * and nothing on the page derives anything from it.
 *
 * Two consumers, and they read different halves: the Referral Codes tab renders `list` as its
 * table, while the Commission by Friends filter seeds its dropdown with "All Codes" and appends
 * one `aliasCode` per row. */
const CODE = SIGNED_IN.currentInvitationCode;

const codeRow = (code, registerNum = 0) => ({
  campaignName: '',
  aliasCode: code,
  invitationUrl: inviteUrl(code),
  ratio: 0.25,
  createTime: CREATED_AT,
  registerNum,
});

/* THE THIRD SURFACE, AND IT STAYS DERIVED RATHER THAN FETCHED — which is the same conclusion the
 * fixture arm reached, for a different reason.
 *
 * The platform has no invite-CODE list at all: an account there has exactly one referral code, on
 * its own row, and no notion of creating more. So there is nothing to page through and the table's
 * one row is built from the same code the other two surfaces print, exactly as the fixture builds
 * it — the difference being that the code is now live and `registerNum` comes from the real team
 * count instead of the capture's zero.
 *
 * `totalCodeNum: 20` stays as the capture's cap and `createdNum: 1` as its count, because both
 * describe bc.game's own limit on how many codes an account may create and the platform simply
 * does not have that feature. The card reads "1/20" either way, which is true of an account with
 * one code and no way to make a second.
 */
export const getInviteCodes = () => {
  const summary = request(PLATFORM.user.affiliate.summary, {
    live: true,
    fixture: {
      list: [codeRow(CODE)],
      totalCodeNum: 20,
      createdNum: 1,
    },
  });

  if (!summary || typeof summary.then !== 'function') return summary;

  const team = request(PLATFORM.user.affiliate.team, { live: true, fixture: null });

  return Promise.all([
    summary.catch(emptyIfAgentBlocked(null)),
    team.catch(emptyIfAgentBlocked(null)),
  ]).then(([info, members]) => ({
    list: info?.referralCode ? [codeRow(info.referralCode, Number(members?.total) || 0)] : [],
    totalCodeNum: 20,
    createdNum: info?.referralCode ? 1 : 0,
  }));
};

/* `xt`'s own `POST /agent/information/referral-rewards/list/` — Level Up Rewards. */
export const getReferralRewards = () => {
  if (USE_FIXTURES) {
    return request(ENDPOINTS.referral.referralRewards, { method: 'POST', fixture: EMPTY_PAGE });
  }
  /* Level Up Rewards are the platform's tier unlocks (`kind: 'tier'` in `rewards/unclaimed`),
     joined to the team member for the registration date, VIP level and code. Only UNCLAIMED tier
     rows are readable — the platform has no player route listing claimed ones — so a claimed
     reward leaves this table. */
  return Promise.all([readUnclaimed(), readTeam(), readVipNamer()]).then(([open, team, vipName]) => {
    const members = new Map((team?.members ?? []).map((m) => [m.name, m]));
    const list = (open?.rows ?? [])
      .filter((row) => row.kind === 'tier')
      .map((row) => {
        const member = members.get(row.member);
        return {
          id: `tier-${row.id}`,
          userName: row.member ?? '',
          createDate: shortDate(member?.joinedAt),
          userLevel: member ? vipName(member.wager) : '',
          aliasCode: member?.campaign ?? '',
          rewardUsd: usd2(row.amount),
        };
      });
    return { ...EMPTY_PAGE, list, page: 1, total: list.length, totalPage: list.length ? 1 : 0 };
  });
};

/* ── THE AFFILIATE REWARD CLAIMS ───────────────────────────────────────────────────────────────
 *
 * `POST /user/affiliate/rewards/claim` takes `{rewardId}` and claims ONE; `claim-all` takes no
 * body and claims everything available. `GET /user/affiliate/rewards/unclaimed` is the list they
 * act on.
 *
 * THE ORIGINAL SENDS YOU TO A PAGE HERE AND THE PLATFORM HAS A CALL. "Withdraw to Wallet"
 * navigates to `/rewards-withdraw` on bc.game — a screen for choosing what to move, and one this
 * build does not have — while this platform's whole capability is `claim-all`: no arguments, and
 * it moves everything available. So the button performs the claim rather than opening a screen
 * that would have nothing to decide. `pages/Referral/MyRewards.jsx` records that at the call site.
 */

/* Reward History (My Rewards → History): one kind's rows, `{amount, currency, createdAt, status}`
   with status `available | claimed | void`, newest first. */
export const getRewardHistory = (kind) =>
  Promise.resolve(
    request(PLATFORM.user.affiliate.history, { live: true, fixture: { rows: [] }, params: { kind, limit: 200 } })
  ).then((answer) => answer?.rows ?? [], () => []);

export const getUnclaimedRewards = () =>
  Promise.resolve(request(PLATFORM.user.affiliate.unclaimed, { live: true, fixture: [] }))
    .then((rows) => (Array.isArray(rows) ? rows : (rows?.rows ?? [])))
    .catch(() => []);

/** One reward by its id — kept beside `claimAll` because the list read above makes it usable. */
export const claimAffiliateReward = (rewardId) =>
  request(PLATFORM.user.affiliate.claim, {
    live: true,
    method: 'POST',
    json: { rewardId },
    fixture: null,
  });

export const claimAllAffiliateRewards = () =>
  request(PLATFORM.user.affiliate.claimAll, { live: true, method: 'POST', fixture: null });

/* The Rate & Rules tab's "Friend's Level / Total Wager / Unlock Amount" table.
 *
 * bc.game hardcodes it in the chunk (`LEVEL_UNLOCKS`, the capture). Here the SITE ADMIN owns it:
 * `referralUnlocks` on `GET /admin/site-config/public` (migration 106, edited on the admin's
 * Affiliate rates screen), `{ currency, tiers: [{ level, totalWager, unlockAmount }] }` with
 * `level` the VIP level NAME the site prints and the two amounts exact decimal strings in the
 * site's reward currency. Its seed is the capture's ten rows, so the page is unchanged until an
 * operator edits it.
 *
 * Every arm answers the SAME row shape the table renders — `{ level, wager, amount, currency }`,
 * `level` a ladder number (capture) or a name (live), `wager`/`amount` display strings:
 *   - fixtures on                     the capture, verbatim ("1000,000" included)
 *   - a backend without the setting   the capture too (`referralUnlocks` absent = not deployed yet)
 *   - the setting                     the operator's rows, through `printCurrency`
 *   - a failed read                   no rows, rather than numbers the operator may have changed
 *
 * `currency` is null on the capture rows, which is what keeps bc.game's gold coin on them. */
const CAPTURE_UNLOCKS = LEVEL_UNLOCKS.map((row) => ({ ...row, currency: null }));

const UNLOCKS_FIXTURE = { referralUnlocks: null };

export const toUnlockRows = (config) => {
  const live = config?.referralUnlocks;
  if (!live || !Array.isArray(live.tiers)) return CAPTURE_UNLOCKS;
  const currency = String(live.currency || config?.rewardCurrency || 'USDT').toUpperCase();
  const print = (value, minDecimals) => printCurrency(value, currency, { hasAlias: false, minDecimals });
  return live.tiers
    .filter((tier) => tier && String(tier.level ?? '').trim())
    .map((tier) => ({
      level: String(tier.level).trim(),
      wager: print(tier.totalWager, 0),
      amount: `+${print(tier.unlockAmount, 2)}`,
      // Raw, so the page can show them in the selected currency (the `selected-currency` skill).
      wagerValue: tier.totalWager,
      amountValue: tier.unlockAmount,
      currency,
    }));
};

export const getReferralUnlocks = () => {
  const read = request(PLATFORM.site.config, { live: true, fixture: UNLOCKS_FIXTURE });
  return typeof read?.then === 'function'
    ? read.then(toUnlockRows, () => [])
    : toUnlockRows(read);
};

/* The Rate & Rules tab's rate boxes and calculator — the same `site-config/public` read.
 * `commissionRate` and `gameRates` (migration 134, percent strings) are the site admin's; absent
 * (fixtures on, a backend without them) or a failed read answers the capture's 25 and 28/60/100. */
export const CAPTURE_RATES = { commissionRate: 25, games: GAME_RATES };

export const toCommissionRates = (config) => {
  const live = config?.gameRates;
  if (!live || config?.commissionRate == null) return CAPTURE_RATES;
  return {
    commissionRate: Number(config.commissionRate),
    games: GAME_RATES.map((game) => {
      if (live[game.key] == null) return game;
      const pct = Number(live[game.key]);
      return { ...game, label: `${game.name} (${pct}%)`, pct, rate: pct / 100 };
    }),
  };
};

export const getCommissionRates = () => {
  const read = request(PLATFORM.site.config, { live: true, fixture: UNLOCKS_FIXTURE });
  return typeof read?.then === 'function'
    ? read.then(toCommissionRates, () => CAPTURE_RATES)
    : toCommissionRates(read);
};

export default getReferral;
