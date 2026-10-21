import { describe, it, expect, afterEach } from 'vitest';
import { toWalletRows } from './auth';
import { isCurrencyEnabled } from './siteConfig';
import { isCurrencyListed, enabledTokens, filterListedCodes, setEnabledCurrencies, tokensFor } from './currencies';
import { tokensFor as capturedTokensFor } from '../data/currencyTokens';

/* Trimmed from `GET /admin/currencies/public` on :4700 (2026-10-15). */
const LISTED = [
  { code: 'INR', kind: 'fiat', networks: [] },
  { code: 'USDT', kind: 'crypto', networks: [{ key: 'TRC20', name: 'TRC20' }, { key: 'ERC20', name: 'ERC20' }, { key: 'BEP20', name: 'BEP20' }] },
  { code: 'BTC', kind: 'crypto', networks: [{ key: 'BTC', name: 'Bitcoin' }] },
  { code: 'ETH', kind: 'crypto', networks: [{ key: 'ERC20', name: 'ERC20' }] },
  { code: 'BCH', kind: 'crypto', networks: [] },
  { code: 'GOLD', kind: 'crypto', networks: [] },
];

const BALANCES = { BTC: '0.00000000', INR: '450.00000000', USDT: '0.00000000', NC: '5.00000000', LTC: '0.00000000', GOLD: '1.00000000' };
const codes = (rows) => rows.map((row) => row.aliasCurrencyName);

afterEach(() => setEnabledCurrencies(null));

describe('toWalletRows', () => {
  it('keeps every row with neither a flag map nor a coin list (fail-open)', () => {
    expect(codes(toWalletRows(BALANCES, null, null))).toEqual(['BTC', 'INR', 'USDT', 'NC', 'LTC', 'GOLD']);
  });

  it('drops a coin missing from the owner list, owner-created coins included', () => {
    expect(codes(toWalletRows(BALANCES, null, LISTED))).toEqual(['BTC', 'INR', 'USDT', 'GOLD']);
  });

  it('applies the site flags and the list together, sort stays dense', () => {
    const rows = toWalletRows(BALANCES, { btc: false, nc: false }, LISTED);
    expect(codes(rows)).toEqual(['INR', 'USDT', 'GOLD']);
    expect(rows.map((row) => row.sort)).toEqual([0, 1, 2]);
    expect(rows[0].currencyName).toBe('INRFIAT');
  });

  it('cryptocoin off hides every crypto row but not the fiat', () => {
    expect(codes(toWalletRows(BALANCES, { cryptocoin: false }, LISTED))).toEqual(['INR']);
  });

  it('an empty list (owner switched everything off) hides everything', () => {
    expect(toWalletRows(BALANCES, null, [])).toEqual([]);
  });
});

describe('isCurrencyEnabled / isCurrencyListed', () => {
  it('reads absent flags and a missing map as on', () => {
    expect(isCurrencyEnabled(null, 'BTC', false)).toBe(true);
    expect(isCurrencyEnabled({ btc: false }, 'BTC', false)).toBe(false);
    expect(isCurrencyEnabled({ cryptocoin: false }, 'INR', true)).toBe(true);
  });

  it('matches bare and FIAT-suffixed codes, null lists everything', () => {
    expect(isCurrencyListed(LISTED, 'INRFIAT')).toBe(true);
    expect(isCurrencyListed(LISTED, 'usdt')).toBe(true);
    expect(isCurrencyListed(LISTED, 'SOL')).toBe(false);
    expect(isCurrencyListed(null, 'SOL')).toBe(true);
    expect(filterListedCodes(['ETH', 'SOL', 'BTC', 'TON'], LISTED)).toEqual(['ETH', 'BTC']);
  });
});

describe('enabled networks', () => {
  const chains = (rows) => rows.map((row) => row.chain);

  it('cuts the captured table to the owner networks', () => {
    expect(chains(enabledTokens('USDT', LISTED))).toEqual(['TRON', 'BSC', 'ETHEREUM']);
    expect(chains(enabledTokens('ETH', LISTED))).toEqual(['ETHEREUM']);
    expect(chains(enabledTokens('BTC', LISTED))).toEqual(['BITCOIN']);
  });

  it('leaves the table whole with no list, no networks, or nothing in common', () => {
    expect(enabledTokens('USDT', null)).toBe(capturedTokensFor('USDT'));
    expect(enabledTokens('BCH', LISTED)).toBe(capturedTokensFor('BCH'));
    const odd = [{ code: 'ETH', networks: [{ key: 'STARKNETX' }] }];
    expect(enabledTokens('ETH', odd)).toBe(capturedTokensFor('ETH'));
  });

  it("USDT on every CCPayment network shows each chain once (user, 2026-10-21)", () => {
    const keys = ['TRC20', 'ERC20', 'BEP20', 'SOL', 'POLYGON', 'TON', 'ARETH', 'OPTIMISM', 'OPBNB'];
    const rows = enabledTokens('USDT', [{ code: 'USDT', networks: keys.map((key) => ({ key, name: key })) }]);
    expect(chains(rows)).toEqual(['TRON', 'BSC', 'ETHEREUM', 'SOLANA', 'POLYGON', 'TON', 'OPTIMISM', 'ARETH', 'OPBNB']);
  });

  it('tokensFor reads the store and keeps one array per coin', () => {
    expect(tokensFor('USDT')).toBe(capturedTokensFor('USDT'));
    setEnabledCurrencies(LISTED);
    const first = tokensFor('USDT');
    expect(chains(first)).toEqual(['TRON', 'BSC', 'ETHEREUM']);
    expect(tokensFor('USDT')).toBe(first);
  });
});
