'use client'

import type { ReactNode } from 'react'

import { DateRangePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

import { bucketLabel, GRANULARITIES, type Granularity } from './format'
import { MAX_DAY_SPAN, MAX_RANGE_DAYS, PRESETS, type Preset, type StatsFilters } from './useStatsFilters'

type Props = {
  filters: StatsFilters

  /** Offer a currency filter with these codes. Omit to hide it. */
  currencies?: string[]

  /** Label of the "no currency" option. */
  allCurrenciesLabel?: string

  /** Offer the "every currency" option at all. Off on a screen with no converted totals. */
  allowAll?: boolean
  showGranularity?: boolean

  /** Extra dimension controls (a sport select, a channel select), placed after the built-in ones. */
  children?: ReactNode
  className?: string
}

const GRANULARITY_LABEL: Record<Granularity, string> = { day: 'Day', week: 'Week', month: 'Month' }

const shortDay = (day: string) => `${bucketLabel(day, 'day')} ${day.slice(0, 4)}`

/**
 * One row of filters above a stats screen: period, custom range, bucket size and currency.
 * Everything it changes goes to the URL through `useStatsFilters`.
 */
const FilterBar = ({ filters, currencies, allCurrenciesLabel = 'All currencies (USD)', allowAll = true, showGranularity = true, children, className }: Props) => {
  const today = new Date().toISOString().slice(0, 10)

  // The default and the current pick are always offered, even when the caller's list lacks them.
  const currencyOptions = currencies?.length
    ? Array.from(new Set([...(filters.defaultCurrency ? [filters.defaultCurrency] : []), ...(filters.currency ? [filters.currency] : []), ...currencies]))
    : []

  return (
    <div role='group' aria-label='Report filters' className={cn('flex flex-wrap items-center gap-2', className)}>
      <Select value={filters.preset} onValueChange={v => v && filters.set(v === 'custom' ? { preset: 'custom', from: filters.from, to: filters.to } : { preset: v as Preset })}>
        <SelectTrigger className='w-40' aria-label='Period'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map(p => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filters.preset === 'custom' ? (
        <DateRangePicker
          aria-label='Custom date range'
          from={filters.from}
          to={filters.to}
          max={today}
          clearable={false}
          onChange={r => r.from && r.to && filters.set({ preset: 'custom', from: r.from, to: r.to })}
        />
      ) : (
        <span className='text-muted-foreground px-1 text-xs tabular-nums'>
          {filters.from === filters.to ? shortDay(filters.from) : `${shortDay(filters.from)} – ${shortDay(filters.to)}`} · UTC
        </span>
      )}

      {showGranularity && (
        <ToggleGroup
          variant='outline'
          size='sm'
          spacing={0}
          aria-label='Group by'
          value={[filters.granularity]}
          onValueChange={(v: unknown[]) => {
            const g = v[0] as Granularity | undefined

            if (g) filters.set({ granularity: g })
          }}
        >
          {GRANULARITIES.map(g => (
            <ToggleGroupItem
              key={g}
              value={g}
              className='px-3'
              disabled={g === 'day' && filters.days > MAX_DAY_SPAN}
              title={g === 'day' && filters.days > MAX_DAY_SPAN ? `Daily buckets are limited to ${MAX_DAY_SPAN} days` : undefined}
            >
              {GRANULARITY_LABEL[g]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}

      {currencyOptions.length > 0 && (
        <Select value={filters.currency || 'ALL'} onValueChange={v => v && filters.set({ currency: v === 'ALL' ? '' : v })}>
          <SelectTrigger className='w-56' aria-label='Currency'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(allowAll || !filters.currency) && <SelectItem value='ALL'>{allCurrenciesLabel}</SelectItem>}
            {currencyOptions.map(c => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {children}

      {filters.preset === 'custom' && filters.days >= MAX_RANGE_DAYS && (
        <span className='text-muted-foreground text-xs'>Limited to {MAX_RANGE_DAYS} days.</span>
      )}
    </div>
  )
}

export default FilterBar
