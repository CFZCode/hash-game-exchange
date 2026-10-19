'use client'

import { useState } from 'react'

import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import ErrorState from '@/components/shared/ErrorState'
import Money from '@/components/shared/Money'
import ChannelTabs, { type Channel } from '@/components/shared/ChannelTabs'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/shared/StatCard'
import StatusBadge from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSession } from '@/contexts/SessionContext'
import { useApi, useListState } from '@/hooks/use-api'
import { formatNumber } from '@/lib/format'
import type { CasinoStats, CasinoTotals, CasinoTxn, RawTxn } from './types'
import { usePageList } from './usePageList'

const ALL = '__all__'

const SOURCES = [
  { value: 'inhouse', label: 'Originals' },
  { value: 'gis', label: 'Slotegrator' },
  { value: 'jsgames', label: 'JS games' }
]

const txnColumns: Column<CasinoTxn>[] = [
  { key: 'at', header: 'Time', cell: r => <DateTime value={r.transaction_timestamp} /> },
  {
    key: 'user',
    header: 'User',
    cell: r => (
      <div>
        <div>{r.user_name ?? '—'}</div>
        <div className='text-muted-foreground font-mono text-xs'>#{r.user_id}</div>
      </div>
    )
  },
  {
    key: 'game',
    header: 'Game',
    cell: r => (
      <div>
        <div>{r.game_title ?? '—'}</div>
        <div className='text-muted-foreground text-xs'>{r.game_vendor ?? r.source}</div>
      </div>
    )
  },
  { key: 'type', header: 'Type', cell: r => <Badge variant='outline'>{r.transaction_type}</Badge> },
  { key: 'amount', header: 'Amount', align: 'right', cell: r => <Money value={r.amount} currency={r.currency_code} /> },
  { key: 'profit', header: 'Profit', align: 'right', cell: r => <Money value={r.profit} signed /> },
  { key: 'outcome', header: 'Result', cell: r => <StatusBadge value={r.outcome} /> },
  { key: 'status', header: 'Status', cell: r => <StatusBadge value={r.transaction_status} /> },
  {
    key: 'ref',
    header: 'Round / ref',
    cell: r => (
      <div className='font-mono text-xs'>
        <div>{r.round_id}</div>
        <div className='text-muted-foreground'>{r.transaction_id}</div>
      </div>
    )
  }
]

const DateRange = ({ state, set }: { state: Record<string, string | number>; set: (p: Record<string, string | number | null>) => void }) => (
  <DateRangePicker aria-label='Date range' from={String(state.from ?? '')} to={String(state.to ?? '')} onChange={set} />
)

const TransactionsTab = ({ channel }: { channel: Channel }) => {
  const { state, set } = useListState(['userId', 'source', 'from', 'to'])

  const list = usePageList<CasinoTxn>('admin/casino/bet-history/transactions', {
    limit: state.limit,
    page: state.page,
    search: state.search || undefined,
    userId: state.userId || undefined,
    source: state.source && state.source !== ALL ? state.source : undefined,
    from: state.from || undefined,
    to: state.to || undefined,
    channel
  })

  return (
    <DataTable
      columns={txnColumns}
      rows={list.data?.rows}
      rowKey={(r, i) => `${r.source_key}-${r.id ?? r.transaction_id}-${i}`}
      loading={list.isLoading}
      fetching={list.isFetching}
      error={list.error}
      pagination={list.data?.pagination}
      onPageChange={page => set({ page })}
      onLimitChange={limit => set({ limit })}
      search={String(state.search ?? '')}
      onSearchChange={search => set({ search })}
      searchPlaceholder='Transaction reference…'
      dense
      toolbar={
        <>
          <Input placeholder='User id' className='w-28' value={String(state.userId ?? '')} onChange={e => set({ userId: e.target.value })} />
          <Select value={String(state.source || ALL)} onValueChange={v => v && set({ source: v })}>
            <SelectTrigger className='w-40'>
              <SelectValue>{(v: string) => (v === ALL ? 'All sources' : (SOURCES.find(s => s.value === v)?.label ?? v))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sources</SelectItem>
              {SOURCES.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRange state={state} set={set} />
        </>
      }
    />
  )
}

const TotalsRow = ({ label, t, currency }: { label: string; t: CasinoTotals; currency?: string }) => (
  <TableRow>
    <TableCell className='pl-4 font-medium capitalize'>{label}</TableCell>
    <TableCell className='text-right tabular-nums'>{formatNumber(t.bets)}</TableCell>
    <TableCell className='text-right tabular-nums'>{formatNumber(t.wins)}</TableCell>
    <TableCell className='text-right tabular-nums'>{formatNumber(t.losses)}</TableCell>
    <TableCell className='text-right tabular-nums'>{formatNumber(t.pushes)}</TableCell>
    <TableCell className='text-right tabular-nums'>{formatNumber(t.refunds)}</TableCell>
    <TableCell className='text-right'><Money value={t.wagered} currency={currency} /></TableCell>
    <TableCell className='text-right'><Money value={t.payouts} currency={currency} /></TableCell>
    <TableCell className='text-right'><Money value={t.refunded} currency={currency} /></TableCell>
    <TableCell className='pr-4 text-right'><Money value={String(-Number(t.net))} currency={currency} signed /></TableCell>
  </TableRow>
)

const StatsTab = ({ channel }: { channel: Channel }) => {
  const [userId, setUserId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [cur, setCur] = useState('')
  const stats = useApi<CasinoStats>('admin/casino/bet-history/stats', { userId: userId || undefined, from: from || undefined, to: to || undefined, channel })

  // One wallet at a time: INR and USDT added together is no amount at all.
  const wallets = stats.data?.byCurrency ?? []
  const wallet = wallets.find(w => w.currency === cur) ?? wallets[0]
  const t = wallet?.totals
  const currency = wallet?.currency

  // `byType` (the rest of the payload) restates the cards above, so it is not drawn again.
  const bySource = wallet?.bySource ?? {}

  return (
    <div className='grid gap-4'>
      <div className='flex flex-wrap items-center gap-3'>
        <Input placeholder='User id (optional)' className='w-40' value={userId} onChange={e => setUserId(e.target.value)} />
        <DateRangePicker aria-label='Date range' from={from} to={to} onChange={r => { setFrom(r.from); setTo(r.to) }} />
        {wallets.length > 0 && (
          <Select value={currency ?? ''} onValueChange={v => v && setCur(v)}>
            <SelectTrigger className='w-28' aria-label='Currency'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {wallets.map(w => (
                <SelectItem key={w.currency} value={w.currency}>
                  {w.currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {stats.error && <ErrorState error={stats.error} />}
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatCard label='Bets' value={formatNumber(t?.bets)} loading={stats.isLoading} hint={t ? `${formatNumber(t.wins)} won · ${formatNumber(t.losses)} lost · ${formatNumber(t.pushes)} push` : undefined} />
        <StatCard label='Wagered' value={<Money value={t?.wagered} currency={currency} />} loading={stats.isLoading} />
        <StatCard label='Paid out' value={<Money value={t?.payouts} currency={currency} />} loading={stats.isLoading} hint={t ? <>refunded <Money value={t.refunded} currency={currency} digits={2} /></> : undefined} />
        <StatCard label='GGR (house)' value={<Money value={t ? String(-Number(t.net)) : undefined} currency={currency} signed />} loading={stats.isLoading} hint='Wagered minus payouts' />
      </div>
      <Card className='gap-0 overflow-hidden py-0 shadow-none'>
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='pl-4'>Source</TableHead>
                <TableHead className='text-right'>Bets</TableHead>
                <TableHead className='text-right'>Wins</TableHead>
                <TableHead className='text-right'>Losses</TableHead>
                <TableHead className='text-right'>Push</TableHead>
                <TableHead className='text-right'>Refunds</TableHead>
                <TableHead className='text-right'>Wagered</TableHead>
                <TableHead className='text-right'>Payouts</TableHead>
                <TableHead className='text-right'>Refunded</TableHead>
                <TableHead className='pr-4 text-right'>GGR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(bySource ?? {}).map(([k, v]) => (
                <TotalsRow key={k} label={k} t={v} currency={currency} />
              ))}
              {t && <TotalsRow label='Total' t={t} currency={currency} />}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

const AnalyticsTab = ({ channel }: { channel: Channel }) => {
  const q = useApi<Record<string, unknown>>('admin/casino/bet-history/analytics', { channel })

  if (q.error) return <ErrorState error={q.error} />

  const { totals, bySource, today, topUsers } = (q.data ?? {}) as {
    totals?: CasinoTotals
    bySource?: Record<string, CasinoTotals>
    today?: CasinoTotals | null
    topUsers?: { userId: string; userName: string | null; bets: number; wagered: string }[]
  }

  return (
    <div className='grid gap-4'>
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatCard label='All-time bets' value={formatNumber(totals?.bets)} loading={q.isLoading} />
        <StatCard label='Wagered' value={<Money value={totals?.wagered} />} loading={q.isLoading} />
        <StatCard label='Paid out' value={<Money value={totals?.payouts} />} loading={q.isLoading} />
        <StatCard label='GGR' value={<Money value={totals ? String(-Number(totals.net)) : undefined} signed />} loading={q.isLoading} />
      </div>
      {bySource && (
        <Card className='gap-0 overflow-hidden py-0 shadow-none'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='pl-4'>Source</TableHead>
                <TableHead className='text-right'>Bets</TableHead>
                <TableHead className='text-right'>Wins</TableHead>
                <TableHead className='text-right'>Losses</TableHead>
                <TableHead className='text-right'>Push</TableHead>
                <TableHead className='text-right'>Refunds</TableHead>
                <TableHead className='text-right'>Wagered</TableHead>
                <TableHead className='text-right'>Payouts</TableHead>
                <TableHead className='text-right'>Refunded</TableHead>
                <TableHead className='pr-4 text-right'>GGR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(bySource).map(([k, v]) => (
                <TotalsRow key={k} label={k} t={v} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <StatCard label='Bets today' value={formatNumber(today?.bets ?? 0)} loading={q.isLoading} />
        <StatCard label='Wagered today' value={<Money value={today?.wagered ?? '0'} />} loading={q.isLoading} />
        <StatCard label='Paid out today' value={<Money value={today?.payouts ?? '0'} />} loading={q.isLoading} />
        <StatCard label='GGR today' value={<Money value={String(-Number(today?.net ?? 0))} signed />} loading={q.isLoading} />
      </div>
      <Card className='shadow-none'>
        <CardHeader>
          <CardTitle className='text-base'>Busiest players</CardTitle>
        </CardHeader>
        <CardContent>
          {topUsers?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className='text-right'>Bets</TableHead>
                  <TableHead className='text-right'>Wagered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map(u => (
                  <TableRow key={u.userId}>
                    <TableCell>{u.userName ?? `#${u.userId}`}</TableCell>
                    <TableCell className='text-right'>{formatNumber(u.bets)}</TableCell>
                    <TableCell className='text-right'><Money value={u.wagered} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className='text-muted-foreground text-sm'>No casino bets yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const rawColumns: Column<RawTxn>[] = [
  { key: 'at', header: 'When', cell: r => <DateTime value={r.at} /> },
  {
    key: 'user',
    header: 'User',
    cell: r => (
      <div>
        <div>{r.user ?? '—'}</div>
        <div className='text-muted-foreground font-mono text-xs'>#{r.userId}</div>
      </div>
    )
  },
  { key: 'type', header: 'Type', cell: r => <Badge variant='outline'>{r.type ?? '—'}</Badge> },
  { key: 'amount', header: 'Amount', align: 'right', cell: r => <Money value={r.amount} /> },
  { key: 'status', header: 'Status', cell: r => <StatusBadge value={r.status} /> },
  { key: 'id', header: 'Id', cell: r => <span className='font-mono text-xs'>{r.id}</span> }
]

const RawTab = ({ path, channel }: { path: string; channel: Channel }) => {
  const { state, set } = useListState(['userId', 'from', 'to'])
  const list = usePageList<RawTxn>(path, { limit: state.limit, page: state.page, userId: state.userId || undefined, from: state.from || undefined, to: state.to || undefined, channel })

  return (
    <DataTable
      columns={rawColumns}
      rows={list.data?.rows}
      rowKey={r => r.id}
      loading={list.isLoading}
      fetching={list.isFetching}
      error={list.error}
      pagination={list.data?.pagination}
      onPageChange={page => set({ page })}
      onLimitChange={limit => set({ limit })}
      dense
      toolbar={
        <>
          <Input placeholder='User id' className='w-28' value={String(state.userId ?? '')} onChange={e => set({ userId: e.target.value })} />
          <DateRange state={state} set={set} />
        </>
      }
    />
  )
}

const RawTablesTab = ({ channel }: { channel: Channel }) => {
  const [table, setTable] = useState<'live' | 'slot'>('live')

  return (
    <div className='grid gap-4'>
      <Select value={table} onValueChange={v => v && setTable(v as 'live' | 'slot')}>
        <SelectTrigger className='w-56'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='live'>transaction_live</SelectItem>
          <SelectItem value='slot'>transaction_slot</SelectItem>
        </SelectContent>
      </Select>
      <RawTab path={`admin/casino/bet-history/transactions/raw/${table}`} channel={channel} />
    </div>
  )
}

const BetHistory = () => {
  const { actor } = useSession()

  // A super admin (level 1) sees every user on the site; everyone below sees their own tree.
  const scope = actor?.level === 1 ? 'for every user on the site' : 'scoped to the users under your staff tree'

  return (
    <div>
      <PageHeader title='Casino bet history' description={`Every casino movement across Originals, the aggregator and JS games, ${scope}.`} />
      {/* Direct Users / Agent Users: har tab ki listing aur numbers us taraf ke players ke. */}
      <ChannelTabs>
        {channel => (
      <Tabs defaultValue='txns'>
        <TabsList className='mb-4 flex-wrap'>
          <TabsTrigger value='txns'>Transactions</TabsTrigger>
          <TabsTrigger value='stats'>Stats</TabsTrigger>
          <TabsTrigger value='analytics'>Analytics</TabsTrigger>
          <TabsTrigger value='raw'>Raw provider tables</TabsTrigger>
        </TabsList>
        <TabsContent value='txns'>
          <TransactionsTab channel={channel} />
        </TabsContent>
        <TabsContent value='stats'>
          <StatsTab channel={channel} />
        </TabsContent>
        <TabsContent value='analytics'>
          <AnalyticsTab channel={channel} />
        </TabsContent>
        <TabsContent value='raw'>
          <RawTablesTab channel={channel} />
        </TabsContent>
      </Tabs>
        )}
      </ChannelTabs>
    </div>
  )
}

export default BetHistory
