import { describe, expect, it } from 'vitest';
import { getSiteEpoch, liveRead, markLiveStale, markLiveWritten, onSiteEpoch, onSyncWanted, publishLiveState, setLiveActive } from './liveStore';

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

describe('asking the socket for a state', () => {
  it('a read with nothing fresh asks at once and is answered by the reply; a landed write asks too', async () => {
    let asked = 0;
    onSyncWanted(() => {
      asked += 1;
      // the socket answers shortly after it is asked
      setTimeout(() => publishLiveState({ signedIn: true, me: { id: 7 } }, 'tok'), 5);
    });
    setLiveActive(true);
    markLiveStale(); // nothing from before now may answer

    const me = await liveRead('/api/v1/user/auth/me', 'tok', 1000);
    expect(asked).toBe(1);
    expect(me).toEqual({ id: 7 });

    // fresh now: answered without asking
    expect(await liveRead('/api/v1/user/auth/me', 'tok', 1000)).toEqual({ id: 7 });
    expect(asked).toBe(1);

    markLiveWritten();
    expect(asked).toBe(2);
    setLiveActive(false);
  });
});
