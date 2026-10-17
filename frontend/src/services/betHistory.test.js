import { describe, expect, it } from 'vitest';
import { BET_TYPE_OPTIONS, categoryOfRow } from './betHistory';

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
