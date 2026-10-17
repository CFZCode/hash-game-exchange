'use client'

import { useState } from 'react'

import { HourglassIcon, ReceiptTextIcon, RefreshCwIcon, TrendingDownIcon, TrendingUpIcon, WalletIcon } from 'lucide-react'

import { SelectField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi } from '@/hooks/use-api'
import { errorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Chip, StatCard, type Tone } from './shared'

/**
 * Direct user: `GET admin/reports/balance-sheet/:userId?currency&limit&offset`.
 * Client user (parent wala): `GET admin/reports/client-balance-sheet/:userId?limit&offset` — point ledger, INR.
 */
type Sheet = {
  subject: { id: string; name: string | null; email: string | null; agent: string | null }
  currency: string

  /** 'point_ledger' = client user (parent wala): sheet `mssports.point_ledger` se, INR. */
  source?: 'point_ledger'
  balance: { live: string; ledger: string; openExposure: string; unexplained: string; credited: string; debited: string }
  total: number
  rows: { ts: string; category: string; type: string; description: string; amount: string; balance?: string }[]
}

const CURRENCIES = ['INR', 'PKR', 'USDT', 'EUR', 'BDT', 'NPR']
const LIMITS = [25, 50, 100, 200]

const fmt = (value: string | number | null | undefined, cur: string) =>
  `${cur === 'INR' ? '₹' : ''}${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

const CATEGORY_TONE: Record<string, Tone> = { Deposit: 'success', Withdrawal: 'danger', Agent: 'info', Sports: 'warning', Casino: 'primary' }

/**
 * Balance Sheet — reference admin ka BalanceSheetDialog: user ka har paisa-move, running balance ke saath.
 * Upar: Current Balance, In Play (unsettled), Total Credit, Total Debit, Net. "Live" on ho to har 10s refresh.
 * Direct user: deposits / withdrawals / bets se. Client user (Agent System, parent hai, `client`):
 * `mssports.point_ledger` se, INR only (Balance = all_point_after).
 */
export const BalanceSheetView = ({
  userId,
  name,
  client = false,
  active = true,
  inDialog = false
}: {
  userId: string | null
  name?: string | null

  /** Client user (parent wala) — sheet point ledger se. */
  client?: boolean

  /** Fetch only while shown (dialog open / tab selected). */
  active?: boolean

  /** Dialog ke andar: title DialogTitle, body scroll karta hai. Page pe: card. */
  inDialog?: boolean
}) => {
  const [currency, setCurrency] = useState('INR')
  const [limit, setLimit] = useState(50)
  const [page, setPage] = useState(0)
  const [live, setLive] = useState(true)

  const q = useApi<Sheet>(
    active && userId ? `admin/reports/${client ? 'client-balance-sheet' : 'balance-sheet'}/${userId}` : null,
    client ? { limit, offset: page * limit } : { currency, limit, offset: page * limit },
    { retry: false, refetchInterval: live ? 10_000 : false, placeholderData: prev => prev }
  )

  const d = q.data
  const cur = d?.currency ?? currency
  const credited = Number(d?.balance.credited ?? 0)
  const debited = Math.abs(Number(d?.balance.debited ?? 0))
  const net = credited - debited
  const exposure = Number(d?.balance.openExposure ?? 0)
  const reconciled = Number(d?.balance.unexplained ?? 0) === 0
  const pages = Math.max(1, Math.ceil((d?.total ?? 0) / limit))

  const Title = inDialog ? DialogTitle : 'h2'
  const Description = inDialog ? DialogDescription : 'p'

  return (
    <div className={cn('flex flex-col', inDialog ? 'min-h-0 flex-1' : 'bg-card overflow-hidden rounded-xl border')}>
        <div className={cn('border-b px-6 py-4', inDialog && 'pr-14')}>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <Title className='flex items-center gap-2 font-semibold'>
                <ReceiptTextIcon className='text-primary size-4' /> Balance Sheet
              </Title>
              <Description className='text-muted-foreground text-sm'>
                {d?.subject.name || name || 'Player'} · <span className='font-mono'>UID {userId}</span>
                {d?.subject.agent ? ` · under ${d.subject.agent}` : ''}
                {d?.source === 'point_ledger' ? ' · from point ledger' : ''}
              </Description>
            </div>
            <div className='flex items-center gap-3'>
              <label className='text-muted-foreground flex items-center gap-2 text-xs'>
                <Switch checked={live} onCheckedChange={setLive} /> Live
              </label>
              {/* Client user ki sheet point ledger se, sirf INR. */}
              {!client && (
                <div className='w-28'>
                  <SelectField
                    id='bs-currency'
                    label=''
                    value={currency}
                    onChange={v => {
                      setCurrency(v)
                      setPage(0)
                    }}
                    options={CURRENCIES.map(c => ({ value: c, label: c }))}
                  />
                </div>
                )}
              <Button variant='ghost' size='icon-sm' title='Refresh' aria-label='Refresh' disabled={q.isFetching} onClick={() => void q.refetch()}>
                <RefreshCwIcon className={cn(q.isFetching && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>

        <div className={cn('flex flex-col gap-4 px-6 py-4', inDialog && 'overflow-y-auto')}>
          {q.error && <p className='text-danger text-sm'>{errorMessage(q.error)}</p>}

          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
            <StatCard label='Current Balance' value={fmt(d?.balance.live, cur)} icon={<WalletIcon />} tone='primary' loading={!d} />
            {exposure > 0 && <StatCard label='In Play (Unsettled)' value={fmt(exposure, cur)} icon={<HourglassIcon />} tone='warning' />}
            <StatCard label='Total Credit' value={fmt(credited, cur)} icon={<TrendingUpIcon />} tone='success' loading={!d} />
            <StatCard label='Total Debit' value={fmt(debited, cur)} icon={<TrendingDownIcon />} tone='danger' loading={!d} />
            <StatCard label='Net' value={fmt(net, cur)} icon={<ReceiptTextIcon />} tone={net >= 0 ? 'success' : 'danger'} loading={!d} />
          </div>

          {d && (
            <p className='bg-muted/40 rounded-md border px-3 py-2 text-sm'>
              Current Balance <b>{fmt(d.balance.live, cur)}</b>
              {exposure > 0 && (
                <>
                  {' + '}In Play <b className='text-warning'>{fmt(exposure, cur)}</b>
                </>
              )}
              {' · '}Ledger <b>{fmt(d.balance.ledger, cur)}</b>{' '}
              <span className={cn('font-semibold', reconciled ? 'text-success' : 'text-danger')}>
                {reconciled ? '✓ reconciled' : `⚠ mismatch ${fmt(d.balance.unexplained, cur)} — needs review`}
              </span>
            </p>
          )}

          <div className='overflow-hidden rounded-lg border'>
            <Table>
              <TableHeader>
                <TableRow>
                  {['Date', 'Type', 'Description', 'Credit', 'Debit', 'Balance'].map(h => (
                    <TableHead key={h} className='text-xs uppercase'>
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!d
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className='h-5 w-full' />
                        </TableCell>
                      </TableRow>
                    ))
                  : d.rows.map((r, i) => {
                      const amount = Number(r.amount)

                      return (
                        <TableRow key={`${r.ts}-${i}`}>
                          <TableCell className='text-muted-foreground text-xs whitespace-nowrap'>{fmtDate(r.ts)}</TableCell>
                          <TableCell>
                            <Chip tone={CATEGORY_TONE[r.category] ?? 'info'}>{r.category}</Chip>
                          </TableCell>
                          <TableCell className='max-w-96 text-sm break-words whitespace-normal'>{r.description}</TableCell>
                          <TableCell className='text-success font-semibold whitespace-nowrap'>{amount > 0 ? fmt(amount, cur) : ''}</TableCell>
                          <TableCell className='text-danger font-semibold whitespace-nowrap'>{amount < 0 ? fmt(Math.abs(amount), cur) : ''}</TableCell>
                          <TableCell className={cn('font-semibold whitespace-nowrap', Number(r.balance) < 0 && 'text-danger')}>{r.balance !== undefined ? fmt(r.balance, cur) : ''}</TableCell>
                        </TableRow>
                      )
                    })}
                {d && d.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className='text-muted-foreground py-8 text-center'>
                      No transactions in {cur} for this user.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className='text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-6 py-2 text-sm'>
          <label className='flex items-center gap-2'>
            Rows
            <select className='bg-background rounded border px-1 py-0.5' value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(0) }}>
              {LIMITS.map(l => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <span>
            {d?.total ? `${page * limit + 1}–${Math.min((page + 1) * limit, d.total)} of ${d.total}` : '0 rows'}
          </span>
          <div className='flex gap-1'>
            <Button variant='outline' size='sm' disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Prev
            </Button>
            <Button variant='outline' size='sm' disabled={page + 1 >= pages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
    </div>
  )
}

const BalanceSheetDialog = ({
  userId,
  name,
  client = false,
  open,
  onOpenChange
}: {
  userId: string | null
  name?: string | null
  client?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className='flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl'>
      <BalanceSheetView userId={userId} name={name} client={client} active={open} inDialog />
    </DialogContent>
  </Dialog>
)

export default BalanceSheetDialog
