'use client'

import { useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ArrowLeftRightIcon, KeyRoundIcon, PencilIcon, Trash2Icon } from 'lucide-react'

import Can from '@/components/shared/Can'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import ErrorState from '@/components/shared/ErrorState'
import FormDialog from '@/components/shared/FormDialog'
import { SelectField, TextField } from '@/components/shared/FormField'
import JsonView from '@/components/shared/JsonView'
import Money from '@/components/shared/Money'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { formatNumber } from '@/lib/format'
import { useIsAgentTree } from '@/views/finance/StaffFloat'
import WithdrawBlockAction, { WithdrawBlockedBadge, type AccountLocks } from '@/views/players/WithdrawBlockAction'
import type { StaffTransferRow } from '@/views/finance/types'
import { ROLE_NAMES, STAFF_STATUSES, type StaffRow } from './types'

type Staff = StaffRow & { locks?: AccountLocks; balance?: { inr: string; creditLimit: string; exposureLimit: string; currency: string } }
type Rollup = { staffAccounts: number; players: number; balance: string; currency: string; includesSubtree: boolean }

/** `admin/staff/transfers/:id` rows: both parties as `{type, id, name}` (the Transfers screen's shape). */
type Transfer = StaffTransferRow

/** The other side of a transfer, seen from this staff account. */
const counterparty = (r: Transfer, selfId: string) => (r.to.type === 'staff' && String(r.to.id) === selfId ? r.from : r.to)

const transferColumns = (selfId: string): Column<Transfer>[] => [
  { key: 'at', header: 'When', cell: r => <DateTime value={r.createdAt} /> },
  { key: 'dir', header: 'Direction', cell: r => <StatusBadge value={r.direction} /> },
  { key: 'amount', header: 'Amount', align: 'right', cell: r => <Money value={r.amount} currency='INR' /> },
  {
    key: 'to',
    header: 'Counterparty',
    cell: r => {
      const p = counterparty(r, selfId)

      return (
        <Link href={p.type === 'user' ? `/users/${p.id}` : `/staff/${p.id}`} className='text-sm hover:underline'>
          {p.name ?? `${p.type} #${p.id}`}
          <span className='text-muted-foreground ml-1 font-mono text-xs'>{p.type} #{p.id}</span>
        </Link>
      )
    }
  },
  { key: 'type', header: 'Type', cell: r => <span className='text-muted-foreground text-sm'>{r.transferType ?? '—'}</span> }
]

const StaffDetail = ({ id }: { id: string }) => {
  const agentTree = useIsAgentTree()
  const router = useRouter()
  const staff = useApi<Staff>(`admin/staff/${id}`)
  const rollup = useApi<Rollup>(`admin/staff/rollup/${id}`, { includeSubtree: 'true' })
  const { set, query } = useListState()
  const transfers = usePagedApi<Transfer>(`admin/staff/transfers/${id}`, { limit: query.limit, page: query.page })
  const s = staff.data
  const { actor, can } = useSession()

  /**
   * `wallet:adjust` (Super Admin, Admin) moves money with any account in scope. Without it a
   * parent still settles with its DIRECT child staff account out of its own float — the API
   * checks the same thing (`StaffService#assertParentFunding`) and always asks for the
   * transaction password on that path.
   */
  const canAdjust = can('wallet:adjust')
  const isParent = Boolean(actor && s?.parentId != null && String(s.parentId) === String(actor.staffId))
  const canTransfer = canAdjust || (isParent && can(['wallet:credit', 'wallet:debit']))
  const txnRequired = agentTree || !canAdjust

  const [edit, setEdit] = useState({ name: '', phone: '', country: '', status: '', percentage: '' })
  const [transfer, setTransfer] = useState({ toType: 'staff', amount: '', direction: 'deposit', transactionPassword: '' })
  const [newPassword, setNewPassword] = useState('')

  const update = useApiMutation({
    fn: () => {
      const body: Record<string, string> = {}

      if (edit.name && edit.name !== s?.name) body.name = edit.name
      if (edit.phone && edit.phone !== s?.phone) body.phone = edit.phone
      if (edit.country && edit.country !== s?.country) body.country = edit.country
      if (edit.status && edit.status !== s?.status) body.status = edit.status
      if (edit.percentage && edit.percentage !== s?.percentage) body.percentage = edit.percentage

      return api.patch(`admin/staff/${id}`, body)
    },
    invalidate: [['api', `admin/staff/${id}`], ['paged', 'admin/staff'], ['api', 'admin/staff/tree']],
    success: 'Staff updated'
  })

  const move = useApiMutation({
    fn: () =>
      api.post('admin/staff/transfer', {
        toType: transfer.toType,
        toId: Number(id),
        amount: transfer.amount,
        direction: transfer.direction,
        ...(transfer.transactionPassword ? { transactionPassword: transfer.transactionPassword } : {})
      }),
    onSuccess: () => setTransfer(t => ({ ...t, amount: '', transactionPassword: '' })),
    invalidate: [['api', `admin/staff/${id}`], ['paged', `admin/staff/transfers/${id}`], ['api', `admin/staff/rollup/${id}`]],
    success: 'Transfer recorded'
  })

  const resetPw = useApiMutation({
    fn: () => api.patch('admin/staff/password', { targetId: Number(id), newPassword }),
    success: 'Password reset',
    onSuccess: () => setNewPassword('')
  })

  const remove = useApiMutation({
    fn: () => api.delete(`admin/staff/${id}`),
    invalidate: [['paged', 'admin/staff'], ['api', 'admin/staff/tree']],
    success: 'Staff account removed',
    onSuccess: () => router.push('/staff')
  })

  return (
    <div>
      <PageHeader
        title={s?.name ?? `Staff #${id}`}
        description={
          s && (
            <span className='flex flex-wrap items-center gap-2'>
              <span>{s.email}</span>
              <Badge variant='secondary'>{ROLE_NAMES[s.roleId] ?? s.roleId}</Badge>
              <StatusBadge value={s.status} />
              <WithdrawBlockedBadge locks={s.locks} />
              {s.parentId && (
                <span>
                  reports to <Link href={`/staff/${s.parentId}`} className='underline'>#{s.parentId}</Link>
                </span>
              )}
            </span>
          )
        }
        actions={
          s && (
            <>
              {canTransfer && (
                <FormDialog
                  trigger={
                    <Button variant='outline'>
                      <ArrowLeftRightIcon /> Transfer
                    </Button>
                  }
                  title='Transfer with this account'
                  description='Moves balance between you and this account. Deposit adds to them from your balance; withdraw takes it back.'
                  submitLabel='Transfer'
                  onSubmit={() => move.mutateAsync()}
                >
                  <SelectField id='t-dir' label='Direction' value={transfer.direction} onChange={direction => setTransfer({ ...transfer, direction })} options={[{ value: 'deposit', label: 'Deposit to them' }, { value: 'withdraw', label: 'Withdraw from them' }]} />
                  <TextField id='t-amt' label='Amount' required placeholder='1000.00' value={transfer.amount} onChange={e => setTransfer({ ...transfer, amount: e.target.value })} />
                  <TextField id='t-tp' label='Transaction password' type='password' required={txnRequired} hint={txnRequired ? 'Required for every balance move' : 'Required if your account has one set'} value={transfer.transactionPassword} onChange={e => setTransfer({ ...transfer, transactionPassword: e.target.value })} />
                </FormDialog>
              )}
              <Can permission='users:write'>
                <WithdrawBlockAction target={{ kind: 'staff', id }} locks={s.locks} invalidate={[['api', `admin/staff/${id}`], ['paged', 'admin/reports/players']]} />
              </Can>
              <Can permission='staff:write'>
                <FormDialog
                  trigger={
                    <Button variant='outline'>
                      <PencilIcon /> Edit
                    </Button>
                  }
                  title='Edit staff account'
                  onSubmit={() => update.mutateAsync()}
                  onOpenChange={o => o && setEdit({ name: s.name, phone: s.phone ?? '', country: s.country ?? '', status: s.status, percentage: s.percentage })}
                  open={undefined}
                >
                  <TextField id='se-name' label='Name' value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} />
                  <div className='grid grid-cols-2 gap-4'>
                    <SelectField id='se-status' label='Status' value={edit.status || s.status} onChange={status => setEdit({ ...edit, status })} options={STAFF_STATUSES.map(v => ({ value: v, label: v }))} />
                    <TextField id='se-pct' label='Share %' value={edit.percentage} onChange={e => setEdit({ ...edit, percentage: e.target.value })} />
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <TextField id='se-phone' label='Phone' value={edit.phone} onChange={e => setEdit({ ...edit, phone: e.target.value })} />
                    <TextField id='se-country' label='Country' value={edit.country} onChange={e => setEdit({ ...edit, country: e.target.value })} />
                  </div>
                </FormDialog>
                <FormDialog
                  trigger={
                    <Button variant='outline'>
                      <KeyRoundIcon /> Reset password
                    </Button>
                  }
                  title='Reset their password'
                  description='At least 12 characters. They are asked to change it on next sign-in.'
                  submitLabel='Reset'
                  onSubmit={() => resetPw.mutateAsync()}
                >
                  <TextField id='rp' label='New password' type='password' required minLength={12} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </FormDialog>
                <ConfirmDialog
                  trigger={
                    <Button variant='destructive'>
                      <Trash2Icon /> Remove
                    </Button>
                  }
                  title='Remove this staff account?'
                  description='Their downline must be moved first; the platform refuses otherwise.'
                  confirmLabel='Remove'
                  destructive
                  onConfirm={() => remove.mutateAsync()}
                />
              </Can>
            </>
          )
        }
      />
      {staff.error && <ErrorState error={staff.error} />}

      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatCard label='Balance' value={<Money value={s?.balance?.inr} currency={s?.balance?.currency} />} loading={staff.isLoading} />
        <StatCard label='Credit limit' value={<Money value={s?.balance?.creditLimit} />} hint={<>exposure limit <Money value={s?.balance?.exposureLimit} /></>} loading={staff.isLoading} />
        <StatCard label='Downline staff' value={formatNumber(rollup.data?.staffAccounts)} hint='whole subtree' loading={rollup.isLoading} />
        <StatCard label='Users' value={formatNumber(rollup.data?.players)} hint={<>subtree balance <Money value={rollup.data?.balance} currency={rollup.data?.currency} /></>} loading={rollup.isLoading} />
      </div>

      <Tabs defaultValue='transfers' className='mt-6'>
        <TabsList className='mb-4'>
          <TabsTrigger value='transfers'>Transfers</TabsTrigger>
          <TabsTrigger value='analytics'>Analytics</TabsTrigger>
          <TabsTrigger value='chain'>Percent chain</TabsTrigger>
          <TabsTrigger value='risk'>Risk</TabsTrigger>
        </TabsList>
        <TabsContent value='transfers'>
          <DataTable columns={transferColumns(id)} rows={transfers.data?.rows} rowKey={r => r.id} loading={transfers.isLoading} error={transfers.error} pagination={transfers.data?.pagination} onPageChange={page => set({ page })} onLimitChange={limit => set({ limit })} dense />
        </TabsContent>
        <TabsContent value='analytics'>
          <Raw path={`admin/staff/analytics/${id}`} query={{ days: 30 }} />
        </TabsContent>
        <TabsContent value='chain'>
          <Raw path={`admin/staff/${id}/percent-chain`} />
        </TabsContent>
        <TabsContent value='risk'>
          <Raw path={`admin/reports/staff-risk/${id}`} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const Raw = ({ path, query }: { path: string; query?: Record<string, string | number> }) => {
  const q = useApi<unknown>(path, query)

  if (q.error) return <ErrorState error={q.error} />

  return <JsonView value={q.data ?? 'loading…'} />
}

export default StaffDetail
