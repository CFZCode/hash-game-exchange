import { Link } from 'react-router-dom';
import { Card } from '../../components/shared/SectionGroup';
import { IconArrow } from '../../components/shared/icons';
import { VIP_LEVELS, vipTier, tierColor } from '../../data/vipConfig';
import * as tiers from './icons';
import { useResource } from '../../hooks/useResource';
import { getVipStanding } from '../../services/vip';
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';

/* `L` in fx-B6Xikin5.js (`D` before minification) — the Level card at the top of the Rewards
 * panel, and the same component the /vip-detail page would use for its signed-in level widget.
 *
 * It reads THE ACCOUNT for its numbers and THE VIP CONFIG for its names: `vipLevel`, `currXP`,
 * `levelStartXP` and `levelEndXP` come off `/account/get/`, while the tier's display name and
 * the next tier's are looked up in the captured `/game/support/vip-v2/config/` ladder — see
 * src/data/vipConfig.js.
 *
 * `B` — the compactor on the XP figure — is the card's own and is NOT `printCurrency`'s: it cuts
 * in at a thousand rather than at 10^8, and picks its decimals off the magnitude (2 below ten,
 * 1 below a hundred, none above), so 1000 prints as "1K" exactly as the capture has it.
 *
 * WHAT THE NEXT TIER IS, IS A LOOKUP BY XP AND NOT BY LEVEL: `t().find(s => s.minXp ===
 * levelEndXP)`. So a mismatch between the account's `levelEndXP` and any row's `minXp` prints
 * "--" rather than a name — which is the original's own fallback and worth knowing before
 * editing the account fixture's XP numbers.
 */

const TIER_ICON = {
  Beginner: tiers.TierBeginner,
  Bronze: tiers.TierBronze,
  Silver: tiers.TierSilver,
  Gold: tiers.TierGold,
  Platinum: tiers.TierPlatinum,
  Diamond: tiers.TierDiamond,
  Eternal: tiers.TierEternal,
  External: tiers.TierEternal,
};

/* `B` */
function compactXp(value) {
  if (value >= 1e6) {
    const n = value / 1e6;
    return `${+n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0)}M`;
  }
  if (value >= 1e3) {
    const n = value / 1e3;
    return `${+n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0)}K`;
  }
  return String(value);
}

/* `I` in tier-icon-uERoa3jE.js — the square that holds a tier glyph or a perk icon. */
export function IconBox({ className = '', children }) {
  return <div className={`center size-10 shrink-0 rounded-xl ${className}`}>{children}</div>;
}

/* `T` in the same chunk. The glyph is picked by TIER FAMILY, and its colour comes from the same
   key — so a family that is not in either map (the ten ladder rows whose name carries a newline
   instead of a space) falls back to the Beginner drawing in `currentColor`. That fallback is the
   original's and is documented at the data. */
export function TierIcon({ name, className = '' }) {
  const Glyph = TIER_ICON[name] ?? tiers.TierBeginner;
  return <Glyph className={className} style={{ color: tierColor(name) }} />;
}

export default function LevelCard({ session }) {
  const tier = vipTier(session.vipLevel);

  const span = session.levelEndXP - session.levelStartXP;
  const done = session.currXP - session.levelStartXP;
  let percent = done > 0 && span > 0 ? Math.min(100, parseFloat(((done / span) * 100).toFixed(2))) : 0;

  const remaining = session.levelEndXP - session.currXP;
  const nextRow = VIP_LEVELS.find((r) => r.minXp === session.levelEndXP);
  let toNext =
    remaining <= 0
      ? ''
      : nextRow
        ? `${compactXp(remaining)} XP to ${vipTier(nextRow.level).fullName}`
        : '--';

  /* LIVE: the platform's own standing replaces the three printed values — see
     services/vip.js. Null in fixture mode, so the lines above are what renders there. */
  const { data: standing } = useResource(getVipStanding);
  const cur = useSelectedCurrency();
  let fullName = tier.fullName;
  let family = tier.base;
  if (standing) {
    fullName = standing.name;
    family = standing.family;
    percent = standing.percent;
    toNext =
      standing.toNextAmount > 0 && standing.nextName
        ? `Wager ${cur.show(standing.toNextAmount, standing.currency, { precision: 2 })} to ${standing.nextName}`
        : '';
  }

  return (
    /* TWO DELIBERATE DEPARTURES FROM THE CHUNK, both on request and both shared with the Total
       Claimable card beside this one, which carries the identical pair.

       `!bg-layer3` (#292D2E) over `Card`'s own `bg-layer2`: the chunk leaves both header cards
       on layer2, but the panel around them is layer2 as well, so as written they were the same
       colour as their background and read as one flat block instead of two raised cards.

       `!p-3` over `Card`'s own `p-4`: 12px rather than 16px a side. The padding only became
       visible once the fill above made the card's edge visible.

       `!` on both because they are utilities competing with utilities in the same layer, where
       the order of the class attribute decides nothing. */
    <Card variant="brand" className="!bg-layer3 !p-3">
      <div className="relative pb-1 pr-8">
        <div className="flex gap-3">
          {/* `/vip-level` is a real route on the original and is not built here, so this lands
              on the catch-all. Left as a Link rather than made inert because the path is
              correct and the row should carry it — the same trade the sidebar made. */}
          <Link to="/vip-level" className="absolute right-0 top-0">
            <span className="button button-second button-s size-5 rounded-lg">
              <IconArrow className="icon rotate-180 fill-secondary text-secondary" />
            </span>
          </Link>

          <IconBox className="mt-0.5 border border-brand bg-layer3 p-1">
            <div className="center size-full rounded-lg bg-brand/5">
              {standing?.badgeUrl ? (
                <img alt={fullName} className="size-6 object-contain" src={standing.badgeUrl} />
              ) : (
                <TierIcon name={family} className="icon size-6 !text-brand" />
              )}
            </div>
          </IconBox>

          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold leading-snug text-tertiary">Level</span>
            <span className="mt-0.5 truncate text-base font-extrabold leading-tight text-primary">
              {fullName}
            </span>
          </div>
        </div>
      </div>

      <span className="mt-auto text-sm font-semibold text-primary">{percent.toFixed(2)}%</span>

      <div className="mt-1 h-[0.375rem] w-full overflow-hidden rounded-md bg-layer4_alt">
        <div className="h-full rounded-md bg-brand transition-all" style={{ width: `${percent}%` }} />
      </div>

      <span className="mt-2 truncate text-xs font-semibold text-secondary">{toNext}</span>
    </Card>
  );
}
