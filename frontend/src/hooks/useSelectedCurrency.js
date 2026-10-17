import React from 'react';
import { useSession } from '../context/session';
import { getUsdPrice } from '../data/usdPrice';
import { convertCurrency, getAlias, printCurrency, walletCode } from '../utils/currency';
import { useSiteCurrency } from './useSiteCurrency';

/**
 * The currency every amount on the player site is SHOWN in, and the helpers that put a figure
 * into it. One answer for the whole site (the `selected-currency` skill in .claude/skills):
 *
 *   - "View in currency" on (Settings → Preferences: `enableLocaleCurrency`) → that currency
 *     (`localeCurrencyName`, e.g. USDFIAT);
 *   - otherwise the header wallet the player selected (`currencyName`, e.g. INRFIAT, USDT);
 *   - signed out → the site's fallback, USDT.
 *
 * Codes are this build's wallet keys: fiat carries the `FIAT` suffix (INRFIAT, USDFIAT), crypto is
 * bare (USDT, BTC). A source amount is converted through the FX table (`data/usdPrice.js`, primed
 * by SessionProvider, which re-renders every `useSession()` consumer when it lands, so figures
 * re-print at the new rates). An unpriced source converts to 0 — `canConvert` says whether it can.
 *
 *   const cur = useSelectedCurrency();
 *   cur.show(row.amount, 'USDFIAT')        // "₹1,234.00" for an INR wallet, "14.81 USDT" for USDT
 *   cur.convert(row.amount, 'INRFIAT')     // a number in the selected currency, for maths
 *   cur.toSource(typed, 'INRFIAT')         // a typed amount back into what the backend takes
 */
export function useSelectedCurrency({ site = false } = {}) {
  const { session } = useSession();
  const siteCode = useSiteCurrency();
  const setting = session?.setting ?? {};
  const signedIn = Boolean(session?.login);
  // `site`: bonus / promotion / VIP / wager figures always read in the owner's default coin
  // (owner panel `default_currency`), whatever the player picked in the header.
  const code = String(
    site
      ? walletCode(siteCode || 'USDT')
      : (setting.enableLocaleCurrency && setting.localeCurrencyName) || (signedIn && setting.currencyName) || 'USDT'
  ).toUpperCase();
  const rate = getUsdPrice(code);

  return React.useMemo(() => {
    const canConvert = (from) => String(from).toUpperCase() === code || (rate > 0 && getUsdPrice(String(from).toUpperCase()) > 0);
    return {
      /** The selected code (INRFIAT, USDT, …). */
      code,
      /** What a person reads after a number: ₹ codes print their own symbol, crypto its alias. */
      alias: getAlias(code),
      isFiat: code.endsWith('FIAT'),
      canConvert,
      /** A number in the selected currency. */
      convert: (amount, from = 'USDFIAT') => {
        const src = String(from).toUpperCase();
        return src === code ? Number(amount) || 0 : convertCurrency(amount, src, code);
      },
      /** Back from the selected currency to `to` (what an API takes). */
      toSource: (amount, to = 'INRFIAT') => {
        const dst = String(to).toUpperCase();
        return dst === code ? Number(amount) || 0 : convertCurrency(amount, code, dst);
      },
      /** The formatted figure in the selected currency (printCurrency with the target forced). */
      show: (amount, from = 'USDFIAT', options = {}) =>
        printCurrency(amount, String(from).toUpperCase(), { ...options, target: code }),
    };
    // `rate` is in the deps so the helpers are rebuilt when the FX table lands.
  }, [code, rate]);
}

export default useSelectedCurrency;
