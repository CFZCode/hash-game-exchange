import { describe, expect, it, vi } from 'vitest';

vi.mock('./coinArt.globs.js', () => ({ coins: { '../assets/coins/INRFIAT.png': 'inr.png', '../assets/coins/USDT.png': 'usdt.png' } }));
vi.mock('../services/currencies', () => ({ ownerImage: () => undefined }));

const { coinIcon } = await import('./coinArt');

describe('coinIcon', () => {
  it('finds a bare fiat code (the owner default "INR") under its FIAT file', () => {
    expect(coinIcon('INR')).toBe('inr.png');
    expect(coinIcon('INRFIAT')).toBe('inr.png');
    expect(coinIcon('USDT')).toBe('usdt.png');
    expect(coinIcon('XYZ')).toBeUndefined();
  });
});
