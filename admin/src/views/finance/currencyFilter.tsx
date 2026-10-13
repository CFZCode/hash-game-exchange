'use client'

import { useCallback, useMemo } from 'react'

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'

import { ALL_CURRENCIES, useStatsFilters } from '@/components/shared/charts'
import { useDefaultCurrency } from '@/components/shared/DefaultCurrency'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { FIAT_CURRENCIES } from './types'
import { useCurrencyCodes } from './useCurrencyCodes'

/**
 * The currency filter of a Finance list screen that has no chart filter bar (Wallets, Swap
 * history, Payment orders, P2P).
 *
 * Kept in the URL (`?currency=USDT`) so a reload, the back button or a shared link keeps the
 * pick; absent, it is the site's default coin (`useDefaultCurrency()` — the owner's
 * `default_currency`, USDT unless set), never INR by accident. Where the screen offers it,
 * "every currency" is an explicit pick stored as `?currency=ALL`. A change goes back to page 1.
 */
export function useCurrencyParam({ allowAll = false }: { allowAll?: boolean } = {}) {
  const def = useDefaultCurrency()
  const [raw, setRaw] = useQueryStates({ currency: parseAsString.withDefault(''), page: parseAsInteger }, { history: 'replace' })
  const picked = String(raw.currency ?? '').toUpperCase()

  /** '' = every currency (only when `allowAll`). */
  const currency = picked === ALL_CURRENCIES && allowAll ? '' : picked && picked !== ALL_CURRENCIES ? picked : def.code

  const set = useCallback((code: string) => void setRaw({ currency: code ? code.toUpperCase() : ALL_CURRENCIES, page: null }), [setRaw])

  return { currency, defaultCurrency: def.code, allowAll, set }
}

/**
 * `useStatsFilters` for a Finance screen: the period and bucket as before, and the currency
 * defaulting to the site's default coin (`?currency=ALL` is the explicit "every currency").
 */
export function useFinanceFilters(options: Omit<Parameters<typeof useStatsFilters>[0] & object, 'defaultCurrency'> = {}) {
  const def = useDefaultCurrency()

  return useStatsFilters({ ...options, defaultCurrency: def.code })
}

/** "All currencies (in USDT)": the label of the converted-totals option, in the default coin. */
export const allConvertedLabel = (defaultCurrency?: string) => `All currencies (in ${defaultCurrency || 'USD'})`

const FIAT = new Set<string>([...FIAT_CURRENCIES, 'MVR'])

/** Coin lists for the pickers: the site's registry (house) or the wallet allow-list, split by rail. */
export function useCurrencyChoices() {
  const codes = useCurrencyCodes()

  return useMemo(
    () => ({
      all: codes,
      fiat: codes.filter(c => FIAT.has(c)),
      crypto: codes.filter(c => !FIAT.has(c))
    }),
    [codes]
  )
}

type SelectProps = {
  filter: ReturnType<typeof useCurrencyParam>
  currencies: string[]

  /** Label of the "every currency" option (only shown with `filter.allowAll`). */
  allLabel?: string
  className?: string
}

/** The picker for `useCurrencyParam`. The default coin and the current pick are always listed. */
export const CurrencySelect = ({ filter, currencies, allLabel = 'All currencies', className }: SelectProps) => {
  const options = Array.from(new Set([filter.defaultCurrency, ...(filter.currency ? [filter.currency] : []), ...currencies]))

  return (
    <Select value={filter.currency || ALL_CURRENCIES} onValueChange={v => v && filter.set(v === ALL_CURRENCIES ? '' : String(v))}>
      <SelectTrigger className={cn('w-40', className)} aria-label='Currency'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {filter.allowAll && <SelectItem value={ALL_CURRENCIES}>{allLabel}</SelectItem>}
        {options.map(c => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
