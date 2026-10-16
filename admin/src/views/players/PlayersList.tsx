'use client'

import { useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DownloadIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import Can from '@/components/shared/Can'
import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import FormDialog from '@/components/shared/FormDialog'
import { TextField } from '@/components/shared/FormField'
import Money from '@/components/shared/Money'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSession } from '@/contexts/SessionContext'
import { useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api, errorMessage } from '@/lib/api/client'
import { check } from '@/lib/validate'
import { formatNumber } from '@/lib/format'
import { useIsAgentTree, TxnPasswordLabel } from '@/views/finance/StaffFloat'
import type { PlayerRow } from './types'
import UserStatusOverview from './UserStatusOverview'

const columns: Column<PlayerRow>[] = [
  {
    key: 'name',
    header: 'User',
    cell: r => (
      <div className='flex flex-col'>
        <Link href={`/users/${r.id}`} className='font-medium hover:underline'>
          {r.name}
        </Link>
        <span className='text-muted-foreground font-mono text-xs'>{r.id}</span>
      </div>
    )
  },
  { key: 'status', header: 'Status', cell: r => <StatusBadge value={r.status} /> },
  { key: 'channel', header: 'Channel', cell: r => <Badge variant='outline'>{r.channel}{r.agentId ? ` · #${r.agentId}` : ''}</Badge> },
  { key: 'balance', header: 'Balance', align: 'right', cell: r => <Money value={r.balance} /> },
  {
    key: 'dep',
    header: <span title='Lifetime bank and gateway deposits the player paid in (INR). Credits from an upline are not included.'>Gateway deposits</span>,
    align: 'right',
    cell: r => <Money value={r.totalDeposited} />
  },
  { key: 'wd', header: 'Withdrawn', align: 'right', cell: r => <Money value={r.totalWithdrawn} /> },
  { key: 'wager', header: 'Wagered', align: 'right', cell: r => <Money value={r.wager} /> },
  { key: 'vip', header: 'VIP', cell: r => <span className='text-sm'>L{r.vip?.level ?? 0} <span className='text-muted-foreground'>{r.vip?.card}</span></span> },
  { key: 'games', header: <span title='Lifetime bets, every product (stakes on the wallet ledger).'>Bets</span>, align: 'right', cell: r => formatNumber(r.gamesPlayed) },
  { key: 'ref', header: 'Referral', cell: r => <span className='font-mono text-xs'>{r.referralCode}</span> }
]

/**
 * `POST admin/players`. A starting balance is a balance move: agent-tree staff always need the
 * transaction password for it (403 TXN_PASSWORD_REQUIRED / TXN_PASSWORD_INVALID), house staff once
 * they have set one. The field shows only when the balance is above zero and is sent only when filled.
 */
const CreatePlayer = () => {
  const agentTree = useIsAgentTree()
  const [form, setForm] = useState({ username: '', email: '', phone: '', country: '', password: '', initialBalance: '0', transactionPassword: '' })
  const router = useRouter()
  const hasBalance = Number(form.initialBalance) > 0

  const create = useApiMutation({
    fn: () => {
      const body: Record<string, string> = { username: form.username, password: form.password, initialBalance: form.initialBalance || '0' }

      if (form.email) body.email = form.email
      if (form.phone) body.phone = form.phone
      if (form.country) body.country = form.country
      if (hasBalance && form.transactionPassword) body.transactionPassword = form.transactionPassword

      return api.post<{ id: string | number }>('admin/players', body)
    },
    invalidate: [['paged', 'admin/reports/players'], ['paged', 'admin/user/directory']],
    success: 'User created',
    onSuccess: r => {
      setForm(f => ({ ...f, transactionPassword: '' }))
      if (r?.id) router.push(`/users/${r.id}`)
    }
  })

  return (
    <FormDialog
      trigger={
        <Button>
          <PlusIcon /> New user
        </Button>
      }
      title='Create a user'
      description='An operator-created account. The user can change the password after first sign-in.'
      submitLabel='Create'
      validate={() => ({
        username: check.required(form.username, 'Username') || check.length(form.username, 'Username', { min: 3, max: 60 }),
        email: check.email(form.email, 'Email', true) || check.length(form.email, 'Email', { max: 160 }),
        phone: check.length(form.phone, 'Phone', { max: 30 }),
        country: check.length(form.country, 'Country', { max: 80 }),
        password: !form.password ? 'Password is required' : check.length(form.password, 'Password', { min: 8, max: 200 }),
        initialBalance: check.number(form.initialBalance, 'Initial balance', { min: 0, decimals: 8, optional: true }),
        transactionPassword: hasBalance && agentTree && !form.transactionPassword && 'Transaction password is required for a starting balance'
      })}
      onSubmit={() => create.mutateAsync()}
    >
      <TextField id='username' label='Username' required minLength={3} maxLength={60} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
      <TextField id='email' label='Email' type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <div className='grid grid-cols-2 gap-4'>
        <TextField id='phone' label='Phone' value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <TextField id='country' label='Country' value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
      </div>
      <TextField id='password' label='Password' type='password' required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <TextField id='initialBalance' label='Initial balance' inputMode='decimal' hint='Decimal string, e.g. 100.00' value={form.initialBalance} onChange={e => setForm({ ...form, initialBalance: e.target.value })} />
      {hasBalance && (
        <TextField id='cp-tp' name='transactionPassword' label={<TxnPasswordLabel />} type='password' hint={agentTree ? 'Required for a starting balance' : 'Required (if your account uses one)'} value={form.transactionPassword} onChange={e => setForm({ ...form, transactionPassword: e.target.value })} />
      )}
    </FormDialog>
  )
}

/** `GET admin/user/directory` — the allow-listed player columns, tree-scoped, guarded by users:read. */
type DirectoryRow = {
  id: number | string
  name: string
  email: string | null
  phone: string | null
  status: string
  is_locked: boolean | null
  system_locked: boolean | null
  parent_staff_id: number | null
  created: string | null
}

const directoryColumns: Column<DirectoryRow>[] = [
  {
    key: 'name',
    header: 'User',
    cell: r => (
      <div className='flex flex-col'>
        <Link href={`/users/${r.id}`} className='font-medium hover:underline'>
          {r.name}
        </Link>
        <span className='text-muted-foreground font-mono text-xs'>{r.id}</span>
      </div>
    )
  },
  { key: 'status', header: 'Status', cell: r => <StatusBadge value={r.system_locked ? 'Locked' : r.status} /> },
  { key: 'email', header: 'Email', cell: r => <span className='text-sm'>{r.email ?? '—'}</span> },
  { key: 'phone', header: 'Phone', cell: r => <span className='text-sm'>{r.phone ?? '—'}</span> },
  { key: 'agent', header: 'Under', cell: r => (r.parent_staff_id ? <Badge variant='outline'>#{r.parent_staff_id}</Badge> : '—') },
  { key: 'created', header: 'Joined', cell: r => (r.created ? <DateTime value={r.created} relative /> : '—') }
]

/**
 * The Users list for a login holding users:read without reports:read (e.g. an executive granted
 * only users:read). `admin/reports/players` would refuse it, so it reads the player directory,
 * which carries no balances or lifetime totals.
 */
const DirectoryList = () => {
  const { state, set, query } = useListState()
  const list = usePagedApi<DirectoryRow>('admin/user/directory', { limit: query.limit, page: query.page, search: query.search || undefined })
  const router = useRouter()

  return (
    <div>
      <PageHeader
        title='Users'
        description='Every user account in your tree.'
        actions={
          <Can permission='users:write'>
            <CreatePlayer />
          </Can>
        }
      />
      <DataTable
        columns={directoryColumns}
        rows={list.data?.rows}
        rowKey={r => String(r.id)}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error}
        pagination={list.data?.pagination}
        onPageChange={page => set({ page })}
        onLimitChange={limit => set({ limit })}
        search={String(state.search ?? '')}
        onSearchChange={search => set({ search })}
        searchPlaceholder='Username, email, phone…'
        onRowClick={r => router.push(`/users/${r.id}`)}
      />
    </div>
  )
}

const PlayersList = () => {
  const { can } = useSession()

  // The full list is `admin/reports/players` (reports:read); users:read alone gets the directory.
  return can('reports:read') ? <ReportsList /> : <DirectoryList />
}

const ReportsList = () => {
  // Agent-tree logins see no promotions: the VIP column goes with them.
  const promotions = useSession().actor?.promotions === true
  const visibleColumns = promotions ? columns : columns.filter(c => c.key !== 'vip')
  const { state, set, query } = useListState(['channel'], { channel: 'all' })
  const list = usePagedApi<PlayerRow>('admin/reports/players', { ...query, sort: undefined, order: undefined })
  const router = useRouter()

  const exportCsv = async () => {
    try {
      const blob = await api.blob('admin/reports/players/export', { channel: state.channel || 'all', search: state.search || undefined })
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: 'users.csv' })

      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(`Export failed: ${errorMessage(e)}`)
    }
  }

  return (
    <div>
      <PageHeader
        title='Users'
        description={`Every user account, with balance, lifetime deposits and withdrawals${promotions ? ', and VIP position' : ''}.`}
        actions={
          <>
            <Can permission='reports:read'>
              <Button variant='outline' onClick={exportCsv}>
                <DownloadIcon /> Export CSV
              </Button>
            </Can>
            <Can permission='users:write'>
              <CreatePlayer />
            </Can>
          </>
        }
      />
      <Can permission='reports:read'>
        <UserStatusOverview channel={String(state.channel || 'all')} onChannelChange={channel => set({ channel, page: 1 })} showVip={promotions} />
      </Can>
      <DataTable
        columns={visibleColumns}
        rows={list.data?.rows}
        rowKey={r => r.id}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error}
        pagination={list.data?.pagination}
        onPageChange={page => set({ page })}
        onLimitChange={limit => set({ limit })}
        search={String(state.search ?? '')}
        onSearchChange={search => set({ search })}
        searchPlaceholder='Username, email, id…'
        onRowClick={r => router.push(`/users/${r.id}`)}
        toolbar={
          <Select value={String(state.channel || 'all')} onValueChange={v => v && set({ channel: v })}>
            <SelectTrigger className='w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All channels</SelectItem>
              <SelectItem value='direct'>Direct</SelectItem>
              <SelectItem value='agent'>Via agent</SelectItem>
            </SelectContent>
          </Select>
        }
      />
    </div>
  )
}

export default PlayersList
