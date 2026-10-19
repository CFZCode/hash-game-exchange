import { describe, expect, it } from 'vitest';
import { toContest } from './contest';

describe('daily contest board', () => {
  it('a 0-pool board still races for winnerCount places and keeps its end instant', () => {
    const board = { payoutCurrency: 'USDT', payoutPrizePool: '0', winnerCount: 10, startsAt: '2026-10-18T18:30:00.000Z', endsAt: '2026-10-19T18:30:00.000Z', leaderboard: [] };
    const { contest } = toContest({ title: 'Daily Contest', config: { payout: { ranks: [] } }, board, history: [] });
    expect(contest.active).toBe(true);
    expect(contest.prizePool).toBe(0);
    expect(contest.userBonusRate).toHaveLength(10);
    expect(contest.endsAt).toBe(board.endsAt);
  });
});
