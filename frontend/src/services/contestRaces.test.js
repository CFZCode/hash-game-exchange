import { describe, expect, it, vi } from 'vitest';

/* Daily switched off by the admin, weekly on: both boards still answer (backend rule). */
const ANSWERS = {
  '/api/v1/user/race': [
    { type: 'daily', enabled: false, configured: true, payout: { ranks: [] } },
    { type: 'weekly', enabled: true, configured: true, payout: { currency: 'USDT', prizePool: '100', ranks: [{ percentage: 60 }, { percentage: 40 }] } },
  ],
  '/api/v1/user/race/daily/leaderboard': { type: 'daily', endsAt: '2099-01-01T00:00:00Z', leaderboard: [] },
  '/api/v1/user/race/weekly/leaderboard': {
    type: 'weekly', payoutCurrency: 'USDT', payoutPrizePool: '100', startsAt: '2026-10-19T00:00:00Z', endsAt: '2099-01-01T00:00:00Z',
    leaderboard: [
      { rank: 1, name: 'boat**1', usdWagered: '50', payout: '60', percentage: 60, isBoat: true },
      { rank: 2, name: 'real**2', usdWagered: '20', payout: '40', percentage: 40 },
    ],
    me: { rank: 2, usdWagered: '20' },
  },
};

vi.mock('./client', () => ({
  USE_FIXTURES: false,
  emptyIfAgentBlocked: () => (error) => { throw error; },
  isAgentBlocked: () => false,
  request: (path) => Promise.resolve(ANSWERS[path] ?? null),
}));

const { getContest, getContestRank, getHomeContest, getRaceFlags } = await import('./contest');

describe('daily and weekly races, live', () => {
  it('flags follow the admin switch', async () => {
    expect(await getRaceFlags()).toEqual({ daily: false, weekly: true, any: true });
  });

  it('a switched-off race reads as disabled even though its board answers', async () => {
    const { contest } = await getContest('daily');
    expect(contest.enabled).toBe(false);
  });

  it('reads the weekly board, its pool and rows (a boat row like any other)', async () => {
    const { contest, standings } = await getContest('weekly');
    expect(contest).toMatchObject({ type: 'weekly', title: 'Weekly Contest', enabled: true, active: true, prizePool: 100 });
    expect(standings.map((r) => [r.rank, r.player, r.wager])).toEqual([[1, 'boat**1', 50], [2, 'real**2', 20]]);
    expect(standings[0]).not.toHaveProperty('isBoat');
    expect(await getContestRank('weekly')).toEqual({ rank: 2, wager: 20 });
  });

  it('the home tab follows the race that is on', async () => {
    const { contest } = await getHomeContest();
    expect(contest.type).toBe('weekly');
    expect(contest.enabled).toBe(true);
  });
});
