'use client'

import { CreditCardIcon, RefreshCwIcon } from 'lucide-react'

import ErrorState from '@/components/shared/ErrorState'
import PageHeader from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi, useApiMutation } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'

/** `GET admin/user/payments/payment-systems` */
type Method = {
  name: string
  label: string
  deposit: { gatewayEnabled: boolean; siteOffered: boolean; min: number; max: number }
  withdrawal: { gatewayEnabled: boolean; siteUsed: boolean; min: number; max: number }
  notes: string[]
}

type Overview = {
  configured: boolean
  projectId: string | null
  fetchedAt: string | null
  cacheAgeSeconds: number | null
  currencies: { currency: string; methods: Method[] }[]
}

const PATH = 'admin/user/payments/payment-systems'

/** Zip jaisa chip: hara = on, laal/grey = off. */
const Chip = ({ on, yes, no }: { on: boolean; yes: string; no: string }) => (
  <span
    className={cn(
      'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-bold',
      on ? 'bg-success-soft text-success border-success/30' : 'bg-danger-soft text-danger border-danger/30'
    )}
  >
    {on ? yes : no}
  </span>
)

const limits = (min: number, max: number) => (min || max ? `${min.toLocaleString()} – ${max.toLocaleString()}` : '—')

/**
 * Settings → Payment Methods — admin-structure.zip ka "Payment Methods — Live Status".
 * A-Pay ne is project ke liye kaun se payment systems chalu kiye hain (har currency ke liye),
 * limits ke saath, aur site unme se kaunsa deposit / withdrawal ke liye use karti hai.
 * Sirf padhna; har 60 sec apne aap refresh. "Refresh from gateway" = cache chhod ke abhi laao.
 */
const PaymentMethods = () => {
  const data = useApi<Overview>(PATH, undefined, { refetchInterval: 60_000 })

  const refresh = useApiMutation({
    fn: () => api.get<Overview>(PATH, { fresh: '1' }),
    invalidate: [['api', PATH]],
    success: 'Refreshed from gateway'
  })

  const o = data.data

  return (
    <div>
      <PageHeader
        title='Payment Methods — Live Status'
        description={
          o?.configured
            ? `A-Pay project ${o.projectId} · fetched ${o.fetchedAt ? new Date(o.fetchedAt).toLocaleString() : '—'} · cache age ${o.cacheAgeSeconds ?? 0}s`
            : 'What the payment gateway has switched on, per currency, and what the site offers.'
        }
        actions={
          <Button onClick={() => refresh.mutate()} disabled={refresh.isPending || !o?.configured}>
            <RefreshCwIcon className={cn(refresh.isPending && 'animate-spin')} /> Refresh from gateway
          </Button>
        }
      />

      {data.error ? (
        <ErrorState error={data.error} />
      ) : data.isLoading ? (
        <Skeleton className='h-40 w-full' />
      ) : !o?.configured ? (
        <Card className='items-center gap-2 py-10 text-center'>
          <CreditCardIcon className='text-border size-10' />
          <div className='font-semibold'>A-Pay is not configured</div>
          <div className='text-muted-foreground text-sm'>Set APAY_API_KEY, APAY_PROJECT_ID and APAY_BASE_URL on the user service to see live payment methods.</div>
        </Card>
      ) : (
        <div className='grid gap-4'>
          {o.currencies.map(c => (
            <Card key={c.currency} className='gap-0 overflow-hidden py-0'>
              <div className='flex items-center gap-2 border-b px-4 py-3'>
                <span className='bg-primary/12 text-primary rounded-md px-2 py-0.5 text-sm font-bold'>{c.currency}</span>
                <span className='text-muted-foreground text-xs'>{c.methods.length} methods</span>
              </div>
              {c.methods.length === 0 ? (
                <div className='text-muted-foreground px-4 py-6 text-center text-sm'>No payment systems for {c.currency}.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {['Method', 'System name', 'Deposit (gateway)', 'Deposit (on site)', 'Deposit limits', 'Withdrawal', 'Withdrawal limits', 'Notes'].map(h => (
                        <TableHead key={h} className='text-muted-foreground text-xs uppercase'>
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.methods.map(m => (
                      <TableRow key={m.name}>
                        <TableCell className='font-semibold'>{m.label}</TableCell>
                        <TableCell className='text-info font-mono text-xs'>{m.name}</TableCell>
                        <TableCell>
                          <Chip on={m.deposit.gatewayEnabled} yes='Enabled' no='Disabled' />
                        </TableCell>
                        <TableCell>
                          <Chip on={m.deposit.siteOffered} yes='Shown' no='Hidden' />
                        </TableCell>
                        <TableCell className='font-mono text-xs'>{limits(m.deposit.min, m.deposit.max)}</TableCell>
                        <TableCell>
                          <Chip on={m.withdrawal.gatewayEnabled} yes={m.withdrawal.siteUsed ? 'Enabled · used' : 'Enabled'} no='Disabled' />
                        </TableCell>
                        <TableCell className='font-mono text-xs'>{limits(m.withdrawal.min, m.withdrawal.max)}</TableCell>
                        <TableCell className='text-warning max-w-64 text-xs whitespace-normal'>{m.notes.join(' · ') || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default PaymentMethods
