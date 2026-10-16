import { describe, expect, it } from 'vitest';
import { toUnlockRows } from './referral';
import { LEVEL_UNLOCKS } from '../pages/Referral/referral';
import { vipTier, vipTierByName } from '../data/vipConfig';

describe('referral unlock table', () => {
  it('answers the capture when the backend has no such setting', () => {
    expect(toUnlockRows(null)).toEqual(LEVEL_UNLOCKS.map((row) => ({ ...row, currency: null })));
    expect(toUnlockRows({ rewardCurrency: 'USDT' })[0].currency).toBeNull();
  });

  it("prints the site admin's rows in the reward currency", () => {
    const rows = toUnlockRows({
      referralUnlocks: {
        currency: 'USDT',
        tiers: [
          { level: 'Bronze I', totalWager: '1000.00000000', unlockAmount: '0.50000000' },
          { level: 'Gold II', totalWager: '1000000.00000000', unlockAmount: '120.00000000' },
          { level: 'Platinum II', totalWager: '8500000.00000000', unlockAmount: '500.00000000' },
          { level: '  ', totalWager: '1', unlockAmount: '1' },
        ],
      },
    });
    expect(rows).toEqual([
      { level: 'Bronze I', wager: '1,000', amount: '+0.50', currency: 'USDT' },
      { level: 'Gold II', wager: '1,000,000', amount: '+120.00', currency: 'USDT' },
      { level: 'Platinum II', wager: '8,500,000', amount: '+500.00', currency: 'USDT' },
    ]);
  });

  it('an empty list is an empty table, not the capture', () => {
    expect(toUnlockRows({ referralUnlocks: { currency: 'USDT', tiers: [] } })).toEqual([]);
  });

  it('a level name on the ladder renders exactly as its number did', () => {
    for (const { level } of LEVEL_UNLOCKS) {
      expect(vipTierByName(vipTier(level).fullName)).toEqual(vipTier(level));
    }
    expect(vipTierByName('Custom Tier')).toEqual({ base: 'Custom', suffix: 'Tier', fullName: 'Custom Tier' });
  });
});
