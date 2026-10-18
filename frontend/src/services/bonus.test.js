import { describe, expect, it } from 'vitest';
import { toRechargeConfig } from './bonus';

const schedule = [
  { percent: 180, minDeposit: '5.00', maxBonus: '0.00' },
  { percent: 240, minDeposit: '10.00', maxBonus: '0.00' },
  { percent: 300, minDeposit: '20.00', maxBonus: '0.00' },
  { percent: 360, minDeposit: '30.00', maxBonus: '50.00' },
];
const monthly = (usedThisMonth, eligible = true) => ({
  enabled: true,
  eligible,
  currency: 'USDT',
  tiers: [{ minDeposit: '1.00', percent: 100, maxBonus: '0.00' }],
  program: { mode: 'monthly', unlockMode: 'gradual', schedule, usedThisMonth },
});

describe('toRechargeConfig', () => {
  it('offers the next monthly row', () => {
    const c = toRechargeConfig(monthly(1));
    expect(c.monthly).toEqual({ n: 2, total: 4, gradual: true });
    expect(c.currentUseConfigs[0]).toMatchObject({ seq: 2, minDeposit: 10, bonusRatio: 2.4, maxBonus: null });
    expect(toRechargeConfig(monthly(3)).currentUseConfigs[0]).toMatchObject({ bonusRatio: 3.6, maxBonus: 50 });
  });

  it('offers nothing once all four are used', () => {
    expect(toRechargeConfig(monthly(4, false))).toBeNull();
  });

  it('keeps first-deposit mode on the lowest tier', () => {
    const c = toRechargeConfig({ ...monthly(0), program: { mode: 'first', schedule: [] } });
    expect(c.monthly).toBeNull();
    expect(c.currentUseConfigs[0]).toMatchObject({ seq: 1, minDeposit: 1, bonusRatio: 1 });
  });
});
