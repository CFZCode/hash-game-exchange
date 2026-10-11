import { request, USE_FIXTURES } from './client';
import ENDPOINTS, { PLATFORM } from './endpoints';
import { isFiatCode } from '../utils/currency';

/* `/wallet/rollover` — the wagering-requirement ledger. Paths out of `Details-DZ3wUplM.js`, which
 * carries the page's whole API namespace and is barely minified.
 *
 * ALL FOUR ARE LOGIN-GATED AND ANSWER 6002, `types` included — checked rather than assumed, and
 * `types` was the one worth checking, because a list of bonus categories looks like the sort of
 * catalogue the `game/support` family hands out to anybody. It is not: it is scoped to the
 * account's own tasks. So the pane renders the site's empty state, which is what the capture shows,
 * and the Bonus Type filter is left with its seeded first entry — the original's own
 * `[{label: "Bonus Type", value: 0}]`, which is what it shows until the fetch lands.
 *
 * `cancel` is the row-detail dialog's action (`/wallet/roll-detail`), which is not built.
 */

const EMPTY_PAGE = { list: [], totalPage: 0 };

/* `I.useTaskList` — `POST /balance-controller/wager/task/list/`. `status` is sent only when set,
   which is why the filter stores the empty string and the body drops the key: `0` is the AllStatus
   enum member and would be a filter rather than the absence of one. */
/* ── THE PLATFORM HAS ONE TASK, NOT A LEDGER ─────────────────────────────────────────────────
 *
 * This page is written against bc.game's model: a paged list of BONUSES, each with its own
 * rollover, filtered by status and bonus type. The platform's requirement is ACCOUNT-WIDE and
 * derived from deposits — `target = approved deposits x wager_multiplier` — and nothing attaches
 * one to an individual bonus. `docs/backend-gaps.md` Part 4b.16 argues why a per-bonus table
 * would have been inventing a product concept rather than exposing one.
 *
 * So `GET /user/wager/tasks` answers a list of one, and this maps it onto the row shape the table
 * already renders. The result is a page that shows the visitor's real requirement instead of a
 * permanent empty state.
 *
 * ── WHAT THE FILTERS DO NOW, WHICH IS ALMOST NOTHING, AND HONESTLY ─────────────────────────
 *
 * `status` is applied HERE rather than sent, because one row is cheaper to filter than to ask
 * about twice. `type` and `bonusType` are dropped: the single task is a DEPOSIT rollover, so the
 * Bonus arm of the type filter correctly matches nothing, and there are no bonus categories to
 * filter by at all. The controls stay — they are the original's markup — and a filter that
 * selects nothing is the truthful outcome rather than a broken one.
 *
 * `totalPage` is 1 or 0. Paging past that returns nothing, which is what the table expects.
 */
const STATUS_BY_NAME = {
  in_progress: 2, // STATUS.Ongoning
  complete: 3, // STATUS.Done
};

const toTaskRow = (task, envelope) => ({
  taskId: task.id,
  /* `taskType` drives the label through `rolloverTypeLabel`, and `taskTypeDesc` is what it falls
     back to. The platform's `kind` is `deposit`; the description carries the multiplier because
     that is the whole of what distinguishes one account's requirement from another's. */
  taskType: TYPE.Deposit,
  taskTypeDesc: task.label ?? `Wager ${envelope.multiplier}x your deposits`,
  /* The FIRST approved deposit — the one that created the requirement. `0` would render as
     1 January 1970, so an absent date is left absent and the cell prints nothing. */
  createTime: task.since ? Date.parse(task.since) : null,
  /* THE TARGET, not the grant. bc.game's column is "the bonus as granted" and the platform has no
     grant — the amount that matters is what must be wagered. `currency` is `null` when the
     deposits behind it span more than one, which the component renders without a symbol rather
     than asserting a unit the total does not have. */
  originalAmount: task.target,
  /* THE PLATFORM SENDS A BARE CODE AND THIS BUILD KEYS ON THE WALLET ROW — `INR` against
     `INRFIAT`. Without the translation the coin-art lookup misses and the cell renders a
     BROKEN IMAGE beside the amount, which is what the first screenshot of this page showed
     while every service assertion passed. Same one-liner `betHistory.js` uses on the same
     problem; `isFiatCode` is the shared answer so the two cannot drift. */
  originalCurrencyName: task.currency
    ? (isFiatCode(task.currency) ? `${task.currency}FIAT` : task.currency)
    : '',
  status: STATUS_BY_NAME[task.status] ?? 0,
  /* `remark` only ever distinguishes a system cancellation on the original, and nothing here
     cancels. Left absent so the badge takes its plain arm. */
  remark: undefined,
  /* Carried for the detail dialog, which is not built — `navigate(..., { state: item })` passes
     the whole row, so anything extra rides along for free the day it is. */
  wagered: task.wagered,
  remaining: task.remaining,
  locked: task.locked,
});

export function getRolloverTasks({ status, type, bonusType, page = 1 }) {
  if (!USE_FIXTURES) {
    return Promise.resolve(
      request(PLATFORM.user.wagerTasks, { live: true, fixture: { tasks: [] } }),
    ).then((envelope) => {
      const rows = (envelope?.tasks ?? []).map((t) => toTaskRow(t, envelope ?? {}));
      const filtered = status ? rows.filter((r) => r.status === status) : rows;
      /* Page 2 of a one-row list is empty, which is what the table's own paging expects. */
      return { list: page > 1 ? [] : filtered, totalPage: filtered.length ? 1 : 0 };
    });
  }

  return request(ENDPOINTS.rollover.list, {
    method: 'POST',
    body: JSON.stringify({ status, type, bonusType, pageSize: 20, page }),
    fixture: EMPTY_PAGE,
  });
}

/* `I.getTypes(isBonus)` — the Bonus Type dropdown's options, `{taskType, taskTypeDesc}` rows
   appended after the seeded first entry. */
export function getRolloverTypes(isBonus = true) {
  return request(ENDPOINTS.rollover.types, {
    method: 'POST',
    body: JSON.stringify({ isBonus }),
    fixture: [],
  });
}

export const getRolloverDetail = (taskId) =>
  request(ENDPOINTS.rollover.detail, {
    method: 'POST',
    body: JSON.stringify({ taskId }),
    fixture: null,
  });

export const cancelRollover = (taskId) =>
  request(ENDPOINTS.rollover.cancel, {
    method: 'POST',
    body: JSON.stringify({ taskId }),
    fixture: null,
  });

/* `c` in Details — the page's four enums, verbatim. Worth writing out rather than inlining the
 * numbers, because three of them collide in ways that would be invisible otherwise:
 *
 *   Status.Cancelled is 4 and covers TWO renderings — "Canceled" normally and "Fully Used" when
 *   the row's `remark` is `cancel_by_system`. Same status, different word.
 *
 *   Type is the FILTER's axis (All / Deposit / Bonus) while TaskType is the ROW's
 *   (DepositBonus 3, SpecialDepositBonus 11). They are different scales that both live in fields
 *   called some variant of "type", and `A(isBuy, taskType, taskTypeDesc)` reads the second.
 *
 *   BonusType is a third, and its members are the six bonus sources the `types` call would name.
 */
export const STATUS = {
  AllStatus: 0,
  NotStarted: 1,
  Ongoning: 2,
  Done: 3,
  Cancelled: 4,
  Expired: 5,
};

export const TYPE = { AllType: 0, Deposit: 1, Bonus: 2 };

export const TASK_TYPE = { DepositBonus: 3, SpecialDepositBonus: 11 };

export const BONUS_TYPE = {
  NewbieTaskRewards: 2,
  DepositBonus: 3,
  FreeSpinWinnings: 4,
  LuckySpinBonus: 5,
  NewbieLuckSpinBonus: 6,
  EventBonus: 7,
};

/* `j` and `Xe` — the two static option tables. Note "Canceled/Fully Used" is ONE option covering
   both of that status's renderings, and that the American spelling is the bundle's. */
export const STATUS_OPTIONS = [
  { label: 'All Status', value: STATUS.AllStatus },
  { label: 'Not Started', value: STATUS.NotStarted },
  { label: 'Ongoing', value: STATUS.Ongoning },
  { label: 'Done', value: STATUS.Done },
  { label: 'Canceled/Fully Used', value: STATUS.Cancelled },
  { label: 'Expired', value: STATUS.Expired },
];

export const TYPE_OPTIONS = [
  { label: 'All Type', value: TYPE.AllType },
  { label: 'Deposit', value: TYPE.Deposit },
  { label: 'Bonus', value: TYPE.Bonus },
];

/* `$e`/`xe` — the status colour, and it is applied to a DOT rather than to the label: the dot is
   `fill: currentColor`, so the class colours both. `AllStatus`, `NotStarted` and `Expired` all
   share `text-secondary`, which is why the map is written out instead of being a switch on three
   cases. */
const STATUS_COLOR = {
  [STATUS.Cancelled]: 'text-error',
  [STATUS.Done]: 'text-success',
  [STATUS.Ongoning]: 'text-warning',
  [STATUS.AllStatus]: 'text-secondary',
  [STATUS.NotStarted]: 'text-secondary',
  [STATUS.Expired]: 'text-secondary',
};

export const statusColor = (status) => STATUS_COLOR[status] || 'text-secondary';

/* `b` inside the badge — the label, with the one branch that is not a table lookup. */
export function statusLabel(status, isSystemCancel) {
  if (status === STATUS.Cancelled) return isSystemCancel ? 'Fully Used' : 'Canceled';
  return (STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0]).label;
}
