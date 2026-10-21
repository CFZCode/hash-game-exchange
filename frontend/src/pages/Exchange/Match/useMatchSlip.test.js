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

describe('slipFigures — TENEXCH calcPL on runner markets', () => {
  const slip = (betType, gtype, mname, sid = '4') => ({ kind: 'runner', bv: { betType, gtype, mname, sid } });
  it('Match Odds LAY 1000 @ 2.5 → profit 1000 (the stake), liability 1500', () => {
    expect(slipFigures(slip('lay', 'match', 'MATCH_ODDS'), 1000, 2.5)).toEqual({ profit: 1000, liability: 1500 });
  });
  it('Match Odds BACK 1000 @ 2.5 → profit 1500, liability 1000', () => {
    expect(slipFigures(slip('back', 'match', 'MATCH_ODDS'), 1000, 2.5)).toEqual({ profit: 1500, liability: 1000 });
  });
  it('any match1 market prices as a percent (Bookmaker, and a named one)', () => {
    expect(slipFigures(slip('back', 'match1', 'Bookmaker'), 100, 57)).toEqual({ profit: 57, liability: 100 });
    expect(slipFigures(slip('lay', 'match1', 'Score More Runs 1st Inn'), 100, 13)).toEqual({ profit: 100, liability: 13 });
  });
  it('a horse racecard prints profit 0 (TENEXCH horse slip); greyhound computes it', () => {
    expect(slipFigures(slip('back', 'match', 'MATCH_ODDS', '10'), 100, 5).profit).toBe(0);
    expect(slipFigures(slip('back', 'match', 'MATCH_ODDS', '65'), 100, 5).profit).toBe(400);
  });
});
