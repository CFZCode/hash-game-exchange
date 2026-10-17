import React from 'react';
import {
  OddsCell,
  MatchOddsBlock,
  FancyBlock,
  OddEvenBlock,
  LineMarketBlock,
  BetSlipInline,
  OneClickToggle,
  StakeButtonsModal,
  SportTabs,
  InPlayList,
  LatestEventsStrip,
  MatchHeader,
  MarketFilterTabs,
  OpenBetsPanel,
  ExposureBadge,
  CashoutButton,
} from '../index';
import { cx } from '../utils';
import {
  SPORTS,
  MATCH_ODDS,
  BOOKMAKER,
  TIED,
  FANCY,
  ODD_EVEN,
  LINE,
  MATCHES,
  LATEST,
  MATCHED,
  STAKES,
} from './sampleData';

/* /dev/exchange-kit — every exchange component with sample props. Development only: the route
 * is registered in App.jsx behind `process.env.NODE_ENV !== 'production'`. The state here is
 * just enough to exercise the components (open a slip, step the odds, fake a bet delay, tick a
 * price so the flash is visible); none of it is how the real page should hold its data. */

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-extrabold uppercase tracking-wide text-tertiary">{title}</h2>
      {children}
    </section>
  );
}

/* Projected book for a back/lay runner market if the open slip were placed. */
function withProjection(market, sel, stake) {
  const s = Number(stake) || 0;
  if (!sel || sel.marketId !== market.id || !(s > 0)) return market;
  const edge = (Number(sel.price) - 1) * s;
  return {
    ...market,
    runners: market.runners.map((r) => {
      const mine = r.id === sel.runnerId;
      const delta = sel.side === 'back' ? (mine ? edge : -s) : mine ? -edge : s;
      return { ...r, projected: (r.pnl ?? 0) + delta };
    }),
  };
}

export default function ExchangeKitPreview() {
  const [sport, setSport] = React.useState('cricket');
  const [filter, setFilter] = React.useState('all');
  const [depth, setDepth] = React.useState(3);
  const [showTv, setShowTv] = React.useState(false);

  /* One open slip across all blocks. Seeded open on India / back so the page shows one. */
  const [sel, setSel] = React.useState({
    kind: 'runner',
    marketId: 'mo-1',
    runnerId: 'ind',
    runnerName: 'India',
    side: 'back',
    price: 1.84,
    level: 0,
  });
  const [stake, setStake] = React.useState('1000');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [oneClick, setOneClick] = React.useState(true);
  const [ocStakes, setOcStakes] = React.useState([500, 1000, 5000]);
  const [ocActive, setOcActive] = React.useState(1000);
  const [stakeValues, setStakeValues] = React.useState(STAKES);
  const [stakeModal, setStakeModal] = React.useState(false);

  /* A ticking price so the flash can be seen: India's best back walks between 1.82 and 1.86. */
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);
  const walk = [1.84, 1.85, 1.86, 1.85, 1.84, 1.83, 1.82, 1.83];
  const live = walk[tick % walk.length];

  const matchOdds = withProjection(
    {
      ...MATCH_ODDS,
      runners: MATCH_ODDS.runners.map((r) =>
        r.id === 'ind' ? { ...r, back: [{ price: live, size: r.back[0].size }, ...r.back.slice(1)] } : r,
      ),
    },
    sel?.kind === 'runner' ? sel : null,
    stake,
  );
  const bookmaker = withProjection(BOOKMAKER, sel?.kind === 'runner' ? sel : null, stake);

  const openRunner = (s) => {
    setError(null);
    setSel({ kind: 'runner', ...s });
  };
  const openFancy = (s) => {
    setError(null);
    setSel({ kind: 'fancy', ...s, price: s.line });
  };
  const close = () => {
    setSel(null);
    setLoading(false);
    setError(null);
  };

  const place = () => {
    setLoading(true);
    setError(null);
    setTimeout(() => {
      setLoading(false);
      setError('Odds changed. Please check the new price and try again.');
    }, 3000);
  };

  const slip = sel ? (
    <BetSlipInline
      side={sel.side}
      runnerName={sel.runnerName ?? sel.rowName}
      marketName={sel.kind === 'fancy' ? 'Fancy' : sel.marketId === 'bm-1' ? 'Bookmaker' : 'Match Odds'}
      price={sel.price}
      rate={sel.rate}
      isLine={sel.kind === 'fancy'}
      priceEditable={sel.kind === 'runner' && sel.marketId === 'mo-1'}
      onPriceChange={(p) => setSel((s) => ({ ...s, price: p }))}
      stake={stake}
      onStakeChange={setStake}
      quickStakes={stakeValues}
      minStake={100}
      maxStake={500000}
      currency="₹"
      loading={loading}
      delaySeconds={3}
      error={error}
      onCancel={close}
      onClear={() => setStake('')}
      onPlace={place}
    />
  ) : null;

  const runnerSel = (marketId) =>
    sel?.kind === 'runner' && sel.marketId === marketId
      ? { runnerId: sel.runnerId, side: sel.side, level: sel.level }
      : null;

  return (
    <div className="px-4 sm:px-0">
      <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-8 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-primary">Exchange kit</h1>
            <p className="text-xs text-tertiary">Dev preview · src/components/exchange</p>
          </div>
          <ExposureBadge balance={152340.5} exposure={-2650} currency="₹" onClick={() => {}} />
        </div>

        <Section title="OddsCell — states">
          <div className="flex flex-wrap gap-2">
            {[
              ['Back', { side: 'back', price: 1.84, size: 125430 }],
              ['Lay', { side: 'lay', price: 1.85, size: 98210 }],
              ['Back muted', { side: 'back', price: 1.83, size: 4820, best: false }],
              ['Lay muted', { side: 'lay', price: 1.86, size: 1500, best: false }],
              ['Flash (ticking)', { side: 'back', price: live, size: 2500 }],
              ['Selected', { side: 'lay', price: 2.2, size: 64300, selected: true }],
              ['Suspended', { side: 'back', price: 1.84, size: 100, suspended: true }],
              ['Empty', { side: 'lay', price: null }],
              ['Disabled', { side: 'back', price: 3.4, size: 900, disabled: true }],
            ].map(([label, p]) => (
              <div key={label} className="flex w-[4.25rem] flex-col gap-1 sm:w-16">
                <OddsCell {...p} onSelect={() => {}} className="w-full" />
                <span className="text-center text-[0.625rem] leading-3 text-tertiary">{label}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Lobby">
          <SportTabs sports={SPORTS} active={sport} onChange={setSport} />
          <LatestEventsStrip events={LATEST} activeId="m1" onOpen={() => {}} />
          <InPlayList
            title="In-Play & Upcoming"
            titleExtra={<span className="text-xs text-tertiary">{MATCHES.length} matches</span>}
            matches={MATCHES}
            onOpen={() => {}}
            onSelect={() => {}}
          />
          <InPlayList title="Empty list" matches={[]} />
        </Section>

        <Section title="Match page">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <MatchHeader
                name="India v Australia"
                competition="ICC Champions Trophy"
                sport="cricket"
                inPlay
                tvAvailable
                showTv={showTv}
                onToggleTv={setShowTv}
                onBack={() => {}}
                scoreSlot={
                  <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="font-semibold text-primary">IND 142/3 (17.2)</span>
                    <span className="text-xs text-tertiary">CRR 8.19 · Target —</span>
                  </div>
                }
              />
              <MarketFilterTabs
                tabs={[
                  { id: 'all', label: 'All' },
                  { id: 'odds', label: 'Match Odds' },
                  { id: 'bm', label: 'Bookmaker' },
                  { id: 'fancy', label: 'Fancy', count: 4 },
                  { id: 'line', label: 'Line' },
                  { id: 'oe', label: 'Odd / Even' },
                ]}
                active={filter}
                onChange={setFilter}
              />

              <div className="flex items-center gap-2 text-xs text-tertiary">
                Depth:
                {[1, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepth(d)}
                    className={cx(
                      'rounded-md px-2 py-1 font-semibold',
                      depth === d ? 'bg-layer5 text-primary' : 'bg-layer3 text-secondary',
                    )}
                  >
                    {d === 1 ? 'Best only' : '3 × 3'}
                  </button>
                ))}
              </div>

              <MatchOddsBlock
                market={matchOdds}
                depth={depth}
                selected={runnerSel('mo-1')}
                onSelect={openRunner}
                activeRunnerId={sel?.kind === 'runner' && sel.marketId === 'mo-1' ? sel.runnerId : null}
                betSlip={slip}
                cashout={<CashoutButton value={312.4} onClick={() => {}} />}
              />
              <MatchOddsBlock
                market={bookmaker}
                showSize={false}
                badge={<span className="rounded bg-layer5 px-1.5 py-0.5 text-[0.625rem] font-extrabold text-secondary">0% COMM</span>}
                selected={runnerSel('bm-1')}
                onSelect={openRunner}
                activeRunnerId={sel?.kind === 'runner' && sel.marketId === 'bm-1' ? sel.runnerId : null}
                betSlip={slip}
                cashout={<CashoutButton value={-120} onClick={() => {}} />}
              />
              <MatchOddsBlock market={TIED} />
              <FancyBlock
                rows={FANCY}
                min={100}
                max={50000}
                selected={sel?.kind === 'fancy' ? { rowId: sel.rowId, side: sel.side } : null}
                onSelect={openFancy}
                onBadlo={() => {}}
                onBook={() => {}}
                activeRowId={sel?.kind === 'fancy' ? sel.rowId : null}
                betSlip={slip}
              />
              <LineMarketBlock rows={LINE} depth={depth} min={100} max={25000} onSelect={() => {}} />
              <OddEvenBlock rows={ODD_EVEN} min={100} max={10000} onSelect={() => {}} />
            </div>

            <aside className="flex w-full flex-col gap-3 lg:w-[22rem] lg:flex-none">
              <OneClickToggle
                enabled={oneClick}
                onToggle={setOneClick}
                stakes={ocStakes}
                activeStake={ocActive}
                onSelectStake={setOcActive}
                onStakesChange={setOcStakes}
              />
              <button
                type="button"
                onClick={() => setStakeModal(true)}
                className="button button-second button-m text-sm"
              >
                Edit stake buttons
              </button>
              <OpenBetsPanel matched={MATCHED} currency="₹" />
            </aside>
          </div>
        </Section>

        {stakeModal && (
          <StakeButtonsModal
            values={stakeValues}
            min={100}
            max={1000000}
            onClose={() => setStakeModal(false)}
            onSave={(v) => {
              setStakeValues(v);
              setStakeModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
