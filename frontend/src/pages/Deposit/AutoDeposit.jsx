import React from 'react';
import { IconInform, IconLink } from '../../components/shared/icons';
import { toastError } from '../../components/shared/Toast/toast';
import { printCurrency } from '../../utils/currency';
import { createF2payDeposit, extraBonusAmount } from './deposit';

/* The automatic INR deposit through F2Pay — THIS BUILD'S, like ManualDeposit beside it: the player
 * enters the amount and is sent to F2Pay's cashier page to pay by UPI. Nothing is filed afterwards:
 * F2Pay's signed callback credits the wallet. FiatTab offers it next to the manual form while F2Pay
 * is configured and switched on (`readF2payCurrencies`). Every class is ManualDeposit's own. */
export default function AutoDeposit({ currency }) {
  const coin = String(currency).toUpperCase().replace(/FIAT$/, '');
  const walletCode = `${coin}FIAT`;
  const [amount, setAmount] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  // FiatTab mounts the first-deposit terms read; zero below the bonus minimum, so the line disappears.
  const extra = extraBonusAmount(amount, walletCode);
  const fiat = (value) => printCurrency(value, walletCode, { target: walletCode });

  const submit = async (event) => {
    event.preventDefault();
    if (!(Number(amount) > 0) || busy) return;
    setBusy(true);
    try {
      const order = await createF2payDeposit({ currency: coin, amount });
      if (!order?.redirectUrl) throw new Error('The payment page did not open. Please try again.');
      // Stays busy: the page is leaving for F2Pay, which sends the player back when paid.
      window.location.assign(order.redirectUrl);
    } catch (failure) {
      toastError(failure, 'Could not start the deposit');
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="my-4 flex rounded-xl bg-success/10 p-2 text-secondary">
        <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-success" />
        <div>Enter the amount and pay by UPI on the payment page that opens. Your balance is credited automatically once the payment is confirmed.</div>
      </div>

      <div className="mb-1 mt-5 text-secondary">Deposit Amount ({coin})</div>
      <div className="input bg-input_bright text-base">
        <input inputMode="decimal" name="amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
        {extra > 0 && <div className="px-2 font-extrabold text-success">Extra +{fiat(extra)}</div>}
      </div>

      <button type="submit" className="button button-brand button-m my-5 w-full" disabled={!(Number(amount) > 0) || busy}>
        {busy ? 'Loading…' : 'Deposit'}
        {!busy && <IconLink className="icon ml-1 size-4" />}
      </button>
    </form>
  );
}
