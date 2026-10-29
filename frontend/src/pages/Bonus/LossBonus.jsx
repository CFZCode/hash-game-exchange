import React from 'react';
import { Card, SectionGroup } from '../../components/shared/SectionGroup';
import PopCenter from '../../components/shared/PopCenter';
import { showToast } from '../../components/shared/Toast/toast';
import { useResource } from '../../hooks/useResource';
import { getAlias } from '../../utils/currency';
import { claimLossBonus, getLossBonus } from '../../services/lossBonus';

/* THIS BUILD'S — the loss bonus card on /bonus (user, 2026-10-28), laid out as hash.game's Welcome
   Shield (user, 2026-10-29: REWARD — Lossback Rate / Bonus Up To; DETAILS — protection hours, max
   bet per bet, AUTO settlement, hours to claim, wager). The terms are the Super Admin's; the card
   is hidden while the switch is off. Claim opens a confirmation first — the client's "loss bonus
   confirmation". */

const money = (amount, currency) =>
  `${Number(amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${getAlias(currency)}`;

const when = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const Row = ({ label, value, strong }) => (
  <div className="flex items-center justify-between gap-2 text-sm">
    <span className="text-secondary">{label}</span>
    <span className={strong ? 'font-extrabold text-primary' : 'font-semibold text-primary'}>{value}</span>
  </div>
);

const Stat = ({ value, label }) => (
  <div className="flex flex-1 flex-col gap-1.5 rounded-lg bg-layer4 p-4">
    <span className="text-lg font-extrabold text-primary">{value}</span>
    <span className="text-xs text-secondary">{label}</span>
  </div>
);

const BUTTON = {
  no_deposit: 'Deposit to activate',
  active: 'Protection active',
  claimable: 'Claim',
  claimed: 'Claimed',
  expired: 'Expired',
  none: 'Nothing to claim',
};

export default function LossBonus({ onClaimed }) {
  const [reloads, setReloads] = React.useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `reloads` re-keys the read after a claim
  const read = React.useCallback(() => getLossBonus(), [reloads]);
  const { data } = useResource(read);
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  if (!data?.enabled) return null;

  const { welcome, protectionHours, periodDays, maxBet, claimHours, maxBonus, wagerMultiplier, currency, netLoss, bonus, state, period, claimExpiresAt } = data;
  const pct = Number(data.percent);
  const every = periodDays === 1 ? 'every day' : periodDays === 7 ? 'every week' : `every ${periodDays} days`;
  const range = period ? `${when(period.from)} – ${when(period.to)}` : '';
  const wager = Number(bonus) * Number(wagerMultiplier);

  const details = [
    welcome ? [`${protectionHours}H`, 'protection after first deposit'] : [every.toUpperCase(), 'loss counted per period'],
    Number(maxBet) > 0 && [money(maxBet, currency), 'max bet per bet'],
    ['AUTO', 'settled when period ends'],
    claimHours > 0 && [`${claimHours}H`, 'to claim after settlement'],
    [`${Number(wagerMultiplier)}x`, 'wager requirement before withdrawal'],
  ].filter(Boolean);

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
    <SectionGroup title={welcome ? 'Welcome Shield' : 'Loss Bonus'}>
      <Card className="gap-3">
        <p className="text-sm font-semibold text-secondary">
          {welcome
            ? "New here? We've got your back with special lossback offers."
            : `Get ${pct}% of your net loss back ${every}.`}
        </p>
        <div className="flex gap-2">
          <Stat value={`${pct}%`} label="Lossback Rate" />
          <Stat value={Number(maxBonus) > 0 ? money(maxBonus, currency) : 'No cap'} label="Bonus Up To" />
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {details.map(([key, desc]) => (
            <li key={desc} className="flex gap-2">
              <span className="font-extrabold text-brand">{key}</span>
              <span className="text-secondary">{desc}</span>
            </li>
          ))}
        </ul>
        {state !== 'no_deposit' && (
          <div className="flex flex-col gap-1.5">
            <Row label={welcome ? 'Protection' : 'Last period'} value={range} />
            <Row label="Net loss" value={money(netLoss, currency)} />
            <Row label="Your lossback" value={money(bonus, currency)} strong />
            {state === 'claimable' && claimExpiresAt && <Row label="Claim before" value={when(claimExpiresAt)} />}
          </div>
        )}
        <button
          type="button"
          className="button button-brand button-m w-full"
          disabled={state !== 'claimable' || busy}
          onClick={() => setConfirming(true)}
        >
          {BUTTON[state] ?? BUTTON.none}
        </button>
        <p className="text-xs text-secondary">Only real money wagers count.</p>
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
