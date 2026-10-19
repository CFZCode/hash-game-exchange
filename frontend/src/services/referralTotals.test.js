import { describe, expect, it, vi } from 'vitest';

/* Testuser07's live state: a 1 USDT joining reward still unclaimed, plus one 2 USDT commission
   of which 0.5 is still open. */
const ANSWERS = {
  '/api/v1/user/affiliate/team': { total: 1, members: [] },
  '/api/v1/user/affiliate': null,
  '/api/v1/user/affiliate/rewards': { total: 1, totalAmount: '2', rows: [{ coin: 'USDT', amount: '2' }] },
  '/api/v1/user/affiliate/rewards/unclaimed': {
    claimedTotal: '1.5',
    rows: [
      { kind: 'tier', currency: 'USDT', amount: '1' },
      { kind: 'commission', currency: 'USDT', amount: '0.5' },
    ],
  },
};

vi.mock('./client', () => ({
  USE_FIXTURES: false,
  emptyIfAgentBlocked: (value) => () => value,
  request: (path, opts) => Promise.resolve(opts?.params?.filter ? null : (ANSWERS[path] ?? null)),
}));

vi.stubGlobal('window', { location: { origin: 'https://parker567.com' } });
const { getAffiliateDashboard, getCommissionList } = await import('./referral');

describe('referral totals', () => {
  it('Total Received counts only what was claimed', async () => {
    const { dashboard } = await getAffiliateDashboard();
    expect(dashboard.availableRewardUsd).toBe('1');
    expect(dashboard.rewardReceivedUsd).toBe('0');
    expect(dashboard.availableCommissionUsd).toBe('0.5');
    expect(dashboard.commissionReceivedUsd).toBe('1.5');
  });

  it('Commission by Currency carries commission only, never the joining reward', async () => {
    expect(await getCommissionList()).toEqual([
      { currencyName: 'USDT', availableUsd: '0.5', commissionUsd: '1.5' },
    ]);
  });
});
