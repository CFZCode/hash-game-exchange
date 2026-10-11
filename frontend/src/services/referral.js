import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { HERO, CARDS, PROGRAM, FAQ, FAQ_TITLE, LIVE, DASHBOARD_INFO } from '../pages/Referral/referral';
import { SIGNED_IN } from '../context/account';

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
      live: LIVE,
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

  return answer.then((data) => ({
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
/* TWO OF TEN FIGURES ARE REAL AND THE OTHER EIGHT KEEP THE DECLARED DEFAULT, which is the honest
 * shape of what the platform knows rather than a shortfall in the wiring.
 *
 * bc.game's `/agent/affiliate/dashboard/` answers a ten-field card — commission today, commission
 * total, wager today, the ratio and its cap, two available balances, two remaining. The platform
 * has no equivalent: `affiliate` is a code and a link, and the only numbers anywhere in the module
 * are a member COUNT on `team` and a reward TOTAL on `rewards`. So those two are read and mapped:
 *
 *   friendNumber       ← team.total
 *   availableRewardUsd ← rewards.totalAmount
 *
 * The other eight stay at `DASHBOARD`'s own zeros, which is what `servers-O8_t7p5g.js` declares as
 * the store's fallback and exactly what the reference capture renders. Filling them from the two
 * that exist — deriving "today" from a total, say — would put figures on the card that no endpoint
 * anywhere holds, which is the failure mode this whole wiring has been avoiding.
 *
 * `ratio`/`maxRatio` are the tempting ones and are deliberately left: the Rate & Rules pane states
 * 25% from its own hardcoded table, and a zero here does not contradict it — the card reads the
 * account's EARNED ratio, which is genuinely unknown.
 *
 * Both reads in one `Promise.all`, because neither depends on the other and the card draws once.
 */
/* `reloads` is not read — it is part of the reader's identity so a claim can re-run this. See
   `pages/Referral/MyRewards.jsx`. */
// eslint-disable-next-line no-unused-vars
export const getAffiliateDashboard = ({ reloads } = {}) => {
  const team = request(PLATFORM.user.affiliate.team, { live: true, fixture: null });
  const rewards = request(PLATFORM.user.affiliate.rewards, { live: true, fixture: null });

  if (!team || typeof team.then !== 'function') return DASHBOARD_INFO;

  return Promise.all([team, rewards]).then(([members, earned]) => ({
    ...DASHBOARD_INFO,
    dashboard: {
      ...DASHBOARD_INFO.dashboard,
      friendNumber: Number(members?.total) || 0,
      availableRewardUsd: String(earned?.totalAmount ?? '0'),
    },
    /* `topCommissions` drives the Rewards Activities list. The platform's `rewards.rows` is the
       nearest thing and carries a different row shape — the list is left empty rather than fed
       rows its renderer has never seen, which is the same call the four unbuilt transaction lists
       get. It is empty on this account either way. */
  }));
};

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
export const getCommissionList = () => request(ENDPOINTS.referral.commission, { fixture: [] });

/* Stamped once at module load — see the `createTime` note below. */
const CREATED_AT = Date.now();

/* The table payloads all share the page/total envelope the chunk unwraps
   (`{list, page, pageSize, total, totalPage}`), which is why one empty shape serves all three. */
const EMPTY_PAGE = { list: [], page: 0, pageSize: 10, total: 0, totalPage: 0 };

/* `Ut`'s own `POST /agent/information/list/` — Commission by Friends. */
export const getFriendCommissions = () =>
  request(ENDPOINTS.referral.friendList, { method: 'POST', fixture: EMPTY_PAGE });

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

  return Promise.all([summary, team]).then(([info, members]) => ({
    list: info?.referralCode ? [codeRow(info.referralCode, Number(members?.total) || 0)] : [],
    totalCodeNum: 20,
    createdNum: info?.referralCode ? 1 : 0,
  }));
};

/* `xt`'s own `POST /agent/information/referral-rewards/list/` — Level Up Rewards. */
export const getReferralRewards = () =>
  request(ENDPOINTS.referral.referralRewards, { method: 'POST', fixture: EMPTY_PAGE });

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

export default getReferral;
