import React from 'react';
import PopCenter from '../../../components/shared/PopCenter';
import Notice from '../../../components/shared/Notice';
import { IconCopy, IconHelp, IconInform } from '../../../components/shared/icons';
import { getAlias, printCurrency } from '../../../utils/currency';
import { coinIcon } from '../../../utils/coinArt';
import { showToast } from '../../../components/shared/Toast/toast';
import { submitCryptoWithdraw, withdrawErrorMessage } from '../../../services/withdraw';

/* `/wallet/withdraw/confirm` — `WithdrawConfirm-CIsgiYKs.js`, off `hash.game/assets/` (Sentry
 * release e303d2e9, the same as every other wallet chunk here), with `LabelItem-Dl3qFG9j.js`,
 * `Address-C1AQxsEX.js`, `FeeTip-C9tV3bdR.js` and `getWithdrawOrderStatus-D8AKKocq.js` beside it.
 * Every class list and string below is the chunk's; the strings are all in the i18n bundle.
 *
 * TWO DEPARTURES, both recorded rather than hidden:
 *
 *   the shell   the original is a ROUTE (`navigate("/wallet/withdraw/confirm", {state})`) whose
 *               root is `PageLayout title="Confirm Withdraw"`, so it is a dialog title bar over
 *               the body. Here it is `PopCenter` opened from the form's own state: the same
 *               title bar and card, without a route that would also need the form's state to
 *               survive a reload (the original sends a stateless visit back with `n(-1)`).
 *   the verify  `ke` asks `new-verify` for a WITHDRAW_ONE_STEP / TWO_STEPS flow (2FA or e-mail
 *               code) before posting. The platform's HTTP side asks for no verify flow, so no
 *               code is collected — the rule is to ask only what the backend needs.
 *
 * THE ERROR SLOT is the chunk's own: the notice under the rows is `type="info"` normally and
 * `type="error"` when the address check fails. A refused submit puts the platform's message in
 * that same slot (the original toasts it), so it stays in the dialog next to the button.
 */

/* `E` in LabelItem — `plain` drops the pill (`rounded-xl px-3 text-primary`).
   `!justify-between` where the chunk writes `justify-between`: this build's `.center` is
   UNLAYERED in index.css (it sets `justify-content: center`) and so beats any utility, which
   centred the label against its value. The bang restores the chunk's own result without moving
   `.center`, which every other page depends on where it is. */
function LabelItem({ label, children, hide, className = '' }) {
  if (hide) return null;
  return (
    <div className={`copy-item center mb-2 min-h-8 !justify-between ${className}`}>
      <div className="copy-label leading-normal text-secondary">{label}</div>
      <div className="copy-val notranslate center h-full !justify-between text-right">
        {children}
      </div>
    </div>
  );
}

/* `B` in Address-C1AQxsEX.js — the first four, the middle four and the last four characters
   in brand green, the rest plain; over 8 characters only the ends. Copy button at the right. */
function Address({ address, className = '' }) {
  const len = address.length;
  let parts;
  if (len > 13) {
    const l = Math.ceil(len / 2) - 2;
    parts = [
      [address.slice(0, 4), true],
      [address.slice(4, l), false],
      [address.slice(l, l + 4), true],
      [address.slice(l + 4, len - 4), false],
      [address.slice(len - 4), true],
    ];
  } else if (len > 8) {
    parts = [
      [address.slice(0, 4), true],
      [address.slice(4, len - 4), false],
      [address.slice(len - 4), true],
    ];
  } else {
    parts = [[address, false]];
  }
  return (
    <div className={`notranslate relative break-all pr-8 ${className}`}>
      {parts.map(([text, brand], index) =>
        brand ? (
          <span key={index} className="text-brand">
            {text}
          </span>
        ) : (
          <React.Fragment key={index}>{text}</React.Fragment>
        ),
      )}
      <button
        type="button"
        aria-label="Copy"
        className="button absolute right-0 top-1/2 -mt-2.5 h-auto"
        onClick={() => {
          navigator.clipboard?.writeText(address).then(
            () => showToast('Copied'),
            () => {},
          );
        }}
      >
        <IconCopy className="icon size-5" />
      </button>
    </div>
  );
}

/* `TruncateText-DTllWw0G.js` stands in the result card for both long values; not recovered
   further, so it is a middle truncation that keeps both ends readable, with the full value in
   the `title` (the original's own tooltip wrapper `T` carries it the same way). */
const truncate = (text = '') => (text.length > 16 ? `${text.slice(0, 6)}...${text.slice(-6)}` : text);

const formatted = (value, currencyName) =>
  `${printCurrency(value, currencyName, { target: currencyName, hasAlias: false })} ${getAlias(currencyName)}`;

/* `Ke` — the confirm card. */
export function WithdrawConfirm({ order, onClose, onSubmitted }) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);

  const submit = () => {
    setBusy(true);
    setError(null);
    submitCryptoWithdraw({
      currencyName: order.currencyName,
      address: order.address,
      memo: order.memo,
      amount: order.amount,
      fee: order.fee,
      chain: order.token?.chain,
    })
      .then((result) => {
        /* `$.success(c)` — the toast the original raises before it pushes the result card. */
        showToast(
          'Withdrawal in progress. Large or unusual withdrawals may require manual audits.',
          { type: 'success' },
        );
        onSubmitted(result);
      })
      .catch((reason) => setError(withdrawErrorMessage(reason)))
      .finally(() => setBusy(false));
  };

  return (
    <PopCenter open onClose={onClose} title="Confirm Withdraw">
      <div className="text-base sm:text-sm">
        <div className="mb-4 mt-4 border-b border-third pb-4 text-center">
          <div className="text-secondary">You&apos;ll receive</div>
          <div className="text-2xl font-extrabold">
            {formatted(order.receiveAmount, order.currencyName)}
          </div>
        </div>
        <LabelItem label="Network">
          <div className="rounded bg-[#31EE93]/20 px-2">{order.token?.label}</div>
        </LabelItem>
        <LabelItem label="Address">
          <Address className="val address" address={order.address} />
        </LabelItem>
        <LabelItem label="Memo" hide={!order.memo}>
          {order.memo}
        </LabelItem>
        <LabelItem
          label={
            <div className="flex items-center">
              <span className="mr-1">Fee</span>
              {/* `R` in FeeTip — `<div class="ml-1">` round IconHelp; its VIP-8 explainer pop is
                  the not-built fee-free withdrawal, so the mark is drawn and inert. */}
              <div className="ml-1">
                <IconHelp className="icon size-4" />
              </div>
            </div>
          }
        >
          {formatted(order.fee, order.currencyName)}
        </LabelItem>
        <LabelItem label="Withdraw Amount">
          <span className="text-brand">{formatted(order.showAmount, order.currencyName)}</span>
        </LabelItem>
        <Notice type={error ? 'error' : 'info'} className="mt-2 font-normal">
          {error ??
            'Ensure the address is correct and on the same network. Once confirmed, the transaction is non-refundable or non-cancellable.'}
        </Notice>
        <button
          type="button"
          className="button button-brand button-m mt-5 w-full"
          disabled={busy}
          onClick={submit}
        >
          Withdraw
        </button>
      </div>
    </PopCenter>
  );
}

/* `be` — the result card the original pushes once the order exists. `fe` picks its copy from the
   order: no `txId` and still processing is "processing"; a `txId` is "completed". The platform
   would only ever hand back a queued order here, so the processing arm is the one reached. The
   status mark is `getWithdrawOrderStatus`'s `orderClass` colour on its `txt`. */
const RESULT = {
  processing: { title: 'Your Withdrawal Has Been Submitted', showStatus: true, txFallback: 'Pending' },
  completed: { title: 'Your Withdrawal is Complete!', showStatus: false, txFallback: null },
};

export function WithdrawResult({ order, onDone }) {
  const data = order.commonData ?? {};
  const view = data.txId ? RESULT.completed : RESULT.processing;
  const status = { txt: 'Processing', orderClass: 'text-warning' };

  return (
    <PopCenter open onClose={onDone} title={<div className="ellipsis px-15">{view.title}</div>} label={view.title}>
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center text-3xl font-extrabold">
          <img className="mr-2 size-6" alt="coin icon" src={coinIcon(data.currencyName)} />
          {printCurrency(data.amount, data.currencyName, { target: data.currencyName, hasAlias: false })}
          <span className="ml-1">{getAlias(data.currencyName)}</span>
        </div>
      </div>
      <div className="mt-6 border-t border-third pt-5">
        {view.showStatus && (
          <LabelItem className="!mb-3" label="Status">
            <span className={status.orderClass}>{status.txt}</span>
          </LabelItem>
        )}
        <LabelItem className="!mb-3" label="Withdrawal Address" hide={!data.withdrawAddress}>
          <span className="flex items-center gap-1" title={data.withdrawAddress}>
            <span>{truncate(data.withdrawAddress)}</span>
            <IconInform className="icon size-4 flex-none cursor-help text-secondary" />
          </span>
        </LabelItem>
        <LabelItem className="!mb-3" label="Transaction ID">
          {data.txId ? (
            <span title={data.txId}>{truncate(data.txId)}</span>
          ) : (
            <span className={status.orderClass}>{view.txFallback}</span>
          )}
        </LabelItem>
      </div>
      <button type="button" className="button button-brand button-m mt-6 w-full" onClick={onDone}>
        Done
      </button>
    </PopCenter>
  );
}
