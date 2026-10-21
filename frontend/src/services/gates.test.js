import { describe, expect, it } from 'vitest';
import { gateOf, makeGates, walletCoins } from './gates';

const AGENT = { promotions: false, vault: false, deposit: false, swap: false, withdraw: false, tips: false, kyc: false };
const rows = [{ currencyName: 'INRFIAT' }, { currencyName: 'USDT' }, { currencyName: 'BTC' }];

describe("agent's player (user, 2026-10-18)", () => {
  it('sees INR only, never another coin', () => {
    expect(walletCoins(rows, true)).toEqual([{ currencyName: 'INRFIAT' }]);
    expect(walletCoins(rows.slice(1), true)).toEqual([]);
    expect(walletCoins(rows, false)).toBe(rows);
  });

  it('has no bonus, promotions, KYC, payout accounts or whitelist', () => {
    const g = makeGates({ capabilities: AGENT });
    expect(g.agentPlayer).toBe(true);
    for (const gate of ['bonus', 'vip', 'affiliate', 'promotions', 'deposit', 'withdraw', 'kyc']) expect(g.on(gate)).toBe(false);
    expect(gateOf('/settings/payment')).toBe('withdraw');
    expect(g.routeOn('/settings/whitelist/add')).toBe(false);
    expect(g.routeOn('/wallet/rollover')).toBe(false);
    expect(makeGates({ capabilities: {} }).routeOn('/wallet/rollover')).toBe(true);
  });
});

describe('owner / Super Admin section switches (user, 2026-10-21)', () => {
  it('casino off closes the lobby and its promotions, Originals keep their own switch', () => {
    const g = makeGates({ flags: { casino: false } });
    for (const href of ['/casino', '/casino/slots', '/gamelist/live', '/section/hot_games', '/promotion/casino/x']) expect(g.routeOn(href)).toBe(false);
    for (const href of ['/casino/brand', '/section/originals', '/promotion/sports/x', '/sports']) expect(g.routeOn(href)).toBe(true);
  });

  it('sports or originals off closes their pages and promotions only', () => {
    const g = makeGates({ flags: { sports: false, originals: false } });
    for (const href of ['/sports?sport=inplay', '/promotion/sports/x', '/casino/brand']) expect(g.routeOn(href)).toBe(false);
    for (const href of ['/casino', '/promotion/casino/x']) expect(g.routeOn(href)).toBe(true);
  });
});
