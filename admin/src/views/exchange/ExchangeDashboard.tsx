'use client'

import { MinusIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'

import { ChartCard, type ChartTableData } from '@/components/shared/charts'
import ErrorState from '@/components/shared/ErrorState'
import StatCard from '@/components/shared/StatCard'
import { Skeleton } from '@/components/ui/skeleton'
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

type Item = { label: string; value: number }

/** Zip ka fmt — Number(val).toLocaleString(). */
const fmt = (value: number) => Number(value || 0).toLocaleString()

/** P/L me sign hamesha dikhe: +1,200 / −300. */
const fmtSigned = (value: number) => (value > 0 ? `+${fmt(value)}` : value < 0 ? `−${fmt(Math.abs(value))}` : '0')

/** Wallet ke *_pts downline ka mirror hain — zip upline ki nazar se dikhata hai (negate). -0 se bacho. */
const negPL = (value: string | undefined) => {
  const n = Number(value) || 0

  return n === 0 ? 0 : -n
}

/** Chart ke numbers table me — Chart/Table toggle ke liye. */
const toTable = (items: Item[], format: (v: number) => string): ChartTableData => ({
  columns: [{ header: 'Name' }, { header: 'Value', align: 'right' }],
  rows: items.map(i => [i.label, format(i.value)])
})

/**
 * Points — simple bars. Upar bada All Pts, neeche har point ki ek moti bar (sabse bada = poori).
 * Plus wali primary rang me, minus wali laal; value aur % bar ke upar likhe hain.
 */
const PointsBars = ({ items, centre }: { items: Item[]; centre: Item }) => {
  const max = Math.max(...items.map(i => Math.abs(i.value)), 1)

  return (
    <div className='flex flex-col gap-6'>
      <div className='from-primary/15 to-primary/5 border-primary/20 flex items-center justify-between gap-4 rounded-xl border bg-gradient-to-r px-4 py-3'>
        <div className='min-w-0'>
          <p className='text-muted-foreground text-xs'>{centre.label}</p>
          <p className='text-foreground text-3xl font-semibold tracking-tight tabular-nums'>{fmt(centre.value)}</p>
        </div>
        <span className='bg-primary/15 text-primary rounded-full px-3 py-1 text-xs font-medium'>
          {items.filter(i => i.value !== 0).length} / {items.length} active
        </span>
      </div>

      <ul className='flex flex-col gap-4'>
        {items.map(item => {
          const share = (Math.abs(item.value) / max) * 100

          return (
            <li key={item.label} className='flex flex-col gap-1.5' title={`${item.label}: ${fmt(item.value)}`}>
              <div className='flex items-baseline justify-between gap-3 text-sm'>
                <span className='text-muted-foreground'>{item.label}</span>
                <span className='flex items-baseline gap-2'>
                  <span className='text-foreground font-semibold tabular-nums'>{fmt(item.value)}</span>
                  <span className='text-muted-foreground w-10 text-right text-xs tabular-nums'>{Math.round(share)}%</span>
                </span>
              </div>
              <div className='bg-muted h-3 overflow-hidden rounded-full'>
                {item.value !== 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      'block h-full rounded-full bg-gradient-to-r transition-[width] duration-500',
                      item.value > 0 ? 'from-primary/50 to-primary' : 'from-danger/50 to-danger'
                    )}
                    style={{ width: `max(${share}%, 6px)` }}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Plus = success, minus = danger, 0 = muted — P/L ka matlab, sajawat nahi. */
const plTone = (v: number) => (v > 0 ? 'success' : v < 0 ? 'danger' : 'muted-foreground')

/**
 * P/L — upar bada Total P/L (trend icon ke saath), neeche har P/L ki bar beech ki zero line se:
 * profit right (hara), loss left (laal), gradient ke saath.
 */
const PLPanel = ({ items, total }: { items: Item[]; total: number }) => {
  const max = Math.max(...items.map(i => Math.abs(i.value)), 1)
  const tone = plTone(total)
  const Icon = total > 0 ? TrendingUpIcon : total < 0 ? TrendingDownIcon : MinusIcon

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex items-center gap-4'>
        <span
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-xl',
            tone === 'success' && 'bg-success-soft text-success',
            tone === 'danger' && 'bg-danger-soft text-danger',
            tone === 'muted-foreground' && 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className='size-6' />
        </span>
        <div className='min-w-0'>
          <p className='text-muted-foreground text-xs'>Total P/L</p>
          <p className='text-foreground text-3xl font-semibold tracking-tight tabular-nums'>{fmtSigned(total)}</p>
          <p className='text-muted-foreground text-xs'>{total > 0 ? 'In profit' : total < 0 ? 'In loss' : 'Break-even'}</p>
        </div>
      </div>

      <ul className='flex flex-col gap-4'>
        {items.map(item => {
          const share = (Math.abs(item.value) / max) * 50
          const t = plTone(item.value)

          return (
            <li key={item.label} className='flex flex-col gap-1.5' title={`${item.label}: ${fmtSigned(item.value)}`}>
              <div className='flex items-baseline justify-between gap-3 text-sm'>
                <span className='text-muted-foreground'>{item.label}</span>
                <span className='text-foreground font-semibold tabular-nums'>{fmtSigned(item.value)}</span>
              </div>
              <div className='bg-muted relative h-3 overflow-hidden rounded-full'>
                <span aria-hidden className='bg-border absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2' />
                {item.value !== 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-y-0 rounded-full transition-[width,left] duration-500',
                      t === 'success' && 'from-success/40 to-success bg-gradient-to-r',
                      t === 'danger' && 'from-danger to-danger/40 bg-gradient-to-r'
                    )}
                    style={{ left: item.value < 0 ? `${50 - share}%` : '50%', width: `max(${share}%, 6px)` }}
                  />
                )}
              </div>
            </li>
          )
        })}
        <li className='text-muted-foreground flex justify-between text-[11px]'>
          <span>Loss</span>
          <span>0</span>
          <span>Profit</span>
        </li>
      </ul>
    </div>
  )
}

const PanelSkeleton = () => (
  <div className='flex flex-col gap-4'>
    <Skeleton className='h-16 w-full rounded-xl' />
    {Array.from({ length: 5 }).map((_, i) => (
      <Skeleton key={i} className='h-8 w-full' />
    ))}
  </div>
)

/**
 * Dashboard ka "Agent System" tab (Sports Exchange) — zip ka `pages/Home.jsx`.
 *
 * Upar 7 cards (Balance, Exposure, Credit / All / Settlement / Upper / Down pts),
 * phir do panel: points (bars) aur P/L. Saare points 0 hon to points wala nahi
 * dikhta; P/L tab hi chhupta hai jab points aur P/L dono 0 hon (zip jaisa).
 * Casino / third-party casino P/L aur "Our Live Casino" yahan nahi hain.
 */
const ExchangeDashboard = () => {
  const { data, isLoading, error } = useApi<Home>('admin/exchange/user-reports/home')

  const creditPts = Number(data?.credit) || 0
  const allPts = Number(data?.allPoint) || 0
  const settlementPts = Number(data?.settlementPoints) || 0
  const upperPts = Number(data?.upperPoint) || 0
  const downPts = Number(data?.downPoint) || 0

  const sportsPL = negPL(data?.sportsPts)
  const totalPL = Math.round(sportsPL * 100) / 100

  const points: Item[] = [
    { label: 'Credit Pts', value: creditPts },
    { label: 'All Pts', value: allPts },
    { label: 'Settlement Pts', value: settlementPts },
    { label: 'Upper Pts', value: upperPts },
    { label: 'Down Pts', value: downPts }
  ]

  const pl: Item[] = [
    { label: 'Sports P/L', value: sportsPL },
    { label: 'Total P/L', value: totalPL }
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

  const showPoints = isLoading || hasPoints
  const showPL = isLoading || hasPL

  return (
    <div className='flex flex-col gap-4'>
      {error && !data && <ErrorState error={error} title='Could not load your points' />}
      <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
        {tiles.map(t => (
          <StatCard key={t.label} label={t.label} value={fmt(t.value)} loading={isLoading} />
        ))}
      </div>

      {(showPoints || showPL) && (
        <div className='grid gap-4 xl:grid-cols-5'>
          {showPoints && (
            <ChartCard
              className={cn(showPL ? 'xl:col-span-3' : 'xl:col-span-5')}
              title='Points overview'
              description='Each bar is one point type — the biggest is a full bar.'
              table={toTable(points, fmt)}
            >
              {isLoading ? <PanelSkeleton /> : <PointsBars items={points} centre={points[1]} />}
            </ChartCard>
          )}

          {showPL && (
            <ChartCard
              className={cn(showPoints ? 'xl:col-span-2' : 'xl:col-span-5')}
              title='P/L overview'
              description='Profit to the right of zero, loss to the left.'
              table={toTable(pl, fmtSigned)}
            >
              {isLoading ? <PanelSkeleton /> : <PLPanel items={pl} total={totalPL} />}
            </ChartCard>
          )}
        </div>
      )}
    </div>
  )
}

export default ExchangeDashboard
