import { describe, it, expect } from 'vitest';
import { slipFigures } from './useMatchSlip';

describe('slipFigures — session fancy pays on the rate (size), not the run line', () => {
  const slip = (betType, size) => ({ kind: 'runner', bv: { betType, size, gtype: 'fancy', mname: 'Normal' } });
  it('YES 55 @ 100, ₹100 → profit ₹100, liability ₹100', () => {
    expect(slipFigures(slip('yes', 100), 100, 55)).toEqual({ profit: 100, liability: 100 });
  });
  it('NO 55 @ 90, ₹100 → profit ₹100, liability ₹90', () => {
    expect(slipFigures(slip('no', 90), 100, 55)).toEqual({ profit: 100, liability: 90 });
  });
});
