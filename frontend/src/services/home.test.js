import { describe, expect, it } from 'vitest';
import { byUsdProfit } from './home';

describe('home boards rank wins by USD value', () => {
  it('puts 1.55 USDT above 50 INR and 299 USDT above 450 INR', () => {
    const rows = [
      { title: 'Limbo', profit: '50', currency: 'INR' },
      { title: 'Arrow Bow', profit: '450', currency: 'INR' },
      { title: 'Aviator', profit: '1.55', currency: 'USDT' },
      { title: 'Keno', profit: '299.89', currency: 'USDT' },
    ];
    expect(byUsdProfit(rows).map((r) => r.title)).toEqual(['Keno', 'Arrow Bow', 'Aviator', 'Limbo']);
  });
});
