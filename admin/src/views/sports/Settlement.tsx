'use client'

import { useMemo, useState } from 'react'

import { AlertTriangleIcon, GavelIcon, UndoIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import FormDialog from '@/components/shared/FormDialog'
import { TextField } from '@/components/shared/FormField'
import Money from '@/components/shared/Money'
import PageHeader from '@/components/shared/PageHeader'
import StatusBadge from '@/components/shared/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi, useApiMutation, useListState } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { TxnPasswordLabel } from '@/views/finance/StaffFloat'
import { GAME_TYPE_LABELS, type SettledMarket, type SettlementMatch, type SportsBet } from './types'

/**
 * Settlement moves money, so every screen here is deliberate: declaring a
 * result pays a market out, voiding returns stakes, and reversing an
 * ALREADY-PAID settlement needs the transaction password on top.
 *
 * These are the sports service's manual-settle routes (mssports
 * `/api/internalsettle`), mounted at `admin/sports/internalsettle`. The
 * service checks them itself: owner (Super Admin) only.
 */
const BASE = 'admin/sports/internalsettle'

// Query keys the writes below refresh.
const MO_KEY = ['api', `${BASE}/momatches`]
const FAN_KEY = ['api', `${BASE}/fanmatches`]
const SETTLED_KEY = ['api', `${BASE}/settled-markets`]
const OPEN_KEY = ['api', `${BASE}/open-bets`]

const field = (row: Record<string, unknown>, ...names: string[]) => {
  for (const n of names) {
    const v = row[n]

    if (v !== undefined && v !== null && v !== '') return String(v)
  }

  return ''
}

/** Runner names from the bet's runner list (strings or `{ runnerName | name | selectionName }`). */
const runnerNames = (row: SettlementMatch): string[] => {
  const raw: unknown[] = Array.isArray(row.runners) ? row.runners : []

  return raw
    .map(r => (typeof r === 'string' ? r : r && typeof r === 'object' ? field(r as Record<string, unknown>, 'runnerName', 'name', 'selectionName', 'runner') : ''))
    .filter(Boolean)
}

const DeclareResult = ({ row }: { row: SettlementMatch }) => {
  const gameType = field(row, 'gameType', 'game_type') || 'MO'

  const [form, setForm] = useState({
    eventid: field(row, 'eventId', 'eventid'),
    match_id: field(row, 'matchId', 'match_id'),
    match_title: field(row, 'matchTitle', 'match_title'),
    game_type: gameType,
    market_type: field(row, 'marketType', 'market_type'),
    winnerName: '',
    winnerId: '',

    // A fancy session is declared by its own name (the bet's selection).
    fancyName: gameType === 'FAN' ? field(row, 'selectionName') : ''
  })

  const runners = runnerNames(row)

  const declare = useApiMutation({
    fn: () => {
      const body: Record<string, string> = {
        eventid: form.eventid,
        match_id: form.match_id,
        match_title: form.match_title,
        game_type: form.game_type,
        market_type: form.market_type
      }

      if (form.winnerName) body.winnerName = form.winnerName
      if (form.winnerId) body.winnerId = form.winnerId
      if (form.fancyName) body.fancyName = form.fancyName

      return api.post(`${BASE}/declareresult`, body)
    },
    invalidate: [MO_KEY, FAN_KEY, SETTLED_KEY],
    success: 'Result declared — the settlement worker is paying the market out'
  })

  return (
    <FormDialog
      trigger={
        <Button size='sm'>
          <GavelIcon /> Declare
        </Button>
      }
      title='Declare the result'
      description='Every open bet on this market is settled and the winners are paid. Check the winner before confirming.'
      submitLabel='Settle market'
      onSubmit={() => declare.mutateAsync()}
      wide
    >
      <div className='grid grid-cols-2 gap-4'>
        <TextField id='d-match' label='Match id' required value={form.match_id} onChange={e => setForm({ ...form, match_id: e.target.value })} />
        <TextField id='d-event' label='Event id' required value={form.eventid} onChange={e => setForm({ ...form, eventid: e.target.value })} />
      </div>
      <TextField id='d-title' label='Match title' required value={form.match_title} onChange={e => setForm({ ...form, match_title: e.target.value })} />
      <div className='grid grid-cols-2 gap-4'>
        <TextField id='d-game' label='Game type' required hint='MO, BM or FAN' value={form.game_type} onChange={e => setForm({ ...form, game_type: e.target.value })} />
        <TextField id='d-market' label='Market type' required value={form.market_type} onChange={e => setForm({ ...form, market_type: e.target.value })} />
      </div>
      <TextField
        id='d-winner'
        label='Winner name'
        hint={
          runners.length
            ? `The selection that won — one of: ${runners.join(', ')}. Required for match odds, bookmaker, fancy1 and odd/even.`
            : 'The selection that won. Required for match odds, bookmaker, fancy1 and odd/even; for a line/session fancy give the winning number instead.'
        }
        value={form.winnerName}
        onChange={e => setForm({ ...form, winnerName: e.target.value })}
      />
      <div className='grid grid-cols-2 gap-4'>
        <TextField id='d-wid' label='Winner id / run total' hint='Fancy sessions and line markets: the final number.' value={form.winnerId} onChange={e => setForm({ ...form, winnerId: e.target.value })} />
        <TextField id='d-fancy' label='Fancy name' hint='Fancy markets: the session being declared.' value={form.fancyName} onChange={e => setForm({ ...form, fancyName: e.target.value })} />
      </div>
    </FormDialog>
  )
}

const VoidMarket = ({ row }: { row: SettlementMatch }) => {
  const [form, setForm] = useState({
    eventid: field(row, 'eventId', 'eventid'),
    match_id: field(row, 'matchId', 'match_id'),
    market_type: field(row, 'marketType', 'market_type'),
    gametype: field(row, 'gameType', 'game_type') || 'MO',
    selection_name: field(row, 'selectionName')
  })

  const voidIt = useApiMutation({
    fn: () =>
      api.post(`${BASE}/void`, {
        eventid: form.eventid,
        match_id: form.match_id,
        market_type: form.market_type,
        gametype: form.gametype,
        ...(form.selection_name ? { selection_name: form.selection_name } : {})
      }),
    invalidate: [MO_KEY, FAN_KEY, OPEN_KEY],
    success: 'Market voided — stakes returned'
  })

  return (
    <FormDialog
      trigger={
        <Button size='sm' variant='outline'>
          <UndoIcon /> Void
        </Button>
      }
      title='Void this market'
      description='Every open bet on this market (or only on the named selection) is cancelled and its stake returned.'
      submitLabel='Void market'
      destructive
      onSubmit={() => voidIt.mutateAsync()}
    >
      <div className='grid grid-cols-2 gap-4'>
        <TextField id='v-match' label='Match id' required value={form.match_id} onChange={e => setForm({ ...form, match_id: e.target.value })} />
        <TextField id='v-event' label='Event id' required value={form.eventid} onChange={e => setForm({ ...form, eventid: e.target.value })} />
      </div>
      <TextField id='v-market' label='Market type' required value={form.market_type} onChange={e => setForm({ ...form, market_type: e.target.value })} />
      <TextField id='v-game' label='Game type' required value={form.gametype} onChange={e => setForm({ ...form, gametype: e.target.value })} />
      <TextField id='v-sel' label='Selection name' hint='Leave blank to void the whole market. A fancy session is voided by its own name.' value={form.selection_name} onChange={e => setForm({ ...form, selection_name: e.target.value })} />
    </FormDialog>
  )
}

const pendingColumns = (fancy: boolean): Column<SettlementMatch>[] => [
  {
    key: 'match',
    header: 'Match',
    cell: r => (
      <span className='block max-w-96'>
        <span className='block truncate font-medium'>{field(r, 'matchTitle', 'match_title') || field(r, 'matchId', 'match_id')}</span>
        <span className='text-muted-foreground block truncate font-mono text-xs'>
          {field(r, 'matchId', 'match_id')} · event {field(r, 'eventId', 'eventid') || '—'}
        </span>
      </span>
    )
  },
  {
    key: 'market',
    header: 'Market',
    cell: r => (
      <span className='block max-w-72'>
        <span className='block truncate text-sm'>{field(r, 'marketType', 'market_type') || '—'}</span>
        {fancy && field(r, 'selectionName') && <span className='text-muted-foreground block truncate text-xs'>{field(r, 'selectionName')}</span>}
      </span>
    )
  },
  { key: 'type', header: 'Type', cell: r => <Badge variant='outline'>{GAME_TYPE_LABELS[field(r, 'gameType', 'game_type')] ?? (field(r, 'gameType', 'game_type') || '—')}</Badge> },
  { key: 'open', header: 'Open bets', align: 'right', cell: r => <span className='tabular-nums'>{field(r, 'totalBets', 'openBets') || '—'}</span> },
  {
    key: 'actions',
    header: '',
    align: 'right',
    cell: r => (
      <Can permission='sports:settle'>
        <span className='flex justify-end gap-1'>
          <DeclareResult row={r} />
          <VoidMarket row={r} />
        </span>
      </Can>
    )
  }
]

/** Match odds & bookmaker markets with open bets (`GET internalsettle/momatches` → a flat list). */
const PendingMo = () => {
  const list = useApi<SettlementMatch[]>(`${BASE}/momatches`, { limit: 500 })

  return (
    <DataTable
      columns={pendingColumns(false)}
      rows={list.data}
      rowKey={(r, i) => `${field(r, 'matchId')}-${field(r, 'marketType')}-${field(r, 'gameType')}-${i}`}
      loading={list.isLoading}
      fetching={list.isFetching}
      error={list.error}
      emptyMessage='No match odds or bookmaker market is waiting to be settled.'
    />
  )
}

/**
 * Fancy sessions with open bets. `GET internalsettle/fanmatches` answers
 * `{ [marketType | 'others']: group[] }` — flattened here into one list.
 */
const PendingFancy = () => {
  const list = useApi<Record<string, SettlementMatch[]>>(`${BASE}/fanmatches`)
  const rows = useMemo(() => (list.data ? Object.values(list.data).filter(Array.isArray).flat() : undefined), [list.data])

  return (
    <DataTable
      columns={pendingColumns(true)}
      rows={rows}
      rowKey={(r, i) => `${field(r, 'matchId')}-${field(r, 'marketType')}-${field(r, 'selectionName')}-${i}`}
      loading={list.isLoading}
      fetching={list.isFetching}
      error={list.error}
      emptyMessage='No fancy session is waiting to be settled.'
    />
  )
}

/** A settled market's reversal — the sports service also wants the transaction password. */
const ReverseSettlement = ({ row }: { row: SettledMarket }) => {
  const [password, setPassword] = useState('')

  const reverse = useApiMutation({
    fn: () =>
      api.post(`${BASE}/void-market-after-settlement`, {
        match_id: field(row, 'matchId', 'match_id'),
        market_type: field(row, 'marketType', 'market_type'),
        transactionPassword: password
      }),
    invalidate: [SETTLED_KEY],
    success: 'Settlement reversed — payouts clawed back',
    onSuccess: () => setPassword('')
  })

  return (
    <FormDialog
      trigger={
        <Button size='sm' variant='destructive'>
          <UndoIcon /> Reverse
        </Button>
      }
      title='Reverse this settlement?'
      description='Winners already have this money. Reversing takes it back and can put an account into negative balance. This is the largest power on the sportsbook.'
      submitLabel='Reverse settlement'
      destructive
      onSubmit={() => reverse.mutateAsync()}
    >
      <p className='text-sm'>
        <span className='font-medium'>{field(row, 'matchTitle') || field(row, 'matchId')}</span>
        <span className='text-muted-foreground'> · {field(row, 'marketType') || 'every market'}</span>
      </p>
      <TextField id='rv-pw' label={<TxnPasswordLabel />} type='password' autoComplete='current-password' required value={password} onChange={e => setPassword(e.target.value)} />
    </FormDialog>
  )
}

/** Markets settled inside the service's void window (`GET internalsettle/settled-markets`, last 24 h). */
const Settled = () => {
  const { state, set, query } = useListState()
  const list = useApi<SettledMarket[]>(`${BASE}/settled-markets`, { limit: 500, search: query.search })

  const columns: Column<SettledMarket>[] = [
    {
      key: 'match',
      header: 'Match',
      cell: r => (
        <span className='block max-w-96'>
          <span className='block truncate font-medium'>{field(r, 'matchTitle', 'match_title') || field(r, 'matchId', 'match_id')}</span>
          <span className='text-muted-foreground block truncate font-mono text-xs'>{field(r, 'matchId', 'match_id')}</span>
        </span>
      )
    },
    { key: 'market', header: 'Market', cell: r => field(r, 'marketType', 'market_type') || '—' },
    { key: 'users', header: 'Users', align: 'right', cell: r => <span className='tabular-nums'>{field(r, 'totalUsers') || '—'}</span> },
    { key: 'entries', header: 'Entries', align: 'right', cell: r => <span className='tabular-nums'>{field(r, 'totalEntries') || '—'}</span> },
    { key: 'net', header: 'Net to users', align: 'right', cell: r => <Money value={field(r, 'totalNetAmount') || null} signed /> },
    { key: 'at', header: 'Settled', cell: r => <DateTime value={field(r, 'settledAt', 'settled_at') || undefined} relative /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: r => (
        <Can permission='sports:void-settled'>
          <ReverseSettlement row={r} />
        </Can>
      )
    }
  ]

  return (
    <div className='grid gap-4'>
      <Alert>
        <AlertTriangleIcon />
        <AlertTitle>Reversing a settlement is not the same as voiding a market</AlertTitle>
        <AlertDescription>
          Voiding cancels open bets. Reversing claws back money already paid: it needs the <code>sports:void-settled</code> grant and your password, and is only possible for
          markets settled in the last 24 hours.
        </AlertDescription>
      </Alert>
      <DataTable
        columns={columns}
        rows={list.data}
        rowKey={(r, i) => `${field(r, 'matchId', 'match_id')}-${field(r, 'marketType', 'market_type')}-${i}`}
        loading={list.isLoading}
        fetching={list.isFetching}
        error={list.error}
        search={String(state.search ?? '')}
        onSearchChange={search => set({ search })}
        searchPlaceholder='Match, market or team…'
        emptyMessage='No market was settled in the last 24 hours.'
      />
    </div>
  )
}

const OpenBets = () => {
  const [q, setQ] = useState({ match_id: '', market_type: '' })
  const ready = Boolean(q.match_id.trim() && q.market_type.trim())
  const list = useApi<SportsBet[]>(ready ? `${BASE}/open-bets` : null, { match_id: q.match_id.trim(), market_type: q.market_type.trim() })

  const voidBet = useApiMutation({
    fn: (bet_id: number) => api.post(`${BASE}/void-single-bet`, { bet_id }),
    invalidate: [OPEN_KEY, MO_KEY, FAN_KEY],
    success: 'Bet voided — stake returned'
  })

  const columns: Column<SportsBet>[] = [
    { key: 'id', header: 'Bet', cell: b => <span className='font-mono text-xs'>#{b.id}</span> },
    { key: 'user', header: 'User', cell: b => b.username ?? `#${b.userId ?? '—'}` },
    { key: 'sel', header: 'Selection', cell: b => String(b.selectionName ?? '—') },
    { key: 'side', header: 'Side', cell: b => <span className='text-sm uppercase'>{field(b, 'betType') || '—'}</span> },
    { key: 'odds', header: 'Odds', align: 'right', cell: b => <span className='font-mono tabular-nums'>{String(b.odds ?? '—')}</span> },
    { key: 'stake', header: 'Stake', align: 'right', cell: b => <Money value={field(b, 'stakeAmount', 'stake') || null} /> },
    { key: 'liability', header: 'Liability', align: 'right', cell: b => <Money value={field(b, 'liability') || null} /> },
    { key: 'status', header: 'Status', cell: b => <StatusBadge value={b.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: b => (
        <Can permission='sports:settle'>
          <ConfirmDialog
            trigger={
              <Button size='sm' variant='outline'>
                Void
              </Button>
            }
            title={`Void bet #${b.id}?`}
            description='The stake is returned to the user and the bet is removed from the market’s liability.'
            confirmLabel='Void bet'
            destructive
            onConfirm={() => voidBet.mutateAsync(b.id)}
          />
        </Can>
      )
    }
  ]

  return (
    <div className='grid gap-4'>
      <div className='flex flex-wrap items-end gap-2'>
        <TextField id='ob-match' label='Match id' value={q.match_id} onChange={e => setQ({ ...q, match_id: e.target.value })} />
        <TextField id='ob-market' label='Market type' value={q.market_type} onChange={e => setQ({ ...q, market_type: e.target.value })} />
      </div>
      {ready ? (
        <DataTable columns={columns} rows={list.data} rowKey={b => b.id} loading={list.isLoading} fetching={list.isFetching} error={list.error} dense emptyMessage='No open bet on that market.' />
      ) : (
        <p className='text-muted-foreground text-sm'>Name a match and a market (as listed in the other tabs) to see the bets still open on it.</p>
      )}
    </div>
  )
}

/** `defaultTab`: Sports Exchange > Settlement opens Match (mo), Fancy (fancy) or Void bets (open). */
const Settlement = ({ defaultTab = 'mo' }: { defaultTab?: 'mo' | 'fancy' | 'open' | 'settled' }) => (
  <div>
    <PageHeader title='Sports settlement' description='Markets waiting for a result, the bets open on them, and what has already been settled.' />
    <Tabs defaultValue={defaultTab}>
      <TabsList className='mb-4 flex-wrap'>
        <TabsTrigger value='mo'>Match odds &amp; bookmaker</TabsTrigger>
        <TabsTrigger value='fancy'>Fancy</TabsTrigger>
        <TabsTrigger value='open'>Open bets</TabsTrigger>
        <TabsTrigger value='settled'>Settled</TabsTrigger>
      </TabsList>
      <TabsContent value='mo'>
        <PendingMo />
      </TabsContent>
      <TabsContent value='fancy'>
        <PendingFancy />
      </TabsContent>
      <TabsContent value='open'>
        <OpenBets />
      </TabsContent>
      <TabsContent value='settled'>
        <Settled />
      </TabsContent>
    </Tabs>
  </div>
)

export default Settlement
