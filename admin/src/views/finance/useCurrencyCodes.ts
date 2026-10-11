'use client'

import { useSession } from '@/contexts/SessionContext'
import { useApi } from '@/hooks/use-api'

import { SUPPORTED_CURRENCIES, type CurrencyRow } from './types'

export const CURRENCIES_PATH = 'admin/currencies'

/**
 * The currency codes a picker offers: the coin registry (`GET admin/currencies`, every coin that
 * is not retired, in the site's order) — or, when that route is missing, refused (agent tree) or
 * still loading, the wallet's built-in allow-list.
 */
export function useCurrencyCodes(): string[] {
  const { actor } = useSession()

  // The agent tree is refused the registry (403 CURRENCIES_HOUSE_ONLY): don't ask.
  const house = actor?.promotions !== false
  const coins = useApi<CurrencyRow[]>(house ? CURRENCIES_PATH : null, undefined, { retry: false, staleTime: 60_000 })
  const list = Array.isArray(coins.data) ? coins.data.filter(c => !c.retired).map(c => c.code) : []

  return list.length ? list : [...SUPPORTED_CURRENCIES]
}
