import React from 'react';
import PopCenter from '../PopCenter';
import Input from '../Input';
import Select from '../Select';
import { toast } from '../Toast/toast';
import { useSession } from '../../../context/session';
import { searchTipUsers, sendTip } from '../../../services/tips';

const label = (code) => String(code).replace(/FIAT$/, '');
const newRequestId = () => globalThis.crypto?.randomUUID?.();

/* THIS BUILD'S Send Tip dialog (user's request, 2026-10-31). The reference tips from another
 * player's profile and from chat; nothing here links to another player, so the account menu and
 * /user/enter open this instead: a username (with the backend's picker), coin, amount, note. The
 * backend holds every rule (KYC, limits, opt-out) and its message is what the player reads. */
export default function SendTip({ open, onClose }) {
  const { session, balances, refreshBalances } = useSession();
  const coins = React.useMemo(() => balances.map((b) => b.currencyName), [balances]);
  const [toUsername, setToUsername] = React.useState('');
  const [picked, setPicked] = React.useState(null);
  const [amount, setAmount] = React.useState('');
  const [note, setNote] = React.useState('');
  const [matches, setMatches] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  // One id per tip the player means to send; a double press or retry moves the money once.
  const requestId = React.useRef(newRequestId());

  // Until the player picks: the header's coin when it holds money, else the first that does, else
  // the header's coin — never the list's first row (BTC), which turned "10" into 10 BTC.
  const selected = session.setting?.currencyName;
  const funded = (code) => Number(balances.find((b) => b.currencyName === code)?.amount) > 0;
  const currency =
    picked ?? (funded(selected) ? selected : balances.find((b) => Number(b.amount) > 0)?.currencyName ?? (coins.includes(selected) ? selected : coins[0]));
  const balance = balances.find((b) => b.currencyName === currency)?.amount;

  React.useEffect(() => {
    const q = toUsername.trim();
    if (q.length < 2) return undefined;
    const timer = setTimeout(() => {
      searchTipUsers(q)
        .then((rows) => setMatches((rows ?? []).filter((r) => r.name !== q).slice(0, 5)))
        .catch(() => setMatches([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [toUsername]);

  const close = () => {
    setToUsername('');
    setAmount('');
    setNote('');
    setMatches([]);
    requestId.current = newRequestId();
    onClose();
  };

  const valid = toUsername.trim() && Number(amount) > 0 && currency;
  const submit = (event) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    sendTip({ toUsername: toUsername.trim(), currency, amount, note: note.trim(), requestId: requestId.current })
      .then(() => {
        toast.success(`Tip of ${amount} ${label(currency)} sent to ${toUsername.trim()}`);
        refreshBalances?.();
        close();
      })
      .catch((error) => toast(error))
      .finally(() => setBusy(false));
  };

  return (
    <PopCenter open={open} onClose={close} label="Send Tip" className="w-[min(25rem,calc(100vw-2rem))]">
      <form className="flex flex-col gap-3 px-4 pb-4 text-sm font-semibold text-secondary" onSubmit={submit}>
        <label className="flex flex-col gap-1">
          <span>Username</span>
          <Input value={toUsername} onChange={setToUsername} placeholder="Player's username" autoFocus autoComplete="off" />
          {toUsername.trim().length >= 2 && matches.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {matches.map((m) => (
                <button key={m.id ?? m.name} type="button" className="button h-7 rounded-md bg-layer5 px-2 text-xs text-primary" onClick={() => { setToUsername(m.name); setMatches([]); }}>
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </label>
        <div className="flex flex-col gap-1">
          <span>Currency</span>
          <Select title="Currency" value={currency} options={coins} onChange={setPicked}>
            {(code) => label(code)}
          </Select>
        </div>
        <label className="flex flex-col gap-1">
          <span className="flex justify-between">
            <span>Amount</span>
            {balance != null && <span className="text-tertiary">Balance: {Number(balance)} {label(currency)}</span>}
          </span>
          <Input type="number" value={amount} onChange={setAmount} placeholder="0.00" />
        </label>
        <label className="flex flex-col gap-1">
          <span>Message (optional)</span>
          <Input value={note} onChange={(v) => setNote(v.slice(0, 140))} placeholder="Say something nice" required={false} />
        </label>
        <button type="submit" disabled={!valid || busy} className="button button-brand button-l mt-2 h-11 w-full rounded-lg">
          <span className="text-base">{busy ? 'Sending…' : 'Send Tip'}</span>
        </button>
      </form>
    </PopCenter>
  );
}
