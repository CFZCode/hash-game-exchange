import { describe, it, expect } from 'vitest';
import { marketTitle } from './shape';

describe('marketTitle', () => {
  it('reads feed codes, keeps named markets as they are', () => {
    expect(marketTitle({ mname: 'MATCH_ODDS' })).toBe('Match Odds');
    expect(marketTitle({ mname: 'OVER_UNDER_15' })).toBe('Over/Under 1.5');
    expect(marketTitle({ mname: '10 over run AFG adv' })).toBe('10 over run AFG adv');
    expect(marketTitle({ mname: 'Bookmaker' })).toBe('Bookmaker');
  });
});
