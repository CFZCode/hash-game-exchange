import { describe, expect, it } from 'vitest';
import { getSiteEpoch, onSiteEpoch, publishLiveState } from './liveStore';

describe('site epoch', () => {
  it('moves only when the site half of the state changes', () => {
    const seen = [];
    const off = onSiteEpoch((e) => seen.push(e));
    const start = getSiteEpoch();

    publishLiveState({ flags: { inr: true }, currencies: [{ code: 'INR' }], balances: { INR: '1' } });
    expect(getSiteEpoch()).toBe(start); // the first state is not a change

    publishLiveState({ flags: { inr: true }, currencies: [{ code: 'INR' }], balances: { INR: '2' } });
    expect(getSiteEpoch()).toBe(start); // a balance tick is not a site change

    publishLiveState({ flags: { inr: false }, currencies: [], balances: { INR: '2' } });
    expect(getSiteEpoch()).toBe(start + 1); // the owner took INR out

    off();
    expect(seen).toEqual([start + 1]);
  });
});
