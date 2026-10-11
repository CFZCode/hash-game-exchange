import React from 'react';
import RouteDialog from '../../shared/RouteDialog';
import Loading from '../../shared/Loading';
import EmptyPlaceholder from '../../shared/EmptyPlaceholder';
import { getFiatDepositByReference, readFiatDepositScreenshot } from '../../../services/fiatDeposit';

/* `/wallet/deposit-detail?orderId=…` — `DialogTransactionDepositDetail` in the route registry,
 * and the destination the Transaction pane's deposit rows have always linked to. The note there
 * said the route "is not built here, so they fall to [Home]"; this is that route.
 *
 * ── WHY THIS IS NOT A PORT OF THE ORIGINAL'S SCREEN ───────────────────────────────────────────
 *
 * bc.game's is `index-BFEy-_b7.js`, recovered off `hash.game/assets/`, and it is built for their
 * PAYMENT-ORDER model — the screen's own call is `/payment/order/apply/delay/bonus/`, i.e. it is
 * about a channel order a provider is processing, with a delay-bonus offer attached. The platform
 * has no such object: a fiat deposit here is a MANUAL BANK TRANSFER a player declares and staff
 * approve. Porting that screen would mean filling a payment-order layout with a bank-transfer
 * record, which is the mistake `services/kyc.js` argues against at greater length.
 *
 * So this is small and this build's, and it exists for one field the merged history does not
 * carry: **`adminComment`, the only place a rejection is explained**. `/user/history/deposits`
 * flattens seven tables into `{id, reference, amount, currency, status, details, date, kind,
 * method, type}` — no comment, no screenshot. A player could see that a deposit was rejected and
 * never why.
 *
 * The screenshot is authenticated, so it is fetched as a Blob and revoked on unmount, exactly as
 * the KYC document is.
 *
 * A CRYPTO ROW LANDS HERE TOO, since the pane links every deposit the same way and the platform's
 * fiat list is the only detail read there is. It gets the not-found state rather than a wrong one,
 * which is the honest answer until `/user/history/crypto/deposits` has a detail route of its own.
 */

const STATUS_TONE = {
  approved: 'text-brand',
  pending: 'text-warning',
  rejected: 'text-error',
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

export default function DepositDetailDialog({ onClose, onBack, enter }) {
  const orderId = new URLSearchParams(window.location.search).get('orderId') ?? '';

  const [state, setState] = React.useState({ loading: true, deposit: null });
  const [shot, setShot] = React.useState(null);

  React.useEffect(() => {
    let live = true;
    getFiatDepositByReference(orderId).then((deposit) => {
      if (live) setState({ loading: false, deposit });
    });
    return () => {
      live = false;
    };
  }, [orderId]);

  /* Only asked for when the record says there is one — `hasScreenshot` is on the row, so a
     missing image is never a request that 404s. Revoked on unmount: it is a photograph of
     somebody's bank statement. */
  React.useEffect(() => {
    const deposit = state.deposit;
    if (!deposit?.hasScreenshot) return undefined;
    let live = true;
    let made = null;
    readFiatDepositScreenshot(deposit.depositId).then((url) => {
      made = url;
      if (live && url) setShot(url);
      else if (url) URL.revokeObjectURL(url);
    });
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [state.deposit]);

  const { loading, deposit } = state;

  return (
    <RouteDialog title="Deposit Detail" onClose={onClose} onBack={onBack} enter={enter}>
      <div className="relative pt-4">
        {loading ? (
          <div className="center flex h-80 w-full">
            <Loading />
          </div>
        ) : !deposit ? (
          /* The pane links every deposit here, so a crypto row and an unknown reference take the
             same arm. `EmptyPlaceholder` is the site's own, as everywhere else. */
          <EmptyPlaceholder>No details for this deposit</EmptyPlaceholder>
        ) : (
          <>
            <div className="rounded-xl bg-layer4 px-3 pb-3">
              <Row label="Amount" value={`${deposit.amount} ${deposit.currency}`} />
              <Row
                label="Status"
                value={
                  <span className={STATUS_TONE[deposit.status] ?? 'text-primary'}>
                    {deposit.status}
                  </span>
                }
              />
              <Row label="Bank reference" value={deposit.transactionId} />
              <Row label="Bank" value={deposit.bankName} />
              <Row label="Account holder" value={deposit.accountHolderName} />
              <Row label="Account number" value={deposit.accountNumber} />
              <Row label="IFSC" value={deposit.ifscCode} />
              <Row label="UPI ID" value={deposit.upiId} />
              <Row
                label="Submitted"
                value={deposit.createdAt ? new Date(deposit.createdAt).toLocaleString() : null}
              />
            </div>

            {/* The reason a rejection can finally be read. `text-warning` is the tone the
                original's own notice band uses on this screen. */}
            {deposit.adminComment ? (
              <div className="mt-4 rounded-xl bg-layer4 px-3 py-3">
                <p className="input-label">Note from review</p>
                <p className="mt-1 text-sm text-warning">{deposit.adminComment}</p>
              </div>
            ) : null}

            {shot ? (
              <div className="mt-4">
                <p className="input-label">Proof of transfer</p>
                <a
                  href={shot}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex max-h-80 w-full items-center justify-center overflow-hidden rounded-xl bg-layer4 p-2"
                >
                  <img alt="proof of transfer" src={shot} className="max-h-72 max-w-full object-contain" />
                </a>
              </div>
            ) : null}

            <div className="pb-6" />
          </>
        )}
      </div>
    </RouteDialog>
  );
}
