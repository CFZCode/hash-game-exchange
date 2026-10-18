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
  });
});
