import { describe, expect, it } from 'vitest';
import { toFavourite } from './profile';

describe('profile favourites', () => {
  it('links an Original by its slug and a catalogue game by its id', () => {
    const og = toFavourite({ key: 'og:mine', name: 'Mines', wageredUsd: '12.5' });
    expect(og.gameUnique).toBe('mines');
    expect(og.betAmountUsd).toBe('12.5');
    expect(og.gameItem.fullName).toBe('Mines');
    expect(toFavourite({ key: 'js:abc:1', name: 'Slot' }).gameItem).toEqual({
      fullName: 'Slot', iconThreeFour: undefined, gameIdentity: { gameUrl: 'abc:1' },
    });
  });
});
