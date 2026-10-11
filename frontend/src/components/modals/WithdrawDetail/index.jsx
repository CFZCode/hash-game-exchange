import React from 'react';
import RouteDialog from '../../shared/RouteDialog';
import Loading from '../../shared/Loading';
import EmptyPlaceholder from '../../shared/EmptyPlaceholder';
import { getWithdrawal } from '../../../services/withdrawal';

/* `/wallet/withdraw-detail?orderId=…` — `DialogTransactionWithDrawDetail` in the route registry,
 * and the sibling of the deposit detail. Both links have existed since the Transaction pane was
 * built and both fell through to Home; this is the second of the two.
 *
 * Like the deposit detail, it is NOT a port. bc.game's is written for their payment-order model,
 * and this platform has two rails that share no shape: `withdrawals` (crypto) and
 * `fiat_withdrawals` (manual bank transfer). `services/withdrawal.js` carries that argument.
 *
 * ── `rail` IS THIS BUILD'S PARAMETER, AND IT IS FORCED ────────────────────────────────────────
 *
 * The two tables have independent id sequences, and `/user/history/withdrawals` merges them keyed
 * on `id` with `reference` null on both — so `orderId` IS that id and two rows can share it. The
 * original's link carries only `?orderId=`, which on this platform cannot say which table it
 * means. The pane's row appends `&rail=` from the merged row's own `method`.
 *
 * A link that arrives without one still resolves: `isCryptoRail` reads anything but `crypto` as
 * fiat, so a hand-typed URL lands on the manual rail rather than erroring.
 */

const STATUS_TONE = {
  approved: 'text-brand',
  completed: 'text-brand',
  pending: 'text-warning',
  processing: 'text-warning',
  rejected: 'text-error',
  failed: 'text-error',
};

function Row({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-start justify-between gap-x-4 border-b border-third py-3 last:border-b-0">
      <span className="flex-none text-sm text-secondary">{label}</span>
      <span className="break-all text-right text-sm font-semibold text-primary">{value}</span>
    </div>
  );
}

export default function WithdrawDetailDialog({ onClose, onBack, enter }) {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId') ?? '';
  const rail = params.get('rail') ?? '';

  const [state, setState] = React.useState({ loading: true, found: null });

  React.useEffect(() => {
    let live = true;
    getWithdrawal(orderId, rail).then((found) => {
      if (live) setState({ loading: false, found });
    });
    return () => {
      live = false;
    };
  }, [orderId, rail]);

  const { loading, found } = state;
  const record = found?.record;
  const crypto = found?.rail === 'crypto';

  const status = record?.status;
  const tone = STATUS_TONE[String(status).toLowerCase()] ?? 'text-primary';

  return (
    <RouteDialog title="Withdrawal Detail" onClose={onClose} onBack={onBack} enter={enter}>
      <div className="relative pt-4">
        {loading ? (
          <div className="center flex h-80 w-full">
            <Loading />
          </div>
        ) : !record ? (
          <EmptyPlaceholder>No details for this withdrawal</EmptyPlaceholder>
        ) : (
          <>
            <div className="rounded-xl bg-layer4 px-3 pb-3">
              <Row
                label="Amount"
                value={`${record.amount} ${crypto ? record.coin : record.currency}`}
              />
              <Row label="Status" value={<span className={tone}>{status}</span>} />

              {crypto ? (
                <>
                  <Row label="Network" value={record.chain} />
                  {/* Masked by the service — `0x1234…5678`. Shown as it comes rather than
                      re-formatted, so what is on screen is what the server chose to reveal. */}
                  <Row label="Address" value={record.wallet} />
                  <Row label="Transaction ID" value={record.txid} />
                </>
              ) : (
                <>
                  <Row label="Account holder" value={record.accountHolderName} />
                  <Row label="Bank" value={record.bankName} />
                  <Row label="UPI ID" value={record.upiId} />
                </>
              )}

              <Row
                label="Requested"
                value={(() => {
                  const when = crypto ? record.date : record.requestedAt;
                  return when ? new Date(when).toLocaleString() : null;
                })()}
              />
            </div>

            {/* `note` USED TO BE STAFF-ONLY, so this screen could show a rejected status and no
                reason — where a rejected fiat DEPOSIT explains itself through `adminComment`. The
                crypto rail now sends it to the record's owner (gap 26), and `decidedBy` /
                `decidedAt` stay internal. The fallback line below is kept for a rejection that
                carries no note at all, which is a reviewer leaving it blank rather than the
                platform withholding it. */}
            {record.note ? (
              <div className="mt-4 rounded-xl bg-layer4 px-3 py-3">
                <p className="input-label">Note from review</p>
                <p className="mt-1 text-sm text-warning">{record.note}</p>
              </div>
            ) : String(status).toLowerCase() === 'rejected' ? (
              <p className="mt-4 text-xs text-secondary">
                No reason was recorded for this decision. Contact support with the details above.
              </p>
            ) : null}

            <div className="pb-6" />
          </>
        )}
      </div>
    </RouteDialog>
  );
}
