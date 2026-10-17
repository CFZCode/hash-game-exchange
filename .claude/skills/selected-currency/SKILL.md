---
name: selected-currency
description: Make every amount on the Parker567 player site (frontend/) show in the currency the player selected in the header wallet (or "View in currency"), converted at the site's exchange rates, while every API call keeps the currency the backend expects. Use when the user says amounts show in $/USD/₹ instead of the selected coin, "jo currency select hai usi mein dikhe", "conversion har jagah", "selected currency ke hisaab se calculation", when building or touching any page that prints money (wallet, referral, bonus, VIP, rakeback, promotions, contests, races, exchange, casino), or when reviewing a page for currency correctness.
---

# Selected currency, everywhere

**Rule:** a player who selects INR in the header reads every figure in ₹. A player on USDT reads it in USDT. The backend is never asked to change: amounts are converted for DISPLAY and converted back for INPUT. A page that prints `$0.00` while the header says ₹6,000 is a bug.

## The one source of truth

`frontend/src/hooks/useSelectedCurrency.js`. Use it, and never re-derive the target on a page.

```js
import { useSelectedCurrency } from '../../hooks/useSelectedCurrency';

const cur = useSelectedCurrency();
cur.code                        // 'INRFIAT' | 'USDT' | 'BTC' | … (View-in-currency wins, then the header wallet, then USDT)
cur.show(amount, 'USDFIAT')     // formatted string in the selected currency ("₹1,234.00", "14.81 USDT")
cur.convert(amount, 'INRFIAT')  // number in the selected currency, for sums, progress bars, comparisons
cur.toSource(typed, 'INRFIAT')  // a typed amount back into the backend's currency before sending
cur.canConvert('USDFIAT')       // false when the FX table has no price: show the source figure instead, never 0
```

What it builds on, so you don't add a second one:
- `utils/currency.js`: `printCurrency(amount, from, { target })`, `convertCurrency(v, from, to)`, `getAlias`, `isFiatCode`. This is the complete port.
- `data/usdPrice.js`: `getUsdPrice(code)`, the FX table. `services/exchangeRate.js` `primeUsdPrices()` fills it, and SessionProvider re-renders all `useSession()` consumers when it lands.
- Exchange (sports) pages already do this through `hooks/exchange/useExchangeCurrency.js` and `utils/exchange/stakeCurrency.js`, because the backend there is INR-only and stakes are typed in the coin. Keep using those inside `pages/Exchange` and `components/exchange`. They follow the same rule.

## Codes: get them right or the number is silently 0

- Fiat wallet keys carry `FIAT`: `INRFIAT`, `USDFIAT`. Crypto codes are bare: `USDT`, `BTC`.
- APIs send bare codes (`INR`, `inr`, `USD`). Normalise first: uppercase, and `isFiatCode(code) ? code + 'FIAT' : code`. A bare `INR` passed to `getUsdPrice` is 0, and `convertCurrency` then prints 0.
- "USD by design" fields (keys ending in `Usd`, VIP wager thresholds, race prize pools, reward designs) are `USDFIAT` sources. They still get DISPLAYED in the selected currency. Only the source code is USD.

## How to apply it to a page

1. **Find every money print.** On the page, grep for `printCurrency(`, `toFiatStr(`, `Intl.NumberFormat(`, `'$'`, `'₹'`, `USDFIAT`, `.toFixed(`, `formatAmount`, `CurrencyAmount`, and any local helper. `pages/Referral/format.js` has its own PARTIAL `printCurrency` that never converts, so replace calls to it on amount rows. Check `components/shared/Contest` the same way.
2. **Name each figure's source currency.** Read the service or adapter that produced it (`services/*.js`), not the label on screen. Write the source next to the call: `cur.show(r.amount, 'USDFIAT') // referral rewards are USD`.
3. **Display through `cur.show` / `cur.convert`.** Sums are taken in the source currency and converted once at the end. Converting each row and then summing compounds the rounding.
4. **Inputs (withdraw, swap, tip, stake, transfer):** the user types in `cur.code`. Validate min/max after converting the backend's limits with `cur.convert`, and name the selected coin in the message. Send `cur.toSource(value, backendCode)`, rounded to the backend's decimals (fiat 2, crypto per coin). Never send the typed number as if it were the backend's currency.
5. **Unpriced coin:** when `!cur.canConvert(src)`, print the source figure with its own code (`printCurrency(v, src)`). A converted 0 is wrong.
6. **Coin icons next to amounts** must match the printed currency. Swap the icon to `cur.code` when you convert.

## Don'ts

- Don't change backend contracts or send converted values to an API that expects its own currency.
- Don't hardcode `USDFIAT`/`$` as a display target, and don't add another "current currency" read (`session.setting.currencyName` scattered through a page). Go through the hook.
- Don't convert the same value twice. An adapter that already returns selected-currency numbers must say so in its name or comment.
- Don't touch pixel/markup fidelity while doing this (`hash-ui-fidelity` skill). Only the number and its unit change.

## Verify

1. `cd frontend && npx vitest run && npx eslint <changed files>`.
2. In the browser (chrome-devtools; signed-in test pages are listed in the `signed-in-qa` skill), check the page twice:
   - with the header wallet on **INR**: every figure in ₹;
   - with it on **USDT**: every figure in USDT, equal to the ₹ figure ÷ the INR rate (≈ 83.33 when USDT = $1 and INR = $0.012).
   Read the numbers with `evaluate_script`, don't eyeball them. Switching the wallet is a player preference write: say you did it, and put it back.
3. Report each page touched with one before/after figure pair, plus any figure left in a fixed currency on purpose and why.
