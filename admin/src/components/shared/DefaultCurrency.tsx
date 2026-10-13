'use client'

import { useApi } from '@/hooks/use-api'

/**
 * The site's DEFAULT COIN — the currency every money screen opens on before anybody picks one
 * (Finance → Deposits, Withdrawals, Wallets, Swap, Vault, Tips, P2P, Payment orders). The platform
 * owner sets it in the owner panel (the `default_currency` policy); staff only see it.
 *
 * Read from the public `admin/site-config/public` `defaultCurrency` (the same read the reward
 * currency falls back to, so one request serves both). USDT until it answers — the backend's own
 * default — so a screen never opens on INR by accident.
 */
type PublicConfig = { defaultCurrency?: string }

export const FALLBACK_DEFAULT_CURRENCY = 'USDT'

export function useDefaultCurrency() {
  const pub = useApi<PublicConfig>('admin/site-config/public', undefined, { staleTime: 15_000 })
  const code = String(pub.data?.defaultCurrency || FALLBACK_DEFAULT_CURRENCY).toUpperCase()

  return { code, loading: pub.isLoading }
}
