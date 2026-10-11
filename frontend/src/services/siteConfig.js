import { request } from './client';
import { PLATFORM } from './endpoints';

/* The platform's public feature-flag map — `GET /admin/site-config/public`, unauthenticated.
 *
 * ONE FLAT OBJECT of 76 keys — ~72 booleans and the four decimal strings (`registerbonus`,
 * `affiliatebonus`, `comissionpercent`, `clubrake`) beside them. NOT `{flags, amounts}`: those are
 * local variable names in `publicSettings()`, which spreads them together before answering, and
 * an earlier draft of this note mistook the one for the other. `isEnabled` reads `flags?.flags ??
 * flags` and so was right either way, which is exactly why the mistake survived a passing test.
 *
 * This module owns the ONE rule that everything reading it depends on, and it is the backend's
 * own rather than this build's:
 *
 *   **AN ABSENT FLAG MEANS ON.**
 *
 * `publicSettings()` defaults every key to `true` when the config row is missing, on the grounds
 * that an unconfigured deployment is not one that switched a section off. Anything reading these
 * has to agree, and has to agree in the harder case too — a REFUSED READ. A 500 from this route
 * must not empty a wallet or blank a home page, so `isEnabled` treats "no answer" exactly as it
 * treats "no flag": on.
 *
 * That asymmetry is deliberate and worth keeping in mind before using this for anything new: a
 * flag can hide something, and a broken read can never hide anything.
 */

/**
 * Read the map. Answers `null` rather than throwing — every caller's fallback is "everything on",
 * so a failure and an unconfigured deployment take the same branch.
 */
export const getSiteConfig = () =>
  Promise.resolve(request(PLATFORM.site.config, { live: true, fixture: null })).catch(() => null);

/**
 * Is `name` switched on?
 *
 * `flags` may be the whole answer, its `flags` half, `null`, or `undefined` — the last two being
 * "the read failed" and "it has not landed yet". All of them answer `true`.
 */
export function isEnabled(flags, name) {
  const map = flags?.flags ?? flags;
  if (!map || typeof map !== 'object') return true;
  const value = map[name];
  return value === undefined || value === null ? true : Boolean(value);
}

/**
 * Is a wallet currency switched on?
 *
 * The flag names are the platform's own column names — the currency code, lower-cased, so `INR`
 * is `inr` and `USDT` is `usdt`. Takes the BARE code (`INR`), not this build's `INRFIAT`.
 *
 * `cryptocoin` is a MASTER SWITCH over every crypto row rather than a currency of its own, so a
 * crypto code has to clear both it and its own flag. There is no fiat equivalent — the six fiats
 * and EUR carry only their own — which is the platform's arrangement, not a gap here.
 *
 * `isFiat` is passed in rather than derived, because the answer lives in `utils/currency.js` and
 * this module should not grow a second opinion about which codes are fiat.
 */
export function isCurrencyEnabled(flags, code, isFiat) {
  const name = String(code ?? '').toLowerCase();
  if (!name) return true;
  if (!isFiat && !isEnabled(flags, 'cryptocoin')) return false;
  return isEnabled(flags, name);
}

export default getSiteConfig;
