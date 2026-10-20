'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import { BanIcon, FlagIcon, ListOrderedIcon, Loader2Icon, PlusIcon, RotateCcwIcon, SaveIcon, Trash2Icon, TrophyIcon } from 'lucide-react'

import Can from '@/components/shared/Can'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import DataTable, { type Column } from '@/components/shared/DataTable'
import DateTime from '@/components/shared/DateTime'
import ErrorState from '@/components/shared/ErrorState'
import FormDialog from '@/components/shared/FormDialog'
import { SwitchField, TextAreaField, TextField } from '@/components/shared/FormField'
import Money from '@/components/shared/Money'
import ChannelTabs, { type Channel } from '@/components/shared/ChannelTabs'
import PageHeader from '@/components/shared/PageHeader'
import { RewardCurrencyNotice } from '@/components/shared/RewardCurrency'
import StatusBadge from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi, useApiMutation, useListState, usePagedApi } from '@/hooks/use-api'
import { api } from '@/lib/api/client'
import { check, cleanErrors, firstError } from '@/lib/validate'

/**
 * Wagering races (stake fork). A config per type decides the points a bet earns
 * per product, the pool and how it splits across ranks; a race is one window of
 * that config. Settling a race pays its rewards, so it is a confirm.
 */
type RaceType = 'daily' | 'weekly'

type RaceConfig = {
  type: RaceType
  enabled: boolean
  sportsPoints: number | string
  casinoPoints: number | string
  slotPoints: number | string
  crashPoints: number | string
  otherPoints: number | string
  prizePool: string
  currency?: string
  platformFeePercent: number | string
  winnerCount: number
  top3Percentage: number | string
  minPoints: string
  bookedSeatsEnabled: boolean
  bookedSeats?: number[]

  /** The ladder that pays (USD, stored); `ladder` says whether it is the operator's own or the computed curve. */
  rankPrizes?: { rank: number; percentage: number; amount?: string }[]
  ladder?: 'custom' | 'curve'

  /** How the backend answers the points per product (the form edits them as `<bucket>Points`). */
  multipliers?: Partial<Record<'sports' | 'casino' | 'slot' | 'crash' | 'other', string>>
}

/** GET user/race (public): the same configs with the pool and ladder in the reward currency. */
type PublicRace = { type: RaceType; payout?: { currency: string; prizePool: string; netPrizePool: string; ranks: { rank: number; amount: string }[] } }

type BoardRow = { rank: number; userId: string | null; name: string | null; points: string; usdWagered: string; bets: number; isBoat: boolean; reward: string; payout?: string }
type Board = { raceId: number; startsAt: string; endsAt: string; winnerCount: number; payoutCurrency?: string; currency: string; leaderboard: BoardRow[] }

type Race = { id: number; type: RaceType; status?: string; startsAt?: string; endsAt?: string; starts_at?: string; ends_at?: string; participants?: number; prizePool?: string; settledAt?: string | null; totalAwarded?: string; winnerCount?: number; cancelReason?: string | null }
type Reward = { id: number; raceId?: number; userId?: number | string; username?: string; rank?: number; points?: string; amount?: string; currency?: string; claimed?: boolean; createdAt?: string }
type Boat = { id: number; name: string; isActive?: boolean }

/** Bounds from race.validators.js `updateConfig` (MAX_WINNERS = 500). */
const FIELD_RULE: Partial<Record<keyof RaceConfig, (v: unknown, label: string) => string | undefined>> = {
  sportsPoints: (v, l) => check.number(v as string, l, { min: 0, max: 1000 }),
  casinoPoints: (v, l) => check.number(v as string, l, { min: 0, max: 1000 }),
  slotPoints: (v, l) => check.number(v as string, l, { min: 0, max: 1000 }),
  crashPoints: (v, l) => check.number(v as string, l, { min: 0, max: 1000 }),
  otherPoints: (v, l) => check.number(v as string, l, { min: 0, max: 1000 }),
  prizePool: (v, l) => check.number(v as string, l, { min: 0, decimals: 8 }),
  platformFeePercent: (v, l) => check.number(v as string, l, { min: 0, max: 100 }),
  winnerCount: (v, l) => check.number(v as string, l, { integer: true, min: 1, max: 500 }),
  top3Percentage: (v, l) => check.number(v as string, l, { min: 0, max: 100 }),
  minPoints: (v, l) => check.number(v as string, l, { min: 0, decimals: 8 })
}

const NUMERIC_FIELDS: { key: keyof RaceConfig; label: string; hint?: string }[] = [
  { key: 'sportsPoints', label: 'Sports points / USD' },
  { key: 'casinoPoints', label: 'Casino points / USD' },
  { key: 'slotPoints', label: 'Slot points / USD' },
  { key: 'crashPoints', label: 'Crash points / USD' },
  { key: 'otherPoints', label: 'Other points / USD', hint: 'Roulette, table games and anything unclassified. Zero here means a third of turnover scores nothing.' },
  { key: 'prizePool', label: 'Prize pool (USD)', hint: 'Gross, in USD. The platform fee comes off before ranks are paid; prizes are paid in the reward currency at the rate of the day.' },
  { key: 'platformFeePercent', label: 'Platform fee %' },
  { key: 'winnerCount', label: 'Ranks paid' },
  { key: 'top3Percentage', label: 'Top-3 share %' },
  { key: 'minPoints', label: 'Minimum points to place' }
]

/** The operator's own ladder: one % of the net pool per rank, rank 1 first (blank lines ignored). */
const parseShares = (text: string) =>
  text
    .split(/[\n,]+/)
    .map(v => v.trim().replace(/%$/, ''))
    .filter(Boolean)
    .map(Number)

const LadderDialog = ({ type, current }: { type: RaceType; current: RaceConfig }) => {
  const [text, setText] = useState('')
  const shares = parseShares(text)
  const total = shares.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)

  const save = useApiMutation({
    fn: () => api.put(`admin/user/race/config/${type}`, { rankShares: shares }),
    invalidate: [['api', `admin/user/race/config/${type}`], ['api', 'user/race']],
    success: 'Payout ladder saved'
  })

  return (
    <FormDialog
      trigger={
        <Button variant='outline' size='sm' onClick={() => setText((current.rankPrizes ?? []).map(r => r.percentage).join('\n'))}>
          <ListOrderedIcon /> Edit ladder
        </Button>
      }
      title={`${type[0].toUpperCase() + type.slice(1)} race — payout ladder`}
      description='One line per paid rank, rank 1 first: its share of the net pool in %. The shares must add up to 100 and never rise down the ladder. The number of lines becomes the ranks paid.'
      submitLabel='Save ladder'
      onSubmit={() => save.mutateAsync()}
      validate={() => {
        if (!shares.length) return { ladder: 'Enter at least one rank share' }
        if (shares.length > 500) return { ladder: 'At most 500 ranks can be paid' }
        const bad = shares.findIndex(v => !Number.isFinite(v) || v <= 0 || v > 100)

        if (bad >= 0) return { ladder: `Rank ${bad + 1}: share must be a number above 0 and at most 100` }
        const rising = shares.findIndex((v, i) => i > 0 && v > shares[i - 1])

        if (rising >= 0) return { ladder: `Rank ${rising + 1} pays more than rank ${rising} — shares must never rise down the ladder` }
        if (Math.abs(total - 100) > 0.01) return { ladder: `Shares add up to ${total.toFixed(2)}% — they must total 100%` }

        return null
      }}
    >
      <TextAreaField id='ladder' label='Shares (%)' rows={10} value={text} onChange={e => setText(e.target.value)} />
      <p className={`text-sm ${Math.abs(total - 100) <= 0.01 ? 'text-muted-foreground' : 'text-destructive'}`}>
        {shares.length} ranks · total {total.toFixed(2)}%
      </p>
    </FormDialog>
  )
}

const ConfigEditor = ({ type }: { type: RaceType }) => {
  const q = useApi<RaceConfig>(`admin/user/race/config/${type}`, undefined, { retry: false })
  const pub = useApi<PublicRace[]>('user/race', undefined, { retry: false })
  const payout = pub.data?.find(r => r.type === type)?.payout
  const [draft, setDraft] = useState<Partial<RaceConfig>>({})

  // The booked ranks as typed ("3, 7"); null = show the saved list.
  const [seatsText, setSeatsText] = useState<string | null>(null)

  const reset = useApiMutation({
    fn: () => api.put(`admin/user/race/config/${type}`, { resetLadder: true }),
    invalidate: [['api', `admin/user/race/config/${type}`], ['api', 'user/race']],
    success: 'Back to the computed curve'
  })


  const save = useApiMutation({
    fn: () => api.put(`admin/user/race/config/${type}`, draft),
    invalidate: [['api', `admin/user/race/config/${type}`], ['api', 'user/race']],
    success: `${type} race configuration saved`,
    onSuccess: () => {
      setDraft({})
      setSeatsText(null)
    }
  })

  if (q.error) return <ErrorState error={q.error} />
  if (q.isLoading || !q.data) return <Skeleton className='h-96' />

  // The read carries the points as `multipliers`; the save takes `<bucket>Points`.
  const m = q.data.multipliers ?? {}

  const c = {
    ...q.data,
    sportsPoints: q.data.sportsPoints ?? m.sports,
    casinoPoints: q.data.casinoPoints ?? m.casino,
    slotPoints: q.data.slotPoints ?? m.slot,
    crashPoints: q.data.crashPoints ?? m.crash,
    otherPoints: q.data.otherPoints ?? m.other,
    ...draft
  }

  const dirty = Object.keys(draft).length

  const errors = cleanErrors(
    Object.fromEntries(NUMERIC_FIELDS.filter(f => f.key in draft).map(f => [`r-${String(f.key)}`, FIELD_RULE[f.key]?.(draft[f.key], f.label)]))
  )

  if (draft.bookedSeats?.some(r => !Number.isInteger(r) || r < 1 || r > Number(c.winnerCount))) {
    errors['r-seats-ranks'] = `Booked ranks must be whole ranks from 1 to ${c.winnerCount}`
  }

  const submit = () => {
    const problem = firstError(errors)

    if (problem) return void toast.error(problem)
    save.mutate()
  }

  return (
    <div className='grid gap-4 lg:grid-cols-3'>
      <Card className='shadow-none lg:col-span-2'>
        <CardHeader>
          <CardTitle className='flex items-center gap-3 text-base'>
            {type[0].toUpperCase() + type.slice(1)} race
            <StatusBadge value={c.enabled ? 'enabled' : 'disabled'} />
          </CardTitle>
          <CardDescription>A race that pays real money starts switched off. Turn it on deliberately.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3'>
          <SwitchField id='r-enabled' label='Race is running' checked={!!c.enabled} onChange={enabled => setDraft(d => ({ ...d, enabled }))} />
          <div className='grid gap-3 sm:grid-cols-2'>
            {NUMERIC_FIELDS.map(f => (
              <TextField
                key={String(f.key)}
                id={`r-${String(f.key)}`}
                label={f.label}
                hint={f.hint}
                error={errors[`r-${String(f.key)}`]}
                value={String(c[f.key] ?? '')}
                onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
              />
            ))}
          </div>
          <SwitchField
            id='r-seats'
            label='Booked seats'
            hint='Decorative entries shown on the board alongside real users.'
            checked={!!c.bookedSeatsEnabled}
            onChange={bookedSeatsEnabled => setDraft(d => ({ ...d, bookedSeatsEnabled }))}
          />
          {c.bookedSeatsEnabled ? (
            <TextField
              id='r-seats-ranks'
              label='Booked ranks'
              hint='The ranks a decorative entry takes, e.g. 2, 5, 8. Only ranks up to "Ranks paid" are kept.'
              error={errors['r-seats-ranks']}
              value={seatsText ?? (c.bookedSeats ?? []).join(', ')}
              onChange={e => {
                setSeatsText(e.target.value)
                setDraft(d => ({ ...d, bookedSeats: parseShares(e.target.value) }))
              }}
            />
          ) : null}
          <Can permission='config:write'>
            <Button onClick={submit} disabled={!dirty || save.isPending} className='justify-self-start'>
              {save.isPending ? <Loader2Icon className='animate-spin' /> : <SaveIcon />} Save {dirty ? `(${dirty})` : ''}
            </Button>
          </Can>
        </CardContent>
      </Card>
      <Card className='shadow-none'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-base'>
            Payout ladder <Badge variant='secondary'>{q.data.ladder === 'custom' ? 'Custom' : 'Curve'}</Badge>
          </CardTitle>
          <CardDescription>
            This is the table that pays. {q.data.ladder === 'custom' ? 'Your own shares, re-priced when the pool changes.' : 'Computed from the pool, ranks paid and top-3 share when saved.'}
            {payout ? ` Paid in ${payout.currency}.` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-1 text-sm'>
          {payout ? (
            <div className='mb-2 flex justify-between font-medium'>
              <span>Net pool</span>
              <Money value={payout.netPrizePool} currency={payout.currency} />
            </div>
          ) : null}
          {(q.data.rankPrizes ?? []).length ? (
            q.data.rankPrizes!.map(r => {
              const paid = payout?.ranks.find(x => x.rank === r.rank)

              return (
                <div key={r.rank} className='flex justify-between'>
                  <span className='text-muted-foreground'>Rank {r.rank}</span>
                  <span className='tabular-nums'>
                    {r.percentage}% {paid ? <Money value={paid.amount} currency={payout!.currency} className='ml-2' /> : r.amount ? <Money value={r.amount} currency='USD' className='ml-2' /> : null}
                  </span>
                </div>
              )
            })
          ) : (
            <p className='text-muted-foreground'>No ladder yet. Save a pool and a rank count, or set your own ladder.</p>
          )}
          <Can permission='config:write'>
            <div className='mt-3 flex flex-wrap gap-2'>
              <LadderDialog type={type} current={q.data} />
              {q.data.ladder === 'custom' ? (
                <ConfirmDialog
                  trigger={
                    <Button variant='ghost' size='sm'>
                      <RotateCcwIcon /> Use the curve
                    </Button>
                  }
                  title='Go back to the computed curve?'
                  description='Your own shares are replaced by the curve from the ranks paid and the top-3 share.'
                  confirmLabel='Use the curve'
                  onConfirm={() => reset.mutateAsync()}
                />
              ) : null}
            </div>
          </Can>
        </CardContent>
      </Card>
    </div>
  )
}

const RacesTab = () => {
  const { state, set, query } = useListState(['type'])
  const list = usePagedApi<Race>('admin/user/race/races', { limit: query.limit, page: query.page, type: query.type || undefined })

  const settle = useApiMutation({
    fn: (id: number) => api.post(`admin/user/race/races/${id}/settle`),
    invalidate: [['paged', 'admin/user/race/races'], ['paged', 'admin/user/race/rewards']],
    success: 'Race settled — rewards written'
  })

  const [reason, setReason] = useState('')

  const cancel = useApiMutation({
    fn: (id: number) => api.post(`admin/user/race/races/${id}/cancel`, reason.trim() ? { reason: reason.trim() } : {}),
    invalidate: [['paged', 'admin/user/race/races']],
    success: 'Race cancelled — no prizes written',
    onSuccess: () => setReason('')
  })

  const [winnersOf, setWinnersOf] = useState<number | null>(null)

  const columns: Column<Race>[] = [
    { key: 'id', header: 'Race', cell: r => <span className='font-mono text-xs'>#{r.id}</span> },
    { key: 'type', header: 'Type', cell: r => <Badge variant='secondary'>{r.type}</Badge> },
    { key: 'window', header: 'Window', cell: r => <span className='text-xs'><DateTime value={r.startsAt ?? r.starts_at} /> → <DateTime value={r.endsAt ?? r.ends_at} /></span> },

    // An open race takes its pool from the config at settlement; only a closed one has its own.
    { key: 'pool', header: 'Pool (USD)', align: 'right', cell: r => (r.status === 'open' ? <span className='text-muted-foreground text-xs'>From config</span> : <Money value={r.prizePool} />) },
    { key: 'awarded', header: 'Awarded (USD)', align: 'right', cell: r => (r.status === 'settled' ? <Money value={r.totalAwarded} /> : '—') },
    {
      key: 'status',
      header: 'Status',
      cell: r => (
        <span title={r.cancelReason ?? undefined}>
          <StatusBadge value={r.status ?? (r.settledAt ? 'settled' : 'open')} />
        </span>
      )
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: r =>
        r.status === 'settled' ? (
          <Button variant='ghost' size='sm' onClick={() => setWinnersOf(r.id)}>
            <TrophyIcon /> Winners
          </Button>
        ) : r.status === 'cancelled' ? null : (
          <Can permission='config:write'>
            <div className='flex justify-end gap-1'>
              <ConfirmDialog
                trigger={
                  <Button variant='outline' size='sm'>
                    <FlagIcon /> End & pay
                  </Button>
                }
                title={`End race #${r.id} now and pay it?`}
                description='Ranks are frozen now and rewards are written to the winners. The next race opens with the next window. This cannot be undone.'
                confirmLabel='End & pay'
                onConfirm={() => settle.mutateAsync(r.id)}
              />
              <FormDialog
                trigger={
                  <Button variant='ghost' size='sm'>
                    <BanIcon /> Cancel
                  </Button>
                }
                title={`Cancel race #${r.id}?`}
                description='The race closes with NO prizes. The next race opens with the next window; switch the race off first to stop races altogether.'
                submitLabel='Cancel race'
                destructive
                onSubmit={() => cancel.mutateAsync(r.id)}
                validate={() => ({ 'cancel-reason': check.length(reason, 'Reason', { max: 200 }) })}
              >
                <TextField id='cancel-reason' label='Reason (kept in the activity log)' maxLength={200} value={reason} onChange={e => setReason(e.target.value)} />
              </FormDialog>
            </div>
          </Can>
        )
    }
  ]

  return (
    <>
    {winnersOf !== null ? <WinnersDialog raceId={winnersOf} onClose={() => setWinnersOf(null)} /> : null}
    <DataTable
      columns={columns}
      rows={list.data?.rows}
      rowKey={r => r.id}
      loading={list.isLoading}
      error={list.error}
      pagination={list.data?.pagination}
      onPageChange={page => set({ page })}
      onLimitChange={limit => set({ limit })}
      emptyMessage='No race has opened yet. The user-service worker opens them on schedule once a config is enabled.'
      toolbar={
        <Select value={String(state.type || 'all')} onValueChange={v => v && set({ type: v === 'all' ? '' : v })}>
          <SelectTrigger className='w-36'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Any type</SelectItem>
            <SelectItem value='daily'>Daily</SelectItem>
            <SelectItem value='weekly'>Weekly</SelectItem>
          </SelectContent>
        </Select>
      }
    />
    </>
  )
}

/** A settled race's prize rows (rank, player, points, prize, claimed). */
const WinnersDialog = ({ raceId, onClose }: { raceId: number; onClose: () => void }) => {
  const list = usePagedApi<Reward>('admin/user/race/rewards', { raceId, limit: 100, page: 1 })
  const rows = [...(list.data?.rows ?? [])].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

  return (
    <Dialog open onOpenChange={o => (!o ? onClose() : undefined)}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Race #{raceId} — winners</DialogTitle>
          <DialogDescription>The prizes this race wrote. Players claim them into their wallet.</DialogDescription>
        </DialogHeader>
        <DataTable
          columns={[
            { key: 'rank', header: 'Rank', cell: r => <span className='tabular-nums'>{r.rank}</span> },
            { key: 'user', header: 'User', cell: r => r.username ?? `#${r.userId}` },
            { key: 'points', header: 'Points', align: 'right', cell: r => <span className='font-mono tabular-nums'>{r.points}</span> },
            { key: 'amount', header: 'Prize', align: 'right', cell: r => <Money value={r.amount} currency={r.currency} /> },
            { key: 'claimed', header: 'Claimed', cell: r => <StatusBadge value={r.claimed ? 'completed' : 'pending'} /> }
          ]}
          rows={rows}
          rowKey={r => r.id}
          loading={list.isLoading}
          error={list.error}
          dense
          emptyMessage='Nobody placed in this race.'
        />
      </DialogContent>
    </Dialog>
  )
}

/** The open window's standings, as players see them (real ids for staff). */
const BoardTab = ({ channel }: { channel: Channel }) => {
  const [type, setType] = useState<RaceType>('daily')
  const q = useApi<Board>(`admin/user/race/leaderboard/${type}`, { channel }, { retry: false, refetchInterval: 30_000 })
  const currency = q.data?.payoutCurrency ?? q.data?.currency

  const columns: Column<BoardRow>[] = [
    { key: 'rank', header: 'Rank', cell: r => <span className='tabular-nums'>{r.rank}</span> },
    { key: 'user', header: 'Player', cell: r => (r.isBoat ? <Badge variant='outline'>Booked seat · {r.name}</Badge> : <span>{r.name ?? '—'} <span className='text-muted-foreground font-mono text-xs'>#{r.userId}</span></span>) },
    { key: 'wagered', header: 'Wagered (USD)', align: 'right', cell: r => <Money value={r.usdWagered} /> },
    { key: 'bets', header: 'Bets', align: 'right', cell: r => <span className='tabular-nums'>{r.bets}</span> },
    { key: 'points', header: 'Points', align: 'right', cell: r => <span className='font-mono tabular-nums'>{r.points}</span> },
    { key: 'prize', header: 'Prize now', align: 'right', cell: r => (r.isBoat ? '—' : <Money value={r.payout ?? r.reward} currency={currency} />) }
  ]

  return (
    <div className='grid gap-3'>
      <div className='flex flex-wrap items-center gap-3'>
        <Tabs value={type} onValueChange={v => setType(v as RaceType)}>
          <TabsList>
            <TabsTrigger value='daily'>Daily</TabsTrigger>
            <TabsTrigger value='weekly'>Weekly</TabsTrigger>
          </TabsList>
        </Tabs>
        {q.data ? (
          <span className='text-muted-foreground text-sm'>
            Race #{q.data.raceId} · <DateTime value={q.data.startsAt} /> → <DateTime value={q.data.endsAt} /> · top {q.data.winnerCount} paid
          </span>
        ) : null}
      </div>
      {q.error ? (
        <ErrorState error={q.error} />
      ) : (
        <DataTable columns={columns} rows={q.data?.leaderboard} rowKey={r => `${r.rank}`} loading={q.isLoading} dense emptyMessage='Nobody has scored in this window yet.' />
      )}
    </div>
  )
}

const RewardsTab = ({ channel }: { channel: Channel }) => {
  const { state, set, query } = useListState(['type', 'claimed'])

  const list = usePagedApi<Reward>('admin/user/race/rewards', {
    channel,
    limit: query.limit,
    page: query.page,
    type: query.type || undefined,
    claimed: query.claimed || undefined
  })

  const columns: Column<Reward>[] = [
    { key: 'rank', header: 'Rank', cell: r => <span className='tabular-nums'>{r.rank ?? '—'}</span> },
    { key: 'user', header: 'User', cell: r => <span>{r.username ?? `#${r.userId}`}</span> },
    { key: 'points', header: 'Points', align: 'right', cell: r => <span className='font-mono tabular-nums'>{r.points ?? '—'}</span> },
    { key: 'amount', header: 'Reward', align: 'right', cell: r => <Money value={r.amount} currency={r.currency} /> },
    { key: 'claimed', header: 'Claimed', cell: r => <StatusBadge value={r.claimed ? 'completed' : 'pending'} /> },
    { key: 'at', header: 'When', cell: r => <DateTime value={r.createdAt} relative /> }
  ]

  return (
    <DataTable
      columns={columns}
      rows={list.data?.rows}
      rowKey={r => r.id}
      loading={list.isLoading}
      error={list.error}
      pagination={list.data?.pagination}
      onPageChange={page => set({ page })}
      onLimitChange={limit => set({ limit })}
      dense
      toolbar={
        <>
          <Select value={String(state.type || 'all')} onValueChange={v => v && set({ type: v === 'all' ? '' : v })}>
            <SelectTrigger className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Any type</SelectItem>
              <SelectItem value='daily'>Daily</SelectItem>
              <SelectItem value='weekly'>Weekly</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(state.claimed || 'all')} onValueChange={v => v && set({ claimed: v === 'all' ? '' : v })}>
            <SelectTrigger className='w-36'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Claimed or not</SelectItem>
              <SelectItem value='true'>Claimed</SelectItem>
              <SelectItem value='false'>Unclaimed</SelectItem>
            </SelectContent>
          </Select>
        </>
      }
    />
  )
}

const BoatsTab = () => {
  const list = useApi<Boat[]>('admin/user/race/boats', undefined, { retry: false })
  const [name, setName] = useState('')

  const add = useApiMutation({
    fn: () => api.post('admin/user/race/boats', { name, isActive: true }),
    invalidate: [['api', 'admin/user/race/boats']],
    success: 'Entry added',
    onSuccess: () => setName('')
  })

  const toggle = useApiMutation({
    fn: (v: { id: number; isActive: boolean }) => api.put(`admin/user/race/boats/${v.id}`, { isActive: v.isActive }),
    invalidate: [['api', 'admin/user/race/boats']],
    success: 'Entry updated'
  })

  const remove = useApiMutation({
    fn: (id: number) => api.delete(`admin/user/race/boats/${id}`),
    invalidate: [['api', 'admin/user/race/boats']],
    success: 'Entry removed'
  })

  const columns: Column<Boat>[] = [
    { key: 'name', header: 'Name', cell: b => b.name },
    { key: 'active', header: 'Shown', cell: b => <Can permission='config:write' fallback={<StatusBadge value={b.isActive} />}><Button variant='ghost' size='sm' disabled={toggle.isPending} onClick={() => toggle.mutate({ id: b.id, isActive: !b.isActive })}><StatusBadge value={b.isActive ? 'active' : 'inactive'} /></Button></Can> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: b => (
        <Can permission='config:write'>
          <ConfirmDialog
            trigger={
              <Button variant='ghost' size='icon-sm' aria-label='Remove'>
                <Trash2Icon />
              </Button>
            }
            title={`Remove “${b.name}”?`}
            confirmLabel='Remove'
            destructive
            onConfirm={() => remove.mutateAsync(b.id)}
          />
        </Can>
      )
    }
  ]

  return (
    <div className='grid gap-4'>
      <p className='text-muted-foreground text-sm'>
        Decorative entries shown on the leaderboard beside real users, when booked seats are switched on for a race type.
      </p>
      <Can permission='config:write'>
        <FormDialog
          trigger={
            <Button className='justify-self-start'>
              <PlusIcon /> Add entry
            </Button>
          }
          title='Add a booked seat'
          submitLabel='Add'
          onSubmit={() => add.mutateAsync()}
          validate={() => ({ 'boat-name': check.required(name, 'Display name') || check.length(name, 'Display name', { max: 60 }) })}
        >
          <TextField id='boat-name' label='Display name' required maxLength={60} value={name} onChange={e => setName(e.target.value)} />
        </FormDialog>
      </Can>
      <DataTable columns={columns} rows={list.data} rowKey={b => b.id} loading={list.isLoading} error={list.error} dense emptyMessage='No booked seats configured.' />
    </div>
  )
}

const Races = () => {
  const [type, setType] = useState<RaceType>('daily')

  return (
    <div>
      <PageHeader
        title='Wagering races'
        description='Turnover contests with a prize pool, shown to players as Tournaments. A daily race runs midnight to midnight and a weekly one Monday to Monday, in the race timezone (Site config → Operator settings). Points per product decide which games count (0 = excluded); a race pays when it is settled.'
      />
      <RewardCurrencyNotice className='mb-4' />
      <Tabs defaultValue='config'>
        <TabsList className='mb-4'>
          <TabsTrigger value='config'>Configuration</TabsTrigger>
          <TabsTrigger value='board'>Live board</TabsTrigger>
          <TabsTrigger value='races'>Races & history</TabsTrigger>
          <TabsTrigger value='rewards'>Rewards</TabsTrigger>
          <TabsTrigger value='boats'>Booked seats</TabsTrigger>
        </TabsList>
        <TabsContent value='config'>
          <Tabs value={type} onValueChange={v => setType(v as RaceType)} className='mb-4'>
            <TabsList>
              <TabsTrigger value='daily'>Daily</TabsTrigger>
              <TabsTrigger value='weekly'>Weekly</TabsTrigger>
            </TabsList>
          </Tabs>
          <ConfigEditor key={type} type={type} />
        </TabsContent>
        <TabsContent value='board'>
          <ChannelTabs>{channel => <BoardTab channel={channel} />}</ChannelTabs>
        </TabsContent>
        <TabsContent value='races'>
          <RacesTab />
        </TabsContent>
        <TabsContent value='rewards'>
          <ChannelTabs>{channel => <RewardsTab channel={channel} />}</ChannelTabs>
        </TabsContent>
        <TabsContent value='boats'>
          <BoatsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Races
