import React from 'react';
import { IconCopy, IconInform } from '../../components/shared/icons';
import { copyWithToast } from '../../utils/clipboard';
import { showToast, toastError } from '../../components/shared/Toast/toast';
import { getBankDetails, readBankQr, submitFiatDeposit } from '../../services/fiatDeposit';
import { printCurrency } from '../../utils/currency';
import { depositBonusConfig } from './deposit';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';
import QrCode from './QrCode';
import useResource from '../../hooks/useResource';
import { getRechargeBonusConfig } from '../../services/bonus';
import { coinIcon } from '../../utils/coinArt';

/* The manual (bank transfer) deposit — THIS BUILD'S, not bc.game's (the original's fiat tab is a
 * payment-channel grid; this platform's fiat rail is "send to the house account, then file the
 * reference and a screenshot", approved by staff). Drawn only on a live build, only for a direct
 * player, and only while the owner's deposit_mode allows manual AND the site admin's Manual
 * deposit switch is on (`gates.manualDeposit()`); FiatTab mounts it where the out-of-channels
 * state would be. Every class here is one the Deposit page already uses: the notice box, the
 * crypto tab's address row with its copy button, `.input bg-input_bright`, the brand submit, and
 * the KYC form's dashed file tile. */

const ACCEPT = 'image/png,image/jpeg,image/webp';
const STEPS = ['Amount', 'Pay', 'Confirm'];

/** The progress line on top: one segment per step, filled up to the current one. */
function StepLine({ step }) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {STEPS.map((label, index) => (
        <div key={label}>
          <div className={`h-1 rounded-full ${index <= step ? 'bg-brand' : 'bg-layer4'}`} />
          <div className={`mt-1 text-xs ${index === step ? 'font-extrabold text-primary' : 'text-secondary'}`}>
            {index + 1}. {label}
          </div>
        </div>
      ))}
    </div>
  );
}

/** One "label / value [copy]" row — CryptoTab's AddressBox, labelled. */
function CopyRow({ label, value }) {
  if (!value) return null;
  return (
    <>
      <div className="mb-1 mt-3 text-secondary">{label}</div>
      <div className="flex min-h-10 items-center break-all rounded-lg border border-input bg-input_bright p-2">
        <span className="flex-auto">{value}</span>
        <button type="button" aria-label={`Copy ${label}`} className="ms-2 flex-none" onClick={() => copyWithToast(value)}>
          <IconCopy className="icon size-5 fill-secondary" />
        </button>
      </div>
    </>
  );
}

function Qr({ coin, id }) {
  const [url, setUrl] = React.useState(null);
  React.useEffect(() => {
    let live = true;
    let made = null;
    readBankQr(coin, id).then((u) => {
      made = u;
      if (live) setUrl(u);
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      live = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [coin, id]);
  if (!url) return null;
  return <img alt="Payment QR" src={url} className="mx-auto mt-3 size-40 rounded-lg bg-white object-contain p-2" />;
}

/* `crypto`: the Crypto tab's manual transfer — the house rows are wallet addresses per network
   (admin → Bank details), the reference is the transaction hash and a screenshot is optional. */
export default function ManualDeposit({ currency, crypto = false }) {
  const coin = String(currency).toUpperCase().replace(/FIAT$/, '');
  const [accounts, setAccounts] = React.useState(null);
  // Step 0 the amount, 1 the account(s) the site admin set for that amount, 2 the reference + screenshot.
  const [step, setStep] = React.useState(0);
  const [matching, setMatching] = React.useState([]);
  const [noMatch, setNoMatch] = React.useState(false);
  const [picked, setPicked] = React.useState(0);
  const [amount, setAmount] = React.useState('');
  const [reference, setReference] = React.useState('');
  const [file, setFile] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const fileId = React.useId();

  React.useEffect(() => {
    let live = true;
    getBankDetails(coin).then((rows) => live && setAccounts(rows));
    return () => {
      live = false;
    };
  }, [coin]);

  /* The first-deposit offer, as FiatTab's channel form shows it: the same recharge config (FiatTab
     mounts its read; null when this player can't get the bonus — claimed, agent, or switched off). */
  // The Crypto tab doesn't mount FiatTab's read of the first-deposit terms, so read it here (shared).
  useResource(getRechargeBonusConfig);
  const walletCode = crypto ? coin : `${coin}FIAT`;
  const bonus = depositBonusConfig(walletCode);
  const site = useSelectedCurrency();
  const fiat = (value) => printCurrency(value, walletCode, { target: walletCode });

  const account = matching[picked];
  const ready = account && Number(amount) > 0 && reference.trim() && (file || crypto) && !busy;

  const toAccounts = async () => {
    if (!(Number(amount) > 0) || busy) return;
    setBusy(true);
    const rows = await getBankDetails(coin, amount);
    setBusy(false);
    setNoMatch(!rows.length);
    if (!rows.length) return;
    setMatching(rows);
    setPicked(0);
    setStep(1);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!ready) return;
    setBusy(true);
    try {
      await submitFiatDeposit(
        {
          amount,
          currency: coin,
          transactionId: reference.trim(),
          destination: account,
        },
        file,
      );
      showToast('Deposit submitted — it will be credited once it is approved.', { type: 'success' });
      setAmount('');
      setReference('');
      setFile(null);
      setStep(0);
    } catch (failure) {
      toastError(failure, 'Could not submit the deposit');
    } finally {
      setBusy(false);
    }
  };

  if (accounts === null) return <div className="py-10 text-center text-secondary">Loading…</div>;

  if (!accounts.length) {
    return (
      <div className="my-4 flex rounded-xl bg-warning/10 p-2 text-secondary">
        <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-warning" />
        <div>
          {crypto
            ? `Sorry, ${coin} deposits are not currently available. Please try again later or contact support.`
            : `No ${coin} bank account is set up for deposits right now. Please try again later.`}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <StepLine step={step} />
      <div className="my-4 flex rounded-xl bg-success/10 p-2 text-secondary">
        <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-success" />
        <div>
          {crypto
            ? `Enter the amount, send ${coin} to the address shown on its network, then enter the transaction hash. Your balance is credited once the deposit is approved.`
            : 'Enter the amount, transfer it to the account shown, then enter the bank reference (UTR) and upload the payment screenshot. Your balance is credited once the deposit is approved.'}
        </div>
      </div>

      {step === 0 && (
        <>
          {bonus && (
            <div className="mb-4 flex rounded-xl bg-brand/10 p-2 text-secondary">
              <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-brand" />
              <div>
                {bonus.monthly ? `Deposit bonus ${bonus.monthly.n}/${bonus.monthly.total} · ` : 'First deposit bonus: '}
                <span className="font-extrabold text-brand">+{Math.round(bonus.ratio * 100)}%</span> on a deposit of {fiat(bonus.minDeposit)} or more
                {bonus.maxBonusAmount < Number.MAX_SAFE_INTEGER / 2 && (
                  <>
                    , up to{' '}
                    {site.show(bonus.maxBonusAmount, walletCode, {
                      precision: 2,
                    })}
                  </>
                )}
                .{bonus.monthly?.gradual && <> Locked — unlocks as you wager, claim any time.</>}
              </div>
            </div>
          )}

          <div className="mb-1 mt-5 text-secondary">Deposit Amount ({coin})</div>
          <div className="input bg-input_bright text-base">
            <input inputMode="decimal" name="amount" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>

          {noMatch && (
            <div className="mt-3 flex rounded-xl bg-warning/10 p-2 text-secondary">
              <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-warning" />
              <div>No account takes a deposit of {fiat(amount)} right now. Please try a different amount.</div>
            </div>
          )}
          <button type="button" className="button button-brand button-m my-5 w-full" disabled={!(Number(amount) > 0) || busy} onClick={toAccounts}>
            {busy ? 'Loading…' : 'Next'}
          </button>
        </>
      )}

      {step === 1 && account && (
        <>
          <div className="mt-5 flex items-center justify-between text-secondary">
            <span>
              Deposit Amount: <span className="font-extrabold text-primary">{fiat(amount)}</span>
            </span>
            <button type="button" className="text-brand" onClick={() => setStep(0)}>
              Change
            </button>
          </div>
          {matching.length > 1 && (
            <>
              <div className="mb-1 mt-5 text-secondary">Pay To</div>
              <div className="grid grid-cols-2 gap-2">
                {matching.map((row, index) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`button button-m h-10 ${index === picked ? 'button-brand' : 'button-second'}`}
                    onClick={() => setPicked(index)}
                  >
                    {row.network || (row.upiId && !row.accountNumber ? 'UPI' : row.bankName || `Account ${index + 1}`)}
                  </button>
                ))}
              </div>
            </>
          )}

          {account.walletAddress && (
            <>
              <div className="mt-4 flex justify-center">
                <div className="rounded-xl bg-layer3_alt p-2">
                  <QrCode value={account.walletAddress} logo={coinIcon(coin)} className="block" />
                </div>
              </div>
              <CopyRow label="Network" value={account.network} />
              <CopyRow label="Deposit Address" value={account.walletAddress} />
              <div className="mt-3 flex rounded-xl bg-warning/10 p-2 text-secondary">
                <IconInform className="icon -mt-0.5 mr-1.5 size-6 flex-none fill-warning" />
                <div>
                  Send only {coin} on the {account.network} network to this address. Anything else sent here will be lost.
                </div>
              </div>
            </>
          )}
          <CopyRow label="Bank" value={account.bankName} />
          {!account.walletAddress && <CopyRow label="Account Holder" value={account.accountHolderName} />}
          <CopyRow label="Account Number" value={account.accountNumber} />
          <CopyRow label="IFSC" value={account.ifscCode} />
          <CopyRow label="UPI ID" value={account.upiId} />
          {account.hasQrImage && <Qr coin={coin} id={account.id} />}

          <button type="button" className="button button-brand button-m my-5 w-full" onClick={() => setStep(2)}>
            {crypto ? 'I Have Sent It' : 'I Have Paid'}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mt-5 flex items-center justify-between text-secondary">
            <span>
              Paid {fiat(amount)} to {account?.network || account?.bankName || account?.upiId || 'the account'}
            </span>
            <button type="button" className="text-brand" onClick={() => setStep(1)}>
              Back
            </button>
          </div>
          <div className="mb-1 mt-3 text-secondary">{crypto ? 'Transaction Hash' : 'Bank Reference / UTR'}</div>
          <div className="input bg-input_bright text-base">
            <input name="transactionId" value={reference} maxLength={128} onChange={(e) => setReference(e.target.value)} />
          </div>

          <div className="mb-1 mt-3 text-secondary">Payment Screenshot{crypto ? ' (optional)' : ''}</div>
          <label
            htmlFor={fileId}
            className="flex h-24 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-third px-3 text-center text-sm text-secondary"
          >
            {file ? <span className="truncate font-semibold text-primary">{file.name}</span> : <span>JPG or PNG</span>}
          </label>
          <input id={fileId} type="file" className="hidden" accept={ACCEPT} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          <button type="submit" className="button button-brand button-m my-5 w-full" disabled={!ready}>
            {busy ? 'Submitting…' : 'Submit Deposit'}
          </button>
        </>
      )}
    </form>
  );
}
