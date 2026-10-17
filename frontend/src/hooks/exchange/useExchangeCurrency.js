import React from 'react';
import { useSession } from '../../context/session';
import { getUsdPrice } from '../../data/usdPrice';
import { getAlias } from '../../utils/currency';
import { exchangeCode, makeStakeCurrency } from '../../utils/exchange/stakeCurrency';

/**
 * The header wallet's currency for the exchange pages (utils/exchange/stakeCurrency.js): stakes
 * are typed in it and every INR figure mssports sends is printed in it. INR — or a signed-out
 * visitor — is the identity. Re-derived when the session re-renders, which it does when the FX
 * table lands (SessionProvider bumps itself on primeUsdPrices).
 */
export function useExchangeCurrency() {
  const { session } = useSession();
  const name = session?.login ? String(session?.setting?.currencyName ?? '') : '';
  const code = exchangeCode(name);
  const usdPrice = getUsdPrice(name) || getUsdPrice(code);
  const inrUsdPrice = getUsdPrice('INRFIAT') || getUsdPrice('INR');
  return React.useMemo(
    () => makeStakeCurrency({ currencyName: code, usdPrice, inrUsdPrice, alias: code === 'INR' ? 'INR' : getAlias(name || code) }),
    [code, name, usdPrice, inrUsdPrice],
  );
}
