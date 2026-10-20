import { describe, expect, it } from 'vitest';
import { toContest } from './contest';

describe('daily contest board', () => {
  it('a 0-pool board still races for winnerCount places and keeps its end instant', () => {
    const board = { payoutCurrency: 'USDT', payoutPrizePool: '0', winnerCount: 10, startsAt: '2026-10-18T18:30:00.000Z', endsAt: '2026-10-19T18:30:00.000Z', leaderboard: [] };
    const { contest } = toContest({ title: 'Daily Contest', config: { payout: { ranks: [] } }, board, last: null });
    expect(contest.active).toBe(true);
    expect(contest.prizePool).toBe(0);
    expect(contest.userBonusRate).toHaveLength(10);
    expect(contest.endsAt).toBe(board.endsAt);
  });

  it("Last Champion is the previous window's #1 and History lists that window", () => {
    const last = {
      startsAt: '2026-10-18T18:30:00.000Z', endsAt: '2026-10-19T18:30:00.000Z',
      leaderboard: [
        { rank: 1, name: 'parkertester02', usdWagered: '21.26', payout: '0', percentage: 50 },
        { rank: 2, name: 'userx11', usdWagered: '3.96', payout: '0', percentage: 25 },
      ],
    };
    const { contest } = toContest({ title: 'Daily Contest', config: null, board: null, last });
    expect(contest.champion).toEqual({ player: 'parkertester02', rate: 0.5, totalBonus: 0 });
    expect(contest.prev.standings.map((r) => [r.rank, r.player, r.wager, r.rate])).toEqual([
      [1, 'parkertester02', 21.26, 0.5],
      [2, 'userx11', 3.96, 0.25],
    ]);
    expect(contest.prev.start).toBe('10/18/2026');
  });
});
