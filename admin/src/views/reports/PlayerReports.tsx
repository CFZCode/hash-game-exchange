'use client'

import { useState } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DownloadIcon, FileTextIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'

import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import ErrorState from '@/components/shared/ErrorState'
import FormDialog from '@/components/shared/FormDialog'
import { DateRangeField, TextField } from '@/components/shared/FormField'
import Money from '@/components/shared/Money'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useListState, usePagedApi } from '@/hooks/use-api'
import { api, errorMessage } from '@/lib/api/client'
import { formatNumber } from '@/lib/format'
import PlayerStatsOverview from './PlayerStatsOverview'
import { daysAgo, downloadBlob, type AgentStaffRow, type AgentUserRow, type AgentUsersReport, type PlayerReportRow } from './types'

const playerColumns: Column<PlayerReportRow>[] = [
  {
    key: 'user',
    header: 'User',
    cell: r => (
      <div className='flex flex-col'>
        <Link href={`/users/${r.id}`} className='font-medium hover:underline' onClick={e => e.stopPropagation()}>
          {r.name}
        </Link>
        <span className='text-muted-foreground font-mono text-xs'>#{r.id}{r.referralCode ? ` · ${r.referralCode}` : ''}</span>
      </div>
    )
  },
  { key: 'channel', header: 'Channel', cell: r => (r.channel === 'agent' ? <Link href={`/staff/${r.agentId}`} className='hover:underline' onClick={e => e.stopPropagation()}>agent #{r.agentId}</Link> : <Badge variant='outline'>direct</Badge>) },
  { key: 'status', header: 'Status', cell: r => <StatusBadge value={r.status} /> },

  // Lifetime wager (userwager) in the currency the API reports for it; the report has no currency
  // field yet and userwager is kept in USD, so USD until it sends one.
  { key: 'wager', header: 'Wager', align: 'right', cell: r => <Money value={r.wager} currency={r.wagerCurrency ?? 'USD'} digits={2} /> },
  {
    key: 'vip',
    header: 'VIP',
    cell: r => (
      <span className='text-sm'>
        L{r.vip?.level}{' '}
        <span className='text-muted-foreground'>
          {r.vip?.card} · {r.vip?.nextLevel == null ? 'Top level' : `${r.vip.progressPct}% to L${r.vip.nextLevel}`}
        </span>
      </span>
    )
  },
  { key: 'balance', header: 'Balance', align: 'right', cell: r => <Money value={r.balance} /> },
  {
    key: 'dep',
    header: <span title='Lifetime bank and gateway deposits the player paid in (INR). Credits from an upline are not included.'>Gateway deposits</span>,
    align: 'right',
    cell: r => <Money value={r.totalDeposited} />
  },
  { key: 'wd', header: 'Withdrawn', align: 'right', cell: r => <Money value={r.totalWithdrawn} /> },
  { key: 'games', header: <span title='Lifetime bets, every product (stakes on the wallet ledger).'>Bets</span>, align: 'right', cell: r => formatNumber(r.gamesPlayed) }
]

const PlayersTab = () => {
  // Agent-tree logins see no promotions: the VIP column goes with them.
  const promotions = useSession().actor?.promotions === true
  const router = useRouter()
  const { state, set, query } = useListState(['channel'])
  const list = usePagedApi<PlayerReportRow>('admin/reports/players', { limit: query.limit, page: query.page, search: query.search, channel: query.channel })
  const [exporting, setExporting] = useState(false)

  const exportCsv = async () => {
    setExporting(true)

    try {
      const blob = await api.blob('admin/reports/players/export', { channel: query.channel || 'all', search: query.search })

      downloadBlob(blob, `users-${daysAgo(0)}.csv`)
      toast.success('Export downloaded (the platform audits this)')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  // One channel filter for the charts and the table.
  const channelSelect = (
    <Select value={String(state.channel || 'all')} onValueChange={v => v && set({ channel: v === 'all' ? '' : v })}>
      <SelectTrigger className='w-36' aria-label='Channel'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='all'>All channels</SelectItem>
        <SelectItem value='direct'>Direct signups</SelectItem>
        <SelectItem value='agent'>Under an agent</SelectItem>
      </SelectContent>
    </Select>
  )

  return (
    <>
    <PlayerStatsOverview channel={query.channel ? String(query.channel) : undefined}>{channelSelect}</PlayerStatsOverview>
    <DataTable
      columns={promotions ? playerColumns : playerColumns.filter(c => c.key !== 'vip')}
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
      searchPlaceholder='Username or referral code…'
      onRowClick={r => router.push(`/users/${r.id}`)}
      toolbar={
        <>
          <Button variant='outline' className='ml-auto' onClick={exportCsv} disabled={exporting}>
            <DownloadIcon /> Export CSV
          </Button>
        </>
      }
    />
    </>
  )
}

const agentUserColumns: Column<AgentUserRow>[] = [
  {
    key: 'user',
    header: 'User',
    cell: r => (
      <div className='flex flex-col'>
        <Link href={`/users/${r.id}`} className='font-medium hover:underline'>
          {r.name}
        </Link>
        <span className='text-muted-foreground text-xs'>{r.email ?? `#${r.id}`}</span>
      </div>
    )
  },
  { key: 'agent', header: 'Agent', cell: r => (r.staffId ? <Link href={`/staff/${r.staffId}`} className='hover:underline'>{r.staffName ?? `#${r.staffId}`}</Link> : '—') },
  { key: 'locks', header: 'Locks', cell: r => <span className='flex gap-1'>{r.isLocked && <StatusBadge value='locked' />}{r.sportsBetlocked && <Badge variant='outline'>sports</Badge>}{!r.isLocked && !r.sportsBetlocked && <span className='text-muted-foreground'>—</span>}</span> },
  {
    key: 'dep',
    header: <span title='Credits from the upline (agent transfers) plus the bank and gateway deposits the player paid in, lifetime.'>Deposits incl. upline credits</span>,
    align: 'right',
    cell: r => <Money value={r.totalDeposit} />
  },
  { key: 'wd', header: 'Withdrawals', align: 'right', cell: r => <Money value={r.totalWithdrawal} /> },
  { key: 'sports', header: 'Sports P&L', align: 'right', cell: r => <Money value={r.sportsPnl} signed /> },
  { key: 'casino', header: 'Casino P&L', align: 'right', cell: r => <Money value={r.casinoPnl} signed /> },
  { key: 'pnl', header: 'P&L', align: 'right', cell: r => <Money value={r.pnl} signed /> }
]

const agentStaffColumns: Column<AgentStaffRow>[] = [
  { key: 'name', header: 'Staff', cell: r => <Link href={`/staff/${r.id}`} className='font-medium hover:underline'>{r.name}</Link> },
  { key: 'role', header: 'Role', cell: r => <Badge variant='secondary'>{r.roleName}</Badge> },
  { key: 'parent', header: 'Reports to', cell: r => (r.parentId ? <Link href={`/staff/${r.parentId}`} className='hover:underline'>{r.parentName ?? `#${r.parentId}`}</Link> : '—') },
  { key: 'locks', header: 'Locks', cell: r => <span className='flex gap-1'>{r.systemLocked && <StatusBadge value='locked' />}{r.sportsBetlocked && <Badge variant='outline'>sports</Badge>}{!r.systemLocked && !r.sportsBetlocked && <span className='text-muted-foreground'>—</span>}</span> },
  { key: 'created', header: 'Created', cell: r => <DateTime value={r.createdAt} /> }
]

const AgentUsersTab = () => {
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [limit, setLimit] = useState(50)
  const [page, setPage] = useState(1)
  const report = useApi<AgentUsersReport>('admin/reports/agent-users', { search: applied || undefined, limit, offset: (page - 1) * limit })
  const d = report.data
  const total = d?.total ?? 0
  const pagination = { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1), hasNext: page * limit < total, hasPrev: page > 1 }

  return (
    <div className='grid gap-4'>
      {report.error && <ErrorState error={report.error} />}
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatCard label='Users in tree' value={formatNumber(d?.total)} loading={report.isLoading} />
        <StatCard label='Staff in tree' value={formatNumber(d?.staff?.length)} loading={report.isLoading} />
        <StatCard label='Currency' value={d?.currency ?? '—'} loading={report.isLoading} />
        <StatCard label='Scope' value={d ? (d.scope.isSuperAdmin ? 'Whole platform' : `Staff #${d.scope.staffId}`) : '—'} loading={report.isLoading} />
      </div>
      <DataTable
        columns={agentUserColumns}
        rows={d?.users}
        rowKey={r => r.id}
        loading={report.isLoading}
        fetching={report.isFetching}
        pagination={pagination}
        onPageChange={setPage}
        onLimitChange={l => {
          setLimit(l)
          setPage(1)
        }}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder='User name or email…'
        toolbar={
          <Button
            variant='outline'
            onClick={() => {
              setApplied(search.trim())
              setPage(1)
            }}
          >
            <SearchIcon /> Search
          </Button>
        }
        dense
      />
      <div>
        <h2 className='mb-2 text-base font-semibold'>Staff anchoring these users</h2>
        <DataTable columns={agentStaffColumns} rows={d?.staff} rowKey={r => r.id} loading={report.isLoading} dense />
      </div>
    </div>
  )
}

const PlayerLookup = () => {
  const router = useRouter()
  const [id, setId] = useState('')

  return (
    <form
      className='flex items-center gap-2'
      onSubmit={e => {
        e.preventDefault()
        if (id.trim()) router.push(`/users/${id.trim()}`)
      }}
    >
      <Input placeholder='User id' className='w-40' value={id} onChange={e => setId(e.target.value.replace(/\D/g, ''))} />
      <Button type='submit' variant='outline' disabled={!id}>
        <SearchIcon /> Open user
      </Button>
    </form>
  )
}

const PlayerSheet = () => {
  const [form, setForm] = useState({ uid: '', from: daysAgo(30), to: daysAgo(0) })

  return (
    <FormDialog
      trigger={
        <Button variant='outline'>
          <FileTextIcon /> User sheet PDF
        </Button>
      }
      title='Download a user sheet'
      description='A printable statement of one user for the period.'
      submitLabel='Download'
      onSubmit={async () => {
        try {
          const blob = await api.blob(`admin/reports/player-sheet/${form.uid.trim()}`, { from: form.from || undefined, to: form.to || undefined })

          downloadBlob(blob, `user-${form.uid.trim()}-${form.from}-${form.to}.pdf`)
          toast.success('User sheet downloaded')
        } catch (e) {
          toast.error(errorMessage(e))
          throw e
        }
      }}
    >
      <TextField id='ps-uid' label='User id' required value={form.uid} onChange={e => setForm({ ...form, uid: e.target.value.replace(/\D/g, '') })} />
      <DateRangeField id='ps-period' label='Period' from={form.from} to={form.to} onChange={r => setForm({ ...form, ...r })} />
    </FormDialog>
  )
}

const PlayerReports = () => {
  const promotions = useSession().actor?.promotions === true

  return (
    <div>
      <PageHeader
        title='User reports'
        description={`Wager, ${promotions ? 'VIP progress ' : ''}and money per user; the agent-tree listing; CSV export and printable user sheets.`}
        actions={
          <>
            <PlayerLookup />
            <PlayerSheet />
          </>
        }
      />
      <Tabs defaultValue='players'>
        <TabsList className='mb-4'>
          <TabsTrigger value='players'>Users</TabsTrigger>
          <TabsTrigger value='agent-users'>Agent users</TabsTrigger>
        </TabsList>
        <TabsContent value='players'>
          <PlayersTab />
        </TabsContent>
        <TabsContent value='agent-users'>
          <AgentUsersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PlayerReports
