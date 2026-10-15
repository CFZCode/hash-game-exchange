'use client'

import { useSyncExternalStore } from 'react'

import { BarChart, type ChartColor } from '@/components/shared/charts'
import StatCard from '@/components/shared/StatCard'
import { Card, CardContent } from '@/components/ui/card'
import { useApi } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

/** `GET admin/exchange/user-reports/home` — login wale ka apna credits row. */
type Home = {
  balance: string
  exposure: string
  credit: string
  allPoint: string
  settlementPoints: string
  upperPoint: string
  downPoint: string
  sportsPts: string
  isOwner: boolean
}

type Item = { label: string; value: number; color: ChartColor; dot: string }

/** Zip ka fmt — Number(val).toLocaleString(). */
const fmt = (value: number) => Number(value || 0).toLocaleString()

/** Wallet ke *_pts downline ka mirror hain — zip upline ki nazar se dikhata hai (negate). -0 se bacho. */
const negPL = (value: string | undefined) => {
  const n = Number(value) || 0

  return n === 0 ? 0 : -n
}

// Web (>=768px) pe horizontal bars, mobile pe vertical columns — zip jaisa.
const MOBILE_QUERY = '(max-width: 767px)'

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(MOBILE_QUERY)

  mql.addEventListener('change', onChange)

  return () => mql.removeEventListener('change', onChange)
}

const useIsPhone = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  )

/**
 * Har bar ka apna rang (zip `distributed: true`): har category ek alag series,
 * baaki jagah null — stacked karke ek hi bar banta hai, legend bhi zip jaisa aata hai.
 */
const ItemsChart = ({ items, label, horizontal }: { items: Item[]; label: string; horizontal: boolean }) => (
  <BarChart
    ariaLabel={label}
    height={350}
    horizontal={horizontal}
    stacked
    categories={items.map(i => i.label)}
    series={items.map((item, idx) => ({
      name: item.label,
      color: item.color,
      data: items.map((_, j) => (j === idx ? item.value : null))
    }))}
  />
)

/** Chart ke neeche ke numbers — zip ki "mdi-circle" legend row. */
const LegendValues = ({ items, cols }: { items: Item[]; cols: string }) => (
  <div className={cn('mt-4 grid grid-cols-2 gap-3 text-center', cols)}>
    {items.map(item => (
      <div key={item.label}>
        <p className='text-muted-foreground mb-1 flex items-center justify-center gap-1.5 text-[11px]'>
          <span className={cn('inline-block size-2.5 rounded-full', item.dot)} /> {item.label}
        </p>
        <p className='text-base font-semibold tabular-nums'>{fmt(item.value)}</p>
      </div>
    ))}
  </div>
)

/**
 * Dashboard ka "Client Management" tab (Sports Exchange) — zip ka `pages/Home.jsx`.
 *
 * Upar 7 cards (Balance, Exposure, Credit / All / Settlement / Upper / Down pts),
 * phir do charts: points aur P/L. Saare points 0 hon to points chart nahi dikhta;
 * P/L chart tab hi chhupta hai jab points aur P/L dono 0 hon (zip jaisa).
 * Casino / third-party casino P/L aur "Our Live Casino" yahan nahi hain.
 */
const ExchangeDashboard = () => {
  const { data, isLoading } = useApi<Home>('admin/exchange/user-reports/home')
  const horizontal = !useIsPhone()

  const creditPts = Number(data?.credit) || 0
  const allPts = Number(data?.allPoint) || 0
  const settlementPts = Number(data?.settlementPoints) || 0
  const upperPts = Number(data?.upperPoint) || 0
  const downPts = Number(data?.downPoint) || 0

  const sportsPL = negPL(data?.sportsPts)
  const totalPL = Math.round(sportsPL * 100) / 100

  const points: Item[] = [
    { label: 'Credit Pts', value: creditPts, color: 'primary', dot: 'bg-primary' },
    { label: 'All Pts', value: allPts, color: 'warning', dot: 'bg-warning' },
    { label: 'Settlement Pts', value: settlementPts, color: 'info', dot: 'bg-info' },
    { label: 'Upper Pts', value: upperPts, color: 'success', dot: 'bg-success' },
    { label: 'Down Pts', value: downPts, color: 'muted-foreground', dot: 'bg-muted-foreground' }
  ]

  const pl: Item[] = [
    { label: 'Sports P/L', value: sportsPL, color: 'primary', dot: 'bg-primary' },
    { label: 'Total P/L', value: totalPL, color: 'success', dot: 'bg-success' }
  ]

  const hasPoints = points.some(i => i.value !== 0)
  const hasPL = hasPoints || pl.some(i => i.value !== 0)

  // Exposure API se positive aata hai, card pe loss (-) dikhta hai.
  const exposure = -Math.abs(Number(data?.exposure) || 0) || 0

  const tiles = [
    { label: 'Balance', value: Number(data?.balance) || 0 },
    { label: 'Exposure', value: exposure },
    { label: 'Credit pts', value: creditPts },
    { label: 'All pts', value: allPts },
    { label: 'Settlement pts', value: settlementPts },
    { label: 'Upper pts', value: upperPts },
    { label: 'Down pts', value: downPts }
  ]

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
        {tiles.map(t => (
          <StatCard key={t.label} label={t.label} value={fmt(t.value)} loading={isLoading} />
        ))}
      </div>

      {hasPoints && (
        <Card className='shadow-none'>
          <CardContent>
            <ItemsChart
              key={horizontal ? 'web' : 'mobile'}
              items={points}
              label='Points Overview'
              horizontal={horizontal}
            />
            <LegendValues items={points} cols='sm:grid-cols-5' />
          </CardContent>
        </Card>
      )}

      {hasPL && (
        <Card className='shadow-none'>
          <CardContent>
            <ItemsChart key={horizontal ? 'web' : 'mobile'} items={pl} label='P/L Overview' horizontal={horizontal} />
            <LegendValues items={pl} cols='sm:grid-cols-2' />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ExchangeDashboard
