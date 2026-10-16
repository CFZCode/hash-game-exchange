import * as globMaps from './coinArt.globs.js';
import { ownerImage } from '../services/currencies';
/* The coin-image glob, in one module for the reason `utils/gameArt.js` is: `import.meta.glob`
 * resolves relative to the file it is written in, so a shared glob can only live in one place.
 *
 * The original does not bundle these — `YC` in index-BsFv7ByC.js builds a CDN URL:
 *
 *   function YC(t, e) {
 *     let n = _i.getAlias(t).replace(/FIAT$/, "");
 *     return e = e ?? (t.endsWith("FIAT") ? "rect" : "black"),
 *            `https://imgxcut.com/coin/${n}.${e}.png`
 *   }
 *
 * so the file is named after the ALIAS, not the id, and fiat takes the `rect` cut while crypto
 * takes `black`. Every file in `assets/coins/` was pulled from that URL and saved under its
 * `currencyName` instead, which is the key everything here looks a coin up by and the convention
 * the four older globs in this project already follow. The four aliased coins are therefore
 * `KLAY.png` (fetched as KAIA), `TON.png` (GRAM), `UST.png` (USTC) and `TOMO.png` (VIC).
 *
 * Four other modules — the bet feed, the deposit-offer dialog, Pay Your Way and the referral
 * ticker — still carry their own copy of this glob. They were left alone; this exists because
 * the header and its currency dropdown are two files that need the same one.
 */
const coins = globMaps.coins;

/* Undefined for a currency with no file, which is deliberate: an `<img>` with `src={undefined}`
   renders nothing, where a fallback image would put another coin's mark on the row.

   ── WHICH CURRENCIES HAVE NO FILE, AND WHY THAT IS NOT FIXABLE HERE ──────────────────────────

   The 148-row FIXTURE wallet in `context/account.js` is FULLY COVERED — all 59 fiat and all 89
   crypto rows resolve, checked file-by-file. So nothing is missing on the fixture path.

   The LIVE wallet is a different set: the platform's own 28 columns (`wallet.constants.js`), and
   **five of them have no file and cannot get one**:

     USDP  MKR  NC  MVR  BJB

   None of the five is in bc.game's currency catalogue, and `imgxcut.com` is keyed to that
   catalogue rather than being a general coin registry — probed directly, all five 404 on BOTH
   cuts (`.black` and `.rect`). USDP and MKR are real, widely-listed tokens and still 404, which
   is what establishes the CDN is bc.game's own and not a public one. `NC`, `MVR` and `BJB` are
   iBitPlay's, so no bc.game source could exist for them even in principle.

   `BUSD` and `SC` WERE two more and are now fetched: both are in the catalogue, both answered on
   the `.black` cut, and both are saved here under their `currencyName` like everything else.
   That is the whole of what the CDN can supply — do not go looking for the other five on another
   host, because an icon from anywhere else is invention, and for `BJB` (the platform's bonus
   currency) there is nothing to be faithful to.

   ── WHERE THE GAP IS VISIBLE, WHICH IS ONLY ONE OF THE TWO SURFACES ──────────────────────────

   `/wallet/balance` never shows a blank: its `groupWallet` opens with
   `.filter(coin => getCurrency(coin.currencyName))`, so a row the catalogue does not know is
   DROPPED before it can render — all five disappear from that page entirely.

   The header dropdown and Manage Assets (both `Header/AfterLogin/CurrencySelect.jsx`) have no
   such guard: an unknown `currencyType` falls to `type ?? 'CHAIN'`, so the five land in
   Cryptocurrency and render with an empty 24px box. Confirmed in a browser against the live
   backend — 28 rows, 5 with `naturalWidth === 0`. Both behaviours are the original's own chunks,
   which is why this is recorded rather than reconciled. */
/* A coin this build has no file for (USDP, MKR, MVR…) falls back to the owner's own artwork from
   `/admin/currencies/public`, so it never renders as an empty box. */
export const coinIcon = (currencyName) => coins[`../assets/coins/${currencyName}.png`] ?? ownerImage(currencyName);
