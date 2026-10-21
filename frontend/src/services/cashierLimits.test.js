import { describe, expect, it } from 'vitest';
import { cashierRangeError } from './cashierLimits';

describe('cashierRangeError', () => {
  const limits = { min: '100', max: '100000', currency: 'INR' };
  it('gives the server message outside the owner limits', () => {
    expect(cashierRangeError('99', limits)).toBe('The minimum is 100 INR');
    expect(cashierRangeError(100001, limits)).toBe('The maximum is 100000 INR');
  });
  it('accepts the bounds and anything when no limit is set', () => {
    expect(cashierRangeError('100', limits)).toBeNull();
    expect(cashierRangeError('100000', limits)).toBeNull();
    expect(cashierRangeError('1', { min: null, max: null, currency: 'INR' })).toBeNull();
  });
});
