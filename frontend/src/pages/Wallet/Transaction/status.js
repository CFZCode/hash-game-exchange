/* The two order-status machines the Deposit and Withdraw rows read, plus the one adapter the
 * platform needs. `getDepositOrderStatus-CoPuz2eA.js` and `getWithdrawOrderStatus-D8AKKocq.js`,
 * both off `hash.game/assets/` and both tiny — so every string and every colour below is the
 * chunk's own.
 *
 * They are separate machines rather than one, and the difference is real: deposit switches on a
 * code and returns five booleans beside the text, withdraw groups its twenty-two codes into seven
 * outcomes. Only `txt` and `orderClass` are rendered by the rows; the booleans drive the detail
 * routes, which are not built, and are kept because a row's own arm reads one of them
 * (`isSuccess` decides which of two amounts a deposit prints).
 */

/* `f` — the deposit machine, verbatim. Note 3 and 4 are both Success and 1 and 2 both Processing:
   the rail decides which it reports and the page does not care. */
export function getDepositOrderStatus(status) {
  switch (Number(status)) {
    case 1:
    case 2:
      return { txt: 'Processing', isProgress: true, isSuccess: false, orderClass: 'text-warning' };
    case 3:
    case 4:
      return { txt: 'Success', isProgress: false, isSuccess: true, orderClass: 'text-success' };
    case 5:
      return { txt: 'Under Review', isProgress: true, isSuccess: false, orderClass: 'text-warning' };
    case 10:
      return { txt: 'Manual Credited', isProgress: false, isSuccess: true, orderClass: 'text-success' };
    case 20:
      return { txt: 'Credited', isProgress: false, isSuccess: true, orderClass: 'text-success' };
    case -2:
      return { txt: 'Canceled', isProgress: false, isSuccess: false, orderClass: 'text-error' };
    case -99:
      return { txt: 'Expired', isProgress: false, isSuccess: false, orderClass: 'text-error' };
    default:
      return { txt: 'Failed', isProgress: false, isSuccess: false, orderClass: 'text-error' };
  }
}

/* `x` — the withdraw machine. Twenty-two codes into seven outcomes, and three of those seven
   carry NO `orderClass` at all (Cancel, Partially Refunded, Refunded), so their text takes the
   cell's inherited colour rather than a status one. That is the chunk's, not an omission. */
const WITHDRAW_OUTCOMES = [
  { codes: [4], txt: 'Success', orderClass: 'text-success' },
  { codes: [10], txt: 'Manual Credited', orderClass: 'text-success' },
  { codes: [-1, -6, -7, -8, -9, -10, -11], txt: 'Failed', orderClass: 'text-error' },
  { codes: [1, 2, 3, 5, 6, 7, 8], txt: 'Processing', orderClass: 'text-warning' },
  { codes: [-5], txt: 'Cancel', orderClass: '' },
  { codes: [-12], txt: 'Partially Refunded', orderClass: '' },
  { codes: [-2, -3, -4], txt: 'Refunded', orderClass: '' },
];

export function getWithdrawOrderStatus(status) {
  const found = WITHDRAW_OUTCOMES.find((outcome) => outcome.codes.includes(Number(status)));
  return found ?? { txt: 'Unknown Status', orderClass: '' };
}

/* ── THE ADAPTER, AND WHY IT GOES THIS WAY ROUND ───────────────────────────────────────────────
 *
 * The platform normalises seven rails' status vocabularies down to WORDS — `approved`, `pending`,
 * `failed`, and whatever text a rail stores lower-cased — while both machines above switch on an
 * integer. Something has to translate, and there were two ways to do it: teach the rows to render
 * a word, or turn the word into the code that already means it.
 *
 * The second is what is written, because the machines are the SOURCE of this pane's status
 * vocabulary — the text, the colour, and the `isSuccess` that decides which amount a deposit row
 * prints. Rendering the platform's word directly would put strings on screen that no bc.game
 * status ever produced ("approved" where the site says "Success"), and would need a second colour
 * table beside the one already here.
 *
 * Only the three words `normaliseStatus` can actually produce are mapped, plus the handful a rail
 * stores as text and the platform passes through lower-cased. Anything unrecognised falls to the
 * machines' own default arm, which is "Failed" for a deposit and "Unknown Status" for a
 * withdrawal — their fallback, not ours.
 */
const DEPOSIT_CODE = {
  approved: 3,
  success: 3,
  completed: 3,
  credited: 20,
  pending: 1,
  processing: 1,
  review: 5,
  cancelled: -2,
  canceled: -2,
  expired: -99,
  failed: -1,
  rejected: -1,
};

const WITHDRAW_CODE = {
  approved: 4,
  success: 4,
  completed: 4,
  pending: 1,
  processing: 1,
  queued: 7,
  cancelled: -5,
  canceled: -5,
  refunded: -2,
  failed: -1,
  rejected: -1,
};

/* `?? 0` rather than `?? -1`: 0 is `Created` in the withdraw enum and falls through to "Unknown
   Status", and it is not a deposit code at all so it takes "Failed". Both are the machines' own
   answers for a status they do not recognise, which is what an unmapped word is. */
export const depositCodeFor = (word) => DEPOSIT_CODE[String(word ?? '').toLowerCase()] ?? 0;
export const withdrawCodeFor = (word) => WITHDRAW_CODE[String(word ?? '').toLowerCase()] ?? 0;
