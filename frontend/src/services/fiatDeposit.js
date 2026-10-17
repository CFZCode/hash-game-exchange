import { request } from './client';
import { PLATFORM } from './endpoints';

/* The manual fiat deposit — `GET /user/deposits/fiat`, its `/:id` and its `/:id/screenshot`.
 *
 * ── IT IS A DIFFERENT MODEL FROM bc.game's, AND THAT DECIDES WHAT IS BUILT ────────────────────
 *
 * bc.game's `/wallet/deposit-detail` is `DialogTransactionDepositDetail`, recovered as
 * `index-BFEy-_b7.js` off `hash.game/assets/`. It is built for its PAYMENT-ORDER model — the
 * screen talks to `/payment/order/apply/delay/bonus/` and is about a channel order that a provider
 * is processing. The platform has no such object. What it has is a MANUAL BANK TRANSFER: the
 * player says "I sent you money, here is the bank reference and a screenshot", and staff approve
 * or reject it with a comment.
 *
 * So the detail screen here is small and this build's, in the way the KYC form is, and for the
 * same reason — there is a route to port and nothing behind it that fits. `docs/wallet.md` records
 * that; what makes it worth building at all is the last field:
 *
 *   **`adminComment` IS THE ONLY PLACE A REJECTION IS EXPLAINED**, and nothing showed it. The
 *   Transaction pane lists the row through `/user/history/deposits`, which merges seven tables
 *   into one shape (`{id, reference, amount, currency, status, details, date, kind, method,
 *   type}`) and carries neither the comment nor the screenshot. A player whose deposit was
 *   rejected could see THAT it was and never why.
 *
 * ── THE TWO IDS ARE NOT THE SAME ID ───────────────────────────────────────────────────────────
 *
 * The row's link is the original's: `/wallet/deposit-detail?orderId=…`, and `orderId` is
 * `reference ?? id` — the BANK REFERENCE for a manual deposit (`DEMO-REF-0001`), not a number.
 * `/user/deposits/fiat/:depositId` wants the numeric id. There is no route that looks a deposit up
 * by reference, so the list is read and matched on `transactionId`, which is the same field the
 * merged history exposes as `reference`. The list is the visitor's own and paginated, so this is
 * one small read rather than a scan of anything.
 *
 * The screenshot is AUTHENTICATED, like the KYC document: it cannot go in an `<img src>` and is
 * fetched as a Blob and turned into an object URL the caller revokes. See `services/kyc.js`,
 * which carries the longer form of that argument.
 */

/**
 * The account's manual fiat deposits, newest first as the service orders them.
 * Answers `[]` rather than throwing, so a caller can render an empty state without a catch.
 */
export const getFiatDeposits = ({ limit = 25 } = {}) =>
  Promise.resolve(
    request(PLATFORM.user.fiatDeposits.list, { live: true, params: { limit }, fixture: [] }),
  )
    .then((rows) => (Array.isArray(rows) ? rows : []))
    .catch(() => []);

/**
 * One deposit, found by the reference the Transaction row links with.
 *
 * Falls back to matching the numeric `depositId` when the reference IS a number, which is what
 * `orderId` becomes for a row that had no reference of its own (`reference ?? id`).
 */
export const getFiatDepositByReference = (orderId) =>
  getFiatDeposits({ limit: 100 }).then(
    (rows) =>
      rows.find((row) => String(row.transactionId) === String(orderId)) ??
      rows.find((row) => String(row.depositId) === String(orderId)) ??
      null,
  );

/**
 * The proof-of-transfer image as an object URL, or null when there is none.
 * THE CALLER MUST `URL.revokeObjectURL` IT — same rule, and same reason, as the KYC document.
 */
export const readFiatDepositScreenshot = (depositId) =>
  Promise.resolve(
    request(PLATFORM.user.fiatDeposits.screenshot(depositId), { live: true, fixture: null }),
  )
    .then((blob) => (blob instanceof Blob ? URL.createObjectURL(blob) : null))
    .catch(() => null);

export default getFiatDepositByReference;

/* ── SUBMITTING A MANUAL DEPOSIT (direct players, when the site has it on) ─────────────────────
 *
 * The house's own receiving accounts are `GET /user/bank-details/:coin` (bank / UPI rows the site
 * admin enters under Bank details, `hasQrImage` for a QR at `/:id/qr`). The player transfers, then
 * files `POST /user/deposits/fiat` as multipart: amount, currency, `transactionId` (the bank
 * reference / UTR), which destination they paid (its bank / UPI fields) and the `screenshot`.
 * Staff approve or reject it in the admin (Transactions → Deposit → Manual). Not in `endpoints.js`
 * on purpose, the way `gates.js` keeps its one path: this file is the only reader. */
const BANK_DETAILS = (coin) => `/api/v1/user/bank-details/${encodeURIComponent(coin)}`;

/** The active house accounts for one fiat (`INR`), `[]` when there are none or the read fails. */
export const getBankDetails = (coin) =>
  Promise.resolve(request(BANK_DETAILS(coin), { live: true, fixture: [] }))
    .then((rows) => (Array.isArray(rows) ? rows : []))
    .catch(() => []);

/** One destination's QR as an object URL (caller revokes), or null. */
export const readBankQr = (coin, id) =>
  Promise.resolve(request(`${BANK_DETAILS(coin)}/${id}/qr`, { live: true, fixture: null }))
    .then((blob) => (blob instanceof Blob ? URL.createObjectURL(blob) : null))
    .catch(() => null);

/**
 * File the deposit. `destination` is the bank-details row the player paid into; only the fields the
 * validator declares are sent. Rejects with the platform's `{code, message}` (e.g.
 * MANUAL_DEPOSIT_DISABLED, DEPOSIT_NOT_FOR_AGENT_USERS, a duplicate reference).
 */
export function submitFiatDeposit({ amount, currency, transactionId, destination }, screenshot) {
  const form = new FormData();
  form.append('amount', String(amount));
  form.append('currency', currency);
  form.append('transactionId', transactionId);
  [['bankName', 'bankName'], ['accountNumber', 'accountNumber'], ['ifscCode', 'ifscCode'], ['accountHolderName', 'accountHolderName'], ['upiId', 'upiId']]
    .filter(([from]) => destination?.[from])
    .forEach(([from, to]) => form.append(to, destination[from]));
  if (screenshot) form.append('screenshot', screenshot, screenshot.name);
  return request(PLATFORM.user.fiatDeposits.list, { live: true, method: 'POST', body: form, fixture: null });
}
