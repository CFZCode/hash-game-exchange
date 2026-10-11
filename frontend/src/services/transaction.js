import { request, requestPage, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { isFiatCode } from '../utils/currency';

/* `/wallet/transaction` — the five history lists behind the pane's Type filter.
 *
 * EVERY ONE IS AUTHENTICATED AND EVERY ONE IS EMPTY HERE, and for once that is not a compromise:
 * the capture shows the site's own "Stay tuned-something's coming!" state, so an empty list is
 * the correct rendering rather than a stand-in for one. `/user/amount/change/record/` answers
 * **403** (checked — not the 6002 the payment paths give), and the other four are the history
 * feeds of panes whose writes are equally shut.
 *
 * The shapes below are the row renderers' own field accesses, not a captured payload — that is
 * what a call site can rely on when the API flag flips, and it is why they are written out
 * rather than left as bare `[]`.
 *
 *   Bill      changeTypeDesc, changeTypeDetail, createTime, currencyName, amountLogId,
 *             generalChangeAmount, bonusChangeAmount, beforeGeneralChangeAmount,
 *             beforeBonusChangeAmount, changeType, relatedId, gameId, gameUnique
 *   the rest  their own, and none is built — see the note at the list components.
 *
 * `{ list, totalPage }` is the envelope all five share; the pane pages through it 20 at a time.
 */

const EMPTY_PAGE = { list: [], totalPage: 0 };

/* `y.useBill` — `POST /user/amount/change/record/` with the filter state as its body. The
 * arguments are the pane's four Bill-relevant filters resolved to values:
 *
 *   { beginTime, endTime, pageSize: 20, currencyName, changeTypeName, page }
 *
 * `beginTime`/`endTime` come from the time filter through `timeRange`'s `r()`, `currencyName` is
 * the Assets filter (empty string for All), and `changeTypeName` is the Bill Type filter — or the
 * literal `"Bonus"` when the Type filter is set to Bonus, which is how that type is served
 * without a list of its own.
 */
const PAGE_SIZE = 20;

/* ── The Bill tab against the platform ─────────────────────────────────────────────────────
 *
 * `GET /user/wallet/ledger` IS THE BILL FEED, and picking it took a probe rather than a reading:
 * `/user/history` is the obvious-looking name and turns out to be **deposits and withdrawals
 * only** — on an account with real activity it answers `{deposits: {count: 0}, withdrawals:
 * {count: 0}}` while the ledger carries every movement. A swap writes two ledger rows,
 * `TRANSFER_OUT` then `TRANSFER_IN`, each with a `description` ("Swap INR -> USDT") and the
 * balance after it.
 *
 * TWO OF THE PANE'S FOUR FILTERS CANNOT BE SENT, and neither is mapped onto the nearest-looking
 * parameter:
 *
 *   assets     → `currency`. Sent, and the only one that reaches the server.
 *   bill type  → the ledger's axis is `reason`, ONE of thirteen values (`BET_STAKE`,
 *                `TRANSFER_IN`, `BONUS`, …), where this filter's options are CATEGORIES — Game,
 *                Affiliate, Vault, Swap. "Game" is four reasons and "Swap" is two, so there is no
 *                value to send. Left unsent rather than approximated.
 *   time       → the ledger takes no date range at all. Filtering the fetched page here instead
 *                would show fewer rows than the pager counts, which reads worse than a control
 *                that does nothing.
 *   status     → not a Bill filter; the pane hides it for this type.
 *
 * Both gaps are the platform being narrower than bc.game, and both are visible rather than
 * silently wrong. `/casino/bet-history` DOES take `from`/`to`, which is why the time filter works
 * on that pane and not this one.
 */
/* The call site still passes `beginTime`, `endTime` and `changeTypeName` — the pane's reader is
   keyed on all of them and re-fetches when any moves — and they are not destructured here because
   there is nothing to send them to. Put them back in the signature the day the ledger grows a date
   range or a category axis; the caller needs no change either way. */
export function getBillRecords({ currencyName, page = 1 }) {
  const answer = requestPage(PLATFORM.user.wallet.ledger, {
    live: true,
    params: {
      /* The platform keys money by BARE code; `All` is the pane's own "no filter" sentinel and
         must not be sent as a currency. */
      currency: currencyName ? String(currencyName).replace(/FIAT$/, '') : undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    },
    /* bc.game's own call is `POST /user/amount/change/record/` with the whole filter set in the
       body — `{beginTime, endTime, pageSize, currencyName, changeTypeName, page}` — recorded at
       `ENDPOINTS.transaction.billRecord`. It answers 403. */
    fixture: EMPTY_PAGE,
  });

  /* THE MAPPER RUNS ON BOTH ARMS. `requestPage` normalises its FIXTURE too — it answers
     `{rows, pagination}` either way — so returning the fixture untouched would hand the pane a
     shape it has never read. Caught by the fixtures-on pass, which is what that pass is for. */
  return answer && typeof answer.then === 'function' ? answer.then(toBillPage) : toBillPage(answer);
}

/**
 * A ledger page onto the Bill table's own rows.
 *
 * THE BEFORE-BALANCE IS DERIVED AND THE ARITHMETIC IS THE PANE'S OWN, which is what makes this a
 * mapping rather than an invention. The table computes
 *
 *   change  = generalChangeAmount + bonusChangeAmount
 *   balance = beforeGeneralChangeAmount + beforeBonusChangeAmount + both change amounts
 *
 * and the ledger row carries `amount` and the balance AFTER it. So `before = balance - amount`
 * makes the table's second line come out at exactly the ledger's own `balance`, with no rounding
 * of its own. The bonus half is zero throughout: the platform's ledger has no bonus/general split,
 * and splitting one invented figure across two columns would put a number on screen that no row
 * anywhere holds.
 */
function toBillPage({ rows, pagination }) {
  return {
    list: (rows ?? []).map((row) => {
      const amount = Number(row.amount) || 0;
      const balance = Number(row.balance) || 0;

      return {
        amountLogId: row.id,
        /* The table reads `new Date(Number(createTime))`, so this has to be epoch ms — the ledger
           sends an ISO string. */
        createTime: row.created_at ? Date.parse(row.created_at) : 0,
        currencyName: isFiatCode(row.currency) ? `${row.currency}FIAT` : row.currency,
        /* `description` is written per movement ("Swap INR -> USDT") and is the better label; the
           `reason` enum is the fallback and is what the detail line shows either way. */
        changeTypeDesc: row.description || row.reason || '',
        changeTypeDetail: row.reason || '',
        changeType: row.reason || '',
        generalChangeAmount: String(amount),
        bonusChangeAmount: '0',
        beforeGeneralChangeAmount: String(balance - amount),
        beforeBonusChangeAmount: '0',
        /* The three the row's link affordances read. None is built — see the header note — and
           they are written as null rather than omitted so a renderer that grows one finds the
           field rather than `undefined`. */
        relatedId: null,
        gameId: null,
        gameUnique: null,
      };
    }),
    totalPage: pagination?.totalPages ?? 0,
  };
}

/* The other four. Each is the history feed of the pane that writes it, so the paths live in those
   groups rather than being duplicated into `transaction`. All four take the same time/asset
   window and all four answer nothing here. */
/* ── DEPOSIT AND WITHDRAW HISTORY ──────────────────────────────────────────────────────────────
 *
 * `GET /user/history/deposits` and `/withdrawals`, each a merge of several rails into one shape —
 * see the note in `endpoints.js`. Three things about the adaptation:
 *
 * **THE DATE RANGE REACHES THE SERVER HERE, WHERE THE BILL TAB'S DOES NOT.** These two take
 * `from`/`to` as ISO-8601 and the wallet ledger takes no date filter at all, which is why the
 * pane's Time control is live on two of its five tabs and inert on the third. The 60-day clamp in
 * front of it is bc.game's own and is applied by the call site, as it always was.
 *
 * **`status` IS SENT AS THE WORD THE PLATFORM NORMALISES TO**, not as this pane's filter value.
 * The filter stores bc.game's own vocabulary (`success`/`progress`/`fail`/`cancel`/`refunded`) and
 * the platform matches on `approved`/`pending`/`failed` and whatever text a rail stores. Mapping
 * one onto the other for the REQUEST is the mirror of the code adapter in `Transaction/status.js`
 * and lives beside it for that reason; an unmapped filter value is dropped rather than guessed at,
 * which shows every row instead of silently showing none.
 *
 * **THE ROW SHAPE IS BC.GAME'S AND FOUR FIELDS ARE DELIBERATELY LEFT OFF.** `mode` gates the fiat
 * UTR-verification line, and `ticketId`/`unReadMsgCount`/`ticketStatus` gate the support-ticket
 * chip — both are bc.game features with no platform equivalent, and leaving the fields absent is
 * what makes the two `<Show>`s in the rows correctly render nothing. `receiveAmount` is set equal
 * to `amount` because the platform reports one figure: a deposit row prints `receiveAmount` once
 * it succeeds and `amount` before, and equal values keep that arm honest rather than inventing a
 * difference between what was sent and what arrived.
 */
const REQUEST_STATUS = {
  success: 'approved',
  progress: 'pending',
  fail: 'failed',
  cancel: 'cancelled',
  refunded: 'refunded',
};

const toHistoryPage = ({ rows, pagination }) => ({
  page: pagination?.page ?? 1,
  pageSize: pagination?.limit ?? 20,
  total: pagination?.total ?? rows.length,
  totalPage: pagination?.totalPages ?? 1,
  list: rows.map((row) => ({
    orderId: String(row.reference ?? row.id ?? ''),
    createTime: row.date ? Date.parse(row.date) : 0,
    amount: String(row.amount ?? '0'),
    receiveAmount: String(row.amount ?? '0'),
    currencyName: isFiatCode(row.currency) ? `${row.currency}FIAT` : (row.currency ?? ''),
    status: row.status,
    /* `method` IS CARRIED FOR ONE REASON: THE IDS COLLIDE ACROSS RAILS. `/user/history/withdrawals`
       merges `withdrawals` (crypto) and `fiat_withdrawals` (manual), two tables with independent
       sequences, into one list keyed by `id` — and `reference` is null on both, so `orderId` IS
       that id. Two rows can therefore share an orderId while belonging to different tables, and
       `/wallet/withdraw-detail?orderId=1` cannot say which one it means. The detail link adds
       `rail` for that, which is this build's parameter and not the original's; see
       `modals/WithdrawDetail`. Deposits do not need it — only the fiat rail has a detail read. */
    method: row.method ?? '',
  })),
});

const historyQuery = ({ beginTime, endTime, currencyName, status, page = 1, pageSize = 20 }) => ({
  limit: pageSize,
  offset: (page - 1) * pageSize,
  ...(beginTime ? { from: new Date(Number(beginTime)).toISOString() } : {}),
  ...(endTime ? { to: new Date(Number(endTime)).toISOString() } : {}),
  ...(currencyName ? { currency: String(currencyName).replace(/FIAT$/, '') } : {}),
  ...(REQUEST_STATUS[status] ? { status: REQUEST_STATUS[status] } : {}),
});

const history = (path, options) =>
  requestPage(path, { live: true, params: historyQuery(options), fixture: EMPTY_PAGE }).then(
    (page) => (Array.isArray(page?.rows) ? toHistoryPage(page) : page),
  );

export const getDepositRecords = (options = {}) =>
  USE_FIXTURES
    ? request(ENDPOINTS.deposit.history, { method: 'POST', fixture: EMPTY_PAGE })
    : history(PLATFORM.user.history.deposits, options);

export const getWithdrawRecords = (options = {}) =>
  USE_FIXTURES
    ? request(ENDPOINTS.withdraw.history, { method: 'POST', fixture: EMPTY_PAGE })
    : history(PLATFORM.user.history.withdrawals, options);

export const getSwapRecords = () =>
  request(ENDPOINTS.swap.history, { method: 'POST', fixture: EMPTY_PAGE });

export const getBuyCryptoRecords = () =>
  request(ENDPOINTS.buyCrypto.history, { method: 'POST', fixture: EMPTY_PAGE });

/* `timeRange-Chxugo4p.js`, ported whole — it is thirty lines and the pane's whole notion of time.
 *
 * A range is stored as ONE STRING, either `preset:<ms>` or `<start>-<end>`, which is what lets
 * the filter live in sessionStorage and in the URL as a scalar. `r()` resolves it against the
 * server clock; `c()` clamps it to the type's maximum window (60 days for Deposit/Withdraw,
 * 90 for everything else) and falls back to one day whenever the string is malformed.
 *
 * `serverTime` on the original is the account store's clock, kept in step with the server. There
 * is no such feed here, so it is the browser's — the one place this file diverges, and it only
 * matters for a range that straddles a clock skew.
 */
export const TIME_RANGE = {
  ONE_DAY: 864e5,
  SEVEN_DAYS: 6048e5,
  THIRTY_DAYS: 2592e6,
  SIXTY_DAYS: 5184e6,
  NINETY_DAYS: 7776e6,
};

const PRESET = 'preset:';

export const presetRange = (ms) => `${PRESET}${ms}`;
export const defaultRange = () => presetRange(TIME_RANGE.ONE_DAY);

/* `E`/`r` — resolve to `[begin, end]`. */
export function resolveRange(value) {
  const now = Date.now();
  if (String(value).startsWith(PRESET)) {
    const span = Number(String(value).slice(PRESET.length));
    return [now - (Number.isFinite(span) && span > 0 ? span : TIME_RANGE.ONE_DAY), now];
  }
  const [start, end] = String(value).split('-').map(Number);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return [now - TIME_RANGE.ONE_DAY, now];
  }
  return [start, end];
}

/* `m`/`c` — clamp to `max`. A preset longer than the cap collapses to the cap; a custom range is
   rejected outright (back to one day) if it is longer than `max + 1 day`, starts before
   `now - max - 1 day`, or ends more than a day in the future. The extra day is the original's own
   slack and is not a rounding error. */
export function clampRange(value, max) {
  const text = String(value);
  if (text.startsWith(PRESET)) {
    const span = Number(text.slice(PRESET.length));
    if (!Number.isFinite(span) || span <= 0) return presetRange(TIME_RANGE.ONE_DAY);
    return span > max ? presetRange(max) : text;
  }
  const [start, end] = text.split('-').map(Number);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    return presetRange(TIME_RANGE.ONE_DAY);
  }
  const now = Date.now();
  const slack = TIME_RANGE.ONE_DAY;
  if (end - start > max + slack || start < now - max - slack || end > now + slack) {
    return presetRange(max);
  }
  return text;
}
