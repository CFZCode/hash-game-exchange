/* `ue` in tier-benefits-Djqjq-tJ.js — one line of copy per tier family, verbatim. Eternal's
   second sentence ("Exclusive title & top-level achievements.") is dropped: this platform has no
   titles or achievements behind it, and the rest of each line is backed by the ladder's own
   level-up / weekly / monthly bonuses (`bonusGates` opens all three from level 1, Bronze I). */
export const TIER_BENEFITS = {
  Beginner: '',
  Bronze: 'All Bonuses unlocked and boosted.',
  Silver: 'Enhanced Level Up, Weekly & Monthly Bonus.',
  Gold: 'Superior Level Up, Weekly & Monthly Bonus.',
  Platinum: 'Premium Level Up, Weekly & Monthly Bonus.',
  Diamond: 'Elite Level Up, Weekly & Monthly Bonus.',
  Eternal: 'Maximum Level Up, Weekly & Monthly Bonus.',
};

/* `ve` — the ladder grouped into tier families, in ladder order, with the player's place marked.
   The original finds the current row by XP (`currXP >= minXp`); the platform answers the level
   itself, so it is matched by level here — the same row, since the bands are monotonic.
   `levels` is `[{ level, name, minXp, family, badgeUrl }]` (services/vip.js `toVipLadder`). */
export function toTiers(levels, currentLevel) {
  const groups = new Map();
  for (const row of [...levels].sort((a, b) => a.minXp - b.minXp)) {
    if (!groups.has(row.family)) groups.set(row.family, []);
    groups.get(row.family).push(row);
  }
  return [...groups.entries()].map(([name, rows]) => ({
    name,
    benefits: TIER_BENEFITS[name] || '',
    badgeUrl: rows[0].badgeUrl ?? null,
    current: rows.some((r) => r.level === currentLevel),
    subLevels: rows.map((r) => ({
      name: r.name,
      minXp: r.minXp,
      completed: r.level < currentLevel,
      current: r.level === currentLevel,
    })),
  }));
}
