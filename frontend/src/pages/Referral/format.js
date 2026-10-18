import { HOST, BUSINESS_EMAIL } from './referral';
import { useResource } from '../../hooks/useResource';
import { getSiteConfig } from '../../services/siteConfig';
import { walletCode } from '../../utils/currency';

/* The referral family's two formatting helpers, split out of `index.jsx` when the signed-in
 * dashboard became a second consumer. Non-components, so they live in a plain module rather than
 * beside the blocks — `react-refresh/only-export-components` forbids a file that exports a
 * component from exporting anything else, the same reason `useSession` is not in
 * SessionContext.jsx.
 *
 * `printCurrency` is a PARTIAL port, and deliberately so: it covers the two branches this page
 * family reaches and no more, where `utils/currency.js` is the complete one. Keeping it separate
 * is what CLAUDE.md's data-layer note describes — the Contest widget carries its own for the same
 * reason.
 *
 * A `*FIAT` target goes through `Intl.NumberFormat(style: "currency")` on the code with the
 * suffix stripped, which is the whole explanation for the ticker's two apparently inconsistent
 * rows: en-US spells IDR as its code and INR as its symbol, so "IDR 268" and "₹1.26" come off the
 * same call. A crypto target prints a bare decimal with trailing zeros trimmed and — because the
 * call site passes no alias — nothing after it, which is why "0.1" and "12" carry only the coin
 * image beside them.
 *
 * DO NOT PIN `maximumFractionDigits`. The fiat branch deliberately lets Intl choose, and the
 * capture proves that right: IDR prints "IDR 268" with no decimals because CLDR gives IDR zero
 * fraction digits. NODE DISAGREES — node 24's ICU 77 answers 2 and renders "IDR 268.00" — so a
 * check run under node looks like a mismatch when the browser is right. Verified in Chrome:
 * IDR 0, INR 2, USD 2, and 'en' and 'en-US' agree on all three.
 */
const fiat = (value, code) => {
  const iso = code.replace('FIAT', '');
  // Rupees in lakh / crore grouping (₹2,84,669.32), as hash.game prints them.
  return new Intl.NumberFormat(iso === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: iso }).format(Number(value));
};

export const printCurrency = (value, currency = 'USDFIAT') =>
  currency.endsWith('FIAT')
    ? fiat(value, currency)
    : /* `precision: 2` with trailing zeros trimmed — `maximumFractionDigits` without a matching
         minimum, which is what turns 0.10 into "0.1" and 12.00 into "12". */
      new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value));

/* `t(str, params)` — the original's placeholder fill. Only the tokens this page family uses.
 *
 * `__friendAmount__` is the dashboard's, and it takes the SAME value as the exhibition page's
 * `__localAmountStr__`: the chunk fills it with `printCurrency(new Decimal(1000))`, which is
 * also the green figure printed directly above the sentence. Grouped into one alternation for
 * that reason — a caller that passes the wrong amount would get both wrong together rather
 * than only one of them, which is the failure that is easy to see. */
export const fill = (text, amount) =>
  text
    .replace(/__localAmountStr__|__local_amount__|__friendAmount__/g, amount)
    .replace(/__ENV_HOST__/g, HOST)
    .replace(/__email__/g, BUSINESS_EMAIL);

/* The ticker's pixels-per-second. See the long note on `LiveRewards` for why the original's flat
   `30s` is a distance rather than a speed, and why this replaces it. */
export const SCROLL_SPEED = 30;

/* ── Amounts in the selected currency (the `selected-currency` skill) ─────────────────────────
 *
 * `printCurrency` above prints a figure in its OWN currency and never converts, so on a ₹ wallet
 * the rewards read "$0.00". Amount rows now go through `useSelectedCurrency().show(value, source)`;
 * these two name the SOURCE each figure is in.
 *
 * `walletCode` (utils/currency.js, re-exported): a bare API code → this build's wallet key.
 *
 * `useRewardCurrency`: the coin the affiliate rewards are credited in — the operator's reward
 * currency (`rewardCurrency` on /admin/site-config/public), USDT until it answers. Every `*Usd`
 * figure on the dashboard and My Rewards is a sum of those credits, so that is its source. */
export { walletCode };

export function useRewardCurrency() {
  const { data } = useResource(getSiteConfig);
  return walletCode(data?.rewardCurrency || 'USDT');
}
