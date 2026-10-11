'use client'

import { useCallback, useState, useSyncExternalStore, type ReactNode } from 'react'

import { BarChart3Icon } from 'lucide-react'

import ErrorState from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import type { ValueFormat } from './format'

/** Props every chart wrapper takes. */
export type CommonChartProps = {

  /** What the chart shows, for screen readers ("Deposits and withdrawals per day, USD"). */
  ariaLabel: string
  height?: number
  loading?: boolean
  error?: unknown
  emptyMessage?: string
  format?: ValueFormat

  /** Suffix for money values in tooltips ('USD', 'INR'). */
  currency?: string | null
  className?: string
}

const noopSubscribe = () => () => {}

/** False on the server and during hydration, true once mounted: charts are drawn on the client only. */
export const useIsClient = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )

/** The size of an element, kept current with a ResizeObserver. 0×0 until measured. */
export function useBoxSize<T extends HTMLElement = HTMLDivElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 })

  const ref = useCallback((el: T | null) => {
    if (!el || typeof ResizeObserver === 'undefined') return

    const read = () => {
      const r = el.getBoundingClientRect()
      const width = Math.round(r.width)
      const height = Math.round(r.height)

      setSize(s => (s.width === width && s.height === height ? s : { width, height }))
    }

    read()
    const obs = new ResizeObserver(read)

    obs.observe(el)

    return () => obs.disconnect()
  }, [])

  return [ref, size] as const
}

type FrameProps = {
  ariaLabel: string
  height: number
  loading?: boolean
  error?: unknown
  empty?: boolean
  emptyMessage?: string
  className?: string
  children: ReactNode
}

/** The box a chart sits in: the same height whether it is loading, empty, failed or drawn. */
export const ChartFrame = ({ ariaLabel, height, loading, error, empty, emptyMessage, className, children }: FrameProps) => {
  const isClient = useIsClient()
  let body: ReactNode = children

  if (loading || !isClient) body = <Skeleton className='size-full' aria-hidden />
  else if (error) body = <div className='flex size-full items-center'><ErrorState error={error} title='Could not load this chart' /></div>
  else if (empty)
    body = (
      <div className='border-border text-muted-foreground flex size-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm'>
        <BarChart3Icon className='size-5 opacity-60' aria-hidden />
        {emptyMessage ?? 'No data for this period.'}
      </div>
    )

  return (
    <div
      role='img'
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={cn('relative w-full min-w-0', className)}
      style={{ height }}
    >
      {body}
    </div>
  )
}

/** True when there is nothing worth drawing: no points, or every point blank or zero. */
export const isEmptySeries = (series: { data: readonly (number | null | undefined)[] }[]) =>
  series.length === 0 || series.every(s => s.data.every(v => v === null || v === undefined || v === 0))

// ---------------------------------------------------------------------------
// Legend and tooltip, drawn as HTML so they follow the admin's tokens and type.
// ---------------------------------------------------------------------------

export type LegendItem = { name: string; color: string }

export const ChartLegend = ({ items, align = 'left' }: { items: LegendItem[]; align?: 'left' | 'center' }) => (
  <ul
    aria-hidden
    className={cn('text-foreground flex shrink-0 flex-wrap gap-x-4 gap-y-1 text-xs', align === 'center' ? 'justify-center' : 'justify-start')}
  >
    {items.map(it => (
      <li key={it.name} className='flex min-w-0 items-center gap-1.5'>
        <span className='size-2.5 shrink-0 rounded-full' style={{ background: it.color }} />
        <span className='truncate'>{it.name}</span>
      </li>
    ))}
  </ul>
)

export type TooltipRow = { key: string; name: string; color: string; value: number | null | undefined }

/** The hover box: an optional heading (the bucket or category) and one row per series. */
export const TooltipBox = ({ label, rows, format }: { label?: ReactNode; rows: TooltipRow[]; format: (v: number | null | undefined) => string }) => {
  if (rows.length === 0) return null

  return (
    <div className='bg-popover text-popover-foreground border-border pointer-events-none min-w-32 rounded-md border px-2.5 py-1.5 text-xs shadow-md'>
      {label !== undefined && label !== '' && <div className='text-muted-foreground mb-1 font-medium'>{label}</div>}
      <div className='flex flex-col gap-0.5'>
        {rows.map(r => (
          <div key={r.key} className='flex items-center gap-2'>
            <span className='size-2 shrink-0 rounded-full' style={{ background: r.color }} />
            {r.name && <span className='text-muted-foreground'>{r.name}</span>}
            <span className='ml-auto pl-3 font-medium tabular-nums'>{format(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** About how many px a string of `chars` takes at 11–12px in the admin font. */
export const textPx = (chars: number, fontPx = 11) => Math.ceil(chars * fontPx * 0.58)

/** Cut a label to `max` characters, with an ellipsis. The full text stays in the tooltip and the table. */
export const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, Math.max(1, max - 1))}…` : s)
