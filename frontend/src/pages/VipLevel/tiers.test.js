import { describe, expect, it } from 'vitest';
import { toTiers } from './tiers';
import { toVipLadder } from '../../services/vip';

const ladder = toVipLadder({
  unranked: { level: 0, name: 'Beginner', card: 'unranked', badgeUrl: null },
  levels: [
    { level: 2, name: 'Bronze II', minXp: '3000', card: 'bronze', badgeUrl: null },
    { level: 1, name: 'Bronze I', minXp: '1000', card: 'bronze', badgeUrl: null },
    { level: 3, name: 'Silver I', minXp: '30000', card: 'silver', badgeUrl: null },
  ],
});

describe('toTiers', () => {
  it('groups by family in ladder order and marks the current level', () => {
    const tiers = toTiers(ladder, 2);
    expect(tiers.map((t) => t.name)).toEqual(['Beginner', 'Bronze', 'Silver']);
    expect(tiers.map((t) => t.current)).toEqual([false, true, false]);
    expect(tiers[1].subLevels).toEqual([
      { name: 'Bronze I', minXp: 1000, completed: true, current: false },
      { name: 'Bronze II', minXp: 3000, completed: false, current: true },
    ]);
    expect(tiers[2].benefits).toBe('Enhanced Level Up, Weekly & Monthly Bonus.');
  });

  it('puts a signed-out visitor (level 0) on Beginner', () => {
    const tiers = toTiers(ladder, 0);
    expect(tiers[0].current).toBe(true);
    expect(tiers.flatMap((t) => t.subLevels).some((s) => s.completed)).toBe(false);
  });

  it('reads no ladder as null', () => {
    expect(toVipLadder(null)).toBeNull();
  });
});
