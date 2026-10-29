import { describe, expect, it } from 'vitest';
import { percentForHref, typeRows } from './bonusContribution';

const table = {
  types: { slots: 0, originals: 0, live: 0 },
  games: [
    { ref: 'bb572488f52fced6a08820c161a352f847867766', percent: 10 },
    { ref: 'mine', percent: 5 },
    { ref: 'classic_dice', percent: 8 },
  ],
};

describe('bonus contribution', () => {
  it('finds a lobby game by its uuid and an Original by its slug', () => {
    expect(percentForHref(table, '/game/bb572488f52fced6a08820c161a352f847867766')).toBe(10);
    expect(percentForHref(table, '/game/mines')).toBe(5);
    expect(percentForHref(table, '/game/classic-dice')).toBe(8);
    expect(percentForHref(table, '/game/other')).toBeNull();
    expect(percentForHref(null, '/game/mines')).toBeNull();
  });

  it('lists the four game types, a missing one at 100%', () => {
    expect(typeRows(table).map((t) => [t.key, t.percent])).toEqual([
      ['slots', 0],
      ['originals', 0],
      ['live', 0],
      ['sports', 100],
    ]);
  });
});
