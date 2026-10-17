import { describe, expect, it } from 'vitest';
import { BET_TYPE_OPTIONS, categoryOfRow, toSportsRow } from './betHistory';

describe('wallet Bet History filters', () => {
  it('offers only the products this site runs', () => {
    expect(BET_TYPE_OPTIONS.map((o) => o.label)).toEqual(['All', 'Original', 'Live', 'Sports', 'Slots']);
    expect(BET_TYPE_OPTIONS.map((o) => o.value)).toEqual(['', '1', '3', '4', '5']);
  });

  it('takes the server category when it sends one, else the old-backend fallback', () => {
    expect(categoryOfRow({ game_category: 'live', game_vendor: 'BGaming' })).toBe('live');
    expect(categoryOfRow({ source_key: 'inhouse' })).toBe('original');
    expect(categoryOfRow({ source_key: 'jsgames', game_vendor: 'in-house' })).toBe('original');
    expect(categoryOfRow({ source_key: 'gis', game_vendor: 'Evolution Gaming' })).toBe('live');
    expect(categoryOfRow({ source_key: 'gis', game_vendor: 'BGaming' })).toBe('slots');
  });
});

describe('a sports exchange bet as a Bet History row', () => {
  const base = { id: 7, matchTitle: 'India v West Indies', selection: 'India', marketType: 'MATCH_ODDS', stake: 1000, createdAt: '2026-10-17T10:00:00.000Z' };

  it('a settled win pays stake + profit over stake', () => {
    const row = toSportsRow({ ...base, isOpen: false, profit: 320 });
    expect(row).toMatchObject({ distributeId: 'sports-7', profit: '320', payout: 13200, currencyName: 'INRFIAT' });
    expect(row.type).toBe('India v West Indies — India · MATCH_ODDS');
    expect(row.time).toBe(Date.parse(base.createdAt));
  });

  it('a lost back bet pays 0x, a lost lay never goes negative', () => {
    expect(toSportsRow({ ...base, isOpen: false, profit: -1000 }).payout).toBe(0);
    expect(toSportsRow({ ...base, isOpen: false, profit: -2400 }).payout).toBe(0);
  });

  it('an open bet shows no result yet', () => {
    expect(toSportsRow({ ...base, isOpen: true, profit: null })).toMatchObject({ payout: 0, profit: '0' });
  });
});
