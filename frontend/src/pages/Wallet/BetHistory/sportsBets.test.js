import { describe, expect, it } from 'vitest';
import { normaliseBet } from '../../../utils/exchange/addaplay';
import { betLiability, betPnl, betStatus, formatBetDate, marketLabel, toSportsBet } from './sportsBets';

/* Rows shaped like the live feed (`GET /cricket/sports-bets/user`), through the exchange's own
   normaliser — exactly what the pane gets. */
const feed = (over) =>
  normaliseBet({
    id: 14,
    game_type: 'MO',
    match_title: 'Bangladesh v Zimbabwe',
    selection_name: 'Bangladesh',
    bet_type: 'back',
    market_type: 'MATCH_ODDS',
    odds: '1.3000',
    stake_amount: '100.00',
    original_currency: 'INR',
    liability: '100.00',
    created_at: '2026-10-17T12:54:37.000Z',
    status: 'closed',
    result_status: 'won',
    fancy_name: 'NULL',
    sport_id: '4',
    league_name: 'One Day Internationals',
    ...over,
  });

describe('status', () => {
  it('reads result_status once settled, open otherwise', () => {
    expect(betStatus(feed({ result_status: 'won' }))).toBe('won');
    expect(betStatus(feed({ result_status: 'lost' }))).toBe('lost');
    expect(betStatus(feed({ result_status: 'void' }))).toBe('void');
    expect(betStatus(feed({ status: 'open', result_status: 'pending' }))).toBe('open');
    expect(betStatus(feed({ status: 'deletebet', result_status: null }))).toBe('void');
  });
});

describe('P&L in INR', () => {
  it('back: won stake×(odds−1), lost −stake', () => {
    expect(betPnl(feed({ result_status: 'won' }))).toBeCloseTo(30);
    expect(betPnl(feed({ result_status: 'lost' }))).toBe(-100);
  });

  it('lay: won stake, lost −liability (or stake×(odds−1) when the feed has none)', () => {
    const lay = { bet_type: 'lay', odds: '1.2800', stake_amount: '200.00', liability: '56.00' };
    expect(betPnl(feed({ ...lay, result_status: 'won' }))).toBe(200);
    expect(betPnl(feed({ ...lay, result_status: 'lost' }))).toBe(-56);
    expect(betPnl(feed({ ...lay, liability: null, result_status: 'lost' }))).toBeCloseTo(-56);
  });

  it('void is 0, open has no result yet', () => {
    expect(betPnl(feed({ result_status: 'void' }))).toBe(0);
    expect(betPnl(feed({ status: 'open', result_status: 'pending' }))).toBeNull();
  });

  it('fancy yes/no sides count as back/lay', () => {
    expect(betPnl(feed({ bet_type: 'yes', odds: '2', result_status: 'won' }))).toBe(100);
    expect(betPnl(feed({ bet_type: 'no', liability: '90', result_status: 'lost' }))).toBe(-90);
  });

  it('liability: a back risks its stake, a lay its liability', () => {
    expect(betLiability(feed({}))).toBe(100);
    expect(betLiability(feed({ bet_type: 'lay', liability: '56.00' }))).toBe(56);
  });
});

describe('the row', () => {
  it('breadcrumb League -> Match -> Market, NULL fancy dropped, sport named', () => {
    const row = toSportsBet(feed({}));
    expect(row.breadcrumb).toBe('One Day Internationals -> Bangladesh v Zimbabwe -> Match Odds');
    expect(row).toMatchObject({ sportName: 'Cricket', sportIcon: 'cricket', selection: 'Bangladesh', back: true, odds: 1.3, stake: 100 });
  });

  it('a fancy market ends on its own name', () => {
    const row = toSportsBet(feed({ game_type: 'FAN', market_type: 'FANCY', fancy_name: '10 over runs BAN' }));
    expect(row.breadcrumb).toBe('One Day Internationals -> Bangladesh v Zimbabwe -> 10 over runs BAN');
  });

  it('dates read dd/mm/yyyy hh:mm:ss (UTC±hh:mm)', () => {
    expect(formatBetDate('2026-10-17T12:54:37.000Z')).toMatch(/^\d{2}\/\d{2}\/2026 \d{2}:\d{2}:\d{2} \(UTC[+-]\d{2}:\d{2}\)$/);
    expect(formatBetDate(null)).toBe('-');
  });
});

/* ── The statement-based view ─────────────────────────────────────────────────────────────────── */
import { buildRows, filterRows, statementRow, toCasinoRow } from './sportsBets';
import { clampStatementWindow, isAgentTreePlayer } from '../../../services/sportsStatement';

const st = (over) => ({
  date: '2026-10-17T14:00:00.000Z',
  currency: 'INR',
  credit: '-',
  debit: '-',
  description: 'Bangladesh v Zimbabwe / MATCH_ODDS',
  betId: 15,
  sportId: '4',
  eventId: '544246120',
  matchId: '8304374687587',
  marketType: 'MATCH_ODDS',
  gameType: 'MO',
  fancyName: null,
  eventType: 'BET_SETTLEMENT',
  ...over,
});
const onMarket = (over) => feed({ match_id: '8304374687587', eventid: '544246120', ...over });

describe('a statement line', () => {
  it('P&L is the ledger figure, not recomputed from odds', () => {
    const row = statementRow(st({ credit: '27.50' }), [onMarket({ result_status: 'won' })]);
    expect(row).toMatchObject({ kind: 'settled', status: 'won', pnl: 27.5, stake: 100, selection: 'Bangladesh', side: 'back', currency: 'INR' });
    expect(row.breadcrumb).toBe('One Day Internationals -> Bangladesh v Zimbabwe -> Match Odds');
    expect(row.drill).toEqual({ matchId: '8304374687587', eventId: '544246120', fancyName: null });
  });

  it('a debit is a loss, a VOID line or nothing moved is void', () => {
    expect(statementRow(st({ debit: '56.00' }), []).status).toBe('lost');
    expect(statementRow(st({ debit: '56.00' }), []).pnl).toBe(-56);
    expect(statementRow(st({ eventType: 'VOID' }), []).status).toBe('void');
    expect(statementRow(st({}), []).pnl).toBe(0);
  });

  it('a market with a back and a lay reads as both sides', () => {
    const row = statementRow(st({ credit: '10' }), [onMarket({}), onMarket({ id: 16, bet_type: 'lay', liability: '28' })]);
    expect(row.side).toBe('mixed');
    expect(row.sides.sort()).toEqual(['back', 'lay']);
  });
});

describe('rows and filters', () => {
  const bets = [
    onMarket({ id: 19, status: 'open', result_status: 'pending', created_at: '2026-10-17T14:02:17.000Z' }),
    onMarket({ id: 15, result_status: 'void', created_at: '2026-10-17T12:54:37.000Z' }),
  ];

  it('open bets from the feed, settled markets from the statement', () => {
    const rows = buildRows({ statement: [st({ eventType: 'VOID' })], bets });
    expect(rows.map((r) => `${r.kind}:${r.status}`)).toEqual(['open:open', 'settled:void']);
  });

  it('with no statement the feed stands in for settled bets too', () => {
    const rows = buildRows({ statement: null, bets });
    expect(rows.map((r) => `${r.kind}:${r.status}`)).toEqual(['open:open', 'settled:void']);
  });

  it('filters by status, side, coin and window', () => {
    const rows = buildRows({ statement: [st({ credit: '5', date: '2026-10-17T13:00:00.000Z' })], bets });
    expect(filterRows(rows, { status: 'open' }).map((r) => r.id)).toEqual([19]);
    expect(filterRows(rows, { status: 'won' })).toHaveLength(1);
    expect(filterRows(rows, { side: 'lay' })).toHaveLength(0);
    expect(filterRows(rows, { currency: 'USDT' })).toHaveLength(0);
    expect(filterRows(rows, { currency: 'INRFIAT' })).toHaveLength(2);
    expect(filterRows(rows, { from: Date.parse('2026-10-17T13:30:00.000Z') }).map((r) => r.id)).toEqual([19]);
  });
});

describe('direct or agent, and the 31-day cap', () => {
  it('reads agentTree, else the agent-only capabilities (never promotions)', () => {
    expect(isAgentTreePlayer({ agentTree: true })).toBe(true);
    expect(isAgentTreePlayer({ agentTree: false, capabilities: { vault: false, swap: false, tips: false } })).toBe(false);
    expect(isAgentTreePlayer({ capabilities: { promotions: false, vault: true, swap: true, tips: true } })).toBe(false);
    expect(isAgentTreePlayer({ capabilities: { promotions: false, vault: false, swap: false, tips: false } })).toBe(true);
    expect(isAgentTreePlayer({})).toBeNull();
  });

  it('a window over 31 days is clamped to the last 31', () => {
    const to = Date.parse('2026-10-17T12:00:00.000Z');
    const w = clampStatementWindow(to - 60 * 86_400_000, to);
    expect(w.clamped).toBe(true);
    expect((w.to - w.from) / 86_400_000).toBe(30);
    expect(clampStatementWindow(to - 86_400_000, to).clamped).toBe(false);
  });
});

describe('marketLabel', () => {
  it('names the over/under line and title-cases the rest', () => {
    expect(marketLabel('OVER_UNDER_15')).toBe('Over/Under 1.5');
    expect(marketLabel('MATCH_ODDS')).toBe('Match Odds');
    expect(marketLabel('NULL')).toBe('');
  });
});

describe('toCasinoRow (Bet History → All)', () => {
  it('a won bet pays (stake + P&L) / stake, an open one 0x, in the wallet key', () => {
    const won = toCasinoRow({ key: 'st:1', time: 5, stake: 100, pnl: 150, currency: 'INR' });
    expect(won).toMatchObject({ distributeId: 'st:1', type: 'Sports', time: 5, payout: 25000, profit: 150, currencyName: 'INRFIAT' });
    expect(toCasinoRow({ key: 'bet:2', time: 6, stake: 100, pnl: null, currency: 'INR' })).toMatchObject({ payout: 0, profit: 0 });
  });
});
