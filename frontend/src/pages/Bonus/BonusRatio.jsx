import React from 'react';
import { Link } from 'react-router-dom';
import { Card, SectionGroup } from '../../components/shared/SectionGroup';
import { useResource } from '../../hooks/useResource';
import { getBonusContribution, typeRows } from '../../services/bonusContribution';

/* THIS BUILD'S — the game ratio on /bonus (user, 2026-10-29: "Bonus will be used only on ratio of
   bettings … bonus wale tab me dikha de kaunse game pe kitna"). Lists the games with their own %,
   then every other game by type. Hidden until the table answers. */

const SHOWN = 12;

export default function BonusRatio() {
  const { data } = useResource(getBonusContribution);
  const [all, setAll] = React.useState(false);

  if (!data) return null;

  const games = all ? data.games : data.games.slice(0, SHOWN);
  const types = typeRows(data);
  const noneElsewhere = types.every((t) => t.percent === 0) && !data.providers.length;

  return (
    <SectionGroup title="Bonus Wager Ratio">
      <Card className="gap-3">
        <p className="text-sm text-secondary">
          Your bonus is used only on the ratio of your bets: each bet counts toward unlocking your locked bonus at its
          game&apos;s ratio. At 10%, a ₹100 bet counts ₹10.
        </p>

        {data.games.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="text-sm font-extrabold text-primary">
              {noneElsewhere ? 'Only these games count' : 'Games with their own ratio'}
            </div>
            {games.map((g) => (
              <Link key={g.ref} to={`/game/${encodeURIComponent(g.ref)}`} className="flex items-center gap-2 text-sm">
                {g.image ? (
                  <img src={g.image} alt="" className="size-8 shrink-0 rounded object-cover" loading="lazy" />
                ) : (
                  <span className="size-8 shrink-0 rounded bg-layer5" />
                )}
                <span className="min-w-0 flex-1 truncate text-primary">{g.name}</span>
                {g.provider && <span className="hidden text-secondary sm:inline">{g.provider}</span>}
                <span className="w-12 text-right font-extrabold text-brand">{g.percent}%</span>
              </Link>
            ))}
            {data.games.length > SHOWN && (
              <button type="button" className="self-start text-sm font-semibold text-brand" onClick={() => setAll((v) => !v)}>
                {all ? 'Show less' : `Show all ${data.games.length}`}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="text-sm font-extrabold text-primary">{data.games.length ? 'Every other game' : 'By game type'}</div>
          {types.map((t) => (
            <div key={t.key} className="flex items-center justify-between text-sm">
              <span className="text-secondary">{t.label}</span>
              <span className="font-extrabold text-primary">{t.percent}%</span>
            </div>
          ))}
          {data.providers.length > 0 && (
            <div className="text-xs text-secondary">Some providers have their own ratio.</div>
          )}
          <div className="text-xs text-secondary">Sports bets under odds {data.minSportsOdds} do not count.</div>
        </div>
      </Card>
    </SectionGroup>
  );
}
