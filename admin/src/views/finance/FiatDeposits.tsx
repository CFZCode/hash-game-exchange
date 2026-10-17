'use client'

import { useState } from 'react'

import Link from 'next/link'

import { CheckIcon, EyeIcon, XIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import FormDialog from '@/components/shared/FormDialog'
import { TextAreaField, TextField } from '@/components/shared/FormField'
import Money from '@/components/shared/Money'
import { FilterBar } from '@/components/shared/charts'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSession } from '@/contexts/SessionContext'
import { useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { check } from '@/lib/validate'
import { allConvertedLabel, useFinanceFilters } from './currencyFilter'
import FinanceStatsPanel from './FinanceStatsPanel'
import ListStatsTabs from './ListStatsTabs'
import { Details, ImageDialog, ViewDialog, stop } from './shared'
import { FIAT_CURRENCIES, type FiatDepositRow } from './types'
import { useOwnerCoinFilter } from './useCurrencyCodes'

const LIST = 'admin/user/deposits/fiat'
const INVALIDATE = [['paged', LIST], ['api', 'admin/reports/finance-stats']]

/** The server mounts approve/reject behind `deposits:approve`; the inventory lists `withdrawals:approve`. Either shows the buttons; the platform decides. */
const APPROVE = ['deposits:approve', 'withdrawals:approve']

const Approve = ({ row }: { row: FiatDepositRow }) => {
  const [form, setForm] = useState({ creditAmount: '', comment: '' })

  const approve = useApiMutation({
    fn: () => {
      const body: Record<string, string> = {}

      if (form.creditAmount) body.creditAmount = form.creditAmount
      if (form.comment) body.comment = form.comment

      return api.put(`${LIST}/${row.depositId}/approve`, body)
    },
    invalidate: INVALIDATE,
    success: 'Deposit approved and credited'
  })

  return (
    <FormDialog
      trigger={
        <Button size='sm'>
          <CheckIcon /> Approve
        </Button>
      }
      title={`Approve deposit #${row.depositId}`}
      description={
        <>
          Credits user #{row.userId} with <Money value={row.amount} currency={row.currency} />. Enter a smaller amount only when the bank statement shows less, with
          the reason the user will see. More than the requested amount cannot be credited.
        </>
      }
      submitLabel='Approve & credit'
      validate={() => ({
        // fiatDeposit.validators.js approve: creditAmount optional money (> 0, ≤ 8 dp); comment ≤ 500.
        creditAmount: form.creditAmount.trim()
          ? (check.amount(form.creditAmount, 'Credit amount', { decimals: 8 }) ??
            (Number(form.creditAmount) > Number(row.amount) ? `Cannot be more than the requested ${Number(row.amount).toLocaleString('en-IN')} ${row.currency}` : undefined))
          : undefined,
        comment:
          form.creditAmount.trim() && Number(form.creditAmount) < Number(row.amount) && !form.comment.trim()
            ? 'Say why you credit less than requested (the user sees it)'
            : check.length(form.comment, 'Comment', { max: 500 })
      })}
      onSubmit={() => approve.mutateAsync()}
    >
      <TextField id={`ap-amt-${row.depositId}`} name='creditAmount' inputMode='decimal' label='Credit amount' placeholder={row.amount} hint={`Leave blank to credit the requested ${Number(row.amount).toLocaleString('en-IN')} ${row.currency}; at most that`} value={form.creditAmount} onChange={e => setForm({ ...form, creditAmount: e.target.value })} />
      <TextAreaField id={`ap-c-${row.depositId}`} name='comment' label='Comment' value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} />
    </FormDialog>
  )
}

const Reject = ({ row }: { row: FiatDepositRow }) => {
  const [comment, setComment] = useState('')

  const reject = useApiMutation({
    fn: () => api.put(`${LIST}/${row.depositId}/reject`, { comment: comment.trim() }),
    invalidate: INVALIDATE,
    success: 'Deposit rejected'
  })

  return (
    <FormDialog
      trigger={
        <Button size='sm' variant='destructive'>
          <XIcon /> Reject
        </Button>
      }
      title={`Reject deposit #${row.depositId}`}
      description='The user sees this reason on their deposit history.'
      submitLabel='Reject'
      destructive
      validate={() => ({ comment: check.required(comment, 'Reason') ?? check.length(comment, 'Reason', { max: 500 }) })}
      onSubmit={() => reject.mutateAsync()}
    >
      <TextAreaField id={`rj-c-${row.depositId}`} name='comment' label='Reason' required value={comment} onChange={e => setComment(e.target.value)} />
    </FormDialog>
  )
}

const Detail = ({ row }: { row: FiatDepositRow }) => (
  <ViewDialog
    trigger={
      <Button variant='ghost' size='sm'>
        <EyeIcon /> View
      </Button>
    }
    title={`Deposit #${row.depositId}`}
    description={
      <span className='inline-flex items-center gap-2'>
        <StatusBadge value={row.status} /> <DateTime value={row.createdAt} />
      </span>
    }
  >
    <Details
      items={[
        ['User', <Link key='p' href={`/users/${row.userId}`} className='underline'>#{row.userId}</Link>],
        ['Amount', <Money key='a' value={row.amount} currency={row.currency} />],
        ['Bank reference', <span key='t' className='font-mono'>{row.transactionId}</span>],
        ['Method', <DepositMethod key='m' row={row} />],
        ['Bank', row.bankName],
        ['Account holder', row.accountHolderName],
        ['Account number', row.accountNumber],
        ['IFSC', row.ifscCode],
        ['UPI id', row.upiId],
        ['Admin comment', row.adminComment],
        ['Handled by', row.handledBy ? `#${row.handledBy}` : null],
        ['Handled at', row.handledAt ? <DateTime key='h' value={row.handledAt} /> : null]
      ]}
    />
    {row.hasScreenshot ? (
      <div className='mt-2'>
        <ImageDialog path={`${LIST}/${row.depositId}/screenshot`} title={`Proof of payment — deposit #${row.depositId}`} label='View screenshot' />
      </div>
    ) : (
      <p className='text-muted-foreground text-xs'>No proof of payment was uploaded.</p>
    )}
  </ViewDialog>
)

/**
 * How the player paid. The site sends the UPI id for a UPI deposit and the bank account for a
 * bank transfer; older rows carry both (the site used to send every receiving detail), so a row
 * with a UPI id and no account number is UPI, one with both shows both.
 */
const DepositMethod = ({ row }: { row: FiatDepositRow }) => {
  if (row.upiId && !row.accountNumber) return <span className='text-sm'>UPI <span className='text-muted-foreground font-mono text-xs'>{row.upiId}</span></span>
  if (row.upiId && row.bankName) return <span className='text-sm'>UPI or {row.bankName} <span className='text-muted-foreground font-mono text-xs'>{row.upiId}</span></span>

  return <span className='text-sm'>{row.bankName ? `Bank · ${row.bankName}` : '—'}</span>
}

const columns: Column<FiatDepositRow>[] = [
  { key: 'id', header: 'ID', cell: r => <span className='font-mono text-xs'>{r.depositId}</span> },
  { key: 'user', header: 'User', cell: r => <Link href={`/users/${r.userId}`} className='font-mono text-xs hover:underline'>#{r.userId}</Link> },
  { key: 'amount', header: 'Amount', align: 'right', cell: r => <Money value={r.amount} currency={r.currency} /> },
  { key: 'ref', header: 'Bank reference', cell: r => <span className='font-mono text-xs'>{r.transactionId}</span> },
  { key: 'bank', header: 'Method', cell: r => <DepositMethod row={r} /> },
  { key: 'status', header: 'Status', cell: r => <StatusBadge value={r.status} /> },
  { key: 'proof', header: 'Proof', cell: r => (r.hasScreenshot ? <span className='text-xs'>yes</span> : <span className='text-muted-foreground text-xs'>none</span>) },
  { key: 'at', header: 'Created', cell: r => <DateTime value={r.createdAt} /> },
  {
    key: 'actions',
    header: '',
    align: 'right',
    cell: r => (
      <div className='flex justify-end gap-1' onClick={stop}>
        <Detail row={r} />
        {r.status === 'pending' && (
          <Can permission={APPROVE}>
            <Approve row={r} />
            <Reject row={r} />
          </Can>
        )}
      </div>
    )
  }
]

const FiatDeposits = () => {
  const { can } = useSession()
  const { state, set, query } = useListState(['status', 'userId'], { status: 'pending' })

  // Period, bucket size and currency for the charts. The currency (the site's default coin until
  // somebody picks another) also filters the table; the review queue has no date filter.
  const filters = useFinanceFilters({ fiat: true })
  const ownerCoins = useOwnerCoinFilter()

  const list = usePagedApi<FiatDepositRow>(LIST, {
    // Agent ke users ye use nahi kar sakte — sirf direct users.
    channel: 'direct',
    limit: query.limit,
    page: query.page,
    status: query.status,
    currency: filters.currency || undefined,
    userId: query.userId,
    search: query.search
  })

  return (
    <div>
      <PageHeader title='Manual deposits' description='Manual bank-transfer deposits awaiting review. Approving credits the user; rejecting records a reason they can see.' />
      <FilterBar filters={filters} currencies={ownerCoins(FIAT_CURRENCIES)} allCurrenciesLabel={allConvertedLabel(filters.defaultCurrency)} className='mb-4' />
      <ListStatsTabs stats={can('reports:read') ? <FinanceStatsPanel kind='deposits' rail='fiat' filters={filters} statusLabels={{ success: 'Successful', pending: 'Pending', failed: 'Failed' }} /> : null}>
        <DataTable
          columns={columns}
          rows={list.data?.rows}
          rowKey={r => r.depositId}
          loading={list.isLoading}
          fetching={list.isFetching}
          error={list.error}
          pagination={list.data?.pagination}
          onPageChange={page => set({ page })}
          onLimitChange={limit => set({ limit })}
          search={String(state.search ?? '')}
          onSearchChange={search => set({ search })}
          searchPlaceholder='Bank reference, holder…'
          emptyMessage={state.status ? `No ${state.status} deposits.` : 'No deposits.'}
          toolbar={
            <>
              <Select value={String(state.status || 'all')} onValueChange={v => v && set({ status: v === 'all' ? '' : v })}>
                <SelectTrigger className='w-36'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All statuses</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='approved'>Approved</SelectItem>
                  <SelectItem value='rejected'>Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder='User id' inputMode='numeric' aria-label='User id' value={String(state.userId ?? '')} onChange={e => set({ userId: e.target.value.replace(/\D/g, '') })} className='w-28' />
            </>
          }
        />
      </ListStatsTabs>
    </div>
  )
}

export default FiatDeposits
