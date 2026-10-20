import { brandName } from './siteBranding';
import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';

/* The notification drawer's data.
 *
 * WHERE THE COMPONENT CAME FROM. The shell (`_e`) is in `Header-CTF5n6al.js`, which IS in the
 * saved mirror; the body is `Main-_tXJgJzI.js`, which is not, and came off `hash.game/assets/`
 * with `compact-IdC0O8xF.js` and `IconEmojisports-BU35Rj6X.js` under the hashes Header's own
 * `__vite__mapDeps` already lists. `ClearAll-BQO1_4tO.js` and `IconDelete-D_A0Wcow.js` were
 * already saved. So every class list is the Solid template's own and every string is verbatim
 * i18n — nothing on this panel is read off a screenshot.
 *
 * THE STORE IS `Us` IN `Enter-MsmOuq5R.js`, not a service module, which is why none of these
 * paths had been recorded: they are declared inline beside the store that calls them.
 *
 * BOTH READS ANSWER 403 AND THAT IS THE CORRECT RENDERING — the fifth page in this project where
 * being locked out is the answer rather than a compromise, after the transaction, rollover, bet
 * history and free-plays panes. `POST /home/system-notice/list/v2/` and
 * `POST /comment/reply/unread/list/` both return a bare gateway 403 on `hash.game`, probed
 * rather than assumed. Note they agree with each other, unlike the referral family, where one
 * path answers bc.game's own 6002 envelope and three answer a bare 403.
 *
 * AND THE FIXTURE IS THE STORE'S OWN DECLARED STATE — the fourth time checking for one has
 * supplied a login-gated payload, after `/bonus`'s reward list, the referral dashboard's request
 * module and My Profile's resource. `Us` opens with a literal:
 *
 *   { isOpen: false, currentType: 0, noticeList: [], commentData: {page: 1, pageSize: 20,
 *     total: 0, totalPage: 1, list: [], extra: 0}, unreadCommentList: [], httpLoading: false,
 *     commentMoreLoading: false, showUnread: false,
 *     unreadCount: {promotion: 0, transaction: 0, system: 0, comment: 0} }
 *
 * which is exactly what the first capture renders: three tabs with no badge on any of them, the
 * crocodile under each, and the bottom bar showing only "Show unread" — `mark all as read`
 * is `<Show when={total(unreadCount) > 0}>` and there is nothing to mark.
 *
 * ONE ROW WAS ADDED TO IT LATER, off a second capture of the System tab, and it is the only
 * thing in this file that did not come out of a chunk — see `CAPTURED_NOTICES` below for what is
 * read and what is inferred. It changes none of the above: the row is READ, so every count stays
 * zero, no badge appears and the bottom bar is unchanged. Promotions and Transactions still
 * render the crocodile, because that one row is `type: 4`.
 *
 * THE TYPE CONSTANTS ARE THE TABS. `Ls = [1,2,3,5]` is Promotions, `Ps = 6` is Transactions and
 * `xs = 4` is System — one notice `type` decides which pane a row lands in, so the three panes
 * are three filters over ONE list rather than three feeds. The System tab is the odd one: it
 * merges that filter with the comment feed, which is a different request entirely.
 */

export const NOTICE_TYPE = {
  /* `Ls` — four values, not a range: 4 belongs to System and sits inside them. */
  promotion: [1, 2, 3, 5],
  transaction: 6,
  system: 4,
};

/* `Os(counts, excludeComment)` — what the bell's red dot counts and what gates
   "mark all as read". The second argument is used by a caller that is not built. */
export const totalUnread = (counts, excludeComment = false) => {
  const total = counts.comment + counts.promotion + counts.system + counts.transaction;
  return excludeComment ? total - counts.comment : total;
};

/* `Ss` — a clamp the store applies before writing a decremented count back. */
export const atLeastZero = (n) => (n <= 0 ? 0 : n);

/* The store's own `commentData` literal. Exported because the System pane reads
   `commentData.list.length` to decide between the empty state and the two comment lists. */
export const EMPTY_COMMENTS = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPage: 1,
  list: [],
  extra: 0,
};

/* ONE ROW, AND IT IS READ OFF THE RENDERED PANEL RATHER THAN OFF A PAYLOAD — which is the
 * distinction to hold on to, because everything else in this file came out of the chunks. The
 * feed 403s, so there is no response to copy; what there is, is a capture of this notice
 * rendered inside the System tab, and `Yt`'s template is known well enough to run it backwards.
 *
 * WHAT IS READ: the title, every word of the body, the printed timestamp, and three facts that
 * are visible rather than inferred — it sits under **System**, so `type` is `xs`, i.e. 4; there
 * is no green dot beside the date, so `isRead` is 1; and there is no "Exclusive Notification"
 * strip, so `isTop` is 0. The absence of a View More button is the fourth: no `contentType: 2`
 * block. Note it is NOT clamped either, and that is not a choice — `Yt` gates the 220px test on
 * `Ls.includes(type)`, and 4 is not in `[1,2,3,5]`, so a System notice renders at full height
 * however long it is. That is exactly what the two captures show, one scrolled past the other.
 *
 * WHAT IS INFERRED, and it is two things. `afficheId` is invented; nothing prints it, and its
 * only uses are as a React key and as the argument to two writes that cannot fire. And the whole
 * body is ONE `contentType: 1` block with `\n\n` between paragraphs rather than one block per
 * paragraph — settled by measuring rather than assumed: the gaps between paragraphs in the
 * capture are exactly two line pitches, i.e. one blank line under `whitespace-pre-wrap`, where
 * separate blocks would give the 8px of `my-2` instead. The 📢 line measures the same way, so it
 * is the first line of that block and not a heading of its own.
 *
 * `createTime` IS BUILT FROM LOCAL PARTS RATHER THAN PINNED TO AN EPOCH. The only evidence is the
 * string `7/30/2026, 11:44:12 AM`, which is `toLocaleString()` in the VIEWER's zone — so pinning
 * a UTC instant would reproduce the capture only for a reader in the same zone as whoever took
 * it. Constructing it from local parts renders those exact digits everywhere, which is the thing
 * the capture actually attests to. Same reasoning as the deposit bonus's month reset and the
 * raffle's draw clock: derive what is stated, do not freeze what was observed. */
const SYSTEM_NOTICE_BODY = `📢 Important Notice

Dear Users,

Please be advised that effective August 1, 2026, our platform will no longer support deposits and withdrawals of USDT and CRO via the Cronos Chain.

To ensure your funds are credited successfully, please carefully verify both the wallet address and the selected blockchain network before making any cryptocurrency deposit. Using an unsupported network may result in your funds not being credited.

Until August 7, 2026, if you accidentally make a deposit via the Cronos Chain, the transaction will not be credited automatically. Please contact our Customer Support team as soon as possible so we can investigate and escalate your case.

Starting August 7, 2026, the platform will no longer provide deposit tracing, credit investigation, or fund recovery assistance for transactions made via the Cronos Chain. Any funds transferred through this unsupported network after this date may not be credited to your account or recoverable.

To protect your assets, please double-check the selected blockchain network before initiating any cryptocurrency transaction.

Thank you for your understanding and continued support.

${brandName()} Team`;

const CAPTURED_NOTICES = [
  {
    afficheId: 106981,
    type: NOTICE_TYPE.system,
    isTop: 0,
    isRead: 1,
    createTime: new Date(2026, 6, 30, 11, 44, 12).getTime(),
    contentV3: [
      {
        title: 'Cronos Chain (USDT & CRO) Deposit and Withdrawal Support Discontinued',
        content: [{ contentType: 1, content: SYSTEM_NOTICE_BODY }],
      },
    ],
  },
];

/* `Ts(showUnread)`. The live call also sends `userId` off the account store; it is passed
 * through here for the same reason every other service takes its real arguments — the seam is
 * the right shape the day the flag flips.
 *
 * THE FIXTURE HONOURS `showUnread` RATHER THAN IGNORING IT, unusually for this project — the
 * filter is the SERVER's on the original (the flag goes into the request body, and flipping the
 * switch refetches rather than filtering client-side), so with a static fixture the control would
 * otherwise be visibly inert. `isRead === 0` is what the parameter's own name says it selects,
 * and it is the same test `Bs` counts unread rows with two functions down, so the reading is the
 * chunk's rather than a guess. The one captured row is READ, so turning the switch on empties the
 * System tab — which is what the live site would do with this account. */
/* ── THE PLATFORM'S INBOX, AND THE TWO SHAPES THAT HAVE TO MEET ──────────────────────────────
 *
 * The panel is written against bc.game's notice — `{afficheId, type, isTop, isRead, createTime,
 * contentV3: [{title, content: [{contentType, content}]}]}` — and everything downstream of it,
 * `reduceNotices` included, keys on those fields. iBitPlay answers a flat row instead:
 * `{id, title, body, type, data, read, readAt, delivered, createdAt}`.
 *
 * So the adapter is here rather than in the components. Nothing above this line changes when the
 * backend does, which is the same arrangement every other live read in this project uses.
 *
 * ── THE TYPE VOCABULARIES ARE DIFFERENT SIZES AND THE MAPPING IS A CHOICE ──────────────────
 *
 * bc.game has four numeric buckets and the panel's three tabs filter on them: `promotion` is
 * `[1,2,3,5]`, `transaction` is `6`, `system` is `4`. iBitPlay has six NAMES —
 * `general, deposit, withdrawal, bonus, bet, promotion`. The mapping below puts money movements
 * in Transactions, promotions and bonuses in Promotions, and everything else in System, which is
 * where an unrecognised type also lands. It is a judgement, not a transcription; it is in one
 * place so it can be argued with.
 *
 * `contentV3` is an ARRAY of sections on the original and iBitPlay sends one title and one body,
 * so this builds a single section. `contentType: 1` is the plain-text arm the renderer already
 * handles — `data` (the platform's arbitrary JSON payload) is deliberately NOT rendered, because
 * nothing on this side knows what any given producer put in it.
 */
/* SmartBet writes many more types than the six staff-send names (`deposit_approved`,
   `withdrawal_rejected`, `tip_received`, `affiliate_commission`…), and its own panel grouping is
   `categories.js` in the notifications module: `general` is System, the offer types are
   Promotions, and EVERYTHING ELSE is Transactions. Mirrored exactly, so these tabs agree with the
   server's `unread-count.byCategory`. */
const SYSTEM_TYPES = ['general'];
const PROMOTION_TYPES = [
  'promotion',
  'bonus',
  'campaign',
  'first_deposit_bonus',
  'spin_wheel_bonus',
  'bonus_unlocked',
];

const typeOf = (name) => {
  const t = name ?? 'general';
  if (SYSTEM_TYPES.includes(t)) return NOTICE_TYPE.system;
  if (PROMOTION_TYPES.includes(t)) return NOTICE_TYPE.promotion[0];
  return NOTICE_TYPE.transaction;
};

const toNotice = (row) => ({
  /* The id stays a STRING here and is compared as one downstream — it is a bigint on the wire
     and `Number()` on it is a silent precision bug waiting for a busy deployment. */
  afficheId: String(row.id),
  type: typeOf(row.type),
  /* No pinning on this platform — nothing marks a notification as sticky. */
  isTop: 0,
  isRead: row.read ? 1 : 0,
  createTime: row.createdAt ? Date.parse(row.createdAt) : 0,
  contentV3: [
    {
      title: row.title ?? '',
      content: [{ contentType: 1, content: row.body ?? '' }],
    },
  ],
});

export const getSystemNotices = ({ showUnread = false, userId = 0 } = {}) => {
  if (!USE_FIXTURES) {
    return Promise.resolve(
      request(PLATFORM.user.notifications.list, {
        live: true,
        /* `unreadOnly` is the SERVER's filter on both platforms — the original puts `showUnread`
           in the request body and refetches rather than filtering client-side, so sending it is
           what keeps the switch honest. It must be a real boolean or the string `'true'`/`'false'`:
           the route rejects anything else, deliberately, because `z.coerce.boolean()` would read
           `'false'` as true. */
        params: { unreadOnly: showUnread ? 'true' : 'false', limit: 50 },
        fixture: [],
      }),
    ).then((rows) => ({ noticeList: (rows ?? []).map(toNotice) }));
  }

  return request(ENDPOINTS.notification.list, {
    method: 'POST',
    body: JSON.stringify({ size: 50, appNo: 1, userId, showUnread }),
    fixture: {
      noticeList: showUnread ? CAPTURED_NOTICES.filter((row) => !row.isRead) : CAPTURED_NOTICES,
    },
  });
};

/* `Rs(page, showUnread)`. `extra` is the unread comment count, which the store reads straight
   into `unreadCount.comment` — it is not part of the page envelope. */
export const getCommentReplies = ({ page = 1, showUnread = false } = {}) =>
  request(ENDPOINTS.notification.comments, {
    method: 'POST',
    body: JSON.stringify({ page, pageSize: 20, showUnread }),
    fixture: EMPTY_COMMENTS,
  });

/* `Bs` — the reducer between the raw list and what the panes render, and it does three things
 * that are easy to miss:
 *
 * - TWO NOTICES ARE HARD-CODED BY ID. `afficheId === 106076` is forced to type 4 regardless of
 *   what the server says, and `106115` is dropped from the list entirely. Reproduced rather than
 *   tidied; they are the site's own, and a build that "fixed" them would show a row the live
 *   page hides.
 * - REGION GATING IS A WHITELIST *OR* A BLACKLIST, never both: a notice carrying
 *   `whiteListRegion` is shown only to those regions, and one without it is shown unless its
 *   `restrictedRegion` matches. The test is `areaCode` OR `userCountry`, so either alone is
 *   enough to match.
 * - THE COUNTS ARE DERIVED HERE, not sent. Each tab's badge is a count of unread rows in its own
 *   filter; `comment` is the only one that arrives as a number, off the other request's `extra`.
 */
export const reduceNotices = (payload, { areaCode = '', userCountry = '' } = {}) => {
  const inRegion = (regions) =>
    regions.includes(areaCode) || (!!userCountry && regions.includes(userCountry));

  const visible = [];
  for (const row of payload?.noticeList ?? []) {
    const notice = row.afficheId === 106076 ? { ...row, type: 4 } : row;
    if (notice.whiteListRegion) {
      if (inRegion(notice.whiteListRegion)) visible.push(notice);
    } else if (
      (!notice.restrictedRegion || !inRegion(notice.restrictedRegion)) &&
      notice.afficheId !== 106115
    ) {
      visible.push(notice);
    }
  }

  const countUnread = (rows) => rows.reduce((n, row) => (row.isRead ? n : n + 1), 0);

  return {
    noticeList: visible,
    unreadCount: {
      promotion: countUnread(visible.filter((r) => NOTICE_TYPE.promotion.includes(r.type))),
      transaction: countUnread(visible.filter((r) => r.type === NOTICE_TYPE.transaction)),
      system: countUnread(visible.filter((r) => r.type === NOTICE_TYPE.system)),
      comment: 0,
    },
  };
};

/* The four writes. Every one of them is authenticated and none can be reached with an empty
   list, so they are wired at the seam and never fire — the same state the vault transfers and
   the bonus claims are in. `readAll` is a `Promise.all` of two calls on the original, because
   the notices and the comment replies are marked read separately. */
export const readAllNotices = () => {
  if (!USE_FIXTURES) {
    /* ONE call, not two. The original marks notices and comment replies read separately because
       they are separate feeds; this platform has no comment feed at all, so the second call has
       nothing to address and is not made. */
    return Promise.resolve(
      request(PLATFORM.user.notifications.readAll, { live: true, method: 'POST', fixture: null }),
    );
  }

  return Promise.all([
    request(ENDPOINTS.notification.readAll, {
      method: 'POST',
      body: JSON.stringify({}),
      fixture: null,
    }),
    request(ENDPOINTS.notification.commentReadAll, { fixture: null }),
  ]);
};

export const readNotice = (afficheId, afficheType) => {
  if (!USE_FIXTURES) {
    /* `afficheType` has no counterpart — the platform's route takes the id alone and the row's
       own `user_id` is the ownership test, so naming somebody else's id marks nothing rather
       than erroring. The argument is kept in the signature because the caller passes it and the
       fixture arm still needs it. */
    return Promise.resolve(
      request(PLATFORM.user.notifications.readOne(afficheId), {
        live: true,
        method: 'POST',
        fixture: null,
      }),
    );
  }

  return request(ENDPOINTS.notification.readOne, {
    method: 'POST',
    body: JSON.stringify({ afficheId, afficheType }),
    fixture: null,
  });
};

/* NO LIVE ARM, AND THAT IS THE FINDING RATHER THAN AN OMISSION. bc.game's drawer has a delete
   on every row; this platform has no route behind it — `markRead` is the entire write surface a
   player has over their own notifications. Wiring this to anything would either invent a
   destructive route or silently do nothing while the row disappeared from the screen and came
   back on the next read. It stays on the fixture arm; the gap is recorded in
   `docs/backend-gaps.md`. */
export const deleteNotice = (afficheId, afficheType) =>
  request(ENDPOINTS.notification.deleteOne, {
    method: 'POST',
    body: JSON.stringify({ afficheId, afficheType }),
    fixture: null,
  });

/* The bell's dot: how many notifications the player has not read yet (the server's own count,
   so it agrees with the drawer). Fixture builds have no feed and answer 0. */
export const getUnreadCount = () =>
  USE_FIXTURES
    ? Promise.resolve(0)
    : Promise.resolve(
        request(PLATFORM.user.notifications.unreadCount, { live: true, fixture: { unread: 0 } }),
      ).then((r) => Number(r?.unread ?? 0));

/* Fired after the drawer reads a notice, so the bell refreshes at once instead of on its next poll. */
export const NOTICES_CHANGED = 'notices:changed';
export const noticesChanged = () => window.dispatchEvent(new Event(NOTICES_CHANGED));

export default getSystemNotices;
