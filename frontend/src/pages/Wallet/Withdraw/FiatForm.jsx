import React from 'react';
import { Link } from 'react-router-dom';
import Select from '../../../components/shared/Select';
import PopCenter from '../../../components/shared/PopCenter';
import Notice from '../../../components/shared/Notice';
import { IconArrow, IconClose, IconInform } from '../../../components/shared/icons';
import { showToast } from '../../../components/shared/Toast/toast';
import { useSession } from '../../../context/session';
import useResource from '../../../hooks/useResource';
import { USE_FIXTURES } from '../../../services/client';
import { getAlias } from '../../../utils/currency';
import { channelIcon } from '../../../utils/channelArt';
import {
  FIAT_METHODS,
  FIAT_WITHDRAW_MINIMUM,
  getBankAccounts,
  getWithdrawRequirements,
  submitFiatWithdraw,
  withdrawErrorMessage,
} from '../../../services/withdraw';
import { AmountField, AvailableRow } from './index';

/* THE FIAT ARM — `Wa` -> `oa` -> `ca` -> `qe` -> `ua` in index-B3pypdyg.js, with the field
 * components `Nr` / `Oe` / `tr` out of Banner-TuTj1pp2.js (both off `hash.game/assets/`).
 * Reached, as on the original, by a FIAT wallet currency (`W.state.isFiat`).
 *
 * The original's order, kept: the Withdraw Method select (`qn`), then the method's form (`Nr`:
 * its `kycItem` fields, here the saved-account select `Oe` and, for new details, `tr` text
 * fields), then `mt` — the same amount block (`it`) and Available row (`ut`) the crypto form
 * uses — then the Withdraw button. NO CONFIRM STEP: `zt` in Banner is `(e) => e()`, so the
 * original submits straight away and, on success, toasts and pushes `wr`, the "go to
 * Transaction" pop. That is reproduced.
 *
 * WHAT IS THIS BUILD'S, because the platform is not bc.game's payment service:
 *   - the two methods (UPI, Bank Transfer) and their fields — bc.game reads both from
 *     `/payment/withdraw/fiat/<cur>/methods/` and a per-method `kycItem` list;
 *   - "Add New Bank Account" opens the fields inline rather than navigating to `/wallet/bank`,
 *     which is not built here;
 *   - the requirement notice above the form (`GET /user/withdrawals/requirements`) and the
 *     "Forfeit bonus and withdraw" retry — bc.game has no forfeit step;
 *   - a refused submit shows the platform's message in an error notice above the button, where
 *     the original only toasts it.
 */

/* `rr` in Banner — the bank-account mark the original draws beside a saved account. */
const BANK_ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAkCAYAAAAKNyObAAAACXBIWXMAABYlAAAWJQFJUiTwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAE8SURBVHgB7ZfhbYMwEIXPVf+XERihIzBCNyidoN2gI7QbpCO0Ezgj0AlggyQTXN4lRrKIEdaJxI7kT3qynbPRy8Ghg2glmLmBrFNLqYGJCvqEdnxJD22gmm6Jl6VY7FWzuZClWPpVs6nIUiyWNdnkdbIUS88x2eTrZSkWy142DRYVxnfoA6ooDwZoK+YaTCxlyANlzHhbX9z6FWooLb/Qn0yM/yufK0aevSdKwwH6NsYMsjBzuzhQ2uMhl+1p8ewR38+dXYqP115EDofq3Iu3odeAF7eBeOvFQ9RTH1kXRDGnpZjTUsxpKea0FHNaijkteXfC/sK1LV+QjM+B/Vs31k4+0qt1bi5np/1e5/YIDc1f+y3Y28HcD6dnM/p5nPgbvH+Qin+6B07PHJ9b7Jryoisf1VqkIKS8B8qQI0l9L+fXXd5UAAAAAElFTkSuQmCC';

const NEW = 'new';

const accountLabel = (row) =>
  row.method === 'upi' ? row.upiId : [row.bankName, row.accountNumberMasked].filter(Boolean).join(' ');

const FIELDS = {
  upi: [
    { key: 'accountHolderName', label: 'Account Holder Name' },
    { key: 'upiId', label: 'UPI ID' },
  ],
  bank: [
    { key: 'accountHolderName', label: 'Account Holder Name' },
    { key: 'bankName', label: 'Bank Name' },
    { key: 'accountNumber', label: 'Account Number' },
    { key: 'ifscCode', label: 'IFSC Code' },
  ],
};

/* `tr` — one `kycItem` text field: `<div class="mt-5"><label class="text-secondary">` with the
   red asterisk when the item is required, then the site's `.input` at `text-base mt-1`. */
function TextField({ id, label, value, onChange }) {
  return (
    <div className="mt-5">
      <label htmlFor={id} className="text-secondary">
        {label}
        <span className="ml-1 text-error">*</span>
      </label>
      <div className="input mt-1 text-base">
        <input
          id={id}
          name={id}
          required
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

/* The deposit tabs' warning box, reused for what still blocks a withdrawal. */
function RequirementNotice({ children }) {
  return (
    <div className="my-4 flex rounded-xl bg-warning/10 p-2 text-secondary">
      <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-warning" />
      <div>{children}</div>
    </div>
  );
}

/* `wr` — the pop the original pushes after a fiat withdrawal is filed. No title; the copy is
   `wallet.trans.desc129`, and its Transaction link closes the pop on the way out. */
function SubmittedPop({ onClose }) {
  return (
    <PopCenter open onClose={onClose} label="Withdraw">
      <div className="space-y-4 text-center">
        <p className="text-gray-700">
          To check the result of withdraw, please go to
          <Link
            className="hover:text-brand-dark mx-1 text-brand underline transition-colors"
            to="/wallet/transaction?type=withdraw"
            onClick={onClose}
          >
            Transaction
          </Link>
          panel. Feel free to contact our customer service.
        </p>
        <button type="button" className="button button-brand button-m mx-auto w-40" onClick={onClose}>
          OK
        </button>
      </div>
    </PopCenter>
  );
}

export default function FiatForm({ currencyName }) {
  const { balances, refreshBalances, updateBalance } = useSession();
  const [method, setMethod] = React.useState(FIAT_METHODS[0].method);
  /* `null` = not chosen yet: the first saved account for the method, or new details when there
     is none — derived during render, so it follows the read when it lands. */
  const [choice, setChoice] = React.useState(null);
  const [fields, setFields] = React.useState({});
  const [amount, setAmount] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [done, setDone] = React.useState(false);

  /* Bumped after a submit so both reads run again — `useResource` refetches when its reader
     changes, and the reader is keyed on this. */
  const [version, setVersion] = React.useState(0);
  const readAccounts = React.useCallback(() => getBankAccounts(version), [version]);
  const readRequirements = React.useCallback(() => getWithdrawRequirements(version), [version]);
  const { data: accountsData } = useResource(readAccounts);
  const { data: requirements } = useResource(readRequirements);

  const accounts = (accountsData ?? []).filter((row) => row.method === method);
  const selected = choice ?? (accounts[0]?.id ?? NEW);
  const account = accounts.find((row) => row.id === selected);

  const row = balances.find((coin) => coin.currencyName === currencyName);
  const balance = Number(row?.generalAmount ?? row?.amount ?? 0) || 0;
  const min = FIAT_WITHDRAW_MINIMUM;
  const shownAmount = amount ?? min;

  const pickMethod = (next) => {
    setMethod(next);
    setChoice(null);
    setError(null);
  };

  const submit = (forfeitBonus = false) => {
    const destination = account
      ? { bankAccountId: account.id }
      : Object.fromEntries(
          FIELDS[method].map((field) => [field.key, String(fields[field.key] ?? '').trim()]),
        );
    setBusy(true);
    setError(null);
    submitFiatWithdraw({
      amount: String(shownAmount),
      currency: currencyName.replace(/FIAT$/, ''),
      ...destination,
      ...(forfeitBonus ? { forfeitBonus: true } : {}),
    })
      .then(() => {
        showToast(
          `Congratulations! Your withdrawal of ${shownAmount} ${getAlias(currencyName)} is in progress! For security purposes, any large or suspicious withdrawal amounts will be audited and manually processed. As always we appreciate your patience!`,
          { type: 'success' },
        );
        if (USE_FIXTURES && row) {
          updateBalance(currencyName, {
            amount: Math.max(Number(row.amount) - shownAmount, 0),
            generalAmount: Math.max(balance - shownAmount, 0),
          });
        }
        refreshBalances();
        setVersion((current) => current + 1);
        setFields({});
        setAmount(null);
        setDone(true);
      })
      .catch((reason) => setError({ code: reason?.code, message: withdrawErrorMessage(reason) }))
      .finally(() => setBusy(false));
  };

  const methodRow = FIAT_METHODS.find((item) => item.method === method);
  const methodIcon = (value) => (value === 'upi' ? channelIcon('upi') : BANK_ICON);
  const missing = requirements?.ok === false ? (requirements.missing ?? []) : [];
  const canForfeit =
    error?.code === 'BONUS_FORFEIT_REQUIRED' || (!!requirements?.bonusForfeitRequired && !!error);

  return (
    <>
      {/* `qn` — "Withdraw Method" over a popover button: the method's logo, its name, and the
          `button-input` chevron square. */}
      <div className="mb-1 mt-5 text-secondary">Withdraw Method</div>
      <Select
        value={method}
        options={FIAT_METHODS.map((item) => item.method)}
        onChange={pickMethod}
        title="Withdraw Method"
        className="not-full w-full justify-between border border-input bg-input_bright !pl-3"
        labelRender={() => (
          <div className="flex w-full items-center">
            <img className="h-5 w-auto" alt="payment method" src={methodIcon(method)} />
            <div className="ml-1 text-base">{methodRow?.name}</div>
            <div className="button-input center ml-auto size-6 rounded-lg">
              <IconArrow className="icon size-4 -rotate-90" />
            </div>
          </div>
        )}
      >
        {(value) => (
          <span className="flex items-center">
            <img className="mr-2 h-5 w-auto" alt="" src={methodIcon(value)} />
            {FIAT_METHODS.find((item) => item.method === value)?.name}
          </span>
        )}
      </Select>

      {missing.includes('kyc') && (
        <RequirementNotice>
          <Link className="underline" to="/settings/verify">
            Complete KYC verification
          </Link>{' '}
          before withdrawing.
        </RequirementNotice>
      )}
      {missing.includes('wager') && (
        <RequirementNotice>
          Wager {Number(requirements?.wager?.remaining ?? 0).toFixed(2)}{' '}
          {requirements?.wager?.currency ?? 'USD'} more to withdraw.
        </RequirementNotice>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(false);
        }}
      >
        {/* `Oe` — "Withdraw With", the saved-account select, with the original's "Add New Bank
            Account" row last. */}
        <div className="mt-5">
          <label className="text-secondary">Withdraw With</label>
          <Select
            value={selected}
            options={[...accounts.map((item) => item.id), NEW]}
            onChange={(value) => {
              setChoice(value);
              setError(null);
            }}
            title="Withdraw With"
            className="mt-1 w-full !justify-start bg-input_bright"
            labelRender={() =>
              account ? (
                <div className="flex w-full items-center justify-between">
                  <img alt="icon" className="size-6" src={BANK_ICON} />
                  <div className="nums">{accountLabel(account)}</div>
                </div>
              ) : (
                <div className="text-secondary">Please add bank account</div>
              )
            }
            optionRender={(value) =>
              value === NEW ? (
                <div className="mb-1 mt-5 flex cursor-pointer items-center justify-end">
                  <IconClose className="icon size-4 rotate-45" />
                  <div className="ml-1">Add New Bank Account</div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <img alt="icon" className="size-6" src={BANK_ICON} />
                  <div className="text-xs text-primary">
                    {accountLabel(accounts.find((item) => item.id === value) ?? {})}
                  </div>
                </div>
              )
            }
          >
            {(value) => value}
          </Select>
        </div>

        {!account &&
          FIELDS[method].map((field) => (
            <TextField
              key={field.key}
              id={field.key}
              label={field.label}
              value={fields[field.key] ?? ''}
              onChange={(value) => setFields((current) => ({ ...current, [field.key]: value }))}
            />
          ))}

        <AmountField
          amount={shownAmount}
          onAmount={setAmount}
          min={min}
          balance={balance}
          currency={currencyName}
          precision={2}
        />
        <AvailableRow currencyName={currencyName} unlocked={balance} className="mt-5" />

        {error && (
          <Notice type="error" className="mt-5 font-normal">
            {error.message}
          </Notice>
        )}
        {canForfeit && (
          <button
            type="button"
            className="button button-second button-m mt-2 w-full"
            disabled={busy}
            onClick={() => submit(true)}
          >
            Forfeit bonus and withdraw
          </button>
        )}

        <button
          type="submit"
          disabled={busy || balance < min}
          className="button button-brand button-m my-4 w-full"
        >
          Withdraw
        </button>
      </form>

      {done && <SubmittedPop onClose={() => setDone(false)} />}
    </>
  );
}
