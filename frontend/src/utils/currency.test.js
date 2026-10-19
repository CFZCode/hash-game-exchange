import { describe, expect, it } from 'vitest';
import { coinDecimals, printCurrency, rupeesIn } from './currency';

// A stand-in for useSelectedCurrency(): USDT at ₹83.33, printing "<n> USDT".
const usdt = { code: 'USDT', canConvert: () => true, show: (v) => `${(v * 0.012).toFixed(2)} USDT` };

describe('rupeesIn', () => {
  it('re-prints ₹ figures, units included, in the selected currency', () => {
    expect(rupeesIn('₹1 Lakh Cricket', usdt)).toBe('1200.00 USDT Cricket');
    expect(rupeesIn('a ₹1,00,000 pool, ₹50K race, get ₹1,000', usdt)).toBe('a 1200.00 USDT pool, 600.00 USDT race, get 12.00 USDT');
  });

  it('leaves the copy alone on INR or without an INR price', () => {
    expect(rupeesIn('₹1 Lakh', { ...usdt, code: 'INRFIAT' })).toBe('₹1 Lakh');
    expect(rupeesIn('₹1 Lakh', { ...usdt, canConvert: () => false })).toBe('₹1 Lakh');
    expect(rupeesIn('', usdt)).toBe('');
  });
});

describe('printCurrency decimals', () => {
  it('truncates a crypto figure to fixed places, never rounding up', () => {
    expect(printCurrency(31.5765, 'USDT', { decimals: coinDecimals('USDT') })).toBe('31.57 USDT');
    expect(printCurrency(0.29, 'USDT', { decimals: 2, hasAlias: false })).toBe('0.29');
    expect(printCurrency(-0.0035, 'USDT', { decimals: 2, hasAlias: false })).toBe('0');
    expect(printCurrency(1234.5, 'USDT', { decimals: 2, hasAlias: false })).toBe('1,234.5');
  });
  it('USDT shows 2 places, other coins their catalogue places', () => {
    expect(coinDecimals('usdt')).toBe(2);
    expect(coinDecimals('INR')).toBe(2);
    expect(coinDecimals('BTC')).toBe(7);
  });
});
