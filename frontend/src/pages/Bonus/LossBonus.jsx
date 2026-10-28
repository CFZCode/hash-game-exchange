import React from 'react';
import { Card, SectionGroup } from '../../components/shared/SectionGroup';
import PopCenter from '../../components/shared/PopCenter';
import { showToast } from '../../components/shared/Toast/toast';
import { useResource } from '../../hooks/useResource';
import { getAlias } from '../../utils/currency';
import { claimLossBonus, getLossBonus } from '../../services/lossBonus';

/* THIS BUILD'S — the loss bonus card on /bonus (user, 2026-10-28; bc.game's Lossback card is not
   in the mirror). The terms are the Super Admin's; the card is hidden while the switch is off.
   Claim opens a confirmation first — the client's "loss bonus confirmation". */

const money = (amount, currency) =>
  `${Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getAlias(currency)}`;

const day = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/* The period's last day: `to` is the exclusive end (00:00 UTC of the next period). */
const lastDay = (iso) => day(new Date(new Date(iso).getTime() - 86_400_000).toISOString());

const Row = ({ label, value, strong }) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span className="text-secondary">{label}</span>
    <span className={strong ? 'font-extrabold text-primary' : 'font-semibold text-primary'}>{value}</span>
  </div>
);

export default function LossBonus({ onClaimed }) {
  const [reloads, setReloads] = React.useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `reloads` re-keys the read after a claim
  const read = React.useCallback(() => getLossBonus(), [reloads]);
  const { data } = useResource(read);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  if (!data?.enabled) return null;

  const { percent, periodDays, wagerMultiplier, currency, netLoss, bonus, claimed, claimable, period } = data;
  const pct = Number(percent);
  const every = periodDays === 1 ? 'every day' : periodDays === 7 ? 'every week' : `every ${periodDays} days`;
  const range = `${day(period.from)} – ${lastDay(period.to)}`;
  const wager = Number(bonus) * Number(wagerMultiplier);

  const claim = () => {
    setBusy(true);
    Promise.resolve(claimLossBonus())
      .then(() => {
        showToast(`Loss bonus of ${money(bonus, currency)} claimed.`, { type: 'success' });
        setConfirming(false);
        setReloads((n) => n + 1);
        onClaimed?.();
      })
      .catch((error) => showToast(error?.message || 'The loss bonus could not be claimed.', { type: 'error' }))
      .finally(() => setBusy(false));
  };

  return (
    <SectionGroup title="Loss Bonus">
      <Card className="gap-3">
        <p className="text-sm font-semibold text-secondary">
          Get {pct}% of your net loss back {every}.
        </p>
        <div className="flex flex-col gap-1.5">
          <Row label="Last period" value={range} />
          <Row label="Net loss" value={money(netLoss, currency)} />
          <Row label="Your loss bonus" value={money(bonus, currency)} strong />
        </div>
        <button
          type="button"
          className="button button-brand button-m w-full"
          disabled={!claimable || busy}
          onClick={() => setConfirming(true)}
        >
          {claimed ? 'Claimed' : claimable ? 'Claim' : 'Nothing to claim'}
        </button>
      </Card>

      {confirming && (
        <PopCenter open onClose={() => setConfirming(false)} label="Loss Bonus">
          <div className="space-y-4 text-center">
            <div className="text-lg font-extrabold text-primary">Claim your loss bonus?</div>
            <p className="text-secondary">
              You will receive {money(bonus, currency)}, which is {pct}% of your {money(netLoss, currency)} net loss
              from {range}.{' '}
              {wager > 0
                ? `It will be added to your bonus balance and becomes cash after you wager ${money(wager, currency)}.`
                : 'It will be added to your balance straight away.'}
            </p>
            <div className="flex gap-3">
              <button type="button" className="button button-second button-m flex-1" disabled={busy} onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button type="button" className="button button-brand button-m flex-1" disabled={busy} onClick={claim}>
                {busy ? 'Loading…' : 'Confirm'}
              </button>
            </div>
          </div>
        </PopCenter>
      )}
    </SectionGroup>
  );
}
