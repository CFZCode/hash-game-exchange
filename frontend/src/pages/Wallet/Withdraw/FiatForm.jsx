import React from 'react';
import { Link } from 'react-router-dom';
import Select from '../../../components/shared/Select';
import PopCenter from '../../../components/shared/PopCenter';
import Notice from '../../../components/shared/Notice';
import { IconArrow, IconCheck, IconClose, IconInform } from '../../../components/shared/icons';
import { showToast } from '../../../components/shared/Toast/toast';
import { useSession } from '../../../context/session';
import { useGates } from '../../../context/gates';
import useResource from '../../../hooks/useResource';
import { USE_FIXTURES } from '../../../services/client';
import { getAlias } from '../../../utils/currency';
import { channelIcon } from '../../../utils/channelArt';
import {
  FIAT_METHODS,
  FIAT_WITHDRAW_MINIMUM,
  getBankAccounts,
  getWithdrawRequirements,
  readAutoWithdrawCurrencies,
  submitAutoWithdraw,
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
        <p className="text-secondary">
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

/* THIS BUILD'S — the automatic withdrawal's pop: F2Pay accepted the payout, nobody reviews it. */
function ApprovedPop({ amount, currencyName, onClose }) {
  return (
    <PopCenter open onClose={onClose} label="Withdraw">
      <div className="space-y-4 text-center">
        <IconCheck className="icon mx-auto size-12 fill-success" />
        <div className="text-lg font-extrabold text-primary">Withdrawal request approved successfully</div>
        <p className="text-secondary">
          {amount} {getAlias(currencyName)} is on its way to your bank account. If the bank payout fails, the amount
          comes back to your balance automatically. Track it in
          <Link
            className="hover:text-brand-dark mx-1 text-brand underline transition-colors"
            to="/wallet/transaction?type=withdraw"
            onClick={onClose}
          >
            Transaction
          </Link>
          .
        </p>
        <button type="button" className="button button-brand button-m mx-auto w-40" onClick={onClose}>
          OK
        </button>
      </div>
    </PopCenter>
  );
}

/* The Withdraw Method choice — THIS BUILD'S, like the deposit tab's: Manual (staff review, the form
   below) or Automatic (F2Pay pays the bank account straight away) when both are open; only one
   open = that one, no choice drawn. Same markup as FiatTab's "Deposit Method". */
export default function FiatForm({ currencyName }) {
  const gates = useGates();
  const manual = USE_FIXTURES || gates.manualWithdraw();
  const { data: autoCurrencies } = useResource(readAutoWithdrawCurrencies);
  const auto = (autoCurrencies ?? []).includes(currencyName.replace(/FIAT$/, ''));
  const [mode, setMode] = React.useState('manual');
  const shownMode = !auto ? 'manual' : !manual ? 'auto' : mode;

  // Manual switched off by the site admin and no automatic payout: no form at all.
  if (!manual && !auto) return autoCurrencies ? <RequirementNotice>Bank withdrawals are not available right now.</RequirementNotice> : null;

  return (
    <>
      {manual && auto && (
        <>
          <div className="mb-1 mt-5 text-secondary">Withdraw Type</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['manual', 'Manual'],
              ['auto', 'Automatic'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`button button-m h-10 ${shownMode === value ? 'button-brand' : 'button-second'}`}
                onClick={() => setMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
      {shownMode === 'auto' ? <AutoWithdraw currencyName={currencyName} /> : <ManualWithdraw currencyName={currencyName} />}
    </>
  );
}

const AUTO_FIELDS = [
  { key: 'account_name', label: 'Account Holder Name' },
  { key: 'account_number', label: 'Account Number' },
  { key: 'bank_code', label: 'IFSC Code' },
];

// shortcut: F2Pay's BANK_INR payout range as it refuses today ("amount should between 100.00 - 30000.00"), hard-coded; read it from the backend if F2Pay changes it.
const AUTO_MIN = 100;
const AUTO_MAX = 30000;

/* A refused payout's own sentence, plus which field the server named (422 INVALID_PAYOUT_DETAILS). */
const autoErrorMessage = (reason) => {
  const fields = reason?.fields ?? reason?.details?.fields ?? {};
  const named = Object.entries(fields)
    .map(([key, why]) => `${AUTO_FIELDS.find((f) => f.key === key)?.label ?? key} ${why}`)
    .join('; ');
  return named ? `${withdrawErrorMessage(reason)}: ${named}` : withdrawErrorMessage(reason);
};

/* The automatic withdrawal: bank details + amount, sent to F2Pay at once (BANK_INR). The amount
   leaves the balance on request; F2Pay's callback marks it paid, or refunds it if the payout fails.
   Every class is the manual form's own. */
function AutoWithdraw({ currencyName }) {
  const { balances, refreshBalances } = useSession();
  const [fields, setFields] = React.useState({});
  const [amount, setAmount] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [done, setDone] = React.useState(null);

  const row = balances.find((coin) => coin.currencyName === currencyName);
  const balance = Math.max(0, Number(row?.generalAmount ?? row?.amount ?? 0) || 0);
  const min = AUTO_MIN;
  const shownAmount = amount ?? min;

  const submit = (forfeitBonus = false) => {
    const value = Number(shownAmount);
    if (!(value >= AUTO_MIN && value <= AUTO_MAX)) {
      setError({ message: `Amount must be between ${AUTO_MIN} and ${AUTO_MAX.toLocaleString('en-IN')} ${getAlias(currencyName)}.` });
      return;
    }
    setBusy(true);
    setError(null);
    submitAutoWithdraw({
      currency: currencyName.replace(/FIAT$/, ''),
      amount: String(shownAmount),
      details: Object.fromEntries(AUTO_FIELDS.map((field) => [field.key, String(fields[field.key] ?? '').trim()])),
      forfeitBonus,
    })
      .then(() => {
        refreshBalances();
        setFields({});
        setAmount(null);
        setDone(shownAmount);
      })
      .catch((reason) => setError({ code: reason?.code, message: autoErrorMessage(reason) }))
      .finally(() => setBusy(false));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(false);
      }}
    >
      <div className="my-4 flex rounded-xl bg-success/10 p-2 text-secondary">
        <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-success" />
        <div>Paid straight to your bank account, no review. If the payout fails, the amount comes back to your balance automatically.</div>
      </div>

      {AUTO_FIELDS.map((field) => (
        <TextField
          key={field.key}
          id={`auto-${field.key}`}
          label={field.label}
          value={fields[field.key] ?? ''}
          onChange={(value) => setFields((current) => ({ ...current, [field.key]: value }))}
        />
      ))}

      {/* `balance` capped at F2Pay's maximum, so Max and the clamp on blur stop there. */}
      <AmountField amount={shownAmount} onAmount={setAmount} min={min} balance={Math.min(balance, AUTO_MAX)} currency={currencyName} precision={2} />
      <div className="mt-1 text-tertiary">Max: {AUTO_MAX.toLocaleString('en-IN')} {getAlias(currencyName)}</div>
      <AvailableRow currencyName={currencyName} unlocked={balance} className="mt-5" />

      {error && (
        <Notice type="error" className="mt-5 font-normal">
          {error.message}
        </Notice>
      )}
      {error?.code === 'BONUS_FORFEIT_REQUIRED' && (
        <button type="button" className="button button-second button-m mt-2 w-full" disabled={busy} onClick={() => submit(true)}>
          Forfeit bonus and withdraw
        </button>
      )}

      <button type="submit" disabled={busy || balance < min} className="button button-brand button-m my-4 w-full">
        {busy ? 'Loading…' : 'Withdraw'}
      </button>

      {done != null && <ApprovedPop amount={done} currencyName={currencyName} onClose={() => setDone(null)} />}
    </form>
  );
}

function ManualWithdraw({ currencyName }) {
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
  const bareCurrency = currencyName.replace(/FIAT$/, '');
  const readRequirements = React.useCallback(
    () => getWithdrawRequirements(bareCurrency, version),
    [bareCurrency, version],
  );
  const { data: accountsData } = useResource(readAccounts);
  const { data: requirements } = useResource(readRequirements);

  const accounts = (accountsData ?? []).filter((row) => row.method === method);
  const selected = choice ?? (accounts[0]?.id ?? NEW);
  const account = accounts.find((row) => row.id === selected);

  const row = balances.find((coin) => coin.currencyName === currencyName);
  const total = Number(row?.generalAmount ?? row?.amount ?? 0) || 0;
  // Open sports bets' stakes have already left `credits.inr` (sports-service walletUpdate), so the
  // wallet balance is what can be withdrawn — subtracting the exposure again would count it twice.
  const balance = Math.max(0, total);
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
      currency: bareCurrency,
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
            generalAmount: Math.max(total - shownAmount, 0),
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
  // An open deposit rollover blocks every withdrawal (WITHDRAW_WAGER_REQUIRED); bonus-only wagering
  // is cleared by the forfeit, so it does not block the button.
  const rollover = requirements?.wager?.deposit;
  const wagerBlocked = missing.includes('wager') && Number(requirements?.wager?.remainingAfterForfeit ?? 0) > 0;
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
          <Link className="underline" to="/settings/verification">
            Complete KYC verification
          </Link>{' '}
          before withdrawing.
        </RequirementNotice>
      )}
      {missing.includes('wager') && (
        <RequirementNotice>
          {wagerBlocked
            ? `Complete your wagering requirement before withdrawing — ${Number(rollover?.wagered ?? 0).toFixed(2)} of ${Number(rollover?.target ?? 0).toFixed(2)} ${rollover?.currency ?? 'USD'} wagered.`
            : `Wager ${Number(requirements?.wager?.remaining ?? 0).toFixed(2)} ${requirements?.wager?.currency ?? 'USD'} more to withdraw.`}
        </RequirementNotice>
      )}

      {/* The deposit cap (owner switch). Shown whenever it is on, since it bounds every
          withdrawal — at 0 it is also in `missing`. `wagerToRaise` is how much play lifts it. */}
      {requirements?.cap?.enabled && requirements.cap.remaining != null && (
        <RequirementNotice>
          You can withdraw up to {Number(requirements.cap.remaining).toFixed(2)}{' '}
          {requirements.cap.currency ?? bareCurrency} more
          {Number(requirements.cap.wagerToRaise) > 0 &&
            ` — wager ${Number(requirements.cap.wagerToRaise).toFixed(2)} ${requirements.cap.currency ?? bareCurrency} to raise it`}
          .
        </RequirementNotice>
      )}

      {/* The owner's daily limit for this currency (rolling 24 hours, pending included). Same
          notice as the cap; at 0 left it is also in `missing` and the server refuses with
          WITHDRAW_DAILY_LIMIT. */}
      {requirements?.dailyLimit?.enabled && requirements.dailyLimit.remaining != null && (
        <RequirementNotice>
          Daily limit: {Number(requirements.dailyLimit.remaining).toFixed(2)} of{' '}
          {Number(requirements.dailyLimit.limit).toFixed(2)} {requirements.dailyLimit.currency ?? bareCurrency} left
          in the last 24 hours.
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
          disabled={busy || balance < min || wagerBlocked}
          className="button button-brand button-m my-4 w-full"
        >
          Withdraw
        </button>
      </form>

      {done && <SubmittedPop onClose={() => setDone(false)} />}
    </>
  );
}
