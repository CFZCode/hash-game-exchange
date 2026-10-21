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

  it('a window closed by End & pay reads Ended, its clock at zero, with its pool and paid rows', () => {
    const board = {
      settled: true, payoutCurrency: 'USDT', payoutPrizePool: '10', winnerCount: 3,
      startsAt: '2026-10-20T18:30:00.000Z', endsAt: '2099-10-21T18:30:00.000Z',
      leaderboard: [{ rank: 1, name: 'testz11', usdWagered: '10.4216', payout: '5.71428571', percentage: 57.1429 }],
    };
    const { contest, standings } = toContest({ title: 'Daily Contest', config: null, board, last: null });
    expect(contest.active).toBe(false);
    expect(contest.endsAt).toBe(null);
    expect([contest.hours, contest.minutes, contest.seconds]).toEqual([0, 0, 0]);
    expect(contest.prizePool).toBe(10);
    expect(standings[0]).toMatchObject({ player: 'testz11', bonus: 5.71428571 });
  });

  it('no settled race: no champion and an empty History', () => {
    const last = { raceId: null, startsAt: null, endsAt: null, leaderboard: [] };
    const { contest } = toContest({ title: 'Daily Contest', config: null, board: null, last });
    expect(contest.champion.player).toBe('');
    expect(contest.prev.standings).toEqual([]);
  });
});
