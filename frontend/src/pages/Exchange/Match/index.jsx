import React from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  MatchHeader,
  MarketFilterTabs,
  BetSlipInline,
  OneClickToggle,
  OpenBetsPanel,
  StakeButtonsModal,
  cx,
} from '../../../components/exchange';
import Loading from '../../../components/shared/Loading';
import { toast } from '../../../components/shared/Toast/toast';
import { useSession } from '../../../context/session';
import { isSignedIn } from '../../../services/tokens';
import {
  useMatchMarkets,
  useMatchHeader,
  useMatchExposure,
  useOpenBets,
  useStakeButtons,
  useExchangeCurrency,
} from '../../../hooks/exchange';
import {
  getScoreUrl,
  reconcilePendingBets,
  announceBetPlaced,
  saveStakeButtons,
  saveOneClickButtons,
  DEFAULT_STAKE_BUTTONS,
  DEFAULT_ONE_CLICK_BUTTONS,
} from '../../../services/exchange';
import { BET_TOAST, ODDS_FIELD, ADDAPLAY_MIN_BET } from '../../../utils/exchange';
import MarketBlocks from './MarketBlocks';
import { ExchangeCurrencyNote } from '../ExchangeFrame';
import { useMatchSlip, placementOdds, slipFigures, projectedBook, slipStakeInr } from './useMatchSlip';
import { TAB_LABELS, marketTab, marketKind, ladder, rowStatus } from './shape';
import { sportIconOf } from '../model';
import { markMatchGone, reviveMatch } from '../../../services/exchange/deadMatches';

/* ─── /sports/match/:sid/:gmid — the exchange match page ─────────────────────────────────
 *
 * Kit (components/exchange) for every pixel, hooks/exchange for every byte, utils/exchange for
 * every decision. Optional preselect: `?market=<mid>&runner=<section sid>&side=back|lay` opens
 * the slip on that runner's best price once the markets land (signed-in only).
 *
 * Layout: markets column + a 22rem right column (one-click, stakes, open bets) from `lg`; below
 * it the right column becomes a "Open Bets" tab beside "Markets". */

const gtypeOf = (m) => String(m?.gtype || '').toLowerCase();
const stakeLabel = (v) => (v >= 1000 && v % 1000 === 0 ? `${v / 1000}k` : String(v));

function Card({ children, className = '' }) {
  return <div className={cx('rounded-xl bg-layer3 px-4 py-10 text-center', className)}>{children}</div>;
}

/** Spec for a preselected price (query string) — the same shape a cell click produces. */
function presetSpec(market, section, side) {
  const kind = marketKind(market);
  const lay = side === 'lay';
  if (kind === 'runner') {
    const best = ladder(section, lay ? 'lay' : 'back')[0];
    const betType = gtypeOf(market) === 'fancy1' ? (lay ? 'no' : 'yes') : lay ? 'lay' : 'back';
    return best?.price ? {
      market, section, betType, odds: best.price, size: best.size, kind, rowId: section.sid,
      kitSel: { runnerId: section.sid, side: lay ? 'lay' : 'back', level: 0 },
    } : null;
  }
  if (kind === 'fancy') {
    const best = ladder(section, lay ? 'lay' : 'back')[0];
    const s = lay ? 'no' : 'yes';
    return best?.price ? {
      market, section, betType: s, odds: best.price, size: best.size, kind, rowId: section.sid,
      kitSel: { rowId: section.sid, side: s },
    } : null;
  }
  return null;
}

export default function ExchangeMatchPage() {
  const { sid, gmid } = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useSession();
  const signedIn = Boolean(session?.login) && isSignedIn();

  const mk = useMatchMarkets(gmid, sid);
  /* The provider answered 404/410 for this match: record it so the sidebar tree and the lobby's
     lists stop offering it (services/exchange/deadMatches.js). */
  const matchIsGone = mk.noMarkets || mk.matchGone;
  const matchHasMarkets = mk.markets.length > 0 && !matchIsGone;
  React.useEffect(() => {
    if (!gmid) return;
    if (matchIsGone) markMatchGone(gmid);
    else if (matchHasMarkets) reviveMatch(gmid);
  }, [matchIsGone, matchHasMarkets, gmid]);
  const headerQ = useMatchHeader(gmid, sid);
  const match = headerQ.data || null;
  const openBetsQ = useOpenBets(gmid);
  /* Exposure polls every 5s on an idle page, 2s while an unmatched order is open (feedHooks). */
  const { book } = useMatchExposure(gmid, mk.markets, { hasOpenOrder: (openBetsQ.data?.unmatched?.length ?? 0) > 0 });
  const stakesQ = useStakeButtons();
  const refreshStakes = stakesQ.refresh;

  /* Stakes are typed, and every INR figure mssports sends is printed, in the header wallet's
     coin (utils/exchange/stakeCurrency.js). INR is the identity: the kit's own formatters. */
  const cur = useExchangeCurrency();
  const fmtInr = cur.isInr ? undefined : cur.formatInr;
  const slipApi = useMatchSlip({ sid, gmid, match, getMarkets: mk.getMarkets, signedIn, currency: cur });
  const { slip, stake, loading } = slipApi;

  const [filter, setFilter] = React.useState('all');
  const [mobileTab, setMobileTab] = React.useState('markets');
  const [oneClick, setOneClick] = React.useState(false);
  const [ocActive, setOcActive] = React.useState(null);
  const [stakeModal, setStakeModal] = React.useState(false);
  const [stakeSaving, setStakeSaving] = React.useState(false);
  const [stakeError, setStakeError] = React.useState(null);
  const [score, setScore] = React.useState({ key: null, url: null });
  const [showScore, setShowScore] = React.useState(true);

  /* Bets a reload left in flight — once per mount. */
  React.useEffect(() => {
    reconcilePendingBets(({ state, message }) => {
      if (state === 'accepted') {
        toast.success(BET_TOAST.BET_PLACED);
        announceBetPlaced();
      } else if (state === 'rejected') {
        toast.error(message || BET_TOAST.GENERIC_ERROR);
      }
    });
  }, []);

  /* The one-click chips are only served to a signed-in player — re-read once they are. */
  React.useEffect(() => {
    if (signedIn) refreshStakes();
  }, [signedIn, refreshStakes]);

  /* Scoreboard iframe for non-cricket (single-use token: one fetch per match). */
  const scoreKey = `${gmid}|${sid}`;
  React.useEffect(() => {
    if (!gmid || !sid || String(sid) === '4') return undefined;
    let alive = true;
    getScoreUrl(gmid, sid).then((url) => {
      if (alive) setScore({ key: scoreKey, url });
    });
    return () => {
      alive = false;
    };
  }, [gmid, sid, scoreKey]);
  const scoreUrl = score.key === scoreKey ? score.url : null;

  /* ── markets ── */
  const visible = React.useMemo(
    () => (mk.markets || [])
      .filter((m) => (m.section || []).length > 0)
      // Line markets are signed-in only (TENEXCH).
      .filter((m) => signedIn || gtypeOf(m) !== 'fancy2'),
    [mk.markets, signedIn],
  );
  const tabs = React.useMemo(() => {
    const present = new Set(visible.map(marketTab));
    return TAB_LABELS.filter(([id]) => id === 'all' || present.has(id)).map(([id, label]) => ({ id, label }));
  }, [visible]);
  const activeTab = tabs.some((t) => t.id === filter) ? filter : 'all';
  const shown = activeTab === 'all' ? visible : visible.filter((m) => marketTab(m) === activeTab);

  /* ── slip ── */
  const slipMarket = slip ? mk.markets.find((m) => String(m.mid) === String(slip.bv.market_id)) : null;
  const slipSection = slipMarket?.section?.find((s) => String(s.sid) === String(slip.bv.selectionId)) || null;
  const slipGone = Boolean(slip) && !loading && mk.markets.length > 0 && !slipSection;
  const closeSlip = slipApi.close;
  React.useEffect(() => {
    if (slipGone) closeSlip();
  }, [slipGone, closeSlip]);

  const odds = placementOdds(slip, mk.markets);
  /* Figures in INR from the INR stake that would be sent — the same numbers the server books —
     then printed in the player's coin by `fmtInr`, like the book they sit beside. */
  const stakeInr = slipStakeInr(slip, stake, cur);
  const figures = slipFigures(slip, stakeInr, odds);
  const projected = projectedBook(slip, stakeInr, odds, slipMarket, book);
  const liveBlocked = slip && slipMarket && slipSection ? rowStatus(slipMarket, slipSection) : null;

  /* Saved stake buttons are rupees; shown (and edited) as round numbers of the player's coin. */
  const uniq = (list) => [...new Set(list)];
  const stakesInr = (stakesQ.data?.stakes || DEFAULT_STAKE_BUTTONS).map((b) => Number(b.value)).filter((n) => n > 0);
  const stakes = uniq(stakesInr.map(cur.chipFromInr).filter((n) => n > 0));
  const ocStakes = uniq((stakesQ.data?.oneClick || DEFAULT_ONE_CLICK_BUTTONS).map(Number).map(cur.chipFromInr));
  const ocStake = ocStakes.includes(ocActive) ? ocActive : ocStakes[0];

  const onCell = (spec) => {
    if (!signedIn) {
      navigate('/login/signin');
      return;
    }
    slipApi.open(spec, oneClick ? ocStake : 0);
  };

  /* Preselect from the lobby (?market&runner&side), once the board is in. */
  const presetDone = React.useRef(false);
  const presetMid = query.get('market');
  const presetRunner = query.get('runner');
  const presetSide = query.get('side') === 'lay' ? 'lay' : 'back';
  const openSlip = slipApi.open;
  React.useEffect(() => {
    if (presetDone.current || !presetMid || !signedIn || !mk.markets.length) return;
    presetDone.current = true;
    const m = mk.markets.find((x) => String(x.mid) === presetMid);
    const s = m?.section?.find((x) => String(x.sid) === String(presetRunner));
    if (!m || !s || rowStatus(m, s)) return;
    const spec = presetSpec(m, s, presetSide);
    if (spec) openSlip(spec);
  }, [presetMid, presetRunner, presetSide, signedIn, mk.markets, openSlip]);

  const onCashout = (market) => {
    const err = slipApi.openCashout(market, book);
    if (err) toast.error(err);
  };

  const onBadlo = () => toast.warning('Badlo bets are not available here yet.');

  /* ── open bets ── */
  const toRow = (b) => ({
    id: b.id,
    runnerName: b.selection || b.fancyName || '—',
    marketName: b.marketType || b.gameType,
    side: b.side,
    price: b.odds,
    stake: b.stake,
    liability: b.liability || undefined,
    placedAt: b.createdAt,
  });
  const matched = (openBetsQ.data?.matched || []).map(toRow);
  const openCount = matched.length;

  const saveStakes = async (values) => {
    setStakeSaving(true);
    setStakeError(null);
    try {
      await saveStakeButtons(values.map(cur.chipToInr).map((v) => ({ label: stakeLabel(v), value: v })));
      refreshStakes();
      setStakeModal(false);
      // TENEXCH SetButtonValueModal's wording, both ways; the modal stays open on a failure.
      toast.success(BET_TOAST.STAKE_BUTTONS_SAVED);
    } catch (e) {
      const msg = e?.message || BET_TOAST.STAKE_BUTTONS_FAILED;
      setStakeError(msg);
      toast.error(msg);
    } finally {
      setStakeSaving(false);
    }
  };

  const saveOneClick = async (next) => {
    try {
      await saveOneClickButtons(next.map(cur.chipToInr));
      refreshStakes();
    } catch (e) {
      toast.error(e?.message || BET_TOAST.GENERIC_ERROR);
    }
  };

  /* ── the slip itself ── */
  let slipNode = null;
  if (slip) {
    const { bv, kind } = slip;
    const oddEven = gtypeOf(bv) === 'oddeven';
    const side = oddEven ? 'back' : bv.betType;
    const pick = oddEven ? (bv.betType === 'yes' ? 'Odd' : 'Even') : null;
    const lineLike = kind === 'fancy' || kind === 'line' || gtypeOf(bv) === 'khado';
    const maxInr = Number(bv.max) > 0 ? Number(bv.max) : null;
    const minInr = bv.is_cashout ? 0 : Math.max(ADDAPLAY_MIN_BET, Number(bv.min) || 0);
    const { min, max } = cur.limits(minInr, maxInr);
    slipNode = (
      <BetSlipInline
        side={side}
        runnerName={pick ? `${bv.runnerName} · ${pick}` : bv.runnerName}
        marketName={bv.is_cashout ? `Cashout · ${bv.mname}` : bv.mname}
        price={slip.display}
        onPriceChange={slipApi.setPrice}
        priceEditable={slip.fieldMode === ODDS_FIELD.STEPPER && !bv.is_cashout}
        stepPrice={slipApi.stepPrice}
        rate={kind === 'fancy' ? bv.size : undefined}
        isLine={lineLike}
        stake={stake}
        onStakeChange={slipApi.setStake}
        quickStakes={stakes}
        minStake={max != null ? min : undefined}
        maxStake={max ?? undefined}
        currency={cur.prefix}
        formatAmount={fmtInr}
        profit={figures.profit}
        liability={figures.liability}
        loading={loading}
        delaySeconds={slipApi.delaySeconds || undefined}
        error={slipApi.error ?? (liveBlocked ? `${liveBlocked[0]}${liveBlocked.slice(1).toLowerCase()}` : null)}
        placeDisabled={Boolean(liveBlocked)}
        onCancel={slipApi.close}
        onClear={() => slipApi.setStake('')}
        onPlace={slipApi.place}
      />
    );
  }

  /* ── render ── */
  const gone = mk.noMarkets || mk.matchGone;
  const sport = sportIconOf(sid);

  const header = (
    <MatchHeader
      name={match?.ename || (headerQ.loading ? 'Loading…' : 'Match')}
      competition={match?.cname}
      sport={sport}
      startTime={match?.stime}
      inPlay={Boolean(match?.iplay)}
      onBack={() => navigate('/sports')}
      tvAvailable={Boolean(scoreUrl)}
      showTv={showScore}
      onToggleTv={setShowScore}
      scoreSlot={
        scoreUrl && showScore ? (
          <iframe
            title="Live score"
            src={scoreUrl}
            className="block h-48 w-full border-0 bg-layer2 sm:h-56"
            loading="lazy"
          />
        ) : null
      }
    />
  );

  if (gone) {
    return (
      <div className="px-4 sm:px-0">
        <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-3 py-4">
          {match && header}
          <Card>
            <p className="text-base font-extrabold text-primary">This match is no longer available</p>
            <p className="mt-1 text-sm text-tertiary">It has finished or been removed from the exchange.</p>
            <Link to="/sports" className="button button-brand button-m mx-auto mt-4 inline-flex h-10 px-5 text-sm">
              Back to Sports
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const oneClickBox = signedIn ? (
    <OneClickToggle
      enabled={oneClick}
      onToggle={setOneClick}
      stakes={ocStakes}
      activeStake={ocStake}
      onSelectStake={setOcActive}
      onStakesChange={saveOneClick}
    />
  ) : null;

  const editStakes = signedIn ? (
    <button
      type="button"
      onClick={() => {
        setStakeError(null);
        setStakeModal(true);
      }}
      className="button button-second button-m h-10 text-sm"
    >
      Edit stakes
    </button>
  ) : null;

  /* Only matched bets exist on this site, so the panel is the matched list — no tabs, no Cancel. */
  const openBets = signedIn ? (
    <OpenBetsPanel
      matched={matched}
      loading={openBetsQ.data === undefined && !openBetsQ.error}
      currency={cur.prefix}
      formatAmount={fmtInr}
    />
  ) : (
    <Card className="!py-6">
      <p className="text-sm text-secondary">Sign in to see your open bets.</p>
      <Link to="/login/signin" className="button button-brand button-m mx-auto mt-3 inline-flex h-9 px-4 text-sm">
        Sign In
      </Link>
    </Card>
  );

  let board;
  if (mk.loading) {
    board = (
      <Card className="flex items-center justify-center gap-2 !py-12">
        <Loading className="size-5" />
        <span className="text-sm text-tertiary">Loading markets…</span>
      </Card>
    );
  } else if (!visible.length) {
    board = (
      <Card>
        <p className="text-sm font-semibold text-secondary">No markets are open on this match right now.</p>
        {mk.error && <p className="mt-1 text-xs text-tertiary">The feed is not answering — retrying.</p>}
      </Card>
    );
  } else {
    board = (
      <>
        {tabs.length > 1 && <MarketFilterTabs tabs={tabs} active={activeTab} onChange={setFilter} />}
        <MarketBlocks
          markets={shown}
          book={book}
          slip={slip}
          slipNode={slipNode}
          projected={projected}
          formatAmount={fmtInr}
          formatLimit={fmtInr}
          disabled={loading}
          signedIn={signedIn}
          onCell={onCell}
          onCashout={onCashout}
          onBadlo={onBadlo}
        />
      </>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-3 py-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {header}
          <ExchangeCurrencyNote className="" />

          <MarketFilterTabs
            className="lg:hidden"
            tabs={[
              { id: 'markets', label: 'Markets' },
              { id: 'bets', label: 'Open Bets', count: signedIn ? openCount : undefined },
            ]}
            active={mobileTab}
            onChange={setMobileTab}
          />

          <div className={cx('flex-col gap-3', mobileTab === 'markets' ? 'flex' : 'hidden lg:flex')}>
            {oneClickBox && <div className="lg:hidden">{oneClickBox}</div>}
            {board}
          </div>

          <div className={cx('flex-col gap-3 lg:hidden', mobileTab === 'bets' ? 'flex' : 'hidden')}>
            {editStakes}
            {openBets}
          </div>
        </div>

        <aside className="hidden w-[22rem] flex-none flex-col gap-3 lg:sticky lg:top-20 lg:flex">
          {oneClickBox}
          {editStakes}
          {openBets}
        </aside>
      </div>

      {stakeModal && (
        <StakeButtonsModal
          values={stakesInr.map(cur.chipFromInr)}
          min={cur.isInr ? 1 : 1 / 10 ** cur.decimals}
          currency={cur.prefix.trim()}
          currencyName={cur.label}
          allowDecimals={!cur.isInr}
          saving={stakeSaving}
          error={stakeError}
          onClose={() => setStakeModal(false)}
          onSave={saveStakes}
        />
      )}
    </div>
  );
}
