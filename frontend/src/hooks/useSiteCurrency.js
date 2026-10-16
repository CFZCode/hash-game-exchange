import { useResource } from './useResource';
import { getSiteConfig } from '../services/siteConfig';

/* The site's default currency from the owner panel's config (`defaultCurrency` on
   `/admin/site-config/public`, e.g. USDT). Shown in place of "None" wherever the view-in-currency
   switch is off, since amounts are then printed in that coin (user's request, 2026-10-16).
   `null` with fixtures on or when the site names none, and the callers keep "None". */
export function useSiteCurrency() {
  const { data } = useResource(getSiteConfig);
  const code = String(data?.defaultCurrency ?? '').toUpperCase();
  return code || null;
}

export default useSiteCurrency;
