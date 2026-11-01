'use client'

import { useState } from 'react'

import Link from 'next/link'

import PageHeader from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useApi } from '@/hooks/use-api'

import { CsvButton, MonthPicker, StatementView, monthPeriod, thisMonth, type Statement } from './RevenueShare'

type AllStatements = {
  from: string
  to: string
  totalGgr: string
  totalShare: string
  whitelabels: (Statement & { id: number; name: string; slug: string; status: string })[]
}

const inr = (v: string) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Every whitelabel's revenue-share statement for a month, with the totals (Super Admin). */
const WhitelabelsReport = () => {
  const [month, setMonth] = useState(thisMonth)
  const period = monthPeriod(month)
  const report = useApi<AllStatements>('admin/whitelabels/report', period)

  return (
    <div className='grid gap-6'>
      <PageHeader
        title='Revenue share report'
        description={report.data ? `All whitelabels: GGR ${inr(report.data.totalGgr)} · revenue share due ${inr(report.data.totalShare)}. Reported, not collected.` : 'All whitelabels, by month.'}
        actions={
          <div className='flex items-center gap-2'>
            <MonthPicker value={month} onChange={setMonth} />
            <CsvButton path='admin/whitelabels/report.csv' period={period} fileName={`whitelabels-revenue-share-${month}.csv`} />
          </div>
        }
      />
      {report.isLoading && <p className='text-muted-foreground text-sm'>Loading…</p>}
      {report.error && <p className='text-destructive text-sm'>{String((report.error as Error).message)}</p>}
      {report.data?.whitelabels.length === 0 && <p className='text-muted-foreground text-sm'>No whitelabel has run yet.</p>}
      {report.data?.whitelabels.map(w => (
        <Card key={w.id}>
          <CardHeader>
            <CardTitle>
              <Link href={`/whitelabels/${w.id}`} className='hover:underline'>
                {w.name}
              </Link>
            </CardTitle>
            <CardDescription>
              {w.slug} · {w.status} · share due {inr(w.totalShare)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StatementView statement={w} who='parent' />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default WhitelabelsReport
