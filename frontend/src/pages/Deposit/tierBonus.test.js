import { describe, expect, it } from 'vitest';
import { tierBonus } from './deposit';

// The live tiers in INR at 0.012: ≥10 USDT 100% max 100 · ≥100 USDT 50% max 500 · ≥1000 USDT 25% max 1000.
const r = 1 / 0.012;
const tiers = [
  { minDeposit: 10 * r, ratio: 1, maxBonus: 100 * r },
  { minDeposit: 100 * r, ratio: 0.5, maxBonus: 500 * r },
  { minDeposit: 1000 * r, ratio: 0.25, maxBonus: 1000 * r },
];

describe('tierBonus', () => {
  it('pays the highest tier reached, like the backend', () => {
    expect(tierBonus(10000, tiers)).toBeCloseTo(5000); // 120 USDT → 50% = 60 USDT
    expect(tierBonus(5000, tiers)).toBeCloseTo(5000); // 60 USDT → 100% = 60 USDT
    expect(tierBonus(100000, tiers)).toBeCloseTo(25000); // 1,200 USDT → 25% = 300 USDT
  });
  it('is null below the first tier', () => {
    expect(tierBonus(500, tiers)).toBeNull();
  });
});
