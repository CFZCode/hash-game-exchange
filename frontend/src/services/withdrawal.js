import { request } from './client';
import { PLATFORM } from './endpoints';

/* The two withdrawal rails behind `/wallet/withdraw-detail`.
 *
 * THERE IS NO SINGLE WITHDRAWAL OBJECT on this platform. `withdrawals` is the crypto table and
 * `fiat_withdrawals` the manual one, each with its own columns, its own service and its own
 * presented shape; `/user/history/withdrawals` merges them for the list and keeps `method` to say
 * which is which. So a detail read has to pick a rail first, and the dialog is handed one.
 *
 * ── THE IDS COLLIDE, WHICH IS WHY THE LINK CARRIES A RAIL ─────────────────────────────────────
 *
 * Both tables have independent sequences and the merged history keys on `id` with `reference`
 * null on both rows — so `orderId` IS that id, and a crypto withdrawal and a fiat one can share
 * it. `?orderId=1` alone cannot say which table it means. `?rail=` is this build's parameter,
 * added for that and documented at the call site as not the original's.
 *
 * ── WHAT EACH RAIL WILL AND WILL NOT SHOW A PLAYER ────────────────────────────────────────────
 *
 *   fiat    `{withdrawalId, amount, currency, accountHolderName, bankName, upiId, status,
 *            requestedAt}`. `accountNumber` and `ifscCode` sit behind the service's `forStaff`
 *            gate and are not sent here.
 *   crypto  `{id, amount, coin, chain, wallet, status, txid, date}` with the WALLET MASKED to
 *            `0x1234…5678`, and `note` / `decidedBy` / `decidedAt` staff-only — SO A PLAYER
 *            CANNOT READ WHY A CRYPTO WITHDRAWAL WAS REJECTED. A rejected fiat DEPOSIT explains
 *            itself through `adminComment`; this one does not, and the dialog says so rather than
 *            leaving a blank where a reason should be.
 */

const rowsOf = (answer) => (Array.isArray(answer) ? answer : (answer?.rows ?? []));

/** `rail` is the merged history's own `method`: `crypto` for the coin table, anything else fiat. */
export const isCryptoRail = (rail) => String(rail ?? '').toLowerCase() === 'crypto';

/**
 * One withdrawal, by the id the Transaction row linked with and the rail it belongs to.
 * Answers `{ rail, record }` so the dialog knows which shape it is holding, or null.
 */
export function getWithdrawal(orderId, rail) {
  const crypto = isCryptoRail(rail);
  const path = crypto ? PLATFORM.user.withdrawals.crypto : PLATFORM.user.withdrawals.fiat;

  return Promise.resolve(request(path, { live: true, params: { limit: 100 }, fixture: [] }))
    .then((answer) => {
      const rows = rowsOf(answer);
      /* MATCH ON THE TXID TOO, and this was a real bug rather than belt and braces. The pane's
         `orderId` is `reference ?? id`, and on the crypto rail `reference` IS THE TXID — so any
         payout that has actually gone on chain links with its hash, not its row id, and matching
         `id` alone found nothing and drew the empty state. It went unnoticed because the seeded
         row used to verify this screen had `txid: null`, which is the one case where the two
         agree. Fiat's `reference` is always null, so `withdrawalId` is the whole of it there. */
      const record =
        (crypto
          ? rows.find((row) => String(row.txid ?? '') === String(orderId)) ??
            rows.find((row) => String(row.id) === String(orderId))
          : rows.find((row) => String(row.withdrawalId) === String(orderId))) ?? null;
      return record ? { rail: crypto ? 'crypto' : 'fiat', record } : null;
    })
    .catch(() => null);
}

export default getWithdrawal;
