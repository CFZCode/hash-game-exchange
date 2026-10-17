import { describe, expect, it } from 'vitest';
import { toTableRow } from './bets';
import { getUsdPrice } from '../../../data/usdPrice';

const bet = { betId: '1', gameUnique: 'limbo', fullName: 'Limbo', userName: 'x', currencyName: 'USDT', throwAmount: '10', profitAmount: '5', payout: 150 };

describe('Latest Bets rows print in the viewer currency', () => {
  it('keeps bc.game USD by default', () => {
    expect(toTableRow(bet).bet).toMatch(/^\$/);
  });
  it('converts into the selected wallet and swaps the coin mark', () => {
    const row = toTableRow(bet, 'INRFIAT');
    const inr = (10 * getUsdPrice('USDT')) / getUsdPrice('INRFIAT');
    expect(row.bet.startsWith('₹')).toBe(true);
    expect(Number(row.bet.replace(/[^\d.]/g, ''))).toBeCloseTo(inr, 0);
    expect(row.coin).toBe('INR');
  });
  it('leaves an unpriced coin in its own coin', () => {
    const row = toTableRow({ ...bet, currencyName: 'NOPE' }, 'INRFIAT');
    expect(row.bet.startsWith('₹')).toBe(false);
  });
});
