'use client'

import { useState } from 'react'

import { DownloadIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

import DataTable, { type Column } from '@/components/shared/DataTable'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api/client'

/** One product's line (backend common/whitelabelReport `assemble`). All amounts INR. */
export type StatementRow = {
  product: 'casino' | 'originals' | 'sports'
  label: string
  bets?: string
  wins?: string
  refunds?: string
  rollbacks?: string
  staked?: string | null
  betCount: number | null
  ggr: string | null
  sharePct: string
  share: string | null
}

export type Statement = {
  from: string
  to: string
  currency: 'INR'
  products: StatementRow[]
  totalGgr: string
  totalShare: string
  complete: boolean
  sportsError: string | null
  gateway: { deposits: string; depositCount: number; withdrawals: string; withdrawalCount: number; charges: string }
  transfers: { amount: string; count: number }
  unconverted: string[]
}

export type Period = { from: string; to: string }

const inr = (v: string | null | undefined) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

/** `YYYY-MM` → the month as `{ from, to }` (`to` = the next month's first day, exclusive). */
export const monthPeriod = (month: string): Period => {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`

  return { from: `${month}-01`, to: `${next}-01` }
}

export const thisMonth = () => new Date().toISOString().slice(0, 7)

/** A month picker: statements run by calendar month (UTC). */
export const MonthPicker = ({ value, onChange }: { value: string; onChange: (month: string) => void }) => (
  <Input type='month' value={value} max={thisMonth()} onChange={e => e.target.value && onChange(e.target.value)} className='w-40' aria-label='Month' />
)

/** Download a CSV the backend builds (`path` answers text/csv). */
export const CsvButton = ({ path, period, fileName }: { path: string; period: Period; fileName: string }) => {
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)

    try {
      const blob = await api.blob(path, period)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')

      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button size='sm' variant='outline' disabled={busy} onClick={download}>
      {busy ? <Loader2Icon className='animate-spin' /> : <DownloadIcon />} CSV
    </Button>
  )
}

const columns: Column<StatementRow>[] = [
  { key: 'product', header: 'Product', cell: r => r.label },
  { key: 'bets', header: 'Bets / staked', align: 'right', cell: r => inr(r.bets ?? r.staked ?? null) },
  { key: 'wins', header: 'Wins', align: 'right', cell: r => (r.wins == null ? '—' : inr(r.wins)) },
  { key: 'ggr', header: 'GGR', align: 'right', cell: r => (r.ggr == null ? <span className='text-muted-foreground'>not available</span> : inr(r.ggr)) },
  { key: 'pct', header: 'Share %', align: 'right', cell: r => `${Number(r.sharePct)}%` },
  { key: 'share', header: 'Revenue share', align: 'right', cell: r => <strong>{inr(r.share)}</strong> }
]

/** The statement: products, totals, gateway and transfers. `who` names the party in the note. */
export const StatementView = ({ statement, who }: { statement: Statement; who: 'parent' | 'company' }) => (
  <div className='grid gap-4'>
    <DataTable columns={columns} rows={statement.products} rowKey={r => r.product} loading={false} emptyMessage='No products in the plan.' />
    <div className='grid gap-2 text-sm sm:grid-cols-2'>
      <div>
        <span className='text-muted-foreground'>Total GGR: </span>
        <strong>{inr(statement.totalGgr)}</strong>
      </div>
      <div>
        <span className='text-muted-foreground'>{who === 'parent' ? 'Revenue share due to you: ' : 'Revenue share due to the parent site: '}</span>
        <strong>{inr(statement.totalShare)}</strong>
      </div>
      <div>
        <span className='text-muted-foreground'>Gateway deposits / withdrawals: </span>
        {inr(statement.gateway.deposits)} ({statement.gateway.depositCount}) / {inr(statement.gateway.withdrawals)} ({statement.gateway.withdrawalCount})
      </div>
      <div>
        <span className='text-muted-foreground'>Gateway charges: </span>
        {inr(statement.gateway.charges)}
      </div>
      <div>
        <span className='text-muted-foreground'>Balance sent by the parent: </span>
        {inr(statement.transfers.amount)} ({statement.transfers.count})
      </div>
    </div>
    {statement.sportsError && (
      <Alert>
        <AlertDescription>Sports figure not available: {statement.sportsError}. The totals leave it out.</AlertDescription>
      </Alert>
    )}
    {statement.unconverted.length > 0 && (
      <Alert>
        <AlertDescription>Left out, no exchange rate: {statement.unconverted.join(', ')}.</AlertDescription>
      </Alert>
    )}
    <p className='text-muted-foreground text-xs'>
      GGR = bets − wins (less refunds and rollbacks); the share is on a product&apos;s positive GGR only. Reported, not collected. Casino and original games are counted
      from the parent site&apos;s record of every round; sports from the whitelabel&apos;s own books. Amounts in INR at today&apos;s rates.
    </p>
  </div>
)
