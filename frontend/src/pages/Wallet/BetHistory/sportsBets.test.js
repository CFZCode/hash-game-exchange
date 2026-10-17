import { describe, expect, it } from 'vitest';
import { normaliseBet } from '../../../utils/exchange/addaplay';
import { betLiability, betPnl, betStatus, formatBetDate, toSportsBet } from './sportsBets';

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
