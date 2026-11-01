import { describe, expect, it } from 'vitest';
import { fill } from './format';
import { toReferralProgram, CAPTURE_PROGRAM } from '../../services/referral';

describe('referral program from the site admin', () => {
  it('sums the referral steps and reads the commission rate', () => {
    const config = { commissionRate: '10', referralUnlocks: { currency: 'INR', tiers: [{ unlockAmount: '0.50' }, { unlockAmount: '99.50' }] } };
    expect(toReferralProgram(config)).toEqual({ perFriend: 100, currency: 'INR', commissionRate: 10 });
  });
  it('falls back to $1,000 and 25% when not answered', () => {
    expect(toReferralProgram(null)).toEqual(CAPTURE_PROGRAM);
  });
  it("puts the admin's rate where the copy says 25%", () => {
    expect(fill('Get __friendAmount__ each, plus up to 25% commission', '$10.00', '10%')).toBe('Get $10.00 each, plus up to 10% commission');
  });
});
