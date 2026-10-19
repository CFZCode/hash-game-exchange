import React from 'react';
import RouteDialog from '../../components/shared/RouteDialog';
import { IconArrow, IconCheck } from '../../components/shared/icons';
import { IconBox, TierIcon } from '../Bonus/LevelCard';
import { useResource } from '../../hooks/useResource';
import { useSession } from '../../context/session';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';
import { getVipLadder, getVipStanding } from '../../services/vip';
import { toTiers } from './tiers';
import './VipLevel.css';

/* `/vip-level` — "Tiers & Benefits", `L.VipBenefits` → tier-benefits-Djqjq-tJ.js (off
 * hash.game/assets, with tier-icon-uERoa3jE.js; strings and class lists are the chunk's).
 *
 * A DIALOG AT EVERY WIDTH: the route carries no `info` of its own inside the `$g` group, which is
 * `Y([...], {dialog: !0})`, so it inherits `dialog: !0` — the manager's default 30rem x 40rem card
 * on a desktop, a full-screen sheet on a phone. No guard: signed out it renders the ladder with
 * Beginner current (`currXP` is 0), as the original does. The root is `PageLayout`, whose `class`
 * lands on `.dialog-item` — hence `itemClassName`.
 *
 * The one entry point is the /bonus Level card's arrow (pages/Bonus/LevelCard.jsx). The VIP Club
 * page's "Learn more VIP level up system" button sits in its signed-in `Bt` branch, which the
 * original never renders (see docs/vip.md), so it is not added.
 *
 * DEPARTURE, on request: the band floors print as WAGER in the header currency rather than as
 * "XP", because this platform's ladder is USD wager (`minXp`), and the current tier's subtitle
 * prints the player's wager the same way (`/user/vip`). */

const Ripples = () => (
  <>
    <span className="vip-ripple-ring" />
    <span className="vip-ripple-ring vip-ripple-ring-2" />
    <span className="vip-ripple-ring vip-ripple-ring-3" />
  </>
);

/* `Y` */
const subTone = (f) =>
  `${f.current ? 'font-semibold ' : ''}${f.completed || f.current ? 'text-brand' : 'text-secondary'}`;

/* `fe` — the tier's header row. */
function TierHead({ tier, achieved, subtitle, expandable, open }) {
  return (
    <div className="flex items-center gap-3">
      <IconBox className={`size-[2.375rem] overflow-hidden ${tier.current ? 'bg-brand/5' : 'bg-primary/5'}`}>
        {tier.badgeUrl ? (
          <img alt={tier.name} className="size-6 object-contain" src={tier.badgeUrl} />
        ) : (
          <TierIcon name={tier.name} className={`icon size-6${tier.current ? ' !text-brand' : ''}`} />
        )}
      </IconBox>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-extrabold leading-tight text-primary">{tier.name}</span>
        {!achieved && subtitle && <span className="mt-0.5 truncate text-xs text-brand">{subtitle}</span>}
      </div>
      {expandable && (
        <IconArrow className={`icon size-5 text-primary ${open ? '-rotate-90' : 'rotate-180'}`} />
      )}
    </div>
  );
}

/* `Se` — one tier on the timeline. */
function TierRow({ tier, idx, total, currentIdx, open, onToggle, subtitle, show }) {
  const state = currentIdx >= 0 && idx < currentIdx ? 'achieved' : tier.current ? 'current' : 'upcoming';
  const isNext = currentIdx >= 0 && idx === currentIdx + 1;
  const expandable = tier.subLevels.length > 1;
  const expanded = expandable && open;
  const grid = (on) =>
    `grid ease-in-out transition-[grid-template-rows] duration-300 ${on ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'}`;

  return (
    <div className="flex">
      <div className="mr-2 flex w-4 flex-none flex-col items-center gap-1">
        <div
          className={`-ml-[0.5px] h-6 flex-none ${idx > 0 ? 'border-r' : ''} ${state !== 'upcoming' ? 'border-brand' : 'border-fourth/5'}`}
        />
        <div
          className={`center relative flex size-3.5 rounded-full p-0.5 ${state === 'current' ? 'bg-brand/10' : 'bg-primary/5'}`}
        >
          {state === 'achieved' && <IconCheck className="icon size-full text-brand" />}
          {state === 'current' && (
            <>
              {!open && <Ripples />}
              <span className="inline-flex size-1 rounded-full bg-brand" />
            </>
          )}
          {state === 'upcoming' && <div className="size-1 rounded-full bg-tertiary" />}
        </div>
        <div
          className={`-ml-[0.5px] flex-auto ${idx < total - 1 ? 'border-r' : ''} ${state === 'achieved' ? 'border-brand' : 'border-fourth/5'}`}
        />
      </div>

      <div className="flex-auto py-1.5">
        <div className={`overflow-hidden rounded-xl bg-layer3 p-3${tier.current ? ' border border-brand/60' : ''}`}>
          <div className={expandable ? 'cursor-pointer' : ''} onClick={expandable ? onToggle : undefined}>
            <TierHead
              tier={tier}
              achieved={state === 'achieved'}
              subtitle={tier.current ? subtitle : ''}
              expandable={expandable}
              open={open}
            />
          </div>
          {isNext && tier.benefits && (
            <p className="mt-3 border-t border-third pt-2 text-sm leading-snug text-mail">{tier.benefits}</p>
          )}
          <div className={grid(expanded)}>
            <div className="overflow-hidden">
              {tier.benefits && (
                <div className={grid(!isNext)}>
                  <div className="overflow-hidden">
                    <div className="mt-3 flex flex-col gap-1.5 border-t border-third pt-2">
                      <p className="px-1 text-sm text-mail">{tier.benefits}</p>
                    </div>
                  </div>
                </div>
              )}
              {expandable && (
                <div
                  className={`mt-3 rounded-xl border px-4 ${state === 'current' ? 'border-brand/10 bg-brand/5' : 'border-third bg-primary/5'}`}
                >
                  <div className="mb-0.5 flex items-center justify-between border-b border-fourth/5 py-2.5 text-xs text-secondary">
                    <span className="tracking-wide">Level</span>
                    <span className="uppercase tracking-wide">Wager</span>
                  </div>
                  {tier.subLevels.map((f) => (
                    <div key={f.name} className="flex items-center gap-2.5 border-layer4/60 py-3">
                      <div className="center flex size-3">
                        {f.completed ? (
                          <IconCheck className="icon size-2 text-brand" />
                        ) : f.current ? (
                          <div className="center relative flex size-full rounded-full bg-brand/20">
                            {open && <Ripples />}
                            <div className="size-1 rounded-full bg-brand" />
                          </div>
                        ) : (
                          <div className="size-1 rounded-full bg-current text-secondary" />
                        )}
                      </div>
                      <span className={`flex-1 text-sm font-semibold ${subTone(f)}`}>{f.name}</span>
                      <span className={`text-sm font-extrabold ${subTone(f)}`}>{show(f.minXp)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VipLevel({ onClose, onBack, enter }) {
  const { session } = useSession();
  const cur = useSelectedCurrency();
  const { data: ladder } = useResource(getVipLadder);
  const { data: standing } = useResource(getVipStanding);

  const level = standing?.level ?? session.vipLevel ?? 0;
  const tiers = React.useMemo(() => (ladder ? toTiers(ladder, level) : []), [ladder, level]);
  const currentIdx = tiers.findIndex((t) => t.current);

  /* `e` starts empty and is seeded with the current tier once — a null sentinel until the first
     toggle, so a standing that lands after the ladder still opens the right tier. */
  const [opened, setOpened] = React.useState(null);
  const openSet = opened ?? new Set(currentIdx >= 0 ? [currentIdx] : []);
  const toggle = (idx) =>
    setOpened(() => {
      const next = new Set(openSet);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const currentName = tiers[currentIdx]?.subLevels.find((s) => s.current)?.name ?? '';
  const wagered = standing ? cur.show(standing.wagered, standing.currency) : cur.show(session.currXP || 0, 'USDFIAT');
  const subtitle = `${standing?.name || currentName} · ${wagered}`;
  const show = (usd) => cur.show(usd, 'USDFIAT');

  return (
    <RouteDialog
      title="Tiers & Benefits"
      itemClassName="vip-level-dialog bonus-scope bg-layer1 [&_.dialog-title]:bg-transparent [&_.scroll-y]:[scrollbar-width:none]"
      onClose={onClose}
      onBack={onBack}
      enter={enter}
    >
      <div className="bonus-scope flex flex-col">
        {tiers.map((tier, idx) => (
          <TierRow
            key={tier.name}
            tier={tier}
            idx={idx}
            total={tiers.length}
            currentIdx={currentIdx}
            open={openSet.has(idx)}
            onToggle={() => toggle(idx)}
            subtitle={subtitle}
            show={show}
          />
        ))}
      </div>
    </RouteDialog>
  );
}
